#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "vstack 纵向拼接"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -i "materials/video/smptebars_1080p_30fps_8s.mp4" -i "materials/video/motion_boxes_720p_30fps_10s.mp4" -t 3 -filter_complex "[0:v]scale=320:180[v0];[1:v]scale=320:180[v1];[2:v]scale=320:180[v2];[v0][v1][v2]vstack=inputs=3[out]" -map "[out]" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/20-vstack.mp4"
