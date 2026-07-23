#!/usr/bin/env python3
"""Create a structural, non-content inventory of a benchmark repository."""

from __future__ import annotations

import argparse
import ast
import csv
import json
import os
import re
import subprocess
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterable


IGNORED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    "__pycache__",
    "node_modules",
    "venv",
    ".venv",
}
CODE_SUFFIXES = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".scala",
    ".sh",
    ".r",
}
TEXT_DOC_SUFFIXES = {".md", ".rst", ".txt", ".yaml", ".yml", ".toml"}
URL_RE = re.compile(r"https?://[^\s<>()\"']+")


def run_git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(root), *args],
        check=False,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip() if result.returncode == 0 else ""


def iter_files(root: Path) -> Iterable[Path]:
    for current, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in IGNORED_DIRS)
        for name in sorted(files):
            yield Path(current) / name


def human_size(size: int) -> str:
    value = float(size)
    for unit in ("B", "KiB", "MiB", "GiB"):
        if value < 1024 or unit == "GiB":
            return f"{value:.1f} {unit}"
        value /= 1024
    return f"{size} B"


def csv_profile(path: Path, max_rows: int) -> dict[str, Any]:
    with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader, [])
        missing = [0] * len(header)
        rows = 0
        truncated = False
        malformed = 0
        for row in reader:
            rows += 1
            if len(row) != len(header):
                malformed += 1
            for index in range(len(header)):
                if index >= len(row) or not row[index].strip():
                    missing[index] += 1
            if rows >= max_rows:
                truncated = next(reader, None) is not None
                break
    top_missing = sorted(
        ((header[i], count) for i, count in enumerate(missing) if count),
        key=lambda item: (-item[1], item[0]),
    )[:10]
    return {
        "rows": rows,
        "truncated": truncated,
        "columns": header,
        "malformed": malformed,
        "top_missing": top_missing,
    }


def json_profile(path: Path) -> dict[str, Any]:
    if path.stat().st_size > 20 * 1024 * 1024:
        return {"note": "larger than 20 MiB; content not loaded"}
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        if path.suffix.lower() == ".jsonl":
            count = 0
            keys: set[str] = set()
            for line in handle:
                if not line.strip():
                    continue
                count += 1
                if count <= 1000:
                    value = json.loads(line)
                    if isinstance(value, dict):
                        keys.update(map(str, value.keys()))
            return {"records": count, "keys": sorted(keys)}
        value = json.load(handle)
    if isinstance(value, list):
        keys: set[str] = set()
        for item in value[:1000]:
            if isinstance(item, dict):
                keys.update(map(str, item.keys()))
        return {"type": "list", "records": len(value), "item_keys": sorted(keys)}
    if isinstance(value, dict):
        return {"type": "object", "keys": sorted(map(str, value.keys()))}
    return {"type": type(value).__name__}


