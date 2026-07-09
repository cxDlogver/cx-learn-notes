<script setup lang="ts">
import { vFocus } from "../directives/vFocus";
import { vDrag } from "../directives/vDrag";

// const inputRef = ref();

// onMounted(() => {
//   inputRef.value.focus();
// });
</script>

<template>
  <!-- <input ref="inputRef" /> -->
  <input v-focus />
  <div class="box" v-drag></div>
</template>

<style>
.box {
  width: 100px;
  height: 100px;
  background-color: pink;
}
</style>
