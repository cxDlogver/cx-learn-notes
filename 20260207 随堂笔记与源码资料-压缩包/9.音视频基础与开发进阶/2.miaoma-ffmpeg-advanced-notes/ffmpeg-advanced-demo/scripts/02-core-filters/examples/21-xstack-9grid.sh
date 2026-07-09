#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "xstack 九宫格"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -i "materials/video/smptebars_1080p_30fps_8s.mp4" -i "materials/video/motion_boxes_720p_30fps_10s.mp4" -t 3 -filter_complex "[0:v]scale=160:90[v0];[1:v]scale=160:90[v1];[2:v]scale=160:90[v2];[0:v]scale=160:90[v3];[1:v]scale=160:90[v4];[2:v]scale=160:90[v5];[0:v]scale=160:90[v6];[1:v]scale=160:90[v7];[2:v]scale=160:90[v8];[v0][v1][v2][v3][v4][v5][v6][v7][v8]xstack=inputs=9:grid=3x3[out]" -map "[out]" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/21-xstack-9grid.mp4"
