/**
 * RateLimiter — token bucket per provider.
 * Throttles requests to prevent provider rate-limit errors.
 */
export declare class RateLimiter {
    private maxTokens;
    private refillRate;
    private tokens;
    private lastRefill;
    private rejected;
    constructor(maxTokens?: number, refillRate?: number);
    /** Try to acquire one or more tokens. Returns true if allowed. */
    tryAcquire(count?: number): boolean;
    /** Returns the number of milliseconds until a token is available, or 0. */
    waitTimeMs(count?: number): number;
    private refill;
    getRejectedCount(): number;
    getAvailableTokens(): number;
    toJSON(): Record<string, unknown>;
}
//# sourceMappingURL=rate-limiter.d.ts.map