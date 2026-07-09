import { defineStore } from "pinia";
import { ref } from "vue";

// 定义状态

// 两种写法

// // 1. options 写法

// export const useCounter = defineStore("count", {
//   state() {
//     return {
//       count: 0,
//     };
//   },
//   // 完全弃用了 mutation
//   //   mutations: {
//   //   increment(state) {
//   //     state.count++;
//   //   },
//   // },
//   actions: {
//     increment() {
//       this.count++;
//     },
//   },
// });

// 2. composition api 写法

export const useCounter = defineStore("count", () => {
  const count = ref(0);

  const increment = () => {
    count.value++;
  };

  const decrement = () => {
    count.value--;
  };

  return {
    count,
    increment,
    decrement
  };
});
