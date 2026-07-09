#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "02-core-filters"
run_step "amix 音频混合"
ffmpeg -y -hide_banner -loglevel error -i "materials/audio/tone_440hz_mono_5s.wav" -i "materials/audio/pink_noise_stereo_10s.wav" -filter_complex "[1:a]volume=0.3[bg];[0:a][bg]amix=inputs=2:duration=first[out_a]" -map "[out_a]" -c:a aac -b:a 128k "$OUT_DIR/25-amix.m4a"
