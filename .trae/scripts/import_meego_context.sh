#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <meego-context-dir> <artifacts-workspace>" >&2
  exit 2
fi

CONTEXT_SOURCE="$1"
WORKSPACE="$2"

if [ ! -d "$CONTEXT_SOURCE" ]; then
  echo "ERROR: context_source not found: $CONTEXT_SOURCE" >&2
  exit 1
fi

mkdir -p "$WORKSPACE"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REFERENCE_IMPORTER="$SCRIPT_DIR/copy_markdown_references.mjs"
if [ ! -f "$REFERENCE_IMPORTER" ]; then
  echo "ERROR: referenced-resource importer not found: $REFERENCE_IMPORTER" >&2
  exit 1
fi

IMPORTED_MARKDOWN_SOURCE_ENTRIES=()
PRD_SOURCE_RESOLUTION="context/prd-source.md"

is_template() {
  [ -f "$1" ] && grep -q "status: TEMPLATE_ONLY" "$1"
}

resolve_source_relative_path() {
  local target="$1"

  if [ "$target" = "prd-source.md" ]; then
    if [ -f "$CONTEXT_SOURCE/prd-source.md" ]; then
      printf '%s\n' "prd-source.md"
      return 0
    fi
    if [ -f "$CONTEXT_SOURCE/prd-raw.md" ]; then
      printf '%s\n' "prd-raw.md"
      return 0
    fi
    return 1
  fi

  if [ -f "$CONTEXT_SOURCE/$target" ]; then
    printf '%s\n' "$target"
    return 0
  fi

  return 1
}

copy_or_skip_file() {
  local target="$1"
  local src_rel=""
  local src=""
  local dst="$WORKSPACE/$target"

  if ! src_rel="$(resolve_source_relative_path "$target")"; then
    echo "missing_file:$target"
    return 0
  fi

  src="$CONTEXT_SOURCE/$src_rel"

  if [ ! -f "$dst" ] || is_template "$dst"; then
    cp "$src" "$dst"
    if [[ "$target" == *.md ]]; then
      IMPORTED_MARKDOWN_SOURCE_ENTRIES+=("$src_rel")
    fi
    if [ "$target" = "prd-source.md" ] && [ "$src_rel" = "prd-raw.md" ]; then
      PRD_SOURCE_RESOLUTION="context/prd-raw.md (legacy fallback imported as artifacts/prd-source.md)"
      echo "imported_compat_file:prd-source.md (from legacy prd-raw.md)"
    else
      echo "imported_file:$target"
    fi
    return 0
  fi

  if [ "$target" = "prd-source.md" ] && [ "$src_rel" = "prd-raw.md" ]; then
    PRD_SOURCE_RESOLUTION="context/prd-raw.md (legacy fallback available, existing artifacts/prd-source.md preserved)"
  fi

  echo "skipped_existing_file:$target"
}

IMPORT_RESULT="$(mktemp)"
trap 'rm -f "$IMPORT_RESULT"' EXIT
{
  copy_or_skip_file "prd-source.md"
  copy_or_skip_file "meego-summary.md"
  copy_or_skip_file "repo-routing.md"
  copy_or_skip_file "tech-doc-raw.md"
  copy_or_skip_file "prd-summary.md"
  copy_or_skip_file "prd-notes.md"
  copy_or_skip_file "tech-design.md"
  copy_or_skip_file "change-plan.md"

  if [ "${#IMPORTED_MARKDOWN_SOURCE_ENTRIES[@]}" -gt 0 ]; then
    importer_args=(--source "$CONTEXT_SOURCE" --dest "$WORKSPACE")
    for markdown in "${IMPORTED_MARKDOWN_SOURCE_ENTRIES[@]}"; do
      importer_args+=(--entry "$markdown")
    done
    node "$REFERENCE_IMPORTER" "${importer_args[@]}"
  fi

  echo "skipped_unreferenced_intermediates:all files outside imported Markdown reference closure"
} > "$IMPORT_RESULT"

timestamp="$(date '+%Y-%m-%d %H:%M:%S %z')"

{
  echo
  echo "## Meego Context Import"
  echo
  echo "- imported_at: \`$timestamp\`"
  echo "- context_source: \`$CONTEXT_SOURCE\`"
  echo "- artifacts_workspace: \`$WORKSPACE\`"
  echo
  echo "| Result | Item |"
  echo "| --- | --- |"
  sed -E 's/^([^:]+):(.*)$/| `\1` | `\2` |/' "$IMPORT_RESULT"
} >> "$WORKSPACE/02-task-space.md"

{
  echo
  echo "## Imported Context Sources"
  echo
  echo "- imported_at: \`$timestamp\`"
  echo "- context_source: \`$CONTEXT_SOURCE\`"
  echo "- artifacts_workspace: \`$WORKSPACE\`"
  echo "- import_rule: \`same-name artifacts files plus referenced-resource closure\`"
  echo "- prd_source_priority: \`context/prd-source.md -> context/prd-raw.md legacy fallback\`"
  echo "- prd_source_resolution: \`$PRD_SOURCE_RESOLUTION\`"
  echo "- repo_routing_source: \`context/repo-routing.md\`"
  if [ -f "$CONTEXT_SOURCE/tech-doc-raw.md" ]; then
    echo "- backend_tech_doc: \`imported from context/tech-doc-raw.md\`"
  else
    echo "- backend_tech_doc: \`missing in context_source\`"
  fi
  resource_files="$(sed -n 's/^imported_resource://p' "$IMPORT_RESULT" | sort | tr '\n' ' ')"
  referenced_resource_files="$(sed -n -E 's/^(imported_resource|skipped_existing_resource)://p' "$IMPORT_RESULT" | sort -u | tr '\n' ' ')"
  echo "- imported_resource_files: \`${resource_files:-none}\`"
  echo "- referenced_resource_files: \`${referenced_resource_files:-none}\`"
  echo "- unreferenced_intermediates: \`not imported\`"
} >> "$WORKSPACE/00-inputs.md"

cat "$IMPORT_RESULT"
