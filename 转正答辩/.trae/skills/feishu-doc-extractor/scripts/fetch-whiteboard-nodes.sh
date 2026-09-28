#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Usage: $0 <whiteboard-token> <output-json>" >&2
}

if [[ $# -ne 2 ]]; then
  usage
  exit 2
fi

whiteboard_token="$1"
output_json="$2"
cli="${FEISHU_LARK_BIN:-feishu-lark}"
output_dir="$(dirname "${output_json}")"
output_name="$(basename "${output_json}")"

mkdir -p "${output_dir}"

raw_file="$(mktemp "${output_dir}/.${output_name}.raw.XXXXXX")"
validated_file="$(mktemp "${output_dir}/.${output_name}.validated.XXXXXX")"
cleanup() {
  rm -f "${raw_file}" "${validated_file}"
}
trap cleanup EXIT

payload="$(jq -cn --arg whiteboard "${whiteboard_token}" \
  '{action:"list_nodes", whiteboard:$whiteboard}')"

# Keep stdout file-backed. Do not capture this command through Node
# child_process.execSync/execFileSync; large responses may be truncated.
"${cli}" call feishu_whiteboard "${payload}" >"${raw_file}"

if ! jq . "${raw_file}" >"${validated_file}"; then
  echo "Invalid or truncated whiteboard JSON for ${whiteboard_token}; existing output was preserved." >&2
  exit 1
fi

node_count="$(jq '(.data.nodes // .nodes // []) | length' "${validated_file}")"
if [[ "${node_count}" -le 0 ]]; then
  echo "Whiteboard ${whiteboard_token} returned no nodes; existing output was preserved." >&2
  exit 1
fi

mv -f "${validated_file}" "${output_json}"
echo "Saved ${node_count} nodes to ${output_json}"
