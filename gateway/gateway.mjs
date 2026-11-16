#!/usr/bin/env node
// NeuralBridge Gateway v0.1 — MCP proxy that signs a CCS-verifiable receipt for every tool call.
// Every action your agent takes comes with a receipt anyone can verify.
// Zero dependencies: node:http + node:crypto only.
//
//   node gateway/gateway.mjs --target http://localhost:8000/mcp --port 8080 [--key gateway/demo-seed.hex]
//
// What it does per POST /mcp request:
//   1. Parse the JSON-RPC body. If it is a tools/call:
//   2. Check the tool against the allowlist (NEURALBRIDGE_ALLOW env, comma-separated; default: allow all, log only).
//   3. Sign a CCS receipt: Ed25519 over {correlation_id, decided_at, tool, args_digest=SHA-256(JCS(args)), verdict, prev_hash}.
//   4. Forward to the upstream MCP server; attach the receipt base64 in the X-NeuralBridge-Receipt response header.
//   5. Receipts append to receipts/chain.jsonl — a hash-chained, offline-verifiable audit log.
import http from 'node:http';
import { createHash, createPrivateKey, createPublicKey, sign, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const TARGET = new URL(arg('--target', 'http://localhost:8000/mcp'));
const PORT = Number(arg('--port', 8080));
const KEYFILE = arg('--key', 'gateway/demo-seed.hex');

const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
if (!existsSync(KEYFILE)) writeFileSync(KEYFILE, createHash('sha256').update(String(process.pid) + String(Date.now())).digest('hex'));
const seed = Buffer.from(readFileSync(KEYFILE, 'utf8').trim(), 'hex');
const priv = createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8' });
const PUB_RAW = createPublicKey(priv).export({ format: 'der', type: 'spki' }).subarray(12).toString('base64');

const ALLOW = (process.env.NEURALBRIDGE_ALLOW || '').split(',').map(s => s.trim()).filter(Boolean);
mkdirSync('receipts', { recursive: true });
const CHAIN = 'receipts/chain.jsonl';
const jcs = (o) => Array.isArray(o) ? '[' + o.map(jcs).join(',') + ']'
  : (o && typeof o === 'object') ? '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + jcs(o[k])).join(',') + '}'
  : JSON.stringify(o);
const prevHash = () => { try { return JSON.parse(readFileSync(CHAIN, 'utf8').trim().split('\n').pop()).receipt_hash; } catch { return '0'.repeat(64); } };

function receipt(tool, args, verdict, reason) {
  const payload = {
    correlation_id: randomUUID(),
    decided_at: new Date().toISOString(),
    tool, verdict, reason: reason || null,
    args_digest: 'sha256-' + createHash('sha256').update(jcs(args ?? {})).digest('base64'),
    signer_key_id: 'neuralbridge-gateway-' + PUB_RAW.slice(0, 8),
    prev_hash: prevHash(),
  };
  const sig = sign(null, Buffer.from(jcs(payload), 'utf8'), priv);
  const rec = { ...payload, algorithm: 'Ed25519', signer_pubkey: PUB_RAW, signature: sig.toString('base64') };
  rec.receipt_hash = createHash('sha256').update(jcs(rec)).digest('hex');
  appendFileSync(CHAIN, JSON.stringify(rec) + '\n');
  return Buffer.from(JSON.stringify(rec)).toString('base64');
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') { res.writeHead(405).end(); return; }
  let body = [];
  req.on('data', c => body.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(body);
    let verdict = 'ALLOW', reason = null, tool = null, args = null;
    try {
      const rpc = JSON.parse(raw.toString('utf8'));
      if (rpc.method === 'tools/call') {
        tool = rpc.params?.name; args = rpc.params?.arguments;
        if (ALLOW.length && tool && !ALLOW.includes(tool)) { verdict = 'BLOCK'; reason = 'tool-not-in-allowlist'; }
      }
    } catch { /* non-JSON: forward untouched */ }
    const r64 = receipt(tool || 'unknown', args, verdict, reason);
    if (verdict === 'BLOCK') {
      res.writeHead(403, { 'Content-Type': 'application/json', 'X-NeuralBridge-Receipt': r64 });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32602, message: 'blocked by neuralbridge gateway: ' + reason, receipt: JSON.parse(Buffer.from(r64, 'base64').toString()) } }));
      return;
    }
    const up = http.request({ hostname: TARGET.hostname, port: TARGET.port || 80, path: TARGET.pathname, method: 'POST', headers: { ...req.headers, host: TARGET.host } }, ur => {
      res.writeHead(ur.statusCode, { ...ur.headers, 'X-NeuralBridge-Receipt': r64 });
      ur.pipe(res);
    });
    up.on('error', () => { res.writeHead(502, { 'X-NeuralBridge-Receipt': r64 }).end('{"error":"upstream unreachable"}'); });
    up.end(raw);
  });
});
server.listen(PORT, () => console.log(`neuralbridge gateway :${PORT} -> ${TARGET.href} | pubkey ${PUB_RAW.slice(0, 8)}… | receipts -> ${CHAIN}`));
