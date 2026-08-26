#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const traeRoot = path.resolve(here, "../../..");
const read = relative => readFile(path.join(traeRoot, relative), "utf8");

const repairFiles = [
  "commands/delivery/repair.md",
  "skills/delivery-acceptance-repair/SKILL.md",
  "skills/delivery-acceptance-repair/repair-plan-template.md",
  "skills/delivery-acceptance-repair/scripts/create-repair-snapshot.sh",
  "skills/delivery-acceptance-repair/scripts/resolve-repair-run.mjs",
  "skills/delivery-acceptance-repair/scripts/rollback-repair-snapshot.sh",
  "skills/delivery-acceptance-repair/scripts/validate-repair-artifacts.mjs",
];
for (const relative of repairFiles) assert.equal((await stat(path.join(traeRoot, relative))).isFile(), true, `${relative} must exist`);

const command = await read("commands/delivery/repair.md");
const skill = await read("skills/delivery-acceptance-repair/SKILL.md");
const template = await read("skills/delivery-acceptance-repair/repair-plan-template.md");
const validator = await read("skills/delivery-acceptance-repair/scripts/validate-repair-artifacts.mjs");
const snapshotScript = await read("skills/delivery-acceptance-repair/scripts/create-repair-snapshot.sh");
const resolverScript = await read("skills/delivery-acceptance-repair/scripts/resolve-repair-run.mjs");
const rollbackScript = await read("skills/delivery-acceptance-repair/scripts/rollback-repair-snapshot.sh");

for (const marker of [
  "## Snapshot-First Gate",
  "## Source Identity Preflight",
  "resolve-repair-run.mjs",
  "source_type + source_token",
  "NEW_REPAIR_RUN",
  "REUSE_REPAIR_RUN",
  "create-repair-snapshot.sh",
  "artifacts/repair/<workspace-name>/<run-id>/",
  "artifacts/repair/_snapshots/<workspace-name>/<run-id>/",
  "task_change=true",
  "test_case_change=true",
  "--code` 保留为输入兼容",
  "command_ref",
  "skill_refs",
]) assert.match(command, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `command missing ${marker}`);

assert.ok(command.indexOf("create-repair-snapshot.sh") < command.indexOf("随后先写 `snapshot-ref.json`"), "snapshot must be specified before repair run artifacts are written");
assert.ok(command.indexOf("resolve-repair-run.mjs") < command.indexOf("create-repair-snapshot.sh"), "canonical source identity must be resolved before snapshot decision");

for (const marker of [
  "## Purpose And Authority",
  "## Phase 1: Resolve Source Identity And Snapshot Before Mutation",
  "canonical `source_type + source_token`",
  "REUSE_REPAIR_RUN",
  "不得创建新快照",
  "## Phase 4: Replay Through Current Stage Contracts",
  "### Mandatory Task and Test Case repair",
  "code-writer",
  "runtime-runner",
  "task-planner",
  "design-checker",
  "repair-result",
  "飞书回写",
  "completion commit",
  "03-prd-analysis",
  "04-tech-planning",
  "09-task-planning",
  "10-test-case-planning",
]) assert.match(skill, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `skill missing ${marker}`);

for (const marker of [
  "## Snapshot Reference Contract",
  "## Source Identity Decision Contract",
  "## Rerun Plan Contract",
  "## Repair Closure Contract",
  "## Repair Result Contract",
  '"task_change": true',
  '"test_case_change": true',
  '"snapshot_decision": "CREATED|REUSED"',
  '"required_agent": "code-writer"',
  '"owner": "main-agent"',
  '"helper_agents": ["runtime-runner"]',
  '"feishu_writeback_status": "PENDING|WRITTEN|BLOCKED"',
  '"completion_commit": null',
  "business page URL or link to open",
  "exact input or mock-returned data",
  "concrete UI interactions",
  "expected result",
  "acceptance points",
]) assert.match(template, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `template missing ${marker}`);

for (const marker of [
  "task_change=true and test_case_change=true",
  "requires owner=${contract.owner} and required_agent=${contract.agent}",
  "current stage contract does not exist",
  "snapshot-first",
  "canonical identity_resolution",
  'agent: "code-writer"',
  'owner: "main-agent", agent: null, helpers: ["runtime-runner"]',
  "repair-result",
  "repair_result.completion_commit",
  "Feishu Writeback must be PASS",
  "问题 | 调整 | 解决结果 | 验收步骤",
  "must be one executable manual acceptance process",
  "business page URL or link to open",
  "exact input data or mock-returned data",
  "concrete UI interactions",
  "expected results and acceptance points",
  "numbered manual verification steps",
  "Evidence Type SCREENSHOT or ACCEPTANCE_STEPS",
  "Feishu writeback evidence must not be only local artifact/log/source file references",
]) assert.match(validator, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `validator missing ${marker}`);

for (const content of [command, skill, template, validator]) {
  assert.doesNotMatch(content, /code-implementer|test-runner/);
  assert.doesNotMatch(content, /rerun-prompts\.md|artifacts\/self-test|PENDING_BOOTSTRAP/);
  assert.doesNotMatch(content, /repair replay 不读取、不调用|不得调用普通阶段 command/);
  assert.doesNotMatch(content, /delivery-reviewer|08-delivery-acceptance|commands\/delivery:accept|skills\/08-delivery-acceptance/);
  assert.doesNotMatch(content, /-> accept|"stage": "accept"|stage=accept/);
}

for (const marker of ["full-workspace", "DELIVERY_STATE.before-repair.md", "inventory.sha256", "staged.diff", "working.diff", "untracked-files", "artifacts/repair/_snapshots", "--exclude '/repair'", "chmod -R a-w", "REPAIR_SNAPSHOT_OK"]) {
  assert.match(snapshotScript, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `snapshot script missing ${marker}`);
}
for (const marker of ["source_type", "source_token", "identity_key", "NEW_REPAIR_RUN", "REUSE_REPAIR_RUN", "matching source identity", "use --resume <repair-run-id>"]) {
  assert.match(resolverScript, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `resolver script missing ${marker}`);
}
for (const marker of ["rollback-safety", "rsync -rlt --delete", "git -C", "reset --hard", "clean -fd", "REPAIR_ROLLBACK_OK"]) {
  assert.match(rollbackScript, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `rollback script missing ${marker}`);
}

const ordinaryContracts = [
  "commands/delivery/prd.md",
  "commands/delivery/bam.md",
  "commands/delivery/plan.md",
  "commands/delivery/task.md",
  "commands/delivery/code.md",
  "commands/delivery/verify.md",
  "commands/delivery/design.md",
  "skills/03-prd-analysis/SKILL.md",
  "skills/04-tech-planning/SKILL.md",
  "skills/09-task-planning/SKILL.md",
  "skills/10-test-case-planning/SKILL.md",
  "skills/05-code-implementation/SKILL.md",
  "skills/06-debug-verification/SKILL.md",
  "skills/07-design-alignment/SKILL.md",
  "agents/code-writer.md",
  "agents/runtime-runner.md",
];
for (const relative of ordinaryContracts) assert.equal((await stat(path.join(traeRoot, relative))).isFile(), true, `current contract missing: ${relative}`);

console.log("REPAIR_CONTRACT_CONSISTENCY_TEST_OK");
