# Web 身份认证、会话控制与访问控制体系

Web 身份系统不是一个“登录功能”，而是三个职责连续但边界不同的系统：

~~~text
Authentication（身份认证）
证明“你是谁”
        ↓
Session Management（会话控制）
让这个身份在后续 Request 中持续成立
        ↓
Authorization（访问控制）
判断“你能对什么资源做什么”
~~~

三个系统分别回答不同问题：

| 系统 | 核心输入 | 核心问题 | 主要输出 |
| --- | --- | --- | --- |
| 身份认证 | Identity + Credential | 请求者是否真的是其声称的身份 | Authenticated Principal |
| 会话控制 | 已认证身份 | HTTP 无状态下怎样持续登录 | Session / Access Credential |
| 访问控制 | Subject + Resource + Action + Context | 当前身份是否允许执行当前操作 | Allow / Deny |

因此 Cookie、Session、JWT、Refresh Token、RBAC 不能放在同一层并列理解。

~~~text
Cookie
是 Browser 的 Credential 传递机制之一

Session
是跨 Request 维持登录状态的模型

Access Token / Refresh Token
是另一类会话持续与授权凭据模型

RBAC / ABAC / ReBAC / ACL
是 Authorization 使用的权限决策模型
~~~

全文按照“身份认证 → 会话控制 → 访问控制”建立完整框架。

---

## 1. 身份认证体系从账号建立、凭据验证到可信身份形成

身份认证（Authentication）最核心的问题不是“有没有登录页面”，而是：

> 服务器怎样把“用户自己声明的身份”转换成“服务器能够信任的身份”。

用户在 Login Form 中输入：

~~~text
Email
alice@example.com

Password
********
~~~

其中 Email 更像一种 Identity Claim（身份声明）：

~~~text
“我要以 Alice 这个账号登录”
~~~

Password 才是 Credential（凭据）：

~~~text
“我拿什么证明我真的是 Alice”
~~~

服务器真正需要完成的过程是：

~~~text
Identity Claim
        +
Credential
        ↓
Verification
        ↓
可信 Principal
~~~

Principal（认证主体）可以理解成：身份认证完成以后，后端业务代码可以信任的“当前用户”。

例如：

~~~text
Authenticated Principal

userId = user_10001
~~~

后续 Service、Authorization、Audit Log 应该使用这个已经认证过的 userId，而不是直接相信前端 Request Body 中随便传来的 userId。

