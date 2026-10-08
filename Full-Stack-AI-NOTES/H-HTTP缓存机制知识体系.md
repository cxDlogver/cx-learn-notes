# HTTP 缓存机制知识体系

HTTP 缓存的核心，是在保证内容正确与共享安全的前提下，让浏览器、CDN 和可选的 Web 服务器代理缓存复用已经取得的 HTTP 响应。需要沿两条主线理解：**请求从浏览器到源站的各层处理路径**，以及**同一份响应从存储资格、缓存匹配、新鲜度、条件验证到版本更新的完整生命周期**。不是所有请求都必经全部缓存层，也不是命中缓存键就一定能够返回旧响应。

本篇只讨论 HTTP 响应缓存，重点为浏览器 HTTP Cache、CDN 共享缓存、Web 服务器的静态文件服务与可选的代理缓存。原始源文件和 HTTP 缓存副本是不同对象；页面生成/ISR 的内容缓存详见 [Web 渲染架构](./W-Web渲染架构.md)。以公开产品官网的 HTML、带 Hash 的 JS/CSS 与公开 API 为统一场景，通过缓存键、TTL、ETag、SWR 及完整请求时序理解每一层。
## 1. HTTP 多级缓存的请求链路与缓存存储职责

### 【浏览器、CDN、Web 服务器与源站不是固定的四级缓存】

假设产品官网在 https://www.example.com 发布：/index.html 作为入口；/assets/app.a81f.js 是带内容 Hash 的 JavaScript；/public-api/products?category=phone 是匿名可读的公开列表。典型请求可以经过：

~~~text
用户请求 /index.html、/assets/app.a81f.js、公开产品 API
      ↓
浏览器 HTTP Cache（用户代理保存的 HTTP 响应副本）
   ├─ 匹配并满足直接复用条件 → 返回；本次不请求 CDN
   └─ 未命中或需要验证 → 进入网络
      ↓
CDN 边缘共享缓存（不同边缘节点可保存响应副本）
   ├─ 匹配并允许直接复用 → 返回；本次不再回源
   └─ MISS / 必须验证或刷新 → 请求源站
      ↓
Web 服务器（Nginx / Apache / Caddy 等）
   ├─ 静态文件路径：直接读取部署文件并返回
   ├─ 可选的 HTTP 代理缓存：已开启时先查上游响应副本
   └─ 普通反向代理：转发给应用服务器
      ↓
应用服务器/数据服务（仅需要动态处理时参与）
      ↓
HTTP 响应沿实际路径返回；各个 HTTP 缓存节点独立决定是否存储
~~~

图中不是所有请求必须经过的固定链路：CDN、反向代理、代理缓存均可能不存在；静态资源也可以由对象存储直接作为 CDN 源站。缓存是协议允许的优化能力，而不是任何满足条件的响应都必须存到所有节点。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

### 【HTTP 响应副本与 Web 服务器静态源文件不能混为一谈】

| 位置 | 存储对象 | 存储特征 | 是否属于 HTTP 响应缓存 |
| --- | --- | --- | --- |
| 浏览器 HTTP Cache | 响应正文、缓存头、验证器及匹配元数据 | 浏览器管理，内存/磁盘是实现方式；可受分区、容量影响 | 是，主要为私有缓存 |
| CDN 缓存 | 可安全共享的 HTTP 响应副本和元数据 | 分布式边缘节点、节点 TTL 与清理机制 | 是，共享缓存 |
| Web 服务器静态文件目录 | HTML、JS、CSS、图片等构建部署文件 | 文件在磁盘或存储上长期存在，直到发布替换/删除 | 不是 HTTP 代理缓存 |
| Web 服务器代理缓存 | 显式开启后保存的上游响应副本 | 代理缓存存储区、缓存键、元数据及淘汰机制 | 是，共享缓存 |
| 应用/数据库 | 动态数据、页面和接口响应的原始来源 | 由业务生成内容，可另有应用级缓存 | 不等同 HTTP 缓存 |

