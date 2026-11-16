# NeuralBridge Legacy Engine (archived)

**Provenance**: npm package `neuralbridge-sdk@1.1.0` (the GitHub repo of the
original `neuralbridge-sdk` account is frozen; the npm package is the surviving
archive). SHA-256 in `PROVENANCE.sha256`. Copyright 2024-2026 NeuralBridge Team,
Apache-2.0. Republished here under the same license by the original author
(Guigui Wang / Correctover).

**What lives here** — the MAPE-K adaptive-loop engine that predates the gateway:

| Module | Role | Gateway v0.2 use |
|---|---|---|
| `engine.js` | SelfHealingEngine — MAPE-K orchestrator | fail-and-recover wrapper: gateway auto-restart, receipt-chain repair |
| `circuit-breaker.js` | trip/half-open/close on upstream failures | upstream MCP server breaker |
| `bulkhead.js` | isolate failing providers | per-target isolation |
| `rate-limiter.js` | token bucket | per-agent/tool quota, receipt-recorded |
| `checkpoint.js` | state checkpointing | receipt-chain durability |
| `diagnoser.js` | failure triage | block-reason enrichment |
| `flywheel.js` | feedback loop | misfire→tuning (matches our semantic-feedback moat) |
| `chat/client/provider/streaming` | LLM transport layer | superceded by agent's own stack; kept for reference |

Legacy code ships as compiled `dist/` (TS build artifacts, maps included). v0.2
re-wraps the relevant modules for the gateway; not vetted for production until
then. Deprecation notice for the Python placeholder on PyPI stands — the real
replacement is `correctover`, not this archive.

---

## Python engine (PyPI `neuralbridge-sdk==5.6.0`)

Recovered from PyPI before the 5.6.1 deprecation tombstone replaced it. Full
module list under `python/` (SHA-256 in `PROVENANCE.sha256`; the two `.so`
files are cp313-x86_64 compiled artifacts — reference only):

- **`gateway.py`** (28KB) — the NB gateway concept already existed here; primary source for v0.2 synthesis with `gateway/gateway.mjs` (receipts + self-healing in one proxy)
- **`_engine.pyi`** — SelfHealingEngine API surface: L1 retry → L2 semantic-equivalent downgrade → L3 failover, MAPE-K trace on every CallResult
- **`shield.py` / `smart_router.py` / `state_machine.py`** — policy + routing layer
- **`_checkup.py` / `checkpoint.py` / `diagnoser.py` / `drift.py` / `health_scorer.py`** — health & drift instrumentation
- **`dashboard.py`** (49KB) — local monitoring surface
- **`benchmark/fault_injector.py`** — fault-injection harness: becomes the falsifiability harness for gateway v0.2 claims
- `_core` / `_engine` / `license` are compiled `.so` — logic reference via `.pyi` + surrounding pure-Python modules

**Synthesis plan (v0.2)**: `gateway.mjs` owns the receipt chain (CCS discipline);
the Python engine contributes circuit-breaker semantics, L1/L2/L3 healing and
the fault-injector harness. Route: re-implement healing semantics in TypeScript
against the receipts chain (no cross-language IPC in the proxy path), keep
`python/` as behavioral reference + benchmark oracle.
