// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
import { FaultCategory } from './types.js';
/**
 * MetricsCollector — records per-provider, per-category metrics for flywheel learning.
 */
export class MetricsCollector {
    metrics = new Map();
    faultCounts = new Map(); // "provider:category" → count
    recordCall(provider, latencyMs, success, category) {
        const key = provider;
        let m = this.metrics.get(key);
        if (!m) {
            m = { calls: 0, failures: 0, latencies: [] };
            this.metrics.set(key, m);
        }
        m.calls++;
        m.latencies.push(latencyMs);
        // Keep only last 100 latencies
        if (m.latencies.length > 100)
            m.latencies.shift();
        if (!success) {
            m.failures++;
            m.lastError = category;
            m.lastErrorAt = Date.now();
            if (category) {
                const fk = `${provider}:${category}`;
                this.faultCounts.set(fk, (this.faultCounts.get(fk) ?? 0) + 1);
            }
        }
    }
    getFailureRate(provider) {
        const m = this.metrics.get(provider);
        if (!m || m.calls === 0)
            return 0;
        return m.failures / m.calls;
    }
    getAvgLatency(provider) {
        const m = this.metrics.get(provider);
        if (!m || m.latencies.length === 0)
            return 0;
        return m.latencies.reduce((a, b) => a + b, 0) / m.latencies.length;
    }
    getFaultCount(provider, category) {
        return this.faultCounts.get(`${provider}:${category}`) ?? 0;
    }
    getHealthScore(provider) {
        const m = this.metrics.get(provider);
        if (!m || m.calls === 0)
            return 1.0;
        const failureRate = m.failures / m.calls;
        // Health = 1.0 - weighted failure rate, min 0
        return Math.max(0, 1.0 - failureRate * 3);
    }
    toJSON() {
        const result = {};
        for (const [key, m] of this.metrics) {
            result[key] = {
                calls: m.calls,
                failures: m.failures,
                avgLatency: this.getAvgLatency(key),
                healthScore: this.getHealthScore(key),
                lastError: m.lastError,
            };
        }
        return result;
    }
}
/**
 * FlywheelLearner — learns from past failures to avoid repeating them.
 *
 * L4 boundary: receives data, persists, outputs strategy — NEVER directly routes.
 */
export class FlywheelLearner {
    rules = [];
    maxRules = 100;
    metrics;
    static ruleCounter = 0;
    constructor(metrics) {
        this.metrics = metrics ?? new MetricsCollector();
    }
    getMetrics() {
        return this.metrics;
    }
    /** Record an outcome and potentially create/update a learned rule. */
    recordOutcome(provider, result, diagnosisCategory) {
        if (!diagnosisCategory || result.success) {
            // On success, update matching rule if exists
            const rule = this.findRuleByProvider(provider);
            if (rule) {
                rule.successCount++;
                rule.hitCount++;
            }
            this.metrics.recordCall(provider, result.latencyMs, result.success);
            return;
        }
        this.metrics.recordCall(provider, result.latencyMs, false, diagnosisCategory);
        const failCount = this.metrics.getFaultCount(provider, diagnosisCategory);
        // Learn a rule after 3+ same-category failures
        if (failCount >= 3) {
            this.createOrUpdateRule(provider, diagnosisCategory);
        }
    }
    /** Get the best action for a given provider and fault category. */
    getAdvice(provider, category) {
        const matchingRules = this.rules
            .filter((r) => r.pattern === `${provider}:${category}` && Date.now() < r.expiresAt)
            .sort((a, b) => b.confidence - a.confidence);
        if (matchingRules.length === 0)
            return null;
        const best = matchingRules[0];
        best.lastUsedAt = Date.now();
        best.hitCount++;
        return {
            action: best.action,
            confidence: best.confidence,
            targetProvider: best.targetProvider,
        };
    }
    findRuleByProvider(provider) {
        return this.rules.find((r) => r.pattern.startsWith(provider));
    }
    createOrUpdateRule(provider, category) {
        const pattern = `${provider}:${category}`;
        const existing = this.rules.find((r) => r.pattern === pattern);
        const failCount = this.metrics.getFaultCount(provider, category);
        if (existing) {
            existing.hitCount++;
            existing.confidence = Math.min(0.95, existing.confidence + 0.05);
            existing.lastUsedAt = Date.now();
            existing.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
            return;
        }
        // Determine action based on category
        const action = this.determineAction(provider, category);
        // Pick a target provider for failover (prefer the next one alphabetically)
        const targetProvider = this.pickFailoverTarget(provider);
        FlywheelLearner.ruleCounter++;
        this.rules.push({
            id: `rule-${FlywheelLearner.ruleCounter}`,
            pattern,
            category,
            targetProvider,
            action,
            confidence: Math.min(0.7, 0.3 + failCount * 0.1),
            hitCount: 1,
            successCount: 0,
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
        // Evict oldest rule if over limit
        if (this.rules.length > this.maxRules) {
            this.rules.sort((a, b) => a.createdAt - b.createdAt);
            this.rules.shift();
        }
    }
    determineAction(provider, category) {
        switch (category) {
            case FaultCategory.RATE_LIMIT:
                return 'downgrade';
            case FaultCategory.AUTH_ERROR:
                return 'failover';
            case FaultCategory.TIMEOUT:
                return 'retry';
            case FaultCategory.SERVER_ERROR:
                return 'failover';
            case FaultCategory.QUOTA_EXCEEDED:
                return 'failover';
            case FaultCategory.CONNECTION_ERROR:
                return 'failover';
            default:
                return 'retry';
        }
    }
    pickFailoverTarget(provider) {
        const ordered = ['openai', 'anthropic', 'deepseek', 'google', 'dashscope', 'groq'];
        const idx = ordered.indexOf(provider);
        if (idx >= 0 && idx < ordered.length - 1)
            return ordered[idx + 1];
        return ordered[0];
    }
    /** Get all learned rules. */
    getRules() {
        return this.rules;
    }
    toJSON() {
        return {
            rules: this.rules,
            metrics: this.metrics.toJSON(),
        };
    }
}
//# sourceMappingURL=flywheel.js.map