import { defineStore } from "pinia";
import { ref } from "vue";

export default defineStore("detail", () => {
  //   const title = ref("");
  //   const footer = ref("");
  const info = ref({});

  const updateTitle = () => {
    info.value = {
      footer: info.value.footer, // 反例
      title: `${Math.random()}`,
    };
    // info.value.title = `${Math.random()}`  // 正确的
  };
  const updateFooter = () => {
    info.value = {
      title: info.value.title, // 反例
      footer: `${Math.random()}`,
    };
  };

  return {
    // title,
    // footer,
    info,
    updateTitle,
    updateFooter,
  };
});
