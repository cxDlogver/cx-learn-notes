import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";

const root = new URL("../", import.meta.url);
const ledger = JSON.parse(
  await readFile(new URL("docs/build-progress.json", root), "utf8"),
);
const sha = /^[0-9a-f]{40}$/;
const statuses = new Set([
  "NOT_STARTED",
  "READY",
  "IN_PROGRESS",
  "STATIC_PASS",
  "REVIEWED",
  "DONE",
  "BLOCKED",
]);
const problems = [];
if (ledger.tasks?.length !== 35) problems.push("Expected exactly 35 tasks.");
if (!sha.test(ledger.integrationCommit ?? ""))
  problems.push("Invalid integrationCommit.");
const ids = new Set();
for (const task of ledger.tasks ?? []) {
  if (ids.has(task.id)) problems.push(`Duplicate task ID: ${task.id}`);
  ids.add(task.id);
  if (!statuses.has(task.status)) problems.push(`Invalid status: ${task.id}`);
  if (task.priority !== ledger.tasks.indexOf(task) + 1)
    problems.push(`Priority order mismatch: ${task.id}`);
  for (const field of ["baseCommit", "taskCommit", "integratedCommit"]) {
    if (
      task[field] !== null &&
      task[field] !== undefined &&
      !sha.test(task[field])
    )
      problems.push(`Invalid ${field}: ${task.id}`);
  }
  if (task.status === "DONE" && (!task.taskCommit || !task.integratedCommit))
    problems.push(`Completed task lacks commits: ${task.id}`);
  if (task.status === "BLOCKED" && !task.blocker)
    problems.push(`Blocked task lacks reason: ${task.id}`);
  if (task.staticPassed === true && !task.taskCommit)
    problems.push(`Static-pass task lacks code commit: ${task.id}`);
}
for (const task of ledger.tasks ?? []) {
  for (const dependency of task.dependsOn ?? []) {
    if (!ids.has(dependency))
      problems.push(`Unknown dependency ${dependency}: ${task.id}`);
  }
}
const active = (ledger.tasks ?? []).filter(
  (task) => task.status === "IN_PROGRESS",
);
if (active.length > 1)
  problems.push("This integration worktree has more than one active task.");
if (active.length && ledger.currentWork?.taskId !== active[0].id)
  problems.push("currentWork does not match the active task.");
if (
  !active.length &&
  ledger.currentWork !== null &&
  ledger.currentWork !== undefined
)
  problems.push("currentWork exists without an active task.");
if (ledger.nextTaskId !== null && ledger.nextTaskId !== undefined) {
  const next = (ledger.tasks ?? []).find(
    (task) => task.id === ledger.nextTaskId,
  );
  if (!next || next.status !== "NOT_STARTED")
    problems.push("nextTaskId must point to an unstarted task.");
}
if (ledger.currentWork) {
  if (
    !Array.isArray(ledger.currentWork.nextSteps) ||
    !ledger.currentWork.nextSteps.length
  )
    problems.push("Active task has no next step.");
  if (!sha.test(ledger.currentWork.baseCommit ?? ""))
    problems.push("Invalid active baseCommit.");
}
if (problems.length) {
  for (const problem of problems) process.stderr.write(`${problem}\n`);
  process.exitCode = 1;
} else if (process.argv.includes("--show")) {
  const counts = Object.fromEntries(
    [...statuses].map((status) => [
      status,
      ledger.tasks.filter((task) => task.status === status).length,
    ]),
  );
  process.stdout.write(
    `任务总数 ${ledger.tasks.length}：DONE ${counts.DONE}，BLOCKED（静态已过） ${ledger.tasks.filter((task) => task.status === "BLOCKED" && task.staticPassed).length}，IN_PROGRESS ${counts.IN_PROGRESS}，NOT_STARTED ${counts.NOT_STARTED}。\n`,
  );
  process.stdout.write(`代码基线 ${ledger.integrationCommit}\n`);
  if (ledger.currentWork) {
    process.stdout.write(
      `当前 ${ledger.currentWork.taskId} · ${ledger.currentWork.phase}\n`,
    );
    process.stdout.write(`下一步：${ledger.currentWork.nextSteps[0]}\n`);
  } else if (ledger.nextTaskId) {
    process.stdout.write(
      `续接任务 ${ledger.nextTaskId}：先核对来源与依赖，再建立 currentWork 检查点。\n`,
    );
  }
} else {
  process.stdout.write(
    "Build progress ledger passed: 35 unique tasks and resumable checkpoint.\n",
  );
}
