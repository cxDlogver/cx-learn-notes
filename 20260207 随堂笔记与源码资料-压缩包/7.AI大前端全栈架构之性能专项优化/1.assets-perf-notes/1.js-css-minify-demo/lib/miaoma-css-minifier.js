import postcss from "postcss";
import cssnano from "cssnano";
import fs from "node:fs";
import path from "node:path";

// const code = `
// body {
//   background-color: aliceblue;
//   color: aquamarine;
// }

// .box {
//   width: 100px;
// }
// `;

// const c = `body{background-color:#f0f8ff;color:#7fffd4}.box{width:100px}`
const code = fs.readFileSync(path.join(import.meta.dirname, "../src/app.css"));

const minifier = async () => {
  const result = await postcss([
    await cssnano({
      preset: "default",
    }),
  ]).process(code);

  console.log(result.css);
};

minifier();
