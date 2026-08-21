#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  .trae/scripts/delivery_stage_rewind.sh <prd|bam|plan|mock|task> [--workspace <path>] [--dry-run]
  .trae/scripts/delivery_stage_rewind.sh --to <prd|bam|plan|mock|task> [--workspace <path>] [--dry-run]

Purpose:
  Snapshot the active delivery workspace, move target-stage-and-later artifacts
  out of the active workspace, and reset .trae/DELIVERY_STATE.md for clean replay.

Supported targets:
  prd   rewind to before PRD; next command is /delivery:prd
  bam   rewind to before BAM; keep PRD artifacts; next command is /delivery:bam
  plan  rewind to before Plan; keep PRD artifacts; next command is /delivery:plan
  mock  rewind to before Mock; keep PRD/BAM/Plan artifacts; next command is /delivery:mock
  task  rewind to before Task; keep PRD/BAM/Plan artifacts and existing Mock artifacts if present; next command is /delivery:task
USAGE
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
STATE_FILE="$ROOT/DELIVERY_STATE.md"
TARGET=""
WORKSPACE=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --to)
      TARGET="${2:-}"
      shift 2
      ;;
    --workspace)
      WORKSPACE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    prd|bam|plan|mock|task)
      if [[ -n "$TARGET" ]]; then
        echo "ERROR: target specified more than once: $TARGET and $1" >&2
        usage >&2
        exit 2
      fi
      TARGET="$1"
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

if [[ -z "$TARGET" ]]; then
  echo "ERROR: missing --to <phase>" >&2
  usage >&2
  exit 2
fi

if [[ "$TARGET" != "prd" && "$TARGET" != "bam" && "$TARGET" != "plan" && "$TARGET" != "mock" && "$TARGET" != "task" ]]; then
  echo "ERROR: unsupported target: $TARGET. Supported targets: prd, bam, plan, mock, task." >&2
  exit 2
fi

if [[ ! -d "$ROOT/.git" ]]; then
  echo "ERROR: .trae/.git is missing. Refuse to rewind because workflow git history must be preserved." >&2
  exit 2
fi

if [[ ! -s "$STATE_FILE" ]]; then
  echo "ERROR: missing DELIVERY_STATE.md: $STATE_FILE" >&2
  exit 2
fi

if [[ -z "$WORKSPACE" ]]; then
  WORKSPACE="$(grep -m1 '^- workspace：' "$STATE_FILE" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
fi

if [[ -z "$WORKSPACE" || ! -d "$WORKSPACE" ]]; then
  echo "ERROR: workspace not found. Parsed workspace: ${WORKSPACE:-<empty>}" >&2
  exit 2
fi

WORKSPACE_NAME="$(basename "$WORKSPACE")"
SNAPSHOT_BASE="$REPO_ROOT/artifacts/_rewind-snapshots/$WORKSPACE_NAME"

REQUIRED_INPUTS=(
  "prd-source.md"
  "00-inputs.md"
)

PLAN_CORE_ARTIFACTS=(
  "03-prd-analysis.md"
  "uncertainty-register.md"
  "ui-source-map.md"
  "decision-log.md"
)

PRD_STAGE_PRESERVE_ARTIFACTS=(
  "03-prd-analysis.md"
  "uncertainty-register.md"
  "ui-source-map.md"
  "decision-log.md"
  "figma-evidence-pack.md"
  "prd-figma-supplement.md"
  "figma-cache"
  "supplement-sources"
)

BAM_STAGE_PRESERVE_ARTIFACTS=(
  "${PRD_STAGE_PRESERVE_ARTIFACTS[@]}"
  "bam"
)

PLAN_STAGE_PRESERVE_ARTIFACTS=(
  "${BAM_STAGE_PRESERVE_ARTIFACTS[@]}"
  "04-tech-plan.md"
)

MOCK_STAGE_PRESERVE_ARTIFACTS=(
  "${PLAN_STAGE_PRESERVE_ARTIFACTS[@]}"
  "delivery-mock.md"
  "mock"
)

PLAN_RECOVERABLE_ARTIFACTS=(
  "${PRD_STAGE_PRESERVE_ARTIFACTS[@]}"
  "bam"
)

PLAN_RECOVERY_SOURCE=""
PLAN_RECOVERED_FILES=()
PLAN_MISSING_CORE=()

