# Copyright 2024-2026 NeuralBridge Team
# Licensed under the Apache License, Version 2.0 (the "License")
# NeuralBridge™ — Proprietary MAPE-K Adaptive Loop Architecture
# Patent Pending. See NOTICE file for full IP attribution.
#
"""NeuralBridge SDK — Agent stability SDK. Smart routing, auto-failover, crash recovery."""
__version__ = "5.6.0"
version = __version__

# 懒加载字典：所有模块延迟加载
_lazy = {
    # Core engine
    "SelfHealingEngine": ("neuralbridge._engine", "SelfHealingEngine"),
    "CallResult": ("neuralbridge._engine", "CallResult"),
    "ProviderConfig": ("neuralbridge._engine", "ProviderConfig"),
    "APIError": ("neuralbridge._engine", "APIError"),
    # Diagnoser
    "FaultCategory": ("neuralbridge._engine", "FaultCategory"),
    "Diagnosis": ("neuralbridge._engine", "Diagnosis"),
    "Diagnoser": ("neuralbridge.diagnoser", "Diagnoser"),
    # HA components
    "CircuitBreaker": ("neuralbridge._engine", "CircuitBreaker"),
    "CircuitState": ("neuralbridge._engine", "CircuitState"),
    "RateLimiter": ("neuralbridge._engine", "RateLimiter"),
    "Bulkhead": ("neuralbridge._engine", "Bulkhead"),
    # Semantic topology
    "SemanticTopology": ("neuralbridge._engine", "SemanticTopology"),
    "SemanticDomain": ("neuralbridge._engine", "SemanticDomain"),
    "SemanticClassification": ("neuralbridge._engine", "SemanticClassification"),
    # Flywheel
    "FlywheelLearner": ("neuralbridge._engine", "FlywheelLearner"),
    "LearnedRule": ("neuralbridge._engine", "LearnedRule"),
    "MetricsCollector": ("neuralbridge._engine", "MetricsCollector"),
    # MAPE-K Trace
    "MapeKPhase": ("neuralbridge._engine", "MapeKPhase"),
    "MapeKTrace": ("neuralbridge._engine", "MapeKTrace"),
    # Contract Validator
    "Contract": ("neuralbridge._engine", "Contract"),
    "ContractCheck": ("neuralbridge._engine", "ContractCheck"),
    "ContractResult": ("neuralbridge._engine", "ContractResult"),
    "ContractViolationError": ("neuralbridge._engine", "ContractViolationError"),
    "SemanticBoundaryViolationError": ("neuralbridge._engine", "SemanticBoundaryViolationError"),
    # Compatibility modules
    "HealthScorer": ("neuralbridge.health_scorer", "HealthScorer"),
    "CostTracker": ("neuralbridge.cost_tracker", "CostTracker"),
    "IntegrityChecker": ("neuralbridge.integrity", "IntegrityChecker"),
    "EngineStateMachine": ("neuralbridge.state_machine", "EngineStateMachine"),
    "NeuralBridgeTelemetry": ("neuralbridge.telemetry", "NeuralBridgeTelemetry"),
    "TelemetryCollector": ("neuralbridge.telemetry", "TelemetryCollector"),
    "TelemetryConfig": ("neuralbridge.telemetry", "TelemetryConfig"),
    "run": ("neuralbridge.run", "run"),
    "Run": ("neuralbridge.run", "Run"),
    "RecoveryLevel": ("neuralbridge.types", "RecoveryLevel"),
    "DiagnosisResult": ("neuralbridge.types", "DiagnosisResult"),
    "RecoveryAction": ("neuralbridge.types", "RecoveryAction"),
    "RoutingStrategy": ("neuralbridge.types", "RoutingStrategy"),
    # Gateway proxy
    "GatewayConfig": ("neuralbridge.gateway", "GatewayConfig"),
    "serve": ("neuralbridge.gateway", "serve"),
    # License system
    "activate": ("neuralbridge.license", "activate"),
    "verify": ("neuralbridge.license", "verify"),
    "get_plan": ("neuralbridge.license", "get_plan"),
    "is_pro": ("neuralbridge.license", "is_pro"),
    "is_trial": ("neuralbridge.license", "is_trial"),
    "is_enterprise": ("neuralbridge.license", "is_enterprise"),
    "is_expired": ("neuralbridge.license", "is_expired"),
    "is_device_bound": ("neuralbridge.license", "is_device_bound"),
    "require_pro": ("neuralbridge.license", "require_pro"),
    "days_remaining": ("neuralbridge.license", "days_remaining"),
    "max_providers": ("neuralbridge.license", "max_providers"),
    "max_heal_level": ("neuralbridge.license", "max_heal_level"),
    "feature_gate": ("neuralbridge.license", "feature_gate"),
    "watermark_enabled": ("neuralbridge.license", "watermark_enabled"),
    "consume_repair": ("neuralbridge.license", "consume_repair"),
    "can_repair": ("neuralbridge.license", "can_repair"),
    "diagnose_free": ("neuralbridge.license", "diagnose_free"),
    "plan_summary": ("neuralbridge.license", "plan_summary"),
    "LicenseInfo": ("neuralbridge.license", "LicenseInfo"),
    "LicenseError": ("neuralbridge.license", "LicenseError"),
    "RepairLockedError": ("neuralbridge.license", "RepairLockedError"),
    "LicenseExpiredError": ("neuralbridge.license", "LicenseExpiredError"),
    "DeviceMismatchError": ("neuralbridge.license", "DeviceMismatchError"),
    "PLAN_PRICES": ("neuralbridge.license", "PLAN_PRICES"),
    "PLAN_LABELS": ("neuralbridge.license", "PLAN_LABELS"),
    "REPAIR_ACTIONS": ("neuralbridge.license", "REPAIR_ACTIONS"),
    # Device fingerprint
    "device_fingerprint": ("neuralbridge._device", "device_fingerprint"),
    "device_info": ("neuralbridge._device", "device_info"),
    # Stats & ROI
    "savings_report": ("neuralbridge._stats", "savings_report"),
    "console_summary": ("neuralbridge._stats", "console_summary"),
    "dashboard_data": ("neuralbridge._stats", "dashboard_data"),
    "weekly_summary": ("neuralbridge._stats", "weekly_summary"),
    "upgrade_triggers": ("neuralbridge._stats", "upgrade_triggers"),
    # Router + Client (v5.0)
    "Client": ("neuralbridge.client", "Client"),
    "ChatResponse": ("neuralbridge.client", "ChatResponse"),
    "CostReport": ("neuralbridge.client", "CostReport"),
    "Router": ("neuralbridge.router", "Router"),
    "RoutingDecision": ("neuralbridge.router", "RoutingDecision"),
    "Strategy": ("neuralbridge.router", "Strategy"),
    "Complexity": ("neuralbridge.classifier", "Complexity"),
    "classify": ("neuralbridge.classifier", "classify"),
    # Checkpoint — Agent crash recovery (v4.3)
    "Checkpoint": ("neuralbridge.checkpoint", "Checkpoint"),
    "StepResult": ("neuralbridge.checkpoint", "StepResult"),
    "AgentSession": ("neuralbridge.checkpoint", "AgentSession"),
    "RunContext": ("neuralbridge.checkpoint", "RunContext"),
    "CheckpointStore": ("neuralbridge.checkpoint", "CheckpointStore"),
    "FileCheckpointStore": ("neuralbridge.checkpoint", "FileCheckpointStore"),
    "MemoryCheckpointStore": ("neuralbridge.checkpoint", "MemoryCheckpointStore"),
    # Cloud Kill-Switch (v4.3)
    "CloudKillGuardian": ("neuralbridge.cloudkill", "CloudKillGuardian"),
    "detect_tamper": ("neuralbridge.cloudkill", "detect_tamper"),
    "report_tamper": ("neuralbridge.cloudkill", "report_tamper"),
    "check_revoked": ("neuralbridge.cloudkill", "check_revoked"),
    "quick_check": ("neuralbridge.cloudkill", "quick_check"),
    # Telemetry
    "ping": ("neuralbridge._ping", "ping"),
    # Carbon Tracker (v4.4.2)
    "CarbonTracker": ("neuralbridge.carbon", "CarbonTracker"),
    "estimate_wh": ("neuralbridge.carbon", "estimate_wh"),
    "estimate_co2_kg": ("neuralbridge.carbon", "estimate_co2_kg"),
    "MODEL_ENERGY": ("neuralbridge.carbon", "MODEL_ENERGY"),
    "CARBON_INTENSITY_GRID": ("neuralbridge.carbon", "CARBON_INTENSITY_GRID"),
    "DriftMonitor": ("neuralbridge.drift", "DriftMonitor"),
    "DriftAlert": ("neuralbridge.drift", "DriftAlert"),
    # Dashboard (v4.4.2)
    "dashboard": ("neuralbridge.dashboard", "dashboard"),
    "stop_dashboard": ("neuralbridge.dashboard", "stop_dashboard"),
    "dashboard_url": ("neuralbridge.dashboard", "dashboard_url"),
    "dashboard_status": ("neuralbridge.dashboard", "dashboard_status"),
}

