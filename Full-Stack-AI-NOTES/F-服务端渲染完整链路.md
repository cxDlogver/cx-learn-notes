# 服务端渲染从首次请求到客户端接管形成完整页面运行链路

服务端渲染（Server-Side Rendering，SSR）描述的是：**浏览器首次请求页面时，服务器先根据路由、数据和组件生成 HTML，再把 HTML 与客户端运行所需的资源和状态返回给浏览器；浏览器先解析和显示已有内容，再通过 Hydration（水合）把这份静态 HTML 接回客户端应用。**

本文只深入 SSR 的完整运行链路。CSR、SSG、Hybrid Rendering 的位置关系继续由 [Web 渲染架构](./W-Web渲染架构.md) 作为上位入口；浏览器收到 HTML 之后更底层的 Parse、Style、Layout、Paint 与 Composite 继续由 [基于 Chrome 浏览器渲染原理](./J-基于Chrome浏览器渲染原理.md) 承担。

SSR 可以沿两条长期主线理解：

```text
Request Lifecycle（请求生命周期）
浏览器首次请求
    ↓
服务端接收并建立请求上下文
    ↓
匹配页面路由
    ↓
准备页面数据与状态
    ↓
服务端执行组件渲染
    ↓
构造 HTML Response（HTML 响应）
    ↓
浏览器解析并显示已有内容
    ↓
加载客户端 JavaScript
    ↓
Hydration（水合）
    ↓
客户端应用接管
    ↓
页面进入完整交互状态


State / Data Continuity（状态与数据连续性）
请求输入（Route / Cookie / Request Data）
    ↓ 建立本次请求的渲染状态
服务端状态（Server State）
    ↓ 序列化可安全传递的数据
HTML 与序列化数据（HTML + Serialized Payload）
    ↓ 浏览器恢复页面初始状态
客户端初始状态（Client Initial State）
    ↓ 与已有 HTML 建立运行关系
水合首次运行（Hydration First Render）
    ↓ 进入长期客户端状态更新
响应式运行时（Reactive Runtime）
```

第一条回答“页面从请求到可交互经历什么”；第二条回答“为什么服务端生成的 HTML 能被客户端继续接管，而不是重新开始”。

## 1. SSR 把首次页面生成提前到 HTTP 响应返回之前

### 【SSR 改变的是首次主要内容的生成位置】

客户端渲染（Client-Side Rendering，CSR）中，主要页面 UI 通常依赖浏览器下载并执行 JavaScript 后生成：

```text
浏览器发起页面请求
    ↓
服务器返回初始 HTML
    ↓
下载 / 执行客户端 JavaScript
    ↓
获取页面数据
    ↓
客户端生成主要 UI
    ↓
浏览器显示页面
```

SSR 将“首次主要 UI 的生成”提前到服务器：

```text
浏览器发起页面请求
    ↓
服务器匹配路由并准备数据
    ↓
服务端执行页面组件
    ↓
生成包含主要内容的 HTML
    ↓
浏览器直接解析 HTML
    ↓
用户可以先看到已有内容
    ↓
客户端 JavaScript 再完成水合
```

