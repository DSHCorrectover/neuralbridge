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
export declare enum ProPlan {
    NONE = "none",
    FREE = "free",
    TRIAL = "trial",
    PRO = "pro",
    PROFESSIONAL = "professional",
    ENTERPRISE = "enterprise",
    ENTERPRISE_CUSTOM = "enterprise_custom"
}
interface PlanLimits {
    maxProviders: number;
    maxHealLevel: number;
    allowFlywheelPersistence: boolean;
    allowCustomDiagnoser: boolean;
    watermark: boolean;
}
declare class LicenseManager {
    private state;
    private initialized;
    /**
     * Initialize license from env var on first import.
     * Called automatically — safe to call multiple times.
     */
    init(): void;
    /**
     * Activate a license key.
     *
     * Tries online activation first, falls back to offline key parsing.
     */
    activate(key: string): Promise<{
        success: boolean;
        plan: ProPlan;
        message: string;
    }>;
    /**
     * Verify current license online.
     */
    verify(): Promise<{
        valid: boolean;
        plan: ProPlan;
        expiresAt: number;
    }>;
    /**
     * Check if the current plan can use a feature.
     */
    canUse(feature: string): boolean;
    /**
     * Get current plan info.
     */
    getPlan(): {
        plan: ProPlan;
        key: string;
        activated: boolean;
    };
    /**
     * Check if this is a Pro or higher plan.
     */
    get isPro(): boolean;
    /**
     * Get max allowed providers.
     */
    get maxProviders(): number;
    /**
     * Get max heal level (1-3).
     */
    get maxHealLevel(): number;
    /**
     * Check if watermark should be appended.
     */
    get watermarkEnabled(): boolean;
    /**
     * Check if flywheel persistence is allowed.
     */
    get canPersistFlywheel(): boolean;
    /**
     * Get the current plan's limits.
     */
    getLimits(): PlanLimits;
    /**
     * Get pricing URL for the README/docs.
     */
    get pricingUrl(): string;
    private onlineActivate;
    private parseKeyPrefix;
    private parsePlan;
    private applyPlan;
}
/** Global license manager instance. */
export declare const license: LicenseManager;
export {};
//# sourceMappingURL=license.d.ts.map