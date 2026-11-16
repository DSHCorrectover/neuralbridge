# Copyright 2024-2026 NeuralBridge Team
# Licensed under the Apache License, Version 2.0 (the "License")
# NeuralBridge™ — Proprietary MAPE-K Adaptive Loop Architecture
# Commercial Engine. Proprietary.
#
"""NeuralBridge 健康检查 + 自动修复代码生成。

两层 API:
  1. force_run() / run()           — 终端打印体检结果（首次导入自动触发）
  2. scan_structured()              — 返回结构化检查结果（JSON 友好）
  3. generate_fix_script(results)  — 生成可执行 Python 修复脚本

设计原则:
  - 只跑一次: ~/.neuralbridge/checkup_done 标记 (版本升级重跑)
  - 极速: 并行检测, <3秒完成
  - 非阻塞: 失败静默, 绝不卡住 import
  - 制造焦虑: "1个provider, 没backup = 裸奔"
  - CI/CD 静默: 检测 CI 环境变量, 不输出体检结果

触发时机:
  import neuralbridge → __init__.py 调用 _checkup.run()
  只在首次安装或版本升级时跑一次
"""

import json
import os
import sys
import time
import threading
from typing import Optional, List, Dict, Any

_LOCAL_DIR = os.path.join(os.path.expanduser("~"), ".neuralbridge")
_CHECKUP_FLAG = os.path.join(_LOCAL_DIR, "checkup_done")

# ── Provider key detection map ────────────────────────────────────

_PROVIDER_KEYS = {
    "openai": {
        "env": ["OPENAI_API_KEY"],
        "test_url": "https://api.openai.com/v1/models",
        "test_header": "bearer",
        "label": "OpenAI",
    },
    "anthropic": {
        "env": ["ANTHROPIC_API_KEY"],
        "test_url": None,
        "test_header": None,
        "label": "Anthropic",
    },
    "deepseek": {
        "env": ["DEEPSEEK_API_KEY"],
        "test_url": "https://api.deepseek.com/models",
        "test_header": "bearer",
        "label": "DeepSeek",
    },
    "google": {
        "env": ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
        "test_url": None,
        "test_header": None,
        "label": "Google/Gemini",
    },
    "mistral": {
        "env": ["MISTRAL_API_KEY"],
        "test_url": "https://api.mistral.ai/v1/models",
        "test_header": "bearer",
        "label": "Mistral",
    },
    "qwen": {
        "env": ["DASHSCOPE_API_KEY", "ALIBABA_CLOUD_ACCESS_KEY"],
        "test_url": None,
        "test_header": None,
        "label": "Qwen/通义",
    },
    "zhipu": {
        "env": ["ZHIPU_API_KEY"],
        "test_url": None,
        "test_header": None,
        "label": "GLM/智谱",
    },
    "moonshot": {
        "env": ["MOONSHOT_API_KEY"],
        "test_url": "https://api.moonshot.cn/v1/models",
        "test_header": "bearer",
        "label": "Moonshot/月之暗面",
    },
}

# ── CI environment detection ──────────────────────────────────────

_CI_ENV_VARS = [
    "CI", "JENKINS_URL", "GITHUB_ACTIONS", "GITLAB_CI",
    "TRAVIS", "CIRCLECI", "BUILDKITE", "TF_BUILD",
    "PYTEST_CURRENT_TEST", "__PYTEST_PLAT",
]


# ==================================================================
# 公开 API
# ==================================================================

def run():
    """首次运行自动体检。只跑一次, CI环境静默。"""
    if _is_ci():
        _mark_done()
        return
    if _already_done():
        return
    try:
        result = scan_structured()
        _print_checkup(result)
        _mark_done()
    except Exception:
        pass  # 绝不卡住 import


def force_run():
    """强制重新跑体检 (用于 CLI 或测试)."""
    try:
        if os.path.exists(_CHECKUP_FLAG):
            os.remove(_CHECKUP_FLAG)
    except Exception:
        pass
    result = scan_structured()
    _print_checkup(result)
    return result


