#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
run_step "aevalsrc 生成白噪声"
ffmpeg -y -hide_banner -loglevel error -f lavfi -i "aevalsrc=random(0)*2-1:d=5" "$OUT_DIR/12-white-noise.wav"
