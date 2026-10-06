# TC-DATA-COIN-FILTER-SCHEMA Source Evidence

- captured_at: 2026-07-08T11:59:18Z
- purpose: 支撑 `TC-DATA-COIN-FILTER-SCHEMA` 的负向断言：筛选查询不新增单独后端操作人接口，`candidate_ids/operator_id` 进入同一个 DOU+币剔除明细 GET 请求。

## Component Evidence

- Source: `meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx`
- Lines 8, 15-30: 组件只导入 `apiGetDouPlusCoinRemoveRecord`，`formatEcopFilterParams` 将 `activity_id/config_id/candidate_ids/operator_id/page_num/page` 组装为同一个请求参数对象。
- Lines 41-50: 搜索列 label 为 `作品ID`，dataIndex 为 `candidate_ids`，支持批量查询。
- Lines 96-105: 搜索列 label 为 `操作人`，dataIndex 为 `operator_id`，使用现有 `PeopleSelect`。
- Lines 122-137: `fetchData` 将 EcopTable 的 `current/pageSize` 转为 `page/page_num` 后调用 `apiGetDouPlusCoinRemoveRecord(filterParams)`；未新增 DOU+币剔除明细专属操作人后端接口。

## BAM Wrapper Evidence

- Source: `meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- Lines 2241-2257: `apiGetDouPlusCoinRemoveRecord` 使用 `GET /api/buyin/admin/content_activity/get_dou_plus_coin_remove_record`，params 同时包含 `candidate_ids` 和 `operator_id`。

## Runtime Evidence Link

- `verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json` 记录自然 UI 点击 `查询` 后的目标 GET：`candidate_ids=100001,100002`、`operator_id=6068830`、`page=1`、`page_num=20`，并记录 `[BAM_MOCK_HIT]` 命中 `R-BAM-COIN-REMOVE-FILTER`。
