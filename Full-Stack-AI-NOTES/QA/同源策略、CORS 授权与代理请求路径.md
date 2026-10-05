# 同源策略、CORS 授权与代理请求路径

## 【知识概述】

**同源策略隔离浏览器脚本的数据访问，CORS 让服务器声明受控跨源读取，代理则改变浏览器实际访问的入口和转发路径。**

同源策略是浏览器的一项核心安全机制。对于普通 HTTP 和 HTTPS URL，Origin 主要由协议、主机和端口组成，只有这三部分全部一致才属于同源，Path 不参与判断。例如 `localhost:5173` 和 `localhost:8080` 虽然都在本机，但端口不同，所以属于两个不同 Origin。

浏览器之所以需要同源策略，是为了隔离不同网站的数据访问。比如用户已经登录银行网站，同时又打开了恶意网站，如果恶意网站中的 JavaScript 可以随意读取银行接口返回的数据，就可能直接窃取用户信息。因此浏览器默认限制一个 Origin 中的脚本访问另一个 Origin 中受保护的数据。

但同源策略并不是禁止所有跨源 HTTP 请求。像 `<img>`、`<script>`、`<link>`、表单等本来就可以产生一定程度的跨源加载或提交。真正需要区分的是：**请求有没有真正发送到服务器，以及 JavaScript 最终能不能读取 Response，是两个不同阶段。** 一个跨源 GET 可能已经到达后端，服务器也返回了 `200`，但如果 Response 没有通过 CORS 检查，浏览器仍然不会把响应内容暴露给 JavaScript，所以前端依然会看到 CORS Error。

理解这组机制，可以沿以下主线展开：

先用协议、主机、端口定义 Origin 及受保护操作。

沿预检、实际请求和响应检查解释 CORS。

再比较凭证、Cookie 限制和同源代理，说明各机制如何相互配合。

CORS 不能替代认证授权或 CSRF 防护；no-cors 不会开放读取权限，同站与同源也不能混为一谈。相关完整知识可结合 [跨域问题](<../K-跨域问题.md>) 阅读。

## 1. 机制示例

这些片段展示当前主题需要解释的操作、数据关系或请求路径。判断时应关注前后的依赖和边界，后续机制说明给出对应原因。

```text
Browser
↓ Cross-Origin
API Server
```

```text
Browser
↓ Same-Origin
Proxy
↓
Backend
```

  ```http
  Access-Control-Allow-Credentials: true
  ```

  ```http
  Access-Control-Allow-Origin: *
  ```

```text
CORS
→ 控制跨 Origin 的脚本能否访问响应

SameSite
→ 控制跨 Site 场景下 Cookie 是否发送

CSRF 防御
→ 防止攻击者借助用户已有身份执行非预期操作
```

## 2. 机制说明与工程判断

### 【同源策略与 Origin】

同源策略的起点是浏览器需要为不同网站建立数据访问边界。

假设用户已经登录：

```text
https://bank.example
```

同时又访问：

```text
https://evil.example
```

如果 `evil.example` 中的 JavaScript 能够直接执行：

```javascript
const response = await fetch(
  'https://bank.example/account'
)

const data = await response.json()
```

并读取用户的银行账户信息，那么用户只要访问一个恶意页面，其他已经登录网站中的数据就可能被窃取。

因此浏览器建立了 **Same-Origin Policy**：

> 一个 Origin 中的脚本，默认不能随意访问另一个 Origin 中受保护的数据。

对于普通 HTTP/HTTPS URL，Origin 主要由：

```text
scheme + host + port
```

组成，即：

```text
协议 + 主机 + 端口
```

例如：

```text
https://example.com:443
```

可以拆成：

```text
scheme = https
host   = example.com
port   = 443
```

只有三者全部一致才属于同源。Path 不参与 Origin 判断。

例如：

```text
https://example.com/user
https://example.com/orders
```

同源。

但：

```text
http://example.com
https://example.com
```

协议不同，跨源。

```text
https://app.example.com
https://api.example.com
```

Host 不同，跨源。

```text
http://localhost:5173
http://localhost:8080
```

端口不同，也跨源。

因此前后端分离开发环境中，即使前后端都运行在本机，也经常产生 Cross-Origin Request。
### 【同源策略的限制范围】

