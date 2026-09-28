# Verification Case Result

### Case: `TC-INT-AWARD-COUPON-PENALTY`

- `order`: 26
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: -
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-09T19:22:02+08:00
- `verification_target`: DOU+券 SearchCandidate penalty author `800001` 的自然处罚阻断分支与 MOCK_PREVIEW 写接口 safety
- `acceptance_steps`:
  - DOU+券待发奖作者已选中。
  - 点击 DOU+券奖励发放，选择有效券充值记录。
  - 期望：命中自然处罚作者不进入成功发奖，且写接口不发送真实后端发奖请求。
- `verification_process`:
  - MOCK_DETOUR_COMPLETED：`apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-PENALTY` synthetic non-success 写接口安全门已生成，并通过接口级 verify、全量 reapply 和标准 `verify-bam-mock.mjs`。
  - MOCK_DETOUR_COMPLETED：自然 UI 切到 DOU+券 `配置二` 后，`apiSearchDeliveryAuthor` 真实响应为空；已通过 `/delivery:mock` 受控 detour 新增 `apiSearchDeliveryAuthor / R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY` 只读候选恢复 rule，并通过 verify / reapply / 标准 mock 审查。
  - EXECUTED：自然 UI 重新触发 DOU+券 `配置二` 作者查询，console 捕获 `apiSearchDeliveryAuthor / R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY` `[BAM_MOCK_HIT]`，页面显示 `券候选作者800001 / UID: 800001`。
  - EXECUTED：通过页面 `一键全选` 选中唯一作者候选；按钮变为 `取消全选`，选中候选数为 1。
  - EXECUTED：打开 DOU+券批量投放 Modal，使用真实键盘交互选择充值记录 `cc抖+券-程可歆-5000`，最终 request payload 证明 `charge_code=LST12607070007003` 生效。
  - EXECUTED：点击 Modal `确定` 后捕获 `apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-PENALTY` 的 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`；响应 `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`，页面展示阻断错误提示且未出现成功文案。
- `ui_condition_completion`: CLOSED；作者候选恢复、作者选择、充值记录选择均通过自然 UI / 键盘路径完成，未修改 store/state。
- `write_interface_gate`: CLOSED；ruleId=R-BAM-AWARD-COUPON-PENALTY；apiName=apiDeliveryDouPlusCoupon；最终发奖由 synthetic marker 命中，Network 脱敏摘要未观察到真实 `delivery_dou_plus_coupon` XHR/fetch。
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW；final award ruleId=R-BAM-AWARD-COUPON-PENALTY；author candidate restore ruleId=R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY；两条 rule 均已完成 mock readiness，且当前 case 已捕获 runtime marker。
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: 已记录 `apiSearchDeliveryAuthor` runtime `[BAM_MOCK_HIT]`、author `800001` 可见与选中、券充值记录选择、`apiDeliveryDouPlusCoupon` synthetic contract / hit marker、request body、可见错误提示、no-success、Modal 未关闭、作者行仍可见、券表未混入作品字段、无真实 `delivery_dou_plus_coupon` XHR/fetch。持久证据：`verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json`、`verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY.md`、`verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--browser-network-final.log`。
- `residual_risk`: MOCK_PREVIEW 只能证明前端 non-success response branch 与写接口 synthetic safety，不能证明真实治理处罚状态、真实券账户余额一致性或真实发奖事务。
- `next_step`: 当前 case 已闭合到 verify scope；继续 Verify Case Queue 第 27 个 case `TC-INT-AWARD-COUPON-RELIEVED`，不得进入 `/delivery:design`。

#### Detour Evidence（Detour 证据）

##### `apiSearchDeliveryAuthor / R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY`

- `detour_type`: MOCK_ISSUE / READ_ONLY_CANDIDATE_SAMPLE_GAP
- `api`: `apiSearchDeliveryAuthor`
- `method_path`: `GET /api/buyin/admin/content_activity/search_delivery_author`
- `rule_needed`: `R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY`
- `baseline_evidence_ref`: `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--author-search-empty-baseline.json`
- `natural_request_summary`: `activity_id=7655304206886322458`, `config_id=7655304206886355226`, `candidate_pool_type=1`, `award_period=1`, `page_no=1`, `page_size=50`
- `natural_response_summary`: `{st:0,code:0,msg:"",data:{total_num:0,candidate_num:0,has_more:false}}`
- `detour_result`: VERIFIED；`apiSearchDeliveryAuthor/verify.mjs` -> PASS；`reapply-bam-mocks.mjs --apply` -> PASS；标准 `verify-bam-mock.mjs` -> PASS。
- `runtime_result`: PASS；console `[BAM_MOCK_HIT]` 返回 `total_num=1/candidate_num=1/author_id=800001/if_delivery=true/rank=1`，页面显示 `券候选作者800001 / UID: 800001`。
- `mocked_response_ref`: `mock/real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/response.mocked.json`

##### `apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-PENALTY`

- `detour_type`: MOCK_ISSUE / WRITE_INTERFACE_SAFETY
- `api`: `apiDeliveryDouPlusCoupon`
- `method_path`: `POST /api/buyin/admin/content_activity/delivery_dou_plus_coupon`
- `rule_needed`: `R-BAM-AWARD-COUPON-PENALTY`
- `detour_result`: VERIFIED；manifest / script / real-connect synthetic request / response / evidence / rule-map / BAM inline marker 均已生成并通过 verify。
- `runtime_result`: PASS_WITH_NOTES；自然 UI Modal `确定` 捕获 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`，request 命中 `delivery_from=1`、`delivery_authors[0].candidate_id=800001`、`rank=1`、`charge_code=LST12607070007003`。
- `mocked_response_summary`: `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`
- `write_safety_result`: PASS；Network 脱敏摘要无真实 `delivery_dou_plus_coupon` XHR/fetch。

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-AWARD-COUPON-PENALTY
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-AWARD-COUPON-PENALTY
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: activity_id=7655304206886322458; config_id=7655304206886355226; candidate_id=800001; charge_code=LST12607070007003; ruleId=R-BAM-AWARD-COUPON-PENALTY
- `step_changes`: author restore marker captured; candidate selected through `一键全选`; charge record selected through visible combobox keyboard path; final Modal `确定` clicked; non-success branch observed.
- `assertion_changes`: positive_assertion / negative_assertion / evidence_required 均已执行并记录；visual / negative_visual 为矩阵 N/A。
- `evidence_alignment`: runtime JSON / Markdown / Network 摘要均已落盘；final 截图已按模板从 Trae 临时截图目录恢复到 `verify-logs/screenshots/TC-INT-AWARD-COUPON-PENALTY--final.png`，并校验为可读 PNG。
- `notes`: screenshot materialization is `local_file`; real governance / transaction recheck remains open.

