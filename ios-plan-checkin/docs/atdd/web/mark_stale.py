"""Advance the Web candidate commit and invalidate old PASS pointers.

Usage: python docs/atdd/web/mark_stale.py --commit <sha> --reason <text>
Original result.json files and raw evidence remain immutable.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from check_execution_progress import LEDGER, PLAN, read_json


COMMIT = re.compile(r"^[0-9a-f]{7,40}$")
BOUNDARY = "\n## 7. 决策与偏差记录"


def propagate(progress: dict, plan_text: str, commit: str, reason: str, at: str) -> tuple[dict, str, list[str], list[str]]:
    if not COMMIT.fullmatch(commit):
        raise ValueError("candidate commit must be a 7-40 character lowercase SHA")
    if not reason.strip() or "\n" in reason or "\r" in reason:
        raise ValueError("reason must be one nonempty line")
    if plan_text.count(BOUNDARY) != 1:
        raise ValueError("plan must contain one execution-log boundary")
    previous = progress.get("verificationBuildCommit")
    if previous == commit:
        return progress, plan_text, [], []
    affected_cases = []
    owners = set()
    for case in progress["caseLedger"]:
        changed = False
        for variant in case["variants"]:
            if variant["status"] == "PASS":
                variant["status"] = "STALE"
                changed = True
        if changed:
            case["verificationStatus"] = "STALE"
            case["history"].append({
                "at": at, "type": "STALE",
                "summary": f"候选构建从 {previous or '未锁定'} 改为 {commit}；旧 PASS 仅保留历史证据，需重新执行。原因：{reason}",
            })
            affected_cases.append(case["caseId"])
            owners.add(case["ownerTask"])
    reopened = []
    pending = set(owners)
    while pending:
        task_id = pending.pop()
        task = next(item for item in progress["tasks"] if item["id"] == task_id)
        if task["status"] == "DONE":
            task["status"] = "IN_PROGRESS"
            task["completedAt"] = None
            task["history"].append({
                "at": at, "type": "REOPENED_FOR_RETEST",
                "summary": f"候选构建 {commit} 使所属或上游用例结果过期；原签核保留历史，等待复验。",
            })
            reopened.append(task_id)
            plan_text, count = re.subn(
                rf"^- \[x\] (\*\*{re.escape(task_id)}｜)",
                r"- [ ] \1", plan_text, count=1, flags=re.MULTILINE,
            )
            if count != 1:
                raise ValueError(f"completed task checkbox missing: {task_id}")
            pending.update(
                item["id"] for item in progress["tasks"]
                if task_id in item["dependencies"] and item["status"] == "DONE"
            )
    progress["verificationBuildCommit"] = commit
    progress["updatedAt"] = at
    lines = [
        f"\n### {at}｜构建变化｜旧结果失效\n",
        f"- 候选 commit：`{previous or '未锁定'}` → `{commit}`；原因：{reason}。",
        f"- 旧 PASS 转 `STALE`：{', '.join(affected_cases) or '无'}；重新打开任务：{', '.join(sorted(reopened)) or '无'}。",
        "- 原 `result.json`、截图和 SHA 证据保留；当前结果指针待新构建重跑，不把旧 PASS 计入发布门槛。\n",
    ]
    plan_text = plan_text.replace(BOUNDARY, "\n".join(lines) + BOUNDARY)
    return progress, plan_text, affected_cases, reopened


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--reason", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    progress, plan, cases, tasks = propagate(
        read_json(LEDGER), PLAN.read_text(encoding="utf-8"),
        args.commit, args.reason, at,
    )
    print(f"candidate={args.commit} staleCases={len(cases)} reopenedTasks={len(tasks)}")
    if args.dry_run:
        return
    LEDGER.write_bytes((json.dumps(progress, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    PLAN.write_bytes(plan.encode("utf-8"))


if __name__ == "__main__":
    main()
