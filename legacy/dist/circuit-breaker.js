// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
import { CircuitState, FaultCategory } from './types.js';
/**
 * CircuitBreaker — stops calls to a failing provider.
 *
 * States: closed (normal) → open (failing) → half_open (probing) → closed/open
 */
export class CircuitBreaker {
    state = CircuitState.CLOSED;
    failureCount = 0;
    lastFailureTime = 0;
    failureThreshold;
    resetTimeoutMs;
    halfOpenMaxCalls;
    halfOpenCalls = 0;
    constructor(failureThreshold = 5, resetTimeoutMs = 30_000, halfOpenMaxCalls = 3) {
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
        this.halfOpenMaxCalls = halfOpenMaxCalls;
    }
    getState() {
        // Auto-transition open → half_open after timeout
        if (this.state === CircuitState.OPEN) {
            const elapsed = Date.now() - this.lastFailureTime;
            if (elapsed >= this.resetTimeoutMs) {
                this.state = CircuitState.HALF_OPEN;
                this.halfOpenCalls = 0;
            }
        }
        return this.state;
    }
    /** Returns true if the call is allowed through. */
    allowRequest() {
        const s = this.getState();
        if (s === CircuitState.CLOSED)
            return true;
        if (s === CircuitState.OPEN)
            return false;
        // Half-open: allow limited probes
        if (this.halfOpenCalls < this.halfOpenMaxCalls) {
            this.halfOpenCalls++;
            return true;
        }
        return false;
    }
    /** Record a success — resets the breaker. */
    recordSuccess() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.halfOpenCalls = 0;
    }
    /** Record a failure — may trip the breaker. */
    recordFailure(category) {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        // In half-open, a single failure goes back to open
        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.OPEN;
            return;
        }
        if (this.failureCount >= this.failureThreshold) {
            this.state = CircuitState.OPEN;
        }
    }
    /** Force the breaker into a specific state. */
    forceState(s) {
        this.state = s;
        if (s === CircuitState.CLOSED) {
            this.failureCount = 0;
            this.halfOpenCalls = 0;
        }
    }
    getFailureCount() {
        return this.failureCount;
    }
    toJSON() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            failureThreshold: this.failureThreshold,
            resetTimeoutMs: this.resetTimeoutMs,
        };
    }
}
/**
 * Per-category circuit breaker set — tracks failure modes independently.
 */
export class CategoryCircuitBreakers {
    breakers = new Map();
    constructor() {
        // Initialize all known categories
        for (const cat of Object.values(FaultCategory)) {
            this.breakers.set(cat, new CircuitBreaker(3, 60_000, 2));
        }
    }
    get(cat) {
        return this.breakers.get(cat) ?? this.breakers.get(FaultCategory.UNKNOWN);
    }
    allowRequest(cat) {
        return this.get(cat).allowRequest();
    }
    recordSuccess(cat) {
        this.get(cat).recordSuccess();
    }
    recordFailure(cat) {
        this.get(cat).recordFailure(cat);
    }
    toJSON() {
        const result = {};
        for (const [cat, cb] of this.breakers) {
            result[cat] = cb.toJSON();
        }
        return result;
    }
}
//# sourceMappingURL=circuit-breaker.js.map