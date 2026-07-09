<script setup lang="ts">
import { defineAsyncComponent, h, ref } from "vue";

const isShow = ref(false);

// import Child from "./5.suspense-child.vue";
const Child = defineAsyncComponent({
  loader: () => import("./5.suspense-child.vue"),
  loadingComponent: h("div", "加载中..."),
});
</script>

<template>
  <div v-if="isShow">
    <Suspense>
      <Child />
    </Suspense>
  </div>

  <button @click="isShow = true">show child</button>
</template>
