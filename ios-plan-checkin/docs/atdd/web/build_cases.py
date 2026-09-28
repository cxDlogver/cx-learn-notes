"""Generate the Web ATDD case index from the normative Markdown matrix.

Usage: python docs/atdd/web/build_cases.py
Only Python's standard library is required. Run again after any source edit.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


DOCS = Path(__file__).resolve().parents[2]
MATRIX = DOCS / "ATDD-BDD-计划打卡-Web-v1-验收矩阵.md"
OUTPUT = Path(__file__).with_name("acceptance-cases.json")
SOURCES = {
    "webPrd": DOCS / "PRD-计划打卡-Web-v1.md",
    "webTechnical": DOCS / "技术方案-计划打卡-Web-v1.md",
    "iosPrd": DOCS / "PRD-计划打卡-iOS-v1.md",
    "iosAcceptance": DOCS / "ATDD-BDD-计划打卡-iOS-v1-验收矩阵.md",
    "iosPen": DOCS / "ui" / "plan-checkin.pen",
    "matrix": MATRIX,
}
COUNTS = {
    "AUTH": 12,
    "PLAN": 18,
    "CHECK": 18,
    "STAT": 12,
    "ONLINE": 8,
    "SOCIAL": 14,
    "NOTIFY": 16,
    "DATA": 10,
    "UI": 16,
    "SEC": 12,
}
EVIDENCE_CODES = {"S", "H", "V", "A", "D", "L", "N", "F", "T"}
CASE_START = re.compile(
    r"^\| (WEB-(?:AUTH|PLAN|CHECK|STAT|ONLINE|SOCIAL|NOTIFY|DATA|UI|SEC)-\d{2}) \|"
)
DOMAIN_SOURCES = {
    "AUTH": ["webPrd", "webTechnical"],
    "PLAN": ["webPrd", "iosPrd", "webTechnical"],
    "CHECK": ["webPrd", "iosPrd", "webTechnical"],
    "STAT": ["webPrd", "iosPrd", "webTechnical"],
    "ONLINE": ["webPrd", "webTechnical"],
    "SOCIAL": ["webPrd", "iosPrd", "webTechnical"],
    "NOTIFY": ["webPrd", "webTechnical"],
    "DATA": ["webPrd", "webTechnical"],
    "UI": ["webPrd", "webTechnical", "iosPen"],
    "SEC": ["webPrd", "webTechnical"],
}


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
        domain = case_id.split("-")[1]
        cases.append(
            {
                "id": case_id,
                "domain": domain,
                "given": given,
                "when": when,
                "then": {
                    "functional": functional,
                    "visual": visual,
                    "negative": negative,
                },
                "evidenceCodes": codes,
                "matrixLine": line_number,
                "sourceRefs": ["matrix", *DOMAIN_SOURCES[domain], "iosAcceptance"],
            }
        )

    expected = {
        f"WEB-{domain}-{number:02d}"
        for domain, maximum in COUNTS.items()
        for number in range(1, maximum + 1)
    }
    if ids != expected:
        raise ValueError(
            f"case IDs differ; missing={sorted(expected - ids)}, extra={sorted(ids - expected)}"
        )

    output = {
        "title": "计划打卡 Web V1 ATDD/BDD 用例清单",
        "status": "acceptance-baseline-not-executed",
        "schemaVersion": "1.0.0",
        "caseCount": len(cases),
        "sourceDigest": {name: digest(path) for name, path in SOURCES.items()},
        "sourcePaths": {
            name: path.relative_to(DOCS).as_posix() for name, path in SOURCES.items()
        },
        "cases": cases,
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(cases)} Web cases to {OUTPUT}")


if __name__ == "__main__":
    main()
