---
name: bam-mock-runtime-generator
description: Use when 任意阶段需要初始化、生成、调整、删除或最终验证 BAM mock 规则、接口级 manifest、runtime 脚本和 patched BAM 行为。
---

# BAM Mock Runtime Generator

本 skill 用于以接口为单位维护 BAM mock。每次只处理受影响接口：初始化产物、调整规则、生成该接口 runtime、替换 BAM 中该接口 marker，并通过最终 patched BAM 验证审核确认结果。

## 核心原则
- 本 skill 必须由主 Agent 在当前执行会话执行。Subagent 无法拥有主 Agent 的 active case、登录态和 Network / console 证据上下文，因此不得由 Subagent 调用本 skill，不得把浏览器前置检查、UI 自然点击采集、mock rule 生成 / 调整、BAM marker patch 或最终 patched BAM 验证交给 Subagent。桌面环境使用 Trae 内置浏览器优先；CoCo / Trae CLI / 无桌面环境使用无头浏览器。
- `manifest.json` 是单接口 BAM mock 的唯一完整事实源。`rule-map.json` 只保存跨接口最小索引，用于重复、缺失和过期索引检查；`rule-map.md` 是人工总览摘要，不作为机器强校验事实源。
- `mock-log.md` 是调整前记录。每次新增、修改或删除 mock 规则前，必须先记录本次调整原因、时间、受影响接口和 rule-map 预期变更。
- 每个接口独立维护一个 `manifest.json`，用于记录接口信息、BAM 落点、字段 patch、wrapper request 字段透传 patch、temporary mock API、完整规则事实、patch 状态和最终验证状态。
- 每个接口只维护一个 `script.mjs`，该脚本表达当前接口全部 active rule 的 runtime 行为。
- 每次只改受影响接口；本轮接口脚本完成后，直接替换 BAM 中该接口 marker。
- mock 响应合同默认必须来自正式代码调用链完成后，通过 UI 自然操作触发得到的真实接口 request 和真实 response。不得用静态示例、手写 fixture、业务代码造数或 response 猜测生成可通过的 mock 规则。例外 1：非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 允许基于 `base_contract_evidence`（技术文档、BAM、IDL、generated types、代码消费链路或同接口真实请求证据）构造临时状态样本，但必须标记为 `sample_coverage_synthetic`，只服务当前 active case，且 case 关闭后必须 cleanup。例外 2：当必要接口经过两轮 UI 自然点击仍无法在 Network 中定位请求时，允许生成符合接口形态的 synthetic request / response 做数据 mock，但必须标记为 `synthetic_contract`，记录两轮尝试证据、接口必要性和 real verify 回收项。如果 UI 请求点可达，但由于安全、权限、写接口副作用或环境策略不能发送到后端，必须标记为 `no_response_data`，并仍然生成可命中的 mock rule。
- manifest 必须区分真实响应、mock 后响应和 BAM runtime 脚本：`realResponseBody | realResponsePath` 记录 UI 自然操作得到的真实基准；`responseContract` 只记录真实响应来源、证据、请求和补字段说明，不得再保存 `body`；`mockedResponseBody | mockedResponsePath` 只用于审核 mock 结果是否符合规则，不得直接内联到 BAM；BAM 中只能插入由 `mockOperations` 生成的“调用原接口后最小改写字段”脚本。
- 每条 active non-default rule 必须具有可重建响应合同：真实响应 rule 保存 `realResponseBody | realResponsePath`、`mockedResponseBody | mockedResponsePath` 和 `mockOperations`; `sample_coverage_synthetic` / `synthetic_contract` 保存完整 `mockedResponseBody | mockedResponsePath` 以及 rule 级 `request.json`、`response.json`、`evidence.json`; `no_response_data` 保存 matcher、`realRequest`、`runtimeWarning` 与 rule 级证据。只保存 `responseContract.source`、规则摘要或 inline synthetic patch 不合格。
- 真实响应可用时，`realResponseBody` 必须是脱敏后的完整真实响应体，且与当前 rule 的 `realConnectArtifact.response` 文件逐字段一致；禁止只粘贴首条、可见片段、摘要、示例或模型补全结果。响应过大时，使用 `realResponsePath` 直接指向同一个 `realConnectArtifact.response` 文件，不得生成派生快照。真实响应必须先保存脱敏后的原始抓包文本 `response.raw.txt`，再由该 raw 文件解析转换出 `response.json`；不得跳过 raw 文件直接手写 `response.json`。`synthetic_contract` rule 不得伪装成真实响应，必须把 synthetic response 放在 `mockedResponseBody | mockedResponsePath` 与 `realConnectArtifact.response` 并标明来源。
- 同一个接口内，一个 `(接口 - 关键影响请求字段 - 字段值)` 只能对应一个 `ruleId`。
- 每个需要后端响应的 test case 最多只能对应一个 `ruleId`；每条非默认 active rule 必须记录 `caseIds`、`requestFields`、request、response 合同来源、mock 规则、mock 后 response 和验证断言。真实响应合同必须有真实 request / response / `mockOperations`；`no_response_data` 必须有 warning runtime；`synthetic_contract` 必须有 synthetic request / response、两轮 UI 尝试证据和 synthetic marker。
- 规则匹配只依赖自然业务请求字段，不读取 response，不依赖测试专用 selector。
- 任意一次请求命中多个具体规则都必须无例外判定为 matcher 配置错误，并统一输出 `[BAM_MOCK_MATCH_ERROR]`；no-hit 走默认规则；默认规则无 mock 时返回原响应。
- 请求字段即使只服务 mock，也必须来自当前已确认接口合同，并完整进入 BAM runtime；不得在业务代码或 service 中删除、过滤或伪造。
- 判断 BAM wrapper 是否丢字段时，先查 `04-tech-plan.md`、技术文档或 BAM evidence。只有字段被明确声明为当前新增或已存在合同字段，且 page/store/service 按该合同产生字段但生成 wrapper 没有写进真实请求对象时，`/delivery:mock` 才允许在目标 BAM wrapper 中用标准 `/* BAM_MOCK_WRAPPER_FIELD_* */` marker 补齐最小字段透传。这类补丁必须记录为 manifest `requestFields[].kind = "wrapper_request_mapping"`，只允许把 `_req['field']` 透传到 wrapper 的 `data` / request 对象，不得改 method/path、业务调用链或 response mock 逻辑。若技术文档没有提到该字段，默认字段当前不存在，应修改业务代码或返回 `/delivery:plan` 补合同，不得通过 mock wrapper 兜底。
- route、component、hook、store、service、adapter 不得写 mock 数据、fallback store、preview service、内联 fixture 或 fake success。
- 只有最终 patched BAM 的 mock runtime 验证通过后，才能把本次接口 mock 调整标为完成；业务 UI 验收必须回到原 verify / design active case 闭合。

