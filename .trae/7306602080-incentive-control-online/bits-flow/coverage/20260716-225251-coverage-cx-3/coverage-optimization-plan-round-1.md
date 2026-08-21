# Coverage Optimization Plan Round 1

## 1. 背景与约束

- 轮次: `1`
- 状态: `PASS`
- 阈值: `90`
- 本轮目标文件: `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts`
- 本轮目标文件报告: `coverage/results/apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts/report.md`
- 最新分支覆盖率报告: `coverage/report.md`
- 当前业务仓库: `meego-7306602080/repos/alliance-operation-mono`
- 本轮开始整体覆盖率: `89.56%`
- 本轮结束整体覆盖率: `91.28%`
- 本轮选择原因: 同版本跳过上一轮已处理的 `sendAwardToAuthorStore.ts`、`batch-submit-modal/index.tsx`、`utils.ts` 后，选择有效未覆盖插入行最多的未处理文件。
- 执行策略来源: `coverage-optimization-state.json.execution_policy`
- 全局排除日志: `../coverage-exclusion-log.json`
- 覆盖执行环境: 真实线上页面 `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`
- 请求边界: 读接口保持真实线上请求；写接口只在浏览器内拦截，禁止真实命中后端。

## 2. 候选文件选择

| 字段 | 值 |
|---|---|
| Effective uncovered inserted rows | `17` |
| Files estimate uncovered rows | `17` |
| Cover ratio | `88.67%` |
| Insert lines | `150` |
| File coverage version | `huatuo:1863460942dab643` |
| 选择依据 | 同版本排除日志过滤后本轮最大有效未覆盖候选 |
| 全局排除日志状态 | `NO_MATCH` |
| 本次 run 处理状态 | `NO_MATCH` |

排除候选:

| 文件 | 排除记录版本 | 当前报告版本 | 处理 | 证据 |
|---|---|---|---|---|
| `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToAuthorStore.ts` | `huatuo:a8063018ce0bb551` | `huatuo:a8063018ce0bb551` | `ACTIVE_SKIP` | `../coverage-exclusion-log.json#cov-20260716-200649-r2-send-award-to-author-store-ts` |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx` | `huatuo:91cb2311c8682c4e` | `huatuo:91cb2311c8682c4e` | `ACTIVE_SKIP` | `../coverage-exclusion-log.json#cov-20260716-200649-r1-batch-submit-modal-index-tsx` |
| `apps/alliance-operation-content/src/routes/content-activity/award/utils.ts` | `huatuo:fd505ef218d83512` | `huatuo:fd505ef218d83512` | `ACTIVE_SKIP` | `../coverage-exclusion-log.json#cov-20260716-200649-r3-award-utils-ts` |

## 3. 未覆盖行归类

本轮未修改业务代码，优先通过真实线上 UI 覆盖人工提报 store 的有效链路。

| 分类 | 未覆盖点 | 处理策略 | 原因 |
|---|---|---|---|
| 应保留逻辑 | `preserveRemovedSubmitHitItems` 命中态保存、`removeSubmitHitItems` 一键/行级移除后列表更新 | 通过真实人工提报 UI 覆盖 | 属于人工提报命中不激励/准入门槛后的真实业务链路 |
| 应保留逻辑 | `fetchVideosByItemIds` / `fetchVideosBySheetUrl` 成功或空态后的 `resetRemovedSubmitHitItems` | 通过真实读接口覆盖 | 读接口无副作用，必须真实命中线上后端 |
| 写接口失败分支 | `exportSubmitHitRecords` 返回成功码但缺少 `lark_url` | 浏览器内拦截 `download_content_remove_record` 并返回无链接 mock 响应 | 导出是写/外部副作用接口，不能真实命中后端 |
| 剩余风险防护 | 非复用模式、空命中、重复 candidate id 等早退分支 | 本轮达到阈值后保留 | 属于状态防护或需要额外样本的低优先级分支 |

### 3.1 报告未覆盖代码行

刷新前目标文件有效未覆盖 `17` 行，刷新后剩余 `7` 行：

```text
97  nextRemovedItems.map((item) => this.getCandidateId(item)).filter(Boolean),
103 return;
143 return;
147 return;
213 this.resetRemovedSubmitHitItems();
249 this.resetRemovedSubmitHitItems();
325 return false;
```

已覆盖并消失的关键行包括 `preserveRemovedSubmitHitItems` 命中合并段、导出缺少 `lark_url` 的错误提示分支，以及部分列表重置路径。

## 4. 代码优化方案

本轮不做代码优化，原因如下：

