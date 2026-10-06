# TC-DATA-COUPON-COLUMNS Source Evidence

- captured_at: 2026-07-08T13:45:00Z
- purpose: 支撑 DOU+券剔除明细表头、列 key/dataIndex、固定列和列白名单断言；运行态 DOM / screenshot 复用 `TC-UI-COUPON-REMOVE-PAGE` 的默认列表 mock-hit evidence。

## Component Evidence

- Source: `meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx`
- Lines 38-116 define the only table columns:
  - `作者信息`: `dataIndex='candidate_ids'`, `width=250`, `fixed='left'`, search label `作者ID`, renderer reads `author_info.author_name`, `author_info.author_id` and `author_info.avatar`.
  - `剔除发奖原因`: `dataIndex='remove_reason'`, `hideInSearch=true`.
  - `剔除发奖时间`: `dataIndex='remove_time'`, `hideInSearch=true`, renderer formats Unix seconds as `YYYY/MM/DD HH:mm:ss`.
  - `操作人`: `dataIndex='operator_id'`, search uses existing `PeopleSelect`, cell uses `PeopleCard`.
- Lines 142-160 pass the same `columns` array to `EcopTable`, with `rowKey='record_id'`, `scroll={{ x: 'max-content' }}` and no additional render-time columns.
- Lines 15-30 map the product label `作者ID` to IDL request field `candidate_ids`, keeping the DOU+券 remove table aligned with the verified request schema.

## Reuse Evidence

- Existing coupon distribution author renderer baseline: `dou-coupon-distribution-table/index.tsx` lines 89-121 render `作者信息` from `author_info` with avatar, author name and author ID.
- DOU+币 remove table contrast: `dou-coin-remove-record-table/index.tsx` lines 38-76 render `作品内容` from item card data; the DOU+券 remove table does not use that work-card renderer.

## Negative Column Evidence

- The DOU+券 remove table component source contains no table columns titled `作品内容`, `投放状态`, `券数量`, or `处罚原因`.
- Runtime evidence `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json` records headers exactly as `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人`, and records forbidden text absence for `作品内容`, `券数量`, and `投放状态`.

## Reuse Boundary

- Reused runtime source: `TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json` and `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`.
- Reuse is valid for this case because both cases use `apiGetDouPlusCouponRemoveRecord` with `R-BAM-COUPON-REMOVE-DEFAULT`, `page=1`, `page_num=20`, and no `candidate_ids/operator_id` filters.
- Reuse does not close `TC-CELL-COUPON-FIRST-ROW`; first-row author cell renderer details remain a separate cell-level case.