Web 服务器直接读取 /srv/site/assets/app.a81f.js 并返回 HTTP 响应，是源站提供内容；即使操作系统使用文件页缓存，也不能当作 Nginx proxy_cache 命中。静态文件何时删除由部署决定，浏览器/CDN 副本是否 stale 由 HTTP 缓存规则决定。

### 【首次收到响应时决定能否存储，再次收到请求时决定能否复用】

~~~text
首次请求，本层找不到适用副本
  → 请求下一层并取得响应
  → 根据方法、状态、Cache-Control、鉴权等决定是否存储
  → 保存正文、相关请求信息、缓存键/变体、新鲜度和验证器等

再次请求
  ① Cache Key、Vary：有没有正确匹配的副本？
     ├─ 没有 → 请求下一层
     └─ 有
          ② Cache-Control、Age：是否允许直接使用？
             ├─ 新鲜且满足条件 → 本层直接返回
             └─ 不允许直接使用
                  ③ SWR 等：允许暂用旧响应吗？
                     ├─ 允许 → 按规则先返回并重新验证
                     └─ 不允许
                          ④ ETag/Last-Modified：验证或重新获取
                             ├─ 304 → 继续使用原正文、更新元数据
                             └─ 200 → 使用新正文并视规则保存
~~~

这里“查找到一个缓存副本”和“本次请求可以直接使用缓存副本”不是同一个判断；304 意味着进行了条件验证，并不等于完全没有网络请求。

## 2. 通用 HTTP 缓存规则决定副本是否匹配、能否复用与怎样验证

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

## 4. CDN 通过分布式共享缓存、变体与回源策略降低源站压力

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

## 5. Web 服务器需要区分静态文件服务与真正启用的 HTTP 代理缓存

### 【Web 服务器读取原始文件不代表命中 HTTP 代理缓存】

Web 服务器可以由 Nginx、Apache HTTP Server、Caddy 等软件承担，主要用于 HTTP 入口、静态资源服务和反向代理。不同产品的代理缓存能力及配置不同，以下以 Nginx 为明确的配置示例：

| Web 服务器工作模式 | 请求怎样完成 | 哪种资源复用 |
| --- | --- | --- |
| 静态文件服务 | 按 root/alias 找到文件并直接响应 | 操作系统文件缓存及 Nginx 静态文件处理；可向浏览器/CDN发送 HTTP 缓存头 |
| 反向代理但不缓存 | proxy_pass 将请求转发至上游，每个请求通常到达上游 | 代理自身不保存可复用 HTTP 响应副本 |
| 反向代理并启用 proxy_cache | 按配置的缓存键、响应资格和新鲜度检查已有上游响应 | Nginx 可以成为一层独立的共享 HTTP Cache |
| 其它静态托管源站 | 对象存储、托管平台直接给出文件 | 不一定存在 Nginx，也不一定有应用服务器 |

静态文件“存在于磁盘上”并不等于“缓存副本已经失效或即将失效”。Nginx 静态文件可以一直存在直到部署替换或删除，HTTP Cache-Control 影响的是**下游浏览器/CDN 能否复用响应**；若没有额外配置，不能把磁盘文件自动解释为 proxy_cache。[[5]](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)

### 【静态文件服务通过部署路径和响应头影响下游缓存】

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

### 【Web 服务器只有开启代理缓存才会保存上游 HTTP 响应】

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

### 【Web 服务器代理缓存能够条件验证与复用过期响应】

Nginx 可以通过 proxy_cache_use_stale 的 updating、error、timeout 等条件，在允许的情况下返回旧副本；结合 proxy_cache_background_update 等能力可以安排后台更新，具体行为还取决于版本、配置和响应规则。