同源策略并不是规定：

```text
Cross-Origin
→ 所有 HTTP 请求都不能发送
```

浏览器本身就允许很多跨源资源加载，例如：

```html
<img src="https://cdn.example.com/logo.png">

<script src="https://cdn.example.com/app.js"></script>

<link
  rel="stylesheet"
  href="https://cdn.example.com/app.css"
>
```

HTML 表单同样可以向其他站点发送请求。

同源策略重点限制的是：

> **一个 Origin 中的脚本对另一个 Origin 数据的访问能力。**

因此需要区分两个阶段：

```text
HTTP Request 是否真正发送

和

JavaScript 是否能够读取 Response
```

例如前端执行：

```javascript
fetch('https://api.example.com/user')
```

可能发生：

```text
Browser
↓
GET /user

Server
↓
正常处理
↓
200 OK + JSON

Browser
↓
执行 CORS 检查

检查失败
↓
不把 Response 暴露给 JavaScript
```

所以后端日志完全可能看到：

```text
200 OK
```

而前端看到：

```text
Blocked by CORS policy
```

这两件事并不冲突。
#### <u>1. Server-to-Server 请求</u>

Same-Origin Policy 和 CORS 是**浏览器执行的安全机制**。

例如：

```text
Browser
↓
API
```

请求过程中存在浏览器，浏览器会执行同源策略和 CORS 检查。

而：

```text
Nginx
↓
Spring Boot
```

或者：

```text
Node Server
↓
Java Service
```

属于服务器之间的 HTTP 通信。

服务器本身不会因为：

```text
host 不同
port 不同
```

就执行浏览器的 Same-Origin Policy。

服务器之间当然仍然需要处理：

```text
认证、授权、TLS、防火墙、网络 ACL
```

等安全问题，但这些并不是 CORS。

因此：

> **所谓的前端跨源问题，本质上主要来自浏览器的安全模型，而不是 HTTP 协议禁止不同服务器互相通信。**

这也是反向代理能够解决浏览器跨源问题的基础。
### 【跨源问题的两类解决方案】

工程上解决跨源问题主要有两类思路。
#### <u>1. CORS：允许浏览器跨源访问</u>

例如：

```text
Frontend
https://app.example.com

↓

Backend
https://api.example.com
```

浏览器确实产生：

```text
Cross-Origin Request
```

此时让：

```text
API Server
```

通过 CORS Header 明确授权：

> `app.example.com` 可以访问我的资源。

结构是：

```text
Browser
↓ Cross-Origin
Backend
↓
CORS Authorization
```

这是：

> **保留跨源架构，通过授权解决。**
#### <u>2. Proxy：避免浏览器直接跨源</u>

例如：

```text
Browser
↓
https://example.com/api/user
↓
Nginx
↓
http://backend:8080/user
```

对于 Browser：

```text
页面：
https://example.com

接口：
https://example.com/api/user
```

仍然是 Same-Origin。

真正不同服务之间的调用发生在：

```text
Nginx
→ Backend
```

这一段属于 Server-to-Server。

因此：

```text
Browser
↓ Same-Origin
Proxy
↓ Server-to-Server
Backend
```

不会触发浏览器的 Cross-Origin API 限制。

所以两种方案可以这样理解：

```text
CORS
→ Browser 确实跨源
→ Server 授权 Browser
```

```text
Proxy
→ Browser 不直接跨源
→ Server 帮 Browser 转发
```

它们不是同一种机制。
### 【CORS 的授权机制与 Preflight】

CORS 全称：

```text
Cross-Origin Resource Sharing
```

是一套基于 HTTP Header 的跨源资源共享机制。

例如：

```text
Frontend:
https://app.example.com

Backend:
https://api.example.com
```

浏览器发送跨源请求时，可以带：

```http
Origin: https://app.example.com
```

这个 Header 表示：

> 请求所属的 Origin 是谁。

如果资源服务器允许这个 Origin 访问，可以返回：

```http
Access-Control-Allow-Origin: https://app.example.com
```

表示：

> 我允许这个 Origin 读取当前响应。

最后由 Browser 执行检查。

因此 CORS 可以概括成：

```text
Browser
↓
Origin:
“请求来自哪个 Origin？”

Server
↓
Access-Control-Allow-Origin:
“哪些 Origin 可以访问？”

Browser
↓
执行授权检查
```

