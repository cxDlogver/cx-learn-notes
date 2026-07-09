import { onMounted, reactive, ref } from "vue";
export const useMove = () => {
  const dom = ref<HTMLDivElement>();
  const start = reactive({ x: 0, y: 0 });

  onMounted(() => {
    dom.value?.addEventListener("mousedown", (ev) => {
      start.x = ev.clientX;
      start.y = ev.clientY;
    });

    document.body.addEventListener("mousemove", (ev) => {
      start.x = ev.clientX;
      start.y = ev.clientY;
    });
  });

  return {
    dom,
    start,
  };
};