Vue 官方将 SSR 描述为：同一套 Vue 组件可以在服务器中渲染成 HTML 字符串并发送到浏览器，随后浏览器再将静态标记水合为可交互应用。[[1]](https://vuejs.org/guide/scaling-up/ssr)

因此应明确三个边界：

```text
SSR
≠ 服务端创建浏览器 DOM
≠ 页面以后都在服务器运行
≠ 浏览器不再需要 JavaScript

SSR
= 首次请求阶段由服务端先生成页面 HTML
```

服务器生成的是 HTML 字符串和相关响应数据；真正的 DOM Tree、Style、Layout、Paint、Composite 仍然发生在浏览器。

### 【现代 SSR 实际由服务端输出和客户端接管两段组成】

只完成 Server Render（服务端渲染）还没有形成完整的现代 Web 应用：

```text
Server Render（服务端输出）
Component + Data
    ↓
HTML

Client Hydration（客户端水合）
HTML DOM + Client JavaScript + Initial State
    ↓
Interactive Application（可交互应用）
```

因此“服务端已经返回完整 HTML”和“页面已经完全可交互”不是同一个时刻。

## 2. 浏览器首次页面请求进入服务端后先建立请求上下文与页面目标

### 【Document Request 是 SSR 链路的起点】

用户直接输入 URL、刷新页面或从外部链接进入站点时，浏览器会发起新的 Document Request（文档请求）。

服务端首先拿到的是 HTTP 请求，而不是一个“Vue 页面”：

```text
HTTP Request
├─ Method
├─ URL / Path
├─ Query
├─ Headers
├─ Cookie
└─ Body（按请求类型存在）
        ↓
Server Request Context（服务端请求上下文）
```

框架或 Web Server 会把这些信息组织成当前请求的上下文。之后页面路由、鉴权、数据请求、重定向和错误处理都以这个请求上下文为输入。

这里要把“服务端页面路由”和“浏览器客户端路由”分开：

```text
首次 Document Request
URL → 服务端 Router → 确定本次应该渲染哪个页面

Hydration 完成后的客户端导航
URL State → Client Router → 切换页面组件 / 获取数据
```

两者可能使用同一套路由定义，但运行时和请求成本不同。

### 【服务器通常按请求创建本次渲染需要的应用状态】

SSR Server 同时服务多个用户，所以请求状态不能默认使用一个可变的全局单例：

```text
Request A ─→ App / Route / State A
Request B ─→ App / Route / State B
Request C ─→ App / Route / State C
```

如果把用户状态放进服务器模块级可变对象：

```text
Request A 修改共享状态
        ↓
Request B 读取同一个对象
        ↓
Cross-Request State Pollution（跨请求状态污染）
```

Vue 官方因此强调 SSR 应用需要注意跨请求状态污染：服务器模块通常只初始化一次，而每个请求必须获得彼此隔离的应用和状态。[[1]](https://vuejs.org/guide/scaling-up/ssr)

> **项目实践映射：** official-network 使用 Nuxt / Nitro 将 Document Request 映射到文件路由，并在当前请求上下文中继续页面生成。真实路由匹配与请求边界见 [项目分析：Document Request 到达 Nitro 后先匹配页面路由和请求上下文](https://github.com/cxDlogver/official-network/blob/main/docs/%E6%9C%8D%E5%8A%A1%E7%AB%AF%E6%B8%B2%E6%9F%93%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AF%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90.md#3-document-request-%E5%88%B0%E8%BE%BE-nitro-%E5%90%8E%E5%85%88%E5%8C%B9%E9%85%8D%E9%A1%B5%E9%9D%A2%E8%B7%AF%E7%94%B1%E5%92%8C%E8%AF%B7%E6%B1%82%E4%B8%8A%E4%B8%8B%E6%96%87)。

## 3. 路由确定页面后，服务端需要先解决首屏渲染依赖的数据

### 【页面数据属于服务端渲染输入，而不是渲染完成后的附加步骤】

如果页面 HTML 依赖产品、文章或用户信息，SSR 必须在生成相关 HTML 之前准备这些数据：

```text
Route
    ↓
Page Component
    ↓
发现 Async Data Dependency（异步数据依赖）
    ↓
读取数据库 / 调用内部 API / 调用外部服务
    ↓
得到 Server Render Data（服务端渲染数据）
    ↓
Component Render
```

如果服务端先输出空页面、再让浏览器请求核心数据并生成主体内容，那么这部分主体实际上已经退回客户端渲染。

### 【SSR-aware Data Fetching 需要同时解决服务端取数和客户端复用】

同一套页面代码通常会在服务器和浏览器各执行一次。如果直接在通用代码中调用普通 Fetch：

```text
Server setup
↓
Fetch 一次
↓
生成 HTML

Client setup
↓
又 Fetch 一次
↓
Hydration
```

这会形成 Double Fetch（重复请求），还可能使客户端第一次得到的数据与服务端不同。

现代 SSR 框架通常采用下面的处理：

```text
Server
↓
Fetch Data
↓
Render HTML
↓
Serialize Data（序列化数据）
↓
写入 SSR Payload
↓
发送浏览器
↓
Client 恢复 Payload
↓
Hydration 直接复用
```

Nuxt 的 `useFetch` 与 `useAsyncData` 就承担这一类职责：服务端取得的数据会传入 Nuxt Payload，客户端水合时可以读取该数据，避免再次获取同一份首屏数据。[[2]](https://nuxt.com/docs/4.x/getting-started/data-fetching)

### 【SSR 请求数据还需要处理当前用户的请求上下文】

浏览器调用 API 时会自然携带符合规则的 Cookie 与请求头，但服务端 SSR 内部再调用 API 时已经进入另一层 Server Fetch。

因此需要明确：

```text
Browser Request Context
Cookie / Authorization / Locale / Trace
        ↓
SSR Server
        ↓
Server-side Fetch
        ↓
哪些上下文需要安全地继续传递？
```

Nuxt 的 `useRequestFetch` 会在服务端请求中转发适合继续携带的请求上下文；`useFetch` 在服务端底层使用这一机制。[[3]](https://nuxt.com/docs/4.x/api/composables/use-request-fetch)

这意味着 SSR 数据层不仅是“请求接口”，还承担**当前请求身份与上下文的连续性**。

> **项目实践映射：** 通用的“路由确定 → 解析首屏数据依赖 → 复用客户端初始数据”在 official-network 中由页面 `useFetch / useAsyncData`、Nitro Server API 与外部数据源共同完成，见 [项目分析：页面 setup 在服务端执行时会先解析首屏数据依赖](https://github.com/cxDlogver/official-network/blob/main/docs/%E6%9C%8D%E5%8A%A1%E7%AB%AF%E6%B8%B2%E6%9F%93%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AF%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90.md#4-%E9%A1%B5%E9%9D%A2-setup-%E5%9C%A8%E6%9C%8D%E5%8A%A1%E7%AB%AF%E6%89%A7%E8%A1%8C%E6%97%B6%E4%BC%9A%E5%85%88%E8%A7%A3%E6%9E%90%E9%A6%96%E5%B1%8F%E6%95%B0%E6%8D%AE%E4%BE%9D%E8%B5%96) 与 [内部 API 数据链路](https://github.com/cxDlogver/official-network/blob/main/docs/%E6%9C%8D%E5%8A%A1%E7%AB%AF%E6%B8%B2%E6%9F%93%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AF%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90.md#5-%E5%86%85%E9%83%A8-api-%E5%9C%A8-ssr-%E9%98%B6%E6%AE%B5%E7%BB%A7%E7%BB%AD%E6%89%A7%E8%A1%8C%E7%9C%9F%E6%AD%A3%E7%9A%84%E6%95%B0%E6%8D%AE%E8%8E%B7%E5%8F%96%E4%B8%8E%E8%BD%AC%E6%8D%A2)。

## 4. 服务端渲染阶段执行组件逻辑，但不会执行浏览器渲染管线

### 【Server Render 的输出是 HTML 字符串而不是 DOM】

服务端已经确定 Route 与 Data 后，框架会执行页面组件并生成 HTML：

```text
Request Context
    +
Route
    +
Page Data
    +
Component Tree
        ↓
Server Renderer（服务端渲染器）
        ↓
HTML String（HTML 字符串）
```

Vue SSR 中不会真的创建浏览器 DOM。因为 SSR 阶段不存在用户交互与 DOM 更新，Vue 默认还会关闭服务端响应式追踪以降低不必要的开销。[[1]](https://vuejs.org/guide/scaling-up/ssr)

所以服务端不会执行这些浏览器工作：

```text
不会：
DOM Layout（布局计算）
Paint（绘制）
Raster（栅格化）
Composite（合成）
requestAnimationFrame
真实 Canvas / WebGL 绘制
用户点击事件
IntersectionObserver / ResizeObserver
```

这些工作必须等浏览器得到 HTML 和客户端代码以后才能发生。

### 【组件生命周期在服务端与浏览器并不对称】

服务端渲染只需要得到一次 HTML 输出，并不存在组件真正插入浏览器文档后的长期交互生命周期。

Vue 官方明确指出，`mounted/onMounted` 与 `updated/onUpdated` 不会在 SSR 阶段调用；需要访问已渲染 DOM 的逻辑通常应放在 `onMounted` 等客户端生命周期中。[[1]](https://vuejs.org/guide/scaling-up/ssr)[[4]](https://vuejs.org/api/composition-api-lifecycle)

因此：

```text
setup / render
→ 可能同时参与 Server 与 Client

onMounted
→ 只在 Client Mount 后执行
```

需要清理的定时器、DOM 监听等副作用也不应直接无条件放在 SSR 会执行的顶层代码中。

> **项目实践映射：** Vue Server Renderer 如何在真实 Nuxt 页面中把已准备的数据和组件树转换成 HTML，并同时生成 SEO Head，可继续查看 [项目分析：数据准备完成后，Vue Server Renderer 把组件树转换成 HTML](https://github.com/cxDlogver/official-network/blob/main/docs/%E6%9C%8D%E5%8A%A1%E7%AB%AF%E6%B8%B2%E6%9F%93%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AF%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90.md#6-%E6%95%B0%E6%8D%AE%E5%87%86%E5%A4%87%E5%AE%8C%E6%88%90%E5%90%8Evue-server-renderer-%E6%8A%8A%E7%BB%84%E4%BB%B6%E6%A0%91%E8%BD%AC%E6%8D%A2%E6%88%90-html)。

## 5. 服务端返回的不只是页面正文 HTML，而是一份可继续运行的页面启动材料

### 【HTML Response 通常同时承载文档结构、页面内容和启动入口】

框架最终需要构造 HTTP Response。具体格式由框架实现决定，但现代 SSR 页面通常包含以下几类信息：

| 返回内容 | 作用 |
| --- | --- |
| HTML 文档结构 | 让浏览器建立 Document 与 DOM |
| 服务端渲染出的页面标记 | 让核心内容无需等待客户端生成 |
| Head 信息 | Title、Meta、Link、Structured Data 等文档元信息 |
| CSS / JS 资源引用 | 让浏览器继续加载样式与客户端 Runtime |
| Serialized Payload（序列化状态） | 让客户端恢复服务端已经使用的数据与状态 |
| Route / Runtime 相关启动信息 | 让客户端应用从当前页面状态继续运行 |

可把结果抽象为：

```html
<html>
  <head>
    <!-- title / meta / stylesheet / preload ... -->
  </head>
  <body>
    <div id="app">
      <!-- server-rendered page markup -->
    </div>

    <!-- serialized initial payload -->
    <!-- client runtime scripts -->
  </body>
</html>
```

这里的结构只是机制示意，不代表所有框架使用完全相同的标签或序列化格式。

### 【HTML 中不会直接包含客户端运行时本身的对象关系】

服务器可以输出：

```text
<button>提交</button>
```

但 HTTP HTML 不会直接携带 JavaScript 内存中的：

```text
Event Listener Function
Reactive Dependency Graph
Component Instance
Closure
DOM Node Reference
IntersectionObserver Instance
requestAnimationFrame Callback
Canvas Drawing Context
```

所以浏览器虽然可能已经看到按钮，但它尚未自动拥有框架运行时中的“这个按钮点击后执行哪个组件函数”关系。

这正是为什么 SSR 后还需要 Hydration。

### 【服务端私有数据和客户端 Payload 必须严格分界】

服务器可以在渲染过程中使用数据库凭据、Private API Key、服务器环境变量等信息，但这些数据不能因为 SSR 就被序列化到浏览器。

安全边界应该是：

```text
Server Secret / Private Credential
        ↓
服务端访问数据源
        ↓
得到页面真正需要的公开结果
        ↓
只把必要结果写入 HTML / Payload
        ↓
Browser
```

“服务器渲染时使用过”与“浏览器应该得到”是两件不同的事情。

## 6. 浏览器收到 HTML 后先完成文档解析，再由 Hydration 建立客户端运行关系

### 【浏览器可以在客户端 JavaScript 完成之前先显示服务端内容】

响应到达浏览器后会进入真正的 Browser Rendering Pipeline：

```text
HTML Bytes
    ↓
HTML Parse
    ↓
DOM
    ↓
CSS / Style
    ↓
Layout
    ↓
Paint
    ↓
用户看到服务端已有内容
```

与此同时浏览器继续发现并请求 JavaScript、CSS、图片、字体等资源。

因此可能出现一个真实时间窗口：

```text
页面内容已经可见
        ↓
客户端 JavaScript 仍在下载 / 执行
        ↓
页面还没有完全恢复交互
```

SSR 提前的是“已有内容进入浏览器”的时间，并不自动消除客户端 JavaScript 成本。

### 【Hydration 不是重新生成一遍 DOM，而是接管已有 DOM】

Vue 对 Hydration 的定义是：客户端创建与服务端相同的应用，匹配每个组件应控制的已有 DOM 节点，并附加事件监听，使静态标记进入完整交互状态。[[1]](https://vuejs.org/guide/scaling-up/ssr)

完整关系可以写成：

```text
Server HTML
    ↓
Browser Parse
    ↓
Existing DOM（已有 DOM）
        +
Client JavaScript
        +
Serialized Initial State
        ↓
Create Client App（创建客户端应用）
        ↓
Restore State（恢复初始状态）
        ↓
Client First Render（客户端第一次执行组件）
        ↓
Match VNode / Component ↔ Existing DOM
        ↓
建立响应式关系与事件处理
        ↓
Hydration Complete（水合完成）
```

因此 Hydration 至少承担三类恢复：

1. **结构关系恢复**：组件与现有 DOM 对应起来；
2. **状态关系恢复**：客户端得到与服务器首屏一致的初始数据；
3. **行为关系恢复**：事件、响应式更新、Router、插件等客户端运行能力继续建立。

### 【Hydration 要求服务端输出与客户端第一次结果保持确定性】

客户端第一次执行组件时，应该得到与服务端 HTML 相同的初始结构：

```text
Render(Server Initial State)
        ≈
Render(Client Initial State)
```

如果两者结构不同，就形成 Hydration Mismatch（水合不匹配）。

Vue 官方列出的常见原因包括非法 HTML 被浏览器自动纠正、随机值、服务端和客户端时区差异等；发生不匹配时框架可能丢弃错误节点并重新创建，增加额外成本。[[1]](https://vuejs.org/guide/scaling-up/ssr)

常见风险可以归为：

| 风险来源 | 为什么会不一致 |
| --- | --- |
| `Math.random()` | Server 与 Client 得到不同随机值 |
| 当前时间 / 时区 | 两个 Runtime 的时间环境不同 |
| `window.innerWidth` | Server 没有真实浏览器视口 |
| LocalStorage | Server 无法读取客户端本地存储 |
| 非法 HTML | Browser Parser 会自动纠正文档结构 |
| 两端首屏数据不同 | Client First Render 得到另一份数据 |

解决原则不是“关闭 Hydration 警告”，而是保证服务端与客户端初始状态来源一致；确实只能在浏览器确定的内容，再下沉到 Client-only 边界。

> **项目实践映射：** official-network 的 HTML、Nuxt Payload 与客户端资源引用展示了“服务端输出可见内容 + 浏览器继续启动应用”的实际边界；浏览器随后恢复 Payload 并执行 Hydration。对应分析见 [返回给浏览器的内容组成](https://github.com/cxDlogver/official-network/blob/main/docs/%E6%9C%8D%E5%8A%A1%E7%AB%AF%E6%B8%B2%E6%9F%93%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AF%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90.md#7-%E5%BD%93%E5%89%8D%E8%BF%94%E5%9B%9E%E7%BB%99%E6%B5%8F%E8%A7%88%E5%99%A8%E7%9A%84%E5%86%85%E5%AE%B9%E5%8F%AF%E4%BB%A5%E5%88%86%E6%88%90%E5%B7%B2%E7%94%9F%E6%88%90%E5%86%85%E5%AE%B9%E5%92%8C%E5%AE%A2%E6%88%B7%E7%AB%AF%E5%90%AF%E5%8A%A8%E6%9D%90%E6%96%99) 与 [浏览器恢复 Payload 并 Hydration](https://github.com/cxDlogver/official-network/blob/main/docs/%E6%9C%8D%E5%8A%A1%E7%AB%AF%E6%B8%B2%E6%9F%93%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AF%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90.md#10-%E6%B5%8F%E8%A7%88%E5%99%A8%E6%94%B6%E5%88%B0-html-%E5%90%8E%E5%85%88%E6%98%BE%E7%A4%BA%E5%B7%B2%E6%9C%89%E5%86%85%E5%AE%B9%E5%86%8D%E6%81%A2%E5%A4%8D-nuxt-payload-%E5%B9%B6-hydration)。

## 7. SSR 代码设计必须显式区分 Universal、Server 与 Client 三种运行边界

### 【Universal Code 必须同时满足两种 Runtime】

同构代码（Universal Code）：同一段代码可能既运行在服务端，也运行在浏览器。

```text
Application Code
       │
       ├─ Universal
       │   ├─ Page / Component Render Logic
       │   ├─ Pure Business Logic
       │   └─ Shared Types / Transform
       │
       ├─ Server Only
       │   ├─ Database
       │   ├─ Private Secret
       │   ├─ Server Request Context
       │   └─ Server API
       │
       └─ Client Only
           ├─ window / document
           ├─ localStorage
           ├─ Canvas / WebGL
           ├─ requestAnimationFrame
           └─ Browser Observer / Analytics
```

Vue 官方明确指出，Universal Code 不能假设存在 `window`、`document` 等平台专属 API。[[1]](https://vuejs.org/guide/scaling-up/ssr)

### 【浏览器能力应推迟到客户端边界，而不是让服务端模拟 DOM】

典型设计：

```ts
const width = ref(0)

onMounted(() => {
  width.value = window.innerWidth
})
```

这里并不是“SSR 不允许使用 window”，而是：

```text
Server Render 阶段
→ 不访问 window

Client Mount 阶段
→ 浏览器环境已经存在
→ 再读取 window
```

对于整个组件都依赖 Canvas、图表库或浏览器对象的情况，高层框架通常还提供 Client-only Component / Client-only Plugin 等边界。Nuxt 支持 `.client` 组件、`.client` 插件以及 `<ClientOnly>` 等方式。[[5]](https://nuxt.com/docs/4.x/directory-structure/app/components)[[6]](https://nuxt.com/docs/4.x/directory-structure/app/plugins)

### 【能服务端输出的稳定内容不应因为局部浏览器能力全部退回客户端】

Client-only 不是越多越安全。

如果一个 Hero 同时包含：

```text
稳定标题 / 描述
+
Canvas 动画
```

更合理的边界通常是：

```text
Hero Shell
├─ Title / Description → Server Render
└─ Canvas Animation    → Client Only
```

而不是：

```text
整个 Hero → Client Only
```

因为 Client-only 边界越大，服务端可以提前输出的 HTML 越少。

> **项目实践映射：** Universal / Server / Client 三类运行边界在 Nuxt 项目中具体表现为 `ClientOnly`、`import.meta.client`、`onMounted` 与 `.client.ts`。这些机制分别解决什么问题以及边界过大时会损失什么，可查看 [项目分析：ClientOnly 边界](https://github.com/cxDlogver/official-network/blob/main/docs/%E6%9C%8D%E5%8A%A1%E7%AB%AF%E6%B8%B2%E6%9F%93%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AF%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90.md#8-clientonly-%E6%98%8E%E7%A1%AE%E5%86%B3%E5%AE%9A%E5%93%AA%E4%BA%9B%E5%86%85%E5%AE%B9%E4%B8%8D%E4%BC%9A%E8%BF%9B%E5%85%A5%E6%9C%8D%E5%8A%A1%E7%AB%AF%E4%B8%BB%E8%A6%81-html) 与 [Browser-only API 隔离](https://github.com/cxDlogver/official-network/blob/main/docs/%E6%9C%8D%E5%8A%A1%E7%AB%AF%E6%B8%B2%E6%9F%93%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AF%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90.md#9-browser-only-api-%E9%80%9A%E8%BF%87-importmetaclientonmounted-%E5%92%8C-clientts-%E9%9A%94%E7%A6%BB)。

## 8. 水合完成后，应用从“首次 Document 请求”切换为长期客户端运行

### 【首次请求和后续页面切换属于两个不同阶段】

现代 SSR 框架通常不是每次用户点击链接都重新完成完整 SSR：

```text
Direct Visit / Refresh
        ↓
Document Request
        ↓
SSR
        ↓
HTML
        ↓
Hydration
        ↓
Client Runtime Ready
        ↓
后续站内导航
        ↓
Client Router
        ↓
按需取数 / 切换组件
        ↓
更新当前 Document
```

因此 SSR 与 SPA Navigation 并不冲突。

页面刷新、新标签页直接打开 URL、外部进入等重新触发 Document Request 时，才再次进入新的 SSR 首次请求链路。

### 【“首次页面完成”需要区分多个完成点】

SSR 页面不存在唯一的“完成时刻”。至少要区分：

| 阶段 | 表示什么 |
| --- | --- |
| Server Render Complete | 服务端已经准备好 HTML Response |
| HTML Parsed | 浏览器已经建立当前文档 DOM |
| Content Visible | 用户已经看到部分或主要服务端内容 |
| Hydration Complete | 客户端框架已经接管已有 HTML |
| Client-only Mounted | 只在浏览器执行的模块开始运行 |
| Main Resources Ready | 页面依赖的重要图片、字体等继续到达稳定状态 |

因此：

```text
HTML 可见
≠ Hydration 完成
≠ 所有资源加载完成
≠ 页面后续不再发生更新
```

性能指标、生命周期和测试必须明确自己观察的是哪个阶段。

> **项目实践映射：** 水合完成后的站内跳转不再重复完整 Document SSR 链，而主要进入客户端路由与数据更新流程。Nuxt 中这一切换可查看 [项目分析：Hydration 完成以后，后续站内跳转主要进入 Client Navigation](https://github.com/cxDlogver/official-network/blob/main/docs/%E6%9C%8D%E5%8A%A1%E7%AB%AF%E6%B8%B2%E6%9F%93%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AF%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90.md#12-hydration-%E5%AE%8C%E6%88%90%E4%BB%A5%E5%90%8E%E5%90%8E%E7%BB%AD%E7%AB%99%E5%86%85%E8%B7%B3%E8%BD%AC%E4%B8%BB%E8%A6%81%E8%BF%9B%E5%85%A5-client-navigation)。

## 9. SSR 设计可以用请求、数据、输出和运行边界四组问题自检

### 【请求与路由】

- 首次请求由哪个 Server / Framework 接收？
- URL 如何匹配到页面？
- 是否存在 Middleware、Redirect、Auth 或 Error 分支？
- 每个请求是否拥有隔离的应用与状态？

### 【数据与状态】

- 哪些数据必须在服务端生成 HTML 前获得？
- 数据来自数据库、内部 API 还是外部服务？
- 是否需要继续传递 Cookie、Authorization、Locale 等请求上下文？
- 服务端取得的数据怎样进入客户端 Payload？
- 是否会发生重复请求或不同 Key 串数据？
- 哪些服务端私有信息绝不能序列化给客户端？

### 【HTML 与 Hydration】

- 返回 HTML 已经包含哪些首屏内容？
- Head / Meta / Stylesheet / Script / Payload 分别在哪里生成？
- 哪些内容只是占位，真正 UI 仍在客户端生成？
- Server First Render 与 Client First Render 是否确定一致？
- Hydration Mismatch 出现时是哪一个输入在两端不一致？

### 【Server / Client 边界】

- 哪些代码会同时执行两次？
- 是否在 Universal Code 中直接访问 DOM、Window、Storage 或 Observer？
- 浏览器副作用是否放到 `onMounted` 或 Client-only 边界？
- Client-only 范围是否过大，导致本可 SSR 的稳定内容也被移出 HTML？

这四组问题能够把 SSR 从“框架配置项”还原为一条完整的请求与状态链。

## 10. SSR 与现有知识体系的关系

```text
网络连接 / HTTP
    ↓
Web 渲染架构
    ↓
【服务端渲染完整链路】
    ├─ Request / Route
    ├─ Data / State
    ├─ Server Render
    ├─ HTML Response
    ├─ Hydration
    └─ Client Takeover
        ↓
Chrome 浏览器渲染
        ↓
Vue Runtime / Router
        ↓
Web 性能与 SEO
```

前置与延伸：

- [Web 渲染架构](./W-Web渲染架构.md)：决定 CSR / SSR / SSG / Hybrid 在整体架构中的位置；
- [浏览器网络面试题](./L-浏览器网络面试题.md)：继续理解 Document Request 如何经过 DNS、连接和 HTTP 到达服务端；
- [基于 Chrome 浏览器渲染原理](./J-基于Chrome浏览器渲染原理.md)：继续理解 HTML 到达浏览器后的 Parse、Layout、Paint 与 Composite；
- [Vue3进阶学习](./V-Vue3进阶学习.md)：继续理解组件响应式与客户端 Runtime；
- [SPA 路由核心知识点](<./S-SPA路由（history路由+hash路由）核心知识点笔记.md>)：继续理解 Hydration 后的客户端导航；
- [Web 性能优化完整知识体系](./W-Web性能优化完整知识体系.md)：继续分析 TTFB、HTML Delivery、Hydration 与主线程成本。


## 11. 参考文献

1. [Vue.js - Server-Side Rendering (SSR)](https://vuejs.org/guide/scaling-up/ssr)
2. [Nuxt 4 - Data Fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching)
3. [Nuxt 4 - useRequestFetch](https://nuxt.com/docs/4.x/api/composables/use-request-fetch)
4. [Vue.js - Composition API Lifecycle Hooks](https://vuejs.org/api/composition-api-lifecycle)
5. [Nuxt 4 - Components / Client Components](https://nuxt.com/docs/4.x/directory-structure/app/components)
6. [Nuxt 4 - Plugins](https://nuxt.com/docs/4.x/directory-structure/app/plugins)
7. [Nuxt 4 - Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering)
8. [Nuxt 4 - Hydration Best Practices](https://nuxt.com/docs/4.x/guide/best-practices/hydration)
