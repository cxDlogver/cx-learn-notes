import { computed, ref } from "vue";
export const useCounter = () => {
  // 状态，以及状态的操作方法
  const count = ref(0);

  const doubleCount = computed(() => count.value * 2);

  const add = () => count.value++;

  return {
    count,
    doubleCount,
    add,
  };
};
