# Coverage Optimization Plan Round 1

## 1. 背景与约束

- 轮次: `1`
- 状态: `IN_PROGRESS`
- 阈值: `96`
- 本轮目标文件: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-operation-bar/index.tsx`
- 本轮目标文件报告: `coverage/r/award/components/send-award/batch-operation-bar/index.tsx/report.md`
- 最新分支覆盖率报告: `coverage/report.md`
- 当前业务仓库: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- 本轮开始整体覆盖率: `91.28%`
- 本轮结束整体覆盖率: `待刷新`
- 执行策略来源: `coverage-optimization-state.json.execution_policy`
- 全局排除日志: `../coverage-exclusion-log.json`
- 覆盖执行环境: 真实线上页面，不使用 `localhost`、本地 dev server、本地 vmok 或 BAM runtime mock。
- 请求边界: 读接口和无副作用接口保持真实线上请求；写接口由内置浏览器拦截并返回 mock 响应，禁止真实命中后端。

## 2. 候选文件选择

| 字段 | 值 |
|---|---|
| Effective uncovered inserted rows | `3` |
| Files estimate uncovered rows | `3` |
| Cover ratio | `89.66%` |
| Insert lines | `29` |
| File coverage version | `huatuo:9412a594665bd189` |
| 选择依据 | 当前 `coverage/uncovered-list.json` 中前四个候选均被同版本 ACTIVE 排除后，本文件为最大有效未覆盖候选 |
| 全局排除日志状态 | `NO_MATCH` |
| 本次 run 处理状态 | `NO_MATCH` |

排除候选:

| 文件 | 排除记录版本 | 当前报告版本 | 处理 | 证据 |
|---|---|---|---|---|
| `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToAuthorStore.ts` | `huatuo:a8063018ce0bb551` | `huatuo:a8063018ce0bb551` | `ACTIVE_SKIP` | `coverage-exclusion-log.json#cov-20260716-200649-r2-send-award-to-author-store-ts` |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx` | `huatuo:91cb2311c8682c4e` | `huatuo:91cb2311c8682c4e` | `ACTIVE_SKIP` | `coverage-exclusion-log.json#cov-20260716-200649-r1-batch-submit-modal-index-tsx` |
| `apps/alliance-operation-content/src/routes/content-activity/award/utils.ts` | `huatuo:fd505ef218d83512` | `huatuo:fd505ef218d83512` | `ACTIVE_SKIP` | `coverage-exclusion-log.json#cov-20260716-200649-r3-award-utils-ts` |
| `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts` | `huatuo:9b2e17f6cdac59ab` | `huatuo:9b2e17f6cdac59ab` | `ACTIVE_SKIP` | `coverage-exclusion-log.json#cov-20260716-225251-r1-manually-submit-video-store-ts` |

## 3. 未覆盖行归类

| 分类 | 未覆盖点 | 处理策略 | 原因 |
|---|---|---|---|
| 应保留逻辑 | `mergeAuthorSubmitItems` 中 pending no-award author 去重合并 | 通过 DOU+券作者批量修改为不发奖后，再批量提交覆盖 | TASK-007 / REPAIR-001 要求发奖成功后上传本次 selected no-award candidates |
| 应保留逻辑 | `onBatchSubmitOk` 中作者维度 `clearPendingNoAwardAuthorItems()` | 通过 DOU+券作者批量提交成功回调覆盖 | 成功后必须清理 pending no-award author state，避免后续重复上传 |

### 3.1 报告未覆盖代码行

#### L72-L73: 作者 pending no-award 合并去重

```ts
const authorId = item.author_info?.author_id;
return authorId && !selectedAuthorIds.has(authorId);
```

处理策略:

- 分类: `UI_COVERABLE`
- 结论: `KEEP_AND_COVER`
- 关联需求 / 用例: `AR-004`, `TASK-007`, `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST`

#### L446: 作者提交成功后清理 pending no-award

```ts
clearPendingNoAwardAuthorItems();
```

处理策略:

- 分类: `WRITE_REQUEST_BROWSER_INTERCEPT`
- 结论: `KEEP_AND_COVER`
- 关联需求 / 用例: `AR-004`, `TASK-007`, `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST`

## 4. 代码优化方案

本轮不修改业务代码。目标文件剩余未覆盖逻辑均属于 DOU+券作者奖励投放链路和 REPAIR-001 的成功后 no-award 上传逻辑，不删除、不精简、不合并。

代码规则检查:

- [x] 未删除链路可达业务代码。
- [x] 未新增过度安全防护。
- [x] 未夹带无关重构。
- [x] 未修改 `src/bam/**`。
- [x] 未启动本地 dev server。

## 5. 覆盖设计总览

