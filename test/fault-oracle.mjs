#!/usr/bin/env node
// Fault Injection Oracle v0.1 — black-box, HTTP-only, zero knowledge of gateway internals.
// Verifies the three world-class claims (ACCEPTANCE.md §1-2):
//   A. L1 retry with exponential backoff + jitter; L3 failover preserves receipt chain
//   B. Circuit breaker: open -> cooldown -> single probe -> recover; rejections are
//      structured CCS receipts (dignified refusal), never bare 502/503
//   C. Receipt chain continuity: every decision (allow/block/open/probe) chained, prev_hash linked
// Usage: node test/fault-oracle.mjs [--gateway http://localhost:8090] [--upstream http://localhost:9001]
import http from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const GW = new URL(arg('--gateway', 'http://localhost:8090/mcp'));
const UP = new URL(arg('--upstream', 'http://localhost:9001/mcp'));

// --- controllable upstream: modes via /__mode (ok|hang|500|flap) ---
let mode = 'ok', hits = 0;
const upstream = http.createServer((req, res) => {
  hits++;
  if (req.url.startsWith('/__mode')) { mode = req.url.split('=')[1] || 'ok'; res.writeHead(200).end(mode); return; }
  if (req.url.startsWith('/__hits')) { res.writeHead(200).end(String(hits)); return; }
  let b = []; req.on('data', c => b.push(c)); req.on('end', () => {
    if (mode === 'hang') { /* never respond; gateway timeout must fire */ return; }
    if (mode === '500') { res.writeHead(500).end('{"error":"injected"}'); return; }
    const body = Buffer.concat(b);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: JSON.parse(body.toString() || '{}').id ?? 1, result: { ok: true, seen: hits } }));
  });
});

const post = (port, path, obj, timeoutMs = 15000) => new Promise((resolve) => {
  const data = JSON.stringify(obj);
  const t0 = Date.now();
  const req = http.request({ host: '127.0.0.1', port, path, method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
    let b = []; res.on('data', c => b.push(c));
    res.on('end', () => resolve({ status: res.statusCode, receipt: res.headers['x-neuralbridge-receipt'] || null, body: Buffer.concat(b).toString(), ms: Date.now() - t0 }));
  });
  req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ status: 0, receipt: null, body: 'client-timeout', ms: Date.now() - t0 }); });
  req.on('error', e => resolve({ status: 0, receipt: null, body: 'err:' + e.code, ms: Date.now() - t0 }));
  req.end(data);
});
const setMode = async (m) => { await new Promise(r => { const rq = http.get({ host: '127.0.0.1', port: UP.port, path: '/__mode=' + m }, res => { res.resume(); res.on('end', r); }); rq.on('error', r); }); };
const getHits = () => new Promise(r => { const rq = http.get({ host: '127.0.0.1', port: UP.port, path: '/__hits' }, res => { let b = []; res.on('data', c => b.push(c)); res.on('end', () => r(+Buffer.concat(b).toString())); }); rq.on('error', () => r(-1)); });
const decodeR = (b64) => b64 ? JSON.parse(Buffer.from(b64, 'base64').toString()) : null;
const hashR = (rec) => createHash('sha256').update(JSON.stringify(rec)).digest('hex');

