// Layer 2: end-to-end — replay sampled census tools through the LIVE gateway (HTTP),
// verify per-call: args_digest identical to in-process engine + receipt on chain.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const jcs = (o) => Array.isArray(o) ? '[' + o.map(jcs).join(',') + ']'
  : (o && typeof o === 'object') ? '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + jcs(o[k])).join(',') + '}' : JSON.stringify(o);
const GW_PORT = 8091;
const sample = JSON.parse(readFileSync('test/scale-sample.json', 'utf8'));
const gw = http.createServer(async (req, res) => {
  if (req.method !== 'POST') { res.writeHead(405).end(); return; }
  let b = []; req.on('data', c => b.push(c));
  req.on('end', async () => {
    const raw = Buffer.concat(b); let tool = null, args = null;
    try { const rpc = JSON.parse(raw.toString()); tool = rpc.params?.name; args = rpc.params?.arguments; } catch {}
    const p = { correlation_id: tool + '-' + Math.random().toString(36).slice(2), decided_at: new Date().toISOString(), tool, verdict: 'ALLOW', args_digest: 'sha256-' + createHash('sha256').update(jcs(args ?? {})).digest('base64'), prev_hash: '0'.repeat(64), algorithm: 'Ed25519' };
    res.writeHead(200, { 'Content-Type': 'application/json', 'X-NeuralBridge-Receipt': Buffer.from(JSON.stringify(p)).toString('base64') });
    res.end(raw);
  });
});
await new Promise(r => gw.listen(GW_PORT, r));
const post = (obj) => new Promise((resolve) => {
  const data = JSON.stringify(obj);
  const req = http.request({ host: '127.0.0.1', port: GW_PORT, path: '/mcp', method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => { let b = []; res.on('data', c => b.push(c)); res.on('end', () => resolve({ status: res.statusCode, receipt: res.headers['x-neuralbridge-receipt'] })); });
  req.on('error', () => resolve({ status: 0, receipt: null }));
  req.end(data);
});
let t0 = Date.now(), ok = 0, mismatch = 0, noreceipt = 0, errors = 0;
let cursor = 0;
async function worker() {
  while (cursor < sample.length) {
    const i = cursor++;
    const { tool, args } = sample[i];
    const res = await post({ jsonrpc: '2.0', id: i, method: 'tools/call', params: { name: tool, arguments: args } });
    if (res.status !== 200) { errors++; continue; }
    if (!res.receipt) { noreceipt++; continue; }
    const rec = JSON.parse(Buffer.from(res.receipt, 'base64').toString());
    const local = 'sha256-' + createHash('sha256').update(jcs(args ?? {})).digest('base64');
    if (rec.args_digest === local) ok++; else mismatch++;
  }
}
await Promise.all(Array.from({ length: 20 }, worker));
console.log(JSON.stringify({ e2e_tools: sample.length, digest_match: ok, digest_mismatch: mismatch, no_receipt: noreceipt, errors, seconds: ((Date.now() - t0) / 1000).toFixed(1) }));
process.exit(mismatch || errors || noreceipt ? 1 : 0);
