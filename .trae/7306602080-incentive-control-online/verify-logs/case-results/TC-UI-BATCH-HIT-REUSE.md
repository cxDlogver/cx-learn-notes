# Verification Case Result

### Case: `TC-UI-BATCH-HIT-REUSE`

- `order`: 21
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Region:批量上传 baseline; Interaction:人工提报批量上传
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-10T01:51:31+08:00
- `verification_target`: Region:批量上传 baseline; Interaction:人工提报批量上传
- `acceptance_steps`:
  - Task 6 已复用 Task 5 命中逻辑
  - 选择批量上传
  - 输入 sheet URL 并等待响应
  - 期望：批量上传 baseline 保持，命中项使用同款 summary、红字行态和 submit guard
- `verification_process`:
  - STARTED：2026-07-08T17:29:39Z 由 main-agent 串行恢复执行本 case；取证范围限定为批量上传 sheet URL 触发 `apiGetDeliveryItemsFromSheet`、命中态 summary/row/guard 复用、批量上传 baseline DOM/截图，以及 `R-BAM-BATCH-SHEET-HIT` active-case mock detour（如自然请求未命中已存在规则）。
  - NATURAL_UI_EXECUTED：2026-07-09T01:46:26+08:00 在当前业务页选择批量上传并提交 `https://bytedance.larkoffice.com/sheets/batch-hit-7306602080`；XHR 已触发 `GET /api/buyin/admin/content_activity/get_delivery_items_from_sheet`，request query 包含 `sheet_url/activity_id/config_id`。
  - NATURAL_RESPONSE_LIMITED：真实 response `status=200, code=10001604, st=10001604, msg=表格数据不符合要求，请检查数据格式是否正确`；页面保持批量上传空表、无 summary、无 `命中【不激励】规则` 行态，不能关闭 hit-state 断言。
  - MOCK_DETOUR_STARTED：进入 `apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-HIT` 受控 `/delivery:mock` detour；不得把本 case 压缩为“只验证 GET 被调用”，仍需恢复自然 UI 复验 summary、红字行态、submit guard、DOM、Network 和本地截图。
  - MOCK_DETOUR_COMPLETED：`apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-HIT` manifest、script、verify、rule-map、mock-log、delivery-mock 与 BAM marker 均已完成审计；matcher 使用稳定 natural `sheet_url=https://bytedance.larkoffice.com/sheets/batch-hit-7306602080`，未使用 `mock_` 占位值。
  - EXECUTED：刷新业务页以加载最新 BAM marker 后，通过自然 UI 打开 `新增提报` Drawer、选择 `批量上传`、输入稳定 sheet URL，并点击真实 `提交` 按钮。
  - EXECUTED：页面内 probe 与 console probe 记录目标 GET；XHR 原始 response 仍为真实 `code=10001604` 失败体，BAM runtime marker 输出单字符串 `[BAM_MOCK_HIT]`，`apiName=apiGetDeliveryItemsFromSheet`，`ruleId=R-BAM-BATCH-SHEET-HIT`，mockedResponse 经 `mockOperations` 后为 `st=0/code=0/total_num=3/candidate_num=1`。
  - EXECUTED：运行态 DOM 显示 summary `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：2个`，三行作品 `200001/200002/200003` 均保留；`200001` 显示红字 `不满足准入门槛`，`200002` 显示红字 `命中【不激励】规则`，`200003` 为可投放保留行。
  - EXECUTED：运行态 DOM 显示 `一键移除`、`导出剔除明细`、footer `提交并投放` / `取消`，未出现 unsupported hit UI、手动输入专属错误布局或真实失败消息残留。
  - EXECUTED：本地截图已物化为 `screenshots/TC-UI-BATCH-HIT-REUSE--batch-hit-runtime.png`，作为 verify runtime source；不声明 Figma-vs-runtime 设计对齐通过。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A；本 case 只触发 sheet 解析 GET `apiGetDeliveryItemsFromSheet`，不执行写接口。
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=R-BAM-BATCH-SHEET-HIT; apiName=apiGetDeliveryItemsFromSheet; natural request reached target GET but real sheet sample returned `code=10001604`; active-case `/delivery:mock` detour completed. Runtime proof captured both the original real failure body and the `[BAM_MOCK_HIT]` mockedResponse after field-level `mockOperations`; this closes current frontend runtime scope only, not real backend success contract.
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: PASS_WITH_NOTES：自然失败证据、runtime mock hit JSON、BAM manifest/detour 证据、DOM summary/row/action、红字 computed style 和本地截图均已落盘；Figma 对齐已按 design NON_BLOCKER_ARCHIVED 关闭；真实后端 sheet 成功样本已由 2026-07-13 12:04 MTR 自然 UI `st=0/code=0` + 3 rows 关闭；batch remove/export 复用 case 仍需按独立 case 边界处理。
- `residual_risk`: /delivery:design 需基于本截图复查 IMG8 / Figma 对齐；真实后端当前 sheet sample 仍返回 `code=10001604`，需要 real verify 复验 `if_not_incentive/not_incentive_reason` 的真实来源；`TC-INT-BATCH-ONE-CLICK-REMOVE` 与 `TC-INT-BATCH-EXPORT` 不由本 case 代替关闭。
- `next_step`: /delivery:design recheck closed as NON_BLOCKER; keep real backend sheet success and batch interaction rechecks open.

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-UI-BATCH-HIT-REUSE
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-UI-BATCH-HIT-REUSE
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=batch-upload-hit; capture_scope=drawer-first-screen; ruleId=R-BAM-BATCH-SHEET-HIT; sheet_url=https://bytedance.larkoffice.com/sheets/batch-hit-7306602080
- `step_changes`: natural UI request captured; `/delivery:mock` detour completed; refreshed business page; `[BAM_MOCK_HIT]` + DOM + screenshot evidence recorded
- `assertion_changes`: all assertion records executed and mapped to persistent evidence for current batch upload hit reuse case
- `evidence_alignment`: aligned_for_design_with_non_blocker_notes
- `notes`: Current case closed as PASS_WITH_NOTES only for batch upload page-level hit-state reuse runtime assertions; batch one-click remove/export cases remain queued.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-UI-BATCH-HIT-REUSE
- `evidence_requirement_id`: TC-UI-BATCH-HIT-REUSE__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI batch upload sheet URL -> GET `apiGetDeliveryItemsFromSheet` -> `[BAM_MOCK_HIT]` -> Drawer table render
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| sheet response fields if_not_incentive/not_incentive_reason 被消费 | `[BAM_MOCK_HIT]` mockedResponse row `200002` records `if_not_incentive=true` and `not_incentive_reason=[历史违规命中不激励规则]`; DOM renders `命中【不激励】规则`. Row `200001` records `if_satisfy_delivery_rules=false` and DOM renders `不满足准入门槛`; row `200003` remains valid without hit label. | verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--runtime-mock-hit.json; mock/apis/apiGetDeliveryItemsFromSheet/manifest.json; screenshots/TC-UI-BATCH-HIT-REUSE--batch-hit-runtime.png | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-UI-BATCH-HIT-REUSE
- `evidence_requirement_id`: TC-UI-BATCH-HIT-REUSE__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime DOM/request scan after batch upload hit render
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不新增独立 unsupported hit UI | DOM negative checks record no `unsupported` / 不支持命中态 text, no manual-input-only error layout, no real failure message, and no extra appeal/governance UI. Hit-state uses the same summary/action/table pattern as manual input. | verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--runtime-mock-hit.json; screenshots/TC-UI-BATCH-HIT-REUSE--batch-hit-runtime.png | PASS |
| 不跳过 apiGetDeliveryItemsFromSheet | XHR probe records GET `/api/buyin/admin/content_activity/get_delivery_items_from_sheet` with exact `sheet_url/activity_id/config_id`; console marker records `apiName=apiGetDeliveryItemsFromSheet` and ruleId `R-BAM-BATCH-SHEET-HIT`. | verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--runtime-mock-hit.json; verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--natural-failure-runtime.json | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-UI-BATCH-HIT-REUSE
- `evidence_requirement_id`: TC-UI-BATCH-HIT-REUSE__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime Drawer viewport screenshot and DOM order scan after batch upload hit render
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 批量上传 radio/upload/table/footer 与 IMG8 baseline 一致 | Runtime source shows right-side Drawer `提报视频`, `批量上传` input and template link, submit button, summary/action area, table, pagination and footer `提交并投放`/`取消`; exact Figma spacing/token alignment remains for `/delivery:design`. | verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--runtime-mock-hit.json; screenshots/TC-UI-BATCH-HIT-REUSE--batch-hit-runtime.png | PASS_WITH_NOTES |

