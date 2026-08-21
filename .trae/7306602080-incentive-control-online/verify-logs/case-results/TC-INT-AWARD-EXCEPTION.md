# Verification Case Result

### Case: `TC-INT-AWARD-EXCEPTION`

- `order`: 29
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: -
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-09T19:22:02+08:00
- `verification_target`: AR-005 治理 exception 固定文案
- `acceptance_steps`:
  - DOU+券发奖请求触发 exception 分支
  - 点击发奖
  - 期望：展示 `治理校验异常，请联系管理员`，流程暂停
- `verification_process`:
  - EXECUTED：刷新 DOU+券奖励页并切到 `配置二`。
  - EXECUTED：确认 `MakeCouponFailedWarnings` 可见，点击 `点此查看并重新提交` 打开 `重新提交制券` Drawer。
  - EXECUTED：`apiGetDouPlusCouponMakeFailRecord / R-BAM-COUPON-MAKE-FAIL-EXCEPTION` 命中 `[BAM_MOCK_HIT]`，返回 `delivery_task_id=fail_coupon_exception_800003`。
  - EXECUTED：`apiGetDouPlusCouponDeliveryRecord / R-BAM-COUPON-DELIVERY-RECORD-EXCEPTION` 命中 `[BAM_MOCK_SYNTHETIC_CONTRACT]` + `[BAM_MOCK_HIT]`，Drawer 展示作者 `800003`。
  - EXECUTED：选择充值记录 `cc抖+券-程可歆-5000`，页面显示 `余额充足。剩余可用：3628元`。
  - EXECUTED：点击 `确认提交` 后，`apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-EXCEPTION` 命中 `[BAM_MOCK_SYNTHETIC_CONTRACT]` + `[BAM_MOCK_HIT]`，request 包含 `delivery_from=2` 和 `delivery_list[0].item_id=800003`。
  - EXECUTED：MutationObserver 捕获 transient toast `治理校验异常，请联系管理员`；未捕获 `提交成功` / `发奖成功`。
- `ui_condition_completion`: completed
- `write_interface_gate`: PASS；final award API is synthetic contract, `sendRealBackendRequest=false`，未记录真实 final `delivery_dou_plus_coupon` XHR/fetch。
- `fixture_fallback`: not_triggered
- `mock_handling`: MOCK_PREVIEW completed；exception chain uses make-fail setup mock + delivery-record synthetic setup + final award synthetic write safety.
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: `verify-logs/evidence/TC-INT-AWARD-EXCEPTION--runtime.json`、`verify-logs/evidence/TC-INT-AWARD-EXCEPTION.md`、`verify-logs/network/TC-INT-AWARD-EXCEPTION--browser-network-final.log` 已记录 natural UI steps、BAM markers、request/response summary、toast observer、no-success 和 no-real-write evidence；screenshots 已恢复为 `verify-logs/screenshots/TC-INT-AWARD-EXCEPTION/before-submit-drawer.png` 与 `verify-logs/screenshots/TC-INT-AWARD-EXCEPTION/exception-toast-after-submit.png`。
- `residual_risk`: MOCK_PREVIEW 只证明前端 exception 分支和写接口安全；真实后端错误码承载、真实治理异常事务与真实充值记录一致性需联调复验。
- `next_step`: continue queue with `TC-INT-AWARD-EMPTY-LIST`.

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-AWARD-EXCEPTION
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-AWARD-EXCEPTION
- `runbook_status`: executed
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001&_verify_reload=award_exception_final_202607091710
- `sample_params`: activity_id=7655304206886322458; config_id=7655304206886355226; delivery_task_id=fail_coupon_exception_800003; author_id=800003; charge_code=LST12607070007003
- `step_changes`: clicked `配置二` -> `点此查看并重新提交` -> selected charge record -> `确认提交`
- `assertion_changes`: all initialized assertions executed; visual fields are N/A per matrix
- `evidence_alignment`: aligned_with_notes；screenshots recovered from Trae temp screenshots directory and copied into current artifacts workspace.
- `screenshot_path_before_submit`: `verify-logs/screenshots/TC-INT-AWARD-EXCEPTION/before-submit-drawer.png`
- `screenshot_path_after_submit`: `verify-logs/screenshots/TC-INT-AWARD-EXCEPTION/exception-toast-after-submit.png`
- `materialization_type`: `local_file`
- `notes`: real backend exception payload and transaction behavior remain recheck.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-AWARD-EXCEPTION
- `evidence_requirement_id`: TC-INT-AWARD-EXCEPTION__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI `配置二` -> retry drawer -> `确认提交`; final `R-BAM-AWARD-COUPON-EXCEPTION`
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| exception 固定 PRD 文案可见 | MutationObserver captured transient toast `治理校验异常，请联系管理员` twice after final submit. | `verify-logs/evidence/TC-INT-AWARD-EXCEPTION--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-EXCEPTION.md` | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-AWARD-EXCEPTION
- `evidence_requirement_id`: TC-INT-AWARD-EXCEPTION__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: final synthetic exception response `{st:1,code:500,msg:"exception"}` and post-submit DOM/observer checks
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不继续发奖 | Drawer remained open after exception submit; final response was non-success and no final success close/reset was observed. | `verify-logs/evidence/TC-INT-AWARD-EXCEPTION--runtime.json`; `verify-logs/network/TC-INT-AWARD-EXCEPTION--browser-network-final.log` | PASS |
| 不展示成功 toast | Observer and delayed DOM checks did not capture `提交成功` or `发奖成功`. | `verify-logs/evidence/TC-INT-AWARD-EXCEPTION--runtime.json` | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-AWARD-EXCEPTION
- `evidence_requirement_id`: TC-INT-AWARD-EXCEPTION__visual_assertion
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

