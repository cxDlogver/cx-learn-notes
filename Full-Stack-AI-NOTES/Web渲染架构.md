# Web 渲染架构建立导航模型与内容生成策略的整体认知

Web 渲染架构不应该只记成“MPA、SPA、CSR、SSR 几种模式”。这些概念实际上回答不同问题：

~~~text
Web Application
│
├── Navigation Model
│   └── 页面之间怎样导航？
│       ├── MPA / Document Navigation
│       └── SPA / Client-side Navigation
│
└── Rendering Strategy
    └── 页面主要内容在哪里、什么时候生成？
        ├── CSR
        ├── SSR
        ├── SSG / Prerender
        └── Hybrid Rendering
~~~

因此最重要的边界是：

~~~text
MPA ≠ SSR
SPA ≠ CSR
~~~

MPA / SPA 描述导航模型；CSR / SSR / SSG 描述内容生成策略。现代框架可以把它们组合，例如“首次请求 SSR + Hydration + 后续 SPA 客户端导航”。

本文只建立通用渲染框架。Nuxt、Next.js 等框架用于验证这些通用概念，具体项目实现继续进入对应项目文档。

## 1. Web 应用需要分别判断导航方式和内容生成方式

### 【Navigation Model 回答页面怎样切换】

导航模型关注一次“页面切换”是否进入新的 Document 生命周期。

~~~text
Navigation
│
├── Document Navigation
│   └── 浏览器请求新的 HTML Document
│
└── Client-side Navigation
    └── 保留当前 Document
        由 JavaScript 更新 URL、状态和 UI
~~~

MPA 更接近第一类，SPA 更接近第二类。

### 【Rendering Strategy 回答 HTML 在哪里、什么时候生成】

渲染策略关注主要页面内容的生成位置和生成时间。

| Strategy | 主要生成位置 | 主要生成时间 |
| --- | --- | --- |
| CSR | Browser | Runtime |
| SSR | Server | Request Time |
| SSG / Prerender | Build System | Build Time |
| Hybrid | 按 Route / 内容选择 | Build / Request / Client |

所以判断渲染策略时，比“是不是 SPA”更稳定的问题是：

~~~text
Where is the main HTML/UI generated?
+
When is it generated?
~~~

## 2. MPA 与 SPA 描述页面导航模型

### 【MPA 通过新的 Document Navigation 切换页面】

MPA（Multi-Page Application）的核心不是“必须由服务器模板渲染”，而是不同页面之间通常通过新的 Document Navigation 切换。

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

服务器返回的新 Document 可以来自不同生成方式：

~~~text
MPA
│
├── Dynamic SSR HTML
├── Static HTML
└── Build-time Generated HTML
~~~

因此 MPA 可以与 SSR 组合，也可以直接托管静态 HTML；不能建立“MPA = SSR”的等价关系。

MPA 导航会创建新的 Document 生命周期，但这不等于所有 CSS、JavaScript、Font、Image 都必须重新下载。浏览器仍会根据 HTTP Cache、Memory Cache、Disk Cache、Service Worker 等机制决定是否复用已有资源。缓存机制继续参考 [CDN缓存与浏览器缓存笔记](./CDN缓存与浏览器缓存笔记.md)。

~~~text
New Document Navigation
↓
发现页面依赖资源
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

### 【SPA 在当前 Document 内完成客户端导航】

SPA（Single-Page Application）的核心是应用运行以后，主要导航由客户端 JavaScript 和 Router 在当前 Document 中完成，而不是每次都创建新的 HTML Document。

~~~text
Current Document
↓
User Navigation
↓
History API / Hash
↓
Client Router
↓
Load Route State / Data / Code
↓
Update Component Tree / DOM
~~~

“单页”描述的是 Document 生命周期，而不是视觉上只能有一个界面。

SPA 后续导航也不等于“没有网络请求”。现代应用可能继续加载：

~~~text
Route Navigation
│
├── API Data
├── Dynamic import() Chunk
├── Route-level CSS
├── Image / Font
└── Other Lazy Resources
~~~

真正的关键区别是：

~~~text
MPA Navigation
→ 新 Document Navigation

SPA Navigation
→ 当前 Document 内更新 Application State
~~~

History API、Hash Router 等更具体的路由机制继续参考 [SPA路由（history路由+hash路由）核心知识点笔记](./SPA路由（history路由+hash路由）核心知识点笔记.md)。

