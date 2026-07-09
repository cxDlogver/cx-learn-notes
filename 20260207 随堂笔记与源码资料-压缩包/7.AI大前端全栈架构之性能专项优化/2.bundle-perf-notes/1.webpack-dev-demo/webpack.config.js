import path from "node:path";
import webpack from "webpack";

export default {
  mode: "development",
  entry: "./src/index.js",
  //   mode: "production",
  //   devtool: "eval-source-map",
  devtool: "eval-cheap-module-source-map",
  devServer: {
    hot: true,
    static: ["assets"], // 静态资源文件代理
    watchFiles: {
      paths: ["./src/**/*", "./py/*.js"],
      options: {
        usePolling: false,
      },
    },
  },
  resolve: {
    alias: {
      // import.meta.dirname  === __dirname
      "@/utils": path.resolve(import.meta.dirname, "src/utils"),
      "@/components": path.resolve(import.meta.dirname, "src/components"),
    },
    extensions: [".js", ".jsx"],
  },
  cache: {
    type: "filesystem",
  },
  watchOptions: {
    ignored: /py/,
  },
  module: {
    rules: [
      {
        test: /\.js/,
        use: [
          {
            loader: "thread-loader",
            options: {
              workers: 10,
            },
          },
          "babel-loader",
        ],
      },
    ],
  },
//   plugins: [
//     new webpack.DllReferencePlugin({
//       manifest: path.join(import.meta.dirname, "dist", "manifest.json"),
//     }),
//   ],
};