- `case_id`: TC-INT-AWARD-EXCEPTION
- `evidence_requirement_id`: TC-INT-AWARD-EXCEPTION__negative_visual_assertion
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

- `case_id`: TC-INT-AWARD-EXCEPTION
- `evidence_requirement_id`: TC-INT-AWARD-EXCEPTION__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: make-fail setup marker + delivery-record synthetic marker + final award synthetic marker + message observer
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：Network | Final marker recorded `apiDeliveryDouPlusCoupon` request with `delivery_from=2`, `delivery_list[0].item_id=800003`, response `{st:1,code:500,msg:"exception"}`; final write synthetic contract prevented real backend write. | `verify-logs/evidence/TC-INT-AWARD-EXCEPTION--runtime.json`; `verify-logs/network/TC-INT-AWARD-EXCEPTION--browser-network-final.log` | PASS |
| 证据类型：message evidence | MutationObserver captured `治理校验异常，请联系管理员`; before-submit and after-submit screenshots were recovered as local PNG files. | `verify-logs/evidence/TC-INT-AWARD-EXCEPTION--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-EXCEPTION.md`; `verify-logs/screenshots/TC-INT-AWARD-EXCEPTION/before-submit-drawer.png`; `verify-logs/screenshots/TC-INT-AWARD-EXCEPTION/exception-toast-after-submit.png` | PASS_WITH_NOTES |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-AWARD-EXCEPTION__recheck__execute_verify | CLOSED | PASS_WITH_NOTES | /delivery:verify | all required assertions | Natural UI execution completed under MOCK_PREVIEW and evidence persisted. | `verify-logs/evidence/TC-INT-AWARD-EXCEPTION--runtime.json`; `verify-logs/network/TC-INT-AWARD-EXCEPTION--browser-network-final.log` | N/A | main-agent |
| TC-INT-AWARD-EXCEPTION__recheck__real_backend_exception | OPEN | PASS_WITH_NOTES | post-verify real integration | positive_assertion; evidence_required | MOCK_PREVIEW proves frontend branch only; real backend exception code/message and transaction behavior still require integration sample. | real request/response evidence for `delivery_dou_plus_coupon` with backend-owned exception payload and no real award side effect | TC-INT-AWARD-EXCEPTION | integration owner |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 针对 DOU+券发奖写接口执行浏览器层安全拦截探针。 |
| safety_evidence | `POST /api/buyin/admin/content_activity/delivery_dou_plus_coupon` 被拦截，`safety_intercept=true`, `backend_write=not_sent`, local status `499`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 安全策略导致未真实写入，不证明真实 exception code/message、治理事务或无真实发奖副作用；该 gap 为 non-blocking note，不阻塞继续交付，也不允许宣称真实后端副作用已通过。 |
