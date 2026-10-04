---
categories:
  - Nuxt
---
# SEO 机制

> **文档职责**：本文从 Nuxt 与 SEO 工程视角讨论 Crawl / Render / Index、TDK、SSR / SSG / CSR / Hybrid 等落地策略；MPA / SPA、CSR / SSR / SSG 的通用定义、Hydration 生命周期和渲染策略边界统一参考 [Web 渲染架构](./W-Web渲染架构.md)，本文不再承担第二套通用渲染模型。


## SEO 到底在解决什么问题

SEO（Search Engine Optimization）的目标不是“加几个 meta 就完事”，而是让搜索引擎能**稳定地**完成三件事，这也是SEO工作的核心逻辑，缺一不可：

- **抓取（Crawl）**：搜索引擎能否发现你的 URL，以及能否顺着当前页面的链接，进一步发现站点内更多相关页面，这是SEO的基础前提——只有能被抓取，后续的索引、排序才有意义。

- **渲染（Render）**：页面内容是否需要执行大量 JS 才能显示。如果内容过度依赖客户端 JS 注入，搜索引擎抓取后需要进入渲染队列等待渲染，再进行后续处理，会增加延迟或出现内容不一致的问题。

- **索引与排序（Index & Rank）**：搜索引擎能否理解页面内容、内容是否存在重复、是否具备权威性，以及页面用户体验是否良好，这些直接决定了页面在搜索结果中的排名位置。

关于“渲染”这一步，Google 明确描述了其处理 JS 的完整流程：抓取→进入渲染队列→渲染→再回到处理与索引。需要明确的是，JS 代码越繁重、内容越依赖客户端注入，就越容易出现渲染延迟、内容不一致的问题，进而影响抓取和索引效率。

## SEO 的内容版图

在 Nuxt 官网这类场景中，SEO 工作可按落地优先级拆分为三层，聚焦核心需求、避免无效投入，这也是实际项目中最需要重点关注的内容：

### 技术 SEO（基础核心：可抓取、可索引、少重复）

技术 SEO 是SEO的基础，核心目标是确保搜索引擎能正常抓取、顺利索引页面，同时避免重复内容分散权重，具体包含以下关键工作：

- robots 控制：通过 robots.txt 文件、meta robots 标签、HTTP Header 三种方式，明确告知搜索引擎哪些页面可以抓取、哪些页面可以收录，避免无效抓取浪费资源。

- sitemap（站点地图）：将站点中“应该被搜索引擎发现的 URL 集合”系统化地提交给爬虫，帮助爬虫快速、全面地发现站点核心页面，尤其适合页面较多的官网。

- canonical（规范链接）：当同一内容对应多个 URL 时（如带参数的页面、分页页面），通过 canonical 标签告知搜索引擎“该内容的主版本 URL 是哪一个”，避免重复内容分散权重。

- i18n 多语言 SEO（多语言站点必备）：通过 hreflang 标签、不同语言对应的 sitemap、语言版本隔离等方式，避免不同语言版本的页面互相抢排名，确保不同地区、不同语言的用户能搜索到对应版本的页面。

- 结构化数据：基于 Schema.org 规范配置结构化数据，这是实现搜索结果富摘要、富结果的前提，能让搜索结果更具吸引力，提升点击率。

- 链接健康：定期检查站内死链、错误跳转（如 302 滥用、404 页面），同时优化 404 模板质量，避免死链影响抓取效率和用户体验，进而影响排名。

### 页面 SEO（内容核心：可理解、匹配查询意图）

页面 SEO 聚焦于页面内容本身，核心目标是让搜索引擎能清晰理解页面内容，且内容与用户的搜索意图高度匹配，具体包含以下工作：

- TDK 配置：即 Title（页面标题）、Description（页面描述）、可选的 Keywords（关键词），是页面 SEO 最基础、最重要的部分，直接影响搜索结果展示和点击率。

- 标题结构与语义化：合理使用 H1-H3 标题层级（一个页面建议只保留一个 H1，对应页面核心主题；H2 对应二级模块，H3 对应三级子模块），确保页面语义清晰；同时确保首屏核心内容在 HTML 中直接呈现，避免依赖 JS 渲染后才显示。

- 多媒体与社交分享优化：给图片添加 alt 属性（描述图片内容，帮助搜索引擎理解图片，同时提升无障碍体验）；配置 Open Graph（OG）和 Twitter 标签，优化页面分享到社交平台（微信、LinkedIn、Facebook、Twitter 等）的卡片展示，间接影响页面传播度和访问量。

### 体验与性能 SEO（加分项：影响收录效率与排名表现）

用户体验和页面性能虽然不直接决定排名，但会影响搜索引擎的收录效率和用户停留时长，进而间接影响排名，核心关注以下内容：

- Nuxt 渲染方式输出质量：SSR（服务端渲染）、SSG（静态生成）的输出稳定性，直接影响爬虫抓取到的内容完整性。

- 首屏性能：首屏加载速度、核心内容的可见性，避免首屏空白时间过长，影响用户体验和爬虫对页面的评价。

- 内容稳定性：页面内容、链接、meta 信息避免频繁变更，确保搜索引擎抓取到的内容与用户实际访问的内容一致。

## 页面渲染方式与 SEO 的对应关系（Nuxt 视角）

Nuxt 支持多种页面渲染方式，不同渲染方式对 SEO 的影响核心差异在于：**爬虫拿到的第一份 HTML 到底包含多少真实内容**。不同渲染方式适配不同的场景，需结合 SEO 需求选择，具体对应关系如下：

### CSR（纯客户端渲染）

- 核心特点：初始 HTML 内容极少，页面核心内容、链接、meta 信息均依赖 JS 执行后才能“动态生成”。

- SEO 表现：Google 等主流搜索引擎虽能处理 JS，但需要经过“抓取→进入渲染队列→渲染→再处理索引”的链路，会带来不确定性和渲染延迟，容易导致内容抓取不完整、索引效率低。

- 适配场景：适合后台管理系统、工具类站点等强交互、弱 SEO 需求的场景，不适合依赖 SEO 获取流量的官网、内容站。

### SSR（服务端渲染）

- 核心特点：服务端接收请求后，直接渲染出包含完整内容、标题、meta、链接的 HTML，发送给客户端（爬虫和用户）。

- SEO 表现：对爬虫和社交平台分享爬虫（如微信爬虫）更友好，无需依赖客户端 JS 渲染，能确保爬虫快速、稳定地抓取到完整内容，降低抓取和索引的不确定性。

- 适配场景：适合内容频繁更新、强 SEO 需求的官网、资讯站、电商详情页等场景。

### SSG（静态生成）

- 核心特点：在项目构建阶段，就提前生成所有页面的完整 HTML，后续请求直接返回静态 HTML 文件，无需服务端实时渲染。

- SEO 表现：抓取和性能表现最优，爬虫请求时可直接获取完整内容，无需等待渲染，索引效率极高；同时静态页面加载速度快，用户体验好。

- 适配场景：适合内容相对稳定、更新频率低的页面，如官网首页、关于我们、文档页、博客详情页等。

### Hybrid（混合渲染）

- 核心特点：Nuxt 最常见的最佳实践，按路由需求灵活选择渲染方式——营销页、内容页等强 SEO 页面采用 SSR/SSG，确保抓取和索引效果；后台管理、个人中心等强交互、弱 SEO 区域采用 CSR，兼顾交互体验和开发效率。

- 补充说明：Google 明确将“动态渲染（dynamic rendering）”称为权宜之计（workaround），不推荐作为 Nuxt 官网这类强 SEO 站点的主渲染路线。

## TDK 详解：正确用法与伪需求区分

TDK 是页面 SEO 的核心，很多人容易陷入“堆砌关键词”“随便写描述”的误区，下面明确 TDK 的正确用法、核心要点，以及需要规避的伪需求：

### Title（页面标题）

- 影响范围：浏览器标签显示文本、搜索结果标题链接、社交平台分享卡片标题（若未单独配置 OG 标题，会复用该标题）。

- 核心要点：每页标题必须唯一，不能重复；准确表达页面核心主题和价值点，避免空洞；控制长度（通常建议 30-60 个字符），避免被搜索引擎截断；避免模板化重复（如所有页面都加相同的后缀，导致标题无差异化）。

- Nuxt 落地方式：通过 `useSeoMeta({ title })` 配置页面级标题，或通过全局 `titleTemplate` 配置统一的标题模板（如页面标题 + 站点名称）。

### Description（页面描述）

- 影响范围：常用于搜索引擎结果摘要的候选（但搜索引擎有权根据用户搜索意图改写摘要，不一定会完全显示配置的内容）；间接影响搜索结果点击率。

- 核心要点：本质是“广告文案”，准确概括页面核心内容和卖点，吸引用户点击；避免堆砌关键词，语言自然流畅；每页描述必须唯一，与页面内容高度匹配；控制长度（通常建议 80-150 个字符）。

- Nuxt 落地方式：通过 `useSeoMeta({ description })` 配置，可在 app.vue 配置全局默认描述，页面级配置覆盖全局默认值。

### Keywords（关键词 meta，伪需求为主）

- 现实情况：Google 等主流搜索引擎明确表示，不使用 keywords meta 标签参与网页排名，仅部分国内搜索引擎（如百度）可能会参考，但权重极低。

- 结论：可选择性保留（若面向国内搜索生态），但无需投入大量精力堆砌关键词，重点还是做好页面内容和标题优化。

- Nuxt 落地方式：通过 `useSeoMeta({ keywords: '关键词1,关键词2' })` 配置，无需过度复杂。

补充：搜索引擎支持的抓取与索引控制类 meta（如 robots 标签），需严格按照官方支持的参数配置，避免配置错误导致页面无法索引。

