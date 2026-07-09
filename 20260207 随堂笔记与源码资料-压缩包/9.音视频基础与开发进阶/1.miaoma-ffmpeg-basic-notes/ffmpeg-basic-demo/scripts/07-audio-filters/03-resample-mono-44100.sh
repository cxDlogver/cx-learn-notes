#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/07-audio-filters"

run ffmpeg -y -hide_banner -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" -ar 44100 -ac 1 "outputs/07-audio-filters/resample_mono_44100.wav"
