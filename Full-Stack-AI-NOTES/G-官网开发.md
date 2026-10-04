# 实习：官网开发

## 任务一

> 负责工程化设计，AI辅助Nuxt4框架搭建，沉淀代码/提交规范、Design Tokens、组件与Composables复用，降低重复开发成本。

## 任务二

> 实现首屏渲染优化与SEO工程化，封装元信息生成器自动产出 TDK/OG，模块按需加载降低主线程压力，提升收录质量与首屏体验。

## 任务三

> 设计可复用关键帧动效库，通过 rAF 精细控制复杂动画节奏，保障高帧率体验并消除切换白屏与布局抖动。

## 技术栈总览

### 框架层

- `nuxt@4`
- `vue@3`
- `vue-router`

### UI 与样式层

- `@nuxt/ui`
- `tailwindcss@4`
- `@tailwindcss/vite`
- `@tailwindcss/typography`

### 内容与数据层

- `@nuxt/content`
- `better-sqlite3`
- `wpapi`

### SEO 与媒体层

- `@nuxtjs/seo`
- `@nuxt/image`
- `@nuxt/icon`

### 数据可视化与统计

- `echarts`
- `vue-echarts`
- `nuxt-gtag`
- 自定义百度统计插件

### 工程层

- `typescript`
- `eslint`
- `prettier`
- `vitest`

---

## 目录结构与职责

### `app/pages`

这是页面路由层，当前页面包括：

- `/`
- `/contact`
- `/develop`
- `/jobs`
- `/jobs/[slug]`
- `/join`
- `/join/process`
- `/news`
- `/news/[id]`
- `/product/[slug]`
- `/solution`

说明：

- 页面粒度清晰，典型官网站点结构
- 动态页主要有三类：产品详情、职位详情、新闻详情

### `app/components`

这是组件层，按业务域做了拆分，例如：

- `index`
- `join`
- `layout`
- `product`
- `solution`

说明：

- 组件组织偏业务分域，不是纯原子化设计系统
- 这类拆法很适合官网型页面开发

### `app/composables`

这是组合式逻辑层，目前主要包含：

- `useDevice`
- `useJob`
- `useProduct`
- `useSIteSeo`
- `useSeoStructuredData`

说明：

- 核心不是状态管理，而是“页面辅助逻辑”和“配置复用”
- 尤其 `SEO` 和 `Product/Job` 查询逻辑被抽成了可复用入口

### `app/data`

这是本地静态数据层，目前包括：

- 首页展示数据
- 招聘流程数据
- 新闻分类数据
- 产品矩阵数据
- 解决方案数据

说明：

- 项目大量页面内容依赖本地 TS 数据对象驱动
- 这使得首页、产品页、解决方案页天然更接近“配置驱动渲染”

### `content`

这里是 `@nuxt/content` 内容源，当前主要存放招聘岗位 Markdown。

说明：

- 招聘详情是 Markdown 驱动
- 内容管理和页面展示解耦

### `server/api`

这里是服务端 API 层，当前主要负责：

- 新闻列表
- 新闻详情
- 联系表单提交
- 邮件订阅提交
- 职位详情查询

说明：

- 这层本质上是轻量 BFF
- 它不做复杂领域建模，主要负责代理、转换和兜底错误处理

### `server/routes`

当前主要承载搜索引擎抓取入口：

- `robots.txt`
- `sitemap.xml`

### `build/vite-plugin`

当前有自定义 CDN 图片处理插件，用于构建期资源路径处理。

---

## 业务模块拆解

### 首页模块

首页是品牌展示核心，主要承担：

- 公司品牌表达
- 主产品矩阵展示
- 合作伙伴展示
- 引导到联系页面

特征：

- 以静态内容和视觉表达为主
- 几乎不依赖服务端实时数据

### 产品模块

产品详情页通过动态路由 `/product/[slug]` 展示不同产品。

数据来源：

- 本地 `app/data/productData.ts`

组合式入口：

- `useProductById`
- `useProductHeader`
- `useProductBaseInfo`

特征：

- 数据结构化程度高
- 页面依赖本地强配置模型
- 适合继续做静态化和 SEO 深化

### 解决方案模块

解决方案页以静态结构为主，内容来自：

- `app/data/solutionData.ts`

作用：

- 用于展示业务痛点、架构能力、实施流程、效果对比

### 新闻模块

新闻模块包含：

- 新闻列表 `/news`
- 新闻详情 `/news/[id]`

数据来源：

- WordPress REST API

服务端入口：

- `server/api/news/index.get.ts`
- `server/api/news/[id].get.ts`

特征：

- 前端只消费项目统一格式的数据
- 服务端负责把 WordPress 数据转成前端结构
- 支持分类、年份、搜索以及 meta 白名单过滤

### 招聘模块

招聘模块分成两层：

- 招聘品牌页 `/join`
- 岗位列表与详情 `/jobs`、`/jobs/[slug]`

数据来源：

- 招聘品牌页主要是本地内容与组件拼装
- 岗位列表/详情依赖 `@nuxt/content` 中的 Markdown

特征：

- 这是一个内容型模块
- 业务内容适合长期以 Markdown 维护

### 联系与订阅模块

包括：

- 联系表单 `/contact`
- 邮件订阅组件

服务端入口：

- `server/api/contact.post.ts`
- `server/api/newsletter.post.ts`

后端依赖：

- WordPress 自定义 REST 接口

特征：

- 前端负责校验与反馈
- Nuxt server 负责统一转发与报错处理



---

## 运行与渲染策略

### SSR 与静态化并存

从 `nuxt.config.ts` 可以看出，项目采用了按路由区分的渲染策略：

- 首页、联系页、职位页、产品页、解决方案页等走 `prerender`
- 新闻页走 `swr`

这说明项目已经有较明确的混合渲染思路：

- 稳定内容优先静态化
- 变化较频繁的内容采用缓存式服务端渲染

### CDN 资源策略

项目开启了：

- `app.cdnURL`
- 自定义 `cdnImagesPlugin`

这意味着构建产物资源分发已经考虑了 CDN 场景。

### 分析统计能力

项目当前同时存在：

- Google Analytics：`nuxt-gtag`
- 百度统计：自定义客户端插件

说明：

- 项目已经具备基础流量统计能力
- 如果后续问到埋点、访问分析、渠道归因，这会是关键点

---

## SEO 工程化能力

当前项目已经具备相对明确的 SEO 结构：

### 全局 SEO

- 统一站点信息
- 默认分享图
- HTML 语言声明
- 统一标题模板

### 页面级 SEO

通过 `usePageSeo()` 统一处理：

- `title`
- `description`
- `keywords`
- `canonical`
- `robots`
- Open Graph
- Twitter Card

### 结构化数据

通过 `useSeoStructuredData()` 输出：

- `Organization`
- `WebSite`
- `WebPage`
- `CollectionPage`
- `BreadcrumbList`
- `Product`
- `NewsArticle`
- `JobPosting`

### 抓取入口

- `robots.txt`
- `sitemap.xml`

这意味着 SEO 已经不再只是“页面写 meta”，而是具备了工程化基础。

---

## 当前阶段的项目结论

一句话总结：

这是一个基于 Nuxt 4 的企业内容官网项目，采用“静态数据 + Markdown 内容 + WordPress API”三类数据源混合模式，配合 SEO、静态化、SWR、CDN 和基础统计能力，整体已经具备较成熟的官网工程基础。

如果从问答准备角度看，后续提问最值得聚焦的核心主线有四条：

- 页面与模块怎么组织
- 数据源为什么这样分层
- 服务端 BFF 做了哪些事情
- SEO / 构建 / 渲染 / 统计这些工程能力怎么落地

---

## 问答记录

### Q001 你用 AI 辅助 Nuxt4 框架搭建，沉淀代码/提交规范，请解释一下你如何进行搭建的。

希望说明：

- 从技术选型开始
- 为什么选择 Nuxt
- 为什么选择 Tailwind
- 绘制动画为什么使用 `transition` / `animation` 与 `transform: translate(...)`，而不是 GIF 或额外动画库
- 代码规范和提交规范是如何设计的

回答：

这类项目里，AI 的价值不是替代架构判断，而是把“脚手架搭建、重复代码生成、规范沉淀、首轮检查”这些高重复工作提速；真正需要人来把关的，仍然是技术边界、SEO/性能策略、内容模型和工程约束。

结合当前仓库，我会把整套搭建思路概括成“先定架构骨架，再用 AI 快速铺页面与工程底座，最后由人工做技术收敛和规范固化”。

#### AI 辅助搭建是怎么做的

我通常会把 AI 放在三个阶段里使用。

第一阶段是方案收敛：

- 先让 AI 根据业务目标输出一版站点信息架构，例如首页、产品、解决方案、新闻、招聘、联系页怎么拆
- 让 AI 先给出数据源分层建议，哪些内容适合本地配置，哪些适合 Markdown，哪些适合 CMS 或外部 API
- 让 AI 帮我对比 Nuxt、纯 Vue SPA、Next 等方案的 SSR、SEO、内容管理成本和部署复杂度

第二阶段是工程起盘：

- 让 AI 生成 Nuxt 目录骨架、页面路由、基础布局、SEO composable、服务端 API 模板
- 让 AI 生成 ESLint、Prettier、测试入口、基础类型定义和常见脚本
- 让 AI 先铺一版首页、产品页、新闻页、招聘页的样板结构，再由人工统一设计语言和数据模型

第三阶段是规范沉淀：

- 让 AI 统一扫描代码风格不一致的问题
- 让 AI 按约定重构 import 顺序、组件块顺序、Tailwind class 排序和重复逻辑抽离
- 让 AI 根据提交记录反推团队的 commit message 习惯，再补成文档规范

换句话说，AI 更适合做“加速器”和“第一轮整理者”，不适合直接替代最终架构决策。

#### 为什么技术上选择 Nuxt

这个项目本质上是企业官网和内容站，不是一个强交互后台系统，所以框架选型最优先考虑的是：

- SEO 能力
- 首屏性能
- 内容页面开发效率
- 混合渲染能力
- 服务端中间层能力

在这个前提下，Nuxt 比纯 Vue SPA 更合适，原因有几个。

第一，Nuxt 天然适合 SEO 型站点。

- 它支持 SSR、prerender、SWR 等混合渲染策略
- 对搜索引擎抓取更友好
- 页面级 meta、结构化数据、`robots.txt`、`sitemap.xml` 更容易工程化统一

这点在当前项目里已经体现出来了，`nuxt.config.ts` 里已经按路由区分了 `prerender` 和 `swr`，首页、产品页、职位页偏静态化，新闻页偏缓存渲染，这就是 Nuxt 很典型的官网型用法。

第二，Nuxt 的目录约定和自动导入很适合快速落地。

- `pages` 直接映射路由
- `layouts` 负责整体框架
- `composables` 抽公共逻辑
- `server/api` 可以直接做轻量 BFF

这对 AI 辅助开发很友好，因为结构明确、生成成本低、后续也容易人工校正。

第三，Nuxt 能同时覆盖前端站点和轻量服务端能力。

当前项目新闻、联系表单、订阅这些能力，都可以通过 `server/api` 做一层统一转发和整形，而不需要再单独起一个 Node BFF 项目。这样可以减少系统拆分成本，让官网项目保持“单仓单应用”的简单度。

第四，Nuxt 周边能力完整。

当前仓库已经接入：

- `@nuxt/content`
- `@nuxtjs/seo`
- `@nuxt/image`
- `@nuxt/icon`
- `nuxt-gtag`

这说明 Nuxt 不是只解决“页面能跑”，而是对内容、SEO、图片、统计这些官网高频问题都有成熟集成。

所以这个项目选择 Nuxt，不是因为它“新”，而是因为它和企业官网、内容站、招聘页、新闻页这种业务形态天然匹配。

> 混合渲染的概念

**一个站点不是所有页面都用同一种渲染方式，而是按页面特点，组合使用静态预渲染、服务端渲染、缓存复用、后台更新等多种策略。**
 Nuxt 官方把这类能力直接称为 **hybrid rendering**，可以通过 route rules 为不同路由指定不同渲染和缓存规则。

------

##### 1. 先拆开看几个关键词

###### 1）Prerender 是什么

`prerender` 就是**提前把页面 HTML 生成好**，通常发生在构建阶段。
 Nuxt 官方说明，`nuxt generate` / `nuxt build --prerender` 会预渲染页面，Nitro 还会从入口页开始爬取链接，把可达页面一起生成出来。

你可以把它理解成：

- 构建时先把页面“烤熟”
- 用户访问时直接拿现成 HTML
- 首屏快、SEO 好、服务端压力小

典型适合：

- 官网首页
- 关于我们
- 招聘页
- 文档页
- 基本不频繁变化的内容页

------

###### 2）SWR 是什么

SWR 本质来自 HTTP 缓存语义 **stale-while-revalidate**。
 MDN 的定义是：**缓存即使已经过期，也可以先把旧内容返回，同时后台重新验证并刷新缓存。**

也就是：

1. 先给用户一个“旧但可接受”的页面/数据
2. 同时后台悄悄去拿新版本
3. 下一个用户再来时，看到的就是更新后的内容

它的核心价值是：

- 响应快
- 页面不一定每次都实时现算
- 数据能在后台逐步变新

这是一种**性能优先、允许短暂旧数据**的策略。
 MDN 也明确说明，这种模式的目标就是隐藏重新验证带来的延迟。

------

###### 3）混合渲染是什么意思

混合渲染就是：

- 有些页面用 prerender
- 有些页面用 SSR
- 有些页面用 ISR / SWR
- 有些页面甚至只做 CSR

Nuxt 官方明确说，可以对不同路由设置不同缓存和渲染规则；Next 也提供 prerender、ISR、缓存与 revalidate 等能力来实现类似目标。

所以它不是某一个单独技术，而是一种**页面级渲染策略组合思想**。

------

##### 2. 为什么要“混合”

因为不同页面诉求不一样。

比如一个网站里可能同时有：

- 首页：需要快、SEO 好，但内容变化不频繁
- 新闻页：需要 SEO，也要较快更新
- 用户后台：强交互、个性化，通常更适合 SSR 或 CSR
- 商品详情页：希望快，但价格库存又会变
- 管理后台：SEO 不重要，客户端渲染就够了

如果全站都 SSR：

- 每次请求都算一遍
- 服务器压力更大

如果全站都纯静态：

- 动态内容更新不及时
- 用户个性化差

所以才需要“按路由分策略”。

------

##### 3. Prerender、SWR、SSR、CSR 放在一起怎么理解

你可以把它们看成一个“实时性 vs 性能”的坐标。

###### Prerender

- 最快
- SEO 好
- 构建时生成
- 内容更新不够灵活

###### SSR

- 每次请求实时生成
- 动态性强
- SEO 好
- 服务端开销更大

###### SWR / ISR

- 首次或旧缓存快速返回
- 后台更新
- 性能和新鲜度折中
- 非强一致，但体验好

###### CSR

- 前端拿壳子后自己请求数据
- 交互灵活
- SEO 通常较弱
- 首屏依赖前端加载

Next 官方对 ISR 的定义就是：**不需要重建整个站点，也能更新静态内容，并减少服务器负载。**

所以你可以把 ISR / SWR 理解成：

**介于纯静态和纯 SSR 之间的一种折中方案。**

------

##### 4. SWR 和 ISR 的关系

这两个概念很容易混。

###### SWR

更偏**缓存策略语义**
 意思是：旧内容先返回，后台再刷新。
 这是 HTTP 层、缓存层常见的思想。

###### ISR

更偏**框架页面生成策略**
 Next 官方说 ISR 允许静态页面在构建后继续增量更新，而不需要全站重新 build。

所以可以这样记：

- SWR：一种“先旧后新”的缓存更新思路
- ISR：框架层把静态页和重新生成结合起来的实现方式

很多时候，ISR 的用户体验就很接近 SWR。

------

##### 5. 举个最直观的例子

假设你做一个企业官网。

###### 页面 A：首页

内容很稳定，只是偶尔改文案。
 适合：**prerender**

因为：

- 首屏快
- SEO 好
- 没必要每次请求都服务器现算

###### 页面 B：新闻详情

新闻会新增，但单篇一旦发布后改动不频繁。
 适合：**prerender + SWR/ISR**

因为：

- 希望像静态页一样快
- 又不想每次加一篇新闻都全站重建
- 可以让页面在后台逐步更新

###### 页面 C：个人中心

每个用户内容不同。
 适合：**SSR 或 CSR**

因为：

- 强个性化
- 不适合提前生成静态 HTML

这就叫混合渲染。

------

##### 6. 在 Nuxt 里是什么意思

Nuxt 官方说得很直接：
 Nuxt 支持 **route rules / hybrid rendering**，可以针对一组路由指定渲染方式和缓存规则。

也就是说，你可以：

- `/` 用 prerender
- `/blog/**` 用 SWR
- `/admin/**` 用 CSR 或 SSR
- `/api/**` 单独做缓存

这就是 Nuxt 语境下常说的“混合渲染策略”。

#### 为什么选择 Tailwind

Tailwind 在这个项目里也很合理，因为官网型项目的页面特点不是“复杂业务状态”，而是“高频视觉编排”。

我选择 Tailwind，主要基于四个原因。

第一，搭建速度快。

官网类页面往往有大量：

- 栅格布局
- 响应式断点
- 字体层级
- 间距、圆角、阴影
- hover / transition / transform 状态

Tailwind 用原子类可以把这些能力直接贴在结构上，AI 也更容易根据视觉描述快速生成第一版页面骨架。

第二，样式约束更统一。

传统写法里，团队很容易在多个 `.scss` 或组件样式里不断堆局部 class，最后出现命名不统一、样式漂移和覆盖混乱。Tailwind 把样式组织从“命名”转成“组合”，反而更适合多人协作和 AI 辅助生成。

第三，响应式与状态表达成本低。

像 `md:`, `lg:`, `hover:`, `group-hover:`, `transition-`, `translate-` 这种表达，在官网里非常常见。Tailwind 让这些能力直接和组件结构放在一起，修改会很快。

第四，工程链条已经补齐。

当前项目已经配置了：

- `tailwindcss@4`
- `@tailwindcss/vite`
- `@tailwindcss/typography`
- `prettier-plugin-tailwindcss`

这说明 Tailwind 在仓库里不是“临时用一下”，而是被纳入了正式工程规范，连 class 排序都已经交给 Prettier 统一处理。

#### 为什么动画使用 CSS `transition` / `animation` 和 `transform: translate(...)`

这里更准确地说，项目里主要采用的是：

- CSS `transition`
- CSS `animation`
- `transform: translate / scale / rotate`

而不是 GIF 动图，也没有默认依赖重型动画库。

这样设计，是因为当前项目的动画本质上是“页面过渡 + 轻交互反馈 + 装饰性动效”，不属于复杂时间轴编排或 3D 场景。