## SEO 需求与 Nuxt 能力/模块的对应关系

纯 Vue 项目（CSR）的 SEO 痛点在于，初始 HTML 仅包含空容器，核心内容、链接、Meta 标签均需通过客户端 JS 执行后注入，搜索引擎抓取时需等待 JS 渲染完成，易出现内容抓取不完整、索引效率低、社交分享卡片异常等问题。

Nuxt 通过以下特性解决上述痛点，为 SEO 提供天然支撑：

- 支持 SSR/SSG/混合渲染：服务端渲染或静态生成阶段，直接生成包含完整内容、Meta 标签、链接的 HTML，搜索引擎可直接抓取，无需等待客户端 JS 执行，大幅提升抓取效率与内容完整性。

- 路由规范化：内置路由管理，避免路径混乱（如尾斜杠、大小写不一致），减少重复内容风险。

- 生态适配：与 @nuxtjs/seo、@nuxt/content 等模块深度集成，快速实现专业级 SEO 配置，无需手动编写大量原生代码。

Nuxt 中 head 标签的基础管理能力来自 Unhead 库，官方推荐使用 `useSeoMeta` 和 `useHead` 两个组合式 API 管理 meta 标签和 head 内容；在此基础上，`@nuxtjs/seo` 模块整合了 6 个常用 SEO 模块，可按需安装（也可单装），覆盖绝大多数官网 SEO 需求，具体对应关系如下（按官网常用链路排序）：

- TDK、OG 标签、Twitter 标签、基础 meta 标签：对应 `useSeoMeta()`（页面级配置，支持类型安全，减少配置错误）+ `useHead()`（全局不变的 meta 配置）。

- 站点统一信息（域名、站点名称、默认描述等）：对应 Nuxt 的 `site` 配置，属于 Nuxt SEO 的共享配置，可减少重复配置，为 canonical、ogUrl、sitemap 等提供基准。

- robots 控制（robots.txt 文件、noindex/nofollow 标签、X-Robots-Tag 响应头）：对应 `@nuxtjs/robots` 模块，可灵活配置不同环境的 robots 规则。

- sitemap 站点地图（含动态 URL 源）：对应 `@nuxtjs/sitemap` 模块，支持配置静态 URL，也可通过 sources 拉取动态 URL（如从 API 获取资讯列表 URL）。

- canonical 规范链接：对应 `nuxt-seo-utils` 模块，可自动生成 canonical 链接（基于 site.url + 当前路由），无需手动配置每个页面。

- 结构化数据（JSON-LD）：对应 `nuxt-schema-org` 模块，默认支持 WebSite、WebPage 类型，可按需配置 Organization（组织）、Person（个人）等身份信息，简化结构化数据配置流程。

- 社交分享图（动态 OG Image）：对应 `nuxt-og-image` 模块，可生成动态的 OG 分享图，适配不同页面的分享需求。

- 站内死链检测：对应 `nuxt-link-checker` 模块，可在项目构建期检查站内死链，并生成检测报告，方便及时修复。

- 路由级 SEO 默认策略（如默认 ogType、面包屑等）：对应 `nuxt-seo-utils` 模块 + `routeRules.seoMeta` 配置，可统一配置某类路由的 SEO 默认规则。

- 多语言 hreflang 等 locale SEO 配置：对应 `@nuxtjs/i18n` 模块的 `useLocaleHead()` 组合式 API，自动生成 hreflang 标签，配合多语言 sitemap，避免语言版本互相抢排名。

# Nuxt SEO

## Nuxt SEO 完整配置（三层配置+分工）

实际 Nuxt 项目中，SEO 配置分为三层：`nuxt.config.ts` 中的全局 `app.head` 配置、`app.vue` 中的 `useHead`/`useSeoMeta` 配置、页面级的 `useHead`/`useSeoMeta` 配置。三层配置各有分工、互不冲突，核心目标是“全局统一、页面差异化、配置不重复”，下面给出可直接落地的模板，并明确各层分工。

### 完整配置模板（Nuxt4 + @nuxtjs/seo）

#### 1. nuxt.config.ts：站点级基建 + 静态 head 配置

核心定位：配置站点级基础信息、SEO 相关模块，以及“永远不变的 head 内容”，属于构建期/运行期都稳定的静态配置，不依赖路由和页面数据。

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // 引入 SEO 核心模块（整合了常用 SEO 子模块，也可单装）
  modules: ['@nuxtjs/seo'],

  // 站点级元信息：给 canonical、ogUrl、sitemap、schema 等提供基准，全局统一
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://example.com', // 站点主域名（多环境适配）
    name: '你的站名', // 站点名称（如“Nuxt 中文官网”）
    description: '默认描述：一句话定位站点核心价值', // 全局默认描述，页面可覆盖
    defaultLocale: 'zh-CN', // 默认语言（多语言站点必备）
  },

  // 全局静态 head 配置：不依赖路由、不依赖数据，全站恒定
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' }, // html 语言声明（也可放 app.vue，固定不变建议放这里）
      link: [
        { rel: 'icon', href: '/favicon.ico' }, // 浏览器图标
        { rel: 'manifest', href: '/site.webmanifest' }, // PWA 清单
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }, // iOS 主屏幕图标
      ],
      meta: [
        // 仅放“固定不变”的 meta 标签，避免与 app.vue、页面级配置重复
        { name: 'theme-color', content: '#0b0f14' }, // 移动端浏览器地址栏主题色
      ],
    },
  },

  // robots 配置：建议环境化，测试站禁止索引，生产站允许索引
  robots: {
    rules: [
      { userAgent: '*', allow: '/' }, // 生产站配置：允许所有爬虫抓取所有路径
      // 测试站可改为：{ userAgent: '*', disallow: '/' } 或 { userAgent: '*', allow: '/', meta: { robots: 'noindex,nofollow' } }
    ],
  },

  // sitemap 配置：初期可只保留开关，后续有动态路由时，配置 sources 拉取动态 URL
  sitemap: {
    // sources: ['/api/__sitemap__/urls'], // 动态 URL 源（如从 API 获取资讯 URL）
  },

  // 结构化数据基础配置：配置站点组织身份，全局生效
  schemaOrg: {
    identity: {
      type: 'Organization', // 实体类型（组织/个人，官网常用 Organization）
      name: '公司/组织名称', // 组织名称（如“字节跳动”）
      logo: 'https://example.com/logo.png', // 组织 logo（绝对 URL）
      sameAs: ['https://www.linkedin.com/company/xxx'], // 组织关联的社交账号（可选）
    },
  },
})
```

#### 2. app.vue：全站默认 SEO 策略 + 可变逻辑配置

核心定位：配置全站通用的 SEO 默认规则、带逻辑的 head 内容，以及可被页面覆盖的默认值，属于运行时配置，可依赖环境变量、runtimeConfig 等。

```vue
<!-- app.vue -->
<script setup lang="ts">
// 获取全局运行时配置（站点 URL 等，避免硬编码）
const config = useRuntimeConfig()

// 站点基础信息（从 runtimeConfig 或直接定义，统一管理）
const siteUrl = config.public.siteUrl || 'https://example.com'
const siteName = '你的站名'
const defaultDescription = '默认描述：一句话定位站点核心价值'

