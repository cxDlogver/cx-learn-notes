# Vue3 基础夯实

## Vue3 基础

Vue、React 本质区别，Vue 响应式数据，React 单向数据流

脚手架、组件库、工具库，传统型前端工程化团队基建。
现代化前端工程化团队基建，AI 沉淀（skills、mcp、prompts、RAG 知识库）。基于 Vite 脚手架创建 Vue3 

### 选项式 API、组合式 API

日常工作，首选 组合式 API

Option API  ->  Composition API（高复用、组件数据解耦、面向函数式编程）

### 概念

1. 数据绑定，数据驱动视图更新
2. 属性绑定
3. 计算属性
4. 事件系统
5. 条件渲染、列表渲染
6. 生命周期
7. 侦听器
8. 副作用
9. ref 语法

## props 和 emits 宏定义

defineProps

defineEmits

## 插槽

React，父组件定义子组件渲染行为，renderProps

<!-- <Count renderFooter={} /> -->

React 组件其实函数，Count({renderFooter: () => })

Vue，必须要用插槽

vue 源码编译，compileStyle、compileTemplate、compileScript


```jsx
// react 组件里，所有的父组件的上下文内容，都可以绑定到 props 中
function Counter(props) {
    props.renderHeader()
    props.renderFooter()
}
```

## 内置组件

- Transition
- TransitionGroup

组件过渡动画

单组件过渡
    条件渲染
多组件过渡
    列表组件元素变化