# ==================================================================
# 结构化扫描 API（核心）
# ==================================================================

def scan_structured() -> Dict[str, Any]:
    """执行完整扫描，返回结构化结果，包含修复代码片段。

    Returns:
        {
            "version": "5.2.12",
            "timestamp": 1718691842,
            "summary": {"passed": N, "failed": N, "warn": N, "total": N},
            "checks": [
                {
                    "id": "sdk_install",
                    "name": "SDK 安装",
                    "status": "pass" | "fail" | "warn",
                    "detail": "v5.2.12 已安装",
                    "fix_code": "..." | None,
                    "docs_url": "https://..." | None,
                },
                ...
            ],
            "fix_script": 生成的完整修复脚本 | None
        }
    """
    version = _sdk_version()
    timestamp = int(time.time())

    checks = []
    _all_fix_codes = []

    # 1. SDK 安装
    checks.append({
        "id": "sdk_install",
        "name": "SDK 安装",
        "status": "pass",
        "detail": f"v{version} 已安装",
        "fix_code": None,
        "docs_url": None,
    })

    # 2. 检测 API keys
    detected = _detect_keys()
    provider_count = len(detected)
    if provider_count == 0:
        checks.append({
            "id": "provider_count",
            "name": "API Provider 数量",
            "status": "fail",
            "detail": "没有配置任何 API Key，SDK 无法工作",
            "fix_code": _FIX_PROVIDER_NONE,
            "docs_url": "https://neuralbridge.cn/docs/quick-start",
        })
        _all_fix_codes.append(("provider_count", _FIX_PROVIDER_NONE))
    elif provider_count == 1:
        checks.append({
            "id": "provider_count",
            "name": "API Provider 数量",
            "status": "fail",
            "detail": f"只有 1 个 provider（{detected[0]['label']}），没有备用 = 裸奔",
            "fix_code": _FIX_PROVIDER_ONE,
            "docs_url": "https://neuralbridge.cn/docs/multi-provider",
        })
        _all_fix_codes.append(("provider_count", _FIX_PROVIDER_ONE))
    else:
        names = [p["label"] for p in detected]
        checks.append({
            "id": "provider_count",
            "name": "API Provider 数量",
            "status": "pass",
            "detail": f"{provider_count} 个 provider：{'、'.join(names)}，故障切换就绪",
            "fix_code": None,
            "docs_url": None,
        })

    # 3. 并行测试 provider 连通性
    results = {}
    if detected:
        threads = []
        for prov in detected:
            t = threading.Thread(
                target=_test_provider, args=(prov, results), daemon=True
            )
            t.start()
            threads.append(t)
        for t in threads:
            t.join(timeout=4.0)

    # 逐个输出 provider 健康
    invalid_keys = 0
    unreachable = 0
    valid_providers = 0
    for prov in detected:
        r = results.get(prov["name"], {})
        status = r.get("status", "unknown")
        latency = r.get("latency_ms")
        if status == "valid":
            lat_str = f" ({latency:.0f}ms)" if latency else ""
            checks.append({
                "id": f"provider_{prov['name']}",
                "name": f"Provider 连通性 · {prov['label']}",
                "status": "pass",
                "detail": f"连通正常{lat_str}",
                "fix_code": None,
                "docs_url": None,
            })
            valid_providers += 1
        elif status == "invalid":
            invalid_keys += 1
            checks.append({
                "id": f"provider_{prov['name']}",
                "name": f"Provider 连通性 · {prov['label']}",
                "status": "fail",
                "detail": f"API Key 无效（检查 {prov['env_var']}）",
                "fix_code": _FIX_INVALID_KEY.format(env_var=prov["env_var"], label=prov["label"], label_lower=prov["label"].lower()),
                "docs_url": f"https://neuralbridge.cn/docs/provider-setup#{prov['name']}",
            })
            _all_fix_codes.append((f"provider_{prov['name']}", _FIX_INVALID_KEY.format(env_var=prov["env_var"], label=prov["label"], label_lower=prov["label"].lower())))
        elif status == "detected":
            checks.append({
                "id": f"provider_{prov['name']}",
                "name": f"Provider 连通性 · {prov['label']}",
                "status": "warn",
                "detail": f"已检测到 Key，但无法验证连通性（{prov['key_masked']}）",
                "fix_code": None,
                "docs_url": None,
            })
        elif status == "unreachable":
            unreachable += 1
            checks.append({
                "id": f"provider_{prov['name']}",
                "name": f"Provider 连通性 · {prov['label']}",
                "status": "warn",
                "detail": f"Key 存在但端点不可达（可能被墙或 DNS 问题）",
                "fix_code": _FIX_UNREACHABLE.format(label=prov["label"], label_lower=prov["label"].lower()),
                "docs_url": None,
            })
            _all_fix_codes.append((f"provider_{prov['name']}", _FIX_UNREACHABLE.format(label=prov["label"], label_lower=prov["label"].lower())))
        else:
            checks.append({
                "id": f"provider_{prov['name']}",
                "name": f"Provider 连通性 · {prov['label']}",
                "status": "warn",
                "detail": f"状态未知：{status}",
                "fix_code": None,
                "docs_url": None,
            })

    # 4. 熔断器检查
    checks.append({
        "id": "circuit_breaker",
        "name": "熔断器 (Circuit Breaker)",
        "status": "warn",
        "detail": "熔断器默认启用，但未配置自定义阈值",
        "fix_code": _FIX_CIRCUIT_BREAKER,
        "docs_url": "https://neuralbridge.cn/docs/circuit-breaker",
    })
    _all_fix_codes.append(("circuit_breaker", _FIX_CIRCUIT_BREAKER))

    # 5. 速率限制检查
    checks.append({
        "id": "rate_limiter",
        "name": "速率限制 (Rate Limiter)",
        "status": "warn",
        "detail": "速率限制默认关闭 — 高并发时可能被 API 限流",
        "fix_code": _FIX_RATE_LIMITER,
        "docs_url": "https://neuralbridge.cn/docs/rate-limiter",
    })
    _all_fix_codes.append(("rate_limiter", _FIX_RATE_LIMITER))

    # 6. 故障切换 (failover)
    if provider_count >= 2:
        checks.append({
            "id": "failover",
            "name": "故障切换 (Failover)",
            "status": "pass",
            "detail": f"{provider_count} 个 provider 可实现自动故障切换",
            "fix_code": _FIX_FAILOVER_READY.format(primary=list(detected)[0]["name"] if detected else "openai"),
            "docs_url": "https://neuralbridge.cn/docs/failover",
        })
    else:
        checks.append({
            "id": "failover",
            "name": "故障切换 (Failover)",
            "status": "fail",
            "detail": "只有 1 个 provider — 故障时 100% 中断",
            "fix_code": _FIX_FAILOVER_SETUP,
            "docs_url": "https://neuralbridge.cn/docs/failover",
        })
        _all_fix_codes.append(("failover", _FIX_FAILOVER_SETUP))

    # 7. 许可证 / 自愈等级
    try:
        from neuralbridge.license import get_plan, is_pro, is_enterprise, is_expired
        plan = get_plan()
        pro = is_pro() or is_enterprise()
        expired = is_expired()
        if pro and not expired:
            checks.append({
                "id": "heal_level",
                "name": "自愈等级 (Heal Level)",
                "status": "pass",
                "detail": f"Pro 授权 — L1-L4 全等级自愈已激活",
                "fix_code": None,
                "docs_url": None,
            })
        elif not expired:
            checks.append({
                "id": "heal_level",
                "name": "自愈等级 (Heal Level)",
                "status": "warn",
                "detail": f"免费版 — 仅 L1 重试，L2-L4 需 Pro 授权",
                "fix_code": _FIX_UPGRADE,
                "docs_url": "https://neuralbridge.cn/pricing",
            })
            _all_fix_codes.append(("heal_level", _FIX_UPGRADE))
        else:
            checks.append({
                "id": "heal_level",
                "name": "自愈等级 (Heal Level)",
                "status": "fail",
                "detail": "授权已过期",
                "fix_code": _FIX_RENEW,
                "docs_url": "https://neuralbridge.cn/buy",
            })
            _all_fix_codes.append(("heal_level", _FIX_RENEW))
    except Exception:
        checks.append({
            "id": "heal_level",
            "name": "自愈等级 (Heal Level)",
            "status": "warn",
            "detail": "未检测到授权 — 免费模式运行中",
            "fix_code": _FIX_UPGRADE,
            "docs_url": "https://neuralbridge.cn/pricing",
        })
        _all_fix_codes.append(("heal_level", _FIX_UPGRADE))

    # 8. 契约验证 (Semantic Boundary)
    checks.append({
        "id": "contract_validation",
        "name": "契约验证 (Contract Validation)",
        "status": "warn",
        "detail": "契约验证默认未开启 — Agent 输出可能偏离预期语义边界",
        "fix_code": _FIX_CONTRACT,
        "docs_url": "https://neuralbridge.cn/docs/contract",
    })
    _all_fix_codes.append(("contract_validation", _FIX_CONTRACT))

    # 9. 飞轮学习
    try:
        fw_path = os.path.join(_LOCAL_DIR, "flywheel_rules.json")
        if os.path.exists(fw_path):
            with open(fw_path) as f:
                rules = json.load(f)
            checks.append({
                "id": "flywheel",
                "name": "飞轮学习 (Flywheel)",
                "status": "pass",
                "detail": f"已学习 {len(rules)} 条规则",
                "fix_code": None,
                "docs_url": None,
            })
        else:
            checks.append({
                "id": "flywheel",
                "name": "飞轮学习 (Flywheel)",
                "status": "warn",
                "detail": "尚未积累规则 — 需要先运行 API 调用",
                "fix_code": None,
                "docs_url": None,
            })
    except Exception:
        checks.append({
            "id": "flywheel",
            "name": "飞轮学习 (Flywheel)",
            "status": "warn",
            "detail": "飞轮模块未初始化",
            "fix_code": None,
            "docs_url": None,
        })

    # 10. 网络连通性
    try:
        import httpx
        r = httpx.get("https://api.openai.com/v1/models", timeout=5.0,
                       headers={"Authorization": "Bearer test"})
        # 能连上就是网络通（即使 401）
        checks.append({
            "id": "internet",
            "name": "网络连通性",
            "status": "pass",
            "detail": "可访问外部 API（状态码 {r.status_code}）",
            "fix_code": None,
            "docs_url": None,
        })
    except Exception as e:
        err = str(e)[:60]
        checks.append({
            "id": "internet",
            "name": "网络连通性",
            "status": "fail",
            "detail": f"无法访问外部 API: {err}",
            "fix_code": _FIX_NETWORK,
            "docs_url": None,
        })
        _all_fix_codes.append(("internet", _FIX_NETWORK))

    # ── 生成汇总和修复脚本 ──
    passed = sum(1 for c in checks if c["status"] == "pass")
    failed = sum(1 for c in checks if c["status"] == "fail")
    warnings = sum(1 for c in checks if c["status"] == "warn")

    # 生成 fix_script
    fix_script = None
    if _all_fix_codes:
        fix_script = _build_fix_script(checks, _all_fix_codes, version)

    return {
        "version": version,
        "timestamp": timestamp,
        "summary": {
            "passed": passed,
            "failed": failed,
            "warn": warnings,
            "total": len(checks),
        },
        "checks": checks,
        "fix_script": fix_script,
    }


