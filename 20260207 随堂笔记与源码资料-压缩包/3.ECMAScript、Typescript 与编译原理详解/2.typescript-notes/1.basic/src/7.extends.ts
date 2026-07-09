// 三种用法
// 1. 继承
class User {}

class Heyi extends User {}

// 2. 泛型约束
type TP = { name: string; age: number };
function test<T extends TP>(msg: T) {
  console.log(msg);
}
// 符合这种可以
// 大家看到这个对象的时候，类型是什么？
// 1. object
// 2. {name: string; age: number}
test({
  name: "heyi",
  age: 18,
});
test({
  name: "heyi",
  age: 18,
  data: "sdfasdfsadf",
});

// 3. 条件类型
// 类型定义配合泛型
type Gender = "man" | "woman";

const gender = "woman"; // "woman" "man"
const isWoman = gender === "woman" ? true : false;
type IsWoman<G> = G extends "woman" ? true : false;

let g: IsWoman<"woman">