find_plan_recovery_source() {
  local snapshot_dir candidate required
  [[ -d "$SNAPSHOT_BASE" ]] || return 1

  while IFS= read -r snapshot_dir; do
    for candidate in "$snapshot_dir/full-workspace" "$snapshot_dir/stale-artifacts"; do
      [[ -d "$candidate" ]] || continue
      local ok=1
      for required in "${PLAN_MISSING_CORE[@]}"; do
        if [[ ! -e "$candidate/$required" ]]; then
          ok=0
          break
        fi
      done
      if [[ "$ok" -eq 1 ]]; then
        PLAN_RECOVERY_SOURCE="$candidate"
        return 0
      fi
    done
  done < <(find "$SNAPSHOT_BASE" -mindepth 1 -maxdepth 1 -type d -print | sort -r)

  return 1
}

recover_plan_artifacts_from_snapshot() {
  local artifact
  for artifact in "${PLAN_RECOVERABLE_ARTIFACTS[@]}"; do
    if [[ ! -e "$WORKSPACE/$artifact" && -e "$PLAN_RECOVERY_SOURCE/$artifact" ]]; then
      if [[ "$DRY_RUN" -eq 0 ]]; then
        cp -R "$PLAN_RECOVERY_SOURCE/$artifact" "$WORKSPACE/$artifact"
      fi
      PLAN_RECOVERED_FILES+=("$artifact")
    fi
  done
}

if [[ "$TARGET" == "bam" || "$TARGET" == "plan" || "$TARGET" == "mock" || "$TARGET" == "task" ]]; then
  REQUIRED_INPUTS+=("${PLAN_CORE_ARTIFACTS[@]}")
fi

if [[ "$TARGET" == "mock" || "$TARGET" == "task" ]]; then
  REQUIRED_INPUTS+=("04-tech-plan.md")
fi

if [[ "$TARGET" == "plan" || "$TARGET" == "mock" || "$TARGET" == "task" ]]; then
  for required in "${PLAN_CORE_ARTIFACTS[@]}"; do
    if [[ ! -s "$WORKSPACE/$required" ]]; then
      PLAN_MISSING_CORE+=("$required")
    fi
  done

  if [[ "${#PLAN_MISSING_CORE[@]}" -gt 0 ]]; then
    if find_plan_recovery_source; then
      recover_plan_artifacts_from_snapshot
    else
      echo "ERROR: required input for target '$TARGET' missing: $WORKSPACE/${PLAN_MISSING_CORE[0]}; no usable rewind snapshot found under $SNAPSHOT_BASE" >&2
      exit 2
    fi
  fi
fi

for required in "${REQUIRED_INPUTS[@]}"; do
  if [[ ! -s "$WORKSPACE/$required" ]]; then
    if [[ "$TARGET" == "plan" && "$DRY_RUN" -eq 1 && -n "$PLAN_RECOVERY_SOURCE" && -s "$PLAN_RECOVERY_SOURCE/$required" ]]; then
      continue
    fi
    echo "ERROR: required input for target '$TARGET' missing: $WORKSPACE/$required" >&2
    exit 2
  fi
done

PRESERVE=(
  "prd-source.md"
  "00-inputs.md"
  "01-intake.md"
  "02-task-space.md"
  "meego-summary.md"
  "repo-routing.md"
  "tech-doc-raw.md"
  "prd-source"
  "prd-source.assets"
  "tech-doc-raw"
  "tech-doc-raw.assets"
  "stage1-source-supplement.md"
)

if [[ "$TARGET" == "bam" ]]; then
  PRESERVE+=("${PRD_STAGE_PRESERVE_ARTIFACTS[@]}")
elif [[ "$TARGET" == "plan" ]]; then
  PRESERVE+=("${BAM_STAGE_PRESERVE_ARTIFACTS[@]}")
elif [[ "$TARGET" == "mock" ]]; then
  PRESERVE+=("${PLAN_STAGE_PRESERVE_ARTIFACTS[@]}")
elif [[ "$TARGET" == "task" ]]; then
  PRESERVE+=("${MOCK_STAGE_PRESERVE_ARTIFACTS[@]}")
fi

is_preserved() {
  local name="$1"
  local item
  for item in "${PRESERVE[@]}"; do
    [[ "$name" == "$item" ]] && return 0
  done
  return 1
}

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SNAPSHOT_ROOT="$REPO_ROOT/artifacts/_rewind-snapshots/$WORKSPACE_NAME/${TIMESTAMP}-to-$TARGET"
FULL_SNAPSHOT="$SNAPSHOT_ROOT/full-workspace"
STALE_DIR="$SNAPSHOT_ROOT/stale-artifacts"
STATE_BACKUP="$SNAPSHOT_ROOT/DELIVERY_STATE.before-rewind.md"
LOG_FILE="$WORKSPACE/rewind-log.md"

STALE_FILES=()
PRESERVED_FILES=()

while IFS= read -r path; do
  name="$(basename "$path")"
  if is_preserved "$name"; then
    PRESERVED_FILES+=("$name")
  else
    STALE_FILES+=("$name")
  fi
