// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
// NeuralBridge™ — Proprietary MAPE-K Adaptive Loop Architecture
/**
 * Core type definitions for NeuralBridge TypeScript SDK.
 * Mirrors the type system from Python/Go SDKs in idiomatic TypeScript.
 */
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPE-K PHASE ENUM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export var MapeKPhase;
(function (MapeKPhase) {
    MapeKPhase["MONITOR"] = "monitor";
    MapeKPhase["ANALYZE"] = "analyze";
    MapeKPhase["PLAN"] = "plan";
    MapeKPhase["EXECUTE"] = "execute";
    MapeKPhase["KNOWLEDGE"] = "knowledge";
})(MapeKPhase || (MapeKPhase = {}));
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FAULT CATEGORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export var FaultCategory;
(function (FaultCategory) {
    FaultCategory["RATE_LIMIT"] = "rate_limit";
    FaultCategory["AUTH_ERROR"] = "auth_error";
    FaultCategory["MODEL_NOT_FOUND"] = "model_not_found";
    FaultCategory["SERVER_ERROR"] = "server_error";
    FaultCategory["TIMEOUT"] = "timeout";
    FaultCategory["CONNECTION_ERROR"] = "connection_error";
    FaultCategory["QUOTA_EXCEEDED"] = "quota_exceeded";
    FaultCategory["VALIDATION_ERROR"] = "validation_error";
    FaultCategory["UNKNOWN"] = "unknown";
})(FaultCategory || (FaultCategory = {}));
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CIRCUIT STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open";
})(CircuitState || (CircuitState = {}));
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEMANTIC DOMAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export var SemanticDomain;
(function (SemanticDomain) {
    SemanticDomain["STRONG_EQUIV"] = "strong_equiv";
    SemanticDomain["TAU_NEIGHBORHOOD"] = "tau_neighborhood";
    SemanticDomain["OUT_OF_BOUNDS"] = "out_of_bounds";
})(SemanticDomain || (SemanticDomain = {}));
export var RecoveryAction;
(function (RecoveryAction) {
    RecoveryAction["RETRY"] = "retry";
    RecoveryAction["WAIT_AND_RETRY"] = "wait_and_retry";
    RecoveryAction["DOWNGRADE"] = "downgrade";
    RecoveryAction["FAILOVER"] = "failover";
    RecoveryAction["SKIP_PROVIDER"] = "skip_provider";
    RecoveryAction["CHECK_CREDENTIALS"] = "check_credentials";
    RecoveryAction["FIX_REQUEST"] = "fix_request";
    RecoveryAction["NONE"] = "none";
})(RecoveryAction || (RecoveryAction = {}));
export var RecoveryLevel;
(function (RecoveryLevel) {
    RecoveryLevel["L1_RETRY"] = "l1_retry";
    RecoveryLevel["L2_DOWNGRADE"] = "l2_downgrade";
    RecoveryLevel["L3_FAILOVER"] = "l3_failover";
    RecoveryLevel["L4_LEARNED"] = "l4_learned";
    RecoveryLevel["NONE"] = "none";
})(RecoveryLevel || (RecoveryLevel = {}));
export const PROVIDER_PRESETS = {
    openai: {
        name: 'openai',
        baseURL: 'https://api.openai.com/v1',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o3-mini'],
        timeout: 30,
        maxRetries: 3,
        rateLimitRPS: 10,
        maxConcurrency: 10,
    },
    anthropic: {
        name: 'anthropic',
        baseURL: 'https://api.anthropic.com/v1',
        models: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250514', 'claude-3-5-sonnet-20241022'],
        timeout: 60,
        maxRetries: 3,
        rateLimitRPS: 5,
        maxConcurrency: 5,
    },
    deepseek: {
        name: 'deepseek',
        baseURL: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        timeout: 60,
        maxRetries: 3,
        rateLimitRPS: 10,
        maxConcurrency: 10,
    },
    google: {
        name: 'google',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        timeout: 30,
        maxRetries: 2,
        rateLimitRPS: 10,
        maxConcurrency: 10,
    },
    dashscope: {
        name: 'dashscope',
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
        timeout: 60,
        maxRetries: 2,
        rateLimitRPS: 20,
        maxConcurrency: 20,
    },
    groq: {
        name: 'groq',
        baseURL: 'https://api.groq.com/openai/v1',
        models: ['mixtral-8x7b-32768', 'llama-3.3-70b-versatile', 'gemma2-9b-it', 'deepseek-r1-distill-llama-70b'],
        timeout: 30,
        maxRetries: 2,
        rateLimitRPS: 30,
        maxConcurrency: 10,
    },
    nvidia: {
        name: 'nvidia',
        baseURL: 'https://integrate.api.nvidia.com/v1',
        models: ['meta/llama-3.1-405b-instruct', 'mistralai/mistral-7b-instruct'],
        timeout: 30,
        maxRetries: 2,
        rateLimitRPS: 10,
        maxConcurrency: 5,
    },
    agnes: {
        name: 'agnes',
        baseURL: 'https://apihub.agnes-ai.com/v1',
        models: ['agnes-v1', 'agnes-v1-mini'],
        timeout: 30,
        maxRetries: 2,
        rateLimitRPS: 10,
        maxConcurrency: 5,
    },
};
export class MapeKTrace {
    phases = [];
    startTime;
    endTime = 0;
    constructor() {
        this.startTime = Date.now() * 1000;
    }
    enter(phase, detail = '') {
        this.phases.push({
            phase,
            timestamp: Date.now() * 1000,
            detail,
        });
    }
    finish() {
        this.endTime = Date.now() * 1000;
    }
    get totalUs() {
        return this.endTime > 0 ? this.endTime - this.startTime : Date.now() * 1000 - this.startTime;
    }
    toJSON() {
        return {
            phases: this.phases,
            startTime: this.startTime,
            endTime: this.endTime,
            totalUs: this.totalUs,
        };
    }
}
export const APITypeChat = 'chat';
export const APITypeCompletions = 'completions';
export const APITypeEmbeddings = 'embeddings';
//# sourceMappingURL=types.js.map