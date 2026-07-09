# Vite 基础进阶与原理剖析

## Vite 核心与基础使用

2020 年，vite 出现的契机是浏览器 ESM 规范支持
15~20，gulp、grunt、yeoman、webpack、parcel、roolup
15 以前，js、html、css 文件满天飞没有规范的工程化概念

**bundleless** 借助浏览器 esm 模块化规范支持，使得在开发阶段少量/不打包

### vite 项目初始化

1. 脚手架，pnpm create vite
2. 手动搭建

### vite 配置

1. 插件配置，vite 生态之所以这么繁荣，vite 功能这么强大完全得益于插件系统

### resolve

解析


## Vite 插件配置与开发

除了 react、vue 还有哪些插件使用

inspect，用来查看 vite 构建情况,vite-plugin-inspect

插件执行顺序，取决于两个因素：钩子执行时机、order 属性属性 pre/post

## Vite 原理剖析

1. 开发构建，vite
2. 产物构建，vite build

