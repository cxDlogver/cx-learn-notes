#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

function usage() {
  console.error(`Usage:
Evidence-driven BAM flow:
node .trae/scripts/sync_bam_config_from_tech_doc.mjs \\
  --workspace artifacts/<task> \\
  --repo-root meego-<id>/repos/<repo> \\
  --target-dir meego-<id>/repos/<repo>/apps/<app> \\
  --mode plan-methods \\
  --psm-branch-evidence <workspace>/bam/bam-psm-branch-evidence.json \\
  --interface-evidence <workspace>/bam/bam-interface-change-evidence.json \\
  --method-lookup-plan <workspace>/bam/bam-method-lookup-plan.json \\
  [--branch-preflight <workspace>/bam/bam-branch-preflight.json] \\
  [--report <workspace>/bam/bam-sync-report.md]

node .trae/scripts/sync_bam_config_from_tech_doc.mjs \\
  --workspace artifacts/<task> \\
  --repo-root meego-<id>/repos/<repo> \\
  --target-dir meego-<id>/repos/<repo>/apps/<app> \\
  --mode apply-config \\
  --psm-branch-evidence <workspace>/bam/bam-psm-branch-evidence.json \\
  --interface-evidence <workspace>/bam/bam-interface-change-evidence.json \\
  [--method-metadata <workspace>/bam/bam-method-metadata.json] \\
  [--branch-preflight <workspace>/bam/bam-branch-preflight.json] \\
  [--write] \\
  [--report <workspace>/bam/bam-sync-report.md]

PRD detect-only compatibility:
node .trae/scripts/sync_bam_config_from_tech_doc.mjs \\
  --workspace artifacts/<task> \\
  --detect-only \\
  [--tech-doc artifacts/<task>/tech-doc-raw.md] \\
  [--report <workspace>/bam/bam-link-detection.md]

This tool does not extract BAM sync evidence from tech-doc-raw.md. LLM must write evidence JSON files first.`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--write' || key === '--detect-only') {
      args[key.slice(2)] = true;
      continue;
    }
    if (!key.startsWith('--')) {
      throw new Error(`Unexpected argument: ${key}`);
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function readJson(file, label) {
  const full = path.resolve(file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing ${label}: ${full}`);
  }
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid JSON in ${label} (${full}): ${error.message}`);
  }
}

function asItems(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (Array.isArray(value?.items)) {
    return value.items;
  }
  if (Array.isArray(value?.data)) {
    return value.data;
  }
  if (value && typeof value === 'object') {
    return [value];
  }
  return [];
}

function normalizeMethod(value) {
  const method = String(value || '').trim().toUpperCase();
  return HTTP_METHODS.has(method) ? method : '';
}

function normalizePath(value) {
  const apiPath = String(value || '').trim().replace(/[.,;，。；]+$/, '');
  return apiPath.startsWith('/') ? apiPath : '';
}

function normalizePsmEvidence(raw) {
  const seen = new Set();
  const result = [];
  for (const item of asItems(raw)) {
    const psm = String(item.psm || '').trim();
    const branch = String(item.branch || item.api_branch || item.apiBranch || '').trim();
    if (!psm || !branch) {
      throw new Error(`Invalid PSM/branch evidence item: ${JSON.stringify(item)}`);
    }
    const key = `${psm}@${branch}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      psm,
      branch,
      source: item.source || 'llm_evidence',
      evidence: item.evidence || '',
    });
  }
  return result;
}

function normalizeInterfaceEvidence(raw) {
  const seen = new Set();
  const result = [];
  for (const item of asItems(raw)) {
    const psm = String(item.psm || '').trim();
    const endpointId = String(item.endpoint_id || item.endpointId || '').trim();
    const pathValue = normalizePath(item.path || item.http_path || item.httpPath || item.url_path || item.urlPath);
    const method = normalizeMethod(item.method || item.http_method || item.httpMethod);
    const bamUrl = String(item.bam_url || item.bamUrl || item.url || '').trim();
    if (!psm) {
      throw new Error(`Interface evidence missing psm: ${JSON.stringify(item)}`);
    }
    if (!endpointId && !pathValue) {
      throw new Error(`Interface evidence must include endpoint_id or path: ${JSON.stringify(item)}`);
    }
    const key = `${psm}|${endpointId}|${method}|${pathValue}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      psm,
      endpointId,
      bamUrl,
      path: pathValue,
      method,
      changeType: item.change_type || item.changeType || '',
      changedFields: Array.isArray(item.changed_fields)
        ? item.changed_fields
        : Array.isArray(item.changedFields)
          ? item.changedFields
          : [],
      evidence: item.evidence || '',
    });
  }
  return result;
}

