# Codebase Assistant Issue List

- Task: `7306602080`
- Workspace: `artifacts/7306602080-incentive-control-online`
- Repo: `ecom/alliance-operation-mono`
- Execution repo: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- Branch: `cx-3`
- MR: `https://code.byted.org/ecom/alliance-operation-mono/merge_requests/736`
- Raw sources:
  - `raw/codebase-mr-get.json`
  - `raw/codebase-mr-files.json`
  - `raw/codebase-mr-comments-all.json`
  - `raw/codebase-mr-comments-open.json`
  - `raw/codebase-checks-mr.json`
- Workspace note: `.trae/DELIVERY_STATE.md` still points to `artifacts/7306602080-content-activity-incentive-control/`, which does not exist in this checkout. The accessible task workspace is `artifacts/7306602080-incentive-control-online/`; this CR run continues there without mutating normal delivery phase state.

## Summary

| Metric | Count |
| --- | ---: |
| Open review threads analyzed | 17 |
| Valid in-scope issues | 17 |
| Fixed issues | 17 |
| Rejected / not applied | 0 |
| Needs product decision | 0 |

## Normalized Issues

| ID | Thread | Severity | Source | Disposition | Summary | Primary files |
| --- | --- | --- | --- | --- | --- | --- |
| CR-001 | `785687603334999` | P0 | Codebase Assistant | FIXED | Video list refresh cleared pending no-award video items before batch submit, losing remove candidates. | `sendAwardToVideoStore.ts` |
| CR-002 | `785687605443661` | P0 | Codebase Assistant | FIXED | Author fetch cleared pending no-award author items, losing remove candidates after refresh/filter/page. | `sendAwardToAuthorStore.ts` |
| CR-003 | `785687605438298` | P0 | Codebase Assistant | FIXED | `setAwardAuthorItems([])` cleared pending no-award author items on replacement/empty pages. | `sendAwardToAuthorStore.ts` |
| CR-004 | `785687607548318` | P0 | Codebase Assistant | FIXED | Manual submit DIY target audience lost required gender/age columns and validation surface. | `manually-submit-videos-form/index.tsx` |
| CR-005 | `785688180064045` | P0 | CodeGuard | FIXED | BAM dependency used temporary branch `feat_bujili` instead of a stable branch. | `bam.config.js` |
| CR-006 | `785688186333773` | P1 | CodeGuard | FIXED | Export remove-record response handling treated `{ st != 0, code: 0 }` as success. | `manuallySubmitVideoStore.ts` |
| CR-007 | `785711242456351` | P1 | Aime | FIXED | Batch submit entrance blocked pending no-award-only payloads because it checked only current selected count. | `batch-operation-bar/index.tsx` |
| CR-008 | `785711244537794` | P1 | Aime | FIXED | Removed manual-submit hit items were not passed to submit modal and were missing from `candidate_remove`. | `manually-submit-videos-drawer/index.tsx`, `batch-submit-modal/index.tsx` |
| CR-009 | `785711244532839` | P1 | Aime | FIXED | `apiCandidateRemove` response-code helper could misread outer `st` failure as success. | `batch-submit-modal/index.tsx` |
| CR-010 | `785711645117443` | P1 | Aime | FIXED | Remove-record export opened the result URL after an async request and could be blocked by the browser. | `manuallySubmitVideoStore.ts` |
| CR-011 | `785711647195074` | P1 | Aime | FIXED | Duplicate `candidate_remove` `st`/`code` failure-mode finding; same root cause as CR-009. | `batch-submit-modal/index.tsx` |
| CR-012 | `785711649263322` | P2 | Aime | FIXED | No-incentive wiki URL was hard-coded inside a component instead of centralized configuration. | `edit/constants.ts`, `step-reward-config/index.tsx` |
| CR-013 | `785719664626748` | P2 | Aime | FIXED | Batch submit success cleared pending state but did not refresh the award list. | `batch-operation-bar/index.tsx`, `batch-submit-modal/index.tsx` |
| CR-014 | `785719666731804` | P1 | Aime | FIXED | A single remove record with missing `item_id` prevented all valid records in the batch from exporting. | `manuallySubmitVideoStore.ts` |
| CR-015 | `785719668783143` | P1 | Aime | FIXED | `candidate_remove` failure was swallowed and local pending state was still cleared. | `batch-submit-modal/index.tsx`, `batch-operation-bar/index.tsx` |
| CR-016 | `785720669139378` | P2 | Aime | FIXED | Crowd-name fetching was serial and slowed reward page initialization. | `send-award/index.tsx` |
| CR-017 | `785720671268959` | P2 | Aime | FIXED | Manual submit row save matched by optional `item_id`, risking wrong-row updates when `item_id` was missing. | `manually-submit-videos-form/index.tsx` |