从当前仓库能看到两类典型实现：

- `nuxt.config.ts` 里配置了 `pageTransition: { name: 'page-slide' }`
- `app/assets/css/animate.css` 里用自定义 `@keyframes` 和 `transition` 实现了浮动、跑马灯和页面滑入滑出效果

这类场景优先使用原生 CSS 的原因是：

第一，性能更好。

- `transform` 和 `opacity` 往往更容易走合成层
- 浏览器优化成熟
- 不需要额外运行时调度
- 对首屏包体更友好

第二，控制粒度更细。

我们可以直接控制：

- 入场和离场时间
- 缓动曲线
- 位移距离
- hover 与 route transition 的衔接

而 GIF 是一个已经渲染好的位图资源，几乎没有办法和页面状态、主题、响应式布局做真正联动。

第三，体积和清晰度更有优势。

GIF 常见问题是：

- 文件体积大
- 画质差
- 难以适配高分屏
- 无法按需修改颜色和节奏
- 不支持语义化交互

所以 GIF 更适合极少数“纯展示型循环动图”，不适合作为官网主要动画实现手段。

第四，没有默认引入动画库，是因为当前复杂度还没到那个级别。

动画库不是不能用，而是要看场景值不值得。如果只是页面切换、悬浮反馈、局部漂浮、数字卡片入场，这些效果用 CSS 就足够了。此时引入额外动画库，通常会带来：

- 包体增加
- 运行时成本增加
- 调试复杂度增加
- SSR/CSR 行为差异增多

只有当项目出现更复杂的需求时，比如：

- 精准时间轴控制
- 视差滚动联动
- SVG 路径编排
- 高复杂品牌叙事动画

这时再考虑 GSAP、Motion 或 Lottie 这类工具才更合适。

所以当前项目的策略可以总结为：

- 基础交互和过渡，优先 CSS 原生能力
- 装饰性动画，优先 `transform + opacity`
- 只有在复杂度明显上升时，才引入专门动画库

#### 代码规范是如何设计的

当前项目的代码规范已经有明显的工程化基础，而且能从仓库配置直接看出来。

第一层是语言和框架约束：

- 使用 `TypeScript`
- 使用 Nuxt 目录约定组织代码
- 页面、组件、组合式函数、服务端 API 按职责分层

第二层是静态检查：

`eslint.config.mjs` 里已经明确了几条核心规则：

- 使用 `eslint-plugin-simple-import-sort` 强制 import / export 排序
- 关闭通用 `no-unused-vars`，避免和 Nuxt 自动导入产生过多误报
- 对 Vue 单文件组件强制 `script -> template -> style` 的块顺序
- 关闭 `vue/multi-word-component-names`，以兼容官网场景里的一些页面或组件命名

第三层是格式化规范：

`.prettierrc.json` 当前约定为：

- 不加分号
- 使用单引号
- `printWidth` 为 `100`
- 保留尾逗号
- 使用 `prettier-plugin-tailwindcss` 自动排序 Tailwind class

第四层是结构规范。

虽然仓库里没有单独写成大篇幅规范文档，但从代码组织可以总结出当前项目默认遵循的结构设计：

- `pages` 负责路由页面
- `components` 负责业务模块拆分
- `composables` 负责公共逻辑复用
- `data` 负责静态配置数据
- `content` 负责 Markdown 内容
- `server/api` 负责轻量 BFF

这套结构的好处是，页面展示、业务逻辑、内容数据和服务端适配是分开的，后续不容易互相污染。

如果把这套规范抽象成一句话，就是：

“用 Nuxt 的约定式目录保证大结构清晰，用 ESLint / Prettier 保证细节统一，用 composable 和 data/content/api 分层保证代码能持续演进。”

#### 提交规范是如何设计的

提交规范这部分，我会分成“当前仓库已形成的习惯”和“可以继续强化的工程化设计”两层来讲。

从当前 `git log` 可以看到，这个项目已经在使用接近 Conventional Commits 的风格，例如：

- `feat: add support for baidutongji and google analytics`
- `fix: save nav bulletin status to cookie`
- `build: fix nuxt config file for nitro prerender options`

这说明团队已经默认在按“类型 + 简短说明”的方式提交。

这样的提交规范有几个直接好处：

- 一眼就能看出本次提交的性质
- 回溯问题时更快定位是功能、修复还是构建调整
- 后续做 changelog、发布记录或自动化分析会更方便

如果我来正式沉淀这部分规范，我会把提交类型统一成下面这一组：

- `feat`: 新功能
- `fix`: 缺陷修复
- `refactor`: 重构但不改功能
- `docs`: 文档修改
- `style`: 纯样式或格式调整
- `test`: 测试补充或调整
- `build`: 构建、配置、依赖、打包链路调整
- `chore`: 杂项维护

同时配几条简单但很实用的约束：

- 一次 commit 只做一件相对单一的事
- 标题写“做了什么”，不要写成模糊的“update”或“modify”
- 如果改动有背景或权衡，在 commit body 里补“为什么这样改”
- 提交前至少跑 `lint` 和核心测试

需要诚实说明的是，当前仓库里我还没有看到 `commitlint`、`husky`、`lint-staged` 这类硬性钩子，所以现在的提交规范更偏“团队约定”，还不是“工具强约束”。

如果下一步继续工程化，我会建议补上：

- `commitlint`：校验 commit message 格式
- `husky`：提交前自动执行检查
- `lint-staged`：只对暂存文件跑格式化和 lint

这样就能把“靠自觉”进一步升级成“有自动化护栏”。

#### 一句话总结这套搭建思路

如果把整件事压缩成一句适合面试表达的话，可以这样说：

“我会先用 AI 帮我快速收敛 Nuxt 官网项目的页面结构、数据分层和工程底座，再由人工把 SSR/SEO/动画/性能这些关键决策做实；技术上选择 Nuxt 是因为它天然适合内容站和 SEO 场景，选择 Tailwind 是为了提升页面开发效率和样式一致性，动画优先采用原生 CSS `transition` / `animation` 与 `transform` 是出于性能和维护成本考虑，而代码规范与提交规范则通过 ESLint、Prettier 和约定式 commit 风格逐步沉淀成团队标准。”

### Q002 Nuxt中Prerender、SWR、SSR、CSR四种渲染方式

#### 请说说Nuxt中Prerender、SWR、SSR、CSR四种渲染方式的使用时机、核心特征及请求流程

##### Prerender（预渲染）

适用场景：内容稳定、公开访问、SEO需求强、改动不频繁的页面，核心是“构建时生成静态资源”，无需服务端实时处理。

典型页面：官网首页、关于我们、帮助文档、营销落地页、不常变的博客文章页。

核心特征：首屏加载速度快，SEO友好，服务器压力极低；缺点是不适合用户个性化内容或频繁变化的内容，无法实时更新数据。

请求流程：

构建时：执行`nuxt generate`或`nuxt build --prerender`，Nitro crawler从根路径、非动态页面及手动指定路由开始抓取，生成对应HTML和`_payload.json`，最终输出到`.output/public`目录。

用户访问时：CDN或静态服务器直接返回预生成的HTML，浏览器加载JS并完成页面hydration（水合），后续站内跳转可复用`_payload.json`，减少重复数据拉取。

对应问题：Prerender适合什么场景？其请求流程分为哪两个阶段？核心优势和不足是什么？

面试完善答案：Prerender适合内容稳定、SEO需求强、改动不频繁的公开页面，比如官网首页、帮助文档。其请求流程分为构建时和用户访问时，构建时通过`nuxt generate`启动Nitro爬虫生成静态资源，访问时直接返回静态文件，无需服务端实时渲染。核心优势是首屏快、SEO好、服务器压力低，不足是无法支持个性化内容和实时数据更新。

##### SSR（服务端渲染）

适用场景：首屏必须展示最新数据，且可能依赖请求上下文（如cookie、locale、AB实验）的页面，核心是“请求时实时渲染”。

典型页面：搜索结果页、商品详情页、新闻详情页、需要根据请求上下文实时渲染的页面、个性化首页。

核心特征：首屏HTML完整，SEO友好，数据实时性强；缺点是每次请求都需服务器现场渲染，服务端资源消耗高于静态页，性能成本较高。

请求流程：用户请求页面 → Nitro接收请求 → 运行页面组件及`useAsyncData`/`useFetch`获取数据 → 服务器生成完整HTML → 返回HTML给浏览器 → 浏览器完成hydration → 后续交互由客户端接管。

对应问题：SSR的核心特点是什么？适合什么场景？请求流转中服务器承担了哪些工作？

面试完善答案：SSR的核心特点是“请求时实时渲染”，每次用户请求都会由服务器现场生成HTML，保证数据新鲜度和SEO友好。适合首屏需最新数据、依赖请求上下文的场景，比如搜索结果页、个性化首页。请求流转中，服务器负责接收请求、执行组件逻辑、获取数据、生成完整HTML，再将HTML返回给浏览器，相比静态渲染，服务器承担了更多实时处理工作。

##### CSR（客户端渲染）

适用场景：强交互、登录后后台、SEO不敏感的页面，核心是“服务器返回应用壳，客户端渲染页面”。

典型页面：管理后台、工作台、数据大屏控制端、个人设置页、仅登录后可见的复杂业务页。

核心特征：前后端职责清晰，适合复杂交互场景；缺点是SEO弱，首屏加载速度通常慢于SSR和Prerender，需等待JS加载执行后才能渲染页面。

请求流程：用户请求页面 → 服务端返回应用壳（空HTML）和前端资源 → 浏览器下载并执行JS → Vue在客户端创建页面 → 客户端发起接口请求获取数据 → 页面完成最终渲染。

对应问题：CSR与SSR的核心区别是什么？为什么管理后台通常用CSR？

面试完善答案：CSR与SSR的核心区别是渲染主体不同，CSR由客户端（浏览器）完成页面渲染，服务器仅返回应用壳；SSR由服务器完成首屏HTML渲染，再返回给浏览器。管理后台用CSR的原因是，这类页面SEO需求低，更注重交互体验和状态管理，无需搜索引擎抓取，且关闭SSR后，客户端可独立完成交互逻辑，前后端职责更清晰，更适合复杂业务操作。Nuxt中可通过`ssr: false`全局切换为CSR，也可通过路由规则单独配置。

##### SWR

适用场景：页面需快速加载，但不要求每次请求都是绝对最新数据，允许“短时间旧缓存”的页面，核心是“服务端缓存+后台刷新”。

典型页面：商品列表页、资讯列表页、博客列表页、排行榜、公共详情页但更新频率中等的页面。

核心特征：首屏加载快，服务端压力小于SSR，兼顾性能与数据新鲜度；缺点是数据不是请求瞬间的绝对最新，存在短时间缓存延迟。

请求流程：

第一次请求：用户请求页面 → 服务器渲染HTML → 将渲染结果写入缓存。

缓存有效期内：用户再次请求，直接返回缓存中的HTML，无需重新渲染。

缓存过期后：先返回旧缓存HTML，保证首屏速度，同时后台异步刷新缓存，下一次请求即可获取更新后的数据。

注：Nuxt中SWR归属于混合渲染的路由规则，由Nitro缓存层自动处理，无需额外手动配置缓存逻辑。

对应问题：SWR的核心原理是什么？适合什么场景？与SSR相比有什么优势？

面试完善答案：SWR的核心原理是“服务端缓存+后台刷新”，首次请求由服务器渲染并缓存HTML，缓存有效期内直接返回缓存，过期后先返回旧缓存再后台更新。适合页面需快速加载、数据更新频率中等、不要求绝对实时的场景，比如商品列表页。与SSR相比，SWR无需每次请求都重新渲染，大大降低了服务端压力，同时首屏速度与SSR相当，兼顾了性能和数据新鲜度。

#### Nuxt如何实现Prerender、SWR、SSR、CSR的混合渲染？核心原理是什么？

##### 混合渲染核心原则

Nuxt的混合渲染并非在单个组件内切换渲染模式，而是在**路由层**通过`routeRules`（路由规则），为不同路由分配不同的渲染策略，实现“按路由分治”。

核心依赖：Nuxt + Nitro，其中Nitro负责服务端渲染、预渲染和缓存分发，`routeRules`负责按路径下发渲染策略，两者配合实现混合渲染。

##### 混合渲染实现方式（路由配置）

通过`nuxt.config.ts`中的`routeRules`配置，针对不同路由指定渲染策略，典型配置如下：

```typescript
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },        // 首页用Prerender
    '/docs/**': { prerender: true }, // 所有文档页用Prerender
    '/products/**': { swr: 3600 },   // 商品相关页面用SWR，缓存1小时
    '/search/**': { ssr: true },     // 搜索页用SSR，保证实时性
    '/admin/**': { ssr: false }      // 管理后台用CSR
  }
})
```

配置说明：`routeRules`支持通配符（如`/**`匹配所有子路由），可灵活为单个路由或批量路由分配渲染策略，Nuxt server会自动注册对应中间件，由Nitro缓存层处理缓存和渲染逻辑。

##### 对应问题：Nuxt混合渲染的核心是什么？如何配置不同路由的渲染策略？底层依赖哪些技术？

面试完善答案：Nuxt混合渲染的核心是“按路由分治”，不在组件内切换模式，而是通过`routeRules`为不同路由分配Prerender、SWR、SSR、CSR四种策略。配置方式是在`nuxt.config.ts`中定义`routeRules`，针对不同路由（支持通配符）指定对应的渲染规则，比如首页用Prerender、搜索页用SSR、管理后台用CSR。底层依赖Nuxt框架本身和Nitro服务器，Nitro负责处理服务端渲染、预渲染和缓存分发，`routeRules`负责下发策略，两者协同实现混合渲染。

#### 真实项目中，Nuxt的四种渲染方式如何合理分配？请结合场景说明

##### 官网型项目（营销+文档类）

路由分配：`/`（首页）、`/about`（关于我们）、`/pricing`（定价页）用Prerender；`/blog/**`（博客）更新少用Prerender，更新中频用SWR；`/search`（搜索页）用SSR；`/admin/**`（管理后台）用CSR。

分配原因：营销类页面（首页、关于我们）追求极致首屏速度和SEO，适合Prerender；博客页面根据更新频率选择Prerender或SWR，兼顾性能和新鲜度；搜索页需实时返回搜索结果，适合SSR；管理后台无SEO需求，注重交互，适合CSR。

##### 电商型项目

路由分配：首页活动页用Prerender或SWR；商品详情页用SSR或SWR；类目列表页用SWR；购物车、个人中心用CSR或个性化SSR。

分配判断标准：1. 是否公开给搜索引擎（是则优先Prerender/SSR/SWR，否则可CSR）；2. 是否需要用户个性化（是则优先SSR/CSR，否则可Prerender/SWR）；3. 数据变化频率（高频则SSR，中频则SWR，低频则Prerender）；4. 是否接受短时间旧缓存（接受则SWR，不接受则SSR）。

##### 对应问题：电商项目中，商品详情页为什么可以用SSR或SWR？购物车为什么适合用CSR？

面试完善答案：商品详情页可用SSR或SWR，原因是：商品详情页属于公开页面，需要SEO，且数据有一定更新频率（如库存、价格），用SSR可保证数据绝对实时，用SWR可兼顾性能和新鲜度（缓存过期后后台刷新），根据业务对实时性的要求选择即可。购物车适合用CSR，因为购物车是登录后可见的个性化页面，无需SEO，且涉及频繁的交互（如添加、删除商品、修改数量），CSR可让前后端职责清晰，提升交互流畅度，减少服务端请求压力。

#### Nuxt中Prerender和SSG有区别吗？请简要说明

##### 核心区别

两者关系密切，但层级不同：SSG（Static Site Generation，静态站点生成）是**整站/整类页面的构建模式**，Prerender（预渲染）是**具体的路由级预生成动作或实现手段**。

具体说明：SSG指在构建阶段将整个站点的页面提前生成静态文件，部署到静态托管服务（如CDN），强调“全站静态化”；Prerender指将某些特定路由预先渲染成HTML，不局限于全站，可作为混合渲染的一部分，强调“路由级预生成”。

##### Nuxt中两者的关联与混用原因

Nuxt官方文档明确：`nuxt generate`或`nuxt build --prerender`会对应用路由进行预渲染（Prerender），并将结果输出为静态文件，因此Nuxt中的SSG本质上是通过Prerender实现的。

实际交流中两者常被混用，是因为“做SSG”和“做Prerender”在很多场景下效果一致（都是生成静态文件），但严格来说，SSG范围更大（全站模式），Prerender更具体（路由级动作）。

##### 实用区分方式

1. 整站静态化（如纯官网、文档站）：构建时生成大部分页面，部署到CDN，此时称“这是SSG项目”。
2. 部分路由预渲染（如混合渲染项目）：仅部分路由用Prerender，其他路由用SSR/CSR/SWR，此时称“这是混合渲染项目，部分路由用了Prerender”，而非“SSG项目”。

##### 对应问题：面试中如何区分Prerender和SSG？Nuxt中两者的关系是什么？

面试完善答案：Prerender和SSG不完全等价，核心区别是层级不同：SSG是构建时生成静态站点的整体模式，强调全站静态化；Prerender是将具体路由提前渲染成HTML的实现手段，强调路由级动作。在Nuxt中，SSG通常是通过Prerender完成的，`nuxt generate`命令会启动Prerender动作，生成静态文件，因此两者关系密切、常被混用，但严格来说，SSG范围更大，Prerender是实现SSG的一种方式，也可用于混合渲染中。

#### 请简述Nuxt混合渲染的底层思路（面试高频）

面试标准回答：Nuxt的混合渲染本质上是“按路由配置渲染策略”，核心思路是根据页面的业务需求（SEO、数据实时性、交互性），为不同路由分配最合适的渲染方式：

1. 稳定、公开、SEO强的内容，在构建期通过Prerender生成静态页，提升首屏速度和SEO，降低服务器压力；
2. 中频更新、无需绝对实时的公共内容，用SWR做服务端缓存，兼顾性能和数据新鲜度，减少服务端消耗；
3. 强实时、依赖请求上下文（如cookie、locale）的内容，用SSR实时渲染，保证数据最新；
4. 强交互、SEO不敏感的后台或个性化页面，用CSR让客户端接管渲染，提升交互流畅度。

底层实现上，Nuxt通过`routeRules`将渲染规则下发给Nitro服务器，Nitro负责处理请求分发：判断请求路由对应的渲染策略，决定是返回静态文件（Prerender）、实时渲染（SSR）、缓存内容（SWR），还是应用壳（CSR）。

##### 对应问题：面试中如何简洁概括Nuxt混合渲染的核心思路？

