// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
import { MapeKPhase, FaultCategory, CircuitState, } from './types.js';
import { CircuitBreaker, CategoryCircuitBreakers } from './circuit-breaker.js';
import { RateLimiter } from './rate-limiter.js';
import { Bulkhead } from './bulkhead.js';
import { Diagnoser } from './diagnoser.js';
/**
 * Provider — manages a single LLM API provider with resilience patterns.
 *
 * Integrates:
 * - Circuit breaker (per-category + global fallback)
 * - Rate limiter (token bucket)
 * - Bulkhead (concurrency limit)
 * - Diagnoser (error classification)
 */
export class Provider {
    state;
    diagnoser;
    constructor(config) {
        this.state = new ProviderState(config);
        this.diagnoser = new Diagnoser();
    }
    /** Get the provider name. */
    get name() {
        return this.state.config.name;
    }
    /** Get the current circuit breaker state (global). */
    get circuitState() {
        return this.state.cb.getState();
    }
    /** Get the current health score (0-1). */
    get healthScore() {
        const failureRate = this.state.callCount > 0
            ? this.state.failureCount / this.state.callCount
            : 0;
        return Math.max(0, 1.0 - failureRate * 3);
    }
    /** Get average latency in ms. */
    get avgLatency() {
        if (this.state.callCount === 0)
            return 0;
        return this.state.totalLatency / this.state.callCount;
    }
    /** Check if this provider can accept a request right now. */
    isAvailable() {
        if (!this.state.config.enabled)
            return false;
        if (this.state.cb.getState() === CircuitState.OPEN)
            return false;
        if (!this.state.rl.tryAcquire())
            return false;
        if (!this.state.bh.tryAcquire())
            return false;
        return true;
    }
    /**
     * Execute a chat completion through this provider.
     * Applies circuit breaker, rate limiting, and bulkhead.
     */
    async call(messages, options, trace) {
        const startTime = Date.now();
        const model = options.model ?? this.state.config.models[0] ?? 'unknown';
        trace?.enter(MapeKPhase.MONITOR, `provider:${this.name} model:${model}`);
        // Check circuit breaker
        if (!this.state.cb.allowRequest()) {
            trace?.enter(MapeKPhase.ANALYZE, 'circuit_breaker_open');
            return {
                content: '',
                provider: this.name,
                model,
                attempts: 1,
                latencyMs: Date.now() - startTime,
                fallbackUsed: false,
                downgraded: false,
                success: false,
                trace,
                diagnosis: {
                    category: FaultCategory.SERVER_ERROR,
                    confidence: 0.9,
                    shouldRetry: false,
                    skipToFailover: true,
                    rawError: `Circuit breaker is ${this.state.cb.getState()} for ${this.name}`,
                    subCategory: 'circuit_open',
                },
            };
        }
        // Rate limit check
        if (!this.state.rl.tryAcquire()) {
            trace?.enter(MapeKPhase.ANALYZE, 'rate_limited');
            return {
                content: '',
                provider: this.name,
                model,
                attempts: 1,
                latencyMs: Date.now() - startTime,
                fallbackUsed: false,
                downgraded: false,
                success: false,
                trace,
                diagnosis: {
                    category: FaultCategory.RATE_LIMIT,
                    confidence: 0.95,
                    shouldRetry: true,
                    skipToFailover: true,
                    retryAfter: this.state.rl.waitTimeMs() / 1000,
                    rawError: 'Rate limit exceeded (local token bucket)',
                    subCategory: 'local_rate_limit',
                },
            };
        }
        // Bulkhead — wait for a slot
        trace?.enter(MapeKPhase.ANALYZE, 'waiting_bulkhead');
        const release = await this.state.bh.acquire();
        try {
            trace?.enter(MapeKPhase.EXECUTE, `calling ${this.name}/${model}`);
            const requestBody = {
                model,
                messages,
                temperature: options.temperature,
                max_tokens: options.maxTokens,
                top_p: options.topP,
                stream: false,
                stop: options.stop,
                frequency_penalty: options.frequencyPenalty,
                presence_penalty: options.presencePenalty,
            };
            const response = await this.executeRequest(requestBody, options);
            const latencyMs = Date.now() - startTime;
            // Parse response
            const data = response.data;
            let content = '';
            let tokenUsage;
            if (data.choices?.length > 0) {
                content = data.choices[0]?.message?.content ?? '';
            }
            if (data.usage) {
                tokenUsage = data.usage;
            }
            // Record success
            this.state.cb.recordSuccess();
            this.state.successCount++;
            this.state.callCount++;
            this.state.totalLatency += latencyMs;
            trace?.enter(MapeKPhase.KNOWLEDGE, 'success');
            return {
                content,
                provider: this.name,
                model: data.model ?? model,
                attempts: 1,
                latencyMs,
                fallbackUsed: false,
                downgraded: false,
                success: true,
                tokenUsage,
                rawResponse: data,
                trace,
            };
        }
        catch (err) {
            const latencyMs = Date.now() - startTime;
            const statusCode = err.status;
            const diagnosis = this.diagnoser.diagnose(err, statusCode);
            // Record failure
            this.state.cb.recordFailure(diagnosis.category);
            this.state.failureCount++;
            this.state.callCount++;
            this.state.totalLatency += latencyMs;
            trace?.enter(MapeKPhase.KNOWLEDGE, `failed: ${diagnosis.category}`);
            return {
                content: '',
                provider: this.name,
                model,
                attempts: 1,
                latencyMs,
                fallbackUsed: false,
                downgraded: false,
                success: false,
                diagnosis,
                trace,
            };
        }
        finally {
            release();
        }
    }
    /** Perform the actual HTTP request. */
    async executeRequest(body, options) {
        const url = this.buildChatURL();
        const timeout = options.timeout ?? this.state.config.timeout;
        const controller = new AbortController();
        let timer;
        if (timeout > 0) {
            timer = setTimeout(() => controller.abort(), timeout * 1000);
        }
        // Wire external AbortSignal
        if (options.signal) {
            options.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...this.state.config.headers,
            };
            if (this.state.config.apiKey) {
                headers['Authorization'] = `Bearer ${this.state.config.apiKey}`;
            }
            // Handle Anthropic-style API (different endpoint)
            if (this.name === 'anthropic') {
                return this.callAnthropic(body, headers, controller.signal);
            }
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                const err = new Error(errorText || `HTTP ${response.status}`);
                err.status = response.status;
                throw err;
            }
            const data = (await response.json());
            return { data };
        }
        catch (err) {
            // Normalize fetch errors
            if (err.name === 'AbortError') {
                const timeout = new Error(`Request timed out after ${options.timeout ?? this.state.config.timeout}s`);
                timeout.status = 408;
                throw timeout;
            }
            if (err.status)
                throw err;
            // Network error
            const netErr = new Error(err.message || 'Connection error');
            netErr.status = 0;
            throw netErr;
        }
        finally {
            if (timer)
                clearTimeout(timer);
        }
    }
    /** Build the chat completions URL for standard OpenAI-compatible API. */
    buildChatURL() {
        const base = this.state.config.baseURL.replace(/\/+$/, '');
        return `${base}/chat/completions`;
    }
    /** Handle Anthropic's Messages API (not OpenAI-compatible). */
    async callAnthropic(body, headers, signal) {
        const base = this.state.config.baseURL.replace(/\/+$/, '');
        const url = `${base}/messages`;
        // Transform from OpenAI format to Anthropic format
        const systemMsg = body.messages.find(m => m.role === 'system');
        const messages = body.messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
        }));
        const anthropicBody = {
            model: body.model,
            messages,
            max_tokens: body.max_tokens ?? 1024,
        };
        if (systemMsg)
            anthropicBody.system = systemMsg.content;
        if (body.temperature !== undefined)
            anthropicBody.temperature = body.temperature;
        if (body.top_p !== undefined)
            anthropicBody.top_p = body.top_p;
        if (body.stop)
            anthropicBody.stop_sequences = Array.isArray(body.stop) ? body.stop : [body.stop];
        // Set Anthropic API version header
        const anthropicHeaders = {
            ...headers,
            'anthropic-version': '2023-06-01',
            'x-api-key': this.state.config.apiKey ?? '',
        };
        delete anthropicHeaders['Authorization'];
        const response = await fetch(url, {
            method: 'POST',
            headers: anthropicHeaders,
            body: JSON.stringify(anthropicBody),
            signal,
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            const err = new Error(errorText || `HTTP ${response.status}`);
            err.status = response.status;
            throw err;
        }
        const result = await response.json();
        const text = result.content?.map(c => c.text).join('') ?? '';
        // Transform back to OpenAI-compatible shape
        const dto = {
            id: result.id,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: result.model,
            choices: [{
                    index: 0,
                    message: { role: 'assistant', content: text },
                    finish_reason: result.stop_reason ?? 'stop',
                }],
            usage: result.usage ? {
                prompt_tokens: result.usage.input_tokens,
                completion_tokens: result.usage.output_tokens,
                total_tokens: result.usage.input_tokens + result.usage.output_tokens,
            } : undefined,
        };
        return { data: dto };
    }
}
/**
 * ProviderState — holds runtime state for a provider.
 */
export class ProviderState {
    config;
    cb;
    categoryCBs;
    rl;
    bh;
    successCount = 0;
    failureCount = 0;
    callCount = 0;
    totalLatency = 0;
    latencies = [];
    constructor(config) {
        this.config = config;
        this.cb = new CircuitBreaker(5, 30_000, 3);
        this.categoryCBs = new CategoryCircuitBreakers();
        this.rl = new RateLimiter(config.maxRetries > 0 ? config.rateLimitRPS * 2 : 60, config.rateLimitRPS);
        this.bh = new Bulkhead(config.maxConcurrency);
    }
}
//# sourceMappingURL=provider.js.map