## Triage Notes

- All P0 and P1 findings are valid and directly affect reward submit, no-award remove-candidate persistence, remove-detail observability, or build dependency stability.
- P2 findings are maintainability or UX/performance improvements; they are low-risk and were fixed because they are tightly scoped and already in touched modules.
- CR-009 and CR-011 are duplicate observations against the same helper. They are kept as separate thread closures so both Codebase threads can receive an individual reply and be resolved.
- `.vmok/@types/@alliance-operation/content/*` has existing generated formatting noise in the working tree. It is not part of the CR fix and will not be staged for the submit commit.

## Detailed Issues

### CR-001 / Thread `785687603334999`
- Source / status: Codebase Assistant, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToVideoStore.ts`, original line 377.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: `updateVideoAwardItems` cleared `pendingNoAwardVideoItems` whenever the visible video list refreshed.
- Trigger scenario: operator saves a video as no-award, then refreshes, filters, paginates, or enters a supplement page before clicking batch submit.
- Risk: the saved `if_delivery=false` candidate is absent from the merged submit payload and `apiCandidateRemove` upload, so remove details become incomplete.
- Reviewer suggestion: replace only `awardVideoItems` and clear selection; leave pending state for the submit success callback.

### CR-002 / Thread `785687605443661`
- Source / status: Codebase Assistant, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToAuthorStore.ts`, original line 208.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: author `fetchData` cleared `pendingNoAwardAuthorItems` during normal list refresh and error handling.
- Trigger scenario: operator saves an author as no-award, then filters, refreshes, or pages before batch submit.
- Risk: author remove candidates are lost and no-award author records are not persisted by `candidate_remove`.
- Reviewer suggestion: remove pending-state clearing from ordinary fetch paths; clear only after successful submit.

### CR-003 / Thread `785687605438298`
- Source / status: Codebase Assistant, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToAuthorStore.ts`, original line 262.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: `setAwardAuthorItems([])` cleared pending no-award author state when the current page entered a supplement-only range.
- Trigger scenario: operator pages to an empty/supplement author page after saving no-award authors.
- Risk: pending no-award author records cannot be submitted or uploaded as remove candidates.
- Reviewer suggestion: keep list replacement and selection reset, but do not reset pending remove candidates.

### CR-004 / Thread `785687607548318`
- Source / status: Codebase Assistant, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`, original line 710.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: manual submit default columns removed DIY target audience required `gender` and `age` fields.
- Trigger scenario: operator edits a manual submit row with `DeliveryTargetAudience.DIY`.
- Risk: UI cannot collect required gender/age values and validation cannot catch missing fields before submit.
- Reviewer suggestion: restore gender and age columns after target audience.

### CR-005 / Thread `785688180064045`
- Source / status: CodeGuard, open.
- File / line: `apps/alliance-operation-content/bam.config.js`.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: BAM dependency pointed to temporary branch `feat_bujili`.
- Trigger scenario: MR is merged and later BAM generation/build depends on that branch.
- Risk: unstable IDL/API generation, build drift, or protocol mismatch in master/release.
- Reviewer suggestion: restore `ecom.buyin.admin_api@master` or an official release branch.

