# 反向代理与 Web 入口体系建立从公开地址到内部服务的请求边界

反向代理（Reverse Proxy）处在 Client 与真实 Application Service 之间：它先接收外部请求，再根据路由、服务地址和运行状态把请求转发给一个或多个 Upstream（上游服务），最后把上游响应返回给 Client。NGINX 官方对代理流程的描述就是“接收请求 → 发送给被代理服务 → 获取响应 → 返回客户端”；Caddy 的 reverse_proxy 同样把请求代理到一个或多个 Backend，并可以继续组合负载均衡、健康检查和请求修改等能力。[[1]](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/) [[2]](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

这类知识不能只理解成“配置 Nginx / Caddy”。它实际上连接了浏览器网络、服务端请求处理、CORS、静态 Web 部署、Docker 网络和生产入口治理：

~~~text
Browser / App / SDK
        ↓
Public Address
Domain / HTTPS / Port
        ↓
Reverse Proxy / Edge Entry
        │
        ├── Static Web
        ├── API
        ├── Health
        └── Internal Service
                ↓
        Application Runtime
                ↓
       Database / Cache / Worker
~~~

推荐前置阅读：

- [计算机网络连接概述](./计算机网络连接概述.md)
- [浏览器网络面试题](./浏览器网络面试题.md)
- [服务端完整框架体系](./服务端完整框架体系.md)

继续关联：

- [跨域问题](./跨域问题.md)
- [Docker 工程体系](./Docker工程体系.md)
- [Vite 基础进阶和原理剖析](./Vite基础进阶和原理剖析.md)

---

## 1. 反向代理建立公开入口与内部服务之间的边界

### 【没有反向代理时 Client 直接知道 Application Service】

最直接的系统可以是：

~~~text
Browser
  ↓
api.example.com:3000
  ↓
Application Process
~~~

这里 Public Address（公开地址）和 Application Runtime Address（应用运行地址）基本是同一个入口。

这种结构在本地开发、小型服务或受控内部系统中完全可行，但随着系统出现多个服务、多个实例、HTTPS、静态站点和内部接口，Client 如果直接感知每一个运行地址，会把部署拓扑暴露给调用方。

### 【加入反向代理后 Public Address 与 Runtime Address 被拆开】

引入 Reverse Proxy 后：

~~~text
Client
  ↓
https://example.com
  ↓
Reverse Proxy
  ↓
10.0.0.12:3000
  ↓
Application
~~~

Client 只需要知道：

~~~text
Public Address
https://example.com
~~~

而 Proxy 可以知道：

~~~text
Internal Address
10.0.0.12:3000
api:3000
service-a.internal:8080
~~~

因此反向代理创造的第一层价值不是“多转发一次”，而是把：

~~~text
外部如何访问系统
        ↓
与
        ↓
内部服务如何部署
~~~

拆成两个可以独立变化的层。

### 【正向代理与反向代理的区别在于代理站在哪一侧】

Forward Proxy（正向代理）更接近 Client 一侧：

~~~text
Client
  ↓
Forward Proxy
  ↓
External Server
~~~

Reverse Proxy 更接近 Server 一侧：

~~~text
Internet Client
  ↓
Reverse Proxy
  ↓
Internal Server
~~~

可以先记住：

| 类型 | 主要代表谁 | Client 是否直接知道最终 Server |
| --- | --- | --- |
| Forward Proxy | Client | 通常知道目标外部资源，但由 Proxy 代为访问 |
| Reverse Proxy | Server / Service Side | 通常只感知统一入口，不需要知道真实 Backend |

---

## 2. 路由规则把一个公开 URL 空间映射到多个内部处理单元

### 【反向代理先判断请求应该进入哪个 Upstream】

反向代理最基本的工作不是执行业务，而是做请求分流。

例如一个公开域名：

~~~text
https://example.com
~~~

可以在入口层形成：

~~~text
/
        → Static Web

/api/*
        → API Service

/health/*
        → Health Endpoint

/internal/*
        → Internal Service
~~~

于是外部看到的是一个连续 URL Space：

~~~text
https://example.com/
https://example.com/api/users
https://example.com/health/ready
~~~

内部却可以由不同 Runtime 处理。

### 【Host、Path 和其他请求条件都可以参与路由】

常见入口路由可以基于：

~~~text
Host
api.example.com
web.example.com

Path
/api/*
/admin/*
/assets/*

以及实现允许的其他 Request Matcher
Method / Header / Query ...
~~~

Caddy 的 Caddyfile 可以通过 Request Matcher、handle、route 等机制把不同请求送入不同处理分支；同级 handle 可以形成互斥分支。[[3]](https://caddyserver.com/docs/caddyfile/patterns)

### 【路径转发和路径改写是两个概念】

假设浏览器请求：

~~~text
/api/v1/projects
~~~

入口层可能选择：

~~~text
保留路径
/api/v1/projects
        ↓
Backend 仍收到
/api/v1/projects
~~~

也可能配置成：

~~~text
剥离 /api
/api/v1/projects
        ↓
Backend 收到
/v1/projects
~~~

两种方案都存在。

因此不要把：

~~~text
Reverse Proxy
=
自动删除某个 URL Prefix
~~~

当成固定规则。

路径是否保留、替换或重写取决于具体工具与配置。Caddy 中 handle_path 会剥离匹配前缀，而普通 handle 不会自动完成这一行为。[[3]](https://caddyserver.com/docs/caddyfile/patterns)

---

## 3. Reverse Proxy、Web Server、Application Server、Load Balancer 与 Gateway 属于不同职责

很多工具可以同时承担多个角色，因此最容易出现“工具名 = 架构角色”的混淆。

### 【Reverse Proxy 描述的是请求转发角色】

反向代理回答的是：

~~~text
外部 Request
应该送到哪个内部 Service？
~~~

它的核心动作是：

~~~text
Receive Request
      ↓
Select / Resolve Upstream
      ↓
Forward Request
      ↓
Receive Upstream Response
      ↓
Return Response
~~~

### 【Web Server 还可以直接返回静态资源】

Web Server 可以不经过 Application Service，直接返回：

~~~text
HTML
CSS
JavaScript
Image
Font
Download File
~~~

例如：

~~~text
Browser
  ↓ GET /assets/app.js
Caddy / Nginx
  ↓
Filesystem
  ↓
app.js
~~~

所以：

~~~text
Web Server
不一定正在做 Reverse Proxy

Reverse Proxy
也不等于 Static File Server
~~~

只是 Caddy、Nginx 等工具经常同时具备两类能力。

### 【Application Server 负责真正的业务处理】

Application Server 更关注：

~~~text
Route
Authentication
Authorization
Validation
Business Logic
Database
Cache
External Service
~~~

例如：

~~~text
Reverse Proxy
  ↓
Node.js HTTP Server
  ↓
Fastify / NestJS
  ↓
Controller
  ↓
Service
  ↓
Database
~~~

反向代理决定“请求进入哪里”，应用层决定“请求进入以后做什么”。

### 【Load Balancer 是多 Upstream 选择能力】

当同一个服务存在多个实例：

~~~text
Reverse Proxy / Load Balancer
        │
        ├── API Instance A
        ├── API Instance B
        └── API Instance C
~~~

入口层可以选择某个可用实例。

Caddy 的 reverse_proxy 支持多个 Upstream、负载均衡策略以及主动 / 被动健康检查。[[2]](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

因此：

~~~text
Reverse Proxy
可以承担 Load Balancing

但
Reverse Proxy ≠ Load Balancer
~~~

负载均衡还可以存在于更低的网络层，也可以由云 Load Balancer、Kubernetes Service 等其他组件承担。

### 【API Gateway 通常在转发之上继续增加 API 治理】

工程上 API Gateway 往往除了 Routing / Proxy，还会集中处理：

~~~text
Authentication
Rate Limit
Quota
API Policy
Version Routing
Observability
Transformation
~~~

因此可以把二者理解为：

~~~text
Reverse Proxy
核心：流量如何进入内部服务

API Gateway
核心：API 流量如何被统一治理
~~~

二者能力可以重叠，但不能因为某个工具同时支持这些能力，就把两个概念直接等同。

---

## 4. Same-Origin 与 CORS 只约束 Browser 一侧，不等于反向代理本身的定义

### 【Origin 由 Scheme、Host 和 Port 共同决定】

MDN 对 Same-Origin（同源）的定义是：两个 URL 的协议、主机和端口都相同，才属于同一 Origin。[[4]](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)

例如：

~~~text
http://localhost:8080
http://localhost:8080/api/projects
~~~

属于同源。

但：

~~~text
http://localhost:8080
http://localhost:3000
~~~

Port 不同，因此属于不同 Origin。

### 【反向代理可以让 Browser 只访问一个 Origin】

假设：

~~~text
Web
http://localhost:8080

API
http://localhost:3000
~~~

如果 Browser 直接请求：

~~~text
http://localhost:3000/api/projects
~~~

这属于 Cross-Origin Request。

如果入口改成：

~~~text
Browser
  ↓
http://localhost:8080/api/projects
  ↓
Reverse Proxy
  ↓
http://api:3000/api/projects
~~~

浏览器看到的仍然是：

~~~text
Scheme = http
Host   = localhost
Port   = 8080
~~~

因此 Browser → Proxy 这一段可以保持 Same-Origin。

### 【准确说法不是“反向代理解决了所有跨域”】

Same-Origin Policy（同源策略）和 CORS（Cross-Origin Resource Sharing，跨源资源共享）是浏览器安全机制。MDN 说明，浏览器会限制脚本发起的跨源 fetch / XMLHttpRequest；CORS 通过响应头允许符合规则的跨源访问。[[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

因此更准确的关系是：

~~~text
Browser → Same-Origin Proxy
        ↓
浏览器不需要对这一跳做跨源访问

Proxy → Backend
        ↓
这是 Server-side Request
不受 Browser Same-Origin Policy 约束
~~~

但如果系统本身存在真正的跨源 Client：

~~~text
https://shop.example.com
        ↓
https://monitor.example.com/api/collect
~~~

仍然需要正确处理 CORS。

所以：

> **Reverse Proxy 可以通过统一 Browser Origin 减少一部分 CORS 场景，但它不是 CORS 机制本身，也不能让所有跨源调用自动消失。**

---

## 5. 一次代理请求包含 Client-facing 与 Upstream-facing 两个 HTTP Hop

### 【Proxy 不是把 Application Process 直接暴露给 Client】

从逻辑链路看：

~~~text
HTTP Hop A

Client
  ↓
Reverse Proxy


HTTP Hop B

Reverse Proxy
  ↓
Upstream
~~~

Proxy 接收 Client Request 后，再代表 Client 向 Upstream 发起请求。

因此 Backend 直接看到的网络对端通常是 Proxy，而不是最终 Client。

### 【原始 Client 信息需要通过受控 Metadata 继续传递】

Backend 经常仍然需要知道：

~~~text
原始 Client IP
原始 Protocol
原始 Host
Request ID
Trace Context
~~~

常见代理 Header 包括：

~~~text
X-Forwarded-For
X-Forwarded-Proto
X-Forwarded-Host
~~~

Caddy 的 reverse_proxy 默认会设置或增强 X-Forwarded-* Header，同时提供 trusted_proxies 等机制处理受信代理链。[[2]](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

于是链路可以是：

~~~text
Client
  ↓
Proxy
  ↓ add / normalize Forwarded Metadata
Application
  ↓
Request Context
  ↓
Rate Limit / Audit / Redirect / Logging
~~~

### 【Proxy Header 只有在信任边界明确时才可靠】

不能简单认为：

~~~text
Request Header 里写了
X-Forwarded-For: 1.2.3.4

所以
1.2.3.4 一定是真实 Client
~~~

因为 Client 本身也可能构造 Header。

可靠做法需要明确：

~~~text
谁是受信 Proxy
        ↓
哪些 Forwarded Header 可以相信
        ↓
怎样从代理链还原 Client 信息
~~~

当系统从：

~~~text
Client → Caddy → API
~~~

继续演进为：

~~~text
Client
  ↓
CDN / Cloud Load Balancer
  ↓
Caddy
  ↓
API
~~~

Proxy Trust Chain（代理信任链）就必须重新设计。

---

## 6. 静态 Web 部署把 Build Runtime、Server Runtime 与 Browser Runtime 分成三个阶段

反向代理在前端项目里经常和“为什么生产环境不是 Vite Dev Server”一起出现。

### 【Vite Build 负责产生可部署静态资源】

Vite 官方说明，执行 vite build 会生成适合由 Static Hosting Service 提供的 Production Bundle。[[6]](https://vite.dev/guide/build)

因此：

~~~text
React / Vue / TypeScript Source
          ↓
Node.js Build Runtime
          ↓
Vite Build
          ↓
dist/
├── index.html
└── assets/*.js / *.css
~~~

这里的 Vite 主要属于 Build Time。

### 【Production Web Server 负责把 dist 发送给 Browser】

生产环境可以由：

~~~text
Caddy
Nginx
CDN / Object Storage Static Hosting
其他 Static Web Server
~~~

提供 dist。

例如：

~~~text
Browser
  ↓ GET /
Static Web Server
  ↓
index.html
  ↓
Browser
  ↓ GET /assets/app.js
Static Web Server
  ↓
app.js
  ↓
Browser JavaScript Engine
  ↓
React / Vue Runtime
~~~

所以三层职责是：

| 阶段 | 典型 Runtime | 主要职责 |
| --- | --- | --- |
| Build Time | Node.js + Vite | 把 Source 构建成 dist |
| Server Runtime | Caddy / Nginx / Static Hosting | 提供 HTML / JS / CSS，并可代理 API |
| Browser Runtime | Browser JavaScript Engine | 执行前端 JavaScript 并渲染应用 |

### 【Multi-stage Build 常用于只把 dist 带入最终 Web Image】

Docker Multi-stage Build 允许使用多个 FROM 开启不同 Build Stage，并只把需要的 Artifact 复制到最终阶段。[[7]](https://docs.docker.com/build/building/multi-stage/)

典型结构：

~~~dockerfile
FROM node:22 AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM caddy:2
COPY --from=build /app/dist /srv
~~~

因此：

~~~text
Node / npm / pnpm / Vite / Source
         ↓ Build Stage
      dist/
         ↓ COPY --from
Final Runtime Image
         ↓
Caddy + dist
~~~

这与 [Docker 工程体系](./Docker工程体系.md) 中的 Build / Runtime 边界完全一致。

### 【SPA 还需要 Server-side Fallback】

Single Page Application（SPA，单页应用）使用 Client-side Router 时：

~~~text
用户直接访问
/projects/123
~~~

服务器文件系统通常并不存在：

~~~text
/projects/123
~~~

因此 Static Web Server 常配置：

~~~text
请求真实文件存在
        ↓ Yes
直接返回文件

        ↓ No
Fallback /index.html
        ↓
Browser 启动 SPA
        ↓
Client-side Router 匹配 /projects/123
~~~

Caddy 官方给出的 SPA 模式也是通过 root、try_files 与 file_server 完成静态文件和 index.html Fallback，并可以同时用 /api/* 分支代理 Backend。[[3]](https://caddyserver.com/docs/caddyfile/patterns)

---

## 7. Edge Layer 可以继续承担 TLS、压缩、负载均衡和访问边界

反向代理建立统一入口以后，很多与“请求进入系统”有关的能力都可以集中到 Edge Layer（边缘入口层）。

### 【TLS Termination 把 HTTPS 入口集中到 Proxy】

常见结构：

~~~text
Client
  ↓ HTTPS
Edge Proxy
  ↓ HTTP / HTTPS
Internal Service
~~~

Caddy 支持基于站点地址自动管理 HTTPS，也可以作为 HTTPS Reverse Proxy 入口。[[8]](https://caddyserver.com/docs/quick-starts/https)

但需要区分：

~~~text
TLS Termination
是 Edge 可承担的能力

不是
Reverse Proxy 定义本身
~~~

### 【多个 Upstream 可以继续形成 Load Balancing 与 Health Check】

~~~text
Proxy
  │
  ├── API A
  ├── API B
  └── API C
~~~

此时入口层可以根据负载均衡策略选择实例，并通过健康检查避免把请求继续发给不可用实例。Caddy 的 reverse_proxy 原生支持这些能力。[[2]](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

### 【Compression 与 Response Header 可以集中治理】

当 Static Response 与 API Response 都经过统一入口时，可以集中处理：

~~~text
Compression
Security Header
Cache Policy
Access Log
Request ID
部分 Network Access Policy
~~~

但工程上必须判断职责边界：

~~~text
Proxy 层
适合入口级、协议级、网络级策略

Application 层
适合业务身份、业务权限、领域规则
~~~

例如 Project Membership、订单权限、数据字段权限等业务 Authorization 不应该仅靠反向代理完成。

---

## 8. 部署拓扑决定反向代理是否是当前请求链的必要节点

### 【单应用可以直接暴露 Application Port】

最简单部署：

~~~text
Internet
  ↓
Application :3000
~~~

此时并不要求一定存在 Reverse Proxy。

### 【多个 Runtime 常使用统一 Edge Entry】

例如：

~~~text
Internet
  ↓
:443
Reverse Proxy
  │
  ├── /       → Web
  ├── /api/*  → API
  └── /health → API
~~~

Client 不需要知道内部 Runtime Address。

### 【Docker 中要区分 Container Port 与 Published Port】

在 Compose 中：

~~~text
Web / Proxy Container
Published :8080
        ↓
Docker Network
        ↓
API Container :3000
~~~

同一 Docker Network 内部可以通过 Service Name 通信：

~~~text
api:3000
~~~

但 Host Browser 不会因为 Docker DNS 存在，就自动能够访问 api:3000。

这部分继续参考 [Docker 工程体系](./Docker工程体系.md)。

### 【云平台或 Kubernetes 可以重新分配 Edge Responsibility】

系统可能进一步演进为：

~~~text
Internet
  ↓
Cloud Load Balancer / CDN / Ingress / Gateway
  ↓
Web / API Service
~~~

此时某个 Web Container 内部的 Caddy / Nginx 是否仍然需要，取决于上层平台已经承担了哪些职责。

因此正确问题不是：

~~~text
“项目是否必须使用 Caddy？”
~~~

而是：

~~~text
“当前系统需要哪些 Edge Responsibility，
这些职责分别由哪一层承担？”
~~~

工具可以替换，职责不会凭空消失。

---

## 9. Caddy 与 Nginx 都可以实现静态 Web 与 API 代理，但配置模型不同

### 【Caddy 可以把 API Branch 和 SPA Branch 放在一个 Site 中】

一个通用示例：

~~~caddyfile
example.com {
  handle /api/* {
    reverse_proxy api:3000
  }

  handle {
    root * /srv
    try_files {path} /index.html
    file_server
  }
}
~~~

这表达：

~~~text
/api/*
  → Backend

其他路径
  → Static Web
  → SPA Fallback
~~~

Caddy 官方 Common Patterns 也给出了静态文件、API Proxy 和 SPA Fallback 的组合方式。[[3]](https://caddyserver.com/docs/caddyfile/patterns)

### 【Nginx 可以通过 location 和 proxy_pass 建立相同入口模型】

一个通用示例：

~~~nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://api:3000;
    }

    location / {
        root /srv;
        try_files $uri /index.html;
    }
}
~~~

它表达的仍然是：

~~~text
Public Entry
      ↓
Path Routing
      │
      ├── API → Upstream
      └── Web → Static Files
~~~

NGINX 官方文档对 proxy_pass、请求 Header 调整和 Response Proxying 有完整说明。[[1]](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

因此学习时应该先掌握架构角色：

~~~text
Reverse Proxy
Static File Server
Routing
Upstream
Forwarded Metadata
~~~

再学习：

~~~text
Caddyfile
nginx.conf
Ingress Rule
Gateway Route
~~~

具体配置语法。

---

## 10. 反向代理知识最终连接浏览器、服务端、Docker 与项目答辩

### 【完整知识链从 Browser Origin 一直延伸到内部 Runtime】

可以把整个知识点压缩成：

~~~text
Browser
  ↓
URL / Origin
  ↓
Public Entry
  ↓
Reverse Proxy
  │
  ├── Static Web
  │      ↓
  │    Browser Runtime
  │
  └── API
         ↓
      HTTP Server
         ↓
      Framework
         ↓
      Business
         ↓
      Data
~~~

再叠加运行视角：

~~~text
Source
  ↓
Build
  ↓
Artifact
  ↓
Container / Host
  ↓
Internal Service Address
  ↓
Reverse Proxy
  ↓
Public Address
~~~

这使反向代理同时成为下面几条知识链的交点：

| 上游知识 | 在反向代理处解决的问题 | 下游知识 |
| --- | --- | --- |
| 浏览器 Origin / CORS | Browser 访问哪个公开 Origin | CORS、Cookie、CSRF |
| HTTP | Request / Response 如何被转发 | HTTP Server、Framework |
| Vite Build | dist 由谁对外提供 | Static Web Server |
| Docker Network | 内部 Service 如何互相发现 | Service Name、Port Publishing |
| Deployment | 哪些 Service 应该暴露公网 | TLS、Gateway、Ingress |
| Security | 哪些 Proxy Metadata 可以信任 | trustProxy、Audit、Rate Limit |

### 【常见误区需要在面试和答辩中主动区分】

| 常见表述 | 更准确的理解 |
| --- | --- |
| “反向代理就是 Nginx” | Nginx / Caddy 是实现工具，Reverse Proxy 是架构角色 |
| “用了反向代理就没有 CORS” | 只有 Browser 通过统一 Origin 访问时减少相应跨源场景，真实 Cross-Origin Client 仍需要 CORS |
| “Vite 是生产 Web Server” | vite build 负责构建；生产静态资源可以由 Caddy、Nginx、CDN 等提供 |
| “反向代理一定要做负载均衡” | 单个 Upstream 也可以使用 Reverse Proxy |
| “X-Forwarded-For 就是真实 IP” | 只有在可信 Proxy Chain 配置正确时才可靠 |
| “API Gateway 等于 Reverse Proxy” | Gateway 通常在转发之外继续承担 API 治理能力 |
| “应用有 /api 路由，所以不需要入口代理” | Application Route 与 Public Entry / Internal Runtime Address 是不同层级 |

### 【面试回答应先讲位置，再讲能力，最后落到工程取舍】

如果被问：

~~~text
什么是反向代理？项目为什么需要它？
~~~

回答路径可以是：

> 反向代理位于 Client 和真实 Application Service 之间，先接收外部请求，再根据路由把请求转发到内部 Upstream。它最核心的价值是把 Public Entry 和 Internal Runtime Address 解耦。工程上它还经常承担 Path Routing、静态资源服务、TLS、负载均衡、健康检查和统一响应策略。在前后端应用中，它可以让 Browser 只访问一个 Origin，但这只是减少一部分 CORS 场景，并不等于 CORS 本身。是否需要这一层要看部署拓扑：如果 Backend 不直接暴露公网、多个 Runtime 需要统一入口，Reverse Proxy 就会成为请求链中的重要节点。

答辩时不要只说：

~~~text
“项目用了 Caddy / Nginx 解决跨域。”
~~~

而应该继续说明：

~~~text
原本有哪些 Runtime
        ↓
Public Entry 怎么设计
        ↓
请求按什么规则分流
        ↓
内部地址怎样隐藏
        ↓
为什么 Browser URL 不需要感知部署变化
        ↓
Proxy 删除以后哪些职责必须迁移
~~~

---

## 11. Browser Monitor 提供 Caddy 反向代理的项目实践入口

本篇只维护通用知识，不复制具体项目配置。

Browser Monitor 的真实实现已经单独记录：

- [Browser Monitor：反向代理与 Caddy 源码学习](https://github.com/cxDlogver/browser-monitor/blob/main/docs/%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86%E4%B8%8ECaddy%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0.md)

该实践文档进一步展示：

~~~text
Dockerfile.web
        ↓
Vite Build
        ↓
dist
        ↓
Caddy Runtime
        ↓
Static Web + Reverse Proxy
        ↓
Backend Private Address
~~~

以及 Caddyfile 中 API、Health、Internal、SPA Fallback、Forwarded Header 和部署地址抽象等真实工程实现。

通用知识与项目实践保持：

~~~text
知识体系索引
        ↓
本篇通用知识
        ↓
Browser Monitor 实践文档
        ↓
真实 Dockerfile / Caddyfile / Runtime Topology
~~~

---

## 12. 参考文献

1. NGINX Documentation, **NGINX Reverse Proxy**：https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
2. Caddy Documentation, **reverse_proxy (Caddyfile directive)**：https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
3. Caddy Documentation, **Common Caddyfile Patterns**：https://caddyserver.com/docs/caddyfile/patterns
4. MDN, **Same-origin policy**：https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy
5. MDN, **Cross-Origin Resource Sharing (CORS)**：https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
6. Vite Documentation, **Building for Production**：https://vite.dev/guide/build
7. Docker Documentation, **Multi-stage builds**：https://docs.docker.com/build/building/multi-stage/
8. Caddy Documentation, **HTTPS quick-start**：https://caddyserver.com/docs/quick-starts/https
