# Web 页面渲染架构从导航模型到生成、缓存与 Hybrid 形成完整体系

Web 页面渲染不能只背 MPA、SPA、CSR、SSR、SSG、SWR、ISR、Hybrid 一组名词。它们回答的是不同层次的问题：

~~~text
Web 应用的页面交付体系
│
├─ 导航模型：页面怎样切换
│  ├─ MPA：每次跳转进入新的文档请求
│  └─ SPA：保留当前文档，由客户端路由切换页面
│
├─ 页面生成：主要内容在哪里、什么时候生成
│  ├─ CSR：浏览器运行时生成
│  ├─ SSR：请求到达服务端后生成
│  └─ SSG / Prerender：构建阶段提前生成
│
├─ 结果复用与更新：已经生成的页面怎样缓存、何时刷新
│  ├─ 静态长期复用
│  ├─ TTL：在有效期内复用缓存
│  ├─ SWR：过期结果先返回，后台重新生成
│  └─ ISR：部署后按条件增量更新静态结果
│
└─ Hybrid Rendering（混合渲染）
   └─ 按不同页面的需求组合上述策略
~~~

因此最重要的边界是：

~~~text
导航方式与生成方式不是同一维度：
MPA（多页面导航） ≠ SSR（服务端生成）
SPA（单页导航）   ≠ CSR（客户端生成）

页面生成方式与结果更新方式也不是同一维度：
CSR / SSR / SSG    ≠    SWR / ISR
~~~

MPA / SPA 描述导航模型；CSR / SSR / SSG 主要描述页面生成位置与时间；SWR / ISR 更接近生成结果的缓存与再生成策略；Hybrid Rendering 再把这些能力按 Route 或场景组合起来。

本文负责建立完整的页面渲染架构与选型框架。SSR 从 Document Request 到 Payload、Hydration、Client Runtime 的内部细节继续进入 [服务端渲染完整链路](./F-服务端渲染完整链路.md)。

## 1. Web 应用首先要把“页面怎样切换”和“页面怎样生成”分开

### 【Navigation Model 回答页面怎样切换】

导航模型关注一次页面切换是否进入新的 Document 生命周期：

~~~text
页面导航
│
├─ 新文档导航
│  └─ 浏览器重新请求一个 HTML Document（HTML 文档）
│
└─ 客户端导航
   └─ 保留当前 HTML Document
      由 JavaScript 更新 URL、应用状态和页面内容
~~~

MPA（Multi-Page Application，多页面应用）更接近前者；SPA（Single-Page Application，单页应用）更接近后者。

### 【MPA 的核心是新的 Document Navigation，不是“必须 SSR”】

典型 MPA 导航：

~~~text
页面 A
↓
用户触发跳转
↓
浏览器发起新的 HTTP 请求
↓
服务器返回新的 HTML 文档
↓
浏览器重新解析并显示
↓
页面 B
~~~

这个新 Document 可以来自：

~~~text
新的 HTML 文档可以来自：
├─ 请求时服务端生成（SSR）
├─ 已存在的静态 HTML
└─ 构建阶段提前生成（SSG / Prerender）
~~~

所以：

~~~text
MPA 只说明“跳转时创建新文档”
≠
SSR 所说明的“HTML 在请求时由服务端生成”
~~~

新的 Document Navigation 也不代表 CSS、JavaScript、Font、Image 都一定重新下载。浏览器仍会根据 HTTP Cache、Memory Cache、Disk Cache、Service Worker 等决定是否复用资源。

~~~text
新的 HTML 文档
↓
浏览器发现 CSS / JavaScript / 图片等资源引用
↓
检查缓存是否仍可使用，必要时向服务器验证
↓
命中缓存 → 直接复用
未命中缓存 → 发起网络下载
~~~

因此：

~~~text
页面再次引用某个资源
≠
浏览器一定重新下载这个资源
~~~

缓存机制继续参考 [CDN缓存与浏览器缓存笔记](./C-CDN缓存与浏览器缓存笔记.md)。

### 【SPA 的核心是在当前 Document 内完成导航】

SPA 在应用启动以后，主要导航由 Client Router 完成：

