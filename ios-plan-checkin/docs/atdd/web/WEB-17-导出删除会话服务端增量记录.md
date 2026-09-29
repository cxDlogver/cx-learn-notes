# WEB-17｜导出、删除和会话撤销服务端增量记录

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`，执行计划 `[ ]` |
| 依据 | Web PRD §5.3、Web 技术方案 §10.3、Web ATDD `WEB-DATA-01～10`、执行计划 WEB-17 |
| 当前重点 | 按用户“代码与功能优先”的指令，先补齐 Web 账号删除撤销入口，审计既有导出/删除 Worker；正式验收后置 |

## 2026-09-29 19:26 CST｜编码前审计

- 既有 API 已有私有导出任务创建/列表/状态/签名下载、账号注销请求和撤销；Worker 已有 ZIP、过期导出清理、计划及账号最终删除。
- 发现缺口：`POST /me/deletion-cancel` 调用短信撤销时默认创建 iOS 会话，返回 JSON refresh token；Web 需要单独的 Web 渠道恢复入口，设置同站点安全 Cookie、CSRF token 且不把 refresh token 放入响应体。拟在 `auth/web/deletion-cancel` 复用 Web 登录响应流程。
- 本任务只记录已审计事实，未宣称导出 ZIP、删除 Worker 或浏览器用例通过。`WEB-DATA-01～10` 保持 `NOT_RUN`。

## 2026-09-29 19:28 CST｜Web 撤销入口和通知撤销

- `POST /api/v1/auth/web/deletion-cancel` 使用 `cancel_deletion` 用途验证码创建 Web 渠道会话，按现有 Web 响应逻辑设置 Secure/HttpOnly 同站点刷新 Cookie，JSON 仅返回短访问令牌与 CSRF token；Web Origin 和设备标识校验与 Web 登录一致。
- `packages/contracts/src/routes.ts` 和 OpenAPI 生成器已加入此路由、请求/响应 schema、Origin/设备头及无 Cookie 认证要求；生成 86 个唯一操作，旧 API 兼容检查通过，API TypeScript 通过。
- 账号注销事务同步撤销该用户 Web Push 订阅，而不仅依赖 Worker 过滤已停用账号。恢复账号后旧订阅仍保持关闭，用户须自行重新授权。
- 尚需 WEB-18 页面使用新入口，且需在真实数据库与浏览器核对注销、恢复、导出对象清理。WEB-17 保持 `[ ]`，正式数据用例仍 `NOT_RUN`。

### 开发检查证据

| 检查 | 结果 | 原始记录与 SHA-256 |
| --- | --- | --- |
| API TypeScript | 退出 0，无诊断 | [api-typecheck.txt](./evidence/WEB-17/api-typecheck.txt) `87b1b114cefce32dc223284a511a5928aa5023a1d2efd07c4d3e558fb2c96345` |
| OpenAPI 目录 | 86 项，退出 0 | [openapi-check.txt](./evidence/WEB-17/openapi-check.txt) `4175751ea503574b4839b40319449975b1bd251e5cd47559004fafb0694a0d04` |
| 旧契约兼容 | 退出 0 | [compat-check.txt](./evidence/WEB-17/compat-check.txt) `333f05a5cea284f9ae4969d21beabca41e611f6384e84a0a86567e6f3800f15a` |

## 2026-09-29 19:53 CST｜导出数据集复审

- 在接入 Web 导出页面后复审 ZIP 数据集，发现其 `checkins`/`one_time_resolutions` 尚未包含新数值标签和配置版本，且缺少独立的数值配置历史、Web 分端通知偏好和账号收件箱。接下来补进用户自己的 CSV/JSON 数据集；Push 端点及密钥不会放入导出。

## 2026-09-29 19:58 CST｜导出数据集补齐

- `apps/worker/src/dataExport.ts` 的 ZIP 现导出数值配置版本、循环与一次性记录中的数值标签/配置版本、Web/iOS 分端通知偏好和用户自己的站内消息，保持现有按用户过滤和 JSON/CSV 双格式清单。Web Push 端点、密钥及令牌仍不写入包。
- `npm run export:smoke` 退出 0，覆盖 SQL 用户过滤、私有下载与独立 ZIP 解包；[原始输出](./evidence/WEB-17/export-smoke.txt) SHA-256 `0ec1f2ec311c7279fb177dae5f946a7457f11780c88d80f04e200b46f081283f`。该冒烟不等于带真实照片、消息及浏览器下载的正式验收。
