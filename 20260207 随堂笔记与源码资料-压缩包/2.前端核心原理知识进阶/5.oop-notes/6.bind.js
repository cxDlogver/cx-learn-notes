function bar() {
  console.log(this.name);
}

// 默认绑定
const name = "heyi-window";

const obj = {
  name: "obj-heyi",
  //   bar // 隐式绑定
};

// bar.call(obj);
// obj.bar()

// 用到的其实就是 this 隐式绑定
Function.prototype.mybind = function (context) {
  const that = this;
  return function (...args) {
    context.fn = that; // this === bar，obj.fn = bar
    context.fn(...args);
    delete context.fn;

    return context;
  };
};

const newBar = bar.mybind(obj);
console.log("🚀 ~ newBar:", newBar);
newBar(1, 2, 3);
