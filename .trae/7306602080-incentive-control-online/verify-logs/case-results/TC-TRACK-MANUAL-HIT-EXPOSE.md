# Verification Case Result

### Case: `TC-TRACK-MANUAL-HIT-EXPOSE`

- `order`: 20
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: PRD tracking table; Region:人工提报命中态/Summary
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T17:25:00Z
- `verification_target`: PRD tracking table; Region:人工提报命中态/Summary
- `acceptance_steps`:
  - 手动输入命中态加载
  - 观察 summary 首次出现
  - 期望：上报曝光 UV 一次，参数含人工提报模块和 activity/config context
- `verification_process`:
  - STARTED：2026-07-08T16:59:45Z 起由 main-agent 串行执行本 case，取证范围限定为 summary 首次出现曝光 logger、重复 render 去重、无命中不触发和 `apiSearchDeliveryItems` BAM mock 命中证据；DA UV 聚合口径保留 real review，不在本地 verify 伪闭合。
  - EXECUTED：在 active business tab `4d0d888f-c82d-42f5-9d8a-7ee4b8ec46ba` 中通过自然 UI `新增提报` -> 输入 `100001,100002,100003` -> `提交` 重建 manual-hit Drawer；XHR 触发 `GET /api/buyin/admin/content_activity/search_delivery_items`，参数包含 `item_ids=100001,100002,100003`、`candidate_pool_type=2`、`page_no=1`、`page_size=50`。
  - EXECUTED：sub-app `collectEvent` wrapper 捕获首次 valid manual-hit summary 的 `auto_tea_log` / `module_expose` payload；`module_id=manual_submit_hit_summary`，`module_name=人工提报命中提示`，`activity_id=7653282555822653742`，`config_id=7653282555822735662`，`submitHitCount=2`，`submitHitTotalCount=3`，`submit_method=videoIds`，`session_unix_time=1783529054`。
  - EXECUTED：在 summary 可见后编辑一行提报理由触发 rerender；前后 `manualExposeCount` 均为 `1`，证明同一 summary 状态未重复上报。
  - EXECUTED_WITH_NOTES：`999999999999` 样本并非 no-hit，实际返回 `if_satisfy_delivery_rules=false` 的一行准入失败数据并触发第二次曝光；该尝试已记录为 failed no-hit sample，不作为负向证明。
  - EXECUTED_WITH_NOTES：通过行级 `移除` + Popconfirm `确定` 进入 no-summary/no-hit runtime state；确认后 `hasSummaryActions=false`、`hitWordCount=0`、`noIncentiveWordCount=0`，`manualExposeCount` 保持 `2` 不再增加。该状态来自 UI 移除而非 fresh all-valid backend sample，因此最终为 `PASS_WITH_NOTES`。
  - EXECUTED：临时 `fetch` / XHR / `collectEvent` wrapper 已调用 `collectRestore()` 和 `restore()`，probe 状态 `restored=true`；不会污染后续 case。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A；本 case 未执行写接口。行级 `移除` 仅用于构造 no-summary runtime state，未调用 `apiCandidateRemove`。
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=R-BAM-MANUAL-SEARCH-HIT; apiName=apiSearchDeliveryItems; 复用已完成 `apiSearchDeliveryItems` mock detour，但本 tracking case 独立采集 logger/Network/DOM 证据；共享 rule 不自动关闭本 case。
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: Runtime evidence `verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--runtime.json` 记录 natural UI manual-hit trigger、summary visible DOM、`collectEvent` logger payload、duplicate render count guard、failed no-hit sample attempt、row-remove no-summary state、Network panel summary and probe restore state；`verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE.md` 提供可读摘要；`verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--source-evidence.md` 记录 component/store/logger source chain。
- `residual_risk`: DA UV 聚合和真实 analytics 入库仍需 DA 平台/线上埋点查询；fresh all-valid backend no-hit sample 未在本地 verify 中获得，当前负向证明由 row-remove no-summary runtime state + source guard 共同支撑。
- `next_step`: continue Verify Case Queue with `TC-UI-BATCH-HIT-REUSE`; do not enter /delivery:design

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-TRACK-MANUAL-HIT-EXPOSE
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-TRACK-MANUAL-HIT-EXPOSE
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=manual-hit; capture_scope=summary visible; ruleId=R-BAM-MANUAL-SEARCH-HIT
- `step_changes`: active case executed by natural UI; logger payload captured through sub-app collectEvent; duplicate render and no-summary state checked; probe restored.
- `assertion_changes`: all assertion records executed and mapped to persistent evidence; DA UV aggregation and fresh all-valid no-hit sample remain recheck notes.
- `evidence_alignment`: aligned_for_verify_runtime_with_notes
- `notes`: PASS_WITH_NOTES under MOCK_PREVIEW/local runtime; no screenshot required by matrix for this tracking case.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-TRACK-MANUAL-HIT-EXPOSE
- `evidence_requirement_id`: TC-TRACK-MANUAL-HIT-EXPOSE__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI manual input `100001,100002,100003` -> GET search_delivery_items -> summary visible -> collectEvent payload captured
- `recording_status`: RECORDED
- `evidence_type`: Network+log
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 首次出现时 logger 调用一次 | Valid manual-hit summary first appeared with `submitHitCount=2` / `submitHitTotalCount=3`; sub-app `collectEvent` captured exactly one `module_expose` payload for `manual_submit_hit_summary` in the valid-hit window. | verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--runtime.json; verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE.md | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-TRACK-MANUAL-HIT-EXPOSE
- `evidence_requirement_id`: TC-TRACK-MANUAL-HIT-EXPOSE__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: duplicate rerender count guard + row-remove no-summary runtime state; failed `999999999999` no-hit attempt recorded as non-proof
- `recording_status`: RECORDED
- `evidence_type`: Network+log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 重复 render 不重复上报 | After typing `verify duplicate render guard` into a row reason field, `manualExposeCount` stayed `1` and `moduleExposeCount` stayed `1`; no additional collectEvent payload appeared. | verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--runtime.json; verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE.md | PASS |
| 不因无命中上报 | `999999999999` attempt was not no-hit and is recorded as failed sample; after row-level remove confirm, runtime entered no-summary state (`hasSummaryActions=false`, `hitWordCount=0`, `noIncentiveWordCount=0`) and `manualExposeCount` stayed `2`. Source guard also returns when `hasSubmitHitItems=false`. Fresh all-valid backend sample remains recheck note. | verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--runtime.json; verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE.md; verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--source-evidence.md | PASS_WITH_NOTES |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-TRACK-MANUAL-HIT-EXPOSE
- `evidence_requirement_id`: TC-TRACK-MANUAL-HIT-EXPOSE__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: N/A（矩阵字段不适用）
- `recording_status`: RECORDED
- `evidence_type`: N/A
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| N/A（矩阵字段为 -） | N/A | N/A | PASS |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-TRACK-MANUAL-HIT-EXPOSE
- `evidence_requirement_id`: TC-TRACK-MANUAL-HIT-EXPOSE__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: N/A（矩阵字段不适用）
- `recording_status`: RECORDED
- `evidence_type`: N/A
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| N/A（矩阵字段为 -） | N/A | N/A | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-TRACK-MANUAL-HIT-EXPOSE
- `evidence_requirement_id`: TC-TRACK-MANUAL-HIT-EXPOSE__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: logger spy, Network trigger summary, source transport chain and probe restore evidence
- `recording_status`: RECORDED
- `evidence_type`: Network+log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：logger spy | Sub-app `collectEvent` wrapper captured `auto_tea_log` / `module_expose` payload for `manual_submit_hit_summary`; `@ecom/operation-logger` source proves `sendModuleExposeLog` routes through `window.collectEvent`; wrapper restored after capture. | verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--runtime.json; verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--source-evidence.md | PASS |
| 证据类型：Network trigger evidence | Probe and integrated browser Network panel record target GET `/api/buyin/admin/content_activity/search_delivery_items` with `item_ids=100001,100002,100003`, `candidate_pool_type=2`, `page_no=1`, `page_size=50`; collector traffic observed through `mcs`/`mon` endpoints. | verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--runtime.json; verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE.md | PASS_WITH_NOTES |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-TRACK-MANUAL-HIT-EXPOSE__recheck__current_verify | CLOSED | PASS_WITH_NOTES | /delivery:verify | all required assertions | logger payload、duplicate render guard、no-summary state、Network/source/probe restore evidence 已记录 | verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--runtime.json; verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE.md; verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--source-evidence.md | TC-UI-BATCH-HIT-REUSE | main-agent |
| TC-TRACK-MANUAL-HIT-EXPOSE__recheck__mtr_real_summary | CLOSED_WITH_NOTES | PASS_WITH_NOTES | /delivery:verify --mtr | positive_assertion / evidence_required | 2026-07-13 12:49 MTR 自然 UI 真实 `search_delivery_items` 返回 3 行命中态并渲染 summary；browser Network observed generic collector/monitor traffic after summary render, but direct event payload was not decoded | verify-logs/evidence/mtr-real-recheck-20260713.md#manual-hit-natural-ui-retest-2026-07-13-1245-1249 | TC-TRACK-MANUAL-HIT-EXPOSE | main-agent |
| TC-TRACK-MANUAL-HIT-EXPOSE__recheck__da_uv | OPEN | PASS_WITH_NOTES | DA platform / post-verify analytics audit | positive_assertion / evidence_required | 本地 verify 只能证明 frontend payload 触发，不能证明 DA UV 聚合和入库口径 | DA 平台事件查询，需包含 `module_id=manual_submit_hit_summary`、activity/config/session context 和 UV 聚合口径 | TC-TRACK-MANUAL-HIT-EXPOSE | delivery-reviewer |
| TC-TRACK-MANUAL-HIT-EXPOSE__recheck__fresh_all_valid_no_hit | OPEN | PASS_WITH_NOTES | real verify / sample coverage audit | negative_assertion | `999999999999` 不是 no-hit 样本；本地负向证据使用 row-remove no-summary state + source guard，fresh all-valid backend sample 未获得 | 真实或受控样本返回 all-valid/no-hit item list 后的 collectEvent no-call 证据 | TC-TRACK-MANUAL-HIT-EXPOSE | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | Direct probe 仍返回 `95271007`，但 12:49 已改走自然 UI 手动输入，真实 `search_delivery_items` 返回 3 行命中态并渲染 summary。 |
| real_response | Natural UI / same page-token read follow-up returned HTTP `200`, `st=0`, `code=0`, `item_info.length=3`; summary visible: `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：3个`。 |
| frontend_tracking_observation | Browser Network after summary render included generic collector/monitor requests (`mcs.zijieapi.com/list`, `mcs.snssdk.com/v1/list`, `mon.zijieapi.com`), but the direct event payload for `manual_submit_hit_summary` was not decoded in this MTR run. Existing mock-preview evidence still proves frontend logger path and duplicate guard. |
| da_status | 本轮未查询 DA 平台；不能证明曝光 UV 聚合。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#manual-hit-natural-ui-retest-2026-07-13-1245-1249`; `verify-logs/evidence/mtr-real-recheck-20260713.md#invalid-direct-probe-evidence`; `verify-logs/evidence/mtr-real-recheck-20260713.md#mtr-real-recheck-queue-and-result` |
| mtr_result | `PASS_WITH_NOTES / OPEN_EXTERNAL_SYSTEM` |
| remaining_real_gap | DA 平台事件查询仍缺；需包含 `module_id=manual_submit_hit_summary`、activity/config/session context 和 UV 聚合口径。真实 `if_not_incentive=true` 样本和 fresh all-valid/no-hit sample 也仍未获得。 |
