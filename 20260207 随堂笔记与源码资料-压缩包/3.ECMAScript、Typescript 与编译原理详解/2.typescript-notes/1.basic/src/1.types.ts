// ts 强类型
// js 有哪些数据类型
// 基础数据类型：number、string、boolean、null、undefined、Symbol、bigint
// 引用数据类型：array、function、date、regexp
let num: number = 2;
let str: string = "hello";
let bool: boolean = true;
let nullVal: null = null;
let undefinedVal: undefined = undefined;
let symbolVal: symbol = Symbol.for("symbol");

// 对象类型
let obj: object = {};
let arr1: number[] = [1, 2, 3];
let arr2: Array<number> = [1, 2, 3];
let tuple: [number, string] = [1, "2"]; // 元组
enum Gender {
  Man = "man",
  Woman = "woman",
}
let gen: Gender = Gender.Woman

let date: Date = new Date();
let reg: RegExp = /\d+/;
let map = new Map<string, number>(); // 键值对，我们有时候需要约束键的类型，有时需要约束值的类型
let set = new Set<number>();
let weakmap = new WeakMap<{ name: string }, number>();
let weakset = new WeakSet<{ name: string }>();