## 产物结构

```text
mock/
├── rule-map.json
├── rule-map.md
├── mock-log.md
├── real-connect/
│   └── <apiName>/
│       └── <timestamp>-<ruleId-or-default>/
│           ├── request.json
│           ├── response.raw.txt
│           ├── response.json
│           └── evidence.json
└── apis/
    └── <apiName>/
        ├── manifest.json
        ├── script.mjs
        └── verify.mjs
```

## Workflow

### 1. 初始化产物与浏览器前置检查

在任何规则调整、脚本生成或验证前，先检查当前 workspace 的 `mock/`：

- 若 `mock/rule-map.json`、`mock/rule-map.md`、`mock/mock-log.md` 和目标接口 `mock/apis/<apiName>/manifest.json` 都存在，直接进入接口分析。
- 若缺失任一目标产物，先生成空壳。
- 初始化只创建当前流程需要的产物，不生成额外阶段文件。

初始化空壳必须包含：

- `rule-map.json`：`mode: "BAM_MOCK_RULE_MAP"`、`interfaces: []`；每条 rule 只能包含 `ruleId`、`caseIds`、`isDefault`、`changeType`、`requestFields` 这类索引字段。
- `rule-map.md`：中文总映射文档，必须按“总览 -> 接口 -> rule”分层展开，可展示接口、ruleId、请求字段 key/value、mock 规则、响应报文、真实接口请求、UI 落点、验证断言、real verify、变更类型和最终验证状态；机器审查事实以接口 manifest 为准。
- `mock-log.md`：中文调整日志，按时间倒序或顺序追加条目。每条记录必须包含时间、来源阶段、origin/resume 信息、调整原因、受影响接口、rule-map 预期新增 / 修改 / 删除 / 保留的 ruleId、关联 caseIds、关键 request key/value、预期 response 改写、验证恢复点和执行状态。
- `mock/real-connect/<apiName>/<ruleId>/`：接口连接 / 合同证据目录。每条 active rule 都必须独立落一组 `request.json`、`response.json`、`evidence.json`；真实响应成功时还必须落 `response.raw.txt`。如果 UI 请求点可达但因安全、权限、写接口副作用或环境策略不能发送到后端，按 rule 落 `no_response_data` 请求形态、证据和 warning 规则；如果必要接口经过两轮 UI 自然点击仍无法定位请求，按 rule 落 `synthetic_contract` 的合成请求、合成响应、两轮尝试证据和 real verify 回收项；如果是非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP`，按 rule 落 `sample_coverage_synthetic` 的基础合同证据、临时合成请求/响应、允许补充断言、禁止覆盖断言和 cleanup 要求，不能只写接口级 all-rules 记录。
- `mock/apis/<apiName>/manifest.json`：`version: 2`、`mode: "BAM_MOCK_INTERFACE_MANIFEST"`、接口 method/path/apiName、`sourceRuleMap`、浏览器前置检查、`realConnect`、响应合同来源、`requestFieldsAffectingRules`、`ruleMatchKeys`、`rules`、BAM patch 信息和最终验证状态。
- `mock/apis/<apiName>/script.mjs`：该接口 runtime 源说明。
- `mock/apis/<apiName>/verify.mjs`：该接口 patched BAM 验证入口。

结构和字段见 [`references/manifest-schema.md`](references/manifest-schema.md)。

初始化阶段还必须完成浏览器前置检查。该检查只确认浏览器、vmok 壳和证据采集能力，不请求真实接口、不采集 response 合同。

浏览器前置检查必须与 `/delivery:verify` 的浏览器检查口径一致，并在本 skill 内完整执行：

- 先判定 `Browser Runtime Mode`：`TRAE_DESKTOP` 使用 Trae 内置浏览器优先；`COCO_CLI_HEADLESS` 使用无头浏览器，优先 Playwright Chromium，其次可用的 Chrome DevTools / browser MCP headless 能力。
- `TRAE_DESKTOP` 下优先使用 Trae 内置浏览器在主 Agent 当前会话打开或复用 vmok 业务页；内置浏览器可用时，不得先启动额外浏览器或子 Agent。
- `COCO_CLI_HEADLESS` 下不得调用有头 Chrome 或依赖人工可见窗口；必须通过无头浏览器打开同一 vmok URL，并采集 DOM、screenshot、console 和 Network 能力证明。
- 目标 vmok URL 必须来自计划、任务、稳定调试入口或用户明确提供的业务入口；localhost 只允许做 health check，不得代替 vmok 业务页。
- 打开 vmok 业务页前，必须用 `lsof -nP -iTCP:<port> -sTCP:LISTEN`、`ps -p <pid> -o pid,ppid,command` 和 `lsof -p <pid> | rg ' cwd '` 确认 `cjDebugSubApp` 端口属于当前 `.trae/DELIVERY_STATE.md` 的 `execution_repo_root`，并将 PID、command、cwd、期望 repo root 和 `local_service_owner_check` 写入 `browserPrecheck`。
- 若端口被其它 workspace 占用，先记录 `RECOVERING / LOCAL_SERVICE_WORKSPACE_MISMATCH`，精确关闭该端口旧 dev server，再按 `.trae/PROJECT_CONTEXT.md` 的 `start_command_template` 在当前 `execution_repo_root` 重启目标 app；禁止批量 kill `node` / `emo` / `edenx`。
- 关闭 / 重启 / 复查结果写入 `browserPrecheck.portRecovery`。只有重启后端口归属为 `matched_current_execution_repo`，并重新打开 vmok 业务页取得的 DOM、Network、Console 或 `[BAM_MOCK_HIT]` 才可作为当前仓库证据；恢复失败才记录 `BLOCKED / LOCAL_SERVICE_WORKSPACE_MISMATCH`。
- 页面必须不是 SSO、空白页、错误页或仅加载失败页，并能取得 DOM/snapshot 或等价页面状态证据。
- 必须记录浏览器能力：`browser_runtime_mode`、`browser_tool`、`headless`、`browser_capabilities`、`network_evidence_level`、`browser_session_reuse`、`builtin_browser_result`（仅桌面）、`open_method`、`browser_profile` 或 `storage_state`、`sso_result`。
- `TRAE_DESKTOP` 下内置浏览器无法复用登录态、无法打开 vmok 壳、落到 SSO，或当前自动化工具不能指定持久化 Profile 时，才进入固定 Profile fallback：`.trae/browser-profiles/ecop-vmok-agent-browser`。
- 桌面 fallback 前必须确保 Profile 目录存在；若工具支持 user data dir，必须显式使用该目录；若工具不能指定 Profile，使用系统 Chrome 持久化启动方式打开 vmok URL，并记录 `open_method` 与 `browser_profile`。`COCO_CLI_HEADLESS` 下必须使用 headless user data dir / storage state 复用登录态。
- 禁止读取 cookie、localStorage、sessionStorage、Authorization 或 SSO 票据；后续请求只能依赖页面上下文自然携带认证。
- 当前 `Browser Runtime Mode` 下无法复用登录态、打开业务页或取得必要证据时，停止本接口更新，记录 `BLOCKED / BROWSER_PRECHECK_FAILED`；无头分支缺登录态时记录 `ENV_ISSUE / HOST_AUTH_REQUIRED`，不得切换到有头浏览器绕过。
- 缺少目标 vmok URL 时，记录 `BLOCKED / VMOK_URL_REQUIRED`，不得继续伪造页面触发或请求证据。

前置检查结果必须写入接口 `manifest.json` 的 `browserPrecheck`；后续真实响应合同采集和最终 patched BAM 验证都必须复用该浏览器会话、同一个固定 Profile 或同一个 headless storage state。

### 2. 记录调整日志

每一次调整 mock 规则前，必须先追加或更新 `mock/mock-log.md`，然后才能修改 `rule-map`、manifest、runtime 或 BAM marker。

日志条目必须来自 `/delivery:mock` 当前执行上下文与 `09-test-case-matrix.md` 的 `case_id + ruleId + apiName`，并记录：

- 时间：使用当前本地时间，包含时区，例如 `2026-06-16 14:30 Asia/Shanghai`。
- 来源：`/delivery:mock`，并记录 `origin_stage` 为 ``verify` / `design`。
- 调整原因：说明为什么需要调整 mock，不能只写“补数据”。
- 关联恢复点：requirement / task / case / rule / resume_command。
- 受影响接口：`apiName`、method、path、目标 BAM 文件。
- rule-map 预期变更：
  - 新增：列出 ruleId、关键 request key/value、mock key 和目标覆盖策略。
  - 修改：列出 ruleId、原行为、目标行为、关键 request key/value 是否变化。
  - 删除：列出 ruleId、删除原因、runtime / `ruleMatchKeys` 清理要求。
  - 保留：列出需要保持稳定的 ruleId，说明为什么不改。
