import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const structuredOutputSource = await readFile(
  new URL("../src/05-structured-output.ts", import.meta.url),
  "utf8",
);
const sharedTicketAnalysisSource = await readFile(
  new URL("../src/shared/ticket-analysis.ts", import.meta.url),
  "utf8",
);

assert.match(structuredOutputSource, /TicketAnalysis/);
assert.match(sharedTicketAnalysisSource, /name:\s*"ticket_analysis"/);
assert.match(
  sharedTicketAnalysisSource,
  /method:\s*"json(?:Mode|Schema)"/,
);
assert.match(structuredOutputSource, /\bproviderStrategy\b/);
assert.match(structuredOutputSource, /\btoolStrategy\b/);
assert.match(
  sharedTicketAnalysisSource,
  /"missingInformation"[^']*字符串数组/,
  "prompt must tell the model that missingInformation is a string array",
);

console.log("结构化输出配置通过离线验证。");
