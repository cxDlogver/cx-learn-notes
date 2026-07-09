#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/01-basic"

run ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" "outputs/01-basic/basic_convert.mov"
