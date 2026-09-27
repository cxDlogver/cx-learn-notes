# API 兼容变更记录

本文件记录开发阶段相对于 `packages/contracts/compat-baseline.json` 的接口增量。接口定义以 `packages/contracts/src/routes.ts`、`src/index.ts` 和生成的 `openapi.json` 为准。

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
