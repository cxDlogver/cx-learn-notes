#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(here, "..");
const validator = path.join(skillRoot, "scripts/validate-repair-artifacts.mjs");
const snapshotScript = path.join(skillRoot, "scripts/create-repair-snapshot.sh");
const resolverScript = path.join(skillRoot, "scripts/resolve-repair-run.mjs");
const rollbackScript = path.join(skillRoot, "scripts/rollback-repair-snapshot.sh");

function run(file, args, options = {}) {
  return execFileSync(file, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
}

function runRaw(file, args, options = {}) {
  return execFileSync(file, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
}

function expectFailure(file, args, pattern) {
  const result = spawnSync(file, args, { encoding: "utf8" });
  assert.notEqual(result.status, 0, `expected failure: ${file} ${args.join(" ")}`);
  assert.match(`${result.stdout}\n${result.stderr}`, pattern);
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function stage(stageName) {
  const contracts = {
    prd: {
      command_ref: ".trae/commands/delivery/prd.md",
      skill_refs: [".trae/skills/03-prd-analysis/SKILL.md"],
      owner: "subagent-assisted",
      required_agent: "prd-analyzer",
      helper_agents: [],
    },
    bam: {
      command_ref: ".trae/commands/delivery/bam.md",
      skill_refs: [".trae/skills/bam/SKILL.md"],
      owner: "main-agent",
      required_agent: null,
      helper_agents: [],
    },
    plan: {
      command_ref: ".trae/commands/delivery/plan.md",
      skill_refs: [".trae/skills/04-tech-planning/SKILL.md"],
      owner: "subagent-assisted",
      required_agent: "tech-planner",
      helper_agents: [],
    },
    task: {
      command_ref: ".trae/commands/delivery/task.md",
      skill_refs: [".trae/skills/09-task-planning/SKILL.md", ".trae/skills/10-test-case-planning/SKILL.md"],
      owner: "subagent-assisted",
      required_agent: "task-planner",
      helper_agents: [],
    },
    code: {
      command_ref: ".trae/commands/delivery/code.md",
      skill_refs: [".trae/skills/05-code-implementation/SKILL.md"],
      owner: "subagent-assisted",
      required_agent: "code-writer",
      helper_agents: ["runtime-runner"],
    },
    verify: {
      command_ref: ".trae/commands/delivery/verify.md",
      skill_refs: [".trae/skills/06-debug-verification/SKILL.md"],
      owner: "main-agent",
      required_agent: null,
      helper_agents: ["runtime-runner"],
    },
    design: {
      command_ref: ".trae/commands/delivery/design.md",
      skill_refs: [".trae/skills/07-design-alignment/SKILL.md"],
      owner: "subagent-assisted",
      required_agent: "design-checker",
      helper_agents: [],
    },
  };
  return { stage: stageName, required: true, ...contracts[stageName] };
}

async function addStageLog(logFile, stageName) {
  const current = await readFile(logFile, "utf8");
  await writeFile(logFile, `${current}\n### Stage: ${stageName}\n- owner: main-agent\n- status: PASS\n- command_ref: current stage command\n- skill_refs: current stage skill\n- executor_agent: current contract\n- main_agent_gate_decision: PASS\n- reviewed_evidence_refs: repair-closure.json\n`);
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "repair-contract-"));
try {
  const workspace = path.join(tempRoot, "artifacts/example-task");
  const executionRepo = path.join(tempRoot, "execution-repo");
  const stateFile = path.join(tempRoot, ".trae/DELIVERY_STATE.md");
  const runId = "20260710-120000-generic-feedback";
  const runDir = path.join(tempRoot, "artifacts/repair/example-task", runId);

  await mkdir(workspace, { recursive: true });
  await mkdir(executionRepo, { recursive: true });
  await mkdir(path.dirname(stateFile), { recursive: true });
  await writeFile(path.join(workspace, "baseline.md"), "baseline workspace\n");
  await mkdir(path.join(workspace, "repair/legacy-run"), { recursive: true });
  await writeFile(path.join(workspace, "repair/legacy-run/legacy.txt"), "legacy repair artifact\n");
  await writeFile(stateFile, `# Delivery State\n\n- workspace：\`artifacts/example-task\`\n- execution_repo_root: \`${executionRepo}\`\n`);

  run("git", ["init", executionRepo]);
  run("git", ["-C", executionRepo, "config", "user.email", "repair@example.com"]);
  run("git", ["-C", executionRepo, "config", "user.name", "Repair Test"]);
  await writeFile(path.join(executionRepo, "tracked.txt"), "base\n");
  run("git", ["-C", executionRepo, "add", "tracked.txt"]);
  run("git", ["-C", executionRepo, "commit", "-m", "base"]);
  await writeFile(path.join(executionRepo, "tracked.txt"), "staged\n");
  run("git", ["-C", executionRepo, "add", "tracked.txt"]);
  await writeFile(path.join(executionRepo, "tracked.txt"), "working\n");
  await writeFile(path.join(executionRepo, "untracked.txt"), "untracked baseline\n");

  const contractFiles = [
    ".trae/commands/delivery/prd.md",
    ".trae/commands/delivery/bam.md",
    ".trae/commands/delivery/plan.md",
    ".trae/commands/delivery/task.md",
    ".trae/commands/delivery/code.md",
    ".trae/commands/delivery/verify.md",
    ".trae/commands/delivery/design.md",
    ".trae/skills/03-prd-analysis/SKILL.md",
    ".trae/skills/bam/SKILL.md",
    ".trae/skills/04-tech-planning/SKILL.md",
    ".trae/skills/09-task-planning/SKILL.md",
    ".trae/skills/10-test-case-planning/SKILL.md",
    ".trae/skills/05-code-implementation/SKILL.md",
    ".trae/skills/06-debug-verification/SKILL.md",
    ".trae/skills/07-design-alignment/SKILL.md",
  ];
  for (const relative of contractFiles) {
    const file = path.join(tempRoot, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `current contract: ${relative}\n`);
  }

  const workspaceBefore = await readFile(path.join(workspace, "baseline.md"), "utf8");
  const snapshotOutput = run("bash", [snapshotScript, "--project-root", tempRoot, "--workspace", "artifacts/example-task", "--execution-repo", executionRepo, "--run-id", runId]);
  assert.match(snapshotOutput, /REPAIR_SNAPSHOT_OK/);
  assert.equal(await readFile(path.join(workspace, "baseline.md"), "utf8"), workspaceBefore, "snapshot must not mutate active workspace");

  const snapshotRoot = path.join(tempRoot, "artifacts/repair/_snapshots/example-task", runId);
  const snapshotManifest = JSON.parse(await readFile(path.join(snapshotRoot, "snapshot-manifest.json"), "utf8"));
  assert.equal(snapshotManifest.status, "READY");
  assert.equal(await readFile(path.join(snapshotRoot, "full-workspace/baseline.md"), "utf8"), workspaceBefore);
  await assert.rejects(readFile(path.join(snapshotRoot, "full-workspace/repair/legacy-run/legacy.txt"), "utf8"), /ENOENT/, "workspace repair dir must not enter full-workspace snapshot");
  assert.ok((await readFile(path.join(snapshotRoot, "inventory.sha256"), "utf8")).includes("full-workspace/baseline.md"));

  expectFailure("bash", [snapshotScript, "--project-root", tempRoot, "--workspace", "artifacts/example-task", "--execution-repo", executionRepo, "--run-id", runId], /already exists/);
  assert.equal(await readFile(path.join(workspace, "baseline.md"), "utf8"), workspaceBefore, "failed snapshot must not mutate active workspace");

  await mkdir(runDir, { recursive: true });
  await writeJson(path.join(runDir, "snapshot-ref.json"), {
    version: 1,
    status: "READY",
    run_id: runId,
    snapshot_root: `artifacts/repair/_snapshots/example-task/${runId}`,
    manifest: `artifacts/repair/_snapshots/example-task/${runId}/snapshot-manifest.json`,
  });
  const extractedAt = new Date(Date.parse(snapshotManifest.created_at) + 1000).toISOString();
  const sourceManifest = {
    version: 1,
    run_id: runId,
    snapshot_run_id: runId,
    snapshot_created_at: snapshotManifest.created_at,
    source_url: "https://example.com/docx/generic",
    source_type: "docx",
    source_token: "generic-token",
    identity_resolution: { checked: true, key: "docx:generic-token", snapshot_decision: "CREATED", matched_run_id: null },
    title: "Generic acceptance feedback",
    extracted_at: extractedAt,
    content_digest: `sha256:${"a".repeat(64)}`,
    complete: true,
    transport: "mcp",
    refresh: { checked: true, previous_extracted_at: null, current_extracted_at: extractedAt, content_changed: false, comparison_basis: ["normalized_body", "media_token_manifest"], change_summary: ["full source refresh completed"] },
    sheets: [],
    raw_files: ["source/body.md"],
    media_files: [],
    visual_evidence_inventory: [],
    validation: { status: "PASS", details: [] },
  };
  await writeJson(path.join(runDir, "source-manifest.json"), sourceManifest);
  await writeFile(path.join(runDir, "issue-source.md"), "# Issue Source\n\nGeneric acceptance problem.\n");
  await writeFile(path.join(runDir, "issue-analysis.md"), "# Issue Analysis\n\n## REPAIR-001\nConfirmed current task and test case deviation.\n");
  await writeFile(path.join(runDir, "repair-plan.md"), `# Repair Plan\n\n- Snapshot Gate: PASS\n- Snapshot Decision: CREATED\n- Source Identity: \`docx:generic-token\`\n- Planning Method: delivery-acceptance-repair\n\n## Issue Repair Matrix\n| issue | deviation |\n\n## Planned In-Place Changes\n| change | location |\n\n## Stage Replay Plan\n| stage | contract |\n`);
  const rerunPlan = {
    version: 2,
    repair_run_id: runId,
    inferred_start: "task",
    forced_start: "code",
    normalized_forced_start: "task",
    selected_start: "task",
    implementation_mode: "REAL_INTEGRATION",
    must_rerun: ["task", "code", "verify", "design"],
    issues: [{
      issue_id: "REPAIR-001",
      analysis_status: "CONFIRMED",
      root_stage: "CODE_ISSUE",
      rerun_from: "task",
      source_ref: "Generic feedback#1",
      evidence_refs: ["issue-source.md#problem"],
      facts: ["current behavior contradicts acceptance feedback"],
      unknowns: [],
      current_deviation: { status: "INCORRECT", artifact_refs: ["delivery-task.md#Task-1"], summary: "task and case do not cover corrected behavior" },
      affected_artifacts: ["delivery-task.md", "09-test-case-matrix.md", "src/example.ts"],
      required_items: [{ requirement_id: "REQ-001", statement: "correct target behavior", acceptance_targets: [{ target_id: "TARGET-A", description: "target A" }] }],
      planned_changes: [
        { change_id: "CHANGE-TASK", operation: "UPDATE", stage: "task", target_type: "TASK", target: "Repair target A", original_location: "delivery-task.md#Task-1", before: "old task", after: "updated unchecked task", requirement_id: "REQ-001", target_ids: ["TARGET-A"], evidence_refs: ["issue-analysis.md#REPAIR-001"], verification: "Task Coverage Audit PASS" },
        { change_id: "CHANGE-CASE", operation: "UPDATE", stage: "task", target_type: "TEST_CASE", target: "CASE-REPAIR-A", original_location: "09-test-case-matrix.md#CASE-OLD", before: "old assertion", after: "updated positive and negative assertions", requirement_id: "REQ-001", target_ids: ["TARGET-A"], evidence_refs: ["issue-analysis.md#REPAIR-001"], verification: "Coverage Result PASS" },
      ],
      alignment: { comparison_mode: "BEHAVIORAL", required_items: ["correct target"], forbidden_items: ["legacy target"], missing_items: [], extra_items: [], incorrect_items: ["legacy target"], actions: [{ type: "CORRECT", target: "TARGET-A", stage: "task" }], test_contract: { positive_assertions: [{ target: "TARGET-A", assertion: "correct result appears" }], negative_assertions: [{ target: "TARGET-A", assertion: "legacy result is absent" }], aggregate_assertion: "only corrected behavior remains" } },
      task_change: true,
      test_case_change: true,
      bam_update_required: false,
      bam_impact_refs: [],
      mock_rule_change: "NO",
    }],
    stages: [stage("task"), stage("code"), stage("verify"), stage("design")],
  };
  await writeJson(path.join(runDir, "rerun-plan.json"), rerunPlan);
  await writeFile(path.join(runDir, "repair-log.md"), `# Repair Log\n\n## Artifact Change Ledger\n| seq | stage | issue_ids | artifact | operation | original_location | before | after | evidence_refs | impact |\n\n## Stage Handoff\n\n### Stage: analysis\n- owner: main-agent\n- status: PASS\n- command_ref: validator --stage analysis\n- skill_refs: delivery-acceptance-repair\n- executor_agent: null\n- main_agent_gate_decision: PASS\n- reviewed_evidence_refs: snapshot-ref.json, issue-analysis.md, rerun-plan.json\n`);
  const closure = {
    version: 2,
    repair_run_id: runId,
    active_workspace: "artifacts/example-task",
    active_execution_repo: executionRepo,
    issues: [{ issue_id: "REPAIR-001", target_closures: [{ requirement_id: "REQ-001", target_id: "TARGET-A", task_refs: [], case_refs: [], code_refs: [], status: "NOT_SATISFIED" }] }],
    overall_status: "NOT_STARTED",
    notes: [],
    inputs: [],
    repair_result: {
      path: "repair-result.md",
      feishu_writeback_status: "PENDING",
      feishu_writeback_ref: "",
      completion_commit: null,
    },
  };
  await writeJson(path.join(runDir, "repair-closure.json"), closure);

  assert.match(run("node", [validator, runDir, "--stage", "analysis"]), /REPAIR_ARTIFACTS_VALID/);

  const snapshotParent = path.join(tempRoot, "artifacts/repair/_snapshots/example-task");
  const snapshotsBeforeResolve = await readdir(snapshotParent);
  const reuseOutput = run("node", [resolverScript, "--project-root", tempRoot, "--workspace", "artifacts/example-task", "--source-type", "docx", "--source-token", "generic-token"]);
  assert.match(reuseOutput, /decision=REUSE_REPAIR_RUN/);
  assert.match(reuseOutput, new RegExp(`run_id=${runId}`));
  assert.deepEqual(await readdir(snapshotParent), snapshotsBeforeResolve, "same source lookup must not create another snapshot");
  const newOutput = run("node", [resolverScript, "--project-root", tempRoot, "--workspace", "artifacts/example-task", "--source-type", "docx", "--source-token", "different-token"]);
  assert.match(newOutput, /decision=NEW_REPAIR_RUN/);
  assert.deepEqual(await readdir(snapshotParent), snapshotsBeforeResolve, "new source lookup must remain read-only");

  const invalidDuplicate = path.join(tempRoot, "artifacts/repair/example-task/duplicate-invalid");
  await mkdir(invalidDuplicate, { recursive: true });
  await writeJson(path.join(invalidDuplicate, "source-manifest.json"), { source_type: "docx", source_token: "generic-token" });
  expectFailure("node", [resolverScript, "--project-root", tempRoot, "--workspace", "artifacts/example-task", "--source-type", "docx", "--source-token", "generic-token"], /invalid snapshot state/);
  await rm(invalidDuplicate, { recursive: true, force: true });

  const previousExtractedAt = sourceManifest.extracted_at;
  const reusedExtractedAt = new Date(Date.parse(previousExtractedAt) + 1000).toISOString();
  sourceManifest.identity_resolution = { checked: true, key: "docx:generic-token", snapshot_decision: "REUSED", matched_run_id: runId };
  sourceManifest.extracted_at = reusedExtractedAt;
  sourceManifest.refresh = { checked: true, previous_extracted_at: previousExtractedAt, current_extracted_at: reusedExtractedAt, content_changed: false, comparison_basis: ["normalized_body", "media_token_manifest"], change_summary: ["same source fully refreshed"] };
  await writeJson(path.join(runDir, "source-manifest.json"), sourceManifest);
  await writeFile(path.join(runDir, "repair-plan.md"), `# Repair Plan\n\n- Snapshot Gate: PASS\n- Snapshot Decision: REUSED\n- Source Identity: \`docx:generic-token\`\n- Planning Method: delivery-acceptance-repair\n\n## Issue Repair Matrix\n| issue | deviation |\n\n## Planned In-Place Changes\n| change | location |\n\n## Stage Replay Plan\n| stage | contract |\n`);
  assert.match(run("node", [validator, runDir, "--stage", "analysis"]), /REPAIR_ARTIFACTS_VALID/);
  sourceManifest.refresh.previous_extracted_at = null;
  await writeJson(path.join(runDir, "source-manifest.json"), sourceManifest);
  expectFailure("node", [validator, runDir, "--stage", "analysis"], /REUSED requires previous_extracted_at/);
  sourceManifest.refresh.previous_extracted_at = previousExtractedAt;
  await writeJson(path.join(runDir, "source-manifest.json"), sourceManifest);

  const scenarioMatrix = [
    { name: "PRD conflict", root: "PRD_CONFLICT", inferred: "prd", selected: "prd", stages: ["prd", "plan", "task", "code", "verify", "design"] },
    { name: "Plan gap", root: "PLAN_GAP", inferred: "plan", selected: "plan", stages: ["plan", "task", "code", "verify", "design"] },
    { name: "Verify missing", root: "VERIFY_MISSING", inferred: "task", selected: "task", stages: ["task", "code", "verify", "design"] },
    { name: "Design gap", root: "DESIGN_GAP", inferred: "plan", selected: "plan", stages: ["plan", "task", "code", "verify", "design"] },
  ];
  for (const scenario of scenarioMatrix) {
    rerunPlan.issues[0].root_stage = scenario.root;
    rerunPlan.issues[0].rerun_from = scenario.inferred;
    rerunPlan.issues[0].bam_update_required = false;
    rerunPlan.issues[0].bam_impact_refs = [];
    rerunPlan.inferred_start = scenario.inferred;
    rerunPlan.selected_start = scenario.selected;
    rerunPlan.stages = scenario.stages.map(stage);
    await writeJson(path.join(runDir, "rerun-plan.json"), rerunPlan);
    assert.match(run("node", [validator, runDir, "--stage", "analysis"]), /REPAIR_ARTIFACTS_VALID/, scenario.name);
  }

  rerunPlan.issues[0].root_stage = "PLAN_GAP";
  rerunPlan.issues[0].rerun_from = "plan";
  rerunPlan.issues[0].bam_update_required = true;
  rerunPlan.issues[0].bam_impact_refs = ["issue-analysis.md#bam-impact"];
  rerunPlan.inferred_start = "plan";
  rerunPlan.selected_start = "plan";
  rerunPlan.stages = ["bam", "plan", "task", "code", "verify", "design"].map(stage);
  await writeJson(path.join(runDir, "rerun-plan.json"), rerunPlan);
  assert.match(run("node", [validator, runDir, "--stage", "analysis"]), /REPAIR_ARTIFACTS_VALID/, "BAM must replay before Plan");

  rerunPlan.issues[0].root_stage = "CODE_ISSUE";
  rerunPlan.issues[0].rerun_from = "task";
  rerunPlan.issues[0].bam_update_required = false;
  rerunPlan.issues[0].bam_impact_refs = [];
  rerunPlan.inferred_start = "task";
  rerunPlan.selected_start = "task";
  rerunPlan.stages = ["task", "code", "verify", "design"].map(stage);
  await writeJson(path.join(runDir, "rerun-plan.json"), rerunPlan);

  rerunPlan.issues[0].task_change = false;
  await writeJson(path.join(runDir, "rerun-plan.json"), rerunPlan);
  expectFailure("node", [validator, runDir, "--stage", "analysis"], /task_change=true and test_case_change=true/);
  rerunPlan.issues[0].task_change = true;

  rerunPlan.stages[1].required_agent = "code-implementer";
  await writeJson(path.join(runDir, "rerun-plan.json"), rerunPlan);
  expectFailure("node", [validator, runDir, "--stage", "analysis"], /required_agent=code-writer/);
  rerunPlan.stages[1].required_agent = "code-writer";
  await writeJson(path.join(runDir, "rerun-plan.json"), rerunPlan);

  sourceManifest.extracted_at = new Date(Date.parse(snapshotManifest.created_at) - 1000).toISOString();
  sourceManifest.refresh.current_extracted_at = sourceManifest.extracted_at;
  await writeJson(path.join(runDir, "source-manifest.json"), sourceManifest);
  expectFailure("node", [validator, runDir, "--stage", "analysis"], /source extraction must occur after/);
  sourceManifest.extracted_at = reusedExtractedAt;
  sourceManifest.refresh.current_extracted_at = reusedExtractedAt;
  await writeJson(path.join(runDir, "source-manifest.json"), sourceManifest);

  await writeFile(path.join(workspace, "delivery-task.md"), "# Delivery Task\n\n- [ ] Repair target A\n");
  await writeFile(path.join(workspace, "09-test-case-matrix.md"), "# Test Case Matrix\n\n| case_id | expected |\n|---|---|\n| CASE-REPAIR-A | corrected behavior |\n");
  closure.issues[0].target_closures[0].task_refs = [{ path: "delivery-task.md", label: "Repair target A", change: "UPDATE", status: "PENDING" }];
  closure.issues[0].target_closures[0].case_refs = [{ path: "09-test-case-matrix.md", case_id: "CASE-REPAIR-A", change: "UPDATE", verification_stage: "verify+design", status: "PENDING", evidence_refs: [] }];
  closure.overall_status = "IN_PROGRESS";
  await writeJson(path.join(runDir, "repair-closure.json"), closure);
  await addStageLog(path.join(runDir, "repair-log.md"), "task");
  assert.match(run("node", [validator, runDir, "--stage", "task"]), /stage=task/);

  await writeFile(path.join(workspace, "delivery-task.md"), "# Delivery Task\n\n- [x] Repair target A\n");
  closure.issues[0].target_closures[0].task_refs[0].status = "DONE";
  await writeJson(path.join(runDir, "repair-closure.json"), closure);
  await addStageLog(path.join(runDir, "repair-log.md"), "code");
  assert.match(run("node", [validator, runDir, "--stage", "code"]), /stage=code/);

  closure.issues[0].target_closures[0].case_refs[0].status = "PASS";
  closure.issues[0].target_closures[0].case_refs[0].evidence_refs = ["06-debug-verification.md#CASE-REPAIR-A"];
  await writeJson(path.join(runDir, "repair-closure.json"), closure);
  await addStageLog(path.join(runDir, "repair-log.md"), "verify");
  assert.match(run("node", [validator, runDir, "--stage", "verify"]), /stage=verify/);
  await addStageLog(path.join(runDir, "repair-log.md"), "design");
  assert.match(run("node", [validator, runDir, "--stage", "design"]), /stage=design/);

  closure.issues[0].target_closures[0].status = "SATISFIED";
  closure.overall_status = "PASS";
  closure.inputs = [{ path: "delivery-task.md", sha256: `sha256:${"b".repeat(64)}` }];
  run("git", ["-C", executionRepo, "add", "tracked.txt", "untracked.txt"]);
  run("git", ["-C", executionRepo, "commit", "-m", "repair completion"]);
  const completionCommit = run("git", ["-C", executionRepo, "rev-parse", "HEAD"]).trim();
  closure.repair_result = {
    path: "repair-result.md",
    feishu_writeback_status: "WRITTEN",
    feishu_writeback_ref: "https://example.com/docx/generic#repair-result",
    completion_commit: completionCommit,
  };
  await writeJson(path.join(runDir, "repair-closure.json"), closure);
  await writeFile(path.join(runDir, "repair-result.md"), `# Repair Result

## Issue Resolution Alignment
| issue_id | requirement_id | target_id | 问题 | 调整 | 解决结果 | 验收步骤 | result |
|---|---|---|---|---|---|---|---|
| REPAIR-001 | REQ-001 | TARGET-A | Source problem text from the issue doc | Updated the original task, case, and code path for target A. | Corrected target behavior is visible to the user. | 前置条件：本地服务可访问，登录态有效，目标场景 mock 已返回 R-MOCK-TARGET-A payload fixture。1. Open https://example.com/app/target-a. 2. 输入 item_id=100001 并提交。3. Click repaired action and wait for request records. 4. Confirm corrected result appears, legacy result is absent, and request records only include item_id=100001. | PASS |

## Feishu Writeback
- Feishu Writeback: PASS
- Source: https://example.com/docx/generic
- Evidence Type: ACCEPTANCE_STEPS
- Evidence: 验收步骤已写入来源飞书文档：前置条件为本地服务可访问、登录态有效、mock 已返回 R-MOCK-TARGET-A payload fixture；打开 https://example.com/app/target-a，输入 item_id=100001 并提交，点击 repaired action，确认 corrected result appears、legacy result is absent 且 request records only include item_id=100001。

## Completion Commit
- Completion Commit: \`${completionCommit}\`
`);
  await addStageLog(path.join(runDir, "repair-log.md"), "repair-result");
  assert.match(run("node", [validator, runDir, "--stage", "repair-result"]), /stage=repair-result/);

  await writeFile(path.join(runDir, "repair-result.md"), `# Repair Result

## Issue Resolution Alignment
| issue_id | requirement_id | target_id | 问题 | 调整 | 解决结果 | 验收步骤 | result |
|---|---|---|---|---|---|---|---|
| REPAIR-001 | REQ-001 | TARGET-A | Source problem text from the issue doc | Updated original files. | Corrected behavior. | 前置条件：本地服务可访问，登录态有效，目标场景 mock 已返回 R-MOCK-TARGET-A payload fixture。1. 打开 target A。2. 输入 item_id=100001 并提交。3. 点击 repaired action。4. 确认 corrected result appears and legacy result is absent. | PASS |

## Feishu Writeback
- Feishu Writeback: PASS
- Source: https://example.com/docx/generic
- Evidence Type: ACCEPTANCE_STEPS
- Evidence: 验收步骤已写入来源飞书文档：前置条件为本地服务可访问、登录态有效、mock 已返回 R-MOCK-TARGET-A payload fixture；打开 target A，输入 item_id=100001 并提交，点击 repaired action，确认 corrected result appears and legacy result is absent.

## Completion Commit
- Completion Commit: \`${completionCommit}\`
`);
  expectFailure("node", [validator, runDir, "--stage", "repair-result"], /business page URL or link to open/);

  await writeFile(path.join(runDir, "repair-result.md"), `# Repair Result

## Issue Resolution Alignment
| issue_id | requirement_id | target_id | 问题 | 调整 | 解决结果 | 验收步骤 | result |
|---|---|---|---|---|---|---|---|
| REPAIR-001 | REQ-001 | TARGET-A | Source problem text from the issue doc | Updated original files. | Corrected behavior. | 前置条件：本地服务可访问，登录态有效。1. Open https://example.com/app/target-a. 2. Click repaired action. 3. Wait for the page to update. 4. Confirm corrected result appears and legacy result is absent. | PASS |

## Feishu Writeback
- Feishu Writeback: PASS
- Source: https://example.com/docx/generic
- Evidence Type: ACCEPTANCE_STEPS
- Evidence: 验收步骤已写入来源飞书文档：前置条件为本地服务可访问、登录态有效；打开 https://example.com/app/target-a，点击 repaired action，等待页面更新并确认 corrected result appears and legacy result is absent。

## Completion Commit
- Completion Commit: \`${completionCommit}\`
`);
  expectFailure("node", [validator, runDir, "--stage", "repair-result"], /exact input data or mock-returned data/);

  await writeFile(path.join(runDir, "repair-result.md"), `# Repair Result

## Issue Resolution Alignment
| issue_id | requirement_id | target_id | 问题 | 调整 | 解决结果 | 验收步骤 | result |
|---|---|---|---|---|---|---|---|
| REPAIR-001 | REQ-001 | TARGET-A | Source problem text from the issue doc | Updated original files. | Corrected behavior. | 前置条件：本地服务可访问，登录态有效，目标场景 mock 已返回 R-MOCK-TARGET-A payload fixture。1. Open https://example.com/app/target-a. 2. 输入 item_id=100001 并提交。3. Click repaired action. 4. Confirm corrected result appears and legacy result is absent. | PASS |

## Feishu Writeback
- Feishu Writeback: PASS
- Source: https://example.com/docx/generic
- Evidence Type: ACCEPTANCE_STEPS
- Evidence: artifacts/example-task/06-debug-verification.md

## Completion Commit
- Completion Commit: \`${completionCommit}\`
`);
  expectFailure("node", [validator, runDir, "--stage", "repair-result"], /must not be only local artifact/);

  const originalGitStatus = await readFile(path.join(snapshotRoot, "execution-repo/status.porcelain-v1.z"));
  await writeFile(path.join(workspace, "baseline.md"), "mutated workspace\n");
  await writeFile(stateFile, "mutated state\n");
  run("git", ["-C", executionRepo, "reset", "--hard", "HEAD"]);
  run("git", ["-C", executionRepo, "clean", "-fd"]);
  await writeFile(path.join(executionRepo, "tracked.txt"), "mutated repo\n");

  const rollbackOutput = run("bash", [rollbackScript, "--project-root", tempRoot, "--run-dir", runDir]);
  assert.match(rollbackOutput, /REPAIR_ROLLBACK_OK/);
  assert.equal(await readFile(path.join(workspace, "baseline.md"), "utf8"), "baseline workspace\n");
  assert.match(await readFile(stateFile, "utf8"), /workspace：`artifacts\/example-task`/);
  assert.equal(await readFile(path.join(executionRepo, "tracked.txt"), "utf8"), "working\n");
  assert.equal(await readFile(path.join(executionRepo, "untracked.txt"), "utf8"), "untracked baseline\n");
  assert.deepEqual(runRaw("git", ["-C", executionRepo, "status", "--porcelain=v1", "-z"]), originalGitStatus);
  assert.ok(await readFile(path.join(runDir, "snapshot-ref.json"), "utf8"), "repair run must remain after rollback");
  assert.ok(await readFile(path.join(snapshotRoot, "snapshot-manifest.json"), "utf8"), "original snapshot must remain after rollback");

  console.log("VALIDATE_REPAIR_ARTIFACTS_TEST_OK");
} finally {
  spawnSync("chmod", ["-R", "u+w", tempRoot]);
  await rm(tempRoot, { recursive: true, force: true });
}
