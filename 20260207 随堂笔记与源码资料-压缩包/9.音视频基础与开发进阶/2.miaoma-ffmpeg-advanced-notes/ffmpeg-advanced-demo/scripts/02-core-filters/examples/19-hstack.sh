#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "hstack 横向拼接"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -i "materials/video/smptebars_1080p_30fps_8s.mp4" -t 3 -filter_complex "[0:v]scale=480:270[v0];[1:v]scale=480:270[v1];[v0][v1]hstack=inputs=2[out]" -map "[out]" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/19-hstack.mp4"
