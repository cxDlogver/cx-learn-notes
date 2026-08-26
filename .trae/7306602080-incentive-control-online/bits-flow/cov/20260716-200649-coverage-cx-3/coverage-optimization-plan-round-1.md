# Coverage Optimization Plan Round 1

## 1. 背景与约束

- 轮次: `1`
- 状态: `PASS`
- 阈值: `90`
- 本轮目标文件: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx`
- 本轮目标文件报告: `coverage/r/award/components/send-award/batch-submit-modal/index.tsx/report.md`
- 最新分支覆盖率报告: `coverage/report.md`
- 当前业务仓库: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- 本轮开始整体覆盖率: `85.15%`
- 本轮结束整体覆盖率: `88.60%`
- 执行策略来源: `coverage-optimization-state.json.execution_policy`
- 全局排除日志: `../coverage-exclusion-log.json`
- 覆盖执行环境: 真实线上页面，不使用 `localhost`、本地 dev server、本地 vmok 或 BAM runtime mock。
- 请求边界: 读接口和无副作用接口保持真实线上请求；写接口由内置浏览器拦截并返回 mock 响应，禁止真实命中后端。

## 2. 候选文件选择

| 字段 | 值 |
|---|---|
| Effective uncovered inserted rows | `47` |
| Files estimate uncovered rows | `47` |
| Cover ratio | `55.24%` |
| Insert lines | `105` |
| File coverage version | `huatuo:470be66717914175`（选择时）；`huatuo:91cb2311c8682c4e`（刷新后登记） |
| 选择依据 | 当前 `coverage/uncovered-list.json` 排名第 1；旧 ACTIVE 排除版本为 `huatuo:be381542a5504dab`，与当前版本不同 |
| 全局排除日志状态 | `VERSION_CHANGED_ALLOW` |
| 本次 run 处理状态 | `NO_MATCH` |

排除候选:

| 文件 | 排除记录版本 | 当前报告版本 | 处理 | 证据 |
|---|---|---|---|---|
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | `huatuo:4ad77f572ef36501` | `huatuo:4ad77f572ef36501` | `ACTIVE_SKIP` | `coverage-exclusion-log.json#cov-20260716-171133-r1-step-reward-config-index-tsx` |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx` | `huatuo:be381542a5504dab` | `huatuo:470be66717914175` | `VERSION_CHANGED_ALLOW` | `coverage-exclusion-log.json#cov-20260716-185335-r2-batch-submit-modal-index-tsx` |

## 3. 未覆盖行归类

| 分类 | 未覆盖点 | 处理策略 | 原因 |
|---|---|---|---|
| 应保留逻辑 | `buildVideoNoAwardRemoveCandidates` / `buildAuthorNoAwardRemoveCandidates` | 通过真实 UI 的 no-award 批量修改 + 发奖成功后上传覆盖 | TASK-007 要求发奖成功后上传本次 no-award candidates |
| 应保留逻辑 | `uploadNoAwardRemoveCandidates` 和 `getCandidateRemoveResponseCode` | 通过 `candidate_remove` 浏览器拦截覆盖成功 / 非成功响应解析 | 写接口会持久化剔除记录，必须拦截 |
| 应保留逻辑 | `submitSendAwardVideos` DOU+币作品提交分支 | 通过真实线上配置五 / DOU+币作品批量提交覆盖 | 当前活动有真实作品候选、真实充值记录和真实余额校验结果 |
| 风险防护 | 空名单、发奖失败响应、catch 异常 | 优先用 UI 可达路径覆盖；不可稳定构造时保留为后续候选 | 失败态依赖写接口响应或异常，不能用 BAM runtime mock 替代真实 UI 发起 |

### 3.1 报告未覆盖代码行

#### L45-L48: 候选移除响应码解析

```ts
if (response?.st === 0 && response?.code === 0) {
  return 0;
}
return response?.code ?? response?.st;
```

处理策略:

- 分类: `WRITE_REQUEST_BROWSER_INTERCEPT`
- 结论: `KEEP_AND_COVER`
- 关联需求 / 用例: `AR-003`, `AR-004`, `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST`

#### L56-L73, L88-L103: no-award 候选构造与上传

```ts
selectedAwardAuthors.filter((item) => item.if_delivery === false).map(...)
await apiCandidateRemove({ activity_id, config_id, remove_candidates })
```

处理策略:

- 分类: `WRITE_REQUEST_BROWSER_INTERCEPT`
- 结论: `KEEP_AND_COVER`
- 关联需求 / 用例: `TASK-007`, `REPAIR-001`

#### L126-L151, L483-L516: DOU+币作品提交分支

```ts
return { resultCode: 0 };
submitResult = await submitSendAwardVideos(...)
```

处理策略:

- 分类: `WRITE_REQUEST_BROWSER_INTERCEPT`
- 结论: `KEEP_AND_COVER`
- 关联需求 / 用例: `AR-004`, `TASK-007`, `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST`

## 4. 代码优化方案

本轮不修改业务代码。目标文件剩余未覆盖逻辑均属于当前奖励投放链路、TASK-007 边界或写接口成功后上传链路，不删除、不精简、不合并。

代码规则检查:

