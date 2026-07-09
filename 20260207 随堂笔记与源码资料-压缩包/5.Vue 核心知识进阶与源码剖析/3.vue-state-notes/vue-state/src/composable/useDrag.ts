// 拖拽，尽量能用 transform 来移动，就不要用修改 top、left 的形式，会频繁重绘
import { onMounted, reactive, ref } from "vue";

export const useDrag = () => {
  const rectRef = ref<HTMLDivElement>();
  const rect = reactive({
    isDraging: false,
    offset: { startX: 0, startY: 0, x: 0, y: 0 },
  });

  onMounted(() => {
    if (rectRef.value) {
      rectRef.value.addEventListener("mousedown", (ev) => {
        rect.isDraging = true;
        rect.offset.startX = ev.clientX;
        rect.offset.startY = ev.clientY;
      });

      // 鼠标移动，div，而应该是 document 承载移动操作
      document.body.addEventListener("mousemove", (ev) => {
        if (rect.isDraging) {
          rect.offset.x = ev.clientX - rect.offset.startX;
          rect.offset.y = ev.clientY - rect.offset.startY;
        }
      });

      document.body.addEventListener("mouseup", () => {
        rect.isDraging = false;
      });
    }
  });

  return {
    rect,
    rectRef
  };
};
