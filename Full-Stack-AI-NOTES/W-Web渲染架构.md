# Web 页面渲染架构从导航模型到生成、缓存与 Hybrid 形成完整体系

Web 页面渲染不能只背 MPA、SPA、CSR、SSR、SSG、SWR、ISR、Hybrid 一组名词。它们回答的是不同层次的问题：

~~~text
Web Application
│
├─ Navigation Model（导航模型）
│  └─ 页面之间怎样切换？
│     ├─ MPA / Document Navigation
│     └─ SPA / Client-side Navigation
│
├─ Generation Strategy（页面生成策略）
│  └─ 主要页面内容在哪里、什么时候生成？
│     ├─ CSR：Browser Runtime
│     ├─ SSR：Request Time Server
│     └─ SSG / Prerender：Build Time
│
├─ Reuse / Regeneration（结果复用与再生成）
│  └─ 已生成结果怎样复用、什么时候更新？
│     ├─ Static Reuse
│     ├─ Cache / TTL
│     ├─ SWR
│     └─ ISR / Incremental Regeneration
│
└─ Hybrid Rendering（混合渲染）
   └─ 同一个应用怎样按 Route 组合不同策略？
~~~

因此最重要的边界是：

~~~text
MPA ≠ SSR
SPA ≠ CSR

CSR / SSR / SSG
≠
SWR / ISR
~~~

MPA / SPA 描述导航模型；CSR / SSR / SSG 主要描述页面生成位置与时间；SWR / ISR 更接近生成结果的缓存与再生成策略；Hybrid Rendering 再把这些能力按 Route 或场景组合起来。

本文负责建立完整的页面渲染架构与选型框架。SSR 从 Document Request 到 Payload、Hydration、Client Runtime 的内部细节继续进入 [服务端渲染完整链路](./F-服务端渲染完整链路.md)。

## 1. Web 应用首先要把“页面怎样切换”和“页面怎样生成”分开

### 【Navigation Model 回答页面怎样切换】

导航模型关注一次页面切换是否进入新的 Document 生命周期：

~~~text
Navigation
│
├─ Document Navigation
│  └─ 浏览器请求新的 HTML Document
│
└─ Client-side Navigation
   └─ 保留当前 Document
      由 JavaScript 更新 URL、状态和 UI
~~~

MPA（Multi-Page Application，多页面应用）更接近前者；SPA（Single-Page Application，单页应用）更接近后者。

### 【MPA 的核心是新的 Document Navigation，不是“必须 SSR”】

典型 MPA 导航：

~~~text
Page A
↓
User Navigation
↓
New HTTP Request
↓
New HTML Document
↓
Browser Parse / Render
↓
Page B
~~~

这个新 Document 可以来自：

~~~text
Dynamic SSR HTML
Static HTML
Build-time Generated HTML
~~~

所以：

~~~text
MPA
≠
SSR
~~~

新的 Document Navigation 也不代表 CSS、JavaScript、Font、Image 都一定重新下载。浏览器仍会根据 HTTP Cache、Memory Cache、Disk Cache、Service Worker 等决定是否复用资源。

~~~text
New Document
↓
发现资源引用
↓
Cache / Validation
↓
决定复用还是 Network Download
~~~

因此：

~~~text
Resource Reference
≠
Network Download
~~~

缓存机制继续参考 [CDN缓存与浏览器缓存笔记](./C-CDN缓存与浏览器缓存笔记.md)。

### 【SPA 的核心是在当前 Document 内完成导航】

SPA 在应用启动以后，主要导航由 Client Router 完成：

~~~text
Current Document
↓
User Navigation
↓
History API / Hash
↓
Client Router
↓
Load Route Data / Code
↓
Update Component Tree / DOM
~~~

“单页”描述的是 Document 生命周期，不代表视觉上只有一个界面，也不代表导航过程中没有网络请求。SPA 后续导航仍可能加载：

~~~text
API Data
Dynamic import() Chunk
Route-level CSS
Image / Font
Other Lazy Resources
~~~

真正的区别是：

~~~text
MPA Navigation
→ 新 Document Navigation

