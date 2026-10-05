# Cookie、Session、Token 与 JWT 的登录态和会话控制

## 【知识概述】

**登录态需要让后续请求携带可验证凭证；Cookie 是浏览器请求状态机制，Session 是会话模型，Token 是凭证，JWT 是一种格式。**

会话控制首先是为了解决 HTTP 无状态的问题。用户第一次通过账号密码等方式完成认证以后，HTTP 协议不会自动帮应用记住后续请求还是这个用户发来的，所以应用需要建立一套机制，让客户端在后续请求中能够持续提供身份凭证，服务端再根据凭证恢复用户身份，并进一步完成权限判断。这里认证 Authentication 解决的是“你是谁”，授权 Authorization 解决的是“你能做什么”。

在 Web 中首先会遇到 Cookie。Cookie 本身不能简单理解成一种和 Session、Token 并列的认证方案，它更准确是一种浏览器保存并按照规则自动参与 HTTP 请求的状态机制。服务器可以通过 `Set-Cookie` 让浏览器保存 Cookie，之后只要请求满足 Domain、Path、Secure、SameSite 等条件，浏览器就可以自动携带对应 Cookie。因此 Cookie 特别适合承担 `sessionId` 或某些认证凭证的传输。

理解这组机制，可以沿以下主线展开：

先沿登录认证、凭证签发、保存、携带及验证恢复身份。

分别解释服务端 Session 查询和 Token 验证。

再说明 Access、Refresh、退出及资源授权如何形成会话生命周期。

JWT 验签不等于完整校验，更不等于授权；Cookie 的 HttpOnly、Secure、SameSite 各有边界，前端隐藏按钮也不能替代服务端权限。相关完整知识可结合 [Web身份认证会话控制与访问控制体系](<../W-Web身份认证会话控制与访问控制体系.md>) 阅读。

## 1. 机制说明与工程判断

### 【先从“为什么需要会话控制”开始理解】

会话控制解决的根本问题不是“Token 放在哪里”，而是：

> **HTTP 请求彼此独立，应用如何把多次请求关联到同一个已经认证的用户。**

例如用户先登录：

```text
POST /login
```

后面又连续访问：

```text
GET /users/me、GET /orders、POST /comments
```

HTTP 协议本身不会因为第一个请求已经登录，就自动替应用记住后面三个请求是谁发出的。

所以系统需要建立一条状态链：

```text
用户第一次证明身份
        ↓
服务端完成认证
        ↓
建立或签发登录凭证
        ↓
客户端后续请求携带凭证
        ↓
服务端恢复或验证用户身份
        ↓
根据用户身份判断权限
```

这就是会话控制。

这里还必须区分：

```text
Authentication
认证：你是谁？

Authorization
授权：你能做什么？
```

例如用户名和密码验证成功，是认证；已经确定用户是 `userId=1001` 后，再判断他能不能删除订单，是授权。
### 【Cookie、Session、Token 不是严格意义上的“三种并列方案”】

这一点需要先修正概念。

更准确的关系是：

```text
Cookie
→ 浏览器保存并按规则自动发送数据的一种 HTTP 状态机制

Session
→ 服务端保存会话状态的一种方案

Token
→ 客户端向服务端证明身份/授权的一类凭证

JWT
→ Token 的一种具体、自包含格式
```

所以真实系统经常是组合关系，而不是：

```text
Cookie vs Session vs Token
```

例如经典方案就是：

```text
Cookie + Session
```

现代浏览器应用也可能是：

```text
Cookie + Refresh Token
+
Authorization Header + Access Token
```

或者 BFF 架构下甚至：

```text
浏览器只持有 HttpOnly Session Cookie
        ↓
BFF 在服务器侧持有 Access / Refresh Token
```

因此这一题虽然按照 **Cookie → Session → Token** 的顺序讲，但要始终知道它们解决的是不同层面的问题。
### 【Cookie 为什么天然适合参与会话控制】

Cookie 最重要的特点之一是：

> **浏览器可以根据 Cookie 的匹配规则自动在 HTTP 请求中携带它。**

服务器可以：

```http
Set-Cookie: sessionId=abc123
```

浏览器保存以后，后续满足条件的请求可以自动产生：

```http
Cookie: sessionId=abc123
```

