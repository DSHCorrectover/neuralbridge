// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
// NeuralBridge™ — Proprietary MAPE-K Adaptive Loop Architecture
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
import { FaultCategory, MapeKPhase, MapeKTrace, RecoveryLevel, PROVIDER_PRESETS, } from './types.js';
import { Provider } from './provider.js';
import { FlywheelLearner } from './flywheel.js';
import { Diagnoser } from './diagnoser.js';
import { license } from './license.js';
/** Environment variable mapping for auto-detecting API keys. */
const ENV_KEY_MAP = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    google: 'GOOGLE_API_KEY',
    dashscope: 'DASHSCOPE_API_KEY',
    groq: 'GROQ_API_KEY',
    nvidia: 'NVIDIA_API_KEY',
    agnes: 'AGNES_API_KEY',
};
export class SelfHealingEngine {
    providers = new Map();
    providerOrder = [];
    learner;
    diagnoser;
    verbose;
    // Stats
    totalCalls = 0;
    successCalls = 0;
    failedCalls = 0;
    retriedCalls = 0;
    failoverCalls = 0;
    downgradeCalls = 0;
    totalLatency = 0;
    faultStats = new Map();
    constructor(options) {
        this.learner = new FlywheelLearner();
        this.diagnoser = new Diagnoser();
        this.verbose = options?.verbose ?? false;
        const configs = this.resolveProviderConfigs(options);
        for (const cfg of configs) {
            this.addProvider(cfg);
        }
    }
    /** Resolve provider configs from options (presets + apiKeys + overrides). */
    resolveProviderConfigs(options) {
        const configs = [];
        const providedNames = new Set(options?.providers ?? []);
        const overrides = new Map((options?.configs ?? []).map((c) => [c.name, c]));
        const apiKeys = options?.apiKeys ?? {};
        const names = providedNames.size > 0
            ? [...providedNames]
            : Object.keys(PROVIDER_PRESETS);
        const maxProviders = license.maxProviders;
        let providerCount = 0;
        for (const name of names) {
            // Enforce license limit on provider count (Free = 2, Pro = unlimited)
            if (providerCount >= maxProviders) {
                if (this.verbose)
                    console.warn(`[NeuralBridge] License limit: max ${maxProviders} providers. Skipping "${name}".`);
                continue;
            }
            const preset = PROVIDER_PRESETS[name];
            if (!preset) {
                if (this.verbose)
                    console.warn(`[NeuralBridge] Unknown provider: ${name}`);
                continue;
            }
            const override = overrides.get(name);
            const apiKey = apiKeys[name] ?? this.getEnvKey(name);
            configs.push({
                name,
                baseURL: override?.baseURL ?? preset.baseURL,
                apiKey: override?.apiKey ?? apiKey,
                authType: override?.authType ?? preset.authType,
                models: override?.models ?? preset.models,
                headers: override?.headers ?? preset.headers,
                timeout: override?.timeout ?? preset.timeout,
                maxRetries: override?.maxRetries ?? preset.maxRetries,
                rateLimitRPS: override?.rateLimitRPS ?? preset.rateLimitRPS,
                maxConcurrency: override?.maxConcurrency ?? preset.maxConcurrency,
                priority: override?.priority ?? names.indexOf(name),
                enabled: override?.enabled ?? true,
            });
            providerCount++;
        }
        return configs;
    }
    /** Auto-detect API key from environment variables. */
    getEnvKey(provider) {
        const envVar = ENV_KEY_MAP[provider];
        if (envVar) {
            const key = process.env[envVar];
            if (key)
                return key;
        }
        // Fallback: {PROVIDER}_API_KEY
        return process.env[`${provider.toUpperCase()}_API_KEY`];
    }
    /** Add a provider to the engine. */
    addProvider(config) {
        this.providers.set(config.name, new Provider(config));
        if (!this.providerOrder.includes(config.name)) {
            this.providerOrder.push(config.name);
        }
    }
    /** Get a provider by name. */
    getProvider(name) {
        return this.providers.get(name);
    }
    /** List available (enabled and healthy) providers. */
    getAvailableProviders() {
        return this.providerOrder
            .map((name) => this.providers.get(name))
            .filter((p) => p !== undefined && p.isAvailable());
    }
    /** Get all providers. */
    getAllProviders() {
        return this.providerOrder
            .map((name) => this.providers.get(name))
            .filter((p) => p !== undefined);
    }
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CORE CALL — MAPE-K Adaptive Loop
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    async call(messages, options) {
        const trace = new MapeKTrace();
        const opts = options ?? {};
        this.totalCalls++;
        trace.enter(MapeKPhase.MONITOR, `total:${this.totalCalls}`);
        // ── PLAN: Select provider ──────────────────────────────
        trace.enter(MapeKPhase.PLAN, 'selecting_provider');
        // Check flywheel advice for blocked/failing providers
        const preferredModel = opts.model;
        // Rank providers by health + priority
        const rankedProviders = this.rankProviders();
        if (rankedProviders.length === 0) {
            trace.finish();
            return {
                content: '',
                provider: 'none',
                model: preferredModel ?? 'unknown',
                attempts: 0,
                latencyMs: trace.totalUs / 1000,
                fallbackUsed: false,
                downgraded: false,
                success: false,
                trace,
                diagnosis: {
                    category: FaultCategory.SERVER_ERROR,
                    confidence: 1.0,
                    shouldRetry: false,
                    skipToFailover: false,
                    rawError: 'No providers available',
                    subCategory: 'no_providers',
                },
            };
        }
        // ── EXECUTE: Try providers in order with retry logic ──
        trace.enter(MapeKPhase.EXECUTE, 'starting_execution');
        const startTime = Date.now();
        let lastResult = null;
        let usedDowngrade = false;
        for (let attemptIdx = 0; attemptIdx < 3; attemptIdx++) {
            for (const provider of rankedProviders) {
                // Skip if we already know this provider is failing
                if (!provider.isAvailable())
                    continue;
                // If downgrading, use a cheaper model
                const callOpts = { ...opts };
                if (usedDowngrade && provider.state.config.models.length > 1) {
                    // Use the cheapest model
                    callOpts.model = provider.state.config.models[provider.state.config.models.length - 1];
                }
                else if (preferredModel && provider.state.config.models.includes(preferredModel)) {
                    callOpts.model = preferredModel;
                }
                else {
                    callOpts.model = provider.state.config.models[0];
                }
                lastResult = await provider.call(messages, callOpts, trace);
                if (lastResult.success) {
                    this.successCalls++;
                    this.totalLatency += lastResult.latencyMs;
                    if (attemptIdx > 0)
                        this.retriedCalls++;
                    if (lastResult.downgraded)
                        this.downgradeCalls++;
                    if (lastResult.fallbackUsed)
                        this.failoverCalls++;
                    // Feed to flywheel
                    trace.enter(MapeKPhase.KNOWLEDGE, 'feeding_flywheel');
                    this.learner.recordOutcome(provider.name, lastResult);
                    trace.finish();
                    // Cap heal level to license max
                    const rawHealLevel = usedDowngrade ? RecoveryLevel.L2_DOWNGRADE
                        : attemptIdx > 0 ? RecoveryLevel.L1_RETRY
                            : undefined;
                    const cappedLevel = capHealLevel(rawHealLevel);
                    return {
                        ...lastResult,
                        healLevel: cappedLevel,
                    };
                }
                // Record failure and try next
                const diag = lastResult.diagnosis;
                if (diag) {
                    const key = diag.category;
                    this.faultStats.set(key, (this.faultStats.get(key) ?? 0) + 1);
                    this.learner.recordOutcome(provider.name, lastResult, diag.category);
                }
                // If auth/validation error — skip remaining retries for this provider
                if (diag?.category === FaultCategory.AUTH_ERROR || diag?.category === FaultCategory.VALIDATION_ERROR) {
                    continue;
                }
                // If retryable, try again (outer retry loop)
                if (diag?.shouldRetry && attemptIdx < 2) {
                    if (diag.retryAfter) {
                        await this.sleep(diag.retryAfter * 1000);
                    }
                    // After a rate limit, downgrade subsequent attempts
                    if (diag.category === FaultCategory.RATE_LIMIT) {
                        usedDowngrade = true;
                    }
                    break; // Try same provider again after delay
                }
            }
            // If we tried all providers and all failed, downgrade and retry
            if (!lastResult?.success) {
                usedDowngrade = true;
            }
        }
        // ── ALL ATTEMPTS EXHAUSTED ──
        this.failedCalls++;
        this.totalLatency += Date.now() - startTime;
        const finalResult = lastResult ?? {
            content: '',
            provider: 'none',
            model: preferredModel ?? 'unknown',
            attempts: 0,
            latencyMs: Date.now() - startTime,
            fallbackUsed: false,
            downgraded: false,
            success: false,
            trace,
            diagnosis: {
                category: FaultCategory.UNKNOWN,
                confidence: 0,
                shouldRetry: false,
                skipToFailover: false,
                rawError: 'All providers exhausted',
                subCategory: 'all_attempts_failed',
            },
        };
        trace.finish();
        return finalResult;
    }
    /**
     * Synchronous-style call (async but simpler interface).
     * Takes a single prompt string, wraps it as a user message.
     */
    async callSync(prompt, options) {
        return this.call([{ role: 'user', content: prompt }], options);
    }
    /** Rank providers by health score + priority. */
    rankProviders() {
        return this.getAllProviders()
            .filter((p) => p.state.config.enabled)
            .sort((a, b) => {
            // Available providers first
            const aAvail = a.isAvailable() ? 0 : 1;
            const bAvail = b.isAvailable() ? 0 : 1;
            if (aAvail !== bAvail)
                return aAvail - bAvail;
            // Health score descending
            const aHealth = a.healthScore;
            const bHealth = b.healthScore;
            if (Math.abs(aHealth - bHealth) > 0.1)
                return bHealth - aHealth;
            // Priority ascending (lower = higher priority)
            return a.state.config.priority - b.state.config.priority;
        });
    }
    /** Get engine statistics. */
    getStats() {
        const providerStats = {};
        for (const [name, p] of this.providers) {
            providerStats[name] = {
                totalCalls: p.state.callCount,
                successCalls: p.state.successCount,
                failedCalls: p.state.failureCount,
                avgLatencyMs: p.avgLatency,
                healthScore: p.healthScore,
                cbState: p.circuitState,
            };
        }
        const faultStats = {};
        for (const [cat, count] of this.faultStats) {
            faultStats[cat] = count;
        }
        return {
            totalCalls: this.totalCalls,
            successCalls: this.successCalls,
            failedCalls: this.failedCalls,
            retriedCalls: this.retriedCalls,
            failoverCalls: this.failoverCalls,
            downgradeCalls: this.downgradeCalls,
            avgLatencyMs: this.totalCalls > 0 ? this.totalLatency / this.totalCalls : 0,
            providerStats,
            faultStats,
        };
    }
    /** Get the flywheel learner (for introspection). */
    getLearner() {
        return this.learner;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
// ── License-aware heal level capping ───────────────────────────
/**
 * Cap the recovery level to the license's maximum heal level.
 * Free: L1 only. Pro+: L3.
 */
function capHealLevel(level) {
    if (level === undefined)
        return undefined;
    const maxLevel = license.maxHealLevel;
    // Numeric comparison: L1 < L2 < L3
    const levelNum = parseInt(level.split('_')[0].replace('l', ''), 10);
    if (isNaN(levelNum))
        return level;
    if (levelNum > maxLevel) {
        return `l${maxLevel}_retry`;
    }
    return level;
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FACTORY FUNCTION — mirrors Python's nb.run()
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Create and configure a SelfHealingEngine.
 *
 * Usage:
 * ```typescript
 * import { createEngine } from 'neuralbridge-sdk';
 * const engine = createEngine({ providers: ['openai', 'anthropic'] });
 * ```
 */
export function createEngine(options) {
    return new SelfHealingEngine(options);
}
//# sourceMappingURL=engine.js.map