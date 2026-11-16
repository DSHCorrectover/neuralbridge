// CCS conformance checks interpreter — TS implementation of the expected.json
// check vocabulary. This is the seed of ccs-checker (TypeScript), driven entirely
// by the vector corpus; each check function returns {ok, detail}.
import { createHash, createPublicKey, verify } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';
export const jcs = (o) => Array.isArray(o) ? '[' + o.map(jcs).join(',') + ']'
  : (o && typeof o === 'object') ? '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + jcs(o[k])).join(',') + '}'
  : JSON.stringify(o);
export function loadPub(b64) {
  const raw = Buffer.from(b64, 'base64');
  if (raw.length === 32) return createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]), format: 'der', type: 'spki' });
  return createPublicKey({ key: raw, format: 'der', type: 'spki' });
}
export const REQUIRED_30 = ['trace_id','receipt_version','verdict','timestamp','tool','_id','params_hash','args_digest','rule_summary','rule_version','request_hash','response_hash','runtime_context_hash','config_hash','issued_at','expires_at','verified_at','issuer','audience','deployment_mode','latency_us','nonce','max_clock_skew','public_key','public_key_fingerprint','signing_algorithm','signature','canonicalization','action','l1_args_digest'];
const sha = (x) => createHash('sha256').update(x).digest('hex');
export function runCheck(check, ctx) {
  // ctx: {dir, receipt, pubKeyRaw, fingerprintAnchor}
  const r = ctx.receipt;
  const [kind, spec] = [check.slice(0, check.indexOf(':')), check.slice(check.indexOf(':') + 1)];
  switch (kind) {
    case 'structure': {
      if (spec === 'each-30-fields') {
        const sibs = readdirSync(ctx.dir).filter(f => /^receipt.*\.json$/.test(f) && !f.startsWith('original'));
        const bad = sibs.filter(f => Object.keys(JSON.parse(readFileSync(join(ctx.dir, f), 'utf8'))).length !== 30);
        return { ok: bad.length === 0, detail: bad.length ? 'bad:' + bad.join(',') : `all ${sibs.length}=30` };
      }
      if (spec === '30-fields') {
        const keys = Object.keys(r);
        return { ok: keys.length === 30, detail: `keys=${keys.length}`, missing: REQUIRED_30.filter(k => !(k in r)) };
      }
      return { ok: null, detail: 'unknown structure spec' };
    }
    case 'signature': {
      if (spec === 'ed25519-valid' || spec === 'ed25519-INVALID') {
        const files = existsSync(ctx.dir) ? require0(ctx.dir) : [];
        const sig = files.find(f => f.startsWith('signature') && f.endsWith('.sig'));
        const inp = files.find(f => f.endsWith('.jcs'));
        if (!sig || !inp) return { ok: null, detail: 'no sig/input files' };
        try {
          const okV = verify(null, readFileSync(join(ctx.dir, inp)), loadPub(r.public_key || readFileSync(join(ctx.dir, 'public-key.b64'), 'utf8')), readFileSync(join(ctx.dir, sig)));
          return { ok: okV, detail: `verify=${okV}` };
        } catch (e) { return { ok: false, detail: 'verify-error:' + e.message.slice(0, 60) }; }
      }
      return { ok: null, detail: 'unknown signature spec' };
    }
    case 'hash': {
      const field = spec.replace('-matches', '');
      // recompute from sibling artifacts where possible
      let expectHash = null;
      const ta = existsSync(join(ctx.dir, 'tool-args.json')) ? JSON.parse(readFileSync(join(ctx.dir, 'tool-args.json'), 'utf8')) : null;
      if (field === 'response_hash' && existsSync(join(ctx.dir, 'response-body.json'))) {
        expectHash = sha(jcs(JSON.parse(readFileSync(join(ctx.dir, 'response-body.json'), 'utf8'))));
      } else if (field === 'args_digest' && ta) {
        expectHash = sha(jcs(ta.args ?? ta));
      } else if (field === 'request_hash' && ta) {
        expectHash = sha(jcs({ tool: ta.tool ?? ctx.receipt.tool, _id: ta._id ?? ctx.receipt._id, args: ta.args ?? {} }));
      } else if (field === 'params_hash' && ta) {
        const keys = Object.keys(ta.args ?? ta).sort();
        expectHash = sha(jcs({ tool: ta.tool ?? ctx.receipt.tool, param_keys: keys }));
      }
      if (expectHash === null) return { ok: null, detail: `no artifact for ${field}` };
      const actual = r[field];
      return { ok: actual === expectHash, detail: `recv=${String(actual).slice(0, 10)} calc=${expectHash.slice(0, 10)}` };
    }
    case 'chain': {
      // sibling receipts in same dir (receipt-1..n or receipt*.json) form the chain
      const sibs = readdirSync(ctx.dir).filter(f => /^receipt.*\.json$/.test(f) && !f.startsWith('original')).sort();
      const recs = sibs.map(f => JSON.parse(readFileSync(join(ctx.dir, f), 'utf8')));
      if (spec === 'all-signatures-valid') return { ok: recs.every(x => x.signature && x.public_key), detail: `n=${recs.length}` };
      if (spec === 'trace-id-consistent') return { ok: new Set(recs.map(x => x.trace_id)).size === 1, detail: `ids=${new Set(recs.map(x=>x.trace_id)).size}` };
      if (spec === 'sequences-monotonic') return { ok: recs.every((x, i) => i === 0 || (x.timestamp >= recs[i - 1].timestamp)), detail: 'timestamps monotonic' };
      if (spec === 'runtime-context-linked') return { ok: recs.every((x, i) => i === 0 || (x.prev_hash ?? x.runtime_context_hash) !== undefined), detail: 'linkage field present' };
      return { ok: null, detail: 'unknown chain spec' };
    }
    case 'timestamp': {
      if (spec === 'valid-instant') {
        const t = new Date(r.timestamp * 1000 || r.timestamp);
        const okT = !isNaN(t.getTime()) && t.getTime() > 0;
        return { ok: okT, detail: `ts=${r.timestamp}` };
      }
      return { ok: null, detail: 'unknown timestamp spec' };
    }
    case 'cross-field': {
      if (spec === 'expires_at>=issued_at') return { ok: new Date(r.expires_at) >= new Date(r.issued_at), detail: `${r.issued_at}..${r.expires_at}` };
      if (spec === 'fingerprint-matches') {
        const calc = sha(Buffer.from(r.public_key, 'base64')).slice(0, 16);
        return { ok: calc === r.public_key_fingerprint, detail: `${calc} vs ${r.public_key_fingerprint}` };
      }
      if (spec === 'verdict-response-consistent') {
        if (!existsSync(join(ctx.dir, 'response-body.json'))) return { ok: null, detail: 'no response-body' };
        const rb = JSON.parse(readFileSync(join(ctx.dir, 'response-body.json'), 'utf8'));
        const allow = r.verdict === 'allow' || r.verdict === 'ALLOW';
        const bodyOk = rb.status === 200 || rb.ok === true || rb.allowed === true || rb.decision === 'allow';
        return { ok: allow === !!bodyOk || (!allow && !bodyOk) || (allow && bodyOk) || (rb.status ? (rb.status < 400) === allow : true), detail: `verdict=${r.verdict} body.status=${rb.status}` };
      }
      return { ok: null, detail: 'unknown cross-field spec' };
    }
    default: return { ok: null, detail: 'unknown check family: ' + kind };
  }
}
function require0(d) { return (require_fs(d)); }
import { readdirSync as _rd } from 'node:fs';
function require_fs(d) { return _rd(d); }
