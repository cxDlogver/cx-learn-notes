---
description: BAM mock 运行时入口。主路径服务于 MOCK_PREVIEW；也支持 verify/design 在基础真实链路或接口合同明确但样本不足时做受控临时 mock 样本取证；不修改业务代码。
---

请按 `.trae/AGENTS.md` 的 Phase Gate Rules 执行 `/delivery:mock`。

## Purpose

本命令负责两类 BAM mock 运行时工作：

1. `MOCK_PREVIEW` 的正式运行时 BAM mock。
2. `verify` / `design` 在基础真实链路或接口合同已明确、但当前失败分类为 `SAMPLE_COVERAGE_GAP` 时的受控临时 mock 样本取证。

统一入口职责如下：

1. 读取 `/delivery:task` 产出的 `delivery-task.md` 和 `09-test-case-matrix.md`。
2. 使用 `Use Skill: bam-mock-runtime-generator` 初始化并维护目标 `mock/` 产物。
3. 在每次规则调整前追加 `mock/mock-log.md`，记录调整原因、时间、受影响接口和 rule-map 预期新增 / 修改 / 删除规则。
4. 按接口更新 `mock/apis/<apiName>/manifest.json`、`script.mjs`、`verify.mjs`，并同步 `mock/rule-map.json` 最小索引与 `mock/rule-map.md` 人工总览。manifest 必须保留当前接口全部 active rule 和完整重建数据；不得只保存本轮规则或 inline patch 摘要。
5. 将本轮接口脚本替换到 BAM 对应接口 marker。
6. 执行最终 patched BAM 验证审核。
7. 输出或更新 `delivery-mock.md`，记录本次 detour 的结果；进入 `/delivery:task` 不要求本命令已执行。

本命令不生成业务实现任务、不生成测试用例、不修改 route / component / hook / store / service / adapter 等业务代码。若目标 BAM wrapper 丢失当前 case 必需的 request 字段透传，可在目标 `src/bam/**` 接口 wrapper 内用标准 `/* BAM_MOCK_* */` marker 补齐字段映射；该补丁只允许把已存在于 `_req` / UI 请求形态中的字段透传进 BAM runtime，不得改业务调用链、接口 method/path 或伪造业务状态。

`/delivery:mock` 只在 verify / design 阶段按实际依赖的 case / rule 定向生成、修复或清理；完成后必须恢复原工作流。非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 模式只允许服务当前 active case，不得扩大为阶段级 mock 依赖。

本命令必须由主 Agent 在当前执行会话执行。Subagent 无法拥有主 Agent 的 active case、当前 `Browser Runtime Mode` 的登录态和 BAM patch 上下文，因此不得由 Subagent / `code-writer` / `runtime-runner` 调用本命令，不得让 Subagent 执行 `bam-mock-runtime-generator`、UI 自然点击采集、BAM marker patch 或最终 patched BAM 验证。`runtime-runner` 最多只能在主 Agent 明确委派时提供端口、health check、dev server / HMR 日志或命令输出摘要；Subagent 只能返回需要主 Agent 处理的 mock checkpoint。

## Targeted Rework Mode

定向返工由当前 verify / design 的主 Agent 执行会话直接进入本命令。

