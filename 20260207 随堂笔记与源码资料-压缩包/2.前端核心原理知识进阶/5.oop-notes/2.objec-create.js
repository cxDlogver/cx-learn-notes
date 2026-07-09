// 对象创建方法
// 1. 对象工厂模式创建
// 更结构化的形式来做
// 构造器
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.say = function () {
  console.log(this.name);
};
function createPerson({ name }) {
  //   // 字面量，还是 new 都可以
  //   const obj = {};
  //   obj.name = name;

  //   obj.say = function () {
  //     console.log(this.name);
  //   };

  //   return obj;
  return new Person(name, 6);
}

// 工厂模式，只关注对象创建初始值，不用关心创建过程和操作
const person = createPerson({ name: "heyi" });
person.say();

// 2. 构造器模式
const p2 = new Person("heyi", 31);
p2.say();