面试完善答案：Nuxt混合渲染的核心是“按路由分治，按需分配”，不追求全站单一渲染模式，而是通过`routeRules`为不同路由匹配Prerender、SWR、SSR、CSR四种策略，实现“稳定内容静态化、中频内容缓存化、实时内容服务端化、后台内容客户端化”，底层由Nuxt和Nitro协同完成策略分发和渲染处理。

#### Nuxt混合渲染的记忆框架（面试快速答题用）

##### 核心判断三问

1. 该页面是否需要SEO？（是：优先Prerender/SSR/SWR；否：可选择CSR）
2. 该页面是否必须每次请求都是最新数据？（必须：SSR；不必须：SWR；很稳定：Prerender）
3. 该页面是否是强交互后台？（是：CSR；否：结合SEO和数据实时性选择其他三种）

##### 一句话总结

Nuxt的混合渲染，是通过`routeRules`按页面类型组合Prerender、SWR、SSR、CSR四种方式，实现“按需渲染”，兼顾首屏速度、SEO、数据实时性和交互体验。

##### 对应问题：如何快速判断一个页面该用哪种Nuxt渲染方式？

面试完善答案：可通过三个核心问题快速判断：一是是否需要SEO，二是是否需要数据绝对实时，三是是否为强交互后台。需要SEO优先考虑Prerender、SSR、SWR；需要绝对实时数据用SSR；强交互后台用CSR；数据中频更新、无需绝对实时用SWR；内容稳定用Prerender，按这三个问题可快速匹配最合适的渲染方式。

### Q003 你做了 Design Token，具体是什么意思，为什么要设计，你的 Design Token 有版本的概念吗？

希望说明：

- 说出设计思路和这样设计的亮点
- 版本规划目前大概率只有一版，后续扩展可能会有多个

回答：

如果用一句话解释，Design Token 就是把设计系统里那些“会被反复使用、需要长期保持一致”的设计决策，抽成一组稳定的、可复用的命名变量。

它不是单纯的“颜色变量”，而是一种把设计语言工程化的方式。常见的 token 会包括：

- 颜色
- 字体
- 字号和字重
- 间距
- 圆角
- 阴影
- 动画时长和缓动
- 断点
- 层级

在当前项目里，Design Token 已经有比较明确的落地，只是没有单独命名成一个 `tokens` 目录，而是先落在了样式底座里。

最核心的位置在：

- `app/assets/css/main.css`
- `app/assets/css/animate.css`

从实现上看，当前项目已经把下面几类内容抽成了 token。

第一类是品牌原始色和扩展色：

- `--color-canopus`
- `--color-brand-dark`
- `--color-brand-ext-1 ~ 4`

第二类是语义色：

- `--color-primary`
- `--color-primary-hover`
- `--color-surface`
- `--color-text`
- `--color-border`
- `--color-neutral-text1 ~ 3`

第三类是功能色：

- `--color-success-*`
- `--color-error-*`
- `--color-warning-*`
- `--color-link-*`

第四类是布局和节奏：

- `html` 根字号缩放
- `--vpad-mul` 纵向节奏乘子
- `--radius-card`
- `text-h1 ~ text-h4`
- `main-card`
- `section-card`

第五类是动效 token：

- `--animate-float`
- `--animate-marquee-*`
- `--page-enter-dur`
- `--page-leave-dur`
- `--page-ease`
- `--page-shift`

所以如果别人问“你这个项目有没有 Design Token”，我的回答会是：

“有，而且已经覆盖了品牌色、语义色、排版、节奏、圆角和动效，只是目前主要以内聚在 CSS 主题层的方式存在，还没有拆成独立的多端 token 包。”

#### 为什么要做 Design Token

做 token 的核心原因，不是为了概念漂亮，而是为了降低后期维护成本。

如果不做 token，项目很容易出现下面这些问题：

- 页面里到处散落 `#333333`、`#666666`、`#3B7073`
- 同一个主色在不同组件里出现多个近似值
- 间距、圆角、阴影、标题大小各写各的
- 设计改版时要全项目搜索替换
- AI 生成页面时容易越写越散，风格越来越漂

而 token 的作用，就是把“设计决策”从“散落在组件里的具体值”提升成“全局可管理的系统变量”。

它的直接价值主要有四个。

第一，一致性。

所有页面都围绕同一套品牌色、文字层级和布局节奏展开，官网不会出现这页偏冷色、那页偏灰色、另一页又是另一套按钮半径的问题。

第二，可维护性。

当品牌主色、标题字号、页面圆角或过渡节奏要改时，不需要满项目去改样式，只改 token 即可。

第三，可扩展性。

未来如果要做：

- 深浅主题
- 活动页主题
- 海外站主题
- B 端与官网的差异主题

就不需要重写所有组件，只要替换 token 层即可。

第四，适合多人协作和 AI 协作。

AI 最怕“没有约束”。一旦项目没有统一 token，AI 很容易在不同页面里给出风格不一致的颜色和间距。把 token 先设计好，其实也是在给 AI 建边界，让它生成的代码尽量收敛到同一套视觉语言中。

#### 设计思路是什么

如果从设计思路上总结，我这套 token 不是“堆变量”，而是按层次组织的。

第一层是原始品牌 token。

这层描述的是最底层的设计素材，比如：

- 品牌主色
- 品牌深色
- 品牌扩展色
- 基础中性色

这层更像“原材料”，特点是接近品牌资产本身。

第二层是语义 token。

这层不会直接告诉你“这是深绿还是浅青”，而是告诉你：

- 这是主按钮色
- 这是 hover 色
- 这是正文主文字
- 这是弱文字
- 这是默认边框
- 这是卡片背景

语义 token 的意义非常大，因为组件应该依赖“用途”，而不是依赖某个具体 HEX 值。这样后续就算品牌换色，组件语义仍然成立。

第三层是布局与排版 token。

这层解决的是视觉节奏统一问题，例如：

- 根字号按屏幕宽度缩放
- 页面纵向节奏由 `--vpad-mul` 控制
- 标题等级统一成 `text-h1 ~ text-h4`
- 卡片圆角统一成 `--radius-card`

这部分的亮点在于，它不只管“颜色”，而是开始管理页面阅读体验和空间秩序。

第四层是动效 token。

很多项目做 token 只做到颜色就停了，但当前项目其实已经把动效节奏也做了一部分抽象，比如页面切换时间、位移距离、缓动曲线和浮动动画，这说明 token 已经从“静态视觉系统”开始扩展到“交互体验系统”。

#### 这样设计的亮点是什么

这套设计在当前项目里有几个比较明确的亮点。

第一，语义化程度比较高。

现在不是到处直接写品牌原色，而是有 `primary`、`surface`、`text`、`border`、`neutral-*` 这种语义别名。这意味着组件依赖的是“角色”，不是“色值”，后续演进空间会更大。

第二，颜色体系有品牌层和功能层。

项目不仅定义了品牌色，还定义了：

- success
- error
- warning
- link

这说明 token 已经不仅服务于官网展示，也考虑到了后续表单反馈、交互提示和状态表达。

第三，使用了 OKLCH 描述核心颜色。

这点很重要。OKLCH 比传统 RGB / HEX 更适合做系统化颜色管理，因为它更接近人眼感知，后续如果要扩展一整套同感知层级的颜色体系，会更稳定。

第四，token 不只管颜色，还纳入了排版、节奏和动效。

很多团队说自己有 Design Token，实际上只有几组颜色变量。当前项目更进一步，把：

- 字体层级
- 页面缩放
- 纵向节奏
- 页面过渡
- 浮动和跑马灯动画

都纳入了可统一控制的范围，这会让整体体验更完整。

第五，和 Tailwind v4 的 `@theme` 结合得比较自然。

这意味着 token 不是悬空存在，而是直接进入样式编译链，前端开发和 AI 辅助生成时都能直接消费这套设计资产。

#### Design Token 有没有版本概念

有这个概念，而且我认为应该有，只是当前项目还处在“单版本”阶段。

更准确地说，当前项目大概率只有一版活跃 token，可以理解成：

- 当前视觉体系的 `v1`

只是这份 `v1` 还没有被单独放进：

- `tokens/v1`
- `theme/v1`
- `design-tokens.json`

这样的显式版本目录里。

所以现在的状态是：

- 事实上有一版稳定 token
- 但还没有做成显式版本化资产

这很正常，因为官网项目在第一阶段通常先解决“能统一、能复用、能稳定迭代”，不会一开始就做复杂的多版本管理。

#### 为什么当前大概率只有一版

因为当前项目还没有出现必须拆多主题的业务场景，比如：

- 同一套组件服务多个品牌
- 官网、活动页、国际站需要不同主题
- 明确支持 dark mode / high contrast mode
- 设计体系进入频繁升级阶段，需要并行维护旧版和新版

在这种情况下，先维护一套稳定的 `v1 token` 是最合理的，复杂度低，也最符合当前业务规模。

#### 后续为什么可能会有多个版本

当项目继续演进，token 很可能会从“一版”扩展成“多版本”。

常见触发点包括：

- 品牌升级，主色、排版、按钮体系整体变更
- 新增活动页或专题站，需要更强视觉差异
- 海外站、本地化站点出现不同品牌调性
- 后台系统和官网系统希望共享部分设计资产，但又保留各自主题
- 引入深色模式、无障碍高对比模式

一旦进入这个阶段，token 就应该做真正的版本化管理。

#### 如果后续做多版本，我会怎么设计

我会建议把 token 体系分成“稳定语义层”和“可替换主题层”。

第一，尽量保持语义 token 名称稳定。

比如始终保留：

- `primary`
- `surface`
- `text`
- `border`
- `success`
- `warning`

这样组件代码不需要跟着主题版本频繁改名。

第二，让不同版本只替换底层值。

例如：

- `v1` 用当前这套品牌青绿色
- `v2` 换成新的品牌色和更现代的中性色
- `campaign` 用更强烈的活动色

第三，把版本管理做成明确目录或配置文件。

比如未来可以演进成：

```text
tokens/
  v1/
    light.ts
    motion.ts
  v2/
    light.ts
    motion.ts
  shared/
    semantic.ts
```

或者继续用 CSS 方式管理：

```css
:root[data-theme='v1'] { ... }
:root[data-theme='v2'] { ... }
:root[data-theme='campaign'] { ... }
```

第四，给 token 变化引入版本语义。

我会按类似语义化版本的思路管理：

- `major`：语义名变化、视觉体系大改、可能影响组件表现
- `minor`：新增 token，不破坏已有语义
- `patch`：修正个别颜色值、间距值、阴影参数

这样团队在升级 token 时，就知道这次变更是“小修”还是“系统升级”。

#### 这部分最适合怎么对外表达

如果在面试里回答，我会建议用下面这句来收口：

“我做的 Design Token，本质上是把品牌色、语义色、排版、间距、圆角和动效这些设计决策抽象成统一变量，让页面不再依赖散落的具体样式值。当前项目已经有一套稳定的 token，可视为 `v1`，只是还没有做成显式版本目录；随着品牌升级、活动主题和多端场景增加，后续完全可以演进成多版本 token 体系，而组件层只依赖稳定的语义 token，不需要跟着主题频繁重写。” 

### Q004 你提到了组件化设计，请你描述一下，你用了哪些组件化设计，为什么要把这些组件化，具体的实现过程是什么样的？

回答：

这个项目的组件化设计，不是典型后台系统里那种“从 Button、Input、Dialog 一路原子化”的路线，而是更偏向官网和内容站常用的“按页面区块和业务域拆分”。

更准确地说，我采用的是三层组件化：

- 布局级组件
- 页面 section 级组件
- 局部复用级组件

这种拆法比纯原子组件库更适合当前项目，因为它的核心复杂度不在表单状态，而在品牌表达、内容组织、视觉区块复用和不同数据源装配。

#### 我用了哪些组件化设计

> 页面是由多个组件拼成的，天然可以分为多个组件，
>
> 在component中进行组件设计
>
> 在page中进行页面的seo配置和组件的拼装
>
> - 根据响应式动态拼装
> - 考虑组件是否懒加载
>
> 局部复用组件分离

第一类是布局级组件。

这类组件负责整站公共框架，不关心某个页面的具体业务内容，主要包括：

- `LayoutNavbar`
- `LayoutBulletin`
- `LayoutFullMenu`
- `LayoutBottomNav`
- `LayoutNewsletterSubscription`
- `LayoutFooter`

它们集中在 `app/components/layout`，并由：

- `app/layouts/default.vue`
- `app/layouts/mobile.vue`

统一装配。

这种设计的作用很明确：

- 把导航、公告、菜单、页脚、订阅这些“全站公共壳”从页面里抽离出去
- 让桌面端和移动端拥有不同的布局组合
- 让页面文件保持聚焦，不去承担全局壳层逻辑

比如桌面布局里统一挂：

- 顶部导航
- 页面内容
- 订阅区
- 页脚

而移动端布局则换成底部导航加订阅区，这就是比较典型的“布局级组件化”。

第二类是页面 section 级组件。

这是当前项目最核心的一层组件化，也是占比最多的一层。它的思路是：一个页面由多个相对独立的内容区块组成，每个区块拆成一个 section 组件，由页面负责装配。

首页相关组件在 `app/components/index`：

- `HeroAuditFlow`
- `ProductMatrixSection`
- `ProductMobileSection`
- `PartnersSection`
- `PartnersCard`
- `MediaTypeCard`
- `CelestialAuditCard`
- `NeuralBrain`

解决方案页相关组件在 `app/components/solution`：

- `HeroSection`
- `PainPointsSection`
- `MethodologySection`
- `ProductMatrixSection`
- `ResultsComparisonSection`
- `ImplementationSection`
- `CTASection`

招聘页相关组件在 `app/components/join`：

- `Hero`
- `FeaturedJobs`
- `MissionVision`
- `Values`
- `GlobalPresence`
- `ContentArea`
- `QuickClicks`

产品详情页相关组件在 `app/components/product`：

- `SectionHero`
- `SectionValue`
- `SectionFunctions`
- `SectionPerformance`
- `SectionProblems`
- `SectionScenarios`
- `SideNav`
- `ScenarioSvg`

这层组件的特点是：

- 粒度比原子组件大
- 每个组件都对应一个完整的页面区块
- 页面只是把这些 section 组件像积木一样组起来

比如解决方案页在 `app/pages/solution/index.vue` 里，本身几乎不写具体 UI，而是顺序装配：

- Hero
- Pain Points
- Methodology
- Product Matrix
- Results Comparison
- Implementation
- CTA

这就是非常典型的 section-based component design。

第三类是局部复用级组件。

这类组件不是全站布局，也不是整块 section，而是某个 section 内部反复出现的单元。比如：

- `PartnersCard`
- `MediaTypeCard`
- `HubBrick`
- `StackedCard`

例如招聘页里的 `StackedCard`，就是把职位翻转卡片单独抽成了可复用单元。这样一来，职位展示区不需要反复复制同样的 3D 卡片结构，只需要传：

- `job`
- `image`
- `index`

它就能完成视觉和交互渲染。

#### 为什么要把这些内容组件化

原因可以从业务、工程和协作三个角度来讲。

第一，页面天然就是区块化的。

企业官网和内容站的页面，并不是一个整体的大表单，而是由多个内容版块拼起来的，比如：

- 首屏
- 产品矩阵
- 合作伙伴
- 方法论
- 招聘文化
- 新闻卡片

如果把这些区块全部写在一个页面文件里，文件会非常长，视觉结构和数据结构会混在一起，维护成本会快速上升。

第二，页面级组件化更符合官网场景。

官网类项目很多区块并不追求“跨页面无限复用”，但它们需要：

- 独立演进
- 独立改版
- 独立调样式
- 独立插入动效

所以把它们拆成 section 组件，比强行抽成一堆粒度很小的原子组件更实用。

第三，可以把职责切开。

我在这个项目里刻意让不同层只做自己该做的事：

- 页面负责路由、SEO、数据装配
- composable 负责取数和结构化数据
- section 组件负责展示和局部交互
- 局部复用组件负责重复片段

这样做的好处是，后续无论改 SEO、换数据源、重做某个区块，影响面都更可控。

第四，更适合多人协作和 AI 协作。

当一个页面被拆成多个 section 组件后：

- 不同人可以并行改不同区块
- AI 可以在更清晰的上下文里生成单个区块代码
- 代码 review 也更容易聚焦到具体模块

这在官网项目里特别重要，因为页面视觉改动往往很频繁。

第五，更利于响应式分化。

项目里不是简单地靠几条媒体查询硬撑所有布局，而是在必要时直接拆了不同组件，比如首页：

- 桌面端用 `IndexProductMatrixSection`
- 移动端用 `IndexProductMobileSection`

这说明组件化还承担了“不同终端展示策略分离”的作用。

#### 具体实现过程是什么样的

如果把整个实现过程抽象成步骤，大概是下面这条链路。

第一步，先按路由确定页面级职责。

页面文件只保留：

- 路由参数处理
- SEO 配置
- 数据获取和数据装配
- section 组件编排

比如：

- `app/pages/index.vue` 主要负责首页组装
- `app/pages/solution/index.vue` 负责把 `SolutionData` 传给各个 section
- `app/pages/join/index.vue` 负责把招聘页各 section 串起来
- `app/pages/product/[slug].vue` 负责根据路由参数取产品数据，并决定显示哪些 section

第二步，把稳定的视觉区块抽成 section 组件。

只要一个页面区域同时满足下面几个条件，我通常就会把它抽出去：

- 在视觉上是完整区块
- 可能独立改版
- 有自己的数据输入
- 有自己的局部交互

比如解决方案页里的 `MethodologySection`，它只接收 `architecture` 数据，然后负责把数据渲染成四列方法论卡片。这个组件的输入和职责都很清晰，所以非常适合独立成 section。

第三步，让页面向下传数据，而不是把数据写死在组件里。

这一步很关键。section 组件一般通过 `defineProps` 接收数据，例如：

- `SolutionMethodologySection` 接收 `architecture`
- `SolutionResultsComparisonSection` 接收 `comparisonData`
- `ProductSectionHero` 接收 `heroData`
- `ProductSectionValue` 接收 `valueData`

这样组件不会和页面数据源强耦合，后续换成本地数据、CMS 数据或服务端数据都更灵活。

第四步，把重复出现的内部单元继续抽小。

当我发现某个 section 内有重复出现的卡片、图块、媒体单元时，就会继续拆出局部复用组件。例如：

- 合作伙伴区域里的 `PartnersCard`
- 首页媒体类型表达里的 `MediaTypeCard`
- 招聘页里的 `StackedCard`

这样做能避免 section 组件本身变成新的“大文件”。

第五步，把跨页面基础能力沉到 layout 或 composable。

例如：

- 导航、公告、页脚不放到页面里，而是沉到 layout 体系
- 产品数据访问抽到 `useProductById`
- SEO 抽到 `usePageSeo`

这样 section 组件就能更专注于页面表达，而不是背负全局逻辑。

#### 这个项目里最典型的几个实现例子

