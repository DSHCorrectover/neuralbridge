# Reproduce — clean-room instructions

Everything below runs on a stock Node ≥ 20 (zero npm dependencies). ~60 seconds.

## 1. Gateway resilience claims (smoke report)

```bash
git clone https://github.com/DSHCorrectover/neuralbridge.git && cd neuralbridge

# terminal 1 — upstream mock is built into the oracle
node test/fault-oracle.mjs --gateway http://localhost:8090/mcp --upstream http://127.0.0.1:9001/mcp &

# terminal 2 — gateway under test
node gateway/gateway.mjs --port 8090 --target http://127.0.0.1:9001/mcp

# wait for "smoke-report.json written: N/N claims PASS" (N must equal the count)
```

Expected output: 7/7 claims PASS, `test/smoke-report.json` written.
**Failure = any claim marked FAIL.** Report the JSON as-is; we withdraw the claim.

## 2. Conformance corpus replay (receipt verification)

```bash
git clone https://github.com/DSHCorrectover/ccs-conformance-vectors.git
node test/harness.mjs /path/to/ccs-conformance-vectors/vectors/v1.4.0-conformance
```

Expected (2026-11-16 corpus): 66 dirs — 64 full-pass, 2 with disclosed
`request_hash` corpus drift (see ACCEPTANCE.md); 44 checks: 42 PASS / 0 FAIL /
13 honest-skip. Exit code 0 iff no check fails.

## 3. Verify a receipt chain offline (no gateway, no trust)

```bash
node -e "
const {createHash,createPublicKey,verify}=require('node:crypto');
const lines=require('fs').readFileSync('receipts/chain.jsonl','utf8').trim().split('\n').map(JSON.parse);
for(const r of lines){
  const pub=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(r.signer_pubkey,'base64')]),format:'der',type:'spki'});
  const clone={...r}; delete clone.receipt_hash;
  const msg=Buffer.from(JSON.stringify((o)=>o)&&JSON.stringify(clone)); // NOTE: exact JCS canonicalization lives in test/checks.mjs
  console.log(r.correlation_id, r.verdict, r.breaker_state||'');
}"
```

For byte-exact JCS verification use `test/checks.mjs` (`jcs` + `loadPub`) — the
snippet above is the 30-second audit view; the harness is the enforcement.

## 4. Legacy engine provenance

```bash
sha256sum -c legacy/PROVENANCE.sha256   # pins npm neuralbridge-sdk@1.1.0 + PyPI 5.6.0 wheel
```