function normalizeMethodMetadata(raw) {
  const result = [];
  const visited = new Set();

  function visit(value) {
    if (!value || typeof value !== 'object' || visited.has(value)) {
      return;
    }
    visited.add(value);
    if (Array.isArray(value)) {
      for (const child of value) {
        visit(child);
      }
      return;
    }
    const method = normalizeMethod(value.method || value.http_method || value.httpMethod || value.request_method || value.requestMethod || value.verb);
    const apiPath = normalizePath(value.path || value.http_path || value.httpPath || value.uri || value.url_path || value.urlPath || value.api_path || value.apiPath);
    if (method && apiPath) {
      result.push({
        endpointId: String(value.endpoint_id || value.endpointId || value.id || '').trim(),
        method,
        path: apiPath,
        sourceCommand: value.source_command || value.sourceCommand || '',
      });
    }
    for (const key of ['items', 'data', 'result', 'method', 'endpoint', 'api', 'methods']) {
      visit(value[key]);
    }
  }

  visit(raw);
  return dedupeApis(result.map((item) => ({
    method: item.method,
    path: item.path,
    api: `${item.method} ${item.path}`,
    endpointId: item.endpointId,
    sourceCommand: item.sourceCommand,
  })));
}

function normalizeBranchPreflightAttempt(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  return {
    probe_kind: String(raw.probe_kind || raw.probeKind || '').trim(),
    verification_level: String(raw.verification_level || raw.verificationLevel || '').trim(),
    command: String(raw.command || '').trim(),
    exit_code: typeof raw.exit_code === 'number' ? raw.exit_code : null,
    auth_status: String(raw.auth_status || raw.authStatus || '').trim(),
    result: String(raw.result || '').trim(),
    matched_signal: String(raw.matched_signal || raw.matchedSignal || '').trim(),
    summary: String(raw.summary || '').trim(),
    stdout_summary: String(raw.stdout_summary || raw.stdoutSummary || '').trim(),
    stderr_summary: String(raw.stderr_summary || raw.stderrSummary || '').trim(),
  };
}

function normalizeBranchPreflight(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    status: String(raw.status || '').trim() || 'UNKNOWN',
    mode: String(raw.mode || '').trim() || 'unknown',
    checker_kind: String(raw.checker_kind || '').trim() || 'unknown',
    verification_level: String(raw.verification_level || '').trim() || 'unknown',
    summary: String(raw.summary || '').trim(),
    reason: String(raw.reason || '').trim(),
    execution_repo_root: String(raw.execution_repo_root || '').trim(),
    target_app_or_package: String(raw.target_app_or_package || '').trim(),
    workspace: String(raw.workspace || '').trim(),
    next_step: String(raw.next_step || '').trim(),
    available_probe_kinds: Array.isArray(raw.available_probe_kinds)
      ? raw.available_probe_kinds.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    notes: Array.isArray(raw.notes) ? raw.notes.map((item) => String(item || '').trim()).filter(Boolean) : [],
    items: items.map((item) => ({
      psm: String(item.psm || '').trim(),
      branch: String(item.branch || '').trim(),
      checker_kind: String(item.checker_kind || '').trim(),
      verification_level: String(
        item.verification_level
        || item.verificationLevel
        || item.selected_verification_level
        || item.selectedVerificationLevel
        || '',
      ).trim(),
      selected_probe_kind: String(item.selected_probe_kind || item.selectedProbeKind || '').trim(),
      selected_verification_level: String(
        item.selected_verification_level
        || item.selectedVerificationLevel
        || item.verification_level
        || item.verificationLevel
        || '',
      ).trim(),
      command: String(item.command || '').trim(),
      exit_code: typeof item.exit_code === 'number' ? item.exit_code : null,
      auth_status: String(item.auth_status || '').trim(),
      result: String(item.result || '').trim(),
      matched_signal: String(item.matched_signal || '').trim(),
      summary: String(item.summary || '').trim(),
      stdout_summary: String(item.stdout_summary || '').trim(),
      stderr_summary: String(item.stderr_summary || '').trim(),
      probe_attempts: Array.isArray(item.probe_attempts)
        ? item.probe_attempts.map((attempt) => normalizeBranchPreflightAttempt(attempt)).filter(Boolean)
        : [],
      fallback_used: Boolean(item.fallback_used),
    })),
  };
}

