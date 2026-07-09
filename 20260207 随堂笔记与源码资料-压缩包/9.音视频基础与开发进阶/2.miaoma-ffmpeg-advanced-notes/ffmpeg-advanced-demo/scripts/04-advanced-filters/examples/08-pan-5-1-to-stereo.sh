#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
SURROUND_INPUT="$ASSET_DIR/demo-5.1.wav"
run_step "pan 5.1 下混成立体声"
ffmpeg -y -hide_banner -loglevel error -f lavfi -i "aevalsrc=sin(440*2*PI*t)|sin(660*2*PI*t)|sin(550*2*PI*t)|sin(110*2*PI*t)|sin(330*2*PI*t)|sin(880*2*PI*t):d=3:s=48000:c=5.1" "$SURROUND_INPUT"
ffmpeg -y -hide_banner -loglevel error -i "$SURROUND_INPUT" -af "pan=stereo|FL=0.707*FC+1.0*FL+0.707*BL+0.5*LFE|FR=0.707*FC+1.0*FR+0.707*BR+0.5*LFE" "$OUT_DIR/07-pan-5-1-to-stereo.wav"
