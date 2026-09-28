# TASK-005 Dispatch Packet

> stage: `/delivery:code`
> mode: `MOCK_PREVIEW`
> task_id: `TASK-005`
> created_at: `2026-07-08 13:50 +0800`
> owner: Main Agent

## Agent Gate Summary

- Stage: `/delivery:code` bounded task dispatch
- Result: READY_TO_DISPATCH
- Task Source: `delivery-task.md ### Task 5`
- Scope Fit: PASS, full TASK-005 scope retained; no requirement compression allowed
- UI Evidence Mode: `F2C_REQUIRED`
- Mock / Real Boundary: business code must call real BAM wrappers; mock runtime / rule-map / manifest / generated `__mock__` stay untouched
- Main Agent Review Needed: after code-writer returns, review real diff, checkboxes, verification, UI evidence usage, BAM matrix, then launch independent read-only reviewer

## Task Identity

| field | value |
|---|---|
| requirement_id | AR-006, AR-007, AR-008, AR-009, AR-010 |
| test_case_id | TC-UI-MANUAL-HIT-PAGE, TC-CELL-MANUAL-HIT-STATUS, TC-INT-MANUAL-ONE-CLICK-REMOVE, TC-INT-MANUAL-EXPORT, TC-INT-MANUAL-SUBMIT-GUARD |
| ruleId | R-BAM-MANUAL-SEARCH-HIT, R-BAM-CANDIDATE-REMOVE-SUCCESS, R-BAM-DOWNLOAD-REMOVE-RECORD |
| apiName | apiSearchDeliveryItems, apiCandidateRemove, apiDownloadContentRemoveRecord |
| figma_fileKey | fNJJ7mEmEMYU5y0tcAZm3X |
| figma_nodeId | `25:13842`, content `87:6973`, rows `87:7016` |
| figma_state_scope | 奖励投放 / 人工提报 Drawer / 手动输入命中态 / summary、action、row status、footer submit guard |

## Contract Summary

- Manual search still uses real `apiSearchDeliveryItems` with `candidate_pool_type = CandidatePoolType.PassFilterRule`.
- Hit item definition: `if_satisfy_delivery_rules === false || if_not_incentive === true`.
- Hit items remain in the list after search. Do not auto-remove them.
- Summary/action area appears only when hit items exist:
  `共{作品总数}个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：{作品个数}个`.
- Video/content cell must keep cover/title/item id and existing delivery-record hint; add red status text under item id:
  `不满足准入门槛` and/or `命中【不激励】规则`.
- One-click remove calls real `apiCandidateRemove` and updates UI only after success. Failure must not remove rows.
- Export calls real `apiDownloadContentRemoveRecord` with only current removable/hit records and handles returned `data.lark_url`.
- Submit guard blocks `提交并投放` while hit items remain: show blocking message, do not open `BatchSubmitModal`, do not call reward submit APIs.

## F2C / Figma Evidence

| node | evidence | notes |
|---|---|---|
| `25:13842` | D2C archive: `code-review/d2c-evidence/task-TASK-005/manifest.md`; XML: `code-review/d2c-evidence/task-TASK-005/25_13842/figma_25_13842_1783501825825.xml`; Figma MCP output: `/var/folders/g3/gkh9674s19x35p641jykwjbw0000gn/T/trae/toolcall-output/a5914404-d130-45db-9d61-571716a90369.txt` | Parent node XML and Figma MCP are valid. D2C preview image for this parent node appears mismatched and is intentionally not archived as visual ground truth. |
| `87:6973` | D2C archive: `code-review/d2c-evidence/task-TASK-005/manifest.md`; XML: `code-review/d2c-evidence/task-TASK-005/87_6973/figma_87_6973_1783501944620.xml`; preview: `code-review/d2c-evidence/task-TASK-005/87_6973/figma_87_6973_1783501944620.jpg`; Figma MCP output: `/var/folders/g3/gkh9674s19x35p641jykwjbw0000gn/T/trae/toolcall-output/2074c50a-098c-4909-bb53-3d43e101fa2f.txt` | Drawer preview is valid and shows title, submit selector, summary/action, table, footer. |
| `87:7016` | D2C archive: `code-review/d2c-evidence/task-TASK-005/manifest.md`; XML: `code-review/d2c-evidence/task-TASK-005/87_7016/figma_87_7016_1783502075850.xml`; preview: `code-review/d2c-evidence/task-TASK-005/87_7016/figma_87_7016_1783502075850.jpg`; Figma MCP output: `/var/folders/g3/gkh9674s19x35p641jykwjbw0000gn/T/trae/toolcall-output/f0b709eb-f50d-42b0-a98b-1f8dfc5b6552.txt` | Row preview is valid and shows red hit labels under item id, optional orange delivery-record hint, and row-level `移除`. |

Key extracted facts:

