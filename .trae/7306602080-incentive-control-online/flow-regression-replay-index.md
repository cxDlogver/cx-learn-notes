# Flow Regression Replay Index

## Run

- command_equivalent: `/delivery:regress --case .trae/flow-regression-cases/verify/mtr-write-safety-pass-with-notes.md`
- target_stage: `verify`
- replay_mode: `STATIC_ASSERTION`
- checked_at: `2026-07-13`
- active_workspace: `artifacts/7306602080-incentive-control-online`

## Replay Isolation

| item | value |
|---|---|
| shadow_replay_workspace | N/A - `STATIC_ASSERTION` only checks `.trae` process files and fixed current artifacts. |
| shadow_execution_workspace | N/A - no dev server, browser replay, BAM mutation, mock patch, or business code write is required. |
| shadow_branch | N/A |
| active_workspace_mutation_policy | During regression validation, only `flow-regression-case.md`, `flow-regression-replay-index.md`, and `flow-regression-report.md` are written. The MTR artifact normalization was performed before this regression run as the user-requested artifact update. |

## Checked Inputs

| file | purpose |
|---|---|
| `.trae/flow-regression-cases/verify/mtr-write-safety-pass-with-notes.md` | Canonical regression case and assertions. |
| `.trae/flow-regression-cases/index.json` | Daily suite registration and JSON validity. |
| `.trae/AGENTS.md` | Global MTR write-safety contract. |
| `.trae/commands/delivery:verify.md` | `/delivery:verify --mtr` command entry semantics. |
| `.trae/skills/06-debug-verification/SKILL.md` | Authoritative verify-stage MTR rules. |
| `.trae/skills/06-debug-verification/debug-verification-report.template.md` | Future MTR report table and `remaining_real_gap` guard. |
| `.trae/skills/06-debug-verification/debug-verification-case-result.template.md` | Future case-result template guard. |
| `artifacts/7306602080-incentive-control-online/06-debug-verification.md` | Active MTR report and Gate recommendation. |
| `artifacts/7306602080-incentive-control-online/verify-logs/case-results/*.md` | Per-case `mtr_result` and `remaining_real_gap` normalization. |
| `artifacts/7306602080-incentive-control-online/verify-logs/evidence/mtr-real-recheck-20260713.md` | MTR evidence summary for write safety intercept. |

## Verification Commands

| command | result |
|---|---|
| `python3 -m json.tool .trae/flow-regression-cases/index.json` | PASS - JSON parsed successfully. |
| `rg -n 'SAFETY_BLOCKED_PASS_FOR_NO_BACKEND_WRITE' artifacts/7306602080-incentive-control-online .trae/commands/delivery:verify.md .trae/AGENTS.md .trae/skills/06-debug-verification/SKILL.md .trae/skills/06-debug-verification/debug-verification-case-result.template.md` | PASS - no matches in active artifacts or process source files. |
| `rg -n 'WRITE_BROWSER_INTERCEPTED / SAFETY_BLOCKED|SAFETY_BLOCKED / N/A|WRITE_BROWSER_INTERCEPTED.*SAFETY_BLOCKED' .trae/skills/06-debug-verification/debug-verification-case-result.template.md .trae/skills/06-debug-verification/SKILL.md .trae/commands/delivery:verify.md .trae/AGENTS.md` | PASS - no old template-style safety placeholder remains. |
| `rg -n '无新增 local PNG|配置页补验截图均未能|no local PNG' artifacts/7306602080-incentive-control-online/verify-logs/evidence/mtr-real-recheck-20260713.md artifacts/7306602080-incentive-control-online/06-debug-verification.md artifacts/7306602080-incentive-control-online/verify-logs/case-results/TC-UI-CFG-ALL-BASELINE.md artifacts/7306602080-incentive-control-online/verify-logs/case-results/TC-UI-CFG-PREFILLED-BASELINE.md artifacts/7306602080-incentive-control-online/verify-logs/case-results/TC-INT-CFG-RULE-LINK.md` | PASS - no stale screenshot materialization wording remains in the checked MTR/config artifacts. |
| `git status --short` in `meego-7306602080/repos/alliance-operation-mono` | PASS - no business repository changes. |
