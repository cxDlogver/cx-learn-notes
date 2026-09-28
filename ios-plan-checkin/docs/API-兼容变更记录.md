# API 兼容变更记录

本文件记录开发阶段相对于 `packages/contracts/compat-baseline.json` 的接口增量。接口定义以 `packages/contracts/src/routes.ts`、`src/index.ts` 和生成的 `openapi.json` 为准。

## OPS-02 完整数据导出

- 新增 `POST /api/v1/me/data-exports`、`GET /api/v1/me/data-exports`、`GET /api/v1/me/data-exports/{id}`、`GET /api/v1/me/data-exports/{id}/download-url`。创建需要幂等键，同一账户同时仅运行一项，每日最多创建五项；列表和下载仅限本人。
- Worker 在只读一致性快照中导出本人资料、计划与规则、打卡及修订、照片、好友与分享等数据为 JSON、CSV 和 ZIP 清单。逐表和照片流式写入私有对象存储；导出文件最多 2 GiB，下载地址有效期 5 分钟，文件在完成 24 小时后过期清理。下载请求留存访问审计。
- 客户端导出页展示队列、处理、完成与失败状态；完成后先下载到应用缓存，再调用 iOS 分享面板，并清理缓存文件。ZIP 清单记录各文件哈希与字段；服务端生成 ZIP 的完整性由开发自检验证。真实对象存储、iOS 分享面板与系统文件保护需后续原生环境验证。

开发自检由 `pnpm export:smoke`、`pnpm check` 与 `pnpm mobile:bundle:check` 执行；正式 ATDD 验收另行进行。

## OPS-03 计划删除与账号注销

- 落地既有 `POST /api/v1/me/deletion-request`、`POST /api/v1/me/deletion-cancel`、`GET /api/v1/me/deletion-status`。申请体必须包含 `confirmed: true`；提交后立即停用账号、撤销会话和分享、关闭设备推送，并设置 30 天到期时间。客户端同时清除本机加密数据库、照片、密钥、导出缓存和本账号本地提醒。
- 撤销注销通过 `POST /api/v1/auth/sms/challenges` 的 `purpose=cancel_deletion` 获取原手机号验证码，再将 `challengeId` 和 `code` 提交至无需旧会话的 `deletion-cancel`。验证码只能用于对应用途；到期后不能撤销。撤销后好友关系保留，原逐计划分享不自动恢复。
- 删除计划立即不可读，并通过既有媒体清理作业先移除照片对象，再物理删除关联记录。为覆盖最长 10 分钟上传签名，物理清理至少等待 11 分钟。注销到期后 Worker 等照片及导出文件对象清理完成，再删除账号数据和手机号，并记录恢复备份时使用的删除墓碑。
- 迁移 `0010_deletion_audit.sql` 保存计划删除作业的状态、尝试次数与完成时间；账号完成墓碑保存重试次数和最后失败代码。恢复脚本以签名文件独立导出、回放墓碑，并在恢复账号彻底清除前阻止开放 API。
- `deletion-cancel` 从预留接口调整为无需 Bearer 会话；请求须经短信验证。`X-Device-Id` 可选，不传时服务端生成设备标识；其余既有接口参数保持兼容。

开发自检由 `pnpm deletion:smoke`、`pnpm media:smoke`、`pnpm check` 与 `pnpm mobile:bundle:check` 执行。真实对象存储、短信通道、iOS Keychain/SQLCipher/通知与正式 ATDD 留待相应环境验证。备份墓碑操作见 [OPS-03-删除与墓碑流程.md](./OPS-03-删除与墓碑流程.md)。

## SOC-01 好友关系

- 新增 `GET /api/v1/friends`，返回当前好友的用户名、昵称和可选头像；不返回手机号、计划或统计。
- 既有好友搜索、申请、接受、删除、拉黑路由补齐实现与请求/响应 DTO。双向待处理申请自动成为好友；删除好友或拉黑撤销双方已生效的逐计划分享，并写收件人同步撤销事件。
- 不修改已有路由的必填参数或响应状态；`GET /api/v1/friends` 为纯增量。

## SOC-02 逐计划分享

