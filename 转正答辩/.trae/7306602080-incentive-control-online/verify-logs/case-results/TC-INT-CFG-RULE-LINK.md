# Verification Case Result

### Case: `TC-INT-CFG-RULE-LINK`

- `order`: 3
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: Interaction:查看【不激励】规则
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T10:33:30.000Z
- `verification_target`: Interaction:查看【不激励】规则
- `acceptance_steps`:
  - 任一配置提示已展示
  - 点击 查看【不激励】规则
  - 期望：打开/跳转到【电商内容生态激励管控讨论】材料并保留当前表单状态
- `verification_process`:
  - PASS：在预埋名单提示可见状态下，通过真实 UI 点击 `查看【不激励】规则`。
  - PASS：点击后新开飞书 Wiki tab，URL 指向 `TraawmZfSi9dnlk25pBcKhRinUh`，正文包含 `电商内容生态激励管控`。
  - PASS：原业务编辑页 URL 与表单状态保持不变，未出现下载 / 申诉 / 保存成功 / 提交成功等副作用。
  - PASS：链接热区只覆盖规则入口文案，整句提示未成为超链接。
  - PASS：截图已保存并复制到 workspace `screenshots/TC-INT-CFG-RULE-LINK--prompt-visible--link-hot-area.png`。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A
- `fixture_fallback`: not_triggered
- `mock_handling`: N/A
- `auto_fix_handling`: N/A
- `final_result`: PASS
- `evidence_summary`: DOM / tab / Network side-effect scan / screenshot 已落盘，支持规则入口点击、跳转和负向副作用断言。
- `residual_risk`: N/A
- `next_step`: next case

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-CFG-RULE-LINK
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-CFG-RULE-LINK
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=prompt-visible; capture_scope=link hot area; ruleId=N/A
- `step_changes`: prefilled-list prompt visible -> click rule link -> new Lark wiki tab opens; original form remains in place
- `assertion_changes`: none
- `evidence_alignment`: aligned_for_verify_runtime
- `notes`: screenshot materialized; no Figma-vs-runtime claim in verify

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-CFG-RULE-LINK
- `evidence_requirement_id`: TC-INT-CFG-RULE-LINK__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI click `查看【不激励】规则`
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| click handler 执行跳转/打开逻辑 | 点击后新开 tab，URL 为 `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh`，title/body 包含 `电商内容生态激励管控` | verify-logs/evidence/TC-INT-CFG-RULE-LINK.md; screenshots/TC-INT-CFG-RULE-LINK--prompt-visible--link-hot-area.png | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-CFG-RULE-LINK
- `evidence_requirement_id`: TC-INT-CFG-RULE-LINK__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: business tab post-click DOM and network side-effect scan
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不触发下载 | post-click network 仅有 mcs / mon 监控请求；DOM 未出现 `下载名单` | verify-logs/evidence/TC-INT-CFG-RULE-LINK.md | PASS |
| 不出现申诉 | post-click DOM scan: `申诉=false` | verify-logs/evidence/TC-INT-CFG-RULE-LINK.md | PASS |
| 不触发表单保存 | 原业务 URL 不变，radio/form 状态保留；DOM 未出现 `保存成功` / `提交成功` / `保存中` / `提交中`；未观察到业务写接口 | verify-logs/evidence/TC-INT-CFG-RULE-LINK.md | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-CFG-RULE-LINK
- `evidence_requirement_id`: TC-INT-CFG-RULE-LINK__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: DOM rect + screenshot for link hot area
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| link 热区只覆盖 link 文案 | link rect x=617, y=515, width=128, height=20；prompt rect x=146, y=515, width=599, height=20；截图显示只有 `查看【不激励】规则` 为蓝色链接 | verify-logs/evidence/TC-INT-CFG-RULE-LINK.md; screenshots/TC-INT-CFG-RULE-LINK--prompt-visible--link-hot-area.png | PASS |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-INT-CFG-RULE-LINK
- `evidence_requirement_id`: TC-INT-CFG-RULE-LINK__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: DOM text/rect check before and after click
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不把整句提示做成超链接 | prompt text 包含说明文案和链接文案，但 `entirePromptIsLink=false`；link text 仅为 `查看【不激励】规则` | verify-logs/evidence/TC-INT-CFG-RULE-LINK.md | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-INT-CFG-RULE-LINK
- `evidence_requirement_id`: TC-INT-CFG-RULE-LINK__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: materialization check for before/action/after DOM and screenshot
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：before/action/after | before DOM、click result、新 tab、post-click business page state 均写入 evidence markdown | verify-logs/evidence/TC-INT-CFG-RULE-LINK.md | PASS |
| 证据类型：DOM | link href/target/rel/rect、prompt rect、负向文案扫描已记录 | verify-logs/evidence/TC-INT-CFG-RULE-LINK.md | PASS |
| 证据类型：截图 | Browser screenshot copied from tool temp path to workspace; `file` reports PNG 1474 x 1285 | screenshots/TC-INT-CFG-RULE-LINK--prompt-visible--link-hot-area.png | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| N/A | CLOSED | PASS | N/A | N/A | 所有 verify 阶段 required assertions 已闭合 | verify-logs/evidence/TC-INT-CFG-RULE-LINK.md; screenshots/TC-INT-CFG-RULE-LINK--prompt-visible--link-hot-area.png | N/A | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| mtr_boundary | `09-test-case-matrix.md#mock--real-boundary` 标记该 case 无后端响应、无数据 mock 依赖；既有 verify 证据已证明 link 点击打开目标 Wiki 且不触发表单保存/下载。 |
| real_action | 本轮用户提供的入口是奖励投放页 `/content-activity/award`，不是配置编辑页；未 fresh rerun 规则 link 点击。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#mtr-real-recheck-queue-and-result` |
| mtr_result | `OPEN_REAL_URL_GAP_FOR_FRESH_RERUN` |
| pass_policy | 不用 award 页证据替代配置页 link fresh rerun；历史 verify 的 CLOSED/PASS 保留，但本轮 MTR 不新增配置页真实点击证据。 |
| remaining_real_gap | 若要求本轮 MTR 覆盖配置页 fresh rerun，需要提供真实配置编辑页 URL/token 并重新点击 `查看【不激励】规则`。 |

