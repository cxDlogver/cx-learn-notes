#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function usage() {
  console.error(`Usage:
Reusable BAM branch preflight:
node .trae/scripts/bam_branch_preflight.mjs \\
  --mode preflight \\
  --workspace <workspace> \\
  --repo-root <repo-root> \\
  --target-dir <target-app-or-package> \\
  --psm-branch-evidence <workspace>/bam/bam-psm-branch-evidence.json \\
  --output <workspace>/bam/bam-branch-preflight.json \\
  [--report <workspace>/bam/bam-sync-report.md] \\
  [--check-command-template '<custom checker command with {psm}/{branch}>'] \\
  [--probe-spec-file <workspace>/bam/bam-branch-preflight-probes.json] \\
  [--disable-default-probes true]

No-op BAM report:
node .trae/scripts/bam_branch_preflight.mjs \\
  --mode no-op-report \\
  --workspace <workspace> \\
  --repo-root <repo-root> \\
  --target-dir <target-app-or-package> \\
  --psm-branch-evidence <workspace>/bam/bam-psm-branch-evidence.json \\
  --interface-evidence <workspace>/bam/bam-interface-change-evidence.json \\
  --output <workspace>/bam/bam-branch-preflight.json \\
  --report <workspace>/bam/bam-sync-report.md`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
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

function requiredArg(args, name) {
  if (!args[name]) {
    usage();
    throw new Error(`Missing required --${name}`);
  }
  return args[name];
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

function writeJson(file, value) {
  fs.writeFileSync(path.resolve(file), `${JSON.stringify(value, null, 2)}\n`);
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

function normalizePsmEvidence(raw) {
  const result = [];
  const seen = new Set();
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
  const result = [];
  const seen = new Set();
  for (const item of asItems(raw)) {
    const psm = String(item.psm || '').trim();
    const endpointId = String(item.endpoint_id || item.endpointId || '').trim();
    const pathValue = String(item.path || item.http_path || item.httpPath || '').trim();
    const method = String(item.method || item.http_method || item.httpMethod || '').trim().toUpperCase();
    const key = `${psm}|${endpointId}|${method}|${pathValue}`;
    if (!psm || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      psm,
      endpointId,
      path: pathValue,
      method,
      changeType: item.change_type || item.changeType || '',
      changedFields: Array.isArray(item.changed_fields)
        ? item.changed_fields
        : Array.isArray(item.changedFields)
          ? item.changedFields
          : [],
    });
  }
  return result;
}

function escapeTable(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function summarizeOutput(value, maxLength = 240) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return '';
  }
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3)}...` : cleaned;
}

function substituteTemplate(template, item) {
  return template
    .replaceAll('{psm}', item.psm)
    .replaceAll('{branch}', item.branch)
    .replaceAll('{source}', item.source || '')
    .replaceAll('{evidence}', item.evidence || '');
}

function parseBooleanFlag(value, defaultValue = false) {
  if (value == null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean value: ${value}`);
}

function normalizeProbeSpec(spec, index) {
  const kind = String(spec.kind || '').trim();
  const commandTemplate = String(spec.command_template || spec.commandTemplate || '').trim();
  const verificationLevel = String(spec.verification_level || spec.verificationLevel || '').trim()
    || 'branch_exists';
  if (!kind) {
    throw new Error(`Invalid probe spec at index ${index}: missing kind`);
  }
  if (!commandTemplate) {
    throw new Error(`Invalid probe spec at index ${index}: missing command_template`);
  }
  if (!['branch_exists', 'psm_reachability_only'].includes(verificationLevel)) {
    throw new Error(`Invalid probe spec at index ${index}: unsupported verification_level ${verificationLevel}`);
  }
  return {
    kind,
    command_template: commandTemplate,
    verification_level: verificationLevel,
  };
}

function loadProbeSpecs(args) {
  const probes = [];
  if (args['probe-spec-file']) {
    const raw = readJson(args['probe-spec-file'], 'probe spec file');
    const items = asItems(raw);
    items.forEach((item, index) => {
      probes.push(normalizeProbeSpec(item, index));
    });
  }
  if (args['check-command-template']) {
    probes.unshift(normalizeProbeSpec({
      kind: 'command_template',
      command_template: args['check-command-template'],
      verification_level: 'branch_exists',
    }, 'command_template'));
  }
  const disableDefaultProbes = parseBooleanFlag(args['disable-default-probes'], false);
  if (!disableDefaultProbes) {
    probes.push({
      kind: 'bits_cli_bam_psm_list_version',
      command_template: 'bits-cli bam psm list-version --psm {psm}',
      verification_level: 'psm_reachability_only',
    });
  }
  if (!probes.length) {
    throw new Error('No branch preflight probes configured. Provide --check-command-template or --probe-spec-file, or omit --disable-default-probes.');
  }
  return probes;
}

