#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/06-video-filters"

run ffmpeg -y -hide_banner -i "materials/video/green_screen_boxes_720p_30fps_6s.mp4" -i "materials/video/testsrc2_720p_30fps_10s.mp4" -filter_complex "[0:v]chromakey=0x00ff00:0.20:0.08[fg];[1:v][fg]overlay=0:0:format=auto" -c:v libx264 -pix_fmt yuv420p -shortest "outputs/06-video-filters/chromakey_overlay.mp4"
