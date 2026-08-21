# Verification Case Result

### Case: `TC-UI-COUPON-REMOVE-PAGE`

- `order`: 10
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Region:DOU+券剔除明细/SubTab/筛选区/表格/分页
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T13:01:24Z
- `verification_target`: DOU+券奖励投放页点击 `剔除明细` 后，渲染剔除明细筛选区、作者维度表格、分页并请求 `apiGetDouPlusCouponRemoveRecord`
- `acceptance_steps`:
  - 进入 `测测不激励` 活动，切到 `配置二` / `DOU+券`
  - 从默认 `奖励下发` 子 Tab 自然点击 `剔除明细`
  - 触发 GET `/api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record`
  - 命中 BAM mock rule `R-BAM-COUPON-REMOVE-DEFAULT`
  - 验证 `奖励下发 / 投放明细 / 剔除明细` 三 Tab、筛选区、表头、首行、分页和旧列禁显
- `verification_process`:
  - 执行 `/delivery:mock` detour，生成并验证 `apiGetDouPlusCouponRemoveRecord` manifest、runtime marker、`script.mjs`、`verify.mjs`、`delivery-mock.md`
  - 复用同一 vmok 页面，从 `配置二` / `奖励下发` 自然点击 `剔除明细`
  - 采集 `[BAM_MOCK_HIT]`、脱敏目标 request、真实空响应基线、DOM 表头 / 首行 / 分页、运行态截图
  - 逐项对账 positive_assertion、negative_assertion、visual_assertion、negative_visual_assertion、evidence_required
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: PASS；`patch.status=patched`，`rehydration.status=passed`，`finalVerification.status=passed`，`verify-bam-mock.mjs` 通过
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=`R-BAM-COUPON-REMOVE-DEFAULT`; apiName=`apiGetDouPlusCouponRemoveRecord`; requestBody=`activity_id=7655304206886322458,config_id=7655304206886355226,page=1,page_num=20`; mockedResponse=`records.length=1,total=40,has_more=true`; detour result=`delivery-mock.md` current scope PASS
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: Runtime page-level assertions are closed by redacted DOM / Network / `[BAM_MOCK_HIT]` evidence and local screenshot. Verify does not claim Figma-vs-runtime alignment. Shared rule cases remain open until executed individually.
- `residual_risk`: Design alignment pending in `/delivery:design`; real backend verify pending after non-empty DOU+券剔除记录 is available; filter schema, columns, first row, tab switch and tracking cases remain queued for independent evidence mapping.
- `next_step`: continue verify queue with next non-terminal case

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-UI-COUPON-REMOVE-PAGE
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-UI-COUPON-REMOVE-PAGE
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001
- `sample_params`: runtime_state=remove-detail-coupon-default; capture_scope=mock-hit; ruleId=R-BAM-COUPON-REMOVE-DEFAULT; activity_id=7655304206886322458; config_id=7655304206886355226
- `step_changes`: restored after BAM marker patch; clicked `配置二 -> 奖励下发 -> 剔除明细`; captured mock-hit runtime state
- `assertion_changes`: positive assertion expanded with BDD request/render requirements; visual assertion records runtime source only
- `evidence_alignment`: aligned_for_verify_runtime; design_alignment_pending
- `notes`: DOU+券 default page-level case closed only for runtime; shared default rule cases and filter rule remain queued

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-UI-COUPON-REMOVE-PAGE
- `evidence_requirement_id`: TC-UI-COUPON-REMOVE-PAGE__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Natural UI click `配置二 -> 奖励下发 -> 剔除明细`; `/delivery:mock` detour restored to verify
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 显示奖励下发 | `奖励下发` 子 Tab 可见，未被隐藏 | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 显示投放明细 | `投放明细` 子 Tab 可见，未被隐藏 | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 剔除明细三 Tab且剔除明细 active | `剔除明细` 可见，sample.active_sub_tab=`剔除明细`，截图显示当前区域为剔除明细表格 | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json; screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png | PASS |
| 请求剔除记录接口 | 自然点击后发起 GET `/api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record`，query 为 `activity_id=7655304206886322458,config_id=7655304206886355226,page=1,page_num=20` | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 渲染作者维度剔除表 | 表头为 `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人`，首行含 `券作者示例`、`ID: 900001`、`命中【不激励】规则`、`2026/07/08 20:40:40`、`陈相`，分页可见 | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json; screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png | PASS |
| BAM runtime mock 命中 | console 输出 `[BAM_MOCK_HIT]`，ruleId=`R-BAM-COUPON-REMOVE-DEFAULT`，mockedResponse 含 `records.length=1,total=40,has_more=true` | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json; mock/apis/apiGetDouPlusCouponRemoveRecord/manifest.json | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-UI-COUPON-REMOVE-PAGE
- `evidence_requirement_id`: TC-UI-COUPON-REMOVE-PAGE__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Natural UI DOM text scan after mock-hit table render
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不隐藏 legacy Tab | `奖励下发`、`投放明细`、`剔除明细` 均可见 | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 不显示作品内容 | DOM text 未出现 `作品内容` | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 不显示券数量 | DOM text 未出现 `券数量` | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 不显示投放状态 | DOM text 未出现 `投放状态` | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-UI-COUPON-REMOVE-PAGE
- `evidence_requirement_id`: TC-UI-COUPON-REMOVE-PAGE__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime DOM order + local screenshot captured after mock-hit render
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 运行态区域顺序为配置摘要 -> SubTab -> filters -> table -> pagination | 截图和 DOM 文本顺序显示：活动/配置摘要在上，随后是 `奖励下发/投放明细/剔除明细`，再是 `作者ID/操作人/查询/重置`，下方为作者维度表格和分页 | screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png; verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json | PASS_WITH_NOTES |
| Figma 对齐结论 | Verify 只提供 runtime source，不声明 Figma-vs-runtime 对齐通过 | screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-UI-COUPON-REMOVE-PAGE
- `evidence_requirement_id`: TC-UI-COUPON-REMOVE-PAGE__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime DOM text scan + screenshot after `剔除明细` active
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现 DOU+币作品列残留 | 当前表头为 DOU+券作者维度白名单列，未出现 `作品内容` 或作品封面/标题结构 | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json; screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-UI-COUPON-REMOVE-PAGE
- `evidence_requirement_id`: TC-UI-COUPON-REMOVE-PAGE__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: Evidence materialization check after runtime capture and BAM final audit
- `recording_status`: RECORDED
- `evidence_type`: DOM+screenshot+Network+mock-log
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：DOM | DOM facts are persisted with subTab state, headers, first row, pagination and forbidden text absence | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 证据类型：截图 | Runtime screenshot is materialized as a local PNG under workspace `screenshots/` | screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png | PASS |
| 证据类型：Network | Target GET method/path/query and real empty response baseline are persisted in redacted evidence; raw token-bearing browser network output was not persisted | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 证据类型：Mock hit | `[BAM_MOCK_HIT]` marker, ruleId and mocked response summary are persisted | verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json; mock/apis/apiGetDouPlusCouponRemoveRecord/manifest.json | PASS |
| 证据类型：BAM final audit | Standard BAM mock final verification audit passed | delivery-mock.md; mock/apis/apiGetDouPlusCouponRemoveRecord/manifest.json | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-UI-COUPON-REMOVE-PAGE__recheck__design_alignment | CLOSED | FIXED_PASS | /delivery:design | visual_assertion | verify 阶段只保存 runtime source，不声明 Figma-vs-runtime 对齐通过 | `07-design-alignment.md` 已引用 Figma `1:12390`、runtime closure screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`，并完成 placeholders/T+2/pagination/table/negative scan 对比 | TC-UI-COUPON-REMOVE-PAGE | design-checker |
| TC-UI-COUPON-REMOVE-PAGE__recheck__real_backend | OPEN | PASS_WITH_NOTES | real verify | positive_assertion / evidence_required | MOCK_PREVIEW 下 mock 命中已闭合前端运行态；后端 ready 后需用真实非空 DOU+券剔除记录复验分页、排序、has_more 和作者信息 | 真实后端 request/response 与运行态截图/DOM 证据 | TC-UI-COUPON-REMOVE-PAGE | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 无 `externalLeadsDomainMock=1` 页面切到 `配置二/剔除明细`，自然 UI 触发真实 GET。 |
| real_request | `GET /api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record?activity_id=7629288371705643310&config_id=7629288371705676078&page=1&page_num=20` |
| real_response | `records.length=3`, `total=3`, `has_more=false`。 |
| real_dom | `剔除明细` active；表头 `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人`；行展示 `大亮农业菌蔬优选店 ID: 109638766301`、`内容相关性低` / `内容质量不佳`、`陈相`。 |
| source_mock_evidence_ref | `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`（仅历史 mock-preview 证据，不作为 MTR real pass） |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#dou券剔除明细默认读取` |
| mtr_result | `PASS` |
| remaining_real_gap | 默认真实读链路和作者表 DOM 已闭合；多页排序仍需真实样本继续复验。 |
