#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
run_step "pan 提取左声道"
ffmpeg -y -hide_banner -loglevel error -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" -af "pan=mono|c0=FL" "$OUT_DIR/06-pan-left.wav"
