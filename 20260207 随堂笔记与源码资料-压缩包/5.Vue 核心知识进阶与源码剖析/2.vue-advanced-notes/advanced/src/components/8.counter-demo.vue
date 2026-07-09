<script setup lang="ts">
import { useCounter } from "../composable/useCounter";
import { useMove } from "../composable/useMove";

const { count, doubleCount, add } = useCounter();
const { dom, start } = useMove();
</script>

<template>
  <div>{{ count }}</div>
  <div>{{ doubleCount }}</div>
  <button @click="add">+</button>
  <div ref="dom">123 {{ start }}</div>
</template>
