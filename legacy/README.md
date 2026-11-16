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