所以 CORS 的控制关系是：

> **Server 声明授权，Browser 执行授权。**
#### <u>1. CORS 请求为什么有的直接发送，有的需要预检？</u>

CORS 中存在一组 safelist 条件。

符合条件的一些：

```text
GET、HEAD、POST
```

以及规定范围内的 Header 和 Content-Type，可以不经过 Preflight，直接发送业务请求。

例如：

```text
GET /user
```

可能直接：

```text
Browser
↓
GET /user
↓
Server
↓
Response
↓
Browser 执行 CORS Check
```

所以：

```text
没有 Preflight
≠
没有 CORS
```

只是没有额外的 OPTIONS 检查。

如果请求超出了 safelist，例如使用：

```text
PUT
DELETE
```

或者：

```http
Authorization: Bearer xxx
```

或者一些自定义 Header，浏览器通常需要先执行 Preflight。

例如真正准备发送：

```http
DELETE /users/1001

Authorization: Bearer xxx
```

浏览器先发送：

```http
OPTIONS /users/1001

Origin: https://app.example.com

Access-Control-Request-Method: DELETE

Access-Control-Request-Headers: authorization
```

它是在询问服务器：

> 这个 Origin 是否允许使用 DELETE，并携带 Authorization Header？

服务器如果允许，可以返回：

```http
Access-Control-Allow-Origin:
https://app.example.com

Access-Control-Allow-Methods:
DELETE

Access-Control-Allow-Headers:
Authorization
```

浏览器确认后，再发送真正的：

```http
DELETE /users/1001
```

因此完整结构是：

```text
非 Safelisted Cross-Origin Request
↓
OPTIONS Preflight
↓
服务器返回允许的
Origin / Method / Headers
↓
Browser 检查通过
↓
真正业务 Request
```

Preflight 本身不处理真正业务，只负责确认这类跨源能力是否得到服务器授权。

服务器还可以返回：

```http
Access-Control-Max-Age: 86400
```

让浏览器缓存预检结果，减少重复 OPTIONS 请求产生的额外网络开销。
### 【带凭证的 CORS 请求】

前面的 CORS 主要解决：

> **当前 Origin 有没有访问这个资源的权限。**

实际登录系统还会出现另外一个问题：

> **这次跨源 Request 是否需要携带用户的身份凭证？**

这里涉及 **Credentials**。

在 Fetch 语境中，Credentials 是服务器可以用来认证用户的身份凭证，例如：

```text
HTTP Cookie
TLS Client Certificate
HTTP Authentication Credentials
```

对于普通 Web 登录，最常见的是：

```text
Cookie
```

例如浏览器保存：

```text
sessionId=abc123
```

跨源请求 API 时，就需要决定这个 Cookie 是否参与请求。

Fetch 提供：

```javascript
credentials
```

控制浏览器如何处理 Credentials。

主要有三个值：
#### <u>1. `omit`</u>

```text
不包含 Credentials
```
#### <u>2. `same-origin`</u>

默认值：

```text
Same-Origin Request
→ 包含相应 Credentials

Cross-Origin Request
→ 不按跨源携带 Credentials 的方式处理
```
#### <u>3. `include`</u>

```text
即使 Cross-Origin
也允许包含 Credentials
```

例如：

```javascript
fetch('https://api.example.com/user', {
  credentials: 'include'
})
```

表示：

> 这个跨源 Fetch 允许携带相应的 Credentials。

默认使用 `same-origin` 而不是 `include`，是因为 Cookie 等 Credentials 通常代表用户已经建立的认证状态，如果任意跨源请求默认都携带用户身份，会扩大跨站身份请求带来的安全暴露面，因此 Fetch 使用更加保守的默认策略。
#### <u>4. 服务端的 Credentials 授权</u>

如果：

```javascript
credentials: 'include'
```

服务器还必须明确同意带凭证的 CORS：

```http
Access-Control-Allow-Credentials: true
```

并且：

```http
Access-Control-Allow-Origin
```

需要指定明确 Origin，例如：

```http
Access-Control-Allow-Origin:
https://app.example.com
```

不能使用：

```http
Access-Control-Allow-Origin: *
```

来响应带 Credentials 的 CORS 请求。

