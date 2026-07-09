#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/06-video-filters"

run ffmpeg -y -hide_banner -i "materials/video/portrait_testsrc2_1080x1920_30fps_8s.mp4" -vf "scale=-2:720,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -pix_fmt yuv420p "outputs/06-video-filters/portrait_to_landscape_pad.mp4"
