// webpack5 打包构建产物
!(function (root, factory) {
  // 解决当模块加载的时候，可以根据当前模块化标准环境，还确定如何加载
  // commonjs
  if (typeof module === "object" && typeof module.exports === "object") {
    console.log("是commonjs模块规范，nodejs环境");
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    console.log("是AMD模块规范，如require.js");
    define(factory);
  } else if (typeof define === "function" && define.cmd) {
    console.log("是CMD模块规范，如sea.js");
    define(factory);
  } else {
    console.log("没有模块环境，直接挂载在全局对象上");
    root.umdModule = factory(); // iife
  }
  // amd
  // cmd
  // iife
})(this, function () {
  return {
    name: "我是一个 umd 模块",
  };
});
