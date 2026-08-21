# Verification Case Result

### Case: `TC-DATA-COUPON-FILTER-SCHEMA`

- `order`: 11
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: Interaction:作者ID筛选; Interaction:操作人 PeopleSelect
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T13:35:07Z
- `verification_target`: Interaction:作者ID筛选; Interaction:操作人 PeopleSelect
- `acceptance_steps`:
  - DOU+券剔除明细已加载
  - 在作者ID输入 900001,900002
  - 选择操作人后查询
  - 期望：请求字段使用 `candidate_ids` 而非 `author_ids`，列表刷新
- `verification_process`:
  - IN_PROGRESS：从 Verify Case Ledger 第 11 个 case 恢复；将复用 DOU+券默认列表页作为前置状态，执行作者ID与操作人筛选自然 UI 操作。
  - MOCK_DETOUR：自然 UI 已采集到 `candidate_ids=900001,900002`、`operator_id=6068830` 且无 `author_ids` 的真实筛选请求，真实后端成功响应为空；按 MOCK_PREVIEW 生成并验证 `R-BAM-COUPON-REMOVE-FILTER`。
  - EXECUTED：回到同一浏览器 session，自然点击 `查询`，console 命中 `[BAM_MOCK_HIT]` / `R-BAM-COUPON-REMOVE-FILTER`；Network、DOM 和截图均已持久化。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A；当前 case 只触发 GET 读接口，未触发写接口
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=R-BAM-COUPON-REMOVE-FILTER; apiName=apiGetDouPlusCouponRemoveRecord; mock runtime detour 已 verified，浏览器自然 UI 复验已命中 filter rule
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: PASS_WITH_NOTES：自然 UI 点击 `查询` 后，Network GET 使用 `candidate_ids=900001,900002` 和 `operator_id=6068830`，未出现 `author_ids`；console 命中 `[BAM_MOCK_HIT]` / `R-BAM-COUPON-REMOVE-FILTER`；DOM 和截图显示筛选后作者记录 `筛选券作者示例 / ID: 900001 / 筛选命中【不激励】规则 / 陈相`。
- `residual_risk`: MOCK_PREVIEW runtime 通过；真实后端筛选结果、operator_id 权限范围、分页和排序仍需后端 ready 后 real verify。
- `next_step`: continue Verify Case Queue with `TC-DATA-COUPON-COLUMNS`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-DATA-COUPON-FILTER-SCHEMA
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-DATA-COUPON-FILTER-SCHEMA
- `runbook_status`: pass_with_notes
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=coupon-filter-open; capture_scope=filter row; ruleId=R-BAM-COUPON-REMOVE-FILTER
- `step_changes`: natural UI `查询` executed after filter mock detour; before/action/after Network and DOM facts captured
- `assertion_changes`: all initialized assertion records updated with evidence mapping
- `evidence_alignment`: `verify-logs/evidence/TC-DATA-COUPON-FILTER-SCHEMA--mock-hit-runtime.json`; `screenshots/TC-DATA-COUPON-FILTER-SCHEMA--coupon-filter-open--filter-mock-hit-table.png`
- `notes`: verify screenshot is runtime source only; no Figma-vs-runtime alignment is claimed in this case

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-DATA-COUPON-FILTER-SCHEMA
- `evidence_requirement_id`: TC-DATA-COUPON-FILTER-SCHEMA__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: PASS
- `execution_ref`: Natural UI click `查询` -> GET `/get_dou_plus_coupon_remove_record` with `candidate_ids=900001,900002`, `operator_id=6068830`; `[BAM_MOCK_HIT]` ruleId=`R-BAM-COUPON-REMOVE-FILTER`
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 作者ID标签和 candidate_ids 映射均有断言 | DOM 显示 `作者ID` 和输入值 `900001,900002`；Network requestBody/query 使用 `candidate_ids=900001,900002`；列表刷新为筛选 mock 首行 | `verify-logs/evidence/TC-DATA-COUPON-FILTER-SCHEMA--mock-hit-runtime.json`; `screenshots/TC-DATA-COUPON-FILTER-SCHEMA--coupon-filter-open--filter-mock-hit-table.png` | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-DATA-COUPON-FILTER-SCHEMA
- `evidence_requirement_id`: TC-DATA-COUPON-FILTER-SCHEMA__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: PASS
- `execution_ref`: Natural UI filter request captured; sanitized query excludes `author_ids`; no content-activity operator-specific filter API was added
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不用 author_ids 除非 IDL 变更 | Network query contains `candidate_ids=900001,900002` and persisted evidence records `author_ids_absent=true` | `verify-logs/evidence/TC-DATA-COUPON-FILTER-SCHEMA--mock-hit-runtime.json` | PASS |
| 不新增操作人接口 | 查询仅通过同一剔除明细 GET 携带 `operator_id=6068830`；后续 `batchGetEaUsers` 仅为操作人展示文本解析，不是筛选业务接口 | `verify-logs/evidence/TC-DATA-COUPON-FILTER-SCHEMA--mock-hit-runtime.json` | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-DATA-COUPON-FILTER-SCHEMA
- `evidence_requirement_id`: TC-DATA-COUPON-FILTER-SCHEMA__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: PASS
- `execution_ref`: DOM and screenshot after query show filter row above table with 作者ID / 操作人, followed by author table
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 筛选区位于表格上方且只有作者ID/操作人 | Screenshot and DOM show filter row above table; visible filter labels are `作者ID` and `操作人` | `screenshots/TC-DATA-COUPON-FILTER-SCHEMA--coupon-filter-open--filter-mock-hit-table.png`; `verify-logs/evidence/TC-DATA-COUPON-FILTER-SCHEMA--mock-hit-runtime.json` | PASS |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-DATA-COUPON-FILTER-SCHEMA
- `evidence_requirement_id`: TC-DATA-COUPON-FILTER-SCHEMA__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: PASS
- `execution_ref`: DOM text scan after query confirms no `作品ID` / `作品内容` filter labels in DOU+券筛选区
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现作品ID/作品内容筛选标签 | `filterLabels.hasWorkId=false` and `filterLabels.hasWorkContent=false`; screenshot only shows `作者ID` / `操作人` | `verify-logs/evidence/TC-DATA-COUPON-FILTER-SCHEMA--mock-hit-runtime.json`; `screenshots/TC-DATA-COUPON-FILTER-SCHEMA--coupon-filter-open--filter-mock-hit-table.png` | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-DATA-COUPON-FILTER-SCHEMA
- `evidence_requirement_id`: TC-DATA-COUPON-FILTER-SCHEMA__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: PASS
- `execution_ref`: Network, DOM and before/action/after facts are persisted; runtime screenshot materialized under workspace `screenshots/`
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：Network | Sanitized Network summary records GET path, `candidate_ids`, `operator_id`, `author_ids_absent=true`, `__token=__REDACTED__` | `verify-logs/evidence/TC-DATA-COUPON-FILTER-SCHEMA--mock-hit-runtime.json` | PASS |
| 证据类型：DOM | DOM summary records labels, selected operator, candidate input, table headers and filtered row text | `verify-logs/evidence/TC-DATA-COUPON-FILTER-SCHEMA--mock-hit-runtime.json` | PASS |
| 证据类型：before/action/after | Natural UI path records precondition, click `查询`, mock hit, refreshed table and materialized screenshot | `verify-logs/evidence/TC-DATA-COUPON-FILTER-SCHEMA--mock-hit-runtime.json`; `screenshots/TC-DATA-COUPON-FILTER-SCHEMA--coupon-filter-open--filter-mock-hit-table.png` | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-DATA-COUPON-FILTER-SCHEMA__recheck__real_backend_filter | OPEN | PASS_WITH_NOTES | /delivery:verify real-backend recheck | positive_assertion; evidence_required | MOCK_PREVIEW 当前通过，真实后端筛选结果为空；后端 ready 后需复验真实 `candidate_ids/operator_id` 过滤结果、权限范围、分页和排序 | 真实后端非空筛选 Network response、DOM 列表刷新截图 | TC-DATA-COUPON-FILTER-SCHEMA | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 在 DOU+券剔除明细作者 ID 输入框输入 `109638766301` 并点击 `查询`。 |
| real_request | `GET /api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record?...&candidate_ids=109638766301` |
| real_response | `records.length=3`, `total=3`, `has_more=false`。 |
| request_schema_assertion | 自然 UI 使用 `candidate_ids`，未观察到 `author_ids`。 |
| real_dom | 筛选后仍展示 `大亮农业菌蔬优选店 ID: 109638766301` 3 条记录，表头保持作者维度。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#dou券作者-id-筛选` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | `operator_id` 权限范围仍未闭合；带 `operator_id=6068830` 的直接探测返回 `code=95271007`，不能作为 real pass。 |
