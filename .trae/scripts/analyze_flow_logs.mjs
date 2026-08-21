#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const TRAE_ROOT = path.resolve(path.dirname(__filename), '..');
const LOG_DIR = path.join(TRAE_ROOT, 'flow-logs');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function inc(map, key) {
  const safeKey = key || 'N/A';
  map.set(safeKey, (map.get(safeKey) || 0) + 1);
}

function table(title, map) {
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
  if (!rows.length) return `\n## ${title}\n\nN/A\n`;
  return `\n## ${title}\n\n| key | count |\n|---|---:|\n${rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n`;
}

const args = parseArgs(process.argv.slice(2));
const since = args.since ? new Date(`${args.since}T00:00:00.000Z`) : null;
const phaseFilter = args.phase || null;

if (!fs.existsSync(LOG_DIR)) {
  console.log('# Flow Log Analysis\n\nNo flow-logs directory found.');
  process.exit(0);
}

const events = [];
for (const file of fs.readdirSync(LOG_DIR).filter((name) => name.endsWith('.ndjson')).sort()) {
  const filePath = path.join(LOG_DIR, file);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      const ts = new Date(event.timestamp);
      if (since && ts < since) continue;
      if (phaseFilter && event.phase !== phaseFilter) continue;
      events.push(event);
    } catch {
      events.push({ event: 'INVALID_LOG_LINE', phase: 'N/A', result: 'PARSE_ERROR' });
    }
  }
}

if (!events.length) {
  console.log('# Flow Log Analysis\n\nNO_FLOW_LOGS');
  process.exit(0);
}

const byEvent = new Map();
const byPhase = new Map();
const byAgent = new Map();
const byResult = new Map();
const byWorkflowVersion = new Map();
const gateResults = new Map();
const durations = [];

for (const event of events) {
  inc(byEvent, event.event);
  inc(byPhase, event.phase);
  inc(byAgent, event.agent);
  inc(byResult, event.result);
  inc(byWorkflowVersion, event.workflow_version?.id || event.workflow_version?.rules_hash || 'N/A');
  if (event.event === 'gate_result') inc(gateResults, `${event.phase || 'N/A'}:${event.result || 'N/A'}`);
  if (typeof event.duration_ms === 'number' && Number.isFinite(event.duration_ms)) durations.push(event.duration_ms);
}

const avgDuration = durations.length
  ? Math.round(durations.reduce((sum, n) => sum + n, 0) / durations.length)
  : null;

const recentRisks = events
  .filter((event) => ['BLOCKED', 'NEEDS_TARGETED_REVIEW', 'AUTO_FIX_REQUIRED', 'FAIL'].includes(event.result))
  .slice(-20)
  .map((event) => `- ${event.timestamp || 'N/A'} ${event.phase || 'N/A'} ${event.event || 'N/A'} ${event.result || 'N/A'} ${event.case_id || ''}`.trim());

console.log(`# Flow Log Analysis

- Log Dir: ${path.relative(TRAE_ROOT, LOG_DIR)}
- Events: ${events.length}
- Since: ${args.since || 'N/A'}
- Phase Filter: ${phaseFilter || 'N/A'}
- Average Duration: ${avgDuration == null ? 'N/A' : `${avgDuration} ms`}
${table('Events', byEvent)}
${table('Phases', byPhase)}
${table('Agents', byAgent)}
${table('Results', byResult)}
${table('Workflow Versions', byWorkflowVersion)}
${table('Gate Results', gateResults)}
## Recent Risks

${recentRisks.length ? recentRisks.join('\n') : 'N/A'}
`);