- 新增 `GET /api/v1/plans/{id}/share-preview?friendId=&month=`、`GET /api/v1/plans/{id}/shares`、`GET /api/v1/shared-plans/{id}`。
- 既有 `PUT /api/v1/plans/{id}/shares/{friendId}` 现在要求必填 `previewToken`；凭证由分享预览签发，绑定本人、计划、好友和当时的计划/历史内容摘要，有效期 10 分钟。记录变化后须重新预览。此项收紧请求体，原路由尚未落地服务端且没有已发布客户端；后续客户端必须先调用预览再授权。
- 既有 `GET /api/v1/shared-plans/{id}/checkins` 增加**可选** `month` 参数；不传时按计划时区返回当前月，保留旧调用方式。响应使用专门的朋友侧字段白名单，包含历史状态、文字说明、失败原因、补记/修订标记和周汇总；不包含照片、数值、分组及用户私有统计。
- 既有好友分享列表与撤销路由补齐实时关系校验。撤销后新请求返回 `SHARE_REVOKED`，并写同步撤销事件；好友关系本身不授权计划读取。

开发自检由 `pnpm social:smoke` 与 `pnpm shares:smoke` 执行；真实 PostgreSQL 并发、iOS 客户端和正式 ATDD 留待对应阶段。

## SYNC-02 增量同步

- 实现既有 `GET /api/v1/sync/changes`：按用户递增序号分页，`limit` 为 1–200，返回变更、签名游标和 `hasMore`。游标绑定账号，有效期 90 天；无效或过期返回 `CURSOR_EXPIRED`，客户端清空游标后重拉。当前不清理 `change_log`，因此重拉可从序号 0 重放。
- 实现既有 `POST /api/v1/sync/ack`：必填 `deviceId` 和非空 `cursor`，按设备单调记录已应用序号；重复或较旧确认不回退服务端水位。确认只用于同步状态，不改变打卡结果。
- 计划、分组、记录和资料写入账号变更序列；好友及分享事件继续使用既有变更序列。读取时对计划、记录、好友、分享重新校验当前可见性，已删除或撤销的数据返回相应 tombstone。
- 客户端逐页先持久化计划、记录和撤销标记，再提交游标和确认；保留未发送的本地记录草稿。该接口此前仅为契约预留，现补齐实现，不改变已发布客户端行为。

开发自检由 `pnpm sync:smoke`、`pnpm mobile:incremental-sync:smoke` 与 `pnpm mobile:bundle:check` 执行；真实 PostgreSQL 并发、多设备 iOS/SQLCipher 和正式 ATDD 留待后续验证。

## SYNC-04 私人照片

- 实现已预留的 `POST /api/v1/media/upload-intents`、`POST /api/v1/media/{id}/complete`、`GET /api/v1/media/{id}/download-url` 和 `DELETE /api/v1/media/{id}`。上传意图返回 10 分钟 S3 兼容直传签名与必须携带的 `Content-Type`、SHA-256 校验头；下载返回 5 分钟的仅本人可请求的签名地址。
- 完成关联前服务端重新读取对象，校验长度、SHA-256 和文件头；只允许本人关联自己的打卡或已有结果的一次性任务，单条记录最多 9 张。重复完成同一关联返回同一媒体。好友只读响应继续剔除照片与数值。
- 照片完成、删除独立于基础记录事务；移动端先将选中图片重新编码为 JPEG 并复制到当前账户私有目录，基础记录同步后才上传。失败独立显示并可重试；孤儿对象由 Worker 扫描和清理。
- 新增 `OBJECT_PUBLIC_ENDPOINT` 用于手机可访问的签名 URL，`OBJECT_ENDPOINT` 用于 API/Worker 内网访问；生产环境两者必须为 HTTPS。新库迁移 `0007_media_cleanup.sql` 增加对象清理时间戳与扫描索引。

开发自检由 `pnpm media:smoke`、`pnpm mobile:local-schema:smoke` 与 `pnpm mobile:bundle:check` 执行；真实 MinIO、iOS 相册权限、弱网和后台恢复留待有设备的阶段验证。

## SOC-03 好友与分享客户端

