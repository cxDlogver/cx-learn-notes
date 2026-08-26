# Coverage Optimization Plan Round 3

## 1. 背景与约束

- 轮次: `3`
- 状态: `PASS_WITH_NOTES`
- 阈值: `90`
- 本轮目标文件: `apps/alliance-operation-content/src/routes/content-activity/award/utils.ts`
- 本轮目标文件报告: `coverage/r/award/utils.ts/report.md`
- 最新分支覆盖率报告: `coverage/report.md`
- 当前业务仓库: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- 本轮开始整体覆盖率: `88.60%`
- 本轮结束整体覆盖率: `89.56%`
- 执行策略来源: `coverage-optimization-state.json.execution_policy`
- 全局排除日志: `../coverage-exclusion-log.json`
- 覆盖执行环境: 真实线上页面，不使用 `localhost`、本地 dev server、本地 vmok 或 BAM runtime mock。
- 请求边界: 读接口和无副作用接口保持真实线上请求；写接口由内置浏览器拦截并返回 mock 响应，禁止真实命中后端。

## 2. 候选文件选择

| 字段 | 值 |
|---|---|
| Effective uncovered inserted rows | `22` |
| Files estimate uncovered rows | `22` |
| Cover ratio | `57.69%` |
| Insert lines | `52` |
| File coverage version | `huatuo:8f372a792f0f4739`（选择时）；`huatuo:fd505ef218d83512`（刷新后登记） |
| 选择依据 | round 2 目标阻塞后，跳过本 run 已处理的 `sendAwardToAuthorStore.ts` 与 `batch-submit-modal/index.tsx`，选择下一最大有效候选 |
| 全局排除日志状态 | `NO_MATCH` |
| 本次 run 处理状态 | `NO_MATCH` |

排除候选:

| 文件 | 排除记录版本 | 当前报告版本 | 处理 | 证据 |
|---|---|---|---|---|
| `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToAuthorStore.ts` | none | `huatuo:a8063018ce0bb551` | `ALREADY_TARGETED_SKIP` | 本 run round 2 已处理并阻塞 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx` | `huatuo:470be66717914175` | `huatuo:91cb2311c8682c4e` | `ALREADY_TARGETED_SKIP` | 本 run round 1 已处理；same-run 去重优先 |

## 3. 未覆盖行归类

| 分类 | 未覆盖点 | 处理策略 | 原因 |
|---|---|---|---|
| 应保留逻辑 | `collectErrorText` 从错误对象、response、data 中提取错误文本 | 通过真实 UI 触发写接口异常或失败响应覆盖 | 用于把超时 / 系统异常映射成治理提示文案 |
| 应保留逻辑 | `getAwardDeliveryResultCode` 返回非 0 `code` 或非 0 `st` | 已通过浏览器拦截失败响应尝试覆盖，但最终 Huatuo 仍列为未覆盖 | 后端响应可能使用 `code` 或 `st` 表示失败；本轮未继续用非真实 UI 或本地 mock 强造覆盖 |
| 应保留逻辑 | `getAwardDeliveryResponseErrorMessage` 超时 / 系统异常文案 | 通过拦截失败响应的 `msg` 覆盖 | 需求要求发奖治理态提示可读 |
| 应保留逻辑 | `getAwardDeliveryExceptionMessage` catch 分支 | 若 UI 可稳定触发请求异常，则拦截为异常；否则保留为剩余风险 | 真实网络异常不可强行替换读接口或本地 mock |

### 3.1 报告未覆盖代码行

#### L60-L74: 错误对象文本收集

```ts
const response = toPlainRecord(record.response);
const data = toPlainRecord(response?.data);
return [
  record.code,
  record.name,
  record.message,
  record.msg,
  response?.statusText,
  data?.code,
  data?.message,
  data?.msg,
]
  .map(stringifyToken)
  .filter(Boolean)
  .join(' ');
```

处理策略:

- 分类: `WRITE_REQUEST_BROWSER_INTERCEPT`
- 结论: `KEEP_AND_COVER`
- 关联需求 / 用例: `AR-004`, `AR-005`

#### L86, L89: 发奖结果码解析

```ts
return res.code;
return res.st;
```

处理策略:

- 分类: `WRITE_REQUEST_BROWSER_INTERCEPT`
- 结论: `KEEP_AND_REMAINING_RISK`
- 最终结果: 两次真实 UI 触发写接口并由浏览器拦截失败响应，但刷新后 Huatuo 仍显示 L86/L89 未覆盖。
- 关联需求 / 用例: `AR-004`, `AR-005`

#### L105, L108, L115-L117: 治理超时 / 异常提示

```ts
return MESSAGES.SEND_AWARD_GOVERNANCE_TIMEOUT;
return MESSAGES.SEND_AWARD_GOVERNANCE_EXCEPTION;
return isAwardDeliveryTimeoutLike(error)
  ? MESSAGES.SEND_AWARD_GOVERNANCE_TIMEOUT
  : MESSAGES.SEND_AWARD_GOVERNANCE_EXCEPTION;
