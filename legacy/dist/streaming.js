// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
import { MapeKTrace, MapeKPhase } from './types.js';
/**
 * Stream an LLM call, yielding chunks as they arrive.
 */
export async function* streamCall(provider, messages, options) {
    const trace = new MapeKTrace();
    trace.enter(MapeKPhase.EXECUTE, `streaming ${options.model ?? 'unknown'}`);
    const model = options.model ?? provider.state.config.models[0] ?? 'unknown';
    const url = `${provider.state.config.baseURL.replace(/\/+$/, '')}/chat/completions`;
    const timeout = options.timeout ?? provider.state.config.timeout;
    const body = {
        model,
        messages,
        stream: true,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        stop: options.stop,
    };
    const headers = {
        'Content-Type': 'application/json',
        ...provider.state.config.headers,
    };
    if (provider.state.config.apiKey) {
        headers['Authorization'] = `Bearer ${provider.state.config.apiKey}`;
    }
    const controller = new AbortController();
    let timer;
    if (timeout > 0) {
        timer = setTimeout(() => controller.abort(), timeout * 1000);
    }
    if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            yield { content: '', done: true, finishReason: 'error' };
            return;
        }
        const reader = response.body?.getReader();
        if (!reader) {
            yield { content: '', done: true, finishReason: 'error' };
            return;
        }
        const decoder = new TextDecoder();
        let buffer = '';
        let responseModel = model;
        let tokenUsage;
        let fullContent = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:'))
                    continue;
                const data = trimmed.slice(5).trim();
                // [DONE] signal
                if (data === '[DONE]') {
                    yield { content: '', done: true, finishReason: 'stop', tokenUsage, model: responseModel };
                    return;
                }
                try {
                    const parsed = JSON.parse(data);
                    responseModel = parsed.model ?? responseModel;
                    const delta = parsed.choices?.[0]?.delta;
                    const finishReason = parsed.choices?.[0]?.finish_reason;
                    const content = delta?.content ?? '';
                    if (parsed.usage) {
                        tokenUsage = parsed.usage;
                    }
                    if (content) {
                        fullContent += content;
                        yield {
                            content,
                            done: false,
                            model: responseModel,
                            finishReason,
                        };
                    }
                    if (finishReason) {
                        yield {
                            content: '',
                            done: true,
                            finishReason,
                            tokenUsage,
                            model: responseModel,
                        };
                        return;
                    }
                }
                catch {
                    // Skip malformed JSON lines
                }
            }
        }
        // Stream ended without [DONE] — yield final
        yield { content: '', done: true, finishReason: 'stop', tokenUsage, model: responseModel };
    }
    catch (err) {
        yield { content: '', done: true, finishReason: 'error' };
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
//# sourceMappingURL=streaming.js.map