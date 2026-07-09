#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/05-av-split-merge"

run ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" -c:v copy -c:a aac -b:a 128k -map 0:v:0 -map 1:a:0 -shortest "outputs/05-av-split-merge/replace_audio.mp4"