~~~text
当前 HTML 文档保持不变
↓
用户触发站内跳转
↓
History API / Hash 修改地址状态
↓
客户端路由判断目标页面
↓
按需加载页面数据和代码
↓
更新组件树与 DOM
~~~

“单页”描述的是 Document 生命周期，不代表视觉上只有一个界面，也不代表导航过程中没有网络请求。SPA 后续导航仍可能加载：

~~~text
SPA 导航仍可能继续请求：
├─ API 数据
├─ 动态加载的 JavaScript 代码块
├─ 当前路由需要的 CSS
├─ 图片 / 字体
└─ 其他延迟加载资源
~~~

真正的区别是：

~~~text
MPA 导航
→ 创建新的 HTML 文档生命周期

SPA 导航
→ 保留当前文档，在客户端更新路由状态和页面内容
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
浏览器请求页面
↓
先获得基础 HTML / 应用外壳
↓
下载、解析并执行客户端 JavaScript
↓
按需要继续请求页面数据
↓
客户端框架生成组件结构并更新 DOM
↓
浏览器完成布局与绘制
↓
用户看到主要页面内容
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
浏览器请求页面
↓
服务端匹配路由并准备首屏数据
↓
服务端执行组件，生成页面 HTML
↓
返回 HTML + 客户端恢复所需的初始状态
↓
浏览器先解析并显示已有内容
↓
客户端 JavaScript 启动
↓
Hydration（水合）：把运行关系接回已有 DOM
↓
页面进入完整可交互状态
~~~

SSR 可以让主要内容直接进入初始 HTML Response，但不代表：

~~~text
SSR 只能说明“首屏 HTML 在请求时由服务端生成”
不能直接推出：
├─ 页面性能一定更好
├─ SEO 一定更好
└─ 浏览器不再需要客户端 JavaScript
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
构建阶段
↓
读取组件和构建时能够确定的数据
↓
提前生成 HTML
↓
保存为可部署的静态页面产物
↓
发布到服务器 / CDN
↓
用户请求页面
↓
直接返回已经生成好的 HTML
~~~

SSR 与 SSG 都可能给浏览器完整 HTML，但区别在于：

~~~text
SSR
→ 用户请求到来后再生成 HTML

SSG / Prerender
→ 部署前的构建阶段提前生成 HTML
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
客户端渲染（CSR）
→ 服务端按请求生成（SSR）
→ 构建阶段提前生成（SSG）
~~~


当成真实年代演进。

更有价值的是从现代 JavaScript Application 的问题演进理解：

~~~text
服务端直接返回页面内容
    ↓
前端交互越来越复杂
    ↓
SPA / CSR：更多界面生成工作移到浏览器
    ↓
问题：首屏越来越依赖 JavaScript 和客户端取数
    ↓
现代 SSR：把首次 HTML 生成重新移到服务端
    ↓
Hydration：浏览器继续恢复完整交互能力
    ↓
问题：每个请求重新生成页面会增加服务端计算
    ↓
SSG / Prerender：把稳定页面提前到构建阶段生成
    ↓
问题：静态页面更新不够及时
    ↓
SWR / ISR：在“复用旧结果”和“及时更新”之间折中
    ↓
问题：不同页面的数据和交互特征并不相同
    ↓
Hybrid Rendering：按页面分别选择策略
~~~

这里任何一步都没有完全淘汰前一步：

- CSR 仍适合强交互、私有后台和不强调初始索引的应用；
- SSR 仍适合必须在 Request Time 根据请求生成内容的页面；
- SSG 仍适合稳定公共内容；
- SWR / ISR 只适合能够共享并容忍一定旧内容的页面；
- Hybrid 只是把不同策略组合到同一个应用。

## 4. SWR 与 ISR 解决的是“生成结果怎样复用和更新”，而不是新的页面生成位置

页面已经生成以后，还会出现第二类问题：**这个结果可以复用多久，什么时候重新生成，更新期间用户拿旧结果还是等待新结果。**

这和“HTML 最初在哪里生成”是两个维度：

~~~text
页面生成
├─ 浏览器生成（CSR）
├─ 请求到来后由服务端生成（SSR）
└─ 构建阶段提前生成（SSG / Prerender）

