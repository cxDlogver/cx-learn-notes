"""Build the machine-readable ATDD case index from the reviewed Markdown matrix.

Usage: python docs/atdd/build_cases.py
No third-party dependency is required. The Markdown document remains normative.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


DOCS = Path(__file__).resolve().parents[1]
ROOT = DOCS.parent
MATRIX = DOCS / "ATDD-BDD-计划打卡-iOS-v1-验收矩阵.md"
PAGE_MAP = DOCS / "ui" / "plan-checkin-page-map.json"
VISUAL_TREE = DOCS / "ui" / "plan-checkin-visual-tree.json"
OUTPUT = Path(__file__).with_name("acceptance-cases.json")

COUNTS = {
    "AUTH": 14,
    "PLAN": 31,
    "CHECK": 34,
    "STAT": 18,
    "SYNC": 15,
    "SOCIAL": 23,
    "NOTIFY": 14,
    "DATA": 13,
    "UI": 24,
    "SEC": 11,
}
EVIDENCE_CODES = {"S", "H", "V", "A", "D", "L", "N", "F", "T"}
CASE_START = re.compile(
    r"^\| ((?:AUTH|PLAN|CHECK|STAT|SYNC|SOCIAL|NOTIFY|DATA|UI|SEC)-\d{2}) \|"
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    cases: list[dict[str, object]] = []
    ids: set[str] = set()

    for line_number, line in enumerate(MATRIX.read_text(encoding="utf-8").splitlines(), 1):
        if not CASE_START.match(line):
            continue
        cells = [cell.strip() for cell in line.split("|")[1:-1]]
        if len(cells) != 7:
            raise ValueError(f"line {line_number}: expected 7 columns, got {len(cells)}")
        case_id, given, when, functional, visual, negative, evidence = cells
        if case_id in ids:
            raise ValueError(f"line {line_number}: duplicate {case_id}")
        if not all((given, when, functional, visual, negative, evidence)):
            raise ValueError(f"line {line_number}: empty case cell")
        codes = evidence.split()
        if not set(codes) <= EVIDENCE_CODES or len(codes) != len(set(codes)):
            raise ValueError(f"line {line_number}: invalid or duplicate evidence code")
        if visual != "N/A" and not {"S", "H", "V"} <= set(codes):
            raise ValueError(f"line {line_number}: visual case lacks S/H/V evidence")
        ids.add(case_id)
        cases.append(
            {
                "id": case_id,
                "given": given,
                "when": when,
                "then": {
                    "functional": functional,
                    "visual": visual,
                    "negative": negative,
                },
                "evidenceCodes": codes,
                "matrixLine": line_number,
            }
        )

    expected = {
        f"{prefix}-{number:02d}"
        for prefix, maximum in COUNTS.items()
        for number in range(1, maximum + 1)
    }
    if ids != expected:
        raise ValueError(
            f"case IDs differ; missing={sorted(expected - ids)}, extra={sorted(ids - expected)}"
        )

    page_map = json.loads(PAGE_MAP.read_text(encoding="utf-8"))
    visual_tree = json.loads(VISUAL_TREE.read_text(encoding="utf-8"))
    map_screens = [screen for group in page_map["groups"] for screen in group["screens"]]
    tree_screens = {screen["key"]: screen for screen in visual_tree["screens"]}
    if len(map_screens) != 32 or set(tree_screens) != {screen["key"] for screen in map_screens}:
        raise ValueError("32-page design map and visual tree do not match")
    screens: list[dict[str, object]] = []
    for screen in map_screens:
        tree = tree_screens[screen["key"]]
        image_name = f"uxpilot-export-09-27-26_{screen['imageNo']:02}.png"
        if tree["order"] != screen["order"] or tree["referenceImage"] != image_name:
            raise ValueError(f"design mismatch for {screen['key']}")
        screens.append(
            {
                "key": screen["key"],
                "order": screen["order"],
                "title": screen["title"],
                "frameId": tree["frameId"],
                "referenceImage": image_name,
            }
        )

    source_paths = {
        "prd": DOCS / "PRD-计划打卡-iOS-v1.md",
        "uiux": DOCS / "UIUX-计划打卡-iOS-v1.md",
        "technical": DOCS / "技术方案-计划打卡-iOS-v1.md",
        "pageMap": PAGE_MAP,
        "visualTree": VISUAL_TREE,
        "pen": DOCS / "ui" / "plan-checkin.pen",
    }
    output = {
        "schemaVersion": "1.0",
        "title": "计划打卡 iOS V1 ATDD/BDD 用例索引",
        "normativeMatrix": str(MATRIX.relative_to(ROOT)).replace("\\", "/"),
        "matrixSha256": digest(MATRIX),
        "sourceDigest": {name: digest(path) for name, path in source_paths.items()},
        "caseCount": len(cases),
        "screenCount": len(screens),
        "screens": screens,
        "cases": cases,
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUTPUT.name}: {len(cases)} cases, {len(screens)} screens")


if __name__ == "__main__":
    main()
