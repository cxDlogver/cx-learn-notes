#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
LOGO="$ASSET_DIR/logo.png"
ensure_demo_logo "$LOGO"
run_step "overlay 右下角水印"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -loop 1 -i "$LOGO" -t 3 -filter_complex "[1:v]scale=120:-1,format=rgba[wm];[0:v][wm]overlay=W-w-10:H-h-10[out_v]" -map "[out_v]" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/14-overlay-bottom-right.mp4"
