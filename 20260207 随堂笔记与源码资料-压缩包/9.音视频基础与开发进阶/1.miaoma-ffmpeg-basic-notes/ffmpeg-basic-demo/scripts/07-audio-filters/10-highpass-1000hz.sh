#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/07-audio-filters"

run ffmpeg -y -hide_banner -i "materials/audio/sweep_20hz_to_20khz_10s.wav" -af "highpass=f=1000" "outputs/07-audio-filters/highpass_1000hz.wav"
