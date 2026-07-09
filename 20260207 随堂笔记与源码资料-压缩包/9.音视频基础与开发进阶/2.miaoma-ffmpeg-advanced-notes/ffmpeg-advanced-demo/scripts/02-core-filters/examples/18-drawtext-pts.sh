#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
FONT_FILTER="$(ffmpeg_filter_font)"
run_step "drawtext 当前时间"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -t 3 -vf "drawtext=text='%{pts\\:hms}':fontfile=${FONT_FILTER}:fontsize=24:fontcolor=yellow:x=10:y=10" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/18-drawtext-pts.mp4"
