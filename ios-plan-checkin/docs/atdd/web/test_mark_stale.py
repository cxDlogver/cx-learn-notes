"""Synthetic STALE propagation tests; no business result is written."""

from __future__ import annotations

import copy
import unittest

from check_execution_progress import LEDGER, PLAN, read_json
from mark_stale import propagate


class StalePropagationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.progress = copy.deepcopy(read_json(LEDGER))
        self.plan = PLAN.read_text(encoding="utf-8")
        self.old_commit = "a" * 40
        self.new_commit = "b" * 40
        self.progress["verificationBuildCommit"] = self.old_commit
        self.case = next(item for item in self.progress["caseLedger"] if item["caseId"] == "WEB-AUTH-01")
        self.case["implementationStatus"] = "IMPLEMENTED"
        self.case["verificationStatus"] = "PASS"
        self.case["variants"] = [{
            "variant": "synthetic-chrome", "runId": "synthetic-only",
            "status": "PASS", "resultPath": "evidence/synthetic-only/WEB-AUTH-01/synthetic-chrome/result.json",
        }]
        for task_id in ("WEB-05", "WEB-07"):
            task = next(item for item in self.progress["tasks"] if item["id"] == task_id)
            task["status"] = "DONE"
            task["completedAt"] = "2026-09-28T00:00:00Z"
            self.plan = self.plan.replace(f"- [ ] **{task_id}｜", f"- [x] **{task_id}｜")

    def test_changed_candidate_stales_pass_and_reopens_downstream(self) -> None:
        result, plan, cases, tasks = propagate(
            self.progress, self.plan, self.new_commit, "synthetic code change", "2026-09-28T00:01:00Z"
        )
        self.assertEqual(cases, ["WEB-AUTH-01"])
        self.assertEqual(set(tasks), {"WEB-05", "WEB-07"})
        self.assertEqual(self.case["verificationStatus"], "STALE")
        self.assertEqual(self.case["variants"][0]["status"], "STALE")
        self.assertEqual(
            self.case["variants"][0]["resultPath"],
            "evidence/synthetic-only/WEB-AUTH-01/synthetic-chrome/result.json",
        )
        self.assertIn("- [ ] **WEB-05｜", plan)
        self.assertIn("- [ ] **WEB-07｜", plan)
        self.assertEqual(result["verificationBuildCommit"], self.new_commit)

    def test_same_candidate_keeps_current_pass(self) -> None:
        _, plan, cases, tasks = propagate(
            self.progress, self.plan, self.old_commit, "same build", "2026-09-28T00:01:00Z"
        )
        self.assertEqual((cases, tasks), ([], []))
        self.assertEqual(self.case["verificationStatus"], "PASS")
        self.assertEqual(plan, self.plan)

    def test_invalid_commit_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "candidate commit"):
            propagate(self.progress, self.plan, "not a sha", "synthetic", "2026-09-28T00:01:00Z")


if __name__ == "__main__":
    unittest.main()
