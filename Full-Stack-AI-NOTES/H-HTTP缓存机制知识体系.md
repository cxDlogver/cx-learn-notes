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

### 【Cache Key 负责寻找资源副本，Vary 负责区分同一资源的响应变体】

**Cache Key（缓存键）是缓存系统用来查找已保存 HTTP 响应的匹配依据**。它不是一个固定叫做 `Cache-Key` 的 HTTP 请求头，也不是每次随机生成的字段。RFC 9111 规定，缓存键至少与请求方法和目标 URI 有关；缓存实现还可以纳入缓存分区、部分请求头和其他信息。要区分：Cache Key 解决“该找哪一份响应”，后面的新鲜度判断才解决“找到了以后现在能不能直接用”。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

继续使用全文的公开产品官网。用户选择“手机”时浏览器发出：

~~~http
GET /public-api/products?category=phone HTTP/1.1
Host: www.example.com
~~~

应用服务器返回：

~~~http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=600

{"category":"phone","items":[{"id":101,"name":"Phone A"}]}
~~~

假设 CDN 已判断该响应允许共享缓存，它需要保存的不只是 JSON 正文，还包括能让后续请求找到这份正文的请求信息及缓存元数据。可用下面的**概念性映射**理解（不是任何 CDN 真实的磁盘文件名）：

~~~text
Cache Key（示意）
  GET + https://www.example.com/public-api/products?category=phone
      ↓ 对应缓存条目
手机列表 JSON + 缓存控制字段 + 响应时间等元数据
~~~

随后用户选择“电脑”，请求变成 `GET /public-api/products?category=laptop`。`category` 改变了响应内容，因此这两个请求必须得到不同的缓存匹配结果。如果 CDN 错误地将 `category` 从 Cache Key 排除，就可能把先前的手机列表交给电脑分类用户。反之，追踪参数确实不影响响应内容时，在验证业务条件后排除它，可能减少无意义的缓存版本。**自定义 Cache Key 是以内容正确性为前提改善共享命中率，而不是通过忽略所有参数换取高命中。**

但只按请求方法和 URL 匹配仍有另一个问题：**同一个 URL 也可能根据请求头返回不同的 HTTP 表示**。例如官网脚本始终使用 `/assets/app.a81f.js` 这个 URL，Web 服务器根据浏览器支持的压缩方式返回 Brotli 或 gzip。下面观察完整的两次请求。

**第一次请求：用户 A 的浏览器支持 Brotli。**

~~~http
GET /assets/app.a81f.js HTTP/1.1
Host: www.example.com
Accept-Encoding: br
~~~

服务器选择 Brotli 压缩脚本并返回。下方只展示协议头，省略二进制压缩正文：

~~~http
HTTP/1.1 200 OK
Content-Type: text/javascript
Content-Encoding: br
Cache-Control: public, max-age=600
Vary: Accept-Encoding
~~~

这里的 `Accept-Encoding: br` 是**请求头**，表达浏览器接受 Brotli；`Content-Encoding: br` 是**响应头**，告诉浏览器这次收到的脚本正文采用 Brotli 编码；**`Vary: Accept-Encoding` 也是响应头，它要求缓存以后复用该响应时，再比较原始请求与当前请求中由 Vary 指出的请求头**。所以 `Vary` 不是缓存名字，也不是重新产生一个独立存储区。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

**第二次请求：用户 B 请求完全相同的脚本 URL，但只支持 gzip。**

~~~http
GET /assets/app.a81f.js HTTP/1.1
Host: www.example.com
Accept-Encoding: gzip
~~~

CDN 即使通过基本缓存键找到先前的 Brotli 副本，也不能直接交给此次请求：先前保存副本所对应的 `Accept-Encoding` 是 `br`，现在是 `gzip`，不满足这份响应的 Vary 变体匹配条件。因此 CDN 应寻找适用于 gzip 的另一份缓存副本，或者继续向源站获取。假设回源后服务器提供 gzip 版本：

~~~http
HTTP/1.1 200 OK
Content-Type: text/javascript
Content-Encoding: gzip
Cache-Control: public, max-age=600
Vary: Accept-Encoding
~~~