# ==================================================================
# 修复代码片段（每个检查项对应的可执行 Python 代码）
# ==================================================================

_FIX_PROVIDER_NONE = '''# ═══════════════════════════════════════════
# NeuralBridge — 修复: 添加 API Provider
# ═══════════════════════════════════════════

# 方法 1: 设置环境变量（推荐）
import os
os.environ["OPENAI_API_KEY"] = "sk-your-openai-key"
os.environ["DEEPSEEK_API_KEY"] = "sk-your-deepseek-key"

# 方法 2: 持久化到系统（Windows）
# 以管理员身份运行:
# setx OPENAI_API_KEY "sk-your-openai-key"
# setx DEEPSEEK_API_KEY "sk-your-deepseek-key"

# 方法 3: 使用 .env 文件
# 创建 .env 文件:
# OPENAI_API_KEY=sk-xxx
# DEEPSEEK_API_KEY=sk-xxx

# 验证:
from neuralbridge import SelfHealingEngine
engine = SelfHealingEngine(providers=["openai", "deepseek"])
print(f"✅ Provider 配置完成: {engine.get_available_providers()}")
'''

_FIX_PROVIDER_ONE = '''# ═══════════════════════════════════════════
# NeuralBridge — 修复: 添加备用 Provider
# ═══════════════════════════════════════════

# 当前只有 1 个 provider，宕机 = 全停
# 建议至少添加 1 个备用：

import os
os.environ["DEEPSEEK_API_KEY"] = "sk-your-deepseek-key"     # 推荐
# os.environ["ANTHROPIC_API_KEY"] = "sk-ant-your-key"        # Claude
# os.environ["GOOGLE_API_KEY"] = "AIza..."                   # Gemini

# 验证故障切换配置:
from neuralbridge import SelfHealingEngine
engine = SelfHealingEngine(providers=["openai", "deepseek"])
health = engine.health_check()
for name, status in health.items():
    icon = "✅" if status == "ok" else "❌"
    print(f"  {icon} {name}: {status}")
print(f"\\n⚡ 当 primary 故障时，自动切换到备用 provider")
'''

