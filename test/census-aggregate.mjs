#!/usr/bin/env node
// Census aggregate report v0.1 — turns the 229,827-tool census from a denominator
// into molecules: protocol compliance, scope-drift, description mutation, endpoint
// liveness (real probes, not declared). Every number third-party replayable from
// the SHA-pinned atlas data.
// Usage: node test/census-aggregate.mjs /home/z/atlas-tmp/data/milestone-a-v1
import { spawn } from 'node:child_process';
import { createInterface as mkRL } from 'node:readline';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';
import https from 'node:https';

const DIR = process.argv[2] || '/home/z/atlas-tmp/data/milestone-a-v1';
const PROBE_CONC = 30, PROBE_TIMEOUT = 6000;
const DANGER = /\b(delete|remove|drop|write|update|create|admin|secret|token|password|credential|pay|charge|refund|send|execute|deploy|deploy_key)\b/i;

const acc = {
  tools: 0, servers_with_tools: new Set(),
  schema: { valid_object: 0, missing: 0, invalid: 0, not_object: 0, has_required: 0, no_properties: 0 },
  scope: { danger_desc_only: 0, danger_name_and_desc: 0 },
  desc: { empty: 0, total_len: 0, seen: new Map() }, // dup descriptions across tools
  name_dup: new Map(),
};
let rline = 0;
const rl = mkRL({ input: spawn('zcat', [join(DIR, 'server_tools.jsonl.gz')], { stdio: ['ignore', 'pipe', 'inherit'] }).stdout });
for await (const line of rl) {
  if (!line.trim()) continue;
  let t; try { t = JSON.parse(line); } catch { acc.schema.invalid++; continue; }
  acc.tools++; acc.servers_with_tools.add(t.server_id);
  const name = String(t.tool_name || ''), desc = String(t.tool_description || '');
  // schema compliance
  const s = t.input_schema;
  if (!s) acc.schema.missing++;
  else if (s.type !== 'object' && !s.properties) acc.schema.not_object++;
  else {
    acc.schema.valid_object++;
    if (s.required && s.required.length) acc.schema.has_required++;
    if (!s.properties || !Object.keys(s.properties).length) acc.schema.no_properties++;
  }
  // scope drift: dangerous verbs in description that the tool name does not declare
  const nameDanger = DANGER.test(name), descDanger = DANGER.test(desc);
  if (descDanger && !nameDanger) acc.scope.danger_desc_only++;
  if (descDanger && nameDanger) acc.scope.danger_name_and_desc++;
  // description mutation
  if (!desc.trim()) acc.desc.empty++;
  else acc.desc.total_len += desc.length;
  if (desc.length > 40) { const key = desc.slice(0, 80); acc.desc.seen.set(key, (acc.desc.seen.get(key) || 0) + 1); }
  acc.name_dup.set(name, (acc.name_dup.get(name) || 0) + 1);
}
const dupDesc = [...acc.desc.seen.values()].reduce((a, v) => a + (v > 1 ? v : 0), 0);
const T = acc.tools;
const dist = [...acc.name_dup.values()].filter(v => v > 1).length;

// endpoint liveness — delegated to test/endpoint-probe.mjs (OS-timeout isolated)
let liveness = null;
try { liveness = JSON.parse(readFileSync('test/endpoint-liveness.json', 'utf8')); } catch {}

const report = {
  ts: new Date().toISOString(),
  corpus: { tools: T, servers: acc.servers_with_tools.size, source: 'mcp-atlas milestone-a-v1, SHA 2350dc77' },
  protocol_compliance: {
    valid_object_schema: acc.schema.valid_object,
    valid_pct: +(100 * acc.schema.valid_object / T).toFixed(1),
    schema_missing: acc.schema.missing, schema_missing_pct: +(100 * acc.schema.missing / T).toFixed(1),
    not_object: acc.schema.not_object, has_required: acc.schema.has_required, empty_properties: acc.schema.no_properties,
  },
  scope_drift: {
    danger_verbs_in_desc_not_in_name: acc.scope.danger_desc_only,
    danger_desc_only_pct: +(100 * acc.scope.danger_desc_only / T).toFixed(1),
    consistent_danger: acc.scope.danger_name_and_desc,
    note: 'proxy metric: receipt layer must bind verdicts to declared scope, not description prose',
  },
  description_mutation: {
    empty_pct: +(100 * acc.desc.empty / T).toFixed(1),
    mean_len: +(acc.desc.total_len / (T - acc.desc.empty)).toFixed(0),
    duplicate_descriptions_tools: dupDesc,
    duplicate_descriptions_pct: +(100 * dupDesc / T).toFixed(1),
    duplicated_tool_names_across_servers: dist,
  },
  endpoint_liveness: liveness || { status: 'deferred', runner: 'timeout 240 node test/endpoint-probe.mjs' },
  replay: 'zcat server_tools.jsonl.gz + candidates_remotes.jsonl; script: test/census-aggregate.mjs',
};
writeFileSync('test/census-report.json', JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