#### Runtime Evidence（运行态证据）

- `runtime_json`: `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json`
- `runtime_markdown`: `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY.md`
- `final_network_log`: `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--browser-network-final.log`
- `search_marker`: `apiSearchDeliveryAuthor / R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY` `[BAM_MOCK_HIT]`
- `final_marker`: `apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-PENALTY` `[BAM_MOCK_SYNTHETIC_CONTRACT]` + `[BAM_MOCK_HIT]`
- `final_request_summary`: `delivery_from=1`; `delivery_authors[0].candidate_id=800001`; `rank=1`; `charge_code=LST12607070007003`
- `final_response_summary`: `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`
- `ui_message`: `提交作者奖励投放失败: 10017001, 命中自然处罚，无法发奖`
- `no_success_observation`: `success_toast_seen=false`; `success_text_seen=false`; Modal 保持打开；作者行仍可见。
- `write_network_observation`: `delivery_dou_plus_coupon` real XHR/fetch present=false；`charge_amount_check` present=true。
- `screenshot_path`: `verify-logs/screenshots/TC-INT-AWARD-COUPON-PENALTY--final.png`
- `materialization_type`: `local_file`
- `screenshot_materialization_note`: browser screenshot output was recovered from Trae temp screenshots directory after template-required search and copied into current artifacts workspace; `file` verifies it is a readable PNG.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-AWARD-COUPON-PENALTY
- `evidence_requirement_id`: TC-INT-AWARD-COUPON-PENALTY__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI DOU+券 `配置二` author restore -> `一键全选` -> batch submit Modal -> select `cc抖+券-程可歆-5000` -> click `确定`
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+mock-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| wrapper response branch 阻断成功态 | `apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-PENALTY` 返回 `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`；页面显示 `提交作者奖励投放失败: 10017001, 命中自然处罚，无法发奖` | `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY.md`; `mock/apis/apiDeliveryDouPlusCoupon/manifest.json` | PASS_WITH_NOTES |
| DOU+券 penalty author `800001` 可选并进入 final request | 页面显示 `券候选作者800001 / UID: 800001`；`一键全选` 后 request body 为 `delivery_authors[0].candidate_id=800001`、`rank=1` | `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY.md` | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-AWARD-COUPON-PENALTY
- `evidence_requirement_id`: TC-INT-AWARD-COUPON-PENALTY__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: post-submit DOM / message / Network scan after final Modal `确定`
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不 fake success | 未出现 `提交成功` / `发奖成功` / `投放成功`；`success_toast_seen=false`、`success_text_seen=false`；Modal 保持打开，作者行仍可见 | `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY.md` | PASS |
| 不把作品列塞入券表 | DOU+券作者表仍显示 `券类型` / `奖励金额` / `券数量` / `领取有效期` / `使用有效期类型` / `使用有效期`；未出现 `作品ID` / `作品名称` / `投放金额（元）` / `投放时长` / `转化目标偏好` / `目标受众` | `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY.md` | PASS |
| MOCK_PREVIEW 下不发送真实最终发奖写请求 | Network 脱敏摘要中 `delivery_dou_plus_coupon` real XHR/fetch present=false；最终响应来自 `[BAM_MOCK_SYNTHETIC_CONTRACT]` / `[BAM_MOCK_HIT]` | `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--browser-network-final.log`; `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json` | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-AWARD-COUPON-PENALTY
- `evidence_requirement_id`: TC-INT-AWARD-COUPON-PENALTY__visual_assertion
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

