#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/07-audio-filters"

run ffmpeg -y -hide_banner -i "materials/audio/volume_steps_1khz_9s.wav" -af "loudnorm=I=-16:TP=-1.5:LRA=11" "outputs/07-audio-filters/loudnorm.wav"