SPA Navigation
→ 当前 Document 内更新 Application State
~~~

History API、Hash Router 等更具体的机制继续参考 [SPA路由（history路由+hash路由）核心知识点笔记](./S-SPA路由（history路由+hash路由）核心知识点笔记.md)。

## 2. CSR、SSR 与 SSG 代表三种基础的页面生成成本分配方式

判断页面生成策略时，比“是不是 SPA”更稳定的问题是：

~~~text
主要页面内容在哪里生成？
+
在什么时候生成？
~~~

| 策略 | 主要生成位置 | 主要生成时间 | 首次请求主要得到什么 |
| --- | --- | --- | --- |
| CSR（Client-Side Rendering，客户端渲染） | Browser | Browser Runtime | HTML Shell + Client JavaScript |
| SSR（Server-Side Rendering，服务端渲染） | Server | Request Time | 当前请求生成的 HTML |
| SSG（Static Site Generation，静态站点生成）/ Prerender | Build Runtime | Build Time | 提前生成的 HTML |

这三种模式本质上都在重新分配“页面生成成本”。

### 【CSR 把主要页面 UI 的生成放到 Browser Runtime】

CSR 的典型链路是：

~~~text
Document Request
↓
Initial HTML / App Shell
↓
Client JavaScript 下载 / 解析 / 执行
↓
Data Fetch（按应用需要）
↓
生成 Component Tree / DOM
↓
Browser Layout / Paint
~~~

CSR 不等于初始 HTML 必须完全为空。HTML 仍可以包含静态 Header、Skeleton、Meta 或 App Shell。真正的判断标准是：

> 主要页面内容是否必须等待浏览器 JavaScript 执行以后才生成。

CSR 的优势来自单一 Browser Runtime：

- 浏览器 API 可以直接使用；
- 不需要维护 Server / Browser 两套运行边界；
- 没有 SSR Hydration 一致性问题；
- 可以部署到普通静态托管环境。

它的主要代价也来自同一点：主要内容更依赖 Client JavaScript 下载、执行和可能的数据请求。

### 【SSR 把首次 HTML 生成移动到 Request Time Server】

SSR 的基本链路是：

~~~text
Document Request
↓
Server Route / Data
↓
Component Server Render
↓
HTML + Initial State / Payload
↓
Browser Parse / Paint
↓
Client JavaScript
↓
Hydration
↓
Interactive Application
~~~

SSR 可以让主要内容直接进入初始 HTML Response，但不代表：

~~~text
SSR
= 性能一定更好
= SEO 一定更好
= 客户端不需要 JavaScript
~~~