能够正确处理这类变体的缓存可在相同 URL 下保存不同编码的响应，之后根据请求头选对版本。**这证明的是“同一 URL 的响应正文不一定按同一种编码交付”，而不是“只要有 Vary 就必然缓存命中”**。不同压缩编码如果使用强 ETag，也须确保验证器对应正确的表示字节，不能直接把两套压缩响应的强 ETag 当作同一个字节版本。[[2]](https://www.rfc-editor.org/rfc/rfc9110)

~~~text
再次请求 /assets/app.a81f.js
      ↓
① 基本 Cache Key：匹配请求方法和目标 URL 等
      ↓
② Vary：检查此前响应声明需要比较的请求头
   ├─ 不匹配 → 不能直接使用这个压缩版本，另找变体或回源
   └─ 匹配   → 找到适用于当前请求的响应版本
                     ↓
③ 再检查 Cache-Control、新鲜度和其他复用条件
   ├─ 满足 → 返回这个响应
   └─ 不满足 → 验证或重新取得响应
~~~

官网若按语言返回内容，也可以针对 `Accept-Language` 使用 `Vary: Accept-Language`，但它与压缩编码属于同一种**响应变体匹配机制**，不需要另起一个无关示例。CDN 具体支持哪些 Vary 字段、如何默认生成或自定义缓存键，需要查阅实际服务商配置，不应假设源站发出一个 Vary 就自动解决共享安全问题。若把 Cookie、Authorization 等高基数字段全部加入 CDN 键，还可能造成命中率下降和隐私隔离风险；**缓存键设计不能代替业务授权判断**。[[3]](https://developers.cloudflare.com/cache/how-to/cache-keys/) [[4]](https://developers.cloudflare.com/cache/concepts/vary/)

### 【新鲜度通过 max-age、s-maxage 和响应年龄判断是否允许直接复用】

**缓存键和 Vary 已经找到了“正确版本”，新鲜度（Freshness）才判断“这份版本是否还能不经验证直接返回”。** 缓存不会因为 TTL 到期自动通知源站“请更新文件”，也不会保证在到期时立即删除本地副本。TTL（Time To Live，在此表示缓存新鲜度期限）和“存储副本在物理介质上存在多久”是两个问题。

仍然使用官网公开产品列表。假设源站在 **2026 年 10 月 8 日 07:00 GMT** 生成列表 v8，并返回：

~~~http
HTTP/1.1 200 OK
Content-Type: application/json
Date: Thu, 08 Oct 2026 07:00:00 GMT
Cache-Control: public, max-age=600, s-maxage=3600
ETag: "phone-list-v8"

{"category":"phone","items":[{"id":101,"name":"Phone A"}]}
~~~

逐项理解它们怎样进入实际判断：

- `max-age=600`：响应新鲜度寿命为 **600 秒（10 分钟）**，浏览器私有 HTTP Cache 按适用规则使用它，不是“收到之后无论此前经历多久都再算十分钟”。
- `s-maxage=3600`：**s 是 shared（共享）**，因此 CDN 和启用 HTTP 代理缓存的 Web 服务器等共享缓存以 **3600 秒（1 小时）** 作为该响应的新鲜度寿命，优先于 `max-age`、`Expires`。它不是独立缓存层，也不是延迟一小时以后才能请求 CDN。
- `Date`：这份响应的时间信息，是计算缓存年龄的依据之一；它不是“应用部署时间”。
- `ETag`：只有需要核对列表内容是否变化时才作为验证器使用，与计时和 Cache Key 不同。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

再让另一位用户在 **07:02 GMT** 请求同一列表。假设 CDN 在 07:00 左右已经取得副本，其缓存仍然新鲜，便直接响应浏览器并携带（为便于理解而简化的）年龄：

~~~http
HTTP/1.1 200 OK
Date: Thu, 08 Oct 2026 07:00:00 GMT
Age: 120
Cache-Control: public, max-age=600, s-maxage=3600
ETag: "phone-list-v8"
~~~

`Age: 120` 表示这份响应距离源站生成或成功验证，估计已经经过 **120 秒**，并不表示 CDN 给浏览器重新分配了一份 120 秒的 TTL。浏览器第一次收到它时，计算 600 秒的新鲜期要考虑已有年龄。因此在暂时忽略传输时延和修正项的教学假设下：浏览器约还剩 600 - 120 = **480 秒新鲜时间**；CDN 的共享副本距离 3600 秒上限还约有 3480 秒。这也是为什么不能说“浏览器先缓存十分钟，十分钟以后 CDN 再缓存一小时”。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

~~~text
07:00  源站生成产品列表 v8，CDN 取得并保存响应
         ↓
07:02  浏览器首次访问，CDN 返回缓存结果（Age 约 120 秒）
       浏览器私有缓存按 max-age=600 计算，约剩 480 秒
       CDN 共享缓存按 s-maxage=3600 计算，约剩 3480 秒
         ↓
07:11  同一浏览器再次访问该产品列表
       浏览器原副本的估计年龄已约 660 秒，超过 max-age=600
         ↓
       浏览器不能按本地新鲜副本直接返回，转而发起条件请求
         ↓
       CDN 此时对应副本仍处于 s-maxage=3600 的新鲜期
       CDN 有能力且匹配条件时，可直接处理下游验证
       若列表 v8 未变，浏览器可得到 304 并继续使用本地正文
~~~

这里把“谁的缓存过期”与“请求实际到达哪一层”关联起来了：**浏览器过期，不表示 CDN 同时过期，更不表示必须进入 Web 服务器或应用数据库**。RFC 9111 的实际年龄计算还会计入 `Date`、`Age`、网络往返与节点驻留时间，不能直接用本机当前时间减 Date 代替完整算法。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

还要明确 **`s-maxage` 有不止一个作用**：它不仅为共享缓存选择新鲜度寿命，还包含共享缓存过期后必须成功重新验证才能复用的要求。因此不能把 `s-maxage=3600` 和 `stale-while-revalidate=30` 简单理解为“CDN 超过 3600 秒后自然可以先返回旧数据 30 秒”。后文讨论 SWR 时，将使用**不包含 s-maxage 的独立示例**，避免把相互制约的缓存指令直接叠加。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

最后补充 `Expires`：它是表示绝对过期时间的响应头；当适用的 `max-age` 存在时，优先采用后者；在共享缓存中有 `s-maxage` 时，优先采用共享缓存规则。部分响应若没有显式设置新鲜度，缓存仍可能按规范允许的启发式算法估计期限，因此发布时需要明确响应更新要求，而不是依赖浏览器猜测。响应被判为 stale（已过期）表示不能再按普通新鲜副本无条件返回，**不意味着缓存正文已从磁盘或内存物理删除**。[[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

### 【强缓存与协商缓存分别对应直接复用和验证后复用】

前端常将“命中并直接使用新鲜副本”称为**强缓存**，将“保存了旧副本，但需要网络验证才能复用”称为**协商缓存**。它们描述的是 HTTP Cache 如何处理**同一类已保存响应**，并非浏览器分别维护了一个“强缓存仓库”和一个“协商缓存仓库”。

沿用上一节的具体时间线：源站 07:00 生成公开手机列表 v8，CDN 在 07:02 返回带 `Age: 120` 的响应，浏览器保存了 v8。用户 07:05 再次打开列表时，粗略估计响应年龄为 300 秒，低于浏览器适用的 `max-age=600`，在请求条件没有改变时可以直接从浏览器缓存返回。到 07:11，年龄约为 660 秒，超出浏览器新鲜期，因此浏览器不能再把它当成新鲜副本直接使用。

~~~text
用户再次访问手机列表
    ↓ 浏览器已有同一个 URI、请求变体也匹配的 v8 响应
    ↓ 检查当前请求条件及响应新鲜度
  仍新鲜且允许直接用 → 直接返回本地旧有正文（强缓存）
  已过期或必须验证   → 发起 If-None-Match 条件请求（协商缓存）
                            ↓
                       网络验证结果
                 ├─ 304 未改变 → 保留已存正文、更新元数据
                 └─ 200 已改变 → 取得新正文并按规则保存
~~~

这张图证明两种路径都可能涉及同一份此前保存的 HTTP 响应，而不是物理存储位置的区分。没有缓存副本时，只能尝试取得新响应；即使有副本，如果本次请求通过刷新、fetch cache 模式等要求重新获取，也可能不能走普通的新鲜副本路径。[[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

### 【ETag 与 Last-Modified 在发生条件请求时验证响应是否改变】

上一节的浏览器在 07:11 已有手机列表 v8 正文，但不能直接按新鲜缓存复用，因此它需要问网络侧：“我手里的版本 v8 还是当前版本吗？”服务器之前提供的**ETag（Entity Tag，实体标签）**就是一个表示版本的验证器，并不要求与构建文件名里的内容 Hash 相同。另一种验证器 **Last-Modified（最后修改时间）**表达服务器认定的表示修改日期。ETag 与 Last-Modified 都**不负责查找缓存**，也不会在服务端更新的瞬间主动通知所有浏览器。[[2]](https://www.rfc-editor.org/rfc/rfc9110)

浏览器此前收到了 `ETag: "phone-list-v8"`，便向 CDN 发出：

~~~http
GET /public-api/products?category=phone HTTP/1.1
Host: www.example.com
If-None-Match: "phone-list-v8"
~~~

`If-None-Match` 是**请求头**，意思是“如果当前选定表示的标签与我已有的版本匹配，请不要重复发送完整列表正文”。处理条件请求的 CDN 或源站确认列表仍为 v8 时，能够返回：

~~~http
HTTP/1.1 304 Not Modified
ETag: "phone-list-v8"
Cache-Control: public, max-age=600, s-maxage=3600
~~~

收到 304 的浏览器已经保存了 v8 的 JSON，它复用原有正文并按协议更新响应元数据；此处节省的是**正文重复传输**，并不是省掉了浏览器到 CDN 的整个网络请求。相反，如果源站已经将列表改成 v9，服务器需要返回新正文，例如：

~~~http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "phone-list-v9"
Cache-Control: public, max-age=600, s-maxage=3600

{"category":"phone","items":[{"id":101,"name":"Phone A"},{"id":102,"name":"Phone B"}]}
~~~

如果原响应提供的是 `Last-Modified: Wed, 07 Oct 2026 10:00:00 GMT`，请求可用 `If-Modified-Since` 进行时间条件验证。时间戳存在粒度和服务端实现约束，不必然能够识别所有快速发生的变化；若同一请求同时包含 `If-None-Match` 与 `If-Modified-Since`，符合 HTTP 语义的接收者应优先按 If-None-Match 条件判断。弱 ETag（例如 `W/"phone-list-v8"`）可以按弱比较判断语义等价，不能认为它代表字节严格一致。[[2]](https://www.rfc-editor.org/rfc/rfc9110)

这组请求与响应要验证的是：**304 如何让缓存复用已经保存的正文、200 如何替换为新内容**。它没有证明是哪一层生成了 304；判断 CDN 是否回源，仍需要 CDN 和 Web 服务器访问日志。

### 【浏览器的条件请求可能由 CDN 直接回答，也可能继续向 Web 服务器验证】

假设浏览器 07:11 对手机列表 v8 发出 `If-None-Match: "phone-list-v8"`。CDN 持有同一 URL、匹配请求变体且仍处于 `s-maxage=3600` 新鲜期的副本时，可以利用这份已存表示的验证器处理下游条件请求；此时 CDN 对浏览器回复 304，并不一定需要访问应用服务。

如果同一 CDN 节点自己的副本也已过期，或不具备直接处理该条件的条件，它会按适用规则向上游继续验证。Web 服务器或应用源站返回 304 后，CDN 可以更新其已有副本的元数据，再判断应向浏览器返回 304 还是包含正文的响应。**CDN 对上游取得的 304，与浏览器最终看到的 HTTP 状态不能机械地认为永远相同**，因为上下游请求各自有自己的条件与缓存状态。

~~~text
浏览器已有手机列表 v8，但本地超过 max-age=600
    ↓ 请求 CDN，携带 If-None-Match: "phone-list-v8"
CDN 查找自己的 v8 副本并检查共享新鲜度
    ├─ CDN 副本仍新鲜，且可满足下游条件
    │    → CDN 直接向浏览器返回 304
    └─ CDN 副本需要向上游验证
         → Web 服务器 / 应用确认表示版本
             ├─ 上游 304：CDN 更新相关元数据
             └─ 上游 200：CDN 收到新正文并更新可存副本
         → CDN 再根据浏览器请求条件生成适当的下游响应
~~~

因此，“浏览器出现 304”并不等于“源站应用一定执行了一次查询”。同样，CDN 命中并直接返回响应，也不等于浏览器自己的 HTTP Cache 已经命中。真正的命中层应通过 CDN 状态日志、Web 服务器访问日志和浏览器 Network 联合确认。

## 3. 浏览器 HTTP Cache 对本地响应进行存储、匹配、直接复用与网络验证

第二章已经解释 HTTP 缓存键、新鲜度与验证器的通用含义。现在把视角放到用户本机：当浏览器取得官网 HTML、JS 和产品列表时，怎样存储响应，下一次请求怎样决定是否再次访问 CDN，用户刷新页面以后为什么会看到不同结果？

### 【浏览器存储的是响应副本，内存缓存与磁盘缓存只是实现方式】

首次访问官网时，浏览器先请求 `/index.html`，解析 HTML 后请求 `/assets/app.a81f.js`；JS 在运行时还可能请求 `/public-api/products?category=phone`。对每个网络响应，浏览器依据 HTTP 方法、响应状态、响应头、缓存分区和自身策略决定是否保存，并为可存响应保留必要的正文、头字段、验证器与匹配信息。浏览器可能使用内存、磁盘或其他内部存储结构，也可能因为容量或隐私策略主动驱逐副本。**“from memory cache”和“from disk cache”描述浏览器实现或 DevTools 看到的来源，不等于强缓存与协商缓存两种不同的协议机制。** [[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

另外，浏览器缓存通常是用户代理管理的私有缓存，还会按站点上下文等因素进行分区。两个用户即使处于同一 CDN 服务区域，也不会因此共享同一个浏览器本地缓存；同一用户的不同浏览器配置、隐私窗口与站点分区，也不保证能够复用完全相同的本地副本。

### 【浏览器需要先匹配响应版本，再检查能否直接使用】

用户第二次请求 `/assets/app.a81f.js` 时，浏览器先在自己的 HTTP Cache 中查找相应 URI、方法与适用变体的响应。如果当时源站为脚本返回了 `Vary: Accept-Encoding`，浏览器还要保证保存的压缩表示适用于本次请求。这与前面 CDN 匹配 Brotli/gzip 的原理相同，但**运行地点是用户本机，浏览器缓存未命中不代表 CDN 缓存未命中**。

假设浏览器已经保存脚本，先前的 HTTP 响应声明：

~~~http
HTTP/1.1 200 OK
Content-Type: text/javascript
Cache-Control: public, max-age=31536000, immutable
ETag: "app-a81f"
~~~

这个响应不是凭空出现的：它来自官网首次加载脚本 `GET /assets/app.a81f.js`，且构建部署保证相同 Hash URL 不会原地换内容。后续普通请求如果仍有匹配、未过期且不要求网络验证，浏览器可直接交付本地保存的脚本正文，不需要再次发送这个资源请求到 CDN。因此 **强缓存优化的是“本次网络请求能否完全省略”**，而不是把文件从“磁盘缓存层”迁移到“内存缓存层”。

### 【HTML 入口通常要保证可发现新版本，因此与 Hash 脚本采用不同更新策略】

官网的 `index.html` 本身可以保存，但它引用了哪个脚本 Hash，将决定用户是否发现新版本。假设源站返回当前入口：

~~~http
HTTP/1.1 200 OK
Content-Type: text/html
Cache-Control: no-cache
ETag: "html-v3"

<!doctype html>
<html lang="zh-CN">
  <head><script defer src="/assets/app.a81f.js"></script></head>
  <body><div id="app"></div></body>
</html>
~~~

这里 `no-cache` **不是完全禁止浏览器存储 HTML**：浏览器可以保存这个正文和 `ETag: "html-v3"`，但当下一次需要使用该响应时，必须成功验证。这样可以在 HTML 未变时节省正文传输，同时在 HTML 已变时发现新版引用，而不是不加检查地长时间使用旧入口。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

当用户重新进入首页，浏览器发出条件请求：

~~~http
GET /index.html HTTP/1.1
Host: www.example.com
If-None-Match: "html-v3"
~~~

如果 HTML 仍为 v3，处理验证的服务器或 CDN 返回 304，浏览器沿用缓存中的 HTML 正文，继续发现旧脚本 URL `app.a81f.js`。如果源站已发布新版 HTML，验证会取得 200 新正文，例如其中引用 `/assets/app.b92d.js`；浏览器随后对新 URL 请求新的脚本。**ETag 用于确认 HTML 是否变更，内容 Hash 用于确保脚本版本换成不同 URL**，二者位于更新链路的不同步骤。

这一套逻辑也解释了：如果 HTML 被不恰当地设置为长期新鲜，即使新脚本已经成功发布，旧页面可能仍然引用旧资源；这不是“旧 JS 缓存自己不更新”，而是浏览器还未取得新的入口引用。

### 【过期产品列表需要网络验证，但网络验证不一定穿透 CDN】

浏览器本地保存手机列表 v8 后，到源站生成响应约第 11 分钟时，可能已超出自己适用的 `max-age=600`。如果具备 ETag，它可以向 CDN 发 `If-None-Match: "phone-list-v8"`。CDN 的共享副本仍新鲜、能满足当前请求条件时，可直接响应 304；浏览器随后使用自己的 v8 JSON 正文。只有 CDN 自己也需要回源或没有适用副本时，请求才会继续进入 Web 服务器或应用服务。**浏览器的 304 证明发生了条件验证，不证明用户真正重新下载了完整 JSON，更不证明最终应用服务被调用。**

### 【导航、刷新、强制刷新和 fetch 的 cache 模式会改变本次缓存处理】

同一个 `/index.html`，用户以普通导航打开、点击浏览器刷新、执行强制刷新和开发者在脚本中配置不同 `fetch(..., { cache: ... })`，可能产生不同的请求缓存控制。普通访问可正常复用新鲜响应；刷新往往提出更积极的重新验证要求；强制刷新通常绕开通常的本地复用路径。这里的 fetch `cache: "no-cache"` 是调用者指定的**请求端缓存模式**，而 `Cache-Control: no-cache` 是服务器返回的**响应缓存指令**，不能因为名称相似就认为它们是一个设置。浏览器版本和 DevTools 的 Disable cache 也可能改变观察结果。[[5]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

排查“页面更新了但用户仍看到旧资源”时，应先记录**普通导航时的 URL、状态码、请求头、响应头和 Size/Transferred 提示**，然后再通过刷新/禁用缓存做对照测试。如果一开始就在 DevTools 勾选 Disable cache，反而可能绕过用户真实遇到的失效链路。

### 【浏览器缓存的生命周期不会被 CDN 的 Purge 直接控制】

站点主动 Purge CDN 中的 `/index.html`，并不会远程删除所有用户设备上已有的浏览器 HTTP 缓存。若用户本地 HTML 仍被允许直接使用，就可能继续引用旧脚本。对于新的 Hash URL，浏览器会建立新的缓存匹配目标，不用先清除旧 `app.a81f.js`。这种隔离使长期缓存静态资源成为可能，但也要求**HTML 的版本发现、静态文件先行部署、旧资源保留和主动清理策略一起设计**。

## 4. CDN 共享缓存通过边缘存储、缓存键、有效期与回源机制复用响应

前两章已经解释通用协议规则，以及浏览器可以在本地直接复用响应。但新用户的浏览器往往没有本地缓存；如果每位用户都去访问远方的源站，相同的公开产品数据仍会被重复生成和传输。CDN（Content Delivery Network，内容分发网络）的边缘共享缓存就是在用户与源站之间保存**可由多名用户安全复用的 HTTP 响应**，减少跨地域传输和重复回源。

### 【CDN 在边缘节点保存响应副本，首次访问与再次访问形成 MISS/HIT】

沿用手机产品列表场景。第一位用户请求 `GET /public-api/products?category=phone`，其浏览器没有本地副本，请求到达距离用户较近的 CDN 节点。假设该 CDN 节点第一次收到此 URL，缓存查找未命中（MISS），于是转向源站 Web 服务器；Web 服务器把公开请求转发给应用，由应用返回手机列表 v8。

~~~http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=600, s-maxage=3600
ETag: "phone-list-v8"

{"category":"phone","items":[{"id":101,"name":"Phone A"}]}
~~~

CDN 不能仅因返回 200 就无条件保存：它先确认方法、状态码、缓存控制、请求鉴权与共享资格，也要遵守服务商对 API/查询参数的额外规则。**本例假定应用明确承诺该列表不受用户身份、Cookie 或登录状态影响，CDN 对该路径已允许缓存，并且有可用存储空间**。在此前提下，CDN 保存这份响应及请求匹配、新鲜度和验证器元数据。

第二位用户在这一小时内请求同一手机列表。即使他的浏览器没有该 URL 的本地缓存，请求到达同一 CDN 节点后，CDN 能匹配已保存副本，判断其仍新鲜并可安全共享，便从边缘直接返回列表，而无需访问 Web 服务器或应用数据库。这类“CDN 找到了且实际用副本满足请求”称为边缘缓存 HIT。**CDN HIT 和浏览器缓存 HIT 是两次不同的判断**，不能混为一谈。

~~~text
用户 A 第一次请求公开手机列表
  浏览器 MISS → CDN 当前节点 MISS → Web 服务器 → 应用生成 v8
                                   ← CDN 检查资格并保存 v8
用户 B 随后请求同一列表
  浏览器 MISS → CDN 发现同一缓存键且仍新鲜 → CDN 返回 v8
                                             （不再访问 Web 服务器）
~~~

CDN 通常不只有一个节点；用户 C 访问另一区域的 CDN 节点时，如果那个节点尚无该副本，仍可能 MISS 并回源。也因此一次 HIT 不能证明整个 CDN 网络已缓存同一文件。

### 【CDN 自定义缓存键必须保留改变响应内容的请求信息】

假设产品列表 API 使用查询参数 `category` 选择分类。两次请求对业务含义不同：

~~~http
GET /public-api/products?category=phone HTTP/1.1
Host: www.example.com
~~~

~~~http
GET /public-api/products?category=laptop HTTP/1.1
Host: www.example.com
~~~

如果某条 CDN Cache Rule 被错误设置为“忽略所有 Query 参数”，CDN 便可能把两条请求归入同一个缓存键，导致电脑分类用户拿到手机列表。反过来，若营销参数 `utm_source` 已经由应用确认不影响响应正文，站点可以评估从缓存键中排除它以减少无意义版本。**是否将 Query、Host、请求头或其他属性纳入缓存键，要先问“它改变了响应内容吗”，再权衡命中率**。不同 CDN 产品的默认 Cache Key 和配置范围并不一致。[[3]](https://developers.cloudflare.com/cache/how-to/cache-keys/)

对于上一章介绍的压缩协商，CDN 还要保证相同脚本 URL 的不同 Content-Encoding 版本不会错误交付；服务器通过 `Vary: Accept-Encoding` 声明响应变体，而 CDN 的具体压缩归一化、Vary 支持和缓存键配置仍由供应商实现。站点应通过两组真实请求头分别测试，而不能仅凭源站已经返回 Vary 就宣布变体问题解决。[[4]](https://developers.cloudflare.com/cache/concepts/vary/)

### 【CDN 命中后还要判断共享缓存是否新鲜、请求是否允许直接复用】

继续使用第一节返回的 `max-age=600, s-maxage=3600`。CDN 作为共享缓存，采用 3600 秒的新鲜度寿命；浏览器作为私有缓存采用适用的 600 秒规则。这不是两段依次执行的缓存：两个节点可以同时保留响应，分别根据已累计 Age、请求条件及自己是否还拥有副本决定复用资格。

例如浏览器在源站生成列表 11 分钟后发送 `If-None-Match: "phone-list-v8"`，说明它的本地响应需要验证。CDN 的 v8 副本若仍在共享新鲜期，并能满足下游条件，就可直接答复 304。浏览器用 304 更新已存元数据，复用自己原有的 JSON 正文。这个处理没有必要再到 Web 服务器。如果 CDN 的副本也已过期，则要遵守 `s-maxage` 的严格再验证语义，不能未经成功验证就直接返回旧副本。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

### 【CDN 过期以后，条件回源和后台更新对应不同的复用条件】

假设手机列表 v8 在 CDN 已超出允许直接使用的期限：若 CDN 有 ETag，它可以向 Web 服务器发送 `If-None-Match: "phone-list-v8"`；源站仍使用 v8 时返回 304，CDN 保留正文并刷新适用元数据；源站已经更新列表时返回 200 与 v9，CDN 按共享资格判断是否保存新响应。**过期副本仍在存储中是一件事；能否返回给当前请求者是另一件事。**

如果产品业务允许短时间使用过期数据，可以设计 **SWR（stale-while-revalidate，过期时先返回并重新验证）**，但不能简单把它理解为任何 CDN 默认开启的定时任务。以下是同一产品列表在**另一套独立响应策略**下的时序；它不再包含严格要求共享缓存过期后重新验证的 `s-maxage`：

~~~http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=60, stale-while-revalidate=30
ETag: "phone-list-v8"

{"category":"phone","items":[{"id":101,"name":"Phone A"}]}
~~~

假设 CDN 按这套指令处理缓存，并且实现支持 SWR：取得响应后 0～60 秒的请求可使用新鲜副本；到第 70 秒又有用户请求，此时属于额外允许的 30 秒过期窗口，CDN 可**先返回 v8 正文给这位用户**，同时用 ETag 向上游验证。上游 304 表示 v8 未变，CDN 更新元数据；上游 200 返回 v9 时，CDN 保存新副本，**先前那位已收到 v8 的用户不会被 HTTP 缓存自动换成 v9**。如果直到第 91 秒都没有成功更新，不能仅凭 SWR 指令继续无限复用旧结果。[[6]](https://www.rfc-editor.org/rfc/rfc5861)

另一个机制 stale-if-error 只在符合指定错误条件、过期窗口及协议限制时允许返回旧副本，目的是故障降级而非后台刷新。订单状态、库存扣减和授权结果等不允许陈旧的业务响应，不应因为降低延迟就默认使用这些过期复用机制。对具体 CDN 还需核验它是否支持相关指令，以及自定义 Edge TTL、规则优先级是否改变实际行为。

### 【CDN 的自然过期、验证与主动 Purge 管理不同的更新环节】

- **自然过期**：副本已经超过新鲜期，不能再按普通新鲜响应直接复用；副本可能仍留在节点中用于条件验证。
- **条件回源**：利用 ETag 或 Last-Modified 验证；304 尽量复用正文，200 获得新版本。
- **主动 Purge（清理或失效）**：由发布系统或管理员明确要求 CDN 对某些 URL、标签或规则对应的副本失效，加快后续重新获取；具体支持哪些范围取决于供应商。

例如官网发布新版 `index.html`，如果边缘 HTML 仍处于长期新鲜期，管理员可以根据部署策略清理 CDN 中的 HTML 入口副本，让下一次访问重新取得新版入口；但这**不会把所有用户浏览器里的 HTML 或 JS 缓存同步删除**。因此，Purge 是 CDN 自身的管理操作，内容 Hash 是发布新资源 URL 的方法，二者不互相代替。

CDN 还会受节点分布、容量驱逐、回源连接、边缘 TTL 和供应商行为影响。定位时需要区分浏览器 Network 的结果与 CDN 控制台、边缘响应头、源站访问日志：浏览器出现 304 不能证明应用必然被访问；CDN 出现 MISS 也不等于一定执行了数据库查询，Web 服务器仍可能直接提供源文件或命中自己的代理缓存。

## 5. Web 服务器需要区分静态文件服务与真正启用的 HTTP 代理缓存

### 【Web 服务器读取原始文件不代表命中 HTTP 代理缓存】

Web 服务器可以由 Nginx、Apache HTTP Server、Caddy 等软件承担，主要用于 HTTP 入口、静态资源服务和反向代理。不同产品的代理缓存能力及配置不同，以下以 Nginx 为明确的配置示例：

| Web 服务器工作模式 | 请求怎样完成 | 哪种资源复用 |
| --- | --- | --- |
| 静态文件服务 | 按 root/alias 找到文件并直接响应 | 操作系统文件缓存及 Nginx 静态文件处理；可向浏览器/CDN发送 HTTP 缓存头 |
| 反向代理但不缓存 | proxy_pass 将请求转发至上游，每个请求通常到达上游 | 代理自身不保存可复用 HTTP 响应副本 |
| 反向代理并启用 proxy_cache | 按配置的缓存键、响应资格和新鲜度检查已有上游响应 | Nginx 可以成为一层独立的共享 HTTP Cache |
| 其它静态托管源站 | 对象存储、托管平台直接给出文件 | 不一定存在 Nginx，也不一定有应用服务器 |

静态文件“存在于磁盘上”并不等于“缓存副本已经失效或即将失效”。Nginx 静态文件可以一直存在直到部署替换或删除，HTTP Cache-Control 影响的是**下游浏览器/CDN 能否复用响应**；若没有额外配置，不能把磁盘文件自动解释为 proxy_cache。[[7]](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)

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

try_files 负责按映射位置查找文件或内部跳转；示例里的 /assets/ 路径未命中会返回 404，不会自动去应用服务器。**不能将 SPA fallback 用在所有静态文件上**，否则构建资源缺失时可能返回 HTML 而不是正确的 JS/CSS 资源，产生 MIME 类型及部署错误。[[7]](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)

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
        location /public-api/ {
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

在这个例子中，用户发 `GET /public-api/products?category=phone`，Nginx 请求的目标属于 `/public-api/`，因此会进入已开启 `proxy_cache` 的 location；它使用 `$request_uri` 作为缓存键的一部分，从而保留 `category=phone`。相同分类且同一键的第二次请求，如果上游响应允许存储、代理已经保存副本并且还可以直接复用，就能由代理缓存返回，不必再次进入应用服务。假设 Nginx 返回 `X-Cache-Status: MISS` 或 `X-Cache-Status: HIT`，这个字段只说明**当前这层代理缓存的状态**，不说明浏览器或 CDN 是否命中。

若应用返回产品列表并携带 `Cache-Control: public, max-age=600, s-maxage=3600`，HTTP 响应头的相关缓存规则会影响 Nginx 代理缓存；示例里的 `proxy_cache_valid 200 5m` 是针对状态码的候选缓存期限，不能简单理解为强制覆盖所有上游控制字段。Nginx 文档说明，上游的 `X-Accel-Expires`、`Expires`、`Cache-Control` 等可以对缓存时间形成更高优先级的控制；收到 `Set-Cookie` 的响应一般不会进入默认代理缓存；也会处理 Vary 中的请求头变体。[[8]](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

真实业务如果有用户级参数、授权头、Cookie、地理位置或租户信息影响响应，就必须在开启共享代理缓存前完成安全设计。示例假定 `/public-api/` 是经过业务审查的匿名公开接口，**并不代表仅按路径区分就能安全缓存任意接口**。不要通过强制忽略 `Cache-Control`、`Set-Cookie` 等上游字段来人为制造 HIT。

### 【代理缓存的磁盘存储周期和 HTTP 新鲜期需要分别管理】

Nginx 前面配置的 `proxy_cache_path /var/cache/nginx/public_api` 是保存上游响应副本的目录，`keys_zone=public_api_cache:10m` 让 Nginx 使用共享内存区维护缓存键和元数据，`max_size=1g` 用于约束缓存容量。`inactive=30m` 描述缓存条目在一段时间**未被访问时**可以被清理，不是 HTTP `max-age=1800` 的意思。一个仍有用户持续访问的响应，在 HTTP 意义上可能已过期但物理文件依然存在；一个长时间没有请求的副本，也可能因容量或不活跃淘汰从存储中消失。这就是缓存**新鲜度**与**存储保留时间**不能混为一谈的原因。[[8]](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

Nginx 在代理缓存命中但副本过期以后，如果此前保存了 ETag 或 Last-Modified，可以通过 `proxy_cache_revalidate on` 允许对上游发条件验证。上游若回 304，Nginx 不用重复下载相同的产品 JSON，只需按规则刷新缓存元数据；上游若回 200 和 v9，则取得新版正文并更新可存副本。

### 【允许过期复用时，需要显式配置并解释实际请求时序】

对于一个已经确认能够容忍陈旧的公开接口，可以在理解上游缓存策略以后，另外选择 Nginx 提供的后台更新机制。下例只是展示相关指令之间的组合，**不是对任意 API 的默认推荐配置**：

~~~nginx
# 放入前述 location /public-api/，仅适用于允许返回旧公开数据的接口
proxy_cache_use_stale updating;
proxy_cache_background_update on;
~~~

设产品列表 v8 已保存在 Nginx 代理缓存中，HTTP 缓存策略允许其在更新期间返回过期内容。当用户请求触发更新时，`proxy_cache_background_update on` 允许 Nginx 对过期条目启动后台子请求；`proxy_cache_use_stale updating` 允许更新中的其它请求使用旧副本，从而减少多个用户同时等待应用查询。后台更新得到 304 时，代理保留 v8 正文并更新缓存元数据；得到 200 和 v9 时，代理保存新的可缓存响应。**实际能否先返回旧正文还要遵守上游响应指令及缓存配置，不代表开启这两行就能无视 must-revalidate 或适用 s-maxage 的严格约束**。相关指令分别解决“过期时能否用旧响应”和“是否在后台触发更新”，不能与所有 CDN 的 SWR 实现视为同一开关。[[8]](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

### 【Web 服务器静态文件更新不负责通知浏览器和 CDN】

发布 app.b92d.js 只是源站增加了一份带新 URL 的文件；HTML 必须更新引用并被浏览器重新取得，客户端才会请求新的资源。若源站始终在同一个 /assets/app.js URL 原地覆盖，即使磁盘文件已经变化，下游仍可能按长期 TTL 直接使用旧响应。静态源文件还应配合 ETag/Last-Modified、正确的 Cache-Control 与保留旧 Hash chunk 的发布策略。新文件先于新 HTML 可用，以及回滚时旧文件仍可访问，是版本正确性的条件。



Nginx 的公开入口、静态文件与应用服务器的路由职责详见 [反向代理与 Web 入口体系](./F-反向代理与Web入口体系.md)。本文关注 Web 服务器作为**源文件提供方**或**显式启用 HTTP 代理缓存时的响应复用节点**，不将操作系统文件缓存和 HTTP 代理缓存混成同一个机制。

## 6. 资源内容 Hash、缓存过期与版本发布形成完整更新周期

### 【内容哈希文件名负责改变 URL，而不是删除旧缓存】

构建工具会基于资源内容生成带有指纹的文件，例如：

~~~text
旧版本 index.html
  └─ /assets/app.a81f.js
新版本 index.html
  └─ /assets/app.b92d.js
~~~

app 的内容变化后，资源 URL 从 app.a81f.js 变为 app.b92d.js。因此浏览器、CDN 和 Nginx 代理缓存会将它视为不同目标资源；它们无需先删除所有旧副本，新 URL 即可触发自己的缓存获取流程。

这个过程称为 **Cache Busting（通过版本化 URL 绕开旧副本）**。它不是对旧 URL 发送 purge、不是清空浏览器缓存，更不代表缓存策略会自动知道“代码版本已经更新”。[[9]](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)

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

HTML、JSON Manifest 或其他版本入口往往不具备内容哈希命名，常用可验证缓存或受控的短时新鲜度；如果关键更新必须即时可见，则需要显式更新机制。Nginx 和 CDN 上的 Cache Purge 可以加快共享缓存更新，但**CDN purge 不会自动删除全部用户设备上的 HTTP Cache**。

### 【内容 Hash 文件的长期缓存必须建立在 URL 不变性上】

对于官网生成的 `/assets/app.b92d.js`，构建系统保证该 URL 对应的文件内容在此版本生命周期内不再原地覆写。浏览器从新版 HTML 发现这个资源路径并首次请求时，Web 服务器可返回：

~~~http
GET /assets/app.b92d.js HTTP/1.1
Host: www.example.com
~~~

~~~http
HTTP/1.1 200 OK
Content-Type: text/javascript
Cache-Control: public, max-age=31536000, immutable

（此处省略实际 JavaScript 文件正文）
~~~

`max-age=31536000` 表示大约一年的新鲜度寿命；`immutable` 向支持该指令的客户端表明在仍然新鲜时这份表示不会变化，因而可以减少不必要的验证。它并不是“无限期保存”或“禁止用户删除缓存”，也不会让旧 HTML 自动引用新脚本。**只有内容变更必然换 URL，长期 immutable 才与发布机制一致**。[[10]](https://www.rfc-editor.org/rfc/rfc8246)

反例也要放回同一个场景：若脚本始终叫做 `/assets/app.js`，部署时直接覆写源站磁盘文件，却向浏览器声明一年的 `max-age` 和 `immutable`，浏览器可能在新鲜期内根本不请求更新后的内容。此时即使源站文件已经更新成功，也不等于浏览器能立刻读到新版。可用内容 Hash 改 URL，从缓存键层面让新版与旧版自然分开；源站仍需保证两者在各自使用期间都可访问。

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

仍然以同一个产品官网为例：产品列表可能提供两个图片尺寸的请求地址，分别是 `/images/phone-a.jpg?width=320` 与 `/images/phone-a.jpg?width=1280`。如果图片服务确实对 `width` 参数执行缩放，那么两个 URL 返回的实际图片字节与尺寸不同，CDN 不应在自定义缓存键中排除这个参数。相反，带 Hash 的脚本发生版本更新时，应该由构建工具生成新的 URL，让浏览器和 CDN 按新目标自然区分版本。**前者属于同一资源请求的业务输入不同，后者属于构建产物的版本标识更新**，不能通过同一种“清空缓存”手段替代。

### 【浏览器和共享缓存独立判断 TTL，SWR 必须单独核对过期复用资格】

这里专门区分两组容易混淆的配置：第一组控制浏览器与 CDN 各自的新鲜度，第二组允许在窗口内使用过期数据。虽然它们都属于 Cache-Control，但不能只看配置项数量就将它们叠加成任意希望的时间线。

**第一组：同一公开产品列表，在浏览器和 CDN 使用不同新鲜期。**

应用服务已经确认 `/public-api/products?category=phone` 对所有匿名用户返回相同内容，响应可以设置：

~~~http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=600, s-maxage=3600
ETag: "phone-list-v8"

{"category":"phone","items":[{"id":101,"name":"Phone A"}]}
~~~

浏览器依据 600 秒规则判断自己的副本，CDN 作为共享缓存依据 3600 秒规则判断自己的副本，Age 等用于避免误以为从 CDN 转发给浏览器就能把响应“年龄归零”。**s-maxage 还要求共享缓存中的过期响应在成功验证后才能再次复用**。所以在正常运行时，一个浏览器过期后可能向仍有新鲜副本的 CDN 验证；CDN 过期后则需要遵守对其自身的重新验证约束。这个机制已经在第 2、4 章通过 07:02 / 07:11 的时间线解释，此处补充其在资源策略选择上的作用。[[1]](https://www.rfc-editor.org/rfc/rfc9111)

**第二组：业务允许有限时间的陈旧响应，希望先返回旧结果再刷新。**

假设产品列表不是强一致业务，数据更新的短暂延迟可以接受，并且使用的缓存产品支持 HTTP SWR。服务器采用一套**与第一组不同**的响应策略：

~~~http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=60, stale-while-revalidate=30
ETag: "phone-list-v8"

{"category":"phone","items":[{"id":101,"name":"Phone A"}]}
~~~

某缓存节点已保存此响应，且累计年龄按教学假设从 0 开始：前 60 秒它是新鲜的；第 70 秒有新请求时，在符合 SWR 和其他复用条件的前提下可以先返回 v8，并在后台验证；上游若回 200 与 v9，更新的是缓存后续可提供的副本，不意味着已收到 v8 的页面会自动更新。超过第 90 秒仍无成功验证时，不能仅凭 SWR 无限返回旧值。**这一组不包含 s-maxage，正是为了避免忽略它的严格重新验证语义**。[[6]](https://www.rfc-editor.org/rfc/rfc5861)

工程上先确定的是：哪些响应允许跨用户共享？正常情况下多久必须获得较新的数据？在上游变慢或不可用时最多允许返回多旧的正文？浏览器、CDN、Web 服务器是否支持所选指令？回答完这些问题后再配置 TTL、验证器和 SWR，而不是在响应头里一次性塞入所有术语。

### 【同一份资源的更新机制分布在不同阶段而不是互相替代】

| 机制 | 决策发生在哪里 | 实际解决什么问题 | 不能替代的职责 |
| --- | --- | --- | --- |
| 内容 Hash 文件名 | 前端构建与发布 | 资源内容变化后产生新的 URL，以新缓存键获取新版 | 不删除浏览器或 CDN 中的旧响应 |
| max-age / s-maxage | 适用的浏览器或共享 HTTP 缓存 | 判定副本现在是否新鲜 | 不在时间到达时强制服务器重建文件 |
| ETag / Last-Modified | 条件请求被处理时 | 资源未变可返回 304，避免重传整个正文 | 不是缓存键，也不会主动推送更新 |
| stale-while-revalidate | 支持指令且满足窗口的缓存节点 | 可先回应旧正文，同时验证或刷新 | 不保证窗口内没有请求也会定时刷新 |
| CDN Purge / 代理缓存清理 | 对应缓存系统的管理操作 | 主动失效该层共享缓存副本 | 不会清理所有用户浏览器缓存 |
| immutable | HTTP 缓存复用新鲜响应时 | 声明该 URL 在新鲜期内不会变化 | 不能用于内容会在相同 URL 原地覆写的文件 |

这里的核心是**缓存协议管理已取得的 HTTP 响应，构建发布系统管理资源 URL 与源站文件**。一旦两条线分开，就能解释为什么服务器已经部署新文件，浏览器仍然可以正常使用旧脚本；也能解释为什么带 Hash 的文件可以设很长的新鲜度，而 HTML 往往需要能及时重新验证。


## 7. 通过同一官网请求场景验证缓存命中、过期与发布更新

### 【案例一：官网首次访问时，MISS 怎样沿链路到达静态文件】

~~~text
浏览器第一次请求 /index.html
    → 本地 HTTP Cache 无副本
    → CDN 当前边缘节点无副本
    → Web 服务器从静态目录读取 index.html → 响应 200
    → CDN / 浏览器分别按存储资格决定是否保存

浏览器解析 HTML 发现 /assets/app.a81f.js
    → 浏览器此 URL MISS
    → CDN 此 URL MISS
    → Web 服务器读取 app.a81f.js → 响应 200
    → 若允许长期缓存，CDN 和浏览器各自保存响应副本
~~~

这里 Web 服务器处理了静态文件请求，但可能没有启用任何 HTTP 代理缓存；应用服务器也未必参与。每层是否保存响应，要独立验证 HTTP 头和对应节点状态。

### 【案例二：同一个用户再次访问与另一个用户首次访问】

如果 app.a81f.js 仍处于浏览器允许直接复用的新鲜期，原用户第二次访问时 JS 可以本地返回，不需要到 CDN。与此同时 index.html 可能因为 no-cache 要求验证，浏览器对 HTML 发 If-None-Match 并得到 304，所以同一次导航里“HTML 发网络验证、JS 完全本地复用”是合理的。

另一个用户的浏览器尚无 app.a81f.js；若访问到已存该脚本且新鲜的 CDN 节点，可以直接从 CDN 取得脚本，而不再访问 Web 服务器。这解释了浏览器缓存侧重减少单个浏览器重复请求，CDN 缓存侧重多个用户共享同一公开响应。

### 【案例三：公开产品 API 过期时区分“可以先返回”和“必须先验证”】

这一场景沿用第 4 章中已经给出完整 HTTP 响应报文的产品列表：业务明确允许列表短暂陈旧，服务器使用 `max-age=60, stale-while-revalidate=30`，缓存节点也确认支持该策略。用户在缓存年龄第 70 秒发起请求时，CDN 可先返回 v8，再向上游验证；应用更新到 v9，CDN 保存新响应，但用户当前已经拿到的 v8 不会自动在页面上替换。要在当前页面反映 v9，需要前端另行发起数据更新。

对照另一种策略：如果响应是 `max-age=600, s-maxage=3600`，则共享缓存过期后必须成功验证，不能照搬上述“第 70 秒先返回旧内容”的 SWR 时序。**缓存行为先由响应规则和业务可容忍陈旧程度决定，再由具体 CDN/代理产品实现。** 因此，案例中的两个响应头组合是相互区分的方案，不是应当放在同一条 Cache-Control 中叠加的清单。

### 【案例四：发布新版时必须让 HTML 发现新的 Hash URL】

~~~text
旧 HTML 引用 /assets/app.a81f.js
构建新产物    /assets/app.b92d.js
先发布新 JS 至 Web 服务器或源站存储
再发布引用新文件的 HTML
浏览器下次重新获取/验证 HTML，发现 app.b92d.js
浏览器与 CDN 对新 URL 重新匹配/请求/保存
旧 app.a81f.js 可以继续为仍然打开的旧页面提供资源
~~~

如果用户长期看到旧版本，首先判断用户当前取得的是不是旧 HTML；如果新 HTML 已经到达，但新 JS 404，检查新文件是否先于 HTML 发布、Web 服务器静态路由是否正确，或旧 chunk 是否被过早删除。简单删除 CDN 对旧 JS 的缓存，不能保证用户的旧 HTML 自动改为引用新 URL。

### 【案例五：Web 服务器自己也启用代理缓存时请求路径怎样变化】

若某公开 API 在 Web 服务器显式开启 proxy_cache，则 CDN MISS 后请求先到 Web 服务器：Web 服务器可能命中自己保存的上游响应并返回，应用服务器仍然不会参与；如果代理缓存也 MISS 或需要验证，才继续请求应用。若 Web 服务器只是执行 proxy_pass、未启用 HTTP 代理缓存，则不存在这一额外命中层。静态文件服务则是另一条直接读取部署文件的路径。**不能从“CDN MISS”推导“一定查询了数据库”，也不能从“Web 服务器返回了静态 JS”推导“proxy_cache HIT”。**

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

### 【通过一份页面更新故障记录，依次确认浏览器、CDN 与 Web 服务器的责任】

假设官网已从 `app.a81f.js` 发布到 `app.b92d.js`，用户反馈“发布后仍看到旧页面”。直接让用户清空缓存可能掩盖原因，应先用 DevTools Network 在**普通导航**下确认浏览器取得的 `/index.html` 究竟是什么版本，而不是先检查旧 JS 本身。

**第一步，核对 HTML 的请求与响应。** 如果浏览器直接使用仍新鲜的旧 HTML，页面将继续引用 `app.a81f.js`；此时应该检查 HTML 缓存策略及其更新发现机制。如果浏览器向网络发 `If-None-Match: "html-v3"`，并得到 304，说明负责该次验证的 CDN 或上游认为 HTML 尚未变化。此时需要用 CDN/源站日志进一步确认究竟是谁判断的“未变化”，不能把所有 304 都归因于最终应用。

**第二步，比较 CDN 与源站提供的 HTML 版本。** 如果浏览器得到了 200，但正文仍指向旧脚本，可能是 CDN 保留旧 HTML、副本验证策略不正确，也可能是 Web 服务器部署目录里还没有新 HTML。此时应检查 CDN 状态、对应源站文件和多实例发布一致性。如果 HTML 已经引用 `app.b92d.js`，问题就不在“旧 HTML 是否更新”，而应检查新资源 URL 能否取得。

**第三步，确认新 JS 的真正请求路径。** 新 URL 的浏览器缓存一般不会命中旧 URL 的副本。浏览器若请求 `/assets/app.b92d.js` 遇到 404，检查新文件是否已经部署到 Web 服务器、CDN 回源路径是否正确；如果旧页面中的动态 import 仍在请求 `app.a81f.js` 并发生 404，则检查是否过早清理旧构建产物。

**第四步，把结果关联到正确的缓存层。** 浏览器 Network 显示本地命中，只能说明本次未为了该资源进入网络；CDN HIT 说明边缘可以满足下游请求；Nginx 的 `$upstream_cache_status` 只有在走代理缓存的相应 location 时才能说明代理 HIT/MISS；Web 服务器读取磁盘静态文件并不等于 `proxy_cache HIT`。这套排查顺序可以把“URL 发现错误”“缓存变体错误”“副本过期”“源站部署缺失”区分成可验证的不同故障。

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
2. IETF. [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110). ETag、Last-Modified、条件请求和 304。
3. Cloudflare. [Cache Keys](https://developers.cloudflare.com/cache/how-to/cache-keys/). 边缘缓存键的默认组成及自定义配置示例。
4. Cloudflare. [Vary](https://developers.cloudflare.com/cache/concepts/vary/). 响应变体如何与 CDN 缓存规则共同工作。
5. MDN. [HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching). 浏览器缓存、启发式缓存、刷新与版本资源实践。
6. IETF. [RFC 5861: HTTP stale response extensions](https://www.rfc-editor.org/rfc/rfc5861). stale-while-revalidate 与 stale-if-error。
7. NGINX. [Serve Static Content](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/). Nginx root、alias 和 try_files 的静态文件语义。
8. NGINX. [ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html). proxy_cache、缓存有效期、条件验证、锁与过期处理。
9. MDN. [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control). 内容哈希与缓存指令。
10. IETF. [RFC 8246: HTTP Immutable Responses](https://www.rfc-editor.org/rfc/rfc8246). immutable 的适用范围与含义。
