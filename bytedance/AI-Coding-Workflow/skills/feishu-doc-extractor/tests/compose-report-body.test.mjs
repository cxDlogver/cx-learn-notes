#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createFixture } from "./fixture.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(testDir, "..");
const composer = path.join(skillDir, "scripts", "compose-report-body.mjs");
const validator = path.join(skillDir, "scripts", "validate-extracted-artifact.mjs");

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

const fixture = createFixture({ parserSuccess: true });
const composed = run(composer, ["--resources", fixture.resources, "--report", fixture.reportPath]);
assert.equal(composed.status, 0, composed.stderr);

const report = fs.readFileSync(fixture.reportPath, "utf8");
assert.deepEqual(
  [...report.matchAll(/^# ([^#].*)$/gm)].map((match) => match[1]),
  ["文档概述", "正文", "验收检查"],
);
assert.match(report, /## 原始标题/);
assert.match(report, /\[编码外链]\(https:\/\/example\.com\/spec\)/);
assert.match(report, /\| 字段 \| 资源 \|/);
assert.match(report, /sample\/media\/img1\.png/);
assert.match(report, /sample\/media\/file1\.txt/);
assert.match(report, /白板：wb1<br \/>/);
assert.match(report, /whiteboard_01_wb1_analysis\.md/);
assert.match(report, /whiteboard_01_wb1_nodes\.json/);
assert.match(report, /whiteboard_01_wb1_node_image\.png/);
assert.doesNotMatch(report, /Parser\s*图片说明|confidence|完整性状态|\bPASS\b/);
assert.equal(fs.existsSync(path.join(fixture.resources, "parser_images")), false);
assert.equal(fs.existsSync(path.join(fixture.raw, "parser_image_mapping_candidates.json")), false);

const bodyManifest = JSON.parse(fs.readFileSync(path.join(fixture.raw, "body_reconstruction_manifest.json"), "utf8"));
assert.equal(bodyManifest.source_file, "raw/fetch_doc_content.md");
assert.equal(bodyManifest.table_conversions.length, 1);
assert.equal(bodyManifest.resource_mappings.some((item) => item.type === "file" && item.token === "file1"), true);
assert.equal("seed_file" in bodyManifest, false);
assert.equal("seed_sha256" in bodyManifest, false);

const evidence = run(validator, ["--evidence", fixture.resources]);
assert.equal(evidence.status, 0, evidence.stderr);
const validated = run(validator, [fixture.reportPath]);
assert.equal(validated.status, 0, validated.stderr);

const originalReport = "existing report must be preserved\n";
fs.writeFileSync(fixture.reportPath, originalReport);
fs.rmSync(fixture.analysisFile);
const refused = run(composer, ["--resources", fixture.resources, "--report", fixture.reportPath]);
assert.notEqual(refused.status, 0, "composer must reject incomplete whiteboard evidence");
assert.equal(fs.readFileSync(fixture.reportPath, "utf8"), originalReport);

console.log("compose-report-body tests passed");
