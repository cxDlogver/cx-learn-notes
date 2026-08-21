# Manifest Schema

BAM mock runtime generator 使用三类结构：调整日志 `mock-log.md`、总 `rule-map` 和单接口 `manifest`。

## `mock/mock-log.md`

`mock-log.md` 是每次 mock 调整前的变更意图记录。新增、修改或删除规则前，必须先追加本次日志；执行中扩大范围时，必须在修改前追加 `scope update`。

模板：

```md
# BAM Mock Change Log

## <YYYY-MM-DD HH:mm Asia/Shanghai> - <apiName 或 multi-api> - <planned | scope update | applied | verified | blocked>
- 来源阶段:
- 关联恢复点:
- origin / resume identity:
- 调整原因:
- 受影响接口:
  - apiName:
  - method/path:
  - BAM 文件:
- rule-map 预期变更:
  - 新增:
    - ruleId:
      - request key/value:
      - mock 规则:
      - mock key / target override:
      - 覆盖场景:
  - 修改:
    - ruleId:
      - 原行为:
      - 目标行为:
      - request key/value 是否变化:
  - 删除:
    - ruleId:
      - 删除原因:
      - runtime / ruleMatchKeys 清理要求:
  - 保留:
    - ruleId:
      - 保留原因:
- 验证计划:
- required_resume_checks:
- 执行结果:
- 验证证据:
```

记录要求：

- 时间必须使用当前本地时间并包含时区。
- `rule-map 预期变更` 必须覆盖本次即将写入 `rule-map.json/md` 的新增 / 修改 / 删除 ruleId。
- 只调整 response 数据也必须记录；不能用“补数据”代替具体原因。
- 日志先写 `planned`，最终 patched BAM 验证后更新为 `verified`；阻塞时更新为 `blocked` 并记录原因。
- `mock-log.md` 是审查依据，不替代 `rule-map.json/md` 或接口 manifest。

## `mock/rule-map.json`

```ts
export interface BamMockRuleMap {
  mode: 'BAM_MOCK_RULE_MAP';
  interfaces: BamMockRuleMapInterface[];
}

export interface BamMockRuleMapInterface {
  apiName: string;
  method: string;
  path: string;
  manifest: string; // apis/<apiName>/manifest.json
  rules: BamMockRuleMapRule[];
}

export interface BamMockRuleMapRule {
  ruleId: string;
  caseIds?: string[];
  changeType: '保留' | '新增' | '修改' | '删除';
  isDefault?: boolean;
  requestFields: Record<string, unknown>;
}
```

`rule-map.json` 是机器索引，只能保存上述最小字段；完整规则事实必须写入接口 manifest。`rule-map.md` 是中文人工总览，可展示 manifest 中的完整摘要，且禁止使用 Markdown 表格。使用以下层级模板：

```md
# BAM Mock Rule Map

## 总览
- 任务:
- 产物:
- 接口数量:
- 规则数量:
- 最终验证:

## 接口: <apiName>
- Method / Path:
- Manifest:
- 规则数量:
- 默认规则:
- 影响请求字段:

### Rule: <ruleId>
- 覆盖 case_id:
- 变更类型:
- 最终验证:
- UI 落点:
- 请求匹配:
  - 类型: 默认规则 / 关键影响字段
  - key/value:
  - 影响原因:
- Mock 规则:
- Response key:
- Mock value:
- 覆盖场景:
- 真实响应:
- Mock 后响应:
- Runtime operations:
- 真实接口请求:
  - 完整自然请求:
  - 影响匹配字段:
  - 仅用于真实采集字段:
- 响应合同:
- 验证断言:
- Real verify:
- 验证证据:

#### 响应报文
~~~json
{}
~~~
```

每条 rule 必须独立成块，便于审核单条规则，不得把多条规则压成一行。

## `mock/apis/<apiName>/manifest.json`

