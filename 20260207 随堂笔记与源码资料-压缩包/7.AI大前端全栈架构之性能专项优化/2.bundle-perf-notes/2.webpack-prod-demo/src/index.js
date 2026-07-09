import React from "react";
import { createApp } from "vue";
console.log("🚀 ~ Vue:", createApp);

console.log("🚀 ~ React:", React);

import "../py/test";
// // commonjs 无法做 tree shaking，只有 esm 才能很好的支持 tree shaking
// const test = require("../py/test");

// 静态导入，在文件头部导入对应的资源
// import "@/components/utils";

// 动态导入，在需要的时机，导入依赖
// true 逻辑就可以换成 vue、react 条件渲染
if (true) {
  import("@/components/utils");
}

const say = () => {
  console.log(123);
};

say();
