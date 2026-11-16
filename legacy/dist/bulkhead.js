// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
/**
 * Bulkhead — limits concurrent requests to a provider.
 * Prevents a single slow provider from exhausting the event loop.
 */
export class Bulkhead {
    activeCount = 0;
    queue = [];
    maxConcurrent;
    constructor(maxConcurrent = 10) {
        this.maxConcurrent = maxConcurrent;
    }
    /** Try to acquire a slot. Returns true if immediately available. */
    tryAcquire() {
        if (this.activeCount < this.maxConcurrent) {
            this.activeCount++;
            return true;
        }
        return false;
    }
    /** Acquire a slot, waiting if needed. Returns a release function. */
    async acquire() {
        if (this.activeCount < this.maxConcurrent) {
            this.activeCount++;
            return this.release.bind(this);
        }
        // Wait for a slot
        return new Promise((resolve) => {
            this.queue.push(() => {
                this.activeCount++;
                resolve(this.release.bind(this));
            });
        });
    }
    /** Release a slot — wakes the next queued waiter. */
    release() {
        this.activeCount--;
        const next = this.queue.shift();
        if (next) {
            // Defer to next microtask to avoid stack-overflow on burst release
            queueMicrotask(next);
        }
    }
    getActiveCount() {
        return this.activeCount;
    }
    getQueuedCount() {
        return this.queue.length;
    }
    toJSON() {
        return {
            maxConcurrent: this.maxConcurrent,
            active: this.activeCount,
            queued: this.queue.length,
        };
    }
}
//# sourceMappingURL=bulkhead.js.map