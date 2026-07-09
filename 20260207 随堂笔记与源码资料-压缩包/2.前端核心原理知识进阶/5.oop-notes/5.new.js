// 构造函数
function Person(name) {
  this.name = name;
}

// const p = new Person("heyi");
function MiaomaNew(Constructor, ...args) {
  // 解决对象原型问题
  const obj = {};
  obj.__proto__ = Constructor.prototype;
  //   构造器借用
  const result = Constructor.call(obj, ...args);

  return result instanceof Object ? result : obj;
}

const p = MiaomaNew(Person, "heyi");
console.log(p instanceof Person);
console.log(p.__proto__ === Person.prototype);
