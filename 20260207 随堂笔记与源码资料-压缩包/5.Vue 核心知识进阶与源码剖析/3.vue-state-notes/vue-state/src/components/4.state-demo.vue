<script setup lang="ts">
import { useCounter } from "@/stores/count";
import { storeToRefs } from "pinia";

// 响应式丢失
// const { count, increment } = useCounter();
const counterStore = useCounter();
// pinia 提供 storeToRefs 解决响应式丢失问题
const { count } = storeToRefs(counterStore);
</script>

<template>
  <!-- {{ counterStore.count }}
  {{ JSON.stringify($pinia.state.value) }}
  <button @click="counterStore.increment()">+</button>
  <button @click="counterStore.decrement()">-</button> -->
  {{ count }}
  {{ JSON.stringify($pinia.state.value) }}
  <button @click="counterStore.increment()">+</button>
  <button @click="counterStore.decrement()">-</button>
</template>