// 1) 全局标题模板：统一所有页面的标题格式，页面级 title 会自动拼接站点名称
useHead({
  titleTemplate: (t) =>`(t ? `${t} - ${siteName}` : siteName), // 若页面无 title，直接显示站点名称
})

// 2) 全局 SEO 默认值：页面不配置时，使用该默认值，避免 SEO 信息为空
useSeoMeta({
  description: defaultDescription, // 全局默认描述

  // OG 标签默认值（社交分享兜底）
  ogSiteName: siteName,
  ogType: 'website', // 全局默认 ogType（首页/普通页面常用 website）
  ogUrl: siteUrl, // 全局默认 ogUrl（首页 URL）
  ogDescription: defaultDescription,

  // Twitter 标签默认值（社交分享兜底）
  twitterCard: 'summary_large_image', // 常用卡片类型（大图摘要）
  twitterDescription: defaultDescription,
})

// 3) 环境化索引策略：生产站允许索引，测试站禁止索引（推荐放这里，灵活度高）
const isProd = process.env.NODE_ENV === 'production'
useHead({
  meta: [
    { name: 'robots', content: isProd ? 'index,follow' : 'noindex,nofollow' },
  ],
})
</script>

<template>
 `<NuxtPage />
</template>
```

#### 3. 页面级：仅配置本页差异化 SEO 信息

核心定位：只配置当前页面独有的 SEO 信息，覆盖 app.vue 中的默认值，依赖当前页面的路由、数据（如 API 返回的文章信息），不重复配置全局已有的内容（如 favicon、标题模板）。

示例：资讯详情页 /news/[id].vue（动态路由，依赖 API 数据）

```vue
<!-- pages/news/[id].vue -->
<script setup lang="ts">
// 获取当前路由、全局配置
const route = useRoute()
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || 'https://example.com'
const id = String(route.params.id) // 动态路由参数（资讯 ID）

// 从 API 获取当前资讯数据（假设接口返回文章标题、摘要、封面图等）
const { data: article } = await useAsyncData(`news:${id}`, async () =>`{
  return await $fetch(`/api/news/${id}`)
})

// 若文章不存在，返回 404（避免无效页面被索引）
if (!article.value) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

// 页面差异化 SEO：覆盖 app.vue 中的默认值，仅配置本页独有内容
useSeoMeta({
  title: article.value.title, // 文章标题（覆盖全局标题模板）
  description: article.value.excerpt, // 文章摘要（覆盖全局默认描述）
  ogTitle: article.value.title, // 分享标题（与页面标题一致，也可单独配置）
  ogDescription: article.value.excerpt, // 分享摘要（与页面描述一致）
  ogType: 'article', // 资讯页 ogType 改为 article（区别于首页的 website）
  ogUrl: `${siteUrl}${route.path}`, // 文章规范 URL（绝对地址）
  ogImage: article.value.coverImage || undefined, // 文章封面图（无则不配置）
  twitterImage: article.value.coverImage || undefined, // Twitter 分享图（与 OG 图一致）
})

// 页面特有结构化数据（NewsArticle 类型，适配资讯页）
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'NewsArticle', // 结构化数据类型（资讯文章）
        headline: article.value.title, // 文章标题
        description: article.value.excerpt, // 文章摘要
        dateModified: article.value.updatedAt, // 文章更新时间（ISO 格式字符串）
        mainEntityOfPage: `${siteUrl}${route.path}`, // 文章规范 URL
        image: article.value.coverImage ? [article.value.coverImage] : undefined, // 文章封面图（数组格式）
      }),
    },
  ],
})
</script>
```

### 三层配置的分工（职责边界，避免混乱）

#### 1. nuxt.config.ts 的 app.head：静态、全站恒定、与路由无关

核心原则：所有页面都一样，且永远不会变化的内容，优先放这里，减少运行时合并复杂度。

- 建议放的内容：favicon、manifest、apple-touch-icon 等资源链接；<html lang>（固定不变时）；永不变化的 meta 标签（如 theme-color）；全站固定的 preconnect、dns-prefetch 等性能优化链接。

- 不建议放的内容：每页不同的 title/description；需要依赖路由、数据才能确定的 ogUrl/ogImage；带环境化逻辑的内容（除非用运行时环境变量拼接，否则不推荐）。

#### 2. app.vue 的 useHead/useSeoMeta：全站默认策略 + 可变逻辑

核心原则：所有页面默认都需要，允许页面覆盖，且可能包含环境、逻辑判断的内容，优先放这里，既能兜底，又能灵活适配不同场景。

- 建议放的内容：titleTemplate（统一标题格式）；全局默认 description、默认 OG/Twitter 标签（避免页面漏配）；环境化 robots 配置（测试站 noindex，生产站 index）；需要从 runtimeConfig 读取的内容（如 siteUrl）；全站通用但需要简单逻辑的 head 内容。

- 不建议放的内容：明确只属于某个页面的数据（如文章标题、岗位标题）；与页面内容强相关的结构化数据；页面级独有的 meta 标签。

#### 3. 页面级的 useHead/useSeoMeta：仅负责本页差异化

核心原则：只有当前页面/某类页面才有，或依赖路由、页面数据的内容，必须放这里，确保 SEO 信息与页面内容高度匹配。

- 建议放的内容：本页独有的 title/description（TDK）；本页独有的 ogTitle/ogDescription/ogType/ogImage/ogUrl；本页特有的结构化数据（如资讯页的 NewsArticle、招聘页的 JobPosting）；本页特殊的 canonical 链接（若有特殊需求，默认由 seo-utils 自动生成）。

- 不建议放的内容：favicon、manifest 等全局固定资源；全站通用的 titleTemplate、默认描述；与页面内容无关的 SEO 信息。

### 配置判断规则（实用技巧）

实际开发中，可通过以下3个问题快速判断配置应该放哪一层，避免混乱：

1. 所有页面都一样，且永远不变？→ nuxt.config.ts 的 app.head

2. 所有页面默认都有，但允许页面覆盖，且可能有环境/逻辑？→ app.vue 的 useSeoMeta/useHead

3. 只要这页/这类页才有，或依赖 route/data？→ 页面级的 useSeoMeta/useHead

## useHead 与 useSeoMeta 的区别（字段对应+用法）

Nuxt 中，`useHead` 和 `useSeoMeta` 都是用于配置 head 内容的组合式 API，但两者定位不同、适用场景不同，核心区别在于“配置的内容类型”和“使用便捷性”，下面明确两者的适用字段、用法及对应关系。

### 1. useSeoMeta：专注 SEO 元信息，类型安全、少出错

核心定位：专门用于配置 SEO 相关的 meta 标签，支持类型安全（避免拼写错误），自动转换字段格式（如将 ogTitle 转换为`<meta property="og:title">），无需手动写标签类型，适合配置所有标准 SEO 元信息。

#### 适用字段及示例

##### 基础 TDK

对应最基础的页面 SEO 信息，也是每个页面必配的内容：

```typescript
// 基础 TDK 配置（页面级示例）
useSeoMeta({
  title: '加入我们 - 招聘主页', // 页面标题，会配合 app.vue 的 titleTemplate 拼接
  description: '招聘主页：专注于招聘前端开发、产品经理等岗位，提供有竞争力的薪资和完善的福利。', // 页面描述
  keywords: 'Nuxt, 前端招聘, 产品经理招聘' // 可选，价值低，不建议堆砌
})
```

##### Robots 索引控制（页面级）

控制当前页面是否被索引、是否允许爬虫跟踪页面内链接：

```typescript
// 允许索引、允许跟踪链接（默认值，可省略）
useSeoMeta({ robots: 'index,follow' })

// 禁止索引、禁止跟踪链接（适用于隐私页、测试页）
useSeoMeta({ robots: 'noindex,nofollow' })
```

##### Open Graph（OG 标签，社交分享必备）

用于控制页面分享到社交平台（微信、LinkedIn、Facebook 等）的卡片展示，对应`<meta property="og:*">`标签：

```typescript
useSeoMeta({
  ogTitle: '加入我们 - 你的站名', // 分享标题（可与页面 title 不同，更偏传播）
  ogDescription: '招聘主页：专注于招聘前端开发、产品经理等岗位，提供有竞争力的薪资和完善的福利。', // 分享摘要
  ogType: 'website', // 页面类型（首页/普通页面用 website，资讯页用 article）
  ogUrl: 'https://example.com/join', // 分享对应的规范 URL（绝对地址）
  ogImage: 'https://example.com/og/join.png', // 分享封面图（绝对地址，建议尺寸 1200*630）
  ogSiteName: '你的站名' // 站点名称，显示在分享卡片上
})
```

##### Twitter Card（Twitter 分享专用）

用于控制页面分享到 Twitter 平台的卡片展示，对应`<meta name="twitter:*">`标签：

```typescript
useSeoMeta({
  twitterCard: 'summary_large_image', // 卡片类型（常用大图摘要，适配移动端）
  twitterTitle: '加入我们 - 你的站名', // Twitter 分享标题
  twitterDescription: '招聘主页：专注于招聘前端开发、产品经理等岗位，提供有竞争力的薪资和完善的福利。', // Twitter 分享摘要
  twitterImage: 'https://example.com/og/join.png', // Twitter 分享封面图
  twitterSite: '@yourSite', // 站点 Twitter 账号（可选）
  twitterCreator: '@yourCreator' // 内容创建者 Twitter 账号（可选）
})
```

### 2. useHead：通用 head 标签生成器，灵活适配所有场景

核心定位：通用型 head 配置 API，可配置所有 head 标签（包括 link、script、style、htmlAttrs、bodyAttrs 等），不局限于 SEO 元信息，适合配置非 SEO 专用、或需要完全自定义标签的内容。

#### 适用字段及示例

##### html/body 属性配置

配置`<html>`和`<body>`标签的属性（如语言、类名、方向等），常用于全局主题、无障碍适配：

```typescript
useHead({
  htmlAttrs: { 
    lang: 'zh-CN', // html 语言声明
    dir: 'ltr' // 文本排版方向（左到右，默认 ltr，阿拉伯语等用 rtl）
  },
  bodyAttrs: { 
    class: 'bg-neutral-950 text-white' // 全局 body 类名，用于主题样式
  }
})
```

##### link 标签配置（canonical、图标、性能优化等）

配置各类`<link>`标签，包括规范链接、图标、PWA 清单、性能优化（preconnect、dns-prefetch）等：

```typescript
useHead({
  link: [
    { rel: 'canonical', href: 'https://example.com/news' }, // 手动配置 canonical（默认自动生成，特殊需求时用）
    { rel: 'icon', href: '/favicon.ico' }, // 浏览器图标
    { rel: 'manifest', href: '/site.webmanifest' }, // PWA 清单
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }, // 预连接字体域名，优化加载速度
    { rel: 'dns-prefetch', href: '//cdn.example.com' }, // DNS 预解析，降低延迟
    { rel: 'alternate', hreflang: 'en-US', href: 'https://example.com/en' } // 多语言 alternate 标签
  ]
})
```

##### 全局固定 meta 标签（非 SEO 专用）

配置 charset、viewport、theme-color 等全局固定的 meta 标签，这些标签不随页面变化，且不属于 SEO 核心元信息：

```typescript
useHead({
  meta: [
    { charset: 'utf-8' }, // 字符编码，避免乱码，建议放最前面
    { 
      name: 'viewport', 
      content: 'width=device-width, initial-scale=1, maximum-scale=5' 
    }, // 移动端视口配置，影响响应式渲染
    { name: 'theme-color', content: '#0b0f14' }, // 移动端浏览器地址栏主题色
    { name: 'referrer', content: 'strict-origin-when-cross-origin' } // 跨站请求 Referer 策略，隐私/安全优化
  ]
})
```

##### script 标签配置（结构化数据、第三方脚本）

配置`<script>`标签，包括 JSON-LD 结构化数据、第三方统计脚本、埋点脚本等，这是 `useHead` 区别于 `useSeoMeta` 的核心场景之一：

```typescript
// 示例1：配置 JSON-LD 结构化数据（招聘页 JobPosting 类型）
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: '前端开发工程师',
        description: '负责 Nuxt 项目开发，要求熟练掌握 Vue3、TypeScript 等技术',
        datePosted: '2026-02-10T00:00:00Z',
        employmentType: 'FULL_TIME', // 全职
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: '北京',
            addressCountry: 'CN'
          }
        },
        url: 'https://example.com/join/frontend'
      })
    }
  ]
})

