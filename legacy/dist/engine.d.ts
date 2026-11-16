/**
 * SelfHealingEngine — central MAPE-K self-healing orchestrator.
 *
 * Architecture (three-layer, zero-crossing):
 *   L1 Diagnoser: identify fault only, output label, NO action
 *   HA Layer (CB/RL/BH): read labels + metrics, modify availability, NO diagnosis
 *   L4 Flywheel: receive data, persist, output strategy, NEVER directly route
 *
 * MAPE-K Adaptive Loop (every call):
 *   Monitor → Analyze → Plan → Execute → Knowledge(Flywheel)
 */
import { CallOptions, CallResult, ChatMessage, EngineOptions, EngineStats, ProviderConfig } from './types.js';
import { Provider } from './provider.js';
import { FlywheelLearner } from './flywheel.js';
export declare class SelfHealingEngine {
    private providers;
    private providerOrder;
    private learner;
    private diagnoser;
    private verbose;
    private totalCalls;
    private successCalls;
    private failedCalls;
    private retriedCalls;
    private failoverCalls;
    private downgradeCalls;
    private totalLatency;
    private faultStats;
    constructor(options?: EngineOptions);
    /** Resolve provider configs from options (presets + apiKeys + overrides). */
    private resolveProviderConfigs;
    /** Auto-detect API key from environment variables. */
    private getEnvKey;
    /** Add a provider to the engine. */
    addProvider(config: ProviderConfig): void;
    /** Get a provider by name. */
    getProvider(name: string): Provider | undefined;
    /** List available (enabled and healthy) providers. */
    getAvailableProviders(): Provider[];
    /** Get all providers. */
    getAllProviders(): Provider[];
    /**
     * Execute an LLM call through the MAPE-K adaptive loop.
     *
     * Flow:
     *   1. Monitor — collect provider health status
     *   2. Analyze — diagnose if there are known issues
     *   3. Plan — choose provider, model, and strategy
     *   4. Execute — make the API call with retries/failover
     *   5. Knowledge — feed outcome to flywheel learner
     */
    call(messages: ChatMessage[], options?: CallOptions): Promise<CallResult>;
    /**
     * Synchronous-style call (async but simpler interface).
     * Takes a single prompt string, wraps it as a user message.
     */
    callSync(prompt: string, options?: CallOptions): Promise<CallResult>;
    /** Rank providers by health score + priority. */
    private rankProviders;
    /** Get engine statistics. */
    getStats(): EngineStats;
    /** Get the flywheel learner (for introspection). */
    getLearner(): FlywheelLearner;
    private sleep;
}
/**
 * Create and configure a SelfHealingEngine.
 *
 * Usage:
 * ```typescript
 * import { createEngine } from 'neuralbridge-sdk';
 * const engine = createEngine({ providers: ['openai', 'anthropic'] });
 * ```
 */
export declare function createEngine(options?: EngineOptions): SelfHealingEngine;
//# sourceMappingURL=engine.d.ts.map