#!/usr/bin/env bash
set -euo pipefail
OUT=${1:-artifacts/changed-files.md}
mkdir -p "$(dirname "$OUT")"
{
  echo "# Changed Files"
  echo
  git status --short || true
  echo
  echo "## Diff stat"
  git diff --stat || true
} > "$OUT"
echo "changed files written to $OUT"