- 验证计划：最终 patched BAM 验证方式和需要恢复重跑的 task / case。
- 执行状态：先写 `planned`；完成后更新为 `applied`、`verified` 或 `blocked`。

如果调整过程中发现新增 API、rule、case 或 request key/value 变化，必须在实际修改前补一条 `scope update` 日志；不得先改 `rule-map` 再补日志。

### 3. 分析接口与规则边界

只处理本轮受影响接口。对每个接口先判断当前调整内容：

- `保留`：已有规则继续存在，保留稳定 `ruleId`。
- `新增`：为新功能验证增加规则、case 分支、runtime 分支和断言。
- `修改`：改变已有规则行为，并同步调整 `rule-map`、manifest、runtime 和断言。
- `删除`：从当前接口目标状态中移除规则，并移除 runtime 分支、`ruleMatchKeys` 和验证要求。

分析时必须确认：

- UI 落点是什么，属于哪个 requirement / case。
- 依赖哪个 BAM 接口、method、path、BAM 函数和目标文件。
- 请求里哪些字段真正影响 mock 规则。
- 每个关键请求字段的 key/value 是什么。
- 候选 request 字段必须分类为 `影响字段` 或 `非影响字段`；只有会改变 rule 命中、返回数据、目标记录、分页场景或提交断言的字段才能进入 `requestFieldsAffectingRules` / `ruleMatchKeys`。
- 若影响字段已存在于页面状态、store 参数或 service 入参，但 UI 自然请求 / BAM runtime 的 `requestBody` 中缺失，必须先查 `04-tech-plan.md`、技术文档或 BAM evidence，确认该字段是当前已确认合同字段。只有合同证据存在时，才检查目标 BAM wrapper 是否丢弃字段；确认是 wrapper 映射缺失时，不返回 `/delivery:plan`，在本 skill 内记录 `wrapper_request_mapping` 字段 patch，并使用 `BAM_MOCK_WRAPPER_FIELD` marker 补齐透传。若合同证据不存在，不得把业务代码里的字段当作 mock 依据，必须返回代码修正或计划补合同。
- `09-test-case-matrix.md` 中 `request key/value` 必须按影响性解释：该列只允许包含影响 mock 规则命中的 key，并必须有具体 value，例如 `has_author_subject=false` 对应“无舆情主体”case、`has_author_subject=true` 对应“有舆情主体”case。非影响但真实请求需要携带的 key 不得出现在矩阵 `request key/value`；生成实际 rule 时优先从 UI 自然操作产生的真实页面请求中采集这些字段，写入 `realRequest` / `collectionOnlyFields` / `responseContract.request`。只有进入本 skill 后完成两轮 UI 自然点击仍无法定位必要接口时，才能把这些非影响字段以 `collectionOnlyFields(source: "synthetic_contract")` 标为合成采集字段。
- 若同一请求影响字段的不同 value 会改变 mock 规则、目标 response 分支或验证断言，必须拆分 `ruleId` 和 test case；不得在一个 case 或一个 rule 中同时承载 true/false、多个枚举分支或多个互斥业务场景。
- 默认分页、默认 page_size、路由 tab、UI 本地状态、trace/token/时间戳、仅用于让请求成功但不改变当前需求场景的字段，都不得作为 mock 匹配字段。
- 真实接口采集需要的完整自然请求是什么；非影响但后端必需或有助于拿到真实成功响应的字段，必须优先使用页面真实值或上游真实请求值记录在 `realRequest` 中，不得因为它们不进入 `ruleMatchKeys` 就删除。例如仅用于请求真实详情的 `id`、业务上下文字段、默认分页、固定筛选、环境参数等，若不改变当前 mock 规则，只能作为采集字段，不得作为匹配字段。
- mock response 如何在真实响应基础上改写；如果 UI 请求点可达但因安全、权限、写接口副作用或环境策略不能发到后端，必须使用 `no_response_data` rule，保留 matcher 和 warning runtime；如果必要接口两轮 UI 自然点击仍无法定位请求，允许使用 `synthetic_contract` rule，保留 matcher、synthetic request / response、两轮尝试证据和 real verify 回收项；其他 UI 请求点不可达场景仍必须说明阻塞原因并保持 rule `pending` / `blocked`，不得生成可命中的 runtime 改写规则。
- mock key、mock 规则、覆盖场景、验证断言和 real verify 如何记录；实际覆盖值必须来自真实响应基线或规则明确的最小字段覆盖，不得从计划矩阵的静态示例值反推。
- BAM 类型、请求字段或响应字段缺失时，必须通过接口 manifest 的字段 patch 或 temporary mock API 记录，并在 BAM marker 中带 `BAM_MOCK` 注释插入。
- BAM wrapper 请求映射缺失时，必须通过 manifest `requestFields` 记录 `kind: "wrapper_request_mapping"`、`fieldPath`、`expression`、`targetObject`、`evidence`、`reason`、`realVerify`，其中 `evidence` 必须包含技术合同来源和运行态 wrapper 缺字段证据，并在目标 BAM wrapper 的 request object 中带 `BAM_MOCK_WRAPPER_FIELD_START/END` 注释插入。示例：`has_author_subject: _req['has_author_subject']`。

