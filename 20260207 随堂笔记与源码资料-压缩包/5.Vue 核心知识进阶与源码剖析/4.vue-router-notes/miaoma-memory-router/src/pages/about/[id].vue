<script setup lang="ts">
import { useRoute, onBeforeRouteUpdate, onBeforeRouteLeave } from "vue-router";

const route = useRoute();

onBeforeRouteUpdate(() => {
  console.log("🚀 ~ onBeforeRouteUpdate");
});
onBeforeRouteLeave(() => {
  console.log("🚀 ~ onBeforeRouteLeave");
});
</script>

<!-- <template>about :id {{ $route.params.id }}</template> -->
<template>about :id {{ route.params.id }}</template>
