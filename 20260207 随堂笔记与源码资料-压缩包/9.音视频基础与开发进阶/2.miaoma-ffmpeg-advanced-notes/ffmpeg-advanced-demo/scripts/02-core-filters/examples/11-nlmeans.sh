#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "nlmeans 去噪"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/lowres_426x240_low_bitrate_10s.mp4" -t 2 -vf "nlmeans=10" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/11-nlmeans.mp4"
