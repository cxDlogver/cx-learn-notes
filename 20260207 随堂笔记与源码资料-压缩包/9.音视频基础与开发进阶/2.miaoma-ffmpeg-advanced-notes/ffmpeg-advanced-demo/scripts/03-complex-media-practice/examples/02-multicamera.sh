#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "03-complex-media-practice"

run_step "多机位视频混合"
ffmpeg -y -hide_banner -loglevel error \
  -i "materials/video/smptebars_1080p_30fps_8s.mp4" \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -i "materials/video/motion_boxes_720p_30fps_10s.mp4" \
  -t 5 \
  -filter_complex "[0:v]scale=960:540[courseware];[1:v]scale=240:135[teacher];[2:v]scale=240:135[blackboard];[courseware][teacher]overlay=W-w-20:20[temp1];[temp1][blackboard]overlay=20:H-h-20[final]" \
  -map "[final]" -map 1:a? \
  -c:v libx264 -preset ultrafast -crf 28 \
  -c:a aac -b:a 128k \
  "$OUT_DIR/02-multicamera.mp4"
