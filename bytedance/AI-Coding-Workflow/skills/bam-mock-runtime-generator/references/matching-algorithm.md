# Matching Algorithm

Runtime 只根据接口和关键请求字段选择 `ruleId`，不得读取 response 决定规则。

## Inputs

- `mock/apis/<apiName>/manifest.json`
- `rules[]`
- `ruleMatchKeys[]`
- 原始 request
- 原始 response
- 每条 rule 的 response contract
- 每条 rule 的 `mockOperations`

## Steps

1. 读取当前接口 manifest。
2. 从 `ruleMatchKeys` 中取非默认规则作为具体候选。
3. 对每个候选，只比较 `requestFields` 中列出的 key/value。
4. 命中 0 个具体规则：执行默认规则。
5. 命中 1 个具体规则：按该 rule 的合同类型执行；真实响应合同 rule 调用原接口取得当前 response，克隆后执行对应 rule 的 `mockOperations`；`no_response_data` 和 `synthetic_contract` rule 不发送原后端请求。
6. 任意多 rule 命中：无例外优先判定为 matcher 配置错误，统一输出 `[BAM_MOCK_MATCH_ERROR] <json>`，并提示新增更精确组合 `ruleId`；不得输出成功 mock hit、`BAM_MOCK_NO_RESPONSE_DATA` 或 `BAM_MOCK_SYNTHETIC_CONTRACT`。
7. 多规则命中中若包含 `no_response_data` 或 `synthetic_contract` rule，不得发送原后端请求，直接返回 `BAM_MOCK_MATCH_ERROR` 安全错误对象；否则调用原接口并返回原响应，但日志中不得包含原响应内容。
8. 默认规则无 `mockOperations` 时返回原响应。
9. mock 成功时输出一次 `[BAM_MOCK_HIT] <json>` 单行字符串日志。

## Rule Match Key

```ts
type RuleMatchKey = {
  ruleId: string;
  requestFields: Record<string, unknown>;
  isDefault?: boolean;
};
```

规则：

- `requestFields` 只包含关键影响字段。
- 当且仅当一个字段的“缺失 / null / 空字符串”本身决定 mock 分支时，可在该字段值中使用保留常量 `__BAM_MOCK_ABSENT__`。runtime 会把它匹配为 `undefined`、`null` 或 `''`，用于区分“无筛选首屏”和“带筛选查询”等自然请求；不得用它表示未知值、待补值或非影响字段。
- 无关字段、分页、排序、trace、token、时间戳不得作为匹配条件，除非计划明确说明它改变 mock 规则。
- 一个 `ruleId` 可以有多条 `ruleMatchKeys`。
- 一个 request key/value 组合只能对应一个 `ruleId`。
- 每个接口必须有一个默认规则。

## Real Request Fields

`realRequest` 是真实响应合同采集输入，不等于 runtime matcher。

- 真实采集请求应尽量使用完整自然请求。
- 非影响但后端必需或有助于真实成功返回的字段，例如真实 `id`、biz/context、默认分页、固定筛选值，可以并且应该记录在 `realRequest.collectionOnlyFields`。
- `collectionOnlyFields` 的值优先来自页面 Network 请求、当前选中记录、列表行、URL / route 上下文或上游真实响应。
- 若 `09-test-case-matrix.md` 的 `BAM Mock Response Field Coverage Matrix` 在 `request key/value` 中把字段写成 `field=<真实UI获取>`，该字段只能初始化为 `collectionOnlyFields` 采集要求；实际值必须由 UI 自然请求、上游真实响应或合规的 `synthetic_contract` 证据填充，不能把 `<真实UI获取>` 当作 matcher value。
- `collectionOnlyFields` 不参与 `ruleMatchKeys` 匹配、不参与唯一 key/value 检查，也不能决定 `ruleId`。
- 只有字段确实改变 mock 分支、目标记录、分页场景、候选过滤或提交断言时，才允许从 `collectionOnlyFields` 升级为 `requestFieldsAffectingRules` / `ruleMatchKeys`。
- 默认规则没有影响字段；如果 no-hit 之外还要按某个请求字段返回不同数据，必须新增非默认 rule。
- 非 blocked rule 的 matcher 不得使用 `mock_*`、`sample_*`、`fallback_*` 等占位值。真实 ID 应通过 `collectionOnlyFields` 记录其 UI/Network 来源，除非该 ID 本身就是当前 mock 分支条件。

