# Access JWT、单次 Refresh Token 与 WebSocket 首帧鉴权设计

## 1. 背景

当前活动后端 `QHZHC_Server` 使用服务端 Session Token：

- 登录后生成随机 Token，并通过 `qhzhc_session` Cookie 返回；
- HTTP API 和 WebSocket Upgrade 都根据 Cookie 查询 `sessions` 表；
- WebSocket 心跳期间重新查询 Session，用于发现会话过期。

本次改造将认证模型调整为：

- Access Token 使用短期 JWT，只保存在前端内存；
- Refresh Token 使用高熵随机字符串，只保存在 `HttpOnly` Cookie；
- Refresh Token 每次只能使用一次，每次刷新都执行轮换；
- 已消费的 Refresh Token 再次出现时，撤销整个 Token Family；
- HTTP API 在 `401` 后自动刷新并重试一次；
- WebSocket Upgrade 不鉴权，连接建立后的第一条消息必须完成 Access JWT 鉴权；
- WebSocket 鉴权失败立即断开，Access JWT 失效后刷新并重新建连。

## 2. 目标

1. 将高频 HTTP API 的认证凭证统一为 Bearer Access JWT。
2. 避免在浏览器持久化 Access JWT，缩小凭证被直接读取的范围。
3. 使用服务端可控的 Refresh Token 实现续期、退出、设备会话撤销和重放检测。
4. 保留现有 WebSocket 心跳、指数退避、序号续传、缺口补发和背压能力。
5. 保证同一个前端运行实例中并发 `401` 只触发一次刷新。

## 3. 非目标

- 不引入 OAuth 2.0 或 OpenID Connect 授权服务器。
- 不实现跨浏览器标签页的 Refresh 协调。
- 不允许 WebSocket 连接内热更新 Access JWT。
- 不迁移或删除旧 `sessions` 表，避免破坏现有 SQLite 文件。
- 不改变走航车采样、窗口查询、序号恢复和可视化业务逻辑。

## 4. 总体架构

```text
登录或注册
  -> 服务端签发短期 Access JWT
  -> 响应体返回 Access JWT
  -> 前端只保存到模块内存
  -> 服务端生成随机 Refresh Token
  -> 数据库只保存 Refresh Token 哈希
  -> Set-Cookie 写入 HttpOnly Refresh Cookie

HTTP API
  -> 请求拦截器读取内存 Access JWT
  -> Authorization: Bearer <access-token>
  -> 401 时单飞调用 /api/auth/refresh
  -> 浏览器自动携带 Refresh Cookie
  -> 服务端原子消费旧 Refresh Token 并轮换
  -> 响应体返回新 Access JWT
  -> Set-Cookie 替换新 Refresh Token
  -> 原请求分别重试一次

WebSocket
  -> 建立未鉴权连接
  -> 第一条 authenticate 消息携带 Access JWT
  -> 服务端完成 JWT、Family、权限、协议和车辆校验
  -> 成功后发送 welcome 与 replay
  -> 失败后立即关闭
```

## 5. Token 设计

### 5.1 Access Token

Access Token 使用 JWT，默认有效期为 15 分钟。

Claims：

| Claim | 说明 |
| --- | --- |
| `sub` | 用户 ID |
| `sid` | Token Family ID，也是当前设备会话 ID |
| `role` | 当前用户角色 |
| `iss` | 固定为 `qhzhc-auth` |
| `aud` | 固定为 `qhzhc-api` |
| `iat` | 签发时间 |
| `exp` | 到期时间 |
| `jti` | Access JWT 唯一 ID |

校验时必须固定允许的签名算法，并检查签名、`iss`、`aud`、`exp`、`sub` 和 `sid`。签名密钥从 `JWT_SECRET` 读取；生产环境要求至少 32 字节，开发和测试环境使用明确标注的本地默认值。

Access JWT 只保存在前端模块内存：

- 不写入 `localStorage`；
- 不写入 `sessionStorage`；
- 不写入 Cookie；
- 页面刷新后通过 Refresh Token 恢复。

### 5.2 Refresh Token

Refresh Token 是 32 字节加密安全随机数的 Base64URL 字符串，默认 Family 绝对有效期为 7 天。

