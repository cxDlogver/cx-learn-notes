# Code Fix Handoff

- `source_stage`: /delivery:verify
- `source_verify_report`: 06-debug-verification.md
- `active_case_id`: TC-INT-AWARD-TIMEOUT
- `affected_case_ids`: TC-INT-AWARD-TIMEOUT
- `agent_recommendation`: DISPATCH_CODE_WRITER
- `fix_scope`: MICRO_CODE_FIX
- `created_at`: 2026-07-09

## Blocking Error

`TC-INT-AWARD-TIMEOUT` naturally reached the final DOU+ coin award submit path under `MOCK_PREVIEW`.

- `apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-TIMEOUT` hit.
- `apiChargeAmountCheck / R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT` hit and allowed the charge record.
- `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-TIMEOUT` hit the marked synthetic contract and returned `{ "st": 1, "code": 504, "msg": "timeout" }`.
- No real `delivery_dou_plus_coin` XHR/fetch was observed.
- Expected copy `治理校验失败，请稍后重试` did not appear in the DOM or Auxo message container.
- Success toast was not observed and the modal stayed open.

## Root Cause Classification

- `failure_type`: CODE_ISSUE
- `failure_subtype`: MISSING_PERSISTENT_ERROR_FEEDBACK
- `root_cause`: final award submit failure only emits an Auxo toast. Runtime evidence showed the toast layer did not provide a stable DOM/message anchor for the required timeout copy, while the modal itself retained no submit-error state.

## Allowed Files

- `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.module.scss`
- `artifacts/7306602080-incentive-control-online/verify-logs/test-fixtures/award-timeout-visible-feedback.mjs`
- `artifacts/7306602080-incentive-control-online/05-implementation-log.md`

## Forbidden Files

- `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- `artifacts/7306602080-incentive-control-online/mock/**`
- `artifacts/7306602080-incentive-control-online/delivery-mock.md`
- `artifacts/7306602080-incentive-control-online/09-test-case-matrix.md`

## Expected Fix

Keep the existing toast behavior, but also persist the final award submit error in the `BatchSubmitModal` DOM with a visible alert-like element. The timeout response `{ st: 1, code: 504, msg: "timeout" }` must map to the existing constant `MESSAGES.SEND_AWARD_GOVERNANCE_TIMEOUT` and remain visible while the modal stays open. Do not change success semantics; success remains strictly `st === 0 && code === 0`.

## Required Commands

- `node artifacts/7306602080-incentive-control-online/verify-logs/test-fixtures/award-timeout-visible-feedback.mjs`
- `git -C meego-7306602080/repos/alliance-operation-mono diff --check`
- `pnpm_config_verify_deps_before_run=false pnpm --dir meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`

## Broader Rerun Policy

- `broader_rerun_policy`: RUN_TARGETED
- Re-run `TC-INT-AWARD-TIMEOUT` in the browser after the required commands pass.
- Broader full baseline is not required unless the fix expands beyond the allowed files or changes shared award utility / BAM generated code.
