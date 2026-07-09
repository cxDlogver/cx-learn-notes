#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
if ! has_ffmpeg_filter "reverb"; then
  printf '跳过 reverb：当前 FFmpeg 未提供 reverb 滤镜。\n'
  exit 0
fi
run_step "reverb 混响"
ffmpeg -y -hide_banner -loglevel error -i "materials/audio/tone_440hz_mono_5s.wav" -af "reverb=roomsize=0.8:damping=0.5:wet=0.3:dry=0.7" "$OUT_DIR/10-reverb.wav"