浏览器只通过以下 Cookie 持有它：

```http
Set-Cookie: qhzhc_refresh=<token>;
HttpOnly;
Secure;
SameSite=Lax;
Path=/api/auth
```

本地 HTTP 开发环境根据 `request.secure` 调整 `Secure`；生产环境必须使用 HTTPS。前端 JavaScript 不读取、不保存、不手动更新 Refresh Token。

数据库只保存 Refresh Token 的 SHA-256 哈希。Token 明文只在生成时和浏览器 Cookie 中存在。

## 6. 数据模型

新增 `refresh_tokens` 表：

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_hash TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_token_hash TEXT,
  replaced_by_hash TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  revoked_at INTEGER
);

CREATE INDEX IF NOT EXISTS refresh_tokens_family_id
  ON refresh_tokens(family_id);

CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at
  ON refresh_tokens(expires_at);
```

同一个登录动作创建一个新的 `family_id`。同一 Family 中所有 Refresh Token 使用相同的绝对过期时间，刷新不会无限延长登录期限。

已消费 Token 保留到 Family 过期。不能在轮换后立即删除，否则服务端无法识别旧 Token 重放。

## 7. 登录、注册与页面恢复

登录和注册成功后：

1. 创建 Token Family；
2. 生成第一个随机 Refresh Token；
3. 保存 Token 哈希；
4. 签发 Access JWT；
5. 通过 `Set-Cookie` 返回 Refresh Token；
6. 在响应体返回 Access JWT、到期时间和用户资料。

响应结构：

```json
{
  "accessToken": "<jwt>",
  "accessTokenExpiresAt": 1787800000000,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

前端登录和注册逻辑把 `accessToken` 写入内存 Token Store，再继续跳转。

页面刷新后，内存 Token 丢失。受保护路由首次请求 `/api/auth/session` 时会收到 `401`，Axios 拦截器自动刷新 Token，再重试 Session 请求。刷新失败才清理用户资料并跳转登录。

## 8. Refresh Token 单次轮换

刷新端点为：

```http
POST /api/auth/refresh
Cookie: qhzhc_refresh=<current-token>
```

服务端在 SQLite `BEGIN IMMEDIATE` 事务中执行：

1. 对 Cookie 中的 Refresh Token 求 SHA-256；
2. 查询对应记录；
3. 根据记录状态决定拒绝、撤销或轮换；
4. 将旧 Token 标记为已消费；
5. 生成新随机 Refresh Token；
6. 插入同一 Family 的新记录；
7. 提交事务；
8. 签发新 Access JWT；
9. 通过 `Set-Cookie` 替换 Refresh Token；
10. 在响应体返回 Access JWT。

状态规则：

| 状态 | 服务端行为 |
| --- | --- |
| Token 不存在 | 返回 `401 REFRESH_TOKEN_INVALID` |
| Token 已过期 | 返回 `401 REFRESH_TOKEN_EXPIRED` |
| Family 已撤销 | 返回 `401 TOKEN_FAMILY_REVOKED` |
| Token 已消费但 Family 未撤销 | 撤销整个 Family，返回 `401 REFRESH_TOKEN_REUSED` |
| Token 可用 | 原子消费旧 Token，创建新 Token 并返回新 Access JWT |

严格单次消费不提供并发宽限窗口。同一个 Cookie 被多个浏览器标签页同时刷新时，第二次提交会被视为重放并撤销 Family。这是本次明确选择的安全策略。

## 9. HTTP 自动刷新

前端新增内存 Token Store：

```ts
interface AccessTokenStore {
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  clearAccessToken(): void;
  refreshAccessToken(): Promise<string>;
}
```

`refreshAccessToken()` 使用模块级 Promise 实现单飞：

```text
第一个 401
  -> 创建 refreshPromise
  -> 调用 /api/auth/refresh

其余并发 401
  -> 复用同一个 refreshPromise

刷新完成
  -> 清空 refreshPromise
  -> 每个原请求分别重试一次
```

请求拦截器为受保护请求增加：

```http
Authorization: Bearer <access-jwt>
```

响应拦截器遵循以下限制：

- 原请求通过私有标记保证最多重试一次；
- `/api/auth/login`、`/api/auth/register` 和 `/api/auth/refresh` 不触发自动刷新；
- Refresh 失败后清理内存 Token 和本地用户资料；
- 仅 Refresh 失败后跳转登录，不在第一个 Access Token `401` 时立即跳转；
- 所有受保护请求统一使用该 Axios 实例，不保留绕过认证的直接 `fetch`。

## 10. WebSocket 首条消息鉴权

### 10.1 Upgrade

服务端只检查请求路径是否匹配：

```text
/ws/robots/:robotId
```

Upgrade 阶段不读取 Access Token，不读取 Refresh Token，也不建立用户身份。连接进入 `CONNECTED_UNAUTHENTICATED` 状态。

### 10.2 第一条消息

客户端必须在连接打开后立即发送：

```json
{
  "type": "authenticate",
  "accessToken": "<access-jwt>",
  "protocolVersion": 1,
  "robotId": "QH-ZHC-01",
  "lastSequence": 12840
}
```

这条消息替代原来的 `hello`，同时完成：

1. JWT 签名和 Claims 校验；
2. Token Family 状态检查；
3. 用户存在性与角色读取；
4. 实时数据权限检查；
5. 协议版本检查；
6. URL 车辆 ID 与消息车辆 ID 一致性检查；
7. 根据 `lastSequence` 创建断点恢复计划。

鉴权成功后，连接进入 `AUTHENTICATED` 状态，服务端才发送 `welcome`、replay 和模拟器状态。鉴权前不能处理 `ping`、`ack`、`resend` 或任何业务消息。

### 10.3 鉴权失败

| 场景 | 关闭码 |
| --- | ---: |
| 5 秒内未发送鉴权消息 | `4100` |
| 第一条消息不是 `authenticate` | `4100` |
| 报文格式或协议版本错误 | `4100` |
| Access JWT 缺失、伪造、过期或 Family 撤销 | `4001` |
| 用户没有实时数据权限 | `4003` |

连接失败后不发送业务数据。

### 10.4 连接期间失效

每轮服务端心跳复检：

- Access JWT 是否到期；
- Token Family 是否仍有效；
- 用户是否仍然存在；
- 用户是否仍具备实时数据权限。

认证失效时以 `4001` 关闭，权限撤销时以 `4003` 关闭。连接内不支持 Access JWT 热更新。

客户端收到 `4001` 后：

1. 调用全局 `refreshAccessToken()`；
2. 刷新成功后保留 `lastSequence`；
3. 建立新 WebSocket；
4. 使用新 Access JWT 发送 `authenticate`；
5. 从最后已提交页面的序号恢复。

刷新失败时停止重连并跳转登录。`4003` 和 `4100` 不触发刷新或指数退避。网络错误、`1012` 和 `1013` 继续使用现有退避策略。

## 11. 登出与撤销

登出端点要求有效 Access JWT：

```http
POST /api/auth/logout
Authorization: Bearer <access-jwt>
```

服务端根据 JWT 中的 `sid` 撤销整个 Token Family，清除 Refresh Cookie 并返回 `204`。前端无论请求成功与否，都清除内存 Access JWT 和本地展示资料。

Family 撤销后：

- 当前 Family 的所有 Refresh Token 都不能继续使用；
- 已签发 Access JWT 因 `sid` 状态检查而立即失效；
- 该 Family 对应的 WebSocket 在下一轮心跳时关闭。

## 12. 服务端模块边界

| 模块 | 职责 |
| --- | --- |
| `config.ts` | Access TTL、Refresh TTL、JWT 密钥与签发参数 |
| `database.ts` | Refresh Token 创建、原子轮换、Family 撤销、过期清理 |
| `auth.ts` | 密码校验、JWT 签发验证、Bearer 提取、Refresh 生命周期编排 |
| `app.ts` | Cookie 下发、刷新端点、HTTP 鉴权中间件和错误响应 |
| `protocol.ts` | `authenticate` 消息与关闭码协议 |
| `robot-socket-hub.ts` | 未鉴权连接状态、首帧鉴权、心跳复检与断点恢复 |

## 13. 前端模块边界

| 模块 | 职责 |
| --- | --- |
| `services/accessToken.ts` | 内存 Token、单飞刷新和清理 |
| `utils/request.ts` | Bearer 注入、`401` 刷新和单次重试 |
| `api/auth.ts` | 登录、注册、登出并同步内存 Token |
| `services/authSession.ts` | 通过统一 Axios 实例获取用户资料 |
| `realtimeClient.ts` | 首帧鉴权、`4001` 刷新后重连、序号恢复 |

## 14. 测试设计

### 14.1 服务端

1. 登录返回 Access JWT 和 Refresh Cookie，不再返回 Session Cookie。
2. Access JWT 包含正确的 `sub`、`sid`、`iss`、`aud` 和到期时间。
3. Bearer Token 可以访问受保护 API；缺失、伪造和过期 Token 返回 `401`。
4. Refresh Token 第一次使用成功，旧 Token 标记为已消费，新 Token 属于同一 Family。
5. 旧 Refresh Token 第二次使用时撤销整个 Family。
6. Family 撤销后，新 Refresh Token 和已签发 Access JWT 都失效。
7. 登出撤销 Family 并清除 Refresh Cookie。
8. WebSocket 无认证信息也可以完成 Upgrade。
9. WebSocket 第一条非 `authenticate` 消息立即以 `4100` 关闭。
10. 无效 Access JWT 以 `4001` 关闭。
11. 合法鉴权后继续发送 `welcome` 并按 `lastSequence` replay。
12. Family 撤销后，已连接 WebSocket 在心跳复检时关闭。

### 14.2 前端

1. 登录和注册响应把 Access JWT 写入内存。
2. 请求拦截器正确添加 Bearer Token。
3. 多个并发 `401` 只触发一次 Refresh 请求。
4. Refresh 成功后，每个原请求只重试一次。
5. Refresh 失败后清理认证状态并跳转登录。
6. WebSocket 打开后的第一条消息是 `authenticate`。
7. WebSocket `4001` 后先刷新，再使用新 Token 重连。
8. WebSocket `4003` 和 `4100` 不刷新、不重连。
9. Gap HTTP 恢复使用统一认证请求实例。
10. 原有指数退避、乱序缓冲、ACK 和页面可见性行为保持不变。

## 15. 配置与迁移

新增配置：

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `ACCESS_TOKEN_TTL_MINUTES` | `15` | Access JWT 有效期 |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Token Family 绝对有效期 |
| `JWT_SECRET` | 仅开发/测试默认 | JWT HMAC 密钥 |

`SESSION_TTL_HOURS` 停止使用。旧 `sessions` 表保留但不再读写；后续独立迁移确认无需回滚旧版本后再删除。

## 16. 安全边界

- 生产环境必须使用 HTTPS 和 WSS。
- Refresh Token 仅通过 `HttpOnly` Cookie 传输。
- Refresh 接口只接受 Cookie，不接受请求体或 URL 中的 Token。
- Access JWT 不写入浏览器持久化存储。
- JWT 验证固定算法、`iss` 和 `aud`，不信任 Token Header 自行选择算法。
- 错误响应不回显 Token。
- 日志不记录 `Authorization` Header、Refresh Cookie 或 WebSocket 鉴权消息正文。
- Cookie 鉴权的 Refresh 请求需要使用明确的 CORS Origin 白名单和 Credentials 配置。

## 17. 验收标准

1. 登录后 HTTP API 使用内存 Access JWT 正常访问。
2. 页面刷新后无需重新输入密码，Refresh Cookie 可以恢复 Access JWT。
3. Access JWT 到期后，第一个 API 请求自动刷新并成功重试。
4. 同一运行实例中的并发 `401` 只消费一次 Refresh Token。
5. 旧 Refresh Token 重放会撤销整个 Family。
6. WebSocket 首帧鉴权前不发送任何实时业务数据。
7. WebSocket Access JWT 失效后能够刷新、重连并从 `lastSequence` 续传。
8. Refresh 失败、权限不足和协议错误不会进入无限重连。
9. 服务端与前端的测试、类型检查和构建全部通过。
