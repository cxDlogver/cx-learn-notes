#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "eq 亮度对比度饱和度"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -t 2 -vf "eq=brightness=0.1:contrast=1.2:saturation=1.3" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/07-eq.mp4"
