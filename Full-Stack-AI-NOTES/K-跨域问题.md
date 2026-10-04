浏览器跨域问题，跨域的作用，如何解决跨域问题，CORS策略，Nginx基本配置，Vite配置代理服务器。

<!--more-->

## 浏览器中的跨域问题 / CORS策略 / Nginx

> [跨域问题梳理](https://www.yuque.com/tianyu-coder/openshare/aksmvpbebgw7savk#AwdCU)

 补充内容：

1. 跨域请求的作用是什么，举个例子？
2. 为什么同一个域名的不同端口要规定成不同源？
3. 什么是Nginx，Nginx的三大作用？
4. Web服务器的定义是什么？
5. 写一个基础的Nginx代理服务器配置？
6. 写一个基础的Vite脚手架服务器配置？

> [示例代码：Front_End/手写代码/1.跨域问题 at main · cxDlogver/Front_End](https://github.com/cxDlogver/Front_End/tree/main/手写代码/1.跨域问题)

### 1.跨域请求的作用

跨域问题**只作用于浏览器**，一个网页的 JS，不能读取另一个“源”的资源返回结果，防止越权读取其他网站的敏感数据，保护用户安全。

如果**没有跨域限制**，会发生什么？

假设场景（非常危险）

你登录了：

```
https://bank.com
```

浏览器自动保存了你的登录 Cookie。

此时你又访问了一个恶意网站：

```
https://evil.com
```

如果**没有跨域限制**，evil.com 可以在 JS 中直接：

```
fetch("https://bank.com/api/account")
```

浏览器会**自动携带你的 bank.com Cookie**，恶意网站就能读到你的银行信息

### 2.同一个域名的不同端口

| 地址                    | 实际含义                   |
| ----------------------- | -------------------------- |
| `http://127.0.0.1:80`   | Web 服务（Nginx / Apache） |
| `http://127.0.0.1:3306` | MySQL                      |
| `http://127.0.0.1:6379` | Redis                      |
| `http://127.0.0.1:8080` | 后端 API                   |
| `http://127.0.0.1:5173` | 前端开发服务器             |

**同一个 IP，不同端口，通常是完全不同的程序、不同权限、不同信任级别**

浏览器如果只按 IP 判断“同源”，就等于说：“只要在同一台机器上跑的服务，网页就可以互相读数据” 这是非常危险的。

同一个 IP 的不同端口，在浏览器安全模型中被视为“不同应用、不同安全域”，必须隔离，否则任何网页都能攻击用户本地和内网服务。

### 3.什么是Nginx，Nginx的三大作用？

> 本节只从跨域与前后端入口的角度说明 Nginx。Reverse Proxy（反向代理）的完整定义、请求转发链、Upstream、Web Server / Application Server 边界、Docker Runtime 与 Caddy / Nginx 实现统一参考 [反向代理与 Web 入口体系](./F-反向代理与Web入口体系.md)。

> [【狂神说】Nginx最新教程通俗易懂，40分钟搞定！_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1F5411J7vK/?spm_id_from=333.337.search-card.all.click&vd_source=ff414aaf189e3a685358d2a984fd4742)

Nginx 是一个高性能的 http 和 Web 服务器，Nginx 的三大作用：反向代理， 负载均衡， Web服务器（静态资源服务器）

#### 反向代理（Reverse Proxy）

当一个项目面临高并发访问时，单台服务器的计算资源、网络带宽和连接数都存在上限，往往无法同时承载所有请求。为提升系统的并发处理能力和稳定性，实际工程中通常会将同一业务部署在多台服务器上，通过扩展来分摊访问压力。大型互联网平台如腾讯、阿里等，均采用多实例部署，而非依赖单一服务器。

在这种部署模式下，不同服务器通常对应不同的 IP 地址或端口号。如果直接由前端或用户指定访问目标服务器，将导致请求入口分散、调用方式不统一，既增加了前端复杂度，也不利于系统的统一管理与扩展。

因此，现代系统架构的核心思想是在客户端与后端服务之间引入一层统一的访问入口。这一中间层负责对外暴露稳定、规范的访问接口，对内完成请求转发、负载分配与服务隔离。客户端只需面向这一统一入口发起请求，而无需感知后端服务的数量、位置或变化情况。

Nginx 常被用作反向代理入口。客户端访问 Nginx 暴露的公开地址，再由 Nginx 根据配置决定请求转发到哪一个后端服务。

主要作用包括：

- 隐藏后端真实 IP 和端口
- 统一访问入口与域名
- 在统一入口部署中让浏览器以同一 Origin 访问 Web 与 API，从而减少对应的 CORS 场景
- 为后端提供安全隔离

这里需要注意：反向代理并不是 CORS 机制本身。同源策略由浏览器执行；代理只有在让浏览器继续访问同一个 Scheme + Host + Port 时，才会让这一条 Browser Request 保持 Same-Origin。真正的跨源 Client 仍然需要正确配置 CORS。完整边界见 [反向代理与 Web 入口体系](./F-反向代理与Web入口体系.md)。

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

用户访问：

```
http://api.example.com
```

实际上是：

```
Nginx → http://127.0.0.1:8080
```

#### 负载均衡

当你后端不止一个服务实例时：

```nginx
upstream backend {
    server 10.0.0.1:8080;
    server 10.0.0.2:8080;
    server 10.0.0.3:8080;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

Nginx 可以在多个实例之间分配请求流量。轮询、加权轮询等调度策略，提升系统并发能力与稳定性。

#### Web 服务器（静态资源服务）

Nginx 可以直接向客户端提供静态资源，如 HTML、CSS、JavaScript、图片和文件下载。

**为什么不用后端语言来发静态文件？**

因为 Nginx本身的特点：

- Nginx 是 **事件驱动 + 非阻塞 IO**
- 内存占用极低
- 并发能力极强

| 模型       | 特点                     |
| ---------- | ------------------------ |
| 传统服务器 | 一个请求一个线程         |
| Nginx      | 一个线程处理成千上万连接 |

这也是它能扛 **10 万级并发连接** 的原因

### 4.Web服务器的定义是什么？

**Web 服务端**是指**通过 HTTP/HTTPS 协议对外提供 Web 访问能力的服务程序**，负责接收来自浏览器或客户端的请求，并返回符合 Web 协议规范的响应。

从定义上看，Web 服务端的核心特征是两点：

1. 对外监听 HTTP/HTTPS 端口（如 80、443）
2. 按 Web 协议格式处理请求与响应

**一个程序要被称为 Web 服务器，必须满足以下条件：**

1. 长期运行、常驻进程
2. 直接监听 HTTP/HTTPS 端口（80/443）
3. 实现完整的 HTTP 协议处理
4. 能独立向客户端返回合法的 HTTP 响应
5. 以网络与协议处理为主要职责

与之对应的是应用服务器：

**承载具体业务逻辑、数据处理和业务规则的服务进程或服务器**，通常不直接面向公网用户。

后端服务器的核心职责包括：

- 实现业务逻辑（计算、校验、流程控制）
- 数据读写（数据库、缓存、文件系统）
- 对外提供业务接口（API）

常见的后端服务形态包括：

- Java 应用（Spring Boot）
- Python 应用（Flask、FastAPI、Django）
- Node.js 应用（Express、NestJS）

**为什么要把两则分开？**

在早期或小型系统中，Web 服务端和后端服务器可能部署在同一进程或同一台服务器上。但在中大型系统中，通常将二者分离，原因包括：

- Web 层需要承受大量并发连接
- 后端业务层更关注计算与逻辑复杂度
- 职责分离有利于独立扩展和维护
- 提高系统整体稳定性与安全性

这种分层设计体现的是“关注点分离”的工程思想。

### 5.Nginx代理服务器示例

```nginx
worker_processes  1;  # 工作进程数，根据服务器性能调整

events {
    worker_connections  1024;
}

http {
    include       mime.types; # 包含 MIME 类型配置
    default_type  application/octet-stream; # 默认 MIME 类型

    sendfile        on;  # 开启高效文件传输模式
    keepalive_timeout  65;  # 保持连接超时时间，单位秒

    server {
        listen 8088;
        server_name localhost;

        root C:/client; # 静态资源目录
        index index.html; # 将C:/client/index.html作为入口文件

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /api/ {
            proxy_pass http://127.0.0.1:3000/; # 目标服务器源
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }

}

```

### 6.Vite代理服务器示例

```js
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

