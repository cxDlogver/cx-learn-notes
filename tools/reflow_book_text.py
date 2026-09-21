from __future__ import annotations

import re
import sys
import unicodedata
from pathlib import Path


FRONT_HEADINGS = {
    "版权信息",
    "前言",
    "关于本书",
    "本书的“口头禅”",
    "可能被怀疑成抄袭者",
    "关于这本书的错误",
    "致谢",
    "参考资料",
}

RADICAL_TRANSLATION = str.maketrans(
    {
        "⻓": "长", "⻆": "角", "⻛": "风", "⻅": "见", "⻢": "马", "⻔": "门",
        "⻄": "西", "⻋": "车", "⻜": "飞", "⻩": "黄", "⺠": "民", "⺟": "母",
        "⻉": "贝", "⻚": "页", "⻙": "韦", "⻨": "麦", "⻥": "鱼", "⻣": "骨",
        "⻝": "食", "⻬": "齐", "⻘": "青", "⻰": "龙", "⻁": "虎", "⻮": "齿",
    }
)

METADATA_RE = re.compile(r"^(?:COPYRIGHT|书名：|作者：|出版社：|出版时间：|ISBN：|字数：|版权所有)")

TERMINAL_RE = re.compile(r"[。！？!?；;：:]([”’』》）】〕」\"])?$")
PART_RE = re.compile(r"^第([0-9一二三四五六七八九十百]+)部分$")
NUMBERED_RE = re.compile(r"^(?:\d+[.、]|（\d+）|\([0-9]+\)|[一二三四五六七八九十]+、)")
ASCII_RE = re.compile(r"[A-Za-z0-9]")


def norm(line: str) -> str:
    normalized: list[str] = []
    for char in line:
        if 0x2F00 <= ord(char) <= 0x2FDF or char in "ﬀﬁﬂﬃﬄﬅﬆ":
            normalized.append(unicodedata.normalize("NFKC", char))
        else:
            normalized.append(char)
    line = "".join(normalized).translate(RADICAL_TRANSLATION)
    line = line.replace("\u00a0", " ").replace("\u2002", " ").replace("\u2003", " ")
    line = re.sub(r"[ \t]+", " ", line.strip())
    return line


def is_terminal(line: str) -> bool:
    return bool(TERMINAL_RE.search(line))


def join_fragments(left: str, right: str) -> str:
    if not left:
        return right
    if not right:
        return left
    if ASCII_RE.fullmatch(left[-1]) and ASCII_RE.fullmatch(right[0]):
        return left + " " + right
    return left + right


def is_short_subheading(lines: list[str], index: int) -> bool:
    line = lines[index]
    if not line or len(line) > 28 or is_terminal(line):
        return False
    if line.startswith(("——", "—", "-", "•", "·", "“", "‘", "《")):
        return False
    if any(ch in line for ch in "=<>≤≥→←↑↓|{}[]"):
        return False
    if re.search(r"[,，;；:]", line):
        return False
    if PART_RE.match(line) or line in FRONT_HEADINGS:
        return False
    if index + 1 < len(lines) and lines[index + 1].startswith("——"):
        return False

    # Short numbered labels such as “1.用于管理团队” are reliable subheads.
    if NUMBERED_RE.match(line):
        return len(line) <= 24

    # Unnumbered subheads are usually short, follow a completed paragraph, and
    # introduce a substantially longer prose line.
    if index == 0 or index + 1 >= len(lines):
        return False
    prev_line = lines[index - 1]
    next_line = lines[index + 1]
    if not is_terminal(prev_line) or len(next_line) < 18:
        return False
    if is_terminal(next_line) and len(next_line) < 32:
        return False
    return 2 <= len(line) <= 20


def classify(lines: list[str], index: int) -> tuple[str, int] | None:
    line = lines[index]
    if not line:
        return ("blank", 1)
    if line in FRONT_HEADINGS:
        return ("h1", 1)
    if METADATA_RE.match(line):
        return ("meta", 1)
    if PART_RE.match(line):
        return ("part", 2 if index + 1 < len(lines) else 1)
    if index + 1 < len(lines) and lines[index + 1].startswith("——"):
        return ("model", 2)
    if is_short_subheading(lines, index):
        return ("h3", 1)
    return None


def reflow(source: Path) -> list[tuple[str, str]]:
    raw = source.read_text(encoding="utf-8-sig")
    lines = [norm(line) for line in raw.splitlines()]
    blocks: list[tuple[str, str]] = []
    paragraph = ""

    def flush() -> None:
        nonlocal paragraph
        if paragraph:
            blocks.append(("p", paragraph))
            paragraph = ""

    i = 0
    while i < len(lines):
        classified = classify(lines, i)
        if classified:
            kind, consumed = classified
            flush()
            if kind == "blank":
                i += consumed
                continue
            if kind == "part":
                title = lines[i]
                if consumed == 2 and lines[i + 1]:
                    title += "　" + lines[i + 1]
                blocks.append(("h1", title))
            elif kind == "model":
                subtitle = lines[i + 1].lstrip("—-").strip()
                blocks.append(("h2", f"{lines[i]}——{subtitle}"))
            else:
                blocks.append((kind, lines[i]))
            i += consumed
            continue

        line = lines[i]
        if not line:
            flush()
            i += 1
            continue

        # A new numbered entry starts a fresh paragraph. Its wrapped continuation
        # lines are still joined normally.
        if NUMBERED_RE.match(line) and paragraph:
            flush()
        paragraph = join_fragments(paragraph, line)
        if is_terminal(line):
            flush()
        i += 1

    flush()
    return blocks


def write_markdown(blocks: list[tuple[str, str]], target: Path) -> None:
    rendered: list[str] = []
    for kind, text in blocks:
        if kind == "h1":
            rendered.append(f"# {text}")
        elif kind == "h2":
            rendered.append(f"## {text}")
        elif kind == "h3":
            rendered.append(f"### {text}")
        else:
            rendered.append(text)
    target.write_text("\n\n".join(rendered).rstrip() + "\n", encoding="utf-8-sig")


def write_plain_text(blocks: list[tuple[str, str]], target: Path) -> None:
    rendered = [text for _, text in blocks]
    target.write_text("\n\n".join(rendered).rstrip() + "\n", encoding="utf-8-sig")


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: reflow_book_text.py SOURCE OUTPUT.md OUTPUT.txt")
    source, markdown_target, text_target = map(Path, sys.argv[1:])
    blocks = reflow(source)
    write_markdown(blocks, markdown_target)
    write_plain_text(blocks, text_target)

    counts = {kind: sum(1 for block_kind, _ in blocks if block_kind == kind) for kind in ("h1", "h2", "h3", "p")}
    print(f"blocks={len(blocks)} h1={counts['h1']} h2={counts['h2']} h3={counts['h3']} paragraphs={counts['p']}")
    print(markdown_target)
    print(text_target)


if __name__ == "__main__":
    main()


