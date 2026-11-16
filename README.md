# NeuralBridge

**The gateway for the seconds between "admitted" and "answered" — where Envoy's resilience ends, 42Crunch's contract ends, and your business has not yet lost. Every tool call in that window gets a signed, chain-linked, independently verifiable receipt — and if upstream dies mid-flight, the gateway retries with backoff, trips open with a dignified signed refusal instead of a naked 503, probes back with a single request, and never breaks the receipt chain. Not just fail-closed: fail-with-evidence.**

NeuralBridge gives any AI agent (Claude, GPT, Gemini, Kimi, anything speaking MCP) full hands on
your infrastructure — and, unlike every other automation bridge, **every tool call your agent
makes is signed into a verifiable receipt chain** before it reaches your systems.

> Automation tools prove what the agent *did*. NeuralBridge proves what the agent *was allowed to do* — and makes the difference independently checkable.

## Gateway v0.1 (works today, zero dependencies)

```bash
node gateway/gateway.mjs --target http://localhost:8000/mcp --port 8080
# your agent connects to :8080 instead of :8000 — everything else is unchanged
```

Per `tools/call` request, the gateway:

1. **Checks** the tool against `NEURALBRIDGE_ALLOW` (comma-separated allowlist; unset = log-only mode)
2. **Signs** a CCS receipt: Ed25519 over `{correlation_id, decided_at, tool, args_digest=SHA-256(JCS(args)), verdict, prev_hash}`
3. **Forwards** to upstream, attaching the receipt in the `X-NeuralBridge-Receipt` response header
4. **Chains** every receipt into `receipts/chain.jsonl` — hash-linked, offline-verifiable, tamper-evident

Blocked calls get `403` with the receipt inline — the agent sees *why* it was denied, and your auditor sees the same receipt.

Verified end-to-end: `send_payment(amount=99999)` through the gateway → receipt `4bff1f18…` chained on `676564d3…`, signature `Ed25519`, args never logged in plaintext (digest only).

## Why receipts, not logs

A log is a story the application tells about itself. A receipt is a signed commitment an
auditor can re-verify without trusting the app — same discipline as
[draft-correctover-ccs](https://datatracker.ietf.org/doc/draft-correctover-ccs/) (IETF, rev 10)
and the runtime tool-binding vectors in
[mcp-session-audit](https://github.com/DSHCorrectover/mcp-session-audit).

- **Digest-only args**: your prompts and parameters never leave in plaintext — SHA-256(JCS) only
- **Hash chain**: edit one receipt and every receipt after it stops verifying
- **Layer separation per -05 §5.2**: the gateway is the write-time enforcement point; post-hoc verification is anyone's, offline

## Scale evidence

The receipt engine replays the **entire public MCP tool census** — 229,827 tools
across 13,120 servers ([mcp-atlas](https://github.com/DSHCorrectover/mcp-atlas),
SHA-256 `2350dc77…`) — with **zero** synthesis, digest, or chain failures
(24.7 s, single process). 2,000-tool live-gateway sample: byte-identical
`args_digest` 2000/2000. Report: [`test/scale-report.json`](test/scale-report.json).
The corpus is not our own fixtures — it is every tool schema published in the
ecosystem, which is exactly what a receipt layer has to survive.

## Roadmap

- [x] v0.1 gateway: MCP proxy + allowlist + signed receipt chain (this repo, working)
- [ ] v0.2: subject-bound receipts (SBSR per [mcp-session-audit](https://github.com/DSHCorrectover/mcp-session-audit) — binds session to authenticated subject, kills the Session-as-Identity swap class)
- [ ] v0.2: legacy SelfHealingEngine integration ([archived MAPE-K engine](legacy/README.md) from npm `neuralbridge-sdk@1.1.0` — circuit breaker + bulkhead + auto-recovery around the gateway; not just fail-closed, fail-and-recover)
- [ ] v0.3: Android/device automation bridge (NB heritage: full device hands for your agent — with receipts, unlike everything else in this category)
- [ ] verifier integration: drop-in `ccs-verifier` (npm) one-liner to audit a chain.jsonl

## License

Code: MIT. Docs: CC BY 4.0.

DSHCorrectover — the reliability team behind [Correctover](https://correctover.com).
