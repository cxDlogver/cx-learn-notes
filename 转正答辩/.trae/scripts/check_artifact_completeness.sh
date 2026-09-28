#!/usr/bin/env bash
set -euo pipefail

# Usage: .trae/scripts/check_artifact_completeness.sh <workspace>

WORKSPACE="${1:-}"
if [[ -z "$WORKSPACE" || ! -d "$WORKSPACE" ]]; then
  echo "Usage: $0 <workspace>" >&2
  exit 2
fi

REQUIRED=(
  prd-source.md
  00-inputs.md
  01-intake.md
  02-task-space.md
  03-prd-analysis.md
  04-tech-plan.md
  05-implementation-log.md
  06-debug-verification.md
  07-design-alignment.md
  08-acceptance-report.md
  repo-impact-map.md
  ui-source-map.md
  uncertainty-register.md
  omission-risk-scan.md
  decision-log.md
)

MISSING=0
for f in "${REQUIRED[@]}"; do
  if [[ ! -s "$WORKSPACE/$f" ]]; then
    echo "MISSING: $f" >&2
    MISSING=1
  fi
done

if grep -R "status: TEMPLATE_ONLY" "$WORKSPACE" >/dev/null 2>&1; then
  echo "WARN: some artifacts are still TEMPLATE_ONLY" >&2
fi

exit "$MISSING"
