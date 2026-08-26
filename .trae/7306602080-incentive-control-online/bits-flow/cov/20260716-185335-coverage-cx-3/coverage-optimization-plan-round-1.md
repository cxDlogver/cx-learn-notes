# Coverage Optimization Plan Round 1

## 1. 背景与约束

- 轮次: `1`
- 状态: `READY`
- 阈值: `90`
- 本轮目标文件: `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`
- 本轮目标文件报告: `coverage/r/award/components/manual-videos/drawer/form/index.tsx/report.md`
- 最新分支覆盖率报告: `coverage/latest.json`
- 当前业务仓库: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- 本轮开始整体覆盖率: `44.25%`
- 本轮结束整体覆盖率: `pending`
- 本轮选择原因: `按 effectiveUncoveredInsertedRows 最大且未被排除的文件选择`
- 执行策略来源: `coverage-optimization-state.json.execution_policy`
- 全局排除日志: `../coverage-exclusion-log.json`
- 覆盖执行环境: 真实线上页面 `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`；禁止使用 localhost、本地 dev server、本地 vmok 子应用或 BAM runtime mock 替代覆盖。
- 请求边界: 覆盖动作必须由真实线上 UI 发起；读接口和无副作用接口真实命中线上后端。BAM mock 产物仅作为入参参考。
- 写接口边界: `download_content_remove_record` 会生成飞书明细，属于写/外部副作用接口；如执行导出覆盖，必须在内置浏览器会话内拦截并返回 mock 响应，禁止真实命中后端。

## 2. 候选文件选择

| 字段 | 值 |
|---|---|
| Effective uncovered inserted rows | `122` |
| Files estimate uncovered rows | `122` |
| Cover ratio | `0.81%` |
| Insert lines | `123` |
| File coverage version | `huatuo:c699f0478ea58c88` |
| 选择依据 | `coverage/uncovered-list.json` rank 1 |
| 全局排除日志状态 | `NO_MATCH` |
| 本次 run 处理状态 | `NO_MATCH` |

排除候选:

| 文件 | 排除记录版本 | 当前报告版本 | 处理 | 证据 |
|---|---|---|---|---|
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | `huatuo:4ad77f572ef36501` | 不在本轮 uncovered list | `NO_MATCH` | `../coverage-exclusion-log.json#cov-20260716-171133-r1-step-reward-config-index-tsx` |

## 3. 未覆盖行归类

| 分类 | 未覆盖点 | 处理策略 | 原因 |
|---|---|---|---|
| 应保留逻辑 | `hitStatusLabels`、`shouldShowLegacyInvalidStatus`、行内红字状态、summary/action toolbar、保存草稿合并、一键移除和导出入口 | 通过真实线上 UI 覆盖补齐 | 对应 AR-006/AR-007/AR-008/AR-009/AR-010/AR-016，属于当前需求核心链路 |
| 风险防护 | `download_content_remove_record` 导出后续链路 | 触发 UI 后浏览器拦截写接口 | 真实导出会生成飞书明细，不能真实命中后端 |
| 可删除代码 | 无 | 不删除 | 未发现与需求无关或链路不通的新增代码 |
| 可精简代码 | 无 | 不精简 | 当前逻辑服务表单编辑、命中态展示和移除后导出持久化，删除会改变需求语义 |

### 3.1 报告未覆盖代码行

来源: `coverage/results/.../manually-submit-videos-form/index.tsx/report.md`。

#### L113-L119, L259-L273: 命中态标签与 legacy 准入失败提示

```ts
const hitStatusLabels = showSubmitHitStatus
  ? [
      record?.if_satisfy_delivery_rules === false ? MANUAL_SUBMIT_HIT_LABELS.invalid : undefined,
      record?.if_not_incentive === true ? MANUAL_SUBMIT_HIT_LABELS.notIncentive : undefined,
    ].filter(Boolean)
  : [];
const shouldShowLegacyInvalidStatus = !showSubmitHitStatus && record?.if_satisfy_delivery_rules === false;
```

处理策略:

- 分类: `UI_COVERABLE`
- 结论: `KEEP_AND_COVER`
- 原因: 表格行状态由 `search_delivery_items` / `get_delivery_items_from_sheet` 返回字段驱动，是 PRD 人工提报命中态要求。
- 关联需求 / 用例: `AR-006`, `TC-UI-MANUAL-HIT-PAGE`, `TC-CELL-MANUAL-HIT-STATUS`

