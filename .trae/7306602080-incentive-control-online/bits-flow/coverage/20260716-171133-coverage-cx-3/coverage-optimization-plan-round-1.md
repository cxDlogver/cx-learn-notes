# Coverage Optimization Plan Round 1

## 1. 背景与约束

- 轮次: `1`
- 状态: `PASS_WITH_NOTES`
- 阈值: `90`
- 本轮目标文件: `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx`
- 本轮目标文件报告: `coverage/results/apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx/report.md`
- 最新分支覆盖率报告: `coverage/report.md`
- 当前业务仓库: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- 本轮开始整体覆盖率: `61.54%`
- 本轮结束整体覆盖率: `66.90%`
- 本轮选择原因: `按 effectiveUncoveredInsertedRows 最大且未被排除的文件选择`
- 执行策略来源: `coverage-optimization-state.json.execution_policy`
- 全局排除日志: `../coverage-exclusion-log.json`
- 覆盖执行环境: 必须使用真实线上环境页面；禁止使用 `localhost` 调试入口、本地 dev server、本地 vmok 子应用或只在本地预览中制造覆盖率。
- 请求边界: 本轮目标是 link 点击埋点和外链打开，无业务读写接口入参，不需要 BAM MOCK。
- 写接口边界: 不点击保存、提交、发奖、导出、移除等写动作；若页面出现写请求迹象，停止并记录 blocker。
- 覆盖率刷新: 浏览器覆盖动作完成后，通过 skill 内 `scripts/collect-huatuo-branch-coverage.js` 触发 Huatuo 分支更新，再拉取 `branch/files` 与 `branch/code` 产物。

## 2. 候选文件选择

| 字段 | 值 |
|---|---|
| Effective uncovered inserted rows | `1` |
| Files estimate uncovered rows | `1` |
| Cover ratio | `98.96%` |
| Insert lines | `96` |
| File coverage version | `huatuo:4ad77f572ef36501` |
| 选择依据 | `coverage/uncovered-list.json` rank 1，且 `coverage-exclusion-log.json` 无 ACTIVE 记录 |
| 全局排除日志状态 | `NO_MATCH` |
| 本次 run 处理状态 | `NO_MATCH` |

排除候选:

| 文件 | 排除记录版本 | 当前报告版本 | 处理 | 证据 |
|---|---|---|---|---|
| N/A | N/A | N/A | N/A | `coverage-exclusion-log.json.entries=[]` |

## 3. 未覆盖行归类

| 分类 | 未覆盖点 | 处理策略 | 原因 |
|---|---|---|---|
| 应保留逻辑 | `element_type: 'link'` | 通过覆盖补齐 | 属于 AR-015 配置页规则入口点击埋点，且已由 `TC-TRACK-CFG-RULE-LINK` 映射 |

### 3.1 报告未覆盖代码行

来源: `coverage/results/apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx/report.md`。

#### L74: no incentive rule link click logger payload

```ts
        element_type: 'link',
```

处理策略:

- 分类: `UI_COVERABLE`
- 结论: `KEEP_AND_COVER`
- 原因: 该字段是 `sendElementClickLog` payload 的合法元素类型，删除会削弱 AR-015 点击 UV 统计语义。
- 关联需求 / 用例:
  - `03-prd-analysis.md`: AR-015 配置页「查看【不激励】规则」点击统计点击 UV。
  - `09-test-case-matrix.md`: `TC-TRACK-CFG-RULE-LINK` 要求 logger 被调用一次且参数含页面、模块与 activity/config context。
  - `delivery-task.md`: TASK-008 要求在配置页规则 link 点击处上报点击 UV。
  - `06-debug-verification.md`: `TC-INT-CFG-RULE-LINK` PASS，`TC-TRACK-CFG-RULE-LINK` PASS_WITH_NOTES。

## 4. 代码优化方案

### 4.1 已确定优化

1. 删除不可达或与本需求无关代码:
   - 无。目标行属于当前需求链路，不能删除。

2. 精简过度安全防护:
   - 无。目标行不是防御代码。

3. 合并重复或链式逻辑:
   - 无。目标行是单次 logger payload 字段。

4. 删除与本需求无关的新增代码:
   - 无。

代码规则检查:

- [x] 链路不通、无法到达、被外层组件拦截而无法进入的代码已删除或从当前需求改动中移除。结论: 不适用，链路可达。
- [x] 过度安全防护、抛异常、宽泛 try/catch、无收益兜底已尽可能精简。结论: 不适用。
- [x] 可合并的重复逻辑、链式逻辑已合并，且未改变业务语义。结论: 不适用。
- [x] 优化代码符合当前仓库代码规范。结论: 不改业务代码。
- [x] 与本需求功能无关的新增代码已删除。结论: 不适用。

