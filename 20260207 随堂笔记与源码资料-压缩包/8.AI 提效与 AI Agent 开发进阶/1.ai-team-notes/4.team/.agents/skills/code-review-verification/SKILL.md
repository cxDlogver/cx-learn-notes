---
name: code-review-verification
description: Review implemented code for defects, regressions, missing tests, and engineering quality. Use when Codex needs 代码审查验证, review findings, SOLID/KISS/DRY/YAGNI checks, or pre-test implementation validation.
---

# Code Review Verification

## Workflow

1. Inspect the diff, changed files, related tests, and surrounding implementation.
2. Review for behavioral bugs, regressions, edge cases, data loss, security issues, and missing tests.
3. Check that the implementation follows the approved spec and UI confirmation.
4. Evaluate engineering quality using SOLID, KISS, DRY, and YAGNI.
5. Lead with findings ordered by severity; if no issues are found, state that clearly.

## Review Rules

- Use a code-review stance, not a change-summary stance.
- Ground every finding in file and line references when available.
- Do not list speculative issues without a concrete failure mode.
- Keep style-only comments out unless they affect maintainability or violate configured tooling.
- Recommend targeted fixes; avoid unrelated refactors.

## Output Contract

Return:

- `stage_result`: Review findings or explicit no-issue result.
- `open_questions`: Questions that block validation or require product/technical confirmation.
- `risks`: Residual risk, test gaps, or areas not reviewed.
- `next_stage_input`: Review result ready for `test-execution`.

If critical issues are found, hand back to implementation before running the full test stage.
