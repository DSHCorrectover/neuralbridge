# ACCEPTANCE — falsifiability standard (what counts as failure)

Every public claim of this repo maps to an automated check below. If a check
fails, the claim is **withdrawn** — not reworded. This file is the contract
between our marketing and our CI.

## Claim → check mapping

| # | Claim | Check | Current status |
|---|---|---|---|
| 1 | Gateway issues a CCS-verifiable receipt for every tool call | `test/harness.mjs` replays the 286-file conformance corpus | 66/66 dirs, 44 checks: 42 PASS / 0 FAIL / 13 honest-skip |
| 2 | Negative/tampered receipts are rejected | corpus families 04/07/08/09/10/11/12 (MUST FAIL) | enforced in harness exit code |
| 3 | Receipt args never leave in plaintext | digest = SHA-256(JCS(args)) only; corpus digest path | PASS |
| 4 | L1 retry: exponential backoff + jitter on transient upstream failure | `test/fault-oracle.mjs` A1 (upstream hit count ≥ 2) | PASS (9 hits) |
| 5 | Fail-closed: exhausted retries still yield a receipt, never a naked 5xx | oracle A2 | PASS |
| 6 | Breaker: sustained failure trips; rejection is a structured receipt (dignified refusal), not bare 503 | oracle B1/B2 (reason=breaker-open-cooldown-Ns + correlation_id) | PASS |
| 7 | Half-open single probe recovers; no retry storm | oracle B3 | PASS |
| 8 | Receipt chain continuity across healthy/fail/breaker/recover | oracle C1: every edge receipt prev_hash anchored in chain.jsonl | PASS (11 chain entries, 0 unanchored) |
| 9S | Receipt engine scales to the full public MCP tool census (229,827 tools, SHA 2350dc77) with zero synthesis/digest/chain failures; live-gateway digests byte-identical on 2000-tool sample | `test/scale-harness.mjs` + `test/scale-e2e.mjs`; report: `test/scale-report.json` | PASS (0/0/0 failures; 2000/2000 match) |
| 9 | L2 semantic-equivalent downgrade exists | **NOT YET CLAIMED** — receipts reserve `l2_downgraded` field; claim pending embedding-similarity criterion | reserved, not claimed |
| 10 | L3 failover preserves receipt chain | **NOT YET CLAIMED** — same discipline | reserved, not claimed |

## What counts as failure

- Any harness/oracle exit code ≠ 0 in CI.
- Any corpus check that flips from PASS to FAIL after a gateway change.
- Any receipt emitted without being present in `receipts/chain.jsonl` (signed off-record).
- Any claim in this file without a passing check behind it.

## Known corpus drift (disclosed, third-party re-checkable)

`v1.4.0-conformance/01-allow` + `02-deny`: `receipt.request_hash` does not
reproduce from the published generator source formula
`sha256(JCS({tool,_id,args}))` (calc `6b374baff52c…` vs receipt `55a300ad27d7…`),
while the same-family `params_hash`/`args_digest`/`response_hash` all reproduce.
Recorded in `test/results.json → corpus_drift_finding`. We do NOT hide this
behind a skip — it is an upstream erratum candidate.

## Honest-skip register

13 corpus checks are skipped, not passed (missing preimage artifacts in the
corpus: request_hash envelope variants, L2 behavior fixtures, block-envelope).
They live in `test/results.json → skip_log`. A skip never counts toward a claim.
