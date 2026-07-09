#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/06-video-filters"

if [ ! -f "outputs/06-video-filters/demo_logo.png" ]; then
  run ffmpeg -y -hide_banner -f lavfi -i "color=c=black@0.0:size=320x120" -frames:v 1 -vf "format=rgba,drawtext=text='FFmpeg Demo':x=24:y=38:fontsize=38:fontcolor=white:box=1:boxcolor=red@0.75:boxborderw=12" "outputs/06-video-filters/demo_logo.png"
fi

run ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -i "outputs/06-video-filters/demo_logo.png" -filter_complex "overlay=W-w-24:H-h-24" -c:v libx264 -pix_fmt yuv420p "outputs/06-video-filters/image_watermark_bottom_right.mp4"
