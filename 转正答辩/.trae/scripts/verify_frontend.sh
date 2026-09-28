#!/usr/bin/env bash
set -euo pipefail
OUT=${1:-artifacts/verify-result.md}
mkdir -p "$(dirname "$OUT")"
: > "$OUT"
run_if_exists() {
  local name="$1"
  local cmd="$2"
  echo "## $name" >> "$OUT"
  if [ ! -f package.json ]; then
    echo "package.json not found" >> "$OUT"
    return 0
  fi
  if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$cmd'] ? 0 : 1)"; then
    echo "Running npm run $cmd" >> "$OUT"
    if npm run "$cmd" >> "$OUT" 2>&1; then
      echo "RESULT: PASS" >> "$OUT"
    else
      echo "RESULT: FAIL" >> "$OUT"
    fi
  else
    echo "RESULT: SKIP - script '$cmd' not configured" >> "$OUT"
  fi
  echo >> "$OUT"
}
run_if_exists "Lint" "lint"
run_if_exists "Typecheck" "typecheck"
run_if_exists "Test" "test"
run_if_exists "Build" "build"
echo "verification result written to $OUT"
