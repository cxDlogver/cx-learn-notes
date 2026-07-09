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
// call，第一个参数想要 this 指向的对象，传给函数的参数
Function.prototype.mycall = function (context, ...args) {
  // context  === obj
  context.fn = this; // this === bar，obj.fn = bar
  context.fn(...args);
  delete context.fn;
};

bar.mycall(obj);

Function.prototype.myapply = function (context, args) {
  // context  === obj
  context.fn = this; // this === bar，obj.fn = bar
  context.fn();
  delete context.fn;
};

bar.myapply(obj);
