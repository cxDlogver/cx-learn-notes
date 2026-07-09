#!/usr/bin/env bash

require_tool() {
  local tool_name="$1"
  if ! command -v "$tool_name" >/dev/null 2>&1; then
    printf '缺少依赖命令：%s\n' "$tool_name" >&2
    exit 1
  fi
}

run_step() {
  printf '\n== %s ==\n' "$1"
}

has_ffmpeg_filter() {
  ffmpeg -hide_banner -filters 2>/dev/null | grep -Eq "[[:space:]]$1[[:space:]]"
}

has_ffmpeg_encoder() {
  ffmpeg -hide_banner -encoders 2>/dev/null | grep -Eq "[[:space:]]$1[[:space:]]"
}

select_font() {
  local candidates=(
    "/System/Library/Fonts/Hiragino Sans GB.ttc"
    "/System/Library/Fonts/STHeiti Medium.ttc"
    "/System/Library/Fonts/Supplemental/Songti.ttc"
    "/System/Library/Fonts/Menlo.ttc"
  )

  local font_path
  for font_path in "${candidates[@]}"; do
    if [[ -f "$font_path" ]]; then
      printf '%s' "$font_path"
      return 0
    fi
  done

  return 1
}

escape_filter_path() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//:/\\:}"
  value="${value// /\\ }"
  printf '%s' "$value"
}

ffmpeg_filter_font() {
  local font_path
  font_path="$(select_font)"
  escape_filter_path "$font_path"
}

ensure_demo_logo() {
  local logo_path="$1"
  mkdir -p "$(dirname "$logo_path")"

  if [[ -f "$logo_path" ]]; then
    return 0
  fi

  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=0x005A9C@0.90:s=240x120:d=1,format=rgba" \
    -vf "drawtext=fontfile=$(ffmpeg_filter_font):text='FFmpeg':fontsize=36:fontcolor=white:x=(w-tw)/2:y=(h-th)/2" \
    -frames:v 1 \
    -update 1 \
    "$logo_path"
}

ensure_demo_subtitle() {
  local subtitle_path="$1"
  mkdir -p "$(dirname "$subtitle_path")"

  cat >"$subtitle_path" <<'SRT'
1
00:00:00,000 --> 00:00:02,000
FFmpeg filtergraph demo

2
00:00:02,000 --> 00:00:04,000
Subtitle rendered by subtitles filter
SRT
}

ensure_demo_lut() {
  local lut_path="$1"
  mkdir -p "$(dirname "$lut_path")"

  cat >"$lut_path" <<'CUBE'
TITLE "Tiny Warm Demo LUT"
LUT_3D_SIZE 2
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0
0.000 0.000 0.000
0.000 0.000 1.000
0.000 1.000 0.000
0.000 1.000 0.900
1.000 0.060 0.000
1.000 0.060 1.000
1.000 1.000 0.000
1.000 1.000 0.900
CUBE
}
