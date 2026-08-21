# 最终 Patched BAM 验证审核规范

审核只发生在 patched BAM 最终验证阶段。

## 审核输入

- `mock/rule-map.json`
- `mock/rule-map.md`
- `mock/mock-log.md`
- `mock/apis/<apiName>/manifest.json`
- `mock/apis/<apiName>/verify.mjs`
- patched BAM 中的接口 marker
- 初始化阶段浏览器前置检查记录
- 响应合同来源记录
- `mock/real-connect/<apiName>/<ruleId>/` 下每条 active rule 的真实请求成功或阻塞证据
- 浏览器自然操作或 patched BAM API / BAM 测试入口证据

## 通过条件

- 每条 active rule 都有最终验证结论。
- manifest 枚举当前接口全部 active rule，且每条 rule 的完整 request / response / operations / warning / real-connect 数据均可由标准生成器读取；只存在于 BAM inline patch 的规则不得通过。
- 本次调整在 `mock/mock-log.md` 中有调整前记录，且记录的新增 / 修改 / 删除 ruleId 与 `rule-map.json` 索引和 manifest 实际变更一致。
- 每条 active rule 都有响应合同来源；真实响应可用时必须来自浏览器真实接口请求。只有 UI 请求点不可达时才允许 blocked；UI 可到达请求点但因安全、权限、写接口副作用或环境策略不能安全发送后端时，必须使用 `no_response_data` 合同和 warning runtime；必要接口两轮 UI 自然点击仍无法定位请求时，可以使用 `synthetic_contract` 合同，但必须记录两轮尝试、接口必要性、synthetic request / response 和 real verify 回收项。
- 每次声称真实接口请求成功或失败，都必须有 `real-connect` request / response / evidence 或 blocked 证据。
- 每条 active rule 必须有独立 `realConnectArtifact`；不得用接口级 `all-active-rules` 证据代替。
- 默认规则不得携带任何 requestFields；出现请求影响字段时必须拆成非默认 rule。
- 非影响字段必须记录在 `collectionOnlyFields`，且不得出现在 `ruleMatchKeys` 或 `requestFieldsAffectingRules`。
- 若 BAM wrapper 丢失当前 rule 需要的已确认合同 request 字段，必须存在 `BAM_MOCK_WRAPPER_FIELD` marker 和 manifest `requestFields(kind: "wrapper_request_mapping")` 记录；记录必须同时包含技术合同来源和运行态 wrapper 缺字段证据，最终验证必须证明 patched BAM 收到的 `requestBody` 包含补齐字段和值。若技术文档没有提到该字段，不得用 wrapper patch 通过 gate。
- BAM marker 不得直接返回 `responseBody`、未标记的 `mockedResponseBody | mockedResponsePath` 或静态 fixture；真实 response 可用的 rule 必须先调用原接口，再基于当前 response 执行 `mockOperations`。`no_response_data` rule 只允许输出 warning runtime 和安全响应，不得 fake success。`synthetic_contract` rule 是唯一可直接返回完整 `mockedResponseBody | mockedResponsePath` 的例外，且必须输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]`。
- UI 相关 rule 优先使用浏览器自然操作验证，并产生 `[BAM_MOCK_HIT] <json>` 单行字符串日志。
- 必须解析 hit 字符串前缀后的 JSON；不得依赖浏览器 console 展开的对象参数。
- hit JSON 中的 request key/value 与 manifest rule 和 `rule-map.json` 索引一致。
- hit JSON 中的 `ruleId` 与预期一致。
- hit JSON 中的 mocked response 满足 `mockRule` 和 `verifyAssertion`。
- UI 落点已经实现且可自然操作时，UI 断言通过。
- UI 落点不可达时，记录原 verify / design case 待闭合项并按代码、环境或合同问题分类。
- no-hit 默认规则、异常 fallback 均按预期返回。
- 任何多规则命中都必须无例外产生 `[BAM_MOCK_MATCH_ERROR] <json>` 单行字符串日志，JSON 中包含 `apiName`、`matchedRuleIds`、`matchedRequestFields`、`requestBody`、`suggestedRuleId` 和提示需要新增更精确组合 `ruleId` 的信息；JSON 不得包含 `originalResponse`。若命中的规则中包含 `no_response_data` 或 `synthetic_contract`，必须确认未发送原后端请求并返回安全错误对象；否则确认返回的是原接口响应。
- 无响应数据 rule 必须产生 `[BAM_MOCK_NO_RESPONSE_DATA] <json>` 单行字符串日志，JSON 中包含 `apiName`、`ruleId`、`requestBody`、`message` 或 `reminder`，提醒该请求未发送后端，并确认没有输出成功 `[BAM_MOCK_HIT]`。
- synthetic 合同 rule 必须产生 `[BAM_MOCK_SYNTHETIC_CONTRACT] <json>` 单行字符串日志，JSON 中包含 `apiName`、`ruleId`、`requestBody`、`mockedResponse`、`reason` 或 `reminder`，提醒该响应来自两轮 UI 尝试后生成的 synthetic 合同，并确认 real verify 已登记。
- 非 UI rule 或页面不可用时，允许 API / BAM 测试入口验证，但必须记录 fallback 原因。

## 失败条件

- request 字段被过滤或缺失。
- 缺少本次 `mock/mock-log.md` 调整前记录，或日志中的新增 / 修改 / 删除 ruleId 与实际 `rule-map.json` 索引和 manifest 变更不一致。
- 规则未命中。
- 同一次请求命中多个具体规则，且未输出 `[BAM_MOCK_MATCH_ERROR] <json>`、未展示冲突请求字段、未给出新增组合 `ruleId` 提示，或错误输出为 `[BAM_MOCK_NO_RESPONSE_DATA]` / `[BAM_MOCK_SYNTHETIC_CONTRACT]`。
- 同一次请求命中多个具体规则且已正确输出 `[BAM_MOCK_MATCH_ERROR] <json>` 时，最终验证仍不得通过；结论必须记录为 mock 规则需要调整。
- 命中 ruleId 与预期不一致。
- mocked response 与规则不一致。
- UI 落点已实现且可自然操作，但 UI 断言失败。
- 默认规则吞掉具体规则。
- response 合同来源不可追溯，或把失败响应、mocked response、业务代码 fixture 当作真实响应基准；写接口/权限/安全导致无法取得 response 时未使用 `no_response_data` warning rule；两轮 UI 自然点击未完成或接口必要性未说明却使用 `synthetic_contract`。
- 缺少 `real-connect` 证据，却把接口标为真实请求已完成。
- 只有接口级 real-connect 证据，缺少 rule 级 request/response/evidence。
- manifest 只保留 `responseContract.source`、rule 摘要或 inline synthetic preview patch，缺少完整 `mockedResponseBody | mockedResponsePath`、`realResponseBody | realResponsePath`（适用时）、`mockOperations` / warning 合同或 rule 级 real-connect 文件。
- BAM update 后只能靠手工复制旧 marker、读取旧 BAM inline 数据或手写脚本恢复，标准 `reapply-bam-mocks.mjs` 无法从 manifest 全量重建。
- 默认规则使用 request key/value 命中。
- `collectionOnlyFields` 与 `ruleMatchKeys` / `requestFieldsAffectingRules` 混用。
- 运行态 `requestBody` 缺失 rule matcher 必需字段；若该字段有技术合同来源却未使用 `BAM_MOCK_WRAPPER_FIELD` marker 补齐目标 BAM wrapper 透传，则失败；若没有技术合同来源却要求 wrapper patch，也失败并回到业务代码或计划合同修正。
- 非 blocked rule 使用 `mock_*`、`sample_*`、`fallback_*` 占位值作为 matcher。
- 真实 response 可用的 rule 只有 `mockedResponseBody` / 旧 `responseBody`，没有 `mockOperations`。
- 真实 response 可用的 BAM marker 通过 `Promise.resolve(mockedResponse)` 或等价方式绕过原接口。
- 使用业务代码 fixture、fallback store、preview service 或 adapter 造数。
- 不能解释为什么未使用浏览器验证 UI rule，或不能说明 UI 断言为何需要在恢复后的 verify / design active case 中完成。

## 记录要求

最终验证结果写回：

- 接口 `manifest.json` 中每条 rule 的 `verify`、接口级 `browserPrecheck` 和 `finalVerification`。
- `mock-log.md` 中本次条目的执行状态、最终验证结论和证据摘要。
- `rule-map.md` 中可同步展示最终验证摘要；`rule-map.json` 不保存验证状态。

只有 `finalVerification.status === "passed"` 且所有 active rule `verify.status === "passed"` 时，本次接口更新才算完成。