// 示例2：加载第三方统计脚本（如百度统计、Google Analytics）
useHead({
  script: [
    { 
      src: 'https://example.com/analytics.js', 
      defer: true // 延迟加载，不阻塞页面渲染
    }
  ]
})
```

### 3. 快速对照：常见字段对应 API

#### 优先用 useSeoMeta 的字段（SEO 核心元信息）

所有与 SEO 直接相关、属于标准 meta 标签（name/property）的字段，优先用 `useSeoMeta`，类型安全、少出错：

title、description、keywords（可选）、robots、ogTitle、ogDescription、ogType、ogUrl、ogImage、ogSiteName、twitterCard、twitterTitle、twitterDescription、twitterImage、twitterSite、twitterCreator

#### 优先用 useHead 的字段（通用 head 标签）

非 SEO 专用、或需要自定义标签（link、script、htmlAttrs 等）的内容，优先用 `useHead`，灵活度高：

htmlAttrs、bodyAttrs、link（所有类型）、meta（charset、viewport、theme-color、referrer 等）、script（所有类型）、style（内联样式，少用）

## 常见 head/SEO 字段详解

下面按实际项目中最常用的顺序，详细说明各类 head/SEO 字段的作用、要点及配置建议，明确每个字段的核心价值，避免无效配置：

### 一、文档基础信息（TDK / 页面摘要）

#### 1. title（页面标题）

- 标签：<title>（由 `useSeoMeta` 的 title 字段自动生成）

- 作用：浏览器标签显示文本；搜索引擎结果标题的核心来源（直接影响点击率）；社交平台分享时，若未配置 OG 标题，会复用该标题。

- 要点：每页必须唯一，不能重复；控制长度（30-60 个字符），避免被搜索引擎截断；与页面主标题（H1）一致，但可添加品牌后缀（如“页面标题 - 站点名称”）；避免堆砌关键词，语言自然。

- 配置建议：使用 `useSeoMeta({ title })`，配合 app.vue 的 `titleTemplate` 统一格式。

#### 2. description（页面描述）

- 标签：<meta name="description">（由 `useSeoMeta` 的 description 字段自动生成）

- 作用：搜索引擎结果摘要的主要候选（不保证完全显示，搜索引擎可能根据用户搜索意图改写）；核心作用是吸引用户点击，间接影响排名。

- 要点：每页必须唯一；准确概括页面核心内容和价值点，避免空洞；控制长度（80-150 个字符）；避免堆砌关键词，语言自然流畅，符合“广告文案”逻辑。

- 配置建议：使用 `useSeoMeta({ description })`，在 app.vue 配置全局默认值，页面级覆盖。

#### 3. keywords（关键词，可选）

- 标签：<meta name="keywords">（由 `useSeoMeta` 的 keywords 字段自动生成）

- 作用：传统 SEO 关键词提示，用于告知搜索引擎页面核心关键词；对 Google 等主流搜索引擎基本无排名价值，仅部分国内搜索引擎（如百度）可能参考。

- 要点：可写可不写；若写，控制在 3-5 个关键词，避免堆砌；关键词需与页面内容高度相关。

- 配置建议：使用 `useSeoMeta({ keywords: '关键词1,关键词2' })`，无需投入过多精力。

### 二、索引与抓取控制（Robots / Bot 指令）

#### 1. robots（索引控制核心）

- 标签：<meta name="robots" content="...">（由 `useSeoMeta` 的 robots 字段自动生成）

- 作用：控制搜索引擎爬虫的行为，包括是否索引当前页面（index/noindex）、是否跟踪页面内链接（follow/nofollow）、是否生成页面快照（noarchive）、是否显示搜索摘要（nosnippet）等。

- 常见值：index,follow（默认语义，允许索引、允许跟踪链接）；noindex,nofollow（禁止索引、禁止跟踪链接，适用于测试页、隐私页、搜索结果页）；noarchive（禁止生成页面快照）；nosnippet（禁止显示搜索摘要）。

- 要点：对不该出现在搜索结果中的页面（如内部测试页、后台页、404 页），必须配置 noindex,nofollow；避免全局配置 noindex，导致所有页面无法索引。

- 配置建议：使用 `useSeoMeta({ robots })`，在 app.vue 配置环境化逻辑（生产站 index,follow，测试站 noindex,nofollow）。

#### 2. googlebot / bingbot（可选，特定爬虫控制）

- 标签：<meta name="googlebot" content="...">`/`<meta name="bingbot" content="...">

- 作用：对特定搜索引擎爬虫（如 Google 爬虫、Bing 爬虫）做更细粒度的控制，与 robots 标签功能类似，但仅对指定爬虫生效。

- 要点：一般不需要配置，若有特殊需求（如仅允许 Google 爬虫抓取，禁止 Bing 爬虫），可单独配置；配置时需注意与全局 robots 标签不冲突。

- 配置建议：使用 `useHead({ meta: [{ name: 'googlebot', content: 'index,follow' }] })`，无特殊需求可省略。

### 三、规范化与重复内容治理（Canonical / Alternate）

#### 1. canonical（规范链接，重复内容治理核心）

- 标签：<link rel="canonical" href="...">（由 `useHead` 的 link 字段配置，或 `nuxt-seo-utils` 自动生成）

- 作用：当同一内容对应多个 URL 时（如带参数的页面：https://example.com/news?id=1 和 https://example.com/news/1；分页页面；同内容多路径页面），通过 canonical 标签告知搜索引擎“该内容的权威 URL 是哪一个”，避免重复内容分散权重。

- 要点：建议使用绝对 URL（如 https://example.com/news/1），避免相对 URL；分页页面（如 https://example.com/news?page=2），需为每一页配置对应的 canonical 标签，避免与首页 canonical 冲突；一般由 `nuxt-seo-utils` 自动生成（基于 site.url + 当前路由），特殊需求时手动配置。

- 配置建议：默认依赖 `nuxt-seo-utils` 自动生成，特殊需求时使用 `useHead({ link: [{ rel: 'canonical', href: '绝对 URL' }] })`。

#### 2. alternate（多语言/地区版本，多语言站点必备）

- 标签：<link rel="alternate" hreflang="..." href="...">（由 `useHead` 的 link 字段配置，或 `@nuxtjs/i18n` 自动生成）

- 作用：告诉搜索引擎不同语言/地区版本的页面对应关系（如中文页面对应英文页面、中文简体对应中文繁体），避免不同语言版本的页面互相抢排名，同时帮助搜索引擎将用户引导至对应语言/地区的页面。

- 要点：多语言站点必须成对完整配置（如中文页面配置指向英文页面的 alternate，英文页面也需配置指向中文页面的 alternate）；可添加 `x-default` 标识（如 hreflang="x-default"），指定默认语言版本；hreflang 取值需规范（如中文简体 zh-CN、英文美国 en-US）。

- 配置建议：多语言站点使用 `@nuxtjs/i18n` 模块的 `useLocaleHead()` 自动生成，无需手动配置；无多语言模块时，使用 `useHead({ link: [...] })` 手动配置。

#### 3. alternate（RSS/Atom，订阅源配置）

- 标签：<link rel="alternate" type="application/rss+xml" href="..." title="...">`或`<link rel="alternate" type="application/atom+xml" href="..." title="...">（由 `useHead` 的 link 字段手动配置）

- 作用：告知搜索引擎站点的 RSS/Atom 订阅源地址，方便搜索引擎抓取站点更新内容（如资讯、博客文章），同时也便于用户订阅站点更新，适用于内容更新频繁的站点（如资讯站、博客站）。

- 要点：type 属性需区分两种格式，RSS 用 `application/rss+xml`，Atom 用 `application/atom+xml`，不可混淆；href 需填写订阅源的绝对 URL，确保可直接访问；title 属性填写订阅源名称（如“站点资讯订阅”），便于用户和搜索引擎识别；仅内容频繁更新的站点需要配置，静态官网（如关于我们、产品介绍页）无需配置。

- 配置建议：使用 `useHead({ link: [{ rel: 'alternate', type: 'application/rss+xml', href: 'https://example.com/rss.xml', title: '站点资讯订阅' }] })`，无订阅源需求可省略；若使用 Nuxt 集成的 RSS 模块，可自动生成该标签，无需手动配置。

### 四、社交分享优化（OG 标签 / Twitter Card）

社交分享优化虽不直接影响搜索引擎排名，但能提升页面分享后的点击率，间接增加站点访问量，进而辅助 SEO 效果；核心依赖 Open Graph（OG 标签）和 Twitter Card 标签，前者适配微信、LinkedIn、Facebook 等多数社交平台，后者仅适配 Twitter 平台。

#### 1. Open Graph（OG 标签，核心社交分享标签）

- 标签类型：均为`<meta property="og:*" content="...">（由 `useSeoMeta` 自动转换生成，无需手动写 property 属性）

- 核心字段及作用：
                  og:title：分享卡片标题，建议与页面 title 区分，更侧重传播性（如添加引导性语句），控制长度在 60 字符内，避免被平台截断。

- og:description：分享卡片摘要，与页面 description 可一致，核心是吸引用户点击，控制长度在 120 字符内，语言自然。

- og:type：页面类型，决定分享卡片的展示样式，常用值：website（首页、普通页面）、article（资讯、博客、文章）、product（产品页），不可随意填写。

- og:url：分享对应的规范 URL，必须为绝对 URL，建议与页面 canonical 链接一致，确保分享后跳转的是权威页面。

