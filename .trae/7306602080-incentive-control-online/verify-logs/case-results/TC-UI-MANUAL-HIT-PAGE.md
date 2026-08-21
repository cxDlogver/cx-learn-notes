# Verification Case Result

### Case: `TC-UI-MANUAL-HIT-PAGE`

- `order`: 15
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Region:人工提报命中态/Drawer/Summary/action/表格行态
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-10T01:24:03+08:00
- `verification_target`: Region:人工提报命中态/Drawer/Summary/action/表格行态
- `acceptance_steps`:
  - Task 5 已完成 store/form/drawer 接线
  - 在手动输入中提交作品ID并等待列表返回
  - 期望：Drawer 展示 summary、一键移除、导出剔除明细、命中红字、提交并投放 footer
- `verification_process`:
  - EXECUTED：主 Agent 串行执行当前 active case，未启用 subagent。
  - EXECUTED：通过自然 UI 进入活动 `7653282555822653742` 的 `配置一（人工提报）`，打开 `提报视频` Drawer，在 `手动输入` 中提交 `100001,100002,100003`。
  - EXECUTED：自然 UI 触发 GET `/api/buyin/admin/content_activity/search_delivery_items`，query 包含 `activity_id=7653282555822653742`、`config_id=7653282555822735662`、`item_ids=100001,100002,100003`、`candidate_pool_type=2`、`page_no=1`、`page_size=50`；页面内验证缓存记录单次 `[BAM_MOCK_HIT]`，apiName=`apiSearchDeliveryItems`，ruleId=`R-BAM-MANUAL-SEARCH-HIT`。
  - EXECUTED：受控 `/delivery:mock` detour 已完成，BAM marker 重新应用并通过接口级 `verify.mjs` 与 `verify-bam-mock.mjs`；本 case 只消费该 rule 的运行态证据，不自动关闭共享 rule 的 cell / guard / track case。
  - EXECUTED：运行态 DOM 显示 summary `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：2个`，三行作品均保留，`100001` 显示 `不满足准入门槛`，`100002` 显示 `命中【不激励】规则`，`100003` 为可投放保留行。
  - EXECUTED：运行态 DOM 显示 `一键移除`、`导出剔除明细`、footer `提交并投放`，行内投放配置编辑控件仍可见；负向扫描未出现 `申诉`、`低质`、`编辑` 文案残留。
  - EXECUTED：本地截图已物化为 `screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png`，作为 verify runtime source；不声明 Figma-vs-runtime 设计对齐通过。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A；当前 case 只触发 GET 读接口，未触发写接口
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=R-BAM-MANUAL-SEARCH-HIT; apiName=apiSearchDeliveryItems; natural UI request reached; `[BAM_MOCK_HIT]` captured; mocked response contains 3 mixed rows; `/delivery:mock` detour completed and returned to verify
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: PASS_WITH_NOTES：BAM hit、request field、mixed row state、summary/action/footer、三行保留、负向残留和截图已落盘；/delivery:design 已完成设计复核；2026-07-13 MTR 通过自然 UI + 页面 `__token` 补充真实 `search_delivery_items` 成功证据。
- `residual_risk`: 真实后端 `if_satisfy_delivery_rules=false` 命中态已由 MTR 自然 UI 闭合；真实 `if_not_incentive=true/not_incentive_reason` 样本、`total_num/candidate_num` 语义、完整 reward config 下的阻断 toast 和 DA/UV 仍需 real verify / 外部平台复验。共享 `R-BAM-MANUAL-SEARCH-HIT` 的 `TC-CELL-MANUAL-HIT-STATUS`、`TC-INT-MANUAL-SUBMIT-GUARD`、`TC-TRACK-MANUAL-HIT-EXPOSE` 已有独立 case-result。
- `next_step`: wait for true not-incentive real sample / DA evidence if further MTR closure is required; do not mark workspace `REAL_ENV_VERIFIED`.

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-UI-MANUAL-HIT-PAGE
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-UI-MANUAL-HIT-PAGE
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=manual-hit; capture_scope=drawer-first-screen; ruleId=R-BAM-MANUAL-SEARCH-HIT; item_ids=100001,100002,100003
- `step_changes`: natural UI request captured; `/delivery:mock` detour completed; `[BAM_MOCK_HIT]` + DOM + screenshot evidence recorded
- `assertion_changes`: all assertion records executed and mapped to persistent evidence for current page-level case
- `evidence_alignment`: aligned_for_verify_runtime; design_alignment_pending
- `notes`: Current case closed as PASS_WITH_NOTES only for page-level manual hit runtime assertions; shared rule cases remain queued.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-UI-MANUAL-HIT-PAGE
- `evidence_requirement_id`: TC-UI-MANUAL-HIT-PAGE__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI manual input `100001,100002,100003` -> GET `apiSearchDeliveryItems` -> `[BAM_MOCK_HIT]` -> Drawer table render
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 命中项仍保留 | Rows `100001` and `100002` remain visible after the manual hit response; row `100003` also remains visible as valid item. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |
| summary 数量正确 | DOM summary text is `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：2个`; BAM response summary has `total_num=3`, `candidate_num=1`, and two hit rows by front-end hit predicate. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json | PASS |
| `apiSearchDeliveryItems` request 命中手动输入 rule | `[BAM_MOCK_HIT]` payload records `apiName=apiSearchDeliveryItems`, method `GET`, path `/api/buyin/admin/content_activity/search_delivery_items`, ruleId `R-BAM-MANUAL-SEARCH-HIT`, `item_ids=100001,100002,100003`, `candidate_pool_type=2`, `page_no=1`, `page_size=50`. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json; mock/apis/apiSearchDeliveryItems/manifest.json | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-UI-MANUAL-HIT-PAGE
- `evidence_requirement_id`: TC-UI-MANUAL-HIT-PAGE__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime DOM row and control scan after manual hit render
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不自动剔除命中项 | Invalid row `100001` and not-incentive row `100002` remain in the table after hit rendering; no automatic removal occurred. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |
| 不隐藏现有编辑列 | Each row still shows existing editable delivery config controls/placeholders such as amount, duration, target, effective time and reason; row action `移除` remains visible. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-UI-MANUAL-HIT-PAGE
- `evidence_requirement_id`: TC-UI-MANUAL-HIT-PAGE__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime Drawer viewport screenshot and DOM order scan
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| Drawer 右侧结构 | Runtime source shows right-side Drawer `提报视频`, manual/batch radio area, manual input, submit button, summary/action area, table and footer over dimmed page context. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS_WITH_NOTES |
| 按钮顺序 | Runtime DOM/screenshot shows action order `一键移除` then `导出剔除明细`; footer shows `提交并投放` and `取消`. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS_WITH_NOTES |
| 表格顺序运行态来源 | Runtime table rows are ordered `100001`, `100002`, `100003`, with hit labels rendered below title/ID and existing editable columns/action column retained. Figma exact alignment is intentionally left for `/delivery:design`. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-UI-MANUAL-HIT-PAGE
- `evidence_requirement_id`: TC-UI-MANUAL-HIT-PAGE__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime DOM forbidden text scan and screenshot after manual hit render
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现申诉入口 | DOM forbidden text scan records `appeal=false`; screenshot shows no appeal action in summary, rows or footer. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |
| 不出现自动剔除提示 | Summary only reports hit count and actions; no auto-removal success/fake success text is present, and hit rows remain visible. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |
| 不出现背景低保真内容或旧残留 | DOM forbidden text scan records `low_quality=false` and `edit=false`; screenshot runtime source shows Drawer content rather than Figma parent preview. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json; screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-UI-MANUAL-HIT-PAGE
- `evidence_requirement_id`: TC-UI-MANUAL-HIT-PAGE__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: materialization check for runtime evidence JSON, BAM manifest audit and local screenshot
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot+mock-log
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：DOM | Runtime evidence JSON records Drawer title/manual input/summary/action/footer/row text presence and forbidden text absence. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json | PASS |
| 证据类型：截图 | Screenshot exists under workspace `screenshots/`, type PNG 2549x1875, sha256 `06850f0b3f449b3d07212521c703a816a00d0eeb367f55bed716479279d73a87`. | screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png | PASS |
| 证据类型：Network / mock hit | Request method/path/body are recorded from single-string `[BAM_MOCK_HIT]` payload and the audited `apiSearchDeliveryItems` manifest; later browser Network panel did not retain the earlier GET entry, so no separate Network-panel claim is made. | verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json; mock/apis/apiSearchDeliveryItems/manifest.json; delivery-mock.md | PASS |

