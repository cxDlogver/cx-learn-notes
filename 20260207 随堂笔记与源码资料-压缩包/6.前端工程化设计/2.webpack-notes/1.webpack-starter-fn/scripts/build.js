// webpack-cli，封装好了通过命令行来启动
// 直接使用 webpack 提供的函数来启动打包构建
// 这种方式一般用在需要灵活自定义打包构建场景

// 1. 导入 webpack
import webpack from "webpack";
// 路径解析，nodejs path 模块
import path from "node:path";

// 2. 配置
const config = {
  mode: "production",
};

// 3. 初始化编译器
const compiler = webpack(config);


// 4. 执行
compiler.run()