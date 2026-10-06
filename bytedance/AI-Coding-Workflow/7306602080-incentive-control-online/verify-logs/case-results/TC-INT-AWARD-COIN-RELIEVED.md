# Verification Case Result

### Case: `TC-INT-AWARD-COIN-RELIEVED`

- `order`: 25
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: -
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-09T12:36:00+0800
- `verification_target`: DOU+币 SearchCandidate 解除态候选 `700002` 的奖励发放成功分支与 MOCK_PREVIEW 写接口 safety
- `acceptance_steps`:
  - DOU+币候选对应申诉解除或自主解封解除
  - 点击 DOU+币奖励发放
  - 期望：解除状态不被前端误阻断，沿用成功流程
- `verification_process`:
  - PASS：复用当前活动页 `7655304206886322458`，SearchCandidate mock 命中并返回两条候选，解除态候选 `700002` 可见且 `rank=2`。
  - PASS_WITH_NOTES：因 integrated_browser checkbox 坐标点击落点异常，使用候选 label DOM click fallback 触发组件事件；提交前复核第 2 个 checkbox `checked=true`，第 1 个 `checked=false`。
  - PASS_WITH_NOTES：打开 `批量提交` Modal 后选择充值记录 `cc抖+币-程可歆-15000`；option 的 `browser_click` 被 dropdown overlay 拦截，改用 option 节点鼠标事件序列 fallback，随后 DOM 显示该 option selected 且 `确定` 解锁。
  - PASS：点击 Modal `确定` 后捕获 `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-RELIEVED` 的 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
  - PASS：request payload 为 `delivery_from=1`、`delivery_items[0].candidate_id=700002`、`rank=2`、`charge_code=LST12604140006412`；mocked response 为 `{st:0,code:0,msg:"success"}`。
  - PASS：临时 XHR/fetch 捕获器与持久 Network log 均未观察到真实 `delivery_dou_plus_coin` 请求；成功后观察到 `提交成功`，Modal 随后关闭。
  - PASS：最终稳定态未出现 `命中自然处罚` / `无法发奖`，两个候选标题仍可见，未观察到候选删除。
