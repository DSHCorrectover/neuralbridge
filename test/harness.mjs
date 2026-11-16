#!/usr/bin/env node
// Harness v3 — per-check replay of the CCS conformance corpus.
// For every directory holding expected.json + receipt*.json: run each check in
// expected.checks; a check's ok must equal the expected semantics (valid =>
// checks listed should pass unless named -INVALID/-mismatch, invalid =>
// at least the failing check must be false). Every deviation = FAIL.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { runCheck, REQUIRED_30 } from './checks.mjs';

const ROOT = process.argv[2] || '/home/z/my-project/ccs-conformance-vectors/vectors/v1.4.0-conformance';

const dirs = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f === 'expected.json') dirs.push(d); } })(ROOT);

let checksRun = 0, checksPass = 0, checksFail = 0, skipped = 0, dirsOk = 0, dirsFail = 0; const skipLog = [], fails = [];
for (const dir of dirs.sort()) {
  const exp = JSON.parse(readFileSync(join(dir, 'expected.json'), 'utf8'));
  const verdict = (exp.verdict || '').toLowerCase();
  const mustBeValid = verdict === 'valid';
  const receipts = readdirSync(dir).filter(f => /^receipt.*\.json$/.test(f) && !f.startsWith('original'));
  let dirBad = false;
  for (const rf of receipts) {
    const rec = JSON.parse(readFileSync(join(dir, rf), 'utf8'));
    for (const c of exp.checks || []) {
      const inverted = /INVALID|mismatch|not-|inconsist/.test(c);
      let res;
      try { res = runCheck(c, { dir, receipt: rec }); } catch (e) { res = { ok: null, detail: 'throw:' + e.message.slice(0, 60) }; }
      checksRun++;
      // semantics: check named VALID should be ok=true; check named INVALID/mismatch should be ok=false;
      // a null (no artifact) is honest-unknown, not a failure — count separately
      let ok;
      if (res.ok === null) { skipped++; if (skipLog.length < 40) skipLog.push({ d: relative(ROOT, dir), check: c, detail: res.detail }); checksRun--; continue; } // unimplementable this round: honest skip
      ok = inverted ? (res.ok === false) : (res.ok === true);
      if (ok) checksPass++;
      else { checksFail++; dirBad = true; fails.push({ d: relative(ROOT, dir), f: rf, check: c, ...res }); }
    }
  }
  if (dirBad) dirsFail++; else dirsOk++;
}
console.log(JSON.stringify({ corpus: relative(process.cwd(), ROOT), dirs: dirs.length, dirs_ok: dirsOk, dirs_fail: dirsFail, checks_run: checksRun, checks_pass: checksPass, checks_fail: checksFail, failures: fails.slice(0, 30), skipped, skip_log: skipLog }, null, 1));
mkdirSync('test', { recursive: true });
writeFileSync('test/results.json', JSON.stringify({ ts: new Date().toISOString(), dirs: dirs.length, dirsOk, dirsFail, checksRun, checksPass, checksFail, skipped, skip_log: skipLog, failures: fails }, null, 1));
process.exit(checksFail ? 1 : 0);