- Summary info block text node `87:6998`; blue info container, then actions container `87:6999`.
- Action order: primary `一键移除` (`87:7000`) then secondary outlined `导出剔除明细` (`87:7002`).
- Table header order: `序号`, `视频/图文内容`, `投放金额(元)`, `投放时长`, `转化目标偏好`, `投放生效时间`, `目标受众`, `提报理由`, `操作`.
- Row status examples:
  - `87:7028`: `不满足准入门槛  命中【不激励】规则`, red `#F53F3F`, under item id.
  - `87:7113`: `命中【不激励】规则`, red `#F53F3F`, under item id.
- Existing orange delivery-record hint can remain below red status when present.
- Footer order: `取消` (`87:7131`) then `提交并投放` (`87:7133`).

## Existing Code Locators

- Store: `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts`
- Drawer: `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx`
- Form/table: `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`
- Form styles: `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.module.scss`
- Submit selector is not primary TASK-005 scope; edit only if needed to preserve existing behavior.

## API / Type Facts

- `delivery_item_info` fields include:
  - `item_card?: kol_item.ItemDto`
  - `if_satisfy_delivery_rules?: boolean`
  - `if_not_incentive?: boolean`
  - `not_incentive_reason?: Array<string>`
  - `if_delivered?: boolean`
  - `delivery_config`, `delivery_reason`, `history_delivery_info`
- Candidate id source:
  - No separate candidate id field is exposed on `delivery_item_info`.
  - Use `item_card.item_model.item_id` as the candidate id/item id source, and document this as P1 real-verify recovery evidence.
- Export field sources:
  - `author_id`: `item_card.item_author_info.author_id`
  - `item_id`: `item_card.item_model.item_id`
  - `item_name`: `item_card.item_model.base_model.item_info.base_info.title`
  - `remove_reason`: `命中【不激励】规则` for incentive-hit rows, `手动移除` for manual row removal records if included.
  - `penalty_reason`: latest reason from `not_incentive_reason`; use last non-empty string when array exists.
- `candidate_remove_request`: `activity_id`, `config_id`, `remove_candidates?: RemoveCandidateInfo[]`.
- `RemoveCandidateInfo`: `candidate_id?: string`, `remove_reason?: string`.
- `download_content_remove_record_request`: `records?: ContentRemoveRecord[]`.
- `ContentRemoveRecord`: `author_id`, `item_id`, `item_name`, `remove_reason`, `penalty_reason`.
- `download_content_remove_record_response`: `data?.lark_url`.

## Required Steps

1. Mark only TASK-005 completed checkboxes in `delivery-task.md` as each step is truly finished.
2. Extend `manuallySubmitVideoStore.ts` with derived hit/removable state and real wrapper methods. Do not write mock response data into store.
3. Render summary/action in `manually-submit-videos-form/index.tsx` above the table only when hit items exist.
4. Extend item cell status rendering with exact red labels and preserve existing cover/title/id/delivery-record UI.
5. Implement one-click remove through `apiCandidateRemove`; update list only after success.
6. Implement export through `apiDownloadContentRemoveRecord`; only include hit/removable records and handle `lark_url` via open/display using project-safe browser API.
7. Extend drawer submit guard to block while hit items exist.
8. Update `05-implementation-log.md` with TASK-005 implementation entry, UI Evidence Usage, verification, BAM coverage findings, and pending verify items.

## Forbidden Scope

- Do not modify generated BAM wrappers or IDL files.
- Do not create or edit mock runtime, BAM marker, rule-map, manifest, `__mock__`, preview service, fallback store, fixtures, or browser state.
- Do not implement TASK-006 batch-upload reuse, TASK-007 award-submit penalty logic, or TASK-008 tracking.
- Do not remove existing editable columns, existing delivery-record hint, existing row-level `移除`, or existing submit selector behavior.
- Do not use local fake success or client-only mock data.

## Verification

Required non-browser command:

```bash
pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build
```

If additional focused static checks are cheap and available, run them, but do not replace the required build.

## Stop Conditions

- If implementation needs fields outside confirmed IDL/type facts above, return `NEEDS_TARGETED_REVIEW`.
- If `item_card.item_model.item_id` cannot safely drive candidate remove, return `NEEDS_TARGETED_REVIEW`.
- If one-click remove or export cannot call real wrappers without mock/runtime edits, return `NEEDS_TARGETED_REVIEW`.
- If UI cannot consume the F2C/Figma evidence above, return `BLOCKED`.

## Next Verification Handoff

Verify/design will later close:

- `TC-UI-MANUAL-HIT-PAGE/R-BAM-MANUAL-SEARCH-HIT/apiSearchDeliveryItems`
- `TC-CELL-MANUAL-HIT-STATUS/R-BAM-MANUAL-SEARCH-HIT/apiSearchDeliveryItems`
- `TC-INT-MANUAL-SUBMIT-GUARD/R-BAM-MANUAL-SEARCH-HIT/apiSearchDeliveryItems`
- `TC-INT-MANUAL-ONE-CLICK-REMOVE/R-BAM-CANDIDATE-REMOVE-SUCCESS/apiCandidateRemove`
- `TC-INT-MANUAL-EXPORT/R-BAM-DOWNLOAD-REMOVE-RECORD/apiDownloadContentRemoveRecord`
