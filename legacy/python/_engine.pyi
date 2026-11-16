# Copyright 2024-2025 NeuralBridge Team
# Type stubs for compiled module — implementation redacted
# This .pyi file provides IDE type hints only

from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Any, Tuple

class SelfHealingEngine:

@dataclass
class CallResult:
    text: str
    provider: str
    model: str
    success: bool
    fault: Optional['Diagnosis']
    original_provider: str
    original_model: str
    latency_ms: float
    from_cache: bool
    downgraded: bool
    heal_level: str
    semantic_domain: str
    validation_passed: Optional[bool]
    contract_result: Optional[Dict]
    mapek_trace: Optional[Dict]
    raw_response: Optional[Dict]

@dataclass
class ProviderConfig:
    name: str
    base_url: str
    api_key: str
    models: List[str]
    healthy: bool
    success_count: int
    fail_count: int
    last_error: str
    last_error_time: float
    circuit_breaker: CircuitBreaker
    _category_circuit_breakers: dict
    rate_limiter: RateLimiter
    bulkhead: Bulkhead
    _recent_latencies: deque

class APIError:

class FaultCategory(str, Enum):
    RATE_LIMIT = ...
    AUTH_ERROR = ...
    MODEL_NOT_FOUND = ...
    SERVER_ERROR = ...
    TIMEOUT = ...
    CONNECTION_ERROR = ...
    QUOTA_EXCEEDED = ...
    VALIDATION_ERROR = ...
    UNKNOWN = ...

@dataclass
class Diagnosis:
    category: FaultCategory
    confidence: float
    should_retry: bool
    skip_to_failover: bool
    retry_after: Optional[float]
    raw_error: str
    sub_category: str

@dataclass
class CircuitBreaker:
    failure_threshold: int
    error_rate_threshold: float
    window_size: int
    cooldown_seconds: float
    half_open_max: int
    _state: CircuitState
    _consecutive_fails: int
    _window: deque
    _opened_at: float
    _half_open_tries: int
    _last_provider: str
    _trip_count: int

class CircuitState(str, Enum):
    CLOSED = ...
    OPEN = ...
    HALF_OPEN = ...

@dataclass
class RateLimiter:
    max_tokens: int
    refill_rate: float
    _tokens: float
    _last_refill: float
    _lock: threading.Lock
    _rejected: int

@dataclass
class Bulkhead:
    max_concurrent: int
    _semaphore: threading.Semaphore
    _active: int
    _rejected: int
    _lock: threading.Lock

class SemanticTopology:

class SemanticDomain(str, Enum):
    STRONG_EQUIVALENCE = ...
    TAU_NEIGHBORHOOD = ...
    OUT_OF_BOUNDS = ...

@dataclass
class SemanticClassification:
    domain: SemanticDomain
    reason: str
    tau_threshold: Optional[float]

class FlywheelLearner:

@dataclass
class LearnedRule:
    pattern: str
    action: str
    success_count: int
    fail_count: int
    confidence: float
    last_seen: float
    avg_heal_time_ms: float
    source: str
    _heal_times: list

class MetricsCollector:

class MapeKPhase(str, Enum):
    MONITOR = ...
    ANALYZE = ...
    PLAN = ...
    EXECUTE = ...
    KNOWLEDGE = ...

@dataclass
class MapeKTrace:
    request_id: str
    phases: List[Tuple[str, float]]
    monitor_result: Optional[str]
    analyze_result: Optional[str]
    plan_result: Optional[str]
    execute_result: Optional[str]
    knowledge_recorded: bool
    total_loop_us: float

@dataclass
class Contract:
    output_schema: Optional[Dict]
    determinism_hash: Optional[str]
    similarity_threshold: Optional[float]
    reference_text: Optional[str]
    required_entities: Optional[List[str]]
    forbidden_patterns: Optional[List[str]]

@dataclass
class ContractCheck:
    strategy: str
    passed: bool
    detail: str

@dataclass
class ContractResult:
    passed: bool
    checks: List[ContractCheck]
    contract_type: str

class ContractViolationError:

class SemanticBoundaryViolationError:
