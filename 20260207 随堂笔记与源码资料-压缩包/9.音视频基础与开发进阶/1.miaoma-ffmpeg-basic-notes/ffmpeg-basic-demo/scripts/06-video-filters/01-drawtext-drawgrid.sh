#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/06-video-filters"

run ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "drawgrid=width=160:height=90:color=white@0.35:thickness=1,drawtext=text='%{pts\:hms}':x=40:y=40:fontsize=48:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=12" -c:v libx264 -pix_fmt yuv420p "outputs/06-video-filters/drawtext_drawgrid.mp4"
