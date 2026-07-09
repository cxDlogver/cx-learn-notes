# 编译器原理详解

## babel 基础与安装

babel

- 高版本 ECMAScript 新特性转为低版本 js 代码
- 兼容低版本浏览器，polyfill 处理（补丁）


### babel 初始化

- cli 命令行工具
- nodejs 脚本函数调用

babel cli、webpack cli 命令行执行的文件逻辑

### plugin、preset

babel 中如果要支持更多特性语法的编译，就需要定义对应的 plugin
- 支持箭头函数：@babel/plugin-transform-arrow-functions
- 支持类转换：@babel/plugin-transform-classes

babel 为了将多个 plugin 集中打包，使用了 preset 预设的概念
- 常规的开发时转换：@babel/preset-env

### Babel 编译过程

parser -> traverse -> generator

parser 负责将源代码装换为 ast
traverse 负责将源代码 ast 使用访问者模式转为目标代码的 ast
generator 负责基于目标代码 ast 生成目标代码

## 编译原理