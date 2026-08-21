# Verification Case Result

### Case: `TC-INT-AWARD-COIN-PENALTY`

- `order`: 24
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: `09-test-case-matrix.md:TC-INT-AWARD-COIN-PENALTY`
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-09T12:00:26+0800
- `verification_target`: DOU+币 SearchCandidate 发奖自然处罚非成功 response branch；`apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-PENALTY`
- `acceptance_steps`:
  - 恢复 SearchCandidate 样本 `7655364163166869874`
  - 通过真实 UI `修改配置/保存` 为第 1 个候选补齐 `delivery_config.effective_time`
  - 通过真实 UI `批量提交` 打开 DOU+币奖励发放弹窗并选择可用充值记录
  - 点击 Modal `确定`
  - 期望：命中自然处罚候选不进入成功发奖，前端不展示成功 toast，不按成功态关闭/reset，不自动改变候选排序
- `verification_process`:
  - EXECUTED：SearchCandidate 样本已通过 `apiSearchDeliveryItems / R-BAM-SEARCH-CANDIDATE-COIN-PENALTY` 恢复；console 捕获 `[BAM_MOCK_HIT]`，返回 `item_id=7655364163166869874`、`if_delivery=true`、`rank=1`，且初始未携带 `delivery_config.effective_time`。
  - EXECUTED：真实 UI `修改配置/保存` 选择未来时间 `2026-07-09 12:05:00`；console 捕获 `apiDeliveryModifySave / R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE` 的 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`；request 命中 `candidate_ids[0]=7655364163166869874`、`if_delivery=true`，mocked response 为 `{st:0,code:0,msg:"success"}`；页面回显 `投放生效时间 2026-07-09 12:05:00`。
  - EXECUTED：真实 UI 点击 `一键全选` 后打开 DOU+币发奖 Modal，选择充值记录 `cc抖+币-程可歆-3000`，点击 Modal `确定`。
  - EXECUTED：console 捕获 `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-PENALTY` 的 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`；request body 命中 `delivery_from=1`、`delivery_items[0].candidate_id=7655364163166869874`、`rank=1`、`charge_code=LST12604160004204`，mocked response 为 `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`。
  - EXECUTED：Network 脱敏摘要未观察到真实 `delivery_modify_save` 或 `delivery_dou_plus_coin` XHR；仅观察到 SearchCandidate 读取、充值记录读取与金额检查。
  - EXECUTED：final award 后未出现成功 toast，Modal 未按成功态关闭/reset，候选仍显示 `DOU+币 SearchCandidate 可投放作品` 与 `投放生效时间 2026-07-09 12:05:00`，`取消全选` 仍可见，未观察到候选自动重排。
