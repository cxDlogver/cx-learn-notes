#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
run_step "aevalsrc 生成 440Hz 标准音"
ffmpeg -y -hide_banner -loglevel error -f lavfi -i "aevalsrc=sin(440*2*PI*t):d=1" "$OUT_DIR/11-440hz-tone.wav"