因此 Cookie 特别适合承载：

```text
sessionId、会话标识、某些认证相关的长期凭证
```

而不需要每个页面都自己手动拼接。

Cookie 之所以在 Web 登录体系中长期存在，核心原因就是它本身就是 HTTP 状态管理机制。
### 【前端创建 Cookie 和服务端下发 Cookie 的目的不同】

前端可以：

```javascript
document.cookie = 'theme=dark'
```

这种 Cookie 可以用于：

```text
主题、语言、某些非敏感偏好
```

但 JavaScript 自己设置的 Cookie 无法设置 `HttpOnly`。

而登录态通常更希望：

```text
JavaScript 不要直接读取凭证
```

因此认证 Cookie 更常见的做法是由服务端通过：

```http
Set-Cookie
```

下发，例如：

```http
Set-Cookie: __Host-session=abc123;
            Path=/;
            Secure;
            HttpOnly;
            SameSite=Lax
```

这样浏览器负责保存和发送，但 JavaScript 无法直接拿到其中的认证值。
### 【Session Cookie 和 Persistent Cookie 的区别是“有没有显式持久过期时间”】

这里不能理解成：

```text
Session Cookie = 一定存在内存
Persistent Cookie = 一定存在磁盘
```

这种说法属于实现层面的过度简化。

更准确的语义是：
#### <u>1. Session Cookie</u>

没有显式设置：

```text
Expires
Max-Age
```

按 Cookie 语义属于会话级 Cookie。
#### <u>2. Persistent Cookie</u>

设置了：

```http
Max-Age=2592000
```

或者：

```http
Expires=...
```

浏览器会按照过期时间维护它。

所以决定两者身份的是：

> **Cookie 是否具有显式持久化生命周期，而不是浏览器内部究竟把字节放在内存还是磁盘。**

而且现代浏览器存在 Session Restore，关闭浏览器并不意味着所有 Session Cookie 在所有实际情况下都必然立即消失，因此面试中不要把“关闭浏览器一定删除”说得过于绝对。
### 【Cookie 的核心属性要按照“解决什么问题”理解】

#### <u>1. Domain：控制主机范围</u>

`Domain` 主要决定：

> **这个 Cookie 可以发送给哪些 Host。**

如果不设置 `Domain`，通常形成更严格的 Host-only Cookie，只发送给设置它的 Host。
#### <u>2. Path：控制 URL 路径范围</u>

例如：

```http
Path=/api
```

那么 `/api/user`、`/api/orders` 可以匹配，而 `/news` 不匹配。

因此：

```text
Domain
→ 哪个主机

Path
→ 主机下的哪个路径
```

需要注意，`Path` 是发送范围控制，不是真正的安全隔离机制。
#### <u>3. HttpOnly：限制 JavaScript 直接读取</u>

设置 `HttpOnly` 后，页面 JavaScript 无法通过 `document.cookie` 读取该 Cookie。

它主要降低的是：

> **发生 XSS 后，认证 Cookie 被恶意 JavaScript 直接读取并上传给攻击者的风险。**

但必须注意：

```text
HttpOnly
≠
防止 XSS 本身
```

脚本仍可能利用当前用户身份在页面中发起请求。
#### <u>4. Secure：限制通过安全连接发送</u>

`Secure` 表示 Cookie 只应通过 HTTPS 等安全连接发送。

它解决的是：

```text
避免认证 Cookie 通过普通明文 HTTP 链路发送
```

而不是：

```text
Secure
→ Cookie 自身被加密
```
#### <u>5. SameSite：控制跨站上下文是否允许携带</u>

常见：

```text
SameSite=Strict
SameSite=Lax
SameSite=None
```

其中 `None` 需要同时配合 `Secure`。

这里必须和 Domain/Path 区分：

```text
Domain / Path
→ 当前目标 URL 是否匹配这个 Cookie

SameSite
→ 当前请求处于什么 Site Context，跨站情况下是否允许携带 Cookie
```

所以不能说：

> SameSite 决定 Cookie 发到哪个域名或路径。

那是 Domain/Path 的职责。

SameSite 的核心是：

> **限制跨站上下文中 Cookie 的自动发送，从而降低部分 CSRF 风险。**
### 【为什么 HttpOnly 和 SameSite 会分别联系到 XSS 和 CSRF】

