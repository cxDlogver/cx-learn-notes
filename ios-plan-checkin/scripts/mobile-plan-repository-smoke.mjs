import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import ts from "typescript";

const source = await readFile(
  new URL("../apps/mobile/src/data/repository.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const module = { exports: {} };
let sequence = 0;
const localRequire = (name) => {
  if (name === "expo-crypto")
    return {
      randomUUID: () =>
        `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
    };
  if (name.endsWith("/deviceId"))
    return { deviceId: async () => "test-device" };
  if (name.endsWith("/session")) return {};
  throw new Error(`Unexpected import: ${name}`);
};
let fetchImpl = async () => {
  throw new Error("not configured");
};
new Function("require", "module", "exports", "fetch", javascript)(
  localRequire,
  module,
  module.exports,
  (...args) => fetchImpl(...args),
);
const { ApiClient, ApiRequestError, HttpRepository } = module.exports;
const api = new ApiClient("https://api.example.test/api/v1");
let forced = 0;
api.attachSession({
  accessToken: async (refresh) => {
    if (refresh) forced++;
    return refresh ? "new" : "old";
  },
  clear: async () => {},
});
const repo = new HttpRepository(api);
const calls = [];
fetchImpl = async (url, options) => {
  calls.push({ url, options });
  if (calls.length === 1)
    return {
      ok: false,
      status: 401,
      json: async () => ({ code: "UNAUTHORIZED", message: "过期" }),
    };
  return {
    ok: true,
    json: async () => ({
      data: { id: "created" },
      requestId: "request",
      serverTime: new Date().toISOString(),
    }),
  };
};
await repo.createGroup({ name: "学习" });
assert.equal(calls.length, 2);
assert.equal(forced, 1);
assert.equal(
  calls[0].options.headers["Idempotency-Key"],
  calls[1].options.headers["Idempotency-Key"],
);
assert.equal(calls[0].options.headers.Authorization, "Bearer old");
assert.equal(calls[1].options.headers.Authorization, "Bearer new");
assert.equal(calls[0].url, "https://api.example.test/api/v1/groups");
assert.equal(JSON.parse(calls[0].options.body).name, "学习");
calls.length = 0;
fetchImpl = async (url, options) => {
  calls.push({ url, options });
  return { ok: true, json: async () => ({ data: { deleted: true } }) };
};
await repo.deletePlan("plan-id", 7);
assert.match(calls[0].url, /baseRevision=7$/);
assert.equal(calls[0].options.headers["X-Confirm-Delete"], "true");
fetchImpl = async () => {
  throw new TypeError("Failed to fetch");
};
await assert.rejects(
  repo.createGroup({ name: "离线" }),
  (error) =>
    error instanceof ApiRequestError &&
    error.status === 0 &&
    error.code === "NETWORK_ERROR" &&
    error.message.includes("联网"),
);
process.stdout.write(
  "Mobile plan repository smoke passed: auth retry, stable idempotency, deletion confirmation, offline error.\n",
);
