#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
run_step "pan 立体声转单声道"
ffmpeg -y -hide_banner -loglevel error -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" -af "pan=mono|c0=0.5*FL+0.5*FR" "$OUT_DIR/05-pan-mono.wav"