例子一：首页装配式组件化。

`app/pages/index.vue` 本身很轻，核心是：

- 配置首页 SEO
- 渲染 `IndexHero`
- 根据端侧切换产品矩阵组件
- 渲染合作伙伴区

这说明首页页面文件本身是“装配层”，而不是“实现层”。

例子二：解决方案页的数据驱动 section 化。

`app/pages/solution/index.vue` 从 `SolutionData` 中拿数据，然后传给：

- `SolutionPainPointsSection`
- `SolutionMethodologySection`
- `SolutionResultsComparisonSection`
- `SolutionImplementationSection`

页面不关心具体卡片怎么画，而 section 组件只关心自己那块怎么展示数据。

例子三：产品详情页的“页面逻辑上移，UI 分段下沉”。

`app/pages/product/[slug].vue` 这一页承担了更多页面级逻辑：

- 从路由里取 `slug`
- 校验产品 id
- 通过 `useProductById` 获取产品数据
- 用 `IntersectionObserver` 管理当前激活 section
- 配置页面 SEO 和结构化数据

但真正的 UI 还是拆给了：

- `ProductSideNav`
- `ProductSectionHero`
- `ProductSectionValue`
- `ProductSectionFunctions`
- `ProductSectionPerformance`
- `ProductSectionProblems`
- `ProductSectionScenarios`

这正是我在官网项目里很常用的一种组件化方式：把页面级控制逻辑放上层，把视觉区块放下层。

例子四：招聘页里的局部复用组件。

招聘页不只是简单 section 化，还进一步把职位卡片做成了 `StackedCard`。这类组件适合承载：

- 固定的视觉结构
- 相同的交互模式
- 小范围复用

这样不仅让 section 更干净，也方便后续单独重做卡片视觉。

#### 这样设计的亮点是什么

我认为这套组件化设计最大的亮点有四个。

第一，结构清晰提高代码可读性和可维护性。

页面负责装配，composable 负责取数，section 负责展示，局部组件负责复用，这样结构非常利于后续持续演进。

第二，兼顾了复用和定制。

有些区块是强业务定制的，就做 section；有些内部单元确实重复，就继续下沉成复用组件，没有强行一刀切。

第三，很适合品牌站和内容站的演进节奏。

官网项目最常见的需求不是“这个按钮要不要通用”，而是“这一个区块要改版、换文案、换视觉、加动效”。按区块组件化，会让这种需求处理起来非常顺手。

#### 一句话总结

如果让我用一句适合面试表达的话来总结，我会这样说：

“这个项目的组件化设计不是走纯原子组件库路线，而是采用了布局级组件、页面 section 级组件和局部复用组件三层拆分。页面文件只负责路由、SEO 和数据装配，真正的视觉区块下沉到业务域组件里，重复单元再进一步抽成小组件。这种设计特别适合 Nuxt 官网场景，因为它既保证了页面结构清晰，又兼顾了视觉区块独立演进、数据驱动和多人协作效率。” 

### Q005 组件函数和组件化的区别，composable 的作用是什么？你实现了哪些组件函数？具体是什么？

回答：

这里我先把概念说准一点。

在 Vue / Nuxt 里，比较标准的说法通常不是“组件函数”，而是：

- 组件化
- composable，也就是组合式函数

如果一定要对应你说的“组件函数”，那它更接近 `composable`，而不是“组件本身”。

#### 组件化和 composable 的区别是什么

它们最大的区别在于：一个解决“界面怎么拆”，一个解决“逻辑怎么复用”。

组件化主要解决的是视图结构问题。

比如这个项目里我把页面拆成：

- `LayoutNavbar`
- `SolutionHeroSection`
- `JoinFeaturedJobs`
- `ProductSectionHero`

这些 `.vue` 文件本质上都是组件，负责：

- 页面结构
- 模板渲染
- 样式和交互表现

所以组件化的重点是“把 UI 拆开”。

而 composable 解决的是逻辑复用问题。

它通常是 `useXxx()` 这种函数，用来抽离：

- 共享状态
- 数据获取
- SEO 逻辑
- 结构化数据构造
- 与 Nuxt 生命周期相关的能力

所以 composable 的重点是“把逻辑抽开”。

可以把它们理解成：

- 组件：负责长什么样
- composable：负责怎么取数据、怎么组织状态、怎么注入能力

#### composable 的作用是什么

composable 在这个项目里主要承担四类作用。

第一，抽共享状态和环境判断。

例如：

- 当前是不是移动端
- 当前应该走哪套布局

第二，抽数据访问和数据裁剪逻辑。

例如：

- 岗位列表只取哪些字段
- 产品导航只要哪些基础信息
- 产品详情页如何按 id 取完整产品数据

第三，抽页面级工程能力。

例如：

- 全站 SEO 默认值
- 页面级 meta
- canonical
- robots
- JSON-LD 结构化数据

第四，降低页面和组件的耦合。

页面和组件最好不要直接自己拼所有逻辑，否则每个页面都会越来越重。把这些逻辑放到 composable 里之后，页面文件可以只做装配，组件只做展示。

#### 组件化和 composable 在项目里是怎么配合的

这两个概念在项目里不是二选一，而是配合使用的。

最典型的模式是：

- 页面负责路由和装配
- composable 负责取数和工程逻辑
- 组件负责展示

比如产品详情页：

- 页面 `app/pages/product/[slug].vue` 负责读取路由参数、校验产品 id、配置 SEO
- `useProductById()` 负责把对应产品数据拿出来
- `ProductSectionHero`、`ProductSectionValue`、`ProductSectionFunctions` 这些组件负责把数据渲染出来

这就体现出两者的边界非常清楚：

- 组件化拆界面
- composable 拆逻辑

#### 这个项目里实现了哪些 composable

当前 `app/composables` 目录下，已经实现了五组核心能力。

#### `useDevice`

文件：

- `app/composables/useDevice.ts`

核心作用：

- 判断当前是否为移动端
- 通过 `useState('isMobile')` 维护共享端侧状态

具体实现：

- 先读取请求头里的 `user-agent`
- 用正则判断是否属于移动设备
- 返回 `isMobile`

这个 composable 的价值是让“设备判断”不必散落在每个页面里。

当前主要使用位置包括：

- `app/app.vue`：决定页面走 `mobile` 还是 `default` layout
- `app/components/join/ContentArea.vue`：决定资讯卡片显示 1 个还是 3 个
- `app/components/join/Hero.vue` 等组件：做端侧差异化展示

所以 `useDevice()` 本质上是“环境状态 composable”。

#### `useAllJobsWithFields`

文件：

- `app/composables/useJob.ts`

核心作用：

- 封装招聘内容查询
- 支持只取指定字段
- 支持排序和 limit
- 通过带参数的 key 避免 `useAsyncData` 缓存串数据

具体实现：

- 参数里传 `fields`
- 可选传 `sortBy`、`order`、`limit`
- 内部通过 `queryCollection('jobs')`
- 动态调用 `.select(...fields).order(...)`
- 最后返回 `useAsyncData(...)`

这个 composable 的亮点在于，它不是简单“查所有岗位”，而是把：

- 字段裁剪
- 排序
- 限制条数
- 缓存 key 设计

都一起抽象掉了。

当前主要使用位置包括：

- `app/pages/jobs/index.vue`：职位列表页
- `app/components/join/FeaturedJobs.vue`：招聘页精选岗位
- `app/components/join/Hero.vue`：招聘页首屏岗位信息

所以它本质上是“内容查询 composable”。

#### `useProductHeader`

文件：

- `app/composables/useProduct.ts`

核心作用：

- 从 `ProductData` 里提取产品导航需要的最小信息

返回内容主要包括：

- `id`
- `name`
- `alias`

它的目的不是拿完整产品数据，而是给导航、页脚、菜单这种“轻量展示场景”提供简化数据。

当前使用位置包括：

- `app/components/layout/BottomNav.vue`
- `app/components/layout/FullMenu.vue`
- `app/components/layout/Footer.vue`

所以它本质上是“产品导航数据裁剪函数”。

#### `useProductBaseInfo`

文件：

- `app/composables/useProduct.ts`

核心作用：

- 提取产品矩阵场景需要的基础信息

返回内容主要包括：

- `id`
- `icon`
- `name`
- `alias`
- `positioning`

这个函数主要服务于产品概览、产品矩阵和移动端产品列表，而不是详情页。

当前使用位置包括：

- `app/components/index/ProductMatrixSection.vue`
- `app/components/index/ProductMobileSection.vue`

所以它属于“产品概要数据 composable”。

#### `useProductByParams`

文件：

- `app/composables/useProduct.ts`

核心作用：

- 让调用方按需声明想要哪些产品字段
- 返回只包含这些字段的数据集合

这比写多个固定函数更灵活，因为不同页面关注的产品字段组合并不一样。

例如解决方案页里的产品矩阵，并不需要完整产品详情，只需要：

- 名称
- 分类
- 图标
- 卖点
- 目标用户
- 价值定位

这时就可以通过 `useProductByParams([...])` 精准获取。

当前使用位置包括：

- `app/components/solution/ProductMatrixSection.vue`

所以它本质上是“按字段投影产品数据的 composable”。

#### `useProductById`

文件：

- `app/composables/useProduct.ts`

核心作用：

- 根据产品 id 返回完整产品详情对象

它服务的是详情页和强数据场景，是产品数据里最直接的读取入口。

当前使用位置最典型的是：

- `app/pages/product/[slug].vue`

页面先根据路由拿到 `slug`，再调用 `useProductById()`，然后把结果分发给：

- `ProductSectionHero`
- `ProductSectionValue`
- `ProductSectionFunctions`
- `ProductSectionProblems`
- `ProductSectionScenarios`

所以它属于“产品详情读取 composable”。

#### `useSiteSeo`

文件：

- `app/composables/useSIteSeo.ts`

核心作用：

- 统一全站 SEO 默认配置
- 设置全站描述、站点名、默认分享图
- 设置 `html lang`
- 设置标题模板
- 注入全站级 `Organization` 和 `WebSite` JSON-LD

这个 composable 主要在应用根部调用，让站点级 SEO 只定义一次。

当前最典型的使用位置：

- `app/app.vue`

所以它是“全站 SEO composable”。

#### `usePageSeo`

文件：

- `app/composables/useSIteSeo.ts`

核心作用：

- 封装页面级 SEO 设置
- 根据传入配置统一设置 `title`
- `description`
- `keywords`
- `og:*`
- `twitter:*`
- `canonical`
- `robots`
- 页面级结构化数据

这个函数非常重要，因为它把每个页面的 SEO 逻辑统一收口了。

当前几乎所有页面都在使用它，比如：

- 首页
- 新闻列表和详情
- 招聘列表和详情
- 产品详情
- 联系页
- 解决方案页

所以它本质上是“页面 SEO 管理 composable”。

#### `seoConfig`

严格来说，`seoConfig` 不是 composable，而是一组 SEO 配置工厂。

它的作用是把不同页面类型的 SEO 配置模板化，例如：

- `home()`
- `product(...)`
- `jobs()`
- `jobDetail(job)`
- `news(...)`
- `newsDetail(...)`
- `contact()`
- `solution()`

这样页面不需要每次手写完整 meta，只需要传业务参数即可。

所以如果讲得更准确一点，它属于“SEO 配置工厂”，不是严格意义上的 composable，但它和 `usePageSeo` 组合在一起使用。

#### `useJsonLd`

文件：

- `app/composables/useSeoStructuredData.ts`

核心作用：

- 把结构化数据统一注入到页面 `head`

它接收一个或多个 JSON-LD 节点，然后通过 `useHead()` 输出：

- `application/ld+json`

这个函数本质上是“结构化数据注入 composable”。

#### JSON-LD 创建函数

同样在 `app/composables/useSeoStructuredData.ts` 里，我还实现了一组结构化数据构造函数。

包括：

- `createOrganizationJsonLd()`
- `createWebsiteJsonLd()`
- `createBreadcrumbJsonLd()`
- `createProductJsonLd()`
- `createArticleJsonLd()`
- `createJobPostingJsonLd()`
- `createCollectionPageJsonLd()`
- `createWebPageJsonLd()`
- `normalizeDate()`

这里也要说准确一点：

- `useJsonLd()` 属于 composable
- `createXxxJsonLd()` 更偏纯函数 / helper

它们本身不管理状态，也不直接依赖组件模板，而是负责把业务数据转换成标准 schema.org 结构。

例如：

- 产品详情页使用 `createProductJsonLd()`
- 新闻详情页使用 `createArticleJsonLd()`
- 招聘详情页使用 `createJobPostingJsonLd()`
- 列表页使用 `createCollectionPageJsonLd()`
- 所有详情页和列表页可以配合 `createBreadcrumbJsonLd()`

所以这一组更像“SEO 结构化数据函数库”。

#### 可以怎么总结这两者的区别

如果让我用一句话区分，我会这样说：

“组件化是把页面 UI 拆成可以组合的视图单元，而 composable 是把跨组件共享的状态、数据获取和工程逻辑抽成可复用函数。这个项目里，组件负责页面区块展示，composable 负责设备判断、招聘数据查询、产品数据裁剪和 SEO / JSON-LD 能力，两者配合起来，才让页面既清晰又可维护。” 

### Q006 你的 SEO 工程化是如何设计的？你的生成器是什么结构，有什么亮点吗？

回答：

这个项目里的 SEO 不是“每个页面手写一堆 meta”，而是按工程能力拆成了几层统一管理。

我会把它概括成四层：

- 全站默认层
- 页面执行层
- 生成器层
- 抓取入口层

这样设计的目的，是让 SEO 不再依赖单页手工维护，而是变成一套可复用、可扩展、可验证的工程机制。

#### SEO 工程化整体是怎么设计的

第一层是全站默认层。

这一层由 `useSiteSeo()` 负责，核心在：

- 统一站点名
- 统一站点描述
- 统一默认分享图
- 统一 `html lang`
- 统一标题模板
- 统一全站级结构化数据

在实现上，它会从运行时配置里拿：

- `siteUrl`
- `defaultOgImage`

然后统一设置：

- `description`
- `ogSiteName`
- `ogType`
- `ogUrl`
- `twitterCard`

同时注入全站级：

- `Organization`
- `WebSite`

JSON-LD。

这一层的作用是：不管页面有没有额外配置，站点至少先拥有一套稳定、完整、不会漏掉的 SEO 默认值。

第二层是页面执行层。

这一层由 `usePageSeo()` 负责。它不是直接产出内容模板，而是负责把“某个页面的 SEO 配置”真正写进 head。

它主要做几件事：

- 设置页面 `title`
- 设置 `description` 和 `keywords`
- 设置 Open Graph 和 Twitter 卡片
- 把图片统一转成绝对 URL
- 根据 `path` 自动生成 canonical
- 根据 `noindex` / `nofollow` 生成 robots
- 接收并注入页面级 JSON-LD

也就是说，`usePageSeo()` 更像是一个 SEO 执行器。

第三层是生成器层。

这层才是你问的“生成器”核心，它实际上分成了两组：

- `seoConfig`：页面 meta 配置生成器
- `createXxxJsonLd()`：结构化数据生成器

第四层是抓取入口层。

这一层不是 meta，而是给搜索引擎提供：

- `robots.txt`
- `sitemap.xml`

项目里这两部分都已经服务端化了，说明 SEO 工程化不只停留在 head 标签层面，而是把抓取入口也纳入了体系。

#### 我的生成器是什么结构

如果专门讲“生成器结构”，我会说这套设计是：

- 类型约束
- 配置工厂
- 注入执行器
- 结构化数据函数库

这四部分拼起来的。

#### 生成器的第一层：类型约束

在 `app/types/seoType.ts` 里，我先定义了统一的输入契约：

- `SeoMeta`
- `PageSeoConfig`
- `StructuredDataNode`

这一步很关键，因为它把 SEO 输入从“随便传对象”变成了有边界的工程接口。

例如：

- `SeoMeta` 负责描述标题、描述、关键词、OG、Twitter、发布时间、栏目等信息
- `PageSeoConfig` 负责描述 `path`、`canonical`、`noindex`、`nofollow` 和 `structuredData`

这意味着页面在调用时，传什么、可选什么、哪些字段用于 meta、哪些字段用于控制抓取，都是明确的。

这也是我认为 SEO 工程化里非常重要的一点：先把输入模型稳定下来。

#### 生成器的第二层：`seoConfig` 配置工厂

`seoConfig` 的本质，不是直接改 head，而是根据页面类型生成标准化的 SEO 配置。

目前已经实现的配置工厂包括：

- `home()`
- `product(...)`
- `jobs()`
- `jobDetail(job)`
- `news(categories)`
- `newsDetail(...)`
- `contact()`
- `solution()`
- `develop()`

这种设计的意思是：

- 页面不用自己拼一整套 meta
- 同类页面共享统一模板
- 页面只传业务变量，比如产品名、新闻摘要、发布时间

例如产品详情页只需要传：

- 产品名
- 卖点
- 描述
- 图片

就能产出一套完整的产品页 SEO 配置。

所以 `seoConfig` 这一层更像“面向页面类型的元信息生成器”。

#### 生成器的第三层：`usePageSeo` 注入执行器

我刻意没有让页面直接去写 `useSeoMeta()` 和 `useHead()`，而是统一收口到 `usePageSeo()`。

它的结构大致是：

1. 先调用 `useSiteSeo()` 拿到全站默认值
2. 计算当前页面的 meta 合并结果
3. 处理 OG / Twitter 的回退逻辑
4. 统一把图片和链接转成绝对地址
5. 自动输出 canonical
6. 自动输出 robots
7. 如有结构化数据，再统一注入 JSON-LD

这样做有两个好处：

- 页面层调用非常简单
- SEO 行为不会在多个页面里发散

所以这一层本质上是“统一执行入口”。

#### 生成器的第四层：JSON-LD 结构化数据函数库

在 `useSeoStructuredData.ts` 里，我又拆出了一套结构化数据生成器。

这里有两类函数。

第一类是注入器：

- `useJsonLd()`

它负责把结构化数据写入：

- `application/ld+json`

脚本节点。

第二类是创建器：

- `createOrganizationJsonLd()`
- `createWebsiteJsonLd()`
- `createBreadcrumbJsonLd()`
- `createProductJsonLd()`
- `createArticleJsonLd()`
- `createJobPostingJsonLd()`
- `createCollectionPageJsonLd()`
- `createWebPageJsonLd()`

这组函数的特点是：

- 输入是业务数据
- 输出是标准 schema.org 结构
- 页面不直接拼 JSON

这样一来，页面只需要表达“我这个页面是什么类型”，不需要自己手写 schema 格式。

#### 这套 SEO 工程化的典型调用链路

如果从页面视角看，一次 SEO 注入大概是这样的：

