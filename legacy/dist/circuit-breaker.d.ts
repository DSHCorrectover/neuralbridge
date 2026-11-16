import { CircuitState, FaultCategory } from './types.js';
/**
 * CircuitBreaker — stops calls to a failing provider.
 *
 * States: closed (normal) → open (failing) → half_open (probing) → closed/open
 */
export declare class CircuitBreaker {
    private state;
    private failureCount;
    private lastFailureTime;
    private readonly failureThreshold;
    private readonly resetTimeoutMs;
    private readonly halfOpenMaxCalls;
    private halfOpenCalls;
    constructor(failureThreshold?: number, resetTimeoutMs?: number, halfOpenMaxCalls?: number);
    getState(): CircuitState;
    /** Returns true if the call is allowed through. */
    allowRequest(): boolean;
    /** Record a success — resets the breaker. */
    recordSuccess(): void;
    /** Record a failure — may trip the breaker. */
    recordFailure(category?: FaultCategory): void;
    /** Force the breaker into a specific state. */
    forceState(s: CircuitState): void;
    getFailureCount(): number;
    toJSON(): Record<string, unknown>;
}
/**
 * Per-category circuit breaker set — tracks failure modes independently.
 */
export declare class CategoryCircuitBreakers {
    private breakers;
    constructor();
    get(cat: FaultCategory): CircuitBreaker;
    allowRequest(cat: FaultCategory): boolean;
    recordSuccess(cat: FaultCategory): void;
    recordFailure(cat: FaultCategory): void;
    toJSON(): Record<string, unknown>;
}
//# sourceMappingURL=circuit-breaker.d.ts.map