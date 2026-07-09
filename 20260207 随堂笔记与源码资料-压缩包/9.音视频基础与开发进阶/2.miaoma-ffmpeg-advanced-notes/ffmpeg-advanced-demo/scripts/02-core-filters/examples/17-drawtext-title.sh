#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
FONT_FILTER="$(ffmpeg_filter_font)"
run_step "drawtext 标题文字"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -t 3 -vf "drawtext=text='这是测试文字':fontfile=${FONT_FILTER}:fontsize=36:fontcolor=white:x=(W-tw)/2:y=H-th-20" -c:v libx264 -preset ultrafast -crf 28 -an "$OUT_DIR/17-drawtext-title.mp4"
