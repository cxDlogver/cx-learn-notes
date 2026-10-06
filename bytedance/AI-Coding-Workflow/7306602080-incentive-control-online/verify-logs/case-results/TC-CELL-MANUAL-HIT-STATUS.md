# Verification Case Result

### Case: `TC-CELL-MANUAL-HIT-STATUS`

- `order`: 16
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Cell:人工提报命中态/视频图文内容
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-10T01:36:29+08:00
- `verification_target`: Cell:人工提报命中态/视频图文内容
- `acceptance_steps`:
  - 手动输入命中态已加载
  - 查看命中行的视频/图文内容 cell
  - 期望：封面/标题/ID下方展示红字 `命中【不激励】规则`，可同时展示 `不满足准入门槛`
- `verification_process`:
  - EXECUTED：复用同一自然 UI Drawer 状态和 `R-BAM-MANUAL-SEARCH-HIT` BAM 命中基础事实，但本 case 独立采集了行级 DOM、computed style 和截图映射。
  - EXECUTED：`100001` 行显示 `不满足准入门槛`，证明 `if_satisfy_delivery_rules=false` 驱动准入失败标签；`100002` 行显示 `命中【不激励】规则`，证明 `if_not_incentive=true` 驱动不激励标签；`100003` 行不显示命中标签。
  - EXECUTED：两个命中标签均位于视频标题 / 视频ID 下方的内容 cell 区域；computed style 记录颜色 `rgb(245, 63, 63)`、字号 `12px`、`display=block`、line-height `18px`。
  - EXECUTED：三行仍保留 `移除` 热区和既有投放配置编辑占位；未出现空命中标签、`申诉`、`低质` 或 badge 覆盖编辑列的运行态信号。
  - EXECUTED：截图复用 `TC-UI-MANUAL-HIT-PAGE` 的同状态 viewport runtime source，并在本 case 单独映射 cell-level DOM/computed style；verify 不声明 Figma-vs-runtime 精确对齐通过。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A；当前 case 只消费已加载 GET 读接口状态，未触发写接口
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=R-BAM-MANUAL-SEARCH-HIT; apiName=apiSearchDeliveryItems; reused completed manual-hit runtime state; no new mock detour
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: PASS_WITH_NOTES：cell-level DOM、computed style、红字标签、行保留、移除热区和截图映射已落盘；Figma 精确位置/间距和真实后端字段来源仍需后续复检。
- `residual_risk`: /delivery:design 需基于截图和 computed style 对比 Figma node `87:7028` / `87:7113`；真实后端 `if_not_incentive/not_incentive_reason` 字段来源仍需 real verify。
- `next_step`: continue Verify Case Queue with `TC-INT-MANUAL-SUBMIT-GUARD`; do not enter /delivery:design

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-CELL-MANUAL-HIT-STATUS
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-CELL-MANUAL-HIT-STATUS
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=manual-hit-row; capture_scope=table first hit row; ruleId=R-BAM-MANUAL-SEARCH-HIT; reused_item_ids=100001,100002,100003
- `step_changes`: reused manual-hit Drawer state; captured independent cell-level DOM/computed style evidence
- `assertion_changes`: all assertion records executed and mapped to persistent evidence for current cell-level case
- `evidence_alignment`: aligned_for_verify_runtime; design_alignment_pending
- `notes`: Current case closed as PASS_WITH_NOTES for cell-level runtime assertions; shared submit guard / track cases remain queued.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-CELL-MANUAL-HIT-STATUS
- `evidence_requirement_id`: TC-CELL-MANUAL-HIT-STATUS__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: manual-hit Drawer state -> row DOM scan for `100001` / `100002` / `100003`
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| `if_not_incentive` 驱动标签 | Row `100002` displays `命中【不激励】规则`; mock payload for `100002` records `if_not_incentive=true` and `not_incentive_reason=[历史违规命中不激励规则]`. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json; verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json | PASS |
| `if_satisfy_delivery_rules` 驱动标签 | Row `100001` displays `不满足准入门槛`; mock payload for `100001` records `if_satisfy_delivery_rules=false`. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json; verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json | PASS |
| 可投放行不显示命中标签 | Row `100003` has no `不满足准入门槛` or `命中【不激励】规则` label; mock payload records valid deliverable state. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json; verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-CELL-MANUAL-HIT-STATUS
- `evidence_requirement_id`: TC-CELL-MANUAL-HIT-STATUS__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime row retention and row text scan after manual hit render
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不自动删除命中行 | Rows `100001` and `100002` remain visible while carrying hit labels. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |
| 不隐藏投放记录提示 / 编辑控件 | Hit rows retain editable placeholders such as `请选择` and row action `移除`; no row is replaced by a standalone warning-only layout. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-CELL-MANUAL-HIT-STATUS
- `evidence_requirement_id`: TC-CELL-MANUAL-HIT-STATUS__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime label DOM/computed style scan and reused same-state screenshot
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 红字状态位于 item id 下方 | Runtime rows show hit labels after title and `视频ID`; computed style records both labels as block elements in the same row text area. Exact Figma spacing remains for `/delivery:design`. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS_WITH_NOTES |
| 行级移除热区保留 | Rows `100001`, `100002`, and `100003` all retain `移除` action text. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |
| 标签视觉颜色 | `不满足准入门槛` and `命中【不激励】规则` both compute to `rgb(245, 63, 63)` with `font-size=12px`; this matches the red warning runtime requirement, while Figma token comparison remains design-stage work. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-CELL-MANUAL-HIT-STATUS
- `evidence_requirement_id`: TC-CELL-MANUAL-HIT-STATUS__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime forbidden visual/text scan after manual hit render
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现错误颜色 | Both hit labels compute to `rgb(245, 63, 63)`; no alternate low-quality or neutral-only status text is present for hit rows. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json | PASS |
| badge 不覆盖编辑列 | Hit rows still include editable placeholders and action text; labels remain within row content text area rather than replacing adjacent edit cells. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |
| 不出现空标签 | Hit rows have explicit text labels; `empty_status_dash_only_for_hit_rows=false`. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-CELL-MANUAL-HIT-STATUS
- `evidence_requirement_id`: TC-CELL-MANUAL-HIT-STATUS__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: materialization check for cell-level computed style JSON and reused same-state screenshot
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：DOM | Cell-level runtime evidence records row text, item IDs, labels, row action retention and forbidden text absence. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json | PASS |
| 证据类型：截图 | Reused same-state screenshot from page-level manual hit case shows the relevant row cells and is mapped independently here. | screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |
| 证据类型：computed style | Evidence JSON records computed `color`, `font_size`, `font_weight`, `line_height` and `display` for invalid and not-incentive labels. | verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json | PASS |

