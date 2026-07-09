#!/bin/sh

if [ -z "${SCRIPT_DIR:-}" ]; then
  printf '该文件用于被实例脚本 source，不应直接运行。\n' >&2
  exit 64
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '缺少命令：%s\n' "$1" >&2
    exit 127
  fi
}

ensure_output_dir() {
  mkdir -p "$@"
}

run() {
  printf '+'
  for arg in "$@"; do
    printf ' %s' "$arg"
  done
  printf '\n'
  "$@"
}

PROJECT_ROOT=$(CDPATH= cd "$SCRIPT_DIR/../.." && pwd)
