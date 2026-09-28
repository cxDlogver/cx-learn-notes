# WEB-01｜源码、契约与 Web 扩展核对

| 项目 | 记录 |
| --- | --- |
| 任务 | `WEB-01`；核对基线为 2026-09-28 的 Web PRD、技术方案与 136 项 ATDD |
| 状态 | WEB-01 开发核对已完成；浏览器用例尚未执行 |
| 源码 | `apps/api/src`、`packages/contracts/src/routes.ts`、生成的 `packages/contracts/openapi.json`、`db/migrations/0001～0011` |
| 当前提交基线 | 起点 `4d72bf3b`；导出兼容改动 `6e984b061c1a008ed5ad9ee1396e52733617adee` |

## 1. 现有接口与 Web 复用决定

| 能力 | 当前源码与契约证据 | Web 决定 | 关联验收 |
| --- | --- | --- | --- |
| API 前缀 | `apps/api/src/main.ts` 设置 `api/v1` | 同站点代理保留 `/api/v1`，SPA 使用相对路径 | AUTH、SEC、UI |
| 短信和会话 | `auth.controller.ts` 有 `auth/sms/challenges`、`auth/sms/verify`、`auth/refresh`、`auth/logout`，刷新令牌目前经 JSON | 保留移动端端点，另建 Web Cookie/CSRF 会话适配 | AUTH-01～12、SEC-03～04 |
| 计划、记录和统计 | `plans`、`groups`、`today`、`calendar`、`plans/:id/checkins/:businessDate`、一次性结果已有控制器与契约 | 复用权威业务逻辑，仅扩展数值配置及一次性附件字段 | PLAN、CHECK、STAT、ONLINE |
| 好友分享与媒体 | `friend-requests`、`friends`、`plans/:id/shares`、`media/upload-intents` 等已有控制器 | 复用服务端授权和签名对象访问；浏览器 CORS 另验 | SOCIAL、CHECK、SEC |
| 导出 | 控制器原挂 `exports`；契约同时有 `exports` 与不完整的 `me/exports` | Web 采用已有契约里的 `/api/v1/me/exports`；补齐同一控制器的 Web 路径及列表/下载契约，原 `/api/v1/exports` 全部保留 | DATA-01～04、SEC-02/07 |
| 提醒 | `plans/:id/reminder` 是共享时间规则；`me/notification-preferences` 是账号级社交偏好，`devices/push-token` 只收 iOS token | 时间规则复用；按渠道新增 Web 偏好和 Push 订阅，旧端点只操作 iOS 偏好 | NOTIFY-01～16 |
| 删除 | `me/deletion-request`、`me/deletion-cancel`、`me/deletion-status` 已有 | 扩展 Web 会话/订阅撤销，不改变 30 天流程 | DATA-06～10、SEC-06 |

`docs/API-兼容变更记录.md` 曾记载 `/api/v1/me/data-exports`，但当前控制器及已生成 OpenAPI 不提供该路径。本次按 Web 技术方案、Web ATDD 和现有 `me/exports` 契约统一到 `/api/v1/me/exports`；`/api/v1/exports` 作为已运行的兼容入口保留。改动不删除原 operation ID、不改变导出服务的权限与数据处理。

## 2. 数据与接口缺口

| 缺口 | 源码依据 | 后续任务和兼容步骤 | 关联验收 |
| --- | --- | --- | --- |
| Web 会话 | `AuthController` 只处理 JSON refresh，`sessions` 无渠道来源；JWT audience 是移动端 | WEB-03 扩展来源；WEB-04 新增 Cookie/CSRF 适配，旧 JSON 流程并存 | AUTH、SEC-03～04 |
| 数值项 | `plan_rule_versions.numeric_config` 已有 JSONB；`checkins` 只有值/单位，没有名称快照；计划创建 DTO 没有数值配置 | WEB-03 补历史标签和版本约束；WEB-06/08 扩展计划与记录接口，旧记录不猜单位 | PLAN-15～18、CHECK、STAT |
| 一次性附件 | `one_time_resolutions` 有 `note`，请求 DTO 没有备注/数值/媒体字段；媒体表有 `one_time_plan_id` | WEB-03 补结构；WEB-08/09 扩展请求和媒体关联，保持旧请求有效 | CHECK-14～18、DATA |
| 社交消息 | 只有社交事件和 APNs 工作项，没有账号级持久收件箱 | WEB-03 新表；WEB-13/14 新读/已读端点并逐条复核分享权限 | SOCIAL、NOTIFY-08、DATA-10 |
| 分端提醒 | `notification_preferences` 主键仅 `user_id`，计划提醒共享开关仍在 `reminder_settings` | WEB-03 建渠道偏好并回填 iOS；WEB-15/16 实现 Web 开关且不覆盖共享时间 | NOTIFY-01～08 |
| Web Push | `devices` 与注册 DTO 面向 iOS；Worker 无 Web 计划提醒和 Web Push | WEB-03 新订阅表；WEB-15/16 完成 Worker、订阅与受控浏览器链路 | NOTIFY-09～16 |
| 浏览器部署 | `apps/web` 不存在；`main.ts` 无独立浏览器 CORS 配置 | WEB-05 建同站点 SPA；WEB-09 检查对象直传 CORS；WEB-22 验 HTTPS/部署 | UI、SEC、ONLINE |

## 3. 兼容迁移顺序与验收

1. **先契约核对和兼容入口。** 生成 OpenAPI 并执行 `contracts:check`、`contracts:compat`、`typecheck`、导出冒烟。任何与旧移动端操作 ID 或 `/api/v1/exports` 冲突的变更均回退。
2. **再数据库扩展。** WEB-03 只新增表、索引和可空列，回填旧 `notification_preferences` 到 `ios` 渠道；不删除旧列和会话。
3. **再后端双读/写和客户端。** WEB-04/06/08/13/15/17 添加 Web 适配和扩展 DTO；旧客户端未携带新可选字段时继续成功。WEB-05 等页面只调用当前 OpenAPI 中真实存在的路径。
4. **最后浏览器验收和发布。** WEB-21 以 136 项基线运行全量变体；WEB-22 在拟发布环境检查短信、对象直传、Web Push、HTTPS、回滚。浏览器截图、DOM、网络、DB/Worker 与结果 JSON 随功能增量记录，不等到最终阶段才补。

## 4. 当前证据与开放项

- 源码核对：`apps/api/src/main.ts`、`apps/api/src/exports/exports.controller.ts`、`apps/api/src/auth/auth.controller.ts`、`apps/api/src/records/records.controller.ts`、`apps/api/src/social/notifications.controller.ts`、`packages/contracts/src/routes.ts` 和 `db/migrations/0001～0011`。
- 契约生成与检查结果写入本任务日志；相应命令输出保存在 `docs/atdd/web/evidence/WEB-01/`，不是浏览器验收截图。
- WEB-01 不主拥有 ATDD 浏览器用例。`WEB-DATA-01` 等受影响用例仍为 `NOT_RUN`，待对应功能任务和正式浏览器运行后再写 `result.json`。