- [x] 未删除链路可达业务代码。
- [x] 未新增过度安全防护。
- [x] 未夹带无关重构。
- [x] 未修改 `src/bam/**`。
- [x] 未启动本地 dev server。

## 5. 覆盖设计总览

| 覆盖任务 | 关联需求 / 用例 | 线上 UI 路径 | 请求入参来源 | 覆盖目标 |
|---|---|---|---|---|
| COV-1-01 | `TASK-007` / no-award upload | 真实线上页面 -> 配置五 / DOU+币 -> 1 条作品批量修改为不发奖 | 真实页面配置、真实作品行、真实 URL `activity_id` / `config_id` | `buildVideoNoAwardRemoveCandidates` |
| COV-1-02 | `AR-004` / DOU+币成功分支 | 剩余 9 条作品补投放生效时间 -> 投放奖励弹窗 -> 选择真实充值记录 -> 点击确定 | 真实充值记录读接口、真实作品行、真实余额校验 | `submitSendAwardVideos` 成功路径 |
| COV-1-03 | `REPAIR-001` / post-success upload | DOU+币提交成功后自动上传 no-award candidates | reward submit 成功后前端状态中的 pending no-award video | `apiCandidateRemove` 调用和响应码解析 |

## 6. 请求入参来源方案

| 接口 | 方法 | 用途 | 字段来源 | 证据要求 |
|---|---|---|---|---|
| `/api/buyin/admin/content_activity/search_delivery_items` | `GET` | 作品候选列表 | 真实线上页面打开配置五 / DOU+币后自然请求 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/delivery_modify_save` | `POST` | 1 条作品批量修改为不发奖、9 条作品补投放生效时间 | 真实 UI 选中作品、真实批量修改弹窗 | 浏览器拦截摘要，证明未命中后端 |
| `/api/buyin/admin/content_activity/get_charge_record` | `GET` | 充值记录列表 | 真实投放奖励弹窗自然请求 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/charge_amount_check` | `POST` | 校验充值记录余额 | 真实充值记录选择和真实作品奖励金额 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/delivery_dou_plus_coin` | `POST` | DOU+币最终投放提交 | 真实 UI 选中作品、真实充值记录、真实页面上下文 | 浏览器拦截成功响应，证明未命中后端 |
| `/api/buyin/admin/content_activity/candidate_remove` | `POST` | 发奖成功后上传 no-award 作品名单 | 真实批量修改产生的 pending no-award video | 浏览器拦截成功响应，payload 只保留当前 no-award candidates |

### 6.3 写接口浏览器拦截方案

| 接口 | 方法 | 触发 UI | 拦截匹配条件 | Mock 响应 | 未触达后端证据 | 覆盖目标 |
|---|---|---|---|---|---|---|
| `/api/buyin/admin/content_activity/delivery_modify_save` | `POST` | 批量修改确认 | URL path + method + 当前活动 / 配置 ID | `code=0`, `st=0`, `msg=success` | 浏览器 XHR/fetch patch 记录 `backend_write=not_sent` | 1 条 no-award pending 和 9 条投放时间补齐 |
| `/api/buyin/admin/content_activity/delivery_dou_plus_coin` | `POST` | 投放奖励确认 | URL path + method + `delivery_items.length > 0` | `st=0`, `code=0`, `data.st=0`, `data.code=0`, `delivery_task_id` | 浏览器 XHR/fetch patch 记录 `backend_write=not_sent` | DOU+币作品发奖成功分支 |
| `/api/buyin/admin/content_activity/candidate_remove` | `POST` | reward success 后自动调用 | URL path + method + `remove_candidates.length > 0` | `st=0`, `code=0`, `msg=success` | 浏览器 XHR/fetch patch 记录 `backend_write=not_sent` | no-award upload + response code parser |

## 7. 线上执行步骤

1. 打开真实线上入口，不带本地调试参数。
2. 注入浏览器侧写接口拦截和轻量 evidence 采集；确认不会读取或保存 cookie/token/storage。
3. 找到配置五 / DOU+币，停留在 `奖励下发` SubTab。
4. 选中 1 条作品，执行批量修改为不发奖，形成 pending no-award video；写接口拦截。
5. 选中剩余 9 条作品，批量补齐投放生效时间；写接口拦截。
6. 打开投放奖励弹窗，读取真实充值记录；先选择余额不足记录确认按钮保持禁用，再选择 `cc抖+币-程可歆-15000`。
7. 等待真实 `charge_amount_check` 返回余额充足：剩余可用 9750 元，预计消耗 2700 元。
8. 点击最终确定，拦截 `delivery_dou_plus_coin` 并返回成功响应；随后拦截 `candidate_remove` 并返回成功响应。
9. 保存 DOM / screenshot / network evidence，并刷新 Huatuo 覆盖率。

## 8. 风险与阻塞点

- 本轮已完成，无 blocker。
- 真实线上写接口均由浏览器拦截，证据见 `evidence/round-1-ui-evidence.json`。
- 由于通用请求层包装成功响应，首次 `delivery_dou_plus_coin` mock 未命中前端成功判断；安装浏览器会话内窄域 `st` getter shim 后第二次真实 UI 提交命中成功分支，并触发 `candidate_remove`。
