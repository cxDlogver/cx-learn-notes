// 实现 dom 自动聚焦
// input 框聚焦的特性

// export const vFocus = () => {
//   return {
//     mounted(el: HTMLElement) {
//       console.log('🚀 ~ vFocus ~ el:', el)
//       el.focus();
//     },
//   };
// };
export const vFocus = {
  mounted(el: HTMLElement) {
    console.log("🚀 ~ vFocus ~ el:", el);
    el.focus();
  },
};
