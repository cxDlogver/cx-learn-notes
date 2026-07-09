// this 指向问题
window.name = "heyi-window";

function test(a, b) {
  console.log("test", this, a, b);
  console.log(this.name, a, b);
}

window.test();

// 有一个对象
const obj = { name: "heyi123" };
// 用来将 this 指向他
test.call(obj, 1, 2);
test.apply(obj, [1, 2]);

// bind 的方式，因为我们有时候不想让它马上调用，而是产生一个新函数
const newTest = test.bind(obj, 1, 2);
newTest();
