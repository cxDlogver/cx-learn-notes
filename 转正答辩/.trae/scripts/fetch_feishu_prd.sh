#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   .trae/scripts/fetch_feishu_prd.sh <doc_url_or_token> <output_path>
# Purpose:
#   Fetch Feishu/Lark doc content through bytedcli and save as UTF-8 markdown.

DOC_INPUT="${1:-}"
OUTPUT_PATH="${2:-}"

if [[ -z "$DOC_INPUT" || -z "$OUTPUT_PATH" ]]; then
  echo "Usage: $0 <doc_url_or_token> <output_path>" >&2
  exit 2
fi

TOKEN="$DOC_INPUT"
if [[ "$DOC_INPUT" =~ /docx/([^/?#]+) ]]; then
  TOKEN="${BASH_REMATCH[1]}"
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"
TMP_JSON="${OUTPUT_PATH}.tmp.json"

NPM_CONFIG_REGISTRY="${NPM_CONFIG_REGISTRY:-http://bnpm.byted.org}" \
  npx -y @bytedance-dev/bytedcli@latest --json feishu docs fetch-doc "$TOKEN" > "$TMP_JSON"

python3 - "$TMP_JSON" "$OUTPUT_PATH" "$DOC_INPUT" <<'PY'
# -*- coding: utf-8 -*-
import json
import pathlib
import sys

json_path = pathlib.Path(sys.argv[1])
out_path = pathlib.Path(sys.argv[2])
source = sys.argv[3]

raw = json.loads(json_path.read_text(encoding='utf-8'))
data = raw.get('data', {})
output = data.get('output', data)

title = output.get('title') or output.get('name') or 'PRD Source'
content = output.get('content') or output.get('markdown') or output.get('text') or ''
if not content.strip():
    raise SystemExit('empty document content')

text = f"# {title}\n\nSource: {source}\n\n{content}\n"
out_path.write_text(text, encoding='utf-8')
print(str(out_path))
PY

rm -f "$TMP_JSON"
