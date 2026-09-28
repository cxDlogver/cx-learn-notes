"""Validate and package Web ATDD sources, live ledgers and immutable evidence.

Usage: python docs/atdd/web/archive_evidence.py --out docs/atdd/web/artifacts/run.zip
Run after check_execution_progress.py. CI uploads the ZIP even when its checks fail.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from check_execution_progress import main as check_progress
from validate_result import ROOT, WEB, read_json, sha256, validate_result


ARTIFACTS = WEB / "artifacts"


def archive(output: Path) -> dict:
    destination = output.resolve()
    if destination.parent != ARTIFACTS.resolve() or destination.suffix != ".zip":
        raise ValueError("archive must be a ZIP directly inside docs/atdd/web/artifacts")
    if destination.exists():
        raise ValueError("archive already exists; use a new run name")
    check_progress()
    manifest = read_json(WEB / "acceptance-cases.json")
    files: set[Path] = {
        ROOT / "docs/任务执行计划-计划打卡-Web-v1.md",
        WEB / "execution-progress.json",
        WEB / "acceptance-cases.json",
        WEB / "acceptance-result.schema.json",
    }
    files.update(ROOT / "docs" / path for path in manifest["sourcePaths"].values())
    for evidence_root in (WEB / "evidence", ROOT / "evidence"):
        if not evidence_root.exists():
            continue
        for file in evidence_root.rglob("*"):
            if file.is_symlink():
                raise ValueError(f"evidence symlink is not allowed: {file}")
            if file.is_file():
                if file.name == "result.json":
                    validate_result(file)
                files.add(file)
    entries = []
    for file in sorted(files):
        resolved = file.resolve()
        if not resolved.is_relative_to(ROOT) or not resolved.is_file():
            raise ValueError(f"invalid archive source: {file}")
        entries.append({
            "path": resolved.relative_to(ROOT).as_posix(),
            "bytes": resolved.stat().st_size,
            "sha256": sha256(resolved),
        })
    index = {
        "kind": "web-atdd-evidence-archive",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "caseCount": len(manifest["cases"]),
        "businessResultCount": sum(1 for item in entries if item["path"].startswith("evidence/") and item["path"].endswith("/result.json")),
        "files": entries,
    }
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "x", compression=zipfile.ZIP_DEFLATED) as zipped:
        for item in entries:
            zipped.write(ROOT / item["path"], item["path"])
        zipped.writestr("archive-index.json", json.dumps(index, ensure_ascii=False, indent=2) + "\n")
    with zipfile.ZipFile(destination) as zipped:
        for item in entries:
            if hashlib.sha256(zipped.read(item["path"])).hexdigest() != item["sha256"]:
                raise ValueError(f"archive verification failed: {item['path']}")
    (destination.with_suffix(".sha256")).write_bytes((sha256(destination) + "\n").encode("ascii"))
    return {"path": str(destination), "sha256": sha256(destination), "files": len(entries), "businessResults": index["businessResultCount"]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    print(json.dumps(archive(parser.parse_args().out), ensure_ascii=False))


if __name__ == "__main__":
    main()
