#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
run_step "aecho 回声"
ffmpeg -y -hide_banner -loglevel error -i "materials/audio/tone_440hz_mono_5s.wav" -af "aecho=0.8:0.9:500:0.5" "$OUT_DIR/09-aecho.wav"