function dedupeApis(entries) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    if (!entry?.method || !entry?.path) {
      continue;
    }
    const key = `${entry.method}|${entry.path}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      ...entry,
      api: entry.api || `${entry.method} ${entry.path}`,
    });
  }
  return result;
}

function walk(dir, matcher, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, matcher, results);
    } else if (matcher(full)) {
      results.push(full);
    }
  }
  return results;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatchingBracket(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
      }
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function findServiceObjectRange(source, psmMatch) {
  const psmIndex = psmMatch.index;
  let openIndex = source.lastIndexOf('{', psmIndex);
  while (openIndex >= 0) {
    const closeIndex = findMatchingBracket(source, openIndex, '{', '}');
    if (closeIndex > psmIndex) {
      return { openIndex, closeIndex };
    }
    openIndex = source.lastIndexOf('{', openIndex - 1);
  }
  return null;
}

function findIncludeArrayRange(source, serviceRange) {
  const body = source.slice(serviceRange.openIndex, serviceRange.closeIndex + 1);
  const includeMatch = /include\s*:\s*\[/.exec(body);
  if (!includeMatch) {
    return null;
  }
  const openIndex = serviceRange.openIndex + includeMatch.index + includeMatch[0].lastIndexOf('[');
  const closeIndex = findMatchingBracket(source, openIndex, '[', ']');
  if (closeIndex < 0 || closeIndex > serviceRange.closeIndex) {
    return null;
  }
  return { openIndex, closeIndex };
}

function getServiceIncludeEntries(source, serviceRange) {
  const body = source.slice(serviceRange.openIndex, serviceRange.closeIndex + 1);
  const includeRe = /(['"])(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[^'"]+)\1/g;
  return [...body.matchAll(includeRe)].map((match) => ({
    method: match[2].toUpperCase(),
    path: match[3],
    api: `${match[2].toUpperCase()} ${match[3]}`,
  }));
}

function inferEntryIndent(source, includeRange) {
  const body = source.slice(includeRange.openIndex + 1, includeRange.closeIndex);
  const lines = body.split('\n');
  for (const line of lines.reverse()) {
    const match = line.match(/^(\s*)['"]/);
    if (match) {
      return match[1];
    }
  }
  const lineStart = source.lastIndexOf('\n', includeRange.openIndex) + 1;
  const baseIndent = source.slice(lineStart, includeRange.openIndex).match(/^\s*/)?.[0] || '';
  return `${baseIndent}  `;
}

function inferCloseIndent(source, includeRange) {
  const lineStart = source.lastIndexOf('\n', includeRange.openIndex) + 1;
  return source.slice(lineStart, includeRange.openIndex).match(/^\s*/)?.[0] || '';
}

function analyzeConfig(configPath, psm) {
  const source = fs.readFileSync(configPath, 'utf8');
  const re = new RegExp(`psm\\s*:\\s*(['"])${escapeRegExp(psm)}@([^'"]+)\\1`, 'g');
  const matches = [...source.matchAll(re)];
  return { configPath, source, matches };
}

function findConfigAnalyses(configCandidates, psm) {
  return configCandidates
    .map((configPath) => analyzeConfig(configPath, psm))
    .filter((analysis) => analysis.matches.length > 0);
}

function locatePsmConfig(configCandidates, psm, blockers) {
  const analyses = findConfigAnalyses(configCandidates, psm);
  if (analyses.length !== 1) {
    blockers.push(`PSM ${psm} matched ${analyses.length} bam.config.js files; pass --target-dir or fix evidence.`);
    return null;
  }
  const analysis = analyses[0];
  if (analysis.matches.length !== 1) {
    blockers.push(`PSM ${psm} has ${analysis.matches.length} entries in ${analysis.configPath}; expected exactly one.`);
    return null;
  }
  const serviceRange = findServiceObjectRange(analysis.source, analysis.matches[0]);
  if (!serviceRange) {
    blockers.push(`Unable to locate service object for PSM ${psm} in ${analysis.configPath}.`);
    return null;
  }
  return { analysis, serviceRange };
}

function groupByPsm(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.psm)) {
      map.set(item.psm, []);
    }
    map.get(item.psm).push(item);
  }
  return map;
}

