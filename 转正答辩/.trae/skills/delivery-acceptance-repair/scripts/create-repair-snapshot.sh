#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  create-repair-snapshot.sh --workspace <artifacts/task> --run-id <id> [--project-root <path>] [--execution-repo <path>] [--dry-run]

Creates an immutable repair baseline without mutating the active workspace,
DELIVERY_STATE.md, or execution repository.
Snapshots are managed under artifacts/repair/_snapshots and exclude any
top-level legacy repair/ directory inside the active workspace.
USAGE
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_TRAE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PROJECT_ROOT="$(cd "$DEFAULT_TRAE_ROOT/.." && pwd)"
WORKSPACE=""
RUN_ID=""
EXECUTION_REPO=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      WORKSPACE="${2:-}"
      shift 2
      ;;
    --run-id)
      RUN_ID="${2:-}"
      shift 2
      ;;
    --project-root)
      PROJECT_ROOT="${2:-}"
      shift 2
      ;;
    --execution-repo)
      EXECUTION_REPO="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$WORKSPACE" || -z "$RUN_ID" ]]; then
  echo "ERROR: --workspace and --run-id are required" >&2
  exit 2
fi

if [[ ! "$RUN_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  echo "ERROR: invalid run id: $RUN_ID" >&2
  exit 2
fi

PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
TRAE_ROOT="$PROJECT_ROOT/.trae"
STATE_FILE="$TRAE_ROOT/DELIVERY_STATE.md"

if [[ "$WORKSPACE" != /* ]]; then
  WORKSPACE="$PROJECT_ROOT/$WORKSPACE"
fi
WORKSPACE="$(cd "$WORKSPACE" && pwd)"

ARTIFACTS_ROOT="$PROJECT_ROOT/artifacts"
case "$WORKSPACE/" in
  "$ARTIFACTS_ROOT"/*/) ;;
  *)
    echo "ERROR: workspace must be a direct child of $ARTIFACTS_ROOT: $WORKSPACE" >&2
    exit 2
    ;;
esac

if [[ "$(dirname "$WORKSPACE")" != "$ARTIFACTS_ROOT" ]]; then
  echo "ERROR: workspace must be a direct child of $ARTIFACTS_ROOT: $WORKSPACE" >&2
  exit 2
fi
if [[ "$(basename "$WORKSPACE")" == "repair" ]]; then
  echo "ERROR: artifacts/repair is reserved for repair management and cannot be an active workspace" >&2
  exit 2
fi

if [[ ! -s "$STATE_FILE" ]]; then
  echo "ERROR: missing DELIVERY_STATE.md: $STATE_FILE" >&2
  exit 2
fi

if [[ -z "$EXECUTION_REPO" ]]; then
  EXECUTION_REPO="$(sed -n 's/^- execution_repo_root: `\(.*\)`$/\1/p' "$STATE_FILE" | head -n 1)"
fi
if [[ -z "$EXECUTION_REPO" ]]; then
  echo "ERROR: execution repo is not recorded in DELIVERY_STATE.md" >&2
  exit 2
fi
if [[ "$EXECUTION_REPO" != /* ]]; then
  EXECUTION_REPO="$PROJECT_ROOT/$EXECUTION_REPO"
fi
EXECUTION_REPO="$(cd "$EXECUTION_REPO" && pwd)"

if ! git -C "$EXECUTION_REPO" rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: execution repo is not a Git repository: $EXECUTION_REPO" >&2
  exit 2
fi

WORKSPACE_NAME="$(basename "$WORKSPACE")"
REPAIR_ROOT="$ARTIFACTS_ROOT/repair"
SNAPSHOT_ROOT="$REPAIR_ROOT/_snapshots/$WORKSPACE_NAME/$RUN_ID"
BUILD_ROOT="$REPAIR_ROOT/_snapshots/$WORKSPACE_NAME/.building-$RUN_ID-$$"

if [[ -e "$SNAPSHOT_ROOT" || -e "$BUILD_ROOT" ]]; then
  echo "ERROR: snapshot path already exists for run id: $RUN_ID" >&2
  exit 2
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "DRY_RUN: workspace=$WORKSPACE"
  echo "DRY_RUN: execution_repo=$EXECUTION_REPO"
  echo "DRY_RUN: snapshot=$SNAPSHOT_ROOT"
  exit 0
fi

mkdir -p "$BUILD_ROOT/full-workspace" "$BUILD_ROOT/execution-repo/untracked-files"
rsync -a --exclude '/repair' "$WORKSPACE"/ "$BUILD_ROOT/full-workspace"/
cp "$STATE_FILE" "$BUILD_ROOT/DELIVERY_STATE.before-repair.md"

GIT_ROOT="$BUILD_ROOT/execution-repo"
git -C "$EXECUTION_REPO" status --short > "$GIT_ROOT/status.short.txt"
git -C "$EXECUTION_REPO" status --porcelain=v1 -z > "$GIT_ROOT/status.porcelain-v1.z"
git -C "$EXECUTION_REPO" branch --show-current > "$GIT_ROOT/branch.txt"
git -C "$EXECUTION_REPO" rev-parse HEAD > "$GIT_ROOT/head.txt"
git -C "$EXECUTION_REPO" diff --cached --binary > "$GIT_ROOT/staged.diff"
git -C "$EXECUTION_REPO" diff --binary > "$GIT_ROOT/working.diff"
git -C "$EXECUTION_REPO" ls-files --others --exclude-standard -z > "$GIT_ROOT/untracked-files.z"
git -C "$EXECUTION_REPO" ls-files --others --exclude-standard > "$GIT_ROOT/untracked-files.txt"

while IFS= read -r -d '' relative_path; do
  mkdir -p "$GIT_ROOT/untracked-files/$(dirname "$relative_path")"
  cp -p "$EXECUTION_REPO/$relative_path" "$GIT_ROOT/untracked-files/$relative_path"
done < "$GIT_ROOT/untracked-files.z"

node - "$BUILD_ROOT" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = process.argv[2];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symbolic link is not allowed in repair snapshot: ${absolute}`);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.isFile()) files.push(absolute);
  }
}
walk(path.join(root, "full-workspace"));
walk(path.join(root, "execution-repo"));
files.push(path.join(root, "DELIVERY_STATE.before-repair.md"));
const rows = files.sort().map(file => {
  const digest = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  return `${digest}  ${path.relative(root, file).split(path.sep).join("/")}`;
});
fs.writeFileSync(path.join(root, "inventory.sha256"), `${rows.join("\n")}\n`);
NODE

CREATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
BRANCH="$(tr -d '\n' < "$GIT_ROOT/branch.txt")"
HEAD_SHA="$(tr -d '\n' < "$GIT_ROOT/head.txt")"

node - "$BUILD_ROOT" "$PROJECT_ROOT" "$RUN_ID" "$WORKSPACE" "$EXECUTION_REPO" "$CREATED_AT" "$BRANCH" "$HEAD_SHA" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const [root, projectRoot, runId, workspace, executionRepo, createdAt, branch, head] = process.argv.slice(2);
const rel = value => path.relative(projectRoot, value).split(path.sep).join("/");
const manifest = {
  version: 1,
  status: "READY",
  run_id: runId,
  created_at: createdAt,
  workspace: rel(workspace),
  workspace_name: path.basename(workspace),
  snapshot_root: rel(root).replace(/\/\.building-[^/]+$/, `/${runId}`),
  full_workspace: `${rel(root).replace(/\/\.building-[^/]+$/, `/${runId}`)}/full-workspace`,
  delivery_state: `${rel(root).replace(/\/\.building-[^/]+$/, `/${runId}`)}/DELIVERY_STATE.before-repair.md`,
  inventory: `${rel(root).replace(/\/\.building-[^/]+$/, `/${runId}`)}/inventory.sha256`,
  execution_repo: {
    root: executionRepo,
    branch: branch || "DETACHED",
    head,
    status: `${rel(root).replace(/\/\.building-[^/]+$/, `/${runId}`)}/execution-repo/status.porcelain-v1.z`,
    staged_diff: `${rel(root).replace(/\/\.building-[^/]+$/, `/${runId}`)}/execution-repo/staged.diff`,
    working_diff: `${rel(root).replace(/\/\.building-[^/]+$/, `/${runId}`)}/execution-repo/working.diff`,
    untracked_list: `${rel(root).replace(/\/\.building-[^/]+$/, `/${runId}`)}/execution-repo/untracked-files.z`,
    untracked_root: `${rel(root).replace(/\/\.building-[^/]+$/, `/${runId}`)}/execution-repo/untracked-files`
  }
};
fs.writeFileSync(path.join(root, "snapshot-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
NODE

mv "$BUILD_ROOT" "$SNAPSHOT_ROOT"
chmod -R a-w "$SNAPSHOT_ROOT"

echo "REPAIR_SNAPSHOT_OK"
echo "run_id=$RUN_ID"
echo "workspace=$WORKSPACE"
echo "snapshot=$SNAPSHOT_ROOT"
echo "manifest=$SNAPSHOT_ROOT/snapshot-manifest.json"
