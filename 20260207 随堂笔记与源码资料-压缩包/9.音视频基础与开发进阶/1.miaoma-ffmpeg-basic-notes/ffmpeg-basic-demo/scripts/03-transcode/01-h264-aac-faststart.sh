#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/03-transcode"

run ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "outputs/03-transcode/h264_aac_faststart.mp4"
