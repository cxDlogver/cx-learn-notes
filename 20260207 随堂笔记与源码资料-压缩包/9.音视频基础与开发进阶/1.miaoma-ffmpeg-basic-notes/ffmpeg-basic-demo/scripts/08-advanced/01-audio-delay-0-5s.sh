#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/08-advanced"

run ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -itsoffset 0.5 -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest "outputs/08-advanced/audio_delay_0_5s.mp4"
