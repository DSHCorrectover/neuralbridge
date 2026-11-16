/**
 * Bulkhead — limits concurrent requests to a provider.
 * Prevents a single slow provider from exhausting the event loop.
 */
export declare class Bulkhead {
    private activeCount;
    private queue;
    private maxConcurrent;
    constructor(maxConcurrent?: number);
    /** Try to acquire a slot. Returns true if immediately available. */
    tryAcquire(): boolean;
    /** Acquire a slot, waiting if needed. Returns a release function. */
    acquire(): Promise<() => void>;
    /** Release a slot — wakes the next queued waiter. */
    private release;
    getActiveCount(): number;
    getQueuedCount(): number;
    toJSON(): Record<string, unknown>;
}
//# sourceMappingURL=bulkhead.d.ts.map