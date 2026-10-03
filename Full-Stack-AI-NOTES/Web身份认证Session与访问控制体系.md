# Web 身份认证、Session 与访问控制体系

Web 应用的登录系统并不是“校验一次用户名密码”这么简单。用户第一次提交密码以后，后续几十次、几百次 HTTP 请求都不能再次要求输入密码；与此同时，服务器又必须确保这些请求确实属于已经登录的用户，并且这个用户只能访问自己有权限操作的资源。

因此一个完整的 Web 身份与访问控制系统，实际要连续解决下面几个问题：

~~~text
用户提交登录凭据
        ↓
服务器确认“你是谁”
        ↓
建立可持续的登录状态
        ↓
浏览器在后续请求中携带会话标识
        ↓
服务器恢复当前用户身份
        ↓
写请求还要确认不是跨站伪造
        ↓
根据当前用户 + 当前资源 + 当前操作判断权限
        ↓
执行业务
        ↓
退出登录、密码重置或过期时撤销会话
~~~

Authentication（身份认证）解决“请求者是谁”，Session Management（会话管理）解决“多次 HTTP 请求如何持续关联到同一个身份”，CSRF 防护解决“浏览器自动携带登录凭据时，怎样避免其他网站借用这个身份发起状态修改”，Authorization（访问授权）解决“已经知道你是谁以后，你是否有权操作当前资源”。

