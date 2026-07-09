#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../_common.sh"

cd "$PROJECT_ROOT"
require_cmd ffmpeg
ensure_output_dir "outputs/07-audio-filters"

run ffmpeg -y -hide_banner -i "materials/audio/tone_440hz_mono_5s.wav" -af "afade=t=in:st=0:d=1,afade=t=out:st=4:d=1" "outputs/07-audio-filters/fade_in_out.wav"
