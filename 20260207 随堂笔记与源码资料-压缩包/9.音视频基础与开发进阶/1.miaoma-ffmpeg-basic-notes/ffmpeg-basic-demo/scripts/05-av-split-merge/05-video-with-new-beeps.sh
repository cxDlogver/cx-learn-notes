#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/05-av-split-merge"

run ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -i "materials/audio/beeps_every_second_10s.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 128k "outputs/05-av-split-merge/video_with_new_beeps.mp4"
