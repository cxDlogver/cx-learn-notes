#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "01-filtergraph-core"
require_tool ffprobe

INPUT_FILE="$OUT_DIR/02-pip-overlay.mp4"

if [[ ! -f "$INPUT_FILE" ]]; then
  "$SCRIPT_DIR/02-pip-overlay.sh"
fi

run_step "ffprobe 查看滤镜输出流"
ffprobe -v error \
  -show_entries stream=index,codec_type,codec_name,width,height,pix_fmt \
  -of default=noprint_wrappers=1 \
  "$INPUT_FILE" | tee "$OUT_DIR/05-ffprobe-streams.txt"
