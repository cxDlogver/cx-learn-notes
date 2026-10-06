#!/usr/bin/env bash
set -euo pipefail

ROOT="$(mktemp -d)"
trap 'rm -rf "$ROOT"' EXIT

CONTEXT="$ROOT/context"
WORKSPACE="$ROOT/artifacts"
mkdir -p \
  "$CONTEXT/prd-source/media" \
  "$CONTEXT/prd-source/whiteboards" \
  "$CONTEXT/prd-source/nodes" \
  "$CONTEXT/prd-source/raw" \
  "$CONTEXT/prd-source/logs"

printf '%s\n' \
  '# PRD' \
  '![used](./prd-source/media/used.png)' \
  '[analysis](./prd-source/whiteboards/analysis.md)' \
  '[external](https://example.com/doc)' \
  > "$CONTEXT/prd-source.md"
printf '%s\n' \
  '# Whiteboard analysis' \
  '[nodes](../nodes/used.json)' \
  '![nested](../media/nested.png)' \
  > "$CONTEXT/prd-source/whiteboards/analysis.md"

printf 'used' > "$CONTEXT/prd-source/media/used.png"
printf 'nested' > "$CONTEXT/prd-source/media/nested.png"
printf '{"used":true}\n' > "$CONTEXT/prd-source/nodes/used.json"
printf 'unused' > "$CONTEXT/prd-source/media/unused.png"
printf '{"intermediate":true}\n' > "$CONTEXT/prd-source/raw/fetch.json"
printf 'log' > "$CONTEXT/prd-source/logs/fetch.log"

OUTPUT="$ROOT/import.log"
"$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/import_meego_context.sh" \
  "$CONTEXT" \
  "$WORKSPACE" \
  > "$OUTPUT"

for expected in \
  "prd-source.md" \
  "prd-source/media/used.png" \
  "prd-source/media/nested.png" \
  "prd-source/whiteboards/analysis.md" \
  "prd-source/nodes/used.json"
do
  test -f "$WORKSPACE/$expected" || { echo "missing imported file: $expected" >&2; exit 1; }
done

for forbidden in \
  "prd-source/media/unused.png" \
  "prd-source/raw/fetch.json" \
  "prd-source/logs/fetch.log"
do
  test ! -e "$WORKSPACE/$forbidden" || { echo "unexpected unreferenced import: $forbidden" >&2; exit 1; }
done

grep -q 'imported_resource:prd-source/media/used.png' "$OUTPUT"
grep -q 'imported_resource:prd-source/whiteboards/analysis.md' "$OUTPUT"
grep -q 'skipped_unreferenced_intermediates:' "$OUTPUT"
grep -q 'imported_resource_files:' "$WORKSPACE/00-inputs.md"
grep -q 'referenced_resource_files:' "$WORKSPACE/00-inputs.md"

LEGACY_CONTEXT="$ROOT/legacy-context"
LEGACY_WORKSPACE="$ROOT/legacy-artifacts"
mkdir -p "$LEGACY_CONTEXT/prd-raw/media"
printf '%s\n' '# Legacy PRD' '![legacy](./prd-raw/media/legacy.png)' > "$LEGACY_CONTEXT/prd-raw.md"
printf 'legacy' > "$LEGACY_CONTEXT/prd-raw/media/legacy.png"

"$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/import_meego_context.sh" \
  "$LEGACY_CONTEXT" \
  "$LEGACY_WORKSPACE" \
  > "$ROOT/legacy.log"

test -f "$LEGACY_WORKSPACE/prd-source.md" || { echo "legacy prd-raw fallback should produce prd-source.md" >&2; exit 1; }
test -f "$LEGACY_WORKSPACE/prd-raw/media/legacy.png" || { echo "legacy referenced resources should be imported" >&2; exit 1; }
grep -q 'imported_compat_file:prd-source.md (from legacy prd-raw.md)' "$ROOT/legacy.log"
grep -q 'prd_source_resolution: `context/prd-raw.md (legacy fallback imported as artifacts/prd-source.md)`' "$LEGACY_WORKSPACE/00-inputs.md"

printf '%s\n' '# Broken' '![missing](./prd-source/media/missing.png)' > "$CONTEXT/broken.md"
set +e
node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/copy_markdown_references.mjs" \
  --source "$CONTEXT" \
  --dest "$WORKSPACE" \
  --entry broken.md \
  > "$ROOT/broken.out" \
  2> "$ROOT/broken.err"
broken_status=$?
set -e
test "$broken_status" -ne 0 || { echo "missing local reference should fail import" >&2; exit 1; }
grep -q 'missing_referenced_resource:prd-source/media/missing.png' "$ROOT/broken.err"

echo "import_meego_context referenced-resource test passed"
