# Loading 页面加载体验：LCP 四阶段性能诊断与优化体系（草稿）

> 草稿状态：独立讨论稿；暂不接入知识体系索引、QA 或正式性能知识正文。
>
> 范围：只讨论 Loading（页面加载体验）的度量与诊断，以 LCP（Largest Contentful Paint，最大内容绘制）为核心结果指标，说明四阶段时间归因、问题类别、原始证据、技术取舍和验证闭环；同时保留 FCP、业务关键内容、SPA 软导航、SSR / CSR / Hydration 等必要边界。本稿中的数字、URL 和诊断案例均为演示，不代表某个项目的真实线上结果。
>
> 参考口径：web.dev、GoogleChrome/web-vitals、Chrome Developers、MDN 和 Nuxt 官方资料；涉及浏览器新能力和 API 版本，最终使用前须按目标浏览器再次核验。

> **统一性能异常诊断入口**：发现某项 Web 性能指标回归后，先按版本、页面、设备和时间建立上下文，再按结果→阶段→证据→根因→优化→验收进行分析。完整共用方法参见 [Web 性能异常定位与优化完整方法（草稿）](./Web性能异常定位与优化完整方法-草稿.md)；本文只负责Loading 的阶段机制的深入解释。

## 1. Loading 性能分析先从用户体验建立整体诊断模型

### 【页面加载快不快，首先取决于用户什么时候看到主要内容】

Loading（加载体验）回答的是：从发起导航到主要内容可见，用户等待了多久。这与接口是否已经返回、代码是否已经执行、组件是否已经挂载不完全相同。

