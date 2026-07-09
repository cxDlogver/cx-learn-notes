#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
LUT="$ASSET_DIR/warm-demo.cube"
ensure_demo_lut "$LUT"
run_step "lut3d 颜色分级"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -t 3 -vf "format=rgb24,lut3d=file=${LUT},format=yuv420p" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/02-lut3d.mp4"
