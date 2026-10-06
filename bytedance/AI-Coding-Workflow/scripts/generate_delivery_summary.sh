#!/usr/bin/env bash
set -euo pipefail
TASK_DIR=${1:-}
if [ -z "$TASK_DIR" ] || [ ! -d "$TASK_DIR" ]; then
  echo "usage: $0 artifacts/<task-dir>" >&2
  exit 1
fi
OUT="$TASK_DIR/delivery-summary.md"
{
  echo "# Delivery Summary"
  echo
  for f in 03-prd-analysis.md 04-tech-plan.md 05-implementation-log.md 06-debug-verification.md 07-design-alignment.md 08-acceptance-report.md; do
    echo "## $f"
    if [ -f "$TASK_DIR/$f" ]; then
      sed -n '1,120p' "$TASK_DIR/$f"
    else
      echo "missing"
    fi
    echo
  done
} > "$OUT"
echo "delivery summary written to $OUT"