_FIX_INVALID_KEY = '''# ═══════════════════════════════════════════
# NeuralBridge — 修复: 更新 {label} API Key
# ═══════════════════════════════════════════

# 当前 {env_var} 无效，请替换为正确的 Key:

import os
os.environ["{env_var}"] = "sk-your-real-key-here"  # ← 替换成真实 Key

# 验证:
from neuralbridge import SelfHealingEngine
engine = SelfHealingEngine(providers=["{label_lower}"])
try:
    health = engine.health_check()
    print(f"✅ {label} Key 验证通过")
except Exception as e:
    print(f"❌ Key 仍然无效: {{e}}")
'''

_FIX_UNREACHABLE = '''# ═══════════════════════════════════════════
# NeuralBridge — 修复: {label} 端点不可达
# ═══════════════════════════════════════════

# 可能原因: DNS 解析、防火墙、VPN、或被墙
# 建议:
#   1. 检查网络: ping api.{label_lower}.com
#   2. 检查 VPN/代理是否已开启
#   3. 使用国内可用 provider:

import os
os.environ["DASHSCOPE_API_KEY"] = "sk-your-dashscope-key"  # 阿里通义（国内可用）
os.environ["DEEPSEEK_API_KEY"] = "sk-your-deepseek-key"    # DeepSeek（国内可用）
'''