- `case_id`: TC-INT-AWARD-COUPON-PENALTY
- `evidence_requirement_id`: TC-INT-AWARD-COUPON-PENALTY__negative_visual_assertion
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

- `case_id`: TC-INT-AWARD-COUPON-PENALTY
- `evidence_requirement_id`: TC-INT-AWARD-COUPON-PENALTY__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: evidence materialization check after author restore and final award synthetic marker
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+message+no-success assertion+mock-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：Network | `apiSearchDeliveryAuthor` 与 `apiDeliveryDouPlusCoupon` runtime marker 已记录；Network 摘要无真实 `delivery_dou_plus_coupon`，有前置 `charge_amount_check` | `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--browser-network-final.log` | PASS |
| 证据类型：message | 页面可见 `提交作者奖励投放失败: 10017001, 命中自然处罚，无法发奖` | `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY.md` | PASS |
| 证据类型：no-success assertion | success toast/text 均未出现；Modal 未按成功路径关闭/reset；作者行仍可见 | `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY.md` | PASS |
| 截图物化说明 | 已从 Trae 临时截图目录恢复并复制为 `verify-logs/screenshots/TC-INT-AWARD-COUPON-PENALTY--final.png`；`materialization_type=local_file`，可作为本 case 的 runtime screenshot source | `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json`; `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY.md`; `verify-logs/screenshots/TC-INT-AWARD-COUPON-PENALTY--final.png` | PASS_WITH_NOTES |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-AWARD-COUPON-PENALTY__recheck__real_governance_transaction | OPEN | PASS_WITH_NOTES | real-verify / post-verify | positive_assertion; evidence_required | MOCK_PREVIEW 只证明前端 non-success branch 和写接口 safety，不能证明真实治理处罚状态、真实券账户余额一致性或真实发奖事务 | 真实环境 request / response、治理处罚状态、券账户扣减 / 未扣减记录、后端事务结果 | TC-INT-AWARD-COUPON-PENALTY | main-agent |
| TC-INT-AWARD-COUPON-PENALTY__recheck__local_screenshot_if_design_needs | CLOSED | PASS_WITH_NOTES | /delivery:verify artifact correction | evidence_required | 已按模板搜索临时截图目录并恢复本地 PNG | `verify-logs/screenshots/TC-INT-AWARD-COUPON-PENALTY--final.png` readable PNG | TC-INT-AWARD-COUPON-PENALTY | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 针对 DOU+券发奖写接口执行浏览器层安全拦截探针。 |
| safety_evidence | `POST /api/buyin/admin/content_activity/delivery_dou_plus_coupon` 被拦截，`safety_intercept=true`, `backend_write=not_sent`, local status `499`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 安全策略导致未真实写入，不证明真实治理处罚状态、券账户余额一致性、真实发奖事务或未扣减记录；该 gap 为 non-blocking note，不阻塞继续交付，也不允许宣称真实后端副作用已通过。 |