生成结果的复用与更新
├─ 长期复用静态结果
├─ 按 TTL 过期
├─ 过期后先返回旧结果、后台更新（SWR）
└─ 部署后按页面继续生成或更新静态结果（ISR）
~~~

### 【传统 SSG 常以整次 Build 作为更新边界，但“全量重建”不是 SSG 的标准定义】

传统 SSG（Static Site Generation，静态站点生成）通常在一次构建中读取当时的数据，再生成一批静态页面：

~~~text
开始构建
↓
读取当前数据
↓
生成站点页面
↓
形成一套部署产物
↓
发布到服务器 / CDN
↓
后续请求直接读取这些结果
~~~

部署完成后，静态文件本身不会主动监听数据库或 CMS。源数据发生变化时，已经生成的 HTML 不会自动知道，因此经典工程流程往往重新进入：

~~~text
源数据变化
↓
重新执行站点 Build
↓
得到新一批静态产物
↓
重新部署
~~~

这就是“改了一篇文章，却可能触发一次整站 Build”的来源。

但要注意：

> SSG 本身只规定页面在请求前提前生成，并没有规定实现一定重新计算所有页面。

工程上可以自行构建 Partial Build（部分构建）、依赖图或只部署变化文件。ISR 的价值在于把“部署以后仍能按页面重新生成”变成框架直接提供的运行能力，而不是要求业务自己搭增量构建系统。

### 【SWR 关注缓存已经过期时，这次请求应该拿什么】