1. 页面调用 `seoConfig.xxx(...)` 生成本页 SEO 内容
2. 页面再调用 `usePageSeo(config, pageConfig)`
3. 如果需要结构化数据，就传 `structuredData`
4. `usePageSeo()` 统一生成 meta / canonical / robots
5. `useJsonLd()` 再把 JSON-LD 写进 head

比如：

- 首页会走 `seoConfig.home()` + `createWebPageJsonLd()`
- 新闻详情会走 `seoConfig.newsDetail(...)` + `createArticleJsonLd()` + `createBreadcrumbJsonLd()`
- 产品详情会走 `seoConfig.product(...)` + `createProductJsonLd()` + `createBreadcrumbJsonLd()`
- 职位详情会走 `seoConfig.jobDetail(job)` + `createJobPostingJsonLd()`

这就是非常典型的“配置生成 -> 统一执行 -> 结构化数据补充”的链路。

#### 这套生成器的亮点是什么

我认为这套设计最大的亮点有六个。

第一，分层很清晰。

很多项目的 SEO 会把：

- 默认值
- 页面值
- JSON-LD
- 抓取规则

全都散落在页面里。这个项目把它们拆成了：

- 全站默认
- 页面执行
- 配置工厂
- JSON-LD 函数库
- 抓取入口

这样职责非常清楚。

第二，页面调用成本低。

页面只需要：

- 调一个 `seoConfig.xxx(...)`
- 再调一个 `usePageSeo(...)`

不需要每次手写完整的 meta 组合逻辑。这会让 SEO 能力真正被“稳定使用”，而不是“知道该做但经常漏做”。

第三，支持按页面类型复用。

产品页、新闻页、职位页、本质上是不同内容模型。用 `seoConfig` 做页面类型工厂后，不同页面之间既可以共享规则，又可以保留各自字段差异。

第四，结构化数据不是附属品，而是正式纳入生成器体系。

很多项目只做 title 和 description，但这里把：

- `Product`
- `NewsArticle`
- `JobPosting`
- `BreadcrumbList`
- `CollectionPage`

都抽成标准函数了，这说明结构化数据已经不是“可选增强”，而是工程能力的一部分。

第五，绝对 URL 和兜底逻辑做得比较完整。

在执行层里，像：

- OG 图片
- Twitter 图片
- `ogUrl`
- canonical

都会统一转成绝对 URL，而且有默认图和默认值回退。这种细节很容易在 SEO 里被忽略，但实际上非常重要。

第六，SEO 已经覆盖到抓取基础设施。

项目不仅有页面 meta，还有：

- `robots.txt`
- `sitemap.xml`

并且 `sitemap.xml` 不是写死的，它会动态整合：

- 静态路由
- 产品详情页
- Markdown 岗位详情页
- WordPress 新闻详情页

这说明 SEO 体系已经从“页面标签优化”走到了“搜索引擎抓取链路设计”。

#### 如果专门讲抓取入口层，有什么特点

`robots.txt` 的作用比较直接：

- 允许全站抓取
- 禁止 `/develop`
- 声明站点 host
- 指向 sitemap

而 `sitemap.xml` 更有工程味，它会组合多种内容源：

- 固定页面直接列出
- 产品通过 `ProductId` 枚举生成
- 招聘通过 `queryCollection('jobs')` 生成
- 新闻通过 WordPress API 拉取后生成

这和项目的多数据源架构是对应上的，也说明 SEO 工程化不是孤立存在，而是和数据源设计联动的。

#### 这套设计最适合怎么总结

如果让我用一句适合面试表达的话来总结，我会这样说：

“我的 SEO 工程化设计不是让页面各自写 meta，而是拆成了全站默认层、页面执行层、配置生成器层和抓取入口层。页面先通过 `seoConfig` 生成标准化 SEO 配置，再由 `usePageSeo` 统一注入 meta、canonical、robots，并通过 `createXxxJsonLd` 生成结构化数据，最后再由 `robots.txt` 和 `sitemap.xml` 完成抓取入口建设。它的亮点在于分层清晰、页面调用成本低、支持不同内容模型复用，并且把 JSON-LD 和 sitemap 也纳入了正式工程体系。” 

### Q007 你的性能优化的结果是什么？用了哪些指标？这些指标的含义是什么？最终结果是多少？

已知结果：

- `First Contentful Paint`: `0.8s`
- `Largest Contentful Paint`: `0.9s`
- `Total Blocking Time`: `0ms`
- `Cumulative Layout Shift`: `0.002`
- `Speed Index`: `0.8s`

回答：

这次性能优化的结果可以概括成一句话：

“页面首屏渲染很快、主线程几乎没有阻塞、视觉稳定性很好，整体已经达到非常优秀的前端性能水平。”

#### 我主要看了哪些指标

这次主要使用的是五个核心指标：

- `First Contentful Paint`
- `Largest Contentful Paint`
- `Total Blocking Time`
- `Cumulative Layout Shift`
- `Speed Index`

这些指标分别覆盖了：

- 用户什么时候第一次看到页面内容
- 什么时候看到最主要内容
- 页面加载阶段有没有卡顿
- 页面展示过程中会不会乱跳
- 整体可视内容完成得快不快

所以它们组合起来，能比较完整地反映首屏体验、交互流畅度和视觉稳定性。

#### 这些指标分别是什么意思

#### `First Contentful Paint (FCP)`

含义：

- 浏览器第一次把文本、图片、SVG 或 canvas 等“实际内容”渲染出来的时间

它回答的问题是：

- 用户什么时候第一次看见页面不是白屏

本次结果：

- `0.8s`

说明：

- 页面在 `0.8` 秒时就已经有实际内容显示出来了
- 首屏“出内容”非常快

#### `Largest Contentful Paint (LCP)`

含义：

- 首屏可视区域里，最大内容元素完成渲染的时间

通常它衡量的是：

- 首屏主视觉
- 大标题
- Hero 图
- 关键大图卡片

它回答的问题是：

- 用户什么时候真正看到页面最重要的主体内容

本次结果：

- `0.9s`

说明：

- 最大主内容几乎在 1 秒内完成渲染
- 说明这次优化不仅让页面“先出内容”，而且让“最关键内容”也非常快地完成展示

#### `Total Blocking Time (TBT)`

含义：

- 页面从开始可交互前后，主线程被长任务阻塞的总时间

它反映的是：

- JS 执行会不会太重
- 页面会不会看起来出来了，但用户操作时仍然卡住

本次结果：

- `0ms`

说明：

- 基本没有明显的长任务阻塞主线程
- 页面在加载阶段几乎没有脚本执行造成的卡顿
- 这通常意味着 JS 体量、执行时机和主线程调度控制得比较好

#### `Cumulative Layout Shift (CLS)`

含义：

- 页面在加载过程中发生布局跳动的累计程度

它回答的问题是：

- 用户正在看内容时，页面会不会突然抖一下、按钮突然移位、图片加载后把内容顶开

本次结果：

- `0.002`

说明：

- 这个值非常低，几乎可以认为页面视觉非常稳定
- 用户在浏览过程中基本不会遇到“点错按钮”或“内容被挤走”的问题

#### `Speed Index (SI)`

含义：

- 页面可视区域内容被逐步填充完成的速度

它不是只看某一个点，而是关注：

- 整个首屏看起来变完整的过程快不快

本次结果：

- `0.8s`

说明：

- 页面整体的可视完成速度很快
- 用户会感觉页面不是“慢慢补齐”，而是很快进入完整可阅读状态

#### 最终结果分别是多少

这次性能结果可以直接总结为：

- `FCP = 0.8s`
- `LCP = 0.9s`
- `TBT = 0ms`
- `CLS = 0.002`
- `Speed Index = 0.8s`

#### 通常这些指标在什么范围内算优秀

如果按 Google `web.dev` 和 Lighthouse 的常见标准来看，通常可以把下面这些范围视为“良好”或“优秀”：

- `FCP <= 1.8s`：优秀；`1.8s ~ 3.0s`：需要优化；`> 3.0s`：较差
- `LCP <= 2.5s`：优秀；`2.5s ~ 4.0s`：需要优化；`> 4.0s`：较差
- `TBT <= 200ms`：优秀（Lighthouse 移动端标准）；`200ms ~ 600ms`：需要优化；`> 600ms`：较差
- `CLS <= 0.1`：优秀；`0.1 ~ 0.25`：需要优化；`> 0.25`：较差
- `Speed Index <= 3.4s`：优秀（Lighthouse 移动端标准）；`3.4s ~ 5.8s`：需要优化；`> 5.8s`：较差

如果按 Lighthouse 桌面端标准去看，`TBT` 和 `Speed Index` 的优秀阈值会更严格一些：

- `TBT <= 150ms`
- `Speed Index <= 1.3s`

所以从这个对照关系看，你这次的结果：

- `FCP 0.8s`
- `LCP 0.9s`
- `TBT 0ms`
- `CLS 0.002`
- `Speed Index 0.8s`

无论按常见移动端阈值还是桌面端阈值来看，都落在非常优秀的区间内。

#### 这些结果说明了什么

如果把这些指标合在一起解读，可以得到三个很明确的结论。

第一，首屏加载速度非常快。

因为：

- `FCP` 很低
- `LCP` 也很低
- `Speed Index` 同样很低

这说明用户进入页面后，几乎在 1 秒内就能看到主要内容，而不是长时间等待白屏或骨架屏。

第二，页面加载阶段基本没有卡顿。

因为：

- `TBT = 0ms`

这说明主线程没有明显长任务，页面在可见的同时也具备良好的交互流畅度。

第三，页面视觉稳定性非常好。

因为：

- `CLS = 0.002`

这几乎已经接近“没有布局抖动”的状态，说明图片尺寸预留、模块占位和异步内容插入处理得比较到位。

#### 如果要给出最终评价

如果从项目复盘或面试表达角度，我会这样总结：

“这次性能优化后的结果非常好，`FCP 0.8s`、`LCP 0.9s`、`TBT 0ms`、`CLS 0.002`、`Speed Index 0.8s`。这些指标说明页面首屏内容出现快、核心内容加载快、主线程没有明显阻塞、布局几乎不抖动，整体已经达到了优秀的前端性能体验水平。”

#### 如果要再补一句优化价值

还可以补上一句更偏业务表达的话：

“这类结果意味着用户进入页面后能更快看到内容、更快进入阅读和操作状态，同时不会因为卡顿和布局跳动影响体验，这对官网转化、SEO 和整体品牌体验都是正向的。” 

### Q008 你提到了利用 `rAF` 和一些策略消除切换白屏与布局抖动，具体是怎么实现的？

回答：

这里我会先把一个边界讲清楚：

严格说，`rAF` 不是“消除切换白屏”的唯一手段，它主要负责的是让连续动画和平滑位移跟随浏览器绘制节奏执行；真正把切换白屏和布局抖动压下去，核心靠的是一组组合策略：

- 用过渡叠层避免切换时容器瞬间空掉
- 预留稳定高度，防止内容切换时容器塌陷
- 给图片和媒体区域提前占位
- 尽量只动画 `transform` 和 `opacity`
- 在测量和绑定观察器前等 DOM 稳定

所以这件事本质上不是“只靠一个 API”，而是“`rAF` + 过渡结构 + 占位策略 + 渲染时机控制”共同完成的。

#### `rAF` 在项目里主要是怎么用的

`requestAnimationFrame` 在这个项目里，主要用在需要持续、平滑更新的视觉模块里，而不是直接拿来切路由。

最典型的几个位置有：

- `app/components/layout/FullMenu.vue`
- `app/components/index/PartnersSection.vue`
- `app/components/index/CelestialAuditCard.vue`
- `app/components/index/hero/index.vue`

它们的共同点是：

- 都是持续动画或持续插值场景
- 都需要和浏览器刷新节奏同步
- 都尽量避免 `setInterval` 带来的抖动和无意义空转

比如 `FullMenu.vue` 里做磁吸效果时，不是鼠标一动就直接把元素瞬移到目标位置，而是：

- 先记录目标位移 `targetX / targetY`
- 在 `rAF` 的每一帧里通过 lerp 插值逐步逼近
- 收敛后停止 `rAF`

这样做的效果是：

- 鼠标跟随更平滑
- 不会突兀跳动
- 也不会一直无意义占用主线程

`PartnersSection.vue` 里也是类似思路：

- 自动滚动不是定时器硬推
- 而是在 `rAF` 里按 `delta time` 推进 `scrollLeft`
- 用户拖拽时暂停自动滚动

这样动画速度会更稳定，也不容易出现卡顿和回弹突兀。

`CelestialAuditCard.vue` 和首页 Hero 流水线同理，都是把：

- 测量
- 连续更新
- 销毁清理

放在更可控的 `rAF` 生命周期里。

所以如果面试官问我 `rAF` 的价值，我会回答：

“我主要用它来让连续动画、磁吸、滚动和可视状态判断跟随浏览器绘制节奏执行，减少定时器造成的抖动、掉帧和无效更新。”

#### 切换白屏具体是怎么消掉的

如果专门讲“切换白屏”，当前项目里最直接的实现点其实不是 `rAF`，而是过渡结构设计。

#### 策略一：全局路由过渡，避免页面硬切

在 `nuxt.config.ts` 里，全站配置了：

- `app.pageTransition = { name: 'page-slide' }`

对应的样式在 `app/assets/css/animate.css` 里实现：

- 进入时：`opacity + translateX`
- 离开时：`opacity + translateX`
- 并且加了 `will-change`

这样做的效果是：

- 路由切换时不是老页面瞬间卸载、新页面迟一点出现
- 而是旧页淡出、新页滑入
- 用户感知上不会看到明显白屏

而且这里我选的是：

- `transform`
- `opacity`

而不是去动画高度、位置流布局或大量阴影，这样更容易走合成层，稳定性更好。

#### 策略二：离场页绝对定位叠层，避免中间出现空档

这个策略在资讯页分页切换里体现得最明显，代码在：

- `app/pages/news/index.vue`

这里桌面端新闻网格切页，不是简单把旧列表销毁后再渲染新列表，而是用了一个很关键的结构：

- 进入页正常流渲染
- 离开页在过渡期间改成 `position: absolute; inset: 0`

也就是：

- 老页面在离场那几百毫秒里仍然占据原来的视觉区域
- 新页面在容器中同步进入

这样中间就不会出现“旧内容先没了，新内容还没到”的空白段。

这也是我消白屏最核心的一种做法，简单说就是：

“不是先清空，再渲染；而是旧页叠层离场、新页同步进场。”

#### 策略三：给切换容器预留固定高度，避免切页时塌陷

资讯页里除了叠层过渡，我还做了高度预留。

在 `app/pages/news/index.vue` 里，列表容器不是自适应内容高度直接变化，而是先根据当前页条数算出：

- `--h-sm`
- `--h-md`
- `--h-lg`

再把这些值绑定给列表容器高度。

这一步非常关键，因为如果不这样做，分页切换时会发生：

- 旧列表高度消失
- 容器先塌一下
- 新列表再撑开

视觉上就会感觉页面“抖”一下。

而预留高度之后，容器在切换前后始终有稳定尺寸，过渡只发生在内容层，不发生在整体布局层。

#### 策略四：空状态不放进 `TransitionGroup`

在移动端资讯列表中，我还特意把：

- 有数据的列表
- 无数据的空状态

拆开处理。

也就是说：

- `TransitionGroup` 只承载真实的 `article` 列表项
- 空状态单独渲染

这样做的原因是，如果把空状态也混进过渡组里，切换筛选条件时很容易出现：

- 列表项和空状态互相抢布局
- 动画时序冲突
- 容器高度异常波动

把它们拆开之后，过渡模型会稳定很多。

#### 布局抖动具体是怎么压住的

如果说白屏主要靠过渡结构，那布局抖动主要靠占位和测量时机控制。

#### 策略五：给图片和媒体区域提前占位

项目里大量图片都不是“等图片加载完才知道多大”，而是提前给出：

- 明确的 `width / height`
- `aspect-ratio`
- 固定容器高度

例如资讯页卡片里，图片容器直接用了：

- `aspect-16/10`
- `NuxtImg` 明确 `width` 和 `height`

移动端卡片也是固定了：

- `h-32 w-32`

这样浏览器在图片真正下载完成之前，就已经知道这个区域应该占多少空间，自然就不会把正文顶来顶去。

这对降低 `CLS` 非常关键。

#### 策略六：标题和摘要区域也做最小高度约束

布局抖动不只来自图片，也来自文案长短差异。

所以在资讯列表里，我还给：

- 标题
- 摘要

做了：

- `min-h-*`
- `line-clamp`

例如：

- 标题区域固定最小高度
- 摘要区域限制最大行数

这样不同文章标题长度不一样，也不会把整张卡片高度拉得忽长忽短，网格排版就会稳定很多。

#### 策略七：页面外层用 `min-h-screen` 或固定背景层兜住

项目很多页面外层都用了：

- `min-h-screen`
- 固定背景层 `fixed inset-0 z-0`

这样即使某一块内容还在切换或异步数据还没完全回来，页面也不会因为内容高度暂时不足而出现明显的“背景抽空感”。

像：

- 产品页
- 解决方案页
- 新闻详情页

都能看到这种处理方式。

#### 策略八：测量和观察放到 `nextTick` / `ResizeObserver` 后执行

这部分是很多人容易忽略的细节。

比如产品页里，`IntersectionObserver` 不是一上来就绑，而是：

- 先等路由参数变化
- 更新产品数据
- `await nextTick()`
- 再去查询 DOM 并观察 section

原因很简单：

- 如果 DOM 还没稳定就去测量
- 观察器就可能拿到旧节点或错误位置
- 后续会出现激活态错乱、滚动抖动甚至重排

`CelestialAuditCard.vue` 里同样如此，它会：

- 先 `nextTick`
- 再测量卡片宽度
- 再通过 `ResizeObserver` 在断点变化时同步更新 offset

这样断点切换或窗口缩放时，不会因为尺寸缓存过期导致动画轨道跳动。

#### 策略九：把动画尽量限制在 `transform` 和 `opacity`

这其实是我整个项目里非常稳定的一条原则。

不管是：

- 路由过渡
- Hero 切换
- 卡片 hover
- 全屏菜单
- 资讯列表翻页

大多数动态效果我都尽量落在：

- `transform`
- `opacity`

上。

原因是这两类属性通常不会触发布局计算，浏览器更容易走合成层，所以：

- 更不容易抖
- 更不容易掉帧
- 也更不容易导致切换时闪一下

#### 这套方案的核心亮点

如果让我总结亮点，我会概括成四句。

第一，`rAF` 用在“连续更新”的地方，而不是滥用在所有过渡里。

第二，真正消白屏的关键是“旧页叠层离场，新页同步进场”，不是先清空再渲染。

第三，真正压布局抖动的关键是“预留空间”，包括容器高度、图片尺寸、文本区域高度。

