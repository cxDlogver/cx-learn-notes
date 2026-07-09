<script setup lang="ts">
import { useCounter } from "../composable/useCounter";

const { count, doubleCount, add } = useCounter();
</script>

<template>
  <div>{{ count }}</div>
  <div>{{ doubleCount }}</div>

  <button @click="add">+</button>
</template>
