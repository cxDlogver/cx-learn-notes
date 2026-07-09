export const vDrag = {
  mounted(el: HTMLElement) {
    el.draggable = true;

    el.addEventListener("dragstart", (ev) => {
      console.log(ev.clientX, ev.clientY);
    });
  },
};
