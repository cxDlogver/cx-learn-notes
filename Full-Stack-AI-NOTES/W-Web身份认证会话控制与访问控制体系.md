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

### 【身份认证既可以由当前应用完成，也可以委托给外部身份提供方】

“验证 Credential”并不意味着每个应用都必须自己保存并验证用户的 Password。身份认证可以先分成两条常见路径：

~~~text
Authentication
│
├── Local Authentication
│   当前应用直接建立账号并验证 Credential
│   例如 Password / Passkey / MFA
│
└── Federated Authentication
    当前应用把外部身份验证委托给可信 Identity Provider
    再验证对方返回的 Authentication Result
~~~

本地身份认证（Local Authentication）中，当前应用直接负责：

~~~text
Account
+
Credential
+
Verification
        ↓
Authenticated Principal
~~~

因此后面的注册、Password Hash、Email Verification、MFA、Password Reset 等都属于这一分支。

联合身份认证（Federated Authentication）中，当前应用不直接获取或验证外部账号的 Password，而是信任一个经过配置的身份提供方（Identity Provider，IdP）完成外部身份认证，再验证它返回的协议结果：

~~~text
User
↓
Identity Provider
完成外部身份认证
↓
Authentication Result
↓
Current Application
验证结果并映射本地身份
↓
Authenticated Principal
~~~

在 OpenID Connect 中，当前应用通常称为 Relying Party（RP，信赖方）：它不因为“用户从某个页面跳回来”就直接相信身份，而是必须按照协议验证来自 OpenID Provider 的认证结果。

因此：

~~~text
Federated Authentication
≠
把外部网站返回的 email 直接当成已登录用户

Federated Authentication
=
把 Credential Verification 委托出去
+
在本应用边界重新验证协议结果
+
形成当前应用自己的可信 Principal
~~~

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

### 【OAuth 2.0 解决授权访问资源，OpenID Connect 在其上增加身份认证层】

