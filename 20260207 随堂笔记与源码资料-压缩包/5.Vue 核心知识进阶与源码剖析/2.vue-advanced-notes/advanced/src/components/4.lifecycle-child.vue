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

const count = ref(0);

const props = defineProps<{
  c: number;
}>();

onBeforeMount(() => {
  console.log("child onBeforeMount");
});

onMounted(() => {
  console.log("child onMounted");
});

onBeforeUpdate(() => {
  console.log("child onBeforeUpdate");
});

onUpdated(() => {
  console.log("child onUpdated");
});

onUnmounted(() => {
  console.log("child onUnmounted");
});

onBeforeUnmount(() => {
  console.log("child onBeforeUnmount");
});

onActivated(() => {
  console.log("child onActivated");
});
onDeactivated(() => {
  console.log("child onDeactivated");
});
onErrorCaptured(() => {
  console.log("child onErrorCaptured");
});
onRenderTracked(() => {
  console.log("child onRenderTracked");
});
onRenderTriggered(() => {
  console.log("child onRenderTriggered");
});
</script>

<template>
  <div>{{ count }}---{{ props.c }}</div>
  <button @click="count++">count++</button>
</template>
