#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
if ! has_ffmpeg_filter "vidstabdetect"; then
  printf '跳过 vidstabdetect：当前 FFmpeg 未启用该滤镜。\n'
  exit 0
fi
run_step "vidstabdetect 分析抖动"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/motion_boxes_720p_30fps_10s.mp4" -t 3 -vf "vidstabdetect=shakiness=10:accuracy=15:result=${OUT_DIR}/transforms.trf" -f null -
