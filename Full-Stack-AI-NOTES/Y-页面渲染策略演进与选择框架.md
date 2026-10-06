# 页面渲染策略通过生成位置、生成时间与更新方式形成完整选择框架

页面渲染不能只背 CSR、SSR、SSG、SWR、ISR、Hybrid 一组缩写。它们并不完全处在同一层：有的回答“主要页面内容在哪里、什么时候生成”，有的回答“生成结果怎样复用和更新”，还有的回答“同一个应用怎样组合多种策略”。

因此本文沿三条线建立框架：

~~~text
第一条：页面在哪里、什么时候生成？
→ CSR / SSR / SSG

第二条：已经生成的页面怎样复用、什么时候更新？
→ Cache / SWR / ISR

第三条：不同 Route 能否采用不同方案？
→ Hybrid Rendering
~~~

上位关系继续由 [Web 渲染架构](./W-Web渲染架构.md) 区分 Navigation Model 与 Rendering Strategy；SSR 从首次 Document Request 到 Hydration 的内部过程继续进入 [服务端渲染完整链路](./F-服务端渲染完整链路.md)。

## 1. 渲染策略首先要分清“生成”和“复用”两个不同问题

### 【CSR、SSR、SSG 主要区分页面生成位置与时间】

最稳定的判断维度不是“这个框架叫什么”，而是：

~~~text
主要页面内容在哪里生成？
+
在什么时候生成？
~~~

| 策略 | 主要生成位置 | 主要生成时间 | 首次请求拿到什么 |
| --- | --- | --- | --- |
| CSR（Client-Side Rendering，客户端渲染） | Browser | Browser Runtime | HTML Shell + Client JS |
| SSR（Server-Side Rendering，服务端渲染） | Server | Request Time | 当前请求生成的 HTML |
| SSG（Static Site Generation，静态站点生成）/ Prerender | Build Runtime | Build Time | 已提前生成的 HTML |

这三种模式首先改变的是“页面生成成本放在哪里”。

### 【SWR、ISR 更准确属于缓存与再生成策略】

