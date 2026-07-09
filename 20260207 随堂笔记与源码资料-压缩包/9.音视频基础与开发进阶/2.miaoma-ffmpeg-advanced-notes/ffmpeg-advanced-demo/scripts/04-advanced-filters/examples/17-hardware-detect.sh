#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../_lib/ffmpeg_example_env.sh"
setup_example_env "04-advanced-filters"
run_step "硬件编码能力检测"
if has_ffmpeg_encoder "h264_nvenc"; then
  printf '检测到 h264_nvenc，可参考 commands.md 手动测试 NVIDIA 硬件编码。\n'
else
  printf '未检测到 h264_nvenc，跳过 NVIDIA 示例。\n'
fi
if has_ffmpeg_encoder "h264_qsv"; then
  printf '检测到 h264_qsv，可参考 commands.md 手动测试 Intel QSV 硬件编码。\n'
else
  printf '未检测到 h264_qsv，跳过 Intel QSV 示例。\n'
fi
