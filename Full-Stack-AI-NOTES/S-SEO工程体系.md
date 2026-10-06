# SEO 工程从页面发现、抓取、索引到搜索表现形成完整体系

SEO（Search Engine Optimization，搜索引擎优化）不应被理解成“给页面补 Title、Description 和关键词”，而应被理解成一条持续运行的工程链：**先让重要 URL 能被发现和访问，再让搜索引擎正确抓取、渲染、规范化和理解页面，最后用真实搜索数据验证页面是否被正确收录、展示并持续获得有效搜索流量。**

本文建立的是通用 SEO 工程主框架。Nuxt、Next.js、传统服务端模板或静态站点只是不同的实现载体；[Web 渲染架构](./W-Web渲染架构.md) 继续负责 CSR / SSR / SSG / SWR / Hybrid 的生成机制，本文只讨论这些机制如何影响搜索系统获取页面。

SEO 工程可以沿一条主线理解：

~~~text
页面与 URL 产生
        ↓
发现（Discovery）
搜索引擎是否知道这个 URL 存在
        ↓
抓取（Crawling）
爬虫是否允许访问，HTTP 响应是否正常
        ↓
渲染（Rendering）
需要时执行 JavaScript，得到最终可理解页面
        ↓
索引与规范化（Indexing / Canonicalization）
页面是否允许进入索引，哪个 URL 代表这份内容
        ↓
内容理解与搜索展示（Understanding / Search Appearance）
标题、正文、链接、图片和结构化数据表达了什么
        ↓
排序与呈现（Ranking / Serving）
搜索系统结合相关性、内容质量、体验和其他信号决定是否展示
        ↓
验证与反馈（Measurement / Feedback）
Search Console、日志、分析与自动审计持续发现问题
        └──────────────────────────────→ 回到页面与工程治理
~~~

这条主线必须和另一条横切线同时存在：

~~~text
贯穿全过程的工程约束
├─ 页面渲染与内容一致性
├─ 性能与 Core Web Vitals
├─ 移动端与可访问性
├─ 内容质量与搜索意图
├─ URL / 内容生命周期
└─ 发布验证与回归监控
~~~

