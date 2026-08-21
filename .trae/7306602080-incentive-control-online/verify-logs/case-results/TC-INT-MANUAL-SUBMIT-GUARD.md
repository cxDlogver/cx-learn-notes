# Verification Case Result

### Case: `TC-INT-MANUAL-SUBMIT-GUARD`

- `order`: 17
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: Interaction:提交并投放
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T15:13:39Z
- `verification_target`: Interaction:提交并投放
- `acceptance_steps`:
  - 手动输入命中态已加载且命中行未移除
  - 点击 提交并投放
  - 期望：展示阻断提示，不打开 batch submit modal，不调用 reward submit API
- `verification_process`:
  - EXECUTED：复用已完成的人工提报命中态基础状态，但本 case 独立执行 `提交并投放` click，不自动关闭共享 rule 下其它 case。
  - EXECUTED：首次 browser_click 因内置浏览器视口坐标异常失败；重新选择已加载业务 tab 后两次 natural browser_click 均成功。
  - EXECUTED：第二次成功 click 前安装只读 DOM MutationObserver 捕获 transient Auxo message；点击后记录阻断文案、Drawer/summary/footer 保持、batch submit modal absent、reward submit API no-call。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: PASS_WITH_NOTES; ruleId=R-BAM-MANUAL-SEARCH-HIT; apiName=apiSearchDeliveryItems; manual-hit state 已由自然 UI 请求和 `[BAM_MOCK_HIT]` 建立；点击 `提交并投放` 后 `delivery_dou_plus_coin` / `delivery_dou_plus_coupon` no-call
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=R-BAM-MANUAL-SEARCH-HIT; apiName=apiSearchDeliveryItems; `/delivery:mock` detour for manual-hit rule 已完成，当前 case 复用同一命中态但独立采集 submit guard evidence
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: Runtime evidence `verify-logs/evidence/TC-INT-MANUAL-SUBMIT-GUARD--runtime.json` records before/action/after, DOM observer blocking message, Network no-call, modal/toast negative assertions and source refs. Screenshot materialized at `screenshots/TC-INT-MANUAL-SUBMIT-GUARD--manual-hit--drawer-footer-guard.png`.
- `residual_risk`: MOCK_PREVIEW only；真实后端治理字段来源仍需 real verify。Auxo transient message 由 DOM MutationObserver 捕获，截图中仅保留点击后 Drawer/footer/no-modal steady state。
- `next_step`: continue Verify Case Queue with `TC-INT-MANUAL-ONE-CLICK-REMOVE`; do not enter /delivery:design

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-MANUAL-SUBMIT-GUARD
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-MANUAL-SUBMIT-GUARD
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=manual-hit; capture_scope=drawer footer; ruleId=R-BAM-MANUAL-SEARCH-HIT
- `step_changes`: natural click `提交并投放` executed; DOM observer captured blocking message; delayed Network recheck showed no reward submit APIs
- `assertion_changes`: initial assertion records created from 09-test-case-matrix.md
- `evidence_alignment`: aligned
- `notes`: PASS_WITH_NOTES under MOCK_PREVIEW; shared manual-hit rule cases remain independently queued.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-MANUAL-SUBMIT-GUARD
- `evidence_requirement_id`: TC-INT-MANUAL-SUBMIT-GUARD__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI click `提交并投放`; DOM observer captured blocking message before validation/modal path
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+Network+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| guard 检查 if_satisfy_delivery_rules === false or if_not_incentive | Source `manuallySubmitVideoStore.ts#L62-L68` defines hit rows as `if_satisfy_delivery_rules === false || if_not_incentive === true`; Drawer `index.tsx#L49-L52` blocks with `请先移除不满足准入门槛或命中【不激励】规则的作品`; runtime observer captured the same message after natural click. | verify-logs/evidence/TC-INT-MANUAL-SUBMIT-GUARD--runtime.json; apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts#L62-L68; apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx#L44-L52 | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-MANUAL-SUBMIT-GUARD
- `evidence_requirement_id`: TC-INT-MANUAL-SUBMIT-GUARD__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: after natural click and delayed 2s recheck, Network/performance resource list contained zero reward submit URLs
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不发送 DOU+币/券发奖请求 | `before_reward_submit_urls=[]`; `after_reward_submit_urls=[]`; `reward_submit_delta=0`; browser Network after wait listed only monitoring/tracking domains. | verify-logs/evidence/TC-INT-MANUAL-SUBMIT-GUARD--runtime.json | PASS |
| 不 fake success | Runtime flags show `success_toast=false`, no `投放成功` / `提交成功` / `发奖成功`, and no modal texts. | verify-logs/evidence/TC-INT-MANUAL-SUBMIT-GUARD--runtime.json | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-MANUAL-SUBMIT-GUARD
- `evidence_requirement_id`: TC-INT-MANUAL-SUBMIT-GUARD__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: after guard click, Drawer remains open and footer submit button stays visible; business guard blocked modal path
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| footer 按钮保持可见但被业务 guard 阻断 | Footer `提交并投放` remains visible and enabled (`auxo-btn auxo-btn-primary`, rect recorded); Drawer/summary/hit labels remain; screenshot records post-click steady state with footer and no modal. | verify-logs/evidence/TC-INT-MANUAL-SUBMIT-GUARD--runtime.json; screenshots/TC-INT-MANUAL-SUBMIT-GUARD--manual-hit--drawer-footer-guard.png | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-INT-MANUAL-SUBMIT-GUARD
- `evidence_requirement_id`: TC-INT-MANUAL-SUBMIT-GUARD__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: DOM scan after click and delayed recheck for modal/toast negative assertions
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现成功 toast 或 batch submit modal | `batch_submit_modal_title=false`, `modal_texts=[]`, `success_toast=false`; screenshot shows Drawer table/footer without `投放奖励` modal. | verify-logs/evidence/TC-INT-MANUAL-SUBMIT-GUARD--runtime.json; screenshots/TC-INT-MANUAL-SUBMIT-GUARD--manual-hit--drawer-footer-guard.png | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-INT-MANUAL-SUBMIT-GUARD
- `evidence_requirement_id`: TC-INT-MANUAL-SUBMIT-GUARD__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: before/action/after DOM, natural click, observer result, delayed Network no-call and screenshot materialization
- `recording_status`: RECORDED
- `evidence_type`: before/action/after+Network no-call+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：before/action/after | before: manual-hit Drawer state; action: natural browser_click on `提交并投放`; after: blocking message captured, Drawer/footer remains, no modal/toast. | verify-logs/evidence/TC-INT-MANUAL-SUBMIT-GUARD--runtime.json; screenshots/TC-INT-MANUAL-SUBMIT-GUARD--manual-hit--drawer-footer-guard.png | PASS |
| 证据类型：Network no-call | `delivery_dou_plus_coin` and `delivery_dou_plus_coupon` URL hits stayed empty after delayed recheck; browser Network list only showed monitoring/tracking domains. | verify-logs/evidence/TC-INT-MANUAL-SUBMIT-GUARD--runtime.json | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-MANUAL-SUBMIT-GUARD__recheck__execute_verify | CLOSED | PASS_WITH_NOTES | /delivery:verify | all required assertions | natural UI click and Network no-call evidence recorded; real backend governance source remains separate real verify risk | verify-logs/evidence/TC-INT-MANUAL-SUBMIT-GUARD--runtime.json; screenshots/TC-INT-MANUAL-SUBMIT-GUARD--manual-hit--drawer-footer-guard.png | TC-INT-MANUAL-ONE-CLICK-REMOVE | main-agent |
| TC-INT-MANUAL-SUBMIT-GUARD__recheck__mtr_real_no_call | CLOSED_WITH_NOTES | PASS_WITH_NOTES | /delivery:verify --mtr | negative_assertion / evidence_required | 2026-07-13 12:49 MTR 真实 manual rows 可见后点击 `提交并投放`；未打开投放确认弹窗、未出现成功态、Network 未出现发奖写接口。完整 reward config 下的阻断 toast 未捕获，保留为 note | verify-logs/evidence/mtr-real-recheck-20260713.md#manual-hit-natural-ui-retest-2026-07-13-1245-1249 | TC-INT-MANUAL-SUBMIT-GUARD | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 依赖真实 `search_delivery_items` 命中态后验证提交保护；本轮 direct probe 仍返回 `95271007`，但 12:49 已改用自然 UI manual input + 页面 `__token` 取得真实 3 行命中态，再点击一次 `提交并投放`。 |
| real_probe | Natural UI request `GET /search_delivery_items?...item_ids=1279271921656,28083207347,7634842254674947950&candidate_pool_type=2&__token=[REDACTED]` returned `st=0/code=0`; all summarized rows had `if_satisfy_delivery_rules=false`. |
| real_guard_observation | After clicking `提交并投放`, Drawer/footer/summary stayed visible; no `投放成功` / `提交成功` / `发奖成功`; no `投放奖励` / `确认投放` / `二次确认` modal. Browser Network after delayed check showed no `delivery_dou_plus_coin`, `delivery_dou_plus_coupon`, `candidate_remove`, `download_content_remove_record`, or `delivery_modify_save` request. |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#manual-hit-natural-ui-retest-2026-07-13-1245-1249`; `verify-logs/evidence/mtr-real-recheck-20260713.md#invalid-direct-probe-evidence` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 完整 reward config 下的精确阻断 toast 未捕获；为避免真实写入，未补全全部投放参数后再次点击。该 gap 不阻塞继续交付，也不得宣称真实发奖写接口成功或后端事务已验证。 |
