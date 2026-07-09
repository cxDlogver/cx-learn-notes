#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
FONT_FILTER="$(ffmpeg_filter_font)"
OCR_INPUT="$ASSET_DIR/ocr-input.mp4"
if ! has_ffmpeg_filter "ocr" || ! command -v tesseract >/dev/null 2>&1 || ! tesseract --list-langs 2>/dev/null | grep -q '^eng$'; then
  printf '跳过 OCR：需要 FFmpeg ocr 滤镜、tesseract 命令和 eng 语言包。\n'
  exit 0
fi
run_step "ocr 识别画面文字并打印元数据"
ffmpeg -y -hide_banner -loglevel error -f lavfi -i "color=c=black:s=640x180:d=2" -vf "drawtext=text='HELLO FFMPEG':fontfile=${FONT_FILTER}:fontsize=48:fontcolor=white:x=(w-tw)/2:y=(h-th)/2" -c:v libx264 -preset ultrafast -crf 28 "$OCR_INPUT"
ffmpeg -y -hide_banner -loglevel error -i "$OCR_INPUT" -vf "ocr=language=eng,metadata=mode=print:file=${OUT_DIR}/04-ocr-metadata.txt" -f null -
