<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  watchEffect,
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
} from "vue";

const count = ref(1);
const doubleCount = computed(() => count.value * 2);

const canvas = ref<HTMLCanvasElement>();

// 函数是一等公民
const add = () => count.value++;

// 封装一个针对于 toggle 操作的 Composition API
// 既有状态，又有状态操作函数
const isShow = ref(true);
const toggle = () => (isShow.value = !isShow.value);

// watch(count, (newVal, oldVal) => {
//   document.title = `${newVal}`;
// });
watchEffect(() => {
  document.title = `${count.value}`;
});

console.log("created");
onBeforeMount(() => {
  console.log("beforeMount");
});
onMounted(() => {
  console.log("mounted");
  console.log(canvas.value);
  const canvasDom = canvas.value;

  if (canvasDom) {
    const ctx = canvasDom.getContext("2d");

    ctx?.beginPath();
    ctx?.moveTo(0, 0);
    ctx?.lineTo(100, 100);

    ctx?.stroke();

    ctx?.closePath();
  }
});
onBeforeUpdate(() => {
  console.log("beforeUpdate");
});
onUpdated(() => {
  console.log("updated");
});
</script>

<template>
  {{ count }}---{{ doubleCount }}
  <div v-if="isShow">{{ isShow }}</div>
  <canvas ref="canvas" />
  <button @click="add">+</button>
  <button @click="toggle">toggle</button>
</template>
