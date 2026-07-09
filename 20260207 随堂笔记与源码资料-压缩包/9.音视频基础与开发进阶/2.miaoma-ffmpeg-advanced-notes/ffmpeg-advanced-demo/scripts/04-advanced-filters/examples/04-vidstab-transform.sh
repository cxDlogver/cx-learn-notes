#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
if ! has_ffmpeg_filter "vidstabtransform"; then
  printf '跳过 vidstabtransform：当前 FFmpeg 未启用该滤镜。\n'
  exit 0
fi
if [[ ! -f "$OUT_DIR/transforms.trf" ]]; then
  "$SCRIPT_DIR/03-vidstab-detect.sh"
fi
run_step "vidstabtransform 应用稳定变换"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/motion_boxes_720p_30fps_10s.mp4" -t 3 -vf "vidstabtransform=smoothing=30:input=${OUT_DIR}/transforms.trf:crop=black" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/03-stabilized.mp4"
