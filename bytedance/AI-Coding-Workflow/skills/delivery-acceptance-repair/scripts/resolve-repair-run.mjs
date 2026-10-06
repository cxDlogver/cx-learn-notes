#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultTraeRoot = path.resolve(here, "../../..");
let projectRoot = path.resolve(defaultTraeRoot, "..");
let workspaceArg = "";
let sourceType = "";
let sourceToken = "";
let jsonOutput = false;

const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--project-root") projectRoot = args[++index] || "";
  else if (argument === "--workspace") workspaceArg = args[++index] || "";
  else if (argument === "--source-type") sourceType = args[++index] || "";
  else if (argument === "--source-token") sourceToken = args[++index] || "";
  else if (argument === "--json") jsonOutput = true;
  else if (argument === "-h" || argument === "--help") {
    console.log("Usage: resolve-repair-run.mjs --workspace <artifacts/task> --source-type <docx|sheet> --source-token <canonical-token> [--project-root <path>] [--json]");
    console.log("Scans artifacts/repair/<workspace-name> for matching repair runs.");
    process.exit(0);
  } else {
    console.error(`ERROR: unknown argument: ${argument}`);
    process.exit(2);
  }
}

if (!workspaceArg || !sourceToken || !new Set(["docx", "sheet"]).has(sourceType)) {
  console.error("ERROR: --workspace, --source-type <docx|sheet>, and --source-token are required");
  process.exit(2);
}

projectRoot = fs.realpathSync(projectRoot);
const workspaceCandidate = path.isAbsolute(workspaceArg) ? workspaceArg : path.resolve(projectRoot, workspaceArg);
let workspace;
try { workspace = fs.realpathSync(workspaceCandidate); }
catch (error) {
  console.error(`ERROR: workspace cannot be resolved (${error.message})`);
  process.exit(2);
}

const artifactsRoot = path.join(projectRoot, "artifacts");
if (path.dirname(workspace) !== artifactsRoot) {
  console.error(`ERROR: workspace must be a direct child of ${artifactsRoot}`);
  process.exit(2);
}
if (path.basename(workspace) === "repair") {
  console.error("ERROR: artifacts/repair is reserved for repair management and cannot be an active workspace");
  process.exit(2);
}

const workspaceName = path.basename(workspace);
const repairRoot = path.join(artifactsRoot, "repair", workspaceName);
const snapshotsRoot = path.join(artifactsRoot, "repair", "_snapshots", workspaceName);
const identityKey = `${sourceType}:${sourceToken}`;
const matches = [];
const invalidMatches = [];

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { throw new Error(`${file}: invalid JSON (${error.message})`); }
}

function resolveProjectPath(relative, label) {
  if (typeof relative !== "string" || !relative) throw new Error(`${label}: missing path`);
  const resolved = path.resolve(projectRoot, relative);
  if (resolved !== projectRoot && !resolved.startsWith(`${projectRoot}${path.sep}`)) throw new Error(`${label}: path escapes project root`);
  return resolved;
}

if (fs.existsSync(repairRoot)) {
  for (const entry of fs.readdirSync(repairRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const runId = entry.name;
    const runDir = path.join(repairRoot, runId);
    const sourceManifestFile = path.join(runDir, "source-manifest.json");
    if (!fs.existsSync(sourceManifestFile)) continue;
    let sourceManifest;
    try { sourceManifest = readJson(sourceManifestFile); }
    catch (error) {
      console.error(`ERROR: ${error.message}`);
      process.exit(1);
    }
    if (sourceManifest.source_type !== sourceType || sourceManifest.source_token !== sourceToken) continue;

    try {
      const snapshotRef = readJson(path.join(runDir, "snapshot-ref.json"));
      if (snapshotRef.status !== "READY" || snapshotRef.run_id !== runId) throw new Error("snapshot-ref is not READY or has a mismatched run_id");
      const expectedSnapshotRoot = path.join(snapshotsRoot, runId);
      const snapshotRoot = resolveProjectPath(snapshotRef.snapshot_root, "snapshot_ref.snapshot_root");
      if (snapshotRoot !== expectedSnapshotRoot || fs.realpathSync(snapshotRoot) !== expectedSnapshotRoot) throw new Error("snapshot root does not match this workspace/run");
      const manifestFile = resolveProjectPath(snapshotRef.manifest, "snapshot_ref.manifest");
      if (manifestFile !== path.join(snapshotRoot, "snapshot-manifest.json")) throw new Error("snapshot manifest path is invalid");
      const snapshotManifest = readJson(manifestFile);
      const expectedWorkspace = path.relative(projectRoot, workspace).split(path.sep).join("/");
      if (snapshotManifest.status !== "READY" || snapshotManifest.run_id !== runId || snapshotManifest.workspace !== expectedWorkspace) throw new Error("snapshot manifest does not match this workspace/run");
      for (const field of ["full_workspace", "delivery_state", "inventory"]) {
        const resolved = resolveProjectPath(snapshotManifest[field], `snapshot_manifest.${field}`);
        if (!resolved.startsWith(`${snapshotRoot}${path.sep}`) || !fs.existsSync(resolved)) throw new Error(`snapshot ${field} is missing or outside snapshot root`);
      }
      matches.push({ run_id: runId, run_dir: path.relative(projectRoot, runDir).split(path.sep).join("/"), snapshot_root: snapshotRef.snapshot_root });
    } catch (error) {
      invalidMatches.push({ run_id: runId, reason: error.message });
    }
  }
}

if (invalidMatches.length > 0) {
  console.error(`ERROR: matching source identity ${identityKey} has invalid snapshot state: ${invalidMatches.map(item => `${item.run_id} (${item.reason})`).join(", ")}`);
  process.exit(1);
}
if (matches.length > 1) {
  console.error(`ERROR: matching source identity ${identityKey} is ambiguous across runs: ${matches.map(item => item.run_id).join(", ")}; use --resume <repair-run-id>`);
  process.exit(1);
}

const result = matches.length === 1
  ? { status: "SOURCE_IDENTITY_CHECK_OK", decision: "REUSE_REPAIR_RUN", source_type: sourceType, source_token: sourceToken, identity_key: identityKey, ...matches[0] }
  : { status: "SOURCE_IDENTITY_CHECK_OK", decision: "NEW_REPAIR_RUN", source_type: sourceType, source_token: sourceToken, identity_key: identityKey, run_id: null, run_dir: null, snapshot_root: null };

if (jsonOutput) console.log(JSON.stringify(result, null, 2));
else {
  console.log(result.status);
  console.log(`decision=${result.decision}`);
  console.log(`identity_key=${result.identity_key}`);
  console.log(`run_id=${result.run_id || "<new>"}`);
  console.log(`run_dir=${result.run_dir || "<new>"}`);
  console.log(`snapshot=${result.snapshot_root || "<new>"}`);
}
