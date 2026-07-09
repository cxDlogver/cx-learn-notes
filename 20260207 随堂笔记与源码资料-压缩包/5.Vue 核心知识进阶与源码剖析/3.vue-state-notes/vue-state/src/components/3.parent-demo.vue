<script setup lang="ts">
import { provide, ref } from "vue";
import ChildDemo from "./3.child-demo.vue";
import { THEME_KEY } from "@/constants/THEME";

const theme = ref("light");

const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light";
};

provide(THEME_KEY, theme)
</script>

<template>
  parent
  <!-- <ChildDemo :theme="theme" /> -->
  <ChildDemo />
  <button @click="toggleTheme">修改主题</button>
</template>
