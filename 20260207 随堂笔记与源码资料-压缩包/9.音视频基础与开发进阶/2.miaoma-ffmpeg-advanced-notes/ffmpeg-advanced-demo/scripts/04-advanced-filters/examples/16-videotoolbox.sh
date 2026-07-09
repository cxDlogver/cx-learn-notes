#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
if ! has_ffmpeg_encoder "h264_videotoolbox"; then
  printf '跳过 VideoToolbox：当前 FFmpeg 未提供 h264_videotoolbox 编码器。\n'
  exit 0
fi
run_step "VideoToolbox H.264 硬件编码"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/testsrc2_720p_30fps_10s.mp4" -t 2 -vf "scale=640:-2,format=nv12" -c:v h264_videotoolbox -q:v 50 -an "$OUT_DIR/15-videotoolbox.mp4"
