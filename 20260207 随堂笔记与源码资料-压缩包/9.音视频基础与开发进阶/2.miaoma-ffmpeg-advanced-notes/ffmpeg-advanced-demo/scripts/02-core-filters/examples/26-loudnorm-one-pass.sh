#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "loudnorm 单遍标准化"
ffmpeg -y -hide_banner -loglevel error -i "materials/audio/volume_steps_1khz_9s.wav" -af "loudnorm=I=-16:LRA=11:TP=-1.5" "$OUT_DIR/26-loudnorm-one-pass.wav"
