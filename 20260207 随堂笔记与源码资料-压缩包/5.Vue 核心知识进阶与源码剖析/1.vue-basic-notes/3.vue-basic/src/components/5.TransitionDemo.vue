<script setup lang="ts">
import { ref } from "vue";

const isShow = ref(true);

const lists = ref<number[]>([]);
</script>

<template>
  <div>
    <Transition name="fade">
      <div class="box" v-if="isShow"></div>
    </Transition>
    <!-- <Transition name="fade">
      <div class="box" v-if="isShow"></div>
    </Transition>
    <Transition name="fade">
      <div class="box" v-if="isShow"></div>
    </Transition> -->
    <button @click="isShow = !isShow">toggle</button>
  </div>

  <div>
    <TransitionGroup name="fade">
      <li v-for="item in lists" :key="item">{{ item }}</li>
    </TransitionGroup>
    <button @click="lists.push(lists.length)">append</button>
  </div>
</template>

<style>
.box {
  width: 100px;
  height: 100px;
  background-color: brown;
}
.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  background-color: brown;
  transform: translateY(-100px) rotate(90deg);
}

li {
  background-color: brown;
}
</style>