### 4.2 不建议继续删除

| 代码点 | 保留原因 | 覆盖方式 |
|---|---|---|
| `element_type: 'link'` | AR-015 点击 UV payload 需要表达点击元素类型；源代码和 runtime handler 均证明该字段随 link click 上报 | 真实线上页面打开奖励配置，点击首个 `查看【不激励】规则` |

## 5. 覆盖设计总览

| 覆盖任务 | 关联需求 / 用例 | 线上 UI 路径 | 请求入参来源 | 覆盖目标 |
|---|---|---|---|---|
| COV-1-01 | AR-015 / `TC-TRACK-CFG-RULE-LINK` | 真实线上编辑页 -> `下一步` 到奖励配置 -> 点击 `查看【不激励】规则` | 真实页面 URL `activity_id=7629288371705643310`；不需要业务接口写入参 | 执行 `handleRuleLinkClick`，覆盖 logger payload 中 `element_type: 'link'` |

## 6. 请求入参来源方案

### 6.1 请求接口与入参来源

| 接口 | 方法 | 用途 | 字段来源 | 证据要求 |
|---|---|---|---|---|
| N/A | N/A | 本轮为页面导航和 link click，无业务接口入参 | 真实页面 URL `activity_id=7629288371705643310` | 保存页面 URL、DOM link、tab 打开和 Network 无写请求证据 |

### 6.2 入参取值优先级

1. 真实 UI 当前页面:
   - 使用真实线上编辑页 URL 和页面已加载状态。

2. 真实接口返回:
   - 本轮不依赖新增业务接口响应。

3. 真实业务数据位置:
   - 使用 verify 阶段已证明可进入奖励配置的活动 `7629288371705643310`。

4. BAM MOCK 已有入参:
   - 不使用。

5. 写接口浏览器拦截:
   - 本轮不触发写接口；若浏览器 Network 中出现保存、提交、发奖、导出、移除等写请求，记录为 blocker。

### 6.3 写接口浏览器拦截方案

| 接口 | 方法 | 触发 UI | 拦截匹配条件 | Mock 响应 | 未触达后端证据 | 覆盖目标 |
|---|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | Network 无业务写请求 | N/A |

## 7. 线上执行步骤

1. 进入真实线上页面:
   - 打开 `https://ecop.bytedance.net/alliance-operation-content/content-activity/edit?type=edit&activity_id=7629288371705643310&cjSiteCode=St12502250000001`。
   - 不携带 `cjDebugSubApp`、`externalLeadsDomainMock`、`localhost` 或 vmok 参数。

2. 开启请求和 UI 证据记录:
   - 记录当前 URL、DOM 中 `查看【不激励】规则` 数量、link href/target/rel。
   - 记录 Network 中是否出现业务写请求。

3. 执行覆盖任务:
   - 自然点击 `下一步` 进入奖励配置。
   - 点击第一个 `查看【不激励】规则` link。
   - 确认新 tab 打开目标 Wiki，原业务页 URL 和表单状态保持。

4. 刷新 Huatuo:
   - 使用 `scripts/collect-huatuo-branch-coverage.js --browserCaptureServer` 启动本地接收服务。
   - 在已登录 Huatuo 页面执行 loader，重新生成本轮 `coverage/` 产物。

5. 对比报告:
   - 目标文件报告不再出现 L74，或未覆盖列表变为空。
   - 若未变化，记录为 `BLOCKED_HUATUO_NO_CHANGE_AFTER_REAL_UI` 并同步全局排除日志，避免同版本重复处理。

## 8. 验收标准

| 验收项 | 标准 |
|---|---|
| 代码优化 | 本轮无业务代码改动，未夹带无关重构 |
| 轮次状态 | 本轮目标文件和处理结果写入 `coverage-optimization-state.json.rounds_log[0]` |
| 全局排除审核 | 本轮目标文件写入或更新 `coverage-exclusion-log.json`，记录 `huatuo:4ad77f572ef36501` |
| 本地污染 | 未启动本地 dev server；未使用本地调试入口；`src/bam/**` 无改动 |
| 覆盖执行 | 覆盖行为发生在真实线上页面，不依赖 localhost 子应用 |
| 请求真实性 | link click 不接管请求、不替换响应；无业务写接口命中 |
| 入参来源 | 页面 URL 与活动 ID 来源可追溯 |
| 写接口拦截 | 本轮不触发写接口 |
| Huatuo 刷新 | 重新生成本轮 `coverage/latest.json`、`coverage/report.md`、`coverage/uncovered-list.*` |
| 剩余未覆盖 | 若仍剩余，记录为 Huatuo/环境刷新 blocker 或继续候选 |