- og:image：分享卡片封面图，核心影响点击率，建议尺寸 1200*630（适配多数平台），格式为 JPG/PNG，必须为绝对 URL；若未配置，多数平台会自动抓取页面内图片，可能出现适配不佳的情况。

- og:site_name：站点名称，显示在分享卡片标题下方，用于告知用户站点身份，全局统一配置即可。

- 要点：所有强传播性页面（首页、资讯详情、产品页、招聘页）必须配置完整 OG 标签；图片需保证清晰度，避免使用空白、模糊或与内容无关的图片；多语言站点需为不同语言版本配置对应的 og:title、og:description 和 og:url。

- 配置建议：使用 `useSeoMeta` 配置，在 app.vue 配置全局默认值（如 og:site_name、默认 og:image），页面级覆盖差异化字段（如 og:title、og:type）；动态页面（如资讯详情）可通过 API 数据动态赋值 og:image 等字段。

#### 2. Twitter Card（Twitter 专用分享标签）

- 标签类型：均为`<meta name="twitter:*" content="...">（由 `useSeoMeta` 自动转换生成，无需手动写 name 属性）

- 核心字段及作用：
                  twitter:card：卡片类型，决定 Twitter 平台的分享卡片样式，常用值：summary_large_image（大图摘要，推荐，适配移动端和桌面端）、summary（小图摘要，适合无封面图的页面）、player（视频卡片，需额外配置视频相关字段）。

- twitter:title / twitter:description：与 og:title、og:description 作用一致，可复用其内容，也可单独配置更贴合 Twitter 传播场景的文案。

- twitter:image：Twitter 分享封面图，建议与 og:image 一致，确保尺寸适配（1200*630），避免使用透明背景（Twitter 背景为白色，透明图可能显示异常）。

- twitter:site（可选）：站点的 Twitter 账号（如 @yourSite），显示在分享卡片下方，提升品牌曝光。

- twitter:creator（可选）：内容创建者的 Twitter 账号，适用于资讯、博客等个人创作类内容。

- 要点：若未配置 Twitter 标签，Twitter 会自动抓取 OG 标签内容，但可能出现适配不佳的情况；核心传播页面建议单独配置，确保分享效果；twitter:card 字段不可省略，否则会显示默认小图卡片，影响点击率。

- 配置建议：使用 `useSeoMeta` 配置，复用 OG 标签的 title、description、image 内容，仅单独配置 twitter:card 等必要字段；全局默认配置 twitter:card 为 summary_large_image，页面级按需调整。

### 五、基础环境配置（charset / viewport 等）

这类字段不属于 SEO 核心元信息，但会影响页面渲染、用户体验和搜索引擎对页面的基础判断，属于“基础必备配置”，不可遗漏。

#### 1. charset（字符编码）

- 标签：<meta charset="utf-8">（由 `useHead` 的 meta 字段配置）

- 作用：指定页面的字符编码格式，避免出现中文乱码，确保搜索引擎和浏览器能正确识别页面文本内容。

- 要点：必须配置，且建议放在所有 meta 标签的最前面，确保优先加载；唯一推荐值为 `utf-8`，无需使用其他编码格式。

- 配置建议：在 nuxt.config.ts 的 app.head 中全局配置，无需页面级单独配置，避免重复。

#### 2. viewport（视口配置，移动端适配核心）

- 标签：`<meta name="viewport" content="...">`（由 `useHead` 的 meta 字段配置）

- 作用：控制移动端浏览器对页面的渲染方式（如页面宽度、缩放比例），直接影响移动端用户体验；搜索引擎（尤其是 Google）会优先收录移动端友好的页面，间接影响排名。

- 核心 content 值：`width=device-width, initial-scale=1, maximum-scale=5`，各参数含义：
                  width=device-width：页面宽度等于设备屏幕宽度，适配不同尺寸的移动端设备。

- initial-scale=1：初始缩放比例为 1，页面加载时按实际尺寸显示，不放大也不缩小。

- maximum-scale=5：允许用户最大缩放比例为 5，兼顾用户缩放需求和页面布局稳定性（避免缩放导致布局错乱）。

- 要点：不可遗漏，否则移动端页面会出现放大错乱、文字过小等问题，影响用户体验和 SEO；无需修改核心参数，保持默认适配即可。

- 配置建议：在 nuxt.config.ts 的 app.head 中全局配置，全站统一，无需页面级修改。

#### 3. theme-color（主题色配置，可选）

- 标签：<meta name="theme-color" content="...">（由 `useHead` 的 meta 字段配置）

- 作用：设置移动端浏览器地址栏的主题色，与站点主题色保持一致，提升品牌辨识度和用户体验；不影响 SEO 排名，但能优化页面整体质感。

- 要点：content 值填写十六进制颜色码（如 #0b0f14），建议与站点主色调一致；不同浏览器对主题色的支持略有差异，无需过度纠结兼容性。

- 配置建议：在 nuxt.config.ts 的 app.head 中全局配置，全站统一，无需单独调整。

### 六、结构化数据（JSON-LD，富结果核心）

结构化数据（基于 Schema.org 规范）是实现搜索引擎“富结果”的核心，能让搜索结果显示更丰富的信息（如文章发布时间、产品价格、招聘岗位信息等），提升搜索结果点击率；Nuxt 中可通过 `useHead` 配置 JSON-LD 脚本，或使用 `nuxt-schema-org` 模块简化配置。

#### 1. 核心作用与价值

- 帮助搜索引擎更清晰地理解页面内容（如明确区分“资讯文章”“产品”“招聘岗位”），避免内容歧义。

- 实现搜索结果富摘要（如资讯页显示发布时间、作者；产品页显示价格、评分），让搜索结果更具吸引力，提升点击率。

- 部分场景下可提升搜索排名权重（如本地商家、招聘岗位等垂直领域），但非核心排名因素，属于“加分项”。

#### 2. 常用结构化数据类型（适配官网场景）

```JavaScript

WebSite（站点级，全局配置）：描述整个站点的基本信息，如站点名称、主域名、搜索链接等，适合全局配置一次。
// 示例：WebSite 类型结构化数据（app.vue 全局配置）
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: '你的站名',
        url: 'https://example.com',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://example.com/search?q={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      })
    }
  ]
})
```

- WebPage（页面级，全局默认）：描述单个页面的基本信息，如页面标题、描述、URL 等，可作为所有页面的默认结构化数据，页面级按需覆盖。

- Article（资讯/博客页）：描述资讯、博客等文章类内容，核心字段包括标题、摘要、发布时间、更新时间、作者、封面图等，适配资讯详情页。

- JobPosting（招聘页）：描述招聘岗位信息，核心字段包括岗位名称、职责、要求、薪资、工作地点、发布时间等，适配招聘详情页。

- Organization（组织/公司，全局配置）：描述站点所属的组织或公司信息，如公司名称、logo、地址、联系方式、社交账号等，提升站点权威性，适配官网首页。

#### 3. 配置要点与建议

- 格式规范：必须使用 JSON-LD 格式（<script type="application/ld+json">），不可使用 Microdata 或 RDFa 格式，Google 等主流搜索引擎优先推荐 JSON-LD。

- 内容一致：结构化数据中的信息（如标题、URL、发布时间）必须与页面实际内容一致，避免虚假信息，否则会被搜索引擎判定为违规，影响索引。

- 简化配置：优先使用 `nuxt-schema-org` 模块，该模块可自动生成基础结构化数据（如 WebSite、WebPage），无需手动编写 JSON 脚本，仅需补充差异化字段。

- 按需配置：无需为所有页面配置复杂结构化数据，核心页面（首页、资讯详情、产品页、招聘页）配置对应类型即可，静态页面（如关于我们）可仅使用默认 WebPage 类型。

# @nuxtjs/seo

## @nuxtjs/seo 模块详解

@nuxtjs/seo 核心是“聚合模块”，整合了 7 个高频 SEO 模块，同时提供 Site Config 作为全局基准，所有模块均围绕 Site Config 实现协同工作，无需单独配置模块间的关联逻辑。

安装方式（Nuxt 3/4 通用）：

```bash
npm install @nuxtjs/seo
# 或
yarn add @nuxtjs/seo
# 或
pnpm add @nuxtjs/seo
```

基础启用配置（nuxt.config.ts）：

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/seo'], // 启用@nuxtjs/seo聚合模块，自动加载所有子模块
})
```

### Site Config（站点级配置中枢）

Site Config 并非独立功能模块，而是 @nuxtjs/seo 所有子模块的“基础数据源”，用于提供站点级的统一基准信息，避免多个模块重复配置，确保所有 SEO 相关输出（如 Sitemap URL、Canonical 链接、OG URL 等）的一致性。

#### 核心作用

- 提供统一基准：为 Sitemap、Robots、Canonical、OG 标签、结构化数据等模块，提供站点 URL、站名、默认语言等核心信息，避免手动拼接 URL 导致的错误。

- 支持多语言适配：与 @nuxtjs/i18n 深度联动，可按语言配置不同的站点信息（如多语言站名、URL），适配多语言站点 SEO 需求。

- 简化配置：所有子模块自动读取 Site Config 信息，无需在每个模块中单独配置站点基础信息，提升开发效率。