接口分析必须先产出真实采集输入：

- `apiName`、method、path、BAM 函数名和目标 BAM 文件。
- 目标 vmok URL、页面路径、自然 UI 触发路径和可复现操作。
- `requestFieldsAffectingRules` 与每个 rule 需要观察的 request key/value。
- `requestFieldImpact`：每个进入 `requestFieldsAffectingRules` 的字段必须写明影响类型、影响原因和对应 UI 落点。
- `realRequest` 采集形态：完整 method/path/query/body、影响字段、非影响但用于真实采集的字段及字段来源。非影响采集字段必须标记为 `collection_only` 或等价说明，并明确不参与 runtime 匹配。
- 真实请求是否安全：是否只读、是否有副作用、是否允许通过 UI 自然操作触发。不得使用同源 fetch 代替 UI 自然操作关闭 rule。
- 期望观察的 response path、目标覆盖策略、列表 / 分页 / 计数字段和跨字段不变量。
- UI 请求点不可达时的 blocked / pending 记录方式；UI 请求点可达但不能安全发送后端时的 `no_response_data` 记录方式、warning runtime 和后续 real verify 回收方式；必要接口两轮 UI 自然点击仍无法定位请求时的 `synthetic_contract` 记录方式、synthetic marker 和后续 real verify 回收方式。

