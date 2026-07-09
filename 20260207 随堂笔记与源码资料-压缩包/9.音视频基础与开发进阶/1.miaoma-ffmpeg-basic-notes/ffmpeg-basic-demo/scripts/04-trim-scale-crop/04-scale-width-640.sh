#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/04-trim-scale-crop"

run ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "scale=640:-2" -c:v libx264 -pix_fmt yuv420p "outputs/04-trim-scale-crop/scale_width_640.mp4"