```ts
export interface BamMockInterfaceManifest {
  version: 2;
  mode: 'BAM_MOCK_INTERFACE_MANIFEST';
  apiName: string;
  method: string;
  path: string;
  sourceRuleMap: string; // ../../rule-map.json
  rehydration?: BamMockRehydration;
  targetBamFile?: string;
  browserPrecheck?: BamMockBrowserPrecheck;
  realConnect?: BamMockRealConnect;
  responseContracts?: BamMockResponseContract[];
  requestFieldsAffectingRules: string[];
  requestFieldImpact: BamMockRequestFieldImpact[];
  ruleMatchKeys: RuleMatchKey[];
  rules: BamMockInterfaceRule[];
  requestFields?: BamMockFieldPatch[];
  responseFields?: BamMockFieldPatch[];
  temporaryApis?: BamMockTemporaryApi[];
  patch?: {
    status?: 'pending' | 'patched' | 'failed' | 'blocked_noop';
    targetBamFile?: string;
    marker?: string;
    lastPatchedAt?: string;
    notes?: string;
  };
  finalVerification?: {
    status: 'pending' | 'passed' | 'failed' | 'blocked';
    method?: 'browser' | 'api' | 'bam-test' | 'mixed';
    evidence?: string;
    reason?: string;
    verifiedAt?: string;
  };
}

export interface BamMockRehydration {
  strategy: 'manifest_reapply';
  status: 'pending' | 'passed' | 'failed';
  script: string; // .trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs
  command: string; // must include --mock-root and --bam-root
  evidence?: string; // required when status is passed
  verifiedAt?: string;
}

export interface BamMockFieldPatch {
  kind?: 'type_field' | 'wrapper_request_mapping';
  fieldPath: string;
  declaredType?: string;
  targetInterface?: string;
  targetObject?: string; // e.g. data
  expression?: string; // e.g. _req['has_author_subject']
  marker?: string;
  evidence: string;
  reason: string;
  realVerify: string;
}

export interface RuleMatchKey {
  ruleId: string;
  requestFields: Record<string, unknown>;
  isDefault?: boolean;
}

export interface BamMockRequestFieldImpact {
  fieldPath: string;
  impactType: 'rule_branch' | 'record_identity' | 'pagination' | 'submit_assertion' | 'filter_result';
  reason: string;
  uiTarget: string;
}

export interface BamMockInterfaceRule {
  ruleId: string;
  caseIds?: string[]; // all BAM matrix cases sharing this ruleId; required for every active non-default rule
  changeType: '保留' | '新增' | '修改' | '删除';
  isDefault?: boolean;
  enabled?: boolean;
  uiTarget?: string;
  requestFields: Record<string, unknown>;
  mockRule: string;
  responseContract?: BamMockResponseContract;
  realResponseBody?: unknown;
  realResponsePath?: string;
  mockedResponseBody?: unknown;
  mockedResponsePath?: string;
	  mockOperations?: BamMockOperation[];
	  runtimePatch?: {
	    operations: BamMockOperation[];
	  };
	  responseIntegrity?: BamMockResponseIntegrity;
	  realRequest?: BamMockRealRequest | unknown;
		  realConnectArtifact?: BamMockRealConnectArtifact;
	  noResponseData?: boolean;
	  runtimeWarning?: {
	    enabled: true;
	    message: string;
	  };
	  verifyAssertion: string;
	  realVerify?: string;
	  verify?: {
		    status: 'pending' | 'passed' | 'failed' | 'blocked' | 'no_response_data' | 'synthetic_contract';
	    method?: 'browser' | 'api' | 'bam-test';
	    evidence?: string;
	    reason?: string;
  };
}

// Deprecated: responseBody / responsePath were legacy direct-return fixtures.
// New rules must not use them. Use realResponseBody|realResponsePath + mockedResponseBody|mockedResponsePath + mockOperations instead.

export interface BamMockOperation {
  op: 'set' | 'merge_object' | 'delete';
  path: string; // dot path, numeric indexes allowed as items[0].field
  value?: unknown; // required except delete
  source?: 'real_response' | 'ui_real_request' | 'mock_rule';
  reason?: string;
}

export interface BamMockRealConnect {
	  status: 'pending' | 'passed' | 'blocked' | 'no_response_data' | 'synthetic_contract';
  artifactDir?: string; // ../../real-connect/<apiName>
  artifacts?: BamMockRealConnectArtifact[];
  reason?: string;
}

export interface BamMockRealConnectArtifact {
  ruleId: string;
	  status: 'passed' | 'blocked' | 'no_response_data' | 'synthetic_contract';
  request: string;
  rawResponse?: string; // required when status is passed
  response: string;
  evidence: string;
	  blockedReason?: string;
	  noResponseDataReason?: string;
	  syntheticContractReason?: string;
	  interfaceNecessity?: string;
	  uiNaturalAttemptCount?: number;
	}

export interface BamMockBrowserPrecheck {
  status: 'passed' | 'blocked';
  browserRuntimeMode?: 'TRAE_DESKTOP' | 'COCO_CLI_HEADLESS';
  headless?: boolean;
  browserTool?: 'integrated_browser' | 'system_chrome_persistent_profile' | 'playwright_chromium_headless' | 'chrome_devtools_headless';
  builtinBrowserResult?: 'reused' | 'opened' | 'sso_blocked' | 'no_profile_support' | 'failed';
  openMethod?: 'integrated_browser' | 'system_chrome_user_data_dir' | 'headless_browser';
  browserProfile?: string;
  storageState?: string;
  vmokUrl?: string;
  pageState?: 'business_page' | 'sso' | 'blank' | 'error' | 'unknown';
  evidenceLevel?: Array<'dom' | 'screenshot' | 'network' | 'console' | 'same_origin_fetch'>;
  reason?: string;
}

export interface BamMockRealRequest {
  method?: string;
  path?: string;
  query?: Record<string, unknown>;
  body?: unknown;
  headersShape?: string;
  requestFieldsForMatching?: Record<string, unknown>;
  collectionOnlyFields?: Array<{
    fieldPath: string;
    value: unknown;
	    source: 'network_request' | 'selected_record' | 'list_row' | 'route_context' | 'upstream_response' | 'user_provided' | 'synthetic_contract' | 'unknown';
    reason: string;
  }>;
  note?: string;
}

export interface BamMockResponseContract {
  ruleId?: string;
	  source: 'real_browser_request' | 'no_response_data' | 'synthetic_contract';
  evidence: string;
  request?: BamMockRealRequest | unknown;
	  noResponseDataReason?: string;
	  syntheticContractReason?: string;
	  interfaceNecessity?: string;
	  uiNaturalAttemptCount?: number;
  responsePath?: string;
  browserPrecheckStatus?: 'passed' | 'blocked';
  fieldFill?: Array<{
    responsePath: string;
    value: unknown;
    reason: string;
    realVerify: string;
	  }>;
	}

export interface BamMockResponseIntegrity {
  source: 'realConnectArtifact.response';
  mode: 'exact_body' | 'path_reference';
  listAssertions?: Array<{
    responsePath: string;
    requestPageSizeField?: string;
    requestPageNumberField?: string;
    totalField?: string;
    actualLength: number;
    expectedMinLength: number;
  }>;
}
```