#### Design Recheck Closure（设计复检关闭）

- `closed_at`: 2026-07-10T01:36:29+08:00
- `closed_recheck_id`: TC-CELL-MANUAL-HIT-STATUS__recheck__design_alignment
- `design_result`: PASS
- `closed_by`: /delivery:design strict serial active case `TC-CELL-MANUAL-HIT-STATUS`
- `figma_source`: Figma node data `figma-cache/nodes/F7-get_figma_data-87_7016-d6.md`; screenshot `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`
- `f2c_source`: d2c manifest `code-review/d2c-evidence/task-TASK-005/manifest.md`; row XML/JPG `code-review/d2c-evidence/task-TASK-005/87_7016/figma_87_7016_1783502075850.xml/.jpg`
- `runtime_source`: closure screenshot `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`; computed style `verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json`; design evidence `verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--design-alignment-evidence.json`
- `closure_summary`: Figma/d2c row labels `87:7028` / `87:7113` match runtime labels below title/video ID; labels compute to `rgb(245, 63, 63)`, `12px`, line-height `18px`; rows and `移除` actions remain visible; negative scan has no wrong color, empty label, badge-covering-edit-column, auto-delete, `申诉`, `低质`, or invented UI residue.
- `remaining_open_recheck`: TC-CELL-MANUAL-HIT-STATUS__recheck__real_backend_fields remains OPEN for real verify only.

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-CELL-MANUAL-HIT-STATUS__recheck__design_alignment | CLOSED_PASS | PASS_WITH_NOTES | /delivery:design | visual_assertion | `/delivery:design` consumed Figma node `87:7028` / `87:7113`, d2c row `87:7016`, runtime screenshot, DOM/computed style and negative scan; exact design contract is closed for this cell-level case | 07-design-alignment.md; verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--design-alignment-evidence.json; verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json | TC-CELL-MANUAL-HIT-STATUS | design-checker |
| TC-CELL-MANUAL-HIT-STATUS__recheck__real_backend_fields | OPEN | PASS_WITH_NOTES | real verify | positive_assertion | 2026-07-13 12:49 MTR 自然 UI 已闭合真实 `if_satisfy_delivery_rules=false` -> row label `不满足发奖条件` 的字段消费和 DOM/computed style；真实 `if_not_incentive=true/not_incentive_reason` -> `命中【不激励】规则` 样本仍需复验 | real request/response evidence for apiSearchDeliveryItems rows with `if_not_incentive=true` / `not_incentive_reason`, plus row DOM/computed style | TC-CELL-MANUAL-HIT-STATUS | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 与 `TC-UI-MANUAL-HIT-PAGE` 同源，去 mock 后通过自然 UI 手动输入触发 `GET /api/buyin/admin/content_activity/search_delivery_items`；direct probe 的 `95271007` 仅保留为无效证据。 |
| real_response | HTTP `200`, `st=0`, `code=0`, `item_info.length=3`; rows `1279271921656`, `28083207347`, `7634842254674947950` all summarized as `if_satisfy_delivery_rules=false`. |
| real_dom_and_style | Each row rendered label `不满足发奖条件`; computed style scan recorded red labels with `color=rgb(255, 77, 79)`, `font-size=12px`, `display=block`; row `移除` action and edit controls remained visible. |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#manual-hit-natural-ui-retest-2026-07-13-1245-1249`; `verify-logs/evidence/mtr-real-recheck-20260713.md#invalid-direct-probe-evidence` |
| mtr_result | `PASS_WITH_NOTES` |
| pass_policy | Natural UI evidence closes real `if_satisfy_delivery_rules=false` label rendering. It does not prove true `if_not_incentive/not_incentive_reason` backend sample or DA/UV. Historical mock-preview/design evidence remains the proof for `命中【不激励】规则` rendering until a real true-not-incentive sample exists. |
| remaining_real_gap | Need a real row with `if_not_incentive=true` and `not_incentive_reason` to close the exact `命中【不激励】规则` backend field source. Current MTR row labels are all `不满足发奖条件`. |