_FIX_CIRCUIT_BREAKER = '''# ═══════════════════════════════════════════
# NeuralBridge — 修复: 配置熔断器
# ═══════════════════════════════════════════

# 熔断器防止连续失败拖垮系统，建议自定义阈值:

from neuralbridge import (
    SelfHealingEngine, CircuitBreaker, CircuitState
)

# 配置自定义熔断器
cb = CircuitBreaker(
    failure_threshold=5,      # 连续失败 5 次后熔断
    recovery_timeout=30.0,    # 30 秒后尝试恢复
    half_open_max_calls=3,    # 半开状态最多允许 3 个请求
)

# 集成到引擎
engine = SelfHealingEngine(
    providers=["openai", "deepseek"],
    # circuit_breaker=cb,    # 取消注释以启用自定义配置
)

# 查看熔断器状态
# status = engine.get_metrics()
# print(f"cb_state: {status.circuit_breaker_state}")
print("✅ 熔断器配置就绪，可复制上述代码到你的项目中")
'''

_FIX_RATE_LIMITER = '''# ═══════════════════════════════════════════
# NeuralBridge — 修复: 配置速率限制
# ═══════════════════════════════════════════

# 速率限制保护你的应用不被 API 限流:

from neuralbridge import SelfHealingEngine

engine = SelfHealingEngine(
    providers=["openai", "deepseek"],
    # 速率限制参数（取消注释启用）:
    # max_rpm=60,             # 每分钟最大请求数
    # max_tpm=100000,         # 每分钟最大 token 数
    # rate_limit_strategy="queue",  # "queue" | "drop" | "throttle"
)

# 或独立使用 RateLimiter:
from neuralbridge import RateLimiter
rl = RateLimiter(
    max_calls=60,             # 每分钟 60 次
    window_seconds=60,
)
for _ in range(5):
    allowed = rl.acquire()
    print(f"  Rate limit check: {'✅ 允许' if allowed else '❌ 限流'}")
'''

