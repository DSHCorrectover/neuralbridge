/**
 * NeuralBridge SDK — Agent stability SDK for TypeScript.
 *
 * Self-healing, auto-failover, circuit-breaker for LLM API calls
 * across multiple providers (OpenAI, Anthropic, DeepSeek, Google, etc.).
 *
 * ## Quick Start
 *
 * ```typescript
 * // Top-level convenience
 * import { Chat } from 'neuralbridge-sdk';
 * const text = await Chat('Hello!');
 *
 * // Client with full control
 * import { NeuralBridge } from 'neuralbridge-sdk';
 * const nb = new NeuralBridge({ providers: ['openai', 'anthropic'] });
 * const res = await nb.chat('Hello!');
 * console.log(res.text);
 *
 * // Low-level engine
 * import { createEngine } from 'neuralbridge-sdk';
 * const engine = createEngine({ providers: ['openai'] });
 * const result = await engine.callSync('Hello!');
 * ```
 *
 * @module neuralbridge-sdk
 */
export { MapeKPhase, FaultCategory, CircuitState, SemanticDomain, RecoveryAction, RecoveryLevel, APITypeChat, APITypeCompletions, APITypeEmbeddings, PROVIDER_PRESETS, MapeKTrace, } from './types.js';
export type { ChatMessage, ChatRequest, ChatChoice, TokenUsage, ChatResponseDTO, Diagnosis, ProviderConfig, CallResult, PhaseRecord, EngineStats, ProviderStats, ContractCheck, ContractResult, Contract, CallOptions, EngineOptions, ClientOptions, ChatResponse, CheckpointData, StepResult, StreamChunk, AsyncChatResult, } from './types.js';
export { SelfHealingEngine, createEngine } from './engine.js';
export { NeuralBridge, Client, CostTracker, type CostReport } from './client.js';
export { Chat, ChatAsync, ChatWithTimeout } from './chat.js';
export { CircuitBreaker, CategoryCircuitBreakers } from './circuit-breaker.js';
export { RateLimiter } from './rate-limiter.js';
export { Bulkhead } from './bulkhead.js';
export { Provider } from './provider.js';
export { Diagnoser } from './diagnoser.js';
export { FlywheelLearner, MetricsCollector, type LearnedRule } from './flywheel.js';
export { AgentSession } from './checkpoint.js';
export { streamCall } from './streaming.js';
export { TelemetryCollector, createTelemetry, type TelemetryConfig } from './telemetry.js';
export declare const VERSION = "1.1.0";
export { license, ProPlan } from './license.js';
//# sourceMappingURL=index.d.ts.map