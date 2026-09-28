# Round 2 真实线上 UI 覆盖证据

## 基本信息

- 覆盖模式: `/delivery:bits --coverage`
- 轮次: 2
- 线上入口: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`
- 页面标题: `内容生态运营｜橙蕉`
- 页面状态: 奖励投放页，`配置五` 选中
- 目标文件: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx`
- 目标文件版本: `huatuo:be381542a5504dab`
- 刷新前文件覆盖率: `30.48%`
- 刷新前 effective uncovered inserted rows: `73`
- 刷新前整体覆盖率: `74.62%`

## UI 操作路径

1. 在真实线上奖品投放页进入 `配置五`。
2. 勾选 10 条 DOU+ 币视频候选。
3. 打开 `批量修改` 弹窗，设置 `投放生效时间` 为 `2026-07-17 19:18:12`，点击确认。
4. 浏览器内置拦截命中 `POST /api/buyin/admin/content_activity/delivery_modify_save`，请求由真实 UI 触发，未命中后端。
5. 打开 `投放奖励` 弹窗，选择真实可用充值记录 `cc抖+币-程可歆-15000`。
6. 点击最终 `确定` 触发 `POST /api/buyin/admin/content_activity/delivery_dou_plus_coin`。
7. 前两次提交用于校正浏览器 mock 响应结构；最终通过 `nested-business-success-v2` 响应触发前端成功路径，弹窗关闭并回到列表。
8. 临时浏览器侧 `Object.prototype.st` shim 已删除，页面检测结果为 `objectPrototypeStDescriptorExists = false`。

## 写接口拦截记录

| 接口 | 方法 | 次数 | 请求摘要 | Mock 响应摘要 | 未触达后端证据 |
|---|---|---:|---|---|---|
| `/api/buyin/admin/content_activity/delivery_modify_save` | `POST` | 1 | `activity_id=7629288371705643310`, `config_id=7629288371705725230`, `candidate_ids_count=10`, `session_unix_time=1784200344` | 浏览器内置 XHR mock 返回成功响应 | `round2-browser-intercept-summary.json` 第 0 条记录，`transport=xhr`，写接口在页面内拦截 |
| `/api/buyin/admin/content_activity/delivery_dou_plus_coin` | `POST` | 3 | `activity_id=7629288371705643310`, `config_id=7629288371705725230`, `charge_code=LST12604140006412`, `delivery_items_count=10`, `rank=1..10`, `delivery_from=1` | 最终响应 `st=0`, `code=0`, `msg=success`, `data.st=0`, `data.code=0`, `delivery_task_id` 存在 | `round2-browser-intercept-summary.json` 第 1-3 条记录，最终第 3 条触发成功路径 |

## 截图证据

- 批量修改拦截后页面: `evidence/round2-after-batch-edit-intercept.png`
- 投放奖励弹窗与充值记录选择: `evidence/round2-submit-modal-charge-record.png`
- 最终提交成功 mock 后页面: `evidence/round2-after-submit-success-mock.png`

## 敏感信息处理

- 未保存 cookie、JWT、token、localStorage、sessionStorage。
- 未保存完整请求体和候选 ID 全量列表。
- `round2-browser-intercept-summary.json` 仅保留字段名、数量、活动 / 配置 / charge code、响应状态和 UI 后续状态。

## 待刷新

- 本轮 UI 覆盖已完成，下一步通过 Huatuo browser capture server 刷新 `<cov-run-id>/coverage/`。
- 刷新后更新 `coverage-optimization-state.json`、`coverage-optimization-log.md`、`coverage-exclusion-log.json` 和 `bits-flow/current-coverage`。