OAuth 2.0 是 Authorization Framework（授权框架）：它解决 Client 怎样在 Resource Owner 授权后获得 Access Token，并用该 Token 访问 Resource Server。它的标准职责不是定义“这个用户是谁”的统一认证结果。[[3]](https://www.rfc-editor.org/rfc/rfc6749.html)

因此下面的等式不成立：

~~~text
OAuth 2.0
=
第三方登录协议
~~~

OpenID Connect（OIDC）在 OAuth 2.0 之上增加 Identity Layer（身份层）。它让 Client / Relying Party 可以获得并验证 End-User 的 Authentication Result，其中最核心的新增结构是 ID Token。[[4]](https://openid.net/specs/openid-connect-core-1_0.html)

可以把职责先拆成：

~~~text
OAuth 2.0
回答：
Client 被允许访问什么 Resource？

OIDC
继续回答：
这次 Authentication 对应的 End-User 是谁？
Authentication Result 是否可以被当前 Client 信任？
~~~

OIDC Authentication Request 会使用 OAuth 2.0 的 Authorization Endpoint；当请求包含 `openid` Scope 时，它进入 OpenID Connect 的身份认证语义，并最终通过 ID Token 等结构把认证结果安全返回给 Relying Party。

因此工程中常说的：

~~~text
“使用 Google / Microsoft / 企业 IdP 登录”
~~~

如果目标是让当前应用确认用户身份，通常需要的是 OIDC 等身份协议能力，而不能只因为底层使用 OAuth 2.0 就把 OAuth Access Token 当成登录证明。

### 【Authorization Code 与 PKCE 把重定向认证和 Token Exchange 安全连接起来】

现代 Browser / Web Authentication 常使用 Authorization Code Flow。一次 OIDC Authorization Code 流程可以先建立下面的最小链路：

~~~text
1. Browser / Client
发起 Authentication Request
生成 PKCE code_verifier
并发送对应 code_challenge
        ↓
2. Authorization Endpoint
Identity Provider 完成 Authentication
        ↓
3. Redirect URI
只返回短生命周期 Authorization Code
        ↓
4. Token Endpoint
Client 提交：
Authorization Code
+
code_verifier
        ↓
5. Authorization Server
验证 Code 与 PKCE Binding
        ↓
6. 返回协议允许的 Token
例如：
ID Token
Access Token
Refresh Token（如果该 Client / Scope / Policy 允许）
~~~

Authorization Code（授权码）是用于 Token Exchange 的短生命周期中间凭据，它不是业务 API 的 Access Token，也不应该被当作长期 Session Credential。

PKCE（Proof Key for Code Exchange，授权码交换证明）：Client 在流程开始时生成随机 `code_verifier`，只发送其派生出的 `code_challenge`；兑换 Authorization Code 时再提交原始 `code_verifier`。这样 Authorization Server 可以确认“兑换 Code 的 Client 实例”与最初发起流程的实例相匹配。

~~~text
Client Instance
生成 verifier
     ↓
challenge
     ↓
Authorization Request
     ↓
Authorization Code
     ↓
verifier
     ↓
Token Request
     ↓
Server 验证 challenge / verifier
~~~

RFC 9700 要求 OAuth Public Client 使用 PKCE，并推荐 Confidential Client 也使用 PKCE；RFC 10017 对 Browser-based Public Client 进一步明确要求 Authorization Code + PKCE。[[5]](https://www.rfc-editor.org/rfc/rfc9700.html)[[6]](https://www.rfc-editor.org/rfc/rfc10017.html)

PKCE 保护的是 Authorization Code 被拦截或注入后的兑换边界，它不替代 OIDC 身份结果验证。Relying Party 获得 ID Token 后仍需要根据协议验证 Signature、Issuer、Audience、Expiration，以及流程中适用的 `nonce` 等约束。

### 【ID Token、Access Token、Refresh Token 与 Session Cookie 面向不同消费者】

联合身份流程中最容易出现的错误，是把所有 Token 都理解成“登录 Token”。

可以先按“谁消费它、它证明什么”区分：

| Credential / Token | 主要消费者 | 核心职责 |
| --- | --- | --- |
| Authorization Code | Authorization Server 的 Token Endpoint | 临时兑换 Token，不直接访问业务 Resource |
| ID Token | OIDC Relying Party / Client | 表达 Authentication Result 与身份相关 Claims |
| Access Token | Resource Server | 表达访问 Resource 的授权能力 |
| Refresh Token | Authorization Server | 在允许的生命周期内申请新的 Access Token |
| Session Cookie | 当前 Web Application / BFF | 把当前应用已经建立的 Session 带到后续 Browser Request |

因此：

~~~text
ID Token
≠
Access Token

ID Token
主要证明 OIDC Authentication Result

Access Token
主要授权 Resource Access
~~~

OpenID Connect Core 将 ID Token 定义为包含 End-User Authentication Event Claims 的安全 Token，并明确它是 OIDC 在 OAuth 2.0 上实现身份认证的核心扩展。[[4]](https://openid.net/specs/openid-connect-core-1_0.html)

同样：

~~~text
Refresh Token
≠
Session Cookie
~~~

Refresh Token 面向 Authorization Server 的 Token Endpoint；Session Cookie 面向当前 Web Application 的 Session Boundary。Access / Refresh Token 的生命周期、Rotation、Reuse Detection、JWT / Opaque Token 等细节继续阅读 [Access Token 与 Refresh Token 核心知识点笔记](./A-Access%20Token与Refresh%20Token核心知识点笔记.md)。

### 【联合身份认证完成后仍要映射本地 Principal 并继续会话与访问控制】

外部 Identity Provider 完成 Authentication，只解决了“外部身份已经被可信提供方验证”。当前应用仍然需要决定：

~~~text
这个 External Identity
对应本系统中的哪个 User？
~~~

OIDC 中更稳定的外部身份键通常来自：

~~~text
Issuer
+
Subject Identifier (sub)
~~~

可以抽象成：

~~~text
Validated ID Token
        ↓
External Identity
iss + sub
        ↓
Account Linking / Provisioning
        ↓
Local User ID
        ↓
Authenticated Principal
        ↓
Session Management
        ↓
Application Authorization
~~~

这里 Account Linking（账号关联）表示：把“某个 Identity Provider 下的外部 Subject”与本应用内部稳定 User 关联起来。应用不应该只因为两个账号返回了相同 Display Name，甚至仅凭未经严格策略约束的 Email，就默认它们一定是同一个 Principal。

更重要的是：

~~~text
OIDC Authentication Success
≠
拥有本应用所有权限
~~~

联合身份只改变“Authentication Result 从哪里来”，并没有取消当前应用自己的 Authorization：

~~~text
External Authentication
        ↓
Local Principal
        ↓
Session
        ↓
RBAC / ABAC / ReBAC / ACL
        ↓
Allow / Deny
~~~

所以无论身份来自本地 Password 还是外部 IdP，最终都应该回到当前应用能够信任和审计的 Principal，再进入同一套 Session Management 与 Authorization Boundary。

### 【Browser、BFF 与 Server-side Web 的 OAuth Token 边界不同】

讨论“Access Token 应该放 localStorage、memory 还是 Cookie”之前，应该先决定：

> OAuth Client 的可信执行边界在哪里？Browser 是否真的需要直接持有 OAuth Token？

RFC 10017 把 Browser-based OAuth Application 的主要架构分成三类：BFF、Token-Mediating Backend、以及 Browser 自己作为 OAuth Client。它们的核心差异不是 Storage API，而是 Token 是否暴露给 Browser JavaScript。[[6]](https://www.rfc-editor.org/rfc/rfc10017.html)

BFF（Backend for Frontend，面向前端的后端）模式中：

~~~text
Browser
只持有受保护的 Session Cookie
        ↓
BFF
作为 OAuth Client
保存 / 使用 Access Token、Refresh Token
        ↓
Resource Server
~~~

Browser 请求 BFF 时携带 Session Cookie，BFF 根据 Server-side Session 找到对应 OAuth Token，再代表 Browser 调用 Resource Server。RFC 10017 明确把“避免 OAuth Token 直接暴露给 Browser”作为 BFF 的核心安全属性之一。[[6]](https://www.rfc-editor.org/rfc/rfc10017.html)

Token-Mediating Backend 中，Backend 负责 OAuth Flow 与 Refresh Token 等职责，但仍可能把 Access Token 提供给 Browser，由 Browser 直接访问 Resource Server。

Browser-based OAuth Client 则让 Browser JavaScript 自己承担 OAuth Client 职责：

~~~text
Browser
Authorization Code + PKCE
        ↓
Token Endpoint
        ↓
Access Token
        ↓
Browser 直接调用 Resource Server
~~~

这种模型必须接受 Access Token 进入 Browser Runtime 所带来的 XSS / Exfiltration Exposure，并按照 RFC 10017 的 Browser Client 要求保护 Authorization Code、Token 与 Refresh Lifecycle。

传统 Server-side Web Application 或 Same-origin BFF 还可能在 OIDC Authentication 完成后直接建立本应用的 Server-side Session：

~~~text
OIDC Authentication
        ↓
Backend 验证 ID Token / Authentication Result
        ↓
Local Principal
        ↓
Server-side Session
        ↓
HttpOnly Session Cookie
        ↓
Browser
~~~

因此：

~~~text
使用 OIDC 登录
≠
Browser 必须长期保存 Access Token
~~~

如果 Browser 只需要访问同一个可信 Backend，而 OAuth Token 只用于 Backend 访问下游 Resource Server，那么让 Token 保留在 Server-side Boundary 往往能减少 Browser Token Exposure。

BFF 会承担应用层代理职责，但它不等同于通用 Reverse Proxy 或 API Gateway。公开入口、Upstream Routing、Load Balancing 与 Proxy Trust Boundary 继续阅读 [反向代理与 Web 入口体系](./F-反向代理与Web入口体系.md)。

身份认证这一部分最终可以收束成两条来源、一条统一出口：

~~~text
Local Authentication
Account + Local Credential
        │
        ├─────────────┐
        │             │
        ↓             ↓
Password / MFA    Recovery / Re-authentication
        │             │
        └──────┬──────┘
               ↓
       Authenticated Principal

Federated Authentication
External Identity Provider
        ↓
OIDC Authentication Result
        ↓
Validate ID Token / Protocol Result
        ↓
Account Linking / Provisioning
        ↓
Authenticated Principal
               ↓
       Session Management
               ↓
       Application Authorization
~~~

两条 Authentication Path 的 Credential 来源不同，但最终目标相同：形成当前应用能够信任的 Principal。接下来仍然需要解决这个 Principal 怎样跨多个 HTTP Request 持续成立，因此进入 Session Management。

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

OWASP 建议 Session Identifier 应不可预测，不应包含敏感业务语义，并应在服务端维护真正的 Session State。[[7]](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)


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

RFC 6749 明确指出 Access Token 可以是 Opaque Identifier，也可以是 Self-contained Token，并不要求必须使用 JWT。[[3]](https://www.rfc-editor.org/rfc/rfc6749.html)

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

传输，并要求在存储与传输中保护 Bearer Token。[[8]](https://www.rfc-editor.org/rfc/rfc6750.html)

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

RFC 9700 要求 Public Client 使用 Refresh Token 时，通过 Sender-constrained Token 或 Refresh Token Rotation 等机制处理重放风险。[[5]](https://www.rfc-editor.org/rfc/rfc9700.html)

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

Cookie 的 Domain、Path、Expires / Max-Age、Secure、HttpOnly 与 SameSite 等传输属性由 Set-Cookie 响应头定义。[[9]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)

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

Browser Token Storage 是架构决策的下游问题。先判断 OAuth Client 与 Token Boundary：

~~~text
BFF / Server-side Web
OAuth Token 留在可信 Backend
Browser 主要持有 Session Cookie

Token-Mediating Backend
Backend 管理 OAuth Flow
Browser 仍可能获得 Access Token

Browser-based OAuth Client
Browser JavaScript 直接管理 Access Token
~~~

RFC 10017 对这些 Browser Architecture Pattern 分别给出安全边界，并把 BFF、Token-Mediating Backend、Browser-based OAuth Client 作为不同权衡。[[6]](https://www.rfc-editor.org/rfc/rfc10017.html)

只有架构确定以后，才继续讨论 Browser 侧 Credential 放在哪里。

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

IETF 2026 发布的 RFC 10017 专门讨论 Browser-based OAuth Application 的 Token 暴露面、BFF 等架构选择。[[6]](https://www.rfc-editor.org/rfc/rfc10017.html)

### 【Session Lifecycle 管理的不是一个 expiresAt，而是会话从创建到失效的完整状态】

Session Lifecycle（会话生命周期）解决的是：一个已经登录的 Session 从什么时候建立、什么时候仍然有效、什么时候需要更新 Credential、什么时候自然过期，以及什么时候必须被 Server 主动撤销。

可以先把它理解成一条状态链：

~~~text
Authentication Success
        ↓
Create
创建 Session
        ↓
Active
Session 当前有效
        ↓
Use
后续 Request 持续使用
        ↓
Renew / Rotate
必要时更新 Session Credential
        ↓
Expire
因为时间规则自然失效
        ↓
Revoke
因为 Logout / Security Event 主动失效
        ↓
Re-authenticate
必要时重新证明身份
~~~

因此一个 Server-side Session 往往不只需要：

~~~text
sessionId
userId
~~~

还可能维护：

~~~text
createdAt
lastActivityAt
absoluteExpiresAt
status / revokedAt
csrfToken
device / risk metadata
~~~

这些字段分别服务于不同的生命周期判断。

#### <u>1. Create：Authentication 成功以后才建立 Session</u>

用户完成 Password、MFA 等身份验证：

~~~text
Authentication Success
        ↓
Generate Session Identifier
        ↓
Create Server Session State
        ↓
把 Session Identifier 交给 Client
~~~

例如：

~~~text
Session

userId            = user_10001
createdAt         = 09:00
lastActivityAt    = 09:00
absoluteExpiresAt = 17:00
status            = active
~~~

如果使用 Cookie，Browser 只是通过 Cookie 保存和自动携带 Session Identifier。

所以：

~~~text
Cookie
不是 Session 本身

Session State
才是 Server 对当前登录状态的真实记录
~~~

#### <u>2. Use：每个 Request 都要重新判断 Session 是否仍然有效</u>

Session 创建以后，用户可能不断发送：

~~~text
GET /projects
GET /profile
POST /orders
PATCH /settings
~~~

每一次 Request 都应该经过类似判断：

~~~text
Request
  ↓
Extract Session Credential
  ↓
Lookup Session
  ↓
Session Exists?
  │
  ├── No → 401
  └── Yes
        ↓
Revoked?
  │
  ├── Yes → 401
  └── No
        ↓
Idle Timeout Exceeded?
  │
  ├── Yes → Expire
  └── No
        ↓
Absolute Timeout Exceeded?
  │
  ├── Yes → Expire
  └── No
        ↓
Restore Current User
        ↓
Continue Request
~~~

因此：

~~~text
Session Record Exists
≠
Session Is Valid
~~~

真正的 Active Session 是多个条件共同成立的结果。

#### <u>3. Idle Timeout 限制“这个 Session 已经多久没有被使用”</u>

Idle Timeout（空闲超时）关注：

> 距离上一次有效 Activity 已经过了多久。

假设：

~~~text
Idle Timeout = 30 min
~~~

用户：

~~~text
09:00 Login
09:20 Request
~~~

09:20 时：

~~~text
09:20 - 09:00
=
20 min
<
30 min
~~~

Session 仍然有效，并可以更新：

~~~text
lastActivityAt = 09:20
~~~

如果用户一直没有操作，直到：

~~~text
10:00
~~~

此时：

~~~text
10:00 - 09:20
=
40 min
>
30 min
~~~

则：

~~~text
Idle Timeout Exceeded
      ↓
Session Invalid
      ↓
Require Login Again
~~~

因此 Idle Timeout 本质上是一个基于 Last Activity 的滑动窗口。

它主要处理：

~~~text
用户离开设备
忘记 Logout
Session Credential 仍然保留在 Browser
~~~

这类风险。

#### <u>4. Absolute Timeout 限制“这一次登录最多可以持续多久”</u>

Idle Timeout 有一个明显缺陷：

~~~text
只要一直有 Activity
lastActivityAt 就不断更新
~~~

如果攻击者已经获得 Session Credential，并持续发送 Request，Idle Timeout 可能永远不会触发。

因此还需要 Absolute Timeout（绝对超时）。

例如：

~~~text
createdAt = 09:00
absoluteTimeout = 8 h
absoluteExpiresAt = 17:00
~~~

即使用户：

~~~text
16:59
刚刚发送过 Request
~~~

到了：

~~~text
17:00
~~~

仍然必须：

~~~text
Session Invalid
      ↓
Require Re-authentication
~~~

两种 Timeout 的区别：

| 机制 | 计算起点 | Activity 是否延长 | 解决的问题 |
| --- | --- | --- | --- |
| Idle Timeout | Last Activity | 会 | Session 长时间无人使用 |
| Absolute Timeout | Session Created At | 不会 | 一个 Session 整体存活过久 |

可以简单记成：

~~~text
Idle Timeout
问：
“你多久没操作了？”


Absolute Timeout
问：
“你这次登录已经持续多久了？”
~~~

OWASP Session Management Cheat Sheet 也将 Idle Timeout 和 Absolute Timeout 作为两个独立的 Session Expiration 控制维度。

#### <u>5. Server Timeout 才是真正安全边界，Cookie Expiration 只是 Client 辅助</u>

假设 Cookie 设置：

~~~text
Expires = 17:00
~~~

这只能控制 Browser 什么时候停止自动发送这个 Cookie。

攻击者完全可以绕过 Browser，自己构造：

~~~http
Cookie: session=<stolen-session-token>
~~~

因此 Server 仍然必须判断：

~~~text
now > absoluteExpiresAt ?
lastActivityAt + idleTimeout < now ?
status == revoked ?
~~~

所以真正安全边界是：

~~~text
Server Session Validation
~~~

而不是：

~~~text
Browser Cookie 还在不在
~~~

#### <u>6. Renewal / Rotation 用于减少同一个 Session Credential 长期不变</u>

假设：

~~~text
Session ID = S1
~~~

如果 S1 在整个 Session 生命周期内始终不变，一旦攻击者较早拿到 S1，就可能一直使用到 Session 最终失效。

Renewal / Rotation 可以：

~~~text
S1
  ↓
Generate New Session Identifier
  ↓
S2
  ↓
S1 Invalid
~~~

常见 Rotation Point 包括：

~~~text
Login Success
Privilege Elevation
Re-authentication
Periodic Renewal
~~~

尤其在：

~~~text
Anonymous Session
      ↓
Login Success
~~~

之后重新生成 Session Identifier，可以避免继续沿用认证前的 Session ID，从而降低 Session Fixation 风险。

这里的 Session ID Renewal 与前文的 Refresh Token Rotation 思想相似，但不是同一个机制：

~~~text
Server-side Session Renewal
主要更新 Session Identifier

Refresh Token Rotation
主要更新长期 Refresh Credential
并可结合 Token Family / Replay Detection
~~~

#### <u>7. Expire 与 Revoke 都会让 Session 失效，但原因不同</u>

Expire（过期）表示 Session 因时间规则自然结束：

~~~text
Idle Timeout
Absolute Timeout
~~~

Revoke（撤销）表示 Session 原本可能仍在有效期内，但 Server 主动宣布它失效：

~~~text
Logout
Password Reset
Account Disabled
Security Incident
Admin Force Logout
~~~

可以简单记成：

~~~text
Expire
=
时间到了


Revoke
=
现在就不再信任这个 Session
~~~

因此 Session Lifecycle 最终可以归纳成：

~~~text
Session Lifecycle
│
├── 建立与使用
│   ├── Create
│   ├── Active
│   └── Use
│
├── 更新 Credential
│   └── Renewal / Rotation
│
└── 结束 Session
    ├── Expiration
    │   ├── Idle Timeout
    │   └── Absolute Timeout
    │
    └── Revocation
        ├── Logout
        ├── Password Reset
        └── Security Event
~~~

### 【Logout 的本质是撤销 Server 对旧 Credential 的信任】

Logout 不能只理解成：

~~~text
clear local state
redirect /login
~~~

这些操作只会让当前页面看起来“退出了”。

真正需要确认的是：

> 如果旧 Session Token / Refresh Token 再次提交给 Server，Server 还会不会接受？

如果答案仍然是 Yes，那么安全意义上的 Logout 就没有完成。

完整 Logout 可以理解成：

~~~text
User Click Logout
        ↓
Client Send Logout Request
        ↓
Server Identify Current Session
        ↓
Revoke / Delete Server Credential State
        ↓
Old Credential Cannot Authenticate Again
        ↓
Client Clear Cookie / Token / UI State
~~~

其中真正建立安全边界的是：

~~~text
Server Revocation
~~~

Client Cleanup 只是收尾。

#### <u>1. Server-side Session 可以直接删除或撤销当前 Session</u>

假设：

~~~text
Browser
Cookie: session=S1

Server
S1 → user_10001
~~~

Logout：

~~~text
POST /logout
      ↓
Server 找到 S1
      ↓
Delete Session

或者：

status = revoked
revokedAt = now()
      ↓
Clear Client Cookie
~~~

之后旧 Credential 再次出现：

~~~text
S1
  ↓
Lookup
  ↓
Not Found / Revoked
  ↓
401
~~~

这就是 Server-side Session 能比较直接实现即时 Logout 的原因：每次 Request 本来就要查询或验证 Server Session State。

Delete 与 Revoke 都能让 Session 失效，区别主要在于是否需要保留 Audit、Device History、Revocation Reason 等生命周期记录。

#### <u>2. Client Cookie 清除失败不会重新让 Session 有效，但 Server 没撤销才是真正风险</u>

Logout 通常还会清 Cookie：

~~~http
Set-Cookie: session=; Max-Age=0; Path=/; HttpOnly; Secure
~~~

清除时 Cookie 的 Name、Domain、Path 需要与原 Cookie Scope 对应，否则 Browser 可能仍保留旧 Cookie。

但即使 Client Cookie 没有成功清掉，只要：

~~~text
Server Session 已经 Revoked
~~~

后续携带旧 Cookie 也只会得到：

~~~text
401
~~~

反过来：

~~~text
Client 已经删除 Cookie
+
Server Session 仍然 Active
~~~

才是安全问题，因为已经被复制出去的 Credential 仍然可以继续使用。

所以优先级是：

~~~text
Server Revocation
>
Client Cleanup
~~~

#### <u>3. Access + Refresh Token 模型需要分别处理“续期能力”和“已经发出去的访问能力”</u>

假设：

~~~text
Access Token  AT1
TTL = 10 min

Refresh Token RT1
TTL = 30 days
~~~

Logout 首先应该撤销：

~~~text
RT1
~~~

因为如果 Refresh Token 仍然有效：

~~~text
Attacker Has RT1
      ↓
Refresh
      ↓
Get AT2
      ↓
重新获得访问能力
~~~

如果使用 Refresh Token Rotation，通常撤销当前 Token Family，表示这一整次 Login Session 都已经结束。

但这里还有一个独立问题：

~~~text
RT1 已经撤销
≠
AT1 一定立即失效
~~~

如果 AT1 是 Self-contained Access Token，并且 Resource Server 只做：

~~~text
Verify Signature
+
Check exp
~~~

那么 Logout 时 AT1 如果还有几分钟有效期，它可能继续被接受直到自然过期。

因此常见设计是：

~~~text
Short-lived Access Token
+
Revocable Refresh Token
~~~

如果业务要求 Access Token 也立即失效，则需要增加额外机制，例如：

~~~text
Revocation / Deny List
Token Introspection
Central Session Version
其他在线状态检查
~~~

代价是重新引入共享状态查询和额外复杂度。

所以 Server-side Session 与 Self-contained Access Token 的 Logout 差异，本质仍然来自前面已经讲过的“状态放在哪里”。

#### <u>4. Current Session Logout 与 Logout All Devices 是两个不同操作</u>

假设同一个 User 有：

~~~text
Laptop
Session S1

Phone
Session S2

Office PC
Session S3
~~~

普通 Logout：

~~~text
Revoke S1
~~~

只结束当前设备的 Session。

而：

~~~text
Logout All Devices
~~~

需要：

~~~text
Find All Sessions By User
      ↓
Revoke S1
Revoke S2
Revoke S3
~~~

这也是为什么一些 Session Store 除了：

~~~text
sessionId → Session
~~~

还需要支持：

~~~text
userId → Sessions
~~~

的反向索引。

同样，Password Reset、Account Compromise、MFA Reset、Account Disabled 等高风险事件，也可能需要触发 User-level Session Revocation，而不是只处理当前设备。

#### <u>5. Logout API 适合设计成 Idempotent</u>

Idempotent（幂等）表示同一个 Logout 请求因为网络重试执行多次，最终结果仍然应该是：

~~~text
Old Credential Invalid
~~~

例如第一次：

~~~text
POST /logout
      ↓
Revoke S1
      ↓
Success
~~~

第二次重复请求时，即使 S1 已经不存在，也可以继续返回成功语义，因为目标状态已经达成。

Logout 关心的是：

~~~text
Session 最终是否已经失效
~~~

而不是要求 Delete 操作必须只执行一次。

#### <u>6. Logout 不能保证已经进入业务逻辑的并发 Request 被瞬间取消</u>

用户点击 Logout 时，可能同时存在：

~~~text
Request A
GET /profile

Request B
POST /save

Request C
POST /logout
~~~

如果 A、B 已经在 C 之前完成 Session Validation，并进入 Business Logic，那么 C 删除 Session 后，它们不一定会被自动中断。

因此普通 Web 系统所谓“Logout 立即生效”通常表示：

> Logout 完成以后，新到达的 Request 不能继续使用旧 Credential。

如果某些高风险业务要求更强保证，可以在 Critical Operation 执行前再次检查 Session / Account Security State。

最终可以把 Logout 压缩成：

~~~text
Logout
│
├── Server
│   ├── Revoke Session
│   ├── Revoke Refresh Credential
│   └── 必要时处理 Access Token / All Sessions
│
└── Client
    ├── Clear Cookie / Token
    ├── Clear Local User State
    └── Redirect Login
~~~

其中最关键的一句是：

> Logout 的核心不是“回到登录页”，而是让旧 Credential 无法再次恢复用户身份。

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

首先说明 API 违反 Safe Method 语义。RFC 9110 将 GET、HEAD、OPTIONS、TRACE 定义为 Safe Method，应用不应把具有副作用的业务操作设计成普通 GET。[[11]](https://www.rfc-editor.org/rfc/rfc9110.html#name-safe-methods)

GET 不要求 CSRF Token 不意味着完全没有跨站信息泄露。

Same-Origin Policy 通常允许部分 Cross-origin Write / Navigation / Embedding，同时限制 Cross-origin Read。[[12]](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)

仍需单独处理：

~~~text
XS-Leak
CORS Misconfiguration
Cross-origin Embedding
Timing Side Channel
Resource Existence Leak
~~~


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


ACL 可以直接理解成“Resource 自己维护一张访问名单”。

例如数据库可以有：

~~~text
documents

id
title
owner_id


document_acl

document_id
subject_type
subject_id
permission
~~~

其中 document_acl 可能出现：

~~~text
document_100
user
alice
read

document_100
user
alice
write

document_100
team
finance
read
~~~

当 Bob 请求：

~~~text
Edit Document 100
~~~

Server 不是只看 Bob 是否登录，而是查询：

~~~text
Document 100 的 ACL
      ↓
有没有：
subject = Bob
permission = write
      ↓
没有
      ↓
Deny
~~~

ACL 的优势是非常直观，适合表达：

~~~text
“这一个具体资源
额外分享给谁”
~~~

但如果系统有大量用户、大量资源和大量独立 Grant，ACL 会迅速变成很庞大的授权关系集合。

所以 ACL 往往适合作为资源级直接授权，而不是承担整个大型组织权限体系。

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


RBAC 真正的结构通常不是简单：

~~~text
users.role = admin
~~~

而是：

~~~text
User
  ↓
User-Role Assignment
  ↓
Role
  ↓
Role-Permission Assignment
  ↓
Permission
~~~

可以落成：

~~~text
users
id

roles
id
name

permissions
id
resource
action

user_roles
user_id
role_id

role_permissions
role_id
permission_id
~~~

例如：

~~~text
Alice
      ↓
Editor
      ↓
project.read
project.update
report.read
~~~

Alice 不需要自己直接保存三个 Permission。

如果 Alice 从 Editor 调整为 Viewer，只需要改 User-Role Relationship，不需要逐条修改所有 Permission。

这就是 RBAC 最大的工程价值：

> 用稳定的组织角色作为 User 和 Permission 之间的中间层，降低权限管理成本。

Role 还可以存在 Hierarchy（角色层级）：

~~~text
Viewer
  ↓
read

Editor
  ↓
inherits Viewer
+
update

Admin
  ↓
inherits Editor
+
manage
~~~

但如果为了表达业务条件不断创建：

~~~text
FinanceEditor
FinanceProjectAEditor
FinanceProjectANightEditor
FinanceProjectANightTrustedDeviceEditor
~~~

说明这些条件已经不是稳定“组织角色”，而是在混入：

~~~text
Attribute
Relationship
Environment Context
~~~

此时继续增加 Role 就会导致 Role Explosion（角色爆炸）。

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


ABAC 最容易被忽略的问题是：Attribute 不是凭空存在的。

例如 Policy 写：

~~~text
subject.department
==
resource.department
~~~

Server 必须继续回答：

~~~text
subject.department
从哪里来？

resource.department
从哪里来？

这些值能不能相信？
~~~

Subject Attribute 应来自可信来源，例如：

~~~text
User Profile
HR Directory
Identity Provider
Organization Membership
~~~

而不是直接相信 Client Body：

~~~text
department = finance
~~~

Resource Attribute 应由 Server 从 Resource Metadata 中得到。

Environment Attribute 则可能由：

~~~text
Request Time
Network Zone
Device Trust Service
Risk Engine
~~~

实时计算。

因此一次真正的 ABAC Decision 更像：

~~~text
Authentication
      ↓
得到 Subject ID
      ↓
Load Subject Attributes
      ↓
Load Resource Attributes
      ↓
Collect Environment Context
      ↓
Policy Evaluation
      ↓
Allow / Deny
~~~

系统越复杂，就越需要处理：

~~~text
Attribute Source
Attribute Freshness
Missing Attribute
Policy Conflict
Audit Explainability
Test Matrix
~~~

所以 ABAC 的代价不是“多写几个 if”，而是整个 Policy Data Pipeline 都会变复杂。

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


ReBAC 与 RBAC 最容易混淆的地方是：

~~~text
RBAC 问：
“Bob 是什么 Role？”


ReBAC 问：
“Bob 和这个 Resource
之间存在什么 Relationship？”
~~~

例如：

~~~text
Bob
member_of
Team A

Team A
member_of
Organization X

Project P
belongs_to
Organization X

Document D
belongs_to
Project P
~~~

如果 Policy 是：

~~~text
Organization Member
可以读取 Organization 下的 Document
~~~

系统真正要判断的不是：

~~~text
Bob.role == member
~~~

而是是否存在满足 Policy 的关系路径：

~~~text
Bob
  ↓ member_of
Team A
  ↓ member_of
Organization X
  ↓ contains
Project P
  ↓ contains
Document D
~~~

复杂 ReBAC 系统经常把关系保存成：

~~~text
subject
relation
object
~~~

例如：

~~~text
user:bob
member
team:a

team:a
member
org:x

project:p
parent
org:x

document:d
parent
project:p
~~~

授权查询本质上是在判断：

~~~text
从 Subject 到 Resource
是否存在一条符合 Policy 的 Relationship Path
~~~

随着关系变复杂，还要处理：

~~~text
Relationship Inheritance
Cycle
Query Cost
Cache
Consistency
Explainability
~~~

所以 ReBAC 不是简单“多加一张 membership 表”，而是一种以关系图为核心的权限建模方式。

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


一个更具体的组合例子：

~~~text
请求：
Alice 要 export Report 100
~~~

Server 可以连续做四层判断。

第一层，ReBAC：

~~~text
Alice 是否 member_of
Report 100 所属 Project？
      ↓
No → Deny
Yes → Continue
~~~

第二层，RBAC：

~~~text
Alice 在这个 Project 中
是否拥有 Analyst / Admin Role？
      ↓
No → Deny
Yes → Continue
~~~

第三层，ABAC：

~~~text
Alice.clearance
是否 >=
Report.classification？

Current Device
是否 trusted？
      ↓
No → Deny
Yes → Continue
~~~

第四层，ACL：

~~~text
Report 100
是否存在显式 Special Grant / Deny？
      ↓
合并 Policy
      ↓
Final Allow / Deny
~~~

这个例子说明：

> 真正复杂的 Authorization 往往是多个权限事实共同参与，而不是某一个模型独立解决所有问题。

### 【DAC 与 MAC 回答的是“谁掌握授权控制权”，不要和 ACL、RBAC、ABAC、ReBAC 直接并列】

DAC（Discretionary Access Control，自主访问控制）与 MAC（Mandatory Access Control，强制访问控制）最容易让人困惑，是因为它们和前面的 ACL、RBAC、ABAC、ReBAC 并不完全处在同一个分类维度。

可以先把两组问题分开：

~~~text
DAC / MAC
主要回答：
“最终谁有权决定授权？”


ACL / RBAC / ABAC / ReBAC
主要回答：
“系统根据什么权限事实做判断？”
~~~

所以不能简单理解成六种完全并列的权限模型。更准确的是：DAC / MAC 强调授权控制权的归属；ACL / RBAC / ABAC / ReBAC 更偏向应用系统如何表达和计算权限。

#### <u>1. DAC 的核心是 Resource Owner 拥有一定自主授权权</u>

NIST 对 DAC 的定义强调：对象 Owner 或被授权管理该对象访问权限的人，可以决定谁能访问这个对象，以及拥有什么访问权。[15]

直观理解就是：

~~~text
“这是我的资源，
我可以决定分享给谁。”
~~~

例如 Alice 创建：

~~~text
Document 100
Owner = Alice
~~~

Alice 可以决定：

~~~text
Bob
→ read

Carol
→ read + write
~~~

这里真正重要的是：

~~~text
授权决定权
主要掌握在 Resource Owner 手中
~~~

这就是 Discretionary（自主决定）的含义。文件系统、网盘、协作文档等场景中经常能看到这种思想。

#### <u>2. DAC 经常使用 ACL 表达，但 DAC 不等于 ACL</u>

前面已经讲过 ACL：Resource 保存“谁拥有什么 Permission”的直接授权关系。

例如：

~~~text
Document 100 ACL

Alice → owner
Bob   → read
Carol → write
~~~

如果这张 ACL 主要由 Document Owner 自己修改，那么可以理解成：

~~~text
DAC
=
上层控制思想：
Owner 可以决定授权


ACL
=
具体权限表达方式：
Resource 保存授权名单
~~~

因此 DAC 不等于 ACL，但二者经常一起出现。

同一个 ACL 也完全可以由中央管理员维护，此时它并不一定体现典型 DAC 思想。所以判断是不是 DAC，重点不是“有没有 ACL 表”，而是：谁拥有改变访问权限的权力。

#### <u>3. MAC 的核心是中央安全 Policy 强制决定权限</u>

NIST 对 MAC 的描述强调：访问控制决策由中央 Authority / Policy 决定，而不是由单个 Resource Owner 自己决定；普通用户不能随意改变访问权。[16]

可以理解成：

~~~text
“这个资源虽然是你创建的，
但你不能绕过系统安全规则
随便分享给别人。”
~~~

典型 MAC 会出现 Security Label（安全标签）和 Clearance（安全许可等级）。

例如：

~~~text
Alice Clearance
=
Secret

Document Classification
=
Top Secret
~~~

中央 Policy 规定：

~~~text
只有 Subject Clearance
满足 Resource Classification
才能访问
~~~

于是：

~~~text
Alice = Secret

Document = Top Secret

Secret < Top Secret
      ↓
Deny
~~~

即使 Document Owner 说“我愿意把它分享给 Alice”，中央 Policy 仍然可以 Deny，因为 Owner 无权覆盖强制安全策略。

#### <u>4. DAC 与 MAC 真正区别是“谁说了算”</u>

| 问题 | DAC | MAC |
| --- | --- | --- |
| 谁主要控制授权 | Resource Owner / 被授权管理者 | Central Security Policy |
| Owner 能否主动分享 | 通常可以 | 不能绕过中央规则 |
| 权限是否可由普通 Owner 修改 | 可以有一定自主权 | 通常不允许 |
| 常见场景 | 文件分享、协作资源、普通商业系统 | 高安全等级系统、操作系统、政府/军事分级 |
| 典型理解 | “我的文件，我决定给谁” | “系统安全规则最终说了算” |

所以最容易记的一句话：

~~~text
DAC
=
Owner 可以决定一部分权限


MAC
=
中央安全规则强制决定权限
~~~

#### <u>5. MAC 看起来会使用 Attribute，但 MAC 不等于 ABAC</u>

MAC 中经常出现：

~~~text
subject.clearance
resource.classification
~~~

这看起来很像 ABAC，但两者关注点不同。

ABAC 回答：

~~~text
“使用哪些 Attribute
来计算 Allow / Deny？”
~~~

MAC 回答：

~~~text
“这套安全规则是否由中央系统强制执行，
普通 Resource Owner 能不能绕过？”
~~~

所以一个 MAC 系统完全可能使用 Attribute 进行判断，但让它成为 MAC 的关键是 Central Mandatory Policy，而不是“出现了 Attribute”。

#### <u>6. 普通 Web SaaS 更常直接使用 ACL、RBAC、ABAC、ReBAC 描述业务授权</u>

在普通 Web 应用里，我们更常面对：

~~~text
这个 User 是什么 Role？
→ RBAC

这个 User 和 Project 是什么关系？
→ ReBAC

这个 Resource 是否单独分享给某个 User？
→ ACL

Department / Tenant / Device / Time
是否满足条件？
→ ABAC
~~~

这些模型更直接映射到业务代码和数据结构。

但从更高层看，其中仍可能体现 DAC 思想。例如 Document Owner 点击 Share，把 read Permission 给 Bob：具体机制可以是 ACL，而更高层控制思想体现了 DAC。

所以这一组概念最好按两层理解：

~~~text
Access Control
│
├── 授权控制权由谁掌握
│   ├── DAC
│   │   Owner 有一定自主授权能力
│   │
│   └── MAC
│       Central Policy 强制控制
│
└── 权限依据什么事实计算
    ├── ACL
    │   Resource-specific Grant
    ├── RBAC
    │   Role
    ├── ABAC
    │   Attribute
    └── ReBAC
        Relationship
~~~

这样就不会把 DAC / MAC 和 RBAC / ABAC 等模型机械堆在同一层。

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


服务端权限检查通常还要区分“粗粒度入口限制”和“资源级业务限制”。

第一层可以位于：

~~~text
Router
Guard
Middleware
~~~

做：

~~~text
是否已经 Authentication？
是否拥有某个全局 Role / Scope？
~~~

例如：

~~~text
只有 Platform Admin
可以进入 /admin/*
~~~

但很多权限必须在 Service 中判断，因为它依赖真实业务数据。

例如：

~~~text
PATCH /projects/123
~~~

只有 Service 加载 Project 123 以后，才能知道：

~~~text
Owner 是谁？
当前 User 是否 Member？
属于哪个 Tenant？
Project 当前状态是什么？
~~~

因此常见分层：

~~~text
Guard
做粗粒度入口控制
        ↓
Service
加载 Resource
        ↓
做资源级 Authorization
        ↓
Business Mutation
~~~

不能把所有资源权限都强行塞进一个全局 Guard，也不能只在 Controller 前做“用户已登录”就认为权限完成。

### 【复杂权限系统可以把 Policy 管理、Decision 与 Enforcement 分离】

小型系统通常不需要一开始就设计独立 Policy Engine。

例如：

~~~text
if (user.role !== 'admin') {
  deny
}
~~~

虽然只有几行代码，但实际上已经同时完成三件事：

~~~text
Policy Definition
定义：
只有 Admin 可以执行
        ↓
Policy Decision
判断：
当前 User 是不是 Admin
        ↓
Policy Enforcement
如果不是：
真正阻断业务执行
~~~

所以 PAP、PDP、PEP 首先是一种“权限职责拆分思想”，并不代表必须部署三个独立服务。

只有当权限规则逐渐复杂、分散和不一致时，把这三个职责分开才更有价值。

#### <u>1. Policy Definition 先回答“什么条件下应该 Allow”</u>

假设业务规定：

~~~text
Project Owner
或者
Organization Admin

可以删除 Project
~~~

这本身就是一条 Policy：

~~~text
Allow project.delete

IF

subject is project.owner

OR

subject has organization_admin role
~~~

Policy Definition 关注的是：规则是什么。它还没有处理某一个具体 Request。

例如完整系统中可能同时存在：

~~~text
Viewer
→ read

Editor
→ read + update

Admin
→ manage
~~~

以及：

~~~text
tenantId 必须一致

Sensitive Resource
要求 MFA

Untrusted Device
禁止 export
~~~

如果这些规则全部散落在几十个 Controller / Service 的 if 语句里，就很难知道某个 Action 的完整权限规则到底是什么。

#### <u>2. PAP 负责管理 Policy，而不是处理每一次业务请求</u>

PAP（Policy Administration Point，策略管理点）可以理解成：Policy 在哪里被创建、修改、组织和维护。

例如权限后台配置：

~~~text
Role = Editor

Permissions
✓ project.read
✓ project.update
✕ project.delete
~~~

或者代码配置：

~~~text
Editor
→ project.read
→ project.update
~~~

这些都属于 Policy Administration。

PAP 回答的是：

~~~text
“系统当前有哪些规则？”
~~~

而不是：

~~~text
“Alice 现在能不能删除 Project 100？”
~~~

后一个问题属于 PDP。

#### <u>3. PDP 负责根据 Policy 计算这一次 Request 的 Allow / Deny</u>

PDP（Policy Decision Point，策略决策点）负责真正计算 Authorization Decision。

NIST 将 PDP 描述为：根据适用的 Digital Policy 计算访问决策的组件。[17]

假设 Request：

~~~text
Subject
Alice

Resource
Project 100

Action
delete

Context
tenant = A
~~~

PDP 获取这些信息以后执行 Policy：

~~~text
Alice 是 Project Owner？
      ↓
No

Alice 是 Organization Admin？
      ↓
Yes
~~~

于是：

~~~text
Decision = Allow
~~~

可以把 PDP 理解成一个权限计算器：

~~~text
canAccess(
  Subject,
  Resource,
  Action,
  Context
)
      ↓
Allow / Deny
~~~

它负责给出答案，但不负责真正执行 deleteProject。

#### <u>4. PEP 负责把 PDP 的结果真正落实到业务边界</u>

PEP（Policy Enforcement Point，策略执行点）是实际保护 Resource 的位置。

NIST 对 PEP 的定义强调：它负责执行 PDP 给出的访问控制决策。[18]

例如：

~~~text
DELETE /projects/100
        ↓
PEP 发起 Authorization Check
        ↓
PDP
        ↓
Decision = Deny
        ↓
PEP
        ↓
403 Forbidden
        ↓
deleteProject()
不执行
~~~

如果 PDP 返回 Allow：

~~~text
Decision = Allow
        ↓
PEP 放行
        ↓
Business Operation
~~~

所以：

~~~text
PDP
负责“算”


PEP
负责“挡”
~~~

如果只有 PDP 得出 Deny，但业务代码继续执行 deleteProject，那么整个权限系统仍然没有意义。

#### <u>5. 一次真实 Authorization Request 可以把 PAP、PDP、PEP 串起来</u>

先由 PAP 管理：

~~~text
Policy

project.delete
允许：
Project Owner
OR
Organization Admin
~~~

然后 Alice 请求：

~~~text
DELETE /projects/100
~~~

完整链路：

~~~text
Request
  ↓
Authentication / Session Validation
  ↓
Current Subject = Alice
  ↓
Load Project 100
  ↓
PEP
发起权限判断
  ↓
PDP
读取 / 执行 Policy
  ↓
判断：
Alice 是 Owner？
Alice 是 Org Admin？
  ↓
Allow / Deny
  ↓
PEP
真正放行或阻断
  ↓
Business Logic
~~~

可以用三个问题记住：

~~~text
PAP
“规则是什么？”


PDP
“按照这些规则，
这一次能不能？”


PEP
“如果不能，
我真的把请求挡下来。”
~~~

OWASP Authorization Patterns Cheat Sheet 也采用类似职责划分：PAP 管理规则，PDP 评估 Policy，PEP 保护操作并执行 Decision。[19]

#### <u>6. PAP / PDP / PEP 和 RBAC / ABAC / ReBAC 属于两个不同维度</u>

这是最容易混淆的地方。

PAP / PDP / PEP 回答：

~~~text
Authorization System
内部职责怎么拆？
~~~

RBAC / ABAC / ReBAC / ACL 回答：

~~~text
PDP 到底依据什么权限事实计算？
~~~

例如 PDP 可以使用 RBAC：

~~~text
Alice.role = Editor
      ↓
Editor has project.update
      ↓
Allow
~~~

也可以使用 ABAC：

~~~text
subject.department
==
resource.department

AND

deviceTrusted = true
      ↓
Allow
~~~

也可以使用 ReBAC：

~~~text
Alice
member_of
Project 100
      ↓
Allow
~~~

还可以组合 ACL。

所以整体结构更准确地画成：

~~~text
                Authorization Architecture

PAP
管理 Policy
        ↓

PEP
拦截受保护操作
        ↓

PDP
根据权限事实计算 Allow / Deny
│
├── ACL
├── RBAC
├── ABAC
└── ReBAC
        ↓

PEP
执行结果
        ↓
Business Operation
~~~

不要把 PAP、PDP、PEP、RBAC、ABAC、ReBAC 理解成六种并列权限模型。

#### <u>7. 为什么系统小的时候不需要强行拆开</u>

例如只有：

~~~text
Project Owner
才允许 Update
~~~

直接：

~~~text
if (project.ownerId !== user.id) {
  deny
}
~~~

已经非常清楚。

这里 Policy、Decision、Enforcement 虽然写在一起，但复杂度很低。

如果此时为了“架构完整”立刻引入 Policy Database、Independent PDP Service、External Policy Engine、Complex PAP，反而会增加不必要复杂度。

真正值得拆分的信号通常是：

~~~text
权限规则越来越多

同一规则散落在多个 Service

不同接口出现不同版本的权限判断

新增 API 容易漏掉 Authorization

需要统一审计和解释 Decision

需要多个服务共享同一套 Policy
~~~

此时才需要逐步把 Policy Definition、Policy Decision、Policy Enforcement 从大量零散 if 中抽离出来。

#### <u>8. PEP 仍然应该尽量靠近真正被保护的 Resource</u>

即使已经有统一 PDP，也不能认为“有一个中央权限服务，业务 Service 就不用关心 Enforcement”。

PEP 最终仍然要确保 Business Operation 不会绕过 Decision。

例如：

~~~text
Guard
可以做：
是否登录
是否有全局 Admin Role

        ↓

Project Service
仍然需要在修改 Project 100 前
确保 Resource-level Authorization 已经完成
~~~

OWASP 建议 Authorization Enforcement 尽量靠近被保护的 Resource，并对每个受保护请求执行权限验证。

因此这一节最终可以收束成：

~~~text
PAP
管理规则
      ↓
PDP
计算结果
      ↓
PEP
执行结果
~~~

它们解决的是“权限系统内部职责如何组织”；至于 PDP 使用 Role、Attribute、Relationship 还是 ACL，则属于另一层权限模型选择。
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

3. RFC 6749 — OAuth 2.0 Authorization Framework  
   https://www.rfc-editor.org/rfc/rfc6749.html

4. OpenID Connect Core 1.0 incorporating errata set 2  
   https://openid.net/specs/openid-connect-core-1_0.html

5. RFC 9700 — Best Current Practice for OAuth 2.0 Security  
   https://www.rfc-editor.org/rfc/rfc9700.html

6. RFC 10017 — OAuth 2.0 for Browser-Based Applications  
   https://www.rfc-editor.org/rfc/rfc10017.html

### 【会话控制】

7. OWASP Session Management Cheat Sheet  
   https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

8. RFC 6750 — Bearer Token Usage  
   https://www.rfc-editor.org/rfc/rfc6750.html

9. MDN Set-Cookie  
   https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie

10. OWASP CSRF Prevention Cheat Sheet  
    https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

11. RFC 9110 — Safe Methods  
    https://www.rfc-editor.org/rfc/rfc9110.html#name-safe-methods

12. MDN Same-Origin Policy  
    https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy

### 【访问控制】

13. OWASP Authorization Cheat Sheet  
    https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

14. NIST — Role-Based Access Control: Features and Motivations  
    https://www.nist.gov/publications/role-based-access-control-rbac-features-and-motivations

15. NIST SP 800-162 — Guide to Attribute Based Access Control  
    https://www.nist.gov/publications/guide-attribute-based-access-control-abac-definition-and-considerations

16. NIST — Discretionary Access Control (DAC)  
    https://csrc.nist.gov/glossary/term/discretionary_access_control

17. NIST — Mandatory Access Control (MAC)  
    https://csrc.nist.gov/glossary/term/mandatory_access_control

18. NIST — Policy Decision Point (PDP)  
    https://csrc.nist.gov/glossary/term/PDP

19. NIST — Policy Enforcement Point (PEP)  
    https://csrc.nist.gov/glossary/term/policy_enforcement_point

20. OWASP Authorization Patterns Cheat Sheet  
    https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Patterns_Cheat_Sheet.html

### 【相关知识文档】

- [Cookie 安全性概述笔记](./C-Cookie安全性概述笔记.md)
- [Access Token 与 Refresh Token 核心知识点笔记](./A-Access%20Token与Refresh%20Token核心知识点笔记.md)
- [浏览器存储方式](./L-浏览器存储方式.md)
- [浏览器网络面试题](./L-浏览器网络面试题.md)
- [反向代理与 Web 入口体系](./F-反向代理与Web入口体系.md)
- [NestJS 快速上手](./N-NestJS快速上手.md)

### 【实战分析入口】

- [Browser Monitor：账号认证、Session 与 CSRF 源码实战分析](https://github.com/cxDlogver/browser-monitor/blob/main/docs/%E8%B4%A6%E5%8F%B7%E8%AE%A4%E8%AF%81Session%E4%B8%8ECSRF%E6%BA%90%E7%A0%81%E5%AE%9E%E6%88%98%E5%88%86%E6%9E%90.md)