这两个攻击必须分开。
#### <u>1. XSS：恶意脚本获得可信站点的执行能力</u>

XSS 的本质是：

> **攻击者控制的内容进入页面，并最终以 JavaScript 等可执行内容的形式在目标网站的 Origin 中运行。**

例如 Stored XSS：

```text
攻击者提交恶意内容
        ↓
服务端把内容保存
        ↓
正常用户打开页面
        ↓
页面把恶意内容作为可执行代码输出
        ↓
用户浏览器执行攻击代码
```

因为脚本已经运行在目标 Origin 中，所以它可能：

```text
读取页面数据
操作 DOM
发起用户权限范围内的请求
读取 localStorage
读取非 HttpOnly Cookie
```

这就是为什么把认证凭证放进 `localStorage` 会扩大 XSS 后凭证被直接窃取的风险。

`HttpOnly` 能保护 Cookie 的可读性，但解决 XSS 的根本方式仍然是正确输出编码、HTML Sanitization、避免危险 DOM Sink，并配合 CSP 等防御。
#### <u>2. CSRF：利用浏览器自动携带凭证</u>

CSRF 的核心不是攻击者读取到了 Cookie。

恰恰相反：

> **攻击者可以不知道 Cookie 的具体值，只利用浏览器会自动带上它。**

例如：

```text
用户已经登录 bank.example
        ↓
浏览器存在登录 Cookie
        ↓
用户访问 attacker.example
        ↓
攻击者诱导浏览器向 bank.example
发送一个修改状态的请求
        ↓
如果 Cookie 满足发送条件
浏览器自动附带登录 Cookie
```

服务器如果只判断：

```text
有 Cookie
→ 就认为一定是用户主动发出的请求
```

就可能被利用。

因此：

```text
SameSite
CSRF Token
Origin / Referer 校验
```

等机制用于防御 CSRF。

`SameSite` 应该理解为重要的一层防御，而不是所有 Cookie 认证场景中唯一的 CSRF 防御。
### 【Session 是典型的“服务端有状态会话”】

经典 Session 模型：

```text
浏览器
sessionId = A7F92...
       ↓
服务器
       ↓
Session Store
A7F92...
   ↓
{
  userId: 1001,
  role: admin,
  ...
}
```

浏览器保存的通常只是 `sessionId`，真正的用户 ID、权限、会话状态、登录时间等保存在服务端。

所以登录过程是：

```text
账号密码
   ↓
服务端认证成功
   ↓
创建 Session
   ↓
生成 sessionId
   ↓
通过 Set-Cookie 给浏览器
   ↓
浏览器后续自动携带 sessionId
   ↓
服务端查 Session Store
   ↓
恢复用户身份
```

Session ID 本身应该只是随机、不可预测、没有业务含义的标识，真正业务状态保存在服务端。
### 【Session 为什么在分布式系统中需要共享状态】

单机时：

```text
Server A
└── Session Memory
```

问题不大。

但是：

```text
                 ┌→ Server A
Browser → Nginx/LB
                 └→ Server B
```

用户第一次请求可能落在 A，A 创建 Session；第二次请求落在 B，B 可能找不到这条 Session。

所以常见解决方式是：

```text
Server A ─┐
          ├→ Redis / Session DB
Server B ─┘
```

所有服务器访问同一个 Session Store。

因此 Session 的核心代价之一就是：

> **服务端必须维护每个活动会话的状态，并解决状态共享问题。**

但它也获得一个重要优势：

```text
删除 Session
→ 用户几乎可以立即下线
```

会话控制能力非常直接。
### 【Token 是凭证模型，而不是 JWT 的同义词】

Token 可以泛指：

> **客户端携带、服务端据此判断身份或授权的一类凭证。**

它既可以是 Opaque Token，例如一段随机字符串：

```text
8af84ac93...
```

服务器拿它去 Token Store 查询：

```text
8af84ac93
↓
userId=1001
```

这种 Token 仍然是有状态的。

也可以是 Self-contained Token，例如 JWT。

所以：

```text
Token
├── Opaque Token
│   └── 通常需要服务端查询状态
│
└── Self-contained Token
    └── JWT 是典型形式
```

这也是为什么：

