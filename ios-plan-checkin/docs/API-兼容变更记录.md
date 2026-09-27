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
