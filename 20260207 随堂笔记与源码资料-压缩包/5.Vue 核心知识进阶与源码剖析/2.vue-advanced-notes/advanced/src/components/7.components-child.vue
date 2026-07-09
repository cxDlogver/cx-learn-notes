<script setup lang="ts">
import { onActivated, onDeactivated, onMounted, onUnmounted, ref } from "vue";

onActivated(() => {
  console.log("🚀 ~ onActivated:");
});
onDeactivated(() => {
  console.log("🚀 ~ onDeactivated:");
});
onUnmounted(() => {
  console.log("🚀 ~ onUnmounted:");
});
</script>

<template>
  <div class="box"></div>
</template>

<style>
.box {
  width: 100px;
  height: 100px;
  background-color: brown;
}
</style>
