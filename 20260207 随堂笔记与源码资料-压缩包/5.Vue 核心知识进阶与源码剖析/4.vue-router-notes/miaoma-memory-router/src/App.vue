<script setup lang="ts">
import { computed, ref } from "vue";
import type { RouteRecordRaw } from "vue-router";

import HomePage from "@/pages/home/index.vue";
import AboutPage from "@/pages/about/index.vue";

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

const history = ref<string[]>(["home"]);
const current = ref(0);

const matchRoute = () => {
  const routeName = history.value[current.value];

  const route = routes.find((route) => route.name === routeName);

  return route;
};

// 派生状态
const currentRoute = computed(() => {
  return history.value[current.value];
});

const navigate = (route: string) => {
  history.value.push(route);
  current.value++;
};

const back = () => {
  // history.value.pop();
  if (current.value !== 0) {
    current.value--;
  }
};

// 考算法数据结构
// [][]
// [] 加一个指针
// 飞书文档 undo、redu
// 123

const forward = () => {
  if (current.value !== history.value.length - 1) {
    current.value++;
  }
};
</script>

<template>
  <div>当前路由指针：{{ current }}</div>
  <div>当前路由：{{ currentRoute }}</div>
  <div>当前历史记录栈：{{ history }}</div>

  <div>
    <button @click="navigate('home')">home</button>
    <button @click="navigate('about')">about</button>
    <button @click="navigate('admin')">admin</button>

    <div>
      <button @click="back">back</button>
      <button @click="forward">forward</button>
    </div>
  </div>
  <div>
    渲染区：
    <component :is="matchRoute()?.component"></component>
    <!-- <RouterView /> -->
  </div>
</template>