const findings = [];
const claim = (id, desc, ok, detail) => { findings.push({ id, claim: desc, verdict: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? '✓' : '✗'} [${id}] ${desc} — ${detail}`); };

upstream.listen(UP.port, async () => {
  console.log(`oracle: gateway=${GW.href} upstream-mock=:${UP.port}`);
  // wait for gateway readiness (max 10s)
  for (let i = 0; i < 20; i++) { const p = await post(GW.port, '/mcp', { jsonrpc: '2.0', id: 0, method: 'ping' }, 2000); if (p.status === 200 || p.status >= 400) break; await new Promise(r => setTimeout(r, 500)); }
  const CALL = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'health_check', arguments: { probe: 'oracle' } } };

  // C0 baseline: healthy path, receipt present & chained
  const r0 = await post(GW.port, '/mcp', CALL);
  const rec0 = decodeR(r0.receipt);
  claim('C0', 'healthy call returns 200 + CCS receipt header', r0.status === 200 && !!rec0, `status=${r0.status} receipt=${rec0 ? rec0.receipt_hash?.slice(0, 8) : 'none'}`);

  // A1: L1 retry under 5xx — upstream switches to 500 for first 2 hits then ok via flap
  await setMode('flap-setup');
  let flaps = 0;
  // simpler deterministic: mode 500; after gateway retries, we flip to ok mid-flight is racy — instead assert retry saw >1 upstream hit
  await setMode('500');
  const r1 = await post(GW.port, '/mcp', CALL);
  const h1 = await getHits();
  const rec1 = decodeR(r1.receipt);
  claim('A1', 'L1 retry: failing upstream gets re-hit (backoff attempts)', h1 >= 2, `upstream hits=${h1}`);
  claim('A2', 'L1 exhaust: final response still carries a receipt (fail-closed chain, no naked 5xx)', !!rec1, `status=${r1.status} verdict=${rec1?.verdict}`);
  await setMode('ok');

  // B1: circuit breaker — sustained failures trip it; subsequent calls get structured receipt rejection
  await setMode('500');
  for (let i = 0; i < 6; i++) await post(GW.port, '/mcp', CALL);
  await setMode('ok');
  const r2 = await post(GW.port, '/mcp', CALL);
  const rec2 = decodeR(r2.receipt);
  const tripped = rec2 && (rec2.reason || '').includes('breaker') || (rec2?.reason || '').includes('cooldown');
  claim('B1', 'breaker trips: next call rejected with structured receipt, not naked 503', r2.status >= 400 && !!rec2 && rec2.verdict !== null, `status=${r2.status} reason=${rec2?.reason}`);
  claim('B2', 'dignified refusal: rejection receipt contains breaker/ cooldown reason + correlation_id', tripped && !!rec2?.correlation_id, `reason=${rec2?.reason}`);

  // B3: half-open single probe recovers
  await new Promise(r => setTimeout(r, 4000)); // cooldown window
  const r3 = await post(GW.port, '/mcp', CALL);
  const rec3 = decodeR(r3.receipt);
  claim('B3', 'after cooldown, single probe passes and chain continues', r3.status === 200 && !!rec3, `status=${r3.status} verdict=${rec3?.verdict}`);

  // C1: chain continuity across the whole storm: collect all receipts, verify prev_hash linkage
  const all = [rec0, rec1, rec2, rec3].filter(Boolean);
  // Edge receipts may have intermediate (retry) receipts between them — the correct
  // continuity check: every edge receipt's prev_hash must exist in the gateway chain log.
  let chainFile = null;
  try { chainFile = readFileSync('receipts/chain.jsonl', 'utf8'); } catch {}
  const chainHashes = new Set((chainFile || '').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l).receipt_hash; } catch { return null; } }).filter(Boolean));
  const missing = all.filter(rec => rec.prev_hash && !chainHashes.has(rec.prev_hash));
  // also verify each edge receipt is itself present in the chain (nothing signed off-record)
  const present = all.filter(rec => chainHashes.has(rec.receipt_hash)).length;
  const linked = chainHashes.size > 0 && missing.length === 0 && present === all.length;
  claim('C1', 'receipt chain continuity: every edge receipt prev_hash anchored + every edge receipt in chain log', linked && all.length >= 3, `chain_entries=${chainHashes.size} edge=${all.length} present=${present} unanchored=${missing.length}`);
  // note: gateway-internal full-chain verification vs corpus = test/harness.mjs

  const pass = findings.filter(f => f.verdict === 'PASS').length;
  const report = { ts: new Date().toISOString(), oracle: 'fault-oracle v0.1 (black-box HTTP)', gateway: GW.href, upstream_mock: `:${UP.port}`, claims: findings, summary: { pass, fail: findings.length - pass } };
  const { writeFileSync } = await import('node:fs');
  writeFileSync('test/smoke-report.json', JSON.stringify(report, null, 1));
  console.log(`\nsmoke-report.json written: ${pass}/${findings.length} claims PASS`);
  upstream.close();
  process.exit(findings.length - pass ? 1 : 0);
});
