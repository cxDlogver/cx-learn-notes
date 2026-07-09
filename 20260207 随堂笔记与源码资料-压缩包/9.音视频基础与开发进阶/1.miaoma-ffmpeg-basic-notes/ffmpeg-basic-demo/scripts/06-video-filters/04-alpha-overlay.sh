#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/06-video-filters"

run ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -i "materials/video/alpha_overlay_source_512x512_30fps_6s.mov" -filter_complex "[0:v][1:v]overlay=x=40:y=120:format=auto" -c:v libx264 -pix_fmt yuv420p -shortest "outputs/06-video-filters/alpha_overlay.mp4"
