<!-- <script lang="ts">
import { h } from "vue";
export default {
  mounted() {
    console.log(
      this.$slots.header?.(),
      this.$slots.body?.(),
      this.$slots.footer?.(),
    );
  },
};
</script> -->
<script setup lang="ts">
import { h, ref } from "vue";
const slots = defineSlots<{
  header(props: { count: number }): any
  body(props: { count: number }): any
  footer(props: { count: number }): any
}>()
console.log('🚀 ~ slots:', slots)

const icon = h('div', h('a', h('img')))
// const icon =  <div><a><img /></a></div> // jsx  -> React.createElement

const count = ref(0)
</script>

<template>
  slot  <icon />
  <header>
    <slot name="header" :count="count"></slot>
  </header>
  <body>
    <slot name="body" :count="count"></slot>
  </body>
  <footer>
    <slot name="footer" :count="count"></slot>
  </footer>
  <button @click="count++">+</button>
</template>


<style></style>