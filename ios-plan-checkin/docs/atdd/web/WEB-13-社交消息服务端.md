# WEB-13｜好友、分享与社交消息服务端

## 1. 基线与任务边界

- 依据：[Web PRD](../../PRD-计划打卡-Web-v1.md) §5.2、[Web 技术方案](../../技术方案-计划打卡-Web-v1.md) §8.2、[Web ATDD](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) SOCIAL/NOTIFY/SEC。WEB-03 已创建 `inbox_messages` 唯一业务键与账号级 `read_at`；WEB-04 已提供 Web 会话；WEB-06 已完成计划数据基础。
- 开始时好友、分享、鼓励及 APNs 工作项已存在，社交消息尚不能持久回看或标记已读。本任务提供服务端数据与 API；WEB-14/16 负责 Web 消息页面和浏览器交互，本次没有业务 F/V/N 浏览器结果。

## 2. 事务、读取与兼容行为

| 能力 | 代码与接口 | 保证 |
| --- | --- | --- |
| 业务事件写入 | `notification-jobs.ts`、`SocialService`、`RecordsService` | 好友申请、接受、计划分享、共享记录更新、鼓励在对应业务事务内写 `inbox_messages`。业务事件键唯一且重复通知入队不会重复生成消息；没有计划打卡提醒持久消息。`sanitized_payload` 保持空对象，不存计划名、备注、失败原因、留言或照片。 |
| 消息读取 | `GET /api/v1/me/inbox?cursor=&limit=` | 限 1～50 条，按创建时间与 ID 倒序游标分页；游标带账号绑定的 HMAC，篡改或跨账号使用返回 400。返回当前账号未读数。每条消息重新检查好友请求、好友关系、分享授权、屏蔽、账号与计划状态。失权后保留事件类型与时间，但 `canOpen:false`，目标和对方 ID 变 `null`。 |
| 已读 | `POST /api/v1/me/inbox/{id}/read` | 必须为本人消息且有幂等键；数据库 `read_at` 仅首次填写，重复请求返回同一时间。状态按账号保存，另一 Web 会话立即读取同一已读值；跨 iOS 的共享目标基于同一账号行，iOS 客户端联测另行验收。 |
| 权限复核 | `InboxService.canOpen` 与旧分享 API | 分享撤销、好友删除或屏蔽后不能从旧消息打开原分享；`GET /shared-plans/{id}` 同时拒绝。陌生人不能读取或标已读他人消息。旧社交 API 的请求、响应及路由保持不变。 |

## 3. 实际检查与证据

- [14 项原始检查清单](./evidence/WEB-13/checks.json)含退出码、原始命令输出和 SHA-256：契约/API 编译、79 个 OpenAPI 操作、兼容基线、旧好友/分享/通知/记录回归、PGlite 消息测试、真实 HTTP、安全静态、lint、格式和台账均通过。
- [A/B/C/D PGlite 服务证据](./evidence/WEB-13/web-inbox-smoke.txt)：每种事件各 1 条，重复好友申请及工作项均不增消息；B 的两个读取实例看到相同 `readAt`；分页游标不能由 C 使用或篡改；撤销后旧分享与更新消息隐藏目标；C、D 无消息，D 被屏蔽后无法申请好友。输出只含聚合计数与布尔断言，不含私人备注或留言。
- [隔离 PostgreSQL 17 真实 HTTP](./evidence/WEB-13/inbox-http.txt)：全新 `web_atdd_web13` 测试库迁移到 `0012`，4 个合成账号，B 的第二独立 Web 会话由测试库种子和真实 `/auth/web/session` 恢复。好友、分享、记录、鼓励产生 5 种各 1 条；跨会话已读一致，同键重试均 201、C 标记 B 消息 404；B 游标跨 C 使用 400；撤销后原分享读取 403、消息目标隐藏；D 被屏蔽的申请 403；私人 GET `no-store`。临时容器运行后自动停止并删除。
- 旧 [好友](./evidence/WEB-13/social-smoke.txt)、[分享](./evidence/WEB-13/shares-smoke.txt)、[通知](./evidence/WEB-13/social-notifications-smoke.txt)、[记录](./evidence/WEB-13/records-smoke.txt) 回归，以及[安全静态检查](./evidence/WEB-13/security-static.txt)继续通过。

## 4. 失败、修复与验收限制

- 首次真实 HTTP 自测在同一 loopback IP 发出第五次短信挑战时命中既有限流 429。改为只登录 A/B/C/D 四个测试账号，随后为 B 在隔离库建立第二 Web refresh 会话，并通过真实恢复接口取得 access；复测通过。没有提高或绕过产品短信限流。
- 收件箱只保存最小事件元数据，不保存社交正文。对失权消息只返回通用历史信息，具体文案由 WEB-14 页面设计。已读跨端产品要求使用相同账号级数据库字段；本次只核查两个 Web 会话，未把 iOS 客户端联测计为 Web 发布门槛。
- 还没有 Web 消息中心截图、DOM、无障碍树、点击跳转或正式浏览器矩阵结果。SOCIAL/NOTIFY/SEC 的 136 项总台账继续 `NOT_RUN`；WEB-13 服务端通过不能替代 WEB-14/16/21 正式验收。
