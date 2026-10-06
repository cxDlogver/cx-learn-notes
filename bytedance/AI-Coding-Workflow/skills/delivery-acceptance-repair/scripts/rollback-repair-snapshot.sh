#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  rollback-repair-snapshot.sh --run-dir <artifacts/repair/workspace-name/run-id> [--project-root <path>] [--dry-run]

Restores the active workspace, DELIVERY_STATE.md, and execution repository from
the immutable snapshot referenced by the repair run. A safety snapshot is made first.
USAGE
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_TRAE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PROJECT_ROOT="$(cd "$DEFAULT_TRAE_ROOT/.." && pwd)"
RUN_DIR=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-dir)
      RUN_DIR="${2:-}"
      shift 2
      ;;
    --project-root)
      PROJECT_ROOT="${2:-}"
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

if [[ -z "$RUN_DIR" ]]; then
  echo "ERROR: --run-dir is required" >&2
  exit 2
fi

PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
if [[ "$RUN_DIR" != /* ]]; then
  RUN_DIR="$PROJECT_ROOT/$RUN_DIR"
fi
RUN_DIR="$(cd "$RUN_DIR" && pwd)"

WORKSPACE_NAME="$(basename "$(dirname "$RUN_DIR")")"
REPAIR_ROOT="$(dirname "$(dirname "$RUN_DIR")")"
ARTIFACTS_ROOT="$(dirname "$REPAIR_ROOT")"
if [[ "$(basename "$REPAIR_ROOT")" != "repair" || "$(basename "$ARTIFACTS_ROOT")" != "artifacts" || "$WORKSPACE_NAME" == "_snapshots" ]]; then
  echo "ERROR: run dir must be artifacts/repair/<workspace-name>/<run-id>: $RUN_DIR" >&2
  exit 2
fi

SNAPSHOT_REF="$RUN_DIR/snapshot-ref.json"
if [[ ! -s "$SNAPSHOT_REF" ]]; then
  echo "ERROR: missing snapshot-ref.json: $SNAPSHOT_REF" >&2
  exit 2
fi

IFS=$'\t' read -r SNAPSHOT_ROOT WORKSPACE_REL FULL_WORKSPACE_REL STATE_REL EXECUTION_REPO SNAPSHOT_BRANCH SNAPSHOT_HEAD STAGED_DIFF_REL WORKING_DIFF_REL UNTRACKED_ROOT_REL < <(node - "$SNAPSHOT_REF" "$PROJECT_ROOT" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const [refFile, projectRoot] = process.argv.slice(2);
const ref = JSON.parse(fs.readFileSync(refFile, "utf8"));
if (ref.status !== "READY" || !ref.snapshot_root) throw new Error("snapshot ref is not READY");
const root = path.resolve(projectRoot, ref.snapshot_root);
const manifest = JSON.parse(fs.readFileSync(path.join(root, "snapshot-manifest.json"), "utf8"));
const values = [root, manifest.workspace, manifest.full_workspace, manifest.delivery_state,
  manifest.execution_repo.root, manifest.execution_repo.branch, manifest.execution_repo.head,
  manifest.execution_repo.staged_diff, manifest.execution_repo.working_diff,
  manifest.execution_repo.untracked_root];
process.stdout.write(`${values.map(value => value ?? "").join("\t")}\n`);
NODE
)

WORKSPACE="$PROJECT_ROOT/$WORKSPACE_REL"
FULL_WORKSPACE="$PROJECT_ROOT/$FULL_WORKSPACE_REL"
STATE_BACKUP="$PROJECT_ROOT/$STATE_REL"
STAGED_DIFF="$PROJECT_ROOT/$STAGED_DIFF_REL"
WORKING_DIFF="$PROJECT_ROOT/$WORKING_DIFF_REL"
UNTRACKED_ROOT="$PROJECT_ROOT/$UNTRACKED_ROOT_REL"
STATE_FILE="$PROJECT_ROOT/.trae/DELIVERY_STATE.md"
RUN_ID="$(basename "$RUN_DIR")"
SAFETY_RUN_ID="$RUN_ID-rollback-safety-$(date +%Y%m%d-%H%M%S)"

for required in "$SNAPSHOT_ROOT/snapshot-manifest.json" "$FULL_WORKSPACE" "$STATE_BACKUP"; do
  if [[ ! -e "$required" ]]; then
    echo "ERROR: incomplete snapshot, missing: $required" >&2
    exit 2
  fi
done

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "DRY_RUN: run_dir=$RUN_DIR"
  echo "DRY_RUN: snapshot=$SNAPSHOT_ROOT"
  echo "DRY_RUN: workspace=$WORKSPACE"
  echo "DRY_RUN: execution_repo=$EXECUTION_REPO"
  echo "DRY_RUN: safety_run_id=$SAFETY_RUN_ID"
  exit 0
fi

"$SCRIPT_DIR/create-repair-snapshot.sh" \
  --project-root "$PROJECT_ROOT" \
  --workspace "$WORKSPACE" \
  --execution-repo "$EXECUTION_REPO" \
  --run-id "$SAFETY_RUN_ID" >/dev/null

SAFETY_SNAPSHOT="$PROJECT_ROOT/artifacts/repair/_snapshots/$(basename "$WORKSPACE")/$SAFETY_RUN_ID"
rsync -rlt --delete "$FULL_WORKSPACE"/ "$WORKSPACE"/
chmod u+w "$WORKSPACE"
cp "$STATE_BACKUP" "$STATE_FILE"

git -C "$EXECUTION_REPO" reset --hard
git -C "$EXECUTION_REPO" clean -fd
if [[ "$SNAPSHOT_BRANCH" == "DETACHED" || -z "$SNAPSHOT_BRANCH" ]]; then
  git -C "$EXECUTION_REPO" switch --detach "$SNAPSHOT_HEAD"
else
  git -C "$EXECUTION_REPO" switch "$SNAPSHOT_BRANCH"
fi
git -C "$EXECUTION_REPO" reset --hard "$SNAPSHOT_HEAD"
git -C "$EXECUTION_REPO" clean -fd

if [[ -s "$STAGED_DIFF" ]]; then
  git -C "$EXECUTION_REPO" apply --index "$STAGED_DIFF"
fi
if [[ -s "$WORKING_DIFF" ]]; then
  git -C "$EXECUTION_REPO" apply "$WORKING_DIFF"
fi
if [[ -d "$UNTRACKED_ROOT" ]]; then
  rsync -rlt "$UNTRACKED_ROOT"/ "$EXECUTION_REPO"/
fi

echo "REPAIR_ROLLBACK_OK"
echo "run_id=$RUN_ID"
echo "snapshot=$SNAPSHOT_ROOT"
echo "safety_snapshot=$SAFETY_SNAPSHOT"
echo "workspace=$WORKSPACE"
echo "execution_repo=$EXECUTION_REPO"