#### L567-L580, L594-L600, L649-L670, L733-L756: 表格草稿合并、行级/一键移除与保存

```ts
const mergedDraftData = getMergedDraftData();
const removedItem = mergedDraftData.find((item) => getItemKey(item) === rowKey) ?? row;
if (isHitVideoItem(removedItem)) {
  preserveRemovedSubmitHitItems([removedItem]);
}
```

处理策略:

- 分类: `UI_COVERABLE`
- 结论: `KEEP_AND_COVER`
- 原因: 一键移除和行级移除必须保留用户编辑中的表单值，并把剔除记录保存给导出链路。
- 关联需求 / 用例: `AR-008`, `AR-009`, `TC-INT-MANUAL-ONE-CLICK-REMOVE`, `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE`

#### L606-L646: 人工提报命中 summary 曝光埋点

```ts
if (!hasSubmitHitItems) {
  return;
}
sendModuleExposeLog({ module_id: 'manual_submit_hit_summary', ... }, {});
```

处理策略:

- 分类: `UI_COVERABLE`
- 结论: `KEEP_AND_COVER`
- 原因: PRD tracking table 要求人工提报命中提示曝光 UV；重复曝光通过 `exposedHitSummaryKeysRef` 去重。
- 关联需求 / 用例: `AR-016`, `TC-TRACK-MANUAL-HIT-EXPOSE`

#### L774-L796: 命中 summary/action toolbar

```tsx
{shouldShowSubmitHitToolbar && (
  <div className={styles.manualHitToolbar}>
    ...
    <Button disabled={!hasSubmitHitItems}>一键移除</Button>
    <Button onClick={handleExportSubmitHitRecords}>导出剔除明细</Button>
  </div>
)}
```

处理策略:

- 分类: `UI_COVERABLE`
- 结论: `KEEP_AND_COVER`
- 原因: 移除后仍保留 summary/action，`一键移除` disabled、`导出剔除明细` enabled，是 repair/design 已确认的需求口径。
- 关联需求 / 用例: `AR-008`, `AR-009`, `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE`

## 4. 代码优化方案

### 4.1 已确定优化

1. 删除不可达或与本需求无关代码:
   - 无。

2. 精简过度安全防护:
   - 无。

3. 合并重复或链式逻辑:
   - 无。

4. 删除与本需求功能无关的新增代码:
   - 无。

代码规则检查:

- [x] 链路不通、无法到达、被外层组件拦截而无法进入的代码已检查；本轮无删除项。
- [x] 过度安全防护、抛异常、宽泛 try/catch、无收益兜底已检查；本轮无精简项。
- [x] 可合并的重复逻辑、链式逻辑已检查；本轮无合并项。
- [x] 未修改业务源码，代码规范风险为无新增。
- [x] 未发现与本需求功能无关的新增代码。

### 4.2 不建议继续删除

| 代码点 | 保留原因 | 覆盖方式 |
|---|---|---|
| 命中标签与 legacy 准入失败提示 | 兼容手动输入、批量上传和旧准入失败提示路径 | 真实线上 UI 手动输入命中态 |
| `getMergedDraftData` 与 `normalizeRowValues` | 移除 / 提交前必须保留编辑态表单值 | 修改表格字段后触发一键移除或提交 guard |
| summary/action toolbar | 移除后仍需保留导出入口 | 一键移除后观察 disabled 一键移除和 enabled 导出 |
| 曝光埋点 | PRD tracking 要求 | summary 首次出现触发 |

## 5. 覆盖设计总览

| 覆盖任务 | 关联需求 / 用例 | 线上 UI 路径 | 请求入参来源 | 覆盖目标 |
|---|---|---|---|---|
| COV-1-01 | `AR-006`, `TC-UI-MANUAL-HIT-PAGE`, `TC-CELL-MANUAL-HIT-STATUS` | 真实线上奖励投放页 -> 人工提报 -> 新增提报 -> 手动输入 -> 提交 | 用户 URL 的 `activity_id`; 页面配置 tab 的 `config_id`; 既有真实 UI 验证样本 `1279271921656,28083207347,7634842254674947950` | 表格渲染、命中标签、summary/action、曝光埋点 |
| COV-1-02 | `AR-008`, `TC-INT-MANUAL-ONE-CLICK-REMOVE` | 命中态 Drawer -> 点击 `一键移除` | 当前真实 UI response 中的命中行 | `getMergedDraftData`, `removeSubmitHitItems`, toolbar after remove |
| COV-1-03 | `AR-010`, `TC-INT-MANUAL-SUBMIT-GUARD` | 命中态 Drawer -> 点击 `提交并投放` | 当前真实 UI response 中未移除命中行 | guard 阻断，确认不打开 batch submit modal、不发奖 |
| COV-1-04 | `AR-009`, `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE` | 一键移除后 -> 点击 `导出剔除明细` | preserved removed records; 导出字段可参考 BAM mock manifest | 覆盖导出入口，写接口浏览器拦截并返回 `lark_url` |

