#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
if (!args[0]) {
  console.error("Usage: validate-repair-artifacts.mjs <repair-run-dir> [--stage <analysis|init|prd|bam|plan|task|code|verify|design|repair-result>]");
  process.exit(2);
}

const stageArg = args.indexOf("--stage");
const validationStage = stageArg >= 0 ? args[stageArg + 1] : null;
const allowedValidationStages = new Set(["analysis", "init", "prd", "bam", "plan", "task", "code", "verify", "design", "repair-result"]);
if (stageArg >= 0 && !allowedValidationStages.has(validationStage)) {
  console.error(`ERROR: invalid --stage value: ${validationStage || "<empty>"}`);
  process.exit(2);
}

const errors = [];
const fail = message => errors.push(message);
const existsFile = file => {
  try { return fs.statSync(file).isFile(); } catch { return false; }
};
const existsDir = file => {
  try { return fs.statSync(file).isDirectory(); } catch { return false; }
};
const readText = (file, label = path.basename(file)) => {
  try { return fs.readFileSync(file, "utf8"); }
  catch (error) { fail(`${label}: cannot read (${error.message})`); return ""; }
};
const readJson = (file, label = path.basename(file)) => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail(`${label}: invalid JSON (${error.message})`); return null; }
};
const nonEmptyStrings = value => Array.isArray(value) && value.length > 0 && value.every(item => typeof item === "string" && item.trim());
const isInside = (parent, child) => child === parent || child.startsWith(`${parent}${path.sep}`);

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed.slice(1, -1).split("|").map(cell => cell.trim());
}

function isMarkdownSeparatorRow(cells) {
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")));
}