- 执行本命令时必须在命令上下文中固定 `origin_stage`、`resume_point`、`resume_command`、受影响 task / case / rule、API / response gap、允许路径、禁止路径和 `resume_checks`。非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 还必须固定 `base_contract_evidence`、`supplemental_assertions`、`forbidden_contract_assertions`、`mock_debug_param` 和 `cleanup_required=true`。
- 主 Agent 直接按 `bam-mock-runtime-generator` 调整 manifest、runtime、BAM marker、必要的 BAM wrapper request 字段透传 patch 和 mock 产物。
- BAM mock 审查通过后，必须按 `delivery-mock.md` 本次执行记录恢复原工作流继续执行；不得停在“mock 修复完成”或只建议重新执行原命令。
- 保留现有 task、code、verify、design 产物和已通过证据；不得调用 `delivery_stage_rewind.sh mock` 做全量 rewind，也不得要求重跑已完成 Code Task。

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/DELIVERY_STATE.md`
- `.trae/PROJECT_CONTEXT.md`
- 当前 workspace 下的 `03-prd-analysis.md`
- 当前 workspace 下的 `04-tech-plan.md`
- 当前 workspace 下的 `delivery-task.md`
- 当前 workspace 下的 `09-test-case-matrix.md`
- 当前 workspace 下的 `delivery-mock.md`（如存在）
- 当前 workspace 下的 `bam-sync-report.md`（如存在）
- `.trae/skills/bam-mock-runtime-generator/SKILL.md`

必须满足：

- `04-tech-plan.md` 存在。
- `origin_stage` 必须为 `verify` / `design`，且命令上下文必须包含当前 `case_id` / `resume_command`。
- verify / design调用时必须能复用当前页面入口或恢复同等 UI操作路径，并能回溯到已完成的业务代码调用链。
- 若 `Implementation Mode: MOCK_PREVIEW`：
  - `Plan Readiness` 不为 `BLOCKED`。
  - `/delivery:task` 已完成，`delivery-task.md` 存在且 `Task Readiness: PASS`。
  - `09-test-case-matrix.md` 存在且包含 `Test Case Matrix`、`BAM Mock Response Field Coverage Matrix`、`Mock Preview Scope` 和 `Mock / Real Boundary`。
  - `Mock Preview Scope` 必须同时覆盖 `Test Case Matrix` 的 Test Fixture Mock 和 `BAM Mock Response Field Coverage Matrix` 的 BAM runtime mock。
  - 命令上下文必须包含当前 `task_id` / `ruleId` / `apiName`。
- 若为非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP`：
  - `origin_stage` 只能是 `verify` / `design`。
  - 命令上下文必须包含 `base_contract_evidence`、`supplemental_assertions`、`forbidden_contract_assertions`、`mock_debug_param` 和当前样本缺口说明。
  - 浏览器运行态必须通过 vmok 壳 URL，并显式带上 `.trae/PROJECT_CONTEXT.md` 约定的 mock-debug 参数；当前项目示例为 `externalLeadsDomainMock=1`。未带该参数产生的页面、Network 或 console 证据不得记为 mock 命中证据。
  - 当前 case 的基础真实链路或接口合同必须明确：至少包含接口 method/path、请求字段、响应字段或枚举语义中的必要项，并能回溯到技术文档、BAM、IDL、generated types、代码消费链路或同接口真实请求证据。若存在真实响应与技术方案不一致，必须返回原阶段按 `API_ISSUE` / `DATA_CONTRACT_MISMATCH` 处理，不得进入补充 mock。

若任一条件不满足，必须返回对应阶段修复：plan 信息不足返回 `/delivery:plan`，task / case / rule 合同缺失返回 `/delivery:task`，业务调用链未完成返回 `/delivery:code`。

## Execute