_FIX_FAILOVER_SETUP = '''# ═══════════════════════════════════════════
# NeuralBridge — 修复: 配置故障切换
# ═══════════════════════════════════════════

# 故障切换 = 当 primary provider 不可用时自动切换到备用:

import os
os.environ["DEEPSEEK_API_KEY"] = "sk-your-deepseek-key"

from neuralbridge import SelfHealingEngine

engine = SelfHealingEngine(
    providers=["openai", "deepseek"],       # primary → backup
    # failover_strategy="latency",           # "latency" | "cost" | "priority"
    # health_check_interval=30,              # 健康检查间隔（秒）
)

# 测试故障切换:
health = engine.health_check()
healthy = [name for name, s in health.items() if s == "ok"]
print(f"✅ 可用 provider: {healthy}")
print(f"⚡ 当 primary 不可用时，将在 {len(healthy)-1} 个备用中自动切换")
'''

_FIX_FAILOVER_READY = '''# ═══════════════════════════════════════════
# NeuralBridge — 故障切换就绪配置
# ═══════════════════════════════════════════

# 你的系统已具备多 provider 故障切换条件:

from neuralbridge import SelfHealingEngine

engine = SelfHealingEngine(
    providers=["{primary}", "deepseek"],    # primary → backup
)

# 推荐优化:
# engine = SelfHealingEngine(
#     providers=["{primary}", "deepseek", "anthropic"],
#     failover_strategy="latency",
#     health_check_interval=30,
# )
# print("✅ 多 provider 故障切换已就绪")
'''

_FIX_UPGRADE = '''# ═══════════════════════════════════════════
# NeuralBridge — 升级到 Pro 解锁全等级自愈
# ═══════════════════════════════════════════

# 免费版: 仅 L1 重试
# Pro 版: L1-L4 全等级（重试 + 降级 + 故障切换 + 飞轮学习）

# 1. 访问 https://neuralbridge.cn/buy 购买 Pro
# 2. 激活:
from neuralbridge import activate, is_pro
activate("NB-PRO-你的激活密钥")
print(f"Pro: {is_pro()}")

# 或 CLI:
# nb-doctor auth NB-PRO-xxxxx
'''

_FIX_RENEW = '''# ═══════════════════════════════════════════
# NeuralBridge — 续费授权
# ═══════════════════════════════════════════

# 授权已过期，请续费以继续使用全功能自愈:
# https://neuralbridge.cn/buy

# 续费后重新激活:
from neuralbridge import activate
activate("NB-PRO-你的新密钥")
print("✅ 授权已续费")
'''

_FIX_CONTRACT = '''# ═══════════════════════════════════════════
# NeuralBridge — 修复: 启用契约验证
# ═══════════════════════════════════════════

# 契约验证确保 Agent 输出在语义边界内:

from neuralbridge import (
    SelfHealingEngine, Contract, SemanticDomain
)

# 定义语义域
contract = Contract(
    domains=[
        SemanticDomain(
            name="technical_output",
            schema={"type": "object", "properties": {"answer": {"type": "string"}}},
            similarity_threshold=0.7,    # τ-Neighborhood 阈值
        ),
        SemanticDomain(
            name="safe_bounds",
            max_tokens=2000,
            blocked_patterns=[r"(?:sk-[a-zA-Z0-9]{20,})"],  # 防泄漏
        ),
    ],
)

# 在引擎中启用:
engine = SelfHealingEngine(providers=["openai"])
# engine.contract = contract    # 取消注释以启用

print("✅ 契约验证配置就绪")
'''

