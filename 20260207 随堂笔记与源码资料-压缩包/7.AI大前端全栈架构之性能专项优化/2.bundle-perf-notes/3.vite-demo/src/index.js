// import "./sum"
import { createApp } from "vue";
import * as _ from "lodash";
console.log("🚀 ~ createApp:", createApp, _);

const render = async () => {
  // 条件渲染，如果某个组件当前不一定需要渲染，那这个组件你就考虑用动态导入
  // 动态导入组件分 chunk 打包，在需要加载的时候才请求加载这个产物
  const sum = (await import("./sum.js")).default;
  console.log("🚀 ~ render ~ sum:", sum);

  document.querySelector("#app").innerHTML = `
    <h1>合一
    ${import.meta.env.VITE_API_URL}
    ${sum(1, 2)}
    </h1>
    `;
};

render();
