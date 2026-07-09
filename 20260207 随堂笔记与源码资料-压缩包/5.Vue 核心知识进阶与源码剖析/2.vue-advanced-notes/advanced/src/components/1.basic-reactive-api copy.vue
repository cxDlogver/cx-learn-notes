<script setup lang="ts">
import {
  computed,
  reactive,
  readonly,
  ref,
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect,
} from "vue";
const count = ref(0);
const name = ref("heyi");

// 求 count 的两倍，从一个响应式数据派生新的响应式数据
const doubleCount = computed(() => {
  return count.value * 2;
});
// 只读 count，只能读，不能改
const readonlyCount = readonly(count);

// const info = ref({ name: "heyi", age: 18 });
const info = reactive({ name: "heyi", age: 18 });

const handleAdd = () => {
  count.value++;
};
const handleAgeAdd = () => {
  info.age++;
};

watchPostEffect(() => {
  console.log("watchPostEffect", count.value);
  document.title = `${count.value}`;
});
watchSyncEffect(() => {
  console.log("watchSyncEffect", count.value);
});
watchEffect(() => {
  console.log("watchEffect", count.value);
});

watch(
  count,
  (c) => {
    console.log("watch, c", c);
  },
  { immediate: true, deep: true, once: true },
);
</script>

<template>
  <div>{{ count }}---{{ doubleCount }}---{{ name }}</div>
  <div>readonlyCount: {{ readonlyCount }}</div>
  <!-- <button @click="count++">+</button> -->
  <button @click="handleAdd">+</button>
  <button @click="readonlyCount++">readonlyCount+</button>
  <div>{{ info.name }}--{{ info.age }}</div>
  <!-- <button @click="info.age++">age+</button> -->
  <button @click="handleAgeAdd">age+</button>
</template>
