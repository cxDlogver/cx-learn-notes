# Verification Case Result

### Case: `TC-INT-AWARD-COUPON-RELIEVED`

- `order`: 27
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: -
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-09T19:22:02+08:00
- `verification_target`: DOU+券解除态作者发奖成功流程
- `acceptance_steps`:
  - DOU+券候选对应申诉解除或自主解封解除
  - 点击 DOU+券奖励发放
  - 期望：解除状态不被前端误阻断，沿用成功流程
- `verification_process`:
  - 已在 DOU+券 `配置二` 通过 `apiSearchDeliveryAuthor / R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY` 恢复两位作者候选，DOM 可见 `800001` 与 `800002`。
  - 已选择解除态作者 `800002`，打开批量提交弹窗，选择充值记录 `cc抖+券-程可歆-5000`，点击最终 `确定`。
  - 已捕获 `apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-RELIEVED` 的 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`，request / response / no-real-write evidence 已落盘。
- `ui_condition_completion`: triggered_and_completed；充值记录通过 combobox 搜索选择，确认按钮由 disabled 变为 enabled；checkbox 因 integrated_browser 坐标点击未切换，使用 DOM `label.click()` 触发组件事件链，未直接写 React/MobX state 或 `input.checked`。
- `write_interface_gate`: MOCK_PREVIEW passed; ruleId=R-BAM-AWARD-COUPON-RELIEVED; apiName=apiDeliveryDouPlusCoupon; `[BAM_MOCK_SYNTHETIC_CONTRACT]` + `[BAM_MOCK_HIT]`; no real `delivery_dou_plus_coupon` XHR/fetch in copied Network log
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; detour completed before runtime; `apiSearchDeliveryAuthor` returned authors `800001/800002`; `apiDeliveryDouPlusCoupon` synthetic success returned `{st:0,code:0,msg:"success"}`
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: `verify-logs/evidence/TC-INT-AWARD-COUPON-RELIEVED--runtime.json` records SearchCandidate two-row restore, selected author `800002`, charge record selection, final synthetic success markers, no-real-write Network summary, modal closed, no case-specific failure message and no candidate deletion；final screenshot 已恢复为 `verify-logs/screenshots/TC-INT-AWARD-COUPON-RELIEVED-final-page.png`。
- `residual_risk`: MOCK_PREVIEW 只能验证前端 success branch 与写接口安全，不能证明真实后端治理解除状态、真实 status 1/2 语义、充值账户一致性或真实发奖事务；checkbox 选择使用 DOM event fallback，需真实浏览器人工回归确认可点击性。
- `next_step`: continue queue with `TC-INT-AWARD-TIMEOUT`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-AWARD-COUPON-RELIEVED
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-AWARD-COUPON-RELIEVED
- `runbook_status`: executed
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001&_verify_reload=coupon_relieved_202607091358
- `sample_params`: runtime_state=award-coupon-relieved-submit; ruleId=R-BAM-AWARD-COUPON-RELIEVED; candidate_id=800002; charge_code=LST12607070007003
- `step_changes`: executed SearchCandidate restore -> select relieved author -> batch submit -> charge record selection -> modal confirm -> marker/network/dom capture
- `assertion_changes`: positive_assertion / negative_assertion / evidence_required all closed with PASS_WITH_NOTES under MOCK_PREVIEW
- `evidence_alignment`: aligned；screenshot recovered from Trae temp screenshots directory and copied into current artifacts workspace.
- `screenshot_path`: `verify-logs/screenshots/TC-INT-AWARD-COUPON-RELIEVED-final-page.png`
- `materialization_type`: `local_file`
- `notes`: real backend transaction remains recheck

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-AWARD-COUPON-RELIEVED
- `evidence_requirement_id`: TC-INT-AWARD-COUPON-RELIEVED__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: DOU+券 `配置二` -> select `800002` -> `批量提交` -> select charge record -> Modal `确定`
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+mock-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| status 1/2 response 不触发处罚阻断分支 | Final marker `R-BAM-AWARD-COUPON-RELIEVED` returned `{st:0,code:0,msg:"success"}` for `delivery_authors[0].candidate_id=800002`; award modal closed after confirm. | verify-logs/evidence/TC-INT-AWARD-COUPON-RELIEVED--runtime.json; verify-logs/evidence/TC-INT-AWARD-COUPON-RELIEVED.md; mock/apis/apiDeliveryDouPlusCoupon/manifest.json | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-AWARD-COUPON-RELIEVED
- `evidence_requirement_id`: TC-INT-AWARD-COUPON-RELIEVED__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: post-submit DOM / Network / console marker scan after final Modal `确定`
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+mock-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不显示治理失败文案 | Final wait 后未观察到本 case 的 `提交作者奖励投放失败` 错误；页面静态标题 `测测不激励` 不作为治理失败 toast / modal 证据。 | verify-logs/evidence/TC-INT-AWARD-COUPON-RELIEVED--runtime.json; verify-logs/evidence/TC-INT-AWARD-COUPON-RELIEVED.md | PASS_WITH_NOTES |
| 不删除候选 | Final wait 后 `800001` 与 `800002` 仍可见，`券解除作者800002` 仍在 DOM 中。 | verify-logs/evidence/TC-INT-AWARD-COUPON-RELIEVED--runtime.json | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-AWARD-COUPON-RELIEVED
- `evidence_requirement_id`: TC-INT-AWARD-COUPON-RELIEVED__visual_assertion
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

- `case_id`: TC-INT-AWARD-COUPON-RELIEVED
- `evidence_requirement_id`: TC-INT-AWARD-COUPON-RELIEVED__negative_visual_assertion
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

- `case_id`: TC-INT-AWARD-COUPON-RELIEVED
- `evidence_requirement_id`: TC-INT-AWARD-COUPON-RELIEVED__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: SearchCandidate marker + final award marker + DOM state + copied Network log
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：Network | Copied Network log contains `search_delivery_author`, `get_charge_record`, `charge_amount_check`; `rg` found no real `delivery_dou_plus_coupon` XHR/fetch entry. | verify-logs/network/TC-INT-AWARD-COUPON-RELIEVED-network-2026-07-09T06-13-24-174Z.log; verify-logs/evidence/TC-INT-AWARD-COUPON-RELIEVED--runtime.json | PASS |
| 证据类型：message evidence | Console marker response is `{st:0,code:0,msg:"success"}`; final modal closed and no active case-specific failure message was observed. | verify-logs/evidence/TC-INT-AWARD-COUPON-RELIEVED--runtime.json; verify-logs/evidence/TC-INT-AWARD-COUPON-RELIEVED.md | PASS_WITH_NOTES |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-AWARD-COUPON-RELIEVED__recheck__real_backend_governance | OPEN | PASS_WITH_NOTES | real integration / post-verify | positive_assertion | MOCK_PREVIEW synthetic success 不能证明真实后端治理解除状态、真实 status 1/2 语义或真实发奖事务 | 真实环境 request/response、后端治理状态样本、真实 `delivery_dou_plus_coupon` 返回与无副作用审计 | after verify queue | main-agent |
| TC-INT-AWARD-COUPON-RELIEVED__recheck__checkbox_clickability | OPEN | PASS_WITH_NOTES | manual/browser regression | evidence_required | integrated_browser 坐标点击未能切换自定义 checkbox，本次使用 DOM event fallback；需真实浏览器人工回归或更强浏览器工具确认鼠标可点击性 | 原生鼠标点击录屏/截图或浏览器工具可点击证据，证明 `800002` checkbox 可通过鼠标 UI 切换 | before design/accept if required | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 针对 DOU+券发奖写接口执行浏览器层安全拦截探针。 |
| safety_evidence | `POST /api/buyin/admin/content_activity/delivery_dou_plus_coupon` 被拦截，`safety_intercept=true`, `backend_write=not_sent`, local status `499`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 安全策略导致未真实写入，不证明真实治理解除状态、真实 status 1/2 后端语义、券账户一致性或真实发奖事务；该 gap 为 non-blocking note，不阻塞继续交付，也不允许宣称真实后端副作用已通过。 |