```

处理策略:

- 分类: `WRITE_REQUEST_BROWSER_INTERCEPT`
- 结论: `PARTIALLY_COVERED`
- 最终结果: L105/L108 治理文案分支已不在最终未覆盖列表；L115-L117 catch exception helper 仍未覆盖。
- 关联需求 / 用例: `AR-004`, `AR-005`

## 4. 代码优化方案

本轮不修改业务代码。`utils.ts` 的未覆盖行是发奖失败 / 异常分支，业务语义明确；通过真实 UI 触发写接口并在浏览器内拦截响应更合适。

代码规则检查:

- [x] 未删除链路可达业务代码。
- [x] 未新增过度安全防护。
- [x] 未夹带无关重构。
- [x] 未修改 `src/bam/**`。
- [x] 未启动本地 dev server。

## 5. 覆盖设计总览

| 覆盖任务 | 关联需求 / 用例 | 线上 UI 路径 | 请求入参来源 | 覆盖目标 |
|---|---|---|---|---|
| COV-3-01 | `AR-005` | 配置三 DOU+券 -> 制券失败警告 -> 点此查看并重新提交 -> 选择真实充值记录 -> 确认提交 | 真实失败任务、真实发奖名单、真实充值记录 | 超时治理文案分支；`return res.code` 最终仍未覆盖 |
| COV-3-02 | `AR-005` | 同一重提交抽屉再次确认提交 | 同上 | 系统异常治理文案分支；`return res.st` 最终仍未覆盖 |
| COV-3-03 | `AR-005` | 未执行 | N/A | 不用本地 mock 或断网方式伪造异常；`getAwardDeliveryExceptionMessage` 与 `collectErrorText` 保留为剩余风险 |

## 6. 请求入参来源方案

| 接口 | 方法 | 用途 | 字段来源 | 证据要求 |
|---|---|---|---|---|
| `/api/buyin/admin/content_activity/get_dou_plus_coupon_make_fail_record` | `GET` | 读取制券失败任务 | 配置三真实页面自然请求 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/get_charge_record` | `GET` | 读取 DOU+券充值记录 | 重提交抽屉打开后真实请求 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/get_dou_plus_coupon_delivery_record` | `GET` | 读取失败任务发奖名单 | 重提交抽屉打开后真实请求 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/delivery_dou_plus_coupon` | `POST` | 重新提交制券 | 真实失败任务、真实发奖名单、真实充值记录 | 浏览器拦截失败响应，证明未命中后端 |

### 6.3 写接口浏览器拦截方案

| 接口 | 方法 | 触发 UI | 拦截匹配条件 | Mock 响应 | 未触达后端证据 | 覆盖目标 |
|---|---|---|---|---|---|---|
| `/api/buyin/admin/content_activity/delivery_dou_plus_coupon` | `POST` | 重提交抽屉“确认提交” | URL path + method + `delivery_list.length > 0` + `fail_delivery_task_id` | 第一次返回 `code=504, msg=timeout`；第二次返回 `code=0, data.st=500, msg=系统错误` | 浏览器 XHR/fetch patch 记录 `backend_write=not_sent` | `utils.ts` 部分错误响应文案分支 |

## 7. 线上执行步骤

1. 切换到真实线上 `配置三`。
2. 点击“点此查看并重新提交”，打开重提交抽屉。
3. 等待真实 `get_dou_plus_coupon_delivery_record` 和 `get_charge_record` 返回。
4. 选择真实充值记录。
5. 注入浏览器侧写接口拦截和 evidence 采集，拦截 `delivery_dou_plus_coupon`。
6. 点击“确认提交”，返回超时失败响应；记录 UI toast / DOM 和拦截证据。
7. 如抽屉仍可提交，再次点击“确认提交”，返回系统异常失败响应；记录 UI toast / DOM 和拦截证据。
8. 保存截图和 evidence JSON。
9. 重新通过 Huatuo capture server 刷新本轮覆盖率。

## 8. 验收标准

| 验收项 | 标准 |
|---|---|
| 代码优化 | 本轮无业务代码修改 | `PASS` |
| 轮次状态 | `coverage-optimization-state.json.rounds_log[2]` 记录目标文件、UI 证据、拦截和刷新结果 | `PASS` |
| 全局排除审核 | `utils.ts` 当前 `fileCoverageVersion` 写入 `coverage-exclusion-log.json` | `PASS` |
| 本地污染 | 未启动本地 dev server；未使用本地调试入口；`src/bam/**` 无改动 | `PASS` |
| 覆盖执行 | 覆盖行为发生在真实线上页面 | `PASS` |
| 请求真实性 | 读接口真实命中线上后端；写接口由内置浏览器拦截 | `PASS` |
| Huatuo 刷新 | 重新生成本轮 `coverage/` 产物并记录整体覆盖率 | `PASS` |
| 目标文件最终结果 | `utils.ts` 57.69% / 22 行未覆盖 -> 61.54% / 20 行未覆盖 | `PASS_WITH_NOTES` |

## 9. 风险与阻塞点

- 本轮已使用真实失败任务、真实失败名单和真实充值记录完成两次提交触发。
- 剩余未覆盖: `collectErrorText` L60-L74、`getAwardDeliveryResultCode` L86/L89、`getAwardDeliveryExceptionMessage` L115-L117。
- 未继续模拟 catch 异常；避免通过本地断网、本地 mock 或非真实 UI 方式制造覆盖。

## 10. 本轮决策

- Decision: `PASS_WITH_NOTES`
- Summary: 用真实制券失败重提交入口覆盖 `utils.ts` 的部分发奖失败治理文案分支；写接口全部由浏览器拦截。最终整体覆盖率提升到 `89.56%`，仍低于 90% 阈值。
- Next candidate: `N/A`
