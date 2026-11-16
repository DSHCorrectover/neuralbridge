// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
const DEFAULT_CONFIG = {
    enabled: false,
    serviceName: 'neuralbridge',
    exportIntervalMs: 10_000,
};
/**
 * TelemetryCollector — accumulates metrics and exports them.
 */
export class TelemetryCollector {
    config;
    metrics = [];
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /** Record an engine call metric. */
    recordCall(stats, provider, success, latencyMs) {
        if (!this.config.enabled)
            return;
        this.metrics.push({
            type: 'engine_call',
            timestamp: Date.now(),
            provider,
            success,
            latencyMs,
            totalCalls: stats.totalCalls,
            successRate: stats.totalCalls > 0 ? stats.successCalls / stats.totalCalls : 0,
        });
        // Auto-export if buffer large enough
        if (this.metrics.length >= 100) {
            this.export().catch(() => { });
        }
    }
    /** Record a fault event. */
    recordFault(provider, category) {
        if (!this.config.enabled)
            return;
        this.metrics.push({
            type: 'fault',
            timestamp: Date.now(),
            provider,
            category,
        });
    }
    /** Export accumulated metrics to the configured endpoint. */
    async export() {
        if (!this.config.enabled || this.metrics.length === 0)
            return;
        const batch = this.metrics.splice(0);
        if (this.config.endpoint) {
            try {
                await fetch(this.config.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        service: this.config.serviceName,
                        metrics: batch,
                    }),
                });
            }
            catch {
                // Silently fail — telemetry is best-effort
            }
        }
    }
    /** Get current metric buffer size. */
    get bufferSize() {
        return this.metrics.length;
    }
}
/**
 * Create a default telemetry collector (disabled by default).
 */
export function createTelemetry(config) {
    return new TelemetryCollector(config);
}
//# sourceMappingURL=telemetry.js.map