Google Search Essentials 将“技术要求、垃圾内容政策和关键最佳实践”作为进入 Google Search 的基础，并明确说明满足要求并不保证一定抓取、索引或排名。[[1]](https://developers.google.com/search/docs/essentials)

## 1. SEO 工程首先解决页面能否进入搜索系统，再讨论排名

### 【SEO 工程不能直接“控制排名”，但可以控制页面进入搜索系统的基础条件】

搜索结果并不是浏览器请求页面以后立即产生。对工程侧来说，最先应该回答的不是“关键词放几次”，而是：

~~~text
这个 URL 能否被发现？
↓
Googlebot 是否能访问？
↓
是否返回正确 HTTP 状态？
↓
页面是否允许进入索引？
↓
搜索引擎能否获得主要内容？
↓
是否存在重复 URL，需要选规范版本？
↓
页面主题、实体和链接关系是否清楚？
↓
上线以后实际是否被抓取、索引和展示？
~~~

Google 对进入 Search 的最低技术要求可以归纳为：Googlebot 没有被阻止、页面返回成功的 HTTP 状态、页面拥有可索引内容。即使满足这些要求，也只是具备资格，不代表一定会被索引。[[2]](https://developers.google.com/search/docs/essentials/technical)

因此 SEO 工程最好分成三个目标层：

| 目标层 | 解决的问题 | 典型工程能力 |
| --- | --- | --- |
| Eligibility（进入资格） | 搜索引擎能否访问并考虑这个页面 | HTTP 状态、robots、noindex、可访问页面 |
| Understanding（正确理解） | 哪个 URL 是主版本，页面讲什么，实体是什么 | canonical、Title、正文语义、链接、结构化数据 |
| Performance（搜索表现） | 页面最终是否获得展示、点击和有效流量 | 内容质量、相关性、体验、Search Console 数据、持续迭代 |

Lighthouse 主要覆盖第一层和第二层中的**少量可自动检测技术条件**，而不是第三层完整结果。

**项目实践映射：** official-network 如何把 Route、Hybrid Rendering、Meta、Canonical、Sitemap 和 JSON-LD 串成一条工程链，见 [official-network SEO 工程体系源码分析](https://github.com/cxDlogver/official-network/blob/main/docs/SEO工程体系源码分析.md)。

## 2. URL 发现与抓取层先让重要页面可达，再控制爬虫访问

上一层确定“页面必须先进入搜索系统”，这一层继续解决两个问题：**搜索引擎怎样知道 URL 存在，以及知道后是否能够访问。**

### 【Internal Link 和 Sitemap 都能帮助发现 URL，但表达的信息不同】

一个重要页面最好能够从站内其他可发现页面通过真实链接到达。Google 的开发者 SEO 指南明确建议使用带 href 的 a 元素，并让每个重要页面至少能从另一个可发现页面通过链接到达。[[14]](https://developers.google.com/search/docs/fundamentals/get-started-developers)

例如：

~~~html
<a href="/product/a">产品 A</a>
~~~

这里要区分两个问题：

~~~text
问题一：
搜索引擎知不知道 /product/a 这个 URL 存在？

问题二：
搜索引擎能不能从当前页面识别出
“当前页面链接到了 /product/a”这条关系？
~~~

Sitemap、外部链接、历史抓取记录、其他页面链接，都可能让搜索引擎发现某个 URL，所以不能说“只有 <a> 才能让搜索引擎知道 URL”。

但如果工程目标是稳定表达页面之间的 Internal Link（站内链接）关系，最可靠的形式仍然是：

~~~html
<a href="/news/123">新闻详情</a>
~~~

而不是：

~~~html
<article onclick="go('/news/123')">...</article>

<button onclick="go('/news/123')">...</button>
~~~

后两种依赖 JavaScript 行为才能知道目标地址，不能等同于标准可抓取链接。

因此：

~~~text
Sitemap
→ 告诉搜索引擎：
“这些 URL 存在，希望你发现它们”

<a href>
→ 告诉搜索引擎：
“当前页面明确链接到了这个 URL”
→ 同时形成站内链接图和 Anchor Text（锚文本）语义
~~~

两者互补，但不能互相完全替代。

### 【SPA 路由不妨碍使用标准链接】

在 Vue / Nuxt 中不需要为了 SEO 放弃客户端路由。

例如：

~~~vue
<NuxtLink to="/news/123">
  新闻详情
</NuxtLink>
~~~

最终会渲染为标准 Anchor：

~~~html
<a href="/news/123">新闻详情</a>
~~~

同时浏览器点击后仍然可以由 Nuxt Router 拦截并完成 SPA Client Navigation。

因此理想关系是：

~~~text
HTML 层
→ <a href>
→ 搜索引擎能够识别链接

客户端运行时
→ Router 拦截点击
→ 保留 SPA 导航体验
~~~

### 【robots.txt 不是 SEO 必配项，没有限制需求时可以不配置复杂规则】

robots.txt 属于 Robots Exclusion Protocol（爬虫访问规则），主要回答：

> 某类爬虫是否允许请求这个 URL？

如果网站没有任何需要限制抓取的公开路径，就没有必要为了“做 SEO”强行增加复杂 Disallow。

可以理解为：

~~~text
没有特殊 robots 规则
→ 默认允许正常抓取

有需要限制的路径
→ robots.txt 再配置 Disallow
~~~

工程上仍可以保留一个简单 robots.txt，用于显式表达默认允许策略，并声明 Sitemap：

~~~text
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
~~~

这里的 Allow: / 不是“开启 SEO”的开关，而只是显式表达规则。

### 【robots.txt 控制抓取，noindex 控制索引，两者职责不能混用】

robots.txt：

~~~text
Crawl Control（抓取控制）
→ 爬虫能不能请求这个 URL
~~~

noindex：

~~~text
Index Control（索引控制）
→ 页面被访问以后，能不能进入搜索索引
~~~

Google 明确指出：如果 URL 被 robots.txt 阻止，Google 可能无法看到页面中的 noindex；被阻止抓取的 URL 仍可能基于其他信号出现在搜索结果中。[[4]](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

因此：

~~~text
页面公开可访问
但不希望出现在搜索结果
→ 允许抓取 + noindex

页面本身就不应该公开
→ Authentication / Authorization

只是希望减少某些爬虫抓取
→ robots.txt
~~~

不能把 robots.txt 当成“禁止收录”或“保护私密内容”的替代品。

### 【HTTP 状态码是页面生命周期的一部分，不只是后端细节】

搜索引擎需要通过 HTTP 状态理解页面是否真实存在：

~~~text
200
→ 当前 URL 有可用页面

3xx
→ 资源已经迁移到其他 URL

404 / 410
→ 页面已经不存在

持续返回 200 的“未找到页面”
→ 可能形成 Soft 404（软 404）
~~~

因此 SEO 工程应把删除、迁移、下架和合并页面纳入发布流程，而不是所有异常都渲染一个“找不到”组件后仍返回 200。

**项目实践映射：** official-network 当前 News / Jobs 的点击导航、Sitemap 和 /develop 抓取 / 索引策略，见 [SEO 工程体系源码分析](https://github.com/cxDlogver/official-network/blob/main/docs/SEO工程体系源码分析.md)。

## 3. 索引与规范化层决定“哪个 URL 进入索引、哪个 URL 代表这份内容”

页面能被访问以后，还要继续区分两个问题：

~~~text
这个页面要不要进入搜索索引？
→ noindex

如果多个 URL 内容重复或高度相似，
哪个 URL 应作为主版本？
→ Canonical
~~~

### 【Canonical 表示“规范 URL / 主版本 URL”】

Canonical（规范 URL）用于告诉搜索引擎：

> 多个相同或高度相似的 URL 中，我希望哪一个 URL 代表这份内容。

例如同一个新闻列表可能出现：

~~~text
/news
/news?category=AI
/news?year=2026
/news?search=agent
~~~

如果这些 Query 只是筛选状态，而不希望它们分别成为独立搜索落地页，可以让它们统一声明：

~~~html
<link
  rel="canonical"
  href="https://example.com/news"
/>
~~~

逻辑是：

~~~text
/news?category=AI
/news?year=2026
/news?search=agent
        │
        └──── Canonical ───→ /news
~~~

Canonical 不是：

~~~text
“禁止当前 URL 被索引”
~~~

而是：

~~~text
“这些页面高度相似，
如果需要选代表版本，
建议把 /news 当成主版本”
~~~

因此 Canonical 和 noindex 不能互相替代。

### 【Canonical 主要解决重复 URL 和信号分散问题】

常见来源包括：

~~~text
统计参数
/product/a?utm_source=google

来源参数
/product/a?ref=homepage

筛选参数
/news?category=AI

排序参数
/list?sort=time

协议 / 域名 / 尾斜杠差异
https://example.com/page
https://www.example.com/page/
~~~

如果这些 URL 指向相同或高度相似内容，搜索引擎就需要自己判断哪个是主要版本。

Canonical 的作用是帮助：

~~~text
多个近似 URL
↓
收敛到一个主要 URL
↓
减少重复页面判断成本
↓
让内部链接、Sitemap、页面规范信号尽量保持一致
~~~

### 【Canonical 是强信号，但不是搜索引擎必须执行的命令】

不是：

~~~text
开发者声明 canonical
↓
Google 必须照做
~~~

而是：

~~~text
rel=canonical
+
Redirect
+
Sitemap
+
Internal Link
+
页面内容相似度
↓
搜索引擎综合判断
↓
选择最终 Canonical
~~~

所以 Search Console 中可能同时存在：

~~~text
User-declared canonical
→ 网站声明的规范 URL

Google-selected canonical
→ Google 最终选择的规范 URL
~~~

如果二者不同，就应该检查站点是否发出了冲突信号。

### 【Canonical、Redirect、Sitemap 和 Internal Link 应尽量指向同一 URL】

理想状态：

~~~text
站内链接
→ /news/123

Sitemap
→ /news/123

Canonical
→ /news/123

旧 URL Redirect
→ /news/123
~~~

不理想状态：

~~~text
Internal Link
→ /news?id=123

Sitemap
→ /news/123

Canonical
→ /article/123
~~~

SEO 工程关注的是 URL Governance（URL 治理）的一致性，而不是单独“有没有 canonical 标签”。

### 【Sitemap 中 loc、lastmod、changefreq、priority 的职责并不相同】

一个 Sitemap Entry 可能是：

~~~ts
{
  loc: '/news/123',
  lastmod: post.modified,
  changefreq: 'daily',
  priority: 0.8,
}
~~~

四个字段可以分别理解为：

| 字段 | 含义 | Google 当前是否重点使用 |
| --- | --- | --- |
| loc | 页面 URL | 是，Sitemap 的核心 |
| lastmod | 最后一次显著修改时间 | 会参考，但要求长期准确 |
| changefreq | 站点声明“预计多久变化一次” | Google 忽略 |
| priority | 站点声明“相对本站其他 URL 的重要程度” | Google 忽略 |

### 【lastmod 应表达真实显著修改时间，而不是机械写发布时间或构建时间】

例如：

~~~text
9 月 1 日发布文章
10 月 5 日修改正文
~~~

那么更合理的是：

~~~text
lastmod = 10 月 5 日
~~~

而不是仍然：

~~~text
lastmod = 9 月 1 日
~~~

如果数据源区分：

~~~text
date
→ 发布时间

modified
→ 最后修改时间
~~~

Sitemap 更应该使用能够真实反映页面重大更新的 modified。

同时也不应该每次 Build 都无条件把 lastmod 改成当前时间，否则搜索引擎无法判断这个字段是否可信。

### 【changefreq 不是抓取调度器】

~~~text
changefreq: daily
~~~

并不表示：

~~~text
Google 每天一定抓一次
~~~

它只是站点自己声明“预计变化频率”。Google 当前会忽略这个字段，因此不能把它描述成“控制 Googlebot 抓取频率”。

### 【priority 不是 SEO 权重，更不会直接影响排名】

~~~text
priority: 0.8
~~~

只是在 Sitemap 协议层表达：

~~~text
这个 URL 相对本站其他 URL
由站点自己认为比较重要
~~~

它不是：

~~~text
Google 排名权重 = 0.8
~~~

Google 当前也忽略该字段。

因此对 Google SEO，更值得维护的是：

~~~text
Sitemap
↓
URL 是否完整
↓
是否提交 Canonical URL
↓
lastmod 是否真实准确
~~~

而不是不断调整：

~~~text
priority = 0.8 还是 0.9
changefreq = daily 还是 weekly
~~~

Google 对 Sitemap 的说明同样强调：Sitemap 是发现提示，不保证 URL 一定抓取、索引或获得排名。[[3]](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)[[6]](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

**项目实践映射：** official-network 当前 /news Query Canonical、WordPress Sitemap 的 lastmod / priority / changefreq 以及前 100 条限制，见 [SEO 工程体系源码分析](https://github.com/cxDlogver/official-network/blob/main/docs/SEO工程体系源码分析.md)。

## 4. 页面语义与搜索展示层让搜索引擎理解“这一页是什么”

索引解决“是否保存这个页面”，接下来才是“搜索引擎如何理解它”。

这一层不是简单的 TDK，而是：

~~~text
页面主题
├─ Title
├─ 主体正文
├─ Heading 层级
├─ Description
├─ 图片替代文本
└─ 页面内链接文字

页面实体
└─ Structured Data（结构化数据）

页面规范身份
├─ Canonical
└─ Language / hreflang

外部传播展示
├─ Open Graph
└─ Twitter / social card
~~~

### 【Title、正文标题和内容要共同表达页面主题】

Title 应准确、独特、与页面主体一致。Heading 的工程重点是形成清楚的内容层级，而不是机械追求“页面永远只能有一个 H1”的分数规则。

一个可理解的页面应该让：

~~~text
<title>
↓
页面主标题
↓
正文一级主题
↓
二级 / 三级内容结构
~~~

互相支持，而不是 Title 讲产品、页面 H1 讲公司、正文主要内容又完全是另一个主题。

### 【Description 是搜索摘要候选，不是排名关键词容器】

Meta Description 应简洁概括页面真实内容，帮助搜索结果形成有意义的摘要，但搜索引擎可以根据查询重新生成摘要。

因此不应把它优化成关键词堆积，也不应该把固定“字符数”当成标准合规线。

### 【meta keywords 对 Google 排名不是核心投入】

Google 不使用 `meta keywords` 作为网页搜索排名信号。[[15]](https://developers.google.com/search/help/office-hours/2023/january) 面向其他搜索生态时可以保留兼容配置，但工程优先级应明显低于 Title、主体内容、链接、Canonical、索引控制与结构化数据。

### 【结构化数据描述实体，但不能制造页面中不存在的事实】

Structured Data（结构化数据）通过 Schema.org 类型把页面中的实体和关系以机器可读方式表达，例如：

~~~text
Organization
Product
Article / NewsArticle
JobPosting
BreadcrumbList
~~~

Google 推荐优先使用 JSON-LD（JavaScript Object Notation for Linked Data，链接数据 JSON）实现支持的结构化数据，并要求标记内容与用户实际可见内容一致。正确结构化数据可以使页面具备 Rich Result（富结果）资格，但不保证一定展示，也不等于提升自然排名。[[7]](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)

验证链应该是：

~~~text
页面业务数据
↓
生成 JSON-LD
↓
Rich Results Test / Schema 验证
↓
部署
↓
URL Inspection
↓
Search Console 增强功能报告
~~~

Open Graph、Twitter Card 主要控制社交平台分享展示，属于传播体验，不应与 Google 自然排名信号混为一谈。

**项目实践映射：** official-network 通过 `usePageSeo` 统一 Meta / Canonical，通过 `useSeoStructuredData` 建立 Organization、Product、NewsArticle、JobPosting 等 JSON-LD，见 [项目分析中的页面语义层](https://github.com/cxDlogver/official-network/blob/main/docs/SEO工程体系源码分析.md)。

## 5. 渲染、内容质量与页面体验是贯穿搜索生命周期的横切约束

### 【JavaScript 页面可以被 Google 渲染，SEO 不应退化成“SSR 一定好、CSR 一定差”】

Google 在 2026 年 3 月更新 JavaScript SEO 文档时明确说明：Google Search 多年来一直能够渲染 JavaScript，因此“使用 JavaScript 加载内容会让 Google 更难处理页面”的旧式绝对判断已经过时。[[8]](https://developers.google.com/search/updates)

所以渲染策略和 SEO 的正确关系是：

~~~text
CSR / SSR / SSG / SWR
不是直接的“排名模式”

它们真正改变的是：
搜索爬虫首次拿到什么
↓
是否需要进入 JavaScript Rendering
↓
页面内容与 Meta 是否稳定一致
↓
获取成本、失败面和内容新鲜度怎样分配
~~~

SSR / Prerender 的价值仍然存在：它可以让公开核心内容、Canonical 和页面语义在初始 HTML 中更早、更确定地出现，也有利于非 JavaScript 消费者和首屏体验；但不能由此推出“SSR 天然排名更高”。

渲染机制的完整边界继续参考 [Web 渲染架构](./W-Web渲染架构.md) 和 [服务端渲染完整链路](./F-服务端渲染完整链路.md)。

### 【Core Web Vitals 是搜索排名系统使用的体验信号，但高分不保证高排名】

页面体验属于横切层。Google 明确说明其排名系统会使用 Core Web Vitals（核心网页指标），但 Search Console、Lighthouse 或第三方工具取得好成绩并不保证页面排到前列，仅仅为了 SEO 追求满分也并非最有效的投入。[[9]](https://developers.google.com/search/docs/appearance/page-experience)

因此：

~~~text
性能优化
→ 首先服务真实用户体验
→ 同时减少渲染与交互成本
→ Core Web Vitals 也是搜索系统考虑的一类信号

但：
Performance 100
≠ SEO 100
≠ 排名第一
~~~

性能专项继续由 [Web 性能优化完整知识体系](./W-Web性能优化完整知识体系.md) 承担，不在 SEO 文档中重复性能技巧。

### 【内容质量和搜索意图不是前端配置能够替代的】

工程可以保证：

~~~text
可发现
可抓取
可索引
语义清楚
速度可接受
结构化数据正确
~~~

但不能通过增加 Meta、Schema 或 Sitemap 把低价值内容“工程化成高排名内容”。

SEO 体系最终还需要内容侧共同回答：

- 页面是否真正满足搜索者问题；
- 内容是否原创、准确、完整、可信；
- 页面是否存在足够清楚的站内主题关系；
- 内容是否长期维护；
- 用户从搜索结果进入后是否真的获得价值。

## 6. SEO 工程需要把发布前自动检查和上线后真实搜索反馈连接成闭环

SEO 工程化的关键不是配置项数量，而是把“开发阶段正确”升级成“上线后持续正确”。

### 【发布前验证解决确定性的技术回归】

可以建立四层检查：

~~~text
代码与配置检查
→ URL / Meta / Canonical / robots / Schema 生成逻辑

构建结果检查
→ 代表性页面最终 HTML 是否包含预期信号

自动化审计
→ Lighthouse / Link Checker / 自定义断言

专项验证
→ Rich Results Test / robots / Sitemap / HTTP Status
~~~

代表性页面至少覆盖：

~~~text
首页
内容列表页
动态详情页
不允许索引页
404 / 下架页
分页 / 查询参数页
~~~

### 【上线后必须回到 Search Console，而不是停留在 Lighthouse】

Lighthouse 只能检查“当前这一个页面在当前测试环境下有没有若干基础技术问题”。

真正的搜索反馈需要回答：

~~~text
Google 实际发现了多少 URL？
↓
哪些 URL 已抓取 / 未抓取？
↓
哪些 URL 已索引 / 未索引？
↓
Google 选择的 Canonical 是哪个？
↓
结构化数据是否有效？
↓
有哪些 Query / Page 获得 Impression？
↓
CTR、Position、Click 怎样变化？
↓
Core Web Vitals 的真实用户表现怎样？
~~~

因此更完整的验证栈是：

| 工具 / 数据 | 主要回答 |
| --- | --- |
| Lighthouse | 单页基础技术 SEO 是否存在明显错误 |
| Rich Results Test | Google 支持的结构化数据是否具备富结果资格 |
| URL Inspection | Google 如何看到具体 URL、索引和 canonical 状态 |
| Search Console Indexing | 全站 URL 索引覆盖与问题 |
| Search Console Performance | Query / Page 的 Impression、Click、CTR、Position |
| Search Console CWV / CrUX | 真实用户页面体验 |
| Server / CDN Log | 爬虫真实请求、状态码和频率 |
| Web Analytics | 搜索流量进入以后真实转化和行为 |

这条反馈链把 SEO 从“一次性配置”变成可以长期治理的工程体系。

## 7. Lighthouse SEO 分数只代表基础技术审计，不是搜索排名分

### 【Lighthouse 自己就明确限定了 SEO 分数的边界】

Lighthouse 的 SEO Category（SEO 类别）描述的是“页面是否遵循基础搜索引擎优化建议”。其源码说明中同时强调，仍有大量 Lighthouse 不评分但会影响搜索表现的因素。[[10]](https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/core/config/default-config.js)

因此：

~~~text
Lighthouse SEO = 100
只表示：
当前页面通过了 Lighthouse 当前版本纳入计分的基础自动审计

不表示：
页面一定被 Google 索引
不表示：
Canonical 一定被 Google 采用
不表示：
Structured Data 一定展示富结果
不表示：
内容与 Query 高度相关
不表示：
搜索排名会高
~~~

### 【Lighthouse v13.5.0 的当前 SEO 评分并不是所有项目完全等权】

截至 Lighthouse v13.5.0，实际运行配置中的 SEO 计分项如下。[[10]](https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/core/config/default-config.js)

| Audit | 中文职责 | Weight | 全部适用时约占总分 |
| --- | --- | ---: | ---: |
| is-crawlable | 页面没有被索引控制完全阻止 | 93 / 23 | **31.00%** |
| document-title | 文档存在有效 Title | 1 | 7.67% |
| meta-description | 存在非空 Description | 1 | 7.67% |
| http-status-code | 主文档没有返回失败状态 | 1 | 7.67% |
| link-text | 链接文字具备可理解含义 | 1 | 7.67% |
| crawlable-anchors | 链接可以被爬虫发现和访问 | 1 | 7.67% |
| robots-txt | robots.txt 可解析且没有相关问题 | 1 | 7.67% |
| image-alt | 图片具备替代文本 | 1 | 7.67% |
| hreflang | 多语言 / 多区域注释有效 | 1 | 7.67% |
| canonical | Canonical 配置有效 | 1 | 7.67% |
| structured-data | 结构化数据人工检查 | 0 | **不计分** |

当以上计分 Audit 都适用时：

~~~text
总权重
= 93/23 + 9
= 300/23

is-crawlable
= (93/23) / (300/23)
= 31%

其他单项
= 1 / (300/23)
= 23/300
≈ 7.67%
~~~

这意味着：

~~~text
其他全部通过
但 is-crawlable 失败
→ SEO 分数上限约 69

失败一个普通计分项
→ 约损失 7.67 分
~~~

实际报告中如果某个 Audit 为 Not Applicable（不适用），Lighthouse 会按适用项重新归一化，因此不要把上表机械理解成任何页面永远固定扣相同分数。

还有一个重要边界：**主动 noindex 的页面不应该以 Lighthouse SEO 100 为目标。** 例如测试环境、开发中页面或明确不参与搜索的页面，本来就应该触发索引相关审计失败。SEO Score 的阈值应该用于“业务上应该被搜索引擎索引的公开页面”，其他 Route 应验证自己的预期索引策略，而不是全站机械追求同一个分数。

### 【当前 Lighthouse 文档与运行配置存在版本差异，精确评分应以版本源码为准】

Lighthouse v13.5.0 仓库中的 `docs/scoring.md` 仍写着“SEO Audit 等权、每项约 8 分”，但同一版本真正的 `default-config.js` 已把 `is-crawlable` 权重提升到至少 31%。[[11]](https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/docs/scoring.md)[[10]](https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/core/config/default-config.js)

所以工程上应遵循：

> **描述某个 Lighthouse 版本的精确评分时，优先核对该版本实际 Config，而不是长期背一个“每项 8 分”的静态结论。**

### 【Lighthouse 适合作为发布基线，但不应成为唯一验收指标】

推荐的工程定位是：

~~~text
Lighthouse
→ 防止明显技术 SEO 回归

Search Console / URL Inspection
→ 验证 Google 实际抓取与索引行为

Rich Results Test
→ 验证结构化数据

内容 / 搜索表现数据
→ 验证真正 SEO 结果
~~~

如果团队设置 Lighthouse SEO Threshold（阈值），它应该只是 Required Check（必需检查）之一。对重要公开页面，`is-crawlable`、HTTP 状态、Canonical 等关键 Audit 更适合设置“必须通过”的硬条件，而不是只接受一个总体平均分。

**项目实践映射：** official-network 当前仓库没有 Lighthouse 作为构建依赖或 CI Required Check 的证据，因此 Lighthouse 应被描述为当前的审计 / 验收工具或后续自动化方向，而不能描述成已经落地的自动化流水线。项目分析见 [Lighthouse 在 official-network 中的合理定位](https://github.com/cxDlogver/official-network/blob/main/docs/SEO工程体系源码分析.md)。

## 8. 面试与答辩应从搜索生命周期解释 SEO 工程，而不是背优化清单

面试官问“你们 SEO 工程化怎么做”，真正想判断的是候选人是否能把分散的 Meta、Sitemap、SSR、性能和验证机制放回同一条搜索链路。

一个完整回答可以沿：

~~~text
目标
让公开业务页面可以稳定被发现、抓取、理解和验证

        ↓

第一层：URL 发现与访问
内部链接 + Sitemap + 正确 HTTP Status + robots 策略

        ↓

第二层：索引与规范化
noindex + canonical + URL 生命周期

        ↓

第三层：页面语义
Title / Description + Heading / Content + Alt / Link Text

        ↓

第四层：实体表达
JSON-LD / Structured Data

        ↓

第五层：渲染与体验
SSR / Prerender / Hybrid + Core Web Vitals

        ↓

第六层：验证闭环
Lighthouse + Rich Results Test
+ URL Inspection + Search Console
~~~

答辩不能只证明“代码里有配置”，而应该证明：

| 评委追问 | 应提供的证据 |
| --- | --- |
| 重要页面是否可发现 | Sitemap、Internal Link、Route 列表 |
| 是否允许抓取 / 索引 | robots.txt、robots meta、HTTP Header |
| 页面是否有稳定主要内容 | 构建后 HTML、SSR / Prerender 输出 |
| 重复 URL 怎样治理 | Canonical、Redirect、Sitemap 一致性 |
| 动态页面怎样做 SEO | 数据驱动 Title / Description / JSON-LD |
| 富结果如何验证 | Rich Results Test / Search Console |
| SEO 有没有退化 | Lighthouse / 自定义构建断言 / 链接检查 |
| SEO 是否真的产生效果 | Search Console Impression / Click / CTR / Position 与业务转化 |

最终应把 SEO 工程理解成：

> **搜索生命周期治理 + 页面语义工程 + 发布质量门禁 + 线上搜索反馈闭环。**

## 9. 参考文献

1. [Google Search Central - Search Essentials](https://developers.google.com/search/docs/essentials)
2. [Google Search Central - Technical Requirements](https://developers.google.com/search/docs/essentials/technical)
3. [Google Search Central - Sitemap Overview](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
4. [Google Search Central - Block Search Indexing with noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
5. [Google Search Central - Canonicalization](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
6. [Google Search Central - Build and Submit a Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
7. [Google Search Central - Understand How Structured Data Works](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
8. [Google Search Central - Search Documentation Updates, March 2026](https://developers.google.com/search/updates)
9. [Google Search Central - Understanding Page Experience](https://developers.google.com/search/docs/appearance/page-experience)
10. [Lighthouse v13.5.0 - SEO Category Config](https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/core/config/default-config.js)
11. [Lighthouse v13.5.0 - Scoring Documentation](https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/docs/scoring.md)
12. [Nuxt 4 - SEO and Meta](https://nuxt.com/docs/4.x/getting-started/seo-meta)
13. [Nuxt 4 - Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering)
14. [Google Search Central - SEO Guide for Web Developers](https://developers.google.com/search/docs/fundamentals/get-started-developers)
15. [Google Search Central - SEO Office Hours: Meta Keywords](https://developers.google.com/search/help/office-hours/2023/january)
