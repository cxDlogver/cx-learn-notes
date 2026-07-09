// this 指向问题

// 默认绑定
window.name = "heyi-window";

function test() {
  console.log("test", this);
  console.log(this.name);
}

window.test();

function Person() {
  this.name = "heyi-person";

  this.say = test;
}

const person = new Person();
person.say();


const p = {
  name: 'heyi-p',
  say: test
}