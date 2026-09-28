#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
FETCH_SCRIPT="${SKILL_DIR}/scripts/fetch-whiteboard-nodes.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

FAKE_CLI="${TMP_DIR}/feishu-lark"
OUTPUT_JSON="${TMP_DIR}/nodes.json"

cat >"${FAKE_CLI}" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ "${FAKE_MODE:-valid}" == "truncated" ]]; then
  printf '{"action":"list_nodes","data":{"nodes":['
  exit 0
fi

node -e '
const nodes = Array.from({ length: 180 }, (_, index) => ({
  id: `node-${index}`,
  type: "text_shape",
  text: { text: "超过 12KB 的白板节点输出，用于验证流式落盘不会被截断。" },
  x: index * 10,
  y: index * 5,
  width: 320,
  height: 80
}));
process.stdout.write(JSON.stringify({ action: "list_nodes", data: { nodes } }));
'
EOF
chmod +x "${FAKE_CLI}"

FEISHU_LARK_BIN="${FAKE_CLI}" "${FETCH_SCRIPT}" "whiteboard-token" "${OUTPUT_JSON}"

node -e '
const fs = require("fs");
const file = process.argv[1];
const stat = fs.statSync(file);
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
if (stat.size <= 12000) throw new Error(`expected > 12000 bytes, got ${stat.size}`);
if (parsed.data.nodes.length !== 180) throw new Error("node count mismatch");
' "${OUTPUT_JSON}"

printf '{"preserved":true}\n' >"${OUTPUT_JSON}"

if FAKE_MODE=truncated FEISHU_LARK_BIN="${FAKE_CLI}" \
  "${FETCH_SCRIPT}" "whiteboard-token" "${OUTPUT_JSON}"; then
  echo "expected truncated JSON to fail" >&2
  exit 1
fi

node -e '
const fs = require("fs");
const parsed = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (parsed.preserved !== true) throw new Error("invalid output replaced the existing file");
' "${OUTPUT_JSON}"

echo "fetch-whiteboard-nodes tests passed"