function inferAuthStatus(combinedOutput) {
  if (/not login|401|token is malformed|permission denied|auth/i.test(combinedOutput)) {
    return 'AUTH_REQUIRED';
  }
  return 'AUTH_OK';
}

function inferSignal(result, combinedOutput, item, probe) {
  if (/command not found|not recognized/i.test(combinedOutput)) {
    return 'COMMAND_NOT_FOUND';
  }
  if (/not login|401|token is malformed|permission denied|auth/i.test(combinedOutput)) {
    return 'AUTH_REQUIRED';
  }
  const branchMissingRe = new RegExp(`no branch of\\s+${escapeRegExp(item.branch)}\\s+in psm|branch\\s+${escapeRegExp(item.branch)}\\s+not found`, 'i');
  if (branchMissingRe.test(combinedOutput)) {
    return 'BRANCH_NOT_FOUND';
  }
  if (/psm .*not found|service .*not found|no such psm/i.test(combinedOutput)) {
    return 'PSM_NOT_FOUND';
  }
  if (result.status === 0) {
    return probe.verification_level === 'branch_exists' ? 'BRANCH_CHECK_PASSED' : 'PSM_METADATA_REACHABLE';
  }
  return 'UNKNOWN_FAILURE';
}

function buildProbeAttempt(item, probe, result) {
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  const combinedOutput = `${stdout}\n${stderr}`;
  const signal = inferSignal(result, combinedOutput, item, probe);
  const authStatus = inferAuthStatus(combinedOutput);
  const summaryBySignal = {
    BRANCH_CHECK_PASSED: `Checker confirmed ${item.psm}@${item.branch}.`,
    PSM_METADATA_REACHABLE: `Probe reached PSM ${item.psm}; this probe only verifies metadata reachability, not explicit branch enumeration.`,
    AUTH_REQUIRED: `Checker could not verify ${item.psm}@${item.branch} because BAM metadata auth is unavailable.`,
    COMMAND_NOT_FOUND: 'Configured branch preflight command is unavailable in the current environment.',
    BRANCH_NOT_FOUND: `Checker explicitly reported branch ${item.branch} missing for ${item.psm}.`,
    PSM_NOT_FOUND: `Checker could not locate PSM ${item.psm}.`,
    UNKNOWN_FAILURE: `Checker failed for ${item.psm}@${item.branch}.`,
  };
  const isPass = signal === 'BRANCH_CHECK_PASSED' || signal === 'PSM_METADATA_REACHABLE';
  return {
    probe_kind: probe.kind,
    verification_level: probe.verification_level,
    command: substituteTemplate(probe.command_template, item),
    exit_code: typeof result.status === 'number' ? result.status : -1,
    auth_status: signal === 'BRANCH_CHECK_PASSED' || signal === 'PSM_METADATA_REACHABLE' ? 'AUTH_OK' : authStatus,
    result: isPass ? 'PASSED' : 'BLOCKED',
    matched_signal: signal,
    summary: summaryBySignal[signal] || `Checker finished with signal ${signal}.`,
    stdout_summary: summarizeOutput(stdout),
    stderr_summary: summarizeOutput(stderr),
  };
}

