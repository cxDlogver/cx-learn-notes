// class Animal {
//   color = undefined;

//   eat() {
//     console.log("eat");
//   }
// }

// 1. 构造器，类名，用来实例化对象
function Animal() {}

// 2. 原型属性方法
Animal.prototype.color = undefined;
Animal.prototype.eat = function () {
  console.log("eat");
};

const animal1 = new Animal();
const animal2 = new Animal();

animal1.eat();
animal2.eat();

// animal1 对象，Animal 类，类实例化对象

// 对象和类的关系
// 类 prototype，   定义共享数据
// 对象 __proto__， 接收类给到的共享数据
console.log(animal1.__proto__ === Animal.prototype);

// 示例1
const num = 1; // Number，js 万物皆对象，1，Number 对象实例化出来
console.log(num.__proto__ === Number.prototype);
// 示例2
const str = "str";
// 获取类名称
// Object.prototype.toString.call()
console.log(Object.prototype.toString.call(str.__proto__));
console.log(str.__proto__ === String.prototype);
// 示例3
const arr = [];
console.log(arr.__proto__ === Array.prototype);

// 示例4
function test() {}
console.log(test.__proto__ === Function.prototype);

// 示例5
console.log(Function.prototype.__proto__ === Object.prototype);

// Object 是所有对象的顶级父类

// Object.prototype.__proto__
console.log(Object.prototype.__proto__);

// 深层继承的例子
class A {} // A类
class B extends A {} // B类
class C extends B {} // C类

const a = new A();
const b = new B();
const c = new C();

// 在这三个类中，A 属于最终父类
// A => B => C
console.log("a.__proto__ === A.prototype", a.__proto__ === A.prototype);
console.log("b.__proto__ === B.prototype", b.__proto__ === B.prototype);
console.log("c.__proto__ === C.prototype", c.__proto__ === C.prototype);

// A.prototype.__proto__ === B.prototype ??? Object.prototype ❌
// 结论 A 上级父类为 Object  ==> A.prototype.__proto__ === Object.prototype
console.log(
  "B.prototype.__proto__ === A.prototype",
  B.prototype.__proto__ === A.prototype,
);
console.log(
  "C.prototype.__proto__ === B.prototype",
  C.prototype.__proto__ === B.prototype,
);