function extractIssueResolutionRows(text) {
  const section = text.split("## Issue Resolution Alignment")[1]?.split(/\n##\s+/)[0] || "";
  const tableLines = section.split(/\r?\n/).filter(line => line.trim().startsWith("|"));
  const headerIndex = tableLines.findIndex(line => /\|\s*issue_id\s*\|\s*requirement_id\s*\|\s*target_id\s*\|\s*问题\s*\|\s*调整\s*\|\s*解决结果\s*\|\s*验收步骤\s*\|\s*result\s*\|/.test(line));
  if (headerIndex < 0) return [];
  const header = splitMarkdownRow(tableLines[headerIndex]);
  const rows = [];
  for (const line of tableLines.slice(headerIndex + 1)) {
    const cells = splitMarkdownRow(line);
    if (!cells || isMarkdownSeparatorRow(cells)) continue;
    const row = {};
    for (let index = 0; index < header.length; index += 1) row[header[index]] = cells[index] || "";
    rows.push(row);
  }
  return rows;
}

function normalizedAcceptanceStepText(text) {
  return String(text || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberedStepCount(text) {
  const normalized = normalizedAcceptanceStepText(text);
  return (normalized.match(/(?:^|[\s;；。])\d+[.、]/g) || []).length;
}

function hasDeprecatedAcceptanceSubfields(text) {
  return /(?:^|[\s;；。])(链接|测试用例|Mock\s*输入)\s*[：:]/i.test(normalizedAcceptanceStepText(text));
}

function hasManualVerificationUrl(text) {
  return /https?:\/\/[^\s<)）]+/i.test(normalizedAcceptanceStepText(text));
}

function hasAcceptancePrecondition(text) {
  return /(前置条件|本地|登录态|可访问|服务|启动|URL\s*带|mock\s*(ready|readiness)?)/i.test(normalizedAcceptanceStepText(text));
}

function hasAcceptanceInputData(text) {
  return /(输入|填写|填入|粘贴|加载|准备|返回|mock|rule|payload|sheet|作品\s*ID|item_id|author_id|records|数据|无需)/i.test(normalizedAcceptanceStepText(text));
}

function hasAcceptanceInteraction(text) {
  return /(打开|点击|选择|勾选|输入|填写|提交|等待|切换|过滤|查看|连续点击|触发|open|click|select|type|submit|wait)/i.test(normalizedAcceptanceStepText(text));
}

function hasAcceptanceExpectation(text) {
  return /(预期|确认|验收点|展示|可点击|打开新\s*tab|request|payload|Network|只包含|不包含|不出现|不生成|不会|没有|保留|成功|失败|断言)/i.test(normalizedAcceptanceStepText(text));
}

let runDir;
try { runDir = fs.realpathSync(args[0]); }
catch (error) {
  console.error(`ERROR: repair run directory is missing or cannot be resolved (${error.message})`);
  process.exit(1);
}

const repairRoot = path.dirname(runDir);
const globalRepairRoot = path.dirname(repairRoot);
const artifactsRoot = path.dirname(globalRepairRoot);
const projectRoot = path.dirname(artifactsRoot);
const runId = path.basename(runDir);
const workspaceName = path.basename(repairRoot);
const workspace = path.join(artifactsRoot, workspaceName);

if (path.basename(globalRepairRoot) !== "repair" || path.basename(artifactsRoot) !== "artifacts" || workspaceName === "_snapshots") {
  fail(`run_dir: expected artifacts/repair/<workspace-name>/<run-id>, got ${runDir}`);
}
if (path.dirname(workspace) !== artifactsRoot || !existsDir(workspace)) fail("run_dir: active workspace must be an existing direct child of artifacts/");

const requiredFiles = [
  "snapshot-ref.json",
  "issue-source.md",
  "source-manifest.json",
  "issue-analysis.md",
  "repair-plan.md",
  "rerun-plan.json",
  "repair-log.md",
  "repair-closure.json",
];
for (const relative of requiredFiles) {
  if (!existsFile(path.join(runDir, relative))) fail(`run_dir: missing required repair artifact ${relative}`);
}

const snapshotRefFile = path.join(runDir, "snapshot-ref.json");
const sourceManifestFile = path.join(runDir, "source-manifest.json");
const rerunPlanFile = path.join(runDir, "rerun-plan.json");
const repairClosureFile = path.join(runDir, "repair-closure.json");
const snapshotRef = readJson(snapshotRefFile);
const sourceManifest = readJson(sourceManifestFile);
const rerunPlan = readJson(rerunPlanFile);
const repairClosure = readJson(repairClosureFile);
const repairPlanText = readText(path.join(runDir, "repair-plan.md"));
const repairLogText = readText(path.join(runDir, "repair-log.md"));
const issueAnalysisText = readText(path.join(runDir, "issue-analysis.md"));

function resolveProjectPath(relative, label) {
  if (typeof relative !== "string" || !relative.trim()) {
    fail(`${label}: path is required`);
    return null;
  }
  const resolved = path.resolve(projectRoot, relative);
  if (!isInside(projectRoot, resolved)) {
    fail(`${label}: path escapes project root (${relative})`);
    return null;
  }
  return resolved;
}

let snapshotManifest = null;
let snapshotRoot = null;
let snapshotManifestFile = null;
let inventoryPath = null;
if (snapshotRef) {
  if (snapshotRef.version !== 1 || snapshotRef.status !== "READY") fail("snapshot-ref.json: version=1 and status=READY are required");
  if (snapshotRef.run_id !== runId) fail("snapshot-ref.json: run_id must match repair run directory");
  snapshotRoot = resolveProjectPath(snapshotRef.snapshot_root, "snapshot-ref.json.snapshot_root");
  snapshotManifestFile = resolveProjectPath(snapshotRef.manifest, "snapshot-ref.json.manifest");
  const expectedSnapshotRoot = path.join(globalRepairRoot, "_snapshots", workspaceName, runId);
  if (snapshotRoot !== expectedSnapshotRoot) fail(`snapshot-ref.json: snapshot_root must be artifacts/repair/_snapshots/${workspaceName}/${runId}`);
  if (snapshotManifestFile !== path.join(expectedSnapshotRoot, "snapshot-manifest.json")) fail("snapshot-ref.json: manifest must be snapshot_root/snapshot-manifest.json");
  if (snapshotManifestFile && existsFile(snapshotManifestFile)) snapshotManifest = readJson(snapshotManifestFile, "snapshot-manifest.json");
  else fail("snapshot-ref.json: referenced snapshot manifest does not exist");
}

if (snapshotManifest && snapshotRoot) {
  if (snapshotManifest.version !== 1 || snapshotManifest.status !== "READY") fail("snapshot-manifest.json: version=1 and status=READY are required");
  if (snapshotManifest.run_id !== runId) fail("snapshot-manifest.json: run_id must match repair run");
  if (snapshotManifest.workspace !== path.relative(projectRoot, workspace).split(path.sep).join("/")) fail("snapshot-manifest.json: workspace must match active workspace");
  if (snapshotManifest.workspace_name !== workspaceName) fail("snapshot-manifest.json: workspace_name mismatch");
  for (const [field, kind] of [["full_workspace", "dir"], ["delivery_state", "file"], ["inventory", "file"]]) {
    const resolved = resolveProjectPath(snapshotManifest[field], `snapshot-manifest.json.${field}`);
    if (field === "inventory") inventoryPath = resolved;
    if (resolved && !(kind === "dir" ? existsDir(resolved) : existsFile(resolved))) fail(`snapshot-manifest.json: missing ${field}`);
    if (resolved && !isInside(snapshotRoot, resolved)) fail(`snapshot-manifest.json: ${field} must stay under snapshot_root`);
  }
  if (!snapshotManifest.execution_repo || typeof snapshotManifest.execution_repo !== "object") {
    fail("snapshot-manifest.json: execution_repo is required");
  } else {
    const repo = snapshotManifest.execution_repo;
    if (!path.isAbsolute(repo.root || "") || !existsDir(repo.root)) fail("snapshot-manifest.json: execution_repo.root must be an existing absolute directory");
    if (!repo.head || !/^[0-9a-f]{40}$/i.test(repo.head)) fail("snapshot-manifest.json: execution_repo.head must be a full Git SHA");
    for (const field of ["status", "staged_diff", "working_diff", "untracked_list", "untracked_root"]) {
      const resolved = resolveProjectPath(repo[field], `snapshot-manifest.json.execution_repo.${field}`);
      const expectedDirectory = field === "untracked_root";
      if (resolved && !(expectedDirectory ? existsDir(resolved) : existsFile(resolved))) fail(`snapshot-manifest.json: missing execution_repo.${field}`);
      if (resolved && !isInside(snapshotRoot, resolved)) fail(`snapshot-manifest.json: execution_repo.${field} must stay under snapshot_root`);
    }
  }
  try {
    const snapshotReal = fs.realpathSync(snapshotRoot);
    if (snapshotReal !== snapshotRoot) fail("snapshot-manifest.json: snapshot_root may not resolve through a symlink");
    if (fs.statSync(snapshotRefFile).mtimeMs < fs.statSync(snapshotManifestFile).mtimeMs) fail("snapshot-first: snapshot-ref.json cannot predate the completed snapshot manifest");
  } catch (error) {
    fail(`snapshot-first: unable to verify snapshot paths (${error.message})`);
  }
  if (inventoryPath && existsFile(inventoryPath)) {
    const rows = readText(inventoryPath, "inventory.sha256").trim().split("\n").filter(Boolean);
    if (rows.length === 0) fail("inventory.sha256: snapshot inventory may not be empty");
    for (const row of rows) {
      const match = row.match(/^([0-9a-f]{64})  (.+)$/i);
      if (!match) { fail(`inventory.sha256: malformed row ${row}`); continue; }
      const file = path.resolve(snapshotRoot, match[2]);
      if (!isInside(snapshotRoot, file) || !existsFile(file)) { fail(`inventory.sha256: missing or escaping file ${match[2]}`); continue; }
      try {
        if (fs.realpathSync(file) !== file) fail(`inventory.sha256: symbolic link is not allowed (${match[2]})`);
        const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
        if (actual !== match[1].toLowerCase()) fail(`inventory.sha256: digest mismatch for ${match[2]}`);
      } catch (error) {
        fail(`inventory.sha256: cannot validate ${match[2]} (${error.message})`);
      }
    }
  }
}

if (sourceManifest) {
  if (sourceManifest.version !== 1 || sourceManifest.run_id !== runId || sourceManifest.snapshot_run_id !== runId) fail("source-manifest.json: run_id and snapshot_run_id must match repair run");
  if (sourceManifest.complete !== true || sourceManifest.validation?.status !== "PASS") fail("source-manifest.json: complete=true and validation.status=PASS are required");
  if (!new Set(["docx", "sheet"]).has(sourceManifest.source_type)) fail("source-manifest.json: source_type must be docx or sheet");
  if (typeof sourceManifest.source_token !== "string" || !sourceManifest.source_token.trim()) fail("source-manifest.json: canonical source_token is required");
  if (!new Set(["mcp", "feishu-lark"]).has(sourceManifest.transport)) fail("source-manifest.json: transport must be mcp or feishu-lark");
  if (!/^sha256:[0-9a-f]{64}$/i.test(sourceManifest.content_digest || "")) fail("source-manifest.json: content_digest must be sha256:<64-hex>");
  const identity = sourceManifest.identity_resolution;
  const identityKey = `${sourceManifest.source_type}:${sourceManifest.source_token}`;
  if (identity?.checked !== true || identity.key !== identityKey) fail("source-manifest.json: canonical identity_resolution must match source_type + source_token");
  if (!new Set(["CREATED", "REUSED"]).has(identity?.snapshot_decision)) fail("source-manifest.json: snapshot_decision must be CREATED or REUSED");
  if (identity?.snapshot_decision === "CREATED" && identity.matched_run_id !== null) fail("source-manifest.json: CREATED requires matched_run_id=null");
  if (identity?.snapshot_decision === "REUSED" && identity.matched_run_id !== runId) fail("source-manifest.json: REUSED requires matched_run_id=current run_id");
  const refresh = sourceManifest.refresh;
  if (refresh?.checked !== true || refresh.current_extracted_at !== sourceManifest.extracted_at
    || !Array.isArray(refresh.comparison_basis) || refresh.comparison_basis.length === 0
    || !Array.isArray(refresh.change_summary) || refresh.change_summary.length === 0
    || typeof refresh.content_changed !== "boolean") fail("source-manifest.json: every invocation requires a complete refresh record");
  if (identity?.snapshot_decision === "REUSED" && !refresh.previous_extracted_at) fail("source-manifest.json: REUSED requires previous_extracted_at");
  const extractedAt = Date.parse(sourceManifest.extracted_at);
  const snapshotAt = Date.parse(snapshotManifest?.created_at || sourceManifest.snapshot_created_at);
  if (!Number.isFinite(extractedAt) || !Number.isFinite(snapshotAt) || extractedAt < snapshotAt) fail("snapshot-first: source extraction must occur after the completed snapshot");
  if (snapshotManifest && sourceManifest.snapshot_created_at !== snapshotManifest.created_at) fail("source-manifest.json: snapshot_created_at must match snapshot manifest");
  if (Array.isArray(sourceManifest.visual_evidence_inventory)
    && sourceManifest.visual_evidence_inventory.some(item => item?.analysis_status === "BLOCKED")) fail("source-manifest.json: BLOCKED visual evidence prevents Analysis Gate PASS");
}

for (const marker of ["Snapshot Gate: PASS", "Snapshot Decision:", "Source Identity:", "Planning Method: delivery-acceptance-repair", "## Issue Repair Matrix", "## Planned In-Place Changes", "## Stage Replay Plan"]) {
  if (!repairPlanText.includes(marker)) fail(`repair-plan.md: missing ${marker}`);
}
for (const forbidden of [/Repair Addendum/i, /Repair Override/i, /\bNO_CHANGE\b/]) {
  if (forbidden.test(repairPlanText) || forbidden.test(issueAnalysisText)) fail(`repair artifacts: forbidden parallel/no-change pattern ${forbidden}`);
}
for (const marker of ["## Artifact Change Ledger", "## Stage Handoff", "### Stage: analysis"]) {
  if (!repairLogText.includes(marker)) fail(`repair-log.md: missing ${marker}`);
}

const startRank = new Map([["init", 0], ["prd", 1], ["plan", 2], ["task", 3]]);
const rootStart = new Map([
  ["PRD_CONFLICT", "prd"], ["PRD_MISSING", "prd"],
  ["PLAN_GAP", "plan"], ["DESIGN_GAP", "plan"],
  ["TASK_GAP", "task"], ["TEST_CASE_GAP", "task"], ["MOCK_RULE_GAP", "task"],
  ["CODE_ISSUE", "task"], ["VERIFY_MISSING", "task"], ["ENV_OR_DATA", "task"],
]);
const stageContract = new Map([
  ["init", { command: ".trae/commands/delivery/init.md", skills: [".trae/skills/01-requirement-intake/SKILL.md", ".trae/skills/02-task-space-init/SKILL.md"], owner: "main-agent", agent: null }],
  ["prd", { command: ".trae/commands/delivery/prd.md", skills: [".trae/skills/03-prd-analysis/SKILL.md"], owner: "subagent-assisted", agent: "prd-analyzer" }],
  ["bam", { command: ".trae/commands/delivery/bam.md", skills: [".trae/skills/bam/SKILL.md"], owner: "main-agent", agent: null }],
  ["plan", { command: ".trae/commands/delivery/plan.md", skills: [".trae/skills/04-tech-planning/SKILL.md"], owner: "subagent-assisted", agent: "tech-planner" }],
  ["task", { command: ".trae/commands/delivery/task.md", skills: [".trae/skills/09-task-planning/SKILL.md", ".trae/skills/10-test-case-planning/SKILL.md"], owner: "subagent-assisted", agent: "task-planner" }],
  ["code", { command: ".trae/commands/delivery/code.md", skills: [".trae/skills/05-code-implementation/SKILL.md"], owner: "subagent-assisted", agent: "code-writer" }],
  ["verify", { command: ".trae/commands/delivery/verify.md", skills: [".trae/skills/06-debug-verification/SKILL.md"], owner: "main-agent", agent: null, helpers: ["runtime-runner"] }],
  ["design", { command: ".trae/commands/delivery/design.md", skills: [".trae/skills/07-design-alignment/SKILL.md"], owner: "subagent-assisted", agent: "design-checker" }],
]);

let expectedSequence = [];
if (rerunPlan) {
  if (rerunPlan.version !== 2 || rerunPlan.repair_run_id !== runId) fail("rerun-plan.json: version=2 and matching repair_run_id are required");
  if (!startRank.has(rerunPlan.selected_start)) fail("rerun-plan.json: selected_start must be init, prd, plan, or task");
  if (rerunPlan.forced_start === "code" && rerunPlan.normalized_forced_start !== "task") fail("rerun-plan.json: forced_start=code must normalize to task");
  if (rerunPlan.forced_start && rerunPlan.forced_start !== "code" && rerunPlan.normalized_forced_start !== rerunPlan.forced_start) fail("rerun-plan.json: normalized_forced_start must match non-code forced_start");
  if (JSON.stringify(rerunPlan.must_rerun) !== JSON.stringify(["task", "code", "verify", "design"])) fail("rerun-plan.json: must_rerun must equal task -> code -> verify -> design");
  if (!Array.isArray(rerunPlan.issues) || rerunPlan.issues.length === 0) fail("rerun-plan.json: at least one issue is required");

  const issueIds = new Set();
  const requirementIds = new Set();
  let inferredStart = "task";
  let bamRequired = false;
  for (const issue of rerunPlan.issues || []) {
    const label = issue?.issue_id || "<unknown>";
    if (!issue.issue_id || issueIds.has(issue.issue_id)) fail(`rerun-plan.json: duplicate or missing issue_id ${label}`);
    issueIds.add(issue.issue_id);
    if (!new Set(["CONFIRMED", "TARGETED_ANALYSIS"]).has(issue.analysis_status)) fail(`rerun-plan.json: ${label} must be CONFIRMED or TARGETED_ANALYSIS; UNRESOLVED blocks replay`);
    let expectedStart = rootStart.get(issue.root_stage);
    if (!expectedStart) fail(`rerun-plan.json: invalid root_stage for ${label}`);
    if (issue.bam_update_required === true) {
      bamRequired = true;
      if (!nonEmptyStrings(issue.bam_impact_refs)) fail(`rerun-plan.json: ${label} requires bam_impact_refs`);
      if (expectedStart === "task") expectedStart = "plan";
    } else if (issue.bam_update_required !== false) fail(`rerun-plan.json: ${label} bam_update_required must be boolean`);
    if (expectedStart && issue.rerun_from !== expectedStart) fail(`rerun-plan.json: ${issue.root_stage} requires rerun_from=${expectedStart} for ${label}`);
    if (expectedStart && startRank.get(expectedStart) < startRank.get(inferredStart)) inferredStart = expectedStart;
    if (issue.task_change !== true || issue.test_case_change !== true) fail(`rerun-plan.json: ${label} must set task_change=true and test_case_change=true`);
    if (!issue.current_deviation || !new Set(["MISSING", "EXTRA", "INCORRECT"]).has(issue.current_deviation.status)
      || !nonEmptyStrings(issue.current_deviation.artifact_refs) || !issue.current_deviation.summary) fail(`rerun-plan.json: ${label} requires an observed current_deviation`);
    if (!nonEmptyStrings(issue.affected_artifacts)
      || !issue.affected_artifacts.includes("delivery-task.md")
      || !issue.affected_artifacts.includes("09-test-case-matrix.md")) fail(`rerun-plan.json: ${label} affected_artifacts must include delivery-task.md and 09-test-case-matrix.md`);
    if (!Array.isArray(issue.planned_changes) || issue.planned_changes.length < 2) fail(`rerun-plan.json: ${label} requires planned changes`);
    const targetTypes = new Set();
    for (const change of issue.planned_changes || []) {
      if (!new Set(["ADD", "UPDATE", "DELETE"]).has(change.operation)) fail(`rerun-plan.json: ${label} has invalid/no-change operation`);
      if (!change.original_location || !change.before || !change.after || !change.verification) fail(`rerun-plan.json: ${label} planned change must include original_location, before, after, verification`);
      targetTypes.add(change.target_type);
    }
    if (!targetTypes.has("TASK") || !targetTypes.has("TEST_CASE")) fail(`rerun-plan.json: ${label} must plan TASK and TEST_CASE changes`);
    const testContract = issue.alignment?.test_contract;
    if (!Array.isArray(testContract?.positive_assertions) || testContract.positive_assertions.length === 0
      || !Array.isArray(testContract?.negative_assertions) || testContract.negative_assertions.length === 0
      || !testContract.aggregate_assertion) fail(`rerun-plan.json: ${label} requires positive, negative, and aggregate assertions`);
    if (!Array.isArray(issue.required_items) || issue.required_items.length === 0) fail(`rerun-plan.json: ${label} requires required_items`);
    for (const required of issue.required_items || []) {
      if (!required.requirement_id || requirementIds.has(`${label}:${required.requirement_id}`)) fail(`rerun-plan.json: duplicate/missing requirement_id for ${label}`);
      requirementIds.add(`${label}:${required.requirement_id}`);
      const targetIds = new Set();
      if (!Array.isArray(required.acceptance_targets) || required.acceptance_targets.length === 0) fail(`rerun-plan.json: ${label}/${required.requirement_id} requires acceptance_targets`);
      for (const target of required.acceptance_targets || []) {
        if (!target.target_id || targetIds.has(target.target_id)) fail(`rerun-plan.json: duplicate/missing target_id for ${label}/${required.requirement_id}`);
        targetIds.add(target.target_id);
      }
    }
  }
  if (rerunPlan.inferred_start !== inferredStart) fail(`rerun-plan.json: inferred_start must be ${inferredStart}`);
  const normalizedForced = rerunPlan.normalized_forced_start;
  const selectedExpected = normalizedForced && startRank.get(normalizedForced) < startRank.get(inferredStart) ? normalizedForced : inferredStart;
  if (rerunPlan.selected_start !== selectedExpected) fail(`rerun-plan.json: selected_start must be ${selectedExpected}`);

  const sequenceByStart = {
    init: ["init", "prd", "plan", "task", "code", "verify", "design"],
    prd: ["prd", "plan", "task", "code", "verify", "design"],
    plan: ["plan", "task", "code", "verify", "design"],
    task: ["task", "code", "verify", "design"],
  };
  expectedSequence = [...(sequenceByStart[rerunPlan.selected_start] || [])];
  if (bamRequired) expectedSequence.splice(expectedSequence.indexOf("plan"), 0, "bam");
  const actualSequence = (rerunPlan.stages || []).filter(item => item.required === true).map(item => item.stage);
  if (JSON.stringify(actualSequence) !== JSON.stringify(expectedSequence)) fail(`rerun-plan.json: required stages must be ${expectedSequence.join(" -> ")}`);

  for (const item of rerunPlan.stages || []) {
    const contract = stageContract.get(item.stage);
    if (!contract) { fail(`rerun-plan.json: unsupported stage ${item.stage}`); continue; }
    if (item.required !== true) fail(`rerun-plan.json: stage ${item.stage} must be required`);
    if (item.command_ref !== contract.command) fail(`rerun-plan.json: stage ${item.stage} command_ref must be ${contract.command}`);
    if (JSON.stringify(item.skill_refs) !== JSON.stringify(contract.skills)) fail(`rerun-plan.json: stage ${item.stage} skill_refs mismatch`);
    if (item.owner !== contract.owner || item.required_agent !== contract.agent) fail(`rerun-plan.json: stage ${item.stage} requires owner=${contract.owner} and required_agent=${contract.agent}`);
    if (item.stage === "verify" && !Array.isArray(item.helper_agents)) fail("rerun-plan.json: verify must declare helper_agents");
    if ((item.helper_agents || []).some(agent => agent !== "runtime-runner")) fail(`rerun-plan.json: stage ${item.stage} has unsupported helper agent`);
    for (const ref of [item.command_ref, ...(item.skill_refs || [])]) {
      const resolved = resolveProjectPath(ref, `rerun-plan.json stage ${item.stage}`);
      if (resolved && !existsFile(resolved)) fail(`rerun-plan.json: current stage contract does not exist: ${ref}`);
    }
  }
}

if (repairClosure && rerunPlan) {
  if (repairClosure.version !== 2 || repairClosure.repair_run_id !== runId) fail("repair-closure.json: version=2 and matching repair_run_id are required");
  const expectedWorkspace = path.relative(projectRoot, workspace).split(path.sep).join("/");
  if (repairClosure.active_workspace !== expectedWorkspace) fail("repair-closure.json: active_workspace mismatch");
  const closureByIssue = new Map((repairClosure.issues || []).map(issue => [issue.issue_id, issue]));
  for (const issue of rerunPlan.issues || []) {
    const closureIssue = closureByIssue.get(issue.issue_id);
    if (!closureIssue) { fail(`repair-closure.json: missing issue ${issue.issue_id}`); continue; }
    const expectedTargets = new Set((issue.required_items || []).flatMap(item => (item.acceptance_targets || []).map(target => `${item.requirement_id}:${target.target_id}`)));
    const actualTargets = new Set();
    for (const target of closureIssue.target_closures || []) {
      const key = `${target.requirement_id}:${target.target_id}`;
      if (actualTargets.has(key)) fail(`repair-closure.json: duplicate target closure ${issue.issue_id}/${key}`);
      actualTargets.add(key);
      if (!new Set(["NOT_SATISFIED", "SATISFIED"]).has(target.status)) fail(`repair-closure.json: invalid target status ${issue.issue_id}/${key}`);
    }
    for (const key of expectedTargets) if (!actualTargets.has(key)) fail(`repair-closure.json: missing target closure ${issue.issue_id}/${key}`);
    for (const key of actualTargets) if (!expectedTargets.has(key)) fail(`repair-closure.json: unknown target closure ${issue.issue_id}/${key}`);
  }
}

const stageRank = new Map([["analysis", 0], ["init", 1], ["prd", 2], ["bam", 3], ["plan", 4], ["task", 5], ["code", 6], ["verify", 7], ["design", 8], ["repair-result", 9]]);
const requiresStageLog = validationStage && validationStage !== "analysis";
if (requiresStageLog && validationStage !== "repair-result") {
  if (!expectedSequence.includes(validationStage)) fail(`stage ${validationStage}: not required by rerun-plan.json`);
}
if (requiresStageLog) {
  const stageSection = `### Stage: ${validationStage}`;
  if (!repairLogText.includes(stageSection)) fail(`repair-log.md: missing ${stageSection}`);
  const section = repairLogText.split(stageSection)[1]?.split(/^### Stage:/m)[0] || "";
  for (const marker of ["- status: PASS", "- command_ref:", "- skill_refs:", "- main_agent_gate_decision: PASS"]) {
    if (!section.includes(marker)) fail(`repair-log.md: ${stageSection} missing ${marker}`);
  }
}

function findCheckbox(document, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.match(new RegExp(`^- \\[([ xX])\\] ${escaped}$`, "m"));
  return match ? match[1].toLowerCase() === "x" : null;
}

if (validationStage && stageRank.get(validationStage) >= stageRank.get("task") && repairClosure) {
  const taskFile = path.join(workspace, "delivery-task.md");
  const caseFile = path.join(workspace, "09-test-case-matrix.md");
  const taskText = readText(taskFile, "delivery-task.md");
  const caseText = readText(caseFile, "09-test-case-matrix.md");
  for (const issue of repairClosure.issues || []) {
    for (const target of issue.target_closures || []) {
      const key = `${issue.issue_id}/${target.requirement_id}:${target.target_id}`;
      if (!Array.isArray(target.task_refs) || target.task_refs.length === 0) fail(`repair-closure.json: ${key} requires task_refs after task stage`);
      if (!Array.isArray(target.case_refs) || target.case_refs.length === 0) fail(`repair-closure.json: ${key} requires case_refs after task stage`);
      for (const taskRef of target.task_refs || []) {
        if (taskRef.path !== "delivery-task.md" || !new Set(["ADD", "UPDATE"]).has(taskRef.change)) fail(`repair-closure.json: ${key} task ref must be ADD/UPDATE in delivery-task.md`);
        const checked = findCheckbox(taskText, taskRef.label || "");
        if (checked === null) fail(`delivery-task.md: missing exact repair checkbox for ${key}: ${taskRef.label || "<empty>"}`);
        if (validationStage === "task" && (checked || taskRef.status !== "PENDING")) fail(`delivery-task.md: ${key} must be unchecked/PENDING at Task Gate`);
        if (stageRank.get(validationStage) >= stageRank.get("code") && (!checked || taskRef.status !== "DONE")) fail(`delivery-task.md: ${key} must be checked/DONE after Code Gate`);
      }
      for (const caseRef of target.case_refs || []) {
        if (caseRef.path !== "09-test-case-matrix.md" || !new Set(["ADD", "UPDATE"]).has(caseRef.change)) fail(`repair-closure.json: ${key} case ref must be ADD/UPDATE in 09-test-case-matrix.md`);
        if (!caseRef.case_id || !caseText.includes(caseRef.case_id)) fail(`09-test-case-matrix.md: missing case ${caseRef.case_id || "<empty>"} for ${key}`);
        if (!new Set(["verify", "design", "verify+design"]).has(caseRef.verification_stage)) fail(`repair-closure.json: ${key} has invalid verification_stage`);
        if (validationStage === "task" && caseRef.status !== "PENDING") fail(`repair-closure.json: ${key}/${caseRef.case_id} must be PENDING at Task Gate`);
        if (validationStage === "verify" && caseRef.verification_stage.includes("verify") && !new Set(["PASS", "PASS_WITH_NOTES"]).has(caseRef.status)) fail(`repair-closure.json: verify case ${caseRef.case_id} must be terminal PASS/PASS_WITH_NOTES`);
        if (validationStage === "design" && caseRef.verification_stage.includes("design") && !new Set(["PASS", "PASS_WITH_NOTES"]).has(caseRef.status)) fail(`repair-closure.json: design case ${caseRef.case_id} must be terminal PASS/PASS_WITH_NOTES`);
        if (validationStage === "repair-result" && !new Set(["PASS", "PASS_WITH_NOTES"]).has(caseRef.status)) fail(`repair-closure.json: repair-result requires terminal case ${caseRef.case_id}`);
      }
    }
  }
}

if (validationStage === "repair-result" && repairClosure) {
  if (!new Set(["PASS", "PASS_WITH_NOTES"]).has(repairClosure.overall_status)) fail("repair-closure.json: repair-result requires overall_status PASS or PASS_WITH_NOTES");
  const repairResultFile = path.join(runDir, "repair-result.md");
  if (!existsFile(repairResultFile)) fail("repair-result.md: required after Design Gate PASS");
  const repairResultText = existsFile(repairResultFile) ? readText(repairResultFile, "repair-result.md") : "";
  for (const marker of ["# Repair Result", "## Issue Resolution Alignment", "## Feishu Writeback", "## Completion Commit"]) {
    if (!repairResultText.includes(marker)) fail(`repair-result.md: missing ${marker}`);
  }
  const requiredResultHeader = /\|\s*issue_id\s*\|\s*requirement_id\s*\|\s*target_id\s*\|\s*问题\s*\|\s*调整\s*\|\s*解决结果\s*\|\s*验收步骤\s*\|\s*result\s*\|/;
  if (!requiredResultHeader.test(repairResultText)) fail("repair-result.md: Issue Resolution Alignment must use columns issue_id | requirement_id | target_id | 问题 | 调整 | 解决结果 | 验收步骤 | result");
  const resultRows = extractIssueResolutionRows(repairResultText);
  const resultRowsByTarget = new Map();
  for (const row of resultRows) {
    const key = `${row.issue_id}/${row.requirement_id}:${row.target_id}`;
    resultRowsByTarget.set(key, row);
  }
  if (!/Feishu Writeback:\s*PASS/.test(repairResultText)) fail("repair-result.md: Feishu Writeback must be PASS");
  const feishuSection = repairResultText.split("## Feishu Writeback")[1]?.split(/\n##\s+/)[0] || "";
  if (!/Evidence Type:\s*(SCREENSHOT|ACCEPTANCE_STEPS)/.test(feishuSection)) fail("repair-result.md: Feishu Writeback requires Evidence Type SCREENSHOT or ACCEPTANCE_STEPS");
  if (!/(截图|验收步骤|Screenshot|Acceptance Steps)/i.test(feishuSection)) fail("repair-result.md: Feishu writeback evidence must be screenshot evidence or acceptance steps");
  if (/(?:^|[\s`])(?:artifacts\/|verify-logs\/|apps\/|src\/|file:\/\/|\/Users\/)|\.(?:md|log)\b/.test(feishuSection)) {
    fail("repair-result.md: Feishu writeback evidence must not be only local artifact/log/source file references");
  }
  for (const issue of repairClosure.issues || []) {
    for (const target of issue.target_closures || []) {
      const key = `${issue.issue_id}/${target.requirement_id}:${target.target_id}`;
      if (target.status !== "SATISFIED") fail(`repair-closure.json: repair-result requires SATISFIED target ${key}`);
      for (const token of [issue.issue_id, target.requirement_id, target.target_id]) {
        if (!repairResultText.includes(token)) fail(`repair-result.md: missing alignment token ${token}`);
      }
      const resultRow = resultRowsByTarget.get(key);
      if (!resultRow) {
        fail(`repair-result.md: missing Issue Resolution Alignment row for ${key}`);
        continue;
      }
      const acceptanceSteps = normalizedAcceptanceStepText(resultRow["验收步骤"]);
      if (hasDeprecatedAcceptanceSubfields(acceptanceSteps)) {
        fail(`repair-result.md: 验收步骤 for ${key} must be one executable manual acceptance process`);
      }
      if (!hasManualVerificationUrl(acceptanceSteps)) {
        fail(`repair-result.md: 验收步骤 for ${key} must include the business page URL or link to open`);
      }
      if (!hasAcceptancePrecondition(acceptanceSteps)) {
        fail(`repair-result.md: 验收步骤 for ${key} must include preconditions such as runtime, login, or mock readiness`);
      }
      if (!hasAcceptanceInputData(acceptanceSteps)) {
        fail(`repair-result.md: 验收步骤 for ${key} must include exact input data or mock-returned data needed by the steps`);
      }
      if (!hasAcceptanceInteraction(acceptanceSteps)) {
        fail(`repair-result.md: 验收步骤 for ${key} must include concrete UI interactions`);
      }
      if (!hasAcceptanceExpectation(acceptanceSteps)) {
        fail(`repair-result.md: 验收步骤 for ${key} must include expected results and acceptance points`);
      }
      if (numberedStepCount(acceptanceSteps) < 2) {
        fail(`repair-result.md: 验收步骤 for ${key} must include numbered manual verification steps`);
      }
    }
  }
  if (!Array.isArray(repairClosure.inputs) || repairClosure.inputs.length === 0) fail("repair-closure.json: repair-result requires freshness inputs");
  const result = repairClosure.repair_result || {};
  if (result.path !== "repair-result.md") fail("repair-closure.json: repair_result.path must be repair-result.md");
  if (result.feishu_writeback_status !== "WRITTEN") fail("repair-closure.json: repair_result.feishu_writeback_status must be WRITTEN");
  if (typeof result.feishu_writeback_ref !== "string" || !result.feishu_writeback_ref.trim()) fail("repair-closure.json: repair_result.feishu_writeback_ref is required");
  const markdownCommit = repairResultText.match(/Completion Commit:\s*`?([0-9a-f]{40})`?/i)?.[1] || null;
  if (!markdownCommit) fail("repair-result.md: Completion Commit must be a full 40-char SHA");
  if (!/^[0-9a-f]{40}$/i.test(result.completion_commit || "")) fail("repair-closure.json: repair_result.completion_commit must be a full 40-char SHA");
  if (markdownCommit && result.completion_commit && markdownCommit.toLowerCase() !== result.completion_commit.toLowerCase()) fail("repair-result.md: Completion Commit must match repair-closure.json");
  if (!path.isAbsolute(repairClosure.active_execution_repo || "") || !existsDir(repairClosure.active_execution_repo)) {
    fail("repair-closure.json: active_execution_repo must be an existing absolute path for completion commit verification");
  } else if (result.completion_commit) {
    const gitHead = spawnSync("git", ["-C", repairClosure.active_execution_repo, "rev-parse", "HEAD"], { encoding: "utf8" });
    if (gitHead.status !== 0) fail(`completion commit: cannot read execution repo HEAD (${gitHead.stderr.trim() || "git failed"})`);
    const head = gitHead.stdout.trim();
    if (head && head.toLowerCase() !== result.completion_commit.toLowerCase()) fail("completion commit: repair_result.completion_commit must equal active_execution_repo HEAD");
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

console.log("REPAIR_ARTIFACTS_VALID");
console.log(`run_id=${runId}`);
console.log(`workspace=${path.relative(projectRoot, workspace).split(path.sep).join("/")}`);
console.log(`snapshot=${snapshotRef?.snapshot_root || "<missing>"}`);
console.log(`selected_start=${rerunPlan?.selected_start || "<missing>"}`);
console.log(`stage=${validationStage || "structure"}`);
