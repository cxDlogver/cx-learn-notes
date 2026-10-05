# 浏览器、CDN、源站与 Service Worker 的分层缓存

## 【知识概述】

**前端缓存分布在浏览器、共享边缘节点和源站附近，Service Worker 还可按应用策略拦截请求；先定位命中层，再判断新鲜度与更新。**

前端完整缓存体系可以从**浏览器、CDN 和源站三个层级**理解，使用 PWA 时还需要考虑 Service Worker。

首先，前端项目生产构建以后，本质上会变成 HTML、JavaScript、CSS、图片和字体等静态资源。这些资源可以部署在 Nginx、对象存储或者其他静态托管服务上，并不代表所有前端项目一定都有一台 Nginx 服务器。在典型前后端分离架构里，Nginx 经常作为 Web Server 或反向代理入口，静态资源可以由它直接返回，而 `/api` 这样的动态请求通过 `proxy_pass` 转发到 Spring Boot、Node 等后端服务；后端如果部署多个实例，还可以继续通过负载均衡进行流量分发。[[1]](https://nginx.org/en/docs/http/ngx_http_core_module.html)

如果接入 CDN，CDN 通常位于用户和源站之间。第一次请求某个静态资源时，如果边缘节点没有缓存，会发生 Cache Miss，CDN 向源站获取资源，也就是回源；资源缓存以后，后续请求如果 Cache Hit，就直接由距离用户较近的 CDN 节点返回，不再访问源站。所以可以理解成：**Nginx 或对象存储提供源站资源，CDN 提供分布式边缘缓存。**[[2]](https://developers.cloudflare.com/cache/concepts/cache-responses/)

理解这组机制，可以沿以下主线展开：

先沿请求路径说明各层职责及命中后哪些下游不再参与。

再把强缓存、验证器和共享缓存限制放到各层。

最后区分 HTML 与带版本资源的发布策略，以及 Service Worker 和 Cache Storage 的显式更新。

Nginx 并非必需组件，也不默认缓存全部动态请求；Service Worker 的处理策略与 HTTP 缓存不是同一套自动规则。相关完整知识可结合 [CDN缓存与浏览器缓存笔记](<../C-CDN缓存与浏览器缓存笔记.md>) 阅读。

## 1. 机制示例

这些片段展示当前主题需要解释的操作、数据关系或请求路径。判断时应关注前后的依赖和边界，后续机制说明给出对应原因。

   ```text
   浏览器
      ↓
   CDN
      ↓
   Nginx / 源站
   ```

   ```text
   app.a81f32.js
   ```

   ```http
   Cache-Control: max-age=31536000, immutable
   ```

    ```text
    页面请求资源
        ↓
    Service Worker 拦截 fetch
        ↓
    Cache Storage 是否存在
       ↙       ↘
     存在       不存在
      ↓           ↓
    返回缓存     请求网络
    ```

    ```text
    Network ❌
       ↓
    Cache Storage
       ↓
    返回页面资源
    ```

```text
                ┌──────── 浏览器 HTTP Cache
                │
用户浏览器 ──────┤
                │
                └──────── Service Worker / Cache Storage
                         ↓
                       CDN
                         ↓
                      Nginx
                         ↓
                后端应用服务器
```

```text
浏览器缓存
→ 减少用户本机重复请求

Service Worker
→ 可编程地决定请求走缓存还是网络

CDN
→ 在离用户更近的边缘节点缓存资源

Nginx
→ 源站静态资源服务 + 反向代理 + 负载均衡
```

## 2. 机制说明与工程判断

### 【完整缓存链路】

这道题的核心不是分别背四种技术，而是先建立一条完整链路：

```text
构建后的前端静态资源
        ↓
源站：Nginx / 对象存储等
        ↓
CDN 边缘节点
        ↓
Internet
        ↓
浏览器
 ├─ HTTP Cache
 └─ Service Worker + Cache Storage
        ↓
页面运行
```

但这里有一个很重要的点：

> **这不是严格意义上的四级串行缓存。**

浏览器 HTTP Cache 属于浏览器网络栈管理的 HTTP 缓存；Service Worker 是一个**可编程的请求拦截层**，它可以自己访问 Cache Storage，也可以继续 `fetch()` 网络，而网络请求过程中仍可能使用浏览器 HTTP Cache。CDN 则是浏览器之外的共享缓存层，Nginx 可以是源站，也可以是反向代理入口。

所以更准确的理解是：

```text
浏览器内部
┌────────────────────────────┐
│ 页面请求                    │
│    ↓                       │
│ Service Worker（如果存在） │
│   ↙              ↘        │
│ Cache Storage     fetch()  │
│                     ↓      │
│               HTTP Cache   │
└─────────────────────┬──────┘
                      ↓
                     CDN
                      ↓
                   Origin
              Nginx / Object Storage
                      ↓
               Backend Application
```

---
### 【先把 Nginx、CDN 和后端服务器的关系说清楚】

#### <u>1. 前端静态资源一定部署在 Nginx 吗？</u>

**不一定。**

这是前面讨论里最需要修正的一点。

Vue、React 项目生产构建以后，一般生成：

```text
dist/
├── index.html
└── assets/
    ├── index-a81f3.js
    ├── index-71a2.css
    └── logo-f31a.png
```

这些本质上都是静态文件。

它们可以部署在：

- Nginx；
- Apache；
- 对象存储；
- CDN 静态托管；
- 云平台静态站点；
- Node Server；
- 甚至后端应用自身的 static 目录。

所以不能回答：

> “现代前端一定有一台 Nginx 服务器。”

正确说法应该是：

> **Nginx 是非常常见的 Web Server 和反向代理方案，但不是前端部署的必选组件。**

---
### 【为什么实际项目经常看到 Nginx + 后端应用服务器？】

因为前端静态资源和动态业务请求的特点完全不同。

例如：

```text
GET /assets/index-a81f3.js
```

只需要找到磁盘上的文件然后返回。

而：

```text
POST /api/orders
```

可能需要：

```text
权限校验
 ↓
业务逻辑
 ↓
数据库
 ↓
Redis
 ↓
RPC
 ↓
生成响应
```

因此常见架构会把两种请求分开：

```text
                     ┌→ 静态资源
浏览器 → Nginx ──────┤
                     │
                     └→ /api/*
                           ↓
                       Spring Boot
                       Node
                       Go
                       ...
```

Nginx 官方的 `root` / `alias` 能够把 URL 映射到服务器上的静态文件；而 `proxy_pass` 则可以把请求代理给其他服务器。[[1]](https://nginx.org/en/docs/http/ngx_http_core_module.html)

例如：

```nginx
server {
    root /var/www/frontend;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend;
    }
}
```

这里：

```text
/assets/app.js
    ↓
Nginx直接返回

/api/users
    ↓
Nginx
    ↓
backend
```

---
### 【后端有多台服务器时怎么办？】

例如有三台 Spring Boot：

```text
Backend 1、Backend 2、Backend 3
```

可以配置：

```nginx
upstream backend {
    server 10.0.0.1:8080;
    server 10.0.0.2:8080;
    server 10.0.0.3:8080;
}

location /api/ {
    proxy_pass http://backend;
}
```

请求：

```text
              ┌→ Backend 1
浏览器 → Nginx ├→ Backend 2
              └→ Backend 3
```

所以 Nginx 可以承担：

> **反向代理 + 负载均衡。**

NGINX 官方也明确将反向代理用于把请求交给应用服务器以及实现负载分发。[[3]](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy)

---
### 【那前端静态资源是不是只需要部署一次？】

在一种典型前后端分离架构下，可以这样理解：

```text
              Nginx
             /     \
       前端dist     /api
                     ↓
              Backend 1
              Backend 2
              Backend 3
```

前端资源放在静态资源服务器或者 CDN 上：

```text
index.html、app.xxx.js、app.xxx.css
```

后端服务器只运行：

```text
Java / Node / Go
业务代码
```

因此确实：

> **没有必要在每一台后端应用服务器上重复部署前端静态资源。**

但是不能把它说成绝对规则。

有些项目会：

```text
Spring Boot jar
 └─ static/
     └─ 前端资源
```

或者整个前后端打进同一个 Docker Image。

所以面试中更准确的表述是：

> 在典型前后端分离架构中，前端构建产物通常由独立的静态资源服务或 CDN 提供，后端应用部署多个实例处理动态业务，两者没有必要部署在同一台服务器上。

---
### 【CDN 和 Nginx 到底是什么关系？】

这是这一题最重要的一层。

假设：

```text
源站：
www.example.com
        ↓
Nginx
        ↓
/assets/app-a81f3.js
```

如果接入 CDN：

```text
用户
 ↓
CDN Edge
 ↓
Nginx Origin
```

也就是说：

> **Nginx 可以充当 Origin Server（源站），CDN 位于用户和源站之间。**

---
### 【第一次访问 CDN 静态资源会发生什么？】

用户请求：

```text
https://cdn.example.com/app-a81f3.js
```

CDN 节点检查：

```text
CDN Cache

有没有 app-a81f3.js？
```

如果没有：

```text
Cache MISS
```

那么：

```text
用户
 ↓
CDN
 ↓ MISS
Nginx / Origin
 ↓
app-a81f3.js
 ↓
CDN
 ↓
用户
```

CDN 同时把资源保存下来。

这就是：

> **回源。**

Cloudflare 对 `MISS` 的定义就是：资源不在 CDN Cache，因此需要从 Origin 获取；而 `HIT` 表示资源已经存在于边缘缓存中。[[2]](https://developers.cloudflare.com/cache/concepts/cache-responses/)

---
### 【第二个用户再访问会怎么样？】

假设 CDN Cache 还有效：

```text
User A
 ↓
Tokyo CDN
 ↓ HIT
直接返回 app.js
```

此时：

```text
Nginx
```

根本不会收到这个请求。

因此 CDN 的两个主要作用就是：
#### <u>1. 降低网络延迟</u>

原来：

```text
日本用户
 ↓
中国源站
```

现在：

```text
日本用户
 ↓
东京 CDN 节点
```

资源离用户更近。
#### <u>2. 降低源站压力</u>

假设：

```text
100 万次 app.js 请求
```

大部分：

```text
CDN HIT
```

源站可能只承担非常少的一部分回源请求。

---
### 【CDN 和浏览器缓存有什么区别？】

这是第二个高频追问。
#### <u>1. 浏览器缓存</u>

缓存位置：

```text
用户自己的电脑
```

解决：

> **同一个用户重复访问资源的问题。**

例如：

```text
第一次访问
Browser → CDN → Origin

第二次访问
Browser Cache → 直接使用
```

---
#### <u>2. CDN 缓存</u>

缓存位置：

```text
CDN 边缘服务器
```

解决：

> **大量不同用户访问同一个资源的问题。**

例如：

```text
User A ─┐
User B ─┼→ Tokyo CDN → Origin
User C ─┘
```

CDN 缓存一次以后，可以服务大量用户。

---
#### <u>3. 因此两者关系是</u>

```text
浏览器缓存
→ 用户级缓存

CDN
→ 大量用户共享的边缘缓存
```

HTTP `Cache-Control` 本身既可以控制浏览器这样的私有缓存，也可以控制 CDN/Proxy 这样的共享缓存。[[4]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)

---
### 【如果浏览器强缓存命中了，请求还会到 CDN 吗？】

不会。

例如之前返回：

```http
Cache-Control: max-age=31536000
```

浏览器发现：

```text
app.a81f3.js
仍然 fresh
```

那么：

```text
页面
 ↓
Browser HTTP Cache
 ↓
直接返回
```

不会出现：

```text
Browser → CDN
```

也更不会：

```text
Browser → CDN → Nginx
```

这也是为什么：

> **离用户越近的缓存命中，节省的成本越大。**

---
### 【浏览器缓存完整机制】

国内面试通常把 HTTP Cache 分成：

```text
强缓存 + 协商缓存
```

如果按照 HTTP 标准术语，更准确的是：

```text
Freshness
+
Validation / Revalidation
```

但面试回答使用“强缓存/协商缓存”没有问题。

---
### 【强缓存是什么？】

服务器第一次：

```http
HTTP/1.1 200 OK
Cache-Control: max-age=3600
```

表示该响应可以在一定时间内保持新鲜。

之后再次请求：

```text
浏览器判断缓存仍 fresh
        ↓
直接使用缓存
```

不访问网络。

---
### 【Cache-Control 几个关键词一定要分清】

#### <u>1. `max-age`</u>

```http
Cache-Control: max-age=3600
```

表示缓存的 freshness lifetime。

---
#### <u>2. `no-cache`</u>

这个名字非常容易答错。

它不是：

> 不允许缓存。

而是：

> **可以存储，但是复用之前必须向服务器验证。**

例如：

```text
Browser Cache
    ↓
有缓存
    ↓
必须 Revalidate
    ↓
Server
```

MDN 也明确指出 `no-cache` 的作用是强制验证，而不是完全禁止存储。[[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

---
#### <u>3. `no-store`</u>

这个才是：

> **不要存储这个响应。**

例如：

```http
Cache-Control: no-store
```

适合非常敏感、确实不希望持久缓存的内容。

---
#### <u>4. `private`</u>

```http
Cache-Control: private
```

允许：

```text
Browser Cache
```

但是不应该存入：

```text
CDN / Shared Cache
```

常见于个性化内容。

---
#### <u>5. `public`</u>

允许共享缓存存储。

---
#### <u>6. `s-maxage`</u>

这个很适合 CDN 题里补一句。

```http
Cache-Control: max-age=60, s-maxage=3600
```

可以理解成：

```text
Browser
→ 60 秒

Shared Cache / CDN
→ 3600 秒
```

因为 `s-maxage` 针对共享缓存。

---
### 【协商缓存是什么？】

缓存已经存在，但是不能直接相信它还新鲜：

```text
Browser
 ↓
带验证条件
 ↓
Server
```

常见两套机制。

---
#### <u>1. ETag</u>

第一次：

```http
HTTP/1.1 200 OK
ETag: "abc123"
```

浏览器保存：

```text
资源 + ETag
```

下一次：

```http
If-None-Match: "abc123"
```

服务器比较当前版本：
#### <u>2. 没变化</u>

```http
304 Not Modified
```

没有响应 Body。

浏览器继续使用旧资源。
#### <u>3. 变化了</u>

```http
200 OK
ETag: "xyz789"

新的资源
```

MDN 将 ETag 定义为资源特定版本的标识，`If-None-Match` 可以用于重新验证缓存；匹配时可返回 `304`。[[6]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag)

---
### 【Last-Modified】

服务器：

```http
Last-Modified: Sat, 22 Aug 2026 03:20:00 GMT
```

浏览器下次：

```http
If-Modified-Since: Sat, 22 Aug 2026 03:20:00 GMT
```

如果没变：

```http
304
```

发生变化：

```http
200 + 新资源
```

`Last-Modified` 是基于修改时间的验证器，精确程度通常不如 ETag。[[7]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Last-Modified)

所以一般可以回答：

```text
ETag / If-None-Match
→ 内容版本验证

Last-Modified / If-Modified-Since
→ 修改时间验证
```

而不是死记：

> “ETag 优先级就是比 Last-Modified 高。”

更准确是如果条件请求中同时存在相关验证条件，HTTP 规范规定了对应处理规则；从缓存实践角度，ETag 往往能提供更细粒度的版本验证。[[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

---
### 【为什么生产 JS/CSS 一定喜欢加 Hash？】

假设没有 Hash：

```text
app.js
```

浏览器：

```text
app.js
→ 缓存一年
```

现在你发布了新代码：

```text
app.js
```

但是 URL 没变。

浏览器可能仍然认为：

```text
app.js
=
旧资源
```

这就非常麻烦。

---

采用内容 Hash：

```text
旧版本：
app.a81f3.js

新版本：
app.e71ab.js
```

代码改变：

```text
content
 ↓
hash改变
 ↓
URL改变
```

浏览器看到：

```text
app.e71ab.js
```

这是一个完全不同的 URL，自然重新请求。

这个机制通常叫：

> **Cache Busting。**

MDN 也把“内容改变时改变 URL”作为长期缓存静态资源的典型策略。[[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

---
### 【所以 JS/CSS 可以怎么缓存？】

对于：

```text
app.a81f3.js、style.813aa.css、logo.79adb.png
```

可以采用：

```http
Cache-Control: public, max-age=31536000, immutable
```

意思大致就是：

> 这个 URL 对应的内容一年内不会变，不需要反复验证。

如果代码发生变化：

```text
app.a81f3.js
↓
app.91bc2.js
```

URL 自动变化。

这就是：

> **内容 Hash + 长期缓存。**

MDN 也推荐带版本标识的静态子资源配合长期 `max-age` 和 `immutable`。[[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

---
### 【为什么 index.html 不能也缓存一年？】

这是整套缓存设计的关键。

假设：

```html
<!-- 旧 index.html -->

<script src="/assets/app.a81f3.js"></script>
```

你发布：

```text
app.91bc2.js
```

新的 HTML：

```html
<script src="/assets/app.91bc2.js"></script>
```

但是用户浏览器一直缓存：

```text
旧 index.html
```

那么用户永远看到：

```text
app.a81f3.js
```

因为：

```text
HTML、负责告诉浏览器、应该加载哪个 JS
```

所以整个更新链其实是：

```text
index.html
     ↓
新的 JS Hash
     ↓
新的 CSS Hash
```

因此：

> **HTML 必须能及时更新。**

---
### 【生产环境常见缓存策略】

非常适合面试直接回答成：

```text
index.html
→ 不做长期强缓存
→ no-cache / 验证缓存

带 Hash 的 JS / CSS / 图片
→ 长期强缓存
→ max-age=31536000 + immutable
```

例如：
#### <u>1. HTML</u>

```http
Cache-Control: no-cache
ETag: "xxx"
```

每次复用前确认：

```text
HTML有没有变化？
```

如果没变化：

```text
304
```

---
#### <u>2. Hash 静态资源</u>

```http
Cache-Control: public, max-age=31536000, immutable
```

直接长期缓存。

MDN 对 main resource HTML 和带版本号的 subresource 正是给出了这两种不同策略。[[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

---
### 【CDN 怎么和这套策略配合？】

例如：

```text
app.a81f3.js
```

源站返回：

```http
Cache-Control: public, max-age=31536000, immutable
```

那么：

```text
Browser
→ 可以缓存

CDN
→ 也可以缓存
```

于是完整效果：

```text
第一位用户

Browser
 ↓ MISS
CDN
 ↓ MISS
Origin
 ↓
返回 app.js
 ↑
CDN缓存
 ↑
Browser缓存
```

下一次同一个用户：

```text
Browser HIT
```

另一个用户：

```text
Browser MISS
 ↓
CDN HIT
```

整个系统就形成：

```text
本地缓存 + 边缘缓存 + 源站
```

三级访问优化。

---
### 【如果发布后用户一直看到旧页面，怎么排查？】

不要第一反应就是：

> “浏览器缓存有问题。”

应该按照资源依赖链排查。
#### <u>1. 检查 index.html</u>

先确认浏览器拿到的是不是：

```text
最新 index.html
```

查看：

```text
Network
→ index.html
→ Response
```

里面引用的是：

```text
app.newhash.js
```

还是：

```text
app.oldhash.js
```

---
#### <u>2. 检查 HTML 的缓存头</u>

有没有错误配置：

```http
Cache-Control: max-age=31536000
```

如果给 HTML 配了一年强缓存，就容易出现旧入口问题。

---
#### <u>3. 检查 CDN</u>

可能：

```text
Origin
→ 新 HTML

CDN
→ 旧 HTML
```

因此用户虽然经过 CDN，拿到的还是旧入口。

需要检查：

```text
CDN HIT/MISS、Age、缓存规则、缓存刷新
```

---
#### <u>4. 检查部署顺序</u>

错误部署：

```text
先发布 index.html
     ↓
index引用 app.new.js
     ↓
但 app.new.js 还没上传
```

这时用户：

```text
index.html
 ↓
GET app.new.js
 ↓
404
```

因此更安全的顺序一般是：

```text
先发布新 Hash 静态资源
        ↓
确认存在
        ↓
最后发布新的 index.html
```

因为旧资源 URL 和新资源 URL 不冲突，所以可以并存一段时间。

---
### 【Service Worker 又是什么？】

如果普通 HTTP Cache 已经这么强了，为什么还要 Service Worker？

关键区别只有一句话：

> **HTTP Cache 是 HTTP 规则驱动的缓存；Service Worker 提供可编程的请求拦截和响应控制。**

普通 HTTP Cache：

```text
浏览器
 ↓
根据 Cache-Control / ETag
 ↓
决定使用缓存还是网络
```

程序不能随便写：

> “如果今天周五就返回 A 缓存，否则请求网络。”

---

Service Worker 可以：

```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  )
})
```

Service Worker 的 `fetch` 事件能够拦截其控制范围内页面的资源请求，并通过 `respondWith()` 提供自定义 Response。[[8]](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---
### 【Cache Storage 是什么？】

Service Worker 可以通过：

```javascript
caches.open('app-v1')
```

得到一个 Cache：

```text
Cache Storage
└── app-v1
    ├── /index.html
    ├── /app.js
    ├── /style.css
    └── /offline.html
```

这里存储的是：

```text
Request
→
Response
```

映射。

`CacheStorage` 就是浏览器提供的 Cache 集合管理接口，可以 `open()`、`match()` 等。[[9]](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage)

---
### 【为什么 Service Worker 能实现离线访问？】

假设用户第一次正常联网：

```text
页面
 ↓
Service Worker install
 ↓
预缓存
 ↓
Cache Storage
```

例如：

```javascript
cache.addAll([
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/offline.html'
])
```

MDN 也把 `install` 阶段预缓存资源作为 Service Worker 的典型使用方式。[[8]](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

第二次访问：

```text
页面请求 app.js
       ↓
Service Worker fetch
       ↓
caches.match()
       ↓
存在
       ↓
直接返回
```

哪怕：

```text
Internet ❌
```

依然可以：

```text
Service Worker
      ↓
Cache Storage
      ↓
index.html
app.js
style.css
      ↓
页面
```

所以 PWA 可以具有离线能力。

---
### 【Service Worker 生命周期】

Service Worker 这里至少记三个阶段：

```text
install
   ↓
activate
   ↓
fetch
```
#### <u>1. install</u>

通常：

```text
预缓存 App Shell
```

---
#### <u>2. activate</u>

通常：

```text
删除旧 Cache、处理版本升级、接管客户端
```

---
#### <u>3. fetch</u>

运行阶段：

```text
请求
 ↓
选择缓存策略
 ↓
Cache 或 Network
```

MDN 对 `install`、`activate`、`fetch` 的职责也是这样划分的。[[8]](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---
### 【三种 Service Worker 缓存策略】

#### <u>1. Cache First</u>

```text
Request
 ↓
Cache？
 ├─ 有 → 返回
 └─ 无
      ↓
    Network
      ↓
    Cache
```

适合：

```text
图片、字体、带 Hash 的静态资源
```

特点：

> 快，但可能不够新。

---
#### <u>2. Network First</u>

```text
Request
 ↓
Network
 ├─ 成功 → 返回 + 更新缓存
 └─ 失败
      ↓
    Cache
```

适合：

```text
新闻、API 数据、动态页面
```

特点：

> 优先保证新鲜度，断网再降级缓存。

---
#### <u>3. Stale While Revalidate</u>

这是很常见的一种折中策略。

```text
Request
 ↓
Cache
 ↓
立即返回旧数据
      +
后台请求 Network
      ↓
更新 Cache
```

用户：

```text
马上看到内容
```

同时：

```text
缓存后台刷新
```

下一次：

```text
拿到新内容
```

可以理解成：

> **先给旧的，后台更新新的。**

HTTP `Cache-Control` 本身也存在 `stale-while-revalidate` 指令，但在 PWA 中同样常用 Service Worker 手动实现类似的运行时策略。[[4]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)

---
### 【普通 Vue / React 项目为什么通常不需要 Service Worker？】

因为普通网站最核心的问题只是：

```text
资源加载快 + 减少重复请求
```

通常：

```text
Content Hash + HTTP Cache + CDN
```

已经能很好解决。

例如：

```text
JS/CSS
→ Hash + 长缓存

HTML
→ no-cache

静态资源
→ CDN
```

足以覆盖大多数 Web 项目。

引入 Service Worker 以后反而增加一套缓存状态：

```text
HTTP Cache + CDN Cache + Cache Storage + Service Worker版本
```

如果更新策略没有做好，很容易出现：

```text
代码已经发布
但 SW 仍然返回旧资源
```

所以不能回答：

> “Service Worker 缓存更高级，所以项目最好都用。”

而应该回答：

> **只有存在明确的离线能力、PWA、弱网体验、应用壳缓存或复杂可编程缓存需求时，才有必要引入 Service Worker。**

---
### 【最后把整个缓存体系串起来】

假设访问：

```text
https://example.com/assets/app.a81f3.js
```

没有 Service Worker 时：

```text
页面请求资源
     ↓
浏览器 HTTP Cache
     ↓
   HIT？
  ↙    ↘
是      否
↓       ↓
返回    CDN
        ↓
       HIT？
      ↙   ↘
     是    否
     ↓     ↓
    返回  Origin
           ↓
         Nginx
           ↓
         返回资源
```

这条链的目标非常明确：

```text
浏览器缓存
→ 尽量别出用户电脑

CDN
→ 出了用户电脑，也尽量别回源

Nginx / Origin
→ CDN没缓存才真正访问源站
```

---

如果存在 Service Worker，就变成：

```text
页面 Request
     ↓
Service Worker
     ↓
根据程序决定
 ┌──────┼──────────┐
 ↓      ↓          ↓
Cache   Network   Fallback
Storage   ↓
          ↓
      HTTP Cache
          ↓
         CDN
          ↓
        Origin
```

这就是 Service Worker 所谓的：

> **Programmable Network Proxy + Programmable Cache。**

## 3. 完整回答与表达组织

前端完整缓存体系可以从**浏览器、CDN 和源站三个层级**理解，使用 PWA 时还需要考虑 Service Worker。

首先，前端项目生产构建以后，本质上会变成 HTML、JavaScript、CSS、图片和字体等静态资源。这些资源可以部署在 Nginx、对象存储或者其他静态托管服务上，并不代表所有前端项目一定都有一台 Nginx 服务器。在典型前后端分离架构里，Nginx 经常作为 Web Server 或反向代理入口，静态资源可以由它直接返回，而 `/api` 这样的动态请求通过 `proxy_pass` 转发到 Spring Boot、Node 等后端服务；后端如果部署多个实例，还可以继续通过负载均衡进行流量分发。[[1]](https://nginx.org/en/docs/http/ngx_http_core_module.html)

如果接入 CDN，CDN 通常位于用户和源站之间。第一次请求某个静态资源时，如果边缘节点没有缓存，会发生 Cache Miss，CDN 向源站获取资源，也就是回源；资源缓存以后，后续请求如果 Cache Hit，就直接由距离用户较近的 CDN 节点返回，不再访问源站。所以可以理解成：**Nginx 或对象存储提供源站资源，CDN 提供分布式边缘缓存。**[[2]](https://developers.cloudflare.com/cache/concepts/cache-responses/)

在用户浏览器内部还有 HTTP Cache。浏览器缓存解决的是同一个用户重复访问的问题，而 CDN 是多个用户共享的边缘缓存。如果浏览器本地缓存仍然新鲜，可以直接使用缓存，请求甚至不会发送到 CDN；如果浏览器没有可直接使用的缓存，才会继续访问 CDN，CDN 再决定是否需要回源。

浏览器 HTTP 缓存面试中通常分为强缓存和协商缓存。强缓存主要通过 `Cache-Control: max-age` 控制，在缓存仍然 fresh 时直接复用。协商缓存则使用验证器，例如服务器返回 `ETag`，浏览器下次携带 `If-None-Match`；如果资源没有变化，服务器返回 `304`，浏览器继续使用已有缓存。另一套机制是 `Last-Modified / If-Modified-Since`。其中 `no-cache` 不是完全不缓存，而是允许存储，但是再次使用前要求验证；`no-store` 才表示不应存储响应。[[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

生产环境中通常会把 JS、CSS 等静态资源做 Content Hash，例如 `app.a81f3.js`。只要文件内容变化，Hash 和 URL 就变化，因此旧 URL 可以安全长期缓存。对于这种资源，可以使用类似 `Cache-Control: public, max-age=31536000, immutable` 的长期缓存策略；而 `index.html` 一般不能采用同样的长期缓存，因为 HTML 负责引用最新的 JS 和 CSS 文件，如果 HTML 长期停留在旧版本，即使服务器已经发布了新的 Hash 文件，用户仍然会继续请求旧资源。因此 HTML 更适合 `no-cache` 配合 ETag 等验证机制。[[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

如果项目还使用 Service Worker，那么还会多出一套可编程缓存机制。Service Worker 可以监听 `fetch` 事件，拦截受它控制页面的请求，并通过 `respondWith()` 决定返回 Cache Storage 中的响应，还是继续访问网络。Cache Storage 保存的是 Request/Response 对，因此开发者可以实现 Cache First、Network First、Stale While Revalidate 等策略。[[9]](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage)

Service Worker 之所以可以支持 PWA 和离线访问，本质就是**请求拦截 + 可编程 Cache Storage**。在 `install` 阶段可以提前缓存 HTML、JS、CSS 等 App Shell，之后即使网络不可用，`fetch` 事件仍然可以从本地 Cache Storage 返回这些资源，所以页面依旧能够运行。[[8]](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

因此整个缓存体系可以收敛成：

```text
浏览器 HTTP Cache
→ 解决单个用户的重复请求

Service Worker + Cache Storage
→ 解决可编程缓存、离线和 PWA

CDN
→ 解决大量用户共享的边缘缓存和访问延迟

Nginx / Origin
→ 提供源站静态资源，同时可承担反向代理和负载均衡
```

最终可以记一句：

> **前端缓存优化的核心，就是尽量让请求在距离用户最近的一层被解决：浏览器有缓存就不要访问 CDN，CDN 有缓存就不要回源；普通项目主要依赖 HTTP Cache + CDN，而需要离线和可编程缓存时，再通过 Service Worker + Cache Storage 接管请求策略。**

## 4. 参考文献

[1] [Module ngx_http_core_module](<https://nginx.org/en/docs/http/ngx_http_core_module.html>)[EB/OL].

[2] [Cloudflare cache responses · Cloudflare Cache (CDN) docs](<https://developers.cloudflare.com/cache/concepts/cache-responses/>)[EB/OL].

[3] [NGINX Reverse Proxy | NGINX Documentation](<https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy>)[EB/OL].

[4] [Cache-Control header - HTTP | MDN](<https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control>)[EB/OL].

[5] [MDN Web Docs](<https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching>)[EB/OL].

[6] [MDN Web Docs](<https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag>)[EB/OL].

[7] [MDN Web Docs](<https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Last-Modified>)[EB/OL].

[8] [MDN Web Docs](<https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API>)[EB/OL].

[9] [MDN Web Docs](<https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage>)[EB/OL].
