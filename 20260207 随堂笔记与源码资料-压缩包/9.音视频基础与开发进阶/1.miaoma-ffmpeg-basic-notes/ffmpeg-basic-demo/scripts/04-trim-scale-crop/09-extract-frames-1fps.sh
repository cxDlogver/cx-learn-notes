#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/04-trim-scale-crop/frames"

run ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -r 1 "outputs/04-trim-scale-crop/frames/frame_%04d.jpg"
