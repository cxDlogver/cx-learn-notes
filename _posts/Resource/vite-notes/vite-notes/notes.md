# Vite 基础进阶与原理剖析

vite bundleless（基于浏览器 esm 规范落地）
webpack 构建打包工具
rollup
gulp

## 基础使用

1. 脚手架
2. 从零到一手搭

vite 构架的两种模式

- 应用模型
  - 出发点是 html
  - 在 html 中通过 module 的方式引入 js 入口文件，以此来实现最终业务应用打包构建
  - vite-plugin 来支持更多新特性语法编译
  - vite 在启动的时候，会扫描 vite.config.js 来配置相关插件，实现对项目的定制化构建
- lib(库) 模式
  - build.lib 配置入口，输出逻辑

js 项目
react + js
vue + js
react + ts
vue + ts

## Vite 插件配置与开发

vite 插件是有标准的
是一个函数，函数会返回一个对象（标准的插件对象）

## Vite 原理剖析

- 开发时
  - 借助 esm 特性，少量打包，如果需要打包的话，借助 esbuild
- 生产时
  - 借助 rollup 打包

## 手写简版 Vite

项目初始化 -> 开发服务器 -> 编译 -> 输出/返回

为什么开发环境依赖与构建缓存不用加 hash？
因为

1. 启动时初步构建
2. hmr，新的构建内容重新缓存到缓存文件中

## 补充项 vite8
"vite": "npm:rolldown-vite@latest"     ✓ built in 24ms
"vite": "7.1.12"                       ✓ built in 35ms