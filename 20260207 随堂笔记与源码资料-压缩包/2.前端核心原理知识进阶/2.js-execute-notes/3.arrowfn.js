// 箭头函数和普通函数，有四个不同点

// 1. 箭头函数不能作为构造器
// 2. 箭头函数无法访问 arguments 对象
// 3. 箭头函数没有自己的 this 指向
// 4. 无法通过 call、apply、bind 改变 this 指向

// // 构造器
// function Person() {}

// const person = new Person();

// const Test = () => {};

// const test = new Test();

// // arguments 对象
// function test() {
//   console.log(arguments);
// }

// test(1, 2, 3);

// const testArrow = (...args) => {
//     // console.log(arguments); // 不能用的
//     console.log(args);
// };

// testArrow(1, 2, 3);

// // 箭头函数没有自己的 this 指向
// function test() {
//   console.log(this);
// }

// const obj1 = {
//   name: "heyi-obj1",
//   say: test,
// };

// const testArrow = () => {
//   console.log(this);
// };

// const obj2 = {
//   name: "heyi-obj2",
//   say: testArrow,
// };

// test();
// testArrow();
// obj1.say();
// obj2.say();

const obj = {
  say: () => {
    console.log(this);
  },
};
const testArrow = () => {
  console.log(this);
};

testArrow.call({
  name: "heyi-call",
});

obj.say();

const obj2 = {
  say() {
    console.log(this);
    obj.say();
  },
};
