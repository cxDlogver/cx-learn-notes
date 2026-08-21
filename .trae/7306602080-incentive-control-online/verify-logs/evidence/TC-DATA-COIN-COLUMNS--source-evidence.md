# TC-DATA-COIN-COLUMNS Source Evidence

- captured_at: 2026-07-08T12:08:25Z
- purpose: 支撑 DOU+币剔除明细表头、列 key/dataIndex、固定列和列白名单断言；运行态 DOM / screenshot 复用 `TC-UI-COIN-REMOVE-PAGE` 的默认列表 mock-hit evidence。

## Component Evidence

- Source: `meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx`
- Lines 38-119 define the only table columns:
  - `作品内容`: `dataIndex='candidate_ids'`, `width=250`, `fixed='left'`, search label `作品ID`, renderer shows cover/title/id through `item_card.item_model...`
  - `剔除发奖原因`: `dataIndex='remove_reason'`, `hideInSearch=true`
  - `剔除发奖时间`: `dataIndex='remove_time'`, `hideInSearch=true`, renderer formats Unix seconds as `YYYY/MM/DD HH:mm:ss`
  - `操作人`: `dataIndex='operator_id'`, search uses existing `PeopleSelect`, cell uses `PeopleCard`
- Lines 145-170 pass the same `columns` array to `EcopTable`, with `rowKey='record_id'`, `scroll={{ x: 'max-content' }}` and no additional render-time columns.

## Negative Column Evidence

- The component source contains no DOU+币 remove table columns titled `投放金额`, `投放状态`, `充值记录`, `处罚原因`, or `作者信息`.
- Runtime evidence `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json` records headers exactly as `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人`, and records forbidden text absence for `投放金额` and `充值记录`.

## Reuse Boundary

- Reused runtime source: `TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json` and `screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png`.
- Reuse is valid for this case because both cases use `apiGetDouPlusCoinRemoveRecord` with `R-BAM-COIN-REMOVE-DEFAULT`, `page=1`, `page_num=20`, and no `candidate_ids/operator_id` filters.
- Reuse does not close `TC-CELL-COIN-FIRST-ROW`; operator PeopleCard visible text remains a separate cell-level case.
