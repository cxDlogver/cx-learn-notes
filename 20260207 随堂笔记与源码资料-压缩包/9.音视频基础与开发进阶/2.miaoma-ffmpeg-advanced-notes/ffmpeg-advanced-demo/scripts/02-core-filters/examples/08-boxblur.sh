#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "boxblur 方框模糊"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -t 2 -vf "boxblur=5:1" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/08-boxblur.mp4"