OWASP 将 Authentication 定义为：通过验证 Password、Security Token、生物特征等 Authenticator 的有效性，确认一个主体是否确实是它所声称的身份。[[1]](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### 【身份认证不是一个 Login API，而是一段账号生命周期】

一个基础账号从创建到长期使用，通常会经历：

~~~text
Register
创建账号
        ↓
Credential Enrollment
建立 Password / Passkey / MFA
        ↓
Identity Verification
验证 Email / Phone 等身份属性
        ↓
Login
验证 Credential
        ↓
Authentication Success
形成可信 Principal
        ↓
Re-authentication
高风险操作重新确认身份
        ↓
Credential Change / Recovery
修改密码、找回账号
        ↓
Credential Revocation
旧凭据失效
~~~

因此下面几个状态必须区分：

~~~text
账号已经存在
≠
Email 已经验证

Email 已经验证
≠
当前 Browser 已经登录

当前 Browser 已经登录
≠
拥有所有 Resource 的访问权限
~~~

身份认证体系只负责把“你是谁”确认清楚。

持续登录属于后面的会话控制；具体资源权限属于访问控制。

### 【注册阶段首先建立稳定的用户身份记录】

假设注册请求：

~~~text
email       = alice@example.com
password    = MyPassword...
displayName = Alice
~~~

Server 最终可能建立：

~~~text
users

id
email
password_hash
email_verified_at
status
display_name
created_at
updated_at
~~~

这些字段不是同一种东西。

~~~text
id
=
系统内部稳定身份

email
=
登录 Identifier + 联系方式

password_hash
=
Password Credential 的验证材料

email_verified_at
=
这个 Email 是否已经证明由当前账号控制
~~~

User ID 通常应该稳定。

例如用户把：

~~~text
alice@old.com
~~~

改成：

~~~text
alice@new.com
~~~

过去的订单、项目和评论仍然应该属于同一个 User。

所以业务关系更适合绑定：

~~~text
orders.user_id
projects.owner_id
comments.user_id
~~~

而不是把可变化的 Email 当成整个系统唯一、永久的身份。

### 【Password 不能明文保存，也不应该设计成以后可以解密】

一个常见错误思路是：

~~~text
Password
   ↓
AES Encrypt
   ↓
Database
~~~

这种设计的问题是：

~~~text
只要 Server 能够解密
就一定存在某个 Decryption Key

攻击者同时拿到 Database + Key
就能恢复所有 Password
~~~

Login 并不需要知道原始 Password。

Server 真正需要解决的是：

~~~text
本次输入的 Password
是否和注册时建立的 Password Credential 一致
~~~

因此正确方向是 Password Hash / Password KDF（密码派生函数）：

~~~text
Register

Password
  ↓
Random Salt
  ↓
Argon2id / scrypt
  ↓
Derived Hash
  ↓
Database
~~~

Login：

~~~text
Input Password
      ↓
读取已保存的 Salt / Parameters
      ↓
重新执行相同 Password KDF
      ↓
Compare
      ↓
Match / Mismatch
~~~

Password KDF 会故意增加 CPU / Memory Cost。

原因是 Database 泄露以后，攻击者通常会进行离线猜测：

~~~text
password123
12345678
qwerty...
      ↓
不断计算 Hash
      ↓
和泄露数据比较
~~~

如果使用普通 SHA-256，计算速度太快，攻击者可以进行非常大量的猜测。

OWASP 当前优先推荐 Argon2id；无法使用 Argon2id 时，可以使用满足安全参数要求的 scrypt。[[2]](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### 【Salt 解决相同 Password 产生相同结果的问题】

如果没有 Salt：

~~~text
Alice password = 123456
Bob   password = 123456

可能得到：

Alice hash = ABC
Bob   hash = ABC
~~~

攻击者即使暂时不知道 Password，也能看出：

~~~text
Alice 和 Bob 使用了同一个 Password
~~~

加入随机 Salt：

~~~text
Alice
123456 + salt_A
      ↓
hash_A

Bob
123456 + salt_B
      ↓
hash_B
~~~

即使 Password 相同：

~~~text
hash_A != hash_B
~~~

Salt 不要求保密。

它通常与 Hash 一起保存。

关键是每个 Credential 使用独立随机 Salt。

### 【邮箱验证确认的是邮箱控制权，不等于已经登录】

用户注册时填写：

~~~text
alice@example.com
~~~

这只能说明：

~~~text
用户声称自己拥有这个 Email
~~~

Server 还不知道这个 Inbox 是否真的属于这个用户。

因此需要 Email Verification：

~~~text
Create User
email_verified_at = NULL
        ↓
Generate Random Verification Token
        ↓
保存 Token 状态
        ↓
Send Verification Email
        ↓
User Click Link
        ↓
Browser Submit Token
        ↓
Server Verify Token
        ↓
email_verified_at = now()
~~~

Verification Token 解决的是：

~~~text
“当前用户是否能够访问这个邮箱”
~~~

它没有解决：

~~~text
“当前 Browser 是否已经建立持续登录会话”
~~~

所以：

~~~text
Email Verification
属于 Identity / Account Lifecycle

Session
属于 Authentication 成功后的会话控制
~~~

### 【Verification Token 与 Password 的安全处理方式不同】

一次性 Verification Token 常见设计：

~~~text
rawToken
=
CSPRNG 生成的高熵随机值
~~~

发送给 Client：

~~~text
Email Link
包含 rawToken
~~~

Database 保存：

~~~text
token_hash
=
SHA-256(rawToken)
~~~

验证时：

~~~text
Client 提交 rawToken
        ↓
Server SHA-256
        ↓
查询 token_hash
        ↓
同时检查：
Purpose
Expires At
Consumed At
~~~

为什么 Password 不推荐直接 SHA-256，而随机 Token 可以？

因为输入熵不同。

用户 Password：

~~~text
用户自己选择
可预测
可进行字典猜测
~~~

256-bit Random Token：

~~~text
CSPRNG 生成
现实中不可枚举
~~~

因此：

~~~text
Password
需要昂贵 Password KDF

High-entropy Random Token
可以使用 SHA-256 作为不可逆索引
~~~

### 【Login 实际上连续验证账号、Credential 与账号状态】

Login 不只是：

~~~text
SELECT user
verify password
return success
~~~

更完整的链路：

~~~text
1. Parse Input
        ↓
2. Normalize Identifier
        ↓
3. Lookup Account
        ↓
4. Verify Credential
        ↓
5. Check Account State
        ↓
6. Optional MFA / Risk Check
        ↓
7. Authentication Success
        ↓
8. Produce Authenticated Principal
~~~

Account State 可能包括：

~~~text
email_verified?
disabled?
locked?
password_expired?
organization_disabled?
risk_check_passed?
~~~

因此：

~~~text
Password Correct
不一定等于
Authentication Accepted
~~~

例如：

~~~text
Password Match
+
Account Disabled
      ↓
Reject Login
~~~

### 【Authentication Factor 解释 MFA 为什么不是简单的“验证两次”】

常见认证因子：

~~~text
Knowledge Factor
你知道什么
例如 Password / PIN

Possession Factor
你拥有什么
例如 Security Key / Authenticator Device

Inherence Factor
你是什么
例如 Fingerprint / Face
~~~

MFA（Multi-Factor Authentication，多因素认证）强调的是：

~~~text
多个不同 Factor Category
共同完成身份验证
~~~

例如：

~~~text
Password
+
Hardware Security Key
~~~

是 Knowledge + Possession。

而：

~~~text
Password
+
Security Question
~~~

本质上仍然都是 Knowledge Factor，并不能简单等同于真正多因素认证。

### 【Authentication Success 只证明这一次请求是谁，还没有解决持续登录】

假设 Server 已经完成：

~~~text
Email 正确
Password 正确
Account Active
MFA 正确
      ↓
Authenticated Principal
userId = user_10001
~~~

到这里身份认证已经成功。

但 Browser 下一次发：

~~~http
GET /projects
~~~

这是新的 HTTP Request。

Server 不能要求用户每次 Request 都重新提交：

~~~text
Email
Password
MFA
~~~

也不能凭空知道这个 Request 属于刚才的 user_10001。

因此 Authentication Success 之后，自然出现下一个问题：

> 怎样把“刚才已经确认的身份”安全地带到后续几十、几百次 Request？

这就是 Session Management（会话控制）。

### 【Password Reset 是重新建立长期 Credential，安全级别高于普通资料修改】

Forgot Password 的本质不是“修改一个字段”。

它允许用户：

~~~text
不知道旧 Password
      ↓
通过 Recovery Channel
      ↓
建立一个新的 Password
      ↓
重新获得账号控制权
~~~

典型链路：

~~~text
Forgot Password
      ↓
Generate Reset Token
      ↓
Send to Verified Email / Phone
      ↓
User Submit Token + New Password
      ↓
Validate Token
      ↓
Update Password Hash
      ↓
Consume Reset Token
      ↓
必要时 Revoke Existing Sessions
~~~

Reset Token 应至少考虑：

~~~text
高熵随机
短生命周期
Purpose Binding
一次性消费
避免明文长期存储
~~~

同时 Forgot Password API 还要避免明显暴露：

~~~text
这个 Email 是否存在
~~~

否则攻击者可以进行 Account Enumeration（账号枚举）。

### 【Re-authentication 解决已经登录但操作风险特别高的场景】

Session 有效只能说明：

~~~text
这个 Request 来自一个已经登录的会话
~~~

并不意味着：

~~~text
任何高风险操作都可以直接执行
~~~

例如：

~~~text
修改 Password
关闭 MFA
修改支付账户
导出所有数据
删除账号
~~~

可以要求：

~~~text
Existing Session
      ↓
Sensitive Action
      ↓
再次输入 Password / MFA
      ↓
Recent Authentication
      ↓
Allow
~~~

Re-authentication 与 Authorization 的职责不同：

~~~text
Re-authentication
重新确认“现在操作的人仍然真的是本人”

Authorization
判断“这个身份是否具有执行当前操作的权限”
~~~

OWASP 也建议在 Password Change、账号恢复、可疑设备等高风险事件之后要求重新认证。[[1]](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

身份认证这一部分最终可以收束成：

~~~text
Register
建立 Digital Identity
        ↓
Credential Enrollment
建立认证材料
        ↓
Identity Verification
验证邮箱等身份属性
        ↓
Login
验证 Credential
        ↓
Authenticated Principal
        ↓
Recovery / Re-authentication
维护身份可信度
~~~

## 2. 会话控制体系让认证结果跨多个 HTTP Request 持续成立

HTTP Request 默认彼此独立。

~~~text
POST /login
Authentication Success

几秒后：

GET /dashboard
~~~

第二个 Request 本身不会天然携带“这是刚才登录成功的 Alice”这一事实。

会话控制因此承担：

~~~text
Authenticated Principal
        ↓
Create Session / Issue Token
        ↓
Client 持有 Credential
        ↓
后续每次 Request 携带
        ↓
Server Validate
        ↓
Restore Current Principal
~~~

### 【Cookie、Session 与 Token 位于不同层级】

Session 描述的是：

~~~text
一段时间内
多个 Request
共享同一个已认证上下文
~~~

Session Identifier 是：

~~~text
Client 用来引用这个 Session 的 Credential
~~~

Cookie 是：

~~~text
Browser 保存并自动发送某个值的 HTTP 机制
~~~

Token 则是更广义的 Credential 形式：

~~~text
Session Token
Access Token
Refresh Token
Verification Token
Reset Token
API Key
CSRF Token
~~~

所以：

~~~text
Cookie ≠ Session

Session ≠ Redis

Token ≠ JWT
~~~

一个 Token 必须结合 Purpose、Lifetime、Storage、Transport、Validation 与 Revocation 才有完整含义。


理解这四个概念时，可以用一个真实请求来区分：

~~~text
Server 内部真正想保存的登录状态
Session
{
  userId,
  expiresAt,
  csrfToken
}

Client 不应该直接拿整份 Session
        ↓
Server 给 Client 一个随机引用
Session Identifier
        ↓
Browser 需要把这个引用保存并自动带回
        ↓
Cookie
        ↓
这个随机引用本身也可以被称为一种 Session Token
~~~

所以关系是：

~~~text
Session
= Server 想维持的登录上下文

Session Identifier
= Client 引用 Session 的随机 Credential

Cookie
= Browser 保存并自动传输 Credential 的 HTTP 机制

Token
= 对各种 Credential / Proof 的广义称呼
~~~

如果把 Cookie 删除，Session 概念仍然存在；Client 也可以通过其他 Header 携带 Session Identifier。

如果把 Redis 换成 Database，Session 概念仍然存在；只是 Session Store 实现变了。

这就是为什么学习时不能把 Cookie、Redis、Session 和 Token 画成同一层。

### 【会话持续可以先建立两种主要工程模型】

~~~text
模型 A
Server-side Session
服务端保存主要 Session State

模型 B
Access Token + Refresh Token
短期访问凭据 + 长期续期凭据
~~~

两者目标相同：

~~~text
用户只在必要时重新认证
而不是每个 Request 都提交 Password
~~~

但状态位置、续期方式、撤销方式和多服务扩展方式不同。


### 【模型一：Server-side Session 由 Server 保存主要会话状态】

基本结构：

~~~text
Login Success
      ↓
Generate Random Session Identifier
      ↓
Server Session Store
      ↓
Session ID 返回 Client
      ↓
后续 Request 携带 Session ID
      ↓
Server Lookup Session
      ↓
Restore Principal
~~~

Session Store 可以保存：

~~~text
sessionId
userId
createdAt
expiresAt
lastSeenAt
csrfToken
device / risk metadata
~~~

Client 通常只持有一个 Opaque Session Identifier（不透明会话标识符），不需要在 Identifier 内编码 User ID、Role 或 Permission。

Session Store 可以位于：

~~~text
Memory
Redis
Database
Distributed Cache
Dedicated Session Store
~~~

所以 Session 是状态模型，Redis 只是常见实现。

Server-side Session 的一个明显特点是 Server 可以直接控制有效性：

~~~text
Logout
  ↓
Delete Session
  ↓
Credential 立即失效
~~~

或者：

~~~text
Security Incident
  ↓
Find All User Sessions
  ↓
Revoke
~~~

OWASP 建议 Session Identifier 应不可预测，不应包含敏感业务语义，并应在服务端维护真正的 Session State。

参考：

https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html


可以把一次 Server-side Session 的真实数据流展开成：

~~~text
① Login 认证成功
Current User = user_10001

② Server 生成
rawSessionToken = 256-bit Random

③ Server 保存
hash(rawSessionToken)
      ↓
{
  userId: user_10001,
  expiresAt: ...,
  csrfToken: ...
}

④ Browser 得到
Set-Cookie: session=<rawSessionToken>

⑤ 下一次 Request
Cookie: session=<rawSessionToken>

⑥ Server
hash(rawSessionToken)
      ↓
Lookup Session Store
      ↓
找到 user_10001
      ↓
Request Context.currentUser = user_10001
~~~

这里真正决定登录是否有效的是：

~~~text
Server 是否仍然接受这个 Credential
~~~

而不是 Browser 有没有某个 UI 状态。

如果 Browser Cookie 还在，但是 Server Session 已经删除：

~~~text
Cookie exists
+
Session Store miss
      ↓
Authentication Failed
~~~

反过来，如果 Server Session 还存在，但 Browser 已经删除 Cookie：

~~~text
Browser 不再提交 Credential
      ↓
当前 Browser 也无法恢复登录
~~~

所以完整登录态由 Client Credential 与 Server Session State 共同构成。

### 【模型二：Access Token + Refresh Token 拆分短期访问与长期续期】

双 Token 模型：

~~~text
Authentication Success
        ↓
Issue Access Token
+
Issue Refresh Token
        ↓
Client
~~~

业务请求：

~~~text
Access Token
      ↓
Resource Server
      ↓
Validate
      ↓
Access Protected Resource
~~~

Access Token 过期：

~~~text
Refresh Token
      ↓
Authorization Server
      ↓
Validate
      ↓
Issue New Access Token
~~~

两个 Credential 分工：

| Credential | 用途 | 一般生命周期 |
| --- | --- | --- |
| Access Token | 访问 Resource API | 短 |
| Refresh Token | 获取新的 Access Token | 相对长 |

RFC 6749 明确指出 Access Token 可以是 Opaque Identifier，也可以是 Self-contained Token，并不要求必须使用 JWT。

参考：

https://www.rfc-editor.org/rfc/rfc6749.html

### 【Bearer Access Token 的安全边界是“持有即可使用”】

Bearer Token 表示：

~~~text
谁持有 Token
谁就拥有对应访问能力
~~~

所以 Token 泄露就可能直接变成权限泄露。

RFC 6750 推荐通过：

~~~http
Authorization: Bearer <access-token>
~~~

传输，并要求在存储与传输中保护 Bearer Token。

参考：

https://www.rfc-editor.org/rfc/rfc6750.html

### 【Refresh Token 让 Access Token 可以保持短生命周期】

如果只有：

~~~text
Access Token
有效 30 天
~~~

一旦泄露，攻击窗口可能很长。

双 Token 模型希望形成：

~~~text
Access Token
短生命周期
日常请求使用

Refresh Token
更长生命周期
只用于 Token Renewal
~~~

这样频繁暴露在业务请求中的 Access Token 权限与生命周期可以更加受限。

Refresh Token 本身价值很高，因为它可以持续铸造新的 Access Token。

RFC 9700 要求 Public Client 使用 Refresh Token 时，通过 Sender-constrained Token 或 Refresh Token Rotation 等机制处理重放风险。

参考：

https://www.rfc-editor.org/rfc/rfc9700.html

### 【Refresh Token Rotation 建立 Token Chain 与 Replay Detection】

Rotation：

~~~text
RT1
 ↓ Refresh
AT2 + RT2
 ↓
RT1 Invalid

RT2
 ↓ Refresh
AT3 + RT3
 ↓
RT2 Invalid
~~~

如果旧 RT1 再次出现：

~~~text
Invalidated Refresh Token Reuse
      ↓
可能发生 Replay
      ↓
Revoke Token Family
      ↓
Require Re-authentication
~~~

Rotation 不是单纯延长登录：

~~~text
Refresh
+
Credential Replacement
+
Replay Detection
~~~

### 【JWT 与双 Token 是两个不同维度】

错误等式：

~~~text
Access Token = JWT
Refresh Token = JWT
双 Token = JWT Login
~~~

实际上：

~~~text
Access Token
可以是 JWT
也可以是 Opaque Token

Refresh Token
也可以是 Opaque Token
~~~

JWT 解决：

~~~text
Token 如何携带 Claims
以及如何通过 Signature 验证
~~~

双 Token 解决：

~~~text
短期访问凭据
和长期续期凭据
如何分工
~~~

因此常见组合完全可以是：

~~~text
Access Token = JWT
Refresh Token = Opaque Random Token
~~~

### 【Server-side Session 与双 Token 的核心差异是状态位置】

| 维度 | Server-side Session | Access + Refresh Token |
| --- | --- | --- |
| 在线身份状态 | 主要存在 Server Session Store | Access Token 可自包含部分状态 |
| Client 日常 Credential | Session Identifier | Access Token |
| 长期续期 Credential | 通常没有独立第二 Token | Refresh Token |
| 每请求验证 | Lookup Session | Validate / Introspect Access Token |
| 即时撤销 | 通常直接 | 取决于 Token TTL、Revocation、Introspection 等 |
| 水平扩展 | 常需共享 Session Store | Self-contained Access Token 可降低共享 Lookup |
| 多 Resource Server | 可以实现 | OAuth Token 模型更自然 |
| Browser 安全 | 常见 Cookie + CSRF | 取决于 SPA / BFF / Token Storage |

所以不存在：

~~~text
Session = 落后
JWT = 先进
~~~

应该根据系统边界选择状态模型。


选择时可以先问系统形态，而不是先问“要不要 JWT”。

如果是典型后台系统：

~~~text
Browser
   ↓
Single Web Backend
   ↓
Database
~~~

要求：

~~~text
Logout 立即生效
权限变更立即生效
没有第三方 Client
~~~

Server-side Session 往往更直接。

如果是：

~~~text
Mobile App
Browser SPA
Third-party Client
        ↓
Authorization Server
        ↓
多个 Resource Server
~~~

需要：

~~~text
不同 Audience
不同 Scope
跨服务验证
Delegated Authorization
~~~

OAuth Access Token 模型通常更加自然。

所以两者的区别不是：

~~~text
传统技术
vs
现代技术
~~~

而是：

~~~text
集中式 Server Session State
vs
Token-based Resource Access Model
~~~

设计依据是系统拓扑、信任边界和撤销需求。

### 【Cookie 与 Authorization Header 是 Credential Transport，不是第三种会话模型】

Cookie Transport：

~~~text
Set-Cookie
      ↓
Browser Cookie Store
      ↓
满足 Domain / Path / SameSite / Secure 等规则
      ↓
Browser 自动附加
~~~

Authorization Header：

~~~http
Authorization: Bearer <token>
~~~

如果 Credential 由 JavaScript 管理，则 JavaScript 必须能够读取它。

因此安全关注点不同：

~~~text
HttpOnly Cookie
降低 JS 直接读取 Credential 风险
但自动发送带来 CSRF 关注点

JavaScript-readable Bearer Token
通常不被 Browser 自动附加到跨站请求
但 XSS 可直接读取并外带 Token
~~~

两种方式只是攻击面不同，不是简单的安全与不安全。

### 【Browser Storage 的选择不能只看持久时间】

常见位置：

~~~text
HttpOnly Cookie
localStorage
sessionStorage
In-memory
~~~

HttpOnly Cookie：

~~~text
JavaScript
无法直接读取 Credential
~~~

localStorage / sessionStorage：

~~~text
JavaScript 可读
      ↓
XSS 可以直接读取并 Exfiltrate
~~~

sessionStorage 只改变生命周期与 Tab Scope，不改变“JavaScript 可读”的本质。

In-memory：

~~~text
仅存当前 JS Runtime
Reload 后丢失
~~~

可以缩小长期持久化暴露面，但需要新的续期或恢复策略。

IETF 2026 发布的 RFC 10017 专门讨论 Browser-based OAuth Application 的 Token 暴露面、BFF 等架构选择。

参考：

https://www.rfc-editor.org/rfc/rfc10017.html

### 【Session Lifecycle 必须管理创建、过期、续期、轮换与撤销】

完整生命周期：

~~~text
Create
  ↓
Active
  ↓
Use
  ↓
Refresh / Renew
  ↓
Expire
  ↓
Revoke
  ↓
Re-authenticate
~~~

Idle Timeout：

~~~text
长时间无 Activity
      ↓
Session Invalid
~~~

Absolute Timeout：

~~~text
即使持续活跃
超过最大 Session Lifetime
      ↓
Require Re-authentication
~~~

Renewal / Rotation：

~~~text
Old Credential
      ↓
New Credential
      ↓
Old Credential Invalid
~~~

OWASP 建议至少从 Idle Timeout 与 Absolute Timeout 两个维度控制 Session Expiration，并可以增加 Renewal Timeout。

### 【Logout 的本质是 Server 不再接受旧 Credential】

只在 UI：

~~~text
clear local state
redirect /login
~~~

并不等于真正 Logout。

Server-side Session 需要：

~~~text
Revoke / Delete Server Session
+
Clear Client Identifier
~~~

Refresh Token Model 需要：

~~~text
Revoke Refresh Credential
+
必要时 Revoke Token Family
+
处理尚未过期的 Access Token
~~~

### 【CSRF 主要出现在 Browser 自动发送 Credential 的模型中】

Cookie-based Session：

~~~text
User 已登录 target.example
      ↓
访问 evil.example
      ↓
恶意页面诱导 Browser
      ↓
POST target.example/change-email
      ↓
Browser 可能自动携带 target.example Cookie
~~~

攻击者并不需要先读取 Session Cookie。

Synchronizer Token Pattern：

~~~text
Session
└── csrfToken = Random

合法页面
获取 csrfToken
      ↓
写请求显式发送
X-CSRF-Token
      ↓
Server 与 Session 中 Token 比较
~~~

自动发送的 Session Credential 与显式发送的 CSRF Proof 被拆成两条通道。


这里也能解释为什么 CSRF Token 与 Session Token 的安全角色不同。

Session Token：

~~~text
证明：
“这个 Request 属于哪个已认证 Session”
~~~

如果攻击者得到有效 Session Token，通常就能够冒充这个 Session。

CSRF Token：

~~~text
证明：
“这个状态修改 Request
还拥有当前合法页面上下文中的额外随机值”
~~~

单独得到 CSRF Token，通常无法恢复 User，因为请求仍然需要先通过 Session Authentication。

因此常见实现可以在 Session State 中直接保存原始 CSRF Token：

~~~text
Session
├── userId
└── csrfToken
~~~

收到写请求以后直接比较：

~~~text
request.csrfToken
==
session.csrfToken
~~~

它并不像 Password 那样必须使用昂贵 KDF，也不像主要 Session Credential 那样强烈需要通过 Hash 降低存储泄露后的直接重放风险。

当然也可以保存：

~~~text
hash(csrfToken)
~~~

然后 Request Token 先 Hash 再比较。

这属于额外 Defense in Depth，而不是 Synchronizer Token Pattern 成立的必要条件。

### 【Synchronizer Token 通常保护 Unsafe Request，而不是普通 GET】

RFC 9110 将 GET、HEAD、OPTIONS、TRACE 定义为 Safe Method。

正常设计：

~~~text
GET
读取 Resource

POST / PUT / PATCH / DELETE
修改 Server State
~~~

因此 CSRF Token 重点用于状态修改请求。

如果设计成：

~~~text
GET /delete-account
~~~

首先说明 API 违反 Safe Method 语义。

参考：

https://www.rfc-editor.org/rfc/rfc9110.html#name-safe-methods

GET 不要求 CSRF Token 不意味着完全没有跨站信息泄露。

Same-Origin Policy 通常允许部分 Cross-origin Write / Navigation / Embedding，同时限制 Cross-origin Read。

仍需单独处理：

~~~text
XS-Leak
CORS Misconfiguration
Cross-origin Embedding
Timing Side Channel
Resource Existence Leak
~~~

参考：

https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy


---

## 3. 访问控制体系在可信身份之上决定具体资源操作是否允许

Authentication 已经得到：

~~~text
Subject = User A
~~~

Authorization 还要继续回答：

~~~text
User A
能否
Edit
Document 123
在当前 Context 下？
~~~

因此一个完整权限判断至少可以抽象为：

~~~text
Subject
   +
Resource
   +
Action
   +
Context
   ↓
Access Policy
   ↓
Allow / Deny
~~~

Authorization 不是：

~~~text
“用户有没有登录”
~~~

而是：

~~~text
“已经确认身份以后，
这个 Subject 能否执行当前 Resource Action”
~~~

OWASP 要求访问权限在服务端对每个受保护请求进行验证。

参考：

https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html


先看一个最典型的资源级权限问题。

用户 Alice 已经成功登录：

~~~text
Current Subject = Alice
~~~

她请求：

~~~text
GET /projects/100
~~~

如果 Server 只做：

~~~text
Session Valid?
      ↓
Yes
      ↓
SELECT project WHERE id = 100
~~~

那么 Alice 把 URL 改成：

~~~text
GET /projects/101
~~~

Server 仍然只能知道：

~~~text
Alice 已经登录
~~~

却没有证明：

~~~text
Alice 有权访问 Project 101
~~~

正确链路应该是：

~~~text
Current Subject = Alice
        +
Requested Resource = Project 101
        +
Action = Read
        ↓
查询 Ownership / Membership / Policy
        ↓
Allow?
        │
        ├── No → Reject
        └── Yes
              ↓
真正读取 Resource
~~~

这就是 Authentication 和 Authorization 最重要的边界：

~~~text
Authentication
证明“你是谁”

Authorization
证明“这个身份能不能操作这个 Resource”
~~~

“只验证已经登录，却没有验证具体 Resource 权限”的问题，就是 IDOR / BOLA 类漏洞最常见的来源之一。

### 【常见权限模型的区别在于决策主要依赖什么信息】

应用开发中最值得掌握：

~~~text
ACL
Resource 直接记录谁能做什么

RBAC
Role 决定 Permission

ABAC
Subject / Resource / Action / Environment Attribute 决定

ReBAC
Subject 与 Resource 的 Relationship 决定
~~~

它们不是必须四选一。

真实系统经常组合。

### 【ACL 以 Resource 为中心保存直接授权关系】

例如：

~~~text
Document 123

Alice
→ read
→ write

Bob
→ read

Team Finance
→ read
~~~

判断：

~~~text
Subject
  ↓
Resource ACL
  ↓
是否存在所需 Permission
~~~

ACL 适合：

~~~text
文件共享
单文档 Sharing
Object Storage
资源级 Grant
~~~

优势是直观、细粒度。

问题是当：

~~~text
User 很多
Resource 很多
Grant 很多
~~~

管理成本会快速增长。

### 【RBAC 通过 Role 解耦 User 与 Permission】

RBAC：

~~~text
User
  ↓
Role Assignment
  ↓
Role
  ↓
Permission Assignment
  ↓
Permission
  ↓
Resource + Action
~~~

例如：

~~~text
Alice
  ↓
Editor

Editor
├── document:read
├── document:create
└── document:update
~~~

User 不需要直接挂三个 Permission，只需要成为 Editor。

NIST 对 RBAC 的核心描述就是把 Permission 关联到 Role，再让 User 成为 Role Member，从而降低权限管理复杂度。

参考：

https://www.nist.gov/publications/role-based-access-control-rbac-features-and-motivations

RBAC 适合：

~~~text
Admin
Operator
Auditor
Editor
Viewer
~~~

这类组织职责稳定的系统。

但当规则变成：

~~~text
Editor
只能编辑
自己 Department
+
自己 Project
+
可信 Device
+
特定 Time
~~~

如果仍全部编码成 Role，容易发生 Role Explosion。

### 【ABAC 用 Attribute 与 Policy 处理动态上下文】

ABAC（Attribute-Based Access Control）综合：

~~~text
Subject Attributes
├── department
├── clearance
├── location
└── employmentType

Resource Attributes
├── owner
├── tenant
├── classification
└── project

Action
├── read
├── edit
└── delete

Environment
├── time
├── network
├── deviceTrust
└── riskScore
~~~

Policy 示例：

~~~text
ALLOW edit IF

subject.department
=
resource.department

AND

subject.clearance
>=
resource.classification

AND

environment.deviceTrusted
=
true
~~~

NIST SP 800-162 将 ABAC 定义为根据 Subject、Object、Operation 以及可能存在的 Environment Condition 属性，通过 Policy 决定访问。

参考：

https://www.nist.gov/publications/guide-attribute-based-access-control-abac-definition-and-considerations

ABAC 适合规则动态、Context 较多的系统，但 Policy、Attribute Source、Debug 与测试成本也更高。

### 【ReBAC 用关系图表达 Owner、Member、Parent 等资源关系】

ReBAC（Relationship-Based Access Control）适合：

~~~text
权限取决于
“你和这个资源是什么关系”
~~~

例如：

~~~text
Alice
  ↓ owns
Document A

Bob
  ↓ member_of
Team X
  ↓ owns
Folder B
~~~

授权规则：

~~~text
Document Owner
→ edit

Folder Member
→ read

Organization Admin
→ manage descendant Project
~~~

关系天然形成 Graph：

~~~text
User
  ↓ relationship
Team
  ↓ relationship
Project
  ↓ relationship
Resource
~~~

OWASP Authorization Cheat Sheet 将 ReBAC 与 RBAC、ABAC 一起作为现代应用常见模型。

参考：

https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

ReBAC 特别适合：

~~~text
协作文档
Organization / Team / Project
社交关系
资源层级继承
多租户组织树
~~~

### 【RBAC、ABAC、ReBAC 和 ACL 可以组合】

真实 SaaS 可能同时存在：

~~~text
RBAC
Organization Role = Admin

+

ReBAC
User member_of Project A

+

ABAC
resource.tenantId == subject.tenantId

+

ACL
Document 单独 Share 给 Bob
~~~

最终允许规则可能是：

~~~text
Allow IF

organizationRole == admin

OR

(
  user member_of project
  AND resource.projectId == project.id
)

OR

resource ACL contains user
~~~

所以架构设计首先应该问：

> 权限事实主要来自 Role、Attribute、Relationship，还是 Resource-specific Grant？

而不是先决定“所有权限都必须使用 RBAC”。

### 【DAC 与 MAC 更适合作为传统访问控制背景】

DAC（Discretionary Access Control）强调 Resource Owner 可以决定把 Resource 授予谁。

MAC（Mandatory Access Control）强调中央 Policy 根据 Security Label / Clearance 强制决定访问，普通用户不能自由修改规则。

例如：

~~~text
Subject Clearance = Secret
Resource Classification = Top Secret
      ↓
Deny
~~~

MAC 常见于操作系统、政府或强分级安全系统。

一般 Web SaaS 日常架构更常直接讨论 ACL、RBAC、ABAC 与 ReBAC。

### 【Authorization Enforcement 必须发生在可信 Server Boundary】

完整链：

~~~text
Request
  ↓
Session / Token Validation
  ↓
Current Subject
  ↓
Load Resource Metadata
  ↓
Authorization Decision
  ↓
Allow?
  │
  ├── No → Reject
  │
  └── Yes
        ↓
Business Operation
~~~

前端：

~~~text
隐藏 Button
禁用 Menu
不渲染 Page
~~~

只属于 UX。

攻击者仍然可以自己构造 HTTP Request，因此真正的 Permission Check 必须在服务端执行。

### 【复杂系统可以把 Policy Definition、Decision 与 Enforcement 分离】

小型系统：

~~~text
if (user.role !== 'admin') {
  deny
}
~~~

已经足够。

权限复杂后可以拆成：

~~~text
Policy Definition
定义允许规则

Policy Decision
输入 Subject / Resource / Action / Context
计算 Allow / Deny

Policy Enforcement
在 Request / Service 边界真正阻断
~~~

安全架构中常分别称为 PAP、PDP、PEP。

重点不是一开始就引入 Policy Engine，而是避免大量不一致权限判断散落在业务代码中。

### 【Deny by Default 与 Least Privilege 是访问控制基础约束】

Deny by Default：

~~~text
Default
= Deny

只有明确满足 Allow Policy
才 Allow
~~~

Least Privilege：

~~~text
Subject
只拥有完成工作所需的最小 Permission
~~~

而不是为了方便：

~~~text
所有用户
都赋予 Admin
~~~

OWASP 建议：

~~~text
Least Privilege
Deny by Default
Validate Permission on Every Request
~~~

### 【401、403 与 404 表达不同失败阶段】

401：

~~~text
没有有效 Authentication Credential
~~~

403：

~~~text
身份有效
但当前 Action 不允许
~~~

404：

某些系统为了不暴露 Resource Existence，对无权知道资源存在的 Subject 返回 404。

这属于资源隐藏策略，需要保持一致。

### 【四类应用级模型可以通过业务特征选择】

| 业务特征 | 更自然的模型 |
| --- | --- |
| 某个资源直接分享给若干用户 | ACL |
| 权限主要来自稳定组织职责 | RBAC |
| 权限依赖部门、时间、设备、数据等级 | ABAC |
| 权限来自 Owner、Member、Parent、Team 等关系 | ReBAC |
| 同时依赖角色、关系与环境 | 组合模型 |

判断路径：

~~~text
权限主要由稳定岗位决定？
        ├── Yes → RBAC
        └── No
              ↓
是否是单资源直接 Grant？
        ├── Yes → ACL
        └── No
              ↓
是否主要来自资源关系图？
        ├── Yes → ReBAC
        └── No
              ↓
是否依赖大量动态 Attribute / Context？
        └── Yes → ABAC
~~~

这不是严格算法，但可以帮助建立选型框架。


---

## 4. 身份认证、会话控制与访问控制最终组成一条完整安全链

三个系统最终连接：

~~~text
Authentication
│
├── Register
├── Credential Enrollment
├── Identity Verification
├── Login
└── Recovery / Re-authentication
        ↓
Authenticated Principal
        ↓
Session Management
        │
        ├── Server-side Session
        │       ↓
        │   Session Identifier
        │
        └── Access + Refresh Token
                ↓
            Access Credential
        ↓
Credential Transport / Storage
Cookie / Header / BFF / Memory
        ↓
Request Principal
        ↓
Authorization
Subject + Resource + Action + Context
        ↓
ACL / RBAC / ABAC / ReBAC
        ↓
Allow / Deny
        ↓
Business Action
~~~

一次受保护 Request 可以按顺序分析：

~~~text
1. Extract Credential
   Cookie / Authorization Header
        ↓
2. Validate Session / Access Token
        ↓
3. Restore Current Subject
        ↓
4. 如果是 Cookie-based Unsafe Request
   执行 CSRF Protection
        ↓
5. Load Resource
        ↓
6. Authorization Decision
        ↓
7. Allow / Deny
        ↓
8. Business Operation
~~~

这样以后遇到“鉴权”这个模糊词，应继续追问：

~~~text
这里指的是：

Authentication？
Session Validation？
还是 Authorization？
~~~

---

## 5. 安全问题也应该按三个体系分别定位

Authentication Failure：

~~~text
Credential Stuffing
Brute Force
Weak Password Hash
Account Enumeration
Reset Token Leakage
MFA Bypass
~~~

Session Failure：

~~~text
Session Hijacking
Session Fixation
Long-lived Credential
Refresh Token Replay
Missing Revocation
Unsafe Browser Storage
CSRF
~~~

Authorization Failure：

~~~text
IDOR / BOLA
Privilege Escalation
Missing Resource Check
Role Misconfiguration
Tenant Isolation Failure
Front-end-only Permission Check
~~~

分层以后，安全问题就不会全部被笼统归为“登录鉴权问题”。

---

## 6. 面试与架构说明应先讲三个系统，再进入具体技术

如果被问：

~~~text
一个 Web 登录和权限系统应该怎么设计？
~~~

回答路径可以是：

> Web 身份体系可以拆成 Authentication、Session Management 和 Authorization 三层。Authentication 通过 Password、Passkey、MFA 等 Credential 确认用户身份，并覆盖注册、身份验证、登录、恢复与重新认证等生命周期；Authentication 成功以后，再通过 Server-side Session 或 Access Token + Refresh Token 等模型让身份跨 HTTP Request 持续；每个 Request 恢复当前 Subject 后，再根据 Resource、Action 和 Context 做 Authorization。稳定组织角色适合 RBAC，单资源直接授权适合 ACL，动态属性条件适合 ABAC，复杂 Owner / Member / Parent 等关系适合 ReBAC，真实系统也可以组合使用。

如果继续追问：

~~~text
Cookie、Session、Token 什么关系？
~~~

可以回答：

~~~text
Session
是跨 Request 的状态模型

Session Identifier / Access Token
是 Credential

Cookie
是 Browser 保存和自动传递 Credential 的一种机制

Token
是 Credential 的广义形式
~~~

如果继续追问：

~~~text
Session 和双 Token 怎么选？
~~~

需要从：

~~~text
Server State
Immediate Revocation
Multi-service
OAuth Integration
Browser Security
Deployment Topology
~~~

比较，而不是简单说：

~~~text
Session 传统
JWT 现代
~~~

如果继续追问：

~~~text
权限系统是不是 RBAC 就够了？
~~~

则要先判断权限事实来自：

~~~text
Role
Attribute
Relationship
Resource-specific Grant
~~~

再决定 RBAC、ABAC、ReBAC、ACL 或组合模型。

---

## 7. 参考资料

### 【身份认证】

1. OWASP Authentication Cheat Sheet  
   https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

2. OWASP Password Storage Cheat Sheet  
   https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

### 【会话控制】

3. OWASP Session Management Cheat Sheet  
   https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

4. MDN Set-Cookie  
   https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie

5. OWASP CSRF Prevention Cheat Sheet  
   https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

6. RFC 9110 — Safe Methods  
   https://www.rfc-editor.org/rfc/rfc9110.html#name-safe-methods

7. MDN Same-Origin Policy  
   https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy

8. RFC 6749 — OAuth 2.0 Authorization Framework  
   https://www.rfc-editor.org/rfc/rfc6749.html

9. RFC 6750 — Bearer Token Usage  
   https://www.rfc-editor.org/rfc/rfc6750.html

10. RFC 9700 — Best Current Practice for OAuth 2.0 Security  
    https://www.rfc-editor.org/rfc/rfc9700.html

11. RFC 10017 — OAuth 2.0 for Browser-Based Applications  
    https://www.rfc-editor.org/rfc/rfc10017.html

### 【访问控制】

12. OWASP Authorization Cheat Sheet  
    https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

13. NIST — Role-Based Access Control: Features and Motivations  
    https://www.nist.gov/publications/role-based-access-control-rbac-features-and-motivations

14. NIST SP 800-162 — Guide to Attribute Based Access Control  
    https://www.nist.gov/publications/guide-attribute-based-access-control-abac-definition-and-considerations

### 【相关知识文档】

- [Cookie 安全性概述笔记](./Cookie安全性概述笔记.md)
- [Access Token 与 Refresh Token 核心知识点笔记](./Access%20Token与Refresh%20Token核心知识点笔记.md)
- [浏览器存储方式](./浏览器存储方式.md)
- [浏览器网络面试题](./浏览器网络面试题.md)
- [NestJS 快速上手](./NestJS快速上手.md)

### 【实战分析入口】

- [Browser Monitor：账号认证、Session 与 CSRF 源码实战分析](https://github.com/cxDlogver/browser-monitor/blob/main/docs/%E8%B4%A6%E5%8F%B7%E8%AE%A4%E8%AF%81Session%E4%B8%8ECSRF%E6%BA%90%E7%A0%81%E5%AE%9E%E6%88%98%E5%88%86%E6%9E%90.md)
