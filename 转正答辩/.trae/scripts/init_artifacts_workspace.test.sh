#!/usr/bin/env bash
set -euo pipefail

ROOT="$(mktemp -d)"
trap 'rm -rf "$ROOT"' EXIT

WORKSPACE="$ROOT/artifacts/example-task"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$SCRIPT_DIR/init_artifacts_workspace.sh"

OUTPUT_1="$ROOT/output-1.log"
"$SCRIPT" "$WORKSPACE" > "$OUTPUT_1"

for expected in \
  "prd-source.md" \
  "00-inputs.md" \
  "01-intake.md" \
  "02-task-space.md" \
  "03-prd-analysis.md" \
  "04-tech-plan.md" \
  "05-implementation-log.md" \
  "06-debug-verification.md" \
  "07-design-alignment.md" \
  "08-acceptance-report.md" \
  "ui-source-map.md" \
  "uncertainty-register.md" \
  "omission-risk-scan.md" \
  "decision-log.md"
do
  test -f "$WORKSPACE/$expected" || { echo "missing initialized file: $expected" >&2; exit 1; }
done

grep -q 'status: TEMPLATE_ONLY' "$WORKSPACE/prd-source.md"
grep -q 'created_file:prd-source.md' "$OUTPUT_1"

printf '%s\n' 'manual-preserve-check' >> "$WORKSPACE/00-inputs.md"
OUTPUT_2="$ROOT/output-2.log"
"$SCRIPT" "$WORKSPACE" > "$OUTPUT_2"

grep -q 'skipped_existing_file:00-inputs.md' "$OUTPUT_2"
grep -q 'manual-preserve-check' "$WORKSPACE/00-inputs.md"

echo "init_artifacts_workspace template init test passed"
