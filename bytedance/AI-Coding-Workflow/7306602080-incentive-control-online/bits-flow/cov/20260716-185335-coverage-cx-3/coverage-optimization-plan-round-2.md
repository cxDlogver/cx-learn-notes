# Coverage Optimization Plan Round 2

## 1. 背景与约束

- 轮次: `2`
- 状态: `PASS_WITH_NOTES`
- 阈值: `90`
- 本轮目标文件: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx`
- 本轮目标文件报告: `coverage/r/award/components/send-award/batch-submit-modal/index.tsx/report.md`
- 最新分支覆盖率报告: `coverage/report.md`
- 当前业务仓库: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- 本轮开始整体覆盖率: `74.62%`
- 本轮结束整体覆盖率: `82.18%`
- 本轮选择原因: `按 effectiveUncoveredInsertedRows 最大且未被排除的文件选择`
- 执行策略来源: `coverage-optimization-state.json.execution_policy`
- 全局排除日志: `../coverage-exclusion-log.json`
- 覆盖执行环境: 真实线上页面，不使用 `localhost`、本地 dev server、本地 vmok 或 BAM runtime mock。
- 请求边界: 读接口和无副作用接口保持真实线上请求；写接口由内置浏览器拦截并返回 mock 响应。

## 2. 候选文件选择

| 字段 | 值 |
|---|---|
| Effective uncovered inserted rows | `73` |
| Files estimate uncovered rows | `73` |
| Cover ratio | `30.48%` |
| Insert lines | `105` |
| File coverage version | `huatuo:be381542a5504dab` |
| 选择依据 | 当前 `coverage/uncovered-list.json` 排名第 1，且不在全局排除日志同版本 ACTIVE 记录中 |
| 全局排除日志状态 | `NO_MATCH` |
| 本次 run 处理状态 | `NO_MATCH` |

排除候选:

| 文件 | 排除记录版本 | 当前报告版本 | 处理 | 证据 |
|---|---|---|---|---|
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | `huatuo:4ad77f572ef36501` | `huatuo:4ad77f572ef36501` | `ACTIVE_SKIP` | `coverage-exclusion-log.json#cov-20260716-171133-r1-step-reward-config-index-tsx` |

## 3. 未覆盖行归类

| 分类 | 未覆盖点 | 处理策略 | 原因 |
|---|---|---|---|
| 应保留逻辑 | DOU+ 币视频候选提交、成功回调、失败提示、提交后移除不发奖名单 | 通过真实线上 UI 覆盖 | 属于奖励投放当前业务链路 |
| 风险防护 | `apiDeliveryDouPlusCoin` 失败响应、异常 catch | 保留，记录为后续失败态覆盖候选 | 真实失败态依赖线上接口返回，不能用 BAM runtime mock 替换读写链路 |
| 应保留逻辑 | `delivery_modify_save` 批量修改候选生效时间 | 通过真实线上 UI 覆盖，写接口浏览器拦截 | 会修改线上数据，必须拦截 |
| 应保留逻辑 | `delivery_dou_plus_coin` 最终投放提交 | 通过真实线上 UI 覆盖，写接口浏览器拦截 | 会发奖，必须拦截 |
| 暂未覆盖 | 作者奖励提交分支、上传候选分支、候选移除失败分支 | 保留，若本轮刷新后仍是最大候选再继续下一轮 | 当前入口和安全数据优先覆盖 DOU+ 币视频批量提交主链路 |

### 3.1 报告未覆盖代码行

来源: `coverage/r/award/components/send-award/batch-submit-modal/index.tsx/report.md`。

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
- 原因: 成功提交后会进入 `uploadNoAwardRemoveCandidates`；本轮候选均为发奖候选，移除候选为空或不足以稳定命中该分支。
- 关联需求 / 用例: 奖励投放前剔除不发奖候选。

#### L126-L153, L552-L577: 视频奖励提交主链路

```ts
submitResult = await submitSendAwardVideos({
  activity_id: activityId,
  config_id: configId,
  charge_code: selectedChargeCode,
  delivery_items: selectedAwardVideos.map(...),
  session_unix_time: selectedSessionUnixTime,
  delivery_from: deliveryFrom,
});
if (submitResult.resultCode === 0) {
  await uploadNoAwardRemoveCandidates(...);
  onClose();
} else if (submitResult.errorMessage) {
  setSubmitErrorMessage(submitResult.errorMessage);
}
```

处理策略:

- 分类: `UI_COVERABLE`
- 结论: `KEEP_AND_COVER`
- 原因: 本轮可通过真实线上 UI 选中 10 条视频候选、选择真实充值记录并触发最终提交。
- 关联需求 / 用例: 奖励投放、发奖前剔除、提交结果提示。

## 4. 代码优化方案

本轮不修改业务代码。目标文件中的未覆盖逻辑均属于当前奖励投放链路或失败态防护，不做删除、精简或合并。

代码规则检查:

- [x] 未删除链路可达业务代码。
- [x] 未新增过度安全防护。
- [x] 未夹带无关重构。
- [x] 未修改 `src/bam/**`。
- [x] 未启动本地 dev server。

