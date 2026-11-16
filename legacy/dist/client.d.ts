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
import { SelfHealingEngine } from './engine.js';
import { CallOptions, ChatMessage, ChatResponse, ClientOptions } from './types.js';
export declare class NeuralBridge {
    readonly engine: SelfHealingEngine;
    private strategy;
    private costs;
    private licenseKey;
    constructor(options: ClientOptions);
    /**
     * Apply watermark for unlicensed users.
     */
    private applyWatermark;
    /**
     * Send a chat message with automatic routing and self-healing.
     *
     * @param prompt The user message.
     * @param options Optional call configuration (model, temperature, etc.)
     * @returns ChatResponse with text, provider, model, cost, etc.
     */
    chat(prompt: string, options?: CallOptions): Promise<ChatResponse>;
    /**
     * Send multi-turn messages with automatic routing and self-healing.
     */
    chatWithMessages(messages: ChatMessage[], options?: CallOptions): Promise<ChatResponse>;
    /**
     * Send a chat to a specific provider (bypasses auto-selection).
     */
    chatFromProvider(providerName: string, prompt: string, model?: string): Promise<ChatResponse>;
    /** Get engine statistics. */
    status(): {
        providers: string[];
        strategy: string;
        stats: ReturnType<SelfHealingEngine['getStats']>;
        costs: CostReport;
    };
    /** Get the cost tracker. */
    get costTracker(): CostTracker;
}
export interface CostReport {
    totalCalls: number;
    totalCostUsd: number;
    totalTokens: number;
    byProvider: Record<string, {
        calls: number;
        cost: number;
        tokens: number;
    }>;
}
export declare class CostTracker {
    private records;
    record(opts: {
        provider: string;
        model: string;
        inputTokens: number;
        outputTokens: number;
        latencyMs: number;
        success: boolean;
    }): void;
    report(): CostReport;
}
/** @deprecated Use `NeuralBridge` instead. */
export declare const Client: typeof NeuralBridge;
//# sourceMappingURL=client.d.ts.map