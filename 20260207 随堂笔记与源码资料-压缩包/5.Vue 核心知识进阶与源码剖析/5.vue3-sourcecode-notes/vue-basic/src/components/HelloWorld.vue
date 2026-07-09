<script setup lang="ts">
import { reactive, ref } from "vue";
import viteLogo from "../assets/vite.svg";

const count = ref(0);
// count.value = 2
count.value


const count2 = reactive({ value: 1 });

defineProps();
defineEmits();
</script>

<template>
  <div>
    <img :src="viteLogo" />
    <div>
      <button v-on:mousedown="console.log(1)" v-show="false">你好</button>
    </div>
  </div>
</template>

<style scoped>
.box {
  /* .... */
  width: 100px;
  height: 100px;
  background: red;
}
.box2 {
  /* .... */
  width: 100px;
  height: 100px;
  background: red;
}
</style>