因此 Credentialed CORS 的关系是：

```text
Client
credentials: include
↓
允许跨源请求包含 Credentials

+

Server
Access-Control-Allow-Credentials: true
↓
允许 Credentialed CORS

+

Access-Control-Allow-Origin:
https://app.example.com
↓
明确允许这个 Origin
```
### 【跨源请求中的 Cookie 与 SameSite】

CORS 配置正确：

```text
≠
Cookie 一定发送
```

这是因为：

```text
CORS
```

和：

```text
Cookie Sending Rules
```

解决的是两个不同的问题。

CORS 解决：

> **这个 Origin 的 JavaScript 能否进行跨源资源访问。**

Cookie 是否发送还需要检查：

```text
Domain、Path、Secure、SameSite、Expiration、浏览器 Cookie 策略
```

等规则。

因此：

```javascript
credentials: 'include'
```

并不是：

> 强制 Browser 把所有 Cookie 都发出去。

它只是允许这个请求在 Cross-Origin 情况下包含 Credentials。

Cookie 自己仍然需要满足发送条件。
#### <u>1. Cross-Origin 和 Cross-Site 的区别</u>

Origin 主要看：

```text
scheme + host + port
```

Site 则基于站点概念，主要涉及 scheme 和 registrable domain，端口不是 Site 判断的核心。

例如：

```text
https://app.example.com
https://api.example.com
```

由于 Host 不同，所以：

```text
Cross-Origin
```

但它们可以仍然属于：

```text
Same-Site
```

因此：

```text
Cross-Origin
≠
Cross-Site
```

这也意味着：

```text
CORS
```

和：

```text
SameSite Cookie
```

不能混为同一个“跨域机制”。

`SameSite` 主要控制 Cookie 是否参与 Cross-Site Request。
### 【Fetch Request Mode】

Fetch API 还提供一个：

```javascript
mode
```

配置。

`mode` 描述这个 Request 采用怎样的浏览器请求模式。

对普通前端请求，主要关注：

```text
same-origin、cors、no-cors
```
#### <u>1. `same-origin`</u>

表示：

> 请求只允许访问 Same-Origin Resource。

如果目标是其他 Origin：

```text
Request 失败
```
#### <u>2. `cors`</u>

表示：

> 如果目标 Cross-Origin，则使用 CORS 机制处理。

例如：

```javascript
fetch('https://api.example.com/user', {
  mode: 'cors'
})
```

浏览器会根据请求情况执行：

```text
CORS
↓
必要时 Preflight
↓
真正 Request
↓
CORS Response Check
```

对于需要 JavaScript 正常读取跨源 API Response 的请求，这是主要模式。

普通 `fetch()` 的默认 `mode` 是 `cors`。
#### <u>3. `no-cors`</u>

`no-cors` 是一种**受限制的跨源请求模式**。

使用它时，请求可以使用的 Method 和 Header 会受到限制。例如 Method 主要限制为：

```text
GET、HEAD、POST
```

Header 也只能使用受允许的有限集合。

更重要的是，跨源 Response 对 JavaScript 来说通常会变成：

```text
opaque Response
```

其特点包括：

```text
status = 0
headers 不向 JS 暴露
body 无法由 JS 读取
```

因此：

```javascript
const response = await fetch(url, {
  mode: 'no-cors'
})
```

不能把 `no-cors` 理解成：

> 允许 JavaScript 随意读取跨源接口。

它提供的是：

> **受限制地发起跨源请求，同时不向 JavaScript 暴露正常的跨源响应内容。**

这类模式适合某些：

```text
只需要发送 或 只需要加载
```

而不需要 JavaScript 读取完整 Response 的场景。

例如部分：

```text
资源加载
日志/统计发送
Service Worker 缓存场景
```

可以使用类似模式。

但普通 REST API 通常需要：

```javascript
const data = await response.json()
```

这就要求 JavaScript 能访问 Response Body。

因此：

```text
JSON API
↓
需要读取 Response
↓
no-cors 不适合
```

应使用：

```text
正常 CORS
```

或者：

```text
Proxy
```
### 【Vite Proxy 与 Nginx 反向代理】

Proxy 方案的核心是：

> **让 Browser 发出的请求本身保持 Same-Origin。**
#### <u>1. 开发环境</u>

例如：

