#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/07-audio-filters"

run ffmpeg -y -hide_banner -i "materials/audio/volume_steps_1khz_9s.wav" -af "volume=0.5" "outputs/07-audio-filters/volume_down_0_5x.wav"
