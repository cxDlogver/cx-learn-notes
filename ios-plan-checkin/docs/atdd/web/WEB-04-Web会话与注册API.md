# WEB-04｜Web 会话与公开注册 API 记录

| 项目 | 实际结果 |
| --- | --- |
| 状态 | `DONE`；Web 专用 Cookie API 与契约已提交为 `ec1777612843b36d8f1f5579dc5464c4f546f0fa`，服务层和隔离 PostgreSQL 真实 HTTP 冒烟通过 |
| 前置 | WEB-01 契约核对、WEB-03 `sessions.client_channel` 迁移 |
| 业务验收 | 本任务是 API 支撑任务；136 项浏览器 F/V/N 仍 `NOT_RUN`，AUTH 首验归 WEB-05 |
| 测试环境 | PGlite 临时库和 `127.0.0.1` 临时 PostgreSQL 17，合成手机号与内存短信桩；容器已停止 |

## 端点和兼容约定

| 路径 | 行为 | 可复核边界 |
| --- | --- | --- |
| `POST /auth/sms/challenges` | 沿用公开短信挑战，Web 与移动端共用号码/冷却/次数规则 | 不发放会话；HTTP 自测以合成新号码得到 `challengeId` |
| `POST /auth/web/verify` | 同一验证码验证与公开注册逻辑，创建 `web` 会话 | 仅返回 15 分钟 access、用户/首次注册标记和 CSRF；refresh 只在 `__Host-plan-refresh` Cookie |
| `GET /auth/web/session` | Cookie 有效时恢复短期 access 与 CSRF | 不轮换 30 天 refresh；响应 `no-store`，失效返回 401 |
| `POST /auth/web/refresh` | Origin、CSRF、幂等键和 Cookie 校验后轮换 | 成功下发新 30 天 Cookie；旧令牌返回 401，不能清除较新 Cookie |
| `POST /auth/web/logout` | 撤销当前 Web 会话并清除 Cookie | Web Push 订阅按浏览器设备撤销；即使设备 ID 与 iOS 相同也不清除 APNs 记录 |
| 原 `auth/sms/verify`、`auth/refresh`、`auth/logout` | 移动端 JSON token 流程继续可用 | 原路径、请求/响应与 `plan-checkin-mobile` audience 保留 |

Web Cookie 使用 `Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000` 且无 Domain。短 token 只返回给浏览器页面，由 WEB-05 的客户端保存在内存。CSRF 值由服务端密钥与 refresh 绑定，轮换后变化；变更请求要求精确 `WEB_ORIGIN` 和 `X-CSRF-Token`。`WEB_ORIGIN` 未配置时 Web 专用路径拒绝，生产环境仅接受 HTTPS origin；本地开发可用 loopback HTTP。普通业务 Bearer 鉴权核对 JWT audience 与数据库会话渠道，不能把移动 token 当 Web token 或反向使用。

## 实际执行与反向断言

1. 服务测试在 PGlite 中验证 15 分钟 access、约 30 天 refresh、会话到期、Web audience、Cookie 属性、无 JSON refresh、CSRF/Origin 拒绝、同键重试、旧键重放和第二次轮换后迟到响应不覆盖新 Cookie。Web 退出后浏览器 Push 失效，构造同 ID 的 iOS 设备仍保留 APNs。见 [服务断言输出](./evidence/WEB-04/web-auth-service.txt)及 `scripts/web-auth-smoke.mjs`。
2. 临时 PostgreSQL 17 上运行实际 Nest HTTP 路径。脱敏结果摘要：验证 201、返回体无 refresh、Cookie 属性齐全、`no-store`、恢复 200、错误 Origin 403、错误 CSRF 403、轮换 201、旧 Cookie 401 且无 `Set-Cookie`、退出 201、退出后恢复 401。原始 requestId/状态日志与无秘密摘要见 [HTTP 输出](./evidence/WEB-04/web-auth-http.txt)。
3. 原移动认证冒烟、双验证码换号和会话撤销回归通过；OpenAPI 共 75 项操作，旧契约兼容检查、API/契约 typecheck 和安全静态检查均退出 0。逐命令路径与 SHA-256 见 [WEB-04 检查清单](./evidence/WEB-04/checks.json)。
4. 首次新脚本执行曾因根目录未暴露 `jose` 包失败，改用已由服务端鉴权验证的 JWT 载荷检查 audience；首次 lint 暴露脚本未显式导入 Node 内建全局，补 `Buffer`、`URL`、`process` 并使用 `globalThis.fetch`。当前源码的 lint、编译、PGlite 服务测试及独立 PostgreSQL 真实 HTTP 均重新执行成功，最终输出见 [服务复验](./evidence/WEB-04/web-auth-service-final.txt)和[HTTP 复验](./evidence/WEB-04/web-auth-http-final.txt)。失败与修复未被当成业务验收结果。

工具输出未保存 Cookie 值、验证码、完整手机号或 access/refresh token。HTTP 日志只有 requestId、方法、固定路由、状态与哈希化幂等标识。上述服务/API 检查不能代替 WEB-05 的真实浏览器登录、导航、重载及 F/V/N 证据。

## 后续

- WEB-05 建立同站点 React 客户端后，验证真实浏览器 Cookie、自动续期、多标签同步、桌面和手机登录页面及 AUTH 全部用例；结果逐变体进入 `evidence/<runId>/...`。
- WEB-20 复核 HTTPS、CSP、跨源、浏览器缓存、CSRF 和安全失败注入。
- WEB-04 API 任务已勾选；AUTH/SEC 用例仍待真实浏览器逐项取证，不提前标记 `PASS`。
