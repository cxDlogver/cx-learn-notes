"""Guardrails for the result recorder; no business result is produced."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import record_result as recorder
from record_result import record
from validate_result import MANIFEST, ROOT, validate_result


class ResultRecorderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.path = Path(self.temporary.name) / "observation.json"
        self.observation = {
            "caseId": "WEB-AUTH-01",
            "runId": "tool-self-test",
            "variant": "chrome-mobile",
            "status": "PASS",
        }

    def record(self) -> None:
        self.path.write_text(json.dumps(self.observation), encoding="utf-8")
        record(self.path)

    def test_unimplemented_case_cannot_be_marked_pass(self) -> None:
        with self.assertRaisesRegex(ValueError, "requires an implemented case"):
            self.record()

    def test_path_traversal_run_id_is_rejected(self) -> None:
        self.observation["runId"] = "../../outside"
        with self.assertRaisesRegex(ValueError, "safe single path segments"):
            self.record()

    def test_unknown_case_is_rejected(self) -> None:
        self.observation["caseId"] = "WEB-AUTH-99"
        with self.assertRaisesRegex(ValueError, "unknown case"):
            self.record()

    def test_synthetic_failure_writes_result_and_both_progress_documents(self) -> None:
        sandbox = Path(self.temporary.name)
        ledger = sandbox / "ledger.json"
        plan = sandbox / "plan.md"
        ledger.write_bytes((ROOT / "docs/atdd/web/execution-progress.json").read_bytes())
        plan.write_text("# Synthetic execution log\n\n## 7. 决策与偏差记录\n", encoding="utf-8")
        evidence_dir = sandbox / "evidence/synthetic/WEB-DATA-09/tool-fixture"
        evidence_dir.mkdir(parents=True)
        (evidence_dir / "a.txt").write_text("synthetic observation\n", encoding="utf-8")
        self.observation = {
            "caseId": "WEB-DATA-09", "runId": "synthetic", "variant": "tool-fixture",
            "status": "FAIL",
            "build": {"appVersion": "tool-test", "gitCommit": "abcdef0", "apiVersion": "tool-test"},
            "environment": {
                "kind": "api", "osName": "test", "osVersion": "test",
                "planTimezone": "Asia/Shanghai", "businessDate": "2026-09-28",
                "serverNowUtc": "2026-09-28T00:00:00Z", "network": "online",
            },
            "fixtureId": "synthetic-tool-fixture",
            "startedAt": "2026-09-28T00:00:00Z",
            "endedAt": "2026-09-28T00:01:00Z",
            "assertions": {
                "functional": {"actual": "synthetic failure", "status": "FAIL", "evidencePaths": ["a.txt"]},
                "visual": {"actual": "API-only", "status": "N_A", "evidencePaths": []},
                "negative": {"actual": "synthetic negative check", "status": "PASS", "evidencePaths": ["a.txt"]},
            },
            "evidence": [{"code": "A", "path": "a.txt", "mimeType": "text/plain"}],
            "reviewer": {
                "kind": "human", "name": "tool-self-test",
                "reviewedAt": "2026-09-28T00:02:00Z",
                "reason": "Synthetic tool result, not a product acceptance run",
            },
        }
        self.path.write_text(json.dumps(self.observation), encoding="utf-8")
        with (
            patch.object(recorder, "ROOT", sandbox),
            patch.object(recorder, "LEDGER", ledger),
            patch.object(recorder, "PLAN", plan),
            patch.object(recorder, "validate_result", lambda path: validate_result(path, enforce_path=False)),
        ):
            result_path = record(self.path)
        result = json.loads(result_path.read_text(encoding="utf-8"))
        self.assertEqual(result["caseId"], "WEB-DATA-09")
        self.assertEqual(result["status"], "FAIL")
        self.assertEqual(result["evidence"][0]["sha256"], recorder.sha256(evidence_dir / "a.txt"))
        self.assertIn("synthetic failure", plan.read_text(encoding="utf-8"))
        saved = json.loads(ledger.read_text(encoding="utf-8"))
        case = next(item for item in saved["caseLedger"] if item["caseId"] == "WEB-DATA-09")
        self.assertEqual(case["verificationStatus"], "FAIL")
        self.assertEqual(case["variants"][0]["resultPath"], result_path.relative_to(sandbox).as_posix())


if __name__ == "__main__":
    unittest.main()
