#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "01-filtergraph-core"

run_step "简单滤镜：缩放"
ffmpeg -y -hide_banner -loglevel error \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -t 3 \
  -vf "scale=640:-2" \
  -c:v libx264 -preset ultrafast -crf 28 \
  -c:a aac \
  "$OUT_DIR/01-simple-scale.mp4"
