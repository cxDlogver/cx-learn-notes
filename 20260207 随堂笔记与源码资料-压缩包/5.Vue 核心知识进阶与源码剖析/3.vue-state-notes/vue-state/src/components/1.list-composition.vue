<script setup lang="ts">
import { useList } from "@/composable/useList";

const { list, append, remove } = useList<{ id: number; data: number }>({ id: 0, data: 0 });
</script>

<template>
  <ul>
    <li v-for="(item, index) in list" v-bind:key="item.id">
      {{ item.data }} <button @click="remove(index)">X</button>
    </li>
  </ul>
  <div>
    <button @click="append({ id: list.length, data: list.length })">append</button>
  </div>
</template>