> **用了 Token，并不意味着系统天然无状态。**
### 【JWT 为什么能够减少每次请求的 Session 查询】

最常见的签名 JWT 可以概念化为：

```text
Header.Payload.Signature
```

Header 描述 Token 类型、签名算法等信息；Payload 存放 Claims，例如 `sub`、`iss`、`aud`、`exp`、`iat`、role、scope；Signature 用于验证 Header + Payload 是否由可信一方签发，以及内容有没有被修改。

必须强调：

```text
Signature
→ 保证完整性 / 真实性

不等于
→ Payload 被加密
```

Payload 通常只是编码后可读取的数据，不能把密码、密钥等秘密直接放进去。
### 【JWT 验证不是“签名成功就通过”】

服务端收到 JWT 后，至少要按照具体认证协议和业务要求检查：

```text
Token 格式是否合法
        ↓
算法是否是预期算法
        ↓
签名是否正确
        ↓
iss 是否可信
        ↓
aud 是否是当前服务
        ↓
exp 是否已经过期
        ↓
nbf 是否已经生效
        ↓
scope / role 是否允许访问当前资源
```

所以：

```text
签名正确
≠
这个 Token 当前一定可用
```

例如 Signature 正确但 `exp` 已过期，仍然必须拒绝。
### 【为什么 Token 体系通常拆成 Access Token 和 Refresh Token】

如果只有一个 Token，会面临直接矛盾。

如果 Token 生命周期很长，例如 90 天：用户体验好，但一旦泄露，攻击窗口也很长。

如果 Token 生命周期很短，例如 5～15 分钟：泄露后的风险窗口小，但用户不能每几分钟重新登录。

所以拆成：

```text
Access Token + Refresh Token
```

Access Token 生命周期短，用于频繁访问业务 API；Refresh Token 生命周期更长，不参与普通业务请求，只用于获取新的 Access Token，并需要更严格保护。

这就是长短 Token 设计最核心的“为什么”。
### 【为什么 Access Token 通常放 Authorization Header】

OAuth Bearer Token 的资源访问常见标准形式是：

```http
Authorization: Bearer <access_token>
```

这样做有一个重要工程意义：

> **客户端明确决定哪些 API 请求携带 Access Token。**

和 Cookie 不同：

```text
Cookie
→ 浏览器根据 Cookie 规则自动携带

Authorization Header
→ 客户端明确给目标请求附加凭证
```

因此 Access Token 可以只给业务 API 请求发送，不必跟随图片、CSS 等所有请求自动携带。

对纯浏览器 SPA，如果 JavaScript 需要自己构造 Authorization Header，一种常见安全思路是把短期 Access Token 只放在内存，而不是长期持久化到 `localStorage`，因为 XSS 一旦执行便可能直接读取 Web Storage。
### 【Refresh Token 为什么通常需要更严格的保存方式】

因为：

```text
Access Token 泄露
→ 通常只能用到它过期

Refresh Token 泄露
→ 可能持续换取新的 Access Token
```

所以浏览器架构中常见一种实现：

```text
Access Token
→ JavaScript 内存
→ Authorization Header

Refresh Token
→ Secure + HttpOnly Cookie
→ JavaScript 不能直接读取
```

这是一种常见安全设计，但不是 OAuth 协议强制所有 Refresh Token 都必须放 Cookie。

例如 BFF 模式甚至可以让浏览器完全不接触 OAuth Token：

```text
Browser
↓ HttpOnly Session Cookie
BFF
↓ Access Token
API
```
### 【为什么需要 Refresh Token Rotation】

如果一个 Refresh Token 可以无限次使用：

```text
RT-1
→ Access Token
RT-1
→ Access Token
RT-1
→ Access Token
```

那么它一旦被窃取，攻击者也可以长期刷新。

Refresh Token Rotation 的思想是：

```text
RT-1
↓ 使用
AT-2 + RT-2

RT-1
↓ 立即失效
```

下一次只能使用 RT-2。

因此 Rotation 本质是在解决：

> **Refresh Token 被复制以后如何检测重放。**
### 【为什么发现旧 Refresh Token 被再次使用时要撤销当前 Token 链】

假设合法客户端和攻击者都拿到了 RT-1。

合法客户端先使用：

