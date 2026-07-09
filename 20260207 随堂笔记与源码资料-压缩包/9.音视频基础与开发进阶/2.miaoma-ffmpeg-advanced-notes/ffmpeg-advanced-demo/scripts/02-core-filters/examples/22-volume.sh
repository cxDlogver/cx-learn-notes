#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "volume 音量"
ffmpeg -y -hide_banner -loglevel error -i "materials/audio/tone_440hz_mono_5s.wav" -af "volume=1.5" "$OUT_DIR/22-volume.wav"
