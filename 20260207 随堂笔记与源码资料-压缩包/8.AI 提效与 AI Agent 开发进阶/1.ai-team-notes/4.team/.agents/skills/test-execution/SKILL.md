---
name: test-execution
description: Run project checks and tests after implementation and review. Use when Codex needs 测试, build/lint/format/spellcheck/test execution, failure triage, verification summary, or release-readiness checks.
---

# Test Execution

## Workflow

1. Read `package.json` and relevant configs before choosing commands.
2. Use the repository's actual package manager and scripts; do not switch package managers.
3. Prefer non-mutating checks such as build, lint, typecheck, test, prettier check, and cspell check.
4. Do not run formatters or generators that rewrite tracked files unless explicitly requested.
5. Capture command, result, failure location, and likely cause.

## Command Selection

Prefer available scripts in this order when relevant:

- Build or type validation.
- ESLint or code quality checks.
- Prettier check or format check.
- cspell or spelling checks.
- Unit, integration, E2E, or visual tests.

If scripts are missing, inspect config files and explain the closest available verification path.

## Output Contract

Return:

- `stage_result`: Commands run, pass/fail status, and concise result summary.
- `open_questions`: Environment or dependency issues that block verification.
- `risks`: Untested areas, flaky tests, missing scripts, or ignored failures.
- `next_stage_input`: Verified change summary ready for `git-commit-proposal`.

If tests fail, stop with failure details and do not proceed to commit proposal as ready.
