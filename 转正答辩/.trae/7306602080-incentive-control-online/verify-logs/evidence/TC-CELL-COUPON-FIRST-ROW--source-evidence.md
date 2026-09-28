# TC-CELL-COUPON-FIRST-ROW Source Evidence

- captured_at: 2026-07-08T13:58:00Z
- purpose: 支撑 DOU+券剔除明细首行关键 cell 的 renderer 断言；运行态 DOM / screenshot 复用 `TC-UI-COUPON-REMOVE-PAGE` 的默认列表 mock-hit evidence，并补充当前浏览器 computed style。

## Renderer Evidence

- Source: `meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx`
- Lines 41-73: `作者信息` 列读取 `record.author_info?.author_name`、`record.author_info?.author_id` 和 `record.author_info?.avatar`，使用 `SmallerImage` 展示头像，展示 author name 和 `ID: {authorId}`；缺失时使用 `-`。
- Lines 76-80: `剔除发奖原因` 列读取 `record.remove_reason`，缺失时使用 `-`。
- Lines 83-90: `剔除发奖时间` 列读取 `record.remove_time`，用 `dayjs.unix(remove_time).format('YYYY/MM/DD HH:mm:ss')` 格式化，缺失时使用 `-`。
- Lines 93-114: `操作人` 列读取 `record.operator_id`，有值时用 `PeopleCard`，传入 `list={[{ employee_id: String(record.operator_id) }]}`；无值时使用 `-`，不会裸露渲染 `operator_id`。

## Runtime Evidence Link

- `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json` records default-list first row:
  - author name: `券作者示例`
  - author id: `ID: 900001`
  - remove reason: `命中【不激励】规则`
  - remove time: `2026/07/08 20:40:40`
  - operator: `陈相`
- `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json` records the current default-list first row after reset:
  - `filter_candidate_value=""`
  - cell text: `券作者示例 ID: 900001`, `命中【不激励】规则`, `2026/07/08 20:40:40`, `陈相`
  - computed style: author image `40x40`, author/id/reason/time/operator font size `12px`, row cell display `table-cell`, all cells visible.
- `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png` records the same default DOU+券 remove table runtime state as a workspace PNG.

## Negative Renderer Evidence

- DOU+券 source first column uses `author_info`, not `item_card`, so it does not render DOU+币 work cover/title structure.
- Contrast source: `dou-coin-remove-record-table/index.tsx` lines 41-76 read `record.item_card?.item_model...`, render a work cover with `width: 40, height: 60`, title and work ID. None of those item-card fields are used by the DOU+券 remove table.
- Runtime computed style evidence records `work_content=false`, `delivery_status=false`, `coupon_count=false`, `raw_operator_id_in_row=false`, and `work_title_structure=false`.

## Reuse Boundary

- Reuse is valid for this case because the screenshot and DOM were captured from `R-BAM-COUPON-REMOVE-DEFAULT`, `page=1`, `page_num=20`, with one default mock record.
- This evidence closes renderer wiring, visible first-row fields and computed style sampling for the current default table state, but keeps Figma visual alignment and real backend data ordering as recheck items.
