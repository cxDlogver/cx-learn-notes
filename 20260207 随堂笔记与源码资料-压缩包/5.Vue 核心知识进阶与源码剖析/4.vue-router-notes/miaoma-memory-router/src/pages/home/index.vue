<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const navigate = (i: number) => {
  router.push(`/about/${i}`);
};
</script>

<template>
  home

  <RouterLink to="/about">about</RouterLink>
  <ul>
    <li v-for="i in [1, 2, 3, 4]" :key="i">
      <!-- <RouterLink :to="`/about/${i}`">{{ i }}</RouterLink> -->
      <button @click="navigate(i)">{{ i }}</button>
    </li>
  </ul>
</template>
