# React 源码解读【一】

## 开场白

目的：掌握工程设计，学习数据结构、设计思想、设计模式
前提条件：深度掌握 API 用法

1. 从源码中学数据结构与算法
2. 理解从无 React 到有 React 的演变
3. 了解 React 整体执行过程
4. 逐环节击破，各个包职责与联系、特性功能原理（Concurrent、Suspense 等）


分析工程结构 -> 执行过程中的编译过程 -> 运行时  -> 渲染机制

## React 工程架构

deepwiki.com，先完整概览项目工程化架构

复杂项目，分包就体现了架构设计

1. react，负责整个框架对外 API 规范统一
2. react-dom，负责浏览器端最终渲染（渲染器实现 react-native）。第三方（react-three-fiber 3D场景的渲染器）
3. react-reconciler，调和，fiber
4. scheduler，任务调度器，将高优先级的任务先执行，低优先级任务往后排
5. use-sync-external-store，将外部状态管理接入到 react 的状态管理机制中来

react-noop-renderer，作为后续如果同学们要写自定义 react 渲染器，直接参照它


## jsx/tsx 编译

JavaScript And Xml
Typescript And Xml

jsx 就是在 js 文件中编写 html 代码逻辑。js v8 引擎只能执行 js 语法代码，不能执行 html，所以 html 代码片段也是一个模板语法，这个模板需要在运行之前进行编译处理。

jsx html -> jsx()

选择什么样的编译器，完成 jsx -> jsx() 的编译过程
- babel
- vite

```js
<div>1</div>

function jsx() {
    // 对象
    return [
        {
            element: 'div',
            children: [
                {
                    element: 'Text',
                    text: '1'
                }
            ]
        }
    ]
}
```

## React 核心流程

- 创建
- 更新

源码的执行跑一遍，先抓住核心方法，调用栈


### 创建

1. fiber 树根节点创建
2. 更新队列初始化

## 数据结构与算法导引

### 数据结构

- 堆
- 链表
- 栈