#### 常用配置（nuxt.config.ts）

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/seo'],
  // Site Config 核心配置
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://example.com', // 站点主域名（最关键），建议用环境变量适配不同环境
    name: '你的站点名称', // 站点名称，将用于OG标签、结构化数据等
    description: '站点默认描述，将作为未单独配置描述页面的兜底', // 站点默认描述
    defaultLocale: 'zh-CN', // 站点默认语言，适配多语言站点
    // 可选：多语言配置（需配合@nuxtjs/i18n）
    locales: [
      { code: 'zh-CN', url: 'https://example.com', name: '中文站点' },
      { code: 'en', url: 'https://example.com/en', name: 'English Site' }
    ]
  }
})
```

#### 关键注意点

- site.url 必须配置正确，且建议使用绝对 URL（如 https://example.com），否则 Sitemap、Canonical、OG URL 等会出现路径错误，直接影响 SEO。

- 建议通过环境变量（如 NUXT_PUBLIC_SITE_URL）配置 site.url，适配开发、预发、生产等不同环境（避免开发环境使用生产域名）。

- Site Config 配置后，可通过 composable 函数 `useSiteConfig()` 在页面中获取，用于动态生成 SEO 相关内容。

### Robots 模块（抓取与收录控制）

Robots 模块用于管理站点的抓取与收录策略，核心提供两种形态的配置：站点级的 robots.txt 文件，以及页面级的 robots Meta 标签，两者协同工作，实现“抓取范围控制+收录权限控制”。

核心目标：避免搜索引擎抓取无意义页面（如后台、接口），节省抓取预算；防止预发、测试环境页面被误收录，保护站点 SEO 质量。

#### robots.txt（站点级）

robots.txt 是放在站点根路径（如 https://example.com/robots.txt）的文本文件，用于告知搜索引擎“哪些路径允许抓取、哪些路径禁止抓取”，是搜索引擎访问站点的“第一道门禁”。

#### 核心语法

- User-agent：指定规则适用的搜索引擎爬虫（* 表示所有爬虫，如 Baiduspider、Googlebot 可单独指定）。

- Allow：允许抓取的路径前缀（优先级高于 Disallow）。

- Disallow：禁止抓取的路径前缀。

- Sitemap：告知搜索引擎站点 Sitemap 的 URL，引导搜索引擎快速发现站点 URL 清单（非控制规则，但至关重要）。

#### @nuxtjs/seo 配置示例（nuxt.config.ts）

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/seo'],
  site: { /* 省略Site Config配置 */ },
  // Robots模块配置
  robots: {
    // 按环境切换规则（推荐，避免预发环境被收录）
    rules: process.env.NODE_ENV === 'production'
      ? [
          { userAgent: '*', allow: '/' }, // 生产环境：允许所有爬虫抓取全站
          { userAgent: '*', disallow: ['/admin', '/api', '/test'] } // 禁止抓取后台、接口、测试路径
        ]
      : [
          { userAgent: '*', disallow: '/' } // 非生产环境：禁止所有爬虫抓取全站
        ],
    // 显式声明Sitemap地址（自动拼接site.url，无需手动写完整URL）
    sitemap: '/sitemap.xml'
  }
})
```

生成的 robots.txt 示例（生产环境）

```text
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /test

Sitemap: https://example.com/sitemap.xml
```

#### robots Meta 标签（页面级）

robots.txt 仅控制“抓取范围”，无法控制“页面是否收录”；页面级的 robots Meta 标签用于明确单个页面的收录权限、链接跟踪规则，优先级高于 robots.txt。

**常用指令组合**

- index,follow：允许页面被收录，且允许搜索引擎跟随页面内链接（生产环境公开页面默认配置）。

- noindex,nofollow：不允许页面被收录，且不允许搜索引擎跟随页面内链接（预发、测试页面、登录态页面推荐配置）。

- noindex,follow：不允许页面被收录，但允许搜索引擎跟随页面内链接（适合临时页面、跳转页面）。

#### @nuxtjs/seo 落地配置（app.vue 全局兜底）

建议在 app.vue 中配置全局兜底规则，页面级可按需覆盖，避免重复配置：

```typescript
// app.vue（Script Setup）
const isProd = process.env.NODE_ENV === 'production'
// 全局配置robots Meta标签，页面级可通过useSeoMeta覆盖
useSeoMeta({
  robots: isProd ? 'index,follow' : 'noindex,nofollow'
})
```

#### 关键注意点

- robots.txt 是“君子协定”，无法阻止恶意爬虫抓取，但能引导主流搜索引擎（Google、百度等）遵循规则。

- 防止预发环境被收录的稳妥做法：同时配置 robots.txt Disallow: / 和页面级 noindex,nofollow，双重保障。

- Disallow 仅禁止抓取，不代表禁止收录；若页面已被外链暴露，即使 Disallow，搜索引擎仍可能知道页面存在，需配合 noindex 标签彻底禁止收录。

### Sitemap 模块（URL 发现与抓取效率优化）

Sitemap（站点地图）是一份 XML 文件（通常为 /sitemap.xml），用于向搜索引擎明确告知“站点内所有需要被抓取的重要 URL”，核心解决“搜索引擎 URL 发现困难”的问题，尤其适用于动态路由、深层页面、内容量大的站点。

@nuxtjs/seo 内置 Sitemap 模块（基于 @nuxtjs/sitemap），无需单独安装，可通过简单配置生成规范的 Sitemap，支持静态 URL、动态 URL 自动枚举。

#### 核心作用

- 提升 URL 发现效率：搜索引擎无需通过站内链接层层爬行，可直接通过 Sitemap 获取所有目标 URL，大幅提升深层页面、动态页面的发现概率。

- 优化抓取调度：通过 lastmod 字段（页面最后修改时间），向搜索引擎传递“页面更新信号”，引导搜索引擎优先复爬近期更新的页面，节省抓取预算。

- 提升可观测性：在搜索引擎站长平台（如 Google Search Console）提交 Sitemap 后，可查看 URL 发现数量、抓取失败原因、索引状态等，便于排查 SEO 问题。

#### 常用配置方式（两种核心场景）

@nuxtjs/seo 的 Sitemap 模块支持多种配置方式，最常用的是“sources 模式”，适用于静态 URL 与动态 URL 混合的场景，也是实际项目中最推荐的方式。

**场景 1：基础配置（静态 URL）**

适用于站点以静态页面为主（如首页、关于我们、招聘页），可直接配置静态 URL 列表：

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/seo'],
  site: { /* 省略配置 */ },
  sitemap: {
    // 静态URL列表
    urls: [
      { loc: '/', lastmod: new Date().toISOString() },
      { loc: '/join', lastmod: new Date().toISOString() },
      { loc: '/news', lastmod: new Date().toISOString() }
    ]
  }
})
```

**场景 2：Sources 模式（静态+动态 URL）**

适用于站点包含动态路由（如 /news/[id]、/jobs/[slug]），通过接口获取动态 URL 列表，避免手动维护大量动态 URL，是实际项目中最常用的方式。

核心逻辑：Sitemap 模块会请求配置的 sources 接口，获取 URL 列表后，自动生成 Sitemap XML 文件，并用 site.url 拼接完整绝对 URL。

Step 1：nuxt.config.ts 配置 sources

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/seo'],
  site: { /* 省略配置 */ },
  sitemap: {
    // 配置sources接口，Sitemap模块会自动请求该接口获取URL列表
    sources: ['/api/__sitemap__/urls']
  }
})
```

Step 2：创建 sources 接口（server/api/__sitemap__/urls.get.ts）

接口返回 JSON 格式的 URL 列表，包含 loc（URL 路径）、lastmod（最后修改时间）等核心字段：

