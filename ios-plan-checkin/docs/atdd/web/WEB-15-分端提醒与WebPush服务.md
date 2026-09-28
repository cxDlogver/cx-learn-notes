# WEB-15｜分端提醒与 Web Push 服务（进行中）

## 1. 验收基线与范围

- 依据：[Web PRD](../../PRD-计划打卡-Web-v1.md) 的分端提醒、共享时间规则和通用外层文案；[技术方案](../../技术方案-计划打卡-Web-v1.md) §8；[Web ATDD](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) NOTIFY/SEC。用户已确认站内提醒必需、浏览器通知链路必需、后台稳定送达仅观察，Web/iOS 投递开关独立。
- 本任务负责 API、数据、计划提醒调度、Web Push 服务端发送与失效处理。权限弹窗、Service Worker、真实浏览器展示和点击导航属 WEB-16/21；本任务服务端结果不把任何业务用例标为 `PASS`。

## 2. 已实现增量（2026-09-28 23:24 CST）

| 层 | 已实现行为 | 当前证据与限制 |
| --- | --- | --- |
| 会话 | 认证返回已验签、未撤销的账号、渠道及浏览器设备 ID；Web 专用接口拒绝 iOS access token。旧 `authenticate` 调用保持只返回账号。 | API 和契约 TypeScript 编译通过；Web/iOS 错渠道 HTTP 拒绝尚待隔离 HTTP 验证。 |
| 偏好 | `GET/PATCH /api/v1/me/notification-channels/web` 使用独立 `web` 行；计划/好友申请/共享更新/鼓励开关和修订冲突单独处理。iOS 旧偏好 API/表未改变。 | [PGlite 原始输出](./evidence/WEB-15/web-notifications-smoke.txt)检查独立默认、更新、跨账号、修订冲突和 iOS 行不变。 |
| 订阅 | `POST/DELETE /api/v1/me/web-push-subscriptions` 将订阅绑定已认证 Web 会话的设备 ID；端点 HMAC，端点与 `p256dh`/`auth` 均用 AES-256-GCM 加密。拒绝 HTTP、IP、非标准端口及不合规密钥；注销沿用 WEB-04 已有撤销。 | 同一 PGlite 输出检查注册、账号/设备绑定、密文、IP 拒绝、撤销；还未检查真实浏览器 PushSubscription、重订阅及真实 PostgreSQL HTTP。 |
| 契约 | OpenAPI 增至 83 个操作，旧移动契约兼容检查通过。 | 当前代码编译及契约检查通过；尚未生成 WEB-15 最终完整命令清单。 |

本阶段原始输出 SHA-256 为 `dcfd0d54a34d01ec9b64be6a6c910f5c95a2e810f83de8929a55f6b198d65faf`。脚本 `scripts/web-notifications-smoke.mjs` 共有 16 项断言，退出码 0；输出中的合成账号、密钥和端点仅在隔离测试库内使用。

## 3. 未完成与下一步

- 尚需真实 PostgreSQL HTTP、供应端 429/5xx 退避与作业状态、浏览器端到端接收、已提交 Git blob/文件哈希复核。WEB-15 持续 `IN_PROGRESS`，不能勾选。
- 136 项 Web 浏览器 ATDD 用例继续 `NOT_RUN`，没有产品页面截图或浏览器 F/V/N 结果。

## 4. 后续增量（2026-09-28 23:43 CST）

- 迁移 `0013_web_push_delivery.sql` 增加订阅级供应端受理记录，以及消息和计划提醒的永久去重索引。空库 SQL 静态检查为 42 表、13 迁移；旧 APNs 表和 iOS API 结构保持不变。新 Web Push 任务只在持久收件箱事件首次创建时入队，覆盖好友申请/接受、分享、共享更新和鼓励。
- Worker 使用 RFC 8291 `aes128gcm` 单记录加密，并用 RFC 8292 VAPID ES256 标识发送源；通知明文只含通用标题、通用正文和 `/today` 或 `/inbox` 路径，绝不含计划名、备注、失败原因或留言。只接受 Google FCM、Mozilla、Apple 和 Windows Push 的 HTTPS 提供方域；API 注册与 Worker 发送均校验。提供公开 `GET /api/v1/web-push/config` 获取 VAPID 公钥，部署清单增加公私钥与 Web 站点来源的注入项。OpenAPI 当前 84 操作。
- 社交 Worker 每个订阅单独记供应端受理，重试跳过已受理设备；发送前复核账号、事件可见性、Web 渠道偏好和当前 Web 会话。410/404 永久失效撤销订阅；其他失败记录可重试状态。计划 Worker 每分钟按计划时区生成当天任务，任务键含账号、计划、业务日期、时间槽、Web 渠道；发送前重新加载计划、已打卡日期、周目标、一次性终态、Web 开关与订阅会话。
- [社交/订阅 PGlite 输出](./evidence/WEB-15/web-notifications-worker.txt) 24 项断言，包含社交入队、供应端受理、重试去重、分端静音、410 清理；SHA-256 `cae5c096fb933ce957013165ba07900fa93a07c97c86a116f31a3e53cc69d969`。
- [固定时钟计划提醒输出](./evidence/WEB-15/web-plan-reminders.txt) 15 项断言，包含上海 18:05→UTC 10:05、同槽去重、发送复核、周目标/终态/暂停/开关抑制；SHA-256 `3785b81335727b9fdc0a368ae427cd1fa7d98595a34f2f806b872e63c884e68e`。
- [RFC 官方向量与供应端桩输出](./evidence/WEB-15/web-push-rfc.txt) 对照 RFC 8291 头与密文的固定向量逐字节通过，供应端桩检查 VAPID `aud`、授权头、通用加密正文大小；SHA-256 `c2c812c04afb6ab87b8bba5cca9ef11e3d9d9983a8d4db7634ab6f63d214597d`。[SQL 静态输出](./evidence/WEB-15/sql-static.txt) SHA-256 `b0838cf5bafc7a68284cd4ec6d977bfb097b83e95d77ec4b7401c41100f33c84`。
- 好友、分享、收件箱、旧 APNs 和打卡服务冒烟回归均通过。上述结果仍属于服务端和受控供应端桩，真实浏览器 Push 权限、Service Worker、前后台送达、点击跳转和完整 F/V/N 归 WEB-16/21。