## Response Rules

- 真实响应来自完整 `realResponseBody` / `realResponsePath`；`realConnectArtifact.rawResponse` 必须先保存原始抓包文本，`realConnectArtifact.response` 必须由 raw 文本解析转换得到。`realResponseBody` 必须与 `realConnectArtifact.response` 完全一致，`realResponsePath` 必须直接指向该文件。
- `mockedResponseBody` / `mockedResponsePath` 只用于审核期望输出，不能参与规则选择，也不能直接作为 runtime 返回值。
- 旧 `responseBody` / `responsePath` 是废弃直返 fixture，新产物不得使用。
- runtime 命中 rule 后，优先以当前原 response 为 base 做深拷贝，再按 rule 的 mockRule 修改目标 response path。
- 若原 response 缺少合同确认的父级结构，可以创建最小父级结构；未被合同确认的结构不得凭空创建。
- 字段修改必须由 `mockOperations` 表达；若无法在真实响应基准上表达最小改写，则该接口不得标记通过，应阻塞等待真实响应或补充后端合同。
- 列表长度、分页、total/count、hasMore、列配置、ID 和状态字段必须与真实响应基准及 mockRule 同步，不得只改展示字段；真实响应数组不能为了审核方便被截断成首条或样例。
- 规则执行异常、response 结构异常或数据无法构造时返回原响应。
- 成功 hit payload 必须脱敏，至少包含 `apiName`、`ruleId`、`requestBody`、`mockedResponse`。
- 成功 hit 必须通过 `console.info('[BAM_MOCK_HIT] ' + JSON.stringify(payload))` 输出为单个字符串参数，验证脚本从字符串前缀后的 JSON 解析字段；不得输出对象参数。
- 多规则命中 payload 必须脱敏，至少包含 `apiName`、`matchedRuleIds`、`matchedRequestFields`、`requestBody`、`suggestedRuleId` 和 `message`；不得包含 `originalResponse`。
- 多规则命中必须通过 `console.warn('[BAM_MOCK_MATCH_ERROR] ' + JSON.stringify(payload))` 输出为单个字符串参数；`message` 必须说明需要根据 `matchedRequestFields` 新增更精确的组合 `ruleId`。

## Runtime Generation From Real Response

生成 `script.mjs` 前，为每条 active rule 完成以下转换：

1. 读取 rule 的 `responseContract` 确认来源和证据，确认 `rawResponse` 已落盘，再读取完整 `realResponseBody` 或 `realResponsePath` 指向的 `response.json` 作为基准 response。
2. 读取 `mockRule`，列出需要改写的 response path、目标覆盖策略、列表策略和计数字段。
3. 生成 `mockOperations`，并用它离线推导 `mockedResponseBody` 作为审核期望。
4. 生成命中分支：匹配 request key/value 后，真实响应合同 rule 先调用原接口取得当前 response；`synthetic_contract` rule 不调用后端，直接返回显式标记的 synthetic response。
5. 克隆原 response 后执行 `mockOperations`；若目标 path 不存在，只能创建合同确认的父级结构。
6. 同步更新受影响的不变量，例如 total/count/hasMore、数组长度、枚举文案、权限开关和列配置。
7. 返回 mocked response 并输出脱敏 `[BAM_MOCK_HIT] <json>` 单行字符串。
8. 对 no-hit、默认规则和异常分支保留原 response；多规则命中必须额外输出 `[BAM_MOCK_MATCH_ERROR] <json>`。若多规则命中包含 `no_response_data` 或 `synthetic_contract` rule，必须返回安全错误对象以避免发送原后端请求；字段改写异常必须输出 `[BAM_MOCK_PATCH_ERROR] <json>`。
