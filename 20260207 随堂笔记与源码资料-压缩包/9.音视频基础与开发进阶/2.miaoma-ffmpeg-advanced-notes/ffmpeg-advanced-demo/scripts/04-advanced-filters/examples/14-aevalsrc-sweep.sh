#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
run_step "aevalsrc 生成双声道扫频"
ffmpeg -y -hide_banner -loglevel error -f lavfi -i "aevalsrc=sin(20*2*PI*t+20000*2*PI*t*t/20)|sin(20*2*PI*t+20000*2*PI*t*t/20):d=10:c=stereo" "$OUT_DIR/13-sweep.wav"
