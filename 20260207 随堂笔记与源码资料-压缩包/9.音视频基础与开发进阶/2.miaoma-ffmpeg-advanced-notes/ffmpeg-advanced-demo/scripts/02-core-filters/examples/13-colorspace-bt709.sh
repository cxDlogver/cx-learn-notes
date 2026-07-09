#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "colorspace BT.709"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -t 2 -vf "setparams=colorspace=bt709:color_trc=bt709:color_primaries=bt709,colorspace=space=bt709:trc=bt709:primaries=bt709:range=pc,format=yuv420p" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/13-colorspace-bt709.mp4"