SWR（Stale-While-Revalidate，过期内容先返回并后台重新验证）原本是缓存语义。RFC 5861 定义了 Cache 可以在允许的 stale 窗口内先返回旧响应，同时异步重新验证，从而隐藏重新验证延迟。[[1]](https://www.rfc-editor.org/rfc/rfc5861.html)

现代全栈框架把这种思想扩展到完整页面响应：

~~~text
已有页面响应
    ↓
继续复用
    ↓
过期
    ↓
先返回旧结果
    +
后台重新生成
    ↓
更新缓存
~~~

ISR（Incremental Static Regeneration，增量静态再生成）同样重点解决“静态结果怎样在部署以后继续更新”。Next.js 将其描述为：构建以后仍可以创建或更新静态页面，不需要重新构建整站。[[2]](https://nextjs.org/learn/seo/rendering-strategies)

因此更准确的层级关系是：

~~~text
页面生成策略
├─ CSR
├─ SSR
└─ SSG / Prerender

生成结果的复用与更新策略
├─ 每次重新生成
├─ 长期静态复用
├─ TTL Cache
├─ SWR
└─ ISR / Incremental Regeneration

组合层
└─ Hybrid Rendering
~~~

Nuxt 当前官方文档也把 swr、isr、prerender、ssr:false 统一放进 Route Rules，用来按 Route 调整渲染或缓存行为。[[3]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

**项目实践映射：** official-network 当前正是这一分层：稳定 Route 使用 Prerender，新闻 Route 使用 SWR，组件内部再设置 ClientOnly。对应源码分析见 [Route Rules 把稳定页面和动态内容拆成两条生产交付路径](https://github.com/cxDlogver/official-network/blob/main/docs/页面渲染策略与Hybrid%20Rendering源码分析.md#2-route-rules-把稳定页面和动态内容拆成两条生产交付路径)。

## 2. 现代 JavaScript 应用的“演进”是不断重新分配首屏生成成本，而不是旧模式被新模式淘汰

严格从 Web 历史看，服务端生成 HTML 早于 CSR，因此不能把 CSR → SSR → SSG 写成真实的技术年代顺序。

更有价值的是从现代 JavaScript Application 的问题演进理解：

~~~text
服务器直接返回页面
    ↓
需要更强客户端交互
    ↓
SPA / CSR 把大量 UI 逻辑移到 Browser
    ↓
首屏越来越依赖 JavaScript 和 Client Data Fetch
    ↓
现代 SSR 把“首次页面生成”重新移回 Server
    ↓
但仍通过 Hydration 保留 Client Runtime
    ↓
每个请求 SSR 又产生运行时成本
    ↓
SSG / Prerender 把稳定页面提前到 Build Time
    ↓
纯静态页面又存在更新及时性问题
    ↓
SWR / ISR 在“复用”和“新鲜度”之间做折中
    ↓
不同 Route 的需求不同
    ↓
Hybrid Rendering 按场景组合
~~~

这里没有任何一步完全取代上一步：

- CSR 仍然适合强交互、私有后台和不依赖首屏索引的应用；
- SSR 仍然适合必须在 Request Time 根据请求生成内容的页面；
- SSG 仍然适合稳定公共内容；
- SWR / ISR 只在允许共享和容忍一定陈旧度的内容上成立；
- Hybrid 只是把这些策略组合到一个应用里。

## 3. CSR、SSR 与 SSG 代表三种最基础的页面生成成本分配方式

### 【CSR 把主要页面生成放到 Browser Runtime】

CSR 的核心链路是：

~~~text
Document Request
    ↓
HTML Shell
    ↓
Client JavaScript 下载 / 解析 / 执行
    ↓
可选 Data Fetch
    ↓
生成 Component Tree / DOM
    ↓
Browser Layout / Paint
~~~

它的优势来自单一 Browser Runtime：

- 不需要维护 Server / Browser 两套运行边界；
- 浏览器 API 可以直接使用；
- Hydration 一致性问题基本不存在；
- 静态托管成本低。

它的主要代价也来自同一点：

> 用户看到主要内容之前，更依赖 JavaScript 下载、执行和客户端数据请求。

所以 CSR 的判断标准不是“页面用了 Vue / React”，而是“主要首屏内容是否必须等待浏览器 JavaScript 才生成”。

### 【SSR 把首次 HTML 生成移动到 Request Time Server】

现代 SSR：

~~~text
Document Request
    ↓
Server Route / Data
    ↓
Component Server Render
    ↓
HTML + Payload
    ↓
Browser Parse / Paint
    ↓
Client JavaScript
    ↓
Hydration
    ↓
Interactive Application
~~~

SSR 解决的是 CSR 首次页面生成过度依赖 Client Runtime 的问题，但同时引入：

- Request-time Server Compute；
- Server / Browser Runtime 差异；
- Request-scoped State；
- Payload 序列化；
- Hydration 成本与 Hydration Mismatch 风险。

所以 SSR 不是“把浏览器渲染搬到服务器”，而只是把 Component → HTML 这一步提前到服务端。浏览器仍负责 DOM、Style、Layout、Paint 与后续交互。完整机制见 [服务端渲染完整链路](./F-服务端渲染完整链路.md)。Vue 官方同样强调 SSR 应用会在服务端生成 HTML，随后客户端对已有 HTML Hydration。[[4]](https://vuejs.org/guide/scaling-up/ssr)

### 【SSG / Prerender 把页面生成继续提前到 Build Time】

如果页面不依赖每一次请求才能确定的数据，那么连 Request-time SSR 都可以提前：

~~~text
Build Time
    ↓
Component + Build-time Data
    ↓
Render HTML
    ↓
生成静态 Artifact
    ↓
Deploy
    ↓
Request
    ↓
直接返回已有 HTML
~~~

SSG 与 SSR 最核心的区别是生成时间：

~~~text
SSR
→ Request Time

SSG / Prerender
→ Build Time
~~~

两者都可能给浏览器完整 HTML，也都可能在浏览器继续 Hydration。

SSG 的优势来自“生成一次、多次复用”；代价则是：

- 内容更新通常需要重新生成；
- 页面数量很多时 Build Time 会增加；
- 动态 Route 必须在构建时能够发现或提供；
- 用户私有、请求级数据不适合直接固化进共享静态页面。

**项目实践映射：** official-network 将首页、产品、联系等稳定公开 Route 配置为 prerender，正是把稳定页面生成成本提前到构建阶段。见 [Prerender 把稳定页面的生成成本提前到构建阶段](https://github.com/cxDlogver/official-network/blob/main/docs/页面渲染策略与Hybrid%20Rendering源码分析.md#3-prerender-把稳定页面的生成成本提前到构建阶段)。

## 4. SWR 与 ISR 解决静态复用和内容新鲜度之间的矛盾

### 【SWR 允许先复用旧结果，再异步生成新结果】

如果一个页面：

- 面向大量用户共享；
- 内容会变化；
- 又没有必要每次请求重新生成；

就会出现典型矛盾：

~~~text
SSG
请求快
但更新慢

SSR
更新及时
但每次请求都重新生成
~~~

SWR 在中间增加缓存生命周期：

~~~text
第一次请求 / Cache Miss
    ↓
生成 Response
    ↓
写入 Cache

Fresh Window
    ↓
直接返回缓存

TTL 到期
    ↓
先返回 Stale Response
    +
Background Revalidate / Regenerate
    ↓
新 Response 替换旧 Cache
~~~

这是一种“可接受短时间旧内容，以换取低请求延迟和较低 Server Compute”的策略。

SWR 不适合直接用于共享用户私有页面，因为 Cache Key 如果没有包含用户身份维度，就可能把一个用户的页面响应复用给另一个用户。

### 【ISR 关注构建后继续增量创建或更新静态结果】

ISR 的核心问题是：

> 页面数量或更新频率已经不适合每次都全站重新 Build，但又希望继续保留静态结果的低请求成本。

抽象链路可以写成：

~~~text
Static Result
    ↓
Request / Revalidation Condition
    ↓
只重新生成受影响页面
    ↓
更新对应静态 / CDN Cache
    ↓
其他页面不需要整体重建
~~~

ISR 并不是统一 Web Standard，不同框架和部署平台的触发、缓存位置、阻塞 / 非阻塞语义可能不同。

Nuxt 当前文档中，isr 与 swr 行为相近，但 isr 可以在支持的平台把响应放入 CDN Cache；swr 则由 Server / Reverse Proxy Cache 等承载。[[3]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

因此面试中不要简单说：

~~~text
SWR = ISR
~~~

更准确的回答是：

> 两者都在解决“页面结果复用后如何更新”的问题，但 SWR 更接近 stale-while-revalidate 的缓存语义，ISR 更强调构建后增量更新静态页面；具体行为必须回到框架和部署平台确认。

**项目实践映射：** official-network 当前新闻使用 swr: 86400，没有配置 isr。新闻页面在缓存需要建立或更新时仍然执行 useFetch → Nitro API → WordPress → Server Render，再更新缓存。见 [新闻使用 SWR 的真实链路](https://github.com/cxDlogver/official-network/blob/main/docs/页面渲染策略与Hybrid%20Rendering源码分析.md#4-新闻使用-swr-解决不能长期静态但也没必要每次都重新-ssr的矛盾)。

## 5. Hybrid Rendering 的本质是把“页面策略选择”从整站决策降到 Route 决策

如果整站只能选一种模式：

~~~text
Application
→ 全部 CSR

或

Application
→ 全部 SSR
~~~

很快会出现冲突：

- Marketing / Blog 希望完整首屏 HTML；
- Admin Dashboard 更关注登录后的复杂交互；
- Product Page 相对稳定；
- News 会更新但可以短时间缓存；
- Account / Order 是用户私有数据。

Hybrid Rendering 把决策改为：

~~~text
Application
│
├─ Route A
│   └─ Prerender
│
├─ Route B
│   └─ SWR
│
├─ Route C
│   └─ Request-time SSR
│
└─ Route D
    └─ CSR
~~~

Nuxt 将这种能力称为 Hybrid Rendering，并通过 Route Rules 为不同 Route 分配 prerender、swr、isr、ssr:false 等规则。[[3]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

但还要继续区分一个更细粒度问题：

~~~text
Route Strategy
≠
Component Runtime Boundary
~~~

一个 Prerender 页面内部仍可有 ClientOnly 图表；一个 SSR 页面也可以局部延迟到 Client Runtime。Route 决定整页响应怎样产生，Component Boundary 决定局部代码在哪个 Runtime 执行。

**项目实践映射：** official-network 首页 Route 使用 Prerender，但 Hero 使用 ClientOnly；新闻 Route 使用 SWR，但正文当前因 Hydration Mismatch 风险也使用 ClientOnly。见 [Route 策略与 Component Runtime Boundary 是两条控制线](https://github.com/cxDlogver/official-network/blob/main/docs/页面渲染策略与Hybrid%20Rendering源码分析.md#5-route-级渲染策略和-component-级-clientonly-是两条不同控制线)。

## 6. 选择渲染策略时先判断数据归属和新鲜度，再判断性能与 SEO

“SEO 好就 SSR、后台就 CSR”只能作为很粗的经验，真正稳定的决策顺序应该从数据约束出发。

### 【第一步判断页面是否可以被多个用户安全复用】

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

例如 Account、Order、权限页面通常不能把某个用户渲染出的整页 HTML 直接变成公共 SWR Cache。

### 【第二步判断内容是否能提前确定】

~~~text
请求到来之前
能否得到页面主要内容？
        │
        ├─ 不能
        │   └─ Request-time SSR / CSR
        │
        └─ 能
            └─ 可以考虑 Prerender
~~~

### 【第三步判断内容更新频率和可容忍陈旧时间】

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

### 【最后再评估浏览器交互和索引要求】

如果核心内容需要首个 HTML 就出现，SSR / SSG / Cached HTML 通常比纯 CSR 更直接；如果页面高度私有、用户登录后长期使用并且主要价值来自复杂交互，CSR 的约束可能更少。

但 SEO 不是由渲染模式单独决定，性能也不是“SSR 一定比 CSR 快”。真正结果还取决于：

~~~text
Server Response Time
Network
Cache Hit Rate
HTML Size
Critical CSS
Client JavaScript
Hydration Cost
Data Fetch
Browser Rendering
~~~

## 7. 一张表看清主流策略真正改变了什么

| 维度 | CSR | Request-time SSR | SSG / Prerender | SWR | ISR |
| --- | --- | --- | --- | --- | --- |
| 首屏 HTML 主要生成时机 | Browser Runtime | 每次请求 | Build Time | 首次 / 再生成时生成，之后缓存复用 | Build 后按增量条件生成 / 更新 |
| 是否需要 Server Runtime 生成页面 | 首屏不需要 | 需要 | 请求时通常不需要 | Cache Miss / Regeneration 时需要 | 取决于框架 / 平台 |
| 是否适合共享公共缓存 | 可缓存静态 Shell / API | 视数据而定 | 很适合 | 核心能力 | 核心能力 |
| 数据新鲜度 | Client Fetch 决定 | 请求时新 | 直到重新生成 | TTL / Revalidate 决定 | Revalidate 规则决定 |
| 用户私有内容 | 适合 | 适合 | 不适合直接固化 | 不适合公共整页缓存 | 不适合公共整页缓存 |
| 首屏对 Client JS 依赖 | 高 | 内容可先显示，交互仍需 JS | 内容可先显示，交互仍需 JS | 同缓存页面本身的渲染方式 | 同生成页面本身的渲染方式 |
| 主要成本 | Client JS / Data Fetch | Server Compute + Hydration | Build Time + Freshness | Cache Complexity + Staleness | Regeneration / Platform Semantics |

这张表最重要的不是选出“最优模式”，而是看到：

> 每一种策略都只是把生成、计算、缓存和更新成本重新分配到 Build、Request、Cache 或 Browser 的不同阶段。

## 8. 常见误区来自把不同层次概念强行等价

### 【SPA 不等于 CSR，MPA 不等于 SSR】

SPA / MPA 描述 Navigation Model；CSR / SSR 描述内容生成位置。

现代应用完全可以：

~~~text
Initial Request
→ SSR / Prerender HTML
→ Hydration
→ SPA Client Navigation
~~~

详细边界见 [Web 渲染架构](./W-Web渲染架构.md)。

### 【Prerender 不等于没有 JavaScript】

Prerender 只是把首屏 HTML 提前生成。页面仍可以：

~~~text
Static HTML
+
Client JavaScript
↓
Hydration
↓
Interactive Application
~~~

### 【SWR 不等于浏览器数据请求库】

前端生态中也存在名为 SWR 的数据请求库，但本文讨论的是 Stale-While-Revalidate 缓存 / 页面响应策略。必须结合上下文判断。

### 【Edge Rendering 主要是部署位置变化】

Nuxt 当前文档特别指出 Edge-Side Rendering 更接近 Deployment Target，而不是独立 Rendering Mode：它把服务端生成 HTML 的执行位置移动到更靠近用户的 Edge Server。[[3]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

因此：

~~~text
SSR
回答“Request Time 是否由 Server 生成 HTML”

Edge
回答“这个 Server Runtime 部署在哪里”
~~~

## 9. 页面渲染策略连接 SSR、缓存、浏览器渲染和性能四个后续知识分支

完整知识关系可以整理为：

~~~text
Navigation Model
MPA / SPA
    ↓
页面渲染策略
CSR / SSR / SSG
    ↓
结果复用与更新
Cache / SWR / ISR
    ↓
Hybrid Rendering
按 Route 组合
    ↓
HTML / Payload / Client JS
    ↓
Browser Parse / Hydration
    ↓
Layout / Paint / Interaction
    ↓
Performance / SEO / Runtime Cost
~~~

继续学习：

- [Web 渲染架构](./W-Web渲染架构.md)：上位入口，先区分导航模型和内容生成策略；
- [服务端渲染完整链路](./F-服务端渲染完整链路.md)：深入 Request-time SSR、Payload、Hydration 与 Server / Client 边界；
- [CDN缓存与浏览器缓存笔记](./C-CDN缓存与浏览器缓存笔记.md)：深入 Freshness、Validation 与缓存层；
- [基于Chrome浏览器渲染原理](./J-基于Chrome浏览器渲染原理.md)：继续理解 HTML / CSS / JavaScript 如何形成屏幕画面；
- [Web 性能优化完整知识体系](./W-Web性能优化完整知识体系.md)：继续分析不同策略怎样改变 TTFB、资源、JavaScript 与 Hydration 成本。

**项目实践映射：** official-network 当前以 Prerender + SWR 为 Route 主线，再叠加 ClientOnly 与 Hydration，形成一个真实 Hybrid Rendering 样本。完整分析见 [official-network 页面渲染策略与 Hybrid Rendering 源码分析](https://github.com/cxDlogver/official-network/blob/main/docs/页面渲染策略与Hybrid%20Rendering源码分析.md)。

## 10. 参考文献

1. [RFC 5861 - HTTP Cache-Control Extensions for Stale Content](https://www.rfc-editor.org/rfc/rfc5861.html)
2. [Next.js - Rendering Strategies](https://nextjs.org/learn/seo/rendering-strategies)
3. [Nuxt 4 - Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering)
4. [Vue.js - Server-Side Rendering](https://vuejs.org/guide/scaling-up/ssr)