function validatePsmEvidence(psmEvidence, blockers) {
  const byPsm = groupByPsm(psmEvidence);
  for (const [psm, items] of byPsm.entries()) {
    const branches = [...new Set(items.map((item) => item.branch))];
    if (branches.length !== 1) {
      blockers.push(`PSM ${psm} has multiple target branches: ${branches.join(', ')}`);
    }
  }
}

function validateInterfaceCoverage(psmEvidence, interfaceEvidence, blockers) {
  const knownPsms = new Set(psmEvidence.map((item) => item.psm));
  const referencedPsms = new Set(interfaceEvidence.map((item) => item.psm));
  for (const item of interfaceEvidence) {
    if (!knownPsms.has(item.psm)) {
      blockers.push(`Interface evidence references PSM ${item.psm}, but bam-psm-branch-evidence.json has no matching item.`);
    }
  }
  for (const item of psmEvidence) {
    if (!referencedPsms.has(item.psm)) {
      blockers.push(
        `PSM ${item.psm} has branch evidence but no matching HTTP interface change evidence. ` +
        'Only frontend BAM targets consumed by the target app/package may appear in bam-psm-branch-evidence.json.',
      );
    }
  }
}

function buildExistingIncludeMaps(configCandidates, psmEvidence, blockers) {
  const maps = new Map();
  for (const item of psmEvidence) {
    if (maps.has(item.psm)) {
      continue;
    }
    const located = locatePsmConfig(configCandidates, item.psm, blockers);
    if (!located) {
      continue;
    }
    const existingIncludeEntries = getServiceIncludeEntries(located.analysis.source, located.serviceRange);
    const byPath = new Map();
    for (const entry of existingIncludeEntries) {
      if (!byPath.has(entry.path)) {
        byPath.set(entry.path, []);
      }
      byPath.get(entry.path).push(entry);
    }
    maps.set(item.psm, {
      ...located,
      existingIncludeEntries,
      existingByPath: byPath,
    });
  }
  return maps;
}

function metadataMaps(metadataApis) {
  const byEndpoint = new Map();
  const byPath = new Map();
  for (const entry of metadataApis) {
    if (entry.endpointId) {
      byEndpoint.set(entry.endpointId, entry);
    }
    if (!byPath.has(entry.path)) {
      byPath.set(entry.path, []);
    }
    byPath.get(entry.path).push(entry);
  }
  return { byEndpoint, byPath };
}

function resolveInterfaceApi(item, configInfo, metadata, blockers, allowUnresolved) {
  if (item.method && item.path) {
    return {
      method: item.method,
      path: item.path,
      api: `${item.method} ${item.path}`,
      source: 'interface_evidence',
      endpointId: item.endpointId,
    };
  }

  if (item.path) {
    const existingCandidates = configInfo?.existingByPath.get(item.path) || [];
    const uniqueExisting = dedupeApis(existingCandidates);
    if (uniqueExisting.length === 1) {
      return {
        ...uniqueExisting[0],
        source: 'existing_include',
        endpointId: item.endpointId,
      };
    }
  }

  const byEndpoint = item.endpointId ? metadata.byEndpoint.get(item.endpointId) : null;
  if (byEndpoint) {
    return {
      ...byEndpoint,
      source: 'bam_method_metadata',
      endpointId: item.endpointId,
    };
  }

  if (item.path) {
    const metadataCandidates = dedupeApis(metadata.byPath.get(item.path) || []);
    if (metadataCandidates.length === 1) {
      return {
        ...metadataCandidates[0],
        source: 'bam_method_metadata',
        endpointId: item.endpointId,
      };
    }
  }

  if (!allowUnresolved) {
    const idHint = item.endpointId ? `endpoint_id=${item.endpointId}` : 'missing endpoint_id';
    blockers.push(`Unable to resolve METHOD /path for PSM ${item.psm} ${item.path || '(missing path)'} (${idHint}).`);
  }
  return null;
}