#### Design Recheck Closure（设计复检闭环）

- `closed_at`: 2026-07-10T01:51:31+08:00
- `stage`: /delivery:design
- `design_result`: NON_BLOCKER_ARCHIVED
- `closed_recheck_id`: TC-UI-BATCH-HIT-REUSE__recheck__design_alignment
- `subagent_gate_summary`: `design_check_tc_ui_batch_hit_reuse` returned PASS; screenshot `screenshots/TC-UI-BATCH-HIT-REUSE--design-check-current.png`.
- `main_agent_gate_review`: accepted subagent PASS evidence, but recorded Figma reference/runtime-baseline visible differences as NON_BLOCKER rather than silent exact-match PASS.
- `persistent_evidence`:
  - `07-design-alignment.md`
  - `verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--design-alignment-evidence.json`
  - `screenshots/TC-UI-BATCH-HIT-REUSE--design-current-batch-hit.png`
  - `screenshots/TC-UI-BATCH-HIT-REUSE--design-check-current.png`
- `non_blocker_notes`:
  - Figma reference screenshot shows uploaded/template-value row and max `100条`; current case contract requires sheet URL input and `apiGetDeliveryItemsFromSheet`, with runtime helper `最多支持50条`.
  - Figma sample rows/count differ from runtime mock rows `200001/200002/200003`.
  - Figma node text records `投放金额(元)` while runtime renders `投放金额（元）`.
  - These are accepted for this case by `RUNTIME_BASELINE_ALLOWED`, AF-003 and TASK-006; they do not close or waive real backend or batch interaction rechecks.
