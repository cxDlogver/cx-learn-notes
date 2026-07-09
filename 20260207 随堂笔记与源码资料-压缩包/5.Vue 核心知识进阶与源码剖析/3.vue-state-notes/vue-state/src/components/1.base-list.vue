<script setup lang="ts">
import { reactive } from "vue";

// 为了更好地集中来管理状态值、操作

// 选项式 api，都只能够冗余在一个对象定义里面


const list = reactive<string[]>([]);
</script>

<template>
  <ul>
    <li v-for="(item, index) in list" v-bind:key="item">
      {{ item }} <button @click="list.splice(index, 1)">X</button>
    </li>
  </ul>
  <div>
    <button @click="list.push(`${list.length}`)">append</button>
  </div>
</template>
