#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/04-trim-scale-crop"

run ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -ss 00:00:02 -t 3 -c:v libx264 -c:a aac -pix_fmt yuv420p "outputs/04-trim-scale-crop/precise_cut.mp4"