- `negative_scan`: PASS; fresh DOM and message/toast scan show no `表格数据不符合要求`, unsupported hit UI, manual-only error layout, new skeleton, `申诉`, `低质`, `编辑`, auto-remove, standalone `性别` or standalone `年龄`.

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-UI-BATCH-HIT-REUSE
- `evidence_requirement_id`: TC-UI-BATCH-HIT-REUSE__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime forbidden visual/text scan after batch upload hit render
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现手动输入专属错误布局或新骨架 | Batch upload placeholder remains `请填写或粘贴飞书表格链接`; DOM negative checks record manual input placeholder absent, real failure message absent, and no new unsupported skeleton. | verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--runtime-mock-hit.json; screenshots/TC-UI-BATCH-HIT-REUSE--batch-hit-runtime.png | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-UI-BATCH-HIT-REUSE
- `evidence_requirement_id`: TC-UI-BATCH-HIT-REUSE__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: materialization check for runtime evidence JSON, BAM manifest/detour artifacts and local screenshot
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：DOM | Runtime evidence JSON records input state, summary, buttons, rows, hit labels, computed style and negative text checks. | verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--runtime-mock-hit.json | PASS |
| 证据类型：截图 | Verify screenshot exists as baseline; design recheck also materialized fresh current-code screenshots after DESIGN-REWORK-007: `design-current-batch-hit.png` and `design-check-current.png`, both PNG 1733x1523. | screenshots/TC-UI-BATCH-HIT-REUSE--batch-hit-runtime.png; screenshots/TC-UI-BATCH-HIT-REUSE--design-current-batch-hit.png; screenshots/TC-UI-BATCH-HIT-REUSE--design-check-current.png | PASS |
| 证据类型：Network | Natural failure JSON records first real request/response; runtime mock-hit JSON records follow-up GET, original XHR failure body and `[BAM_MOCK_HIT]` mockedResponse after operations. | verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--natural-failure-runtime.json; verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--runtime-mock-hit.json; mock/apis/apiGetDeliveryItemsFromSheet/manifest.json | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-UI-BATCH-HIT-REUSE__recheck__design_alignment | CLOSED_NON_BLOCKER | NON_BLOCKER_ARCHIVED | /delivery:design | visual_assertion | Figma node/screenshot、fresh runtime screenshot、DOM/computed、Network/BAM marker 与 negative scan 已关闭当前可见设计合同；Figma reference/runtime-baseline 差异按 AF-003/TASK-006 明确记录为 NON_BLOCKER | 07-design-alignment.md; verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--design-alignment-evidence.json; screenshots/TC-UI-BATCH-HIT-REUSE--design-current-batch-hit.png; screenshots/TC-UI-BATCH-HIT-REUSE--design-check-current.png | TC-UI-BATCH-HIT-REUSE | main-agent |
| TC-UI-BATCH-HIT-REUSE__recheck__real_backend_sheet_success | CLOSED_WITH_NOTES | PASS_WITH_NOTES | real verify | positive_assertion | 2026-07-13 12:04 MTR 改走自然 UI + 页面 `__token`，真实可访问 sheet 返回 `st=0/code=0`，DOM 渲染 3 行和命中态；direct probe / 旧 `batch-hit` URL 仍不能作为 pass 证据 | `verify-logs/evidence/mtr-real-recheck-20260713.md#batch-sheet-natural-ui-retest-2026-07-13-1202-1204`; DOM summary `共3个作品...3个`; rows `1279271921656/28083207347/7634842254674947950` | TC-UI-BATCH-HIT-REUSE | main-agent |
| TC-UI-BATCH-HIT-REUSE__recheck__batch_interaction_cases | OPEN | PASS_WITH_NOTES | /delivery:verify | N/A | 当前 page-level case 不替代 `一键移除` 和 `导出剔除明细` 交互 case；二者需按 Verify Case Queue 独立执行 | independent case-result docs for TC-INT-BATCH-ONE-CLICK-REMOVE and TC-INT-BATCH-EXPORT | TC-INT-BATCH-ONE-CLICK-REMOVE | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 去 mock 后探测 `get_delivery_items_from_sheet`，sheet URL 使用既有 batch-hit 样本。 |
| real_response | `code=95271007`, `msg=页面长时间未操作已自动断开连接，请刷新后重试~`, `data=null`。 |
| pass_policy | 该响应不能作为真实 sheet 权限、字段解析或命中态 UI 的 MTR pass。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#invalid-direct-probe-evidence` |
| mtr_result | `OPEN_ENV_ISSUE` |
| remaining_real_gap | 需真实可访问 Feishu sheet + 自然 UI 路径返回 rows 后复测命中态复用。 |

