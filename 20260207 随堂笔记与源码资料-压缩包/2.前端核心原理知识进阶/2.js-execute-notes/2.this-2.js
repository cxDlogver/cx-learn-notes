// this 指向问题

// 默认绑定
window.name = "heyi-window";

function test() {
  console.log("test", this);
  console.log(this.name);
}

window.test();

// 隐式绑定
const person = {
  name: "heyi-person",
  //   sayHello() {
  //     console.log("sayHello", this);
  //     window.test();
  //   },
  sayHello: test,
};

person.sayHello();