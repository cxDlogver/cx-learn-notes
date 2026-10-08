# Web 多级缓存与离线资源完整知识体系

HTTP 缓存体系的核心并不是背诵“浏览器先强缓存、再协商缓存、然后 CDN、最后 Nginx”，而是从**请求能否直接复用已有响应**这一问题出发，沿不同缓存位置检查**存储资格 → 缓存键匹配 → 新鲜度 → 条件验证/过期复用 → 返回或回源**。不同位置共享部分 HTTP 缓存语义，但有不同的管理能力；Service Worker / Cache Storage 则属于应用可编程缓存，必须额外理解其拦截和更新逻辑。

本篇作为 [Web 性能优化工程体系](./W-Web性能优化工程体系.md) 中“① 网络传输优化”的缓存机制专项主入口，完整覆盖浏览器 HTTP 缓存、CDN 边缘共享缓存、Nginx 静态文件与代理缓存、源站响应、Service Worker / Cache Storage、资源版本发布及离线访问。资源压缩和资源优先级仍归 [③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)；SSR 页面结果缓存、ISR 等内容生成机制归 [Web 渲染架构](./W-Web渲染架构.md)，本篇仅解释与 HTTP 多级缓存交汇的部分。

## 1. 多级缓存沿请求路径组织，但每一层使用同一套基本判断语义

### 【一次资源请求可能被不同位置的响应副本提前满足】

~~~text
浏览器页面需要资源或 HTML
            ↓
【浏览器侧：两种不同机制】
  ├─ 受 Service Worker 控制的请求：
  │    fetch 事件 → 按应用策略查询 Cache Storage、发起网络或离线回退
  │
  └─ 浏览器 HTTP Cache：
       根据请求缓存模式、缓存资格、新鲜度与验证结果复用响应
            ↓ 仅当当前处理未直接给出可用响应
【CDN 边缘节点，可选】
  → Cache Key / 变体 / 共享资格
  → 新鲜命中则返回，过期按规则验证或允许暂用旧内容
            ↓ 未命中 / 需要验证或刷新
【源站入口：Nginx / 其他 Web Server，可选】
  ├─ 静态路径：从本地文件或静态存储直接提供内容
  ├─ 代理缓存路径：命中反向代理缓存则复用
  └─ 反向代理路径：将请求转发给应用或其他上游
            ↓ 只有需要动态处理时才继续
【应用服务器与数据服务】
  → 生成 API、SSR HTML 或其他动态表示
            ↓
响应沿实际路径返回
  → 具备存储资格的缓存可独立存储副本及元数据
~~~

这是一张**逻辑分工图，不是所有请求的固定调用栈**。Service Worker 控制请求时可用 Cache Storage 直接响应，也可调用 fetch() 进入浏览器网络栈（其中可能使用 HTTP 缓存）。未部署 Service Worker 的站点无需经过这层；未接入 CDN 的站点也不会有边缘缓存；Nginx 可直接提供静态内容，无须访问应用服务器。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

缓存通常分为**私有缓存（Private Cache）**和**共享缓存（Shared Cache）**：浏览器 HTTP 缓存主要供某个用户代理使用，CDN 和启用代理缓存的 Nginx 可供符合共享条件的请求复用。缓存“在浏览器或服务端”只说明其位置，**不能单独决定能否安全缓存**。

### 【每个 HTTP 缓存层都应回答五个决策问题】

~~~text
收到 Request（请求）
     ↓
① 能不能存？——状态码 / 方法 / Cache-Control / 鉴权安全
     ↓
② 与哪个已有副本匹配？——Cache Key / Vary / 变体
     ↓
③ 副本还新鲜吗？——Age 与 max-age / s-maxage / Expires
     ├─ 是：允许时直接使用缓存副本
     └─ 否：是否允许使用过期副本？
               ├─ 允许：stale-while-revalidate 或容错策略
               └─ 不允许：进行条件验证或获取新内容
                             ↓
④ ETag / Last-Modified 验证
     ├─ 304：更新缓存元数据，复用存储的响应正文
     └─ 200：取得新表示，视规则替换或存储
                             ↓
