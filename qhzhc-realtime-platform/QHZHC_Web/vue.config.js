const path = require("node:path");

/*
 * @Author: zhou
 * @Date: 2024-03-18 14:23:03
 * @LastEditors: zhou
 * @LastEditTime: 2024-07-15 15:08:06
 * @Description:
 * @param:
 * @return:
 */
module.exports = {
  publicPath: "./", //   部署应用包时的基本 URL
  outputDir: "dist", //   打包时输出的文件目录
  assetsDir: "static", //   放置静态文件夹目录
  lintOnSave: false, //关闭了eslint检查
  configureWebpack: {
    entry: {
      app: path.resolve(__dirname, "src/main.ts"),
    },
    resolve: {
      extensions: [".ts", ".tsx", ".mjs", ".js", ".jsx", ".vue", ".json"],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: path.resolve(
                __dirname,
                "build/typescript-transpile-loader.cjs",
              ),
            },
          ],
        },
      ],
    },
  },
  devServer: {
    host: "127.0.0.1",
    port: 9527, //开发环境运行时的端口
    https: false, //是否启用HTTPS协议
    open: false, //由开发者按需打开浏览器，避免启动命令依赖桌面环境
    hot: true, //是否开启热加载
    client: {
      overlay: false,
    },
    // proxy: {
    //   //服务器代理
    //   "/api": {
    //     // target: "http://119.45.21.43:5004", // 实际跨域请求的API地址
    //     target: "",
    //     secure: false, // https请求则使用true
    //     ws: true,
    //     changeOrigin: true, // 跨域
    //     // 请求地址重写  http://front-end/api/login ⇒ http://api-url/login
    //     pathRewrite: {
    //       "^/api": "/",
    //     },
    //   },
    // },
  },
};
