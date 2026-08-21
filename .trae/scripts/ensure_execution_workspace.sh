#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=""
TASK_ID=""
TASK_NAME=""
BASE_BRANCH="master"
STATE_FILE=""
CREATED_BY_PHASE=""
PREFER_WORKTREE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-root) REPO_ROOT="$2"; shift 2 ;;
    --task-id) TASK_ID="$2"; shift 2 ;;
    --task-name) TASK_NAME="$2"; shift 2 ;;
    --base-branch) BASE_BRANCH="$2"; shift 2 ;;
    --state-file) STATE_FILE="$2"; shift 2 ;;
    --created-by-phase) CREATED_BY_PHASE="$2"; shift 2 ;;
    --prefer-worktree) PREFER_WORKTREE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$REPO_ROOT" || -z "$TASK_ID" || -z "$TASK_NAME" || -z "$STATE_FILE" ]]; then
  echo "Usage: $0 --repo-root <repo-root> --task-id <task-id> --task-name <short-task-name> --state-file <state-file> [--base-branch master] [--created-by-phase /delivery:bam]" >&2
  exit 2
fi

REPO_ROOT="$(cd "$REPO_ROOT" && pwd -P)"
STATE_FILE="$(cd "$(dirname "$STATE_FILE")" && pwd -P)/$(basename "$STATE_FILE")"

read_state() {
  python3 - "$STATE_FILE" <<'PY'
import re, sys, pathlib
state_path = pathlib.Path(sys.argv[1])
text = state_path.read_text(encoding='utf-8') if state_path.exists() else ''
for key in ['execution_ready','execution_mode','execution_branch','execution_base_branch','execution_repo_root','execution_worktree_path','execution_created_by_phase']:
    m = re.search(rf'- {key}: ?`?(.*?)`?$', text, re.M)
    print(f"{key}={(m.group(1) if m else '').strip()}")
PY
}

while IFS='=' read -r k v; do
  case "$k" in
    execution_ready) execution_ready="$v" ;;
    execution_mode) execution_mode="$v" ;;
    execution_branch) execution_branch="$v" ;;
    execution_base_branch) execution_base_branch="$v" ;;
    execution_repo_root) execution_repo_root="$v" ;;
    execution_worktree_path) execution_worktree_path="$v" ;;
    execution_created_by_phase) execution_created_by_phase="$v" ;;
  esac
done < <(read_state)

if [[ "${execution_ready:-}" == "true" && -n "${execution_repo_root:-}" ]]; then
  cat <<OUT
execution_ready=true
execution_mode=${execution_mode:-}
execution_branch=${execution_branch:-}
execution_base_branch=${execution_base_branch:-$BASE_BRANCH}
execution_repo_root=${execution_repo_root:-}
execution_worktree_path=${execution_worktree_path:-}
execution_created_by_phase=${execution_created_by_phase:-}
OUT
  exit 0
fi

slug=$(printf '%s' "$TASK_NAME" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')
[[ -z "$slug" ]] && slug="task"
branch="feat/meego-${TASK_ID}-${slug}"
current_branch=$(git -C "$REPO_ROOT" branch --show-current)

if [[ -n "$current_branch" && "$current_branch" != "main" && "$current_branch" != "master" ]]; then
  branch="$current_branch"
else
  if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$REPO_ROOT" checkout "$branch" >/dev/null
  else
    git -C "$REPO_ROOT" checkout -b "$branch" >/dev/null
  fi
fi

python3 - "$STATE_FILE" "$branch" "$BASE_BRANCH" "$REPO_ROOT" "$CREATED_BY_PHASE" <<'PY'
import re, sys, pathlib
state_path = pathlib.Path(sys.argv[1])
branch, base_branch, repo_root, created_by = sys.argv[2:6]
text = state_path.read_text(encoding='utf-8') if state_path.exists() else '# DELIVERY STATE\n\n'
block = f'''## Execution State\n\n- execution_ready: true\n- execution_mode: `branch_in_place`\n- execution_branch: `{branch}`\n- execution_base_branch: `{base_branch}`\n- execution_repo_root: `{repo_root}`\n- execution_worktree_path: ``\n- execution_created_by_phase: `{created_by}`\n'''
if '## Execution State' in text:
    text = re.sub(r'## Execution State\n\n(?:- .*\n)+', block, text, count=1)
else:
    m = re.search(r'- current_command: .*?\n', text)
    if m:
        idx = m.end()
        text = text[:idx] + '\n' + block + text[idx:]
    else:
        text += '\n' + block
state_path.write_text(text, encoding='utf-8')
PY

cat <<OUT
execution_ready=true
execution_mode=branch_in_place
execution_branch=$branch
execution_base_branch=$BASE_BRANCH
execution_repo_root=$REPO_ROOT
execution_worktree_path=
execution_created_by_phase=$CREATED_BY_PHASE
OUT
