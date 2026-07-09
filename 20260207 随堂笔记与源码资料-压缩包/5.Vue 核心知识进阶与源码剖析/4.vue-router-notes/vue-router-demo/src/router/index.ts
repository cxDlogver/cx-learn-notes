// import { h } from "vue";
import { defineAsyncComponent } from "vue";
import { createRouter, createWebHistory, createWebHashHistory, createMemoryHistory, type RouteRecordRaw } from "vue-router";
// import HomePage from "@/pages/home/index.vue";
// import AboutPage from "@/pages/about/index.vue";
// import AboutIdPage from "@/pages/about/[id].vue";
// import NotFoundPage from "@/pages/404/index.vue";
const HomePage = defineAsyncComponent(() => import("@/pages/home/index.vue"));
const AboutPage = defineAsyncComponent(() => import("@/pages/about/index.vue"));
const AboutIdPage = defineAsyncComponent(() => import("@/pages/about/[id].vue"));
const NotFoundPage = defineAsyncComponent(() => import("@/pages/404/index.vue"));

// 路由到组件的映射，路由映射表
const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: HomePage,
  },
  {
    path: "/about",
    name: "about",
    component: AboutPage,
    children: [
      { path: "sub", name: "about-sub", component: HomePage },
      { path: ":id", name: "about-id", component: AboutIdPage, meta: { requiresAuth: true } },
    ],
  },
  {
    path: "/admin",
    name: "admin",
    component: HomePage,
    beforeEnter: (to, from) => {
      return false; // 判断权限是否够，有权限 true，无权限 false
    },
  },
  // 兜底路由匹配组件 404
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: NotFoundPage,
  },
];

// 路由根组件
export const router = createRouter({
  // 历史记录栈类型选择
  // history: createWebHistory(),
  // history: createWebHashHistory(),
  history: createMemoryHistory(),
  routes,
});

// 全局，将操作绑定到 router 上
router.beforeEach((to, from, next) => {
  console.log("beforeEach1", from.meta, to.meta);
  console.log("beforeEach1", from, to);

  // const toPath = to.path;

  // if (toPath.includes("about")) {
  //   // redirect
  //   window.location.href = "/";
  // }
  if (to.meta.requiresAuth) {
    // 假设我现在权限校验失败
    // redirect
    if (!localStorage.getItem("token")) {
      window.location.href = "/";
    }
  }

  next(); // 异步，当异步完成后调用 next
});
// 全局，将操作绑定到 router 上
router.beforeEach((to, from, next) => {
  console.log("beforeEach2", from, to);

  next(); // 异步，当异步完成后调用 next
});
// 全局，将操作绑定到 router 上
router.beforeEach((to, from, next) => {
  console.log("beforeEach3", from, to);

  next(); // 异步，当异步完成后调用 next
});
router.beforeResolve((to, from, next) => {
  console.log("beforeResolve", from, to);

  next(); // 异步，当异步完成后调用 next
});
router.afterEach((to, from) => {
  console.log("afterEach1", from, to);
});
router.afterEach((to, from) => {
  console.log("afterEach2", from, to);
});
