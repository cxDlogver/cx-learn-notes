"""Tool self-tests using temporary synthetic data, never business acceptance results."""

from __future__ import annotations

import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from validate_result import MANIFEST, validate_result


class EvidenceValidatorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.case = next(case for case in manifest["cases"] if case["id"] == "WEB-DATA-09")
        evidence = []
        for code in self.case["evidenceCodes"]:
            filename = f"{code.lower()}.txt"
            payload = f"synthetic tool self-test {code}\n".encode()
            (self.base / filename).write_bytes(payload)
            evidence.append(
                {
                    "code": code,
                    "path": filename,
                    "sha256": hashlib.sha256(payload).hexdigest(),
                    "mimeType": "text/plain",
                }
            )
        assertions = {}
        for key in ("functional", "visual", "negative"):
            is_visual = key == "visual"
            assertions[key] = {
                "expected": self.case["then"][key],
                "actual": "N/A: API/Worker 无界面" if is_visual else "仅验证证据工具逻辑",
                "status": "N_A" if is_visual else "PASS",
                "evidencePaths": [] if is_visual else ["a.txt"],
            }
        self.result = {
            "caseId": self.case["id"],
            "variant": "tool-self-test",
            "runId": "synthetic",
            "status": "PASS",
            "sourceRefs": self.case["sourceRefs"],
            "build": {
                "appVersion": "tool-self-test",
                "gitCommit": "abcdef0",
                "apiVersion": "tool-self-test",
                "sourceDigest": manifest["sourceDigest"],
            },
            "environment": {
                "kind": "api",
                "osName": "test",
                "osVersion": "test",
                "planTimezone": "Asia/Shanghai",
                "businessDate": "2026-09-28",
                "serverNowUtc": "2026-09-28T00:00:00Z",
                "network": "online",
            },
            "fixtureId": "synthetic-tool-fixture",
            "startedAt": "2026-09-28T00:00:00Z",
            "endedAt": "2026-09-28T00:01:00Z",
            "assertions": assertions,
            "evidence": evidence,
            "reviewer": {
                "kind": "human",
                "name": "tool-self-test",
                "reviewedAt": "2026-09-28T00:02:00Z",
                "reason": "验证校验器行为，不代表业务验收",
            },
        }

    def check(self, result: dict | None = None) -> dict:
        path = self.base / "result.json"
        path.write_text(json.dumps(result or self.result, ensure_ascii=False), encoding="utf-8")
        return validate_result(path, enforce_path=False)

    def test_complete_synthetic_result_is_accepted(self) -> None:
        self.assertEqual(self.check()["caseId"], "WEB-DATA-09")

    def test_tampered_file_is_rejected(self) -> None:
        (self.base / "a.txt").write_text("tampered", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            self.check()

    def test_missing_required_evidence_code_is_rejected(self) -> None:
        result = copy.deepcopy(self.result)
        result["evidence"] = [x for x in result["evidence"] if x["code"] != "T"]
        with self.assertRaisesRegex(ValueError, "required.*evidence"):
            self.check(result)

    def test_stale_source_is_rejected(self) -> None:
        result = copy.deepcopy(self.result)
        result["build"]["sourceDigest"]["matrix"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "stale source"):
            self.check(result)

    def test_uncited_assertion_is_rejected(self) -> None:
        result = copy.deepcopy(self.result)
        result["assertions"]["functional"]["evidencePaths"] = []
        with self.assertRaisesRegex(ValueError, "no cited evidence"):
            self.check(result)

    def test_missing_file_is_rejected(self) -> None:
        (self.base / "d.txt").unlink()
        with self.assertRaisesRegex(ValueError, "missing or external evidence"):
            self.check()

    def test_wrong_expected_text_is_rejected(self) -> None:
        result = copy.deepcopy(self.result)
        result["assertions"]["negative"]["expected"] = "伪造预期"
        with self.assertRaisesRegex(ValueError, "differs from the acceptance baseline"):
            self.check(result)

    def test_result_outside_required_directory_is_rejected(self) -> None:
        path = self.base / "result.json"
        path.write_text(json.dumps(self.result, ensure_ascii=False), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "result path must be"):
            validate_result(path)


if __name__ == "__main__":
    unittest.main()
