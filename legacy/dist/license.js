// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
// ———— Open Core: Free features are Apache 2.0, Pro features require a license key.
/**
 * License & Pro feature management for NeuralBridge SDK.
 *
 * ## Open Core Model
 *
 * | Tier   | Price     | Features |
 * |--------|-----------|----------|
 * | Free   | Apache 2.0 | Core self-healing engine, 2 providers, L1 retry |
 * | Trial  | 7-day free | All Pro features unlocked for evaluation |
 * | Pro    | $99/yr     | Unlimited providers, L3 heal, Flywheel persistence |
 * | Professional | $499/mo | Priority support, team dashboard |
 * | Enterprise   | $1,499/mo | On-prem, SLA 99.9%, audit logs |
 *
 * ## Usage
 *
 * ```typescript
 * import { license, ProPlan } from 'neuralbridge-sdk';
 *
 * // Activate from env var or code
 * license.activate(process.env.NEURALBRIDGE_LICENSE_KEY);
 *
 * // Check if a feature is available
 * if (license.canUse('flywheel_persistence')) {
 *   // Pro feature enabled
 * }
 * ```
 */
// ── Plan types ────────────────────────────────────────────────
export var ProPlan;
(function (ProPlan) {
    ProPlan["NONE"] = "none";
    ProPlan["FREE"] = "free";
    ProPlan["TRIAL"] = "trial";
    ProPlan["PRO"] = "pro";
    ProPlan["PROFESSIONAL"] = "professional";
    ProPlan["ENTERPRISE"] = "enterprise";
    ProPlan["ENTERPRISE_CUSTOM"] = "enterprise_custom";
})(ProPlan || (ProPlan = {}));
// ── Feature definitions ───────────────────────────────────────
const PLAN_FEATURES = {
    [ProPlan.NONE]: new Set(['core_engine']),
    [ProPlan.FREE]: new Set(['core_engine', 'circuit_breaker', 'rate_limiter', 'bulkhead', 'diagnoser', 'basic_flywheel']),
    [ProPlan.TRIAL]: new Set([
        'core_engine', 'circuit_breaker', 'rate_limiter', 'bulkhead', 'diagnoser',
        'advanced_flywheel', 'flywheel_persistence', 'unlimited_providers', 'l3_heal',
        'checkpoint', 'telemetry_export', 'custom_diagnoser',
    ]),
    [ProPlan.PRO]: new Set([
        'core_engine', 'circuit_breaker', 'rate_limiter', 'bulkhead', 'diagnoser',
        'advanced_flywheel', 'flywheel_persistence', 'unlimited_providers', 'l3_heal',
        'checkpoint', 'telemetry_export',
    ]),
    [ProPlan.PROFESSIONAL]: new Set([
        'core_engine', 'circuit_breaker', 'rate_limiter', 'bulkhead', 'diagnoser',
        'advanced_flywheel', 'flywheel_persistence', 'unlimited_providers', 'l3_heal',
        'checkpoint', 'telemetry_export', 'custom_diagnoser', 'team_dashboard',
        'priority_support',
    ]),
    [ProPlan.ENTERPRISE]: new Set([
        'core_engine', 'circuit_breaker', 'rate_limiter', 'bulkhead', 'diagnoser',
        'advanced_flywheel', 'flywheel_persistence', 'unlimited_providers', 'l3_heal',
        'checkpoint', 'telemetry_export', 'custom_diagnoser', 'team_dashboard',
        'priority_support', 'audit_log', 'on_prem_deploy', 'sla_99.9',
    ]),
    [ProPlan.ENTERPRISE_CUSTOM]: new Set([
        'core_engine', 'circuit_breaker', 'rate_limiter', 'bulkhead', 'diagnoser',
        'advanced_flywheel', 'flywheel_persistence', 'unlimited_providers', 'l3_heal',
        'checkpoint', 'telemetry_export', 'custom_diagnoser', 'team_dashboard',
        'priority_support', 'audit_log', 'on_prem_deploy', 'sla_99.9',
        'dedicated_support', 'vpc_deploy',
    ]),
};
const PLAN_LIMITS = {
    [ProPlan.NONE]: { maxProviders: 1, maxHealLevel: 1, allowFlywheelPersistence: false, allowCustomDiagnoser: false, watermark: true },
    [ProPlan.FREE]: { maxProviders: 2, maxHealLevel: 1, allowFlywheelPersistence: false, allowCustomDiagnoser: false, watermark: true },
    [ProPlan.TRIAL]: { maxProviders: 999, maxHealLevel: 3, allowFlywheelPersistence: true, allowCustomDiagnoser: true, watermark: false },
    [ProPlan.PRO]: { maxProviders: 999, maxHealLevel: 3, allowFlywheelPersistence: true, allowCustomDiagnoser: false, watermark: false },
    [ProPlan.PROFESSIONAL]: { maxProviders: 999, maxHealLevel: 3, allowFlywheelPersistence: true, allowCustomDiagnoser: true, watermark: false },
    [ProPlan.ENTERPRISE]: { maxProviders: 999, maxHealLevel: 3, allowFlywheelPersistence: true, allowCustomDiagnoser: true, watermark: false },
    [ProPlan.ENTERPRISE_CUSTOM]: { maxProviders: 999, maxHealLevel: 3, allowFlywheelPersistence: true, allowCustomDiagnoser: true, watermark: false },
};
// ── Activation code prefixes ──────────────────────────────────
const ACTIVATION_PREFIXES = {
    'NB-TRL3-': ProPlan.TRIAL,
    'NB-TRL-': ProPlan.TRIAL,
    'NB-PRO-': ProPlan.PRO,
    'NB-PRF-': ProPlan.PROFESSIONAL,
    'NB-ENT-': ProPlan.ENTERPRISE,
    'NB-ECT-': ProPlan.ENTERPRISE_CUSTOM,
};
// ── API endpoints ─────────────────────────────────────────────
const API_BASE = 'https://api.neuralbridge.cn/api/v1';
// ── Device fingerprint ────────────────────────────────────────
function generateDeviceId() {
    try {
        const os = require('os');
        const hostname = os.hostname();
        const cpus = os.cpus();
        const cpuModel = cpus?.[0]?.model ?? 'unknown';
        const totalMem = os.totalmem()?.toString() ?? '0';
        const hash = simpleHash(`${hostname}|${cpuModel}|${totalMem}`);
        return `DEV-${hash.slice(0, 12)}`;
    }
    catch {
        return `DEV-${Math.random().toString(36).slice(2, 10)}`;
    }
}
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}
// ── Trial code generation ─────────────────────────────────────
function generateTrialCode() {
    const rand = Math.random().toString(36).toUpperCase().slice(2, 8);
    const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
    return `NB-TRL3-${rand}${suffix}`;
}
// ── License Manager ───────────────────────────────────────────
class LicenseManager {
    state = {
        plan: ProPlan.FREE,
        key: '',
        activatedAt: 0,
        expiresAt: 0,
        verified: false,
        deviceId: generateDeviceId(),
        features: new Set(PLAN_FEATURES[ProPlan.FREE]),
    };
    initialized = false;
    /**
     * Initialize license from env var on first import.
     * Called automatically — safe to call multiple times.
     */
    init() {
        if (this.initialized)
            return;
        this.initialized = true;
        const key = process.env.NEURALBRIDGE_LICENSE_KEY ?? process.env.NB_LICENSE_KEY ?? '';
        if (key) {
            this.activate(key).catch(() => {
                // Silent fail — fall back to FREE
            });
        }
    }
    /**
     * Activate a license key.
     *
     * Tries online activation first, falls back to offline key parsing.
     */
    async activate(key) {
        const trimmedKey = key.trim();
        // Try online activation
        try {
            const result = await this.onlineActivate(trimmedKey);
            if (result.success) {
                this.applyPlan(result.plan, trimmedKey);
                return { success: true, plan: result.plan, message: `Activated: ${result.plan}` };
            }
        }
        catch {
            // Fall through to offline
        }
        // Offline: Parse key prefix
        const plan = this.parseKeyPrefix(trimmedKey);
        if (plan && plan !== ProPlan.NONE) {
            this.applyPlan(plan, trimmedKey);
            return { success: true, plan, message: `Offline activation: ${plan}` };
        }
        return { success: false, plan: ProPlan.FREE, message: 'Invalid license key' };
    }
    /**
     * Verify current license online.
     */
    async verify() {
        if (!this.state.key) {
            return { valid: false, plan: ProPlan.FREE, expiresAt: 0 };
        }
        try {
            const response = await fetch(`${API_BASE}/license/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    license_key: this.state.key,
                    device_id: this.state.deviceId,
                }),
                signal: AbortSignal.timeout(5000),
            });
            if (response.ok) {
                const data = await response.json();
                if (data.valid && data.plan) {
                    const plan = this.parsePlan(data.plan);
                    this.state.verified = true;
                    this.state.expiresAt = data.expires_at;
                    if (plan)
                        this.applyPlan(plan, this.state.key);
                    return { valid: true, plan: plan ?? ProPlan.FREE, expiresAt: data.expires_at };
                }
            }
        }
        catch {
            // Network error — use cached state
        }
        return { valid: this.state.verified, plan: this.state.plan, expiresAt: this.state.expiresAt };
    }
    /**
     * Check if the current plan can use a feature.
     */
    canUse(feature) {
        this.init();
        return this.state.features.has(feature);
    }
    /**
     * Get current plan info.
     */
    getPlan() {
        this.init();
        return {
            plan: this.state.plan,
            key: this.state.key ? `${this.state.key.slice(0, 12)}...` : '',
            activated: this.state.plan !== ProPlan.FREE && this.state.plan !== ProPlan.NONE,
        };
    }
    /**
     * Check if this is a Pro or higher plan.
     */
    get isPro() {
        this.init();
        return this.state.plan === ProPlan.PRO
            || this.state.plan === ProPlan.PROFESSIONAL
            || this.state.plan === ProPlan.ENTERPRISE
            || this.state.plan === ProPlan.ENTERPRISE_CUSTOM
            || this.state.plan === ProPlan.TRIAL;
    }
    /**
     * Get max allowed providers.
     */
    get maxProviders() {
        this.init();
        return PLAN_LIMITS[this.state.plan].maxProviders;
    }
    /**
     * Get max heal level (1-3).
     */
    get maxHealLevel() {
        this.init();
        return PLAN_LIMITS[this.state.plan].maxHealLevel;
    }
    /**
     * Check if watermark should be appended.
     */
    get watermarkEnabled() {
        this.init();
        return PLAN_LIMITS[this.state.plan].watermark;
    }
    /**
     * Check if flywheel persistence is allowed.
     */
    get canPersistFlywheel() {
        return this.canUse('flywheel_persistence');
    }
    /**
     * Get the current plan's limits.
     */
    getLimits() {
        this.init();
        return { ...PLAN_LIMITS[this.state.plan] };
    }
    /**
     * Get pricing URL for the README/docs.
     */
    get pricingUrl() {
        return 'https://neuralbridge.cn/pricing';
    }
    // ── Private ──
    async onlineActivate(key) {
        const response = await fetch(`${API_BASE}/license/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                license_key: key,
                device_id: this.state.deviceId,
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.success)
            throw new Error('Activation rejected');
        const plan = this.parsePlan(data.plan);
        if (!plan)
            throw new Error(`Unknown plan: ${data.plan}`);
        if (data.expires_at) {
            this.state.expiresAt = data.expires_at;
        }
        return { success: true, plan };
    }
    parseKeyPrefix(key) {
        for (const [prefix, plan] of Object.entries(ACTIVATION_PREFIXES)) {
            if (key.startsWith(prefix))
                return plan;
        }
        return null;
    }
    parsePlan(s) {
        const normalized = s.toLowerCase().replace(/\s+/g, '_');
        for (const plan of Object.values(ProPlan)) {
            if (plan === normalized)
                return plan;
        }
        // Try common variations
        const map = {
            'pro_individual': ProPlan.PRO,
            'pro': ProPlan.PRO,
            'professional': ProPlan.PROFESSIONAL,
            'enterprise': ProPlan.ENTERPRISE,
            'enterprise_custom': ProPlan.ENTERPRISE_CUSTOM,
            'trial': ProPlan.TRIAL,
            'free': ProPlan.FREE,
        };
        return map[s.toLowerCase()] ?? null;
    }
    applyPlan(plan, key) {
        this.state.plan = plan;
        this.state.key = key;
        this.state.activatedAt = Date.now();
        this.state.features = new Set(PLAN_FEATURES[plan] ?? PLAN_FEATURES[ProPlan.FREE]);
        this.state.verified = true;
    }
}
// ── Singleton ─────────────────────────────────────────────────
/** Global license manager instance. */
export const license = new LicenseManager();
// Auto-init on import
license.init();
//# sourceMappingURL=license.js.map