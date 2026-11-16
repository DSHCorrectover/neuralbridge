// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
/**
 * Top-level convenience functions for quick one-liners.
 *
 * Usage:
 * ```typescript
 * import { Chat } from 'neuralbridge-sdk';
 *
 * const text = await Chat('Hello!');
 * const text = await Chat('Hello!', { model: 'gpt-4o' });
 * ```
 */
import { createEngine } from './engine.js';
let defaultEngine = null;
/** Auto-detect providers from environment variables. */
function getDefaultEngine() {
    if (!defaultEngine) {
        const providers = [];
        const envMap = {
            openai: 'OPENAI_API_KEY',
            anthropic: 'ANTHROPIC_API_KEY',
            deepseek: 'DEEPSEEK_API_KEY',
            google: 'GOOGLE_API_KEY',
            dashscope: 'DASHSCOPE_API_KEY',
            groq: 'GROQ_API_KEY',
            nvidia: 'NVIDIA_API_KEY',
            agnes: 'AGNES_API_KEY',
        };
        for (const [provider, envVar] of Object.entries(envMap)) {
            if (process.env[envVar]) {
                providers.push(provider);
            }
        }
        if (providers.length === 0) {
            // Fallback: try NEURALBRIDGE_PROVIDERS env var
            const envProviders = process.env['NEURALBRIDGE_PROVIDERS'];
            if (envProviders) {
                providers.push(...envProviders.split(',').map((s) => s.trim()));
            }
        }
        if (providers.length === 0) {
            providers.push('openai');
        }
        defaultEngine = createEngine({ providers });
    }
    return defaultEngine;
}
/**
 * Top-level Chat function. Auto-detects providers from environment variables.
 *
 * @param message The prompt to send.
 * @param options Optional call options (model, temperature, etc.)
 * @returns The response text.
 */
export async function Chat(message, options) {
    const engine = getDefaultEngine();
    const result = await engine.callSync(message, options);
    if (!result.success) {
        throw new Error(`NeuralBridge.Chat failed: ${result.diagnosis?.rawError ?? 'unknown error'}`);
    }
    return result.content;
}
/**
 * Async variant — returns a Promise that resolves to AsyncChatResult.
 */
export function ChatAsync(message, options) {
    return Chat(message, options)
        .then((text) => ({ text }))
        .catch((err) => ({ text: '', error: err }));
}
/**
 * Chat with a built-in timeout.
 */
export async function ChatWithTimeout(message, timeoutMs, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const result = await Chat(message, { ...options, signal: controller.signal });
        return result;
    }
    finally {
        clearTimeout(timer);
    }
}
//# sourceMappingURL=chat.js.map