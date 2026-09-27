import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import ts from "typescript";

const source = await readFile(
  new URL("../apps/mobile/src/data/outboxRunner.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const module = { exports: {} };
new Function("require", "module", "exports", compiled)(
  (name) => {
    throw new Error(`Unexpected runtime import: ${name}`);
  },
  module,
  module.exports,
);
const { OutboxRunner } = module.exports;

const rows = [];
const failures = [];
const acknowledgments = [];
const cache = {
  async claimNextOperation() {
    const now = Date.now();
    const row = rows.find(
      (candidate) =>
        ["pending", "retry"].includes(candidate.status) &&
        (!candidate.nextAttempt || candidate.nextAttempt <= now) &&
        !rows.some(
          (prior) =>
            prior.order < candidate.order &&
            prior.planId === candidate.planId &&
            prior.businessDate === candidate.businessDate &&
            ["pending", "retry", "sending", "conflict", "failed"].includes(
              prior.status,
            ),
        ),
    );
    if (!row) return null;
    row.status = "sending";
    return { ...row, payload: { clientOperationId: row.operationId } };
  },
  async acknowledgeOperation(_account, operation, record) {
    acknowledgments.push([operation.operationId, record.id]);
    rows.splice(
      rows.findIndex((row) => row.operationId === operation.operationId),
      1,
    );
  },
  async failOperation(_account, operation, status, code, _message, retryAt) {
    const row = rows.find((item) => item.operationId === operation.operationId);
    row.status = status;
    row.retryCount++;
    row.nextAttempt = retryAt?.getTime() ?? null;
    failures.push([operation.operationId, status, code, row.nextAttempt]);
  },
  async nextWakeAt() {
    return null;
  },
};
const add = (operationId, planId, businessDate) =>
  rows.push({
    operationId,
    planId,
    businessDate,
    kind: "create",
    retryCount: 0,
    status: "pending",
    nextAttempt: null,
    order: rows.length,
  });
add("first", "plan-a", "2026-09-28");
add("second", "plan-a", "2026-09-28");
add("other", "plan-b", "2026-09-28");
let online = false;
const sent = [];
const send = async (operation) => {
  sent.push(operation.operationId);
  if (
    operation.operationId === "first" &&
    sent.filter((id) => id === "first").length === 1
  )
    throw { status: 0, code: "NETWORK_ERROR", message: "lost response" };
  return { id: operation.operationId };
};
const runner = new OutboxRunner(
  cache,
  () => "account-a",
  send,
  async () => online,
  async () => {},
  () => 0,
);
await runner.trigger();
assert.equal(rows[0].status, "pending");
online = true;
await runner.trigger();
assert.deepEqual(sent, ["first"]);
assert.deepEqual(failures[0].slice(0, 3), ["first", "retry", "NETWORK_ERROR"]);
assert.equal(rows[0].operationId, "first");
rows[0].nextAttempt = Date.now() - 1;
await runner.trigger();
assert.deepEqual(sent, ["first", "first", "second", "other"]);
assert.deepEqual(
  acknowledgments.map(([id]) => id),
  ["first", "second", "other"],
);
runner.stop();

add("conflict", "plan-c", "2026-09-28");
add("blocked", "plan-c", "2026-09-28");
add("independent", "plan-d", "2026-09-28");
const conflictRunner = new OutboxRunner(
  cache,
  () => "account-a",
  async (operation) => {
    if (operation.operationId === "conflict")
      throw {
        status: 409,
        code: "CHECKIN_CONFLICT",
        message: "different versions",
      };
    return { id: operation.operationId };
  },
  async () => true,
);
await conflictRunner.trigger();
assert.equal(
  rows.find((row) => row.operationId === "conflict").status,
  "conflict",
);
assert.equal(
  rows.find((row) => row.operationId === "blocked").status,
  "pending",
);
assert.ok(!rows.some((row) => row.operationId === "independent"));
conflictRunner.stop();

add("rate", "plan-e", "2026-09-28");
const before = Date.now();
const rateRunner = new OutboxRunner(
  cache,
  () => "account-a",
  async () => {
    throw {
      status: 429,
      code: "RATE_LIMITED",
      message: "slow",
      retryAfterMs: 70_000,
    };
  },
  async () => true,
  async () => {},
  () => 0,
);
await rateRunner.trigger();
assert.ok(
  rows.find((row) => row.operationId === "rate").nextAttempt >= before + 70_000,
);
rateRunner.stop();
add("race-first", "plan-f", "2026-09-28");
let releaseFirst;
let enteredFirst;
const firstEntered = new Promise((resolve) => {
  enteredFirst = resolve;
});
const firstReleased = new Promise((resolve) => {
  releaseFirst = resolve;
});
const raceRunner = new OutboxRunner(
  cache,
  () => "account-a",
  async (operation) => {
    if (operation.operationId === "race-first") {
      enteredFirst();
      await firstReleased;
    }
    return { id: operation.operationId };
  },
  async () => true,
);
const firstRun = raceRunner.trigger();
await firstEntered;
add("race-second", "plan-f", "2026-09-28");
const secondRun = raceRunner.trigger();
releaseFirst();
await Promise.all([firstRun, secondRun]);
assert.ok(acknowledgments.some(([id]) => id === "race-second"));
raceRunner.stop();
process.stdout.write(
  "Mobile outbox runner smoke passed: offline, retry, stable IDs, ordering, conflict, Retry-After and concurrent wake.\n",
);
