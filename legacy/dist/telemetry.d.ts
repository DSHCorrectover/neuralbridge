/**
 * Telemetry — optional OpenTelemetry integration for NeuralBridge.
 */
import { EngineStats, FaultCategory } from './types.js';
export interface TelemetryConfig {
    serviceName?: string;
    enabled: boolean;
    endpoint?: string;
    exportIntervalMs?: number;
}
/**
 * TelemetryCollector — accumulates metrics and exports them.
 */
export declare class TelemetryCollector {
    private config;
    private metrics;
    constructor(config?: Partial<TelemetryConfig>);
    /** Record an engine call metric. */
    recordCall(stats: EngineStats, provider: string, success: boolean, latencyMs: number): void;
    /** Record a fault event. */
    recordFault(provider: string, category: FaultCategory): void;
    /** Export accumulated metrics to the configured endpoint. */
    export(): Promise<void>;
    /** Get current metric buffer size. */
    get bufferSize(): number;
}
/**
 * Create a default telemetry collector (disabled by default).
 */
export declare function createTelemetry(config?: Partial<TelemetryConfig>): TelemetryCollector;
//# sourceMappingURL=telemetry.d.ts.map