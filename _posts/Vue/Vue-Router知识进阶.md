---
title: Vue-Router知识进阶
date: 2026-01-08 22:11:55
tags: Vue
categories:
 - Vue
---

## 1. `Vue Router` 快速上手

[Vue Router快速上手 - 相](./Vue3快速上手.md/#4. 路由)

## 2. 路由守卫

1）全局：`beforeEach / beforeResolve / afterEach`

2）路由独享：`beforeEnter`

3）组件内：`beforeRouteEnter / beforeRouteUpdate(onBeforeRouteUpdate) / beforeRouteLeave(onBeforeRouteLeave)`

### 【`beforeEach`】

作用：全局前置守卫。每次路由跳转前触发，适合做“进入前拦截”。

触发时机：导航被确认前，组件解析/渲染之前。任何路由变化（push/replace/回退前进）都会触发。

```javascript
// router.ts
import { createRouter, createWebHistory } from "vue-router";
import routes from "./routes";

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from) => {
  // 1) 鉴权：未登录 -> 跳登录页
  const token = localStorage.getItem("token");
  if (to.meta.requiresAuth && !token) {
    return { name: "Login", query: { redirect: to.fullPath } };
  }

  // 2) 已登录访问登录页 -> 跳首页
  if (to.name === "Login" && token) {
    return { name: "Home" };
  }

  // 3) 权限：无角色/无权限 -> 403
  const role = localStorage.getItem("role");
  if (to.meta.roles && !to.meta.roles.includes(role)) {
    return { name: "Forbidden" };
  }

  // 4) 异步：拉取用户信息后再放行
  // if (!store.userLoaded) await store.fetchMe()

  // 放行：return true 或不写 return
  return true;
});

export default router;
```

关键点

- 返回值控制导航：
  - `return false` 取消导航
  - `return { path/name/query }` 重定向
  - `return true` 或不返回 放行
- 必须避免死循环：重定向目标不要再触发同一条拦截逻辑导致反复跳转
- 复杂条件建议用 `to.meta` 驱动（如 `requiresAuth`、`roles`）
- 做全局 Loading/NProgress 更合适（跳转开始就开启）

**典型使用场景**

- 登录态校验、登录页重定向
- RBAC/ABAC 权限控制（角色、权限点、资源范围）
- 白名单路由、灰度路由、维护模式拦截
- 动态路由注入前置检查（首次进入系统拉取菜单并 addRoute）
- 路由级数据预取的兜底（不建议把大量业务请求都塞进这里，容易拖慢首屏）

> Vue Router3 需要用`next()`放行

| Vue Router 3              | Vue Router 4               |
| ------------------------- | -------------------------- |
| `next()`                  | `return true` 或 `return`  |
| `next(false)`             | `return false`             |
| `next('/login')`          | `return '/login'`          |
| `next({ name: 'Login' })` | `return { name: 'Login' }` |
| `next(error)`             | `throw error`              |

### 【`afterEach`】

作用：全局后置守卫。路由跳转完成后触发，不可拦截导航，适合做“事后收尾”。

触发时机：导航确认完成、URL 已变更后触发。无返回值控制能力。

使用方法（Vue Router 4）

```js
router.afterEach((to, from, failure) => {
  // 1) 设置页面标题
  if (to.meta.title) document.title = String(to.meta.title);

  // 2) 关闭全局 Loading/NProgress
  // NProgress.done()

  // 3) 埋点统计（PV、路由来源）
  // trackPageView({ to: to.fullPath, from: from.fullPath, failure: !!failure })
});
```

关键点

- 不能阻止跳转；如果要拦截必须用 `beforeEach`/路由独享守卫
- `failure` 可用于判断是否发生导航失败（例如重复导航、取消等），做日志更稳
- 不要在这里做重定向或写会引发再次导航的逻辑，容易造成不可控链路

**典型使用场景**

- 统一设置 `document.title`、面包屑同步、滚动行为补充
- 关闭全局 Loading、结束进度条
- 路由埋点、性能统计、导航日志记录
- 清理临时状态（如关闭全局弹窗、收起侧边栏等“跳转后收尾”）

### 【`beforeResolve`】

作用：全局解析守卫。与 `beforeEach` 类似，但触发更靠后，适合做“依赖组件已解析后的最后一道拦截”。

触发时机：在所有组件内守卫、路由独享守卫都通过后，组件也已解析完成，但导航还没最终确认之前触发。

使用方法

```js
router.beforeResolve(async (to, from) => {
  // 适合做：进入页面前必须完成的“最后预取”
  if (to.meta.prefetch) {
    await to.meta.prefetch(); // 例如拉取页面关键数据
  }
  return true;
});
```

使用场景

- 页面进入前的“最终数据预取/兜底加载”（确保组件可用后再请求关键数据）
- 配合进度条：在这里更精确地做“即将完成导航”的阶段控制
- 复杂跳转链路的最后一次统一校验（例如依赖动态路由已注入完成）

### 【`onBeforeRouteLeave`】

作用：离开当前组件对应路由时触发，常用于“未保存内容拦截离开”。

触发时机：从当前路由离开前，组件仍在。

使用方法（Composition API）

```js
import { onBeforeRouteLeave } from "vue-router";

onBeforeRouteLeave((to, from) => {
  if (hasUnsaved.value) {
    // 可配合弹窗：确认后再放行（通过状态控制二次跳转）
    return false;
  }
  return true;
});
```

使用场景

- 表单未保存提示
- 离开页面前清理资源（WS/定时器/地图实例），其中“拦截”用守卫，“释放”也可在 unmount 做兜底

### 【`onBeforeRouteUpdate`】

作用:同一组件复用时（路由参数变了但仍复用组件）触发，用于处理 params/query 变化带来的数据刷新。

触发时机:当前组件未卸载，路由更新（如 `/user/1` -> `/user/2`）。

使用方法

```js
import { onBeforeRouteUpdate } from "vue-router";

onBeforeRouteUpdate(async (to, from) => {
  // 例如：to.params.id 变化后重新拉数据
  await fetchDetail(String(to.params.id));
  return true;
});
```

使用场景

- 详情页复用组件：根据 id 刷新数据
- 列表页 query 变更：分页、筛选条件变化触发重新请求
- 避免 watch(route) 写得过散，把“路由驱动更新”集中到守卫里

### 【`beforeEnter`】

作用:写在某条路由配置上，只对该路由及其进入行为生效，比全局守卫更“精确”。

触发时机:进入该路由记录前触发（通常在全局 beforeEach 之后、组件内守卫之前的链路中）。

使用方法

```js
{
  path: "/admin",
  name: "Admin",
  component: () => import("./Admin.vue"),
  meta: { requiresAuth: true, roles: ["admin"] },
  beforeEnter: (to, from) => {
    const role = localStorage.getItem("role");
    if (role !== "admin") return { name: "Forbidden" };
    return true;
  },
}
```

使用场景

- 某一组路由的权限控制（后台区、运营区）
- 进入某页面前必须满足条件（必须带 query、必须来自特定来源页）
- “仅对部分路由生效”的拦截：比全局守卫写 if 更清晰
- 首次进入子路由也会触发。

> beforeEnter对路由的子路由也拦截吗?

`beforeEnter` 只在“该路由记录是新进入的”时触发

### 【`matched`】

`route.matched` 表示：
 **从根路由开始，到当前路由为止，逐级命中的所有路由记录（父 → 子）**

**每次导航都会生成一个新的 matched 结果**

示例路由：

```js
{
  path: "/demo",
  component: DemoLayout,
  children: [
    { path: "a", component: DemoA },
    { path: "b", component: DemoB },
  ],
}
```

访问 `/demo/a` 时：

```js
useRoute().matched.map(r => r.path);
// ["/demo", "/demo/a"]
```

说明：

- 父路由 `/demo` **一定在 matched 中**
- 子路由 `/demo/a` 紧随其后

> 但——**进入 `matched` ≠ 触发父路由的 `beforeEnter`**

场景 1：首次进入子路由（会触发）

```
/login  →  /demo/a
```

matched 变化：

```
from: []
to:   [ /demo, /demo/a ]
```

- `/demo` 是新进入的
- `/demo.beforeEnter` 触发一次
- `/demo/a.beforeEnter` 触发（如果有）

------

场景 2：子路由之间切换（不会触发）

```
/demo/a  →  /demo/b
```

matched 变化：

```js
from: [ /demo, /demo/a ]
to:   [ /demo, /demo/b ] // 每次导航都会生成一个新的 matched 结果
```

对比：

- `/demo` 之前就在 matched 中
- 不是“新进入”
- **父路由的 `beforeEnter` 不会再触发**

### 【没有`onBeforeRouteEnter`】

- **Vue Router 4 仍然有 `beforeRouteEnter`**
- **但没有 `onBeforeRouteEnter`**
- 它是**唯一一个拿不到组件实例的组件内守卫**
- 只能通过 `next(vm => {})` 的“回调形式”访问组件实例

这是一个**历史兼容 + 语义上无法用 Composition API 封装**的特例。

先对比一下：

| 守卫              | 是否存在 `onXxx`              |
| ----------------- | ----------------------------- |
| beforeRouteLeave  | `onBeforeRouteLeave`          |
| beforeRouteUpdate | `onBeforeRouteUpdate`         |
| beforeRouteEnter  | **没有 `onBeforeRouteEnter`** |

**根本原因：**

> `beforeRouteEnter` 触发时，组件实例还不存在，Composition API 的 `setup()` 尚未执行，所以无法提供 `onBeforeRouteEnter`

------

beforeRouteEnter` 的真实定位

作用

在**进入组件之前**执行逻辑，并且**可以在组件创建完成后访问组件实例**

触发时机

```js
路由确认前
↓
beforeRouteEnter
↓
创建组件实例
↓
执行 next(vm => {})
↓
mounted
```

只能写在组件中（选项式 API）

```js
export default {
  beforeRouteEnter(to, from, next) {
    next((vm) => {
      // vm 是组件实例
      vm.loadData();
    });
  },
};
```

注意：

- **这里仍然使用 `next`**
- 这是 Vue Router 4 中 **唯一保留 `next` 的地方**
- `return` 在这里**不适用**

为什么这里不能用 `return`

```js
beforeRouteEnter(to, from) {
  // 错误：此时没有组件实例
}
```

原因：

- 守卫执行时组件还没创建
- `this === undefined`
- `setup()` 也还没执行
- 所以只能通过 `next(vm => {})` 延迟访问实例

### 【生命周期】

#### 一、导航开始阶段（Router 层）

##### 1. 触发导航

触发方式包括：

- `router.push / replace`
- `<router-link>`
- 浏览器前进 / 后退
- 地址栏直接输入

此时：

- 仅是“意图导航”
- 页面尚未发生任何变化

------

##### 2. 路由匹配（resolve）

Router 根据目标 URL：

- 解析 path / params / query
- 生成目标路由对象 `to`
- 计算 `to.matched`（父 → 子的路由记录链）

------

#### 二、导航守卫阶段（核心）

##### 3. 执行组件离开守卫（leaving）

对 **即将被卸载的组件** 执行：

- `onBeforeRouteLeave`
- `beforeRouteLeave`（选项式）

用途：

- 未保存内容拦截
- 资源释放确认

若返回 `false`：

- 导航直接中断

------

##### 4. 执行全局前置守卫

```
router.beforeEach(to, from)
```

特点：

- 每次导航必走
- 适合鉴权、白名单、动态路由注入
- 可 return 控制导航

------

##### 5. 执行路由独享守卫（beforeEnter）

```
{
  path: '/demo',
  beforeEnter: ...
}
```

触发规则：

- 仅对 **新进入 matched 的路由记录** 触发
- 父路由已在 matched 中时不会重复触发

------

##### 6. 执行组件进入守卫（beforeRouteEnter）

```
beforeRouteEnter(to, from, next)
```

关键特性：

- **此时组件实例尚未创建**
- 拿不到 `this`
- 可通过 `next(vm => {})` 延迟访问实例

这是唯一仍使用 `next` 的守卫。

------

##### 7. 执行组件更新守卫（复用组件）

当组件被复用（如 `/user/1 → /user/2`）：

- `onBeforeRouteUpdate`
- `beforeRouteUpdate`

用途：

- 响应 params / query 变化
- 刷新数据而不重建组件

------

##### 8. 执行全局解析守卫

```
router.beforeResolve(to, from)
```

特点：

- 所有守卫中 **最靠后**
- 组件已解析但未挂载
- 适合做“最后一道校验 / 关键数据兜底预取”

------

#### 三、组件创建与渲染阶段（Vue 层）

##### 9. 创建组件实例（vm）

Vue 开始创建新组件实例：

- 初始化 props、inject、生命周期容器
- 实例存在，但逻辑尚未运行

------

##### 10. 执行 `setup()`

- 建立响应式状态
- 注册 `onMounted` / `onUnmounted`
- 返回 render / bindings

注意：

- `setup` **发生在 beforeRouteEnter 之后**
- `setup` **早于 data（Vue 3 中）**

------

##### 11. 初始化 data（选项式）

```
data() {
  return { ... }
}
```

此时：

- 响应式数据已就绪
- methods / computed 可用

------

##### 12. 执行 created

组件逻辑层已准备完成，但 DOM 未生成。

------

##### 13. 渲染并挂载

- 执行 render
- patch 到真实 DOM
- 触发 `mounted`

页面此时已显示。

------

##### 14. 执行 `beforeRouteEnter` 的 next 回调

```
next(vm => {
  vm.loadData();
});
```

此时：

- `vm` 完整可用
- data / methods / refs 基本可访问
- 若依赖 DOM，建议再 `nextTick`

------

#### 四、导航完成阶段

##### 15. 执行全局后置守卫

```
router.afterEach(to, from)
```

特点：

- 不可拦截
- 只做收尾

常见用途：

- 设置 document.title
- 关闭 Loading / NProgress
- 埋点统计

------

#### 五、完整顺序速查（面试版）

```
触发导航
↓
解析 to.matched
↓
beforeRouteLeave
↓
beforeEach
↓
beforeEnter
↓
beforeRouteEnter（无 vm）
↓
beforeRouteUpdate（若复用）
↓
beforeResolve
↓
创建组件实例
↓
setup
↓
data
↓
created
↓
render / mounted
↓
beforeRouteEnter next(vm)
↓
afterEach
```

------

#### 六、关键结论总结

- `beforeRouteEnter` **早于组件创建**
- `data / setup` **都发生在它之后**
- 父路由一定在 `matched` 中，但不一定触发 `beforeEnter`
- 组件复用不会走 `beforeRouteEnter`，而是 `beforeRouteUpdate`
- Vue Router 4 基本不用 `next`，**只有 `beforeRouteEnter` 是特例**

## 3. `<router-link>`

`<router-link>` 渲染后本质是一个 `<a>` 标签。 当它所指向的路由 **处于激活状态** 时，Vue Router 会自动给它加上一个类名，用于样式高亮。

默认行为（Vue Router 4）：

- 激活时自动加：`router-link-active`
- 精确匹配时再加：`router-link-exact-active`

`router-link` 的 **`active-class`** 用来控制：

> **当前路由与该链接匹配时，自动添加到链接元素上的 CSS 类名**。 

### 【active-class】

`active-class` 用来**覆盖默认的 `router-link-active` 类名**。

```html
<router-link
  to="/demo"
  active-class="menu-active"
>
  Demo
</router-link>
```

当 `/demo` 被认为是“激活路由”时，DOM 会变成：

```html
<a class="menu-active">Demo</a>
```

**非精确匹配（默认）**

```
<router-link to="/demo">Demo</router-link>
```

以下路径都会命中激活态：

- `/demo`
- `/demo/a`
- `/demo/b`

原因：

- `/demo` 是 `/demo/a` 的父路径
- 属于“包含式匹配”

### 【exact-active-class】

如果你只希望 **完全匹配时才高亮**，使用：

```
<router-link
  to="/demo"
  exact-active-class="menu-exact-active"
>
  Demo
</router-link>
```

触发条件：

- 只有当前路径 **严格等于** `/demo` 才会生效
- `/demo/a` 不会触发

------

### active-class vs exact-active-class

| 属性               | 触发条件   | 常见用途           |
| ------------------ | ---------- | ------------------ |
| active-class       | 包含式匹配 | 侧边栏父菜单高亮   |
| exact-active-class | 完全匹配   | 顶部 Tab、单页按钮 |

### 【全局配置】

可以在创建 router 时统一配置：

```js
const router = createRouter({
  history: createWebHistory(),
  routes,
  linkActiveClass: "menu-active",
  linkExactActiveClass: "menu-exact-active",
});
```

## 4.路由懒加载

**路由懒加载**： 把“路由对应页面组件”的代码拆分成独立的 chunk，**只有当路由被访问时才加载该组件**，而不是在首屏一次性下载全部页面代码。

本质：**代码分割（Code Splitting）+ 按需加载（On-Demand Loading）**。

1）最常用方式：`import()` 动态加载

```
const routes = [
  {
    path: "/demo",
    component: () => import("@/views/demo/index.vue"),
  },
];
```

- `import()` 会被构建工具（Vite / Webpack）拆成独立 chunk
- 只有访问 `/demo` 时才请求该 JS 文件

2）对比：非懒加载（不推荐）

```
import Demo from "@/views/demo/index.vue";

{
  path: "/demo",
  component: Demo,
}
```

- 所有页面代码都会进首包
- 首屏 JS 体积膨胀

1）显著降低首屏体积

- 首次加载只包含：首页 + 公共依赖
- 非首屏页面不参与首包下载
- **TTI / FCP 明显改善**

------

2）提升用户真实体验

- 用户通常不会一次访问所有页面
- 懒加载让“没访问的页面不付费”
- 首次进入更快，交互更早可用

## 5. `router.addRoute`

`router.addRoute` 用于在运行时把路由记录动态注入到 Router 中，常见于“登录后按权限加载菜单/路由”“微前端子应用挂载”“插件化模块路由”等场景。以下按概念、API、实现流程、关键坑点紧凑整理（Vue Router 4）。

------

动态注入的核心概念

- 静态路由：打包时写死在 routes 里，初始化 router 时一次性注册
- 动态路由：运行时通过 `router.addRoute` 添加，适合权限变化、模块按需加载
- 路由记录（RouteRecordRaw）：`path/name/component/children/meta` 等配置项
- 注入时机：通常在登录成功后、首次进入受保护页面前，或刷新后恢复会话时

------

### `addRoute` 基本 API

- `router.addRoute(record)`：添加顶层路由
- `router.addRoute(parentName, record)`：添加到某个父路由（按 name 挂 children）
- `router.hasRoute(name)`：判断是否已存在同名路由
- `router.removeRoute(name)`：移除路由（常用于退出登录/切换角色）
- `router.getRoutes()`：查看当前所有路由（调试用）

### 登录后注入菜单路由

```ts
// asyncRoutes.ts
export const asyncRoutes = [
  {
    path: "/admin",
    name: "Admin",
    component: () => import("@/layouts/AdminLayout.vue"),
    meta: { requiresAuth: true, roles: ["admin"] },
    children: [
      {
        path: "users",
        name: "AdminUsers",
        component: () => import("@/views/admin/users.vue"),
        meta: { title: "用户管理" },
      },
    ],
  },
];
// inject.ts
import type { Router, RouteRecordRaw } from "vue-router";

export function injectRoutes(router: Router, routes: RouteRecordRaw[]) {
  routes.forEach((r) => {
    if (r.name && router.hasRoute(r.name)) return;
    router.addRoute(r);
  });
}
```

------

推荐落地流程（权限路由）
 1）初始化 router：只注册“公共路由”

- `/login`、`/404`、基础布局路由（如 `/` 入口）
   2）登录成功：拉取后端菜单/权限树
   3）把权限树转换为 RouteRecordRaw（组件映射、path 拼接、meta 填充）
   4）`router.addRoute` 注入
   5）“重试”当前导航：确保刚注入的路由能命中（关键）

示例（重试导航的写法）

```js
router.beforeEach(async (to) => {
  const token = localStorage.getItem("token");
  if (!token && to.meta.requiresAuth) return "/login";

  // 仅首次注入
  if (token && !store.routesInited) {
    const menu = await api.getMenu();                 // 后端返回
    const async = buildRoutesFromMenu(menu);          // 转换为路由
    async.forEach(r => r.name && !router.hasRoute(r.name) && router.addRoute(r));
    store.routesInited = true;

    // 关键：重试当前导航，否则这次匹配时还没有这些路由
    return to.fullPath;
  }

  return true;
});
```

要点

- “重试导航”用 `return to.fullPath`（或 `replace: true` 形式）让路由重新匹配
- 注入完成后不要反复注入，设置 `routesInited` 标记
- 刷新页面会丢失运行时注入的路由，必须在刷新后重新拉取并注入（靠 token + store 恢复）

------

### 父路由挂载 children

 适合：先有 Layout 父路由，子页面按权限动态加进去

```ts
// 先确保父路由（Layout）是静态存在的，并且有 name
{
  path: "/",
  name: "RootLayout",
  component: () => import("@/layouts/RootLayout.vue"),
  children: [],
}
// 动态把子路由加到 RootLayout 下
router.addRoute("RootLayout", {
  path: "demo",
  name: "Demo",
  component: () => import("@/views/demo/index.vue"),
  meta: { title: "演示" },
});
```

要点

- `parentName` 必须是已存在路由记录的 `name`
- 子路由的 path 写相对路径（不以 `/` 开头）更符合嵌套语义

------

### 动态路由与 404 的配合

 建议在注入完成后再注册兜底 404（避免误判）

```js
router.addRoute({
  path: "/:pathMatch(.*)*",
  name: "NotFound",
  component: () => import("@/views/404.vue"),
});
```

------

退出登录/切换角色：移除动态路由

```ts
const names = ["Admin", "AdminUsers"];
names.forEach(n => router.hasRoute(n) && router.removeRoute(n));
store.routesInited = false;
```

要点

- 路由 name 需要唯一且稳定，否则无法 remove
- 也可在 store 里维护“已注入路由 name 列表”用于批量清理

------

高频坑点清单

- 刷新后路由消失：动态路由只存在于内存，刷新必须重新注入
- name 冲突：同名路由会覆盖/导致行为异常，注入前用 `hasRoute`
- 父子 path 拼接：children 用相对 path；绝对 path 会变成新的顶层路径语义

## 6. `<keep-alive>`

### `keep-alive` 的本质

- Vue 内置组件，用于**缓存组件实例**，避免卸载重建
- 只对**组件实例**生效，不缓存路由、不缓存数据请求
- 缓存命中条件：**组件 name 匹配 + 未被主动排除**

------

`keep-alive` 缓存的是什么

- 组件实例（data / setup state / computed / methods）
- 生命周期变化：
  - 首次进入：`mounted`
  - 再次进入：`activated`
  - 离开但被缓存：`deactivated`
  - 不缓存才会：`unmounted`

------

与路由的关系（关键）

- `keep-alive` **不认识路由**
- 实际缓存的是：`<router-view>` 渲染出来的**组件**
- 所以：**router-view 放哪，决定缓存边界**

------

### 基础用法

```html
<keep-alive :include="[componentName]">
  <router-view />
</keep-alive>
```

含义

- 当前 router-view 渲染的**所有路由页面**都会被缓存

适用场景

- Tab 页面切换
- 多个“平级页面”来回切换（列表 ↔ 详情 ↔ 编辑）
- 页面状态需要完整保留（滚动、筛选、表单）

注意点

- 必须配合 `include / exclude` 或 `route.meta.keepAlive`
- 否则缓存会无限增长
- 组件不定义默认没有组件名，文件名并不是默认的zu'jian

```js
<script setup>
defineOptions({
  name: "DemoPage",
});
</script>

```

### 常见写法（推荐）

```html
<router-view v-slot="{ Component, route }">
  <keep-alive>
    <component
      :is="Component"
      v-if="route.meta.keepAlive"
      :key="route.fullPath"
    />
  </keep-alive>
  <component
    :is="Component"
    v-else
    :key="route.fullPath"
  />
</router-view>
```

含义

- Layout 不缓存
- Layout 下的页面按需缓存
- 缓存边界清晰，最推荐

### 注意点

------

include / exclude 的规则（必会）

```html
<keep-alive :include="[ListPage,DetailPage]">
```

- 匹配的是**组件 name**，不是路由 name
- 组件必须显式声明：

```js
export default {
  name: "ListPage",
};
```

------

key 的作用（高频误区）

```html
<component :is="Component" :key="route.fullPath" />
```

- `key` 变化 → 强制新实例
- 想“同一路由参数变化仍复用”：
  - 用 `route.name`
- 想“参数变化就新实例”：
  - 用 `route.fullPath`

------

常见错误清单

- 忘记给组件写 `name`，导致 include 无效
- 动态路由 + keep-alive 未清理，造成状态错乱
- 依赖 DOM 的逻辑写在 `mounted`，却没处理 `activated`
