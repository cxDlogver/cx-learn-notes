# Codebase Assistant Fix Tasks

- CR run: `20260717-010922-cr-cx-3`
- MR: `ecom/alliance-operation-mono!736`
- Submit mode: `--submit`
- Status: implementation complete; verification and writeback pending at artifact creation time.

## Task Checklist

| Task | Threads | Status | Implementation |
| --- | --- | --- | --- |
| T1 Preserve pending no-award video state across list refresh | `785687603334999` | DONE | `updateVideoAwardItems` now replaces only visible rows and clears selection; it no longer clears `pendingNoAwardVideoItems`. |
| T2 Preserve pending no-award author state across fetch and list replacement | `785687605443661`, `785687605438298` | DONE | Removed pending-author clearing from `fetchData` and `setAwardAuthorItems`; pending state is cleared only after successful submit flow. |
| T3 Restore required DIY manual submit fields | `785687607548318` | DONE | Restored gender and age columns after `target_audience` so DIY rows remain editable and required-field validation still covers them. |
| T4 Pin BAM dependency to stable branch | `785688180064045` | DONE | Changed `ecom.buyin.admin_api` BAM dependency psm back to `ecom.buyin.admin_api@master`. |
| T5 Normalize mixed `st` / `code` response checks | `785688186333773`, `785711244532839`, `785711647195074` | DONE | Added helpers that succeed only on `{ st: 0, code: 0 }`, prefer non-zero `code`, then non-zero `st`, and return `-1` for malformed responses. |
| T6 Allow pending no-award-only submit payloads | `785711242456351` | DONE | Batch submit entrance now checks the merged submit collections instead of only current checkbox count. |
| T7 Include removed manual-submit hit items in remove candidates | `785711244537794` | DONE | Manual submit drawer passes `removedSubmitHitItems`; modal builds/dedupes remove candidates from both selected no-award rows and removed hit rows. |
| T8 Keep local state when `candidate_remove` upload fails | `785719668783143` | DONE | `uploadNoAwardRemoveCandidates` returns boolean; submit success is not allowed to call `onOk`, reset state, or rotate session if remove-candidate upload fails. |
| T9 Mitigate popup blocker for remove-detail export | `785711645117443` | DONE | Export opens a blank popup synchronously before awaiting the API, closes it on failure, and falls back to a visible link warning if popup creation is blocked. |
| T10 Filter invalid remove records without dropping the whole batch | `785719666731804` | DONE | Remove-detail export now filters invalid records while retaining valid records; all-invalid batches still fail with a clear message. |
| T11 Refresh list after successful batch submit | `785719664626748` | DONE | `onBatchSubmitOk` clears pending state, refreshes the active video/author list via `initData`, then closes the modal. |
| T12 Centralize no-incentive rule URL | `785711649263322` | DONE | Added `NO_INCENTIVE_RULE_URL` to content-activity constants and imported it from the reward config component. |
| T13 Parallelize crowd-name fetching | `785720669139378` | DONE | Deduped crowd ids and fetched names with `Promise.allSettled`, preserving partial success behavior. |
| T14 Match manual submit row saves by stable row key | `785720671268959` | DONE | `handleSave` now compares `getItemKey(row)` with `getItemKey(item)`, matching table row-key semantics. |

## Decision Mapping

