#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createFixture, writeJson } from "./fixture.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(testDir, "..");
const composer = path.join(skillDir, "scripts", "compose-report-body.mjs");
const validator = path.join(skillDir, "scripts", "validate-extracted-artifact.mjs");

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

function compose(fixture) {
  const result = run(composer, ["--resources", fixture.resources, "--report", fixture.reportPath]);
  assert.equal(result.status, 0, result.stderr);
}

function expectReportFailure(fixture, pattern, label) {
  const result = run(validator, [fixture.reportPath]);
  assert.notEqual(result.status, 0, `${label} must fail`);
  assert.match(result.stderr, pattern, result.stderr);
}

const valid = createFixture({ parserSuccess: true });
compose(valid);
assert.equal(run(validator, ["--evidence", valid.resources]).status, 0);
assert.equal(run(validator, [valid.reportPath]).status, 0);

// Removing most prose is no longer rejected by word count or semantic coverage heuristics.
let shortenedReport = fs.readFileSync(valid.reportPath, "utf8").replace(valid.paragraph1, "简短内容");
fs.writeFileSync(valid.reportPath, shortenedReport);
const shortenedManifestPath = path.join(valid.raw, "body_reconstruction_manifest.json");
const shortenedManifest = JSON.parse(fs.readFileSync(shortenedManifestPath, "utf8"));
shortenedManifest.blocks = [{
  source_block_id: "shortened-body",
  source_order: 1,
  final_order: 1,
  content_digest: "not-used-for-word-coverage",
  final_anchor: "简短内容",
  action: "script_rewrite",
}];
writeJson(shortenedManifestPath, shortenedManifest);
const shortenedResult = run(validator, [valid.reportPath]);
assert.equal(shortenedResult.status, 0, shortenedResult.stderr);

const brokenLink = createFixture();
compose(brokenLink);
fs.writeFileSync(
  brokenLink.reportPath,
  fs.readFileSync(brokenLink.reportPath, "utf8").replace("sample/media/img1.png", "sample/media/missing.png"),
);
expectReportFailure(brokenLink, /broken local link|media img1 is not linked/, "broken media link");

const missingTableMapping = createFixture();
compose(missingTableMapping);
const tableManifestPath = path.join(missingTableMapping.raw, "body_reconstruction_manifest.json");
const tableManifest = JSON.parse(fs.readFileSync(tableManifestPath, "utf8"));
tableManifest.table_conversions[0].image_mappings = [];
writeJson(tableManifestPath, tableManifest);
expectReportFailure(missingTableMapping, /image_mappings do not cover source images/, "missing table image mapping");

const duplicateComment = createFixture();
compose(duplicateComment);
const commentId = "comment-1";
writeJson(path.join(duplicateComment.comments, "comments_page_1.json"), {
  items: [{ comment_id: commentId, quote: "简短内容" }],
  has_more: false,
});
writeJson(path.join(duplicateComment.raw, "comments_manifest.json"), {
  total: 1,
  comments: [{
    comment_id: commentId,
    quote: "简短内容",
    target_type: "body",
    method: "exact",
    final_anchor: "简短内容",
  }],
});
fs.writeFileSync(
  duplicateComment.reportPath,
  `${fs.readFileSync(duplicateComment.reportPath, "utf8")}\n${commentId}\n${commentId}\n`,
);
expectReportFailure(duplicateComment, /must appear exactly once; found 2/, "duplicate comment");

const missingNodeImage = createFixture();
fs.rmSync(missingNodeImage.nodeImageFile);
const missingEvidence = run(validator, ["--evidence", missingNodeImage.resources]);
assert.notEqual(missingEvidence.status, 0, "missing node image must fail Evidence Gate");
assert.match(missingEvidence.stderr, /node image/);

const parserError = createFixture({ parserSuccess: false });
compose(parserError);
assert.equal(run(validator, [parserError.reportPath]).status, 0);

console.log("validate-integrity tests passed");
