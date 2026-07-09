#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "01-filtergraph-core"

run_step "null 输出：只验证复杂滤镜语法"
ffmpeg -hide_banner -loglevel error \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -i "materials/video/alpha_overlay_source_512x512_30fps_6s.mov" \
  -t 1 \
  -filter_complex "[0:v]scale=960:540[bg];[1:v]scale=180:180[pip];[bg][pip]overlay=W-w-10:H-h-10[out_v]" \
  -map "[out_v]" \
  -f null -