第四，测量相关逻辑都尽量放到 DOM 稳定之后执行，避免错误测量引起的二次抖动。

#### 面试里怎么一句话回答

如果要压缩成面试口述版，我会这样说：

“这部分我不是单靠 `rAF` 做的，而是组合了几类策略：连续动画场景用 `requestAnimationFrame` 跟随浏览器绘制节奏做平滑插值，切页时通过过渡叠层让旧内容绝对定位离场、新内容同步进场来避免白屏，同时给列表容器、图片和文本区域预留稳定高度，并且把动画尽量限制在 `transform` 和 `opacity` 上。再配合 `nextTick` 和 `ResizeObserver` 保证测量发生在 DOM 稳定之后，最终把切换白屏和布局抖动都压了下来。” 

### Q009 你提到了设计可复用关键帧动效库，具体是怎么实现的，有什么作用？

回答：

这个项目里的“可复用关键帧动效库”，本质上不是做成一个很重的动画框架，而是把跨页面、跨模块会重复出现的基础运动模式抽出来，统一放到全局样式层管理。

我会把它理解成两层：

- 全局可复用动效库
- 组件内部场景化动效

其中真正的“动效库”，主要是第一层。

#### 具体是怎么实现的

核心实现文件在：

- `app/assets/css/animate.css`

这份文件里我做了两件事：

- 抽公共关键帧
- 抽公共动效参数

也就是说，不是每个页面都自己定义一套 `@keyframes`，而是先把高频、通用的运动模式收敛成全局资产。

#### 第一步：抽公共关键帧

当前全局已经抽出来的关键帧主要包括：

- `float`
- `marquee`
- `marquee-reverse`

以及与页面过渡配套的：

- `page-slide-enter-from / to`
- `page-slide-leave-from / to`

它们对应的场景分别是：

- `float`：轻微上下漂浮，用于增强悬浮感和呼吸感
- `marquee`：横向连续滚动
- `marquee-reverse`：横向反向连续滚动
- `page-slide`：路由切换或页面进出场

这些都属于“运动模式”本身，而不是某个业务组件专属动画。

#### 第二步：抽公共动效参数

在 `animate.css` 里，我还用 Tailwind v4 的 `@theme` 定义了动效 token，例如：

- `--animate-float`
- `--animate-marquee-slow`
- `--animate-marquee-medium`
- `--animate-marquee-fast`
- `--animate-marquee-medium-reverse`
- `--page-enter-dur`
- `--page-leave-dur`
- `--page-ease`
- `--page-shift`

这一层很重要，因为它说明我不是只在“复用关键帧”，还在复用：

- 动画时长
- 缓动曲线
- 位移幅度
- 正向 / 反向速度层级

比如同样是跑马灯滚动，我没有写死一个速度，而是设计成：

- 慢速
- 中速
- 快速
- 正向
- 反向

这样不同页面可以复用同一种关键帧，但通过不同 token 获得不同节奏。

#### 第三步：让页面和组件直接消费这套动效类

做成全局库之后，组件侧的使用就会很直接。

例如招聘页 `JoinHero` 中，职位卡片滚动用了：

- `animate-marquee-slow`

同样，全球分布区域和其他横向流动场景也可以直接用：

- `animate-marquee-medium`
- `animate-marquee-medium-reverse`

再比如全站路由切换，通过：

- `pageTransition: { name: 'page-slide' }`

配合 `animate.css` 里的 `.page-slide-*` 规则，就把页面进出场统一起来了。

这就是“先建动效库，再让业务组件消费”的基本结构。

#### 第四步：把“通用动效”和“场景动效”分开管理

这一步是我觉得很重要的设计点。

不是所有动画都应该进全局库。

像下面这些更强业务语义、强视觉叙事的动画：

- 首页 Hero 扫描线
- 产品页场景图的复杂 SVG 动画
- 某个卡片自己的闪光、打字、雷达扫描效果

我没有强行抽进全局，而是保留在组件内部。

这样做的原因是：

- 通用库只收“多个地方会重复出现的基础运动模式”
- 场景动效只留在对应组件，避免污染全局命名空间

换句话说，我做的不是“所有关键帧都全局化”，而是“通用的抽出去，强业务的留本地”。

这是一种更稳的工程做法。

#### 这样设计的作用是什么

我认为它的作用主要有五个。

第一，统一动效语言。

如果每个页面都自己写动画，很容易出现：

- 这个地方滑得很快
- 那个地方缓动曲线完全不一样
- 有的漂浮很柔和，有的漂浮很突兀

抽成可复用关键帧库之后，页面整体的运动气质会更统一。

第二，提高开发效率。

像跑马灯、浮动、页面滑入滑出这种高频效果，不需要每个组件都重写一遍，直接用现成类名和 token 即可。

第三，降低维护成本。

如果后续想统一调整动效节奏，比如：

- 跑马灯整体放慢一点
- 页面切换距离缩小一点
- 缓动曲线更柔和一点

只需要改全局动效库，不需要一个个组件去搜。

第四，更利于性能控制。

我在全局库里优先选的是：

- `transform`
- `opacity`

这本身就带有性能约束。也就是说，动效库不仅是“复用”，还是“把性能友好的动画方式标准化”。

第五，更适合和 Design Token 一起演进。

前面我们说过 Design Token 不只包括颜色和字号，也可以包括 motion token。动效库抽出来之后，动画时长、缓动和位移都能逐步变成一套 motion token，这样设计系统会更完整。

#### 这套实现的亮点是什么

如果讲亮点，我会总结成四点。

第一，抽的是“模式”，不是抽“页面”。

我抽出来的是：

- 浮动
- 横向连续流动
- 页面滑入滑出

这种基础运动模式，而不是某个页面独有的动效。

第二，关键帧和参数分开。

关键帧负责定义“怎么动”，token 负责定义“动多快、动多远、怎么缓动”。这让复用粒度更细，也更容易统一调整。

第三，全局复用和局部定制并存。

通用动画放全局，复杂业务动画留在组件内部，没有为了“抽库”而牺牲语义清晰度。

第四，它本质上是一个轻量级动效设计系统。

虽然文件不多，但已经具备了：

- 通用关键帧
- motion token
- 全站过渡规则
- 组件消费入口

这其实已经是“动效工程化”的雏形了。

#### 适合怎么对外表达

如果在面试里回答，我会这样说：

“我把项目里会跨页面复用的基础运动模式抽成了一套轻量级关键帧动效库，核心放在全局的 `animate.css` 里。像浮动、横向跑马灯、页面滑入滑出这些通用效果，都统一定义成 `@keyframes` 和 motion token，再通过类名直接供组件消费。这样做的作用是统一动效语言、减少重复开发、降低维护成本，同时把动画尽量约束在 `transform` 和 `opacity` 上，兼顾性能和一致性。对于首页 Hero 扫描线、复杂 SVG 叙事动画这类强业务场景，我则保留在组件内部，不强行全局化。” 

**参与项目：企业官网2.0开发**

项目描述： 重构官网内容与信息架构，基于 SSR 与 SEO 工程化提升内容可索引性，增强自然流量获取与长期获客能力。

- 技术栈：Nuxt 4（Vue 3 / Vite / Nitro）+ Tailwind CSS v4 + TypeScript + Pinia + @nuxtjs/seo


## 动画

### 核心作用

`<Transition>` 和 `<TransitionGroup>` 是 Vue 内置的过渡动画组件，核心作用是给元素或组件的显示、隐藏、切换添加平滑动画，提升页面交互体验，避免元素切换时的生硬感。

两者主要解决两类核心问题：

- 元素进入和离开时，如何实现有动画的平滑过渡，避免瞬间出现或消失
- 列表项新增、删除、重排时，如何保持视觉连贯性，避免布局错乱或卡顿

两者的分工明确，精准适配不同使用场景：

- `<Transition>`：面向单个元素或单个组件，仅处理单个元素/组件的进入与离开动画
- `<TransitionGroup>`：面向列表或多个子元素，除了处理单个列表项的进入、离开，还额外支持列表重排时的移动动画，适配列表动态更新场景

对应问题：Vue 内置的两个过渡动画组件分别是什么？各自的核心作用和适用场景是什么？

### Transition 组件详解

#### 基本特点

`<Transition>` 有两个核心使用限制，直接影响动画能否正常生效：

- 只能包裹一个直接子元素或一个组件，若包裹多个直接子元素，动画会失效
- 若包裹的是组件，该组件必须只有一个根节点；若组件有多个根节点，需通过 `<template>` 包裹成单个根节点，否则过渡无法正常工作

基础使用示例：

```vue
<Transition name="fade">
  <div v-if="show">内容</div>
</Transition>
```

对应问题：使用 `<Transition>` 组件时，有哪些核心使用限制？若包裹组件，需要注意什么？

#### 过渡的本质

Vue 本身不直接生成动画效果，其核心机制是：在元素进入、离开的不同阶段，自动给元素添加和移除一组特定的 class，开发者通过编写 CSS 样式，定义这些 class 的状态差异和过渡规则，从而实现动画。

以 `<Transition name="fade">` 为例，Vue 会在元素过渡的不同阶段，为元素添加以下 6 个 class（name 属性值为前缀）：

- `fade-enter-from`：进入动画的起始状态，动画开始前添加，动画开始后立即移除
- `fade-enter-active`：进入动画的活跃状态，动画开始时添加，动画结束后移除，用于定义过渡的时长、缓动函数等
- `fade-enter-to`：进入动画的结束状态，动画开始后立即添加，动画结束后移除
- `fade-leave-from`：离开动画的起始状态，离开动画开始前添加，动画开始后立即移除
- `fade-leave-active`：离开动画的活跃状态，离开动画开始时添加，动画结束后移除，与进入活跃状态的作用一致
- `fade-leave-to`：离开动画的结束状态，离开动画开始后立即添加，动画结束后移除

开发者的核心操作的是：

- 在 `*-from` 和 `*-to` 中，定义元素过渡前后的状态差异（如透明度、位置、尺寸等）
- 在 `*-active` 中，定义过渡的规则（如过渡时长、缓动函数、过渡属性等）

对应问题：Vue 过渡动画的核心机制是什么？`<Transition>` 组件会自动添加哪些 class？各自的作用是什么？

#### appear 属性的作用

默认情况下，`<Transition>` 仅负责元素“后续切换”时的动画（如点击按钮控制元素显示/隐藏），不会在元素首次渲染（挂载）时自动执行进入动画。

若想让元素首次挂载时也触发进入动画，需给 `<Transition>` 组件添加 `appear` 属性。

基础使用示例：

```vue
<Transition name="fade" appear>
  <div>首次渲染也会淡入</div>
</Transition>
```

补充细节：`appear` 会默认复用进入动画的 class（`*-enter-from`、`*-enter-active`、`*-enter-to`）；若需给首次渲染设置单独的动画，可单独编写 `*-appear-from`、`*-appear-active` 类，优先级高于进入动画的 class。

```css
.fade-enter-active,
.fade-leave-active,
.fade-appear-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to,
.fade-appear-from {
  opacity: 0;
}
```

对应问题：如何让 `<Transition>` 组件在元素首次渲染时也触发动画？`appear` 属性的默认行为是什么？

#### mode 属性的作用

当 `<Transition>` 包裹的元素进行“切换”（如动态组件切换、文本切换）时，若不添加 `mode` 属性，旧元素的离开动画和新元素的进入动画会同时执行，可能导致元素重叠、布局抖动等问题。

`mode` 属性用于控制切换时的动画顺序，有两个可选值，适配不同场景：

##### mode="out-in"（最常用）

规则：先让旧元素执行离开动画，待旧元素动画结束后，再让新元素执行进入动画。

使用示例：

```vue
<Transition mode="out-in">
  <component :is="activeComponent" />
</Transition>
```

优缺点：

- 优点：动画稳定，不易出现元素重叠，通常不需要给元素设置 `position: absolute`
- 缺点：切换过程中可能会有短暂的空白期（旧元素消失后，新元素未进入）

##### mode="in-out"

规则：先让新元素执行进入动画，待新元素动画结束后，再让旧元素执行离开动画。

使用示例：

```vue
<Transition mode="in-out">
  <component :is="activeComponent" />
</Transition>
```

优缺点：

- 优点：切换过程中无空白期，视觉上更连贯
- 缺点：新元素和旧元素会有短暂的重叠，需通过定位等样式避免重叠问题

对应问题：`mode` 属性的作用是什么？`out-in` 和 `in-out` 两种模式的区别是什么？各自的优缺点和适用场景是什么？

#### key 属性的作用

Vue 有 DOM 复用机制：默认会复用相同类型的 DOM 节点。若只是元素内部内容变化（如文本切换），但标签类型未变（如都是 `<div>`），Vue 会认为是同一个 DOM 节点，不会触发完整的进入、离开动画。

`key` 属性的核心作用是：告诉 Vue 两个元素是不同的 DOM 节点，强制触发完整的过渡动画，避免 DOM 复用导致的动画失效。

使用示例：

```vue
<Transition name="fade" mode="out-in">
  <div :key="state">{{ state }}</div>
</Transition>
```

常见适用场景：

- 文本切换（如动态修改显示的文字内容）
- tab 面板切换（多个面板为同类型标签）
- 动态组件切换（即使组件类型不同，添加 `key` 可确保每次切换都触发动画）
- 同一组件不同参数状态切换（如传递不同 props 导致组件内容变化）

补充：动态组件切换时，添加 `key` 可确保每次切换都完整触发动画，示例：

```vue
<Transition name="fade" mode="out-in">
  <component :is="activeComponent" :key="activeKey" />
</Transition>
```

对应问题：`key` 属性在 Vue 过渡动画中起到什么作用？哪些场景下必须添加 `key` 才能触发动画？

#### type 属性的作用

当元素同时设置了 `transition`（过渡）和 `animation`（动画）两种效果时，Vue 无法自动判断动画的结束时机（无法确定以 `transitionend` 还是 `animationend` 事件为准），此时需要手动通过 `type` 属性指定动画类型。

使用示例：

```vue
<Transition name="pop" type="animation">
  &lt;div v-if="open"&gt;内容&lt;/div&gt;
&lt;/Transition&gt;
```

可选值：

- `type="transition"`：以 `transition` 效果为准，Vue 监听 `transitionend` 事件判断动画结束
- `type="animation"`：以 `animation` 效果为准，Vue 监听 `animationend` 事件判断动画结束

对应问题：`type` 属性的作用是什么？有哪些可选值？各自的适用场景是什么？

#### duration 属性的作用

当动画包含延迟、嵌套子元素动画、多段执行效果时，Vue 可能无法准确推断动画的结束时间，导致动画状态异常（如元素提前被移除、动画未执行完就结束）。

`duration` 属性用于手动指定动画的持续时间，可分别设置进入动画和离开动画的时长，单位为毫秒（ms）。

使用示例：

```vue
<Transition name="nested" :duration="{ enter: 500, leave: 800 }">
  <div v-if="open" class="nested">
    <div class="inner">内容</div>
  </div>
</Transition>
```

补充：也可直接设置单个数值，表示进入和离开动画时长一致，如 `:duration="500"`。

对应问题：`duration` 属性的作用是什么？如何分别设置进入和离开动画的时长？

#### 深层子元素动画

Vue 过渡动画的 class 只会添加到 `<Transition>` 包裹的直接子元素（根元素）上，若需要让内部的子元素执行动画，需通过 CSS 后代选择器，将动画样式应用到子元素上。

使用示例：

```css
/* 根元素的 active 类，通过后代选择器作用于子元素 */
.nested-enter-active .inner,
.nested-leave-active .inner {
  transition: all 0.3s ease-in-out;
}

.nested-enter-from .inner,
.nested-leave-to .inner {
  transform: translateX(30px);
  opacity: 0;
}
```

补充细节：若动画的核心是内部子元素，根元素本身无状态变化，Vue 可能无法准确判断动画结束时间，此时需配合 `duration` 属性手动指定时长，确保动画正常执行。

对应问题：如何给 `<Transition>` 包裹的深层子元素添加动画？为什么有时需要配合 `duration` 属性？

### CSS 过渡详解

#### CSS 过渡的标准写法

CSS 过渡是 Vue 过渡动画最基础、最常用的实现方式，核心是通过 `transition` 属性定义过渡规则，配合 `*-from`、`*-to` 定义状态差异。

##### 最基础的淡入淡出效果

```css
/* 定义过渡规则：透明度过渡，时长0.2s，缓动函数ease */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

/* 定义状态差异：进入前、离开后透明 */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

效果解析：元素进入时，从 `opacity: 0`（透明）过渡到 `opacity: 1`（不透明）；离开时，从 `opacity: 1` 过渡到 `opacity: 0`，中间通过 `transition` 实现平滑变化。

#### 动画属性的推荐顺序（按性能优先级）

选择合适的动画属性，直接影响动画性能和流畅度，优先选择不会触发布局重排、重绘的属性，推荐顺序如下：

##### transform（最推荐）

`transform` 是性能最优的动画属性，原因是它通常只触发“合成”阶段（浏览器重新组合图层），不会触发布局重排（reflow）和重绘（repaint），动画流畅度最高。

常见用法（滑动效果）：

```css
.slide-enter-from,
.slide-leave-to {
  transform: translateY(10px); /* 初始/结束状态：向下偏移10px */
}

.slide-enter-to,
.slide-leave-from {
  transform: translateY(0); /* 结束/初始状态：无偏移 */
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease; /* 过渡属性仅指定transform */
}
```

常见 `transform` 取值（可组合使用）：

- `translateX(...)`：水平方向偏移（如 `translateX(20px)` 向右偏移，`translateX(-20px)` 向左偏移）
- `translateY(...)`：垂直方向偏移（如 `translateY(10px)` 向下偏移）
- `scale(...)`：缩放（如 `scale(0.9)` 缩小，`scale(1.1)` 放大）
- `rotate(...)`：旋转（如 `rotate(3deg)` 顺时针旋转3度，`rotate(-3deg)` 逆时针旋转）

组合示例：

```css
transform: translateY(10px) scale(0.98) rotate(3deg);
```

##### opacity（最稳定、最常用）

`opacity` 用于控制元素的透明度，性能仅次于 `transform`，通常与 `transform` 配合使用，实现“淡入+位移/缩放”的复合动画，效果更丰富。

使用示例（弹出效果）：

```css
.pop-enter-from,
.pop-leave-to {
  opacity: 0; /* 透明 */
  transform: translateY(6px) scale(0.98); /* 位移+缩放 */
}

.pop-enter-active,
.pop-leave-active {
  /* 同时过渡opacity和transform两个属性 */
  transition: opacity 0.2s ease, transform 0.2s ease;
}
```

##### filter（谨慎使用）

`filter` 可实现模糊、亮度、对比度等特殊效果（如模糊淡入），但性能成本比 `transform` 和 `opacity` 高，会触发重绘，不适合大面积元素或复杂页面。

使用示例（模糊淡入效果）：

```css
.blur-enter-from,
.blur-leave-to {
  filter: blur(8px); /* 模糊效果 */
  opacity: 0; /* 透明 */
}