#### MTR Config Page Fresh Rerun（真实配置页补验追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` follow-up：`将所有可以进行验证的配置页上进行验证` |
| real_action | 在无 `externalLeadsDomainMock=1` 的 `activity_id=7629288371705643310` 配置编辑页自然进入 `奖励配置` 后，点击第一个 `查看【不激励】规则` 链接。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-config-pages-20260713.md#rule-link-click-evidence`; `verify-logs/evidence/mtr-rerun-activity-7629288371705643310-20260713.md#config-page-fresh-rerun` |
| observed_value | 点击新开真实飞书 Wiki tab：`https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh`；标题为 `电商内容生态激励管控 - 飞书云文档`；正文/目录包含 `电商内容生态激励管控`、`一、背景`、`二、底线问题剔除`。 |
| negative_observed_value | 原业务 tab 仍停留在同一 edit URL；prompt/link count 仍为 6；未出现保存/提交成功态；`blockedWrites=[]`；未观察到 content-activity save/export/remove/award 写接口。 |
| hot_area | anchor 文案精确为 `查看【不激励】规则`；parent text 才包含完整提示句，整句未被做成超链接。 |
| screenshot_materialization | `verify-logs/screenshots/mtr-rerun-config-7629288371705643310-20260713.png`；activity rerun 已从 Trae temp 目录复制到 workspace，`file` 校验为 `PNG image data, 2022 x 1715, 8-bit/color RGB, non-interlaced`。该 PNG 记录点击前 link hot area；真实跳转由 tab evidence 证明。 |
| mtr_result | `PASS` |
| pass_policy | 关闭此前配置页 link `OPEN_REAL_URL_GAP_FOR_FRESH_RERUN`；该 case 无后端 real response 依赖，浏览器可验证交互已闭合。 |
| remaining_real_gap | N/A |