```typescript
// server/api/__sitemap__/urls.get.ts
export default defineEventHandler(async () =>`{
  const lastmod = new Date().toISOString()
  // 1. 静态URL列表（首页、招聘页、资讯中心等）
  const staticUrls = [
    { loc: '/', lastmod },
    { loc: '/join', lastmod },
    { loc: '/news', lastmod }
  ]

  // 2. 动态URL列表（从CMS/数据库/nuxt/content中获取）
  // 示例1：从CMS接口获取资讯详情页URL（/news/[id]）
  const newsList = await $fetch<{ id: string; updatedAt?: string }[]>('https://cms.example.com/api/news')
  const newsUrls = newsList.map(item =>`({
    loc: `/news/${item.id}`, // 动态路由路径
    lastmod: item.updatedAt || lastmod // 优先使用CMS返回的更新时间，无则用当前时间
  }))

  // 示例2：从@nuxt/content获取岗位详情页URL（/jobs/[slug]）
  const jobsList = await queryContent('jobs').only(['_path', 'updatedAt']).find()
  const jobsUrls = jobsList.map(item =>`({
    loc: item._path || '', // nuxt/content默认生成的路径（如/jobs/fe-engineer）
    lastmod: item.updatedAt || lastmod
  })).filter(url =>`url.loc) // 过滤空路径

  // 合并静态URL与动态URL，返回给Sitemap模块
  return [...staticUrls, ...newsUrls, ...jobsUrls]
})
```

#### 生成的 sitemap.xml 示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
 `<url>
   `<loc>https://example.com/</loc>
   `<lastmod>2026-02-13T15:30:00.000Z</lastmod>
 `</url>
 `<url>
   `<loc>https://example.com/join</loc>
   `<lastmod>2026-02-13T15:30:00.000Z</lastmod>
 `</url>
 `<url>
   `<loc>https://example.com/news/1</loc>
   `<lastmod>2026-02-12T10:00:00.000Z</lastmod>
 `</url>
 `<url>
   `<loc>https://example.com/jobs/fe-engineer</loc>
   `<lastmod>2026-02-11T09:00:00.000Z</lastmod>
 `</url>
</urlset>
```

#### 搜索引擎如何获取 Sitemap

推荐同时配置以下两种方式，确保搜索引擎能稳定获取 Sitemap：

- robots.txt 声明：在 robots.txt 中添加 Sitemap 字段（@nuxtjs/seo 可自动配置），搜索引擎抓取 robots.txt 时会自动发现 Sitemap 地址。

- 站长平台提交：在 Google Search Console、百度搜索资源平台等，手动提交 Sitemap URL（如 https://example.com/sitemap.xml），可查看 Sitemap 解析状态、URL 发现数量等。

### SEO Utils 模块（默认 SEO 行为自动化）

SEO Utils 是 @nuxtjs/seo 的核心辅助模块，定位是“减少开发者重复配置”，自动处理一些高频、易遗漏的技术 SEO 细节，无需手动编写大量重复代码，核心能力围绕“URL 规范化”与“基础 Meta 标签默认值”展开。

#### 核心能力

- 自动生成 Canonical 链接：Canonical 链接用于告知搜索引擎“页面的权威 URL”，避免因路径差异（如 www/非 www、尾斜杠、参数不同）导致的重复内容问题。SEO Utils 会基于 site.url + route.path 自动生成 Canonical 链接，无需手动配置。

- OG 标签默认值推导：自动基于 Site Config 信息（如 site.name、site.url），推导 OG 标签的默认值（如 og:site_name、og:url），页面级只需配置差异化字段（如 og:title、og:description）。

- URL 规范化处理：自动处理路径中的尾斜杠、大小写等问题，确保页面 URL 格式统一，减少重复内容风险。

#### 关键注意点

- SEO Utils 的默认行为可被页面级配置覆盖：若需自定义 Canonical 链接，可通过 useHead 手动配置，优先级高于模块默认生成的链接。

- 无需单独配置启用：启用 @nuxtjs/seo 后，SEO Utils 会自动生效，无需额外添加配置。

- 与 useSeoMeta 的分工：SEO Utils 负责“默认值推导与自动化配置”，useSeoMeta 负责“页面级差异化内容配置”，两者协同工作，减少重复代码。

### Schema.org 模块（结构化数据配置）

结构化数据（基于 Schema.org 规范）是实现搜索引擎“富结果”的核心，用于向搜索引擎清晰地描述页面内容的“实体与关系”（如页面是资讯、产品还是招聘岗位），让搜索引擎能快速理解页面核心内容，进而在搜索结果中展示更丰富的信息（如资讯发布时间、产品价格、招聘岗位信息），提升搜索结果点击率。

@nuxtjs/seo 内置 Schema.org 模块（基于 @nuxtjs/schema-org），提供 composable 函数 useSchemaOrg()，简化结构化数据的编写与配置，支持自动生成基础结构化数据，页面级可按需扩展。

#### 核心作用

- 提升内容可理解性：帮助搜索引擎明确页面内容类型（如资讯、招聘、产品），避免内容歧义，提升索引质量。

- 实现富结果展示：让搜索结果显示更丰富的信息，吸引用户点击，间接提升页面访问量。

- 提升垂直领域排名权重：在招聘、资讯、电商等垂直领域，规范的结构化数据可提升页面排名优先级（非核心排名因素，但属于重要加分项）。

#### 默认行为

启用 @nuxtjs/seo 后，Schema.org 模块会自动生成两个基础结构化数据节点，无需手动配置：

- WebSite：描述整个站点的基本信息（如站点名称、主 URL），全局生效。

- WebPage：描述单个页面的基本信息（如页面 URL、页面标题），所有页面默认生效。

#### 页面级配置示例（三种核心场景）

使用 useSchemaOrg() 函数，可在页面级扩展差异化的结构化数据，适配不同页面类型。

**场景 1：资讯详情页（/news/[id].vue）**

```typescript
// pages/news/[id].vue（Script Setup）
const route = useRoute()
const siteConfig = useSiteConfig()
// 从CMS获取资讯数据（假设返回title、description、updatedAt、coverImage等字段）
const { data: article } = await useAsyncData(`news:${route.params.id}`, () =>`
  $fetch(`https://cms.example.com/api/news/${route.params.id}`)
)

// 配置NewsArticle类型结构化数据
useSchemaOrg([
  {
    '@type': 'NewsArticle',
    headline: article.value?.title, // 资讯标题
    description: article.value?.description, // 资讯摘要
    dateModified: article.value?.updatedAt, // 最后修改时间
    mainEntityOfPage: `${siteConfig.url}${route.path}`, // 页面权威URL
    image: article.value?.coverImage ? [article.value.coverImage] : undefined, // 资讯封面图
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name, // 站点名称（从Site Config获取）
      logo: `${siteConfig.url}/logo.png` // 站点logo
    }
  }
])
```

**场景 2：招聘详情页（/jobs/[slug].vue）**

```typescript
// pages/jobs/[slug].vue（Script Setup）
const route = useRoute()
const siteConfig = useSiteConfig()
// 从@nuxt/content获取岗位数据
const doc = await queryContent('jobs', route.params.slug).findOne()

// 配置JobPosting类型结构化数据
useSchemaOrg([
  {
    '@type': 'JobPosting',
    title: doc?.title, // 岗位名称
    description: doc?.description, // 岗位描述
    datePosted: doc?.updatedAt, // 发布时间
    employmentType: doc?.type, // 雇佣类型（全职/兼职）
    jobLocation: doc?.location ? {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: doc.location // 工作地点
      }
    } : undefined,
    url: `${siteConfig.url}${route.path}` // 岗位详情页URL
  }
])
```

**场景 3：站点首页（/pages/index.vue）**

```typescript
// pages/index.vue（Script Setup）
const siteConfig = useSiteConfig()

// 扩展Organization类型结构化数据，提升站点权威性
useSchemaOrg([
  {
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: [ // 站点社交账号，提升权威性
      'https://www.linkedin.com/company/xxx',
      'https://weibo.com/xxx'
    ]
  }
])
```

#### 关键注意点

- 结构化数据内容必须与页面实际内容一致，避免虚假信息，否则会被搜索引擎判定为违规，影响索引。

- 推荐使用 JSON-LD 格式：@nuxtjs/seo 自动生成 JSON-LD 格式的结构化数据（<script type="application/ld+json">），是 Google 等主流搜索引擎优先推荐的格式。

- 无需过度配置：核心页面（首页、资讯详情、招聘详情、产品详情）配置对应类型即可，静态页面（如关于我们）使用默认的 WebPage 类型即可。

### OG Image 模块（社交分享图管理）

OG Image（Open Graph Image）是社交分享卡片的核心元素，用于在微信、LinkedIn、Facebook、Twitter 等社交平台分享页面时，展示一张封面图，直接影响分享点击率。OG Image 模块用于解决“每个页面都需配置合适的 og:image”的问题，将分享图生成与管理流程工程化，无需手动维护大量图片链接。

#### 核心作用

- 统一分享图风格：可通过组件渲染自定义分享图模板，确保所有页面的分享图风格一致，提升品牌辨识度。

- 简化配置流程：通过 composable 函数 defineOgImage()，可快速为每个页面配置 og:image，支持动态生成、静态图片引用、禁用等场景。

- 适配多平台：默认生成 1200*630 尺寸的图片（适配多数社交平台），避免因图片尺寸不适配导致的分享卡片异常。

#### 基础配置（nuxt.config.ts）

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/seo'],
  site: { /* 省略配置 */ },
  ogImage: {
    // 全局默认配置
    defaults: {
      width: 1200, // 分享图宽度（推荐1200）
      height: 630, // 分享图高度（推荐630）
      component: 'NuxtSeo', // 默认分享图模板组件（可自定义）
      cacheMaxAgeSeconds: 60 * 60 * 24 * 3, // 分享图缓存时间（3天）
    },
  }
})
```

#### 页面级配置示例（三种场景）

使用 defineOgImage() 函数，为不同页面配置差异化的 og:image，支持静态图片、动态渲染、禁用等场景。

**场景 1：首页（使用静态图片）**

```typescript
// pages/index.vue（Script Setup）
// 使用站点静态图片作为首页分享图
defineOgImage({
  url: '/og-images/home.png', // 静态图片路径
  alt: '站点首页分享图', // 图片alt文本（可选）
})
```

**场景 2：资讯详情页（动态生成分享图）**

```typescript
// pages/news/[id].vue（Script Setup）
const { data: article } = await useAsyncData(`news:${route.params.id}`, () =>`
  $fetch(`https://cms.example.com/api/news/${route.params.id}`)
)

// 基于资讯标题、封面图动态生成分享图
defineOgImage({
  title: article.value?.title, // 分享图标题
  description: article.value?.description.slice(0, 50), // 分享图摘要（截取前50字）
  image: article.value?.coverImage, // 分享图背景图（从CMS获取）
})
```

**场景 3：后台页面（禁用分享图）**

```typescript
// pages/admin/index.vue（Script Setup）
// 后台页面无需分享，禁用og:image
defineOgImage({
  disabled: true
})
```

#### 关键注意点

- og:image 必须使用绝对 URL：若使用相对路径，OG Image 模块会自动拼接 site.url，生成绝对 URL，无需手动拼接。

- 与 OG 标签的关联：defineOgImage() 会自动生成 og:image、og:image:width、og:image:height 等标签，无需通过 useSeoMeta 重复配置。

- 可自定义模板：若需统一分享图风格（如添加站点 logo、固定背景），可自定义分享图组件，在 ogImage.defaults.component 中配置。

### Link Checker 模块（链接质量门禁）

Link Checker 模块用于在开发、构建阶段，自动扫描站点内所有链接，发现断链（404 链接）、锚点缺失、URL 不规范等问题，避免上线后出现爬虫抓取断链、用户点击链接失效等情况，影响 SEO 质量与用户体验。

该模块属于“质量控制工具”，不影响页面渲染与 SEO 输出，核心价值是提前发现链接问题，降低上线风险。

#### 核心检查内容

- 断链检查：扫描页面内所有`<a>、<NuxtLink>`标签指向的内部/外部链接，检查是否存在 404、500 等错误状态码。

- 锚点检查：检查链接中的锚点（如 /news#detail）是否存在于目标页面中，避免锚点缺失导致的页面跳转异常。

- URL 规范检查：检查 URL 是否存在空格、非 ASCII 字符、大小写不一致、非根相对路径等问题，确保 URL 格式规范。

#### 常用配置（nuxt.config.ts）

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/seo'],
  linkChecker: {
    runOnBuild: true, // 构建时执行链接检查（推荐开启）
    failOnError: process.env.NODE_ENV === 'production', // 生产环境：发现错误中断构建；开发环境：仅告警不中断
    report: {
      html: true, // 生成HTML格式报告
      markdown: true, // 生成Markdown格式报告
    },
    // 排除无需检查的链接（如社交账号、邮件、电话链接）
    excludeLinks: [
      'mailto:',
      'tel:',
      /^https?:\/\/(www\.)?linkedin\.com\//,
      /^https?:\/\/(www\.)?weibo\.com\//
    ]
  }
})
```

