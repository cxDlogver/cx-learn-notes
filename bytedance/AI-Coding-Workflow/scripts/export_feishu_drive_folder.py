#!/usr/bin/env python3
"""Recursively export a Feishu Drive folder tree into local Markdown files.

Pipeline per document:
1. Use `lark-cli drive files list --as user` to traverse the Drive tree.
2. Use `feishu-lark call feishu_lark_parser` for readable Markdown output.
3. Use `lark-cli docs +fetch --as user --doc-format markdown` to extract
   media/file/whiteboard tokens from the canonical document body.
4. Download media locally with `lark-cli docs +media-preview` (files/images)
   and `lark-cli docs +media-download --type whiteboard` (whiteboards).
5. Rewrite Markdown image links/placeholders to local relative asset paths.

The script is intentionally sequential so that the exported order matches the
course order as closely as possible.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Iterable


WORKSPACE_ROOT = Path("/Users/bytedance/cx/spec-2/cxdlogver").resolve()
DEFAULT_LARK = (
    os.environ.get("LARK_CLI")
    or shutil.which("lark-cli")
    or "/Users/bytedance/.nvm/versions/node/v24.17.0/bin/lark-cli"
)
DEFAULT_FEISHU_LARK = (
    os.environ.get("FEISHU_LARK")
    or shutil.which("feishu-lark")
    or "/Users/bytedance/.nvm/versions/node/v24.17.0/bin/feishu-lark"
)

LARK_ENV = {
    **os.environ,
    "LARKSUITE_CLI_NO_UPDATE_NOTIFIER": "1",
    "LARKSUITE_CLI_NO_SKILLS_NOTIFIER": "1",
}

IMAGE_URL_RE = re.compile(r"https://(?:www\.)?feishu\.cn/file/([A-Za-z0-9]+)")
FILE_TAG_RE = re.compile(r"<source\b[^>]*token=\"([^\"]+)\"[^>]*name=\"([^\"]*)\"[^>]*/?>")
WHITEBOARD_RE = re.compile(r"<whiteboard\b[^>]*token=\"([^\"]+)\"[^>]*/?>")
TITLE_TAG_RE = re.compile(r"^\s*<title>(.*?)</title>\s*", re.DOTALL)


def natural_key(name: str) -> tuple[Any, ...]:
    parts = re.split(r"(\d+)", name)
    key: list[Any] = []
    for part in parts:
        if not part:
            continue
        if part.isdigit():
            key.append((0, int(part)))
        else:
            key.append((1, part.lower()))
    return tuple(key)


def sanitize_name(name: str) -> str:
    cleaned = name.strip()
    cleaned = cleaned.replace("/", "／").replace(":", "：")
    cleaned = cleaned.replace("\0", "")
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = cleaned.rstrip(". ")
    return cleaned or "untitled"


def ensure_within_workspace(path: Path) -> Path:
    resolved = path.resolve()
    resolved.relative_to(WORKSPACE_ROOT)
    return resolved


class CommandError(RuntimeError):
    def __init__(self, message: str, *, stdout: str = "", stderr: str = "", returncode: int = 1):
        super().__init__(message)
        self.stdout = stdout
        self.stderr = stderr
        self.returncode = returncode


def run_command(
    args: list[str],
    *,
    cwd: Path = WORKSPACE_ROOT,
    env: dict[str, str] | None = None,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        args,
        cwd=str(cwd),
        env=env,
        text=True,
        capture_output=True,
    )
    if check and result.returncode != 0:
        joined = " ".join(args)
        raise CommandError(
            f"Command failed ({result.returncode}): {joined}",
            stdout=result.stdout,
            stderr=result.stderr,
            returncode=result.returncode,
        )
    return result


def run_json_command(
    args: list[str],
    *,
    cwd: Path = WORKSPACE_ROOT,
    env: dict[str, str] | None = None,
) -> dict[str, Any]:
    result = run_command(args, cwd=cwd, env=env, check=False)
    stdout = result.stdout.strip()
    payload: dict[str, Any] | None = None
    if stdout:
        try:
            payload = json.loads(stdout)
        except json.JSONDecodeError as exc:
            raise CommandError(
                f"JSON parse failed for command: {' '.join(args)}",
                stdout=result.stdout,
                stderr=result.stderr,
                returncode=result.returncode,
            ) from exc
    if result.returncode != 0:
        detail = payload.get("error") if isinstance(payload, dict) else None
        message = f"Command failed ({result.returncode}): {' '.join(args)}"
        if detail:
            message = f"{message} | {detail}"
        raise CommandError(
            message,
            stdout=result.stdout,
            stderr=result.stderr,
            returncode=result.returncode,
        )
    if payload is None:
        raise CommandError(
            f"Expected JSON output from command: {' '.join(args)}",
            stdout=result.stdout,
            stderr=result.stderr,
            returncode=result.returncode,
        )
    return payload


def list_folder(lark_cli: str, folder_token: str) -> list[dict[str, Any]]:
    page_token = ""
    items: list[dict[str, Any]] = []
    while True:
        params: dict[str, Any] = {"folder_token": folder_token, "page_size": 200}
        if page_token:
            params["page_token"] = page_token
        payload = run_json_command(
            [
                lark_cli,
                "drive",
                "files",
                "list",
                "--as",
                "user",
                "--params",
                json.dumps(params, ensure_ascii=False),
                "--format",
                "json",
            ],
            env=LARK_ENV,
        )
        data = payload.get("data", {})
        items.extend(data.get("files", []))
        if not data.get("has_more"):
            break
        page_token = data.get("next_page_token", "")
        if not page_token:
            raise RuntimeError(f"Pagination ended early for folder {folder_token}")
    items.sort(key=lambda item: natural_key(item.get("name", "")))
    return items


def walk_tree(lark_cli: str, folder_token: str, current_parts: list[str]) -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []
    items = list_folder(lark_cli, folder_token)
    for item in items:
        item_type = item.get("type")
        name = item.get("name", "")
        if item_type == "folder":
            docs.extend(walk_tree(lark_cli, item["token"], current_parts + [sanitize_name(name)]))
        elif item_type in {"doc", "docx", "wiki", "mindnote"}:
            docs.append(
                {
                    "token": item["token"],
                    "type": item_type,
                    "name": sanitize_name(name),
                    "url": item.get("url") or "",
                    "folder_parts": list(current_parts),
                }
            )
    return docs


def fetch_doc_markdown(lark_cli: str, doc_url_or_token: str) -> dict[str, Any]:
    payload = run_json_command(
        [
            lark_cli,
            "docs",
            "+fetch",
            "--as",
            "user",
            "--doc",
            doc_url_or_token,
            "--doc-format",
            "markdown",
        ],
        env=LARK_ENV,
    )
    document = payload.get("data", {}).get("document", {})
    if not document:
        raise RuntimeError(f"Unexpected docs +fetch response for {doc_url_or_token}")
    return document


def parse_doc_markdown(feishu_lark: str, doc_url: str) -> str:
    result = run_command(
        [
            feishu_lark,
            "call",
            "feishu_lark_parser",
            json.dumps(
                {
                    "url": doc_url,
                    "mode": "strict",
                    "agent_friendly": True,
                },
                ensure_ascii=False,
            ),
        ],
        check=True,
    )
    text = result.stdout.replace("\r\n", "\n").strip()
    if not text:
        raise RuntimeError(f"Parser returned empty output for {doc_url}")
    return text + "\n"


def extract_title_from_raw(raw_markdown: str) -> str:
    match = TITLE_TAG_RE.match(raw_markdown)
    return match.group(1).strip() if match else ""


def extract_image_tokens(raw_markdown: str) -> list[str]:
    tokens: list[str] = []
    seen: set[str] = set()
    for token in IMAGE_URL_RE.findall(raw_markdown):
        if token not in seen:
            seen.add(token)
            tokens.append(token)
    return tokens


def extract_file_tokens(raw_markdown: str) -> list[tuple[str, str]]:
    files: list[tuple[str, str]] = []
    seen: set[str] = set()
    for token, name in FILE_TAG_RE.findall(raw_markdown):
        if token in seen:
            continue
        seen.add(token)
        files.append((token, sanitize_name(name) if name else ""))
    return files


def extract_whiteboard_tokens(raw_markdown: str) -> list[str]:
    tokens: list[str] = []
    seen: set[str] = set()
    for token in WHITEBOARD_RE.findall(raw_markdown):
        if token not in seen:
            seen.add(token)
            tokens.append(token)
    return tokens


def markdown_relative_link(markdown_file: Path, target: Path) -> str:
    relative = os.path.relpath(target, markdown_file.parent)
    return relative.replace(os.sep, "/")


def relative_output_for_cli(target: Path) -> str:
    target = ensure_within_workspace(target)
    relative = os.path.relpath(target, WORKSPACE_ROOT)
    return relative.replace(os.sep, "/")


def save_media_preview(lark_cli: str, token: str, output_stub: Path) -> Path:
    output_stub.parent.mkdir(parents=True, exist_ok=True)
    payload = run_json_command(
        [
            lark_cli,
            "docs",
            "+media-preview",
            "--as",
            "user",
            "--token",
            token,
            "--output",
            relative_output_for_cli(output_stub),
            "--overwrite",
        ],
        env=LARK_ENV,
    )
    saved_path = payload.get("data", {}).get("saved_path")
    if not saved_path:
        raise RuntimeError(f"Missing saved_path when previewing media {token}")
    return Path(saved_path).resolve()


def save_whiteboard_thumbnail(lark_cli: str, token: str, output_stub: Path) -> Path:
    output_stub.parent.mkdir(parents=True, exist_ok=True)
    payload = run_json_command(
        [
            lark_cli,
            "docs",
            "+media-download",
            "--as",
            "user",
            "--type",
            "whiteboard",
            "--token",
            token,
            "--output",
            relative_output_for_cli(output_stub),
            "--overwrite",
        ],
        env=LARK_ENV,
    )
    saved_path = payload.get("data", {}).get("saved_path")
    if not saved_path:
        raise RuntimeError(f"Missing saved_path when downloading whiteboard {token}")
    return Path(saved_path).resolve()


def rewrite_image_links(parser_markdown: str, image_map: dict[str, str]) -> tuple[str, list[str]]:
    output = parser_markdown
    unresolved: list[str] = []
    for token, rel_path in image_map.items():
        replacement = f"![图片:{token}](<./{rel_path}>)"
        placeholder = f"![图片:{token}]()"
        if placeholder in output:
            output = output.replace(placeholder, replacement)
            continue
        remote_url = f"https://feishu.cn/file/{token}"
        remote_url_www = f"https://www.feishu.cn/file/{token}"
        if remote_url in output or remote_url_www in output:
            output = output.replace(remote_url, f"./{rel_path}")
            output = output.replace(remote_url_www, f"./{rel_path}")
            continue
        unresolved.append(token)
    return output, unresolved


def normalize_markdown(
    *,
    title: str,
    doc_url: str,
    folder_parts: list[str],
    markdown: str,
) -> str:
    text = markdown.replace("\r\n", "\n").strip()
    if not text:
        return f"# {title}\n\n- **来源**：{doc_url}\n"

    if title and text.startswith(f"## {title}\n"):
        text = f"# {title}\n" + text[len(f"## {title}\n") :]
    elif text.startswith("## "):
        first_line_end = text.find("\n")
        if first_line_end != -1:
            first_line = text[:first_line_end]
            text = "# " + first_line[3:] + text[first_line_end:]

    lines = text.splitlines()
    if not lines or not lines[0].startswith("# "):
        lines.insert(0, f"# {title}")

    meta_lines = [f"- **来源**：{doc_url}"]
    if folder_parts:
        meta_lines.append(f"- **飞书目录**：{' / '.join(folder_parts)}")

    if len(lines) == 1:
        lines.extend(["", *meta_lines])
    else:
        lines = [lines[0], "", *meta_lines, "", *lines[1:]]

    return "\n".join(lines).rstrip() + "\n"


def append_extra_sections(
    markdown: str,
    *,
    attachments: list[tuple[str, str]],
    whiteboards: list[tuple[str, str]],
    unresolved_images: list[str],
    image_map: dict[str, str],
) -> str:
    sections: list[str] = []

    if attachments:
        sections.append("## 文档附件")
        sections.append("")
        for name, rel_path in attachments:
            sections.append(f"- [{name}](<./{rel_path}>)")
        sections.append("")

    if whiteboards:
        sections.append("## 白板缩略图")
        sections.append("")
        for label, rel_path in whiteboards:
            sections.append(f"### {label}")
            sections.append("")
            sections.append(f"![{label}](<./{rel_path}>)")
            sections.append("")

    if unresolved_images:
        sections.append("## 补充图片资源")
        sections.append("")
        for token in unresolved_images:
            rel_path = image_map.get(token)
            if not rel_path:
                continue
            sections.append(f"![图片:{token}](<./{rel_path}>)")
            sections.append("")

    if not sections:
        return markdown

    return markdown.rstrip() + "\n\n" + "\n".join(sections).rstrip() + "\n"


def raw_fallback_markdown(raw_markdown: str, title: str, doc_url: str, folder_parts: list[str]) -> str:
    text = raw_markdown.replace("\r\n", "\n")
    text = TITLE_TAG_RE.sub("", text, count=1).lstrip()
    text = normalize_markdown(title=title, doc_url=doc_url, folder_parts=folder_parts, markdown=text)
    return text


def export_one_doc(
    *,
    lark_cli: str,
    feishu_lark: str,
    doc: dict[str, Any],
    output_root: Path,
) -> dict[str, Any]:
    folder_parts = doc["folder_parts"]
    safe_title = doc["name"]
    output_dir = ensure_within_workspace(output_root.joinpath(*folder_parts))
    output_dir.mkdir(parents=True, exist_ok=True)
    markdown_path = output_dir / f"{safe_title}.md"
    assets_dir = output_dir / f"{safe_title}.assets"

    raw_document = fetch_doc_markdown(lark_cli, doc["url"] or doc["token"])
    raw_markdown = raw_document.get("content", "")
    title = extract_title_from_raw(raw_markdown) or safe_title

    parser_source = "parser"
    try:
        parser_markdown = parse_doc_markdown(feishu_lark, doc["url"])
        base_markdown = normalize_markdown(
            title=title,
            doc_url=doc["url"],
            folder_parts=folder_parts,
            markdown=parser_markdown,
        )
    except Exception:
        parser_source = "raw_fetch_fallback"
        base_markdown = raw_fallback_markdown(raw_markdown, title, doc["url"], folder_parts)

    image_tokens = extract_image_tokens(raw_markdown)
    file_tokens = extract_file_tokens(raw_markdown)
    whiteboard_tokens = extract_whiteboard_tokens(raw_markdown)

    image_map: dict[str, str] = {}
    attachment_links: list[tuple[str, str]] = []
    whiteboard_links: list[tuple[str, str]] = []

    if image_tokens or file_tokens or whiteboard_tokens:
        assets_dir.mkdir(parents=True, exist_ok=True)

    for index, token in enumerate(image_tokens, start=1):
        saved = save_media_preview(lark_cli, token, assets_dir / f"image-{index:03d}")
        rel_path = markdown_relative_link(markdown_path, saved)
        image_map[token] = rel_path

    for index, (token, original_name) in enumerate(file_tokens, start=1):
        if original_name:
            stem = Path(original_name).stem
            suffix = Path(original_name).suffix
            base = sanitize_name(stem) or f"attachment-{index:03d}"
            output_stub = assets_dir / f"attachment-{index:03d}-{base}{suffix}"
        else:
            output_stub = assets_dir / f"attachment-{index:03d}"
        saved = save_media_preview(lark_cli, token, output_stub)
        rel_path = markdown_relative_link(markdown_path, saved)
        attachment_links.append((saved.name, rel_path))

    for index, token in enumerate(whiteboard_tokens, start=1):
        saved = save_whiteboard_thumbnail(lark_cli, token, assets_dir / f"whiteboard-{index:03d}")
        rel_path = markdown_relative_link(markdown_path, saved)
        whiteboard_links.append((f"白板 {index}", rel_path))

    rewritten_markdown, unresolved_images = rewrite_image_links(base_markdown, image_map)
    final_markdown = append_extra_sections(
        rewritten_markdown,
        attachments=attachment_links,
        whiteboards=whiteboard_links,
        unresolved_images=unresolved_images,
        image_map=image_map,
    )
    markdown_path.write_text(final_markdown, encoding="utf-8")

    return {
        "title": title,
        "token": doc["token"],
        "type": doc["type"],
        "url": doc["url"],
        "folder_parts": folder_parts,
        "markdown_path": str(markdown_path),
        "parser_source": parser_source,
        "image_count": len(image_tokens),
        "attachment_count": len(file_tokens),
        "whiteboard_count": len(whiteboard_tokens),
        "unresolved_image_count": len(unresolved_images),
    }


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--folder-token", required=True, help="Drive folder token to export")
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Output directory under the current workspace",
    )
    parser.add_argument("--max-docs", type=int, default=0, help="Only export the first N docs")
    parser.add_argument("--manifest-name", default="export_manifest.json", help="Manifest filename")
    parser.add_argument("--lark-cli", default=DEFAULT_LARK, help="Path to lark-cli")
    parser.add_argument("--feishu-lark", default=DEFAULT_FEISHU_LARK, help="Path to feishu-lark")
    return parser


def main() -> int:
    args = build_arg_parser().parse_args()

    output_root = ensure_within_workspace((WORKSPACE_ROOT / args.output_dir).resolve())
    output_root.mkdir(parents=True, exist_ok=True)

    lark_cli = str(Path(args.lark_cli).resolve())
    feishu_lark = str(Path(args.feishu_lark).resolve())

    docs = walk_tree(lark_cli, args.folder_token, [])
    if args.max_docs > 0:
        docs = docs[: args.max_docs]

    manifest: dict[str, Any] = {
        "folder_token": args.folder_token,
        "output_dir": str(output_root),
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "doc_count": len(docs),
        "docs": [],
        "failures": [],
    }

    for index, doc in enumerate(docs, start=1):
        human_path = " / ".join([*doc["folder_parts"], doc["name"]])
        print(f"[{index}/{len(docs)}] Exporting {human_path}", flush=True)
        try:
            entry = export_one_doc(
                lark_cli=lark_cli,
                feishu_lark=feishu_lark,
                doc=doc,
                output_root=output_root,
            )
            manifest["docs"].append(entry)
        except Exception as exc:
            manifest["failures"].append(
                {
                    "token": doc["token"],
                    "title": doc["name"],
                    "folder_parts": doc["folder_parts"],
                    "error": str(exc),
                }
            )
            print(f"  ERROR: {exc}", file=sys.stderr, flush=True)

        manifest_path = output_root / args.manifest_name
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    manifest["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    manifest_path = output_root / args.manifest_name
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": not manifest["failures"],
                "exported": len(manifest["docs"]),
                "failed": len(manifest["failures"]),
                "manifest": str(manifest_path),
            },
            ensure_ascii=False,
        )
    )
    return 0 if not manifest["failures"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
