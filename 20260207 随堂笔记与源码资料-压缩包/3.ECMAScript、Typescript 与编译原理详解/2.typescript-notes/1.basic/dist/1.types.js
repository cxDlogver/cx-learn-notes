"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ts 强类型
// js 有哪些数据类型
// 基础数据类型：number、string、boolean、null、undefined、Symbol、bigint
// 引用数据类型：array、function、date、regexp
let num = 2;
let str = "hello";
let bool = true;
let nullVal = null;
let undefinedVal = undefined;
let symbolVal = Symbol.for("symbol");
// 对象类型
let obj = {};
let arr1 = [1, 2, 3];
let arr2 = [1, 2, 3];
let tuple = [1, "2"]; // 元组
var Gender;
(function (Gender) {
    Gender["Man"] = "man";
    Gender["Woman"] = "woman";
})(Gender || (Gender = {}));
let gen = Gender.Woman;
let date = new Date();
let reg = /\d+/;
let map = new Map(); // 键值对，我们有时候需要约束键的类型，有时需要约束值的类型
let set = new Set();
let weakmap = new WeakMap();
let weakset = new WeakSet();
//# sourceMappingURL=1.types.js.map