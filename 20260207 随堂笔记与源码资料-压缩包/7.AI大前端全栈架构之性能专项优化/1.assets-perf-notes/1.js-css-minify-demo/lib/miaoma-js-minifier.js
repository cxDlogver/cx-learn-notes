// terser，压缩
import { minify } from "terser";
import fs from "node:fs";
import path from "node:path";

// const code = `
// export function test() {
//   var x = {
//     baz_: 0,
//     foo_: 1,
//     calc: function () {
//       return this.foo_ + this.baz_;
//     },
//   };
//   x.bar_ = 2;
//   x["baz_"] = 3;
//   console.log(x.calc());
// }
// `;
// const c = `export function test(){var o={baz_:(0,3),foo_:1,calc:function(){return this.foo_+this.baz_},bar_:2};console.log(o.calc())}`

const code = {
  "file1.js": "function add(first, second) { return first + second; }",
  "file2.js": "console.log(add(1 + 2, 3 + 4));",
  "file3.js": fs
    .readFileSync(
      path.join(/* __dirname */ import.meta.dirname, "../src/app.js"),
    )
    .toString(),
};

const minifier = async () => {
  const result = await minify(code);
  console.log("🚀 ~ minifier ~ result:", result);
};

minifier();
