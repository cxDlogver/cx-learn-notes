#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/08-advanced"

RTMP_URL=${1:-${RTMP_URL:-}}
if [ -z "$RTMP_URL" ]; then
  printf '用法：sh %s <rtmp-url>\n' "$0" >&2
  printf '也可以先设置 RTMP_URL 环境变量。\n' >&2
  exit 64
fi

run ffmpeg -y -hide_banner -i "$RTMP_URL" -c copy "outputs/08-advanced/live_record.mp4"
