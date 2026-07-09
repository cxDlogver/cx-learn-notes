<script setup lang="ts">
import {
  ref,
  onBeforeMount, // 挂载前
  onBeforeUpdate, // 更新前
  onBeforeUnmount, // 卸载前
  onMounted, // 挂载
  onUpdated, // 更新
  onUnmounted, // 卸载
  onActivated, // 激活，KeepAlive 缓存组件
  onDeactivated, // 失活，KeepAlive 缓存组件
  onErrorCaptured, // 错误捕获
  onRenderTracked, // 渲染跟踪
  onRenderTriggered, // 渲染触
} from "vue";
import LifecycleChild from "./4.lifecycle-child.vue";

const count = ref(0);

onBeforeMount(() => {
  console.log("parent onBeforeMount");
});

onMounted(() => {
  console.log("parent onMounted");
});

onBeforeUpdate(() => {
  console.log("parent onBeforeUpdate");
});

onUpdated(() => {
  console.log("parent onUpdated");
});

onUnmounted(() => {
  console.log("parent onUnmounted");
});

onBeforeUnmount(() => {
  console.log("parent onBeforeUnmount");
});

onActivated(() => {
  console.log("parent onActivated");
});
onDeactivated(() => {
  console.log("parent onDeactivated");
});
onErrorCaptured(() => {
  console.log("parent onErrorCaptured");
});
onRenderTracked(() => {
  console.log("parent onRenderTracked");
});
onRenderTriggered(() => {
  console.log("parent onRenderTriggered");
});
</script>

<template>
  <KeepAlive>
    <LifecycleChild :c="count" v-if="count < 2" />
  </KeepAlive>
  <div>{{ count }}</div>
  <button @click="count++">count++</button>
</template>