```text
RT-1
↓
RT-2

RT-1 已失效
```

后来攻击者再次提交 RT-1。

服务端发现：

```text
一个已经使用过并失效的 Refresh Token
又出现了
```

这意味着 Token 很可能被复制。

但此时服务器无法可靠判断：

```text
现在拿 RT-2 的到底是合法用户？
还是攻击者？
```

因此安全策略通常需要撤销当前活动 Refresh Token 或整个 Token Family / Grant，使双方都必须重新认证。
### 【Refresh Token Rotation 为什么会引入服务端状态】

因为服务器必须知道：

```text
RT-1
→ 已经使用过

RT-2
→ 当前有效

RT-1 / RT-2
→ 属于同一个授权关系
```

否则看到 RT-1 第二次出现时，服务器无法知道它以前已经使用过。

因此 Rotation 至少需要保存足够的：

```text
Refresh Token 状态
Token Family / Grant 关系
撤销状态
```

这也是为什么现代系统经常不是“完全有状态”和“完全无状态”二选一，而是：

```text
Access Token
→ 尽量短期、自包含
→ 普通 API 请求不查 Session

Refresh Token / Login Session
→ 服务端保留必要状态
→ 管理刷新、撤销、设备下线、安全事件
```

也就是：

> **请求路径尽量无状态 + 会话生命周期有状态控制。**
### 【Access Token 过期时为什么要做客户端并发控制】

假设页面同时请求：

```text
GET /user、GET /orders、GET /messages
```

三个请求的 Access Token 同时过期，全部返回 `401`。

错误做法是：

```text
/user     → Refresh
/orders   → Refresh
/messages → Refresh
```

这样会同时出现三个 Refresh 请求。

如果正在使用 Refresh Token Rotation，更危险：第一次刷新可能已经让旧 Refresh Token 失效，后面的刷新继续使用旧 Token，就可能被服务端识别成旧 Token 重放。

所以前端需要把刷新过程串行化。
### 【前端通常通过“全局刷新状态 + 等待队列”解决并发刷新】

核心状态可以是：

```javascript
let isRefreshing = false
```

第一个发现 Access Token 失效的请求：

```text
401
↓
发现 isRefreshing = false
↓
设置 true
↓
发 Refresh 请求
```

另外两个请求看到：

```text
isRefreshing = true
```

就不再 Refresh，而是把自己的重试逻辑加入等待队列，或者统一等待同一个 Refresh Promise。

刷新成功后：

```text
更新 Access Token
↓
释放等待队列
```

但是这里必须明确：

> **不是三个请求共享 Refresh 请求的业务响应。**

真正发生的是：

```text
原来的 /user 请求
→ 带新 Access Token 再发送一次
→ 得到 /user 自己的响应

原来的 /orders 请求
→ 带新 Access Token 再发送一次
→ 得到 /orders 自己的响应

原来的 /messages 请求
→ 带新 Access Token 再发送一次
→ 得到 /messages 自己的响应
```

所以共享的只有：

```text
“等待这一次 Refresh 完成”
```

不是：

```text
“共享同一个 HTTP 业务响应”
```

这正是客户端 Token 刷新的典型并发控制问题。
### 【Refresh 失败时为什么不能继续重试原请求】

如果 Refresh Token 已经过期、被撤销或被检测为重放，说明当前客户端已经没有合法续期能力。

此时应该：

```text
Refresh 失败
↓
结束 refreshing 状态
↓
拒绝等待队列
↓
清理客户端认证状态
↓
跳转重新登录
```

不能继续无限 Refresh，否则很容易形成：

```text
401
→ Refresh
→ 401
→ Refresh
→ 无限循环
```
### 【为什么 JWT 的退出登录比 Session 更复杂】

Session 的状态就在服务端：

```text
sessionId
↓
Session Store
```

因此退出时删除 Session，就能够让会话立即失效。

而一个完全自包含的 JWT，如果服务器普通请求只检查签名、`exp`、`aud` 等 Claims，那么用户点击退出以后，即使本地把 JWT 删除，攻击者如果此前复制了一份 Token，它在 `exp` 到达之前仍可能通过服务端验证。

所以 JWT 的无状态优势同时意味着：

