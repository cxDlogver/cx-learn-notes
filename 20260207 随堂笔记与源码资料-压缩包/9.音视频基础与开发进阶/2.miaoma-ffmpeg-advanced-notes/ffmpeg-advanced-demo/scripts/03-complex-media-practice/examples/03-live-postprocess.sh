#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "03-complex-media-practice"

LOGO="$ASSET_DIR/logo.png"
SUBTITLE="$ASSET_DIR/subtitle.srt"
ensure_demo_logo "$LOGO"
ensure_demo_subtitle "$SUBTITLE"

run_step "直播录制后期处理"
ffmpeg -y -hide_banner -loglevel error \
  -ss 00:00:01 -to 00:00:07 \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -loop 1 -i "$LOGO" \
  -t 6 \
  -filter_complex "[0:v]scale=960:540,setsar=1[video];[1:v]scale=96:-1,format=rgba[logo];[video][logo]overlay=20:20:shortest=1[video_with_logo];[video_with_logo]subtitles=${SUBTITLE}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=1'[final_video];[0:a]loudnorm=I=-16:LRA=11:TP=-1.5[final_audio]" \
  -map "[final_video]" -map "[final_audio]" \
  -c:v libx264 -preset ultrafast -crf 28 \
  -c:a aac -b:a 128k \
  "$OUT_DIR/03-live-postprocess.mp4"