现代 Vue / Nuxt SSR 通常仍需要 Hydration，使服务端生成的 HTML 进入完整客户端运行态。Vue 官方同样把 SSR 描述为服务端先生成 HTML，再由客户端 Hydration 接管已有标记。[[1]](https://vuejs.org/guide/scaling-up/ssr)

SSR 同时引入新的工程约束：

- Request-time Server Compute；
- Server / Browser Runtime 差异；
- Request-scoped State；
- Payload 序列化；
- Hydration 成本；
- Hydration Mismatch 风险。

这些内部机制统一进入 [服务端渲染完整链路](./F-服务端渲染完整链路.md)。

### 【SSG / Prerender 把页面生成继续提前到 Build Time】

如果页面主要内容不依赖每次请求才能确定的数据，那么 Request-time SSR 还可以继续提前：

~~~text
Build Time
↓
Component + Build-time Data
↓
Render HTML
↓
Generate Static Artifact
↓
Deploy
↓
Request
↓
Serve Existing HTML
~~~

SSR 与 SSG 都可能给浏览器完整 HTML，但区别在于：

~~~text
SSR
→ Request Time 生成

SSG / Prerender
→ Build Time 生成
~~~

SSG 的收益来自“生成一次、多次复用”，代价包括：

- 内容变化后通常需要重新生成；
- 页面数量大时 Build Time 增加；
- Dynamic Route 需要在构建阶段能够发现或显式提供；
- 用户私有或请求级数据不适合直接固化成公共静态页面。

**项目实践映射：** official-network 将首页、产品、联系等稳定公开 Route 配置为 Prerender，把稳定页面生成成本提前到构建阶段。对应分析见 [Prerender 把稳定页面的生成成本提前到构建阶段](https://github.com/cxDlogver/official-network/blob/main/docs/页面渲染策略与Hybrid%20Rendering源码分析.md#3-prerender-把稳定页面的生成成本提前到构建阶段)。

## 3. 现代渲染模式的“演进”是问题驱动的成本重新分配，而不是简单技术代际

严格从 Web 历史看，服务端生成 HTML 早于 CSR，所以不能把：

~~~text
CSR → SSR → SSG
~~~

当成真实年代演进。

更有价值的是从现代 JavaScript Application 的问题演进理解：

~~~text
服务器直接返回页面
    ↓
客户端交互需求增强
    ↓
SPA / CSR 把大量 UI 逻辑移到 Browser
    ↓
首屏越来越依赖 JavaScript 与 Client Data Fetch
    ↓
现代 SSR 把首次页面生成重新移回 Server
    ↓
Hydration 保留 Client Runtime
    ↓
每个请求 SSR 又带来 Server Compute
    ↓
SSG / Prerender 把稳定页面提前到 Build Time
    ↓
纯静态结果又存在更新及时性问题
    ↓
SWR / ISR 在“结果复用”和“内容新鲜度”之间折中
    ↓
不同 Route 需求不同
    ↓
Hybrid Rendering 按场景组合
~~~

这里任何一步都没有完全淘汰前一步：

- CSR 仍适合强交互、私有后台和不强调初始索引的应用；
- SSR 仍适合必须在 Request Time 根据请求生成内容的页面；
- SSG 仍适合稳定公共内容；
- SWR / ISR 只适合能够共享并容忍一定旧内容的页面；
- Hybrid 只是把不同策略组合到同一个应用。

## 4. SWR 与 ISR 解决的是“生成结果如何复用和更新”，不是新的页面生成位置

### 【SWR 的核心是先复用 stale 结果，再后台更新】

SWR（Stale-While-Revalidate，过期内容先返回并后台重新验证）首先是缓存语义。RFC 5861 允许缓存在指定 stale 窗口内先返回旧响应，同时异步重新验证，以隐藏重新验证带来的等待。[[2]](https://www.rfc-editor.org/rfc/rfc5861.html)

把这一思想用于完整页面响应，可以抽象为：

~~~text
Cache Miss
↓
生成页面 Response
↓
写入 Cache

Fresh Window
↓
直接返回缓存

TTL 到期
↓
先返回 Stale Response
+
后台 Revalidate / Regenerate
↓
新 Response 替换旧 Cache
~~~

所以 SWR 不是另一套 Vue Renderer，而是在已有页面生成能力外增加“复用 + 更新”策略。

它解决的是：

~~~text
SSG
请求成本低
但更新慢

Request-time SSR
内容新
但每个请求重复计算

SWR
复用已有结果
+
后台更新
~~~

SWR 通常不适合直接用于共享用户私有页面，因为公共 Cache Key 如果没有包含用户身份维度，就可能造成跨用户页面复用。

### 【ISR 强调构建以后继续增量创建或更新静态结果】

ISR（Incremental Static Regeneration，增量静态再生成）关注：

> 页面不适合每次都全站重新 Build，但仍希望保持静态结果的低请求成本。

抽象关系：

~~~text
Static Result
↓
Request / Revalidation Condition
↓
只重新生成受影响页面
↓
更新对应 Static / CDN Cache
↓
其他页面无需整体重建
~~~

ISR 不是统一 Web Standard，不同框架和部署平台的触发方式、缓存位置以及阻塞 / 非阻塞行为可能不同。

Nuxt 当前官方文档中，Route Rules 可以配置 `swr`、`isr`、`prerender` 和 `ssr:false`。其中 `swr` 可以让过期响应先返回并在后台再生成；`isr` 在支持的平台上可以进一步使用 CDN Cache。[[3]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

因此不要简单写：

~~~text
SWR = ISR
~~~

更准确的理解是：

> 两者都解决生成结果如何在部署后继续更新，但 SWR 更接近 stale-while-revalidate 缓存语义，ISR 更强调增量更新静态结果；具体行为必须回到框架和部署平台确认。

**项目实践映射：** official-network 当前新闻 Route 使用 `swr: 86400`，没有配置 ISR。缓存需要首次建立或后台再生成时，仍会执行页面数据获取与 Server Render。对应分析见 [新闻使用 SWR 的真实链路](https://github.com/cxDlogver/official-network/blob/main/docs/页面渲染策略与Hybrid%20Rendering源码分析.md#4-新闻使用-swr-解决不能长期静态但也没必要每次都重新-ssr的矛盾)。

## 5. Hydration 把服务端或构建阶段生成的 HTML 接回客户端应用

现代 SSR / SSG 页面通常不是“HTML 返回就结束”。

~~~text
Initial HTML
↓
Browser Parse / Paint
↓
Client JavaScript Load
↓
Create Client Application
↓
Restore Initial State / Payload
↓
Hydration
↓
Interactive Application
↓
Client-side Navigation
~~~

Hydration（水合）表示客户端框架基于已有 HTML，重新建立组件、状态、事件与 DOM 的运行关系。

因此：

~~~text
HTML Visible
≠
Application Fully Interactive
~~~

而且：

~~~text
Prerender
≠
没有 JavaScript
~~~

Prerender 只是把首屏 HTML 提前生成；如果页面仍需要 Vue / React 等客户端交互，浏览器仍会加载 Client JavaScript 并 Hydration。

### 【Hydration 后仍然可以继续 SPA Navigation】

SSR / SSG 与 SPA 并不冲突：

~~~text
Initial Request
↓
SSR / Prerender HTML
↓
Hydration
↓
Client Runtime
↓
SPA Navigation
~~~

所以：

~~~text
SPA
≠
CSR
~~~

一个应用可以首次请求使用 SSR 或 Prerender，同时在 Hydration 后由 Client Router 完成后续页面切换。

## 6. Hybrid Rendering 把渲染策略从整站选择下沉为 Route 选择

如果整个应用只能统一选择：

~~~text
全部 CSR

或

全部 SSR
~~~

很快会遇到冲突：

- Marketing / Blog 希望核心内容尽早进入 HTML；
- Admin Dashboard 更关注登录后的复杂交互；
- Product Page 内容较稳定；
- News 会更新但可以容忍短时间缓存；
- Account / Order 依赖当前用户私有数据。

Hybrid Rendering（混合渲染）把决策改成：

~~~text
Application
│
├─ Route A
│  └─ Prerender
│
├─ Route B
│  └─ SWR
│
├─ Route C
│  └─ Request-time SSR
│
└─ Route D
   └─ CSR
~~~

Nuxt 官方把这一能力称为 Hybrid Rendering，并允许通过 Route Rules 为不同 Route 配置 `prerender`、`swr`、`isr`、`ssr:false` 等行为。[[3]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

### 【Route Strategy 与 Component Runtime Boundary 不是同一层】

Route 采用 Prerender 或 SSR，不代表页面里所有组件都必须 Server Render。

~~~text
Route Strategy
→ 决定整个页面响应什么时候生成、怎样复用

Component Runtime Boundary
→ 决定页面中的某一部分在哪个 Runtime 执行
~~~

例如一个 Prerender 页面内部仍然可以包含 ClientOnly 图表；一个 SSR 页面也可以把依赖 Canvas、WebGL、Observer 的局部能力推迟到 Client Runtime。

**项目实践映射：** official-network 首页 Route 使用 Prerender，但 Hero 使用 ClientOnly；新闻 Route 使用 SWR，但正文当前也因 Hydration Mismatch 风险使用 ClientOnly。对应分析见 [Route 级渲染策略和 Component 级 ClientOnly 是两条不同控制线](https://github.com/cxDlogver/official-network/blob/main/docs/页面渲染策略与Hybrid%20Rendering源码分析.md#5-route-级渲染策略和-component-级-clientonly-是两条不同控制线)。

### 【Edge Rendering 主要改变部署位置，不是独立生成模型】

Nuxt 当前文档特别说明 Edge-Side Rendering 更接近 Deployment Target（部署目标），而不是独立 Rendering Mode。[[3]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

因此：

~~~text
SSR
→ 回答 Request Time 是否由 Server 生成 HTML

Edge
→ 回答这个 Server Runtime 部署在哪里
~~~

## 7. 选择渲染策略时先判断数据归属和新鲜度，再判断性能与 SEO

“SEO 好就 SSR、后台就 CSR”只能作为粗略经验。更稳定的判断顺序是：

### 【第一步：页面是否可以被多个用户安全复用】

~~~text
页面是否包含用户私有 / 请求级数据？
        │
        ├─ 是
        │   └─ 不应直接共享整页静态缓存
        │      → Request-time SSR / Client Fetch
        │
        └─ 否
            → 可以继续评估 Prerender / Cache
~~~

Account、Order、权限页面通常不能把某个用户生成的完整 HTML 直接变成公共 SWR Cache。

### 【第二步：内容是否能在请求前确定】

~~~text
请求到来之前
能否得到主要内容？
        │
        ├─ 不能
        │   └─ Request-time SSR / CSR
        │
        └─ 能
            └─ 可以考虑 SSG / Prerender
~~~

### 【第三步：内容更新频率和可容忍陈旧时间】

~~~text
内容是否长期稳定？
        │
        ├─ 是
        │   └─ SSG / Prerender
        │
        └─ 否
            ↓
是否可以容忍一段时间旧内容？
        │
        ├─ 是
        │   └─ SWR / ISR / Cache Revalidation
        │
        └─ 否
            └─ Request-time SSR
~~~

### 【第四步：再判断核心内容对 Client JavaScript 的依赖】

如果页面高度私有、登录后长期使用、主要价值来自复杂交互，而且不强调初始公开 HTML，那么 CSR 可以减少 SSR 约束。

如果核心公开内容希望在 Initial HTML 中直接出现，则 SSR、SSG、Prerender 或 Cached HTML 通常更直接。

但性能和 SEO 都不能只由模式名决定。

## 8. 渲染策略影响性能与 SEO，但本质是重新分配成本

不同策略只是把计算放在不同阶段：

~~~text
CSR
→ Browser Runtime

SSR
→ Request Time Server
  + Browser Hydration

SSG / Prerender
→ Build Time
  + Request Time 直接分发

SWR / ISR
→ 复用已有结果
  + 条件触发再生成
~~~

最终性能仍由多条链共同决定：

~~~text
Server Response Time
Network
Cache Hit Rate
HTML Size
Critical CSS
Resource Size
Client JavaScript
Hydration Cost
Data Fetch
Browser Rendering
~~~

浏览器收到 HTML / CSS / JavaScript 后如何进入 DOM、Style、Layout、Paint、Raster 与 Composite，继续参考 [基于Chrome浏览器渲染原理](./J-基于Chrome浏览器渲染原理.md)。

### 【CSR 不等于搜索引擎一定无法获得页面内容】

早期常见表述：

~~~text
CSR
↓
初始 HTML 没内容
↓
Crawler 一定看不到
~~~

不能作为一般事实。

Google Search 官方说明 JavaScript 页面会经过 Crawling、Rendering 和 Indexing，并可通过 Web Rendering Service 执行 JavaScript。[[4]](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

更准确的风险链是：

~~~text
CSR
↓
关键内容依赖 JavaScript Rendering
↓
Crawler 对 Rendering 的依赖增加
↓
JS Failure / Resource Failure /
Rendering Delay / Crawler Capability
可能影响发现与索引
~~~

SSR / SSG / Prerender 的 SEO 价值主要在于让关键内容直接进入 Initial HTML，降低对 JavaScript Rendering 的依赖；但 SEO 还受到 Crawlability、Status Code、Canonical、Metadata、Internal Links、Content Quality 等因素影响。

Dynamic Rendering（根据 Crawler 和用户返回不同渲染结果）则属于另一种历史 SEO workaround。Google 当前将其定位为 workaround，而不是推荐长期方案。[[5]](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)

Nuxt 中更具体的 SEO 工程继续参考 [Nuxt SEO 学习笔记](./N-Nuxt%20SEO%20学习笔记.md)。

## 9. 一张表看清主流页面策略真正改变了什么

| 维度 | CSR | Request-time SSR | SSG / Prerender | SWR | ISR |
| --- | --- | --- | --- | --- | --- |
| 首屏主要 HTML 生成时机 | Browser Runtime | 每次请求 | Build Time | 首次 / 再生成时生成，之后缓存复用 | Build 后按条件增量生成 / 更新 |
| 请求时是否需要页面 Server Compute | 不需要首屏 SSR | 需要 | 通常不需要 | Cache Miss / Regeneration 时需要 | 取决于框架 / 平台 |
| 公共结果是否适合共享 | 可共享 Shell / 静态资源 | 取决于页面数据 | 很适合 | 核心能力 | 核心能力 |
| 内容新鲜度 | Client Fetch 决定 | Request Time | 直到重新生成 | TTL / Revalidate 决定 | Revalidate 规则决定 |
| 用户私有内容 | 适合 | 适合 | 不适合直接公共固化 | 不适合公共整页缓存 | 不适合公共整页缓存 |
| 首屏对 Client JS 的依赖 | 高 | 内容可先显示，交互仍需 JS | 内容可先显示，交互仍需 JS | 取决于缓存页面本身 | 取决于生成页面本身 |
| 主要成本 | Client JS / Data Fetch | Server Compute + Hydration | Build Time + Freshness | Cache Complexity + Staleness | Regeneration + Platform Semantics |

这张表不是为了找一个“最优模式”，而是说明：

> 每一种方案都只是把生成、计算、缓存和更新成本重新分配到 Build、Request、Cache 或 Browser 的不同阶段。

## 10. 页面渲染架构最终连接路由、缓存、SSR、浏览器渲染与性能

完整知识链可以整理为：

~~~text
Navigation Model
MPA / SPA
    ↓
Generation Strategy
CSR / SSR / SSG
    ↓
Reuse / Regeneration
Cache / SWR / ISR
    ↓
Hybrid Rendering
按 Route 组合
    ↓
HTML / Payload / Client JavaScript
    ↓
Browser Parse / Hydration
    ↓
Layout / Paint / Interaction
    ↓
Performance / SEO / Runtime Cost
~~~

继续学习：

- [服务端渲染完整链路](./F-服务端渲染完整链路.md)：深入 Request-time SSR、Request Context、Payload、Hydration 与 Server / Client 边界；
- [SPA路由（history路由+hash路由）核心知识点笔记](./S-SPA路由（history路由+hash路由）核心知识点笔记.md)：深入 Client-side Navigation；
- [CDN缓存与浏览器缓存笔记](./C-CDN缓存与浏览器缓存笔记.md)：深入 Freshness、Validation、TTL 与缓存层；
- [基于Chrome浏览器渲染原理](./J-基于Chrome浏览器渲染原理.md)：继续理解资源如何形成最终画面；
- [Web 性能优化完整知识体系](./W-Web性能优化完整知识体系.md)：继续分析 TTFB、资源、JavaScript、Hydration 与交互成本。

**项目实践映射：** official-network 当前通过 Prerender + SWR 进行 Route 级 Hybrid Rendering，再叠加 ClientOnly 与 Hydration，形成真实工程样本。完整源码分析见 [official-network 页面渲染策略与 Hybrid Rendering 源码分析](https://github.com/cxDlogver/official-network/blob/main/docs/页面渲染策略与Hybrid%20Rendering源码分析.md)。

## 11. 参考文献

1. [Vue.js - Server-Side Rendering](https://vuejs.org/guide/scaling-up/ssr)
2. [RFC 5861 - HTTP Cache-Control Extensions for Stale Content](https://www.rfc-editor.org/rfc/rfc5861.html)
3. [Nuxt 4 - Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering)
4. [Google Search Central - Understand the JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
5. [Google Search Central - Dynamic rendering as a workaround](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)
