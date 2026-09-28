# Verification Case Result

### Case: `TC-DATA-COIN-FILTER-SCHEMA`

- `order`: 6
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: Interaction:作品ID筛选; Interaction:操作人 PeopleSelect
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T12:08:25Z
- `verification_target`: DOU+币剔除明细筛选区的作品ID批量输入、操作人 PeopleSelect、查询请求字段和列表刷新
- `acceptance_steps`:
  - DOU+币剔除明细已加载
  - 在作品ID输入 `100001,100002`
  - 选择操作人 `陈相` 后查询
  - 期望：请求包含 `candidate_ids` 和 `operator_id`，列表刷新
- `verification_process`:
  - 从 detour 恢复：`apiGetDouPlusCoinRemoveRecord` 已新增 `R-BAM-COIN-REMOVE-FILTER`，并将 `R-BAM-COIN-REMOVE-DEFAULT` 收紧为 `candidate_ids/operator_id` 缺省时才命中
  - 执行 reapply，目标 BAM marker 已包含默认 absent matcher、filter matcher 和 `DEFAULT_NOOP`
  - 复用当前 vmok 业务页和 DOU+币 `剔除明细` Tab，在作品ID输入 `100001,100002`，操作人选择 `陈相`，点击 `查询`
  - 采集脱敏 GET request、latest `[BAM_MOCK_HIT]`、DOM facts、运行态截图和 source evidence
  - 执行接口级补充校验和标准 `verify-bam-mock.mjs` final audit
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: PASS；`patch.status=patched`，`rehydration.status=passed`，`finalVerification.status=passed`，`R-BAM-COIN-REMOVE-FILTER.verify.status=passed`
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=`R-BAM-COIN-REMOVE-FILTER`; apiName=`apiGetDouPlusCoinRemoveRecord`; requestBody=`activity_id=7655304206886322458,config_id=7655304206886338842,candidate_ids=100001,100002,operator_id=6068830,page=1,page_num=20`; mockedResponse=`records.length=1,total=1,has_more=false`; detour result=`delivery-mock.md` current scope PASS
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: Runtime filter schema assertions are closed by redacted DOM / Network / `[BAM_MOCK_HIT]` evidence, source evidence, local screenshot, manifest final verification and standard BAM mock audit. Verify does not claim real backend operator permission, ordering or pagination behavior.
- `residual_risk`: 2026-07-17 MTR 已闭合真实自然 UI 下 `candidate_ids` / `operator_id` 请求 schema 和登录态权限阻塞；后端 ready 后仍需 real verify 复验真实非空筛选结果、分页和排序。历史 MOCK_PREVIEW 结论仍只证明前端运行态与 mock request schema。
- `next_step`: continue verify queue with next non-terminal case `TC-DATA-COIN-COLUMNS`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-DATA-COIN-FILTER-SCHEMA
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-DATA-COIN-FILTER-SCHEMA
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001
- `sample_params`: runtime_state=coin-filter-open; capture_scope=filter row + table; ruleId=R-BAM-COIN-REMOVE-FILTER; activity_id=7655304206886322458; config_id=7655304206886338842
- `step_changes`: after BAM marker reapply, clicked `查询` with `candidate_ids=100001,100002` and selected operator `陈相`
- `assertion_changes`: positive/negative/visual/evidence_required records aligned to runtime JSON, screenshot and source evidence
- `evidence_alignment`: aligned_for_verify_runtime; real_backend_recheck_pending
- `notes`: raw browser Network output contained `__token`; persisted evidence stores only a redacted request summary.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-DATA-COIN-FILTER-SCHEMA
- `evidence_requirement_id`: TC-DATA-COIN-FILTER-SCHEMA__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Natural UI click `查询` after input `100001,100002` and PeopleSelect `陈相`; `/delivery:mock` detour restored to verify
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot+mock-log
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 作品ID标签 | DOM facts show visible filter label `作品ID` | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json; screenshots/TC-DATA-COIN-FILTER-SCHEMA--coin-filter-open--filter-mock-hit-table.png | PASS |
| 批量输入 | Candidate input value is `100001,100002`; latest request query has `candidate_ids=100001,100002` | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json | PASS |
| 操作人搜索选择均可用 | PeopleSelect selected text is `陈相`, selected id is `6068830`; latest request query has `operator_id=6068830` | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json | PASS |
| 列表刷新 | `[BAM_MOCK_HIT]` ruleId=`R-BAM-COIN-REMOVE-FILTER`; mocked response has `recordsLength=1,total=1,has_more=false`; first row text includes `筛选后夏日穿搭短视频` and `筛选命中【不激励】规则` | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json; screenshots/TC-DATA-COIN-FILTER-SCHEMA--coin-filter-open--filter-mock-hit-table.png | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-DATA-COIN-FILTER-SCHEMA
- `evidence_requirement_id`: TC-DATA-COIN-FILTER-SCHEMA__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime request schema + source evidence scan
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不改投放明细 table params | Natural request path is `/api/buyin/admin/content_activity/get_dou_plus_coin_remove_record`; query uses remove-record fields `activity_id/config_id/page/page_num/candidate_ids/operator_id` and does not route through delivery-list params | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json; verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--source-evidence.md | PASS |
| 不新增操作人接口 | Component uses existing `PeopleSelect` and calls only `apiGetDouPlusCoinRemoveRecord(filterParams)` for table data; BAM wrapper sends `operator_id` on the same GET request | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--source-evidence.md; verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-DATA-COIN-FILTER-SCHEMA
- `evidence_requirement_id`: TC-DATA-COIN-FILTER-SCHEMA__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime DOM facts + local screenshot captured after filter query
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 筛选区位于表格上方且只有作品ID/操作人 | Screenshot and DOM facts show filter labels `作品ID` / `操作人` above table headers `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人` | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json; screenshots/TC-DATA-COIN-FILTER-SCHEMA--coin-filter-open--filter-mock-hit-table.png | PASS |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-DATA-COIN-FILTER-SCHEMA
- `evidence_requirement_id`: TC-DATA-COIN-FILTER-SCHEMA__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime DOM forbidden-filter scan after filter query
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现充值记录 | DOM facts list `充值记录` under forbidden filters absent; screenshot table headers do not include `充值记录` | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json; screenshots/TC-DATA-COIN-FILTER-SCHEMA--coin-filter-open--filter-mock-hit-table.png | PASS |
| 不出现投放状态筛选 | DOM facts list `投放状态` under forbidden filters absent; filter labels are limited to `作品ID` and `操作人` | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json; screenshots/TC-DATA-COIN-FILTER-SCHEMA--coin-filter-open--filter-mock-hit-table.png | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-DATA-COIN-FILTER-SCHEMA
- `evidence_requirement_id`: TC-DATA-COIN-FILTER-SCHEMA__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: Evidence materialization check after runtime capture and BAM final audit
- `recording_status`: RECORDED
- `evidence_type`: Network+DOM+before/action/after+screenshot+mock-log
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：Network | Target GET method/path/query and XHR request index are persisted in redacted evidence; raw token-bearing browser network output was not persisted | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json | PASS |
| 证据类型：DOM | DOM facts are persisted with active tab, filter labels, input value, selected operator, table headers, first row text and forbidden filters | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json | PASS |
| 证据类型：before/action/after | Evidence records UI trigger steps, selected input/operator before query, action `点击 查询`, and after-state table refresh + mock hit | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json | PASS |
| 证据类型：截图 | Runtime screenshot is materialized as a local PNG under workspace `screenshots/` | screenshots/TC-DATA-COIN-FILTER-SCHEMA--coin-filter-open--filter-mock-hit-table.png | PASS |
| 证据类型：Mock hit | Latest `[BAM_MOCK_HIT]` marker, ruleId and mocked response summary are persisted; older default-rule hits are explicitly superseded by hot-update marker | verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json; mock/apis/apiGetDouPlusCoinRemoveRecord/manifest.json | PASS |
| 证据类型：BAM final audit | Interface supplemental verify and standard BAM mock final verification audit passed | delivery-mock.md; mock/apis/apiGetDouPlusCoinRemoveRecord/manifest.json | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-DATA-COIN-FILTER-SCHEMA__recheck__real_backend | OPEN | PASS_WITH_NOTES | real verify | positive_assertion / evidence_required | 2026-07-17 已通过自然 UI + 页面 `__token` 闭合 `candidate_ids` 与 `operator_id` 的真实请求 schema 和登录态权限阻塞；但真实响应 `total=0`，仍需验证非空筛选结果、分页和排序 | 真实非空后端 request/response、DOM/Network 证据和必要截图 | TC-DATA-COIN-FILTER-SCHEMA | main-agent |
| TC-DATA-COIN-FILTER-SCHEMA__recheck__natural_ui_20260717 | CLOSED_PASS | PASS_WITH_NOTES | real verify | positive_assertion / evidence_required | 用户指定 URL 下自然 UI 输入 `candidate_ids=1279271921656`、PeopleSelect 选择 `陈相` 后点击查询，真实 XHR 携带 `operator_id=2317029` 并返回 HTTP 200 / `st=0/code=0` | `verify-logs/evidence/mtr-real-recheck-20260717.md`; `verify-logs/screenshots/mtr-coin-remove-filter-20260717.png` | TC-DATA-COIN-FILTER-SCHEMA | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-17 /delivery:verify --mtr` follow-up（基线 MTR 为 `2026-07-13`） |
| previous_probe | 2026-07-13 直接探测 DOU+币筛选参数 `candidate_ids=100001,100002&operator_id=6068830` 返回 `code=95271007`，不能作为 MTR real pass。 |
| real_action | 用户指定 URL 下通过自然 UI 输入 `作品ID=1279271921656`；操作人 PeopleSelect 搜索 `陈相` 并选择首个候选；点击 `查询`。 |
| real_request | `GET /api/buyin/admin/content_activity/get_dou_plus_coin_remove_record?activity_id=7629288371705643310&config_id=7629288371705659694&page=1&page_num=20&candidate_ids=1279271921656&operator_id=2317029&__token=<redacted>` |
| real_response | HTTP `200`; response summary `st=0`, `code=0`, `msg=""`, `dataKeys=["total","has_more"]`, `total=0`, `has_more=false`。 |
| real_dom | `作品ID=1279271921656`；PeopleSelect selected text `陈相`；表头 `作品内容 / 剔除发奖时间 / 剔除发奖原因 / 操作人`；空态 `暂无数据`；loading text absent。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260717.md#natural-ui-filter-retest`; `verify-logs/screenshots/mtr-coin-remove-filter-20260717.png` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 真实非空筛选结果、分页和排序仍未覆盖；旧 direct probe 仍不能作为 pass，但不再构成本 case 的自然 UI 权限阻塞。 |
