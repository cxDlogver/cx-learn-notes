#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "overlay 叠加层淡入淡出"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -stream_loop -1 -i "materials/video/alpha_overlay_source_512x512_30fps_6s.mov" -t 5 -filter_complex "[1:v]scale=120:120,format=yuva420p,fade=t=in:st=0:d=1:alpha=1,fade=t=out:st=4:d=1:alpha=1[wm];[0:v][wm]overlay=10:10[out_v]" -map "[out_v]" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/16-overlay-alpha-fade.mp4"
