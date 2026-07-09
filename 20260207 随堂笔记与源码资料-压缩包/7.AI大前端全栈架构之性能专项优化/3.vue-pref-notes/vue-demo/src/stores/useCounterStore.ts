import { defineStore } from "pinia";
import { ref } from "vue";

export default defineStore("counter", () => {
  const count = ref(0);

  const add = () => count.value++;

  return {
    count,
    add,
  };
});
