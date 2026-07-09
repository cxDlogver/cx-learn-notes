#!/usr/bin/env bash

setup_example_env() {
  local chapter_slug="$1"
  local caller_dir

  caller_dir="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
  ROOT_DIR="$(cd "$caller_dir/../../.." && pwd)"

  # shellcheck source=ffmpeg_demo_common.sh
  source "$ROOT_DIR/scripts/_lib/ffmpeg_demo_common.sh"

  cd "$ROOT_DIR"
  require_tool ffmpeg

  OUT_DIR="outputs/scripts/$chapter_slug"
  ASSET_DIR="outputs/scripts/assets"
  mkdir -p "$OUT_DIR" "$ASSET_DIR"
}
