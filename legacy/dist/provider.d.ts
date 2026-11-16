import { CallOptions, CallResult, ChatMessage, MapeKTrace, ProviderConfig, CircuitState } from './types.js';
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
export declare class Provider {
    readonly state: ProviderState;
    readonly diagnoser: Diagnoser;
    constructor(config: ProviderConfig);
    /** Get the provider name. */
    get name(): string;
    /** Get the current circuit breaker state (global). */
    get circuitState(): CircuitState;
    /** Get the current health score (0-1). */
    get healthScore(): number;
    /** Get average latency in ms. */
    get avgLatency(): number;
    /** Check if this provider can accept a request right now. */
    isAvailable(): boolean;
    /**
     * Execute a chat completion through this provider.
     * Applies circuit breaker, rate limiting, and bulkhead.
     */
    call(messages: ChatMessage[], options: CallOptions, trace?: MapeKTrace): Promise<CallResult>;
    /** Perform the actual HTTP request. */
    private executeRequest;
    /** Build the chat completions URL for standard OpenAI-compatible API. */
    private buildChatURL;
    /** Handle Anthropic's Messages API (not OpenAI-compatible). */
    private callAnthropic;
}
/**
 * ProviderState — holds runtime state for a provider.
 */
export declare class ProviderState {
    config: ProviderConfig;
    cb: CircuitBreaker;
    categoryCBs: CategoryCircuitBreakers;
    rl: RateLimiter;
    bh: Bulkhead;
    successCount: number;
    failureCount: number;
    callCount: number;
    totalLatency: number;
    latencies: number[];
    constructor(config: ProviderConfig);
}
//# sourceMappingURL=provider.d.ts.map