function runChecker(command) {
  return spawnSync('zsh', ['-lc', command], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
}

function signalPriority(signal) {
  const order = {
    BRANCH_NOT_FOUND: 5,
    PSM_NOT_FOUND: 4,
    AUTH_REQUIRED: 3,
    COMMAND_NOT_FOUND: 2,
    UNKNOWN_FAILURE: 1,
  };
  return order[signal] || 0;
}

function finalizeBlockedItem(item, attempts) {
  const selectedAttempt = attempts.reduce((best, current) => {
    if (!best) {
      return current;
    }
    return signalPriority(current.matched_signal) > signalPriority(best.matched_signal) ? current : best;
  }, null);
  return {
    psm: item.psm,
    branch: item.branch,
    checker_kind: 'probe_chain',
    selected_probe_kind: selectedAttempt?.probe_kind || 'unknown',
    selected_verification_level: selectedAttempt?.verification_level || 'unknown',
    command: selectedAttempt?.command || '',
    exit_code: selectedAttempt?.exit_code ?? -1,
    auth_status: selectedAttempt?.auth_status || 'AUTH_REQUIRED',
    result: 'BLOCKED',
    matched_signal: selectedAttempt?.matched_signal || 'UNKNOWN_FAILURE',
    summary: selectedAttempt?.summary || `Checker failed for ${item.psm}@${item.branch}.`,
    stdout_summary: selectedAttempt?.stdout_summary || '',
    stderr_summary: selectedAttempt?.stderr_summary || '',
    probe_attempts: attempts,
    fallback_used: attempts.length > 1,
  };
}

function resolveItemWithProbes(item, probes) {
  const attempts = [];
  for (const probe of probes) {
    const command = substituteTemplate(probe.command_template, item);
    const result = runChecker(command);
    const attempt = buildProbeAttempt(item, probe, result);
    attempts.push(attempt);
    if (attempt.result === 'PASSED') {
      return {
        psm: item.psm,
        branch: item.branch,
        checker_kind: 'probe_chain',
        selected_probe_kind: attempt.probe_kind,
        selected_verification_level: attempt.verification_level,
        command: attempt.command,
        exit_code: attempt.exit_code,
        auth_status: attempt.auth_status,
        result: 'PASSED',
        matched_signal: attempt.matched_signal,
        summary: attempt.summary,
        stdout_summary: attempt.stdout_summary,
        stderr_summary: attempt.stderr_summary,
        probe_attempts: attempts,
        fallback_used: attempts.length > 1,
      };
    }
    if (['BRANCH_NOT_FOUND', 'PSM_NOT_FOUND'].includes(attempt.matched_signal)) {
      break;
    }
  }
  return finalizeBlockedItem(item, attempts);
}

function inferOverallVerificationLevel(items) {
  if (!items.length) {
    return 'not_applicable';
  }
  const selectedLevels = items.map((item) => item.selected_verification_level).filter(Boolean);
  if (!selectedLevels.length) {
    return 'unknown';
  }
  return selectedLevels.every((level) => level === 'branch_exists')
    ? 'branch_exists'
    : 'psm_reachability_only';
}

function buildNotes(mode, probes, items) {
  const notes = [];
  if (mode !== 'no-op-report') {
    notes.push(`Probe chain order: ${probes.map((probe) => `\`${probe.kind}\``).join(' -> ')}.`);
  }
  if (mode !== 'no-op-report' && items.some((item) => item.selected_verification_level === 'psm_reachability_only')) {
    notes.push(
      'At least one target only has metadata reachability evidence; this proves BAM metadata access for the PSM but does not directly enumerate branch names.',
    );
  }
  if (mode !== 'no-op-report' && items.some((item) => item.auth_status === 'AUTH_REQUIRED')) {
    notes.push('At least one preflight check requires BAM metadata login before the stage can continue safely.');
  }
  if (mode !== 'no-op-report' && items.some((item) => item.fallback_used)) {
    notes.push('At least one target required fallback to a later probe in the configured probe chain.');
  }
  return notes;
}

function buildPreflightArtifact({ mode, workspace, repoRoot, targetDir, probes, psmEvidence, items, reason }) {
  const blockerItems = items.filter((item) => item.result !== 'PASSED');
  const status = mode === 'no-op-report'
    ? 'SKIPPED_NO_BRANCH_EVIDENCE'
    : blockerItems.length
      ? 'BLOCKED'
      : 'PASSED';
  const verificationLevel = mode === 'no-op-report' ? 'not_applicable' : inferOverallVerificationLevel(items);
  const summary = mode === 'no-op-report'
    ? 'Full tech-doc read completed but no target PSM/branch extracted.'
    : blockerItems.length
      ? `Branch preflight blocked on ${blockerItems.length} target(s).`
      : verificationLevel === 'branch_exists'
        ? 'All target branches passed the configured branch-existence probe chain.'
        : 'All targets passed preflight, but at least one target only has metadata reachability evidence.';
  return {
    status,
    mode: mode === 'no-op-report' ? 'no-op' : 'preflight',
    checker_kind: mode === 'no-op-report'
      ? 'not_applicable'
      : 'probe_chain',
    verification_level: verificationLevel,
    summary,
    reason: reason || '',
    execution_repo_root: repoRoot,
    target_app_or_package: targetDir,
    workspace,
    next_step: mode === 'no-op-report'
      ? '/delivery:plan'
      : status === 'PASSED'
        ? '/delivery:bam:plan-methods'
        : '/delivery:plan',
    available_probe_kinds: mode === 'no-op-report' ? [] : probes.map((probe) => probe.kind),
    items,
    notes: buildNotes(mode, probes, items),
  };
}

function renderBranchPreflightSection(branchPreflight) {
  const lines = [];
  lines.push('## Branch Preflight');
  lines.push(`- \`branch_preflight.status\`: \`${branchPreflight.status}\``);
  lines.push(`- \`branch_preflight.checker_kind\`: \`${branchPreflight.checker_kind}\``);
  lines.push(`- \`branch_preflight.verification_level\`: \`${branchPreflight.verification_level}\``);
  lines.push(`- \`branch_preflight.summary\`: ${branchPreflight.summary}`);
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(branchPreflight, null, 2));
  lines.push('```');
  lines.push('');
  return lines;
}

