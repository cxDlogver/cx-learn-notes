#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "03-complex-media-practice"

run_step "编码器参数优化组合"
ffmpeg -y -hide_banner -loglevel error \
  -filter_threads 4 \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -t 5 \
  -vf "scale=1280:-2,format=yuv420p" \
  -r 30 \
  -c:v libx264 -preset ultrafast -crf 28 -g 60 \
  -an \
  "$OUT_DIR/04-encoder-optimized.mp4"
