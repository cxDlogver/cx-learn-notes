"""Check Web plan checkboxes, task ledger, cases, and completed evidence.

Usage: python docs/atdd/web/check_execution_progress.py
No dependency is needed until PASS results exist; validating those requires jsonschema.
"""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DOCS = ROOT / "docs"
PLAN = DOCS / "任务执行计划-计划打卡-Web-v1.md"
LEDGER = DOCS / "atdd" / "web" / "execution-progress.json"
MANIFEST = DOCS / "atdd" / "web" / "acceptance-cases.json"
CHECKBOX = re.compile(r"^- \[([ x])\] \*\*(WEB-\d{2})｜", re.MULTILINE)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def safe_path(relative: str, *, base: Path = ROOT) -> Path:
    path = Path(relative)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"unsafe path: {relative}")
    resolved = (base / path).resolve()
    if not resolved.is_relative_to(base.resolve()):
        raise ValueError(f"path outside root: {relative}")
    return resolved


def main() -> None:
    progress = read_json(LEDGER)
    manifest = read_json(MANIFEST)
    checkboxes = dict((task_id, state == "x") for state, task_id in CHECKBOX.findall(PLAN.read_text(encoding="utf-8")))
    tasks = progress["tasks"]
    cases = progress["caseLedger"]
    task_by_id = {task["id"]: task for task in tasks}
    case_by_id = {case["caseId"]: case for case in cases}
    expected_task_ids = {f"WEB-{number:02d}" for number in range(1, 23)}
    expected_case_ids = {case["id"] for case in manifest["cases"]}
    if len(tasks) != len(task_by_id) or set(task_by_id) != expected_task_ids:
        raise ValueError("task IDs are missing or duplicated")
    if len(cases) != len(case_by_id) or set(case_by_id) != expected_case_ids:
        raise ValueError("case IDs differ from the acceptance manifest")
    if set(checkboxes) != expected_task_ids:
        raise ValueError("Markdown checklist differs from JSON task IDs")
    if progress["sourceDigest"] != manifest["sourceDigest"]:
        raise ValueError("source digest changed: review affected cases and update the ledger")

    owner_by_domain = {
        "AUTH": "WEB-05", "PLAN": "WEB-07", "CHECK": "WEB-10", "STAT": "WEB-11",
        "ONLINE": "WEB-12", "SOCIAL": "WEB-14", "NOTIFY": "WEB-16", "DATA": "WEB-18",
        "UI": "WEB-19", "SEC": "WEB-20",
    }
    for task in tasks:
        task_id = task["id"]
        if task["status"] not in progress["allowedTaskStatuses"]:
            raise ValueError(f"{task_id}: invalid task status")
        if checkboxes[task_id] != (task["status"] == "DONE"):
            raise ValueError(f"{task_id}: Markdown checkbox and JSON status differ")
        for dependency in task["dependencies"]:
            if dependency not in task_by_id or dependency == task_id:
                raise ValueError(f"{task_id}: invalid dependency {dependency}")
        expected_owned = {
            case_id for case_id, case in case_by_id.items() if case["ownerTask"] == task_id
        }
        if set(task["ownedCaseIds"]) != expected_owned or len(task["ownedCaseIds"]) != len(expected_owned):
            raise ValueError(f"{task_id}: owned cases differ from case ledger")
        if task["status"] == "DONE":
            if any(task_by_id[dep]["status"] != "DONE" for dep in task["dependencies"]):
                raise ValueError(f"{task_id}: a dependency is not DONE")
            if not task["completedAt"] or not task["implementation"]["commit"]:
                raise ValueError(f"{task_id}: completion time or implementation commit missing")
            if not task["implementation"]["changedPaths"] or not task["implementation"]["checks"]:
                raise ValueError(f"{task_id}: code paths or checks missing")
            if any(check.get("exitCode") != 0 or not check.get("outputPath") for check in task["implementation"]["checks"]):
                raise ValueError(f"{task_id}: successful check with output path required")
            if not task["verification"]["summary"] or not task["verification"]["evidence"]:
                raise ValueError(f"{task_id}: verification narrative and evidence required")
            if not task["review"]["reviewer"] or not task["review"]["reviewedAt"]:
                raise ValueError(f"{task_id}: review record required")
            if any(case_by_id[case_id]["verificationStatus"] != "PASS" for case_id in expected_owned):
                raise ValueError(f"{task_id}: an owned case is not PASS")

    manifest_cases = {case["id"]: case for case in manifest["cases"]}
    for case_id, case in case_by_id.items():
        source = manifest_cases[case_id]
        if case["ownerTask"] != owner_by_domain[source["domain"]]:
            raise ValueError(f"{case_id}: wrong owner task")
        expected_baseline = {
            "given": source["given"], "when": source["when"],
            "functional": source["then"]["functional"],
            "visual": source["then"]["visual"],
            "negative": source["then"]["negative"],
            "requiredEvidenceCodes": source["evidenceCodes"],
        }
        if case["baseline"] != expected_baseline:
            raise ValueError(f"{case_id}: baseline differs from manifest")
        if case["implementationStatus"] not in progress["allowedImplementationStatuses"]:
            raise ValueError(f"{case_id}: invalid implementation status")
        if case["verificationStatus"] not in progress["allowedVerificationStatuses"]:
            raise ValueError(f"{case_id}: invalid verification status")
        if case["implementationStatus"] == "IMPLEMENTED" and (
            not case["implementationPaths"] or not case["implementationCommit"]
        ):
            raise ValueError(f"{case_id}: implementation evidence missing")
        if case["verificationStatus"] != "PASS":
            continue
        if case["implementationStatus"] != "IMPLEMENTED" or not case["variants"]:
            raise ValueError(f"{case_id}: PASS without implementation or variant results")
        try:
            from validate_result import validate_result
        except ImportError as exc:
            raise RuntimeError("Install docs/atdd/web/requirements.txt to validate PASS results") from exc
        for variant in case["variants"]:
            if variant.get("status") != "PASS" or not variant.get("resultPath"):
                raise ValueError(f"{case_id}: non-PASS or missing result path in a passing case")
            result_path = safe_path(variant["resultPath"])
            result = validate_result(result_path)
            if result["caseId"] != case_id or result["variant"] != variant.get("variant"):
                raise ValueError(f"{case_id}: result identity differs from ledger")
            if result["runId"] != variant.get("runId") or result["status"] != "PASS":
                raise ValueError(f"{case_id}: result run or status differs from ledger")

    print(f"Web execution ledger OK: {len(tasks)} tasks, {len(cases)} cases")


if __name__ == "__main__":
    main()
