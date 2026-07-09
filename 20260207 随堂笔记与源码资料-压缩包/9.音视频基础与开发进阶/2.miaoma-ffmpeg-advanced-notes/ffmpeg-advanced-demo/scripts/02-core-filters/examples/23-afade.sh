#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "afade 淡入淡出"
ffmpeg -y -hide_banner -loglevel error -i "materials/audio/tone_440hz_mono_5s.wav" -af "afade=t=in:ss=0:d=1,afade=t=out:st=4:d=1" "$OUT_DIR/23-afade.wav"
