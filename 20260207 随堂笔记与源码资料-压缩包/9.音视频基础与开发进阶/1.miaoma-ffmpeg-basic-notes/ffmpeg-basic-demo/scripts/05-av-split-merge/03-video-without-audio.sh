#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/05-av-split-merge"

run ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -an -c:v copy "outputs/05-av-split-merge/video_without_audio.mp4"
