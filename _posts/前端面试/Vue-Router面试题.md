---
title: 【⭐】Vue Router面试题
categories:
  - 前端面试
tags: Vue
date: 2025-12-08 16:44:32
---

## 1）Vue Router 的核心作用是什么？为什么需要它？

> [8.前端页面跳转 - 相](https://cxdlogver.github.io/2025/12/28/前端面试/8-前端页面跳转/#前端页面跳转)

**Vue Router 是 Vue 官方的前端路由管理工具，用于在单页应用（SPA）中实现 URL 与组件视图之间的映射关系。**

在 SPA 中，整个应用生命周期内浏览器只会加载一次 HTML，页面切换不再依赖浏览器向服务器请求新的 HTML，而是由前端 JavaScript 接管。

Vue Router 通过**监听 URL 的变化**（如 `history` 或 `hash`），根据配置好的路由规则进行匹配，并将匹配到的组件**渲染到 `<router-view>` 容器中**，从而完成页面切换，而不刷新整个页面。

同时，Vue Router 提供了**路由守卫机制**，可以在路由跳转的不同阶段做**权限控制、登录校验和身份认证**，这是大型前端应用中不可或缺的能力。

**总结来说，Vue Router 的核心价值是：让前端在 SPA 架构下具备“像多页应用一样清晰的页面结构和可控的页面流转”。**

**一句话版**

> Vue Router 的作用是：**监听 URL 变化 → 匹配路由规则 → 切换组件视图，从而在 SPA 中实现页面级导航与权限控制。**

------

## 为什么要使用 SPA（单页应用）？

使用 SPA 的核心原因是：**提升用户体验、降低页面切换成本、并更好地支撑复杂前端应用。**

在传统多页应用（MPA）中，每一次页面跳转都会重新向服务器请求新的 HTML，原有页面会被销毁，浏览器需要重新解析 HTML、CSS 和 JS，切换成本高、体验不连贯。

SPA 的特点是**整个应用生命周期只加载一次 HTML**，之后的页面切换由前端 JavaScript 控制，通常只是组件的卸载与挂载或局部视图更新，不会刷新整页，因此切换更快、更流畅。

同时，SPA 天然适合复杂交互场景，例如后台管理系统、即时通信、数据可视化等，前后端可以彻底解耦，通过 API 进行数据通信。

**总结来说，SPA 用一次加载换取后续的高效切换和更好的交互体验，是现代复杂 Web 应用的主流形态。**SPA 也有代价，比如首屏加载体积大、SEO 不友好，因此实际工程中通常会结合 **代码分割、懒加载**

> SPA 的本质是用前端 JS 接管页面切换，用更少的网络请求换取更流畅、更可控的用户体验。

## 2）hash 模式和 history 模式有什么区别？怎么选？

**回答模板**
 Vue Router 常见两种模式：

- hash：URL 带 `#`，依赖 `hashchange`，不需要服务端配合；刷新不会 404。
- history：URL 干净，依赖 `popstate`，需要服务端把所有路由都回退到同一个 `index.html`，否则刷新会 404。

选择上：

- 内网、静态部署、无法改服务端规则：优先 hash
- 正式站点、SEO/URL 美观、能配服务端 rewrite：优先 history

**要点**

- history 必须配 rewrite（Nginx/Apache/Node）
- hash 兼容性好但 URL 不够美观
- 两者都能做 SPA 路由，只是地址机制不同

------

## 3）路由的完整导航过程是怎样的？

Vue Router 的一次完整导航过程可以概括为：
 **触发导航 → 路由匹配 → 执行守卫 → 确认导航 → 组件渲染与更新。**

当调用 `router.push`、点击 `<router-link>` 或浏览器前进后退时，会触发一次导航。
 Router 会根据目标 URL 进行路由匹配，生成 `to.matched` 路由记录。

接着按顺序执行 **全局前置守卫 → 路由独享守卫 → 组件内 `beforeRouteEnter`**，
 所有守卫通过后确认导航，更新地址栏。

最后销毁旧组件、创建新组件并渲染到 `<router-view>` 中，
 组件挂载完成后触发 `beforeRouteEnter` 中的 `next(vm => {})` 以及 `afterEach` 钩子。

> Vue Router 的导航流程本质是：
>  **先根据 URL 生成 matched 路由记录，再按顺序执行守卫确认导航，最后根据 matched 结果复用或重建组件并完成视图渲染。**

### 导航在哪一步真正改变 URL？

> 在所有守卫通过后的 **导航确认阶段**。

------

## 4）router.push / replace / go 有什么区别？

**回答模板**

- `push`：新增一条历史记录，用户可以回退到上一页
- `replace`：替换当前历史记录，用户回退不会回到替换前
- `go(n)`：在历史栈中前进/后退 n 步，等价于 `history.go(n)`

**要点**

- 典型场景：登录成功跳转用 `replace`（避免回到登录页）
- 列表到详情用 `push`（允许回退到列表）

------

## 5）声明式导航 `<router-link>` 和编程式导航有什么差别？

**回答模板**
 `<router-link>` 是声明式，适合纯跳转场景，语义清晰且自带 active 状态；编程式（`router.push/replace`）适合在业务逻辑完成后跳转，比如登录校验通过、提交表单成功后跳转、点击行触发携带参数跳转等。

`active-class` 用于自定义 router-link 在路由匹配时自动添加的激活类名，默认是 `router-link-active`，采用包含式匹配；如果需要严格匹配才高亮，则使用 `exact-active-class` 或全局的 `linkExactActiveClass`。

**要点**

- router-link 自动处理 active class
- 编程式更适合“先处理业务再跳转”

------

## 6）params 和 query 的区别？什么时候用？

**回答模板**

- **params 是路径参数**，属于路由的一部分，通常通过动态路由声明，例如 `/user/:id`，参数缺失会导致路由无法匹配，更偏向“资源唯一标识”。
- **query 是查询参数**，表现为 URL 后的 `?key=value`，不影响路由匹配，可选性强，常用于筛选条件、分页、状态控制等。

  简单来说：

| 对比点           | params             | query            |
| ---------------- | ------------------ | ---------------- |
| URL 位置         | 路径中 `/user/123` | 查询串 `?page=1` |
| 是否影响路由匹配 | ✅ 是               | ❌ 否             |
| 是否必填         | 通常必填           | 可选             |
| 路由声明         | 需在 `path` 中声明 | 无需声明         |
| 语义             | 资源 / 身份标识    | 条件 / 状态      |
| SEO 友好         | 更好               | 一般             |
| 刷新是否丢失     | 不丢               | 不丢             |

实践上：

- 资源主键/必需标识：用 params
- 列表筛选、分页、排序：用 query
- params 在刷新/直达时更稳定（因为在 path 里），query 本身也稳定但语义不同

**要点**

- params 需要 route 配置里有动态段 `:id`（或通过 name + params）
- query 适合可选项与组合条件

------

## 7）为什么有时 params 丢失？如何避免？

**回答模板**
 常见原因：用 `path` + `params` 组合跳转时，params 会被忽略。Vue Router 推荐：

- 要传 params：用 `name` + `params`
- 或直接把 params 写进 path

举例：

- 正确：`router.push({ name: 'user', params: { id: 1 } })`
- 风险：`router.push({ path: '/user', params: { id: 1 } })`（可能丢）

**要点**

- params 依赖命名路由或动态 path
- 面试官在问你是否理解“路由生成规则”

------

## 8）动态路由 `:id` 如何拿到？路由变化如何监听？

**回答模板**
 动态参数通过 `useRoute()`：

- `route.params.id` 获取路径参数
- `route.query.xxx` 获取查询参数
   路由变化监听两种：
   1）监听 route：`watch(() => route.params.id, ...)`
   2）组件复用场景用组件内守卫：`beforeRouteUpdate(to, from, next)` 来处理同组件不同参数的更新逻辑

**要点**

- 复用组件不会重新 mounted，需要自己处理参数变化
- 数据请求要跟参数变化绑定

## 当只有参数发生改变时，会有新的路由记录写入历史栈吗？

结论先行（一句话版）

> **是否写入历史栈，取决于导航方式（push / replace）以及参数是否导致 URL 发生变化，而不是取决于参数类型本身（params / query）。**

在 Vue Router 中，**只要触发了一次导航，并且 URL 发生变化，默认就会向浏览器历史栈写入一条新的记录**。

无论是 `params` 变化还是 `query` 变化，只要使用的是 `router.push`，并且生成的 URL 与当前不同，就会新增一条历史记录。

如果使用的是 `router.replace`，即使参数变化，也只会**替换当前历史记录**，不会新增。

因此，**是否写入历史栈的关键不是“参数变没变”，而是“用了 push 还是 replace，以及 URL 是否真的变了”。**

> **Vue Router 的 match 是“每次导航都会做的事”**
>  不管是 path / params / query
>  **只要 URL 变化 → 就是一次新的导航 → 就会重新 match**

------

✅ 重新 match

✅ 全局守卫执行

❌ 组件不销毁

✅ 触发 `beforeRouteUpdate / watch`

那为什么组件没重建？

因为 Vue Router 会在 **match 完成后做 diff**：

```
new matched vs old matched
```

- 如果是**同一个 RouteRecord**
  - 组件复用
  - 不走创建生命周期
- 但路由级流程已经完整走了一遍

------

## 9）嵌套路由是什么？`<router-view>` 如何工作？

**回答模板**
 嵌套路由就是父子路由结构，父路由组件里放 `<router-view>` 作为子路由的渲染出口。匹配时会得到一条 `matched` 链，父组件先渲染，然后把子路由组件渲染到父组件的 `<router-view>` 中，实现“布局 + 内容区”的结构。

**要点**

- 常用于 Layout：侧边栏/头部固定，内容区变化
- `matched` 的层级关系就是嵌套层级

------

## 10）什么是命名路由（name）？有什么优势？

**回答模板**
 命名路由给路由一个稳定标识。优势：
 1）跳转更稳定（path 改了只改配置，不改业务跳转）
 2）与 params 配合更可靠
 3）做权限映射、菜单生成更方便（以 name 作为 key）

**要点**

- 大项目常用 name 做路由权限表、keepAlive include 等

------

## 11）路由懒加载怎么做？有什么收益？

**回答模板**
 路由懒加载通常用动态 import：只有访问到该路由才加载对应 chunk。收益：

本质：**代码分割（Code Splitting）+ 按需加载（On-Demand Loading）**。

- 首屏更快（减少初始 JS 体积）
- 按需加载（减少无用代码下载）
- 配合分包策略提升缓存命中

**要点**

- `() => import('...')`
- 关注 chunk 拆分与预加载（prefetch/preload）策略

> 路由懒加载是指将路由对应的页面组件通过 `import()` 动态加载，只有在路由被访问时才下载对应代码。
>  这样可以显著减少首屏 JS 体积，提升首屏渲染和可交互时间，同时更利于大型项目的模块拆分和长期维护。
>  实际项目中通常对页面级组件启用懒加载，并根据业务模块合理合并 chunk。

------

## 什么是 Code Splitting Code Splitting 和懒加载有什么区别

**Code Splitting（代码分割）是一种前端性能优化手段，指的是把原本打包在一起的 JavaScript 拆分成多个按需加载的代码块，而不是一次性全部加载。**

它的核心目的，是**降低首屏加载体积、提升首屏渲染速度**。

在实际运行时，只有当用户访问某个页面或触发某个功能时，对应的代码才会被下载和执行。

在 Vue 项目中，最常见的应用场景是**路由级懒加载和组件级懒加载**，这是 SPA 项目中非常重要的性能优化手段。

> Code Splitting 是**打包阶段的代码拆分策略**，懒加载是**运行时按需加载代码的行为**，两者通常配合使用。
>
> Code Splitting 是在构建阶段把代码拆成多个 chunk，懒加载是在运行时按需加载这些 chunk

1️⃣ 路由级代码分割（最常见、最重要）

**使用场景：**

- 多页面 SPA
- 后台管理系统
- 页面之间功能差异大

```
const UserPage = () => import('@/views/User.vue')
```

**效果：**

- 不访问的页面，不下载对应 JS
- 首屏性能显著提升

------

2️⃣ 组件级代码分割（按功能加载）

**使用场景：**

- 弹窗、抽屉、复杂表单
- 低频组件
- 重型组件（编辑器、图表）

```js
const Comp = defineAsyncComponent({
  loader: () => import('./Comp.vue'),
  loadingComponent: Loading,
  errorComponent: ErrorComp,
  delay: 200,
  timeout: 3000
})

```

------

> **`defineAsyncComponent` 是 Vue 3 官方内置的异步组件 API，用于实现组件级懒加载和代码分割。**

3️⃣ 第三方库拆分（减少首包体积）

**使用场景：**

- echarts、monaco-editor、three.js
- 只在部分页面使用的大型库

```
async function loadChart() {
  const echarts = await import('echarts')
}
```

------

4️⃣ 按业务模块拆分（大型项目）

**使用场景：**

- 管理端 / 用户端
- 不同角色功能完全不同
- 多系统集成

**Code Splitting 在 Vue 项目中的典型落地方式**

路由懒加载（最常考）

```js
{
  path: '/user',
  component: () => import('@/views/User.vue')
}
```

------

组件懒加载

```js
import { defineAsyncComponent } from 'vue'

const AsyncComp = defineAsyncComponent(() =>
  import('./AsyncComp.vue')
)
```

------

### 配合构建工具（Webpack / Vite）

- Webpack：`import()` → 自动生成 chunk
- Vite：ESM + 动态 import → 原生支持

## 12）导航守卫有哪些？分别适合做什么？

**回答模板**
 守卫分三类：
 1）全局：`beforeEach / beforeResolve / afterEach`
 2）路由独享：`beforeEnter`
 3）组件内：`beforeRouteEnter / beforeRouteUpdate / beforeRouteLeave`

应用：

- 鉴权：beforeEach 判断 token/权限，不通过则重定向
- 埋点：afterEach 上报 PV
- 离开确认：beforeRouteLeave 弹窗提示未保存
- 复用组件更新：beforeRouteUpdate 处理同组件不同参数

**要点**

- `beforeRouteEnter` 里拿不到 `this`（组件实例还未创建）
- afterEach 不接收 next（它是确认后的回调）

------

## 13）守卫里如何处理异步？如何避免导航卡死？

**回答模板**
 守卫里可以做异步，比如拉取用户信息、菜单权限。关键是：

- 必须确保每条分支最终都放行或重定向（调用 next 或返回对应值，取决于版本写法）
- 异步要加超时/错误处理，失败要有降级策略（跳登录/提示）
- 避免重复重定向导致死循环（例如已在 login 还重定向 login）

**要点**

- 常见坑：漏掉放行导致页面不跳转
- 常见坑：权限不足重定向自己导致无限循环

------

## 14）如何做“登录鉴权 + 动态路由 + 菜单权限”？

**回答模板**
 典型方案：
 1）登录后拿到 token，存本地（或内存+刷新恢复）
 2）路由守卫 beforeEach：

- 无 token：只允许白名单（login）
- 有 token：如果用户信息/权限未加载，则请求权限并生成可访问路由
   3）调用 `router.addRoute()` 动态注入路由（通常注入到 layout 子路由下）
   4）生成菜单数据（通常来自同一份权限路由表），渲染侧边栏
   5）访问未授权路由：跳 403 或重定向到首页

**要点**

- 动态路由注入必须在放行前完成，否则会出现“刷新丢路由/404”
- 菜单与路由建议同源（同一份配置/后端返回）避免不一致

------

## 15）`router.addRoute` 什么时候用？刷新为什么会丢？

**回答模板**
 `addRoute` 用于运行时动态注入路由，常见于权限系统。刷新丢失是因为：动态注入只存在于内存，刷新后路由表重置，所以需要在应用启动时（或首次进入时）根据 token 恢复权限并重新注入。

**要点**

- 需要“启动恢复逻辑”：有 token → 拉权限 → addRoute → 再进入目标页
- 处理好“首次进入目标路由但路由还未注入”的时序问题

------

## 16）路由 meta 有什么用？常见字段怎么设计？

**回答模板**
 `meta` 用于放路由的业务元信息，不参与匹配但参与渲染与控制，例如：

- `title`：页面标题
- `requiresAuth`：是否需要登录
- `roles`：允许角色列表
- `keepAlive`：是否缓存
- `icon`：菜单图标
- `hidden`：是否在菜单中隐藏
- `breadcrumb`：面包屑显示规则

**要点**

- meta 是权限和菜单系统的核心载体
- 建议形成统一的 meta 规范，避免散落判断

------

## 17）`route.matched` 是什么？有什么典型用法？

**回答模板**
 `route.matched` 是“当前 URL 匹配到的路由记录数组”，从父到子依次排列。典型用途：

- 面包屑：遍历 matched 取 meta.title
- 菜单高亮：根据 matched 中的路径/name 做激活
- 布局判断：判断是否命中某个 layout 路由

**要点**

- 嵌套路由越深 matched 越长
- matched 是“路由记录”，不是组件实例

------

## 18）如何实现路由级 keep-alive 缓存？常见坑有哪些？

**回答模板**
 实现思路：

- 在 layout 中用 `<keep-alive>` 包住 `<router-view>` 渲染的组件
- 通过 `route.meta.keepAlive` 控制是否缓存
- 对需要缓存的页面保证组件 `name` 稳定（用于 include/exclude）

常见坑：

- 组件复用但 key 不当导致缓存无效或缓存错乱
- 缓存页面返回后数据不更新，需要配合 activated 生命周期或 watch route

**要点**

- `activated/deactivated` 管理缓存页面的进入离开
- key 决定“是否认为是同一个实例”

------

## 19）路由重定向 redirect 和别名 alias 的区别？

**回答模板**

- redirect：访问 A 实际跳到 B，地址栏会变成 B
- alias：A 是 B 的别名，访问 A 渲染 B 的组件，但地址栏仍然是 A

**要点**

- redirect 用于“统一入口/默认页/兼容旧地址跳新地址”
- alias 用于“多个入口同一页面但保留不同 URL”

------

## 20）404 / 403 一般怎么做？

**回答模板**

- 404：配置兜底路由 `/:pathMatch(.*)*` 指向 NotFound
- 403：权限不足时重定向到 Forbidden 页面，或在守卫里拦截后跳转
   并且在动态路由场景下，保证：路由未注入前不要直接放行到受控路由，否则容易先 404 再注入。

**要点**

- 404 兜底路由建议放最后
- 动态路由要处理“注入时序”

------

## 21）如何传递状态：路由参数 vs store？

**回答模板**

- 路由参数：适合可分享、可恢复、刷新不丢的状态（筛选条件、页码、资源 id）
- store：适合全局共享、与 URL 无关或敏感信息（用户信息、临时 UI 状态）
   一般建议：能进 URL 的尽量进 URL，保证可回放与可分享；敏感或不稳定状态放 store。

**要点**

- URL 是“可见的状态机”，利于排查与复现
- 敏感信息不要放 query（泄露风险）

------

## 22）你在项目里用 Vue Router 解决过什么问题？

**回答模板（项目型）**
 我主要用 Vue Router 做了三件事：
 1）基于 beforeEach 的鉴权拦截，结合 meta.roles 控制路由访问，未授权重定向 403
 2）动态路由：登录后拉取权限路由表，`addRoute` 注入到 layout 下，同步生成侧边菜单，保证路由与菜单一致
 3）路由缓存：对高频列表页启用 keepAlive，结合 meta.keepAlive 与组件 activated 做数据刷新策略，解决返回列表重刷和滚动位置丢失的问题

**要点**

- 面试官更看重：你是否处理过“动态路由时序”“缓存策略”“权限闭环”
