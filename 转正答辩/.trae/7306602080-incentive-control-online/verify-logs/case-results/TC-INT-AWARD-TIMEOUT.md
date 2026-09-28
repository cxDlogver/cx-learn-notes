# Verification Case Result

### Case: `TC-INT-AWARD-TIMEOUT`

- `order`: 28
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: -
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-09T19:22:02+08:00
- `verification_target`: DOU+币批量上传发奖 timeout 分支
- `acceptance_steps`:
  - DOU+币发奖请求触发 timeout 分支
  - 点击发奖
  - 期望：展示 `治理校验失败，请稍后重试`，流程暂停
- `verification_process`:
  - DONE：批量上传 sheet URL 自然提交命中 `apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-TIMEOUT`，返回可投放作品 `700003`。
  - DONE：选择充值记录 `周度-镇楼神贴奖-陈侯聪-40000` 后命中 `apiChargeAmountCheck / R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT`，返回 `can_delivery=true` 并显示余额充足。
  - DONE：点击 Modal `确定` 后命中 `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-TIMEOUT` synthetic timeout `{ st:1, code:504, msg:"timeout" }`。
  - DONE：微修复后复验，Modal 内持久 `role="alert"` 显示 `治理校验失败，请稍后重试`，未出现成功 toast，Modal 保持打开。
- `ui_condition_completion`: completed_by_natural_ui; batch upload + charge record + charge amount check all satisfied without store/state mutation
- `write_interface_gate`: PASS; apiDeliveryDouPlusCoin final write was synthetic_contract only; no real `delivery_dou_plus_coin` XHR/fetch observed
- `fixture_fallback`: used_for_code_fix; `verify-logs/test-fixtures/award-timeout-visible-feedback.mjs` PASS
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=R-BAM-AWARD-COIN-TIMEOUT; apiName=apiDeliveryDouPlusCoin; final write synthetic contract hit and no real write request observed
- `auto_fix_handling`: MICRO_CODE_FIX completed via `code-fix-handoff.md`; root cause `MISSING_PERSISTENT_ERROR_FEEDBACK`; persistent Modal alert added and reverified
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: Runtime JSON / Markdown / Network summary / code-fix command summary recorded. Timeout copy visible in stable Modal DOM, success toast absent, Modal stayed open, final write synthetic only；final screenshot 已恢复为 `verify-logs/screenshots/TC-INT-AWARD-TIMEOUT--final-timeout-fixed.png`。
- `residual_risk`: MOCK_PREVIEW verifies frontend timeout branch and write safety only; real backend timeout, governance transaction and final award transaction remain real verify / post-verify recheck.
- `next_step`: continue verify queue with `TC-INT-AWARD-EXCEPTION`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-AWARD-TIMEOUT
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-AWARD-TIMEOUT
- `runbook_status`: executed_after_micro_code_fix
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7653282555822653742&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001&_verify_reload=award_timeout_fix_202607091640
- `sample_params`: runtime_state=award-submit-timeout; capture_scope=batch upload submit flow; sheet=item_id 700003; charge_code=LST12606290003681; ruleId=R-BAM-AWARD-COIN-TIMEOUT
- `step_changes`: executed natural UI batch upload -> charge record validation -> final Modal confirm
- `assertion_changes`: persistent timeout alert added after code-fix detour and reverified
- `evidence_alignment`: aligned_to_verify_scope；screenshot recovered from Trae temp screenshots directory and copied into current artifacts workspace.
- `screenshot_path`: `verify-logs/screenshots/TC-INT-AWARD-TIMEOUT--final-timeout-fixed.png`
- `materialization_type`: `local_file`
- `notes`: real backend timeout / governance transaction remains recheck

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-AWARD-TIMEOUT
- `evidence_requirement_id`: TC-INT-AWARD-TIMEOUT__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI batch upload submit -> charge record selection -> Modal `确定`
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+mock-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| timeout 固定 PRD 文案可见 | `role="alert"` 可见，文本为 `治理校验失败，请稍后重试`；final response `{st:1,code:504,msg:"timeout"}` | verify-logs/evidence/TC-INT-AWARD-TIMEOUT--runtime.json; verify-logs/evidence/TC-INT-AWARD-TIMEOUT.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-AWARD-TIMEOUT
- `evidence_requirement_id`: TC-INT-AWARD-TIMEOUT__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: post-final-click DOM / Network / console marker scan
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+mock-log
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不继续发奖 | Modal 保持打开；未触发 success close/reset；final write only synthetic marker；Network 无真实 `delivery_dou_plus_coin` XHR/fetch | verify-logs/evidence/TC-INT-AWARD-TIMEOUT--runtime.json; verify-logs/evidence/TC-INT-AWARD-TIMEOUT--browser-network-final.log | PASS |
| 不展示成功 toast | DOM scan `successToastVisible=false`；未出现 `提交成功` | verify-logs/evidence/TC-INT-AWARD-TIMEOUT--runtime.json; verify-logs/evidence/TC-INT-AWARD-TIMEOUT.md | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-AWARD-TIMEOUT
- `evidence_requirement_id`: TC-INT-AWARD-TIMEOUT__visual_assertion
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

- `case_id`: TC-INT-AWARD-TIMEOUT
- `evidence_requirement_id`: TC-INT-AWARD-TIMEOUT__negative_visual_assertion
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

- `case_id`: TC-INT-AWARD-TIMEOUT
- `evidence_requirement_id`: TC-INT-AWARD-TIMEOUT__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: natural UI runtime evidence after micro code fix
- `recording_status`: RECORDED
- `evidence_type`: Network error/message evidence
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：Network error/message evidence | Sheet mock hit、charge amount check mock hit、final synthetic timeout marker、no-real-write Network summary、visible persistent timeout alert all recorded | verify-logs/evidence/TC-INT-AWARD-TIMEOUT--runtime.json; verify-logs/evidence/TC-INT-AWARD-TIMEOUT.md; verify-logs/evidence/TC-INT-AWARD-TIMEOUT--browser-network-final.log; verify-logs/baseline/award-timeout-code-fix-verification.md | PASS_WITH_NOTES |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-AWARD-TIMEOUT__recheck__real_backend_timeout | OPEN | PASS_WITH_NOTES | post-verify real integration | evidence_required | MOCK_PREVIEW synthetic timeout 只能证明前端 branch 和写接口 safety，不证明真实后端 timeout / 事务行为 | 真实 backend timeout response、真实 no-success/no-close evidence、真实事务回滚/幂等确认 | post-verify | main-agent |
| TC-INT-AWARD-TIMEOUT__recheck__hmr_warning | CLOSED_WITH_CLASSIFICATION | PASS_WITH_NOTES | /delivery:verify | evidence_required | HMR hot-update 中新增 hook 时旧 Modal 实例仍挂载，console 保留 hook-order warning；源码 hook 顺序稳定且 build PASS | 源码 hook 顶层位置、fixture PASS、build PASS、runtime alert DOM evidence | TC-INT-AWARD-TIMEOUT | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 针对 DOU+币发奖写接口执行浏览器层安全拦截探针。 |
| safety_evidence | `POST /api/buyin/admin/content_activity/delivery_dou_plus_coin` 被拦截，`safety_intercept=true`, `backend_write=not_sent`, local status `499`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 安全策略导致未真实写入，不证明真实 timeout 响应、真实 no-success/no-close 或真实事务回滚/幂等；该 gap 为 non-blocking note，不阻塞继续交付，也不允许宣称真实后端副作用已通过。 |