#### MTR Real Retest 2026-07-13 11:34-11:35

| field | value |
|---|---|
| real_action | 在 no-mock award page `activity_id=7629288371705643310` 上先直接探测一次；随后重新加载同一 no-mock URL，等待业务 tabs 恢复后再次探测 `get_delivery_items_from_sheet`。 |
| request | `GET /api/buyin/admin/content_activity/get_delivery_items_from_sheet?sheet_url=https%3A%2F%2Fbytedance.larkoffice.com%2Fsheets%2Fbatch-hit-7306602080&activity_id=7653282555822653742&config_id=7653282555822735662` |
| real_response | 两次 HTTP `200`，业务 JSON 均为 `st=95271007`, `code=95271007`, `msg=页面长时间未操作已自动断开连接，请刷新后重试~`, `data=null`, `total=0`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#batch-sheet-retest-2026-07-13-1134-1135` |
| mtr_result | `OPEN_ENV_ISSUE` |
| remaining_real_gap | 仍需真实可访问 Feishu sheet + 自然 UI 路径返回 `code=0` rows 后复测命中态复用、字段解析和页面渲染。 |

#### MTR Real Retest 2026-07-13 11:53

| field | value |
|---|---|
| real_action | 在 freshly navigated no-mock award page 上分别使用历史 batch 参数与当前 MTR 页面参数探测 `get_delivery_items_from_sheet`。 |
| request_1 | historical batch params: `sheet_url=https://bytedance.larkoffice.com/sheets/batch-hit-7306602080`, `activity_id=7653282555822653742`, `config_id=7653282555822735662`。 |
| request_2 | current page params: `sheet_url=https://bytedance.larkoffice.com/sheets/batch-hit-7306602080`, `activity_id=7629288371705643310`, `config_id=7629288371705659694`。 |
| real_response | 两次 HTTP `200`，业务 JSON 均为 `st=95271007`, `code=95271007`, `msg=页面长时间未操作已自动断开连接，请刷新后重试~`, `data=null`, `total=0`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#batch-sheet-retest-2026-07-13-1153` |
| mtr_result | `OPEN_ENV_ISSUE` |
| remaining_real_gap | 仍需真实可访问 Feishu sheet + 自然 UI 路径返回 `code=0` rows 后复测命中态复用、字段解析和页面渲染。 |

