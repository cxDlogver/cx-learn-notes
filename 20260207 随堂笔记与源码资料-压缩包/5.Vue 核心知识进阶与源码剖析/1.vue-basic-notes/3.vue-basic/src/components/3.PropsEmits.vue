<script setup lang="ts">
// name/age/say
// // using Array syntax
// const props = defineProps(['name', 'age'])
// // using Object syntax
// const props = defineProps({
//   name: String,
//   age: Number
// })

// ✅ will be compiled into equivalent runtime declarations
const props = defineProps<{
  // 没导入就可用场景，宏定义，编译时自动导入处理
  name?: string;
  age: number;
}>();

// Example runtime declaration:
// const emit = defineEmits(['change', 'update'])

// ✅ Example type-based declaration:

const emit = defineEmits<{
  // <eventName>: <expected arguments>
  say: [val: string];
  //   update: [value: number, value2: string] // named tuple syntax
}>();

const handleSay = () => {
  emit("say", "2");
};
</script>

<template>
  {{ props.name }} --- {{ props.age }}
  <!-- <div v-on:click=""></div> -->
  <!-- <div @click=""></div> -->
  <button @click="handleSay">say 调用父组件传入方法</button>
</template>