⑤ 返回响应，并决定何时更新、淘汰或删除
~~~

这里“能不能存”与“能不能对当前请求复用”是不同决策：已存储不代表当前仍新鲜，也不代表可以跨用户共享。上述五步是不同缓存节点可复用的**判断模型**，不会意味着每次请求都必须发起五次网络操作。HTTP 缓存复用、年龄计算、验证器与共享规则由 RFC 9111 定义。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

### 【HTTP Cache 与 Cache Storage 属于不同存储控制模型】

| 维度 | HTTP Cache（浏览器/CDN/代理） | Cache Storage（浏览器可编程） |
| --- | --- | --- |
| 谁决定匹配和复用 | HTTP 协议语义与缓存实现/部署策略 | 应用脚本选择 Cache.match、put、delete 等 |
| 新鲜度管理 | Cache-Control、Age、Expires、验证器 | 不自动执行 HTTP 过期规则，应用需自行实现 |
| 常见存储内容 | 可缓存的 HTTP 响应及相关元数据 | Request/Response 配对 |
| 是否可能跨用户复用 | 私有缓存通常不共享；CDN/代理可能共享 | 由浏览器源、存储分区及应用控制的缓存空间决定，不是 CDN |
| 典型用途 | 减少网络往返、传输及回源 | 离线应用壳、指定资源预缓存、运行时定制策略 |

Cache Storage 可以由 Window 或 Worker 使用，**不依赖一定注册 Service Worker 才能调用**；但要拦截页面导航与资源请求、实现离线优先，通常需要 Service Worker 的 fetch 事件。二者与 HTTP Cache 不能混成一个“强缓存→协商缓存→离线缓存”的固定三段流程。

## 2. HTTP 缓存通过存储资格、响应变体和新鲜度决定能否复用

### 【缓存资格首先约束响应是否允许保存与共享】

HTTP 响应缓存必须考虑请求方法、状态码、授权、响应指令和共享资格。常见 Cache-Control 指令的区别：

| 响应指令 | 含义 | 关键边界 |
| --- | --- | --- |
| public | 允许满足协议条件的响应进入共享缓存 | 不代表不经过权限隔离就可以缓存私有数据 |
| private | 限制共享缓存存储，允许适当的私有缓存 | 不保证业务数据天然安全 |
| no-store | 要求缓存不要存储当前响应相关内容 | 不等于主动清理所有历史副本 |
| no-cache | 可以存储，但复用前必须成功验证 | 与“不准缓存”不是同义词 |
| max-age=N | 定义响应新鲜度期限（秒） | 不是硬性保证文件在 N 秒后物理删除 |
| s-maxage=N | 为共享缓存指定新鲜度期限 | 浏览器私有缓存不靠它覆盖 max-age |
| must-revalidate | 响应一旦过期，不得未经成功验证就直接复用 | 对故障时返回过期数据提出严格限制 |

请求携带 Authorization 时，**共享缓存的复用受到额外协议约束**；服务器响应如果可能根据 Cookie、用户 ID、角色或权限变化，还需要确保响应不能被其他访问者不当地复用。不能仅凭请求 URL 相同就认定可共享。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

### 【缓存键决定哪个副本与请求匹配】

HTTP 缓存键至少包含请求方法和目标 URI 等信息；响应头 Vary 可要求缓存匹配某些请求头形成的响应变体。例如压缩协商：

~~~http
Vary: Accept-Encoding
~~~

如果同一 URL 根据内容语言产生不同表示，可能需要 Vary: Accept-Language；但随意将 Cookie、Authorization 等高基数字段加入 CDN 缓存键并不自动等价于安全隔离。

CDN 通常还提供业务自定义 Cache Key 策略，例如包含或排除指定 Query 参数、选取 Host、Header；**该配置可能比原始 URL 更复杂，且可能改变缓存命中与安全语义**。例如忽略一个实际影响响应内容的查询参数，会将不同内容错误合并为同一副本；反之加入大量无关参数可能降低命中率。

### 【过期时间用于判断新鲜度，不负责通知文件更新】

