#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "03-complex-media-practice"

LOGO="$ASSET_DIR/logo.png"
FONT_FILTER="$(ffmpeg_filter_font)"
ensure_demo_logo "$LOGO"

run_step "短视频标准处理流水线"
ffmpeg -y -hide_banner -loglevel error \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -loop 1 -i "$LOGO" \
  -t 5 \
  -filter_complex "[0:v]scale=360:640,setsar=1,boxblur=20:5[bg];[0:v]scale=360:-2,setsar=1[main];[bg][main]overlay=(W-w)/2:(H-h)/2[video];[video]drawtext=text='这是视频标题':fontfile=${FONT_FILTER}:fontsize=24:fontcolor=white:x=(W-tw)/2:y=40[video_with_title];[1:v]scale=72:-1,format=rgba[logo];[video_with_title][logo]overlay=W-w-12:H-h-12[final_video]" \
  -map "[final_video]" -map 0:a? \
  -c:v libx264 -preset ultrafast -crf 28 \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  "$OUT_DIR/01-short-video-pipeline.mp4"
