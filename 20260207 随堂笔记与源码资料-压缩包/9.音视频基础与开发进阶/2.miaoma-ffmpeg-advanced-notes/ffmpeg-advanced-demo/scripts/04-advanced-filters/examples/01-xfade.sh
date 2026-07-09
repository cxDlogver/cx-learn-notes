#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
run_step "xfade 视频转场 + acrossfade 音频转场"
ffmpeg -y -hide_banner -loglevel error -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -filter_complex "[0:v]trim=0:5,setpts=PTS-STARTPTS,scale=640:360,fps=30,format=yuv420p,settb=AVTB[v0];[1:v]trim=0:5,setpts=PTS-STARTPTS,scale=640:360,fps=30,eq=saturation=0.2,format=yuv420p,settb=AVTB[v1];[v0][v1]xfade=transition=fade:duration=1:offset=4[outv];[0:a]atrim=0:5,asetpts=PTS-STARTPTS[a0];[1:a]atrim=0:5,asetpts=PTS-STARTPTS,volume=0.6[a1];[a0][a1]acrossfade=d=1[outa]" -map "[outv]" -map "[outa]" -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 128k "$OUT_DIR/01-xfade.mp4"
