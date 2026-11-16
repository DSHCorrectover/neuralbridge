# Correctover Resilience Benchmark v1 — vector skeleton

> Every scenario: name | inject type | expected receipt fields | pass condition.
> Status legend: `[x]` implemented in `test/` · `[ ]` registered, pending implementation ·
> each scenario ID is stable — acceptance results cite IDs, never prose.

## 1. Protocol correctness (L0 — corpus: ccs-conformance-vectors, 286 files)

| ID | Class | Scenario | Expected receipt field | Pass condition |
|---|---|---|---|---|
| P-STR-01..35 | structure | 30-field envelope; each missing-field variant (07a family) | `structure_ok` | validator rejects ≤29-field receipts; 30/30 pass |
| P-SEM-01..04 | cross-field | fingerprint mismatch / verdict-response inconsistency / response-hash / [x] done via corpus 05 family | `cross_field_ok` | expected.json verdict honored |
| P-TMP-01..05 | temporal | expired / future-ts / issued-after / skew-boundary / verify-after-expiry (08 family) | `temporal_ok` | all 5 reject |
| P-FPR-01..03 | identity | fingerprint-mismatch / wrong-algo / malformed-pubkey (09 family) | `identity_ok` | all 3 reject |
| P-CHN-01..05 | chain | seq-gap / prev-hash-mismatch / trace-id-mismatch / empty-chain / unanchored (10 family) | `prev_hash` | all 5 reject; positive chain-of-3 verifies |
| P-INT-01..03 | integrity | request/params/config hash mismatch (11 family) | `*_hash` | all 3 reject |
| P-NON-01..02 | nonce | replay / empty nonce (12 family) | `nonce` | both reject |

## 2. Schema edge corpus (L0+ — new, census-derived)

| ID | Scenario | Pass condition |
|---|---|---|
| E-SCH-01 | empty schema `{}` | synthesis → `{}` args, receipt issued |
| E-SCH-02 | recursive schema (self-referencing $ref) | synthesis depth-caps at 10, receipt issued, no hang |
| E-SCH-03 | nesting > 20 levels | depth-capped, receipt issued, depth recorded in `args_depth` |
| E-SCH-04 | 100+ required fields | all synthesized, digest stable |
| E-SCH-05 | declared string, runtime object (type mismatch) | mismatch recorded in receipt `type_deviations` |
| E-SCH-06 | hidden Unicode in tool description (bidi/invisible chars, AgentsID class) | receipt stores `description_suspicious: true` + codepoint class |
| E-SCH-07 | description-request semantic divergence (Toxic Flow candidates from census) | flagged in receipt `flow_risk` |

## 3. Chaos & recovery (L1 — fault-oracle extensions; each = steady-state hypothesis + auto-abort)

| ID | Inject | Expected receipt fields | Pass condition | Status |
|---|---|---|---|---|
| C-UP-01 | upstream 500 | `l1_attempts`, `breaker_state` | final receipt always present (no naked 5xx) | [x] oracle A2 |
| C-UP-02 | upstream hang (timeout) | `l1_attempts` | timeout fires ≤5s, receipt present | [x] oracle A1 (partial) |
| C-UP-03 | 502/503/504 burst | breaker_state transitions | open after threshold, no retry storm | [x] oracle B1 |
| C-UP-04 | rate-limit 429 | backoff honored (429 not retried immediately) | ≥1 backoff interval observed | [ ] |
| C-UP-05 | truncated gzip stream | `error_class=malformed_stream` | receipt issued, no crash | [ ] |
| C-UP-06 | malformed JSON-RPC response | `error_class=malformed_stream` | receipt issued | [ ] |
| C-IN-01 | gateway process kill mid-storm | chain resumable from chain.jsonl tail | prev_hash continuity preserved across restart | [ ] |
| C-IN-02 | disk full (receipt write fails) | fail-closed: request rejected, not accepted silently | no unanchored receipts | [ ] |
| C-NE-01 | DNS failure to upstream | `error_class=dns` | receipt issued after bounded retries | [ ] |
| C-TM-01 | clock skew ±max_clock_skew boundary | temporal verdict per 08d corpus | boundary honored exactly | [ ] |
| C-MCP-01 | tool-list changes between calls | tool known/unknown verdict | unknown tool → pre-admission deny receipt | [ ] |
| C-MCP-02 | server restart mid-chain | chain resumes | no gap in sequence numbers | [ ] |
| C-MCP-03 | auth expiry mid-flight | re-auth or deny receipt | no degraded silent fallback | [ ] |
| C-MCP-04 | rug pull (approved tool mutates behavior) | `behavior_observed` vs declared schema | divergence → receipt flag + deny | [ ] |
| C-BRK-01..03 | breaker state machine exhaustive | `breaker_state` ∈ {closed,open,half-open} | open→cooldown→single-probe→closed/reopen, no storm | [x] oracle B1-B3 |

## 4. Recovery action authorization matrix (L1 — the独占 dimension, maps to OWASP ASI03/06/10 + NHI-05)

| ID | RecoveryAction | Authorization rule | Receipt fields | Pass condition | Status |
|---|---|---|---|---|---|
| R-DG-01 | DOWNGRADE | scope must not expand vs original call | `degraded: true`, `scope_diff: []` | degraded receipt issued, scope unchanged | [ ] |
| R-FO-01 | FAILOVER to backup subject | SBSR re-bind REQUIRED for new subject | `sbsr_rebound: true`, `new_subject_binding` | failover with stale binding → REJECTED | [ ] |
| R-FR-01 | FIX_REQUEST | original intent hash retained; rewrite must reference it | `original_intent_hash`, `rewritten: true` | silent rewrite (no hash link) → REJECTED | [ ] |
| R-L4-01 | L4_LEARNED | default NOT executed; proposal receipt only | `l4_proposal: true`, `executed: false` | any auto-execution = benchmark FAIL | [ ] |
| R-X-01 | any action causing scope expansion | 100% intercepted or re-signed | `scope_diff` | zero silent expansions across whole suite | [ ] |

## 5. Drift vectors (L3 — census-extracted, not invented)

| ID | Source | Pass condition |
|---|---|---|
| D-01..n | weekly re-scan diff: disappeared/mutated tools | each diff → regression vector with census category pointer |
| D-RUG-n | description突变 candidates (census-report.json `desc.duplicate` flag) | flagged pre-deployment |

## 6. SLO thresholds (fail the benchmark, not just a test)

- Receipt continuity ≥ 99.99% (every decision — allow/block/breaker/timeout — emits a receipt)
- Convergence bounded: any fault reaches stable state ≤ 30 s (auto-abort if p99 > 1 s during storm)
- Self-healing success counted per layer (L1/L2/L3), L2 gated on semantic-equivalence criterion (50-case calibration, pending)
- Authorization: zero silent scope expansions across the entire matrix
- Scale survival: 229,827-tool census, zero failures (achieved 2026-11-16, `test/scale-report.json`)

## Current implementation coverage

- Implemented & passing: protocol L0 (harness v3, 44 checks), chaos C-UP-01..03, C-BRK-01..03, scale L2 (229,827 census), oracle smoke 7/7
- Registered & pending: E-SCH-01..07, C-UP-04..06, C-IN-01..02, C-NE-01, C-TM-01, C-MCP-01..04, R-* full matrix, D-01..n
- Disclosure duty: any claim citing a `[ ]` scenario before it passes = violation of ACCEPTANCE.md
