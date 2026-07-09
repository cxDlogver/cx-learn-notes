#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
run_step "afftdn 降噪"
ffmpeg -y -hide_banner -loglevel error -i "materials/audio/pink_noise_stereo_10s.wav" -t 5 -af "afftdn=nr=12:nf=-35" "$OUT_DIR/08-afftdn.wav"