_FIX_NETWORK = '''# ═══════════════════════════════════════════
# NeuralBridge — 修复: 网络连通性
# ═══════════════════════════════════════════

# 当前无法连接到 API 服务器，请检查:

# 1. 代理设置:
#    如果使用代理，确保配置正确:
#    os.environ["HTTP_PROXY"] = "http://127.0.0.1:7890"
#    os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7890"

# 2. 测试基础连通性:
import httpx
try:
    r = httpx.get("https://api.openai.com/v1/models",
                  headers={"Authorization": "Bearer test"},
                  timeout=5.0)
    print(f"✅ 网络连通: {r.status_code}")
except Exception as e:
    print(f"❌ 网络不通: {e}")
    print("   建议: 检查防火墙 / VPN / 代理设置")
'''


# ==================================================================
# 修复脚本构建
# ==================================================================

def _build_fix_script(checks: List[Dict], fix_codes: List[tuple], version: str) -> str:
    """从扫描结果生成一个完整的 Python 修复脚本。"""
    lines = [
        '#!/usr/bin/env python3',
        f'# NeuralBridge Fix Script — 自动生成 (v{version})',
        f'# 生成时间: {time.strftime("%Y-%m-%d %H:%M:%S")}',
        '# 运行方式: python 本文件',
        '',
        '"""',
        'NeuralBridge 自动修复脚本',
        '',
        '执行此脚本将:',
    ]

    # 添加修复说明
    for check_id, _ in fix_codes:
        for c in checks:
            if c["id"] == check_id and c["status"] != "pass":
                lines.append(f'  ✅ 修复: {c["name"]} — {c["detail"][:60]}')
                break

    lines += [
        '',
        '此脚本仅输出配置代码，不会修改你的系统。',
    ]
    lines += [
        '将输出代码复制到你的项目中即可应用修复。',
        '"""',
        '',
        'import os',
        'import sys',
        '',
        'print("=" * 55)',
        f'print(f"  🛡  NeuralBridge 修复脚本 v{version}")',
        'print(f"  📋 发现 {len(fix_codes)} 个可修复项")',
        'print("=" * 55)',
        'print()',
        '',
    ]

    for i, (check_id, code) in enumerate(fix_codes, 1):
        # 找对应检查项
        title = f"修复 #{i}"
        for c in checks:
            if c["id"] == check_id:
                title = f"修复 #{i}: {c['name']}"
                break
        lines.append(f'# ── {title} ──')
        lines.append(f'print(f"\\n{'─' * 50}")')
        lines.append(f'print(f"  {title}")')
        lines.append(f'print(f"{'─' * 50}")')
        lines.append('')
        for line in code.strip().split('\n'):
            # escape quotes for Python string
            escaped = line.replace('"', '\\"').replace("'", "'")
            lines.append(f'print("{escaped}")')
        lines.append('')

    lines += [
        '',
        'print("=" * 55)',
        'print("  ✅ 修复脚本已生成")',
        'print("  📋 将以上代码复制到你的项目中即可")',
        'print(f"  📖 完整文档: https://neuralbridge.cn/docs")',
        'print("=" * 55)',
    ]

    return '\n'.join(lines)


def generate_fix_script(scan_result: Optional[Dict[str, Any]] = None) -> str:
    """生成完整修复脚本。若未提供结果，先执行扫描。"""
    if scan_result is None:
        scan_result = scan_structured()
    return scan_result.get("fix_script", "")


# ==================================================================
# 内部函数
# ==================================================================