> **服务端缺少天然的“删除这一条会话记录即可立即失效”的控制点。**
### 【JWT 如果需要主动撤销，就需要重新引入状态或缩短风险窗口】

常见方案包括：

```text
短生命周期 Access Token
Refresh Token Revocation
Token Blacklist / Revocation List
jti 撤销列表
Token Version / Session Version
设备级 Session
```

例如用户修改密码后，可以增加用户的 `tokenVersion`，服务端发现 JWT 中版本低于当前版本时就拒绝。

但这也说明：

> **真正需要强会话控制的 JWT 系统，往往最终还是会引入一定服务端状态。**

所以“JWT 完全无状态”不能绝对化。
### 【为什么实际系统经常采用“短 Access Token + 有状态 Refresh Session”】

一个常见折中架构是：

```text
Access Token
短生命周期
      ↓
普通请求只做 Token 验证
      ↓
不必每次查询 Session Store
```

同时：

```text
Refresh Token
长期
      ↓
服务器维护 Refresh 状态
      ↓
支持：
轮换
撤销
主动下线
密码修改失效
风险检测
```

因此系统既获得普通 API 请求路径相对简单，又保留关键会话生命周期的服务端控制能力。

所以更成熟的回答不是：

> “现在主流一定是完全无状态 JWT。”

而是：

> **实际系统通常会根据安全要求保留必要状态；比较常见的设计是短期 Access Token 承担高频资源访问，Refresh Token 或登录 Session 由服务端进行可控管理。完全无状态并不是认证系统本身的目标，安全、撤销能力、扩展性和性能之间的平衡才是目标。**

## 2. 完整回答与表达组织

会话控制首先是为了解决 HTTP 无状态的问题。用户第一次通过账号密码等方式完成认证以后，HTTP 协议不会自动帮应用记住后续请求还是这个用户发来的，所以应用需要建立一套机制，让客户端在后续请求中能够持续提供身份凭证，服务端再根据凭证恢复用户身份，并进一步完成权限判断。这里认证 Authentication 解决的是“你是谁”，授权 Authorization 解决的是“你能做什么”。

在 Web 中首先会遇到 Cookie。Cookie 本身不能简单理解成一种和 Session、Token 并列的认证方案，它更准确是一种浏览器保存并按照规则自动参与 HTTP 请求的状态机制。服务器可以通过 `Set-Cookie` 让浏览器保存 Cookie，之后只要请求满足 Domain、Path、Secure、SameSite 等条件，浏览器就可以自动携带对应 Cookie。因此 Cookie 特别适合承担 `sessionId` 或某些认证凭证的传输。

Cookie 可以由前端通过 `document.cookie` 设置，也可以由服务端通过 `Set-Cookie` 下发。前端设置更适合主题、偏好等非敏感数据；认证相关 Cookie 一般更希望由服务端下发，因为服务端可以设置 `HttpOnly`，这样 JavaScript 就不能直接读取 Cookie。Cookie 又可以区分会话型和持久型：关键看是否设置了 `Expires` 或 `Max-Age` 等显式生命周期，而不是简单理解成一个“存在内存”、一个“存在磁盘”。浏览器究竟怎样物理保存是实现细节，而且现代浏览器还存在 Session Restore。

Cookie 的几个属性最好按照它们解决的问题理解。`Domain` 决定 Cookie 可以发送给哪些主机范围，`Path` 决定哪些 URL 路径匹配；它们解决的是“请求目标是否匹配”。`SameSite` 则解决另一个维度，它判断请求是否处于跨站上下文，以及这种情况下 Cookie 是否允许发送，所以 Domain/Path 和 SameSite 不能混在一起。`HttpOnly` 禁止 JavaScript 直接读取 Cookie，`Secure` 限制 Cookie 只通过安全连接发送，而 `SameSite` 可以降低部分 CSRF 风险。

这里就会涉及 XSS 和 CSRF。XSS 的核心是攻击者控制的脚本最终在目标站点的 Origin 中执行。例如 Stored XSS 中，攻击内容被服务器保存，其他用户访问页面时恶意内容又被输出并执行。此时脚本可能读取页面数据、`localStorage` 或非 HttpOnly Cookie，也可以利用用户权限发请求。因此 `HttpOnly` 能降低认证 Cookie 被脚本直接窃取的风险，但并不能消灭 XSS；真正防 XSS 仍然依赖正确输出编码、HTML Sanitization、安全 DOM API 和 CSP 等措施。

