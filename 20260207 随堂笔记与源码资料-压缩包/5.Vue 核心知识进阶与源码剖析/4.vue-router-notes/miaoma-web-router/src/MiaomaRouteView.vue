<script setup lang="ts">
import { inject } from "vue";
import type { RouteRecordRaw } from "vue-router";

const route = inject<RouteRecordRaw>("route");
</script>

<template>
  <component :is="route?.component"></component>
</template>