## 3. CSR、SSR 与 SSG 描述内容生成策略

### 【CSR 在 Browser Runtime 生成主要页面 UI】

CSR（Client-Side Rendering）表示主要页面内容依赖浏览器执行 JavaScript 后生成。

~~~text
Request
↓
Initial HTML
↓
JavaScript Download / Execute
↓
Data Fetch（按应用需要）
↓
Generate Main UI
↓
Browser Render
~~~

初始 HTML 可能只是 App Shell，也可能已经包含 Header、Skeleton、Static Content、Meta 等信息，因此：

~~~text
CSR
≠
HTML 必须完全为空
~~~

更稳定的判断是：

> 主要页面内容是否依赖客户端 JavaScript 执行后才生成。

CSR 的常见成本是首屏结果更依赖 JavaScript 下载、解析、执行和数据获取链路。如果主线程执行较重，用户可能较晚看到主要内容或较晚获得交互能力。

### 【SSR 在 Request Time 由服务器生成 HTML】

SSR（Server-Side Rendering）表示请求到来时，服务器执行渲染逻辑并生成 HTML。

~~~text
Request
↓
Server Data / Render
↓
HTML Response
↓
Browser Parse / Paint
~~~

SSR 能让主要内容在 HTTP HTML Response 中直接出现，但它并不自动意味着：

~~~text
SSR
= 性能一定更好
= SEO 一定更好
= 客户端不需要 JavaScript
~~~

现代前端框架中的 SSR 通常还会继续进入 Hydration，使服务端生成的 HTML 变成完整的客户端交互应用。

### 【SSG 在 Build Time 提前生成 HTML】

SSG（Static Site Generation）或 Prerender 的核心区别不在于“HTML 是否完整”，而在于生成时间。

~~~text
Build Time
↓
Render Page
↓
Generate Static HTML Artifact
↓
Deploy / CDN / Static Server
↓
Request
↓
Serve Existing HTML
~~~

SSR 与 SSG 都可能让浏览器收到完整 HTML，但：

~~~text
SSR
→ Request Time 生成

SSG
→ Build Time 生成
~~~

因此渲染策略更适合用 “Where + When” 理解，而不是只看响应结果。

## 4. Hydration 把服务端 HTML 接回客户端应用

### 【Hydration 连接 Server Render 与 Browser Runtime】

现代 SSR 的完整链路通常不是“服务器生成 HTML 就结束”，而是：

~~~text
Request
↓
Server Render
↓
HTML Response
↓
Browser Parse / Paint
↓
Client JavaScript Load
↓
Hydration
↓
Interactive Application
↓
Client-side Navigation
~~~

Hydration（常译为水合 / 注水）指客户端框架基于服务端已经生成的 HTML，恢复组件状态、事件处理和运行时关系，使页面从“已有内容”继续进入“可交互应用”。

