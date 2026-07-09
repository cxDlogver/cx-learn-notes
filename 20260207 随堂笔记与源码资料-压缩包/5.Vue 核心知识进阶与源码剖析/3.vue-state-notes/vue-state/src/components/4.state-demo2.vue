<script setup lang="ts">
import { useCounter } from "@/stores/count";

// 响应式丢失
// const { count, increment } = useCounter();
const counterStore = useCounter();

</script>

<template>
  state demo2
  {{ counterStore.count }}
  <button @click="counterStore.increment()">+</button>
</template>