## 9. 风险与阻塞点

- 真实线上页面如果没有加载 `cx-3` 对应代码，Huatuo branch coverage 可能不变化。
- 如果真实线上编辑页无法自然进入奖励配置，不能回退到 `localhost` 或本地子应用制造覆盖。
- DA/UV 明细仍是外部系统口径，不作为本轮 Huatuo 行覆盖的直接前置。

## 10. 线上执行记录与证据

### 10.1 执行环境

- 页面: `https://ecop.bytedance.net/alliance-operation-content/content-activity/edit?type=edit&activity_id=7629288371705643310&cjSiteCode=St12502250000001`
- 执行方式: 真实线上页面、真实 UI 操作；不触发业务写接口。
- 禁用项确认: URL 无 `cjDebugSubApp`、无 `externalLeadsDomainMock`；资源检查未发现 `localhost` / `127.0.0.1`；未使用本地 dev server、vmok、本地子应用或 BAM runtime mock。
- 线上入口证据:
  - 首屏真实数据加载成功，活动周期 `2026-02-01` 至 `2026-12-31`，自然点击 `下一步` 进入奖励配置。
  - 奖励配置页 `查看【不激励】规则` link count=`6`，prompt count=`6`。
  - 首个 link: href=`https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh?from=from_copylink`，target=`_blank`，rel=`noopener noreferrer`。
  - 点击首个 link 后打开新 tab `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh`，标题包含 `电商内容生态激励管控 - 飞书云文档`。
  - 原业务页仍停留在相同编辑 URL；`查看【不激励】规则` link count=`6`；无保存/提交成功态。
  - Network after click only contained `mcs.snssdk.com/v1/list`、`mcs.zijieapi.com/list`、`mon.zijieapi.com/monitor_browser/collect/batch` logging / monitor requests; no `content_activity` save/export/remove/award write request.
  - 截图: `evidence/bits-coverage-round1-config-link-after-20260716.png`

### 10.1.1 写接口拦截记录

| 接口 | 方法 | Mock 响应摘要 | 触发 UI 状态 | 未触达后端证据 | 结论 |
|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | Network only had mcs/monitor logging requests; no business write endpoint | N/A |

### 10.2 原子需求与证据映射

| 原子项 | 需求 / 设计图片 | 运行证据图片 | 请求 / 拦截与观察结论 |
|---|---|---|---|
| AR-015 | `03-prd-analysis.md` AR-015；`09-test-case-matrix.md` `TC-TRACK-CFG-RULE-LINK` | `evidence/bits-coverage-round1-config-link-after-20260716.png` | Real online link click opened target Wiki; no business write request; Huatuo refresh cleared target file from uncovered list |

### 10.3 本轮 Huatuo 刷新结果

- 刷新产物目录: `coverage/`
- 分支报告: `coverage/report.md`
- 目标文件报告: refreshed run has no target file report because `nonFullCoverageFiles=0` and `resultFiles=0`; pre-refresh target report preserved at `evidence/coverage-before-ui/report.md` and `evidence/coverage-before-ui/uncovered-list.md`.
- 拉取方式: 使用 `scripts/collect-huatuo-branch-coverage.js --browserCaptureServer` 启动本地接收服务，在已登录 Huatuo 页面内发真实线上请求，并按脚本规范沉淀本轮覆盖率产物。
- 结果: `overallCoverRatio=66.90%`, `nonFullCoverageFiles=0`, `effectiveUncoveredInsertedRows=0`, `uncoveredFiles=[]`.
- 目标文件最新结果: `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` no longer appears in `coverage/uncovered-list.json`.
- 对比上一轮: pre-refresh overall `61.54%` -> post-refresh `66.90%`; effective uncovered inserted rows `1` -> `0`.
- 注意: overall ratio remains below threshold `90`; no script-effective candidate remains, so stop with blocker instead of modifying unrelated files.

### 10.4 剩余未覆盖归因

| 剩余行段 | 归因 | 处理建议 |
|---|---|---|
| N/A | Refreshed `coverage/uncovered-list.json` empty | No further round target under script filters |

## 11. 本轮决策

- Decision: `STOP_NO_CANDIDATE`
- Summary: 保留当前 logger payload 代码，不做业务代码修改；通过真实线上 link click 补齐 Huatuo 行覆盖。刷新后有效未覆盖插入行清零，但整体覆盖率仍低于阈值。
- Next candidate: none; `coverage/uncovered-list.json` is empty.