| 任务 | 来源问题 | 处理决策 | 需求 / 原子需求引用 | 原因 | 状态 | 解决方案 | 解决结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | CR-001 / `785687603334999` | ACCEPT | AR-003, AR-009, AR-010; TASK-007; TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST | 发奖成功后上传 no-award list 是当前需求链路，刷新丢 pending 会导致 remove detail 缺记录。 | DONE | 删除 `updateVideoAwardItems` 中的 pending 清理，仅替换展示列表并清空选择。 | Pending no-award videos survive refresh until submit success callback clears them. |
| T2 | CR-002 / `785687605443661`; CR-003 / `785687605438298` | ACCEPT | AR-004, AR-013, AR-014; TASK-007; TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST | DOU+券作者 no-award upload 与剔除明细同属当前需求链路，普通列表刷新不应丢失待提交 remove candidates。 | DONE | 删除 `fetchData` / `setAwardAuthorItems` 中的 pending-author 清理。 | Pending no-award authors survive refresh, pagination, and empty-page replacement until submit success. |
| T3 | CR-004 / `785687607548318` | ACCEPT | AR-006, AR-010; TASK-005; TC-UI-MANUAL-HIT-PAGE | 人工提报表单仍需要 DIY audience 的 gender/age 字段和 required validation。 | DONE | 恢复 gender / age 列。 | DIY manual submit rows can edit and validate gender/age again. |
| T4 | CR-005 / `785688180064045` | ACCEPT | BAM 接口依赖 Gate; TASK-003..TASK-007 | BAM dependency is a shared build input; temporary branch must not enter MR. | DONE | Restore `psm: 'ecom.buyin.admin_api@master'`. | BAM dependency is stable for merge. |
| T5 | CR-006 / `785688186333773`; CR-009 / `785711244532839`; CR-011 / `785711647195074` | ACCEPT | AR-003, AR-004, AR-009; TASK-005, TASK-007 | Export and `candidate_remove` are current requirement paths; mixed `st`/`code` failure must not be misread as success. | DONE | Add normalized helpers that only return success when both `st` and `code` are zero, otherwise prefer non-zero `code`, non-zero `st`, then `-1`. | Outer failures are surfaced as failures in export and remove-candidate upload. |
| T6 | CR-007 / `785711242456351` | ACCEPT | AR-003, AR-004; TASK-007; TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST | Pending no-award-only submission is a valid current requirement state. | DONE | Button entrance validates merged `submitAward*Infos` instead of only checked rows. | Batch modal can open for pending no-award-only payloads. |
| T7 | CR-008 / `785711244537794` | ACCEPT | AR-008, AR-009; TASK-005; TC-INT-MANUAL-ONE-CLICK-REMOVE, TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE | Manual submit removed hit rows are the PRD-defined remove-detail source after one-click remove. | DONE | Pass `removedSubmitHitItems` into modal and merge/dedupe with selected no-award remove candidates. | Removed manual-submit hit rows are uploaded by `candidate_remove` after successful submit. |
| T8 | CR-015 / `785719668783143` | ACCEPT | AR-003, AR-004, AR-009; TASK-007 | If remove-candidate persistence fails, clearing local pending state loses traceability and retryability. | DONE | Make upload return boolean; block `onOk`, reset, and session rotation on upload failure. | Failed remove upload leaves modal/local state available for retry and shows a persistent error. |
| T9 | CR-010 / `785711645117443` | ACCEPT | AR-009; TASK-005; TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE | Export link access is a direct operator workflow; async `window.open` can be blocked. | DONE | Open a blank popup synchronously, navigate after success, close on failure, and warn with the link when blocked. | Export has a usable popup/fallback path. |
| T10 | CR-014 / `785719666731804` | ACCEPT | AR-009; TASK-005 | One malformed row should not prevent export of other valid removed records. | DONE | Build records by filtering rows without `item_id`; return failure only when no valid records remain. | Valid remove records can still be exported. |
| T11 | CR-013 / `785719664626748` | ACCEPT | AR-003, AR-004, AR-011, AR-013; TASK-007 | Submit success changes list state and counts; stale UI can mislead follow-up operations. | DONE | Await active video/author store `initData()` after clearing pending state, then close modal. | List refreshes after successful batch submit. |
| T12 | CR-012 / `785711649263322` | ACCEPT | AR-001, AR-002; TASK-001, TASK-002; TC-INT-CFG-RULE-LINK | Rule URL is part of the config-page requirement and should be centralized with related constants. | DONE | Move URL into `edit/constants.ts` and import it from the reward config component. | URL is no longer hard-coded in the component. |
| T13 | CR-016 / `785720669139378` | ACCEPT | Reward config page init for current requirement; TASK-003..TASK-004 | Crowd-name display is part of the reward page context; serial requests create avoidable page-init latency. | DONE | Dedupe ids and fetch via `Promise.allSettled`, preserving successful names. | Crowd names load in parallel and tolerate partial failures. |
| T14 | CR-017 / `785720671268959` | ACCEPT | AR-006, AR-010; TASK-005; TC-UI-MANUAL-HIT-PAGE | Manual submit rows use a stable row key; save logic should match the same key to avoid wrong-row updates. | DONE | Use `getItemKey` for `handleSave` lookup. | Missing optional `item_id` no longer causes `undefined === undefined` row collisions. |