```text
Frontend:
http://localhost:5173

Backend:
http://localhost:8080
```

直接：

```javascript
fetch('http://localhost:8080/api/user')
```

是 Cross-Origin。

配置 Vite Proxy 后：

```javascript
fetch('/api/user')
```

浏览器实际访问：

```text
http://localhost:5173/api/user
```

流程：

```text
Browser
↓
localhost:5173/api/user
↓
Vite Dev Server
↓
localhost:8080/api/user
```

对于 Browser：

```text
Page Origin
=
API Request Origin
=
http://localhost:5173
```

因此没有浏览器层面的 Cross-Origin API Request。
#### <u>2. 生产环境</u>

Nginx 也可以形成：

```text
Browser
↓
https://example.com

Nginx
├── /
│   → Frontend Static Files
│
└── /api
    → Backend:8080
```

前端：

```javascript
fetch('/api/user')
```

浏览器看到：

```text
Page:
https://example.com

API:
https://example.com/api/user
```

仍然 Same-Origin。

真正：

```text
Nginx
→ Backend:8080
```

发生在 Server-to-Server。

所以生产环境中非常常见：

```text
一个公网 Origin + 内部多个服务
```

由：

```text
Nginx、API Gateway、BFF
```

统一代理。
#### <u>3. CORS 和 Proxy 的选择</u>

可以这样理解：

```text
CORS
→ 架构上确实需要 Browser 直接访问多个 Origin
```

例如：

```text
app.example.com
↓
api.other.com
```

则配置 CORS。

而：

```text
Proxy
→ 可以通过统一入口让 Browser 保持 Same-Origin
```

例如：

```text
example.com
/api/*
```

统一经过 Gateway / Nginx 转发。

二者都合理，选择取决于系统部署方式和安全架构。
### 【CORS、SameSite 与 CSRF 的安全边界】

最后需要把三个容易混淆的概念分开。
#### <u>1. CORS</u>

主要解决：

> **一个 Origin 中的 JavaScript 是否可以访问另一个 Origin 的 Response。**
#### <u>2. SameSite</u>

主要解决：

> **在 Cross-Site Request 中，Cookie 是否允许发送。**

例如：

```http
SameSite=Strict
SameSite=Lax
SameSite=None
```

控制的是 Cookie 的 Cross-Site 发送行为。
#### <u>3. CSRF</u>

解决的是：

> **如何防止攻击者借助用户已有的认证状态，让目标服务器执行用户没有主动意图发起的操作。**

例如：

```text
用户已经登录银行
↓
攻击者诱导用户访问恶意网站
↓
浏览器向银行发出请求
↓
如果认证 Cookie 被带上
↓
服务器可能把它当成用户请求
```

攻击者不一定需要读取：

```text
Response
```

只要：

```text
转账、删除、修改
```

真正发生，攻击目的就可能已经达到。

所以：

```text
CORS
≠
CSRF Protection
```

CSRF 通常仍需要结合：

```text
SameSite
CSRF Token
Origin / Referer Validation
```

等机制。

## 3. 完整回答与表达组织

同源策略是浏览器的一项核心安全机制。对于普通 HTTP 和 HTTPS URL，Origin 主要由协议、主机和端口组成，只有这三部分全部一致才属于同源，Path 不参与判断。例如 `localhost:5173` 和 `localhost:8080` 虽然都在本机，但端口不同，所以属于两个不同 Origin。

浏览器之所以需要同源策略，是为了隔离不同网站的数据访问。比如用户已经登录银行网站，同时又打开了恶意网站，如果恶意网站中的 JavaScript 可以随意读取银行接口返回的数据，就可能直接窃取用户信息。因此浏览器默认限制一个 Origin 中的脚本访问另一个 Origin 中受保护的数据。

但同源策略并不是禁止所有跨源 HTTP 请求。像 `<img>`、`<script>`、`<link>`、表单等本来就可以产生一定程度的跨源加载或提交。真正需要区分的是：**请求有没有真正发送到服务器，以及 JavaScript 最终能不能读取 Response，是两个不同阶段。** 一个跨源 GET 可能已经到达后端，服务器也返回了 `200`，但如果 Response 没有通过 CORS 检查，浏览器仍然不会把响应内容暴露给 JavaScript，所以前端依然会看到 CORS Error。