字段语义：

- `realResponseBody`：UI 自然操作得到的脱敏完整真实接口成功响应；当存在 `realConnectArtifact.response` 且 status 为 `passed` 时，必须与该文件 JSON 逐字段一致，不得保存首条、可见片段、摘要或示例。真实响应必须先保存 `response.raw.txt`，再由 raw 文本解析转换出 `response.json`。blocked、`no_response_data`、`synthetic_contract` rule 可为空并记录对应原因。`responseContract.body` 已废弃，不得用于保存真实响应。
- `realResponsePath`：当真实响应过大不适合内联时使用，必须直接指向当前 rule 的 `realConnectArtifact.response` 文件；不得指向压缩版、派生版或手写 fixture。
- `realConnectArtifact.rawResponse`：passed rule 必填，指向脱敏后的原始抓包文本 `response.raw.txt`。`response.json` 必须由这个 raw 文件解析转换得到，机器校验读取 `response` 指向的 JSON。
- `mockedResponseBody`：把 `mockOperations` 应用于基准响应后的期望结果，只用于审核 mock 脚本是否满足规则。
- `mockedResponsePath`：响应过大时允许代替 `mockedResponseBody`，必须指向当前 workspace `mock/` 内可读取的完整 JSON；`synthetic_contract` 使用该字段时必须直接指向当前 rule 的 `realConnectArtifact.response`，不得指向 BAM inline patch、摘要文件或派生快照。
- `synthetic_contract` rule 的 `mockedResponseBody` / `mockedResponsePath` 是显式标记的完整 synthetic response，可被 BAM runtime 直接返回用于数据 mock；必须同时记录 `responseContract.source: "synthetic_contract"`、`syntheticContractReason`、`interfaceNecessity`、`uiNaturalAttemptCount >= 2` 和后续 real verify 回收项。
- `mockOperations` / `runtimePatch.operations`：唯一允许写入 BAM marker 的 mock 行为来源。
- `requestFields(kind: "wrapper_request_mapping")`：目标 BAM wrapper 的 request 字段透传补丁记录。只用于 `04-tech-plan.md`、技术文档或 BAM evidence 已确认字段属于当前接口合同，且 page/store/service 按合同传入字段但 BAM wrapper 丢弃字段的场景；必须包含 `fieldPath`、`targetObject`、`expression`、`marker`、`evidence`、`reason` 和 `realVerify`。`evidence` 必须同时说明技术合同来源和运行态 wrapper 缺字段证据。
- `realConnectArtifact`：当前 rule 自己的真实连接证据引用；每条 active rule 必须独立提供，不允许用接口级 all-rules 证据代替。
- `responseBody` / `responsePath`：历史字段，禁止新产物使用；发现时必须返工，只有 UI 请求点不可达时才可标记 blocked。
- `rehydration`：BAM update 后从 manifest 全量重插 mock 的恢复记录，只有实际执行过或准备记录恢复能力时才需要填写。`strategy` 固定为 `manifest_reapply`；`script` 必须引用标准 `reapply-bam-mocks.mjs`；`command` 必须带 `--mock-root` 和 `--bam-root`；只有完成一次 clean/update-compatible 重插后才能写 `status: "passed"` 和证据。常规 mock update 不要求 `rehydration.status: "passed"`。
- 初始化时 `realRequest`、`realResponseBody`、`mockedResponseBody`、`mockOperations` 应为空或 pending，由真实请求和 mock 设计步骤逐步填充。
- `caseIds`：来自 `BAM Mock Response Field Coverage Matrix` 中所有使用当前 `ruleId` 的 case_id。每个 active non-default manifest rule 必须填写非空数组；多个 test case 共用同一个 rule 时，数组必须完整列出全部 case。`caseIds` 只表达覆盖回溯，不改变 runtime matcher。
- `requestFields`：关键影响请求字段 key/value，用于真实 runtime 中匹配 `ruleId`；每个字段必须能在 `requestFieldsAffectingRules` 中找到对应说明。