没有完成上述接口分析，不得进入浏览器真实接口采集。

### 4. 真实响应合同采集

在接口、规则边界和采集目标明确后，复用初始化阶段通过的浏览器会话或固定 Profile 获取自然请求和真实响应。该步骤只用于确定 mock 数据基准，不等同于最终 patched BAM 验证。

采集前必须确认：

- `browserPrecheck.status === "passed"`。
- 已确定目标 API、method/path、BAM 函数、自然 UI 触发路径、关键请求字段和真实采集所需的非影响字段。
- 已确认真实请求是否安全，是否允许自然 UI 触发。
- 已确定要观察的 response path、目标覆盖策略、列表 / 分页 / 计数字段和不变量。

真实接口请求规则：

- 必须通过自然 UI 操作触发目标 BAM 请求，记录脱敏 `realRequest`、真实响应、页面路径、操作路径和 Network 证据。
- 不得使用同源 `fetch`、静态 curl、测试脚本、手写 fixture 或业务代码造数替代 UI 自然操作来关闭 rule。
- 非影响采集字段优先来自真实页面 Network 请求、列表首行 / 当前选中记录、URL / route 上下文或同一业务流上游响应。无法取得真实值时，必须记录缺口并使用允许的替代 response 合同；不得随意编造 `id`、biz key 或权限上下文来伪装真实响应。
- 非影响采集字段可以写入 `realRequest` / `responseContract.request`，但不得写入 `requestFieldsAffectingRules`、`ruleMatchKeys` 或 runtime matcher，除非它们确实改变当前 mock 规则命中或验证断言。
- 对列表到详情链路，必须优先从真实列表响应、当前选中行或 Network 请求中提取真实 `id` / `author_id` / biz key，作为详情请求的 `collectionOnlyFields`。不得用 `mock_*`、`sample_*`、`fallback_*` 这类占位 ID 充当已通过规则 matcher。
- 真实响应必须是可追溯的成功响应。404、失败 body、mocked response、模型补全内容、业务代码 fixture、文档示例、静态样例都不能作为真实响应合同来源。
- 如果无法通过 UI 到达或触发目标请求点，先做两轮 UI 自然点击尝试：每轮必须记录入口、具体点击 / 输入 / 展开动作、预期 Network filter、实际 Network / Console / Screenshot 证据和失败原因。若该接口不是当前 case 的必要接口，则对应 rule 必须在 manifest 中标记为 `pending` / `blocked`，并记录 blocked reason、resume case 和 real verify 回收方式，不得生成可命中的 runtime 改写规则。
- 若两轮 UI 自然点击仍无法定位请求，且 `09-test-case-matrix.md` / 当前 task 证明该接口对当前 case 必要，允许标记为 `synthetic_contract`：必须合成符合接口 method/path/schema 的 request / response，记录 `syntheticContractReason`、`interfaceNecessity`、`uiNaturalAttemptCount >= 2`、两轮尝试证据、字段来源、后续 real verify 回收项，并在 runtime 命中时输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]`。不得把 `synthetic_contract` 写成真实抓包或 `real_browser_request`。
- 如果 UI 请求点已经可达，但因为安全、权限、写接口副作用或环境策略不能向后端发送请求，则对应 rule 必须标记为 `no_response_data`。`no_response_data` 仍然是 active mock rule：必须保留 `caseIds`、`requestFields`、`ruleMatchKeys`、`mockRule`、`realRequest`、`responseContract.source: "no_response_data"`、`runtimeWarning`、`verifyAssertion` 和验证证据；runtime 命中时必须 `console.warn('[BAM_MOCK_NO_RESPONSE_DATA] ' + JSON.stringify(payload))`，payload 必须包含脱敏 `requestBody` 和明确提醒。

响应合同来源优先级：

1. 浏览器 UI 自然操作得到的真实成功响应。
2. UI 请求点可达但不能安全发送后端时，使用 `no_response_data` mock rule 和 warning runtime。
3. 必要接口经过两轮 UI 自然点击仍无法定位请求时，使用 `synthetic_contract` mock rule，并显式标记 synthetic request / response。
4. 其他 UI 请求点不可达时，只能记录 blocked / pending 和回收方式；不得降级生成可命中的 runtime。

每次真实请求尝试还必须按 rule 写入 `mock/real-connect/<apiName>/<ruleId>/`：

- 成功请求：`request.json` 记录脱敏完整请求；`response.raw.txt` 先记录脱敏后的浏览器真实 XHR/fetch raw body；`response.json` 必须由 `response.raw.txt` 解析转换得到；`evidence.json` 记录触发方式、页面、时间、Network/console 证据、采集人/agent 和关联 `ruleId`。`realConnectArtifact.rawResponse` 必须引用 `response.raw.txt`。
- `response.raw.txt` 是原始抓包证据，允许保持未格式化 / minified JSON 原文；`response.json` 是机器校验用结构化产物，必须从 raw 文本解析、脱敏后确定性生成，不能从 Network Preview、控制台折叠对象、LLM 摘要或手工重写内容复制。保存后必须用脚本读取 `response.json` 并校验关键 response path 的数组长度、count/total 和请求分页字段一致。
- UI 不可达阻塞：记录尝试入口和请求形态，并把 `status` 标记为 `blocked`，写明 `blockedReason`、resume case 和 real verify 回收方式。
- UI 可达但不能安全发后端：记录请求形态，并把 `status` 标记为 `no_response_data`，写明 `noResponseDataReason`、脱敏请求、warning payload 和 real verify 回收方式；这类 rule 仍然必须可被 matcher 命中。
- 必要接口两轮 UI 自然点击仍无法定位请求：`request.json` 记录合成请求并标明字段来源，`response.json` 记录合成响应，`evidence.json` 记录两轮 UI 尝试、接口必要性、合同生成依据和 real verify 回收方式；把 `status` 标记为 `synthetic_contract`。这类 rule 仍然必须可被 matcher 命中，但所有证据和 runtime 日志必须显示 synthetic 标记。
- 每条 active rule 的 `realConnectArtifact` 和 manifest 的 `realConnect.artifacts[]` 都必须引用这些文件；不能只在文字里声称已请求，也不能用一个 `all-active-rules` 记录代替多条 rule。

响应合同必须写入接口 manifest：`realRequest`、`realResponseBody | realResponsePath`、`mockedResponseBody | mockedResponsePath`、`mockOperations`、`responseContract.source`、`responseContract.evidence`、`browserPrecheck`、`realConnect`、`realVerify`。`rule-map.md` 可展示摘要，`rule-map.json` 不得保存这些完整事实字段。

### 5. 编写 manifest 规则和总映射

在接口 `manifest.json` 中记录每个接口的全部 active rule；同步更新 `rule-map.json` 的最小索引和 `rule-map.md` 的人工摘要。

写入 manifest、`rule-map.json/md` 前，必须确认 `mock/mock-log.md` 已存在本次调整的 `planned` 或 `scope update` 记录，且其中列出的新增 / 修改 / 删除 ruleId 与即将写入的索引和 manifest 变更一致。

`rule-map.json` 每条 rule 只能包含：

- `ruleId`
- `caseIds`
- `isDefault`
- `changeType`
- `requestFields`：关键影响请求字段 key/value

manifest 每条规则必须包含：

- `ruleId`
- `caseIds`
- `changeType`：`保留` / `新增` / `修改` / `删除`
- `requestFields`：关键影响请求字段 key/value
- `mockRule`：需要怎样构造请求匹配与响应数据
- `realResponseBody` 或 `realResponsePath`：UI 自然操作得到的完整真实成功响应；内联 body 必须与 `realConnectArtifact.response` 完全一致，path 必须指向该 response 文件。`synthetic_contract` rule 不填真实响应，使用显式 synthetic `mockedResponseBody | mockedResponsePath`。
- `mockedResponseBody` 或 `mockedResponsePath`：按 `mockOperations` 推导出的完整审核期望响应，只用于检查；path 必须指向当前 workspace `mock/` 内完整 JSON，不得直接插入 BAM
- `mockOperations`：BAM runtime 实际执行的字段级改写动作；`synthetic_contract` rule 可不填，runtime 读取 manifest 中完整 `mockedResponseBody | mockedResponsePath` 并返回带 synthetic marker 的响应
- `realRequest`
- `responseContract`：真实响应来源、证据、是否补字段
- `uiTarget`
- `verifyAssertion`
- `realVerify`
- `verify`
- `requestFields`：如需字段 patch，记录类型字段补丁或 wrapper request 字段透传补丁；wrapper 透传补丁必须说明为什么现有 BAM wrapper 丢字段、补丁表达式和回收方式

完整性要求：

- manifest 必须枚举接口当前全部 active rule，不得只保存本轮新增 / 修改 rule。`rule-map.json` 的最小索引必须与 manifest 全量一致。
- `script.mjs` 是 manifest 的派生说明，`verify.mjs` 只能作为补充入口；手写脚本只检查 ruleId、文件存在或当前 BAM inline marker，不能替代 `manifest-gates.mjs` 与 `verify-bam-mock.mjs`。实际 BAM update / clean restore 场景再使用 `reapply-bam-mocks.mjs` 验证全量恢复能力。
- 任一 active rule 缺少响应正文 / 路径、rule 级 real-connect 文件或 runtime operations / warning 合同，必须判定 `MANIFEST_REAPPLY_INCOMPLETE` 并停止 patch。

规则约束：

- 每个接口必须有且只能有一个默认规则。
- 默认规则可返回原响应，也可做通用 mock；必须在 manifest 中显式标记 `isDefault: true`。
- 默认规则的 `requestFields` 必须为空。只要需要依赖请求字段命中，就不是默认规则，必须拆成新的非默认 rule。
- 无关字段不得作为匹配条件。
- `ruleMatchKeys` 只能使用已在 `requestFieldImpact` 中登记为影响字段的 key。
- 一个影响 request key/value 组合只能对应一个 `ruleId`。
- 同一个 `ruleId` 只能容纳同一组影响 request key/value；自然请求中的非影响采集字段可以不同，但必须记录为 `collectionOnlyFields` / `realRequest`，不得进入 `ruleMatchKeys`。若影响字段 value 不同会改变 mock 规则、response 分支或断言，必须拆分 `ruleId` 和 test case。
- response 只能作为 mock 输出，不能作为 runtime 匹配依据。
- `mockedResponseBody | mockedResponsePath` 只能作为审核输出，不能作为普通 rule 的 BAM runtime 直接返回值；runtime 只能调用原接口获得当前 response，再执行 `mockOperations`。只有显式 `synthetic_contract` 可直接读取该完整合同。
- 删除规则不得出现在 `ruleMatchKeys`，也不得继续出现在 runtime 可命中分支中。

规则设计见 [`references/mock-rule-design.md`](references/mock-rule-design.md)。

### 6. 生成接口 runtime 并替换 BAM marker

每个接口只维护一个 `mock/apis/<apiName>/script.mjs`。脚本必须：

- 接受 request 和原 response。
- 按 `ruleMatchKeys` 匹配 `ruleId`。
- 唯一命中具体规则时，必须先调用原接口取得当前真实 response，再应用该 rule 的 `mockOperations`。
- no-hit 时走默认规则；默认规则无 mock 时返回原响应。
- 任意多 rule 命中都必须无例外优先判定为 matcher 配置错误，并统一输出单参数字符串日志：`[BAM_MOCK_MATCH_ERROR] ${JSON.stringify(payload)}`。payload 必须包含脱敏 `apiName`、`matchedRuleIds`、`matchedRequestFields`、`requestBody`、`suggestedRuleId` 和提示需要新增更精确组合 `ruleId` 的信息；不得包含 `originalResponse`，不得输出成功 mock hit、`BAM_MOCK_NO_RESPONSE_DATA` 或 `BAM_MOCK_SYNTHETIC_CONTRACT`。
- 多规则命中中若包含 `no_response_data` 或 `synthetic_contract` rule，不得发送原后端请求，必须直接返回 `BAM_MOCK_MATCH_ERROR` 安全错误对象；否则可以调用原接口并返回原响应，但 console payload 仍不得包含原响应内容。
- 成功 mock 时输出单参数字符串日志：`[BAM_MOCK_HIT] ${JSON.stringify(payload)}`。payload 必须包含脱敏 `apiName`、`ruleId`、`requestBody` 和 `mockedResponse`。不得使用 `console.info('[BAM_MOCK_HIT]', payloadObject)`，因为浏览器 console 会折叠对象，自动化工具无法稳定读取字段。
- `no_response_data` rule 命中时不得发送原后端请求，必须输出单参数字符串 warning：`[BAM_MOCK_NO_RESPONSE_DATA] ${JSON.stringify(payload)}`。payload 必须包含脱敏 `apiName`、`ruleId`、`requestBody`、`message` / `reminder`，用于提醒该请求因安全、权限、写接口副作用或环境策略未发送后端。
- `synthetic_contract` rule 命中时不得发送原后端请求，必须输出单参数字符串 warning：`[BAM_MOCK_SYNTHETIC_CONTRACT] ${JSON.stringify(payload)}`，payload 必须包含脱敏 `apiName`、`ruleId`、`requestBody`、`mockedResponse`、`syntheticContractReason` / `reason` 和 real verify 提醒；随后可输出 `[BAM_MOCK_HIT]` 作为数据 mock 命中证据。
- 异常时返回原响应，不吞掉原接口错误。
- 当 `realConnect.status` 或 `finalVerification.status` 为 `blocked` 时，BAM marker 只能保留为 `blocked_noop` 恢复点，不得生成会改写 response 的 runtime patch。`no_response_data` 和 `synthetic_contract` 不属于 blocked：必须生成可命中的 warning / marker runtime。

Wrapper request 字段透传 patch 必须：

- 只 patch 目标 `apiName` 对应的 BAM wrapper。
- 只在已有 request object / `data` object 中插入缺失字段映射，不重写整个 wrapper。
- 使用标准 marker：
  `/* BAM_MOCK_WRAPPER_FIELD_START <apiName>.<fieldPath> */`
  `/* BAM_MOCK_WRAPPER_FIELD_END <apiName>.<fieldPath> */`
- 插入表达式必须来自已有 wrapper 入参，例如 `_req['has_author_subject']`；不得填静态 mock value。
- patch 后最终验证必须证明 runtime 收到的 `requestBody` 中包含该字段和值，再继续 rule hit / response mock 验证。
- `delivery-mock.md` 必须记录该 patch 是临时 BAM mock wrapper patch，真实 BAM / IDL 同步后需要回收。

从真实响应生成 runtime 的规则：

- 以浏览器取得的真实成功响应或明确标记的合同响应作为规则的响应基准；`synthetic_contract` 的基准只能用于当前 mock 数据验证，不得声称已代表真实后端。
- runtime 执行时优先克隆当前接口原 response，再按命中 rule 对目标 response path 做最小改写。
- 只有当原 response 缺少合同中已确认的父级结构时，才按合同创建最小父级结构；不得大面积重造接口返回。
- 禁止把 `mockedResponseBody`、旧 `responseBody` 或 plan/static fixture 直接作为 `Promise.resolve(...)` 返回。
- 数组、分页、计数、ID、状态、权限、列配置、跨字段不变量必须与响应基准保持一致；mockRule 改写了列表长度或筛选结果时，必须同步更新对应 total/count/hasMore 等字段。
- 字段值来自真实响应时保持原始类型；字段值来自补字段合同时，必须在 rule 中记录来源、覆盖值生成依据和真实接口接入后的 real verify。
- 默认规则没有 mock response 时必须返回原 response；不能用响应基准替代默认真实返回。

匹配算法见 [`references/matching-algorithm.md`](references/matching-algorithm.md)。

接口脚本完成后，直接用该接口 `manifest.json` 替换 BAM 中对应接口 marker：

```bash
node .trae/skills/bam-mock-runtime-generator/scripts/init-bam-mock.mjs \
  --manifest artifacts/<task>/mock/apis/<apiName>/manifest.json \
  --bam-root <src/bam/service> --apply
