# Repair Verify Source Audit - 2026-07-11

## Scope

- repair_run: `20260710-162521-docx-NQxTdRPP`
- verified_cases:
  - `TC-INT-MANUAL-ONE-CLICK-REMOVE`
  - `TC-INT-MANUAL-EXPORT`
  - `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE`
  - `TC-INT-BATCH-ONE-CLICK-REMOVE`
  - `TC-INT-BATCH-EXPORT`
  - `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST`
- verification_method: `SOURCE_AND_BUILD_AUDIT`
- limitation: 当前证据关闭 repair verify 的代码路径、请求边界和构建有效性；不宣称已完成新的自然 UI 截图或真实后端持久化联调。

## Commands

| command_id | command | result | evidence |
|---|---|---|---|
| repair_verify_build | `pnpm_config_verify_deps_before_run=false pnpm --dir apps/alliance-operation-content build` | PASS, exit 0, total `29197.2 kB (gzip: 6703.0 kB)` | `verify-logs/baseline/repair-verify-build.log` |
| scoped_diff_check | `git diff --check -- <repair touched award files>` | PASS, exit 0 | terminal execution in repair verify replay |
| manual_candidate_remove_forbidden_scan | `rg -n "apiCandidateRemove|candidate_remove|R-BAM-CANDIDATE" apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos` | PASS, exit 1 with no matches | terminal execution in repair verify replay |
| award_candidate_remove_allowed_scan | `rg -n "apiCandidateRemove|candidate_remove|R-BAM-CANDIDATE" <award touched files>` | PASS, only `batch-submit-modal/index.tsx` imports/calls `apiCandidateRemove` | terminal execution in repair verify replay |

## Source Findings

### Manual / Batch One-Click Remove

- `manuallySubmitVideoStore.ts` imports `apiDownloadContentRemoveRecord`, `apiGetDeliveryItemsFromSheet`, and `apiSearchDeliveryItems`; it does not import `apiCandidateRemove`.
- `removeSubmitHitItems` computes `hitItems`, merges them into `removedSubmitHitItems`, filters hit rows out of `videoItems`, shows success, and returns without any API call.
- Row-level delete in `manually-submit-videos-form/index.tsx` calls `preserveRemovedSubmitHitItems([removedItem])` before removing a hit row from local form/list state.
- The forbidden scan over manual submit store and manually-submit-videos components found no `apiCandidateRemove`, `candidate_remove`, or `R-BAM-CANDIDATE` references.

### Export Guard And Repeatability

- `exportSubmitHitRecords` reads only `this.removedSubmitHitItems`.
- When `removedSubmitHitItems.length === 0`, it warns `暂无可导出的剔除明细` and returns before building records or calling `apiDownloadContentRemoveRecord`.
- After records exist, `exportSubmitHitRecords` calls `apiDownloadContentRemoveRecord({ records })` and opens `response.data.lark_url`.
- `shouldShowSubmitHitToolbar` is true when either current hit rows exist or preserved removed records exist; the form renders the toolbar from that getter.
- The summary and action toolbar remain rendered whenever `shouldShowSubmitHitToolbar` is true, including the removed-record-only state; `一键移除` remains visible but uses `disabled={!hasSubmitHitItems}`, and `导出剔除明细` remains enabled from preserved removed records.

### Award Success No-Award Upload

- `batch-operation-bar/index.tsx` merges selected award rows with `pendingNoAwardVideoItems` / `pendingNoAwardAuthorItems` before opening `BatchSubmitModal`.
- `sendAwardToVideoStore.ts` and `sendAwardToAuthorStore.ts` preserve explicit `if_delivery === false` rows in pending no-award state and remove them when changed back to `if_delivery === true`.
- `batch-submit-modal/index.tsx` builds upload payloads only from rows with `if_delivery === false`.
- `apiCandidateRemove` is called only from `uploadNoAwardRemoveCandidates`.
- `handleOkClick` awaits `uploadNoAwardRemoveCandidates` only inside `if (submitResult.resultCode === 0)`, after `apiDeliveryDouPlusCoin` or `apiDeliveryDouPlusCoupon` has returned success.
- Non-success reward results set/show the reward error branch and do not call `uploadNoAwardRemoveCandidates`.

## Closure Notes

- `TC-INT-MANUAL-ONE-CLICK-REMOVE` and `TC-INT-BATCH-ONE-CLICK-REMOVE`: verify result `PASS_WITH_NOTES`; source/build evidence proves local-only removal and no `candidate_remove` call in manual/batch shared path.
- `TC-INT-MANUAL-EXPORT`: verify result `PASS_WITH_NOTES`; source/build evidence proves pre-removal export guard and no download request before preserved removed records.
- `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE` and `TC-INT-BATCH-EXPORT`: verify result `PASS_WITH_NOTES`; source/build evidence proves removed-record-only export and persistent export entry after local removal.
- `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST`: verify result `PASS_WITH_NOTES`; source/build evidence proves reward-success ordering and selected/pending no-award payload filtering.
- Residual risks remain real backend persistence, retry/rollback behavior on upload failure, Feishu sheet permission/field completeness, and fresh natural UI screenshot capture for design reuse.
