import path from "node:path";
import HtmlWebpackPlugin from "html-webpack-plugin";

export default {
  // entry: "" // 字符串、数组、对象
  // entry: "./src/main.js"
  //   entry: ["./src/main.js", "./src/vendor.js"],
  entry: { main: "./src/main.ts", vendor: "./src/vendor.js" },
  //   为了输出的产物减少缓存的困扰，hash
  output: {
    path: path.join(import.meta.dirname, "dist"),
    clean: true,
    filename: "[name].[hash].js",
    environment: {
      arrowFunction: false,
    },
  },
  //   js 文件低版本浏览器不支持，转换，编译（babel、esbuild、swc、oxc）
  module: {
    // 针对什么文件，做什么处理
    rules: [
      {
        test: /\.js/, // 正则匹配 js 文件
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.png/,
        use: {
          loader: "file-loader",
        },
      },
      {
        test: /\.ttf/,
        use: {
          loader: "file-loader",
        },
      },
    ],
  },
  plugins: [
    // 自动创建一个html，然后把所有编译的产物加进去，让我直接可访问
    new HtmlWebpackPlugin(),
  ],
  resolve: {
    extensions: ['.js', '.mjs', '.jsx', '.ts'], // 自动解析确定的扩展
    alias: {
      // 配一个路径别名【打包构建配置】
      // tsconfig 也配的有
      "@": path.join(import.meta.dirname, "src")
    }
  },
};

// contenthash
// main.4e731710ba520edd752e.js
// vendor.12159e7c77fd78b18483.js

// hash
// main.f126630a0b0c9ec2cbe4.js
// vendor.f126630a0b0c9ec2cbe4.js
