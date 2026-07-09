#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
run_step "Pipe 协议本地处理"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -t 2 -c:v libx264 -preset ultrafast -an -f mpegts pipe:1 | ffmpeg -y -hide_banner -loglevel error -i pipe:0 -vf "scale=320:-2" -c:v libx264 -preset ultrafast -crf 28 "$OUT_DIR/14-pipe-processed.mp4"
