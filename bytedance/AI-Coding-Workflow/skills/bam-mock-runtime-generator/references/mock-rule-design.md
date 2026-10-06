# Mock Rule Design

规则设计只回答一件事：当前接口的自然请求应该命中哪个 `ruleId`，以及该 `ruleId` 如何构造 mock response。

## 来源

规则只能来自：

- `09-test-case-matrix.md` 的 UI 落点粒度 `BAM Mock Response Field Coverage Matrix`，且必须能回溯到 `Test Case Matrix` 的 `case_id + ruleId + apiName`。
- 已有保留规则。
- verify / design 阶段通过 `/delivery:mock` 传入的当前 case / rule 缺口。

当前业务代码只能帮助确认接口调用位置和当前实现形态，不能自动成为 mock 行为或新增 request 字段的来源。新增 / 已存在字段是否可用于 rule matcher，必须先从 `04-tech-plan.md`、技术文档或 BAM evidence 找到合同依据；没有合同依据时，应修正业务代码或返回计划阶段补合同。

## 调整日志先行

新增、修改或删除任何规则前，必须先在 `mock/mock-log.md` 记录本次调整：

- 调整时间和来源阶段。
- 调整原因。
- 受影响接口。
- rule-map 预期新增 / 修改 / 删除 / 保留的 ruleId。
- 每条受影响规则的关键 request key/value、mock key 和 mock 规则。
- 最终 patched BAM 验证计划和恢复检查。

如果规则设计过程中发现范围扩大、ruleId 改变或 request key/value 改变，必须先补一条 `scope update`，再修改 `rule-map`、manifest、runtime 或 BAM marker。

## 真实响应优先

完成接口分析后，再判断能否通过浏览器取得真实请求和真实成功响应。真实响应可用时，它是 response 合同的首选基准。

请求真实接口必须满足：

- 初始化阶段的 `browserPrecheck.status` 已经通过，且后续采集复用同一浏览器会话、同一个固定 Profile 或同一个 headless storage state。
- 已确定 `apiName`、method/path、BAM 函数、目标文件、vmok URL、自然 UI 触发路径和关键请求字段。
- 业务页来自 vmok 壳，且页面不是 SSO、空白页或错误页。
- 必须通过自然 UI 操作触发目标 BAM 请求。
- 请求使用完整自然业务 request shape，保留所有影响 mock 的字段，也保留后端成功返回所需的非影响字段。
- 非影响但用于真实采集的字段优先使用真实页面值，例如从 Network 请求、当前选中记录、列表首行、URL / route 上下文或上游真实响应取得的 `id`、biz/context、默认分页或固定筛选值。它们只写入 `realRequest` / `responseContract.request`，不得进入 `ruleMatchKeys`。
- 不读取 cookie、localStorage、sessionStorage、Authorization 或 SSO 票据。
- 不把有副作用、权限敏感或未确认安全的接口发送到后端；这类接口若 UI 请求点可达，必须进入 `no_response_data` mock rule。

必要接口经过两轮 UI 自然点击仍无法定位 Network 请求时，允许对应 rule 标记 `synthetic_contract` 并生成可命中的数据 mock；必须记录两轮尝试、接口必要性、synthetic request / response、字段来源和 `realVerify` 回收方式，命中时输出 `[BAM_MOCK_SYNTHETIC_CONTRACT] <json>`。非必要接口或未完成两轮尝试的 UI 不可达场景只能保持 `pending` / `blocked`，记录 blocked reason、resume case 和 `realVerify` 回收方式，不得生成可命中的 mock runtime。UI 请求点可达但由于安全、权限、写接口副作用或环境策略不能发送到后端时，对应 rule 必须标记 `no_response_data`，仍然写入 `rule-map`、`ruleMatchKeys` 和 runtime 分支；命中时输出 `[BAM_MOCK_NO_RESPONSE_DATA] <json>`，JSON 必须包含脱敏请求和提醒。

每次真实连接或 synthetic 合同尝试必须按 rule 落盘到 `mock/real-connect/<apiName>/<ruleId>/`。成功时先保存脱敏后的完整原始抓包文本 `response.raw.txt`，再由该 raw 文本解析转换出 `response.json`，同时保存脱敏 `request.json` 和 `evidence.json`；UI 请求点不可达时保存 blocked 证据与 `blockedReason`；UI 请求点可达但不能安全发送后端时保存 `no_response_data` 请求形态、证据、`noResponseDataReason` 和 warning payload；必要接口两轮 UI 自然点击仍无法定位请求时保存 `synthetic_contract` 请求形态、合成响应、两轮尝试证据、`syntheticContractReason`、`interfaceNecessity` 和 real verify 回收项，并在当前 rule 的 `realConnectArtifact` 和 manifest `realConnect.artifacts[]` 中同时引用。没有 rule 级 evidence 时，不能声称该 rule 已经进行真实请求或 synthetic 合同闭合。

`response.raw.txt` 必须由浏览器真实 XHR/fetch body 完整保存，可以保持未格式化 / minified JSON 原文。`response.json` 必须由 `response.raw.txt` 解析转换得到，不能从 Preview 面板、控制台折叠对象、文档示例或模型摘要手工改写。保存后必须用脚本校验关键列表 path 的长度与请求分页字段、total/count 字段一致；不一致时重新采集，只有 UI 请求点不可达时才 blocked。

## 每条规则必须记录