.blur-enter-active,
.blur-leave-active {
  transition: filter 0.25s ease, opacity 0.25s ease;
}
```

##### 布局属性（谨慎使用）

布局属性如 `height`、`width`、`margin`、`padding`、`top`、`left` 等，其变化会触发布局重排（页面元素重新计算位置和尺寸），频繁执行时容易导致动画卡顿，尽量避免使用。

使用原则：

- 能用 `transform` 模拟的效果，优先用 `transform`（如用 `scale` 模拟尺寸变化，用 `translate` 模拟位置变化）
- 仅在特殊场景（如高度从 0 到 auto 的展开收起），才考虑使用 JS 钩子方案实现，避免直接修改布局属性

对应问题：实现 Vue CSS 过渡动画时，推荐使用的动画属性有哪些？为什么不推荐使用布局属性？

#### transition 属性详解

`transition` 属性用于描述“某个 CSS 属性从一个值平滑过渡到另一个值”的规则，是 CSS 过渡的核心，可一次性定义过渡的多个参数。

##### 推荐写法

```css
.fade-enter-active,
.fade-leave-active {
  /* 明确指定过渡属性，避免不必要的性能消耗 */
  transition: opacity 200ms ease, transform 200ms ease;
}
```

##### 属性组成（4个部分）

- 过渡属性（必选）：指定需要过渡的 CSS 属性（如 `opacity`、`transform`），多个属性用逗号分隔
- 持续时间（必选）：动画执行的时长，单位为 ms（毫秒）或 s（秒）（如 `200ms`、`0.2s`）
- 缓动函数（可选）：控制动画的速度变化（如 `ease` 先慢后快再慢，`linear` 匀速，`ease-in` 先慢后快）
- 延迟时间（可选）：动画延迟多久开始执行，单位为 ms 或 s，默认值为 0（如 `100ms` 表示延迟100ms执行）

##### 注意事项

不建议使用 `transition: all`，`all` 表示所有属性变化都触发过渡，会包含一些不需要过渡的属性（如 `color`、`background`），增加性能消耗，尽量明确指定需要过渡的属性。

对应问题：`transition` 属性由哪些部分组成？为什么不建议使用 `transition: all`？

#### animation 和 @keyframes

`transition` 适合简单的“从 A 到 B”的线性过渡，若需要实现多阶段、非线性、回弹等复杂动画（如弹出时轻微回弹、多步动画），则适合使用 `animation` 配合 `@keyframes` 定义关键帧。

使用示例（回弹弹出效果）：

```css
/* 定义进入动画关键帧：多阶段状态变化 */
@keyframes pop-in {
  0%   { opacity: 0; transform: translateY(8px) scale(0.98); } /* 初始状态 */
  80%  { opacity: 1; transform: translateY(-2px) scale(1.01); } /* 中间回弹 */
  100% { opacity: 1; transform: translateY(0) scale(1); } /* 结束状态 */
}

/* 定义离开动画关键帧 */
@keyframes pop-out {
  0%   { opacity: 1; transform: translateY(0) scale(1); } /* 初始状态 */
  100% { opacity: 0; transform: translateY(6px) scale(0.98); } /* 结束状态 */
}

/* 给过渡组件的active类绑定动画 */
.pop-enter-active {
  animation: pop-in 220ms ease both; /* both表示动画结束后保留最后一帧状态 */
}

.pop-leave-active {
  animation: pop-out 180ms ease both;
}
```

补充细节：`animation` 中的 `both` 属性，可确保动画结束后，元素保留关键帧中最后一帧的状态，避免动画结束后元素回到初始状态。

对应问题：`transition` 和 `animation` 的区别是什么？各自的适用场景是什么？

### TransitionGroup 组件详解

#### 核心作用

`<TransitionGroup>` 专门用于列表动画，相比 `<Transition>`，它额外支持列表项重排时的移动动画，可实现列表新增、删除、排序时的平滑过渡，保持视觉连贯性。

核心支持的三种动画效果：

- 列表项进入动画（新增列表项时）
- 列表项离开动画（删除列表项时）
- 列表项重排移动动画（列表排序、插入/删除导致位置变化时）

对应问题：`<TransitionGroup>` 组件的核心作用是什么？它支持哪些动画效果？

#### 基本规则

##### 每个子项必须有唯一 key

这是 `<TransitionGroup>` 实现列表动画的前提，Vue 需要通过 `key` 识别每个列表项的身份，才能判断列表项的新增、删除和移动。

错误示例（不推荐）：

```vue
<li v-for="(item, index) in items" :key="index">{{ item.text }}</li>
```

错误原因：用索引 `index` 作为 `key`，当列表排序、删除中间项时，索引会发生变化，Vue 无法识别列表项的真实身份，导致移动动画失效、列表项复用异常。

正确示例：用列表项的唯一标识（如 `id`）作为 `key`：

```vue
<li v-for="item in items" :key="item.id">{{ item.text }}</li>
```

##### 建议指定 tag 属性

`<TransitionGroup>` 默认会渲染成 `<span>` 标签作为容器，通常需要根据列表结构，指定更合适的容器标签（如 `ul`、`div`），避免布局异常。

使用示例：

```vue
<TransitionGroup name="list" tag="ul">
  <li v-for="item in items" :key="item.id">
    {{ item.text }}
  </li>
</TransitionGroup>
```

##### 没有 mode 属性

与 `<Transition>` 不同，`<TransitionGroup>` 不支持 `mode` 属性。原因是列表中可能有多个元素同时执行进入、离开、移动动画，无法像单个元素那样，通过 `mode` 控制“先出后入”或“先入后出”的顺序。

对应问题：`<TransitionGroup>` 有哪些基本使用规则？为什么不推荐用索引作为 `key`？为什么它没有 `mode` 属性？

#### 基础示例（完整可运行）

```vue
<template>
  <div>
    <button @click="addItem">添加项</button>
    <button @click="shuffleItems">打乱顺序</button>

    <TransitionGroup name="list" tag="ul" class="list-container">
      <li
        v-for="item in items"
        :key="item.id"
        class="list-item"
        @click="removeItem(item.id)"
      >
        {{ item.text }}
      </li>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref } from 'vue'

let id = 3
const items = ref([
  { id: 1, text: '列表项 1' },
  { id: 2, text: '列表项 2' },
  { id: 3, text: '列表项 3' }
])

// 添加列表项
const addItem = () => {
  items.value.push({ id: ++id, text: `列表项 ${id}` })
}

// 删除列表项
const removeItem = (itemId) => {
  items.value = items.value.filter(item => item.id !== itemId)
}

// 打乱列表顺序（触发移动动画）
const shuffleItems = () => {
  items.value = [...items.value].sort(() => Math.random() - 0.5)
}
</script>

<style>
.list-container {
  list-style: none;
  padding: 0;
}

.list-item {
  padding: 8px 12px;
  margin: 4px 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
}

/* 进入、离开动画样式 */
.list-enter-active,
.list-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* 移动动画样式（TransitionGroup 特有） */
.list-move {
  transition: transform 0.2s ease;
}

/* 避免删除时布局抖动 */
.list-leave-active {
  position: absolute;
}
</style>
```

#### move 动画（TransitionGroup 特有）

`move` 动画是 `<TransitionGroup>` 独有的特性，用于实现列表项重排时的平滑移动效果。

工作原理：当列表项的顺序发生变化（如排序、插入、删除）时，Vue 会检测每个列表项的新旧位置差异，自动给需要移动的列表项添加 `*-move` 类（`*` 为 `name` 属性值），通过 `transform` 属性实现位置的平滑过渡。

核心样式（必须添加，否则移动动画无效）：

```css
/* 列表项移动时的过渡规则 */
.list-move {
  transition: transform 0.2s ease;
}
```

补充细节：`*-move` 类会与 `*-enter-active`、`*-leave-active` 同时生效，确保列表项在移动的同时，也能执行进入/离开动画，视觉效果更连贯。

对应问题：`move` 动画是什么？它是哪个组件特有的？如何实现列表项的移动动画？

### JavaScript 钩子详解

#### 什么时候用 JS 钩子

CSS 过渡适合简单的动画效果（如淡入、位移、缩放），但在一些复杂场景中，CSS 无法满足需求，此时需要使用 JS 钩子控制动画，常见场景：

- 高度从 0 到 auto 的展开收起（CSS 无法直接实现 `height: auto` 的过渡）
- 需要动态测量元素尺寸（如根据内容自动计算高度、宽度）
- 结合第三方动画库（如 GSAP）实现复杂动画
- 需要精确控制动画的执行时机（如延迟执行、中途暂停、触发其他业务逻辑）
- 需要在动画过程中控制滚动位置或其他 DOM 操作

对应问题：哪些场景下需要使用 JS 钩子实现 Vue 过渡动画？

#### 钩子生命周期（完整阶段）

Vue 为 `<Transition>` 和 `<TransitionGroup>` 提供了完整的 JS 钩子，覆盖动画的整个生命周期，可在不同阶段执行自定义逻辑。

##### 进入阶段（元素从隐藏到显示）

- `before-enter(el)`：进入动画开始前触发，此时元素已被插入 DOM，但未应用任何动画样式，可在此设置元素的初始状态
- `enter(el, done)`：进入动画开始时触发，可在此编写动画逻辑；`done` 是一个回调函数，必须手动调用，告诉 Vue 动画已结束
- `after-enter(el)`：进入动画结束后触发（`done` 调用后），可在此执行动画结束后的逻辑（如清理样式、触发回调）
- `enter-cancelled(el)`：进入动画被取消时触发（如动画执行过程中，元素被隐藏）

##### 离开阶段（元素从显示到隐藏）

- `before-leave(el)`：离开动画开始前触发，此时元素仍处于显示状态，可在此设置元素的初始状态
- `leave(el, done)`：离开动画开始时触发，可在此编写动画逻辑；同样需要手动调用 `done` 函数，告知 Vue 动画结束
- `after-leave(el)`：离开动画结束后触发（`done` 调用后），可在此清理样式、移除 DOM 等
- `leave-cancelled(el)`：离开动画被取消时触发（如动画执行过程中，元素被显示）

#### :css="false" 的意义

默认情况下，Vue 会认为开发者使用 CSS 控制过渡动画，此时 Vue 会自动执行以下操作：

- 在动画的不同阶段，自动给元素添加/移除过渡 class（如 `*-enter-from`、`*-enter-active`）
- 自动监听 `transitionend` 或 `animationend` 事件，判断动画结束，无需手动调用 `done` 函数

当使用 JS 钩子控制动画时，需要添加 `:css="false"`，告诉 Vue：

- 不再自动处理 CSS 过渡 class（避免 Vue 自动添加的 class 干扰 JS 动画逻辑）
- 动画完全由 JS 控制，Vue 不再监听 CSS 动画结束事件

使用示例：

```vue
<Transition :css="false" @enter="onEnter" @leave="onLeave">
  <div v-if="open">内容</div>
</Transition>
```

注意：添加 `:css="false"` 后，必须在 `enter` 和 `leave` 钩子中手动调用 `done()` 函数，否则 Vue 无法知道动画何时结束，会导致动画状态异常。

对应问题：`:css="false"` 的作用是什么？添加这个属性后，需要注意什么？

#### 为什么必须调用 done()

在 `:css="false"` 模式下，Vue 不再依赖 CSS 的 `transitionend` 或 `animationend` 事件判断动画结束，无法自动感知动画的执行状态。

因此，必须手动调用 `done()` 函数，告知 Vue 动画已结束，否则会出现以下问题：

- 进入动画：元素可能一直处于“进入中”状态，无法正常切换到结束状态
- 离开动画：元素可能被过早移除，或一直保留在 DOM 中，导致布局错乱

核心原则：`:css="false"` 与 `done()` 必须配合使用，缺一不可。

对应问题：在 JS 钩子动画中，为什么必须调用 `done()` 函数？不调用会有什么问题？

### requestAnimationFrame（rAF）笔记

#### rAF 基础认知

首先纠正笔误：原文中的 `requestAnimal` 正确名称为 `requestAnimationFrame`，缩写通常为 `rAF`。

`requestAnimationFrame` 是浏览器提供的一个 API，核心作用是：在“下一次浏览器重绘之前”执行回调函数，确保回调函数的执行时机与浏览器的渲染节奏对齐。

基础用法：

```javascript
requestAnimationFrame(() => {
  // 在下一次浏览器重绘前执行的逻辑
  el.style.transform = 'translateY(0)'
})
```

rAF 的常见用途：

- 逐帧动画（如自定义滚动、复杂动画序列）
- 等待样式先应用到页面，避免过渡失效
- 提高动画时机控制精度，避免时序误差

对应问题：`requestAnimationFrame`（rAF）是什么？它的核心作用是什么？

#### rAF 在 Vue 过渡钩子里的核心作用

在 Vue 过渡 JS 钩子中，rAF 最核心的作用是解决“动画无法触发”的问题，其本质原因是：

当你刚把元素插入 DOM（或修改元素样式），就立刻同时设置“初始状态”和“目标状态”时，浏览器会将这两个样式修改合并为一次渲染，无法识别出“状态变化”，从而导致过渡动画无法触发。

错误示例（动画无法触发）：

```javascript
const onEnter = (el, done) => {
  el.style.height = '0px' // 初始状态
  el.style.height = '200px' // 目标状态（与初始状态同时设置，浏览器合并渲染）
  done()
}
```

此时，浏览器会直接渲染 `height: 200px`，无法识别“从 0 到 200px”的变化，动画无法触发。

rAF 的解决方案：将“初始状态设置”和“目标状态设置”分到两个不同的渲染时机，让浏览器真正看到状态变化，从而触发过渡。

正确示例（使用 rAF 触发动画）：

```javascript
const onEnter = (el, done) => {
  el.style.height = '0px' // 第一帧：设置初始状态
  requestAnimationFrame(() => {
    el.style.height = '200px' // 第二帧：设置目标状态，浏览器识别到变化，触发过渡
    done()
  })
}
```

总结：rAF 在 Vue 过渡钩子中的核心作用是“拆分状态设置的时机”，让浏览器能识别到元素的状态变化，从而触发过渡动画。

对应问题：在 Vue 过渡 JS 钩子中，为什么经常使用 rAF？它能解决什么核心问题？

#### rAF 的典型用法（结合过渡钩子）

##### 高度展开动画

```javascript
const onEnter = (el, done) => {
  // 初始状态：高度为0，隐藏溢出内容
  el.style.height = '0px'
  el.style.overflow = 'hidden'

  requestAnimationFrame(() => {
    // 目标状态：高度为元素真实高度，添加过渡规则
    const targetHeight = el.scrollHeight // 动态测量元素真实高度
    el.style.transition = 'height 250ms ease'
    el.style.height = `${targetHeight}px`

    // 监听过渡结束，清理样式并调用done()
    const onEnd = () => {
      el.removeEventListener('transitionend', onEnd)
      el.style.height = '' // 清除固定高度，恢复auto
      el.style.overflow = ''
      el.style.transition = ''
      done() // 告知Vue动画结束
    }

    el.addEventListener('transitionend', onEnd)
  })
}
```

##### 高度收起动画

```javascript
const onLeave = (el, done) => {
  // 初始状态：高度为元素真实高度，隐藏溢出内容
  el.style.height = `${el.scrollHeight}px`
  el.style.overflow = 'hidden'

  requestAnimationFrame(() => {
    // 目标状态：高度为0，添加过渡规则
    el.style.transition = 'height 200ms ease'
    el.style.height = '0px'

    // 监听过渡结束，调用done()
    const onEnd = () => {
      el.removeEventListener('transitionend', onEnd)
      done()
    }

    el.addEventListener('transitionend', onEnd)
  })
}
```

#### rAF 与 setTimeout 的区别

有些场景中，开发者会用 `setTimeout(() => {}, 0)` 替代 rAF，但 rAF 更适合动画场景，两者核心区别如下：

- rAF：与浏览器渲染节奏对齐，回调函数会在“下一次重绘前”执行，时机更稳定，动画更自然，不会出现卡顿
- setTimeout：回调函数会在指定时间后执行，但不与浏览器渲染节奏对齐，可能出现时序误差（如回调执行时，浏览器正处于重绘中），导致动画卡顿、不连贯

核心原则：动画相关场景，优先使用 `requestAnimationFrame`，避免使用 `setTimeout`。

对应问题：`requestAnimationFrame` 与 `setTimeout` 相比，有什么优势？为什么动画场景优先使用 rAF？

#### 单层 rAF 和双层 rAF

##### 单层 rAF（最常见）

用法：只嵌套一层 rAF，将目标状态设置放在回调函数中，适合大多数过渡场景（如高度展开、位移动画）。

```javascript
requestAnimationFrame(() => {
  el.style.height = `${el.scrollHeight}px`
})
```

##### 双层 rAF（特殊场景）

用法：嵌套两层 rAF，将目标状态设置放在内层回调中，适用于复杂布局、样式刚切换、强依赖浏览器完成首次布局后再触发动画的场景。

```javascript
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    el.style.height = `${el.scrollHeight}px`
  })
})
```

含义：

- 第一帧：让初始样式（如 `height: 0px`）稳定落地，确保浏览器完成首次渲染
- 第二帧：再设置目标状态，避免因样式未稳定导致的动画失效

注意：不是所有场景都需要双层 rAF，只有当动画偶尔不触发、首帧丢失时，才需要尝试使用双层 rAF。

对应问题：单层 rAF 和双层 rAF 的区别是什么？什么时候需要使用双层 rAF？

详细解析：两者的核心区别在于“状态设置的时序拆分层数”，本质是控制目标状态设置的时机，适配不同的渲染场景，具体区别如下：

- 单层 rAF：仅拆分一次时序，将初始状态设置在钩子主逻辑中，目标状态设置在rAF回调中，确保浏览器能识别到“初始→目标”的状态变化，适用于大多数常规过渡场景（如简单高度展开、位移动画），也是开发中最常用的方式，能解决绝大多数“动画无法触发”的问题。
- 双层 rAF：拆分两次时序，初始状态设置在钩子主逻辑，目标状态设置在嵌套的第二层rAF回调中，相当于给浏览器多一次渲染缓冲，确保初始样式完全稳定落地后，再触发目标状态的变化。

需要使用双层 rAF 的典型场景（仅特殊情况需要）：

- 复杂布局场景：元素嵌套层级多、依赖父元素样式渲染，初始状态设置后，浏览器需要额外时间完成布局计算，单层rAF可能仍无法捕捉到状态变化。
- 样式刚切换后：钩子中同时修改了元素的多个样式（如display、position、height），浏览器合并渲染的概率更高，单层rAF时序拆分不够，需双层rAF进一步拆分。
- 动画偶尔失效：在部分浏览器（如旧版Chrome、Safari）中，单层rAF触发的动画偶尔丢失首帧，此时用双层rAF可提升动画稳定性。

补充提醒：双层rAF并非“越多越好”，过度嵌套会增加不必要的渲染延迟，导致动画触发变慢，仅在单层rAF无法满足需求时，再尝试使用双层rAF。

对应问题延伸：在Vue过渡JS钩子中，如何判断该使用单层还是双层rAF？

判断原则：优先使用单层rAF，若测试时发现动画偶尔不触发、首帧丢失，或元素布局复杂、样式依赖关系强，再替换为双层rAF，无需盲目使用双层rAF。

## TailWind

官方文档参考：https://www.tailwindcss.cn/docs/installation（国内版）、https://tailwindcss.com/docs/installation（国际版）

本文档涵盖 Tailwind CSS v3 核心用法及 v4 新增特性，结合 Nuxt 项目集成场景，详细拆解知识点并搭配对应问题，助力快速上手并掌握核心细节。

### Tailwind 6大核心原理

#### 原理1：工具类优先（Utility-First）

核心定义：将常用 CSS 能力拆解为大量单一职责的工具类，每个工具类仅实现一个具体样式效果（如 `p-4` 仅控制内边距、`bg-red-500` 仅控制背景色），开发时无需编写自定义选择器，直接在模板中组合工具类完成样式开发。

核心细节：工具类的命名遵循“属性-值”逻辑，便于记忆和使用，例如 `text-xl`（字体大小）、`flex`（布局方式）、`hover:bg-blue-600`（悬浮状态背景色），无需关注 CSS 原生语法的细节。

工程收益：

- 约束设计一致性：通过主题配置收敛视觉属性（颜色、间距等），避免同一语义出现多种取值（如“主色”仅对应一套色值）。
- 减少样式耦合：样式与元素直接绑定，修改时仅调整工具类，无需担心选择器关联导致的“牵一发动全身”。
- 简化状态与响应式控制：通过前缀叠加（如 `dark:hover:md:`），无需编写复杂媒体查询和伪类。

对应问题：工具类优先与传统 CSS 开发（编写自定义选择器）相比，核心优势和劣势分别是什么？如何避免工具类过多导致的模板冗余？

#### 原理2：按需生成（On-Demand Generation）

核心定义：Tailwind 不会默认生成所有工具类 CSS，而是通过扫描配置中指定的文件，提取其中实际使用的工具类，仅生成这些类对应的 CSS 代码，大幅减少最终打包体积。

核心细节：按需生成的核心依赖 `content` 配置，需明确指定项目中所有书写 Tailwind 类名的文件路径（如页面、组件、布局文件），确保扫描无遗漏。

示例配置（Tailwind v3）：

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app.vue',
    './pages/**/*.{vue,js,ts}', // 递归匹配pages下所有相关文件
    './components/**/*.{vue,js,ts}'
  ],
  theme: { extend: {} },
  plugins: []
}
```