CSRF 则不同，它往往不需要知道 Cookie 的具体内容，而是利用浏览器会自动携带 Cookie 的特点。用户已经登录目标网站以后，如果访问攻击者页面，攻击者可能诱导浏览器向目标站点发送修改状态的请求，而浏览器又自动附带了用户的登录 Cookie。`SameSite` 就是限制这种跨站上下文 Cookie 发送的重要机制之一，实际系统还会结合 CSRF Token、Origin/Referer 校验等手段。

在 Cookie 之上，经典的会话方案是 Cookie + Session。用户登录成功以后，服务端创建 Session，把真正的用户 ID、权限、会话状态等信息保存在服务端，然后生成一个随机的 `sessionId`，通过 Cookie 发给浏览器。以后浏览器自动携带 `sessionId`，服务端根据它到 Session Store 中查找用户状态。这是一种有状态认证，因为服务器必须维护 `sessionId → Session Data` 的关系。

Session 的优点是控制能力强。例如用户退出登录时，服务端直接删除 Session，就可以立即让登录失效；缺点是分布式系统需要共享会话状态。如果有多台应用服务器，Session 只放单机内存就可能导致请求落到另一台机器时找不到登录信息，因此生产环境常把 Session 放在 Redis、数据库或专门的 Session Store 中。

另一类方案是 Token。Token 是客户端证明身份或授权的一类凭证，但 Token 不等于 JWT。Token 可以只是随机字符串，服务端收到后再去数据库查询，这种 Opaque Token 本身仍然是有状态的；也可以使用自包含 Token，例如 JWT。JWT 常见形式是 `header.payload.signature`，Header 描述算法等信息，Payload 保存 `sub`、`iss`、`aud`、`exp` 等 Claims，Signature 用于验证 Token 的真实性和完整性。需要注意，普通签名 JWT 的 Payload 并没有被加密，所以不能把密码、密钥等秘密直接放进去。

服务端验证 JWT 时也不能只检查签名。完整验证通常还包括算法是不是预期算法、`iss` 是否可信、`aud` 是否对应当前服务、`exp` 是否过期、`nbf` 是否已经生效以及 scope、role 等权限条件。也就是说签名正确只代表 Token 没有被非法修改并且能够由相应密钥验证，不等于它当前一定可以访问这个 API。

Token 体系中又经常把凭证拆成 Access Token 和 Refresh Token，这是为了解决安全与用户体验之间的矛盾。如果 Access Token 设置得很长，一旦泄露攻击窗口就很长；如果设置得很短，用户又不能每几分钟重新登录。所以 Access Token 通常生命周期较短，用于频繁访问 API；Refresh Token 生命周期更长，只在 Access Token 失效时用于换取新的 Access Token。

Access Token 在 OAuth Bearer Token 模式下通常通过 `Authorization: Bearer <token>` 发送，这让客户端可以明确控制哪些资源请求携带它。对纯浏览器 SPA，如果前端自己持有 Access Token，一个常见安全思路是只把短期 Access Token 放在内存中，而不是长期放到 `localStorage`。Refresh Token 因为长期续期能力更强，需要更严格保护；浏览器架构中常见的一种设计是使用 `Secure + HttpOnly` Cookie 保存 Refresh Token，使 JavaScript 无法直接读取，但这是一种架构实践，并不是 OAuth 协议强制规定所有 Refresh Token 必须放 Cookie。BFF 架构甚至可以让浏览器完全不接触 Access Token 和 Refresh Token。

为了进一步控制 Refresh Token 泄露风险，现代 OAuth 安全实践会使用 Refresh Token Rotation。每次 RT-1 换取新的 Access Token 时，同时返回新的 RT-2，并立即让 RT-1 失效。如果以后服务器再次收到 RT-1，就说明旧 Refresh Token 很可能被复制并发生了重放。在 Rotation 模式下服务器需要保留旧 Token 与当前 Token 的关系，才能检测重放。