跨源问题还要注意它的作用范围。同源策略和 CORS 主要由浏览器执行，所以 Browser 直接请求另一个 Origin 时需要接受这些安全检查；但 Node、Java、Nginx 等服务器之间的 HTTP 调用并不会因为 Host 或 Port 不同而出现浏览器意义上的 CORS Error。服务器之间仍然需要认证、授权、TLS、防火墙等安全控制，但那属于服务器安全，不属于浏览器 Same-Origin Policy。

因此工程上解决跨源问题主要有两条思路。

第一条是 **CORS**。如果浏览器确实要直接访问不同 Origin，例如前端在 `app.example.com`，后端 API 在 `api.example.com`，那么就保留这种 Cross-Origin 架构，由 API Server 通过 CORS 明确授权浏览器访问。

第二条是 **Proxy**。通过 Vite、Nginx、API Gateway 或 BFF，让 Browser 始终请求当前 Origin，再由服务器把请求转发到真正 Backend。它之所以能够解决浏览器跨源问题，根本原因就是 Browser → Proxy 是 Same-Origin，而 Proxy → Backend 属于 Server-to-Server，不受浏览器同源策略约束。

如果采用 CORS，基本授权过程是：浏览器在跨源请求中通过 `Origin` 表明请求来源，例如：

```http
Origin: https://app.example.com
```

服务器如果允许这个 Origin 访问，就返回：

```http
Access-Control-Allow-Origin: https://app.example.com
```

浏览器再根据服务器的 CORS Header 判断是否允许当前 JavaScript 获取 Response。所以 CORS 的基本关系可以理解为：**服务器声明授权，浏览器负责执行授权。**

CORS 请求又可以根据是否需要 Preflight 分成两类。一些满足 CORS safelist 条件的 GET、HEAD、POST 等请求可以直接发送，但 Response 返回以后仍然必须接受 CORS 检查；没有 Preflight 并不等于没有 CORS。

如果请求使用了 PUT、DELETE、Authorization Header 或其他超出 safelist 的能力，浏览器通常会先发送一个 OPTIONS Preflight。预检中通过 `Access-Control-Request-Method` 和 `Access-Control-Request-Headers` 告诉服务器真正请求准备使用什么 Method 和 Header；服务器再通过 `Access-Control-Allow-Methods`、`Access-Control-Allow-Headers` 和 `Access-Control-Allow-Origin` 表示是否允许。预检成功以后，浏览器才发送真正的业务请求。所以 OPTIONS 只负责跨源权限确认，真正的 POST、PUT、DELETE 仍然是后续另一条 HTTP Request。预检结果还可以通过 `Access-Control-Max-Age` 缓存，减少重复 OPTIONS。

如果这个跨源请求还需要用户登录身份，就会涉及 Credentials。Fetch 中的 Credentials 是服务器可以用来认证用户的身份凭证，例如 Cookie、HTTP Authentication 凭证和 TLS Client Certificate，其中前端登录体系最常见的是 Cookie。

Fetch 的 `credentials` 决定请求怎样处理 Credentials，主要有 `omit`、`same-origin` 和 `include`。默认是 `same-origin`，也就是同源请求正常处理凭证；如果跨源请求明确需要携带凭证，需要使用：

```javascript
fetch(url, {
  credentials: 'include'
})
```

`include` 表示即使请求 Cross-Origin，也允许包含相应 Credentials。

但客户端设置 `include` 还不够，服务器还需要返回：

```http
Access-Control-Allow-Credentials: true
```

同时 `Access-Control-Allow-Origin` 必须明确指定允许的 Origin，不能直接使用 `*`。这样客户端和服务器两边都明确允许带凭证的 CORS。

即使 CORS 和 Credentials 都配置正确，Cookie 也不一定真正发送，因为 Cookie 自己还必须满足 Domain、Path、Secure、SameSite、过期时间和浏览器 Cookie 策略。`credentials: "include"` 只允许跨源请求包含 Credentials，并不能绕过这些 Cookie 规则。

这里还要区分 Cross-Origin 和 Cross-Site。Origin 主要由 scheme、host、port 决定，而 Site 使用的是另一套站点概念。因此 `app.example.com` 和 `api.example.com` 可以是 Cross-Origin，但仍然可能属于 Same-Site。CORS 主要围绕 Origin 工作，而 Cookie 的 `SameSite` 主要控制 Cross-Site 场景下 Cookie 是否发送，两者不能混为同一种“跨域机制”。