- `ruleId`
- `caseIds`
- `changeType`：`保留` / `新增` / `修改` / `删除`
- `requestFields`：关键影响请求字段 key/value
- `requestFieldImpact`：每个请求字段为什么会影响当前规则
- `mockRule`：如何构造响应数据
- `realResponseBody` / `realResponsePath`：UI 自然操作得到的完整真实响应；内联 body 必须与 `realConnectArtifact.response` 完全一致，path 必须指向该 response 文件
- `mockOperations`：实际写入 BAM runtime 的最小字段改写
- `mockedResponseBody`：把 `mockOperations` 应用到基准后的审核期望响应
- `responseContract`：真实响应来源、证据、真实请求、补字段说明；不得保存 `body`
- `realRequest`：真实接口请求形态
- `uiTarget`
- `verifyAssertion`
- `realVerify`

## 设计规则

- 每个接口必须有默认规则。
- 默认规则无 mock 时返回原响应。
- 默认规则的 requestFields 必须为空；任何依赖请求字段选择的行为都必须拆成非默认 rule。
- 无关字段不得作为匹配条件。
- 无关字段、默认字段或仅用于真实接口成功返回的字段可以出现在 `realRequest` 中，但必须标记为采集字段，不得用于 runtime 选择 `ruleId`。
- 列表到详情链路中采集字段应优先来自 UI/Network/上游真实响应并写入 `collectionOnlyFields`。只有它确实改变 mock 分支时，才允许进入 matcher。
- 若 task matrix 在 `request key/value` 中写 `field=<真实UI获取>`，该字段视为 collection-only 采集要求；生成 manifest 时必须用 UI 自然请求或上游真实响应补齐真实值和来源，不得把 `<真实UI获取>` 写入 `ruleMatchKeys`。
- 请求字段必须先证明影响当前需求：改变 rule 分支、目标记录、候选过滤、分页场景或提交断言，才能进入 `ruleMatchKeys`。
- 当自然请求需要区分“字段不存在 / 空值”和“字段有具体值”时，允许使用保留 matcher 值 `__BAM_MOCK_ABSENT__`；它只表示 runtime 中该字段为 `undefined`、`null` 或 `''`，必须在 `requestFieldImpact` 说明为什么“无筛选”是当前 rule 的影响条件。不得把它用于未知真实值、待补字段或 collection-only 字段。
- 如果影响字段只出现在 page/store/service 入参而未出现在 BAM runtime `requestBody`，必须先确认技术合同声明该字段存在；合同存在且 wrapper 未透传时，才允许 `wrapper_request_mapping` + `BAM_MOCK_WRAPPER_FIELD`。合同不存在时，不得以业务代码为依据新增 mock rule 或 wrapper patch。
- 默认分页、默认 page_size、route tab、trace/token/时间戳、仅用于请求成功但不改变 mock 场景的字段必须剔除。
- 一个影响 request key/value 组合只能对应一个 `ruleId`。
- 同一个 `ruleId` 只能对应同一组影响 request key/value；多个自然请求里的非影响采集字段可以不同，但必须写入 `realRequest` / `collectionOnlyFields`，不得进入 matcher。若影响字段 value 不同会改变 mock 规则、response 分支或断言，必须拆分 `ruleId` 和 test case。
- 删除规则必须从 `ruleMatchKeys` 和 runtime 脚本中移除。
- 响应报文只能作为 mock 输出，不能参与 rule 匹配。
- mock response 必须在响应合同基准上做最小改写，优先复用真实响应结构、字段类型和跨字段不变量。
- `no_response_data` 是 active mock rule，不是 blocked：必须保留 matcher、`responseContract.source: "no_response_data"`、`runtimeWarning` 和验证断言；runtime 不发送后端，只输出 warning payload 和安全响应。
- `synthetic_contract` 是显式降级的 active mock rule：必须保留 matcher、`responseContract.source: "synthetic_contract"`、`mockedResponseBody`、两轮 UI 尝试证据和验证断言；runtime 不发送后端，返回 synthetic response 并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]`。
- 不能为了节省 manifest 篇幅把真实响应数组缩短为首条或少量样例；需要减小 manifest 时使用 `realResponsePath` 引用完整 `response.json`。
- `mockedResponseBody` 只能用于验证 `mockOperations` 是否符合规则，不得直接写进 BAM 或作为 runtime 返回值。
- 旧 `responseBody` / `responsePath` 属于直返 fixture，发现时必须返工。
- 需要补字段时，必须记录父级 response path、覆盖值生成依据、来源和真实接口接入后的 real verify。
- 每次规则调整前必须有对应 `mock-log.md` 条目；日志中的新增 / 修改 / 删除 ruleId 必须与 `rule-map` 实际变更一致。
- 每次规则调整后必须重跑最终 patched BAM 验证。

## 总映射表

`rule-map.md` 是人工审核入口，必须能回答：

- 每个接口有哪些 `ruleId`。
- 每个 `ruleId` 对应哪些请求字段 key/value。
- 每个 `ruleId` 的 mock 规则是什么。
- 响应报文是什么。
- 真实响应和 mock 后响应分别是什么。
- BAM runtime 实际执行哪些 `mockOperations`。
- 响应合同来源是什么，是否来自浏览器真实接口。
- 真实接口请求是什么。
- UI 落点和验证断言是什么。
- real verify 如何回收。

写法要求：

- 使用“接口块 + Rule 块”的层级 Markdown。
- 不使用 Markdown 表格。
- 每条 rule 必须独立展示请求匹配、mock 规则、响应合同、响应报文和验证状态。
- 默认规则要显式写明“无关键影响请求字段”和原因。
