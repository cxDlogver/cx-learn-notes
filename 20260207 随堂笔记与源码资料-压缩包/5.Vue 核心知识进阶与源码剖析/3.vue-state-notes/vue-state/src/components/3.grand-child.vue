<script setup lang="ts">
import { useTheme } from "@/composable/useTheme";
// import { inject } from "vue";

// const props = defineProps<{
//   theme: string;
// }>();

// const theme = inject("theme");

const { theme } = useTheme();
</script>

<template>
  grand child

  <!-- {{ props.theme }} -->
  {{ theme }}
  <div :style="{ backgroundColor: theme === 'dark' ? 'black' : '#aaa' }"></div>
</template>