#### Design Recheck Closure（设计复检闭环）

- `case_id`: TC-UI-MANUAL-HIT-PAGE
- `design_stage_result`: FIXED_PASS
- `closed_at`: 2026-07-10T01:24:03+08:00
- `closed_by`: /delivery:design
- `closure_evidence`: 07-design-alignment.md; screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png; verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--design-rerun-rework-007-runtime.json
- `design_checker_gate`: FIXED_PASS；未扫描/关闭后续 case
- `closed_blockers`: B-TC-UI-MANUAL-HIT-PAGE-001; B-TC-UI-MANUAL-HIT-PAGE-002
- `closure_summary`: d2c/Figma contract consumed for Drawer summary/action/table/footer; rerun screenshot and DOM show footer order `取消 -> 提交并投放`, table header order `序号 / 视频/图文内容 / 投放金额（元） / 投放时长 / 转化目标偏好 / 投放生效时间 / 目标受众 / 提报理由 / 操作`, no standalone `性别/年龄`, summary/action/rows/red labels and `R-BAM-MANUAL-SEARCH-HIT` remain intact.

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-UI-MANUAL-HIT-PAGE__recheck__design_alignment | CLOSED | PASS_WITH_NOTES | /delivery:design | visual_assertion | 已由 `/delivery:design` 复核 Figma/d2c ↔ runtime；`DESIGN-REWORK-007` 后 footer/table blockers 均为 FIXED_PASS | 07-design-alignment.md; screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png; verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--design-rerun-rework-007-runtime.json | TC-UI-MANUAL-HIT-PAGE | design-checker |
| TC-UI-MANUAL-HIT-PAGE__recheck__real_backend_fields | OPEN | PASS_WITH_NOTES | real verify | positive_assertion | 2026-07-13 12:49 MTR 自然 UI 已闭合真实 `search_delivery_items` 访问、3 行 `if_satisfy_delivery_rules=false` 和命中态 DOM；真实 `if_not_incentive=true/not_incentive_reason` 样本、`total_num/candidate_num` 语义仍需复验 | real request/response evidence for apiSearchDeliveryItems with `if_not_incentive=true` / `not_incentive_reason` sample, or backend audit explaining no such sample | TC-UI-MANUAL-HIT-PAGE | main-agent |
| TC-UI-MANUAL-HIT-PAGE__recheck__shared_rule_cases | CLOSED_WITH_NOTES | PASS_WITH_NOTES | /delivery:verify + /delivery:verify --mtr | N/A | cell / submit guard / track case 均已有独立 case-result；MTR 又补充自然 UI real search evidence，但 DA/UV 和 true not-incentive sample 仍在各自 gap 中保留 | TC-CELL-MANUAL-HIT-STATUS.md; TC-INT-MANUAL-SUBMIT-GUARD.md; TC-TRACK-MANUAL-HIT-EXPOSE.md; verify-logs/evidence/mtr-real-recheck-20260713.md#manual-hit-natural-ui-retest-2026-07-13-1245-1249 | TC-CELL-MANUAL-HIT-STATUS | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 去 mock 后保留 direct probe 断链记录；随后改走自然 UI：无 `externalLeadsDomainMock=1` 页面打开 `新增提报` Drawer，切到 `手动输入`，输入 `1279271921656,28083207347,7634842254674947950`，点击 `提交`，请求带页面 `__token`。 |
| real_response | Natural UI / same page-token read follow-up returned HTTP `200`, `st=0`, `code=0`, `data.item_info.length=3`, `total_num=0`, `candidate_num=0`; all summarized rows had `if_satisfy_delivery_rules=false`. |
| real_dom | Drawer rendered summary `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：3个`, actions `一键移除` / `导出移除明细`, rows `1279271921656` / `28083207347` / `7634842254674947950`, row label `不满足发奖条件`, footer `提交并投放` / `取消`; no `申诉`, success text or submit modal. |
| pass_policy | Direct probe `code=95271007` remains invalid evidence, but natural UI with page token is valid MTR evidence for real search access, real returned rows, `if_satisfy_delivery_rules=false`, summary and row-retention UI. |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#manual-hit-natural-ui-retest-2026-07-13-1245-1249`; `verify-logs/evidence/mtr-real-recheck-20260713.md#invalid-direct-probe-evidence` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | Real `if_not_incentive=true/not_incentive_reason` sample was not obtained; `total_num/candidate_num` returned `0` while `item_info.length=3`; exact direct probe without page token still returns `95271007`; screenshot is inline runtime only, not `local_file`. |