- 目标文件未覆盖行均是当前人工提报需求链路中的状态处理、早退或错误分支。
- 没有发现可安全删除的不可达代码、过度防护或与本需求无关新增代码。
- 通过真实线上 UI 覆盖后整体覆盖率已经达到阈值。

代码规则检查:

- [x] 未删除当前需求仍可达的业务逻辑。
- [x] 未引入无关重构。
- [x] 业务仓库 `git status --short` 为空。
- [x] `git diff --check` 无输出。

## 5. 覆盖设计总览

| 覆盖任务 | 关联需求 / 用例 | 线上 UI 路径 | 请求入参来源 | 覆盖目标 |
|---|---|---|---|---|
| COV-1-01 | 人工提报命中不激励/准入门槛后移除与导出 | 配置一（人工提报） -> 新增提报 -> 手动输入 item ids -> 行级移除 -> 导出剔除明细 | 真实 item ids: `1279271921656,28083207347,7634842254674947950`；真实页面 URL 中的 `activity_id` / `config_id` | 命中项保存、移除、导出缺链接错误分支 |
| COV-1-02 | 批量上传读接口后列表重置/空态 | 新增提报 -> 批量上传 -> 输入无效飞书表格链接 -> 提交 | 真实 UI 输入的 sheet URL 与页面状态 | `fetchVideosBySheetUrl` 真实读请求与空表状态 |

## 6. 请求入参来源方案

| 接口 | 方法 | 用途 | 字段来源 | 证据 |
|---|---|---|---|---|
| `/api/buyin/admin/content_activity/search_delivery_items` | `GET` | 手动输入 item ids 后查询作品 | 真实 UI 输入、页面活动配置状态 | `evidence/round-1-network.log#L3` |
| `/api/buyin/admin/content_activity/get_delivery_items_from_sheet` | `GET` | 批量上传表格链接解析作品 | 真实 UI 输入、页面活动配置状态 | `evidence/round-1-network.log#L68` |
| `/api/buyin/admin/content_activity/download_content_remove_record` | `POST` | 导出剔除明细 | 移除后的真实 item_id；浏览器内拦截 mock 响应 | `evidence/round-1-ui-evidence.json#/write_intercepts/0` |

### 6.3 写接口浏览器拦截方案

| 接口 | 方法 | 触发 UI | 拦截匹配条件 | Mock 响应 | 未触达后端证据 | 覆盖目标 |
|---|---|---|---|---|---|---|
| `/api/buyin/admin/content_activity/download_content_remove_record` | `POST` | 导出剔除明细 | URL path 完全匹配 | `{ "st": 0, "code": 0, "msg": "success", "data": {} }` | `evidence/round-1-network.log` 无该请求；`backend_write = not_sent` | 缺少 `lark_url` 错误分支 |

## 7. 线上执行记录与证据

- UI 证据: `evidence/round-1-ui-evidence.json`
- 截图:
  - `evidence/round-1-export-missing-link.png`
  - `evidence/round-1-batch-upload-final.png`
- Network log: `evidence/round-1-network.log`
- 禁用项确认: 未使用 localhost、本地 dev server、本地 vmok 或 BAM runtime mock；读接口未接管请求；写接口由浏览器拦截且未真实命中后端。

## 8. 本轮 Huatuo 刷新结果

- 刷新产物目录: `coverage/`
- 分支报告: `coverage/report.md`
- 目标文件报告: `coverage/results/apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts/report.md`
- 拉取方式: `collect-huatuo-branch-coverage.js --browserCaptureServer`，在已登录 Huatuo 页面内执行 loader。
- 结果: 整体覆盖率 `89.56% -> 91.28%`，达到阈值。
- 目标文件最新结果: `88.67% / 17` 行未覆盖 -> `95.33% / 7` 行未覆盖。

## 9. 剩余未覆盖归因

| 剩余行段 | 归因 | 处理建议 |
|---|---|---|
| 97, 103 | 合并已移除项时的重复 candidate id / 空 id 防护 | 保留；整体阈值已达标 |
| 143, 147 | 非复用模式或无命中作品早退 | 保留；属于状态防护 |
| 213, 249 | 读接口异常/特定重置路径 | 保留；需要额外错误样本 |
| 325 | 非复用模式下一键移除早退 | 保留；属于状态防护 |

## 10. 本轮决策

- Decision: `STOP_THRESHOLD_REACHED`
- Summary: Round 1 通过真实线上人工提报 UI 覆盖和写接口浏览器拦截，将整体覆盖率刷新到 `91.28%`，超过阈值 `90%`。
- Next candidate: `N/A`
