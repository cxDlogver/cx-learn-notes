<script setup lang="ts">
import type { RouteRecordRaw } from "vue-router";

import HomePage from "@/pages/home/index.vue";
import AboutPage from "@/pages/about/index.vue";
import { onMounted, provide, ref } from "vue";
import MiaomaRouteView from "./MiaomaRouteView.vue";

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
  },
  {
    path: "/admin",
    name: "admin",
    component: HomePage,
  },
];

const route = ref();

provide("route", route);

// 匹配工作
const pathMatcher = () => {
  const path = window.location.pathname;
  const route = routes.find((item) => item.path === path) || routes[0];
  return route;
};

const navigate = (path: string) => {
  route.value = routes.find((item) => item.path === path) || routes[0];
  // 更改路由
  window.history.pushState({}, "", path);
};

const back = () => {
  window.history.back();
};

const forward = () => {
  window.history.forward();
};

onMounted(() => {
  window.addEventListener("popstate", () => {
    const currentRoute = pathMatcher();
    route.value = currentRoute;
  });
});
</script>

<template>
  <div>
    <ul>
      <li v-for="r in routes" :key="r.name">
        <button @click="navigate(r.path)">{{ r.path }}</button>
      </li>
    </ul>
    <button @click="forward">forward</button>
    <button @click="back">back</button>
  </div>
  <div>
    渲染区：

    <!-- <RouterView /> -->
    <miaoma-route-view />
  </div>
</template>
