# TC-CELL-COIN-FIRST-ROW Source Evidence

- captured_at: 2026-07-08T12:08:25Z
- purpose: 支撑 DOU+币剔除明细首行关键 cell 的 renderer 断言；运行态 DOM / screenshot 复用 `TC-UI-COIN-REMOVE-PAGE` 的默认列表 mock-hit evidence。

## Renderer Evidence

- Source: `meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx`
- Lines 41-76: `作品内容` 列读取 `record.item_card?.item_model?.base_model?.item_info?.base_info` 和 `record.item_card?.item_model?.item_id`，使用 `SmallerImage` 展示封面，展示 title 和 `ID: {videoId}`；缺失时使用 `-`。
- Lines 78-83: `剔除发奖原因` 列读取 `record.remove_reason`，缺失时使用 `-`。
- Lines 85-93: `剔除发奖时间` 列读取 `record.remove_time`，用 `dayjs.unix(remove_time).format('YYYY/MM/DD HH:mm:ss')` 格式化，缺失时使用 `-`。
- Lines 95-117: `操作人` 列读取 `record.operator_id`，有值时用 `PeopleCard`，传入 `list={[{ employee_id: String(record.operator_id) }]}`；无值时使用 `-`，不会裸露渲染 `operator_id`。

## Runtime Evidence Link

- `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json` records default-list first row:
  - title: `夏日穿搭短视频示例`
  - item id: `ID: 100001`
  - remove reason: `命中【不激励】规则`
  - remove time: `2026/07/08 18:56:57`
  - operator: `operatorPeopleCardDefaultImageRequested=true`, `operatorIdTextVisible=false`
- `screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png` records the same default DOU+币 remove table runtime state.

## Reuse Boundary

- Reuse is valid for this case because the screenshot and DOM were captured from `R-BAM-COIN-REMOVE-DEFAULT`, `page=1`, `page_num=20`, with one default mock record.
- The evidence closes renderer wiring and visible first-row fields, but keeps readable PeopleCard name / avatar, real backend data ordering and Figma visual alignment as recheck items.