Nuxt 的 Universal Rendering 也是这一模型：服务端先生成 HTML，浏览器端再通过 Hydration 接管后续交互。[[1]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

因此：

~~~text
HTML Visible
≠
Application Fully Interactive
~~~

这也是理解现代 SSR 性能的重要边界。服务端渲染可以提前输出内容，但客户端仍可能需要下载、解析和执行 JavaScript 才能完成 Hydration。

### 【Hydration 之后仍然可以继续 SPA Navigation】

SSR 与 SPA 并不是互斥关系：

~~~text
Initial Request
↓
SSR HTML
↓
Hydration
↓
Client Runtime
↓
SPA Navigation
~~~

所以“SPA = CSR”会直接破坏对现代 SSR 框架的理解。一个应用完全可以首屏 SSR，同时在 Hydration 后由客户端 Router 完成后续页面切换。

## 5. Hybrid Rendering 按 Route 和内容特征组合策略

### 【现代应用不需要整站只能选择一种渲染模式】

Hybrid Rendering 的核心是不同 Route 根据数据更新频率、SEO、交互和成本要求选择不同策略。

~~~text
Application
│
├── Marketing / Content Route
│   └── SSR / SSG / Prerender
│
├── Frequently Updated Public Route
│   └── SSR / Cached SSR
│
└── Private Interactive Route
    └── CSR
~~~

Nuxt 官方支持 Universal、Client-side 以及按 Route 配置的 Hybrid Rendering，并可通过 Route Rules 对不同 Route 采用不同策略。[[1]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

这里需要区分两个概念：

~~~text
Hybrid Rendering
→ 同一个应用按 Route / 场景组合渲染策略

Dynamic Rendering（SEO 语境）
→ 对 Crawler 和用户返回不同渲染结果的历史 workaround
~~~

Google 当前将 Dynamic Rendering 定位为 workaround，而不是推荐的长期方案。[[2]](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)

## 6. 渲染策略影响性能与 SEO，但不直接决定结果

### 【SSR、SSG 与 CSR 改变的是性能成本分布】

不同策略只是把工作分配到不同位置和时间：

~~~text
CSR
→ 更多工作放在 Browser Runtime

SSR
→ Request Time 在 Server 生成 HTML
  + Browser Hydration

SSG
→ Build Time 提前生成 HTML
  + Request Time 直接分发
~~~

最终性能仍取决于：

~~~text
Server Response
Network
Resource Size
JavaScript Execution
Hydration Cost
Data Fetch
Caching
Browser Rendering
~~~

浏览器拿到 HTML / CSS / JavaScript 后如何构建 DOM、Style、Layout、Paint、Raster 与 Composite，继续参考 [基于Chrome浏览器渲染原理](./基于Chrome浏览器渲染原理.md)。

因此：

~~~text
Web Rendering Architecture
→ 决定 Browser 收到什么，以及内容什么时候生成

Browser Rendering Pipeline
→ 决定 Browser 怎样把这些输入转成画面
~~~

### 【CSR 不等于搜索引擎一定无法获得内容】

早期常见说法是：

~~~text
CSR
↓
初始 HTML 没内容
↓
Crawler 看不到页面
~~~

这个说法现在不能作为一般事实。Google Search 官方说明其 JavaScript 页面处理包括 Crawling、Rendering 与 Indexing，并会使用 Web Rendering Service 执行 JavaScript。[[3]](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

更准确的理解是：

~~~text
CSR
↓
关键内容依赖 JavaScript Rendering
↓
增加 Rendering Dependency
↓
JS Failure / Resource Failure /
Crawler Capability / Rendering Delay
可能影响发现与索引
~~~

SSR / SSG / Prerender 的 SEO 价值主要是让关键内容直接存在于初始 HTML Response 中，降低 Crawler 对 JavaScript Rendering 的依赖。但 Rendering Strategy 只是 SEO 的一个影响因素，SEO 还包括 Crawlability、Status Code、Canonical、Metadata、Internal Links、Content Quality 等。

Nuxt 在 SEO 场景中的具体策略继续参考 [Nuxt SEO 学习笔记](./Nuxt%20SEO%20学习笔记.md)。

## 7. Web 渲染架构继续连接缓存、路由和浏览器渲染机制

### 【同一个页面问题需要沿不同知识层继续定位】

完整链路可以理解为：

~~~text
Navigation Model
MPA / SPA
↓
Rendering Strategy
CSR / SSR / SSG / Hybrid
↓
HTML / JS / Resource Response
↓
HTTP Cache / CDN Cache
↓
Browser Parse / Execute
↓
DOM / Style / Layout / Paint / Composite
↓
User-visible Result
~~~

对应知识入口：

- [SPA路由（history路由+hash路由）核心知识点笔记](./SPA路由（history路由+hash路由）核心知识点笔记.md)：继续学习 Client-side Navigation。
- [CDN缓存与浏览器缓存笔记](./CDN缓存与浏览器缓存笔记.md)：继续学习 Document Navigation 后资源是否真正重新下载。
- [基于Chrome浏览器渲染原理](./基于Chrome浏览器渲染原理.md)：继续学习 Browser 收到资源后怎样形成最终画面。
- [Nuxt SEO 学习笔记](./Nuxt%20SEO%20学习笔记.md)：继续学习通用渲染模型在 Nuxt 与 SEO 工程中的具体应用。

## 8. 参考文献

[1] Nuxt Team. *Rendering Modes*. Nuxt Documentation. https://nuxt.com/docs/4.x/guide/concepts/rendering

[2] Google Search Central. *Dynamic rendering as a workaround*. https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering

[3] Google Search Central. *Understand the JavaScript SEO basics*. https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