#### 实际使用场景

- 开发阶段：实时检查链接问题，避免开发过程中因路径修改、页面删除导致的断链。

- 构建阶段：作为 CI/CD 门禁，生产环境构建时若发现断链，中断构建，避免错误上线。

- 内容更新后：若站点内容频繁更新（如资讯、博客），可通过 Link Checker 快速检查新增链接是否存在问题。

## 实践配置：页面级 SEO 落地（以 3 个核心页面为例）

结合前文模块详解，以站点核心页面（首页 /、招聘页 /join、资讯中心 /news）为例，展示 @nuxtjs/seo 各模块的实际落地配置，以及与 useSeoMeta、useHead 的分工协作，确保配置可直接复制使用。

### 前提：全局配置（nuxt.config.ts）

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/seo', '@nuxt/content'], // 启用SEO模块与content模块（用于岗位页面）
  runtimeConfig: {
    public: {
      env: process.env.NUXT_PUBLIC_ENV || 'dev', // 环境变量，适配开发/预发/生产
    },
  },
  // Site Config 核心配置
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://example.com',
    name: '示例站点',
    description: '示例站点：专注于XXX领域，提供XXX服务',
    defaultLocale: 'zh-CN',
  },
  // Robots模块配置
  robots: {
    rules: process.env.NUXT_PUBLIC_ENV === 'prod'
      ? [
          { userAgent: '*', allow: '/' },
          { userAgent: '*', disallow: ['/admin', '/api'] }
        ]
      : [{ userAgent: '*', disallow: '/' }],
    sitemap: '/sitemap.xml'
  },
  // Sitemap模块配置（sources模式）
  sitemap: {
    sources: ['/api/__sitemap__/urls']
  },
  // OG Image模块配置
  ogImage: {
    defaults: {
      width: 1200,
      height: 630,
      component: 'NuxtSeo',
    },
  },
  // Link Checker模块配置
  linkChecker: {
    runOnBuild: true,
    failOnError: process.env.NUXT_PUBLIC_ENV === 'prod',
    report: { html: true, markdown: true },
    excludeLinks: ['mailto:', 'tel:', /^https?:\/\/(www\.)?linkedin\.com\//]
  }
})
```

### Step 1：全局兜底配置（app.vue）

在 app.vue 中配置全局默认 SEO 规则，页面级可按需覆盖，减少重复配置：

```typescript
// app.vue（Script Setup）
const config = useRuntimeConfig()
const siteConfig = useSiteConfig()
const isProd = config.public.env === 'prod'

// 1. 全局HTML配置（语言、标题模板、图标）
useHead({
  htmlAttrs: { lang: siteConfig.defaultLocale },
  titleTemplate: (pageTitle) =>`pageTitle ? `${pageTitle} - ${siteConfig.name}` : siteConfig.name,
  link: [{ rel: 'icon', href: '/favicon.ico' }]
})

// 2. 全局默认SEO Meta标签（页面级可覆盖）
useSeoMeta({
  description: siteConfig.description,
  ogSiteName: siteConfig.name,
  ogUrl: siteConfig.url,
  twitterCard: 'summary_large_image', // Twitter分享卡片类型（大图摘要）
  robots: isProd ? 'index,follow' : 'noindex,nofollow'
})
```

### Step 2：Sitemap Sources 接口（server/api/__sitemap__/urls.get.ts）

```typescript
export default defineEventHandler(async () =>`{
  const lastmod = new Date().toISOString()
  // 1. 静态页面URL
  const staticUrls = [
    { loc: '/', lastmod },
    { loc: '/join', lastmod },
    { loc: '/news', lastmod }
  ]

  // 2. 动态页面URL（从content获取岗位页面，从CMS获取资讯页面）
  // 岗位页面（/jobs/[slug]）
  const jobsList = await queryContent('jobs').only(['_path', 'updatedAt']).find()
  const jobsUrls = jobsList.map(item =>`({
    loc: item._path || '',
    lastmod: item.updatedAt || lastmod
  })).filter(url =>`url.loc)

  // 资讯页面（/news/[id]）
  const newsList = await $fetch<{ id: string; updatedAt?: string }[]>('https://cms.example.com/api/news')
  const newsUrls = newsList.map(item =>`({
    loc: `/news/${item.id}`,
    lastmod: item.updatedAt || lastmod
  }))

  // 合并所有URL并返回
  return [...staticUrls, ...jobsUrls, ...newsUrls]
})
```

### Step 3：各页面配置（页面级差异化）

**首页（/pages/index.vue）**

```typescript
// pages/index.vue（Script Setup）
const siteConfig = useSiteConfig()

// 1. 页面级SEO Meta标签（覆盖全局默认值）
useSeoMeta({
  title: '首页 - 核心品牌主张',
  description: '首页详细摘要：清晰说明站点定位、核心服务、目标用户，控制在120字符内，吸引搜索引擎与用户点击。',
  ogType: 'website', // 首页默认类型为website
})

// 2. 配置OG分享图
defineOgImage({
  url: '/og-images/home.png',
  alt: '示例站点首页分享图',
})

// 3. 配置结构化数据（Organization，提升站点权威性）
useSchemaOrg([
  {
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: [
      'https://www.linkedin.com/company/xxx',
      'https://weibo.com/xxx'
    ]
  }
])
```

**招聘页（/pages/join.vue）**

```typescript
// pages/join.vue（Script Setup）
// 1. 页面级SEO Meta标签
useSeoMeta({
  title: '加入我们 - 与优秀团队共成长',
  description: '招聘页面摘要：说明团队方向、核心岗位类型、工作地点、投递方式，吸引目标求职者，控制在120字符内。',
  ogType: 'website',
})

// 2. 配置OG分享图
defineOgImage({
  title: '加入我们',
  description: '优质岗位热招中，期待你的加入',
  image: '/og-images/join.png',
})
```

**资讯中心（/pages/news.vue）**

```typescript
// pages/news.vue（Script Setup）
// 1. 页面级SEO Meta标签
useSeoMeta({
  title: '资讯中心 - 最新行业动态与产品资讯',
  description: '资讯中心摘要：说明发布内容类型（行业动态、产品更新、技术分享）、更新频率，吸引目标用户关注，控制在120字符内。',
  ogType: 'website',
})

// 2. 配置OG分享图
defineOgImage({
  title: '资讯中心',
  description: '关注行业动态，获取最新资讯',
  image: '/og-images/news.png',
})
```

## 关键分工：@nuxtjs/seo 与 useSeoMeta、useHead

实际开发中，很多开发者会混淆 @nuxtjs/seo 模块与 useSeoMeta、useHead 的作用，三者并非竞争关系，而是协同工作，核心分工明确，掌握分工可大幅提升开发效率，避免重复配置。

### @nuxtjs/seo 模块

核心定位：**站点级 SEO 基建与自动化工具**，负责“全局配置、自动化行为、质量控制”，无需页面级重复配置，核心解决“SEO 基建繁琐”的问题。

- 负责内容：Robots.txt 生成、Sitemap 生成、Canonical 链接自动生成、结构化数据基础节点、OG 图片生成与管理、链接质量检查。

- 工作方式：全局配置后自动生效，页面级可通过专属 composable（如 useSchemaOrg、defineOgImage）扩展差异化内容。

- 核心价值：简化 SEO 基建配置，避免手动编写大量原生代码（如 Sitemap XML、JSON-LD 脚本），降低配置错误风险。

### useSeoMeta

核心定位：**页面级 SEO Meta 标签配置工具**，负责“页面级差异化 Meta 标签”，是 @nuxtjs/seo 模块的补充，专注于 Meta 标签的精细化配置。

- 负责内容：页面 title、description、robots Meta 标签、OG 标签（og:title、og:description 等差异化字段）、Twitter 标签。

- 工作方式：页面级调用，可覆盖 app.vue 中的全局默认配置，支持动态数据绑定（如从 CMS 获取标题、描述）。

- 核心价值：实现页面级 Meta 标签的差异化配置，满足不同页面的 SEO 需求，同时提供类型安全，避免标签写错。

### useHead

核心定位：**页面级 head 标签通用配置工具**，功能更通用，不仅限于 SEO，负责“非 Meta 标签或需自定义的 head 内容”，是 useSeoMeta 的补充。

- 负责内容：HTML 语言属性（htmlAttrs）、标题模板（titleTemplate）、图标（favicon）、自定义 Canonical 链接、自定义脚本（如非结构化数据的 JS 脚本）、样式链接等。

- 工作方式：可在 app.vue 中配置全局 head 规则（如标题模板、图标），也可在单个页面中调用，覆盖全局配置；支持动态绑定数据，适配不同场景下的 head 内容调整。

- 核心价值：兼顾 SEO 与非 SEO 场景的 head 配置需求，提供更灵活的自定义能力，当 useSeoMeta 无法满足特殊需求（如自定义脚本、非 SEO 相关的 link 标签）时，可通过 useHead 实现，是页面 head 配置的“兜底工具”。