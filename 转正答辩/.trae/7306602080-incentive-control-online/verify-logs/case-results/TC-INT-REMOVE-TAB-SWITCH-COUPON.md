# Verification Case Result

### Case: `TC-INT-REMOVE-TAB-SWITCH-COUPON`

- `order`: 14
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Interaction:奖励投放/SubTab/剔除明细
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T14:02:33Z
- `verification_target`: Interaction:奖励投放/SubTab/剔除明细
- `acceptance_steps`:
  - DOU+券奖励投放默认在奖励下发或投放明细
  - 点击 剔除明细
  - 期望：activeSubTab 变为 remove detail，触发表格 request，legacy tab 仍可返回
- `verification_process`:
  - 点击 `奖励下发` 建立 before 状态：配置二 / DOU+券，SubTab=`奖励下发`，剔除明细表未渲染，三枚 SubTab 均可见。
  - 自然点击 `剔除明细`：SubTab active 切换为 `剔除明细`，触发 `apiGetDouPlusCouponRemoveRecord` GET 请求并命中 `R-BAM-COUPON-REMOVE-DEFAULT`。
  - 采集 after DOM / Network / console mock hit / screenshot / source evidence：作者表头与首行渲染；DOU+币作品表、作品内容列、投放状态、券数量残留均未出现。
  - 点击 `投放明细` 验证 legacy tab 可返回：SubTab active 切换为 `投放明细`，剔除明细筛选区和作者表头卸载。
  - DESIGN_EXECUTED：`/delivery:design` 已消费 Figma active tab node `1:12560`、DOU+券页截图、before/action/after runtime JSON 和本地截图；SubTab active、表格渲染、legacy return 与跨 reward type 负向扫描 PASS。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: READ_ONLY_GET；ruleId=R-BAM-COUPON-REMOVE-DEFAULT; apiName=apiGetDouPlusCouponRemoveRecord; 复用已完成 `/delivery:mock` 默认 rule，当前 case 只做自然 UI 读请求验证
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=R-BAM-COUPON-REMOVE-DEFAULT; apiName=apiGetDouPlusCouponRemoveRecord; `delivery-mock.md` 已完成 default rule detour，当前 case 复用该 rule 并独立完成 Tab 切换 evidence mapping
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: before/action/after、Network、`[BAM_MOCK_HIT]`、DOM、source evidence 与本地截图均已记录；verify 仅关闭 MOCK_PREVIEW 运行态与源码分支事实。
- `residual_risk`: `/delivery:design` 仍需对 runtime screenshot 与 Figma node `1:12560` 做视觉对齐；real backend 后仍需复验真实非空记录加载时序、分页/排序/has_more。
- `next_step`: proceed to next queued case `TC-UI-MANUAL-HIT-PAGE`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COUPON
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-REMOVE-TAB-SWITCH-COUPON
- `runbook_status`: executed
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=coupon-tab-switch; capture_scope=SubTab+table; ruleId=R-BAM-COUPON-REMOVE-DEFAULT
- `step_changes`: before `奖励下发` -> click `剔除明细` -> after DOU+券 remove table -> click `投放明细` return check
- `assertion_changes`: initial assertion records created from 09-test-case-matrix.md
- `evidence_alignment`: aligned_with_runtime_assertions
- `notes`: runtime Tab switch, DOU+券 request, default mock hit, active style, legacy return and cross reward-type negative assertions recorded; Figma alignment and real backend timing remain recheck items

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COUPON
- `evidence_requirement_id`: TC-INT-REMOVE-TAB-SWITCH-COUPON__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI click `奖励下发` before state -> click `剔除明细`; GET coupon remove_record hit default mock rule
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| SubTab.REMOVE_DETAIL 只渲染 DOU+券作者表 | activeSubTab=`剔除明细`; headers=`作者信息/剔除发奖原因/剔除发奖时间/操作人`; first row=`券作者示例 ID: 900001 命中【不激励】规则 2026/07/08 20:40:40 陈相`; source branch renders `DouPlusCouponRemoveRecordTable` only when `isCouponReward` | verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--runtime.json; verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--source-evidence.md; screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--mock-hit.png | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COUPON
- `evidence_requirement_id`: TC-INT-REMOVE-TAB-SWITCH-COUPON__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: after remove-detail DOM negative scan + legacy return click to 投放明细
- `recording_status`: RECORDED
- `evidence_type`: Network+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不隐藏 legacy tabs | `奖励下发/投放明细/剔除明细` 三枚 SubTab 始终可见；点击 `投放明细` 后 activeSubTab=`投放明细`，剔除明细筛选区卸载 | verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--runtime.json | PASS |
| 不渲染 DOU+币表 | after state 中 `coin_work_headers_visible=false`、`coin_work_sample_visible=false`、`work_content_visible=false`; source 中 DOU+币表受 `isCoinReward` 分支保护 | verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--runtime.json; verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--source-evidence.md | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COUPON
- `evidence_requirement_id`: TC-INT-REMOVE-TAB-SWITCH-COUPON__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: active Tab DOM class/computed style + local screenshot after remove-detail render
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot+computed_style
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| active tab 样式沿用现有 Tab/Radio token | active label class=`auxo-radio-button-wrapper auxo-radio-button-wrapper-checked`; color=`rgb(25, 102, 255)`; background=`rgb(255, 255, 255)`; rect=`498,516,90,32`; runtime screenshot materialized for design reuse | verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--runtime.json; screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--mock-hit.png | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COUPON
- `evidence_requirement_id`: TC-INT-REMOVE-TAB-SWITCH-COUPON__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: screenshot + DOM negative scan for cross reward-type residue
- `recording_status`: RECORDED
- `evidence_type`: Network+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现跨 reward type 残留 | remove-detail screenshot and DOM show DOU+券作者维度表；未出现 DOU+币作品列、币作品示例、作品内容结构、投放状态或券数量旧列 | verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--runtime.json; screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--mock-hit.png | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COUPON
- `evidence_requirement_id`: TC-INT-REMOVE-TAB-SWITCH-COUPON__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: evidence materialization check for before/action/after, Network, console mock hit, screenshot and source evidence
- `recording_status`: RECORDED
- `evidence_type`: Network+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：before/action/after | before=`奖励下发`; action=`剔除明细`; after=`剔除明细` DOU+券表；return=`投放明细` legacy tab | verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--runtime.json | PASS |
| 证据类型：Network | GET `get_dou_plus_coupon_remove_record` observed with `activity_id/config_id/page/page_num`; `candidate_ids/operator_id` absent; console `[BAM_MOCK_HIT]` ruleId=`R-BAM-COUPON-REMOVE-DEFAULT` | verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--runtime.json; delivery-mock.md | PASS |
| 证据类型：截图 | local screenshot exists at workspace path, PNG `2549x1875`; screenshot is runtime source only | screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--mock-hit.png | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-REMOVE-TAB-SWITCH-COUPON__recheck__design_alignment | CLOSED | PASS | /delivery:design | visual_assertion | Figma-vs-runtime 对齐已在 `/delivery:design` 关闭；active tab、DOU+券作者表、legacy tab return 和跨 reward type 负向扫描均 PASS | `07-design-alignment.md#Current Evidence: TC-INT-REMOVE-TAB-SWITCH-COUPON`; `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; `screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--design-recheck-stable.png`; `screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--mock-hit.png`; `verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--runtime.json` | TC-INT-REMOVE-TAB-SWITCH-COUPON | design-checker |
| TC-INT-REMOVE-TAB-SWITCH-COUPON__recheck__real_backend_timing | OPEN | PASS_WITH_NOTES | real verify / integration | positive_assertion; evidence_required | MOCK_PREVIEW 只证明默认 rule 下前端请求和渲染；真实后端非空记录、分页/排序/has_more 与加载时序仍需联调回收 | real request/response + runtime DOM screenshot | TC-INT-REMOVE-TAB-SWITCH-COUPON | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 无 mock 参数页面保持 `配置二/剔除明细`，读取真实 DOU+券剔除明细；随后筛选作者 ID。 |
| real_dom | `配置二` selected；`剔除明细` selected；作者维度表头与 3 条真实作者记录可见；无 `作品内容` 列残留。 |
| real_request | 默认 GET 和 `candidate_ids=109638766301` 筛选 GET 均返回 `st=0/code=0`, `total=3`, `has_more=false`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#dou券剔除明细默认读取`; `verify-logs/evidence/mtr-real-recheck-20260713.md#dou券作者-id-筛选` |
| mtr_result | `PASS` |
| remaining_real_gap | 多页排序和 operator 权限范围仍需后续 real recheck。 |
