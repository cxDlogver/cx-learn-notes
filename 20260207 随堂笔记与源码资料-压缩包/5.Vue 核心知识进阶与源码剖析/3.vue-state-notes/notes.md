# Vue3 状态管理方案与原理剖析


## Composition API 基础状态管理方案

- ref
- reactive

ref 定义基础类型状态，reactive 对象类型状态
ref class get/set 完成响应式
reactive 通过 proxy 完成

自定义 Composition API 


## provide / inject

如果我现在有四层组件需要从最外层传一个数据到第四层，并且中间的几层可能都用不上这个数据
数据注入的方式

并且支持 Composition API 封装时使用

## 集中状态管理

vuex、**pinia**

组件 -> actions -> mutations -> state  -> 渲染组件

## Pinia 状态管理方案

组件 -> actions -> state  -> 渲染组件

- State，状态定义
- Getters， 状态派生（count  -> count*2）
- Actions，操作

## Pinia 源码浅析

1. 从 入口 API 入手，createPinia
2. defineStore
3. 响应式、获取器、动作实现