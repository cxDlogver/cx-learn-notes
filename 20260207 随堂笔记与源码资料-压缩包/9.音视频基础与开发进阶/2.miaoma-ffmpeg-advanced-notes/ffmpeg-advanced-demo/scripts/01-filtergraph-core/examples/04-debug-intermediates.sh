#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "01-filtergraph-core"

run_step "输出中间结果：bg、pip、final"
ffmpeg -y -hide_banner -loglevel error \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -i "materials/video/alpha_overlay_source_512x512_30fps_6s.mov" \
  -t 3 \
  -filter_complex "[0:v]scale=960:540,split=2[bg_for_overlay][bg_debug];[1:v]scale=180:180,split=2[pip_for_overlay][pip_debug];[bg_for_overlay][pip_for_overlay]overlay=10:10[out_v]" \
  -map "[bg_debug]" -an -c:v libx264 -preset ultrafast -crf 28 "$OUT_DIR/04-debug-bg.mp4" \
  -map "[pip_debug]" -an -c:v libx264 -preset ultrafast -crf 28 "$OUT_DIR/04-debug-pip.mp4" \
  -map "[out_v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 28 -c:a aac "$OUT_DIR/04-debug-final.mp4"