LCP 是当前 Core Web Vitals 中用于反映主要内容加载速度的结果指标：浏览器记录符合 LCP 规则的最大可见图片或文本块何时完成绘制。它测量浏览器感知的可见内容，而不理解该内容在业务上是否最重要。按照 web.dev 的评价口径，以移动端和桌面端分别统计的实际页面访问 P75 衡量：LCP ≤ 2.5s 为良好；2.5s～4s 为需要改善；超过 4s 为较差。[[1]](https://web.dev/articles/lcp)

LCP 不等于页面全部资源下载完成，不等于 DOMContentLoaded / load，不等于 Hydration 完成，也不等于业务数据准备就绪。对于不同页面，LCP 元素可能是首屏主图、文章标题、大块文本或其他符合规则的元素。LCP 元素可以随加载过程改变：早期绘制的文本是候选值，之后更大的图片完成绘制后可能成为最终候选值。实际记录需要遵循页面生命周期和浏览器 API 规则，而不是把最早收到的一条 Entry 当成最终 LCP。

监控平台的诊断应当遵循两条相互配合的主线：

~~~text
体验与决策主线：
线上发现 LCP 回归
    ↓ 按 Route / Version / Device / Network / Navigation Type 缩小范围
确认受影响的访问群体
    ↓ 对具体访问做 LCP 四段耗时拆解
判断哪一个阶段新增耗时最多
    ↓ 读取对应的网络、资源、执行、绘制证据
形成可证伪的候选根因
    ↓ 同条件实验排除伴随现象
实施有针对性的优化
    ↓ 本地实验与线上相同分群对比
确认 LCP 和实际业务体验是否改善

浏览器加载主线（需要独立 LCP 资源的完整文档导航）：
发起文档导航
    ↓ TTFB：获得 HTML 首字节
浏览器开始接收并解析主文档
    ↓ Resource Load Delay：发现、调度关键资源
LCP 资源开始加载
    ↓ Resource Load Duration：获取关键资源
LCP 资源完成加载
    ↓ Element Render Delay：满足 DOM / CSS / JS / 绘制条件
浏览器完成 LCP 元素绘制
~~~

第一条是定位步骤，第二条是用于解释等待成本的资源生命周期。两者并非同一件事：监控应该先确认发生了什么体验问题，再根据浏览器阶段找证据，而不是见到 LCP 高便直接使用图片压缩、CDN 或 SSR。

本草稿采用两级体系：

- **结果指标（Result Metric）**：LCP，判断页面主要内容显示是否过慢；FCP 可以补充最早内容显示的时机，但不替代 LCP。
- **诊断指标与证据（Diagnostic Data）**：TTFB、Resource Load Delay / Duration、Element Render Delay，以及更底层的 Navigation Timing、Resource Timing、Long Task、Performance Trace、Server Timing 等，负责解释“为什么慢”。

四阶段模型来自 web.dev 的 Optimize LCP。它是一套时间归因模型，四段无重叠、无缺口，合计为 LCP；浏览器不直接提供四个同名的独立标准 Performance Entry。[[2]](https://web.dev/articles/optimize-lcp)

### 【先处理三种容易误导性能结论的差异】

**访问场景差异**：首次冷导航、刷新、返回前进缓存恢复、客户端路由切换、预渲染激活不是完全相同的测量过程。尤其 SPA 软导航没有新 HTML 请求，不能把原始文档的 TTFB 搬到每次客户端路由中。

**样本群体差异**：同一个页面在高端桌面、低端手机、弱网、不同地区的性能差异很大。因此线上首先应保留版本、路由、设备、网络、导航类型和样本数量，必要时加入缓存命中、地区、实验分组。

**指标语义差异**：LCP 元素大小不代表业务价值。一个占据半屏的装饰图片可能成为 LCP；用户真正需要的数据表格还没出现。监控不能因此丢弃 LCP，但应另行测量业务关键内容的可见或可用时间。

## 2. LCP 四阶段把“页面慢”拆为四种不同等待成本

### 【四个阶段分别回答四个问题】

对有独立资源的 LCP 元素，可以把导航到最终绘制的时间划分为：

| 阶段 | 英文名称 | 该阶段结束时浏览器获得了什么 | 主要诊断问题 |
| --- | --- | --- | --- |
| ① 主文档交付 | TTFB（Time to First Byte，首字节时间） | HTML 第一个字节 | HTML 为什么迟迟没有到达？ |
| ② 关键资源发现与调度 | Resource Load Delay（资源加载前等待） | 浏览器开始加载 LCP 资源 | 资源为什么迟迟没有开始加载？ |
| ③ 关键资源获取 | Resource Load Duration（资源加载耗时） | LCP 资源已加载完成 | 资源已经开始加载，为什么需要这么久？ |
| ④ 关键元素呈现 | Element Render Delay（元素渲染等待） | LCP 元素完成绘制 | 资源就绪以后，为什么元素还没显示？ |

计算关系：

~~~text
LCP
= TTFB
+ Resource Load Delay
+ Resource Load Duration
+ Element Render Delay
~~~

直观时间点模型（同一次完整文档导航，图片资源的常规非重叠情况）：

~~~text
t0 = 导航时间原点
t1 = 主 HTML 响应首字节时间
t2 = 最终 LCP 资源加载起点
t3 = 最终 LCP 资源加载终点
t4 = 最终 LCP 元素绘制时刻

TTFB                 = t1 - t0
Resource Load Delay  = t2 - t1
Resource Load Duration = t3 - t2
Element Render Delay = t4 - t3
LCP                  = t4 - t0
~~~

上述表达是**概念级计算**。实际资源可能被预加载、从缓存读取或不存在独立 Resource Entry；某些资源计时字段还有重定向与浏览器安全限制。真实 SDK 应使用与 web-vitals 相同的规范化归因口径，避免时间重叠、负值、错误 URL 匹配。特别是**无需独立资源的系统字体文本 LCP**，两个 Resource 阶段按官方定义都为零，剩余时间归入 TTFB 与 Element Render Delay。[[2]](https://web.dev/articles/optimize-lcp) [[3]](https://github.com/GoogleChrome/web-vitals)

### 【结果需要同时看绝对耗时、变化量和阶段占比】

例如某一组有代表性的单次访问：

| 阶段 | 耗时 | 对 LCP 的贡献 |
| --- | ---: | ---: |
| TTFB | 800ms | 20% |
| Resource Load Delay | 1200ms | 30% |
| Resource Load Duration | 600ms | 15% |
| Element Render Delay | 1400ms | 35% |
| **LCP** | **4000ms** | **100%** |

这表示真正需要优先关注的是“关键资源为什么晚开始”和“资源就绪为什么晚呈现”，不能先认定“图片过大”。

对版本回归，优先比较**同等条件、可匹配样本上的阶段新增耗时**，而不是机械地选择当前绝对值最大的阶段。因为一个阶段可能原本就存在不可避免的网络成本，新增问题反而在另一个阶段。同时检查优化后的整体 LCP：某阶段缩短以后，节省的时间可能转移到后续等待环节，最终 LCP 未变。[[2]](https://web.dev/articles/optimize-lcp)

web.dev 提供的约 40% TTFB、少于 10% 资源发现等待、约 40% 资源加载、少于 10% 渲染等待，只是示意良好页面的相对结构，不是四项指标的强制阈值；尤其两个 Delay 阶段通常应尽可能减少无效等待。[[2]](https://web.dev/articles/optimize-lcp)

## 3. TTFB 诊断的是主 HTML 文档交付成本

### 【TTFB 高不等于服务端代码一定慢】

TTFB 从文档导航开始到主 HTML 首字节到达，可能包括重定向、域名解析、连接建立、TLS 协商、请求往返、缓存查找与服务端生成 HTML。它和 Resource Load Duration 都可能受网络与服务端影响，但**对象不同**：TTFB 关注主文档首字节，后者关注 LCP 资源的获取。

~~~text
开始文档导航
    ↓ 浏览器与导航前置处理
重定向 / DNS / Connection / TLS（可能被复用或省略）
    ↓ 请求抵达服务端或缓存节点
CDN / 网关 / 后端 / SSR / 数据依赖
    ↓
主 HTML 第一个字节抵达浏览器 → TTFB 结束
~~~

导航缓慢时，可从 Navigation Timing 的时间轴读取 responseStart、requestStart、domainLookupStart / End、connectStart / End、redirectStart / End 等数据；但各字段可能因缓存、连接复用、重定向跨源、Service Worker 和协议差异呈现零值或特殊行为。它们不能都简单相减后当成各项恒定存在的成本。服务端实际处理细节应结合 Server-Timing 或后端 Trace，而不是仅靠浏览器 TTFB 推断。[[4]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming) [[5]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/serverTiming)

### 【TTFB 异常的三个上位原因及工程方向】

#### <u>1. 导航和网络连接成本</u>

- **现象**：用户尚未到达真正的文档服务，就经历多次重定向、域名解析或网络往返。
- **例子**：访问 example.com → 跳到 www.example.com → 再跳语言页面；每次跳转可能增加额外往返。
- **证据**：Network Waterfall 里存在重定向链；Navigation Timing 的相关字段或网络跟踪显示耗时集中于请求前。
- **优化类型**：导航入口治理。直接使用最终规范 URL、缩短重定向链、合理利用连接复用和适当的资源交付地域。
- **不能直接推出**：TTFB 高就一定应该加 CDN；若异常实际上发生在服务端数据库，网络分发并不能根治。

#### <u>2. 服务端生成与业务依赖成本</u>

- **现象**：网络已到达服务端，但首字节需要等接口、数据库、模板渲染或 SSR 工作。
- **例子**：SSR 请求必须先查询列表、再请求第三方服务，最后才能生成首段 HTML。
- **证据**：服务器端分阶段 Trace、Server-Timing、数据库慢查询、SSR 处理时间与主文档请求时序相关。
- **优化类型**：服务端关键路径治理。减少串行依赖，优化数据库查询、数据缓存、HTML 生成；允许的场景可以使用流式响应，把可以提前发出的内容先交付。
- **架构取舍**：SSR 会让 HTML 更早包含关键内容，但如果服务端必须等待慢接口，TTFB 可能上升。不能因为“SSR”就断言首屏一定更快。

#### <u>3. 文档缓存与边缘交付成本</u>

- **现象**：大量相同的可公开缓存页面每次都回源生成，或缓存因 URL 参数、规则和失效机制没有命中。
- **证据**：CDN Cache Hit / Miss、响应缓存头、回源比例、服务端请求数量。
- **优化类型**：内容交付策略。对于更新相对稳定的公开页面，评估 SSG、预渲染、CDN 缓存或分层缓存；对于个性化或敏感 HTML，先保证权限与缓存键隔离，不能为了 TTFB 直接共享页面响应。
- **边界**：页面是否允许缓存取决于内容一致性、权限和更新约束。SSG 可能提高交付效率，但需要解决数据更新与重新生成、缓存失效的问题。

### 【TTFB 的排查判断】

假设 LCP 4.0s，TTFB 2.3s：浏览器收到 HTML 之前已消耗大部分预算。应先比较重定向/连接与后端处理所占的时间，再决定是网络入口、服务端依赖还是缓存策略的问题。只有客户端 TTFB，不足以证明具体函数、SQL 或第三方服务是根因。

## 4. Resource Load Delay 诊断的是 LCP 资源发现和调度是否及时

### 【这一阶段不是下载慢，而是下载尚未开始】

Resource Load Delay 从主 HTML 首字节已到达、到 LCP 对应资源开始加载。浏览器通常需要从 HTML、CSS、JS 或业务数据中发现资源地址，之后再按网络调度与优先级发起加载。因而这段时间主要反映**关键资源被发现或真正调度得太晚**。[[2]](https://web.dev/articles/optimize-lcp)

例如：

~~~text
HTML 400ms 已收到首字节
    ↓ 加载和执行 JS
JS 在 1000ms 完成
    ↓ 等待接口返回图片 URL
图片在 1600ms 开始加载
    ↓
Resource Load Delay 约 1200ms
~~~

这里即使图片只有 100KB，也已经损失了超过一秒的等待。提前压缩图片只作用于下一阶段；应该先考虑是否能更早向浏览器暴露图片 URL。

### 【Resource Load Delay 异常的三个上位原因及工程方向】

#### <u>1. 资源发现过晚：HTML 中没有暴露关键地址</u>

- **现象**：初始 HTML 不包含 LCP 图片；必须等待客户端 JS、组件创建、CSS 解析或数据接口才出现图片 URL。
- **典型机制**：CSR 的根节点没有主视觉 DOM；JS 启动 → Fetch 业务数据 → 组件渲染 → 才创建 img；CSS background-image 也可能比直接在 HTML 中的 img 晚被发现。
- **证据**：查看初始 HTML 能否直接定位最终 LCP 资源；Network Waterfall 中其开始时间明显晚于 HTML、JS 或数据请求；Initiator 与请求依赖链指向 JS / CSS。
- **优化类型**：关键资源可发现性治理。在满足渲染需求的前提下让首屏关键 img 尽量直接出现在初始 HTML；SSR、SSG 可帮助输出资源 URL。若资源无法从标记直接发现但 URL 已知，评估适当 Preload。
- **边界**：Preload 并不是资源下载之后再“提前渲染”；它是向浏览器提前声明需要获取的关键资源。不能为大量资源滥用 Preload，避免抢占更关键请求。

#### <u>2. 调度优先级不合理：资源已知却被延后请求</u>

- **现象**：首屏 LCP 图片被设置为 loading=lazy，或关键图片未被给予足够的网络优先级。
- **证据**：检查 img 属性、DevTools Network Priority / Waterfall；LCP 图片是否明显晚于其他非关键资源开始。
- **优化类型**：首屏与非首屏资源分级。首屏 LCP 图片应避免懒加载；合理考虑 loading=eager、fetchpriority=high，非首屏图片与次要模块才考虑 Lazy Load。[[2]](https://web.dev/articles/optimize-lcp)
- **边界**：提高 Priority 是提示浏览器，不保证任意环境下绝对顺序；全部资源都设高优先级会使优先级策略失去意义。

示例：

~~~html
<!-- 首屏确定为 LCP 的图片：不要用 loading="lazy" 延后 -->
<img
  src="/hero.webp"
  width="1200"
  height="600"
  loading="eager"
  fetchpriority="high"
  alt="页面主要内容图片"
/>

<!-- 次要、首屏以外的图片：适合按需加载 -->
<img src="/gallery-20.webp" loading="lazy" alt="其他图片" />
~~~

width 与 height 用于提前占位、改善布局稳定性，不能代替资源压缩；fetchpriority 用于请求优先级，不直接减少资源字节数。

#### <u>3. 业务前置依赖过多：必须等多个结果才能确定图片</u>

- **现象**：需要先获得配置、活动详情或鉴权后的数据，才能知道最终 LCP 图片是什么。
- **证据**：API 请求结束时间与图片请求开始时间紧密衔接；查看业务代码可以确认 URL 的生产链路。
- **优化类型**：缩短首屏关键数据依赖链。能预先确定的配置直接放入 HTML 或缓存，非关键数据异步补齐，可并行的请求不串行等待。
- **边界**：若资源 URL 受权限或实时业务状态控制，不能为了加速而泄露给未授权用户；需要根据实际业务允许的最早时机加载。

### 【这一阶段应该怎样决定下一步】

若 TTFB = 400ms，图片资源直到 1800ms 才开始，加载只要 300ms：优先回答“为什么 1400ms 没有开始加载”，不要先把 300ms 下载时间当成主因。依次核验初始 HTML → Initiator → Lazy/Fetch Priority → 依赖接口顺序。仅凭 Load Delay 较高不能证明一定是“错误配置”，也可能是 CSR / 数据依赖设计带来的时间成本。

## 5. Resource Load Duration 诊断的是关键资源获取的真实成本

### 【资源已经开始加载，接下来才讨论文件体积与传输】

Resource Load Duration 是 LCP 资源从加载起点到加载完成的持续时间。它可能涉及请求排队、连接/重定向、服务器响应、传输与缓存，并非严格等于“开始接收正文到最后一个字节”的纯下载时间。可以通过对应 Resource Timing Entry 的 startTime、fetchStart、responseStart、responseEnd、duration、transferSize、encodedBodySize 等字段辅助拆解。startTime 与 fetchStart 的区别涉及重定向等场景，因此生产计算应保持统一口径。[[6]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming) [[7]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/fetchStart)

### 【Resource Load Duration 异常的四个上位原因及工程方向】

#### <u>1. 文件体积过大：加载了远超实际需要的字节</u>

- **现象**：页面只需要显示 600px 主图，却发送 4000px 原始图；或下载体积很大的字体、图片。
- **证据**：资源 Transfer Size、Encoded Body Size、尺寸与实际 CSS 展示大小，结合同等网络条件下下载时间变化；跨源 Timing 可能受安全限制。
- **优化类型**：资源内容治理。根据实际显示尺寸生成响应式资源，使用 srcset / sizes、WebP / AVIF、压缩、合理裁切；必要时治理字体加载与字体子集。
- **边界**：图片体积减小会降低传输成本，但**未必降低 LCP**。若图片原本已提前加载完成，页面仍被 JS 或样式等待阻塞，节省的时间可能转移到 Element Render Delay。[[2]](https://web.dev/articles/optimize-lcp)

#### <u>2. 资源服务器或网络连接成本高：小文件仍然来得慢</u>

- **现象**：图片源站距离用户较远、跨多个域名建立连接、服务端资源响应慢。
- **证据**：Resource Timing 的连接/请求/响应阶段、目标域名与 CDN 命中情况、地域及网络分群。
- **优化类型**：分发和连接策略。合适的 CDN、资源就近交付、避免无意义跨域拆分、关键连接的预连接（preconnect），或优化资源服务器本身。
- **边界**：预连接不是对所有域名都有效；连接已复用时，再加预连接可能收益很小。服务端处理与网络 RTT 需要进一步区分。

#### <u>3. 非关键资源竞争：关键资源被其他下载占用带宽</u>

- **现象**：首屏同时加载大量列表图片、第三方脚本和非关键 JS，使 LCP 图片获取变慢。
- **证据**：Network Waterfall、资源并发数、优先级与传输时序。
- **优化类型**：加载顺序治理。关键资源优先，非关键图片懒加载，非关键模块适当 Code Splitting / Dynamic Import，推迟第三方脚本或其他非必需传输。
- **边界**：Code Splitting 不会直接缩小 LCP 图片，也不保证整体加载更快；若关键模块又被拆成需要串行下载的 Chunk，还可能增加发现等待和往返。

#### <u>4. 缓存没有复用：重复支付本可避免的网络成本</u>

- **现象**：多次访问相同资源仍然重新完整下载；CDN 回源率高。
- **证据**：Cache-Control、ETag/304、Cache Hit、Resource Timing 字节数、DevTools Network。
- **优化类型**：浏览器与 CDN 缓存。静态资源可采用内容哈希文件名和合适的长缓存策略；动态内容按更新和权限要求配置缓存。
- **边界**：transferSize=0 不能无条件断言“命中缓存”，因为跨域缺少 Timing-Allow-Origin 时也可能无法暴露该字段。[[8]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize)

### 【这一阶段的排查判断】

若 HTML 及时到达、LCP 图片也及时开始加载，但资源阶段持续 2100ms，应先读取 Resource Timing：体积是否不合理、连接与响应是否慢、是否存在带宽竞争、缓存是否命中。只有确认真正慢在传输/获取阶段，才优先实施图片体积治理、CDN 或加载竞争优化。

## 6. Element Render Delay 诊断的是关键资源就绪后仍未呈现的原因

### 【下载完成，不代表 LCP 已经可以绘制】

Element Render Delay 从最终 LCP 资源完成加载到浏览器完成该元素绘制。下载文件只是呈现的一个条件，页面还要满足 DOM 存在、样式与可见性、主线程可调度和浏览器完成必要渲染工作。对于无需独立资源的文本 LCP，该阶段还包括 TTFB 之后直到文本完成绘制的剩余等待。

核心误区是把 Render Delay 简化成 Style / Layout / Paint 的执行耗时。事实上它可能包含大量**尚未开始绘制之前的等待**，例如图片已经预加载完成，但 JS 还没有创建 img，或者 A/B 实验代码把整个应用隐藏了。[[2]](https://web.dev/articles/optimize-lcp)

### 【Element Render Delay 异常的四个上位原因及工程方向】

#### <u>1. 渲染依赖尚未就绪：样式或同步脚本阻塞页面</u>

- **现象**：图片早已下载，但渲染所需的 CSS 或同步 JS 尚未完成。
- **证据**：Network 中关键样式表或同步脚本结束较晚；Chrome Performance / Coverage 显示关键路径依赖。
- **优化类型**：关键渲染路径治理。优化关键 CSS 与阻塞脚本，把非关键样式或 JS 安排到不会阻碍首屏的时机。
- **边界**：延后 CSS/JS 必须保证样式正确性和业务行为；不能通过简单移除样式造成新的 CLS 或功能异常。

#### <u>2. 关键 DOM 或显示条件准备晚：资源先到，内容后建</u>

- **现象**：已经预加载了 hero.webp，但客户端路由初始化、组件动态 import 或接口完成后才创建 img；也可能图片元素被设置为隐藏状态，等待业务或实验规则。
- **证据**：Resource responseEnd 较早，但 DOM 创建、元素显示状态或相关业务 API 时间较晚；LCP Entry 的最终元素与这些事件同一时间窗口。
- **优化类型**：关键内容生成与展示治理。针对允许在服务端呈现的内容使用 SSR/SSG，避免主视觉被无关业务状态阻塞；如果必须客户端生成，缩短先决依赖，并保持占位与明确的可见条件。
- **架构边界**：Nuxt 的 ClientOnly 默认插槽只在客户端渲染，服务端通常只能输出 fallback；如果首屏 LCP 元素放在这里，可能推迟其绘制。SSR 输出的内容**可以在 Hydration 之前成为 LCP**，不需要先完成水合。[[9]](https://nuxt.com/docs/4.x/api/components/client-only)

#### <u>3. 主线程被占用：内容本可绘制，但浏览器得不到渲染机会</u>

- **现象**：图片已到，但同步计算、第三方脚本、复杂框架初始化或长任务占据主线程。
- **证据**：Chrome Performance Trace 的 Main Thread、Long Task、脚本耗时与 LCP 前时间窗口重叠；仅看一次 Long Task 仍无法直接确认因果。
- **优化类型**：JavaScript 执行成本治理。减少首屏非必需代码、合适的代码拆分、拆解长同步任务、后移非关键初始化；纯计算可视情况移到 Worker。
- **边界**：Worker 不直接执行主线程 DOM / Layout 工作；代码拆分必须真的减少关键路径上的执行，而不是把同量代码变成更多串行请求。

#### <u>4. 浏览器绘制工作过重：布局、绘制或图片处理过重</u>

- **现象**：DOM 已存在、资源已就绪，浏览器仍要进行昂贵的图片处理、Style / Layout / Paint / Composite。
- **证据**：Chrome Trace 的 Rendering、图片解码、Layout、Paint、强制同步布局记录，及对应元素参与的渲染范围。
- **优化类型**：浏览器渲染成本治理。减少无效布局读写、复杂 DOM 范围、非必要的绘制效果；选用合理解码和展示尺寸。
- **边界**：图片“过大”可能同时增加下载量和解码成本，需要看 Resource Load Duration 与 Element Render Delay 的实际贡献再分别归因。

### 【子阶段减少，最终 LCP 不一定减少】

假设原始情况：

~~~text
LCP 图片下载结束：1000ms
JS 初始化结束：1800ms
LCP 绘制：1900ms
~~~

压缩图片后下载结束提前至 700ms，但 JS 初始化仍要到 1800ms 才允许元素出现，那么 LCP 仍可能是 1900ms。变化只是：

~~~text
Resource Load Duration 减少约 300ms
Element Render Delay 增加约 300ms
最终 LCP 无明显变化
~~~

因此诊断不能只看“Resource 已经更快”，而应关注哪个条件最后阻碍 LCP 绘制。[[2]](https://web.dev/articles/optimize-lcp) [[10]](https://web.dev/blog/common-misconceptions-lcp)

## 7. 不同导航与渲染架构决定 LCP 四阶段适用边界

### 【硬导航与 SPA 软导航不能直接共用 TTFB 口径】

**硬导航（Hard Navigation）**：用户输入 URL、刷新，或其他造成新 Document 导航的场景。浏览器重新获取主文档，通常存在主 HTML TTFB，可使用 Navigation Timing 和 LCP 四段进行归因。

**软导航（Soft Navigation）**：SPA 中通过 Router 改变 URL 和页面内容、但不重新加载主 HTML 文档的导航。它可能发生数据请求、JS Chunk 下载和组件渲染，却不存在一次新的主文档响应首字节，因此不能把最初 HTML 的 TTFB 复用于后续每次路由切换，也不能把路由后第一个 API 请求的等待直接改名为 TTFB。

截至本稿核验，Chrome 从 151 版本起提供 Soft Navigations 和交互驱动的导航测量能力，官方浏览器端识别与用户交互、URL 变化、页面实际绘制等条件相关。GoogleChrome/web-vitals 文档指出：支持软导航的模式下，软导航 TTFB 记为 0；FCP/LCP 对应软导航之后的新内容绘制，而不是继续使用原始文档的 LCP。不同浏览器的支持与采集口径存在差异，不能把所有 Router 事件自动等同于浏览器认可的 Soft Navigation。[[11]](https://developer.chrome.com/docs/web-platform/soft-navigations) [[3]](https://github.com/GoogleChrome/web-vitals)

因此建议区分：

~~~text
Hard Navigation
→ Navigation Timing（主文档 TTFB）
→ LCP / Attribution（完整文档级）
→ 版本、路由与访问环境分群

Soft Navigation
→ 路由开始时刻
→ Route Data Fetch / Chunk Load / Component Update
→ 浏览器支持时的 Soft Navigation LCP
→ 不支持时使用自定义路由内容就绪指标并保留来源标记

对外报表必须按 Navigation Type 区分口径
~~~

Browser RUM 平台还需要对后退前进缓存恢复、预渲染等独立打标签，避免把它们混成普通冷导航。传统硬导航 LCP 与软导航 LCP 的候选元素、时间基准和页面生命周期不同，不能未经验证直接合并比较。

### 【SSR、CSR、SSG 影响的是内容产生在哪里，而不是 LCP 定义】

LCP 衡量实际绘制时刻，不要求主要内容由服务端生成。对于硬导航，SSR 或 CSR 都可能产生 LCP，只是关键内容可见的路径不同：

~~~text
SSR：
服务端获取数据 / 生成 HTML
→ 浏览器收到 HTML
→ 浏览器解析并绘制 SSR 内容
→ 客户端 Hydration 恢复交互
（LCP 可以发生在 Hydration 之前）

CSR：
浏览器收到初始 HTML
→ 下载和执行 JS
→ 客户端获取数据并创建 DOM
→ 浏览器绘制主要内容
（LCP 可能等待 JS / API / 组件）
~~~

SSR 能通过 HTML 提前暴露关键内容和 LCP 资源，但也可能使服务端生成成本进入 TTFB。SSG 能减少请求时生成 HTML 的成本，但会引入内容更新与缓存失效约束。Hybrid Rendering 则需要按具体路由的实际渲染方式判断。

Nuxt ClientOnly 是特定边界：默认插槽只在客户端渲染，服务端可输出 fallback，因此不能把默认插槽当作普通 SSR 内容。若 ClientOnly 中放置 LCP 元素，可能增加 DOM 建立和最终绘制的等待。[[9]](https://nuxt.com/docs/4.x/api/components/client-only)

### 【LCP、FCP、业务关键内容指标关注不同完成条件】

| 指标 | 回答的问题 | 限制 |
| --- | --- | --- |
| FCP（First Contentful Paint，首次内容绘制） | 页面是否开始呈现可见内容 | Loading 文本或无关元素也可能触发，不证明主体可用 |
| LCP | 视口内最大符合规则的内容何时绘制 | 不保证该元素是业务最重要内容 |
| 自定义关键内容可见时间 | 业务需要的指定内容何时出现 | 需要业务定义和埋点口径 |
| 自定义业务可用时间 | 用户何时能真正完成主要任务 | 还涉及数据状态、交互、权限和功能验收 |

例如数据分析页 FCP 可能来自“加载中”，LCP 可能来自装饰 Banner，但用户真正关心的图表在两秒以后才出现。正确做法是保留可标准化比较的 FCP / LCP，并补充“首批有效数据展示”或“主要图表可用”的业务指标，而不是因某张图片不重要就机械地用 FCP 替换 LCP。[[12]](https://web.dev/articles/user-centric-performance-metrics)

业务可见时间也不能简单以 API resolve、组件 mounted 或 performance.mark 调用时刻充当“已经完成屏幕绘制”；若需要确切观察特定元素呈现，应结合 Element Timing 等能力的支持范围，或将业务埋点定义为可重现的近似口径并明确误差。

## 8. Performance API 与 web-vitals 将四段诊断落到可采集证据

### 【先区分浏览器原始 Entry 和已经计算的四阶段字段】

浏览器提供的是原始 Performance Timing 数据，而不是名为 Resource Load Delay、Element Render Delay 的四个独立原生指标。

| 需要的数据 | 主要来源 | 诊断用途 |
| --- | --- | --- |
| 主 HTML 导航时间 | PerformanceNavigationTiming | TTFB、重定向、连接与文档请求时序 |
| LCP 最终候选的元素与时间 | LargestContentfulPaint / web-vitals LCP | 识别主要内容绘制结果 |
| 对应 LCP 资源时序 | PerformanceResourceTiming | 资源起点、终点、字节数、缓存、请求阶段 |
| 四段统一归因值 | web-vitals/attribution | 已计算的 TTFB、Load Delay、Load Duration、Render Delay |
| 页面执行与绘制诊断 | Chrome Performance Trace、Long Task、LoAF | 分析 JS 和浏览器渲染等待 |
| 业务数据与组件显示节点 | User Timing、业务事件与服务端 Trace | 补足 API 和组件关键路径证据 |

web-vitals attribution build 的 LCPAttribution 包含：

- timeToFirstByte：主文档首字节阶段；
- resourceLoadDelay：关键资源开始加载前的等待；
- resourceLoadDuration：关键资源加载持续时间；
- elementRenderDelay：关键元素渲染等待；
- target：目标元素选择器/描述；
- url：相关 LCP 图片资源 URL（如果有）；
- navigationEntry、lcpResourceEntry、lcpEntry：可选的原始归因 Entry。

这套字段定义来自 GoogleChrome/web-vitals 官方 README 的 Attribution 接口，不应将 LCPEntry 与 ResourceEntry 混为同一个对象。[[3]](https://github.com/GoogleChrome/web-vitals)

### 【推荐最小接入示例：使用官方归因库】

~~~ts
import { onLCP } from 'web-vitals/attribution';

// 这是通用示例，不代表某个项目已有的 SDK 源码。
// 真实上报时还需采样、脱敏、路由归属、数据有效性和队列控制。
onLCP((metric) => {
  const a = metric.attribution;

  const sample = {
    metric: 'LCP',
    value: metric.value,
    metricId: metric.id,

    phases: {
      ttfb: a.timeToFirstByte,
      resourceLoadDelay: a.resourceLoadDelay,
      resourceLoadDuration: a.resourceLoadDuration,
      elementRenderDelay: a.elementRenderDelay,
    },

    target: a.target,
    resourceUrl: a.url,
    // 实际上报前需要标准化和脱敏，不应直接序列化 DOM 对象。
  };

  console.log(sample);
});
~~~

这段代码证明：LCP 可以作为一个结果值上报，四个阶段可以作为同一个 LCP Sample 的诊断维度。它**不证明**网络上报端、Session 关联或服务器聚合已经接通。

对于通常只需要最终值的 RUM，不应默认将所有中间 LCP 候选上报成独立访问；如果打开 reportAllChanges，需要按 Metric ID 和终态处理更新，避免重复计数。采集版本和浏览器支持能力应记录在平台元信息中。[[3]](https://github.com/GoogleChrome/web-vitals)

### 【原生 API 示意：原始记录可获取，但生产计算不能机械相减】

~~~js
const navigation = performance.getEntriesByType('navigation')[0];

if (navigation) {
  const ttfb = navigation.responseStart - navigation.startTime;
  console.log('主 HTML TTFB', ttfb);
}

const resources = performance.getEntriesByType('resource');
console.log('已记录资源数量', resources.length);

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('LCP 候选', entry.startTime, entry.url, entry.element);
  }
});

observer.observe({
  type: 'largest-contentful-paint',
  buffered: true,
});
~~~

这一段只演示三类原始证据的位置：主文档 Navigation、资源 Timing、LCP 候选。还不构成完整的正确 LCP 归因实现。原因包括：

1. LCP 候选可能变化，最终 LCP 需按浏览器和库的生命周期规则确定。
2. 图片可能是 CSS background，Resource Timing 可能存在同 URL 多次请求、重定向、预加载或资源复用，不宜只按 URL 做第一个匹配。
3. 无独立资源的文本 LCP，两段 Resource 时间按定义为 0。
4. Resource startTime / fetchStart / responseEnd 的具体口径与重定向不同，不能混搭产生负数或重复计算。
5. 跨源资源可能缺少 Timing-Allow-Origin，部分详细网络时间与大小不可见或返回 0；不能无条件把 transferSize=0 当缓存命中。[[6]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming) [[8]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize)
6. 软导航不应拿原文档 NavigationTiming 的 TTFB 和新路由 LCP 混用。

为采集初始化之前产生的记录，PerformanceObserver 可以使用 observe({type: '...', buffered: true})；buffered 必须与单个 type 搭配，不能和 entryTypes 混写；缓冲区有容量限制，采集时间较晚不意味着能完整恢复所有历史 Entry。[[13]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)

### 【TTFB 还能进一步拆分，但 Waiting Duration 不是第四个 LCP 阶段】

当第一阶段 TTFB 明显异常时，可进一步使用 Navigation Timing 或 web-vitals 的 TTFB Attribution：

~~~text
一级：LCP 四阶段
├─ TTFB
│   ├─ waitingDuration：请求处理开始前的等待
│   ├─ cacheDuration：缓存检查阶段
│   ├─ dnsDuration：域名解析
│   ├─ connectionDuration：连接建立
│   └─ requestDuration：请求至首字节的阶段
├─ Resource Load Delay
├─ Resource Load Duration
└─ Element Render Delay
~~~

waitingDuration、cacheDuration 等名字来自 TTFBAttribution，属于 TTFB 的二级拆解，不是与 Element Render Delay 并列的另一种一级 LCP 阶段。不同版本的字段命名可能变化，例如 web-vitals v4 对一些 Attribution 字段做过重命名，使用前按实际依赖版本核对。[[3]](https://github.com/GoogleChrome/web-vitals)

## 9. 线上 RUM 必须使结果指标、阶段归因与诊断证据属于同一次访问

### 【Context 的职责是建立归属，而不是在异常以后才临时补齐】

建议将结果和诊断数据关联到统一的页面访问上下文：

~~~text
App / Environment
    ↓
Release Version / Build
    ↓
Navigation Type（硬导航或软导航）
    ↓
Route / View ID
    ↓
Session / Navigation ID
    ↓
设备、浏览器、网络、地区
    ↓
Metric Timestamp / Resource Timestamp
~~~

这样可以从某个 LCP 异常样本反查同一 View 的资源、接口、脚本和渲染证据。

一个通用的示意数据结构：

~~~json
{
  "type": "performance",
  "name": "LCP",
  "value": 3200,
  "unit": "ms",
  "navigationType": "navigate",
  "context": {
    "route": "/dashboard",
    "version": "2.4.1",
    "deviceClass": "mobile",
    "viewId": "view-demo-1",
    "sessionId": "session-demo-1"
  },
  "attribution": {
    "timeToFirstByte": 350,
    "resourceLoadDelay": 1200,
    "resourceLoadDuration": 500,
    "elementRenderDelay": 1150
  }
}
~~~

这里只是事件结构示意，并非某个 Browser Monitor 项目的已实现协议。生产设计还需处理隐私脱敏：不要把用户 Token、查询参数中的敏感信息、完整 DOM 或未授权内容直接作为监控字段上传。

### 【聚合结果与单次诊断不能混淆】

线上评价可以对每个真实页面访问形成一个有效的 LCP 值，再按 Version、Route、Device 和 Network 分群，计算 P50、P75、P95、样本数与趋势。Core Web Vitals 的主要评价口径是 P75；P95 主要作为尾部体验的补充，不应以一次本机点击代替真实用户分布。[[1]](https://web.dev/articles/lcp)

需要注意数学关系：

~~~text
单次访问成立：
LCP_i = TTFB_i + LoadDelay_i + LoadDuration_i + RenderDelay_i

但分位数通常不满足：
P75(LCP) ≠ P75(TTFB) + P75(LoadDelay)
          + P75(LoadDuration) + P75(RenderDelay)
~~~

因此如果展示“一个页面 LCP P75 的四阶段组成”，应该明确定义做法：例如选择接近该群体 LCP P75 的代表性真实样本，再展示该样本四段；或者直接分别显示四段的分布与版本变化，并标明这些分位数不能直接相加。不能把各阶段的 P75 生硬拼成一条总时长。

线上需要同时监控样本量、采样率、上报缺失率、浏览器支持和发布前后流量构成；否则“某版本 P75 变坏”可能混入设备结构变化、弱网用户比例变化或采集口径改变。页面性能观测只是关联证据，确认实际根因还需受控实验。[[14]](https://web.dev/articles/vitals-field-measurement-best-practices)

## 10. LCP 诊断决策树应从异常阶段导向具体优化类别

### 【从四阶段选方向，而不是从优化技术反推问题】

~~~text
发现 LCP 性能回归
    ↓
确认比较对象一致
Route / Version / Device / Network / Navigation Type
    ↓
拆分代表性样本的 LCP 四阶段
    ↓
哪一段相对基线新增的耗时最大？
    │
    ├─ TTFB
    │    → 导航、网络、服务端与 HTML 缓存
    │    → Navigation / Server-Timing / Backend Trace
    │
    ├─ Resource Load Delay
    │    → 资源发现、调度优先级、前置依赖
    │    → 初始 HTML / Initiator / Network Waterfall
    │
    ├─ Resource Load Duration
    │    → 资源体积、请求响应、传输、竞争、缓存
    │    → Resource Timing / Size / Priority / Cache
    │
    └─ Element Render Delay
         → DOM 显示条件、CSS/JS 阻塞、主线程与绘制
         → Performance Trace / DOM / Long Task / Rendering
    ↓
只改变一个有根据的因素
    ↓
观察四个阶段以及最终 LCP 是否同步改善
    ↓
线上原分群比较 P75 / P95 / 样本数
~~~

一个“诊断现象 → 处理方向”映射：

| 可观察的异常组合 | 下一步优先检查 | 对应策略，不宜直接跳结论 |
| --- | --- | --- |
| TTFB 与服务端 Trace 同时高 | SSR、接口、数据库与缓存 | 缩短关键服务端依赖 |
| TTFB 高但服务端耗时正常 | 重定向、连接、CDN 路径 | 入口及网络交付治理 |
| HTML 到达早，LCP 图片请求开始晚 | 初始 HTML、JS 依赖、lazy、priority | 提前发现和调度首屏关键资源 |
| 图片开始早但耗时久、体积大 | 显示尺寸、压缩、实际网络吞吐 | 图片及资源内容治理 |
| 图片不大但加载久 | 服务器、连接、带宽竞争、缓存 | 资源分发与并发策略 |
| 图片很早下载完成，但 LCP 晚 | DOM 创建、隐藏、CSS、JS 长任务 | 页面呈现和主线程成本治理 |
| Resource Load 变短但 LCP 不变 | Render Delay 是否同步变长 | 找出最终阻塞显示的另一条件 |

### 【一次完整的演示：如何根据数据逐步缩小根因】

假设 /dashboard 的版本 2.4.1 上线后，Mobile 弱网样本的 LCP P75 从 1.8s 变为 3.5s。

以下是两条具有演示性质的、分别来自旧版与新版的代表性访问，**不是两组 P75 子指标的分解**：

| 耗时阶段 | 旧版样本 | 新版样本 | 新增耗时 |
| --- | ---: | ---: | ---: |
| TTFB | 350ms | 400ms | +50ms |
| Resource Load Delay | 150ms | 1350ms | +1200ms |
| Resource Load Duration | 400ms | 450ms | +50ms |
| Element Render Delay | 900ms | 1300ms | +400ms |
| **LCP** | **1800ms** | **3500ms** | **+1700ms** |

第一步：主要新增成本集中在 Resource Load Delay，因此先查资源发现，而不是先怀疑服务端或图片压缩。

第二步：在同场景 DevTools Waterfall 中查最终 LCP 图片的 Initiator。如果新版必须等待应用 JS 初始化和数据请求以后才创建图片 URL，则构成合理的候选解释。

第三步：调整关键资源发现方式，例如通过 SSR HTML 提前暴露主图；同条件测试资源开始加载时刻是否前移，观察最终 LCP 是否同步缩短。

第四步：新版的 Element Render Delay 也多了 400ms，继续排查关键 DOM 是否隐藏、CSS 是否阻塞、是否有新的主线程工作。这部分如果不处理，单独提前下载图片可能无法取得预期 LCP 收益。

第五步：发布以后按相同版本、路由、设备、网络与导航类型观察真实访问 P75、P95、样本数，并对比业务关键内容的显示或可用时间。

这条链最重要的是“指标异常 → 形成假设 → 找证据 → 改动验证 → 回归结果”，而不是按某个阶段的名称直接执行固定优化清单。

## 11. Loading 优化需要同时维护效果证据、风险边界和迭代口径

### 【Lab 和 Field 验证的是不同层面的结论】

Lab Verification（实验室验证）：控制设备、网络、CPU、缓存、数据、访问方式和操作步骤；通过 Chrome DevTools、Lighthouse、Trace 验证某项变更确实减少目标耗时。重点在**因果与可复现**。

Field Verification（线上真实用户验证）：发布后收集真实访问，按同样的分群对比整体 LCP P75 / P95 与受影响用户比例。重点在**真实用户是否最终受益**。

只看到新版本的 Lighthouse 分数提高，不足以证明线上用户体验改善；只看到线上 LCP 下降、却没有基线与实验，也无法确定一定是某次优化的因果作用。

### 【优化的负面影响也应进入验收】

- 把更多资源提前加载，可能增加带宽竞争和服务器压力。
- 把 JS 后移，可能改善 LCP，但让主要交互迟迟不可用。
- SSR 能更早输出内容，却可能增加请求时服务端处理与 TTFB。
- 过于激进的缓存可能带来内容过时，错误的共享缓存可能造成用户数据泄露。
- 提前移除占位或延后样式可能改善一个加载时点，却带来 CLS（布局偏移）。
- 业务“数据可用”与“元素可见”是不同条件，要分别验证。
- 监控 SDK 本身要控制额外 CPU、内存和上报量，不能为诊断而明显恶化页面表现。

因此 Loading 优化不能单指标孤立决策，需要保留交互、安全、稳定性与业务就绪作为横向约束。

### 【最终应沉淀成一套稳定、可迁移的诊断方法】

~~~text
LCP 发现异常
    ↓
排除导航类型、版本、设备与采集口径造成的误判
    ↓
按每次访问拆成 TTFB / Load Delay / Load Duration / Render Delay
    ↓
只进入异常成本对应的技术层
    ↓
原始 Timing / Trace / 业务事件支持候选解释
    ↓
同条件实验确认因果
    ↓
上线后比较 Field LCP 与业务关键内容指标
    ↓
更新性能预算与回归测试
~~~

这也解释了为什么 LCP 四阶段的技术分类有助于避免术语堆积：图片压缩属于资源体积治理；Preload 与首屏图片的正确加载优先级属于资源发现和调度；SSR / CSR 属于关键内容生成位置的架构选择；任务拆分和代码延迟执行属于 JS 关键路径治理；浏览器 Style / Layout / Paint 优化属于最终呈现成本治理。**同一技术可能影响多个阶段，但每一次应用都必须明确对应的具体等待成本、证据与代价。**

## 12. 与现有知识正文的关系

本稿仅作为 Loading / LCP 专项讨论记录，**不直接进入正式知识索引，也不新建 QA 记录**。现有正式主入口保持不变：

- [Web 性能优化完整知识体系](../W-Web性能优化完整知识体系.md)：Web 性能整体用户体验、从文档交付到连续渲染的技术主线。
- [性能专项优化](../X-性能专项优化.md)：性能数据自动采集、结果指标、原始 Performance Entry、标准化和 RUM。
- [Web 渲染架构](../W-Web渲染架构.md)：CSR / SSR / SSG / Hybrid 的内容生成策略与取舍。
- [服务端渲染完整链路](../F-服务端渲染完整链路.md)：服务端生成与浏览器 Hydration 的具体过程。
- [CDN 缓存与浏览器缓存](../C-CDN缓存与浏览器缓存笔记.md)：缓存与网络复用机制。
- [浏览器主线程、Event Loop 与任务调度](../B-浏览器主线程Event Loop与任务调度完整知识体系.md)：主线程阻塞与任务调度。
- [浏览器渲染原理](../J-基于Chrome浏览器渲染原理.md)：Style、Layout、Paint 和 Composite 过程。

当前草稿整理完成后，正式并入知识体系时应优先检查可合并到上述既有主文档的部分，避免同一知识出现两个独立主入口。

## 13. 参考文献

1. Google / web.dev. [Largest Contentful Paint (LCP)](https://web.dev/articles/lcp). Core Web Vitals 的 LCP 含义、阈值与测量边界。
2. Google / web.dev. [Optimize Largest Contentful Paint](https://web.dev/articles/optimize-lcp). LCP 四阶段、加载发现、资源获取与最终绘制归因。
3. GoogleChrome. [web-vitals README / Attribution API](https://github.com/GoogleChrome/web-vitals). LCP Attribution、TTFB Attribution、软导航与版本口径。
4. MDN. [PerformanceNavigationTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming). 主文档导航计时与字段。
5. MDN. [PerformanceResourceTiming.serverTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/serverTiming). 服务端计时信息的浏览器入口。
6. MDN. [PerformanceResourceTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming). 资源时序、大小和跨源限制。
7. MDN. [PerformanceResourceTiming.fetchStart](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/fetchStart). 资源获取起点与 startTime 的区别。
8. MDN. [PerformanceResourceTiming.transferSize](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize). 字节数、缓存和跨源限制。
9. Nuxt. [ClientOnly](https://nuxt.com/docs/4.x/api/components/client-only). 客户端专用组件与服务端 fallback。
10. Google / web.dev. [Common misconceptions about optimizing LCP](https://web.dev/blog/common-misconceptions-lcp). 图片下载并非唯一瓶颈与阶段成本转移。
11. Chrome for Developers. [Measuring soft navigations](https://developer.chrome.com/docs/web-platform/soft-navigations). Chrome 151 以后的 SPA 软导航测量。
12. Google / web.dev. [User-centric performance metrics](https://web.dev/articles/user-centric-performance-metrics). 用户体验维度与 FCP、LCP 的含义。
13. MDN. [PerformanceObserver.observe](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe). Buffered 与观察器配置。
14. Google / web.dev. [Web Vitals field measurement best practices](https://web.dev/articles/vitals-field-measurement-best-practices). 线上真实用户采集、分群、归因与验证。
