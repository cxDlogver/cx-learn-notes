// 使用其他模块内容
const basic = require("./1.basic");

console.log(basic.name);

basic.name = "miaoma";

if (true) {
  const b = require("./1.basic");
}
