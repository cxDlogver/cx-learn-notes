"""Record one observed Web ATDD run and synchronize JSON/Markdown.

Usage: python docs/atdd/web/record_result.py observation.json
The observation must contain real F/V/N actuals, evidence paths and a reviewer.
This command does not execute a case or infer PASS from a browser screenshot.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from validate_result import MANIFEST, ROOT, SAFE_PART, WEB, read_json, relative_file, sha256, validate_result


LEDGER = WEB / "execution-progress.json"
PLAN = ROOT / "docs" / "任务执行计划-计划打卡-Web-v1.md"


def record(observation_path: Path) -> Path:
    observation = read_json(observation_path)
    manifest = read_json(MANIFEST)
    case = next((item for item in manifest["cases"] if item["id"] == observation["caseId"]), None)
    if case is None:
        raise ValueError(f"unknown case: {observation['caseId']}")
    if not SAFE_PART.fullmatch(observation["runId"]) or not SAFE_PART.fullmatch(observation["variant"]):
        raise ValueError("runId and variant must be safe single path segments")
    ledger = read_json(LEDGER)
    entry = next(item for item in ledger["caseLedger"] if item["caseId"] == case["id"])
    if observation["status"] == "PASS" and entry["implementationStatus"] != "IMPLEMENTED":
        raise ValueError("PASS requires an implemented case with code paths and commit in the ledger")

    result_dir = ROOT / "evidence" / observation["runId"] / case["id"] / observation["variant"]
    result_path = result_dir / "result.json"
    if result_path.exists():
        raise ValueError(f"result already exists; use a new runId: {result_path}")
    evidence = []
    for item in observation["evidence"]:
        file = relative_file(result_dir, item["path"])
        evidence.append({**item, "sha256": sha256(file)})
    assertions = {
        key: {**observation["assertions"][key], "expected": case["then"][key]}
        for key in ("functional", "visual", "negative")
    }
    result = {
        "caseId": case["id"],
        "variant": observation["variant"],
        "runId": observation["runId"],
        "status": observation["status"],
        "sourceRefs": case["sourceRefs"],
        "build": {**observation["build"], "sourceDigest": manifest["sourceDigest"]},
        "environment": observation["environment"],
        "fixtureId": observation["fixtureId"],
        "startedAt": observation["startedAt"],
        "endedAt": observation["endedAt"],
        "assertions": assertions,
        "evidence": evidence,
        "reviewer": observation["reviewer"],
    }
    if "blocker" in observation:
        result["blocker"] = observation["blocker"]

    # Validate the schema and hashes before updating either progress document.
    result_dir.mkdir(parents=True, exist_ok=True)
    result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    try:
        validate_result(result_path)
    except Exception:
        result_path.unlink()
        raise

    relative_result = result_path.relative_to(ROOT).as_posix()
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    # A retest supersedes only the same variant. Its prior result remains on disk
    # and in history, while other variants keep their own verdicts.
    entry["variants"] = [
        item for item in entry["variants"] if item["variant"] != result["variant"]
    ]
    entry["variants"].append({
        "variant": result["variant"], "runId": result["runId"],
        "status": result["status"], "resultPath": relative_result,
    })
    statuses = {item["status"] for item in entry["variants"]}
    entry["verificationStatus"] = (
        "FAIL" if "FAIL" in statuses else
        "BLOCKED" if "BLOCKED" in statuses else
        "NOT_RUN" if "NOT_RUN" in statuses else "PASS"
    )
    entry["history"].append({
        "at": now, "type": "CASE_RECORDED",
        "summary": f"{result['variant']} {result['status']}; F/V/N observed and evidence hashed",
        "evidencePath": relative_result,
    })
    ledger["updatedAt"] = now
    ledger_text = json.dumps(ledger, ensure_ascii=False, indent=2) + "\n"
    evidence_links = ", ".join(
        f"[{item['code']} {item['path']}](../{relative_result.rsplit('/', 1)[0]}/{item['path']})"
        for item in evidence
    )
    lines = [
        f"\n### {now}｜{case['id']}｜{result['variant']}｜{result['status']}\n",
        f"- 运行：`{result['runId']}`；构建 `{result['build']['gitCommit']}`；数据 `{result['fixtureId']}`；评审 `{result['reviewer']['name']}`。",
        f"- 环境：`{json.dumps(result['environment'], ensure_ascii=False, sort_keys=True)}`。",
    ]
    for key, label in (("functional", "F"), ("visual", "V"), ("negative", "N")):
        assertion = assertions[key]
        lines.append(f"- {label} `{assertion['status']}`：预期 {assertion['expected']}；实际 {assertion['actual']}；证据 {', '.join(assertion['evidencePaths']) or '无'}。")
    lines += [f"- 原始证据：{evidence_links or '无'}。", f"- 结果：[{relative_result}](../{relative_result})。\n"]
    # Keep every observed result under §6, ahead of decisions and release gates.
    plan_text = PLAN.read_text(encoding="utf-8")
    section = "\n## 7. 决策与偏差记录"
    if plan_text.count(section) != 1:
        raise ValueError("cannot locate the unique execution-log boundary in the plan")
    PLAN.write_text(
        plan_text.replace(section, "\n".join(lines) + section), encoding="utf-8"
    )
    LEDGER.write_text(ledger_text, encoding="utf-8")
    return result_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("observation", type=Path)
    path = record(parser.parse_args().observation)
    print(f"recorded {path.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
