# Coverage Optimization Plan Round <n>

## 1. 背景与约束

- 轮次: `<n>`
- 状态: `DRAFT|READY|IN_PROGRESS|PASS|PASS_WITH_NOTES|BLOCKED|FAIL`
- 阈值: `90`
- 本轮目标文件: ``
- 本轮目标文件报告: ``
- 最新分支覆盖率报告: ``
- 当前业务仓库: ``
- 本轮开始整体覆盖率: ``
- 本轮结束整体覆盖率: ``
- 本轮选择原因: `按 effectiveUncoveredInsertedRows 最大且未被排除的文件选择`
- 执行策略来源: `coverage-optimization-state.json.execution_policy`
- 全局排除日志: `<workspace>/bits-flow/cov/coverage-exclusion-log.json`
- 覆盖执行环境: 必须使用真实线上环境页面；禁止使用 `localhost` 调试入口、本地 dev server、本地 vmok 子应用或只在本地预览中制造覆盖率。
- 请求边界: 覆盖动作必须由真实线上 UI 发起；读接口和无副作用接口必须真实命中线上后端。BAM MOCK 只能作为请求入参参考，不得接管请求、替换响应或替代真实 UI 覆盖。
- 写接口边界: 会落库、发奖、删除、修改配置、发送通知或产生其他线上副作用的写接口允许由真实线上 UI 触发发送动作，但必须在内置浏览器会话内拦截请求并返回 mock 响应，禁止真实命中后端。不得因为写接口而停止覆盖率 UI 尝试。
- 覆盖率刷新: 浏览器覆盖动作完成后，通过 skill 内 `scripts/collect-huatuo-branch-coverage.js` 触发 Huatuo 分支更新，再拉取 `branch/files` 与 `branch/code` 产物。

## 2. 候选文件选择

| 字段 | 值 |
|---|---|
| Effective uncovered inserted rows |  |
| Files estimate uncovered rows |  |
| Cover ratio |  |
| Insert lines |  |
| File coverage version |  |
| 选择依据 |  |
| 全局排除日志状态 | `NO_MATCH|ACTIVE_SKIP|VERSION_CHANGED_ALLOW|NO_VERSION_RECORDED_ALLOW` |
| 本次 run 处理状态 | `NO_MATCH|ALREADY_TARGETED_SKIP` |

排除候选:

| 文件 | 排除记录版本 | 当前报告版本 | 处理 | 证据 |
|---|---|---|---|---|
|  |  |  | `ACTIVE_SKIP|VERSION_CHANGED_ALLOW` | `coverage-exclusion-log.json#<entry_id>` |

说明: 候选策略以 state 与全局排除日志为准；本节只记录本轮选择证据。全局日志不记录“进入排除”的业务原因，只记录被作为目标文件处理过的文件及当时 `fileCoverageVersion`。`ACTIVE` 项只有在 `source_file_coverage_version` 与当前报告 `fileCoverageVersion` 一致时才继续拦截；版本变化时应先将旧 `ACTIVE` 项标记为 `SUPERSEDED`，再允许该文件重新进入候选。

## 3. 未覆盖行归类

| 分类 | 未覆盖点 | 处理策略 | 原因 |
|---|---|---|---|
| 可删除代码 |  | 删除 | 链路不通、当前需求不可达、被外层组件拦截或与本需求无关 |
| 可精简代码 |  | 合并 / 精简 | 等价逻辑、过度安全防护、抛异常或无收益兜底 |
| 不可达防御 |  | 删除 / 保留并说明 | 类型或外层状态已穷尽，真实线上 UI 无法到达 |
| 可合并逻辑 |  | 合并 | 重复逻辑或链式逻辑可收敛，且不改变业务语义 |
| 应保留逻辑 |  | 通过覆盖补齐 | 属于当前需求真实业务链路 |
| 风险防护 |  | 保留 / 低优先级覆盖 | 异步竞态、真实网络错误或写接口需要浏览器拦截防止线上副作用 |

### 3.1 报告未覆盖代码行

来源: `<workspace>/bits-flow/cov/<cov-run-id>/coverage/results/<target-file>/report.md`。以下行号对应本轮 Huatuo 报告生成时的源码；完成代码优化并刷新 Huatuo 后，行号可能重新对齐当前源码。

#### L<line-range>: <title>

```ts
// 粘贴 Huatuo report 中的未覆盖代码片段
```

处理策略:

- 分类: `UNREACHABLE|OVER_DEFENSIVE|MERGEABLE|UI_COVERABLE|BAM_MOCK_FIELDS_REFERENCE|WRITE_REQUEST_BROWSER_INTERCEPT`
- 结论: `DELETE|SIMPLIFY|MERGE|KEEP_AND_COVER|KEEP_ACCEPTED|BLOCKED`
- 原因:
- 关联需求 / 用例:

## 4. 代码优化方案

### 4.1 已确定优化

1. 删除不可达或与本需求无关代码:
   - 待填写

2. 精简过度安全防护:
   - 待填写

3. 合并重复或链式逻辑:
   - 待填写

4. 删除与本需求无关的新增代码:
   - 待填写

代码规则检查:

- [ ] 链路不通、无法到达、被外层组件拦截而无法进入的代码已删除或从当前需求改动中移除。
- [ ] 过度安全防护、抛异常、宽泛 try/catch、无收益兜底已尽可能精简。
- [ ] 可合并的重复逻辑、链式逻辑已合并，且未改变业务语义。
- [ ] 优化代码符合当前仓库代码规范。
- [ ] 与本需求功能无关的新增代码已删除。

### 4.2 不建议继续删除

| 代码点 | 保留原因 | 覆盖方式 |
|---|---|---|
|  |  |  |

## 5. 覆盖设计总览

| 覆盖任务 | 关联需求 / 用例 | 线上 UI 路径 | 请求入参来源 | 覆盖目标 |
|---|---|---|---|---|
| COV-<n>-01 |  | 真实线上页面 ->  | 优先使用真实 UI / 真实接口 / 真实业务数据位置；不足时记录 blocker，或参考 BAM MOCK 已有入参。 |  |

## 6. 请求入参来源方案

### 6.1 请求接口与入参来源

| 接口 | 方法 | 用途 | 字段来源 | 证据要求 |
|---|---|---|---|---|
|  | `GET|POST` |  | 真实页面 URL / 页面状态 / 真实接口返回 / 真实业务数据位置 / BAM MOCK 已有入参 | 保存 request、response、关键字段和 UI 状态 |

### 6.2 入参取值优先级

1. 真实 UI 当前页面:
   - URL query、页面已加载状态、弹窗选中值、表格候选行。

2. 真实接口返回:
   - 相关列表、详情、校验、提交接口的 request / response。

3. 真实业务数据位置:
   - 后台配置页、候选列表、资源列表、业务记录页面。

4. BAM MOCK 已有入参:
   - 仅在真实页面、真实接口返回或真实业务数据位置无法取得必需字段时参考。
   - 只能作为字段来源记录；实际覆盖仍必须由真实线上 UI 发起。读接口和无副作用接口真实命中后端；写接口由内置浏览器拦截并返回 mock 响应。
   - 不得接管请求、替换响应、使用 BAM runtime mock 或修改 `src/bam/**`。

5. 写接口浏览器拦截:
   - 会落库、发奖、删除、修改配置、发送通知或产生其他线上副作用的写接口必须在内置浏览器会话内拦截并返回 mock 响应。
   - 未覆盖行必须走写接口才能触达时，不得停在请求发出前；应触发真实 UI 操作、拦截写接口、返回 mock 响应，并继续执行 UI 后续分支。
   - 必须记录接口、method、匹配条件、mock response、按钮状态、loading / toast / 弹窗后续状态、拦截证据和未真实命中后端证据。

### 6.3 写接口浏览器拦截方案

| 接口 | 方法 | 触发 UI | 拦截匹配条件 | Mock 响应 | 未触达后端证据 | 覆盖目标 |
|---|---|---|---|---|---|---|
|  | `POST|PUT|DELETE|PATCH` |  | URL / method / body 关键字段 |  | 浏览器 Network / console 记录 / 后端无请求证据 |  |

## 7. 线上执行步骤

1. 进入真实线上页面:
   - 不带本地调试参数。
   - 不启动本地 dev server。
   - 不使用本地 vmok 子应用。

2. 开启请求和 UI 证据记录:
   - 记录本轮相关接口的 request / response。
   - 记录 UI toast、弹窗状态、按钮 disabled / loading 状态。
   - 对写接口预先注入内置浏览器拦截规则，确保请求在到达后端前返回 mock 响应。

3. 按第 5 节覆盖任务执行:
   - 每个任务都通过真实 UI 点击和操作触发请求。
   - 如请求缺少必需字段，先从真实业务数据位置查找。
   - 仍无法获取时，记录 blocker 或参考 BAM MOCK 已有入参；读接口不得替换响应，写接口必须使用内置浏览器拦截响应。
   - 每个任务保留截图或 DOM 断言、Network 请求和响应证据、入参来源记录。