对应问题：为什么写了 Tailwind 工具类但样式不生效？如何配置 `content` 才能覆盖第三方组件库中的 Tailwind 类？

#### 原理3：变体机制（Variants）

核心定义：将元素的状态（伪类、媒体查询、属性选择器等）抽象为“变体前缀”，通过前缀与工具类组合，实现特定条件下的样式生效，无需编写原生 CSS 伪类和媒体查询。

核心细节：变体支持多前缀叠加，语法统一，常见变体分类：

- 伪类变体：`hover:`（悬浮）、`focus:`（聚焦）、`first:`（第一个子元素）、`required:`（必填项）等。
- 伪元素变体：`before:`（前伪元素）、`after:`（后伪元素）、`placeholder:`（占位符）等。
- 媒体查询变体：`sm:`（小屏幕）、`md:`（中屏幕）、`lg:`（大屏幕）、`max-sm:`（小于小屏幕）等，遵循移动优先理念。
- 属性选择器变体：通过“任意变体”语法实现，如 `data-[state=open]:`（对应 `data-state="open"` 属性）。

示例用法：

```html
<button class="bg-sky-600 hover:bg-sky-700 dark:md:focus:ring-2 dark:md:focus:ring-sky-400">
  提交
</button>
```

对应问题：如何自定义一个变体（如基于 `data-theme="midnight"` 的主题变体）？多变体叠加时，生效顺序由什么决定？

#### 原理4：三层样式体系（Layer System）

核心定义：Tailwind 将 CSS 样式分为基础层、组件层、工具类层三层，通过固定加载顺序控制样式优先级，确保工具类能覆盖基础和组件样式，避免优先级混乱。

核心细节：三层样式的作用及加载顺序（优先级从低到高）：

- 基础层（base）：通过 `@tailwind base` 注入，包含 Preflight（浏览器样式重置）和基础默认样式，统一跨浏览器表现，比传统 CSS Reset 更温和。
- 组件层（components）：通过 `@tailwind components` 注入，包含 Tailwind 内置组件样式和开发者自定义组件样式（通过 `@layer components` 定义）。
- 工具类层（utilities）：通过 `@tailwind utilities` 注入，包含所有核心工具类和开发者自定义工具类（通过 `@layer utilities` 定义），优先级最高。

示例用法：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

// 自定义组件样式，归入components层
@layer components {
  .btn-primary {
    @apply px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700;
  }
}
```

对应问题：`@layer` 指令的作用是什么？为什么组件内的样式不建议使用 `@layer` 指令？

#### 原理5：主题系统（Theme System）

核心定义：通过 `theme` 配置（v3）或 `@theme` 指令（v4）定义项目的设计系统（颜色、间距、字号、圆角等），将全站视觉规范代码化，确保设计风格一致性，同时支持扩展和自定义。

核心细节：主题配置的两种方式（v3）：

- 覆盖默认主题：直接在 `theme` 下定义属性（如 `theme: { colors: ... }`），会完全替换 Tailwind 默认体系，不推荐除非彻底重构设计。
- 扩展默认主题：通过 `theme.extend` 新增属性，不影响原有设计体系，是最推荐的方式，可保留 Tailwind 内置工具类。

v4 新增：通过 `@theme` 指令在 CSS 中定义主题变量，自动映射为工具类，更贴合 CSS-first 理念，支持 OKLCH 颜色空间。

示例配置（v3 扩展主题）：

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: { // 新增品牌色
          50: '#eff6ff',
          600: '#2563eb',
          700: '#1d4ed8'
        }
      },
      spacing: {
        18: '4.5rem' // 扩展间距
      }
    }
  }
}
```

对应问题：如何在自定义 CSS 中引用主题配置中的值？v3 的 `theme` 配置与 v4 的 `@theme` 指令有什么区别？

#### 原理6：CSS-first（v4 核心，向下兼容）

核心定义：Tailwind v4 提出的核心理念，将主题定义、工具类自定义、插件加载等功能迁移到 CSS 层面，减少 JS 配置依赖，更贴近原生 CSS 开发流程，同时保持对 v3 的兼容。

核心细节：v4 通过 CSS 指令（`@import "tailwindcss"`、`@theme`、`@utility` 等）替代 v3 部分 JS 配置，简化集成流程，支持动态主题和更灵活的自定义。

示例用法（v4 主题定义）：

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(50.99% 0.0567 200.3); // OKLCH 颜色
  --spacing-18: 4.5rem; // 自定义间距
  --breakpoint-3xl: 120rem; // 自定义断点
}
```

对应问题：Tailwind v4 的 CSS-first 理念相比 v3 的 JS 配置，核心优势是什么？老项目如何从 v3 渐进式迁移到 v4？

### Nuxt 环境集成 Tailwind CSS

#### Nuxt 集成推荐方案

优先使用 Nuxt 官方提供的 `@nuxtjs/tailwindcss` 模块（适配 v3），或通过 Vite 插件集成（适配 v4），该方案会自动接管 PostCSS 配置、样式注入及构建优化，避免手动配置的兼容性问题。

#### Nuxt + Tailwind v3 集成步骤

1. 安装依赖（以 pnpm 为例）：        `pnpm add -D @nuxtjs/tailwindcss`
2. 配置 Nuxt 模块（nuxt.config.ts）：       `export default defineNuxtConfig({ ``  modules: ['@nuxtjs/tailwindcss'], // 注册Tailwind模块 ``})`
3. 自定义样式入口（可选，用于进阶需求）：        
   1. 修改 Nuxt 配置：            `export default defineNuxtConfig({ ``  css: ['~/assets/css/main.css'], // 引入自定义样式入口 ``  modules: ['@nuxtjs/tailwindcss'], ``})`
   2. 创建 main.css 文件（assets/css/main.css）：            `@tailwind base;    // 基础层 ``@tailwind components; // 组件层 ``@tailwind utilities;  // 工具类层`

#### Nuxt + Tailwind v4 集成步骤

1. 创建 Nuxt 项目：        `npm create nuxt@latest my-app ``cd my-app`
2. 安装依赖：        `pnpm add -D tailwindcss @tailwindcss/vite`
3. 配置 nuxt.config.ts：        `import tailwindcss from '@tailwindcss/vite' `` ``export default defineNuxtConfig({ ``  css: ['~/assets/css/main.css'], // 全局样式入口 ``  vite: { ``    plugins: [tailwindcss()], // 注册Tailwind Vite插件 ``  }, ``})`
4. 创建 main.css 文件（assets/css/main.css）：        `@import "tailwindcss"; // v4 核心入口指令 `` ``// 自定义主题（可选） ``@theme { ``  --color-primary: oklch(50.99% 0.0567 200.3); ``  --spacing-18: 4.5rem; ``}`

对应问题：Nuxt 集成 Tailwind v3 和 v4 的核心区别是什么？为什么 v4 推荐使用 Vite 插件而非 `@nuxtjs/tailwindcss` 模块？

### Tailwind 核心配置详解

#### content 配置（样式扫描范围）

核心作用：指定 Tailwind 扫描的文件路径，确保所有使用 Tailwind 工具类的文件被覆盖，否则会出现“类名写了但样式不生效”的问题。

典型配置（Nuxt 项目）：

```javascript
content: [
  './app.vue',
  './pages/**/*.{vue,js,ts}', // 页面文件
  './components/**/*.{vue,js,ts}', // 组件文件
  './layouts/**/*.{vue,js,ts}', // 布局文件
  './plugins/**/*.{js,ts}', // 插件文件
  './content/**/*.md' // 若使用Nuxt Content模块，需补充
]
```

常见踩坑点：

- 默认不扫描 `node_modules` 目录，若第三方库使用 Tailwind 类，需显式添加路径（如 `'./node_modules/@my-ui/**/*.vue'`），避免全量扫描。
- 动态拼接类名（如 `text-${color}-500`）无法被扫描，需改为枚举写法（如 `text-red-500 text-blue-500`）。

对应问题：如何排查 Tailwind 类名不生效的问题？动态类名场景如何适配 Tailwind 的扫描机制？

#### theme 配置（自定义设计系统）

核心作用：定义项目的视觉规范，包括颜色、间距、字号、圆角、阴影、响应式断点等，支持覆盖或扩展默认主题。

可复用模板（v3）：

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [/* 扫描路径 */],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '480px', // 扩展响应式断点
      },
      spacing: {
        18: '4.5rem',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
```

v4 主题定义（CSS 层面）：

```css
@import "tailwindcss";

@theme {
  --color-brand-50: oklch(94.10% 0.0218 250.2);
  --color-brand-600: oklch(56.49% 0.2313 260.1);
  --font-sans: 'Inter', system-ui, sans-serif;
  --breakpoint-xs: 480px;
  --spacing-18: 4.5rem;
}
```

对应问题：如何自定义响应式断点？OKLCH 颜色空间相比 Hex/RGB 有什么优势？

#### plugins 配置（扩展 Tailwind 能力）

核心作用：通过加载官方或第三方插件，新增工具类、组件样式等功能，扩展 Tailwind 生态能力。

常用官方插件：

- @tailwindcss/typography（文章排版）：       `pnpm add -D @tailwindcss/typography// 配置 ``module.exports = { plugins: [require('@tailwindcss/typography')] }<article class="prose lg:prose-xl"><!-- 富文本内容 --></article>`
- @tailwindcss/forms（表单样式统一）：解决不同浏览器表单元素样式不一致问题，安装配置同 typography 插件，无需额外类名即可使用。
- @tailwindcss/container-queries（容器查询）：实现组件基于父容器宽度的自适应，适配组件化开发。

对应问题：如何开发一个自定义 Tailwind 插件？官方插件与第三方插件（如 daisyUI）的核心区别是什么？

### daisyUI 插件使用（Tailwind 语义化 UI 组件）

核心优势：轻量无 JS 依赖，通过语义化类名（如 `btn`、`card`、`navbar`）快速搭建页面，内置主题系统，兼容 Tailwind 工具类，可与 Tailwind 完美协同。

#### daisyUI 接入方式（按 Tailwind 版本区分）

方式1：Tailwind v4 + daisyUI v5（推荐）

```bash
pnpm add -D daisyui@latest
/* assets/css/main.css */
@import "tailwindcss";
@plugin "daisyui" {
  themes: light --default, dark --prefersdark, cupcake; // 主题配置
  logs: false; // 关闭启动日志
}
```

方式2：Tailwind v3 + daisyUI v4（老项目适配）

```bash
pnpm add -D daisyui
// tailwind.config.js
module.exports = {
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark", "cupcake"],
    darkTheme: "dark",
    logs: false,
  },
}
```

#### daisyUI 核心用法

1. 语义化组件类使用：

```html
<!-- 按钮组件 -->
<button class="btn btn-primary md:px-6">Save</button>

<!-- 卡片组件 -->
<div class="card bg-base-100 shadow p-6 rounded-2xl">
  <div class="card-body">
    <h2 class="card-title">Card Title</h2>
    <p>content...</p>
  </div>
</div>
```

2. 主题切换（基于 data-theme 属性）：

```html
<!-- 浅色主题 -->
<html data-theme="light">...</html>

<!-- 暗色主题 -->
<html data-theme="dark">...</html>
```

3. 与 Tailwind darkMode 协同：

```javascript
// Tailwind v3 配置
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'], // 对齐daisyUI主题
  plugins: [require("daisyui")],
}
```

对应问题：daisyUI 的主题切换与 Tailwind 原生 darkMode 如何保持同步？如何自定义 daisyUI 的主题色？

### Tailwind 核心概念与实操细节

#### 响应式设计

核心理念：移动优先，不带断点前缀的工具类默认在移动端生效，通过 `sm:`（≥640px）、`md:`（≥768px）、`lg:`（≥1024px）等前缀覆盖更大屏幕。

关键细节：

- max-* 变体：用于“小于指定断点”生效，如 `max-md:p-4` 表示屏幕宽度 <768px 时生效。
- 任意数值断点：通过 `min-[320px]:`、`max-[600px]:` 定义一次性断点，无需配置全局 screens。

示例：

```html
<div class="p-4 md:p-6 lg:p-8 min-[320px]:text-center max-[600px]:bg-sky-300">
  响应式容器
</div>
```

对应问题：移动优先理念在 Tailwind 响应式设计中如何体现？如何实现“仅在某个区间断点生效”的样式？

#### 暗黑模式

核心实现：通过 `dark:` 变体控制暗黑模式样式，核心是配置暗黑模式的判定方式，分两种策略：

- 跟随系统（media）：基于浏览器 `prefers-color-scheme` 媒体查询，自动切换，配置 `darkMode: 'media'`（默认）。
- 手动切换（selector/class）：通过根节点 `data-theme="dark"` 或 `class="dark"` 触发，适合用户手动切换场景。

Nuxt 中实现首屏不闪（FOUC 解决）：在 nuxt.config.ts 中注入同步脚本，Hydration 前加载主题。

```typescript
// nuxt.config.ts
app: {
  head: {
    script: [
      {
        hid: 'theme-init',
        children: `
          (function () {
            try {
              const saved = localStorage.getItem('theme') || 'system';
              const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              const theme = saved === 'system' ? (prefersDark ? 'dark' : 'light') : saved;
              document.documentElement.setAttribute('data-theme', theme);
            } catch (e) {}
          })();
        `,
      },
    ],
  },
}
```

对应问题：如何实现“亮/暗/跟随系统”三态主题切换？如何解决暗黑模式首屏闪烁问题？

#### 风格重复使用（抽象层设计）

推荐优先级：组件化封装 > @apply 提取，避免滥用抽象导致维护成本上升。

- 组件化封装（推荐）：在 Vue/Nuxt 中，将高频复用的样式组合封装为组件（如 Button、Card），通过 props 控制变体，语义清晰且便于维护。
- @apply 提取（补充）：将高频重复的工具类组合为自定义类，适合小而通用的样式块，不建议滥用。

示例（@apply 用法）：

```css
@layer components {
  .btn-base {
    @apply px-4 py-2 rounded-lg font-semibold transition-colors;
  }
  .btn-primary {
    @apply btn-base bg-blue-600 text-white hover:bg-blue-700;
  }
}
```

对应问题：为什么不建议滥用 @apply 指令？组件化封装相比 @apply 有什么优势？

#### Tailwind v4 核心指令与函数

核心指令（CSS 层面）：

- @import "tailwindcss"：v4 核心入口，替代 v3 的 `@tailwind base/components/utilities`。
- @theme：定义主题变量，自动映射为工具类，支持 OKLCH 颜色、自定义断点等。
- @utility：自定义工具类，支持变体叠加（如 `hover:glass`）。
- @variant：在自定义 CSS 中套用 Tailwind 变体（如 dark、hover）。
- @custom-variant：自定义变体前缀，基于属性选择器等定义触发条件。

常用函数：

- --alpha()：给主题颜色添加透明度，如 `--alpha(var(--color-primary) / 12%)`。
- --spacing()：引用主题间距标尺，如 `padding: --spacing(6)`。

对应问题：Tailwind v4 的 `@utility` 与 v3 的 `@layer utilities` 有什么区别？`--alpha()` 函数相比直接写 `rgba()` 有什么优势？

### 常见踩坑点汇总

- 类名不生效：优先排查 `content` 配置是否覆盖目标文件，动态拼接类名需改为枚举写法。
- 优先级混乱：遵循三层样式体系，工具类优先级最高，避免滥用 `!important`，可通过 `important: '#app'` 配置提升工具类特异性。
- v4 迁移问题：v4 移除了部分 v3 内置工具类，需通过 `@utility` 自定义，`@tailwind` 指令替换为 `@import "tailwindcss"`。
- daisyUI 主题冲突：确保 daisyUI 主题与 Tailwind darkMode 判定方式一致，避免同时使用多套主题系统。

对应问题：如何快速定位 Tailwind 样式问题？v3 迁移到 v4 时，哪些配置需要重点修改？