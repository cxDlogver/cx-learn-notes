# BAM Patch Patterns

Patch 只以接口为单位执行。`manifest.json` 是单接口 manifest，位于 `mock/apis/<apiName>/manifest.json`。

## Patch Command

```bash
node .trae/skills/bam-mock-runtime-generator/scripts/init-bam-mock.mjs \
  --manifest artifacts/<task>/mock/apis/<apiName>/manifest.json \
  --bam-root <src/bam/service> --apply
```

## Rules

- 直接替换当前接口的 `BAM_MOCK_PATCH_START <apiName>` marker。
- 若 marker 不存在，在该接口原始 request return 前插入 marker。
- 常规新增、修改、删除只影响当前接口 marker，不清空其他接口 mock。
- marker 损坏、跨接口冲突或无法确定边界时，停止 patch，并先修复 manifest 的 BAM 落点或请求用户确认。
- `changeType: "删除"` 的 rule 必须从 runtime 分支和 `ruleMatchKeys` 中移除。
- 请求字段即使只服务 mock，也必须完整进入 BAM runtime。
- Patch 失败时必须返回原请求结果或原 response，不得 fake success。
- 业务代码不得导入 mock 产物，不得在 route/component/hook/store/service/adapter 中造数。

## Field Patch

缺失字段可以通过 manifest 的 `requestFields` / `responseFields` 记录，并由 patch 脚本插入带 marker 的类型字段：

```ts
export interface ExampleItem {
  id?: string;
  /* BAM_MOCK_FIELD_START ExampleItem.mock_status */
  mock_status?: string;
  /* BAM_MOCK_FIELD_END ExampleItem.mock_status */
}
```

真实字段已存在时不得重复插入。

## Wrapper Request Field Patch

当 `04-tech-plan.md`、技术文档或 BAM evidence 已明确当前 case 必需的 request 字段属于接口合同，且 page/store/service 已按合同产生该字段，但 BAM 生成 wrapper 没有透传到真实请求对象时，允许 `/delivery:mock` 在目标 BAM wrapper 内插入最小 request 字段映射。该补丁必须带标准 marker，并记录在 manifest `requestFields` 中：

```ts
const data = {
  author_id: _req['author_id'],
  /* BAM_MOCK_WRAPPER_FIELD_START apiGetPublicOpinionList.has_author_subject */
  has_author_subject: _req['has_author_subject'],
  /* BAM_MOCK_WRAPPER_FIELD_END apiGetPublicOpinionList.has_author_subject */
  page_num: _req['page_num'],
  page_size: _req['page_size'],
};
```

约束：

- 只允许补齐目标 API wrapper 内已存在入参 `_req` 的字段透传。
- 必须先记录技术合同来源；若技术文档没有提到该字段，不得使用 wrapper patch，应修正业务代码或返回计划阶段补合同。
- 不得把静态 mock value 写进 wrapper。
- 不得修改 method/path、调用函数、业务 service、store、adapter 或组件。
- marker 必须能被 cleanup / real BAM 同步阶段按范围删除。
- patch 后必须用 UI 自然操作或 BAM 测试入口证明 `[BAM_MOCK_HIT]` 的 `requestBody` 含补齐字段和值。

## Runtime Patch

Patch 区块必须自包含：

- request key/value 匹配。
- 任意多 rule 命中失败 fallback，并统一输出 `[BAM_MOCK_MATCH_ERROR] <json>`，提示新增组合 `ruleId`。
- 默认规则 fallback。
- 原接口请求调用。
- 基于原接口 response 的 `mockOperations` 字段级改写。
- `[BAM_MOCK_HIT] <json>` 单行字符串脱敏日志。
- 异常 fallback。

`script.mjs` 是接口 runtime 的源说明；真正运行逻辑必须内联到 BAM 对应接口 marker 中。

禁止在 BAM marker 中直接内联 `responseBody`、`mockedResponseBody` 或 plan fixture 并 `Promise.resolve(...)` 返回。`mockedResponseBody` 只用于 manifest/verify 审核；运行时代码必须先调用原接口，克隆原 response，再执行 `mockOperations`。

日志必须使用单个字符串参数：

```ts
console.info('[BAM_MOCK_HIT] ' + JSON.stringify(payload));
```

禁止使用 `console.info('[BAM_MOCK_HIT]', payload)`。浏览器 console 会折叠对象参数，验证脚本只能稳定读取字符串日志中的 JSON。

任何多规则命中都必须无例外使用单个字符串参数：

```ts
console.warn('[BAM_MOCK_MATCH_ERROR] ' + JSON.stringify(payload));
```

payload 必须包含 `matchedRuleIds`、脱敏 `matchedRequestFields`、脱敏 `requestBody`、`suggestedRuleId` 和需要新增更精确组合 `ruleId` 的提示；不得包含 `originalResponse`。该分支不得输出 `[BAM_MOCK_HIT]`、`[BAM_MOCK_NO_RESPONSE_DATA]` 或 `[BAM_MOCK_SYNTHETIC_CONTRACT]`。若命中的规则中包含 `no_response_data` 或 `synthetic_contract`，不得发送原后端请求，必须返回安全错误对象；否则可以返回原接口响应。

字段改写失败必须输出 `[BAM_MOCK_PATCH_ERROR] <json>` 并返回原接口响应，不得 fake success。
