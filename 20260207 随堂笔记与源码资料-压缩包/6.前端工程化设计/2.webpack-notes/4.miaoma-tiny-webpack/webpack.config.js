const ExamplePlugin = require("./plugins/examplePlugin.js");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "main.js",
    path: __dirname + "/dist",
  },
  module: {
    rules: [
      {
        test: /\.js/,
        use: ["./loaders/exampleLoader.js", "./loaders/babelLoader.js"],
      },
    ],
  },
  plugins: [new ExamplePlugin()],
};