function buildMethodLookupPlan(interfaceEvidence, configMaps, blockers) {
  const items = [];
  const seen = new Set();
  for (const item of interfaceEvidence) {
    const configInfo = configMaps.get(item.psm);
    if (item.method && item.path) {
      continue;
    }
    if (item.path) {
      const existingCandidates = dedupeApis(configInfo?.existingByPath.get(item.path) || []);
      if (existingCandidates.length === 1) {
        continue;
      }
    }
    if (!item.endpointId) {
      blockers.push(`Interface ${item.psm} ${item.path || '(missing path)'} needs method lookup but has no endpoint_id.`);
      continue;
    }
    const key = `${item.psm}|${item.endpointId}|${item.path}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    items.push({
      psm: item.psm,
      endpoint_id: item.endpointId,
      path: item.path,
      bam_url: item.bamUrl,
      reason: item.path ? 'missing_method_and_not_in_existing_include' : 'missing_path_or_method',
      command: `bytedcli --json bam method get --endpoint-id ${item.endpointId}`,
    });
  }
  return { items };
}

function planIncludeUpdate(source, serviceRange, requiredApis) {
  const existing = new Set(getServiceIncludeEntries(source, serviceRange).map((entry) => entry.api));
  const missing = requiredApis.filter((entry) => !existing.has(entry.api));
  if (!missing.length) {
    return {
      missing,
      updatedSource: source,
      action: 'include_already_complete',
    };
  }

  const includeRange = findIncludeArrayRange(source, serviceRange);
  if (!includeRange) {
    throw new Error('Unable to locate include array.');
  }
  const entryIndent = inferEntryIndent(source, includeRange);
  const closeLineStart = source.lastIndexOf('\n', includeRange.closeIndex) + 1;
  const closeLinePrefix = source.slice(closeLineStart, includeRange.closeIndex);
  const insertAt = /^\s*$/.test(closeLinePrefix) ? closeLineStart : includeRange.closeIndex;
  const closeIndent = /^\s*$/.test(closeLinePrefix) && closeLinePrefix.length
    ? closeLinePrefix
    : inferCloseIndent(source, includeRange);
  const entryText = missing.map((entry) => `${entryIndent}'${entry.api}',`).join('\n');
  const insertText = insertAt === closeLineStart
    ? `${entryText}\n${closeIndent}`
    : `\n${entryText}\n${closeIndent}`;
  return {
    missing,
    updatedSource: `${source.slice(0, insertAt)}${insertText}${source.slice(includeRange.closeIndex)}`,
    action: 'include_add_entries',
  };
}

function makeReport({ mode, workspace, repoRoot, targetDir, psmEvidence, interfaceEvidence, lookupPlan, requiredApis, changes, blockers, branchPreflight }) {
  const lines = [];
  lines.push('# BAM Sync Report');
  lines.push('');
  lines.push(`- status: ${blockers.length ? 'BLOCKED' : mode === 'apply-config-write' ? 'UPDATED' : 'DRY_RUN'}`);
  lines.push(`- mode: \`${mode}\``);
  lines.push(`- workspace: \`${workspace}\``);
  lines.push(`- repo_root: \`${repoRoot || 'N/A'}\``);
  lines.push(`- target_dir: \`${targetDir || 'N/A'}\``);
  lines.push('');
  lines.push('## Branch Preflight');
  if (branchPreflight) {
    lines.push(`- \`branch_preflight.status\`: \`${branchPreflight.status}\``);
    lines.push(`- \`branch_preflight.checker_kind\`: \`${branchPreflight.checker_kind}\``);
    lines.push(`- \`branch_preflight.verification_level\`: \`${branchPreflight.verification_level}\``);
    lines.push(`- \`branch_preflight.summary\`: ${escapeTable(branchPreflight.summary || 'none')}`);
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(branchPreflight, null, 2));
    lines.push('```');
  } else {
    lines.push('- `branch_preflight.status`: `MISSING`');
    lines.push('- `branch_preflight.summary`: missing `--branch-preflight` input');
  }
  lines.push('');
  lines.push('## PSM Branch Evidence');
  lines.push('| PSM | branch | source | evidence |');
  lines.push('|---|---|---|---|');
  for (const item of psmEvidence) {
    lines.push(`| \`${item.psm}\` | \`${item.branch}\` | ${item.source} | ${escapeTable(item.evidence || '')} |`);
  }
  if (!psmEvidence.length) {
    lines.push('| none | none | none | none |');
  }
  lines.push('');
  lines.push('## Interface Change Evidence');
  lines.push('| PSM | endpoint_id | method | path | change_type | changed_fields |');
  lines.push('|---|---|---|---|---|---|');
  for (const item of interfaceEvidence) {
    const fields = item.changedFields.map((field) => field.name || field.field || JSON.stringify(field)).join(', ');
    lines.push(`| \`${item.psm}\` | \`${item.endpointId || 'MISSING'}\` | \`${item.method || 'MISSING'}\` | \`${item.path || 'MISSING'}\` | ${item.changeType || 'unknown'} | ${escapeTable(fields || 'none')} |`);
  }
  if (!interfaceEvidence.length) {
    lines.push('| none | none | none | none | none | none |');
  }
  lines.push('');
  lines.push('## Method Lookup Plan');
  if (lookupPlan.items.length) {
    lines.push('| PSM | endpoint_id | path | reason | command |');
    lines.push('|---|---|---|---|---|');
    for (const item of lookupPlan.items) {
      lines.push(`| \`${item.psm}\` | \`${item.endpoint_id}\` | \`${item.path || 'MISSING'}\` | ${item.reason} | \`${item.command}\` |`);
    }
  } else {
    lines.push('- none');
  }
  lines.push('');
  lines.push('## Required Include Entries');
  if (requiredApis.length) {
    lines.push('| API | source | endpoint_id |');
    lines.push('|---|---|---|');
    for (const entry of requiredApis) {
      lines.push(`| \`${entry.api}\` | ${entry.source || 'unknown'} | \`${entry.endpointId || 'N/A'}\` |`);
    }
  } else {
    lines.push('- none');
  }
  lines.push('');
  lines.push('## Config Changes');
  if (changes.length) {
    lines.push('| config | PSM | before | after | action | include_missing |');
    lines.push('|---|---|---|---|---|---|');
    for (const change of changes) {
      lines.push(`| \`${change.configPath}\` | \`${change.psm}\` | \`${change.before}\` | \`${change.after}\` | ${change.action} | \`${change.includeMissing.join(', ') || 'none'}\` |`);
    }
  } else {
    lines.push('- none');
  }
  lines.push('');
  lines.push('## Blockers');
  if (blockers.length) {
    for (const blocker of blockers) {
      lines.push(`- ${blocker}`);
    }
  } else {
    lines.push('- none');
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function escapeTable(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function writeJson(file, value) {
  fs.writeFileSync(path.resolve(file), `${JSON.stringify(value, null, 2)}\n`);
}

function getConfigCandidates(repoRoot, targetDir, blockers) {
  const candidates = targetDir
    ? [path.join(targetDir, 'bam.config.js')].filter((item) => fs.existsSync(item))
    : walk(repoRoot, (file) => path.basename(file) === 'bam.config.js');
  if (!candidates.length) {
    blockers.push(`No bam.config.js found${targetDir ? ` under ${targetDir}` : ` under ${repoRoot}`}.`);
  }
  return candidates;
}

function readEvidence(args) {
  const psmEvidence = normalizePsmEvidence(readJson(args['psm-branch-evidence'], 'psm branch evidence'));
  const interfaceEvidence = normalizeInterfaceEvidence(readJson(args['interface-evidence'], 'interface evidence'));
  return { psmEvidence, interfaceEvidence };
}

function mainEvidenceMode(args) {
  const workspace = path.resolve(requiredArg(args, 'workspace'));
  const repoRoot = path.resolve(requiredArg(args, 'repo-root'));
  const targetDir = args['target-dir'] ? path.resolve(args['target-dir']) : '';
  const mode = args.mode || 'apply-config';
  if (!['plan-methods', 'apply-config'].includes(mode)) {
    throw new Error(`Unsupported --mode: ${mode}`);
  }
  if (!fs.existsSync(workspace)) {
    throw new Error(`Missing workspace: ${workspace}`);
  }
  if (!fs.existsSync(repoRoot)) {
    throw new Error(`Missing repo root: ${repoRoot}`);
  }
  if (targetDir && !fs.existsSync(targetDir)) {
    throw new Error(`Missing target dir: ${targetDir}`);
  }

  const blockers = [];
  const { psmEvidence, interfaceEvidence } = readEvidence(args);
  const branchPreflight = args['branch-preflight']
    ? normalizeBranchPreflight(readJson(args['branch-preflight'], 'branch preflight'))
    : null;
  if (psmEvidence.length && !branchPreflight) {
    blockers.push('Missing branch preflight artifact: pass --branch-preflight <workspace>/bam/bam-branch-preflight.json before continuing.');
  } else if (psmEvidence.length && branchPreflight?.status !== 'PASSED') {
    blockers.push(`Branch preflight status is ${branchPreflight.status}; config sync cannot continue until preflight passes.`);
  }
  validatePsmEvidence(psmEvidence, blockers);
  validateInterfaceCoverage(psmEvidence, interfaceEvidence, blockers);
  const configCandidates = getConfigCandidates(repoRoot, targetDir, blockers);
  const configMaps = buildExistingIncludeMaps(configCandidates, psmEvidence, blockers);
  const lookupPlan = buildMethodLookupPlan(interfaceEvidence, configMaps, blockers);

  if (mode === 'plan-methods') {
    if (args['method-lookup-plan']) {
      writeJson(args['method-lookup-plan'], lookupPlan);
    }
    const report = makeReport({
      mode,
      workspace,
      repoRoot,
      targetDir,
      psmEvidence,
      interfaceEvidence,
      lookupPlan,
      requiredApis: [],
      changes: [],
      blockers,
      branchPreflight,
    });
    if (args.report) {
      fs.writeFileSync(path.resolve(args.report), report);
    }
    process.stdout.write(report);
    if (blockers.length) {
      process.exit(1);
    }
    return;
  }

  const metadataApis = args['method-metadata']
    ? normalizeMethodMetadata(readJson(args['method-metadata'], 'method metadata'))
    : [];
  const metadata = metadataMaps(metadataApis);
  const requiredApis = [];
  const changes = [];
  const writes = new Map();
  const psmByName = groupByPsm(psmEvidence);
  const interfacesByPsm = groupByPsm(interfaceEvidence);

  for (const [psm, branchItems] of psmByName.entries()) {
    const branches = [...new Set(branchItems.map((item) => item.branch))];
    if (branches.length !== 1) {
      continue;
    }
    const configInfo = configMaps.get(psm);
    if (!configInfo) {
      continue;
    }
    const psmInterfaces = interfacesByPsm.get(psm) || [];
    const resolvedApis = dedupeApis(psmInterfaces
      .map((item) => resolveInterfaceApi(item, configInfo, metadata, blockers, false))
      .filter(Boolean));
    requiredApis.push(...resolvedApis);
    if (blockers.length) {
      continue;
    }

    const currentSource = writes.get(configInfo.analysis.configPath) || configInfo.analysis.source;
    const currentAnalysis = {
      ...analyzeConfigFromSource(configInfo.analysis.configPath, currentSource, psm),
      configPath: configInfo.analysis.configPath,
    };
    if (currentAnalysis.matches.length !== 1) {
      blockers.push(`PSM ${psm} has ${currentAnalysis.matches.length} entries in ${configInfo.analysis.configPath} after earlier updates; expected exactly one.`);
      continue;
    }
    const serviceRange = findServiceObjectRange(currentAnalysis.source, currentAnalysis.matches[0]);
    if (!serviceRange) {
      blockers.push(`Unable to locate service object for PSM ${psm} in ${configInfo.analysis.configPath} after earlier updates.`);
      continue;
    }
    const includeUpdate = planIncludeUpdate(currentAnalysis.source, serviceRange, resolvedApis);
    let updatedSource = includeUpdate.updatedSource;
    const currentBranch = currentAnalysis.matches[0][2];
    const nextBranch = branches[0];
    const before = `${psm}@${currentBranch}`;
    const after = `${psm}@${nextBranch}`;
    if (before !== after) {
      updatedSource = updatedSource.replace(before, after);
    }
    writes.set(configInfo.analysis.configPath, updatedSource);
    const branchAction = before === after ? 'config_already_on_branch' : 'psm_branch_update';
    changes.push({
      configPath: configInfo.analysis.configPath,
      psm,
      before,
      after,
      action: `${branchAction}+${includeUpdate.action}`,
      includeMissing: includeUpdate.missing.map((entry) => entry.api),
    });
  }

  if (args.write && blockers.length) {
    throw new Error(`Refusing to write because blockers exist:\n- ${blockers.join('\n- ')}`);
  }
  if (args.write) {
    for (const [configPath, updatedSource] of writes.entries()) {
      fs.writeFileSync(configPath, updatedSource);
    }
  }

  const report = makeReport({
    mode: args.write ? 'apply-config-write' : 'apply-config-dry-run',
    workspace,
    repoRoot,
    targetDir,
    psmEvidence,
    interfaceEvidence,
    lookupPlan,
    requiredApis: dedupeApis(requiredApis),
    changes,
    blockers,
    branchPreflight,
  });
  if (args.report) {
    fs.writeFileSync(path.resolve(args.report), report);
  }
  process.stdout.write(report);
  if (blockers.length) {
    process.exit(1);
  }
}

function analyzeConfigFromSource(configPath, source, psm) {
  const re = new RegExp(`psm\\s*:\\s*(['"])${escapeRegExp(psm)}@([^'"]+)\\1`, 'g');
  const matches = [...source.matchAll(re)];
  return { configPath, source, matches };
}

function requiredArg(args, name) {
  if (!args[name]) {
    usage();
    throw new Error(`Missing required --${name}`);
  }
  return args[name];
}

function sanitizeBamUrl(rawUrl) {
  return String(rawUrl || '')
    .replace(/&amp;/g, '&')
    .replace(/[.,;，。；]+$/, '');
}

function extractBamLinks(markdown) {
  const links = [];
  const seen = new Set();
  const urlRe = /https:\/\/cloud\.bytedance\.net\/bam\/rd\/([^/\s<)]+)\/api_doc\/show_doc\?[^)\s<>'"]+/g;
  let match;
  while ((match = urlRe.exec(markdown))) {
    const url = sanitizeBamUrl(match[0]);
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    const parsed = new URL(url);
    links.push({
      url,
      psm: decodeURIComponent(match[1]),
      api_branch: parsed.searchParams.get('api_branch') || '',
      endpoint_id: parsed.searchParams.get('endpoint_id') || '',
    });
  }
  return links;
}

function makeDetectionReport({ workspace, techDoc, links }) {
  const lines = [];
  lines.push('# BAM Link Detection Report');
  lines.push('');
  lines.push(`- status: ${links.length ? 'BAM_LINKS_FOUND' : 'NO_BAM_LINKS_FOUND'}`);
  lines.push(`- workspace: \`${workspace || 'N/A'}\``);
  lines.push(`- tech_doc: \`${techDoc}\``);
  lines.push(`- matched_link_count: ${links.length}`);
  lines.push('');
  lines.push('## Parsed BAM Links');
  lines.push('| PSM | api_branch | endpoint_id | url |');
  lines.push('|---|---|---|---|');
  if (links.length) {
    for (const link of links) {
      lines.push(`| \`${link.psm}\` | \`${link.api_branch || 'MISSING'}\` | \`${link.endpoint_id || 'MISSING'}\` | \`${link.url}\` |`);
    }
  } else {
    lines.push('| none | none | none | none |');
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function mainDetectOnly(args) {
  const workspace = path.resolve(requiredArg(args, 'workspace'));
  const techDoc = args['tech-doc'] ? path.resolve(args['tech-doc']) : path.join(workspace, 'tech-doc-raw.md');
  if (!fs.existsSync(techDoc)) {
    throw new Error(`Missing tech doc: ${techDoc}`);
  }
  const links = extractBamLinks(fs.readFileSync(techDoc, 'utf8'));
  const report = makeDetectionReport({ workspace, techDoc, links });
  if (args.report) {
    fs.writeFileSync(path.resolve(args.report), report);
  }
  process.stdout.write(report);
}

function main() {
  const args = parseArgs(process.argv);
  if (args['detect-only']) {
    mainDetectOnly(args);
    return;
  }
  mainEvidenceMode(args);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