## 6. 请求入参来源方案

### 6.1 请求接口与入参来源

| 接口 | 方法 | 用途 | 字段来源 | 证据要求 |
|---|---|---|---|---|
| `/api/buyin/admin/content_activity/search_delivery_items` | `GET` | 手动输入作品后获取提报列表 | 真实页面 `activity_id=7629288371705643310`; 页面自然带出 `config_id`; item ids 优先用既有真实 UI 样本 `1279271921656,28083207347,7634842254674947950` | 保存 request、response、DOM summary/row 状态 |
| `/api/buyin/admin/content_activity/download_content_remove_record` | `POST` | 导出剔除明细 | 当前页面 preserved removed records; 字段缺口参考 `mock/apis/apiDownloadContentRemoveRecord/manifest.json` | 浏览器拦截证据、mock response、UI 后续状态、未真实命中后端证据 |

### 6.2 入参取值优先级

1. 真实 UI 当前页面:
   - `activity_id=7629288371705643310`
   - `cjSiteCode=St12502250000001`
   - Drawer 所在配置 tab 的 `config_id`

2. 真实接口返回:
   - `search_delivery_items` 返回的 `item_info[]`、`if_satisfy_delivery_rules`、`if_not_incentive`、`not_incentive_reason`、`item_card`。

3. 真实业务数据位置:
   - 当前奖励投放页配置 tab、人工提报 Drawer。

4. BAM MOCK 已有入参:
   - `100001,100002,100003`、`apiSearchDeliveryItems` mixed hit manifest 和 `apiDownloadContentRemoveRecord` manifest 仅作为字段参考；不得启用 BAM runtime mock 或替换读接口响应。

5. 写接口浏览器拦截:
   - 导出剔除明细必须拦截 `POST /download_content_remove_record`，返回 `{ st: 0, code: 0, msg: "success", data: { lark_url: "https://bytedance.larkoffice.com/sheets/mock_content_remove_record_7306602080" } }` 或等价非生产副作用响应。

### 6.3 写接口浏览器拦截方案

| 接口 | 方法 | 触发 UI | 拦截匹配条件 | Mock 响应 | 未触达后端证据 | 覆盖目标 |
|---|---|---|---|---|---|---|
| `/api/buyin/admin/content_activity/download_content_remove_record` | `POST` | 一键移除后点击 `导出剔除明细` | URL 包含 `download_content_remove_record` 且 method 为 POST | `code=0/st=0/data.lark_url` | browser route/intercept 命中记录 + Network 无真实后端 request | `handleExportSubmitHitRecords` 和 `exportSubmitHitRecords` 后续分支 |

## 7. 线上执行步骤

1. 进入真实线上页面:
   - `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`
   - 不追加本地调试参数，不启动本地 dev server。

2. 开启请求和 UI 证据记录:
   - 记录 `search_delivery_items` request / response。
   - 如执行导出，先注入浏览器拦截 `download_content_remove_record`，确认请求不会触达真实后端。

3. 执行 COV-1-01/COV-1-03:
   - 打开人工提报 Drawer。
   - 手动输入 `1279271921656,28083207347,7634842254674947950` 并提交。
   - 观察 summary、命中标签、footer。
   - 点击 `提交并投放`，确认 guard 阻断且无发奖写接口。

4. 执行 COV-1-02/COV-1-04:
   - 回到命中态或重新构建命中态。
   - 点击 `一键移除`，确认列表剔除命中项、toolbar 保留。
   - 点击 `导出剔除明细`，仅在浏览器拦截就绪时继续；否则记录 blocker。

5. 刷新 Huatuo:
   - 重新运行 `collect-huatuo-branch-coverage.js --browserCaptureServer`，输出仍写入本轮 `coverage/`。

6. 对比报告:
   - 以刷新后的目标文件 report 为准。
   - 记录目标文件 `effectiveUncoveredInsertedRows` 变化。