## Validation Rules

- `apiName + ruleId` 在接口内唯一。
- 每个接口必须且只能有一个默认 `ruleMatchKeys` 行。
- 默认 rule 的 `requestFields` 和默认 `ruleMatchKeys.requestFields` 必须为空；只要出现请求影响字段，就必须拆成非默认 rule。
- 非默认 `ruleMatchKeys.requestFields` 不得为空。
- `ruleMatchKeys.requestFields` 只能使用 `requestFieldsAffectingRules` 中的字段。
- 每个 active non-default rule 必须有非空 `caseIds`；一个 case_id 最多只能对应一个非默认 `ruleId`。
- 每个 active non-default rule 的 `requestFields` 字段都必须出现在 `requestFieldsAffectingRules` 中。
- `requestFieldsAffectingRules` 中每个字段都必须在 `requestFieldImpact` 中有非空影响原因和 UI 落点。
- 默认分页、默认 page_size、route tab、trace/token/时间戳、仅维持请求成功但不改变当前需求场景的字段，不得进入 `requestFieldsAffectingRules`。
- `realRequest` / `responseContract.request` 必须尽量保留完整自然请求；非影响但后端必需或有助于获得真实成功响应的字段应记录在 `collectionOnlyFields`，并说明真实值来源。若 test matrix 用 `field=<真实UI获取>` 表达非影响字段，manifest 必须把该字段转成 `collectionOnlyFields` 采集项，并在真实请求或 synthetic 证据闭合后填入实际来源和值；`<真实UI获取>` 本身不得落盘为最终 matcher value。`collectionOnlyFields` 不参与 `ruleMatchKeys` 唯一性和 runtime 匹配。
- `collectionOnlyFields[].fieldPath` 不得出现在 `requestFieldsAffectingRules`、`ruleMatchKeys` 或 rule 的 `requestFields` 中；若它确实影响 mock 分支，就不能叫 collection-only，必须升级为非默认 rule matcher。
- 真实请求尝试必须按 rule 在 `mock/real-connect/<apiName>/<ruleId>/` 留下 request / response / evidence 或 blocked 证据，并通过 rule 的 `realConnectArtifact` 与 manifest `realConnect.artifacts[]` 同时引用。
- 非 blocked rule 的 matcher 不能使用 `mock_*`、`sample_*`、`fallback_*` 等占位值；真实 ID 默认应来自 UI/Network/上游响应并记录为 `collectionOnlyFields`。`synthetic_contract` rule 只能把合成的非影响字段写入 `collectionOnlyFields(source: "synthetic_contract")`，不得把合成上下文 ID 伪装成 UI 真实值。
- 同一接口中，归一化后的 request key/value 只能出现一次。
- `changeType: "删除"` 的 rule 不参与 runtime patch，也不得出现在 `ruleMatchKeys`。
- `rule-map.json` 和接口 manifest 中相同 rule 的 `caseIds`、`requestFields`、`changeType` 和默认标记必须一致；`rule-map.json` 中不得保存完整响应、合同、证据或 runtime operations。
- 如果 rule 的影响字段无法出现在运行态 `requestBody`，且技术合同确认字段存在、原因是 BAM wrapper 未透传字段，manifest 必须记录 `requestFields[].kind = "wrapper_request_mapping"`，并在目标 BAM wrapper 中存在成对 `BAM_MOCK_WRAPPER_FIELD_START/END` marker。没有技术合同来源时，不得继续生成依赖该字段命中的 rule，也不得用 wrapper patch 兜底业务代码。
- 每次 `rule-map`、manifest、runtime 或 BAM marker 调整前，`mock-log.md` 必须存在对应条目，且条目中的新增 / 修改 / 删除 ruleId 与实际变更一致。
- 非 blocked active non-default rule 默认必须记录 `responseContract.source: "real_browser_request"`、脱敏 `request`、真实响应 `realResponseBody` 或 `realResponsePath`，以及可审计 `realConnect` evidence；`no_response_data` 和 `synthetic_contract` 是例外，必须分别按各自 source 和原因字段显式标记。
- passed rule 的 `realConnectArtifact.rawResponse` 必须存在并指向 `response.raw.txt`；`realConnectArtifact.response` 必须是由 raw 文本解析转换出的 `response.json`。
- 当校验脚本可以读取 `realConnectArtifact.response` 时，`realResponseBody` 必须与该文件完全一致；若使用 `realResponsePath`，它必须指向同一个 `realConnectArtifact.response` 文件。任何摘要、采样、首条截断或派生响应都必须失败。
- 对分页列表接口，若真实请求含 `page_size` / `limit`，且响应列表同级存在 `total` / `total_cnt` / `total_count` 等字段，真实响应列表长度不得小于 `min(page_size, total - (page_num - 1) * page_size)`；否则必须重新采集完整 raw response，只有 UI 请求点不可达时才可标记 blocked。
- 无法通过 UI 到达或触发请求点时，非必要接口或未完成两轮 UI 自然点击尝试的 rule 才能保持 `verify.status: "blocked"` 或 `verifyStatus: "blocked"`，记录 blocked reason 和 real verify 回收方式；只有满足“两轮 UI 自然点击仍无法定位 + 必要接口 + `synthetic_contract` 标记”的 rule 才能生成可命中的数据 mock runtime。
- 已能通过 UI 到达请求点，但因安全、权限、写接口副作用或环境策略而不能向后端发送请求时，rule 必须标记 `no_response_data`。`no_response_data` 仍然是 active mock rule，必须有 `caseIds`、`requestFields`、非默认 `ruleMatchKeys`、`realRequest`、`responseContract.source: "no_response_data"`、`runtimeWarning`、`realConnectArtifact.status: "no_response_data"` 和验证断言；runtime 命中时必须 `console.warn [BAM_MOCK_NO_RESPONSE_DATA]`，payload 必须包含脱敏 `requestBody` 和提醒。
- 当必要接口在两轮 UI 自然点击尝试后仍无法定位到 Network 请求时，rule 可以标记 `synthetic_contract` 并生成可命中的数据 mock。该 rule 必须有 `caseIds`、`requestFields`、非默认 `ruleMatchKeys`、`realRequest`、完整 `mockedResponseBody` 或 `mockedResponsePath`、`responseContract.source: "synthetic_contract"`、`syntheticContractReason`、`interfaceNecessity`、`uiNaturalAttemptCount >= 2`、`realConnectArtifact.status: "synthetic_contract"` 和 real verify 回收项；`request.json`、`response.json`、`evidence.json` 必须真实存在并可被标准脚本读取，runtime 命中时必须输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]`。
- `finalVerification.status` 或 `realConnect.status` 为 `blocked` 时，BAM patch 不能继续标记为 `patched`；若保留 marker 作为恢复点，必须使用 `patch.status: "blocked_noop"`，且 marker 内不得执行 mock 改写。
- 非默认 active rule 必须提供 `mockOperations`；`no_response_data` rule 的 mock 行为是可命中的 warning runtime，不要求 response 改写操作；`synthetic_contract` rule 的 mock 行为是返回显式标记的 `mockedResponseBody | mockedResponsePath` 并输出 synthetic warning，不要求 `mockOperations`。
- 非 blocked、非 `no_response_data`、非 `synthetic_contract` active non-default rule 必须提供 `realRequest`、真实 `realResponseBody` 或 `realResponsePath`、以及完整 `mockedResponseBody` 或 `mockedResponsePath`。
- `mockedResponseBody | mockedResponsePath` 只用于审核，不得由普通 rule 直接内联到 BAM 或由 runtime `Promise.resolve` 返回；显式 `synthetic_contract` 除外。
- 任一 active rule 只存在于 BAM inline patch、`script.mjs`、`rule-map.md` 或摘要式 manifest，而无法仅凭 `manifest.json + real-connect` 文件由标准脚本重建时，manifest 无效；不得以“runtime 已能运行”为理由省略响应合同。
- `rehydration` 不是常规 mock update 的完成门禁。若存在，必须满足字段结构校验；若 `status: "passed"`，证据必须证明标准 `reapply-bam-mocks.mjs` 已在 clean/update-compatible BAM 上恢复当前 manifest 的全部 active rule。
- 最终完成时，每条 active rule 的 `verify.status` 必须为 `passed`，且 UI rule 默认使用 `browser` 验证；无法使用浏览器时必须记录 `fallbackReason` 或 `verify.reason`。