- 新增 `POST /api/v1/friend-requests/{id}/reject`，仅接收人可拒绝待处理申请。返回既有 `FriendRequestDto`，状态为 `rejected`；重复幂等键返回相同结果，已变化申请返回 `RULE_CHANGED`。
- 客户端六页使用现有好友、逐计划授权和只读历史接口；开启分享必须先取得绑定当前内容的预览凭证。取消分享和删除/屏蔽好友后清除相关本机查询缓存。好友只读页只消费服务端的 `SharedHistoryDto` 白名单，不请求本人的记录或私人照片接口。

开发自检由 `pnpm social:smoke`、`pnpm shares:smoke` 与 `pnpm mobile:bundle:check` 执行；Pen 截图与 VoiceOver 真机核对留待后续验证。

## SOC-04 计划提醒

- 落地既有 `GET /api/v1/plans/{id}/reminder`、`PUT /api/v1/plans/{id}/reminder`。读取只允许计划本人；未配置时返回关闭状态与修订号 0。写入必须携带 `baseRevision` 和幂等键，修订冲突返回 `RULE_CHANGED`，成功后写入计划增量同步事件。
- 固定日期提醒跟随当前计划规则的星期；每周目标需选择提醒星期，达到当周目标后停止本周后续提醒；一次性任务只能选择截止当天、提前 1 天或提前 3 天，终态后停止。API 字段按计划类型校验，开启时必须有 `HH:mm` 时间。
- iOS 客户端按计划时区计算未来 14 天，最多排程 50 条本地通知，稳定标识包含账号、计划、业务日期和提醒修订号。记录保存、计划状态变化、会话/网络/前台恢复和增量同步后重排；通知正文不含计划名或记录内容。点击后重新校验本人权限并打开计划详情。
- 首次开启提醒前说明用途，权限拒绝时保留 App 内规则并显示系统设置入口；不会反复请求已不可再次弹出的系统权限。

开发自检由 `pnpm test:unit`、`pnpm reminders:smoke` 与 `pnpm mobile:bundle:check` 执行；iOS 本地通知、时区变化、权限弹窗、Pen 截图和 VoiceOver 真机核对留待后续验证。

## SOC-05 鼓励留言与社交通知

- 落地既有 `POST/GET /api/v1/checkins/{id}/encouragements`。朋友只有在当前好友关系、逐计划授权、未拉黑和账户有效时才能对该条记录发送 Emoji 或文字；本人可看所有收到的鼓励，发送人仅能看自己的留言，其他获授权好友看不到。撤销授权后发送人失去历史留言读取权，主人保留已收到的内容。好友共享历史增加 `checkinId`，只用于打开有记录的鼓励入口。
- 落地既有 `POST /api/v1/devices/push-token` 和 `GET/PATCH /api/v1/me/notification-preferences`。设备 token 在服务端以 AES-GCM 加密，索引使用 HMAC 摘要；好友申请、计划分享、鼓励留言三项开关独立。通知偏好写入使用修订号与幂等键。登出时撤销当前设备 token；Worker 只选有有效会话的设备。
- 业务事务只写不含正文的 `worker_jobs` 事件。Worker 发前重新检查好友、分享、拉黑、账户、偏好和设备状态；撤销后的待发事件跳过。APNs 使用 HTTP/2、ES256 token、过期时间、折叠 ID；每设备接受结果持久化，重试跳过已接受设备，失效 token 停用。通知载荷仅包含通用文案与 `kind=social`，不含账户 ID、计划名、备注、失败原因、Emoji、照片或数值。点按后在当前已登录账户重新读取朋友数据。
- 新迁移 `0008_social_notifications.sql` 增加鼓励类型、事件去重索引与逐设备投递表。开发态可使用 APNs stub；预发和生产必须注入真实 APNs 与 token 加密密钥。

开发自检由 `pnpm social-notifications:smoke`、`pnpm social:smoke`、`pnpm shares:smoke` 与 `pnpm mobile:bundle:check` 执行。真实 APNs 沙箱、设备 token、后台投递、权限弹窗和正式 ATDD 留待有 iOS 环境时验证。APNs 接受与设备展示之间没有端到端强保证；进程在 APNs 接受后、投递表落库前崩溃时可能重发，折叠 ID 可减少可见重复。
