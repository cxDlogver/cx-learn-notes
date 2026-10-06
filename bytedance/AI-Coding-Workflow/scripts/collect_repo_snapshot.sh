#!/usr/bin/env bash
set -euo pipefail
OUT=${1:-artifacts/repo-snapshot.md}
mkdir -p "$(dirname "$OUT")"
{
  echo "# Repo Snapshot"
  echo
  echo "## Git"
  git status --short || true
  echo
  echo "## Branch"
  git branch --show-current || true
  echo
  echo "## Recent commits"
  git log --oneline -5 || true
  echo
  echo "## Package scripts"
  if [ -f package.json ]; then
    node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts||{}, null, 2))" || true
  else
    echo "package.json not found"
  fi
} > "$OUT"
echo "repo snapshot written to $OUT"