```

Patch 规则：

- 只替换当前接口 marker。
- 不清空其他接口 mock。
- marker 缺失时，在当前接口原始请求 return 前插入 marker。
- marker 边界损坏、跨接口冲突或无法确定接口落点时，停止 patch，并先修复 manifest 的 BAM 落点或请求用户确认。
- 字段 patch 和 temporary mock API 必须带 `BAM_MOCK` 注释，且只能服务当前接口验证。

Patch 模式见 [`references/bam-patch-patterns.md`](references/bam-patch-patterns.md)。

### 7. 最终 patched BAM 验证审核

只在 patched BAM 上做最终审核。

```bash
node artifacts/<task>/mock/apis/<apiName>/verify.mjs

node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs \
  --manifest artifacts/<task>/mock/apis/<apiName>/manifest.json \
  --bam-root <src/bam/service>
```

验证标准：

- UI 相关 rule 优先通过自然页面操作产生 `[BAM_MOCK_HIT] <json>` 单行字符串日志，用于证明真实页面请求可以命中 patched BAM。
- mock runtime 必须从同一条 hit 字符串中解析 JSON，并验证 request key/value、`ruleId` 和 mocked response。
- 多规则命中必须从 `[BAM_MOCK_MATCH_ERROR] <json>` 解析 `matchedRuleIds`、`matchedRequestFields`、`requestBody` 和 `suggestedRuleId`，确认没有输出成功 mock hit、`BAM_MOCK_NO_RESPONSE_DATA` 或 `BAM_MOCK_SYNTHETIC_CONTRACT`，并把结论标记为需要新增更精确组合规则。
- UI 落点已经实现且可自然操作时，继续验证 UI 断言；若 UI 落点不可达，不得回到 Code 补 mock，应返回原 verify / design case 按代码、环境或合同问题分类。
- 非 UI rule、页面不可用或 UI 落点暂不可达时，允许 patched BAM API / BAM 测试入口验证 mock runtime，但必须在接口 `manifest.json` 记录原因，`rule-map.md` 可展示摘要。
- 多规则命中必须判定失败；no-hit 默认规则必须按预期返回 mock 或原响应。
- 每条 active rule 都必须有最终验证结论；`sample_coverage_synthetic` rule 的验证结论只能表述为 `SUPPLEMENTAL_ONLY`，不得写成真实接口验证通过。
- 接口 `manifest.json` 中的验证状态是机器审查依据；`rule-map.md` 可同步展示摘要，`rule-map.json` 不保存验证状态。
- 验证完成后必须回写 `mock/mock-log.md` 当前条目的执行状态和验证证据摘要。
- 只有 mock runtime 验证通过后，接口 manifest 中对应 rule 才能标记 `verify.status: "passed"`；业务 UI 验收状态单独记录，不用于判断 mock 规则是否完成。

审核规范见 [`references/gate-closure.md`](references/gate-closure.md)。

## Scripts

- `scripts/manifest-gates.mjs`：校验单接口 `manifest.json` 的完整规则事实，并校验 `rule-map.json` 的索引结构、重复项、缺失或过期索引。
- `scripts/init-bam-mock.mjs`：读取单接口 manifest，替换 BAM 对应接口 marker。
- `scripts/reapply-bam-mocks.mjs`：BAM update 后预检当前 workspace 全部 manifest，并从 manifest / real-connect 全量重插全部接口 mock。
- `scripts/verify-bam-mock.mjs`：读取单接口 manifest、`mock-log.md` 和可选 rule-map，执行最终 patched BAM 验证审核。

## 完成输出

完成本 skill 时必须说明：

- 本次调整的接口和 `ruleId`。
- `mock-log.md` 中本次调整记录的位置和状态。
- `rule-map.json/md` 与接口 `manifest.json` 的位置。
- 替换的 BAM 文件和 marker。
- BAM update 后可全量重插能力的说明；只有实际执行过恢复时才需要说明全量重插命令、`rehydration.status` 与证据。
- 最终 patched BAM 验证方式：浏览器自然操作 / BAM API / BAM 测试入口。
- 每条 rule 的最终验证状态和未通过原因。
