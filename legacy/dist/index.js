// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
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
// ── Types ───────────────────────────────────────────────────────
export { 
// Enums
MapeKPhase, FaultCategory, CircuitState, SemanticDomain, RecoveryAction, RecoveryLevel, 
// Constants
APITypeChat, APITypeCompletions, APITypeEmbeddings, PROVIDER_PRESETS, 
// Classes
MapeKTrace, } from './types.js';
// ── Engine ──────────────────────────────────────────────────────
export { SelfHealingEngine, createEngine } from './engine.js';
// ── Client ──────────────────────────────────────────────────────
export { NeuralBridge, Client, CostTracker } from './client.js';
// ── Chat (top-level convenience) ────────────────────────────────
export { Chat, ChatAsync, ChatWithTimeout } from './chat.js';
// ── Patterns ────────────────────────────────────────────────────
export { CircuitBreaker, CategoryCircuitBreakers } from './circuit-breaker.js';
export { RateLimiter } from './rate-limiter.js';
export { Bulkhead } from './bulkhead.js';
export { Provider } from './provider.js';
export { Diagnoser } from './diagnoser.js';
export { FlywheelLearner, MetricsCollector } from './flywheel.js';
// ── Checkpoint ──────────────────────────────────────────────────
export { AgentSession } from './checkpoint.js';
// ── Streaming ───────────────────────────────────────────────────
export { streamCall } from './streaming.js';
// ── Telemetry ───────────────────────────────────────────────────
export { TelemetryCollector, createTelemetry } from './telemetry.js';
// ── Version ─────────────────────────────────────────────────────
export const VERSION = '1.1.0';
// ── License / Open Core ────────────────────────────────────────
export { license, ProPlan } from './license.js';
//# sourceMappingURL=index.js.map