它们可能达到与 HTTP stale-while-revalidate **相近的“旧结果先返回、后台刷新”效果**，但不能把 Nginx 的代理参数、CDN 的供应商缓存策略和 Cache-Control: stale-while-revalidate 当成同一个自动生效的开关。[[6]](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

Nginx 的部署路由、静态文件与应用服务器职责详情见 [反向代理与 Web 入口体系](./F-反向代理与Web入口体系.md)。本篇只解释 Nginx 与响应缓存的关系，不重复通用反向代理的全部知识。


## 6. 资源内容 Hash、缓存过期与版本发布形成完整更新周期

### 【内容哈希文件名负责改变 URL，而不是删除旧缓存】

构建工具会基于资源内容生成带有指纹的文件，例如：

~~~text
旧版本 index.html
  └─ /assets/app.8a31f.js
新版本 index.html
  └─ /assets/app.9b72d.js
~~~

app 的内容变化后，资源 URL 从 app.8a31f.js 变为 app.9b72d.js。因此浏览器、CDN 和 Nginx 代理缓存会将它视为不同目标资源；它们无需先删除所有旧副本，新 URL 即可触发自己的缓存获取流程。

这个过程称为 **Cache Busting（通过版本化 URL 绕开旧副本）**。它不是对旧 URL 发送 purge、不是清空浏览器缓存，更不代表缓存策略会自动知道“代码版本已经更新”。[[7]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)

### 【页面入口 HTML 的更新决定用户何时发现新的资源 URL】

完整部署链路应关注“先有资源，再让 HTML 引用它”的发布顺序：

~~~text
构建完成新 HTML、JS、CSS 等产物
                ↓
首先确保新版本静态资源已在源站 / CDN 可获取
                ↓
发布或切换引用新文件名的 HTML
                ↓
浏览器请求或验证 HTML（不能长期无条件用旧入口）
                ↓
浏览器解析新版 HTML，发现新的内容 Hash URL
                ↓
网络侧和浏览器侧按照各自缓存规则请求/存储新资源
                ↓
旧版本仍被打开的页面，可以继续获取必要的旧资源
                ↓
版本淘汰窗口之后再清理旧资源
~~~

如果把旧静态文件过早删除，而仍有用户保留旧 HTML 或旧 JS 的动态 import 引用，就可能出现 Chunk 404、模块加载失败甚至页面白屏。

HTML、JSON Manifest 或其他版本入口往往不具备内容哈希命名，常用可验证缓存或受控的短时新鲜度；如果关键更新必须即时可见，则需要显式更新机制。Nginx 和 CDN 上的 Cache Purge 可以加快共享缓存更新，但**CDN purge 不会自动删除全部用户设备上的 HTTP Cache 和 Cache Storage**。

### 【immutable 表示新鲜期内表示不变，必须配合版本 URL】

对内容 Hash 命名且部署保证不可原地更改的静态文件，可采用：

~~~http
Cache-Control: public, max-age=31536000, immutable
~~~

max-age 表示大约一年的新鲜度时间，immutable 告知支持该指令的缓存：**在仍然新鲜时响应不会变化**，从而减少不必要的重新验证。它不是无限期存储，也不是禁止浏览器或用户手动清除资源，更不是自动使 HTML 引用改变。[[8]](https://www.rfc-editor.org/rfc/rfc8246)

反例：/assets/app.js 每次部署都在原 URL 上覆盖内容，却配置了长期 max-age/immutable。用户可能继续使用旧 JS，直到新鲜期、版本路径或其他主动机制允许其发现新内容；仅更新服务器磁盘文件并不能自动使本地缓存失效。


### 【不同资源类型需要不同的缓存资格、新鲜度和版本规则】

### 【HTML、内容 Hash 资源、公开数据和个人数据具有不同缓存目标】

| 资源类别 | 常见缓存设计思路 | 为什么这样设计 | 必须满足的条件 |
| --- | --- | --- | --- |
| 带内容 Hash 的 JS/CSS/图片/字体 | 允许长期新鲜度、immutable | URL 随内容变化，可安全复用特定版本 | 资源 URL 不原地覆写，HTML 正确切换版本 |
| 无 Hash 的 HTML/应用入口 | no-cache + ETag 等验证器，或短时受控缓存 | 页面需要发现新资源 URL，同时可避免不必要的正文重传 | 更新频率、个性化差异和入口缓存策略明确 |
| 公开且更新较慢的 API | 视情况设置 s-maxage、验证器、SWR | 在明确可容忍陈旧的条件下减少回源 | 响应能被安全共享，Cache Key 正确 |
| 登录态或个人资料响应 | private 与必要的验证/短期限；敏感内容可 no-store | 防止共享缓存向其他人复用数据 | Cookie、Authorization、权限变化、退出后数据清理充分考虑 |
| 实时性强的业务操作响应 | 明确禁止不适当存储或采用强验证策略 | 避免使用失效的业务状态 | 不以提高 HIT 率为目标 |

这张表是**选择策略的原则，不是任何站点可直接复制的统一生产配置**。含用户权限的响应、可公开访问但带随机广告或地域差异的响应，不能只看“GET + 200”便允许共享。

### 【同一 URL 应明确哪些变化属于缓存键，哪些变化要求换 URL】

如果内容差异来自身份、权限或账号，应首先判断是否允许共享；如果来自语言、Accept-Encoding 等协商字段，考虑 Vary 与 CDN 变体配置；如果是构建静态文件内容改变，优先通过内容 Hash URL 区分版本；如果是时间变化的公开数据，则按可容忍陈旧范围设置新鲜度与验证机制。

例如图片资源中的 width=320 和 width=1280 查询参数若实际返回不同尺寸图片，则不能随意在 Cache Key 中丢弃影响内容的 width 参数。类似地，对公开 API 仅按路径生成缓存键，却忽略查询条件，会出现错误内容串用。

### 【不同缓存位置的时间策略是独立生效的】

一个典型公开响应可能声明：

~~~http
Cache-Control: public, max-age=60, s-maxage=600, stale-while-revalidate=30
ETag: "public-list-v7"
Vary: Accept-Encoding
~~~

解释如下：

1. 浏览器私有 HTTP 缓存可依据 max-age=60 判断自身新鲜度。
2. CDN 或合规共享缓存可依据 s-maxage=600 判断共享副本是否新鲜。
3. 允许支持该指令的缓存，在其适用的新鲜期之后的额外 30 秒内按 SWR 条件使用过期副本并异步验证。
4. ETag 用于需要验证时的表示版本比较。
5. Vary 限制响应变体的正确匹配。

这里**不是同一份资源先缓存 60 秒、然后转移到 CDN 缓存 600 秒**。它们是不同节点收到相应请求时独立执行的缓存决策。是否真正命中、是否允许异步更新，也取决于缓存自身状态和实现支持。


## 7. 通过同一官网请求场景验证缓存命中、过期与发布更新

### 【浏览器开发工具只能说明客户端看到的结果，不能凭空推断上游所有层】

Chrome DevTools 的 Network 和 Application 面板可以分别查看请求与缓存状态：

| 观察位置 | 能确认什么 | 不能直接确认什么 |
| --- | --- | --- |
| Network 的 Size / Timing | 本地缓存命中、部分请求发起与时延、304/200 等 | CDN 是否访问了应用数据库 |
| Response Headers | Cache-Control、ETag、Last-Modified、Age、Vary 等 | Header 存在不等于每层实际缓存命中 |
| CDN 控制台/日志 | 具体节点 HIT/MISS/REVALIDATED、回源与缓存刷新 | 不能单靠浏览器一个状态字段完成全链路判断 |
| Nginx 的 access log / upstream_cache_status | 代理缓存 HIT、MISS、EXPIRED、REVALIDATED 等状态 | 需确认对应 location 真正启用了 proxy_cache |
| 应用日志或 Trace | 请求是否到达后端、生成/查询/序列化开销 | 应用没有记录不一定意味着用户没有发出请求 |

Age 可以帮助判断当前响应被某层缓存保存或验证后经历的估计年龄，但缺少 Age 并不能直接证明“源站被访问”。CDN 的 CF-Cache-Status、X-Cache 等是供应商或配置相关字段，不能当成 RFC 统一必须存在的头。

### 【一次浏览器协商请求需要同时辨别客户端与 CDN 的处理】

~~~text
案例：本地有过期 app.js
    ↓
浏览器构造 If-None-Match 请求
    ↓
CDN 可能使用自身新鲜副本直接验证（下游看到 304）
    或 CDN 自己向 Nginx / 其它上游发起验证
    ↓
浏览器最终继续使用已存正文
~~~

因此看到 304 只能说明**某个验证条件认为内容未变化**。它不能单独证明文件由应用服务器生成、CDN 发生 MISS 或本次请求读取了数据库。

### 【安全与故障场景不可为了命中率而牺牲正确性】

- 私有响应不应因为“提高 CDN HIT”而错误地与公开内容共享。
- no-store 不会自动清除旧版本 HTTP 缓存副本；权限状态变化必须由业务正确处理。
- stale-if-error 只能用于明确允许陈旧的响应，不能默认用在支付状态、权限校验或关键安全数据上。
- CDN purge 及版本切换要考虑多节点传播、失败回滚和长期开启的旧页面。
- 共享缓存还需要防止不正确 Cache Key、Vary 和源站输入差异产生的缓存污染或错误复用。

## 8. HTTP 缓存机制与相邻知识文档建立统一入口

### 【缓存机制统一由本篇维护，其它文档保留自己的工程职责】

| 关联文档 | 本篇与该文档的边界 |
| --- | --- |
| [Web 性能优化工程体系](./W-Web性能优化工程体系.md) | 六大优化领域的分类入口；本篇深入其网络缓存机制 |
| [反向代理与 Web 入口体系](./F-反向代理与Web入口体系.md) | 负责 Nginx/Caddy 公网入口、静态部署与上游代理拓扑；本篇负责 HTTP 缓存决策 |
| [Web 渲染架构](./W-Web渲染架构.md) | 负责 CSR/SSR/SSG/Hybrid、SWR/ISR 的内容生成与更新策略；本篇负责 HTTP 响应副本 |
| [资源优化实战](./Z-资源优化实战.md) | 资源构建、静态优化与加载实践；本篇负责 HTTP 缓存协议与版本更新 |
| [静态资源预加载方法](./J-静态资源预加载方法及实践笔记（完整版）.md) | 负责资源何时发现、何时提前请求；本篇负责取得响应后能否复用 |
| [浏览器存储方式](./L-浏览器存储方式.md) | 浏览器数据存储 API 的选型；本篇聚焦 HTTP 响应副本 |
| [Web 性能优化完整知识体系](./W-Web性能优化完整知识体系.md) | 保留用户体验与端到端成本总览，不复制缓存协议的完整定义 |

通用 HTTP 缓存只保留这一篇完整机制入口。Web 性能、反向代理、渲染架构及面试 QA 文档保留对应自身主题的上下文说明，并就近引用本文；业务端数据缓存与 HTML 生成缓存不并入 HTTP 协议定义。

## 9. 参考文献

1. IETF. [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111). 私有/共享缓存、缓存键、新鲜度、校验和 Cache-Control 语义。
2. MDN. [HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching). 浏览器缓存、启发式缓存、刷新与版本资源实践。
3. IETF. [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110). ETag、Last-Modified、条件请求和 304。
4. IETF. [RFC 5861: HTTP stale response extensions](https://www.rfc-editor.org/rfc/rfc5861). stale-while-revalidate 与 stale-if-error。
5. NGINX. [Serve Static Content](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/). Nginx root、alias 和 try_files 的静态文件语义。
6. NGINX. [ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html). proxy_cache、缓存有效期、条件验证、锁与过期处理。
7. MDN. [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control). 内容哈希与缓存指令。
8. IETF. [RFC 8246: HTTP Immutable Responses](https://www.rfc-editor.org/rfc/rfc8246). immutable 的适用范围与含义。