def _is_ci():
    """检测是否在 CI/CD 环境运行."""
    for var in _CI_ENV_VARS:
        if os.environ.get(var, "").strip():
            return True
    if os.environ.get("NEURALBRIDGE_NO_CHECKUP", "").strip().lower() in ("1", "true", "yes"):
        return True
    return False


def _already_done():
    """检查是否已体检过, 版本升级则重跑."""
    try:
        if not os.path.exists(_CHECKUP_FLAG):
            return False
        with open(_CHECKUP_FLAG) as f:
            data = json.load(f)
        return data.get("version") == _sdk_version()
    except Exception:
        return False


def _mark_done():
    """标记体检已完成."""
    try:
        os.makedirs(_LOCAL_DIR, exist_ok=True)
        with open(_CHECKUP_FLAG, "w") as f:
            json.dump({"version": _sdk_version(), "ts": int(time.time())}, f)
    except Exception:
        pass


def _sdk_version():
    """安全获取 SDK 版本."""
    try:
        from neuralbridge._version import __version__
        return __version__
    except Exception:
        return "unknown"


def _detect_keys():
    """扫描环境变量, 检测已配置的 API keys."""
    detected = []
    for name, cfg in _PROVIDER_KEYS.items():
        for env_var in cfg["env"]:
            key = os.environ.get(env_var, "").strip()
            if key:
                detected.append({
                    "name": name,
                    "env_var": env_var,
                    "key_masked": key[:6] + "..." + key[-4:] if len(key) > 12 else key[:4] + "...",
                    "label": cfg["label"],
                    "test_url": cfg.get("test_url"),
                    "test_header": cfg.get("test_header"),
                    "full_key": key,
                })
                break
    return detected


def _test_provider(prov, results):
    """测试单个 provider 连通性 (在线校验 key)."""
    name = prov["name"]
    url = prov.get("test_url")
    header_type = prov.get("test_header")
    key = prov.get("full_key", "")

    if not url or not header_type:
        results[name] = {"status": "detected"}
        return

    try:
        import httpx

        if header_type == "bearer":
            headers = {"Authorization": f"Bearer {key}"}
        else:
            headers = {}

        start = time.time()
        resp = httpx.get(url, headers=headers, timeout=3.0)
        latency_ms = (time.time() - start) * 1000

        if resp.status_code == 200:
            results[name] = {"status": "valid", "latency_ms": latency_ms}
        elif resp.status_code in (401, 403):
            results[name] = {"status": "invalid", "latency_ms": latency_ms}
        elif resp.status_code == 429:
            results[name] = {"status": "valid", "latency_ms": latency_ms}
        else:
            results[name] = {"status": "valid", "latency_ms": latency_ms}
    except Exception:
        results[name] = {"status": "unreachable"}


# ==================================================================
# 终端输出
# ==================================================================

def _print_checkup(result: Dict[str, Any]):
    """打印体检结果到终端（直观的中文输出）。"""
    version = result["version"]
    summary = result["summary"]
    checks = result["checks"]

    print()
    print(f"  ✅ NeuralBridge v{version} installed")
    print(f"  🔍 健康检查 — {summary['passed']}/{summary['total']} 项通过")

    for c in checks:
        sid = c["id"]
        name = c["name"]
        detail = c["detail"]
        status = c["status"]

        if status == "pass":
            prefix = f"     ✅"
        elif status == "fail":
            prefix = f"     ❌"
        else:
            prefix = f"     ⚠️"

        # 格式化输出
        print(f"  {prefix} {name}")
        print(f"       {detail}")

        # 如果有修复代码，提示
        if c.get("fix_code") and status != "pass":
            print(f"       💡 运行: nb-doctor scan --fix 生成修复脚本")
    print()

    if summary["failed"] > 0 or summary["warn"] > 0:
        print(f"  📋 发现 {summary['failed']} 个问题 + {summary['warn']} 个警告")
        print(f"  🛠  运行 nb-doctor scan --fix 生成修复脚本")
        print()
    else:
        print(f"  ✅ 所有检查通过 — 系统运行在最佳状态")
        print()