function makeNoOpReport({ workspace, repoRoot, targetDir, psmEvidence, interfaceEvidence, branchPreflight }) {
  const lines = [];
  lines.push('# BAM Sync Report');
  lines.push('');
  lines.push('- status: SKIPPED_NO_BRANCH_EVIDENCE');
  lines.push('- mode: `no-op`');
  lines.push(`- workspace: \`${workspace}\``);
  lines.push(`- repo_root: \`${repoRoot || 'N/A'}\``);
  lines.push(`- target_dir: \`${targetDir || 'N/A'}\``);
  lines.push('- execution_mode: `no-op`');
  lines.push('- reason: `full tech-doc read completed but no target PSM/branch extracted`');
  lines.push('- next_step: `/delivery:plan`');
  lines.push('');
  lines.push(...renderBranchPreflightSection(branchPreflight));
  lines.push('## PSM Branch Evidence');
  lines.push('| PSM | branch | source | evidence |');
  lines.push('|---|---|---|---|');
  if (psmEvidence.length) {
    for (const item of psmEvidence) {
      lines.push(`| \`${item.psm}\` | \`${item.branch}\` | ${item.source} | ${escapeTable(item.evidence || '')} |`);
    }
  } else {
    lines.push('| none | none | none | none |');
  }
  lines.push('');
  lines.push('## Interface Change Evidence');
  lines.push('| PSM | endpoint_id | method | path | change_type | changed_fields |');
  lines.push('|---|---|---|---|---|---|');
  if (interfaceEvidence.length) {
    for (const item of interfaceEvidence) {
      const fields = item.changedFields.map((field) => field.name || field.field || JSON.stringify(field)).join(', ');
      lines.push(`| \`${item.psm}\` | \`${item.endpointId || 'MISSING'}\` | \`${item.method || 'MISSING'}\` | \`${item.path || 'MISSING'}\` | ${item.changeType || 'unknown'} | ${escapeTable(fields || 'none')} |`);
    }
  } else {
    lines.push('| none | none | none | none | none | none |');
  }
  lines.push('');
  lines.push('## Method Lookup Plan');
  lines.push('- N/A (no-op)');
  lines.push('');
  lines.push('## Required Include Entries');
  lines.push('- N/A (no-op)');
  lines.push('');
  lines.push('## Config Changes');
  lines.push('- none');
  lines.push('');
  lines.push('## Blockers');
  lines.push('- none');
  lines.push('');
  lines.push('## BAM Update Execution');
  lines.push('- N/A (no-op)');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function makePreflightReport({ workspace, repoRoot, targetDir, psmEvidence, branchPreflight }) {
  const lines = [];
  const blockers = branchPreflight.items.filter((item) => item.result !== 'PASSED');
  lines.push('# BAM Sync Report');
  lines.push('');
  lines.push(`- status: ${branchPreflight.status}`);
  lines.push('- mode: `branch-preflight`');
  lines.push(`- workspace: \`${workspace}\``);
  lines.push(`- repo_root: \`${repoRoot || 'N/A'}\``);
  lines.push(`- target_dir: \`${targetDir || 'N/A'}\``);
  lines.push(`- execution_mode: \`${branchPreflight.status === 'PASSED' ? 'preflight_passed' : 'preflight_blocked'}\``);
  lines.push(`- next_step: \`${branchPreflight.status === 'PASSED' ? '/delivery:bam:plan-methods' : '/delivery:plan'}\``);
  lines.push('');
  lines.push(...renderBranchPreflightSection(branchPreflight));
  lines.push('## PSM Branch Evidence');
  lines.push('| PSM | branch | source | evidence |');
  lines.push('|---|---|---|---|');
  for (const item of psmEvidence) {
    lines.push(`| \`${item.psm}\` | \`${item.branch}\` | ${item.source} | ${escapeTable(item.evidence || '')} |`);
  }
  lines.push('');
  lines.push('## Method Lookup Plan');
  lines.push('- N/A (preflight stage only)');
  lines.push('');
  lines.push('## Required Include Entries');
  lines.push('- N/A (preflight stage only)');
  lines.push('');
  lines.push('## Config Changes');
  lines.push('- none (preflight stage only)');
  lines.push('');
  lines.push('## Blockers');
  if (blockers.length) {
    for (const item of blockers) {
      lines.push(`- \`${item.psm}@${item.branch}\`: ${item.summary}`);
    }
  } else {
    lines.push('- none');
  }
  lines.push('');
  lines.push('## BAM Update Execution');
  lines.push('- N/A (preflight stage only)');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function mainPreflight(args) {
  const workspace = path.resolve(requiredArg(args, 'workspace'));
  const repoRoot = path.resolve(requiredArg(args, 'repo-root'));
  const targetDir = path.resolve(requiredArg(args, 'target-dir'));
  const output = path.resolve(requiredArg(args, 'output'));
  const reportPath = args.report ? path.resolve(args.report) : '';
  const psmEvidence = normalizePsmEvidence(readJson(requiredArg(args, 'psm-branch-evidence'), 'psm branch evidence'));
  const probes = loadProbeSpecs(args);
  const items = psmEvidence.map((item) => resolveItemWithProbes(item, probes));

  const artifact = buildPreflightArtifact({
    mode: 'preflight',
    workspace,
    repoRoot,
    targetDir,
    probes,
    psmEvidence,
    items,
    reason: '',
  });
  writeJson(output, artifact);
  if (reportPath) {
    const report = makePreflightReport({
      workspace,
      repoRoot,
      targetDir,
      psmEvidence,
      branchPreflight: artifact,
    });
    fs.writeFileSync(reportPath, report);
  }
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
  if (artifact.status !== 'PASSED') {
    process.exit(1);
  }
}

function mainNoOpReport(args) {
  const workspace = path.resolve(requiredArg(args, 'workspace'));
  const repoRoot = path.resolve(requiredArg(args, 'repo-root'));
  const targetDir = path.resolve(requiredArg(args, 'target-dir'));
  const output = path.resolve(requiredArg(args, 'output'));
  const reportPath = path.resolve(requiredArg(args, 'report'));
  const psmEvidence = normalizePsmEvidence(readJson(requiredArg(args, 'psm-branch-evidence'), 'psm branch evidence'));
  const interfaceEvidence = normalizeInterfaceEvidence(readJson(requiredArg(args, 'interface-evidence'), 'interface evidence'));
  const artifact = buildPreflightArtifact({
    mode: 'no-op-report',
    workspace,
    repoRoot,
    targetDir,
    probes: [],
    psmEvidence,
    items: [],
    reason: 'full tech-doc read completed but no target PSM/branch extracted',
  });
  writeJson(output, artifact);
  const report = makeNoOpReport({
    workspace,
    repoRoot,
    targetDir,
    psmEvidence,
    interfaceEvidence,
    branchPreflight: artifact,
  });
  fs.writeFileSync(reportPath, report);
  process.stdout.write(report);
}

function main() {
  const args = parseArgs(process.argv);
  const mode = requiredArg(args, 'mode');
  if (mode === 'preflight') {
    mainPreflight(args);
    return;
  }
  if (mode === 'no-op-report') {
    mainNoOpReport(args);
    return;
  }
  usage();
  throw new Error(`Unsupported --mode: ${mode}`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