4. 刷新 Huatuo:
   - 使用 skill 内覆盖率脚本触发 `POST /api/jsCoverage/branch`。
   - 再拉取 `branch/files` 和 `branch/code`。
   - 重新生成 `<workspace>/bits-flow/cov/<cov-run-id>/coverage/latest.json`、`report.md`、`uncovered-list.*` 与文件级报告。

5. 对比报告:
   - 以刷新后的目标文件 `report.md` 为准。
   - 验证本轮已删除 / 精简 / 合并代码对应未覆盖行已消失。
   - 对仍未覆盖行重新分类: 可删、可接受、需追加线上覆盖、写接口已浏览器拦截或拦截失败 blocker。

## 8. 验收标准

| 验收项 | 标准 |
|---|---|
| 代码优化 | 本轮确定删除 / 精简 / 合并项已完成，且未夹带无关重构 |
| 轮次状态 | 本轮目标文件和处理结果已写入 `coverage-optimization-state.json.rounds_log[]` |
| 全局排除审核 | 本轮目标文件必须写入或更新 `coverage-exclusion-log.json`，不记录进入排除的业务原因；只保存目标文件路径、当前 `fileCoverageVersion` 和证据。后续同版本 `ACTIVE` 记录跳过，版本变化则 supersede 旧记录并重新处理 |
| 本地污染 | 未启动本地 dev server；未使用本地调试入口；`src/bam/**` 无改动 |
| 覆盖执行 | 覆盖行为发生在真实线上页面，不依赖 localhost 子应用 |
| 请求真实性 | 所有覆盖动作均由真实线上 UI 触发；读接口和无副作用接口未接管请求或替换响应；写接口已由内置浏览器拦截并返回 mock 响应，且未真实命中后端 |
| 入参来源 | 覆盖请求入参均有来源记录: 真实 UI / 真实接口 / 真实业务数据位置 / BAM MOCK 已有入参 |
| 写接口拦截 | 每个写接口都有 endpoint、method、匹配条件、mock response、UI 后续状态和未触达后端证据 |
| Huatuo 刷新 | 重新生成覆盖率产物，且目标文件报告行数与当前线上采集代码一致 |
| 剩余未覆盖 | 每一条剩余未覆盖行都有明确归因: 不可达需删 / 风险防护可接受 / 写接口已浏览器拦截 / 拦截失败 blocker / 需追加覆盖 |

## 9. 风险与阻塞点

- 真实线上页面如果未加载当前分支代码，Huatuo 不会反映本次代码优化；需要确认线上环境与目标分支覆盖采集关联。
- 写接口会产生真实业务影响；必须通过内置浏览器拦截并返回 mock 响应，禁止真实命中后端。
- 如果某类失败态无法通过真实业务数据稳定触发，不强行使用 BAM runtime mock。读接口不得替换响应；写接口只能使用内置浏览器拦截响应，无法稳定拦截时记录为 blocker。
- Huatuo 报告可能有延迟；刷新后若报告未变化，先排查覆盖上报环境。

## 10. 线上执行记录与证据

### 10.1 执行环境

- 页面:
- 执行方式: 真实线上页面、真实 UI 操作；读接口真实请求，写接口内置浏览器拦截 mock 响应。
- 禁用项确认: 未使用本地调试入口、本地 dev server、本地 vmok、BAM runtime mock；读接口未接管请求或替换响应，写接口未真实命中后端。
- 线上入口证据:

### 10.1.1 写接口拦截记录

| 接口 | 方法 | Mock 响应摘要 | 触发 UI 状态 | 未触达后端证据 | 结论 |
|---|---|---|---|---|---|
|  |  |  |  |  | `INTERCEPTED|BLOCKED` |

### 10.2 原子需求与证据映射

| 原子项 | 需求 / 设计图片 | 运行证据图片 | 请求 / 拦截与观察结论 |
|---|---|---|---|
|  |  |  |  |

### 10.3 本轮 Huatuo 刷新结果

- 刷新产物目录: `<workspace>/bits-flow/cov/<cov-run-id>/coverage`
- 分支报告:
- 目标文件报告:
- 拉取方式: 使用 `scripts/collect-huatuo-branch-coverage.js --browserCaptureServer` 启动本地接收服务，在已登录 Huatuo 页面内发真实线上请求，并按脚本规范沉淀本轮覆盖率产物。
- 结果:
- 目标文件最新结果:
- 对比上一轮:
- 注意:

### 10.4 剩余未覆盖归因

| 剩余行段 | 归因 | 处理建议 |
|---|---|---|
|  |  |  |

## 11. 本轮决策

- Decision: `CONTINUE|STOP_THRESHOLD_REACHED|STOP_BLOCKED|STOP_NO_CANDIDATE`
- Summary:
- Next candidate:
