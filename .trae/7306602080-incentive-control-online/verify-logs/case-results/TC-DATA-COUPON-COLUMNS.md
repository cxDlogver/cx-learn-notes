# Verification Case Result

### Case: `TC-DATA-COUPON-COLUMNS`

- `order`: 12
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Region:DOU+券剔除明细/表格; list style:DOU+券剔除明细
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T13:47:00Z
- `verification_target`: Region:DOU+券剔除明细/表格; list style:DOU+券剔除明细
- `acceptance_steps`:
  - DOU+券剔除明细默认请求成功
  - 查看表头
  - 列 key/dataIndex
  - 固定列
  - 空态
  - 期望：仅显示作者信息、剔除发奖原因、剔除发奖时间、操作人
- `verification_process`:
  - IN_PROGRESS：从 Verify Case Ledger 第 12 个 case 恢复；按 rule reuse policy 复用 `TC-UI-COUPON-REMOVE-PAGE` 的 DOU+券默认列表运行态证据作为本 case runtime source。
  - EXECUTED：回读 DOU+券默认列表 DOM/Network/screenshot 证据，确认 headers=`作者信息/剔除发奖原因/剔除发奖时间/操作人`，禁显 `作品内容/券数量/投放状态`。
  - EXECUTED：补充源码证据 `TC-DATA-COUPON-COLUMNS--source-evidence.md`，确认列数组 key/dataIndex/fixed/renderer 与禁显列。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A；当前 case 只复用已验证 GET 默认列表证据，未触发写接口
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=R-BAM-COUPON-REMOVE-DEFAULT; apiName=apiGetDouPlusCouponRemoveRecord; mock runtime detour 已 verified，本 case 复用默认列表 rule 但独立关闭列断言
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: PASS_WITH_NOTES：复用 DOU+券默认列表运行态 JSON 与本地截图，确认表头只包含 `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人`；新增 source evidence 确认列 dataIndex/fixed/renderer 与禁显列。
- `residual_risk`: Verify 阶段关闭运行态列白名单和源码接线；Figma alignment、真实后端空态/排序仍需后续复验。
- `next_step`: continue Verify Case Queue with `TC-CELL-COUPON-FIRST-ROW`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-DATA-COUPON-COLUMNS
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-DATA-COUPON-COLUMNS
- `runbook_status`: pass_with_notes
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=coupon-table-loaded; capture_scope=table header; ruleId=R-BAM-COUPON-REMOVE-DEFAULT
- `step_changes`: reused default coupon remove table runtime source and added column source evidence
- `assertion_changes`: all initialized assertion records updated with evidence mapping
- `evidence_alignment`: `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`; `verify-logs/evidence/TC-DATA-COUPON-COLUMNS--source-evidence.md`
- `notes`: verify screenshot is runtime source only; no Figma-vs-runtime alignment is claimed in this case

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-DATA-COUPON-COLUMNS
- `evidence_requirement_id`: TC-DATA-COUPON-COLUMNS__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: PASS
- `execution_ref`: Reused default DOU+券 remove table DOM/screenshot + source column config evidence
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 列顺序和字段 key 对齐 plan | Runtime headers are `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人`; source columns are `candidate_ids / remove_reason / remove_time / operator_id`, with first column `fixed='left'` | `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`; `verify-logs/evidence/TC-DATA-COUPON-COLUMNS--source-evidence.md` | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-DATA-COUPON-COLUMNS
- `evidence_requirement_id`: TC-DATA-COUPON-COLUMNS__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: PASS
- `execution_ref`: Runtime forbidden-text scan + source negative column scan
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现作品内容 | Runtime forbidden text records `作品内容` absent; source table has no `作品内容` column or DOU+币 work-card renderer | `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; `verify-logs/evidence/TC-DATA-COUPON-COLUMNS--source-evidence.md` | PASS |
| 投放状态 | Runtime forbidden text records `投放状态` absent; source table has no delivery status column | `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; `verify-logs/evidence/TC-DATA-COUPON-COLUMNS--source-evidence.md` | PASS |
| 券数量 | Runtime forbidden text records `券数量` absent; source table has no coupon quantity column | `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; `verify-logs/evidence/TC-DATA-COUPON-COLUMNS--source-evidence.md` | PASS |
| 处罚原因列 | Source negative scan confirms no `处罚原因` column; runtime headers whitelist excludes it | `verify-logs/evidence/TC-DATA-COUPON-COLUMNS--source-evidence.md`; `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json` | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-DATA-COUPON-COLUMNS
- `evidence_requirement_id`: TC-DATA-COUPON-COLUMNS__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: PASS_WITH_NOTES
- `execution_ref`: Runtime header order + reused local screenshot; design alignment pending
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 表头顺序与 IMG6 一致 | Runtime screenshot/header DOM show order `作者信息 -> 剔除发奖原因 -> 剔除发奖时间 -> 操作人`; Figma-vs-runtime pixel alignment remains for /delivery:design | `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`; `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json` | PASS_WITH_NOTES |
| 首列为作者复合信息 | Source first column renderer uses `author_info.author_name`, `author_info.author_id`, avatar; runtime row shows `券作者示例 / ID: 900001` | `verify-logs/evidence/TC-DATA-COUPON-COLUMNS--source-evidence.md`; `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json` | PASS |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-DATA-COUPON-COLUMNS
- `evidence_requirement_id`: TC-DATA-COUPON-COLUMNS__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: PASS
- `execution_ref`: Source contrast confirms DOU+券 table does not use DOU+币 work-card renderer; runtime forbidden text excludes work content
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现 DOU+币作品卡结构 | DOU+券 source first column renders author info, not `item_card` cover/title/id; runtime row shows author name/ID instead of work title/card | `verify-logs/evidence/TC-DATA-COUPON-COLUMNS--source-evidence.md`; `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png` | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-DATA-COUPON-COLUMNS
- `evidence_requirement_id`: TC-DATA-COUPON-COLUMNS__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: PASS
- `execution_ref`: DOM, screenshot and column config source evidence are persisted and materialized
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：DOM | Runtime evidence records exact headers, first row text and forbidden text absence | `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json` | PASS |
| 证据类型：截图 | Reused default coupon remove table screenshot is a workspace PNG local file and matches `coupon-table-loaded` state | `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png` | PASS_WITH_NOTES |
| 证据类型：列配置检查 | Source evidence records the four columns, dataIndex values, fixed first column, EcopTable wiring and negative column scan | `verify-logs/evidence/TC-DATA-COUPON-COLUMNS--source-evidence.md` | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-DATA-COUPON-COLUMNS__recheck__design_alignment | CLOSED | PASS | /delivery:design | visual_assertion | Verify 截图只作为 runtime source，Figma-vs-runtime 对齐不在本阶段关闭 | `07-design-alignment.md` 已引用 Figma `1:12390`/header nodes、runtime screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`、source order 与 negative scan 完成表头 region 对齐 | TC-DATA-COUPON-COLUMNS | design-checker |
| TC-DATA-COUPON-COLUMNS__recheck__real_backend_empty_sort | OPEN | PASS_WITH_NOTES | /delivery:verify real-backend recheck | positive_assertion; evidence_required | MOCK_PREVIEW 默认列表通过；真实后端空态、排序和分页口径需后端 ready 后复验 | 真实后端 Network response、DOM 空态/排序截图或日志 | TC-DATA-COUPON-COLUMNS | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 无 `externalLeadsDomainMock=1` 页面切到 `配置二/剔除明细`。 |
| real_dom | 表头为 `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人`；未出现 `作品内容`、`投放状态`、`券数量`。 |
| real_response | `GET /get_dou_plus_coupon_remove_record` 返回 `records.length=3`, `total=3`, `has_more=false`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#dou券剔除明细默认读取` |
| mtr_result | `PASS` |
| remaining_real_gap | 真实表头与列白名单已闭合；多页排序和真实空态仍需更多样本复验。 |
