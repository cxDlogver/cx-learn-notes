#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffprobe

run ffprobe -v quiet -select_streams a -show_streams "materials/video/av_sync_test_720p_30fps_10s.mp4"
