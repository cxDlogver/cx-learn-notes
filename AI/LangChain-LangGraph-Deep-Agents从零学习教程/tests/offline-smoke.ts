import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manualAgentSource = await readFile(
  new URL("../src/03-manual-agent-loop.ts", import.meta.url),
  "utf8",
);

assert.match(
  manualAgentSource,
  /MAX_STEPS/,
  "手写 Agent Loop 必须具有最大步数",
);
assert.match(manualAgentSource, /unknown_tool/);
assert.match(manualAgentSource, /tool_execution_failed/);

const { workflow } = await import("../src/06-langgraph-stategraph.js");

const urgent = await workflow.invoke({ request: "生产支付服务大面积 5xx" });
assert.equal(urgent.valid, true);
assert.equal(urgent.route, "urgent");
assert.match(urgent.result, /紧急队列/);

const invalid = await workflow.invoke({ request: "坏了" });
assert.equal(invalid.valid, false);
assert.match(invalid.result, /信息不足/);

console.log("offline smoke tests passed");
