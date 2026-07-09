<script setup lang="ts">
// import Options from "./components/1.Options.vue";
// import Composition from "./components/2.Composition.vue";
import { ref } from "vue";
// import PropsEmits from "./components/3.PropsEmits.vue";
// import Slots from "./components/4.Slots.vue";
import TransitionDemo from "./components/5.TransitionDemo.vue";

const age = ref(18);
</script>

<template>
  <!-- <Options /> -->
  <!-- <Composition /> -->
  <!-- <PropsEmits
    name="heyi"
    v-bind:age="age"
    v-on:say="
      (val) => {
        console.log(val);
      }
    "
  />
  <button @click="age++">+</button> -->
  <!-- 得用 template 做模板占位 -->
  <!-- <Slots>
    <template v-slot:header="{ count }">
      <div>header --- {{ count }}</div>
    </template>
    <template #body="{ count }">
      <div>body --- {{ count }}</div>
    </template>
    <template #footer="{ count }">
      <div>footer==={{ count }}</div>
    </template>
  </Slots> -->
  <TransitionDemo />
</template>
