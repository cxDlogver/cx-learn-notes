#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/06-video-filters"

run ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "scale=640:-2,crop=640:360,drawtext=text='Demo':x=20:y=20:fontsize=36:fontcolor=white" -c:v libx264 -pix_fmt yuv420p "outputs/06-video-filters/filter_chain_template.mp4"
