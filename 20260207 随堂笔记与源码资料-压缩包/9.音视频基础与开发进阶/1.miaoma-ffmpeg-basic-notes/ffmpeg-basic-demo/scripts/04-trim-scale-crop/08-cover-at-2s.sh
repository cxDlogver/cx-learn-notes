#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/04-trim-scale-crop"

run ffmpeg -y -hide_banner -ss 00:00:02 -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vframes 1 -q:v 2 "outputs/04-trim-scale-crop/cover_at_2s.jpg"