Fetch 里还有一个 `mode` 配置，它描述 Request 采用的浏览器请求模式。`same-origin` 表示不允许访问其他 Origin；`cors` 表示 Cross-Origin 时使用 CORS 机制；`no-cors` 则是一种受限制的跨源请求模式。普通 `fetch()` 默认使用 `cors`。

`no-cors` 模式下，请求能够使用的 Method 和 Header 都受到限制，而且 Cross-Origin Response 通常会成为 opaque Response。对于 JavaScript 来说，它的真实 Status、Headers 和 Body 都不能正常读取。因此 `no-cors` 适合的是一些只需要完成受限加载或者发送、并不要求 JavaScript 获取完整响应内容的场景，而不是普通 JSON API。普通 API 如果需要执行 `response.json()`，仍然应该正确配置 CORS，或者使用 Proxy。

开发环境中的 Vite Proxy 就属于 Proxy 方案。比如浏览器运行在 `localhost:5173`，Backend 在 `localhost:8080`，前端不直接请求 8080，而是请求 `/api/user`，由 Vite Dev Server 把 `/api` 转发到 Backend。浏览器看到的始终是 `localhost:5173`，所以保持 Same-Origin。

生产环境中的 Nginx 也是同样的思路。浏览器统一访问 `https://example.com`，Nginx 可以让 `/` 返回前端静态文件，让 `/api` 转发到内部 Backend。Browser 始终只看到一个 Origin，真正的服务间通信发生在 Nginx 与 Backend 之间。因此 CORS 和 Proxy 的区别可以概括成：**CORS 是允许 Browser Cross-Origin，Proxy 是避免 Browser 直接 Cross-Origin。**

最后还需要区分 CORS、SameSite 和 CSRF。CORS 主要控制跨 Origin 的 JavaScript 能不能访问 Response；SameSite 主要控制 Cross-Site 场景下 Cookie 是否发送；CSRF 防御则解决攻击者能否利用用户已经存在的认证状态执行非预期操作。攻击者进行 CSRF 时甚至不一定需要读取 Response，只要请求产生转账、删除等副作用就可能已经成功，所以 CORS 不能替代 SameSite、CSRF Token、Origin/Referer 校验等 CSRF 防御。

整个体系可以最终收敛为：

```text
浏览器 Same-Origin Policy
        ↓
产生 Cross-Origin 访问限制
        ↓
工程上两种解决路线
        │
        ├── CORS
        │   ↓
        │   Server 授权 Browser
        │   ↓
        │   普通 CORS / Preflight
        │   ↓
        │   如果需要身份
        │   → Credentialed CORS
        │   → Cookie 自身规则
        │
        └── Proxy
            ↓
            Browser 保持 Same-Origin
            ↓
            Server-to-Server 转发

Fetch API 中：
mode
→ 控制请求模式

credentials
→ 控制凭证处理方式
```

这样整道题的核心逻辑就是：**先理解浏览器为什么建立同源安全边界，再判断跨源问题发生在哪里，然后选择“允许浏览器跨源”的 CORS，或者“避免浏览器跨源”的 Proxy；CORS 内部再根据请求能力决定是否需要 Preflight，如果请求还需要用户身份，再处理 Credentials 和 Cookie 规则。**

## 4. 参考文献

[1] [Origin - MDN](<https://developer.mozilla.org/en-US/docs/Glossary/Origin>)[EB/OL].

[2] [Same-origin policy - MDN](<https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy>)[EB/OL].

[3] [Cross-Origin Resource Sharing (CORS) - MDN](<https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS>)[EB/OL].

[4] [Using the Fetch API - MDN](<https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch>)[EB/OL].

[5] [Request.credentials - MDN](<https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials>)[EB/OL].

[6] [Request.mode - MDN](<https://developer.mozilla.org/en-US/docs/Web/API/Request/mode>)[EB/OL].

[7] [Set-Cookie header - MDN](<https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie>)[EB/OL].

[8] [Vite Server Options - server.proxy](<https://vite.dev/config/server-options.html>)[EB/OL].