SWR（Stale-While-Revalidate，过期内容先返回并后台重新验证）首先是一种缓存语义。RFC 5861 允许缓存在 stale 窗口内先返回旧响应，同时异步重新验证，从而避免当前请求等待重新验证完成。[[2]](https://www.rfc-editor.org/rfc/rfc5861.html)

应用到页面响应时，可以理解为：

~~~text
没有缓存
↓
生成页面并建立缓存

缓存仍在有效期内
↓
直接返回当前结果

缓存已经过期
↓
当前请求先得到旧结果
↓
后台重新生成页面
↓
用新结果替换旧缓存
~~~

因此 SWR 回答的重点是：

> **页面已经需要更新时，是否允许当前用户继续使用旧结果，让更新过程在后台完成。**

它并不天然负责监听数据库有没有变化。

### 【ISR 关注静态结果在部署以后能否按页面继续生成和更新】

ISR（Incremental Static Regeneration，增量静态再生成）解决的是传统静态生成的另一个限制：页面发布后仍会变化，但不希望每次变化都重新构建整个站点。

更准确的“增量”含义是：

~~~text
某个页面达到重新生成条件
↓
重新生成这个页面对应的结果
↓
替换这个页面的静态 / CDN 缓存
↓
其他没有触发更新的页面继续复用原结果
~~~

这里“只更新需要的页面”**不表示框架会自动分析数据库依赖并找出所有受影响页面**。它通常表示：哪个 Route 被时间规则、请求、主动失效或框架 API 判定为需要重新生成，就重新生成这个 Route，而不是重新执行整个站点 Build。

ISR 不是统一的 Web 标准，不同框架和部署平台在触发条件、缓存位置、阻塞或后台更新方式上都可能不同。

### 【“源数据有没有变化”和“页面怎样重新生成”是两个独立问题】

SWR / ISR 经常被误解成会持续监听数据库。更准确的完整链路是：

~~~text
第一步：为什么认为页面可能需要更新？
├─ TTL 到期
├─ CMS Webhook / 业务事件
├─ 数据变更事件
├─ 手动失效 / Cache Purge
└─ 其他框架触发条件
        ↓
第二步：是否需要确认源数据真的变化？
├─ 不确认：直接重新生成
└─ 确认：比较 ETag / Last-Modified / Version 等
        ↓
第三步：页面进入重新生成
        ↓
第四步：新结果替换缓存
~~~

HTTP 缓存中的 ETag + If-None-Match、Last-Modified + If-Modified-Since 属于“重新验证资源是否变化”的机制；RFC 9111 对这些 Validator（验证器）和条件请求进行了定义。[[6]](https://www.rfc-editor.org/rfc/rfc9111.html)

所以几个概念的职责应该分开：

~~~text
变化发现 / 更新触发
→ TTL、Webhook、事件、主动失效

变化确认
→ ETag、Last-Modified、版本号、Hash

页面重新生成
→ 再执行页面的数据获取与渲染

更新期间怎样响应用户
→ 等待新结果
   或
→ SWR：先返回旧结果、后台更新
~~~

### 【Nuxt 中 SWR 与 ISR 行为高度接近，差异必须回到具体平台理解】

Nuxt 当前 Route Rules 可以配置 swr、isr、prerender 和 ssr:false。官方文档说明，swr 可以缓存完整响应，在 TTL 过期后先返回旧响应并后台重新生成；isr 具有相近的重新生成行为，并可以在支持的平台上使用 CDN Cache。[[3]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

因此不能简单记成：

~~~text
SWR
→ 后台更新

ISR
→ 单页更新
~~~

因为 SWR 同样可以只重新生成当前过期的 Route。更稳定的区分是：

| 维度 | SWR | ISR |
| --- | --- | --- |
| 出发点 | 缓存过期后怎样响应 | 静态结果如何在部署后继续更新 |
| 是否复用旧结果 | 是 | 取决于框架具体实现 |
| 是否可以按 Route 重新生成 | 可以 | 可以 |
| 是否要求重新 Build 全站 | 不需要 | 不需要 |
| 是否属于统一 Web 标准 | stale-while-revalidate 有 HTTP 缓存语义来源 | 否，属于框架 / 平台能力 |
| 在 Nuxt 中的主要差异 | Server / Reverse Proxy 缓存语义 | 支持平台可进一步使用 CDN Cache |

**项目实践映射：** official-network 当前新闻 Route 使用 swr: 86400，没有配置 ISR，也没有实现 WordPress 内容变化驱动的主动缓存失效。因此 WordPress 更新和页面缓存更新是两条不同链路。具体见 [新闻 SWR、Payload 与 WordPress 数据新鲜度](https://github.com/cxDlogver/official-network/blob/main/docs/页面渲染策略与Hybrid%20Rendering源码分析.md#4-新闻使用-swr-解决不能长期静态但也没必要每次都重新-ssr的矛盾)。

## 5. Hydration 把服务端或构建阶段生成的 HTML 接回客户端应用

现代 SSR / SSG 页面通常不是“HTML 返回就结束”。

~~~text
浏览器获得服务端或构建阶段生成的 HTML
↓
解析 HTML 并先显示已有内容
↓
加载客户端 JavaScript
↓
创建客户端应用
↓
恢复服务端传来的初始数据与状态
↓
Hydration（水合）：连接组件、状态、事件与已有 DOM
↓
页面进入完整可交互状态
↓
后续站内跳转可由客户端路由继续处理
~~~

Hydration（水合）表示客户端框架基于已有 HTML，重新建立组件、状态、事件与 DOM 的运行关系。

因此：

~~~text
页面内容已经可见
≠
客户端应用已经完全可交互
~~~

而且：

~~~text
Prerender 只表示 HTML 提前生成
≠
页面不再需要客户端 JavaScript
~~~

Prerender 只是把首屏 HTML 提前生成；如果页面仍需要 Vue / React 等客户端交互，浏览器仍会加载 Client JavaScript 并 Hydration。

### 【Hydration 后仍然可以继续 SPA Navigation】

SSR / SSG 与 SPA 并不冲突：

~~~text
首次进入页面
↓
通过 SSR 或 Prerender 获得完整 HTML
↓
Hydration 恢复客户端运行关系
↓
客户端应用持续运行
↓
后续站内跳转继续使用 SPA 客户端导航
~~~

所以：

~~~text
SPA 只说明“后续导航主要发生在当前文档内”
≠
CSR 所说明的“主要页面内容由浏览器生成”
~~~

一个应用可以首次请求使用 SSR 或 Prerender，同时在 Hydration 后由 Client Router 完成后续页面切换。

客户端导航也不能简单理解成“页面组件一定重新请求 API”。支持 Payload Extraction（页面数据提取）的框架可以在导航到目标 Route 时单独加载该页面已经生成的数据 Payload，再由 useFetch / useAsyncData 按稳定 Key 复用这些数据。Payload 的产生、存储、刷新后生命周期以及“页面 Route Payload”和“数据 API”之间的关系，继续进入 [服务端渲染完整链路](./F-服务端渲染完整链路.md#8-水合完成后应用从首次-document-请求切换为长期客户端运行)。

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
同一个 Web 应用
│
├─ 稳定公开页面
│  └─ 构建阶段提前生成（Prerender）
│
├─ 可容忍短时间旧内容的公共页面
│  └─ 缓存复用，过期后台更新（SWR）
│
├─ 必须按当前请求实时生成的页面
│  └─ 请求时服务端生成（SSR）
│
└─ 高度依赖浏览器、无需首屏服务端内容的页面
   └─ 浏览器生成（CSR）
~~~

Nuxt 官方把这一能力称为 Hybrid Rendering，并允许通过 Route Rules 为不同 Route 配置 `prerender`、`swr`、`isr`、`ssr:false` 等行为。[[3]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

### 【Route Strategy 与 Component Runtime Boundary 不是同一层】

Route 采用 Prerender 或 SSR，不代表页面里所有组件都必须 Server Render。

~~~text
页面级策略
→ 决定整个页面响应在什么时候生成、怎样缓存和复用

组件运行边界
→ 决定页面中的某一部分在服务端还是浏览器运行
~~~

例如一个 Prerender 页面内部仍然可以包含 ClientOnly 图表；一个 SSR 页面也可以把依赖 Canvas、WebGL、Observer 的局部能力推迟到 Client Runtime。

**项目实践映射：** official-network 首页 Route 使用 Prerender，但 Hero 使用 ClientOnly；新闻 Route 使用 SWR，但正文当前也因 Hydration Mismatch 风险使用 ClientOnly。对应分析见 [Route 级渲染策略和 Component 级 ClientOnly 是两条不同控制线](https://github.com/cxDlogver/official-network/blob/main/docs/页面渲染策略与Hybrid%20Rendering源码分析.md#5-route-级渲染策略和-component-级-clientonly-是两条不同控制线)。

### 【Edge Rendering 主要改变部署位置，不是独立生成模型】

Nuxt 当前文档特别说明 Edge-Side Rendering 更接近 Deployment Target（部署目标），而不是独立 Rendering Mode。[[3]](https://nuxt.com/docs/4.x/guide/concepts/rendering)

因此：

~~~text
SSR
→ 回答“用户请求到来时，是否由服务端生成 HTML”

Edge Rendering
→ 回答“执行这段服务端渲染逻辑的服务器部署在哪里”
~~~

## 7. 选择渲染策略时先判断数据归属和新鲜度，再判断性能与 SEO

“SEO 好就 SSR、后台就 CSR”只能作为粗略经验。更稳定的判断顺序是：

### 【第一步：页面是否可以被多个用户安全复用】

~~~text
页面是否包含当前用户私有数据或请求级数据？
        │
        ├─ 是
        │   └─ 不应把整页结果作为公共缓存共享
        │      → 考虑请求时服务端生成，或浏览器单独请求私有数据
        │
        └─ 否
            → 可以继续判断是否适合提前生成或共享缓存
~~~

Account、Order、权限页面通常不能把某个用户生成的完整 HTML 直接变成公共 SWR Cache。

### 【第二步：内容是否能在请求前确定】

~~~text
用户请求到来之前
能否确定页面主要内容？
        │
        ├─ 不能
        │   └─ 需要在请求时服务端生成，或交给浏览器获取并生成
        │
        └─ 能
            └─ 可以考虑构建阶段提前生成（SSG / Prerender）
~~~

### 【第三步：先判断内容生命周期是否与部署生命周期一致】

对于 Prerender / SSG，真正关键的不只是“内容变化频率低”，而是内容是否只能随着网站重新构建而变化。

~~~text
内容是否与代码 / 仓库一起发布？
        │
        ├─ 是
        │   └─ 内容更新通常伴随重新 Build / Deploy
        │      → 很适合 Prerender / SSG
        │
        └─ 否
            ↓
内容是否能在部署以后独立变化？
        │
        ├─ 否
        │   └─ 仍可以考虑 Prerender
        │
        └─ 是
            └─ 需要继续判断数据新鲜度要求
~~~

Prerender 产物本身不会因为时间过去而自动重新生成。即使 CDN 或浏览器缓存过期，也只会重新读取当前源站已有的静态产物；如果源站没有重新构建，页面内容仍然不会变化。

所以：

~~~text
HTTP / CDN Cache TTL
控制：
“多久重新向源站取一次已有结果”

Prerender / SSG 重新生成
控制：
“源站上的页面结果什么时候真正变成新版本”
~~~

二者不能混为一谈。

### 【第四步：内容更新频率和可容忍陈旧时间决定是否需要再生成机制】

~~~text
内容能在部署后独立变化？
        │
        ├─ 否
        │   └─ Prerender / SSG 可以长期复用
        │
        └─ 是
            ↓
是否可以容忍一小段时间的旧内容？
        │
        ├─ 是
        │   └─ 使用 SWR / ISR 等缓存与再生成策略
        │
        └─ 否
            └─ 请求时生成、主动失效或客户端实时取数
~~~

### 【第五步：再判断核心内容对 Client JavaScript 的依赖】

如果页面高度私有、登录后长期使用、主要价值来自复杂交互，而且不强调初始公开 HTML，那么 CSR 可以减少 SSR 约束。

如果核心公开内容希望在 Initial HTML 中直接出现，则 SSR、SSG、Prerender 或 Cached HTML 通常更直接。

但性能和 SEO 都不能只由模式名决定。

## 8. 渲染策略影响性能与 SEO，但本质是重新分配成本

不同策略只是把计算放在不同阶段：

~~~text
CSR
→ 把主要页面生成成本放在浏览器运行阶段

SSR
→ 把首屏 HTML 生成成本放在用户请求阶段
→ 浏览器仍需 Hydration 恢复交互

SSG / Prerender
→ 把页面生成成本提前到构建阶段
→ 用户请求时直接分发现有结果

SWR / ISR
→ 尽量复用已经生成的结果
→ 只在满足更新条件时重新生成
~~~

最终性能仍由多条链共同决定：

~~~text
最终页面性能还取决于：
├─ 服务端响应耗时
├─ 网络传输
├─ 缓存命中率
├─ HTML 大小
├─ 首屏关键 CSS
├─ 图片 / 字体 / JavaScript 等资源体积
├─ 客户端 JavaScript 执行成本
├─ Hydration（水合）成本
├─ 页面数据请求
└─ 浏览器布局、绘制与合成
~~~

浏览器收到 HTML / CSS / JavaScript 后如何进入 DOM、Style、Layout、Paint、Raster 与 Composite，继续参考 [基于Chrome浏览器渲染原理](./J-基于Chrome浏览器渲染原理.md)。

### 【CSR 不等于搜索引擎一定无法获得页面内容】

早期常见表述：

~~~text
错误的简单推论：
CSR
↓
初始 HTML 中缺少主要内容
↓
搜索引擎一定无法获得页面内容
~~~

不能作为一般事实。

Google Search 官方说明 JavaScript 页面会经过 Crawling、Rendering 和 Indexing，并可通过 Web Rendering Service 执行 JavaScript。[[4]](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

更准确的风险链是：

~~~text
更准确的风险链：
CSR
↓
关键内容依赖 JavaScript 执行后生成
↓
搜索引擎需要额外完成 JavaScript 渲染
↓
如果脚本失败、资源失败、渲染延迟
或搜索引擎渲染能力受限
↓
页面发现和索引可能受到影响
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
页面导航方式
MPA：新文档导航 / SPA：客户端导航
    ↓
页面主要内容在哪里、什么时候生成
CSR：浏览器 / SSR：请求时服务端 / SSG：构建阶段
    ↓
已经生成的结果怎样复用和更新
普通缓存 / SWR / ISR
    ↓
不同页面按自身需求组合策略
Hybrid Rendering（混合渲染）
    ↓
浏览器获得 HTML、初始状态和客户端 JavaScript
    ↓
解析已有内容并完成 Hydration（水合）
    ↓
继续布局、绘制、交互和客户端导航
    ↓
最终体现为性能、SEO 与运行成本差异
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
6. [RFC 9111 - HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