示例响应：

~~~http
Cache-Control: public, max-age=600, s-maxage=3600
Date: Thu, 08 Oct 2026 07:00:00 GMT
ETag: "asset-v12"
~~~

在其他条件允许时，浏览器私有缓存依据 max-age=600 的新鲜度期限，共享缓存可以依据 s-maxage=3600。它们是**各自的存储与复用决策**，并不是浏览器先缓存十分钟、十分钟后 CDN 自动再缓存一小时的分段执行过程。

在计算年龄时，缓存需要考虑 Date、Age 以及传输和驻留时间。Expires 是绝对过期日期，适用的 max-age 通常优先于 Expires；s-maxage 对共享缓存优先于 max-age/Expires。资源被判为 stale（已过期）表示不能再无条件按普通新鲜副本使用，**不表示对应缓存文件已经从磁盘消失**。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

如果不显式设置新鲜度，部分状态码和响应仍可能使用启发式缓存，因此对需要清晰更新语义的站点应明确设置缓存头，而不是依赖浏览器猜测。[[2]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

### 【“强缓存”与“协商缓存”是同一份响应的两种使用路径】

前端常用“强缓存”描述**新鲜副本直接复用**，通常不用为本次复用发出验证网络请求；“协商缓存”描述**副本需要验证后才能复用**的条件请求路径。

~~~text
再次需要 /app.js
       ↓
HTTP Cache 有没有适用的已存副本？
       ├─ 没有 → 请求网络，取得可存储响应
       └─ 有 → 该副本对这次请求是否可直接复用？
                  ├─ 是 → 返回本地正文（强缓存）
                  └─ 否 → 能否构造条件请求？
                             ├─ 有验证器 → 条件 GET
                             └─ 无验证器 → 一般重新取得表示
~~~

**协商缓存并不是另一个存储区域**：ETag/Last-Modified 附着在已有响应的验证语义上。当响应无须验证或请求缓存模式要求绕过缓存时，处理路径也会有所不同。按刷新、强制刷新、fetch cache mode 或 DevTools“Disable cache”得到的行为，不能直接替代普通用户导航下的默认缓存行为。[[2]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

## 3. 条件请求通过 ETag 和 Last-Modified 确认表示是否改变

### 【验证器区分的是“内容版本是否匹配”，不是资源必须重新下载】

ETag（Entity Tag，实体标签）是服务端为某个选定 HTTP 表示提供的验证标识；它并不必然是文件内容的加密 Hash。Last-Modified（最后修改时间）由服务端声明其认定的最后修改日期。二者分别通过条件请求头重新验证：[[3]](https://www.rfc-editor.org/rfc/rfc9110)

| 响应验证器 | 后续请求条件 | 判定含义 |
| --- | --- | --- |
| ETag: "v12" | If-None-Match: "v12" | 当前选定表示是否与已有 ETag 匹配 |
| Last-Modified: 日期 | If-Modified-Since: 日期 | 资源在给定时间以后是否修改 |
| ETag: W/"v12" | If-None-Match: W/"v12" | 弱验证器用于语义等价性判断，不能当作字节完全一致 |

**同时提供两种验证条件时，If-None-Match 的判断优先于 If-Modified-Since**。ETag 可以避免只有秒级修改时间造成的部分变化识别问题，但 ETag 的生成和跨节点一致性仍须由实际服务器实现保证。

请求与响应示意：

~~~http
GET /app.js HTTP/1.1
Host: example.com
If-None-Match: "v12"
If-Modified-Since: Wed, 07 Oct 2026 10:00:00 GMT
~~~

若当前表示仍与验证器匹配，服务器或具备对应能力的中间缓存可以响应：

~~~http
HTTP/1.1 304 Not Modified
ETag: "v12"
Cache-Control: public, max-age=600
~~~

304 没有重新发送完整资源正文；客户端或中间缓存根据规范将验证结果与已有响应数据配合使用。如果内容变更则通常响应 200 OK 并提供新的正文。**304 不等于没有网络请求**，也不能将“304 来自 CDN”误判为一定访问了应用服务器。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

### 【不同层级可能各自处理条件验证】

~~~text
浏览器已有旧响应，需要验证
     ↓ If-None-Match: "v12"
CDN 取得条件请求
     ├─ 持有适用的、仍新鲜的副本并能够验证 → 可能直接答复 304
     └─ 自身也需向上游验证 → 发起上游条件请求
                                       ↓
                              Nginx / 源站验证
                               ├─ 未修改 → 304
                               └─ 已修改 → 200 + 新正文
     ↓
浏览器更新缓存元数据或替换响应副本
~~~

不是“浏览器一旦协商缓存失效，就必须跳过 CDN 到应用服务器”。每个中间节点都可能持有副本、执行自己的验证，并为下游提供适当响应。304 的具体生成者需要结合 CDN 日志、Age、Cache-Status 或供应商命中字段判断。

## 4. CDN 缓存通过边缘共享副本减少回源并控制内容变体

### 【CDN 主要减少地域传输和重复访问源站】

CDN 缓存通常位于访问者和源站之间，接收到请求后按其 Cache Key 和资源缓存规则决定是否复用边缘副本：

~~~text
Browser → CDN Edge
              ↓
      资源是否有适用的缓存副本？
        ├─ HIT 且可直接复用 → 边缘返回
        ├─ STALE 且允许过期复用 → 返回旧副本，触发验证/刷新
        └─ MISS / 必须验证 → 请求上游
                                  ↓
                       Nginx、对象存储或应用源站
                                  ↓
                       更新边缘副本并响应浏览器
~~~

源站可能是 Nginx、本地静态资源服务、对象存储或应用服务器；**CDN 后面不强制必须再配置一层 Nginx**。一个 CDN 产品也可能存在多级边缘/中间层缓存，不能把“CDN”当作一个固定物理服务器。

### 【缓存键、共享权限与响应头共同决定安全的 HIT】

缓存命中除了要求 Cache Key 匹配，还要受方法、状态码、Vary、Cache-Control、Authorization 和 CDN 自定义规则约束。

对公开不可变 JS/CSS/图片可采用高复用策略；对带用户 ID、Cookie、个人信息、授权结果的页面或 API，必须防止共享副本跨用户泄漏。不能简单通过只保留路径、忽略所有 Query 或 Cookie 来提高命中率；也不能认为只要配置 private 就能代替应用自己的访问控制。

CDN 的缓存资格、默认 TTL、查询参数策略、Cookie 处理、Cache Purge、分层回源与故障兜底，都具有供应商差异。文档只将 RFC 定义作为通用规则，实际项目还需验证服务商配置。

### 【过期时有三种不同决策：阻塞验证、后台更新和失败兜底】

**普通再验证**：副本过期，等待上游结果后才决定返回旧正文还是新正文。

**stale-while-revalidate（SWR）**：在明确允许的窗口里先复用过期响应，并在后台执行验证或刷新。

**stale-if-error**：在符合策略的时间范围内，上游错误时可以提供已有过期副本作为降级响应。

这些是不同的过期使用策略，并不等价于“只要 CDN 有老缓存，就能永久返回”。尤其必须确认业务是否允许返回过期数据，并尊重 no-cache、must-revalidate 等对复用条件的约束。[[4]](https://www.rfc-editor.org/rfc/rfc5861)

### 【SWR 的准确时间线是新鲜期与额外过期容忍窗口】

~~~http
Cache-Control: public, max-age=600, stale-while-revalidate=30
~~~

~~~text
响应被缓存
   ↓
第 0～600 秒：新鲜期 → 可直接命中返回
   ↓
第 600～630 秒：额外容忍的过期窗口
     ├─ 当前请求可能立即收到旧响应
     └─ 缓存可在后台发起重新验证，取得新元数据或新内容
   ↓
超过额外窗口且仍未成功刷新
   → 一般不能再仅凭该指令直接使用旧副本，须按正常规则处理
~~~

要注意：**SWR 不是固定的定时任务**。如果资源在额外窗口内没有请求，并不保证缓存会主动刷新；再次请求可能需要等待验证。SWR 的 HTTP 指令可能由浏览器、CDN 或代理按自身支持范围实现；它与 Nuxt 页面生成策略中使用同名 SWR 的工程接口、Service Worker 程序中手写 stale-first 行为有联系但不等价。[[4]](https://www.rfc-editor.org/rfc/rfc5861)

## 5. Nginx 需要区分静态 Web Server 与真正启用了缓存的反向代理

### 【Nginx 能直接返回文件，并不意味着“它在进行代理缓存”】

Nginx 在部署中常承担公开 HTTP 入口、TLS 终止、静态文件服务、反向代理、负载均衡等职责，但是否启用代理缓存要看实际配置：

| Nginx 工作模式 | 请求怎样完成 | 哪种资源复用 |
| --- | --- | --- |
| 静态文件服务 | 按 root/alias 找到文件并直接响应 | 操作系统文件缓存及 Nginx 静态文件处理；可向浏览器/CDN发送 HTTP 缓存头 |
| 反向代理但不缓存 | proxy_pass 将请求转发至上游，每个请求通常到达上游 | 代理自身不保存可复用 HTTP 响应副本 |
| 反向代理并启用 proxy_cache | 按配置的缓存键、响应资格和新鲜度检查已有上游响应 | Nginx 可以成为一层独立的共享 HTTP Cache |
| 其它静态托管源站 | 对象存储、托管平台直接给出文件 | 不一定存在 Nginx，也不一定有应用服务器 |

静态文件“存在于磁盘上”并不等于“缓存副本已经失效或即将失效”。Nginx 静态文件可以一直存在直到部署替换或删除，HTTP Cache-Control 影响的是**下游浏览器/CDN 能否复用响应**；若没有额外配置，不能把磁盘文件自动解释为 proxy_cache。[[5]](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)

### 【Nginx 静态资源处理是文件映射与响应头管理】

示意部署：前端构建文件位于 /srv/site/assets/，静态资源带内容 Hash，且文件 URL 发布后不可原地更改。

~~~nginx
server {
    listen 80;
    root /srv/site;

    # 带内容版本的静态构建产物。该示例假设 /assets/ 只发布不可变文件。
    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # HTML 用于发现新版资源，允许存储但每次复用前验证。
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    # 单页应用路由回退，示例未覆盖鉴权与完整部署需求。
    location / {
        try_files $uri $uri/ /index.html;
    }
}
~~~

try_files 负责按映射位置查找文件或内部跳转；示例里的 /assets/ 路径未命中会返回 404，不会自动去应用服务器。**不能将 SPA fallback 用在所有静态文件上**，否则构建资源缺失时可能返回 HTML 而不是正确的 JS/CSS 资源，产生 MIME 类型及部署错误。[[5]](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)

这里的 max-age 需要与 URL 不变性和发布顺序配合。若构建产物不带内容版本或允许原地覆盖，则不宜无条件设置一年 immutable。

### 【Nginx proxy_cache 才是源站入口上的 HTTP 响应缓存】

以下演示一个**明确声明为可公开共享的只读 API** 的缓存路径。配置为示意片段，实际生产要按应用鉴权、响应头、代理路径、磁盘和超时要求审查：

~~~nginx
http {
    proxy_cache_path /var/cache/nginx/public_api
        levels=1:2 keys_zone=public_api_cache:10m
        max_size=1g inactive=30m use_temp_path=off;

    upstream app_backend {
        server 127.0.0.1:3000;
    }

    server {
        listen 80;

        # 仅对经过业务确认可共享的公开只读数据开启缓存。
        location /public-data/ {
            proxy_pass http://app_backend;
            proxy_cache public_api_cache;
            proxy_cache_key "$scheme$request_method$host$request_uri";
            proxy_cache_valid 200 5m;
            proxy_cache_revalidate on;
            proxy_cache_lock on;

            add_header X-Cache-Status $upstream_cache_status;
        }

        # 其它需登录或个性化的 API 不在此示例中缓存。
        location /api/ {
            proxy_pass http://app_backend;
        }
    }
}
~~~

这些指令分别表示：

- **proxy_cache_path**：设置磁盘缓存路径、共享元数据区、容量与不活跃清理参数；inactive 不是响应的 HTTP TTL。
- **proxy_cache**：启用某个缓存区；没有这一步就不应声称反向代理在复用上游响应。
- **proxy_cache_key**：定义 Nginx 用什么信息区分响应副本；若响应依身份、语言或其它输入变化，必须同时正确处理变体与共享安全。
- **proxy_cache_valid**：在没有更高优先级的适用上游缓存元数据时，提供特定状态码的缓存有效期。
- **proxy_cache_revalidate**：启用通过 If-Modified-Since / If-None-Match 对过期缓存项做条件验证。
- **proxy_cache_lock**：对缓存填充期间的同一个缓存键适用的请求进行协调，减少热点 MISS 同时回源的风险。
- **X-Cache-Status**：本示例用于调试显示 Nginx 的上游缓存状态，它不是 RFC 强制的标准 HTTP 响应字段。

Nginx 的缓存行为还受 Cache-Control、Expires、X-Accel-Expires、Set-Cookie、Vary 和上游响应条件影响。**proxy_cache_valid 不应被理解为能够覆盖所有不允许存储的响应规则**；是否需要跳过缓存应先从响应语义与业务安全出发。[[6]](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

### 【Nginx 的过期缓存使用与 SWR 有相似目标，但配置语义不完全相同】

Nginx 可以通过 proxy_cache_use_stale 的 updating、error、timeout 等条件，在允许的情况下返回旧副本；结合 proxy_cache_background_update 等能力可以安排后台更新，具体行为还取决于版本、配置和响应规则。

它们可能达到与 HTTP stale-while-revalidate **相近的“旧结果先返回、后台刷新”效果**，但不能把 Nginx 的代理参数、CDN 的供应商缓存策略和 Cache-Control: stale-while-revalidate 当成同一个自动生效的开关。[[6]](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

Nginx 的部署路由、静态文件与应用服务器职责详情见 [反向代理与 Web 入口体系](./F-反向代理与Web入口体系.md)。本篇只解释 Nginx 与响应缓存的关系，不重复通用反向代理的全部知识。

## 6. Service Worker 和 Cache Storage 为网页提供离线和可编程缓存能力

### 【Service Worker 可以为受控页面的请求选择不同响应来源】

Service Worker 是浏览器管理的独立脚本，可在控制范围内收到 fetch 事件，选择由缓存、网络或自己构造的 Response 满足请求；它不是部署在 CDN/Nginx 上的一台“额外服务器”。现代浏览器通常要求安全上下文（HTTPS；localhost 等本地可信环境可用于开发测试）。[[7]](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

~~~text
页面已经被激活的 Service Worker 控制
                ↓
页面导航或资源请求触发 fetch 事件
                ↓
业务定义的缓存策略
    ├─ 立即返回 Cache Storage 中的 Response
    ├─ fetch() 走网络获取 Response，再选择是否保存
    ├─ 网络失败时返回离线页面 / 已存响应
    └─ 不调用 respondWith → 继续默认 Fetch 流程
                ↓
响应返回给发起请求的页面
~~~

Service Worker 不是首次安装后立刻控制所有已经打开的页面；install、activate、clients 控制与版本接管有自己的生命周期。它能拦截受控请求，不表示所有页面与资源默认就离线可用。[[7]](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

### 【Cache Storage 保存 Request/Response，但不自动执行 HTTP TTL】

CacheStorage.open() 可以取得某个命名 Cache；Cache.match() 查找与 Request 适配的 Response；Cache.put() 保存配对；Cache.delete() 和 CacheStorage.delete() 删除条目或缓存集。

与 HTTP 缓存不同，Cache API **不会自动按照 Cache-Control: max-age、no-cache 或 ETag 决定何时删除和验证 Cache Storage 条目**。应用应自行实现版本、容量、有效期、更新与安全策略，浏览器也可能受配额限制清除存储。[[8]](https://developer.mozilla.org/en-US/docs/Web/API/Cache)

因此，即便资源的 HTTP 响应声明 no-store，也不能将它当成 Cache Storage 自身的访问控制或生命周期策略。应用不应手动存储敏感响应，尤其不能把用户权限相关 API 做成不经过授权检查的离线共享数据。

### 【预缓存与运行时缓存分开管理内容生命周期】

- **Precache（预缓存）**：在 Service Worker install 阶段将明确列入清单的应用壳资源缓存，供后续运行和离线场景使用。
- **Runtime Cache（运行时缓存）**：在实际资源请求时按策略保存或复用资源，适用于可按场景识别的图片、公开数据或其它响应。

资源是否应预缓存，取决于离线使用价值、更新频率、设备存储容量和安装成本。预缓存所有图片/脚本可能造成首装开销过大；离线能力也不等于整个在线站点都能正常执行需要后端的业务。

常见的五种缓存策略如下：[[9]](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)

| 策略 | 基本流程 | 适用资源 | 主要代价 |
| --- | --- | --- | --- |
| Cache Only | 只尝试本地已保存内容 | 离线必备且已预缓存的固定资源 | 未命中即无法提供 |
| Network Only | 始终尝试网络 | 实时性要求高的操作、敏感请求 | 无法离线复用 |
| Cache First | 先读 Cache Storage，MISS 后联网 | 版本化静态资源 | 可能长期停留旧内容 |
| Network First | 先联网，失败时读取缓存 | 可容忍旧版本的导航或只读数据 | 离线回退结果可能过期 |
| Stale While Revalidate（脚本策略） | 有旧结果先返回，同时联网刷新 Cache Storage | 可以容忍短暂陈旧的公开资源 | 更新不一定立即反映在当前已返回的页面 |

**Service Worker 实现的 Stale While Revalidate 是应用自己编写的控制流程**。它不意味着 Cache Storage 自动理解 RFC 5861 的窗口期限；HTTP 层 SWR 指令可以同时在网络请求内部作用，两个层次需要分别考虑失效条件。

### 【最小 Cache First 逻辑与离线运行是两个不同的能力】

下例仅演示**拦截受控范围内的公开静态资源**，避免把所有 API、HTML、授权请求自动放进离线缓存：

~~~js
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith('/assets/')
  ) return;

  event.respondWith((async () => {
    const cache = await caches.open('public-assets-v1');
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
~~~

这段代码通过 fetch 事件路由资源，调用 Cache.match 复用旧响应，并使用 Response.clone 在保存副本后仍将原响应返回页面。

**示例没有覆盖版本清理、离线安装、容量上限或陈旧更新**。如果同一个 URL 的内容会改变，简单 Cache First 可能长时间停留旧版本；构建指纹和 SW 更新是额外必须设计的环节。更完整的本地 Service Worker 注册、install/activate/fetch、离线验证和调试示例保留在 [资源优化实战的 Service Worker 实践](./Z-资源优化实战.md) 中，不在通用机制文档重复整套项目文件。

### 【离线访问需要页面壳、正确版本与失败回退协同成立】

~~~text
在线阶段
  → 注册 Service Worker
  → install：预缓存离线页面 / 必要资源
  → activate：清理已淘汰缓存和进行版本迁移
  → 后续受控页面请求可按策略命中缓存

离线阶段
  → 页面导航或资源请求
  → 无法联网（或主动选择离线方案）
  → 命中 Cache Storage：使用已有响应
  → 未命中：使用预定义离线回退，或正常失败
~~~

实现完整 PWA 离线能力还要考虑首次访问、首次激活、更新检查、激活策略、正在运行的旧页面、缓存清理、后台数据新鲜度和浏览器配额。不能把浏览器 Network 中出现 from ServiceWorker 等同于“所有后端功能都能离线运行”。

与页面内容生成缓存（SSR/ISR/SWR）、API 状态缓存等关系可继续阅读 [Web 渲染架构](./W-Web渲染架构.md) 和 [浏览器存储方式](./L-浏览器存储方式.md)。它们分别属于内容生成/数据存储机制，不能代替本篇 HTTP 响应缓存的协议语义。