| 覆盖任务 | 关联需求 / 用例 | 线上 UI 路径 | 请求入参来源 | 覆盖目标 |
|---|---|---|---|---|
| COV-1-01 | `TASK-007` / no-award author pending | 真实线上页面 -> 配置二 / DOU+券 -> 单个作者 `修改配置` 为不发奖 | 真实页面配置、真实作者行、真实 URL `activity_id` / `config_id` | `pendingNoAwardAuthorItems` 非空后触发 `mergeAuthorSubmitItems` |
| COV-1-02 | `AR-004` / DOU+券成功提交 | `一键全选` 剩余可发奖作者 -> 批量提交 -> 真实充值记录/余额校验 -> 最终确认 | 真实充值记录读接口、真实作者行、真实余额校验 | `submitAwardAuthorInfos` 合并 pending no-award author |
| COV-1-03 | `REPAIR-001` / post-success upload | DOU+券提交成功后自动上传 no-award candidates | reward submit 成功后前端状态中的 pending no-award author | `candidate_remove` 成功后回调 `clearPendingNoAwardAuthorItems()` |

## 6. 请求入参来源方案

| 接口 | 方法 | 用途 | 字段来源 | 证据要求 |
|---|---|---|---|---|
| `/api/buyin/admin/content_activity/search_delivery_items` | `GET` | 作者候选列表 | 真实线上页面打开配置二 / DOU+券后自然请求 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/delivery_modify_save` | `POST` | 单个作者修改为不发奖 | 真实 UI 当前作者行、真实配置上下文 | 浏览器拦截摘要，证明未命中后端 |
| `/api/buyin/admin/content_activity/get_charge_record` | `GET` | 充值记录列表 | 真实投放奖励弹窗自然请求 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/charge_amount_check` | `POST` | 校验充值记录余额 | 真实充值记录选择和真实作者奖励金额 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/delivery_dou_plus_coupon` | `POST` | DOU+券最终投放提交 | 真实 UI 选中作者、真实充值记录、真实页面上下文 | 浏览器拦截成功响应，证明未命中后端 |
| `/api/buyin/admin/content_activity/candidate_remove` | `POST` | 发奖成功后上传 no-award 作者名单 | 真实批量修改产生的 pending no-award author | 浏览器拦截成功响应，payload 只保留当前 no-award candidates |

### 6.3 写接口浏览器拦截方案

| 接口 | 方法 | 触发 UI | 拦截匹配条件 | Mock 响应 | 未触达后端证据 | 覆盖目标 |
|---|---|---|---|---|---|---|
| `/api/buyin/admin/content_activity/delivery_modify_save` | `POST` | 作者行 `修改配置` 确认 | URL path + method + 当前活动 / 配置 ID | `code=0`, `st=0`, `msg=success` | 浏览器 XHR/fetch patch 记录 `backend_write=not_sent` | 形成 pending no-award author |
| `/api/buyin/admin/content_activity/delivery_dou_plus_coupon` | `POST` | 投放奖励确认 | URL path + method + `delivery_authors.length > 0` | `st=0`, `code=0`, `data.st=0`, `data.code=0`, `delivery_task_id` | 浏览器 XHR/fetch patch 记录 `backend_write=not_sent` | DOU+券作者发奖成功分支 |
| `/api/buyin/admin/content_activity/candidate_remove` | `POST` | reward success 后自动调用 | URL path + method + `remove_candidates.length > 0` | `st=0`, `code=0`, `msg=success` | 浏览器 XHR/fetch patch 记录 `backend_write=not_sent` | no-award upload + success callback cleanup |

## 7. 线上执行步骤

1. 打开真实线上入口，不带本地调试参数。
2. 注入浏览器侧写接口拦截和轻量 evidence 采集；确认不会读取或保存 cookie/token/storage。
3. 在 `配置二 / DOU+券` 停留在 `奖励下发` SubTab。
4. 使用第一条作者行的 `修改配置`，将其设置为不发奖，形成 pending no-award author；`delivery_modify_save` 必须被拦截。
5. 点击 `一键全选` 选择剩余可发奖作者，点击 `批量提交` 打开奖励投放弹窗。
6. 等待真实充值记录读取和余额校验；读接口不接管。
7. 点击最终确定，拦截 `delivery_dou_plus_coupon` 并返回成功响应；随后拦截 `candidate_remove` 并返回成功响应。
8. 保存 DOM / screenshot / network evidence，并刷新 Huatuo 覆盖率。

## 8. 风险与阻塞点

- 写接口均有真实线上副作用，必须通过内置浏览器拦截并返回 mock 响应。
- 如果单行 `修改配置` 无法形成 no-award pending 状态，降级为选中单个作者后 `批量修改`；仍必须由真实 UI 触发。
- 若内置浏览器无法证明 `delivery_modify_save` / `delivery_dou_plus_coupon` / `candidate_remove` 未触达后端，本轮必须记录 blocker，不得伪造覆盖通过。

## 9. 本轮决策

- Decision: `CONTINUE`
- Summary: 目标文件为有效业务链路，采用真实线上 DOU+券作者发奖路径覆盖；本轮不修改代码。
- Next candidate: Huatuo 刷新后再按同版本排除日志选择。
