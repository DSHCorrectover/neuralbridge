// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
/**
 * RateLimiter — token bucket per provider.
 * Throttles requests to prevent provider rate-limit errors.
 */
export class RateLimiter {
    maxTokens;
    refillRate;
    tokens;
    lastRefill;
    rejected = 0;
    constructor(maxTokens = 60, refillRate = 10) {
        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
    }
    /** Try to acquire one or more tokens. Returns true if allowed. */
    tryAcquire(count = 1) {
        this.refill();
        if (this.tokens >= count) {
            this.tokens -= count;
            return true;
        }
        this.rejected++;
        return false;
    }
    /** Returns the number of milliseconds until a token is available, or 0. */
    waitTimeMs(count = 1) {
        this.refill();
        if (this.tokens >= count)
            return 0;
        const deficit = count - this.tokens;
        return Math.ceil((deficit / this.refillRate) * 1000);
    }
    refill() {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
        this.lastRefill = now;
    }
    getRejectedCount() {
        return this.rejected;
    }
    getAvailableTokens() {
        this.refill();
        return this.tokens;
    }
    toJSON() {
        return {
            maxTokens: this.maxTokens,
            refillRate: this.refillRate,
            available: this.getAvailableTokens(),
            rejected: this.rejected,
        };
    }
}
//# sourceMappingURL=rate-limiter.js.map