OWASP 也明确把 Authentication、Session Management 和 Access Control 视为彼此连接但不能混为一谈的三个安全模块。[[1]](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) [[2]](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

本文使用 Server-side Session（服务端会话）作为主要模型。Cookie 的单独安全属性继续参考 [Cookie 安全性概述笔记](./Cookie安全性概述笔记.md)，Access Token / Refresh Token 的令牌体系继续参考 [Access Token 与 Refresh Token 核心知识点笔记](./Access%20Token与Refresh%20Token核心知识点笔记.md)。

---

## 1. 身份认证把用户声明转换成服务器可以信任的用户身份

### 【登录请求中的邮箱只是身份声明，密码验证以后服务器才接受这个身份】

假设用户提交：

~~~http
POST /login

{
  "email": "alice@example.com",
  "password": "..."
}
~~~

这里的邮箱只能表达：

~~~text
Client 声称：
“我是 alice@example.com”
~~~

服务器不能因为 Request Body 中写了这个邮箱，就直接把当前请求当成 Alice。任何人都可以构造同样的 Request Body。

Authentication 真正发生在服务器验证 Credential（身份凭据）的阶段：

~~~text
email
  ↓
找到 User Record
  ↓
password
  ↓
使用 Password Hash Algorithm 验证
  │
  ├── 不匹配 → Authentication Failed
  │
  └── 匹配
        ↓
检查账号状态
        ↓
Authenticated User
~~~

因此身份认证不是“读取用户 ID”，而是建立：

~~~text
外部输入
“我是 User A”
        ↓
Credential Verification
        ↓
服务器内部可信结论
Current User = User A
~~~

OWASP 对 Authentication 的定义也是验证某个主体是否确实是其声称的身份。[[1]](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### 【密码不能直接存储，登录时比较的是重新计算出的 Password Hash】

注册时如果直接保存原始密码，一旦数据库泄露，攻击者立即获得所有用户凭据。密码因此需要经过专门的 Password Hash（密码哈希）算法处理。

正确模型不是可逆加密：

~~~text
Password
  ↓
Encrypt
  ↓
以后再 Decrypt
~~~

而是单向验证：

~~~text
Register

Password
  ↓
Password Hash Algorithm
+ Random Salt
  ↓
Encoded Password Hash
  ↓
Database


Login

Input Password
  ↓
按照已保存参数重新计算
  ↓
Computed Hash
        ↘
          Compare
        ↗
Stored Hash
~~~

Password Hash 应故意让大量猜测成本较高。OWASP 当前优先推荐 Argon2id，在无法使用 Argon2id 时可以使用正确配置的 scrypt；不建议使用 SHA-256 这类快速通用 Hash 直接保存密码。[[3]](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

Password 与高熵随机 Token 都可能使用 Hash，但目标不同：

| 数据 | 目标 | 合适的处理方式 |
| --- | --- | --- |
| Password | 数据库泄露后增加离线猜密码成本 | Argon2id / scrypt 等专用慢速算法 + Salt |
| 高熵随机 Session Token | 数据库泄露后不能直接拿存储值冒充 Client | 保存随机 Token 的单向摘要，例如 SHA-256 |

因此不能因为二者都叫 Hash，就使用同一套算法选择逻辑。

### 【邮箱验证属于账号生命周期，不等于已经建立登录会话】

常见注册过程是：

~~~text
Register
  ↓
创建 User
  ↓
生成 Email Verification Token
  ↓
发送验证链接
  ↓
用户提交 Token
  ↓
标记 Email Verified
~~~

Verification Token 证明的是持有者能够访问对应邮箱，不表示当前 Browser 已经拥有登录 Session。

因此应明确区分：

~~~text
创建账号
  ↓
确认邮箱控制权
  ↓
允许登录认证
  ↓
建立 Session
~~~

---

## 2. HTTP 请求之间没有天然用户关系，Session 用来把多次请求绑定到同一个登录身份

### 【登录成功只说明当前请求通过认证，不会让后续 HTTP 请求自动认识这个用户】

第一次请求：

~~~text
POST /login
email + password
        ↓
Authentication Success
~~~

几秒以后：

~~~text
GET /projects
~~~

第二个 HTTP Request 本身不会天然包含“这个请求就是刚才登录成功的 Alice 发来的”。

因此系统需要在登录成功后创建 Session：

~~~text
Login Success
     ↓
Create Session
     ↓
Session ID / Session Token
     ↓
返回 Client
     ↓
后续 Request 携带 Session ID
     ↓
Server Lookup Session
     ↓
恢复 Current User
~~~

OWASP 将 Web Session 描述为与同一用户关联的一系列 HTTP Request / Response，并指出 Session Identifier 用来在多个请求之间保持和恢复状态。[[2]](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

### 【Session Token 是查找会话的凭据，不应该等同于用户业务数据】

Server-side Session 可以理解为：

~~~text
Browser
┌─────────────────────────────┐
│ session_token = random...   │
└──────────────┬──────────────┘
               │
               │ Request Cookie
               ↓
Server
               │
               │ lookup
               ↓
Session Store
┌─────────────────────────────┐
│ session_id                  │
│ user_id                     │
│ expires_at                  │
│ csrf_token                  │
│ other session state         │
└─────────────────────────────┘
~~~

Browser 不需要持有整个 Session Object，只需要持有不可预测的 Session Identifier。

所以需要明确：

~~~text
Session
= 跨请求保存的服务器状态

Cookie
= Browser 保存和发送 Session Identifier 的一种 HTTP 机制
~~~

Cookie 可以保存语言偏好、实验值，也可以保存 Session Identifier；Cookie 本身并不等于登录状态。

---

## 3. Cookie 自动携带 Session Identifier，同时建立浏览器侧的安全边界

### 【服务器通过 Set-Cookie 建立 Browser 侧会话标识】

登录成功后常见响应：

~~~http
HTTP/1.1 200 OK
Set-Cookie: session=RANDOM_TOKEN; HttpOnly; Secure; SameSite=Lax; Path=/
~~~

浏览器保存 Cookie，在满足 Domain、Path、Secure、SameSite 等规则时，后续请求自动带上：

~~~http
Cookie: session=RANDOM_TOKEN
~~~

MDN 对 Cookie 的基本行为就是：服务器用 Set-Cookie 发送 Cookie，User Agent 在后续符合条件的请求中再把 Cookie 发送回服务器。[[4]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)

“自动携带”让用户无需每次重新登录，但它同时也是后续 CSRF 风险产生的重要原因。

### 【HttpOnly、Secure 和 SameSite 分别限制不同攻击路径】

HttpOnly 改变的是 JavaScript 读取路径：

~~~text
JavaScript
document.cookie
      ✕
      │
Session Cookie

HTTP Request
      ↓
仍然可以自动发送
~~~

MDN 明确说明 HttpOnly 会阻止 JavaScript 通过 document.cookie 读取 Cookie，但 Cookie 仍会随 fetch / XMLHttpRequest 产生的 HTTP 请求发送。[[4]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)

因此 HttpOnly 主要降低 XSS 直接读取 Session Token 的风险，但不能让整个应用免受 XSS，也不能阻止已经运行在站点内的恶意脚本直接调用站内 API。

Secure 限制传输路径：

~~~text
HTTP
  ✕ Session Cookie

HTTPS
  ✓ Session Cookie
~~~

它降低凭据通过明文 HTTP 发送的风险。[[4]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)

SameSite 控制 Cookie 是否跟随不同站点上下文发出的请求，可提供一层 CSRF 防御，但 MDN 与 OWASP 都把它视为防御的一部分，而不是所有情况下 CSRF Token 的替代。[[4]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) [[5]](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

### 【Path 和 Domain 决定 Cookie 的发送范围，不代表业务权限】

例如：

~~~http
Set-Cookie: session=...; Path=/api
~~~

表示浏览器只在 Path 满足规则时发送 Cookie，但不表示用户被授权访问所有 /api 资源。

Cookie Scope 解决“浏览器什么时候发送 Cookie”，Authorization 解决“服务器收到请求后是否允许这个身份操作资源”，两者属于不同层。

---

## 4. Server-side Session 的核心是随机客户端凭据与服务端状态存储之间的映射

### 【Session 创建需要同时形成客户端 Token、服务端记录与过期规则】

典型过程：

~~~text
Authenticated User
       ↓
Generate Cryptographically Random Token
       ↓
token = 给 Browser 的凭据
       │
       ├── Hash(token)
       │      ↓
       │   Server-side Session Record
       │
       └── Set-Cookie(token)
              ↓
           Browser
~~~

Session Record 可以保存：

~~~text
userId
sessionId
expiresAt
csrfToken
lastSeen / device / risk context（按业务需要）
~~~

OWASP 指出 Session ID 的泄露、捕获、预测或固定都可能导致 Session Hijacking（会话劫持），因此 Session Identifier 必须具有足够随机性和不可预测性。[[2]](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

### 【数据库保存 Token Hash 可以降低数据库泄露直接产生可重放凭据的风险】

如果服务器直接保存 Session Token 明文：

~~~text
Database
token = REAL_SESSION_SECRET
~~~

数据库泄露后，攻击者可能直接把该值作为 Cookie 使用。

保存 Hash 时：

~~~text
Browser
REAL_SESSION_SECRET
        ↓ Request
Server
        ↓
Hash
        ↓
Database / Redis
token_hash
~~~

泄露的 Store 中没有原始 Token。

这一做法依赖 Token 本身已经是高熵随机值。对于用户自己选择的低熵 Password，SHA-256 仍然不适合直接作为 Password Hash。

### 【Redis 和 Database 双存储必须明确哪个是在线认证权威】

每个受保护 Request 都可能读取 Session：

~~~text
Request
  ↓
Read Session
  ↓
Restore User
~~~

Redis 适合高频在线 Session Lookup，Database 更适合保存持久关系、批量撤销与审计。

一种组合可以是：

~~~text
Database
保存 Session 持久关系

Redis
保存在线 Session Lookup
~~~

但双存储会立即产生一致性问题：

~~~text
Database 有 Session
Redis 没有

Redis 有 Session
Database 已删除

退出登录时只删成功一边

Redis 丢失以后是否允许回源 Database
~~~

因此真正需要回答的是：

> 在线 Request 以哪个 Store 为最终判断依据？另一个 Store 是否允许回源？删除失败如何恢复？

只有明确这些规则，Redis + Database 才是一套完整设计，而不是两个组件的简单叠加。

---

## 5. Session 生命周期必须覆盖创建、使用、过期、退出和安全事件后的撤销

### 【会话是有生命周期的安全对象】

完整过程：

~~~text
Create
  ↓
Active
  ↓
Request Validation
  ↓
Continue Active
  │
  ├── Expired
  ├── Logout
  ├── Password Reset
  ├── Account Disabled
  └── Security Revocation
          ↓
       Invalid
~~~

如果系统只实现 Login → Create Session，而没有可靠 Revocation（撤销），就无法处理密码重置、账号被盗和管理员禁用账号等后续事件。

### 【客户端 Cookie 过期与服务端 Session 失效需要分别判断】

Cookie 可以通过 Expires / Max-Age 控制浏览器什么时候停止发送。

Server-side Session 也要通过：

~~~text
expiresAt
TTL
Revocation
~~~

控制服务端是否继续接受。

即使 Browser 仍带着旧 Cookie：

~~~text
Cookie Token
      ↓
Server Store 已不存在
      ↓
Reject
~~~

服务端才是 Session 是否有效的最终决策者。

### 【Logout 的目标是撤销服务器会话，而不只是清除浏览器 Cookie】

只执行 clearCookie 只能让当前 Browser 不再主动发送 Token。

如果 Token 已被复制，攻击者仍可能继续使用。因此完整 Logout 应同时：

~~~text
Resolve Session
      ↓
Delete / Revoke Server-side Session
      ↓
Clear Browser Cookie
~~~

### 【密码重置等高风险事件通常需要处理既有 Session】

Password Reset 改变账号的核心 Authentication Credential。

安全设计通常需要考虑：

~~~text
Reset Password
       ↓
Update Password Hash
       ↓
Invalidate Reset Token
       ↓
Revoke Existing Sessions
       ↓
要求重新登录
~~~

这样可以限制已经泄露的旧 Session 继续存活。

---

## 6. CSRF 的根源是浏览器可能自动携带登录 Cookie，而不是攻击者必须先读到 Cookie

### 【攻击者不知道 Session Token，也可能诱导已登录 Browser 发出请求】

假设用户已经登录：

~~~text
Browser
Cookie:
session=SECRET
~~~

随后访问恶意站点。

关键风险不是攻击站点一定可以读取 SECRET，而是 Browser 可能按照 Cookie 规则自动把它附加到目标请求。

因此 CSRF（Cross-Site Request Forgery，跨站请求伪造）的核心是：

> 攻击者让已经认证的 Browser 替自己发送状态修改请求。

这和 XSS 不同：

~~~text
XSS
恶意代码进入目标站点执行
        ↓
读取页面数据 / 调 API / 修改页面


CSRF
攻击者控制另一个请求来源
        ↓
诱导已登录 Browser
        ↓
向目标站点发送请求
~~~

### 【Synchronizer Token 让写请求额外证明自己知道当前 Session 对应的随机值】

对于 Stateful Session，OWASP 推荐 Synchronizer Token Pattern（同步 Token 模式）作为常见 CSRF 防御方式。[[5]](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

Session 建立时：

~~~text
Session
├── userId
└── csrfToken = RANDOM_VALUE
~~~

页面通过可信响应获得 CSRF Token，状态修改请求显式发送：

~~~http
POST /api/projects/123
Cookie: session=SESSION_TOKEN
X-CSRF-Token: CSRF_TOKEN
~~~

服务器：

~~~text
Session Cookie
      ↓
恢复 Session
      ↓
session.csrfToken

Request Header
x-csrf-token
      ↓
比较
      │
      ├── Match → Continue
      └── Missing / Mismatch → 403
~~~

攻击页面即使能诱导 Browser 自动附带 Session Cookie，也不能自然构造正确的 CSRF Token。

### 【Safe Method 的前提是业务没有错误地让 GET 修改状态】

常见 Guard 会对：

~~~text
GET / HEAD / OPTIONS
~~~

不要求 CSRF Token，而对：

~~~text
POST / PUT / PATCH / DELETE
~~~

执行 CSRF 检查。

但这建立在业务遵守 HTTP 语义的前提上。如果 GET 实际执行删除、修改或转账，那么“GET 不校验 CSRF”就会直接变成安全缺口。

### 【SameSite 是纵深防御，而不是把 CSRF 问题交给一个 Cookie 属性】

SameSite=Lax / Strict 可以减少部分 Cross-site Request 携带 Session Cookie。

系统仍然需要考虑：

~~~text
Same-site 子域
错误 Domain 配置
Client-side CSRF
部署变化
浏览器行为差异
~~~

OWASP 因此把 SameSite 作为 Defense in Depth（纵深防御）的一部分。[[5]](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

---

## 7. Authorization 在身份认证之后重新判断当前用户能否对当前资源执行当前操作

### 【Authentication 成功不代表拥有系统中的全部权限】

登录以后服务器得到：

~~~text
Current User = user_123
~~~

这里只回答“你是谁”。

访问：

~~~http
GET /projects/project_A
~~~

还必须继续判断：

~~~text
user_123
是否可以读取
project_A？
~~~

这才是 Authorization（授权）。OWASP 明确区分 Authentication 与 Authorization：一个用户已经通过身份认证，并不意味着他被允许访问所有资源。[[6]](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

### 【资源级授权必须把当前身份与当前 Resource 放在同一次判断中】

只写：

~~~ts
if (request.user) {
  return projectById(request.params.projectId);
}
~~~

只能证明用户已经登录。

如果用户把：

~~~text
/projects/project_A
~~~

改成：

~~~text
/projects/project_B
~~~

服务器仍必须重新检查：

~~~text
Authenticated userId
+
Requested projectId
        ↓
Membership / Ownership Query
        ↓
Access Decision
~~~

OWASP 建议对每一次资源请求验证权限，不能依赖之前页面曾经成功读取过这个资源。[[6]](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

### 【Membership 和 Role 是两层不同授权条件】

例如：

~~~text
Project A
│
├── User 1 → owner
└── User 2 → member
~~~

读取项目详情可能只要求：

~~~text
User ∈ Project
~~~

而修改成员、轮换写入密钥可能要求：

~~~text
User ∈ Project
AND
Role = owner
~~~

因此授权方法可以自然形成：

~~~text
requireAccess(userId, projectId)
        ↓
确认资源成员关系


requireOwner(userId, projectId)
        ↓
先确认成员关系
        ↓
再确认 Role
~~~

这才是 RBAC（Role-Based Access Control，基于角色的访问控制）在真实资源上下文中的使用。Role 不是孤立字符串，而要与 Subject、Resource、Action 共同组成授权判断。

### 【Deny by Default 要求没有明确允许依据时默认拒绝】

更安全的访问控制方向是：

~~~text
Default = Deny
        ↓
找到明确允许条件
        ↓
Allow
~~~

而不是：

~~~text
默认 Allow
只有遇到禁止条件才 Deny
~~~

OWASP 明确建议 Deny by Default，并要求对每个 Request 验证权限。[[6]](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

### 【401、403 与 404 表达不同的失败阶段】

可以先建立：

~~~text
没有有效 Authentication
        ↓
401


Authentication 有效
但没有执行当前 Action 的权限
        ↓
403
~~~

资源级系统还可能对无权限用户返回 404，从而不暴露“这个资源确实存在”。是否采用该策略取决于业务安全设计，但应该统一，不应由每个接口临时决定。

---

## 8. 一次受保护写请求会连续经过 Session、CSRF 和资源授权三次不同判断

假设请求：

~~~http
POST /api/projects/project_A/settings
Cookie: session=SESSION_TOKEN
X-CSRF-Token: CSRF_TOKEN
~~~

服务器并不是执行一个笼统的“权限校验”，而是在逐层建立信任：

~~~text
Request
  ↓
Session Authentication
  │
  │ Session Token 有效？
  ├── No → 401
  └── Yes
        ↓
Current User = user_123
        ↓
CSRF Validation
  │
  │ Header Token 是否属于当前 Session？
  ├── No → 403
  └── Yes
        ↓
Resource Authorization
  │
  │ user_123 是否允许修改 project_A？
  ├── No → 403 / 404
  └── Yes
        ↓
Business Validation
        ↓
Mutation
~~~

三层不能互相替代：

~~~text
Session 有效
只证明当前请求拥有有效登录身份

CSRF 有效
只证明状态修改请求携带当前 Session 对应的防伪值

Authorization 成功
才证明当前身份被允许执行当前资源操作
~~~

---

## 9. Verification Token、Reset Token 和 Session Token 虽然都叫 Token，但生命周期完全不同

### 【Session Token 会在一个会话期间被多个 Request 重复使用】

~~~text
Login
  ↓
Session Token
  ↓
多个后续 Request
  ↓
Expire / Logout / Revocation
~~~

### 【Email Verification Token 用于一次账号状态转换】

~~~text
Register
  ↓
Verification Token
  ↓
提交一次
  ↓
Email Verified
  ↓
Token Consumed
~~~

服务器需要同时验证：

~~~text
Purpose
Expires At
Consumed At
~~~

### 【Password Reset Token 具有重新建立账号凭据的高敏感能力】

Reset Token 可以在不知道旧密码的情况下创建新 Password Credential，因此应该具有：

~~~text
高熵随机
短生命周期
明确 Purpose
一次性消费
成功后不可复用
必要时撤销已有 Session
~~~

不能因为 Verification Token 和 Reset Token 都是一段随机字符串，就忽略 Purpose。

### 【高熵一次性 Token 可以让 Server 只保存 Hash】

~~~text
Generate Random Token
        ↓
Plain Token
        ├── Email / Client
        └── Server
              ↓
          Hash(Token)
              ↓
          Database
~~~

Client 提交以后：

~~~text
Submitted Token
      ↓
Hash
      ↓
Lookup token_hash
      ↓
检查 Purpose / Expires / Consumed
~~~

这样数据库中不长期保存可以直接重放的 Token 明文。

---

## 10. Server-side Session 与 JWT / Access Token 是不同状态模型，不存在天然的高低级关系

Server-side Session：

~~~text
Client
  ↓
Opaque Session ID
  ↓
Server Session Store
  ↓
User / Permission Context
~~~

Self-contained Access Token，例如 JWT：

~~~text
Client
  ↓
Signed Token
  ↓
Server Verify Signature + Claims
  ↓
Identity / Scope
~~~

核心差异是状态主要保存在哪里：

| 维度 | Server-side Session | Self-contained Access Token |
| --- | --- | --- |
| Client 持有 | 随机 Session Identifier | 携带 Claims 的 Token |
| 身份状态 | Server Store 为主 | Token 自身携带部分状态 |
| Request 校验 | 通常查询 Session Store | 通常验签并校验 Claims |
| 即时撤销 | 删除 Session 即可 | 通常需要 Revocation、短 TTL 或其他设计 |
| 多服务扩展 | 需要共享 Session State 或其他一致性方案 | 多个资源服务可独立验签，但密钥和 Claims 治理更复杂 |
| Browser 安全 | 仍需设计 Cookie / Header 存储 | 同样要处理 Token 存储、XSS、CSRF 等问题 |

所以选择方案时应该先看 Caller、部署结构、撤销需求和跨服务验证需求，而不是先决定“必须 JWT”。

---

## 11. 不同调用者需要与自身能力匹配的凭据和授权方式

身份系统设计不应该先问：

~~~text
这个接口用 Cookie 还是 JWT？
~~~

应该先问：

~~~text
谁在调用？
      ↓
它能够安全持有什么 Credential？
      ↓
服务器需要验证什么 Identity / Capability？
      ↓
Credential 泄露后的权限范围应该多大？
~~~

不同调用者的身份能力并不相同，例如：

| 调用者 | 典型场景 | 更适合的安全模型 |
| --- | --- | --- |
| 人类用户浏览器 | 管理后台、个人中心 | Session Cookie / Token + CSRF + Resource Authorization |
| 公开 Browser SDK | 遥测、埋点、公开写入能力 | Scope 受限的 Public Write Key + Origin / Rate Limit 等约束 |
| Server-to-Server Client | 内部服务调用、自动化任务 | Service Credential、mTLS、OAuth Client Credential 或私网边界 |

真正需要先判断的是 Caller 的信任能力、凭据保存能力、泄露后的权限范围和撤销需求，再选择 Credential 与 Authorization Model。公开浏览器环境中可以看到的 Key 不能被当成只有服务器知道的高权限 Secret。

---

## 12. 安全评审应该沿失败路径检查整条链，而不是只检查有没有某个配置项

### 【数据库泄露以后要分别判断 Password、Session 和一次性 Token 的后果】

检查：

~~~text
password_hash
session token_hash
reset token_hash
project role
user data
~~~

并继续问：

~~~text
哪些值可以直接重放？
哪些值只能离线猜测？
哪些值泄露后可以提升权限？
~~~

### 【Session Token 被盗以后要检查撤销和影响窗口】

需要回答：

~~~text
Session TTL 多长？
Logout 是否服务器撤销？
Password Reset 是否撤销旧 Session？
是否支持按用户批量撤销？
Redis 丢失以后会发生什么？
~~~

### 【用户修改 URL 中的资源 ID 时必须重新授权】

~~~text
/projects/A
      ↓
改成
/projects/B
~~~

不能因为已经登录就允许访问。

服务器必须重新执行：

~~~text
Authenticated User
+
Requested Resource
+
Requested Action
        ↓
Authorization
~~~

### 【前端隐藏按钮属于 UX，不属于服务端 Authorization】

前端可以让 member 看不到“删除项目”按钮，但攻击者可以直接构造 DELETE Request。

真正的安全边界仍然必须在 Server：

~~~text
Session
  ↓
User
  ↓
Membership
  ↓
Role
  ↓
Authorization
~~~

OWASP 要求访问控制在服务端执行，并建议每次 Request 都验证权限。[[6]](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

### 【多层安全控制应该理解为不同攻击面的组合防线】

~~~text
HTTPS
  ↓
保护传输

Secure Cookie
  ↓
限制 Cookie 通过 HTTPS 发送

HttpOnly
  ↓
降低 JavaScript 读取 Session Token 风险

SameSite
  ↓
减少部分跨站自动携带 Cookie

CSRF Token
  ↓
验证状态修改请求的额外证明

Session Revocation
  ↓
使退出或被撤销的 Session 失效

Resource Authorization
  ↓
限制当前身份真正能操作的数据
~~~

没有哪个单一属性能够替代整条安全链。

---

## 13. 面试与架构说明需要能够从一次请求完整解释身份和权限

如果被问“用户登录以后，后续请求服务器怎么知道他是谁”，回答应沿真实执行链展开：

~~~text
用户提交 Credential
        ↓
Server 验证 Password Hash
        ↓
Authentication Success
        ↓
生成高熵 Session Token
        ↓
Server 保存 Session State
        ↓
Browser 保存 HttpOnly Cookie
        ↓
后续 Request 自动携带 Cookie
        ↓
Server Hash Token 并查询 Session Store
        ↓
恢复 Current User
        ↓
写请求继续检查 CSRF
        ↓
资源接口继续检查 Membership / Role
        ↓
最终执行业务
~~~

如果继续追问“已经有 Session Cookie 为什么还需要 CSRF Token”，核心是：

~~~text
Cookie 会由 Browser 自动发送
        ↓
攻击者不一定要读取 Cookie
也可能诱导 Browser 携带它请求目标站点
        ↓
状态修改再要求一份
攻击者无法自然构造的 Session-specific Token
~~~

如果继续追问“登录以后为什么还要 Authorization”，则回到：

~~~text
Authentication
确定 Subject 是谁

Authorization
判断这个 Subject
是否能对当前 Resource
执行当前 Action
~~~

工程评审还需要能够回答具体取舍：

~~~text
为什么 Session 查 Redis？
Database 为什么还要保存 user_sessions？
Redis Miss 是否回源？
为什么 Password 与随机 Token 使用不同 Hash 思路？
为什么 member 能读取但不能执行 owner 操作？
为什么 Password Reset 后要撤销旧 Session？
Password Hash 参数是否显式达到目标安全基线？
~~~

能够解释这些因果和失败路径，才说明真正理解身份与访问控制系统，而不是只会复述 Cookie、Session、CSRF、RBAC 几个术语。

---

## 14. 参考资料

1. OWASP Cheat Sheet Series, Authentication Cheat Sheet：https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
2. OWASP Cheat Sheet Series, Session Management Cheat Sheet：https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
3. OWASP Cheat Sheet Series, Password Storage Cheat Sheet：https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
4. MDN, Set-Cookie header：https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
5. OWASP Cheat Sheet Series, Cross-Site Request Forgery Prevention Cheat Sheet：https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
6. OWASP Cheat Sheet Series, Authorization Cheat Sheet：https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
7. Node.js Documentation, crypto.scrypt：https://nodejs.org/api/crypto.html

### 【相关知识文档】

- [Cookie 安全性概述笔记](./Cookie安全性概述笔记.md)
- [Access Token 与 Refresh Token 核心知识点笔记](./Access%20Token与Refresh%20Token核心知识点笔记.md)
- [浏览器网络面试题](./浏览器网络面试题.md)
- [NestJS 快速上手](./NestJS快速上手.md)

### 【实战分析入口】

- [Browser Monitor：账号认证、Session 与 CSRF 源码实战分析](https://github.com/cxDlogver/browser-monitor/blob/main/docs/%E8%B4%A6%E5%8F%B7%E8%AE%A4%E8%AF%81Session%E4%B8%8ECSRF%E6%BA%90%E7%A0%81%E5%AE%9E%E6%88%98%E5%88%86%E6%9E%90.md)