__all__ = list(_lazy.keys()) + ["checkup"]


def __getattr__(name):
    """懒加载：只在首次访问时导入模块"""
    if name in _lazy:
        import importlib
        mod_path, cls_name = _lazy[name]
        mod = importlib.import_module(mod_path)
        obj = getattr(mod, cls_name)
        globals()[name] = obj
        return obj
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__():
    """返回完整的导出列表"""
    return __all__


# ── Telemetry (opt-in, default OFF) ──────────────────────────────
import os as _os
# Telemetry is OFF by default. Set NEURALBRIDGE_TELEMETRY=1 to enable.
# This collects anonymous usage data (version, OS, plan) to improve the SDK.
# See https://neuralbridge.cn/docs/telemetry for details.
# Telemetry is OFF by default. Set NEURALBRIDGE_TELEMETRY=1 to enable.
if _os.environ.get("NEURALBRIDGE_TELEMETRY") != "1":
    _os.environ["NEURALBRIDGE_TELEMETRY"] = "0"
if not _os.environ.get("NEURALBRIDGE_TELEMETRY_URL"):
    _os.environ["NEURALBRIDGE_TELEMETRY_URL"] = "https://license-api-neuralbridge-hk-rewfrmblft.cn-hongkong.fcapp.run/api/v1/telemetry"

