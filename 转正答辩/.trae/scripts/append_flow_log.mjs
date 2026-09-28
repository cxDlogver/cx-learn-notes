#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const TRAE_ROOT = path.resolve(path.dirname(__filename), '..');
const LOG_DIR = path.join(TRAE_ROOT, 'flow-logs');

const SENSITIVE_KEY = /(token|cookie|jwt|authorization|password|passwd|secret|session|csrf|credential|x-tt|x-bd)/i;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi;
const COOKIE_RE = /\b(cookie|set-cookie)\s*[:=]\s*[^;\n]+/gi;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function redactString(value) {
  return value
    .replace(JWT_RE, '[REDACTED_JWT]')
    .replace(BEARER_RE, 'Bearer [REDACTED]')
    .replace(COOKIE_RE, '$1=[REDACTED]')
    .slice(0, 1000);
}

function sanitize(value, key = '') {
  if (value == null) return value;
  if (SENSITIVE_KEY.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item));
  if (typeof value === 'object') {
    const result = {};
    for (const [childKey, childValue] of Object.entries(value).slice(0, 80)) {
      result[childKey] = sanitize(childValue, childKey);
    }
    return result;
  }
  return String(value).slice(0, 1000);
}

function readJsonArg(args) {
  if (!args['data-json']) return {};
  try {
    return JSON.parse(args['data-json']);
  } catch (err) {
    return {
      parse_error: 'INVALID_DATA_JSON',
      raw_preview: String(args['data-json']).slice(0, 200),
    };
  }
}

function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: TRAE_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function hashWorkflowFiles() {
  const hash = crypto.createHash('sha256');
  const roots = ['AGENTS.md', 'commands', 'skills', 'agents', 'docs'];
  const files = [];

  function collect(target) {
    const fullPath = path.join(TRAE_ROOT, target);
    if (!fs.existsSync(fullPath)) return;
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      if (/\.(md|json|mjs|js|yaml|yml|html)$/.test(target)) files.push(target);
      return;
    }
    for (const name of fs.readdirSync(fullPath).sort()) {
      collect(path.join(target, name));
    }
  }

  for (const root of roots) collect(root);
  for (const file of files.sort()) {
    hash.update(file);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(TRAE_ROOT, file)));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

function workflowVersion() {
  const status = git(['status', '--porcelain']) || '';
  return {
    id: args['workflow-version'] || null,
    git_commit: git(['rev-parse', '--short=12', 'HEAD']),
    git_branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    git_dirty: status.length > 0,
    rules_hash: hashWorkflowFiles(),
  };
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.event) {
  console.log(`Usage:
node .trae/scripts/append_flow_log.mjs --event <event> [--phase <phase>] [--command <cmd>] [--agent <agent>] [--workspace <path>] [--case-id <id>] [--result <result>] [--duration-ms <n>] [--workflow-version <id>] [--data-json '{"key":"value"}'] [--dry-run]

Common events:
  phase_start, phase_end, agent_dispatch, agent_return, gate_result,
  detour_start, detour_end, runtime_event, artifact_write`);
  process.exit(args.help ? 0 : 2);
}

const now = new Date();
const entry = sanitize({
  timestamp: now.toISOString(),
  event: args.event,
  phase: args.phase || null,
  command: args.command || null,
  agent: args.agent || null,
  workspace: args.workspace || null,
  case_id: args['case-id'] || null,
  result: args.result || null,
  duration_ms: args['duration-ms'] ? Number(args['duration-ms']) : null,
  workflow_version: workflowVersion(),
  data: readJsonArg(args),
});

fs.mkdirSync(LOG_DIR, { recursive: true });
const logPath = path.join(LOG_DIR, `${now.toISOString().slice(0, 10)}.ndjson`);
if (args['dry-run']) {
  console.log(JSON.stringify(entry));
  process.exit(0);
}
fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
console.log(path.relative(TRAE_ROOT, logPath));
