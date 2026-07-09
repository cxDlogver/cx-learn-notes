// 函数作用域隔离
// function $() {
//   const version = "1.0.0";
//   return;
// }

// function react() {
//   const version = "19.0.0";
// }

// 命名空间隔离
function $() {
  const version = "1.0.0";
  return {
    css() {
      return this;
    },
    attr() {
      return this;
    },
    html() {
      return this;
    },
  };
}

$("div").css("color", "pink").attr();


// IIFE 即调函数闭包形式
!(function (global) {
    
})(globalThis)