## 8. 验收标准

| 验收项 | 标准 |
|---|---|
| 代码优化 | 本轮无代码优化；不得产生业务源码改动 |
| 轮次状态 | 本轮目标文件和处理结果写入 `coverage-optimization-state.json.rounds_log[]` |
| 全局排除审核 | 本轮目标文件写入 `coverage-exclusion-log.json`，保存 `huatuo:c699f0478ea58c88` |
| 本地污染 | 未启动本地 dev server；未使用本地调试入口；`src/bam/**` 无改动 |
| 覆盖执行 | 覆盖行为发生在真实线上页面 |
| 请求真实性 | `search_delivery_items` 真实请求；导出写接口如执行则浏览器拦截 |
| 入参来源 | `activity_id` 和 `cjSiteCode` 来自用户 URL；`config_id` 来自页面；item ids 来自既有真实 UI 证据 |
| 写接口拦截 | 导出接口有 endpoint、method、匹配条件、mock response、UI 后续状态和未触达后端证据 |
| Huatuo 刷新 | 重新生成本轮 `coverage/latest.json` 与目标文件 report |
| 剩余未覆盖 | 剩余行归因到未触发 UI 分支、写接口拦截 blocker 或 Huatuo 延迟 |

## 9. 风险与阻塞点

- 真实线上页面可能未加载当前分支可采集代码，Huatuo 刷新可能延迟或不反映本次 UI 操作。
- 当前真实样本此前只证明 `if_satisfy_delivery_rules=false`，未获得真实 `if_not_incentive=true/not_incentive_reason`；若本轮仍无真实不激励样本，不得用 BAM runtime mock 替换读接口响应。
- 导出剔除明细是写/外部副作用接口；内置浏览器无法稳定拦截时必须记录 blocker，不得真实命中后端。

## 10. 线上执行记录与证据

### 10.1 执行环境

- 页面: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`
- 执行方式: 真实线上页面、真实 UI 操作；读接口真实请求，写接口内置浏览器拦截 mock 响应。
- 禁用项确认: 未使用本地调试入口、本地 dev server、本地 vmok、BAM runtime mock；读接口不接管请求或替换响应。
- 线上入口证据: pending

### 10.1.1 写接口拦截记录

| 接口 | 方法 | Mock 响应摘要 | 触发 UI 状态 | 未触达后端证据 | 结论 |
|---|---|---|---|---|---|
| `/api/buyin/admin/content_activity/download_content_remove_record` | `POST` | pending | pending | pending | `BLOCKED` until browser intercept is installed |

### 10.2 原子需求与证据映射

| 原子项 | 需求 / 设计图片 | 运行证据图片 | 请求 / 拦截与观察结论 |
|---|---|---|---|
| AR-006 | PRD 3.2 人工提报命中态; Figma `25:13842` / `87:6973` | pending | `search_delivery_items` real request + row labels |
| AR-008 | 一键移除 local-only | pending | no `candidate_remove` request |
| AR-009 | 导出剔除明细 | pending | `download_content_remove_record` browser intercept |
| AR-010 | 提交保护 | pending | no reward submit request |
| AR-016 | 人工提报命中提示曝光 | pending | summary visible; logger platform aggregation remains external |

### 10.3 本轮 Huatuo 刷新结果

- 刷新产物目录: `coverage/`
- 分支报告: `coverage/report.md`
- 目标文件报告: `coverage/r/award/components/manual-videos/drawer/form/index.tsx/report.md`
- 拉取方式: `scripts/collect-huatuo-branch-coverage.js --browserCaptureServer`
- 结果: 初始刷新整体 `44.25%`，目标文件 `122` effective uncovered inserted rows。
- 目标文件最新结果: pending after UI coverage
- 对比上一轮: pending
- 注意: 初始刷新中 2 个候选文件 branch/code 请求超时，已记录到 `coverage/latest.json.skipped`。

### 10.4 剩余未覆盖归因

| 剩余行段 | 归因 | 处理建议 |
|---|---|---|
| pending | pending | UI 覆盖后重新分类 |

## 11. 本轮决策

- Decision: `CONTINUE`
- Summary: 不做代码优化，先通过真实线上人工提报 UI 覆盖 rank 1 文件；导出写接口需浏览器拦截。
- Next candidate: 刷新后按 `coverage/uncovered-list.json` 重新选择。