done < <(find "$WORKSPACE" -mindepth 1 -maxdepth 1 -print | sort)

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "DRY_RUN: would rewind to: $TARGET"
  echo "DRY_RUN: workspace: $WORKSPACE"
  echo "DRY_RUN: snapshot: $SNAPSHOT_ROOT"
  if [[ -n "$PLAN_RECOVERY_SOURCE" ]]; then
    echo "DRY_RUN: recover_from: $PLAN_RECOVERY_SOURCE"
    echo "DRY_RUN: recover_files: ${PLAN_RECOVERED_FILES[*]:-<none>}"
  fi
  echo "DRY_RUN: preserve: ${PRESERVED_FILES[*]:-<none>}"
  echo "DRY_RUN: move stale: ${STALE_FILES[*]:-<none>}"
  exit 0
fi

mkdir -p "$FULL_SNAPSHOT" "$STALE_DIR"
cp -R "$WORKSPACE"/. "$FULL_SNAPSHOT"/
cp "$STATE_FILE" "$STATE_BACKUP"

for name in "${STALE_FILES[@]}"; do
  mv "$WORKSPACE/$name" "$STALE_DIR/$name"
done

cat > "$LOG_FILE" <<EOF
# Delivery Stage Rewind Log

- target_phase: $TARGET
- workspace: \`$WORKSPACE\`
- snapshot_root: \`$SNAPSHOT_ROOT\`
- full_workspace_snapshot: \`$FULL_SNAPSHOT\`
- stale_artifacts: \`$STALE_DIR\`
- state_backup: \`$STATE_BACKUP\`
- created_at: \`$TIMESTAMP\`
$(if [[ -n "$PLAN_RECOVERY_SOURCE" ]]; then cat <<RECOVERY
- recovered_from: \`$PLAN_RECOVERY_SOURCE\`

## Recovered Before Rewind

$(printf -- '- `%s`\n' "${PLAN_RECOVERED_FILES[@]}")
RECOVERY
fi)

## Preserved Files

$(printf -- '- `%s`\n' "${PRESERVED_FILES[@]}")

## Moved To Stale Artifacts

$(if [[ "${#STALE_FILES[@]}" -eq 0 ]]; then echo "- `<none>`"; else printf -- '- `%s`\n' "${STALE_FILES[@]}"; fi)

## Next Command

\`/delivery:$TARGET\`
EOF

perl -pi -e "s/^- current_phase：.*$/- current_phase：$TARGET/" "$STATE_FILE"
perl -pi -e "s#^- current_command：.*\$#- current_command：/delivery:$TARGET#" "$STATE_FILE"
perl -pi -e "s/^- updated_at：.*$/- updated_at：\`$TIMESTAMP rewind to $TARGET\`/" "$STATE_FILE"
perl -pi -e "s#^- 当前动作：.*\$#- 当前动作：\`已回退到 /delivery:$TARGET 前，等待重跑 /delivery:$TARGET\`#" "$STATE_FILE"
perl -pi -e "s#^- next_command：.*\$#- next_command：\`/delivery:$TARGET\`#" "$STATE_FILE"
perl -pi -e 's/^- is_paused：.*$/- is_paused：false/' "$STATE_FILE"
perl -pi -e "s/^- paused_phase：.*$/- paused_phase：\`$TARGET\`/" "$STATE_FILE"
perl -pi -e "s#^- paused_reason：.*\$#- paused_reason：\`rewound for clean /delivery:$TARGET replay\`#" "$STATE_FILE"
perl -pi -e 's/^- waiting_for_user：.*$/- waiting_for_user：`无`/' "$STATE_FILE"
perl -pi -e "s#^- resume_command：.*\$#- resume_command：\`/delivery:$TARGET\`#" "$STATE_FILE"
perl -pi -e 's/^- last_question_to_user：.*$/- last_question_to_user：`无`/' "$STATE_FILE"

if [[ "$TARGET" == "prd" ]]; then
  perl -pi -e 's#^\| PRD 解析 \| /delivery:prd \| .*$#| PRD 解析 | /delivery:prd | PENDING | 03-prd-analysis.md, ui-source-map.md, uncertainty-register.md, decision-log.md | 等待重跑 /delivery:prd |#' "$STATE_FILE"
  perl -pi -e 's#^\| 技术规划 \| /delivery:plan \| .*$#| 技术规划 | /delivery:plan | STALE | 04-tech-plan.md | 已回退到 /delivery:prd 前，旧产物移入 snapshot |#' "$STATE_FILE"
elif [[ "$TARGET" == "bam" ]]; then
  perl -pi -e 's#^\| PRD 解析 \| /delivery:prd \| .*$#| PRD 解析 | /delivery:prd | DONE | 03-prd-analysis.md, ui-source-map.md, uncertainty-register.md, decision-log.md | 可进入 /delivery:bam |#' "$STATE_FILE"
  perl -pi -e 's#^\| 技术规划 \| /delivery:plan \| .*$#| 技术规划 | /delivery:plan | STALE | 04-tech-plan.md | 等待 /delivery:bam 完成后重跑 /delivery:plan |#' "$STATE_FILE"
elif [[ "$TARGET" == "plan" ]]; then
  perl -pi -e 's#^\| PRD 解析 \| /delivery:prd \| .*$#| PRD 解析 | /delivery:prd | DONE | 03-prd-analysis.md, ui-source-map.md, uncertainty-register.md, decision-log.md | 可进入 /delivery:plan |#' "$STATE_FILE"
  perl -pi -e 's#^\| 技术规划 \| /delivery:plan \| .*$#| 技术规划 | /delivery:plan | PENDING | 04-tech-plan.md | 等待重跑 /delivery:plan |#' "$STATE_FILE"
elif [[ "$TARGET" == "mock" ]]; then
  perl -pi -e 's#^\| PRD 解析 \| /delivery:prd \| .*$#| PRD 解析 | /delivery:prd | DONE | 03-prd-analysis.md, ui-source-map.md, uncertainty-register.md, decision-log.md | 可进入 /delivery:plan |#' "$STATE_FILE"
  perl -pi -e 's#^\| 技术规划 \| /delivery:plan \| .*$#| 技术规划 | /delivery:plan | DONE | 04-tech-plan.md | 可进入 /delivery:mock |#' "$STATE_FILE"
  perl -pi -e 's#^\| BAM Mock \| /delivery:mock \| .*$#| BAM Mock | /delivery:mock | PENDING | delivery-mock.md, mock/ | 等待重跑 /delivery:mock |#' "$STATE_FILE"
elif [[ "$TARGET" == "task" ]]; then
  perl -pi -e 's#^\| PRD 解析 \| /delivery:prd \| .*$#| PRD 解析 | /delivery:prd | DONE | 03-prd-analysis.md, ui-source-map.md, uncertainty-register.md, decision-log.md | 可进入 /delivery:plan |#' "$STATE_FILE"
  perl -pi -e 's#^\| 技术规划 \| /delivery:plan \| .*$#| 技术规划 | /delivery:plan | DONE | 04-tech-plan.md | 可进入 /delivery:task |#' "$STATE_FILE"
  perl -pi -e 's#^\| 任务规划 \| /delivery:task \| .*$#| 任务规划 | /delivery:task | PENDING | delivery-task.md, 09-test-case-matrix.md | 等待重跑 /delivery:task |#' "$STATE_FILE"
fi
perl -pi -e 's#^\| 代码实现 \| /delivery:code \| .*$#| 代码实现 | /delivery:code | STALE | 05-implementation-log.md | 等待 PRD 与 Plan 重新完成 |#' "$STATE_FILE"
perl -pi -e 's#^\| 调试验证 \| /delivery:verify \| .*$#| 调试验证 | /delivery:verify | STALE | 06-debug-verification.md | 等待 Code Gate |#' "$STATE_FILE"
perl -pi -e 's#^\| 设计稿对齐 \| /delivery:design \| .*$#| 设计稿对齐 | /delivery:design | STALE | 07-design-alignment.md | 等待 Verify Gate |#' "$STATE_FILE"
perl -pi -e 's#^\| 交付验收 \| /delivery:accept \| .*$#| 交付验收 | /delivery:accept | STALE | 08-acceptance-report.md | 等待 Design Gate |#' "$STATE_FILE"

if [[ ! -d "$ROOT/.git" ]]; then
  echo "ERROR: .trae/.git missing after rewind; state may be unsafe." >&2
  exit 1
fi

if ! grep -q "^- current_phase：$TARGET$" "$STATE_FILE"; then
  echo "ERROR: failed to update current_phase to $TARGET" >&2
  exit 1
fi

if ! grep -q '^- is_paused：false$' "$STATE_FILE"; then
  echo "ERROR: failed to clear Pause State" >&2
  exit 1
fi

echo "REWIND_OK"
echo "target_phase=$TARGET"
echo "workspace=$WORKSPACE"
echo "snapshot=$SNAPSHOT_ROOT"
if [[ -n "$PLAN_RECOVERY_SOURCE" ]]; then
  echo "recovered_from=$PLAN_RECOVERY_SOURCE"
  echo "recovered=${PLAN_RECOVERED_FILES[*]:-<none>}"
fi
echo "preserved=${PRESERVED_FILES[*]:-<none>}"
echo "stale=${STALE_FILES[*]:-<none>}"
echo "next=/delivery:$TARGET"
