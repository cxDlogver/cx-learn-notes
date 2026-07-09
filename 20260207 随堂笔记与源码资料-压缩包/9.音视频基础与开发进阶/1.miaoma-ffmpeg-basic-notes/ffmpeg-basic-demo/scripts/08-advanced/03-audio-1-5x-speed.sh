#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/08-advanced"

run ffmpeg -y -hide_banner -i "materials/audio/beeps_every_second_10s.wav" -af "atempo=1.5" "outputs/08-advanced/audio_1_5x_speed.wav"
