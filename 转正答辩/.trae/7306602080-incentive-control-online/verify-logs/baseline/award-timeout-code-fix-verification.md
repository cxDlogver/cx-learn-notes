# TC-INT-AWARD-TIMEOUT Code Fix Verification

- recorded_at: `2026-07-09T08:00:01Z`
- fix_handoff: `code-fix-handoff.md`
- active_case_id: `TC-INT-AWARD-TIMEOUT`
- fix_scope: `MICRO_CODE_FIX`

## Commands

| command_id | command | status | exit_code | notes |
|---|---|---|---:|---|
| fixture | `node artifacts/7306602080-incentive-control-online/verify-logs/test-fixtures/award-timeout-visible-feedback.mjs` | PASS | 0 | Output: `award-timeout-visible-feedback fixture PASS` |
| targeted_diff_check | `git diff --check -- apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.module.scss` | PASS | 0 | No output |
| full_diff_check | `git diff --check` | FAIL_CLASSIFIED | 2 | Pre-existing/generated `.vmok` trailing whitespace: `apps/alliance-operation-content/.vmok/@types/@alliance-operation/content/index.d.ts:1`; not part of Modal micro-fix |
| build | `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build` | PASS | 0 | EdenX build completed: `Built in 13.6 s (web)`; total `29110.1 kB (gzip: 6688.7 kB)` |

## Source Checks

- `SubmitAwardResult` returns `resultCode` and optional `errorMessage`.
- `submitErrorMessage` state is declared at the top level of `BatchSubmitModal` before refs/effects/branches.
- Non-success DOU+币 / DOU+券 responses map through `getAwardDeliveryResponseErrorMessage`.
- Final non-success result persists `submitResult.errorMessage` in Modal state.
- Modal renders persistent error text with `role="alert"` and `styles.submitErrorMessage`.

## Runtime Recheck

- Browser DOM after final synthetic timeout:
  - `governanceTimeoutCopyVisible=true`
  - `alertText="治理校验失败，请稍后重试"`
  - `successToastVisible=false`
  - `modalStayedOpen=true`
- Console markers:
  - `apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-TIMEOUT`
  - `apiChargeAmountCheck / R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT`
  - `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-TIMEOUT` with `[BAM_MOCK_SYNTHETIC_CONTRACT]` and `[BAM_MOCK_HIT]`
- Network:
  - `charge_amount_check` observed as pre-award validation.
  - No real `delivery_dou_plus_coin` XHR/fetch observed after final click.

## Noise Classification

- Console retained a React Refresh/HMR hook-order warning from hot-updating `BatchSubmitModal` while an old instance was mounted.
- Source hook order is stable, and production build passed.
- This is recorded as `ENV_NOISE_HMR_REFRESH`, not as a stable source-code hook-order violation.
