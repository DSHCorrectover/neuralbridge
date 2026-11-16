/**
 * Core type definitions for NeuralBridge TypeScript SDK.
 * Mirrors the type system from Python/Go SDKs in idiomatic TypeScript.
 */
export declare enum MapeKPhase {
    MONITOR = "monitor",
    ANALYZE = "analyze",
    PLAN = "plan",
    EXECUTE = "execute",
    KNOWLEDGE = "knowledge"
}
export declare enum FaultCategory {
    RATE_LIMIT = "rate_limit",
    AUTH_ERROR = "auth_error",
    MODEL_NOT_FOUND = "model_not_found",
    SERVER_ERROR = "server_error",
    TIMEOUT = "timeout",
    CONNECTION_ERROR = "connection_error",
    QUOTA_EXCEEDED = "quota_exceeded",
    VALIDATION_ERROR = "validation_error",
    UNKNOWN = "unknown"
}
export declare enum CircuitState {
    CLOSED = "closed",
    OPEN = "open",
    HALF_OPEN = "half_open"
}
export declare enum SemanticDomain {
    STRONG_EQUIV = "strong_equiv",
    TAU_NEIGHBORHOOD = "tau_neighborhood",
    OUT_OF_BOUNDS = "out_of_bounds"
}
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    tool_call_id?: string;
}
export interface ChatRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stream?: boolean;
    stop?: string | string[];
    frequency_penalty?: number;
    presence_penalty?: number;
}
export interface ChatChoice {
    index: number;
    message: ChatMessage;
    finish_reason: string;
}
export interface TokenUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}
export interface ChatResponseDTO {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: ChatChoice[];
    usage?: TokenUsage;
}
export interface Diagnosis {
    category: FaultCategory;
    confidence: number;
    shouldRetry: boolean;
    skipToFailover: boolean;
    retryAfter?: number;
    rawError: string;
    subCategory: string;
}
export declare enum RecoveryAction {
    RETRY = "retry",
    WAIT_AND_RETRY = "wait_and_retry",
    DOWNGRADE = "downgrade",
    FAILOVER = "failover",
    SKIP_PROVIDER = "skip_provider",
    CHECK_CREDENTIALS = "check_credentials",
    FIX_REQUEST = "fix_request",
    NONE = "none"
}
export declare enum RecoveryLevel {
    L1_RETRY = "l1_retry",
    L2_DOWNGRADE = "l2_downgrade",
    L3_FAILOVER = "l3_failover",
    L4_LEARNED = "l4_learned",
    NONE = "none"
}
export interface ProviderConfig {
    name: string;
    baseURL: string;
    apiKey?: string;
    authType?: string;
    models: string[];
    headers?: Record<string, string>;
    timeout: number;
    maxRetries: number;
    rateLimitRPS: number;
    maxConcurrency: number;
    priority: number;
    enabled: boolean;
}
export declare const PROVIDER_PRESETS: Record<string, Omit<ProviderConfig, 'apiKey' | 'priority' | 'enabled'>>;
export interface CallResult {
    content: string;
    provider: string;
    model: string;
    attempts: number;
    diagnosis?: Diagnosis;
    trace?: MapeKTrace;
    latencyMs: number;
    fallbackUsed: boolean;
    downgraded: boolean;
    healLevel?: string;
    tokenUsage?: TokenUsage;
    rawResponse?: Record<string, unknown>;
    success: boolean;
}
export interface PhaseRecord {
    phase: MapeKPhase;
    timestamp: number;
    detail: string;
}
export declare class MapeKTrace {
    phases: PhaseRecord[];
    startTime: number;
    endTime: number;
    constructor();
    enter(phase: MapeKPhase, detail?: string): void;
    finish(): void;
    get totalUs(): number;
    toJSON(): Record<string, unknown>;
}
export interface ProviderStats {
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    avgLatencyMs: number;
    healthScore: number;
    cbState: CircuitState;
}
export interface EngineStats {
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    retriedCalls: number;
    failoverCalls: number;
    downgradeCalls: number;
    avgLatencyMs: number;
    providerStats: Record<string, ProviderStats>;
    faultStats: Partial<Record<FaultCategory, number>>;
}
export interface ContractCheck {
    name: string;
    passed: boolean;
    score: number;
    detail?: string;
}
export interface ContractResult {
    valid: boolean;
    score: number;
    checks: ContractCheck[];
}
export interface Contract {
    schema?: Record<string, unknown>;
    determinism?: boolean;
    similarity?: number;
    entities?: string[];
    forbidden?: string[];
}
export interface CallOptions {
    model?: string;
    apiType?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stream?: boolean;
    stop?: string | string[];
    frequencyPenalty?: number;
    presencePenalty?: number;
    timeout?: number;
    signal?: AbortSignal;
}
export declare const APITypeChat = "chat";
export declare const APITypeCompletions = "completions";
export declare const APITypeEmbeddings = "embeddings";
export interface EngineOptions {
    providers?: string[];
    apiKeys?: Record<string, string>;
    configs?: ProviderConfig[];
    verbose?: boolean;
    licenseKey?: string;
}
export interface ClientOptions {
    providers: string[];
    strategy?: 'cost' | 'latency' | 'quality';
    apiKeys?: Record<string, string>;
    configs?: ProviderConfig[];
    verbose?: boolean;
    licenseKey?: string;
}
export interface ChatResponse {
    text: string;
    provider: string;
    model: string;
    success: boolean;
    healLevel?: string;
    latencyMs: number;
    tokenUsage?: TokenUsage;
    error?: string;
    raw?: CallResult;
}
export interface CheckpointData {
    id: string;
    sessionId: string;
    stepIndex: number;
    state: Record<string, unknown>;
    createdAt: number;
    metadata?: Record<string, string>;
}
export interface StepResult {
    stepIndex: number;
    output: string;
    checkpoint?: CheckpointData;
    latencyMs: number;
}
export interface StreamChunk {
    content: string;
    done: boolean;
    model?: string;
    finishReason?: string;
    tokenUsage?: TokenUsage;
}
export interface AsyncChatResult {
    text: string;
    error?: Error;
}
//# sourceMappingURL=types.d.ts.map