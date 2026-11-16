// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
/**
 * Client — the unified high-level interface for NeuralBridge.
 *
 * Combines smart routing (which provider/model to choose) with
 * self-healing (what to do when it fails) in one interface.
 *
 * Usage:
 * ```typescript
 * import { NeuralBridge } from 'neuralbridge-sdk';
 *
 * const nb = new NeuralBridge({ providers: ['openai', 'anthropic'] });
 *
 * // Auto-route: picks the best provider/model
 * const response = await nb.chat('Hello!');
 *
 * // Manual: specify model
 * const response = await nb.chat('Complex task', { model: 'gpt-4o' });
 * ```
 */
import { createEngine } from './engine.js';
import { license } from './license.js';
// ── Model ↔ Complexity mapping ──────────────────────────────────
const MODEL_TIERS = {
    'gpt-4o': 5,
    'gpt-4o-mini': 3,
    'gpt-4-turbo': 5,
    'gpt-3.5-turbo': 2,
    'o1': 5,
    'o1-mini': 4,
    'o3-mini': 4,
    'claude-sonnet-4-20250514': 5,
    'claude-haiku-4-20250514': 3,
    'claude-3-5-sonnet-20241022': 5,
    'gemini-2.0-flash': 4,
    'gemini-1.5-pro': 5,
    'gemini-1.5-flash': 3,
    'deepseek-chat': 4,
    'deepseek-reasoner': 5,
    'qwen-max': 5,
    'qwen-plus': 4,
    'qwen-turbo': 3,
    'mixtral-8x7b-32768': 4,
};
// Model cost per 1M input tokens (approximate USD)
const MODEL_COST_PER_1M_INPUT = {
    'gpt-4o': 2.50,
    'gpt-4o-mini': 0.15,
    'gpt-4-turbo': 10.00,
    'gpt-3.5-turbo': 0.50,
    'o1': 15.00,
    'o1-mini': 1.10,
    'o3-mini': 1.10,
    'claude-sonnet-4-20250514': 3.00,
    'claude-haiku-4-20250514': 0.25,
    'claude-3-5-sonnet-20241022': 3.00,
    'gemini-2.0-flash': 0.10,
    'gemini-1.5-pro': 1.25,
    'gemini-1.5-flash': 0.075,
    'deepseek-chat': 0.14,
    'deepseek-reasoner': 0.55,
    'qwen-max': 1.60,
    'qwen-plus': 0.80,
    'qwen-turbo': 0.30,
};
export class NeuralBridge {
    engine;
    strategy;
    costs;
    licenseKey;
    constructor(options) {
        this.strategy = options.strategy ?? 'cost';
        this.costs = new CostTracker();
        this.licenseKey = options.licenseKey ?? '';
        // Activate license if provided
        if (this.licenseKey) {
            license.activate(this.licenseKey).catch(() => { });
        }
        this.engine = createEngine({
            providers: options.providers,
            apiKeys: options.apiKeys,
            configs: options.configs,
            verbose: options.verbose,
        });
    }
    /**
     * Apply watermark for unlicensed users.
     */
    applyWatermark(text) {
        if (!license.watermarkEnabled)
            return text;
        const watermark = '\n\n---\n*⚡ [NeuralBridge not activated](https://neuralbridge.cn/pricing) — add a license key to remove this watermark*';
        return text + watermark;
    }
    /**
     * Send a chat message with automatic routing and self-healing.
     *
     * @param prompt The user message.
     * @param options Optional call configuration (model, temperature, etc.)
     * @returns ChatResponse with text, provider, model, cost, etc.
     */
    async chat(prompt, options) {
        const messages = [{ role: 'user', content: prompt }];
        return this.chatWithMessages(messages, options);
    }
    /**
     * Send multi-turn messages with automatic routing and self-healing.
     */
    async chatWithMessages(messages, options) {
        const startTime = Date.now();
        const result = await this.engine.call(messages, options);
        const latencyMs = Date.now() - startTime;
        // Cost tracking
        const tokens = result.tokenUsage;
        if (tokens) {
            this.costs.record({
                provider: result.provider,
                model: result.model,
                inputTokens: tokens.prompt_tokens,
                outputTokens: tokens.completion_tokens,
                latencyMs,
                success: result.success,
            });
        }
        return {
            text: this.applyWatermark(result.content),
            provider: result.provider,
            model: result.model,
            success: result.success,
            healLevel: result.healLevel,
            latencyMs,
            tokenUsage: result.tokenUsage,
            error: result.diagnosis?.rawError,
            raw: result,
        };
    }
    /**
     * Send a chat to a specific provider (bypasses auto-selection).
     */
    async chatFromProvider(providerName, prompt, model) {
        const provider = this.engine.getProvider(providerName);
        if (!provider) {
            return {
                text: '',
                provider: providerName,
                model: model ?? 'unknown',
                success: false,
                latencyMs: 0,
                error: `Provider "${providerName}" not configured`,
            };
        }
        const result = await provider.call([{ role: 'user', content: prompt }], { model });
        return {
            text: result.content,
            provider: result.provider,
            model: result.model,
            success: result.success,
            healLevel: result.healLevel,
            latencyMs: result.latencyMs,
            tokenUsage: result.tokenUsage,
            error: result.diagnosis?.rawError,
            raw: result,
        };
    }
    /** Get engine statistics. */
    status() {
        return {
            providers: this.engine.getAllProviders().map((p) => p.name),
            strategy: this.strategy,
            stats: this.engine.getStats(),
            costs: this.costs.report(),
        };
    }
    /** Get the cost tracker. */
    get costTracker() {
        return this.costs;
    }
}
export class CostTracker {
    records = [];
    record(opts) {
        const inputCost = (opts.inputTokens / 1_000_000) * (MODEL_COST_PER_1M_INPUT[opts.model] ?? 1.0);
        const outputCost = (opts.outputTokens / 1_000_000) * (MODEL_COST_PER_1M_INPUT[opts.model] ?? 1.0) * 2;
        this.records.push({
            timestamp: Date.now(),
            provider: opts.provider,
            model: opts.model,
            inputTokens: opts.inputTokens,
            outputTokens: opts.outputTokens,
            cost: inputCost + outputCost,
            latencyMs: opts.latencyMs,
            success: opts.success,
        });
    }
    report() {
        const totalCalls = this.records.length;
        const totalCostUsd = this.records.reduce((s, r) => s + r.cost, 0);
        const totalTokens = this.records.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);
        const byProvider = {};
        for (const r of this.records) {
            if (!byProvider[r.provider]) {
                byProvider[r.provider] = { calls: 0, cost: 0, tokens: 0 };
            }
            byProvider[r.provider].calls++;
            byProvider[r.provider].cost += r.cost;
            byProvider[r.provider].tokens += r.inputTokens + r.outputTokens;
        }
        return { totalCalls, totalCostUsd, totalTokens, byProvider };
    }
}
// ── Backward compat alias ───────────────────────────────────────
/** @deprecated Use `NeuralBridge` instead. */
export const Client = NeuralBridge;
//# sourceMappingURL=client.js.map