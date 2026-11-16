import { FaultCategory, CallResult } from './types.js';
/**
 * LearnedRule — a single automatically-learned routing rule from past failures.
 */
export interface LearnedRule {
    id: string;
    pattern: string;
    category: FaultCategory;
    targetProvider: string;
    action: 'retry' | 'downgrade' | 'failover' | 'block';
    confidence: number;
    hitCount: number;
    successCount: number;
    createdAt: number;
    lastUsedAt: number;
    expiresAt: number;
}
/**
 * MetricsCollector — records per-provider, per-category metrics for flywheel learning.
 */
export declare class MetricsCollector {
    private metrics;
    private faultCounts;
    recordCall(provider: string, latencyMs: number, success: boolean, category?: FaultCategory): void;
    getFailureRate(provider: string): number;
    getAvgLatency(provider: string): number;
    getFaultCount(provider: string, category: FaultCategory): number;
    getHealthScore(provider: string): number;
    toJSON(): Record<string, unknown>;
}
/**
 * FlywheelLearner — learns from past failures to avoid repeating them.
 *
 * L4 boundary: receives data, persists, outputs strategy — NEVER directly routes.
 */
export declare class FlywheelLearner {
    private rules;
    private maxRules;
    private metrics;
    private static ruleCounter;
    constructor(metrics?: MetricsCollector);
    getMetrics(): MetricsCollector;
    /** Record an outcome and potentially create/update a learned rule. */
    recordOutcome(provider: string, result: CallResult, diagnosisCategory?: FaultCategory): void;
    /** Get the best action for a given provider and fault category. */
    getAdvice(provider: string, category: FaultCategory): {
        action: LearnedRule['action'];
        confidence: number;
        targetProvider: string;
    } | null;
    private findRuleByProvider;
    private createOrUpdateRule;
    private determineAction;
    private pickFailoverTarget;
    /** Get all learned rules. */
    getRules(): LearnedRule[];
    toJSON(): Record<string, unknown>;
}
//# sourceMappingURL=flywheel.d.ts.map