如果服务器发现一个已经失效的旧 Refresh Token 被再次使用，它其实无法判断到底攻击者还是合法客户端先使用了旧 Token，因此需要撤销当前活动 Refresh Token，甚至整个 Token Family 或 Grant，使整个授权关系重新认证。也正因为如此，Refresh Token Rotation 本身需要一定的服务端状态。服务器不一定保存 Refresh Token 明文，但至少要保存足够的 Token family、有效性和撤销关系。

这也说明现代认证系统没有必要为了“无状态”而追求完全无状态。一个很常见的折中是：Access Token 生命周期较短，普通 API 请求主要验证 Token，不需要每次查询中心 Session；而 Refresh Token、设备会话、撤销关系由服务器保留必要状态，用于轮换、退出登录、强制下线、密码修改和安全事件。这实际上是“高频资源访问尽量无状态，关键会话生命周期有状态控制”。

前端还有一个很重要的工程问题是并发刷新。如果三个接口同时因为 Access Token 过期返回 `401`，不能让三个请求各自发一次 Refresh，特别是在 Refresh Token Rotation 下，第一次刷新可能已经让旧 Refresh Token 失效，后面的刷新就可能被识别为旧 Token 重放。

所以客户端通常维护一个全局 `isRefreshing` 状态和等待队列。第一个发现 Token 失效的请求负责发起 Refresh，并把 `isRefreshing` 设置为 `true`；其他请求发现正在刷新，就不再发送 Refresh，而是等待这一次刷新完成。Refresh 成功以后更新 Access Token，然后之前失败的每一个 HTTP 请求都带着新的 Access Token**分别重新发送一次**。它们共享的是“等待 Refresh 完成”这个 Promise 或状态，不是共享同一个业务响应。`/user` 重试后仍然拿 `/user` 的响应，`/orders` 重试后仍然拿 `/orders` 的响应，`/messages` 也是一样。如果 Refresh 本身失败，则应该拒绝等待队列、清理登录状态并要求重新认证，而不是继续无限刷新。

最后，JWT 相比 Session 的另一个代价是退出和主动撤销更复杂。Session 在服务端有明确记录，删除 Session 就能够立即失效；而完全自包含的 JWT 如果已经被攻击者复制，即使用户本地退出并删除 Token，只要 JWT 还没到 `exp`，服务端又没有额外的撤销状态，它仍可能继续有效。因此工程上通常通过短生命周期 Access Token、撤销 Refresh Token、Token Version、黑名单或设备 Session 等机制获得主动控制。

所以这套知识最后可以收敛成：

```text
会话控制
│
├─ Cookie
│   └─ 浏览器保存和自动发送状态的机制
│
├─ Cookie + Session
│   └─ 服务端有状态会话
│
└─ Token
    ├─ Opaque Token
    │   └─ 可以有状态
    │
    └─ JWT
        └─ 可以自包含
            ↓
      Access Token：短期资源访问
            +
      Refresh Token：长期续期与会话控制
            ↓
      Rotation / Revocation / 并发刷新控制
```

真正需要理解的不是“Cookie、Session、JWT 哪一个最好”，而是每一层为什么存在：**Cookie 解决浏览器怎样保存和发送状态，Session 解决服务端怎样维护会话，Token 解决客户端怎样携带凭证，JWT 解决凭证怎样自包含表达，Access/Refresh Token 解决安全与体验的矛盾，而 Refresh Rotation、撤销状态和前端刷新队列则解决真实工程中的泄露、下线和并发问题。**

## 3. 参考文献

[1] [Set-Cookie header - MDN](<https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie>)[EB/OL].

[2] [Secure cookie configuration - MDN](<https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies>)[EB/OL].

[3] [Session Management Cheat Sheet - OWASP](<https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>)[EB/OL].

[4] [Cross Site Scripting Prevention Cheat Sheet - OWASP](<https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html>)[EB/OL].

[5] [Cross-Site Request Forgery Prevention Cheat Sheet - OWASP](<https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html>)[EB/OL].

[6] [RFC 6750: OAuth 2.0 Bearer Token Usage](<https://www.rfc-editor.org/info/rfc6750>)[EB/OL].

[7] [RFC 7519: JSON Web Token](<https://www.rfc-editor.org/info/rfc7519>)[EB/OL].

[8] [RFC 9700: Best Current Practice for OAuth 2.0 Security](<https://www.rfc-editor.org/info/rfc9700>)[EB/OL].