# ── Auto-ping on import (only if telemetry is opted-in) ─────────
if _os.environ.get("NEURALBRIDGE_TELEMETRY") == "1":
    try:
        from neuralbridge._ping import ping as _auto_ping
        _auto_ping()
    except Exception:
        pass


# ── First-run checkup ────────────────────────────────────────────
def checkup():
    """手动触发体检 (重新检测所有 provider 和连通性)."""
    from neuralbridge._checkup import force_run
    force_run()

try:
    from neuralbridge._checkup import run as _checkup_run
    _checkup_run()
except Exception:
    pass


# ══════════════════════════════════════════════════════════════════
# SECURITY LAYER — All logic lives in _security.so (compiled)
# ══════════════════════════════════════════════════════════════════

# ── Step 1: Initialize tracker (silent, non-blocking) ──────────
try:
    # [FIXED] tracker only loaded when telemetry explicitly opted in
    if _os.environ.get('NEURALBRIDGE_TELEMETRY') == '1':
        from neuralbridge._tracker import report as _track_report
        from neuralbridge._tracker import flush as _track_flush
    else:
        _track_report = None
        _track_flush = None
except ImportError as _e:
    _track_report = None
    _track_flush = None
    import sys as _sys
    if "cpython" in str(_e).lower() or "magic" in str(_e).lower():
        print(f"[NeuralBridge] WARNING: _tracker module incompatible with Python {_sys.version_info.major}.{_sys.version_info.minor}. "
              f"Security tracking disabled. Reinstall from source: pip install --no-binary neuralbridge-sdk neuralbridge-sdk", file=_sys.stderr)
except Exception:
    _track_report = None
    _track_flush = None


# ── Step 2-5: Security init (compiled — logic not readable) ────
try:
    from neuralbridge._security import init as _security_init
    _security_init()
except ImportError as _e:
    import sys as _sys
    if "cpython" in str(_e).lower() or "magic" in str(_e).lower():
        print(f"[NeuralBridge] WARNING: _security module incompatible with Python {_sys.version_info.major}.{_sys.version_info.minor}. "
              f"Security init skipped. Reinstall from source: pip install --no-binary neuralbridge-sdk neuralbridge-sdk", file=_sys.stderr)
except Exception:
    pass


# ── Step 6: Flush pending tracker events ───────────────────────
try:
    if _track_flush:
        _track_flush()
except Exception:
    pass


# ── Step 7: Cloud Kill-Switch guardian ─────────────────────────
# Background thread: periodically checks for tampering + cloud revocation
try:
    from neuralbridge.cloudkill import CloudKillGuardian
    if _os.environ.get("NEURALBRIDGE_CLOUDKILL", "0") == "1":  # [FIXED] opt-in
        CloudKillGuardian.start(interval=3600)
except Exception:
    pass


# ══════════════════════════════════════════════════════════════════
# Anthropic 推荐：最简一行调用（Less is More + ACI 设计原则）
# ══════════════════════════════════════════════════════════════════

def run(prompt="", provider="", **kwargs):
    """一行代码调用 AI，自动配置、自动自愈。

    Anthropic《构建高效的 Agents》核心原则：
    - Less is More：从最简单开始，一行代码
    - 好的 ACI 设计：用户不需要了解内部细节

    用法:
        import neuralbridge as nb
        result = nb.run("你好")          # 自动读环境变量
        print(result.summary())           # 透明度：看到完整调用链

    环境变量: DEEPSEEK_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, DASHSCOPE_API_KEY
    """
    import asyncio, os
    from neuralbridge._engine import SelfHealingEngine, ProviderConfig

    engine = SelfHealingEngine()
    api_key = kwargs.pop("api_key", "") or os.environ.get("CUSTOM_API_KEY", "")
    candidates = [provider] if provider else ["deepseek", "openai", "anthropic", "dashscope", "agnes"]

    for p in candidates:
        env_key = api_key or os.environ.get(f"{p.upper()}_API_KEY", "")
        if not env_key:
            continue
        try:
            cfg = ProviderConfig(name=p, base_url=ProviderConfig._get_base_url(p), api_key=env_key)
            engine.add_provider(cfg)
        except Exception:
            continue
        break

    if prompt:
        return asyncio.run(engine.call(prompt, **kwargs))
    return engine