#### MTR Natural UI Retest 2026-07-13 12:02-12:04

| field | value |
|---|---|
| real_action | 对比线上 no-mock tab 和本地调试 no-mock tab 的 direct probe 后，改走本地调试 tab 的自然 UI：`批量上传` -> 输入 / 保持真实可访问 sheet -> 安装临时 XHR/fetch response capture -> 点击 `提交`。未点击 `提交并投放`，未触发 remove/export write。 |
| direct_probe_result | online subapp 与 local debug subapp 上，历史 batch 参数和当前 activity/config 参数 direct probe 均仍返回 `st/code=95271007`, `data=null`；这些 direct probe 仍不能作为 real pass。 |
| natural_ui_request | `GET /api/buyin/admin/content_activity/get_delivery_items_from_sheet?...activity_id=7629288371705643310&config_id=7629288371705659694&__token=[REDACTED]`，实际 sheet URL 为页面自然 UI 使用的真实可访问 wiki/sheet 链接。 |
| natural_ui_response | HTTP `200`; response starts with `st=0`, `code=0`, `msg=""`, `data.item_info=[...]`, log_id `2026071320043290E396E75EBBF17ED266`。 |
| dom_evidence | Summary `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：3个`; visible buttons `一键移除` / `导出移除明细`; rows include video IDs `1279271921656`, `28083207347`, `7634842254674947950`, labels `不满足发奖条件`, amounts `329/20/100`, durations `2小时/12小时` and proposal reasons. |
| screenshot_evidence | Browser returned inline runtime screenshot for the success state, but no workspace file path was found for `mtr-batch-sheet-natural-success-7629288371705643310-20260713.png`; do not register as `local_file`. |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#batch-sheet-natural-ui-retest-2026-07-13-1202-1204` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | Exact old `batch-hit-7306602080` direct-probe URL remains invalid (`95271007`) and cannot be used as pass evidence. Natural UI with page token and real accessible sheet closes real sheet permission, field parsing, returned rows, and hit-state UI for this MTR scope. |