## 5. 覆盖设计总览

| 覆盖任务 | 关联需求 / 用例 | 线上 UI 路径 | 请求入参来源 | 覆盖目标 |
|---|---|---|---|---|
| COV-2-01 | 奖励投放候选批量修改 | 真实线上页面 -> 配置五 -> 勾选 10 条视频 -> 批量修改 -> 设置投放生效时间 -> 确认 | URL query、配置 tab、表格候选行、DatePicker 真实输入 | `delivery_modify_save` 成功路径和后续列表状态 |
| COV-2-02 | DOU+ 币视频批量提交 | 真实线上页面 -> 配置五 -> 批量提交 -> 选择充值记录 -> 确定 | 真实充值记录 `cc抖+币-程可歆-15000`、候选表格选中项、真实页面活动 / 配置 ID | `submitSendAwardVideos` 成功路径、提交成功后关闭弹窗 |

## 6. 请求入参来源方案

| 接口 | 方法 | 用途 | 字段来源 | 证据要求 |
|---|---|---|---|---|
| `/api/buyin/admin/content_activity/delivery_modify_save` | `POST` | 批量修改候选投放生效时间 | 真实 URL `activity_id`、配置 tab `config_id`、真实表格勾选候选、DatePicker 输入时间 | `evidence/round2-browser-intercept-summary.json`、`evidence/round2-after-batch-edit-intercept.png` |
| `/api/buyin/admin/content_activity/get_charge_record` | `GET` | 获取充值记录 | 真实弹窗打开后线上读接口 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/charge_amount_check` | `POST` | 校验充值记录余额 | 真实充值记录选择和真实候选金额 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/delivery_dou_plus_coin` | `POST` | DOU+ 币最终投放提交 | 真实 URL、配置 tab、真实充值记录 `charge_code=LST12604140006412`、真实候选选择 | `evidence/round2-browser-intercept-summary.json`、`evidence/round2-after-submit-success-mock.png` |

### 6.3 写接口浏览器拦截方案

| 接口 | 方法 | 触发 UI | 拦截匹配条件 | Mock 响应 | 未触达后端证据 | 覆盖目标 |
|---|---|---|---|---|---|---|
| `/api/buyin/admin/content_activity/delivery_modify_save` | `POST` | 批量修改确认 | URL path + method + `activity_id=7629288371705643310` + `config_id=7629288371705725230` | 前端可继续执行的成功响应 | `round2-browser-intercept-summary.json` 第 0 条，`transport=xhr` | 批量修改成功路径 |
| `/api/buyin/admin/content_activity/delivery_dou_plus_coin` | `POST` | 投放奖励确认 | URL path + method + `charge_code=LST12604140006412` + `delivery_items_count=10` | `st=0`, `code=0`, `msg=success`, `data.st=0`, `data.code=0`, `delivery_task_id` 存在 | `round2-browser-intercept-summary.json` 第 3 条，`transport=xhr`，提交弹窗关闭 | 视频奖励提交成功路径 |

## 7. 线上执行记录与证据

- 页面: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`
- 执行方式: 真实线上页面、真实 UI 操作；读接口真实请求，写接口内置浏览器拦截 mock 响应。
- 禁用项确认: 未使用本地调试入口、本地 dev server、本地 vmok、BAM runtime mock；读接口未接管请求或替换响应。
- 线上入口证据: `evidence/round2-ui-evidence.md`
- 截图:
  - `evidence/round2-after-batch-edit-intercept.png`
  - `evidence/round2-submit-modal-charge-record.png`
  - `evidence/round2-after-submit-success-mock.png`

## 8. 本轮 Huatuo 刷新结果

- 刷新产物目录: `coverage/`
- 分支报告: `coverage/report.md`
- 目标文件报告: `coverage/r/award/components/send-award/batch-submit-modal/index.tsx/report.md`
- 拉取方式: 使用 `scripts/collect-huatuo-branch-coverage.js --browserCaptureServer` 启动本地接收服务，在已登录 Huatuo 页面内发真实线上请求，并按脚本规范沉淀本轮覆盖率产物。
- 结果: `overallCoverRatio 74.62% -> 82.18%`; 目标文件 `30.48% / 73` -> `55.24% / 47`

## 9. 风险与阻塞点

- 第一次选择 `cc抖+币-程可歆-3000` 余额不足，已改选 `cc抖+币-程可歆-15000`。
- 前端 success 判断依赖 request wrapper 返回形态；为完成浏览器覆盖验证，曾临时安装浏览器侧 shim，最终提交后已删除并验证 `Object.prototype.st` 不存在。
- 作者提交、上传候选、失败态分支可能仍未覆盖，需以刷新后的 Huatuo 报告决定下一轮目标。

## 10. 本轮决策

- Decision: `CONTINUE`
- Summary: Round 2 已完成真实线上 UI 覆盖、写接口浏览器拦截和 Huatuo 刷新验证；整体覆盖率提升到 `82.18%`，但仍低于阈值 `90%`。
- Next candidate: `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx`