1. 主 Agent 从 `09-test-case-matrix.md` 和当前 detour 上下文中拆出受影响 `case_id + apiName + BDD 行为规范 + request key/value`；若对应 BAM矩阵行的 `补充说明` 非 `-`，一并读取作为 runtime 缺口提示。`MOCK_PREVIEW` 继续要求 `BAM Mock Response Field Coverage Matrix`、`ruleId` 和完整 mock 合同；非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 允许没有 `ruleId`，但必须明确当前只补充哪些样本依赖断言，以及哪些真实 contract 断言禁止被 mock 覆盖。
2. 主 Agent 执行 `bam-mock-runtime-generator` 的浏览器可用性前置确认，先判定 `Browser Runtime Mode`：`TRAE_DESKTOP` 复用 Trae 内置浏览器 / 桌面 Profile；`COCO_CLI_HEADLESS` 复用无头浏览器 context、user data dir 或 storage state。固定 `vmok_url`、浏览器会话 / Profile / storage state、workspace 和允许写入范围，并把 `browser_runtime_mode`、`browser_tool`、`headless`、`network_evidence_level` 和 `sso_result` 写入 `delivery-mock.md` 与 manifest 的 browser precheck。
3. 主 Agent 必须基于正式代码调用链，通过 UI 自然操作到达真实接口请求点。若页面 / store / service 已带出影响 mock 命中的字段，但目标 BAM wrapper 的 `data` / request 映射丢弃该字段，必须先在 `/delivery:mock` 内执行 `WRAPPER_REQUEST_FIELD_PATCH`：在目标 BAM wrapper 以标准 `/* BAM_MOCK_WRAPPER_FIELD_START <apiName>.<field> */` / `/* BAM_MOCK_WRAPPER_FIELD_END <apiName>.<field> */` marker 补齐类似 `has_author_subject: _req['has_author_subject']` 的最小透传，并在 manifest `requestFields`、`mock-log.md` 和 `delivery-mock.md` 记录字段、证据、回收方式。该场景不得返回 `/delivery:plan`，也不得让 `/delivery:code` 手改 `src/bam/**`。
4. 读接口或安全可发送接口必须采集真实 request 和真实 response；若 UI 可到达请求点但因为安全、权限、写接口副作用等原因不能发到后端或不能取得 response，该 rule 写为 `NO_RESPONSE_DATA`，仍必须生成 matcher 与 warning mock rule，命中时输出 `[BAM_MOCK_NO_RESPONSE_DATA]`，不得伪造成功响应。若两轮 UI 自然点击仍无法定位 Network 请求，且该接口由当前 case / task 证明为必要接口，允许写为 `SYNTHETIC_CONTRACT`：生成符合接口 method/path/schema 的 synthetic request / response、matcher 和数据 mock，命中时输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 并登记 real verify；否则该 rule 只能写为 `PENDING` / `BLOCKED`。
5. 每个 rule 在修改规则前必须先更新 `mock/mock-log.md`，再更新该接口的 `manifest.json`、`script.mjs`、`verify.mjs` 和 `rule-map` 对应索引 / 摘要。
6. 接口脚本更新后，直接用单接口 manifest 替换 BAM 中对应接口 marker；若本轮包含 wrapper request 字段透传 patch，必须在同一个目标 BAM 文件中保留对应 `BAM_MOCK_WRAPPER_FIELD` marker；常规更新不清空全部 mock。接口自定义 `verify.mjs` 只能补充业务断言，不得只检查 ruleId / manifest 存在并绕过标准 manifest gate。
7. 执行最终 patched BAM 验证审核：
   - UI rule 默认通过自然页面操作产生 `[BAM_MOCK_HIT]`；`NO_RESPONSE_DATA` rule 产生 `[BAM_MOCK_NO_RESPONSE_DATA]`；`SYNTHETIC_CONTRACT` rule 产生 `[BAM_MOCK_SYNTHETIC_CONTRACT]`，并可同时产生 `[BAM_MOCK_HIT]` 作为数据 mock 命中证据。
   - wrapper request 字段透传 patch 必须通过 UI 自然操作或 BAM 测试入口证明 patched BAM runtime 收到的 `requestBody` 包含该字段和值，例如 `has_author_subject:false`。
   - 多规则命中、no-hit 默认规则和异常 fallback 都必须覆盖。
8. 生成或更新 `delivery-mock.md`，包含 Mock Readiness、接口覆盖、wrapper request 字段透传 patch、未闭合项、修改的 BAM / `__mock__` 文件、最终验证结果、real verify 回收要求，以及本次 detour 的 `origin_stage`、`resume_task_or_case`、`resume_command`、`mock_result`（如适用）。非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 还必须额外记录 `base_contract_evidence`、`mock-only supplemental evidence`、`supplemental_assertions`、`forbidden_contract_assertions`、`mock_debug_param`、临时 mock 文件清单和 `cleanup_status`。
9. 非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 在当前 case 关闭后，主 Agent 必须在同一执行会话立即回到 `/delivery:mock` 执行 cleanup：删除当前 case 的临时 rule、恢复 BAM patch / wrapper patch、删除生成器管理的临时 `__mock__` 文件、更新 manifest 与 rule-map、把 `cleanup_status` 标记为 `DONE`，并移除浏览器 URL 中的 `mock_debug_param` 后复查页面。cleanup 未完成不得进入下一个 case、不得结束当前阶段。

## Gate

PASS 条件：