- `ui_condition_completion`: PASS；通过真实 UI 补齐第 1 个候选的 `effective_time`，并有 setup synthetic marker、hit marker、row echo 和 screenshot 证据。
- `write_interface_gate`: PASS；setup save 与 final award 两个写接口在 `MOCK_PREVIEW` 下均由 marked synthetic contract/hit 证明，持久化 Network 摘要未观察到真实写 XHR。
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW；`apiSearchDeliveryItems / R-BAM-SEARCH-CANDIDATE-COIN-PENALTY`、`apiDeliveryModifySave / R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE`、`apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-PENALTY` 均在自然 UI 路径中命中 runtime marker。Mock 不证明真实配置持久化、真实治理处罚状态或最终事务一致性。
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: SearchCandidate restore、setup save synthetic gate、final award synthetic gate、no real write XHR、no success toast / no success close-reset / no reorder 均已落盘；AR-003 未要求自然处罚分支展示固定可见错误 toast，`message` evidence 由 mocked response `msg` 闭合。
- `residual_risk`: 真实配置保存持久化、真实治理处罚状态、申诉解除 / 自主解封解除、治理接口一致性和最终发奖事务仍需 real verify。
- `next_step`: 继续 Verify Case Queue 第 25 个 case `TC-INT-AWARD-COIN-RELIEVED`；不得进入 `/delivery:design`，直到剩余 verify cases、审计和 Gate 全部闭合。

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-AWARD-COIN-PENALTY
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-AWARD-COIN-PENALTY
- `runbook_status`: pass_with_notes
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001&_verify_reload=search_candidate_rule_202607091129
- `sample_params`: activity_id=7655304206886322458; config_id=7655304206886338842; candidate_id=7655364163166869874; delivery_from=1; charge_code=LST12604160004204
- `step_changes`: SearchCandidate restore -> setup save marker and row echo -> final award marker and no-success UI observation all recorded.
- `assertion_changes`: positive / negative / evidence_required assertions closed for current verify scope with mock-preview notes.
- `evidence_alignment`: aligned for current verify scope; real integration remains open.
- `notes`: verify 截图仅作为 runtime source，不声明 Figma-vs-runtime 设计对齐。

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-AWARD-COIN-PENALTY
- `evidence_requirement_id`: TC-INT-AWARD-COIN-PENALTY__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI setup save and final award Modal `确定`; `apiDeliveryDouPlusCoin` synthetic non-success marker captured.
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+mock-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| wrapper response branch 阻断成功态 | `apiDeliveryDouPlusCoin` marker request used `delivery_from=1` and `delivery_items[0].candidate_id=7655364163166869874`; mocked response was `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`; UI did not enter success close/reset. | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY.md`; `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--browser-network-final.log`; `screenshots/TC-INT-AWARD-COIN-PENALTY--final-award-non-success.png` | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-AWARD-COIN-PENALTY
- `evidence_requirement_id`: TC-INT-AWARD-COIN-PENALTY__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: post-final-click DOM/screenshot observation after non-success mocked response.
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+mock-log
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不 fake success | final click 后未观察到成功 toast；Modal 未按成功态关闭/reset。 | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json`; `screenshots/TC-INT-AWARD-COIN-PENALTY--final-award-non-success.png` | PASS |
| 不自动改候选排序 | final click 后候选仍保持 1 个选中态，未观察到自动重排；第 1 个候选仍显示 `2026-07-09 12:05:00`。 | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json`; `screenshots/TC-INT-AWARD-COIN-PENALTY--final-award-non-success.png` | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-AWARD-COIN-PENALTY
- `evidence_requirement_id`: TC-INT-AWARD-COIN-PENALTY__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: N/A（矩阵字段为 -）
- `recording_status`: RECORDED
- `evidence_type`: N/A
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| N/A（矩阵字段为 -） | N/A | N/A | PASS |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-INT-AWARD-COIN-PENALTY
- `evidence_requirement_id`: TC-INT-AWARD-COIN-PENALTY__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: N/A（矩阵字段为 -）
- `recording_status`: RECORDED
- `evidence_type`: N/A
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| N/A（矩阵字段为 -） | N/A | N/A | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-INT-AWARD-COIN-PENALTY
- `evidence_requirement_id`: TC-INT-AWARD-COIN-PENALTY__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: SearchCandidate restore, setup save, and final award runtime evidence collected.
- `recording_status`: RECORDED
- `evidence_type`: Network+message+no-success assertion+screenshot
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| SearchCandidate sample restore | `apiSearchDeliveryItems` hit `R-BAM-SEARCH-CANDIDATE-COIN-PENALTY` and returned candidate `7655364163166869874` with `if_delivery=true`, `rank=1`, no initial `delivery_config.effective_time`. | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--browser-network-setup.log` | PASS |
| setup save write API safety | `apiDeliveryModifySave` emitted `[BAM_MOCK_SYNTHETIC_CONTRACT]` / `[BAM_MOCK_HIT]`; request body matched `candidate_ids[0]=7655364163166869874` and `if_delivery=true`; no real `delivery_modify_save` XHR observed in setup network summary. | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY.md`; `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--browser-network-setup.log` | PASS |
| setup row echo | Candidate row displays `投放生效时间 2026-07-09 12:05:00`. | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json`; `screenshots/TC-INT-AWARD-COIN-PENALTY--setup-effective-time-echo.png` | PASS |
| final award write API safety | `apiDeliveryDouPlusCoin` emitted synthetic contract / hit marker; materialized Network log contains no real `delivery_dou_plus_coin` XHR. | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--browser-network-final.log` | PASS |
| message | mocked response contains `msg="命中自然处罚，无法发奖"`; AR-003 does not require visible fixed error toast for natural-penalty branch. | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY.md` | PASS |
| no-success assertion | no success toast, no success close/reset and no candidate reorder were observed after final click. | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json`; `screenshots/TC-INT-AWARD-COIN-PENALTY--final-award-non-success.png` | PASS |
| screenshot materialization | setup and final screenshots exist as local PNG files; an additional current screenshot attempt returned inline only and is recorded as tool limitation, not as reusable local evidence. | `screenshots/TC-INT-AWARD-COIN-PENALTY--setup-effective-time-echo.png`; `screenshots/TC-INT-AWARD-COIN-PENALTY--final-award-non-success.png`; `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json` | PASS_WITH_NOTES |

#### Mock Detour Evidence（Mock 绕行证据）

| `artifact` | `status` | `evidence_ref` | `scope_boundary` |
|---|---|---|---|
| `apiSearchDeliveryItems` SearchCandidate rule | PASS | `mock/apis/apiSearchDeliveryItems/manifest.json`; `mock/apis/apiSearchDeliveryItems/verify.mjs`; `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json` | 恢复自然 UI 可投放候选，只覆盖当前 SearchCandidate sample |
| `apiDeliveryModifySave` manifest/script | PASS | `mock/apis/apiDeliveryModifySave/manifest.json`; `mock/real-connect/apiDeliveryModifySave/R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE/request.json`; `mock/real-connect/apiDeliveryModifySave/R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE/response.json` | setup 写接口 synthetic safety；不证明真实配置持久化 |
| setup save runtime marker | RECORDED | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY.md` | request `candidate_ids[0]=7655364163166869874` and `if_delivery=true`; response `{st:0,code:0,msg:"success"}` |
| `apiDeliveryDouPlusCoin` manifest/script | PASS | `mock/apis/apiDeliveryDouPlusCoin/manifest.json`; `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY/request.json`; `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY/response.json` | final award 写接口 synthetic safety；不证明真实发奖事务 |
| final award runtime marker | RECORDED | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY.md` | request `delivery_from=1` and first candidate id; response non-success |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-AWARD-COIN-PENALTY__recheck__real_integration | OPEN | PASS_WITH_NOTES | real verify | all required assertions | mock 只能验证前端 response branch 和写接口 safety，不能证明真实配置保存持久化、真实治理处罚状态或发奖事务一致性 | real backend request/response and transaction/state evidence after environment permits | post-verify real recheck | real verifier |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 针对 DOU+币发奖写接口与配置保存前置写接口执行浏览器层安全拦截探针。 |
| safety_evidence | `POST /delivery_dou_plus_coin` 与 `POST /delivery_modify_save` 均被拦截，`safety_intercept=true`, `backend_write=not_sent`, local status `499`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 安全策略导致未真实写入，不证明真实自然处罚治理状态、真实配置保存、真实发奖事务、扣减/未扣减和回滚；该 gap 为 non-blocking note，不阻塞继续交付，也不允许宣称真实后端副作用已通过。 |