## Files To Stage For Submit Commit

- `apps/alliance-operation-content/bam.config.js`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-operation-bar/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts`
- `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToAuthorStore.ts`
- `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToVideoStore.ts`
- `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/edit/constants.ts`

## Files Intentionally Not Staged

- `apps/alliance-operation-content/.vmok/@types/@alliance-operation/content/index.d.ts`
- `apps/alliance-operation-content/.vmok/@types/@alliance-operation/content/package.json`

Reason: these are generated formatting-only changes already present in the working tree and unrelated to the CR findings.

## Verification Plan

| Check | Scope | Expected |
| --- | --- | --- |
| `git diff --check` | full working tree | May still report known `.vmok` generated trailing whitespace if those files remain dirty. |
| `git diff --check -- <staged fix files>` | CR fix files only | PASS |
| TypeScript diagnostics | `apps/alliance-operation-content` targeted app command | No new diagnostics from edited files; existing repo-wide diagnostics, if any, must be documented separately. |
| EdenX build | `apps/alliance-operation-content` | Expected to compile; known Argus/sandbox `/opt/tiger` environment issue may cause final non-code exit in this local machine. |
| Closure JSON parse | `jq . closure/cr-modification-closure.json` | PASS |

## Writeback Plan

- Reply to each of the 17 open threads individually with the mapped fix summary.
- Resolve each thread after the reply is accepted by Codebase.
- Fetch and save after-submit snapshots under `writeback/after-submit/`.
- Update `bits-flow/current-cr` to this run path after writeback completes.

## Follow-up Task Checklist

| Task | Threads | Status | Implementation |
| --- | --- | --- | --- |
| T15 Support optional `code` success responses | `785791271893194`, `785791271888386`, `785791957600134` | DONE | Added `getOptionalCodeResponseResultCode` and reused it for export, `candidate_remove`, and reward delivery success/result-code checks. |
| T16 Validate actual merged submit payload | `785791699701605` | DONE | Submit prechecks now use `submitAwardVideoInfos` / `submitAwardAuthorInfos`, including pending no-award items. |
| T17 Preserve accurate remove reasons | `785791959729196` | DONE | Added `notSatisfyDeliveryRules` remove reason and used it for submit-hit removals caused by准入门槛 failure. |
| T18 Normalize remove-record candidate ID filters | `785791959699773`, `785791961834927` | DONE | Added `normalizeCandidateIdsFilter` and applied it to coupon/coin remove-record tables before request submission. |
| T19 Avoid repeat reward submission after remove sync failure | `785791961857244` | DONE | Updated persistent submit error to state reward has been submitted and only no-award-list sync failed; operator should not repeat the main submit. |

Final follow-up state:

- Commits: `c66c66d27931161360e2427ac8196e057b945a0a`, `5e4548279f65f0a5042c269eca21d227cd877f5a`
- Codebase comments: 27 threads, 52 comments, 27 resolved, 0 open
- Codebase checks: `all_passed`, 10/10
- Remaining blocker: MR merge conflict with target branch
