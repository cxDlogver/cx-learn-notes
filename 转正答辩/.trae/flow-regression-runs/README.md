# Flow Regression Runs

This directory stores reports from daily, targeted, and full process-regression suites.

Default report name:

```text
YYYY-MM-DD.md
```

## Daily Run Policy

Daily regression is allowed to find process regressions after the fact; it must not block ordinary skill / command / agent edits.

Daily runs should prioritize:

- Newly captured cases.
- Recently failed cases.
- P0 / P1 cases.
- `STATIC_ASSERTION` and `ARTIFACT_ASSERTION_ONLY`.
- A small number of `SHADOW_REPLAY_LIGHT` cases when stable inputs exist.

Daily runs should usually skip:

- `SHADOW_REPLAY_HEAVY`, unless recently failed or explicitly selected.
- `MANUAL_CONTEXT_REQUIRED`, except to list as pending manual review.

## Report Template

```md
# Flow Regression Daily Report

## Workflow Version

## Selection Summary
| bucket | count |
|---|---:|

## Results
| case_id | stage | replay_mode | result | evidence | owner_hint |
|---|---|---|---|---|---|

## Failures
| case_id | likely_regression | changed_files | suggested_fix_area |
|---|---|---|---|

## Skipped
| case_id | reason |
|---|---|
```