def notebook_profile(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        notebook = json.load(handle)
    cells = notebook.get("cells", [])
    counts = Counter(cell.get("cell_type", "unknown") for cell in cells)
    outputs = sum(len(cell.get("outputs", [])) for cell in cells)
    return {"cells": len(cells), "types": dict(counts), "saved_outputs": outputs}


def python_profile(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8", errors="replace")
    try:
        tree = ast.parse(text)
    except SyntaxError as error:
        return {"lines": len(text.splitlines()), "syntax_error": str(error)}
    functions = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
    classes = [node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
    imports: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.add(node.module.split(".")[0])
    return {
        "lines": len(text.splitlines()),
        "functions": functions,
        "classes": classes,
        "imports": sorted(imports),
        "main_guard": 'if __name__ == "__main__"' in text
        or "if __name__ == '__main__'" in text,
    }


def zip_profile(path: Path) -> dict[str, Any]:
    with zipfile.ZipFile(path) as archive:
        members = [member for member in archive.infolist() if not member.is_dir()]
    return {
        "members": len(members),
        "uncompressed": sum(member.file_size for member in members),
        "names": [member.filename for member in members[:30]],
    }


def collect_urls(root: Path, files: list[Path]) -> list[str]:
    urls: set[str] = set()
    for path in files:
        if path.suffix.lower() not in TEXT_DOC_SUFFIXES:
            continue
        if path.stat().st_size > 2 * 1024 * 1024:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        urls.update(match.rstrip(".,;]})") for match in URL_RE.findall(text))
    return sorted(urls)


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def render_inventory(root: Path, max_rows: int) -> str:
    files = list(iter_files(root))
    suffixes = Counter(path.suffix.lower() or "[no suffix]" for path in files)
    top_dirs = Counter(
        (path.relative_to(root).parts[0] if len(path.relative_to(root).parts) > 1 else "[root]")
        for path in files
    )

    lines = [
        "# Benchmark 仓库结构盘点",
        "",
        "> 自动生成的结构证据；不包含原始题目或答案样例。",
        "",
        "## 仓库快照",
        "",
        f"- 路径：`{root}`",
        f"- 远端：`{run_git(root, 'remote', 'get-url', 'origin') or '未检测到'}`",
        f"- Commit：`{run_git(root, 'rev-parse', 'HEAD') or '未检测到'}`",
        f"- Commit 日期：{run_git(root, 'show', '-s', '--format=%cI', 'HEAD') or '未检测到'}",
        f"- 工作区状态：{'干净' if not run_git(root, 'status', '--short') else '存在未提交修改'}",
        f"- 文件数：{len(files)}",
        f"- 总大小：{human_size(sum(path.stat().st_size for path in files))}",
        "",
        "## 文件分布",
        "",
        "| 顶层目录 | 文件数 |",
        "|---|---:|",
    ]
    lines.extend(f"| `{name}` | {count} |" for name, count in sorted(top_dirs.items()))
    lines += ["", "| 后缀 | 文件数 |", "|---|---:|"]
    lines.extend(f"| `{name}` | {count} |" for name, count in sorted(suffixes.items()))

    data_files = [
        path
        for path in files
        if path.suffix.lower() in {".csv", ".json", ".jsonl", ".parquet", ".zip"}
    ]
    lines += ["", "## 数据与归档文件", ""]
    for path in data_files:
        suffix = path.suffix.lower()
        lines.append(f"### `{rel(path, root)}`")
        lines.append("")
        lines.append(f"- 大小：{human_size(path.stat().st_size)}")
        try:
            if suffix == ".csv":
                profile = csv_profile(path, max_rows)
                row_label = f">={profile['rows']}" if profile["truncated"] else str(profile["rows"])
                lines += [
                    f"- 数据行：{row_label}",
                    f"- 字段数：{len(profile['columns'])}",
                    f"- 字段：{', '.join(f'`{name}`' for name in profile['columns'])}",
                    f"- 非标准列数记录：{profile['malformed']}",
                ]
                if profile["top_missing"]:
                    lines.append(
                        "- 缺失最多字段："
                        + "；".join(f"`{name}`={count}" for name, count in profile["top_missing"])
                    )
            elif suffix in {".json", ".jsonl"}:
                lines.append(f"- 结构：`{json.dumps(json_profile(path), ensure_ascii=False)}`")
            elif suffix == ".zip":
                profile = zip_profile(path)
                lines += [
                    f"- 文件成员：{profile['members']}",
                    f"- 解压总大小：{human_size(profile['uncompressed'])}",
                    "- 成员："
                    + "；".join(f"`{name}`" for name in profile["names"]),
                ]
            else:
                lines.append("- 结构：Parquet 文件；需要 Arrow/Pandas 进一步读取 Schema。")
        except Exception as error:  # keep inventory useful on partially broken repos
            lines.append(f"- 读取错误：`{type(error).__name__}: {error}`")
        lines.append("")

    notebooks = [path for path in files if path.suffix.lower() == ".ipynb"]
    lines += ["## Notebook", ""]
    if not notebooks:
        lines.append("- 未发现 Notebook。")
    for path in notebooks:
        try:
            profile = notebook_profile(path)
            lines.append(
                f"- `{rel(path, root)}`：{profile['cells']} 个单元，"
                f"{profile['types']}，保存输出 {profile['saved_outputs']} 个。"
            )
        except Exception as error:
            lines.append(f"- `{rel(path, root)}`：读取错误 `{error}`")

    code_files = [path for path in files if path.suffix.lower() in CODE_SUFFIXES]
    lines += ["", "## 代码结构", ""]
    for path in code_files:
        if path.suffix.lower() == ".py":
            profile = python_profile(path)
            lines += [
                f"### `{rel(path, root)}`",
                "",
                f"- 行数：{profile.get('lines', 0)}",
                f"- 函数：{', '.join(f'`{name}`' for name in profile.get('functions', [])) or '无'}",
                f"- 类：{', '.join(f'`{name}`' for name in profile.get('classes', [])) or '无'}",
                f"- 顶层依赖：{', '.join(f'`{name}`' for name in profile.get('imports', [])) or '无'}",
                f"- Main Guard：{'是' if profile.get('main_guard') else '否'}",
                "",
            ]
        else:
            lines.append(f"- `{rel(path, root)}`：{len(path.read_text(errors='replace').splitlines())} 行")

    urls = collect_urls(root, files)
    lines += ["## 文档中的外部链接", ""]
    lines.extend(f"- {url}" for url in urls)
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--max-data-rows", type=int, default=100_000)
    args = parser.parse_args()

    root = args.repo.expanduser().resolve()
    if not root.is_dir():
        raise SystemExit(f"Repository directory does not exist: {root}")
    report = render_inventory(root, args.max_data_rows)
    if args.output:
        output = args.output.expanduser().resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(report, encoding="utf-8")
    else:
        print(report)


if __name__ == "__main__":
    main()
