#!/usr/bin/env node
// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
/**
 * NeuralBridge CLI — `nb-doctor` command-line tool.
 *
 * Usage:
 *   nb-doctor                   # Run health check
 *   nb-doctor auth              # Verify API keys
 *   nb-doctor status            # Show engine status
 *   nb-doctor diagnose <error>  # Diagnose an error
 */
import { createEngine } from './engine.js';
import { FaultCategory, CircuitState } from './types.js';
import { license } from './license.js';
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] ?? 'status';
    switch (command) {
        case 'auth':
            await cmdAuth();
            break;
        case 'status':
            await cmdStatus();
            break;
        case 'diagnose':
            await cmdDiagnose(args.slice(1).join(' '));
            break;
        case 'pro':
            await cmdPro(args.slice(1));
            break;
        case '--help':
        case 'help':
            showHelp();
            break;
        default:
            console.log(`Unknown command: ${command}`);
            showHelp();
            process.exit(1);
    }
}
async function cmdAuth() {
    console.log('🔑 NeuralBridge API Key Check\n');
    const envKeys = {
        OPENAI_API_KEY: 'openai',
        ANTHROPIC_API_KEY: 'anthropic',
        DEEPSEEK_API_KEY: 'deepseek',
        GOOGLE_API_KEY: 'google',
        DASHSCOPE_API_KEY: 'dashscope',
        GROQ_API_KEY: 'groq',
        NVIDIA_API_KEY: 'nvidia',
        AGNES_API_KEY: 'agnes',
    };
    let found = 0;
    for (const [envVar, provider] of Object.entries(envKeys)) {
        const key = process.env[envVar];
        if (key) {
            const masked = key.length > 8 ? key.slice(0, 4) + '...' + key.slice(-4) : '***';
            console.log(`  ✅ ${provider.padEnd(12)} (${envVar}=${masked})`);
            found++;
        }
        else {
            console.log(`  ⬜ ${provider.padEnd(12)} (${envVar} not set)`);
        }
    }
    if (found === 0) {
        console.log('\n  ⚠️  No API keys found. Set at least one provider key to use NeuralBridge.');
        console.log('  Example: export OPENAI_API_KEY=sk-...');
    }
    else {
        console.log(`\n  ✅ ${found} provider(s) configured`);
    }
}
async function cmdStatus() {
    console.log('🧠 NeuralBridge SDK — Engine Status\n');
    // Detect configured providers
    const providers = [];
    const envMap = {
        openai: 'OPENAI_API_KEY',
        anthropic: 'ANTHROPIC_API_KEY',
        deepseek: 'DEEPSEEK_API_KEY',
        google: 'GOOGLE_API_KEY',
        dashscope: 'DASHSCOPE_API_KEY',
        groq: 'GROQ_API_KEY',
        nvidia: 'NVIDIA_API_KEY',
        agnes: 'AGNES_API_KEY',
    };
    for (const [provider, envVar] of Object.entries(envMap)) {
        if (process.env[envVar])
            providers.push(provider);
    }
    if (providers.length === 0) {
        console.log('  ⚠️  No providers configured.');
        console.log('  Set at least one environment variable: OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.\n');
    }
    else {
        console.log(`  Providers: ${providers.join(', ')}\n`);
        const engine = createEngine({ providers });
        const stats = engine.getStats();
        console.log('  Provider Status:');
        for (const [name, p] of Object.entries(stats.providerStats)) {
            const status = p.cbState === CircuitState.CLOSED ? '✅' : '🔴';
            console.log(`    ${status} ${name.padEnd(12)} health=${(p.healthScore * 100).toFixed(0)}% latency=${p.avgLatencyMs.toFixed(0)}ms`);
        }
        const plan = license.getPlan();
        const planEmoji = plan.activated ? '🔒' : '🔓';
        console.log(`\n  ${planEmoji} License: ${plan.plan}${plan.activated ? ` (key: ${plan.key})` : ' — Free tier (2 providers, L1 heal)'}`);
        console.log(`  SDK Version: 1.1.0 (TypeScript)`);
        console.log(`  Node.js: ${process.version}`);
    }
}
async function cmdPro(subArgs) {
    const action = subArgs[0] ?? 'status';
    switch (action) {
        case 'activate': {
            const key = subArgs[1] ?? process.env.NEURALBRIDGE_LICENSE_KEY ?? '';
            if (!key) {
                console.log('Usage: nb-doctor pro activate <license-key>');
                console.log('Or set NEURALBRIDGE_LICENSE_KEY environment variable.');
                console.log('\nGet a license key at: https://neuralbridge.cn/pricing');
                process.exit(1);
            }
            console.log('🔑 Activating NeuralBridge Pro...');
            const result = await license.activate(key);
            if (result.success) {
                console.log(`  ✅ Activated! Plan: ${result.plan}`);
                console.log('  All Pro features are now available.');
            }
            else {
                console.log(`  ❌ Activation failed: ${result.message}`);
                process.exit(1);
            }
            break;
        }
        case 'status':
        case 'info': {
            const plan = license.getPlan();
            const limits = license.getLimits();
            console.log('🔒 NeuralBridge License Info\n');
            console.log(`  Plan:         ${plan.plan}`);
            console.log(`  Key:          ${plan.activated ? plan.key : '(none)'}`);
            console.log(`  Status:       ${plan.activated ? '✅ Active' : '🔓 Free tier'}`);
            console.log(`  Max Providers: ${limits.maxProviders === 999 ? 'Unlimited' : limits.maxProviders}`);
            console.log(`  Max Heal Level: L${limits.maxHealLevel}`);
            console.log(`  Watermark:    ${limits.watermark ? '⚠️  Enabled (upgrade to remove)' : '✅ Removed'}`);
            console.log(`  Flywheel Persist: ${limits.allowFlywheelPersistence ? '✅ Yes' : '❌ No'}`);
            console.log(`\n  Pricing: https://neuralbridge.cn/pricing`);
            break;
        }
        case 'trial': {
            console.log('🔑 Requesting 7-day trial...\n');
            console.log('  Visit https://neuralbridge.cn/pricing to start your free trial.');
            console.log('  No credit card required.');
            break;
        }
        default:
            console.log(`Usage: nb-doctor pro <command>\n`);
            console.log('Commands:');
            console.log('  activate <key>  Activate a license key');
            console.log('  status          Show license status');
            console.log('  info            Same as status');
            console.log('  trial           Start a free trial');
            break;
    }
}
async function cmdDiagnose(errorText) {
    if (!errorText) {
        console.log('Usage: nb-doctor diagnose "<error message>"');
        process.exit(1);
    }
    const { Diagnoser } = await import('./diagnoser.js');
    const diagnoser = new Diagnoser();
    const diagnosis = diagnoser.diagnose(errorText);
    const categoryLabels = {
        rate_limit: '🚦 Rate Limit',
        auth_error: '🔑 Auth Error',
        model_not_found: '🔍 Model Not Found',
        server_error: '💥 Server Error',
        timeout: '⏰ Timeout',
        connection_error: '🔌 Connection Error',
        quota_exceeded: '💰 Quota Exceeded',
        validation_error: '⚠️  Validation Error',
        unknown: '❓ Unknown',
    };
    console.log('🔍 NeuralBridge Error Diagnosis\n');
    console.log(`  Category:    ${categoryLabels[diagnosis.category] ?? diagnosis.category}`);
    console.log(`  Confidence:  ${(diagnosis.confidence * 100).toFixed(0)}%`);
    console.log(`  Should Retry: ${diagnosis.shouldRetry ? '✅ Yes' : '❌ No'}`);
    console.log(`  Failover:    ${diagnosis.skipToFailover ? '✅ Recommended' : '❌ Not needed'}`);
    if (diagnosis.retryAfter) {
        console.log(`  Retry After: ${diagnosis.retryAfter}s`);
    }
    console.log(`  Sub-category: ${diagnosis.subCategory || 'unclassified'}`);
    console.log('\n  Recommended Action:');
    if (diagnosis.category === FaultCategory.AUTH_ERROR) {
        console.log('    Check your API key and ensure it has access to the requested model.');
    }
    else if (diagnosis.category === FaultCategory.RATE_LIMIT) {
        console.log('    Wait and retry with exponential backoff. Consider downgrading model.');
    }
    else if (diagnosis.category === FaultCategory.TIMEOUT) {
        console.log('    Increase timeout or use a faster model. Try failover to another provider.');
    }
    else if (diagnosis.category === FaultCategory.SERVER_ERROR) {
        console.log('    Provider-side issue. Retry with backoff, then failover to backup provider.');
    }
    else if (diagnosis.category === FaultCategory.CONNECTION_ERROR) {
        console.log('    Network issue. Check your internet connection and provider endpoint URL.');
    }
    else if (diagnosis.category === FaultCategory.QUOTA_EXCEEDED) {
        console.log('    Billing limit reached. Check your provider account and upgrade your plan.');
    }
    else {
        console.log('    Try retrying the request. If it persists, check the error details.');
    }
}
function showHelp() {
    console.log(`
🧠 NeuralBridge CLI — nb-doctor

Usage:
  nb-doctor                    Run full health check
  nb-doctor auth               Verify API key configuration
  nb-doctor status             Show engine and provider status
  nb-doctor diagnose <error>   Diagnose an error message
  nb-doctor pro <command>      Manage Pro license (activate, status, trial)
  nb-doctor help               Show this help

Pro Commands:
  nb-doctor pro activate <key>  Activate a license key
  nb-doctor pro status          Show license status
  nb-doctor pro trial           Start a 7-day free trial

Environment Variables:
  NEURALBRIDGE_LICENSE_KEY    Pro license key (auto-activate on import)
  OPENAI_API_KEY              OpenAI API key
  ANTHROPIC_API_KEY           Anthropic API key
  DEEPSEEK_API_KEY            DeepSeek API key
  GOOGLE_API_KEY              Google AI API key
  DASHSCOPE_API_KEY           Alibaba DashScope API key
  GROQ_API_KEY                Groq API key
  NVIDIA_API_KEY              NVIDIA API key
  AGNES_API_KEY               Agnes API key

Pricing: https://neuralbridge.cn/pricing
`);
}
main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map