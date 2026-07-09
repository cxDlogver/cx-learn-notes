#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/04-trim-scale-crop"

run ffmpeg -y -hide_banner -ss 00:00:02 -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -t 3 -c copy "outputs/04-trim-scale-crop/cut_fast_keyframe.mp4"
