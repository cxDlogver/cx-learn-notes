# Flow Regression Case

## Target Stage

verify

## User Issue

`/delivery:verify --mtr` 在真实环境复测中，由于高风险写接口必须被浏览器层安全拦截，真实发奖、导出、持久化、保存等后端副作用无法闭合。旧产物把这类安全拦截结果当作 blocker，导致验收被安全策略本身阻塞。

## Expected Fix

未授权真实写入的高风险写接口必须继续使用浏览器层 route / mock 拦截，记录 `safety_intercept=true` 和 `backend_write=not_sent`。MTR 结果统一写为 `PASS_WITH_NOTES`，未验证的真实后端副作用写入 `remaining_real_gap`，并明确该 gap 是 non-blocking note，不阻塞继续交付，也不得宣称真实后端副作用已通过。

## Canonical Case

`.trae/flow-regression-cases/verify/mtr-write-safety-pass-with-notes.md`

## Changed Process Files

- `.trae/AGENTS.md`
- `.trae/commands/delivery:verify.md`
- `.trae/skills/06-debug-verification/SKILL.md`
- `.trae/skills/06-debug-verification/debug-verification-report.template.md`
- `.trae/skills/06-debug-verification/debug-verification-case-result.template.md`

## Regression Assertions

| id | assertion | evidence_file | pass_condition | fail_condition |
|---|---|---|---|---|
| A1 | MTR high-risk write safety intercept is classified as `PASS_WITH_NOTES`, not blocker-style `SAFETY_BLOCKED`. | `.trae/skills/06-debug-verification/SKILL.md`; `.trae/commands/delivery:verify.md`; `.trae/AGENTS.md` | Rules require `PASS_WITH_NOTES` for browser-layer write intercept. | Rules require or recommend blocker-style `SAFETY_BLOCKED` / `SAFETY_BLOCKED_PASS_FOR_NO_BACKEND_WRITE` for authorized safety intercept. |
| A2 | Unverified backend side effects are recorded in `remaining_real_gap`. | `06-debug-verification.md`; `verify-logs/case-results/*.md` | Write-side-effect gaps are explicitly listed in `remaining_real_gap`. | Gaps are omitted or merged into an opaque blocker. |
| A3 | Safety-intercept write gaps are non-blocking, while real backend success must not be claimed. | `.trae/AGENTS.md`; `.trae/skills/06-debug-verification/SKILL.md`; `06-debug-verification.md` | Rules and report say the gap is non-blocking and forbid claiming real backend side-effect success. | Flow blocks solely because of authorized safety intercept, or claims real backend success without evidence. |
| A4 | Case-result template no longer lists blocker-style `SAFETY_BLOCKED` in the MTR safety classification example. | `.trae/skills/06-debug-verification/debug-verification-case-result.template.md` | Template lists `WRITE_BROWSER_INTERCEPTED` and instructs `PASS_WITH_NOTES` + `remaining_real_gap`. | Template still lists `SAFETY_BLOCKED` as the expected safety classification for this path. |
| A5 | Verify report template carries the same MTR `remaining_real_gap` contract. | `.trae/skills/06-debug-verification/debug-verification-report.template.md` | MTR table includes `remaining_real_gap` and instructs high-risk write safety intercept to use `PASS_WITH_NOTES` with non-blocking side-effect gaps. | Report template omits `remaining_real_gap` or allows write safety intercept to become a blocker. |
