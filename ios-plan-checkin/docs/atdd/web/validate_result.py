"""Validate one real Web ATDD result and all evidence files before counting it.

Usage: python docs/atdd/web/validate_result.py evidence/<runId>/<caseId>/<variant>/result.json
Requires jsonschema (see requirements.txt). This tool never creates PASS results.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[3]
DOCS = ROOT / "docs"
WEB = DOCS / "atdd" / "web"
MANIFEST = WEB / "acceptance-cases.json"
SCHEMA = WEB / "acceptance-result.schema.json"
SAFE_PART = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def relative_file(base: Path, relative: str) -> Path:
    part = Path(relative)
    if part.is_absolute() or ".." in part.parts or "\\" in relative:
        raise ValueError(f"unsafe evidence path: {relative}")
    target = (base / part).resolve()
    if not target.is_relative_to(base.resolve()) or not target.is_file():
        raise ValueError(f"missing or external evidence: {relative}")
    return target


def validate_result(path: Path, *, enforce_path: bool = True) -> dict:
    result_path = path.resolve()
    result = read_json(result_path)
    Draft202012Validator(read_json(SCHEMA), format_checker=FormatChecker()).validate(result)
    manifest = read_json(MANIFEST)
    case = next((item for item in manifest["cases"] if item["id"] == result["caseId"]), None)
    if case is None:
        raise ValueError(f"unknown case ID: {result['caseId']}")
    if enforce_path:
        for part in (result["runId"], result["caseId"], result["variant"]):
            if not SAFE_PART.fullmatch(part):
                raise ValueError(f"unsafe run/case/variant path segment: {part}")
        expected = ROOT / "evidence" / result["runId"] / result["caseId"] / result["variant"] / "result.json"
        if result_path != expected.resolve():
            raise ValueError(f"result path must be {expected}")
    if result["build"]["sourceDigest"] != manifest["sourceDigest"]:
        raise ValueError("result uses a stale source digest")
    for key, relative in manifest["sourcePaths"].items():
        if sha256(DOCS / relative) != manifest["sourceDigest"][key]:
            raise ValueError(f"acceptance source changed without regenerating cases: {key}")
    if not set(case["sourceRefs"]) <= set(result["sourceRefs"]):
        raise ValueError("result lacks source references from the case index")
    for key in ("functional", "visual", "negative"):
        if result["assertions"][key]["expected"] != case["then"][key]:
            raise ValueError(f"{key} expected text differs from the acceptance baseline")
    if result["assertions"]["visual"]["status"] == "N_A" and case["then"]["visual"] != "N/A":
        raise ValueError("visual N_A is allowed only for a matrix N/A case")

    evidence_paths: set[str] = set()
    evidence_codes: set[str] = set()
    for item in result["evidence"]:
        evidence_file = relative_file(result_path.parent, item["path"])
        if item["path"] in evidence_paths:
            raise ValueError(f"duplicate evidence path: {item['path']}")
        if sha256(evidence_file) != item["sha256"]:
            raise ValueError(f"evidence hash mismatch: {item['path']}")
        evidence_paths.add(item["path"])
        evidence_codes.add(item["code"])
    for key, assertion in result["assertions"].items():
        if not set(assertion["evidencePaths"]) <= evidence_paths:
            raise ValueError(f"{key} cites evidence absent from the manifest")
    if result["status"] == "PASS":
        if not set(case["evidenceCodes"]) <= evidence_codes:
            raise ValueError("PASS lacks required S/H/V/A/D/L/N/F/T evidence codes")
        for key, assertion in result["assertions"].items():
            if assertion["status"] != "N_A" and not assertion["evidencePaths"]:
                raise ValueError(f"PASS {key} assertion has no cited evidence")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("result", type=Path)
    args = parser.parse_args()
    result = validate_result(args.result)
    print(f"validated {result['caseId']} {result['variant']} {result['status']}")


if __name__ == "__main__":
    main()
