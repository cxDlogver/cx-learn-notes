#!/usr/bin/env bash
set -euo pipefail
OUT=${1:-artifacts/debug-code-scan.md}
mkdir -p "$(dirname "$OUT")"
PATTERN='console\.log|debugger|TODO_DELETE|TEMP_MOCK|USE_MOCK\s*=\s*true|\.only\('
{
  echo "# Debug Code Scan"
  echo
  if git grep -nE "$PATTERN" -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.md' 2>/dev/null; then
    echo
    echo "RESULT: FOUND"
  else
    echo "RESULT: PASS"
  fi
} > "$OUT"
echo "debug code scan written to $OUT"
