// 泛型解决了什么问题？

let str: string = "string";

// 是一个数组、Map，里面的内容我要约束，我怎么约束？
// 定义数组类，不知道要装什么类型的数据，就用一个<宽泛的类型>来占位  -> 泛型
// 使用数组的时候，可以确定装什么数据
let strArr: Array<boolean> = [true, false];

// function test(msg) {
//   console.log(msg);
// }

// test("hesan")

// 1. 自定义类、接口

interface IPerson<Name, V> {
  name: Name;
  say(extra: V): Name;
}
class Person<Name, V> implements IPerson<Name, V> {
  // name: 假设可以是字符串、可以是数字、可以是 symbol
  name: Name;

  constructor(name: Name) {
    this.name = name;
  }

  say(extra: V) {
    return this.name;
  }
}
const person: Person<string, number> = new Person("heyi");
person.say(18);

// 2. 自定义类型
type MiaomaArray<N> = Array<N>;
type Take<T> = {
  name: T;
};

const arr: MiaomaArray<string> = ["1", "2"];
const take: Take<string> = { name: "he" };

// 3. 函数
// 普通函数的写法
function test1<T>(msg: T) {
  console.log(msg);
}
test1("heyi");
test1(1);
test1(true);
test1({
  name: "heyi",
  age: 18,
});
// 箭头函数的写法
const test2 = <T>(msg: T) => {
  console.log(msg);
};

// 泛型的约束
// 泛型约束不止函数场景，上面的两个场景都一样

// 约束传入的参数，必须满足某一个结构
function test3<T extends { name: string; age: number }>(msg: T) {
  console.log(msg);
}
// 符合这种可以
// 大家看到这个对象的时候，类型是什么？
// 1. object
// 2. {name: string; age: number}
test3({
  name: "heyi",
  age: 18,
});
test3({
  name: "heyi",
  age: 18,
  data: "sdfasdfsadf",
});
// 这些都不可以
// test3("heyi");
// test3(1);
// test3(true);
