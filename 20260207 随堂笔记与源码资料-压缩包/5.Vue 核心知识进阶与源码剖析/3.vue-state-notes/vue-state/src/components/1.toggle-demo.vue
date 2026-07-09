<!-- <script setup lang="ts">
import { ref } from "vue";

const flag = ref(false);
</script>

<template>
  <div v-if="flag">显示</div>
  <button @click="flag = !flag">toggle</button>
</template> -->
<script setup lang="ts">
import { useToggle } from "@/composable/useToggle";

const [f, toggle] = useToggle(false);
</script>

<template>
  <div v-if="f">显示</div>
  <button @click="toggle()">toggle</button>
</template>
