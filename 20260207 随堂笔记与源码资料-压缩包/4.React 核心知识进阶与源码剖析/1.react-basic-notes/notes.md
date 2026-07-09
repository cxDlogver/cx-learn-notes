# React19 基础夯实

## React 简介

UI = render(state)，从以往基于 DOM 驱动的形式编程变成了基于状态驱动
state 变化引起 UI 变化，react 更新处理过程

### 核心特点

1. 声明式
2. 组件化
3. 虚拟 DOM
    操作 DOM 完成更新，频繁操作 DOM、大批量操作 DOM 引发重排问题，DocumentFragment
    操作更新  -> 虚拟 DOM ->  DOM
4. 单向数据流
    数据自顶向下，props 后代组件传递
    Redux 状态库
5. JSX 语法
    JavaScript And XML，jsx 语法不是 js 语法，v8 引擎没办法解析执行，必须要有编译器来将 jsx 语法**编译**为 js 语法才能使用

## React 项目初始化

- 工程架构
- 打包构建
- 流程约束
- 规范约束

### 脚手架、自搭建

脚手架
    - create-react-app
    - vite ✅
自搭建
    - vite 搭建


## React 基础语法


