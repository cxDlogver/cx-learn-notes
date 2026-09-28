# Verification Case Result

### Case: `TC-CELL-COUPON-FIRST-ROW`

- `order`: 13
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Cell:DOU+券剔除明细/作者信息/原因/时间/操作人
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T14:00:00Z
- `verification_target`: Cell:DOU+券剔除明细/作者信息/原因/时间/操作人
- `acceptance_steps`:
  - DOU+券剔除明细默认请求返回至少一条记录
  - 对首行作者信息
  - 原因
  - 时间
  - 操作人逐格比对
  - 期望：作者信息含头像/昵称/ID，原因来自 `remove_reason`，时间由 `remove_time` 格式化，操作人为 PeopleCard 或 `-`
- `verification_process`:
  - IN_PROGRESS：从 Verify Case Ledger 第 13 个 case 恢复；复用 `TC-UI-COUPON-REMOVE-PAGE` 的 DOU+券默认列表运行态证据作为本 case runtime source。
  - EXECUTED：通过真实 UI `重置` 回到默认列表 rule 状态，确认筛选值为空、首行稳定为 `券作者示例 / ID: 900001 / 命中【不激励】规则 / 2026/07/08 20:40:40 / 陈相`。
  - EXECUTED：持久化 `TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json` 和 `TC-CELL-COUPON-FIRST-ROW--source-evidence.md`，覆盖首行作者信息、原因、时间、操作人 renderer 与 computed style。
  - DESIGN_EXECUTED：`/delivery:design` 已消费 Figma node data/screenshot、runtime screenshot、computed style 和 source evidence；首行作者信息/原因/时间/操作人 cell-level 合同 PASS，负向扫描 PASS。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A；当前 case 只复用/重置 GET 默认列表证据，未触发写接口
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=R-BAM-COUPON-REMOVE-DEFAULT; apiName=apiGetDouPlusCouponRemoveRecord; mock runtime detour 已 verified，本 case 复用默认列表 rule 但独立关闭首行 cell 断言
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: PASS_WITH_NOTES：默认列表首行 DOM、截图、computed style 和 source evidence 均已持久化；作者信息、原因、时间、操作人可观察，未出现作品内容/投放状态/券数量/裸 operator_id/作品封面标题结构。
- `residual_risk`: Verify 阶段关闭运行态 cell renderer 与 computed style；Figma alignment、真实后端排序仍需后续复验。
- `next_step`: continue Verify Case Queue with `TC-INT-REMOVE-TAB-SWITCH-COUPON`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-CELL-COUPON-FIRST-ROW
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-CELL-COUPON-FIRST-ROW
- `runbook_status`: pass_with_notes
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=coupon-table-loaded; capture_scope=table-header-first-row; ruleId=R-BAM-COUPON-REMOVE-DEFAULT
- `step_changes`: reused default coupon remove table runtime source; reset filter to default state; captured computed style and source renderer evidence
- `assertion_changes`: all initialized assertion records updated with evidence mapping
- `evidence_alignment`: `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--source-evidence.md`
- `notes`: verify screenshot is runtime source only; no Figma-vs-runtime alignment is claimed in this case

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-CELL-COUPON-FIRST-ROW
- `evidence_requirement_id`: TC-CELL-COUPON-FIRST-ROW__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: PASS
- `execution_ref`: Reused default-list first-row DOM/screenshot, reset current UI to default state, captured computed style and source renderer evidence
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 四个关键单元格字段和 renderer 均可观察 | First row shows `券作者示例 ID: 900001`, `命中【不激励】规则`, `2026/07/08 20:40:40`, `陈相`; source renderer maps `author_info/remove_reason/remove_time/operator_id`; computed style records all cells visible | `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--source-evidence.md` | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-CELL-COUPON-FIRST-ROW
- `evidence_requirement_id`: TC-CELL-COUPON-FIRST-ROW__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: PASS
- `execution_ref`: Runtime first-row/header scan and source renderer evidence confirm forbidden content absent
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不展示作品内容 | Runtime forbidden scan records `work_content=false`; first row text does not contain work title/content | `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--source-evidence.md` | PASS |
| 投放状态 | Runtime forbidden scan records `delivery_status=false`; source first-row renderer has no delivery status cell | `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--source-evidence.md` | PASS |
| 券数量 | Runtime forbidden scan records `coupon_count=false`; source first-row renderer has no coupon quantity cell | `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--source-evidence.md` | PASS |
| 裸 operator_id | Runtime first row displays `陈相` and records `raw_operator_id_in_row=false`; source uses `PeopleCard` for `operator_id` instead of rendering raw id | `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--source-evidence.md` | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-CELL-COUPON-FIRST-ROW
- `evidence_requirement_id`: TC-CELL-COUPON-FIRST-ROW__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: PASS_WITH_NOTES
- `execution_ref`: Runtime screenshot/computed style + source renderer evidence; Figma alignment pending
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 作者复合 cell 采用 existing coupon renderer 风格 | Source matches existing coupon distribution author renderer pattern: avatar, name, `ID`; runtime computed style records author image `40x40`, author/id text visible | `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--source-evidence.md`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json`; `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png` | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-CELL-COUPON-FIRST-ROW
- `evidence_requirement_id`: TC-CELL-COUPON-FIRST-ROW__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: PASS
- `execution_ref`: Runtime/source negative scan confirms no DOU+币 work cover/title structure in first row
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现作品封面/标题结构 | DOU+券 source uses `author_info`, not `item_card`; runtime records `work_title_structure=false` and first row has author name/ID instead of work cover/title | `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--source-evidence.md`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json`; `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png` | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-CELL-COUPON-FIRST-ROW
- `evidence_requirement_id`: TC-CELL-COUPON-FIRST-ROW__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: PASS
- `execution_ref`: DOM, screenshot, computed style and source renderer evidence are persisted and materialized
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：DOM | Runtime evidence records headers, first row text, cell text and forbidden visibility flags | `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json` | PASS |
| 证据类型：截图 | Reused default coupon remove table screenshot is a workspace PNG local file matching `coupon-table-loaded` state | `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png` | PASS |
| 证据类型：computed style | Browser computed style records author image, author/id text, reason/time/operator cells visible with dimensions/font/color | `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json` | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-CELL-COUPON-FIRST-ROW__recheck__design_alignment | CLOSED | PASS | /delivery:design | visual_assertion | Figma-vs-runtime 对齐已在 `/delivery:design` 关闭；作者复合 cell、原因、时间、操作人和禁显残留均 PASS | `07-design-alignment.md#Current Evidence: TC-CELL-COUPON-FIRST-ROW`; `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json` | TC-CELL-COUPON-FIRST-ROW | main-agent |
| TC-CELL-COUPON-FIRST-ROW__recheck__real_backend_order | OPEN | PASS_WITH_NOTES | /delivery:verify real-backend recheck | positive_assertion; evidence_required | MOCK_PREVIEW 默认首行通过；真实后端排序与真实作者数据仍需后端 ready 后复验 | 真实后端 Network response、DOM 首行截图或日志 | TC-CELL-COUPON-FIRST-ROW | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 无 `externalLeadsDomainMock=1` 页面读取 DOU+券默认剔除明细。 |
| real_first_rows | `大亮农业菌蔬优选店 ID: 109638766301 / 内容相关性低 / 2026/07/03 20:13:01 / 陈相`; 第二行同作者 `20:12:56`; 第三行 `内容质量不佳 / 14:55:24`。 |
| real_response | `records.length=3`, `total=3`, `has_more=false`, `operator_id=6068830`。 |
| negative_assertion | 未出现 DOU+币 `作品内容` 首列或作品封面/标题结构。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#dou券剔除明细默认读取` |
| mtr_result | `PASS` |
| remaining_real_gap | 当前默认真实首行已闭合；多页排序仍需更多真实样本复验。 |
