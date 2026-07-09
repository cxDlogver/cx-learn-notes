#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/06-video-filters"

run ffmpeg -y -hide_banner -f lavfi -i "color=c=black@0.0:size=320x120" -frames:v 1 -vf "format=rgba,drawtext=text='FFmpeg Demo':x=24:y=38:fontsize=38:fontcolor=white:box=1:boxcolor=red@0.75:boxborderw=12" "outputs/06-video-filters/demo_logo.png"
