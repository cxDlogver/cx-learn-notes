"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 三种用法
// 1. 继承
class User {
}
class Heyi extends User {
}
function test(msg) {
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
const gender = "woman"; // "woman" "man"
const isWoman = gender === "woman" ? true : false;
let g;
//# sourceMappingURL=7.extends.js.map