const swc = require("@rollup/plugin-swc");

// commonjs
module.exports = exports = [
  {
    input: "./src/index.ts",
    output: {
      file: "es/bundle.js",
      format: "es",
    },
    plugins: [swc()],
  },
];
