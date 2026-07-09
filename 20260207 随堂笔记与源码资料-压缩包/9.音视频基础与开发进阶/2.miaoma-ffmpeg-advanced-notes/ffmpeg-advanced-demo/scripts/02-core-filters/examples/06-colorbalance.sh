#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "colorbalance 颜色平衡"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -t 2 -vf "colorbalance=rs=0.1:gs=0.1:bs=-0.1" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/06-colorbalance.mp4"
