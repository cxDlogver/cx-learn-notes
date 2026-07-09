#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for example_script in "$SCRIPT_DIR"/examples/*.sh; do
  "$example_script"
done

printf '\n完成。输出目录：outputs/scripts/01-filtergraph-core\n'
