// 1. 箭头函数不能做为构造器
// 2. this 不会因为调用对象变化而变化
// 3. 没有 arguments 对象
// 4. 不能够使用 call、apply、bind 改变 this 指向

// 1. 箭头函数不能做为构造器
// const Person = () => {};
// // class Person{}
// const person = new Person();

// 2. this 不会因为调用对象变化而变化
const obj = {
  name: "heyi",
  //   say() {
  //     console.log(this.name);
  //   },
  say: () => {
    console.log(this.name);
  },
};

obj.say();

// 3. 没有 arguments 对象
function test() {
  console.log(arguments);
}
const test_arrow = (...args) => {
  console.log(args);
};
// test();
test_arrow();

// 4. 不能够使用 call、apply、bind 改变 this 指向
function test2() {
  console.log(this.name);
}
global.name = "heyi";
test2();
test2.call({ name: "xiaoming" });

const test2_arrow = () => {
  console.log(this.name);
};

test2_arrow();
test2_arrow.call({ name: "xiaohong" });