### CR-006 / Thread `785688186333773`
- Source / status: CodeGuard, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts`.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: remove-detail export treated `{ st != 0, code: 0 }` as success.
- Trigger scenario: BAM/RPC outer transport returns failure while business `code` remains zero.
- Risk: UI proceeds to missing-link handling or success-like flow, masking the true export failure.
- Reviewer suggestion: success only when both `st` and `code` are zero; otherwise prefer non-zero error codes.

### CR-007 / Thread `785711242456351`
- Source / status: Aime, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-operation-bar/index.tsx`.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: batch submit button checked only current checkbox count, blocking pending no-award-only payloads.
- Trigger scenario: operator saves no-award items, deselects rows or pages away, then tries to submit the pending remove list.
- Risk: valid pending remove candidates cannot be uploaded, leaving remove details incomplete.
- Reviewer suggestion: validate against final merged submit collections.

### CR-008 / Thread `785711244537794`
- Source / status: Aime, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx`.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: manual-submit hit items removed from the drawer were not sent to the submit modal as remove candidates.
- Trigger scenario: operator clicks one-click remove for no-incentive / ineligible manual submit rows, then submits remaining rows.
- Risk: removed hit rows are not recorded by `candidate_remove`, so PRD remove-detail traceability is incomplete.
- Reviewer suggestion: pass removed hit rows to `BatchSubmitModal` and merge/dedupe them into remove candidates.

### CR-009 / Thread `785711244532839`
- Source / status: Aime, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx`.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: `apiCandidateRemove` response-code helper could treat outer `st` failure as success.
- Trigger scenario: `candidate_remove` returns `{ st: non-zero, code: 0 }`.
- Risk: remove-candidate upload failure is silently ignored and local pending state is cleared.
- Reviewer suggestion: only `{ st: 0, code: 0 }` is success; return a failure code for all other shapes.

### CR-010 / Thread `785711645117443`
- Source / status: Aime, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts`.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: export opened the returned Lark URL after awaiting the API, which browser popup policies may block.
- Trigger scenario: operator clicks export and the API resolves asynchronously.
- Risk: user sees generated/export success but cannot access the link.
- Reviewer suggestion: synchronously open a blank popup on click, navigate it after success, and show fallback if blocked.

### CR-011 / Thread `785711647195074`
- Source / status: Aime, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx`.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: duplicate of CR-009: mixed `st`/`code` handling for `candidate_remove`.
- Trigger scenario: same as CR-009.
- Risk: same as CR-009.
- Reviewer suggestion: reuse a normalized result-code helper or implement equivalent logic.

### CR-012 / Thread `785711649263322`
- Source / status: Aime, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx`.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: no-incentive rule Wiki URL was hard-coded inside the component.
- Trigger scenario: rule document URL changes or environment-specific configuration is needed.
- Risk: future URL migration requires editing component implementation.
- Reviewer suggestion: move URL to a shared constant/config.

### CR-013 / Thread `785719664626748`
- Source / status: Aime, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-operation-bar/index.tsx`.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: batch submit success cleared pending cache but did not refresh the list.
- Trigger scenario: operator completes batch reward or no-award submit.
- Risk: UI continues showing stale status/candidate counts and may allow repeated operations on old data.
- Reviewer suggestion: after clearing pending state, refresh the active video/author list.

### CR-014 / Thread `785719666731804`
- Source / status: Aime, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts`.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: one invalid remove record missing `item_id` aborted the whole export batch.
- Trigger scenario: one manually uploaded or removed row lacks a candidate id but other removed rows are valid.
- Risk: valid remove records cannot be exported, weakening PRD traceability.
- Reviewer suggestion: filter invalid records and keep valid ones; fail only when no valid records remain.

### CR-015 / Thread `785719668783143`
- Source / status: Aime, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx`.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: `candidate_remove` upload failures were swallowed and modal still reset/cleared pending state.
- Trigger scenario: reward submit succeeds but remove-candidate upload returns failure or throws.
- Risk: the UI loses retry state while remove details are not persisted.
- Reviewer suggestion: return/throw failure from upload helper, block reset/onOk on failure, and keep state retryable.

