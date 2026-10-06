#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error(
    "Usage: copy_markdown_references.mjs --source <context-dir> --dest <artifacts-dir> --entry <file.md> [--entry <file.md> ...]",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
let sourceArg = "";
let destArg = "";
const entries = [];
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--source") sourceArg = args[++index] || "";
  else if (arg === "--dest") destArg = args[++index] || "";
  else if (arg === "--entry") entries.push(args[++index] || "");
  else usage();
}
if (!sourceArg || !destArg || entries.length === 0 || entries.some((entry) => !entry)) usage();

const sourceRoot = fs.realpathSync(path.resolve(sourceArg));
const destRoot = path.resolve(destArg);
const visitedMarkdown = new Set();
const copiedResources = new Set();
const entrySet = new Set(entries.map((entry) => path.normalize(entry)));
let failed = false;

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function normalizeTarget(rawTarget) {
  let target = rawTarget.trim();
  if (target.startsWith("<") && target.includes(">")) {
    target = target.slice(1, target.indexOf(">"));
  } else {
    target = target.match(/^(?:\\.|[^\s])+/)?.[0] || "";
  }
  target = target.replaceAll("\\ ", " ");
  if (!target || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(target)) return "";
  target = target.split("#", 1)[0].split("?", 1)[0];
  try {
    target = decodeURIComponent(target);
  } catch {
    // Keep the original target when percent encoding is malformed; existence checks will report it.
  }
  if (/(^|[/\\])https?:[/\\]{1,2}/i.test(target)) return "";
  return target;
}

function extractLocalTargets(markdown) {
  const targets = [];
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(\s*(<[^>]+>|[^)\n]+)\)/g)) {
    const target = normalizeTarget(match[1]);
    if (target) targets.push(target);
  }
  for (const match of markdown.matchAll(/^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)/gm)) {
    const target = normalizeTarget(match[1]);
    if (target) targets.push(target);
  }
  return [...new Set(targets)];
}

function report(kind, relativePath) {
  const line = `${kind}:${relativePath.replaceAll(path.sep, "/")}\n`;
  process.stdout.write(line);
  if (["missing_markdown_entry", "missing_referenced_resource", "skipped_unsafe_destination"].includes(kind)) {
    process.stderr.write(line);
  }
}

function scanMarkdown(relativeMarkdown) {
  const normalizedRelative = path.normalize(relativeMarkdown);
  if (visitedMarkdown.has(normalizedRelative)) return;
  visitedMarkdown.add(normalizedRelative);

  const sourceMarkdown = path.resolve(sourceRoot, normalizedRelative);
  if (!inside(sourceRoot, sourceMarkdown) || !fs.existsSync(sourceMarkdown)) {
    report("missing_markdown_entry", normalizedRelative);
    failed = true;
    return;
  }

  const markdown = fs.readFileSync(sourceMarkdown, "utf8");
  for (const target of extractLocalTargets(markdown)) {
    if (path.isAbsolute(target)) {
      report("skipped_absolute_reference", target);
      continue;
    }

    const sourceCandidate = path.resolve(path.dirname(sourceMarkdown), target);
    if (!inside(sourceRoot, sourceCandidate)) {
      report("skipped_outside_reference", target);
      continue;
    }
    if (!fs.existsSync(sourceCandidate)) {
      report("missing_referenced_resource", path.relative(sourceRoot, sourceCandidate));
      failed = true;
      continue;
    }

    const realCandidate = fs.realpathSync(sourceCandidate);
    if (!inside(sourceRoot, realCandidate)) {
      report("skipped_outside_symlink", path.relative(sourceRoot, sourceCandidate));
      continue;
    }
    const stat = fs.statSync(realCandidate);
    const relativeCandidate = path.relative(sourceRoot, sourceCandidate);
    if (!stat.isFile()) {
      report("skipped_directory_reference", relativeCandidate);
      continue;
    }

    let scanNestedMarkdown = entrySet.has(path.normalize(relativeCandidate));
    if (!entrySet.has(path.normalize(relativeCandidate)) && !copiedResources.has(relativeCandidate)) {
      copiedResources.add(relativeCandidate);
      const destination = path.resolve(destRoot, relativeCandidate);
      if (!inside(destRoot, destination)) {
        report("skipped_unsafe_destination", relativeCandidate);
        failed = true;
        continue;
      }
      if (fs.existsSync(destination)) {
        report("skipped_existing_resource", relativeCandidate);
        scanNestedMarkdown = false;
      } else {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(realCandidate, destination);
        report("imported_resource", relativeCandidate);
        scanNestedMarkdown = true;
      }
    }

    if (scanNestedMarkdown && /\.(?:md|markdown)$/i.test(relativeCandidate)) {
      scanMarkdown(relativeCandidate);
    }
  }
}

for (const entry of entries) scanMarkdown(entry);
if (failed) process.exit(1);
