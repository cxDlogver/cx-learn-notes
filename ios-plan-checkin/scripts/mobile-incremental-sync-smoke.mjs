import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import ts from "typescript";

const source = await readFile(
  new URL("../apps/mobile/src/data/incrementalSync.ts", import.meta.url),
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
const { IncrementalSync } = module.exports;
const events = [];
let savedCursor = null;
let failApply = false;
const cache = {
  async cursor() {
    return savedCursor;
  },
  async setCursor(_account, value) {
    savedCursor = value;
    events.push(`reset:${value}`);
  },
  async applyRemoteSyncPage(_account, page, plans, records) {
    events.push(
      `apply:${page.nextCursor}:${plans?.length ?? "no-plans"}:${records.length}`,
    );
    if (failApply) throw new Error("transaction rolled back");
    savedCursor = page.nextCursor;
  },
};
const page1 = {
  changes: [
    {
      seq: 1,
      entityType: "checkin",
      entityId: "record-1",
      operation: "upsert",
      payload: { planId: "plan-1", businessDate: "2026-09-28" },
      changedAt: "2026-09-28T00:00:00Z",
    },
  ],
  nextCursor: "cursor-1",
  hasMore: true,
};
const page2 = {
  changes: [
    {
      seq: 2,
      entityType: "share",
      entityId: "shared-plan-1",
      operation: "revoke",
      changedAt: "2026-09-28T00:01:00Z",
    },
  ],
  nextCursor: "cursor-2",
  hasMore: false,
};
let expireOnce = false;
const api = {
  async get(path) {
    events.push(`get:${path}`);
    if (path.startsWith("/sync/changes")) {
      if (expireOnce) {
        expireOnce = false;
        throw { code: "CURSOR_EXPIRED" };
      }
      return path.includes("cursor=cursor-1") ? page2 : page1;
    }
    if (path === "/plans") return [{ id: "plan-1" }];
    if (path === "/plans/plan-1/checkins/2026-09-28") return { id: "record-1" };
    throw new Error(`Unexpected GET ${path}`);
  },
  async post(path, body) {
    events.push(`ack:${body.cursor}`);
    assert.equal(path, "/sync/ack");
    assert.equal(body.deviceId, "device-1");
    return { acknowledgedSeq: 2 };
  },
};
const changesSeen = [];
const sync = new IncrementalSync(
  api,
  cache,
  () => "account-1",
  async () => "device-1",
  async (changes) => changesSeen.push(...changes),
);
await sync.trigger();
assert.equal(savedCursor, "cursor-2");
assert.ok(
  events.indexOf("apply:cursor-1:1:1") < events.indexOf("ack:cursor-1"),
);
assert.ok(
  events.indexOf("apply:cursor-2:no-plans:0") < events.indexOf("ack:cursor-2"),
);
assert.equal(changesSeen.at(-1).operation, "revoke");

savedCursor = "expired";
expireOnce = true;
events.length = 0;
await sync.trigger();
assert.ok(events.includes("reset:null"));
assert.equal(savedCursor, "cursor-2");
assert.ok(events.includes("apply:cursor-1:1:1"));

savedCursor = null;
failApply = true;
await assert.rejects(sync.trigger(), /transaction rolled back/);
assert.equal(savedCursor, null);
process.stdout.write(
  "Mobile incremental sync smoke passed: page order, cursor commit, expiry replay, permission event and rollback.\n",
);
