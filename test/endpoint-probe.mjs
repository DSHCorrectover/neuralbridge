#!/usr/bin/env node
// Endpoint liveness probe v2 — c-ares DNS (never blocks thread pool), 200-sample
// stride across the whole file, 60s global deadline. Run: node test/endpoint-probe.mjs
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = process.argv[2] || '/home/z/atlas-tmp/data/milestone-a-v1';
const PROBE_TIMEOUT = 5000, CONC = 50, SAMPLE = Number(process.env.SAMPLE || 200), GLOBAL_DEADLINE = 60000;
let allUrls = [];
for (const line of readFileSync(DIR + '/candidates_remotes.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { const r = JSON.parse(line); (r.remotes || []).forEach(x => x.url && allUrls.push(x.url)); } catch {}
}
// deterministic stride sample across the whole file (not first-N — avoids provider clustering)
const stride = Math.max(1, Math.floor(allUrls.length / SAMPLE));
const remotes = allUrls.filter((_, i) => i % stride === 0).slice(0, SAMPLE);
const probe = (rawUrl) => new Promise((resolve) => {
  let u;
  try { u = new URL(rawUrl); } catch { return resolve(-9); }
  if (!/^https?:$/.test(u.protocol) || !u.hostname) return resolve(-9);
  let done = false;
  const fin = (c) => { if (!done) { done = true; resolve(c); } };
  const hardTimer = setTimeout(() => fin(-1), PROBE_TIMEOUT);
  // c-ares resolve: fast-fail ENOTFOUND without touching the libuv thread pool
  dns.resolve4(u.hostname, (err) => { if (err && (err.code === 'ENOTFOUND' || err.code === 'ENODATA')) fin(-2); });
  const req = (u.protocol === 'http:' ? http : https).request(u, { method: 'GET', timeout: PROBE_TIMEOUT, headers: { Accept: 'application/json, text/event-stream', Connection: 'close' } }, res => { res.resume(); fin(res.statusCode); });
  req.on('timeout', () => { req.destroy(); fin(-1); });
  req.on('error', () => fin(-1));
  req.end();
});
const codes = {}; const results = []; let cursor = 0;
async function worker() { while (cursor < remotes.length) { const c = await probe(remotes[cursor++]); codes[c] = (codes[c] || 0) + 1; results.push(c); } }
await Promise.race([
  Promise.all(Array.from({ length: CONC }, worker)),
  new Promise(res => setTimeout(res, GLOBAL_DEADLINE)),
]);
const reachable = results.filter(c => c >= 200 && c < 500).length;
const out = { ts: new Date().toISOString(), sample_of: allUrls.length, remotes_declared: remotes.length, probed: results.length, reachable, reachable_pct: +(100 * reachable / results.length).toFixed(1), anonymous_200: results.filter(c => c === 200).length, anonymous_pct: +(100 * results.filter(c => c === 200).length / results.length).toFixed(1), auth_gated_401_403: results.filter(c => c === 401 || c === 403).length, dead_or_timeout: results.filter(c => c <= 0).length, code_histogram: codes, method: 'c-ares resolve4 + 5s per-probe + 60s global deadline, stride-200 sample' };
writeFileSync('test/endpoint-liveness.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
process.exit(0);