- `ui_condition_completion`: completed_via_existing_sample_and_ui_selection; 解除态样本自带未来 `delivery_config.effective_time=1783656000`，无需额外 setup save；候选与充值记录均通过组件事件完成选择并由 final payload 复核
- `write_interface_gate`: PASS_WITH_NOTES; ruleId=R-BAM-AWARD-COIN-RELIEVED; apiName=apiDeliveryDouPlusCoin; synthetic contract + BAM hit captured; no real delivery_dou_plus_coin XHR/fetch observed
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=R-BAM-AWARD-COIN-RELIEVED; apiName=apiDeliveryDouPlusCoin; mock manifest / rule-map / reapply / standard verify 已在本 case 前闭合，运行态 markers 已捕获
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED--runtime.json`、`verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED.md`、`verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED--browser-network-final.log`、`screenshots/TC-INT-AWARD-COIN-RELIEVED-success-toast.png`、`screenshots/TC-INT-AWARD-COIN-RELIEVED-final-page.png`
- `residual_risk`: MOCK_PREVIEW 只能验证前端 success response branch 和写接口 synthetic safety，不能证明真实治理解除状态、真实 status 1/2 后端语义、充值账户一致性或最终发奖事务
- `next_step`: continue Verify Case Queue with `TC-INT-AWARD-COUPON-PENALTY`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-AWARD-COIN-RELIEVED
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-AWARD-COIN-RELIEVED
- `runbook_status`: executed
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=award-coin-submit; capture_scope=submit flow; ruleId=R-BAM-AWARD-COIN-RELIEVED
- `step_changes`: active award page restored with `_verify_reload=relieved_case_202607091230`; selected candidate `700002`; selected charge record `cc抖+币-程可歆-15000`; clicked Modal `确定`
- `assertion_changes`: positive / negative / evidence_required all executed and recorded; visual fields remain N/A
- `evidence_alignment`: aligned_to_current_verify_scope
- `notes`: UI event fallbacks were used only after integrated_browser checkbox/option clicks were blocked; final payload and DOM selected state prove component-level effect

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-AWARD-COIN-RELIEVED
- `evidence_requirement_id`: TC-INT-AWARD-COIN-RELIEVED__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI `批量提交` -> select candidate `700002` -> select charge record `cc抖+币-程可歆-15000` -> Modal `确定`
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| status 1/2 response 不触发处罚阻断分支 | `R-BAM-AWARD-COIN-RELIEVED` 返回 `{st:0,code:0,msg:"success"}`；UI 出现 `提交成功` 并关闭 Modal；未进入 penalty non-success branch | `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED.md`; `screenshots/TC-INT-AWARD-COIN-RELIEVED-success-toast.png` | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-AWARD-COIN-RELIEVED
- `evidence_requirement_id`: TC-INT-AWARD-COIN-RELIEVED__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: post-submit DOM/body text scan + final stable page snapshot after success
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不显示治理失败文案 | post-submit scan: `containsPenaltyFailure=false`，未出现 `命中自然处罚` / `无法发奖` | `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED.md` | PASS |
| 不删除候选 | final stable page still contains `DOU+币 SearchCandidate 可投放作品` and `DOU+币解除状态可投放作品`; no deletion observed | `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED--runtime.json`; `screenshots/TC-INT-AWARD-COIN-RELIEVED-final-page.png` | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-AWARD-COIN-RELIEVED
- `evidence_requirement_id`: TC-INT-AWARD-COIN-RELIEVED__visual_assertion
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

- `case_id`: TC-INT-AWARD-COIN-RELIEVED
- `evidence_requirement_id`: TC-INT-AWARD-COIN-RELIEVED__negative_visual_assertion
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

- `case_id`: TC-INT-AWARD-COIN-RELIEVED
- `evidence_requirement_id`: TC-INT-AWARD-COIN-RELIEVED__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: console marker capture + XHR/fetch capture + persisted Network log + DOM/screenshot materialization
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：Network | `BAM_MOCK_SYNTHETIC_CONTRACT` + `[BAM_MOCK_HIT]` captured for `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-RELIEVED`; temporary XHR/fetch capture is empty; persisted Network log has no `delivery_dou_plus_coin` | `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED--browser-network-final.log` | PASS |
| 证据类型：message evidence | post-click body sample recorded `提交成功`; final stable page no longer shows failure message | `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED.md` | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-AWARD-COIN-RELIEVED__recheck__execute_verify | CLOSED | PASS_WITH_NOTES | /delivery:verify | all required assertions | 当前 verify scope 已完成，证据已落盘 | `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED.md`; screenshots | TC-INT-AWARD-COIN-RELIEVED | main-agent |
| TC-INT-AWARD-COIN-RELIEVED__recheck__real_governance_transaction | OPEN | PASS_WITH_NOTES | real verify / post-verify recheck | backend relieved status and real award transaction | MOCK_PREVIEW 不能证明真实治理解除状态、真实 status 1/2 后端语义、充值账户一致性或最终发奖事务 | real `apiDeliveryDouPlusCoin` request/response under safe test account; governance state evidence for申诉解除/自主解封解除; transaction safety confirmation | TC-INT-AWARD-COIN-RELIEVED | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 针对 DOU+币发奖写接口执行浏览器层安全拦截探针。 |
| safety_evidence | `POST /api/buyin/admin/content_activity/delivery_dou_plus_coin` 被拦截，`safety_intercept=true`, `backend_write=not_sent`, local status `499`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 安全策略导致未真实写入，不证明真实解除状态、真实 status 1/2 后端语义、充值账户一致性或最终发奖事务；该 gap 为 non-blocking note，不阻塞继续交付，也不允许宣称真实后端副作用已通过。 |