- 当执行本命令时，`delivery-mock.md` 存在且 `Mock Readiness: PASS`。
- `mock/mock-log.md`、`mock/rule-map.json`、`mock/rule-map.md` 和每个受影响接口 `manifest.json` 存在；`rule-map.json` 只包含最小索引且与 manifest 的 rule 索引一致。
- 本次 rule-map 索引 / manifest / runtime / BAM marker 调整前，`mock/mock-log.md` 已记录调整原因、时间和新增 / 修改 / 删除规则清单。
- 每条 active rule 均能回溯到 `09-test-case-matrix.md` 的 `case_id`，且一个需要后端响应的 case 最多只有一个 `ruleId`；多个 case 共用同一 rule 时 manifest / rule-map 必须用 `caseIds` 数组完整记录。
- manifest 中每条 active rule 均记录影响 mock 命中的 request key/value、request 合同来源、mock 规则和验证断言；矩阵中写成 `<真实UI获取>` 的非影响请求字段只能记录到 `realRequest` / `collectionOnlyFields` / `responseContract.request`，不得进入 matcher。真实 response 可用时记录 UI 真实 request、真实 response、mock 后 response 和 `mockOperations`。`NO_RESPONSE_DATA` rule 必须记录无响应原因、warning runtime 和 `[BAM_MOCK_NO_RESPONSE_DATA]` 验证证据；`SYNTHETIC_CONTRACT` rule 必须记录两轮 UI 自然点击尝试、接口必要性、synthetic request / response、`[BAM_MOCK_SYNTHETIC_CONTRACT]` 验证证据和 real verify 回收项。
- manifest 必须包含当前接口全部 active rule；每条真实响应 rule 必须有 `realResponseBody | realResponsePath`、`mockedResponseBody | mockedResponsePath`、`mockOperations` 和 rule 级 real-connect 引用；每条 synthetic rule 必须有完整 `mockedResponseBody | mockedResponsePath` 及可读取的 `request.json` / `response.json` / `evidence.json`。只保存 `responseContract.source`、规则摘要或 BAM inline patch 属于 `MANIFEST_REHYDRATION_INCOMPLETE`。
- 每个 manifest 都有 `rehydration.strategy: manifest_reapply`，且最终 `rehydration.status: passed`；标准 `reapply-bam-mocks.mjs --apply` 能在 BAM update 后只依赖 manifest / real-connect 恢复全部 mock。自定义 `verify.mjs` 只检查 ruleId 或文件存在不得作为 PASS 证据。
- 每个受影响接口的 BAM marker 已 patch；若存在 wrapper request 字段透传缺口，对应 `BAM_MOCK_WRAPPER_FIELD` marker 已 patch，manifest 已登记，验证证据显示 requestBody 包含补齐字段。
- 最终 patched BAM 验证审核通过。
- 非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 还必须同时满足：`base_contract_evidence` 已证明基础真实链路或接口合同明确；`mock-only supplemental evidence` 只覆盖允许补充的样本依赖断言；`forbidden_contract_assertions` 未被 mock 覆盖或改写。
- 非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 还必须记录本轮使用的 `mock_debug_param`，并在 cleanup 完成后证明移除该参数时页面不再依赖临时 mock。
- 产物中没有业务代码 mock、fallback store、preview service、fake success 或 adapter 造数要求。

BLOCKED 条件：

- 浏览器前置确认失败，无法执行 UI 自然点击尝试。
- rule-map 索引 / manifest 与 `09-test-case-matrix.md` 无法对齐。
- 规则没有自然请求匹配条件，或依赖 response / 测试专用 selector 才能命中。
- 无法通过 UI 自然操作触发真实接口请求，且该 rule 未保持 `PENDING` / `BLOCKED`，也不满足“两轮 UI 自然点击失败 + 必要接口 + `SYNTHETIC_CONTRACT` 标记”条件。
- 因安全、权限、写接口副作用等原因不能发到后端或不能取得 response，却未生成 `NO_RESPONSE_DATA` warning mock rule。
- 最终 patched BAM 验证失败。
- 任一 active rule 缺少完整响应合同 / real-connect 文件，或 BAM update 后无法由标准脚本从 manifest 全量重插。
- 非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 缺少 `base_contract_evidence`，或发现真实响应与技术方案不一致、需要用 mock 覆盖 `forbidden_contract_assertions`。
- 非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 缺少 `mock_debug_param`，或 mock 命中证据并非来自带该参数的 vmok URL，或 case 关闭后未完成 cleanup。
- 需要修改 route / component / hook / store / service / adapter 等业务代码才能让 mock 生效；仅目标 BAM wrapper request 字段透传缺口不属于该 BLOCKED 条件，应在 `/delivery:mock` 内用 `BAM_MOCK_WRAPPER_FIELD` marker 补齐。

## Output

只输出：

1. Mock Readiness。
2. 已覆盖的 BAM method / API。
3. 未闭合 requirement / 字段 / rule。
4. `mock-log.md` 本次记录摘要。
5. 修改的 BAM / `__mock__` 文件范围；若包含 wrapper request 字段透传 patch，必须列出 `BAM_MOCK_WRAPPER_FIELD` 字段、marker 和验证证据。
6. 非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 时，额外输出 `base_contract_evidence`、`mock-only supplemental evidence`、`supplemental_assertions`、`forbidden_contract_assertions`、`mock_debug_param`、临时 mock 文件清单、`cleanup_status`。
7. 最终 patched BAM 验证方式与结论。
8. 下一步：按 `delivery-mock.md` 本次执行记录恢复原 verify / design active case；若当前为 `SAMPLE_COVERAGE_GAP`，必须包含 cleanup 恢复点与“移除 debug 参数后的复查结论”；若合同不足则返回 `/delivery:task` 或 `/delivery:plan`。