### CR-016 / Thread `785720669139378`
- Source / status: Aime, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`, original lines 693-709.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: crowd-name queries used serial `for...of await`.
- Trigger scenario: reward config contains multiple crowd ids.
- Risk: reward page initialization latency grows linearly with crowd count.
- Reviewer suggestion: dedupe ids and fetch names with `Promise.allSettled`.

### CR-017 / Thread `785720671268959`
- Source / status: Aime, open.
- File / line: `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`, original lines 732-743.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: row save matched only by optional `item_id`.
- Trigger scenario: backend returns manual submit rows with missing `item_id`.
- Risk: `undefined === undefined` can update the wrong row.
- Reviewer suggestion: match by the same stable key used by table rowKey, `getItemKey`.

## Follow-up Issues

### CR-018 / Thread `785791271893194`
- Source / status: CodeGuard, resolved.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: export response helper misclassified `{ st: 0 }` as failure because `code` is optional.
- Resolution: shared optional-code response helper in `response-code.ts`; commit `c66c66d27931161360e2427ac8196e057b945a0a`.

### CR-019 / Thread `785791271888386`
- Source / status: CodeGuard, resolved.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: `candidate_remove` response helper misclassified `{ st: 0 }` as failure because `code` is optional.
- Resolution: same shared optional-code response helper; commit `c66c66d27931161360e2427ac8196e057b945a0a`.

### CR-020 / Thread `785791699701605`
- Source / status: Aime, resolved.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: batch-submit validation still used selected rows while actual submit payload also included pending no-award items.
- Resolution: missing-required and author consistency checks now use merged submit collections; commit `5e4548279f65f0a5042c269eca21d227cd877f5a`.

### CR-021 / Thread `785791957600134`
- Source / status: Aime, resolved.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: main reward delivery success helper required `code === 0` and misclassified `{ st: 0 }`.
- Resolution: reward delivery helpers reuse the shared optional-code response helper; commit `5e4548279f65f0a5042c269eca21d227cd877f5a`.

### CR-022 / Thread `785791959729196`
- Source / status: Aime, resolved.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: removed submit-hit rows caused by `if_satisfy_delivery_rules === false` exported as manual removals.
- Resolution: remove reason now distinguishes no-incentive, not-satisfy-delivery-rules, and manual removal; commit `5e4548279f65f0a5042c269eca21d227cd877f5a`.

### CR-023 / Thread `785791959699773`
- Source / status: Aime, resolved.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: author remove-record search sent comma-separated `candidate_ids` string although IDL expects `list<string>`.
- Resolution: added `normalizeCandidateIdsFilter` and applied it to coupon remove-record search; commit `5e4548279f65f0a5042c269eca21d227cd877f5a`.

### CR-024 / Thread `785791961834927`
- Source / status: Aime, resolved.
- Classification: `REQUIREMENT_RELEVANT`.
- Original claim: video remove-record search sent comma-separated `candidate_ids` string although IDL expects `list<string>`.
- Resolution: same `normalizeCandidateIdsFilter` applied to coin remove-record search; commit `5e4548279f65f0a5042c269eca21d227cd877f5a`.

### CR-025 / Thread `785791961857244`
- Source / status: Aime, resolved.
- Classification: `PARTIAL_FRONTEND_MITIGATION`.
- Original claim: failed remove-candidate upload after successful reward delivery could lead the operator to repeat the main reward call.
- Resolution: frontend error now states reward has been submitted and not to click repeatedly; backend atomicity/compensation remains a deeper follow-up outside this frontend MR. Commit `5e4548279f65f0a5042c269eca21d227cd877f5a`.
