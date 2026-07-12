---
title: 0.前端面试题一
tags: 前端面试题
categories:
  - 前端面试
date: 2026-01-06 05:33:52
---

## 资源汇总

> [2025最新Web前端学习路线 - 哔哩哔哩](https://www.bilibili.com/opus/379030881059278529)
>
> [前端知识进阶](https://www.yuque.com/cuggz/feplus)
>
> [前端面试题汇总](https://www.yuque.com/cuggz/interview)
>
> [febobo/web-interview: 语音打卡社群维护的前端面试题库，包含不限于Vue面试题，React面试题，JS面试题，HTTP面试题，工程化面试题，CSS面试题，算法面试题，大厂面试题，高频面试题](https://github.com/febobo/web-interview)
>
> [前端 JavaScript 基础面试题 - 面试鸭 - 程序员求职面试刷题神器](https://www.mianshiya.com/bank/1810644471159848962)
>
> [lgwebdream/FE-Interview: 🔥🔥🔥 前端面试，独有前端面试题详解，前端面试刷题必备，1000+前端面试真题，Html、Css、JavaScript、Vue、React、Node、TypeScript、Webpack、算法、网络与安全、浏览器](https://github.com/lgwebdream/FE-Interview/tree/master)
>
> [paddingme/Front-end-Web-Development-Interview-Question: 前端开发面试题大收集，前端面试集锦 :gift_heart: :cupid:](https://github.com/paddingme/Front-end-Web-Development-Interview-Question)
>

## 1. 会话控制

> [会话控制 - 相](https://cxdlogver.github.io/2025/12/17/NodeJS/NodeJS核心总结/#会话控制)

## 2. 常用的 **npm / pnpm / yarn** **命令**

> [ npm / pnpm / yarn 命令](https://cxdlogver.github.io/2025/12/17/NodeJS/NodeJS核心总结/#Yarn和Pnpm)

## 3.  RESTful 规则

> [RESTful 规则](https://cxdlogver.github.io/2025/12/17/NodeJS/NodeJS核心总结/#RESTFul风格设计)

## 4. Chrome DevTools 常用面板总览

| 面板        | 主要作用       | 解决的问题         |
| ----------- | -------------- | ------------------ |
| Elements    | DOM / CSS 调试 | 页面结构与样式问题 |
| Console     | JS 输出与交互  | 运行时错误、调试   |
| Sources     | 源码调试       | 断点、调用栈       |
| Network     | 网络请求       | 接口、资源加载     |
| Performance | 性能分析       | 卡顿、首屏慢       |
| Memory      | 内存分析       | 内存泄漏           |
| Application | 存储与缓存     | Cookie / Storage   |
| Security    | 安全信息       | HTTPS / 证书       |
| Lighthouse  | 质量评估       | 性能、SEO、PWA     |

**Elements**
 用于查看浏览器实际渲染后的 DOM 结构和样式来源，重点排查 CSS 覆盖、优先级和继承问题；通过实时修改样式验证布局方案，并结合盒模型分析 margin、padding 导致的布局偏移；同时利用节点高亮和事件信息，快速确认交互区域对应的具体元素。

**Console**
 用于查看运行时错误、警告和调用栈信息，辅助快速定位异常；在调试过程中输出关键变量、接口返回和异常分支结果；必要时在控制台直接执行 JavaScript，用于验证逻辑或读取当前页面状态，提高问题排查效率。

**Sources**
 配合 SourceMap 进行 JavaScript 断点调试，通过行断点或条件断点单步跟踪执行流程，查看作用域和闭包变量；在处理异步逻辑时，重点分析 Promise 和 async/await 的执行顺序，并通过 XHR / fetch 断点定位请求触发的具体代码位置。

**Network**
 用于分析网络请求和资源加载过程，重点查看请求的 URL、方法、状态码、参数以及响应内容；排查跨域、Cookie 携带和缓存命中情况；通过瀑布图分析性能瓶颈所在阶段（如 DNS、TCP、TTFB 或下载），并结合弱网模拟和禁用缓存复现首屏加载问题。

**Application**
 用于检查和管理浏览器侧的存储与缓存，包括 Cookie、localStorage、sessionStorage、IndexedDB 和 Cache Storage；验证登录态和会话信息是否正确写入；在使用 Service Worker 或 PWA 场景下，确认请求是否被接管以及缓存策略是否生效，并在必要时进行缓存清理和版本切换。

**Performance**
 用于分析页面运行性能，通过录制时间线定位卡顿原因，判断是 JavaScript 长任务还是频繁的布局和绘制操作导致主线程阻塞；在首屏分析中重点关注脚本执行、样式计算和渲染阶段的耗时分布。

下面逐个说明。

### 1. Elements（元素面板）

**作用**：
 用于查看和修改 **DOM 结构与 CSS 样式**。

**常见使用场景**：

- 查看真实渲染后的 DOM（不是源码）
- 临时修改 CSS，验证布局效果
- 定位样式覆盖、优先级问题
- 查看盒模型（margin / border / padding）

**面试理解一句话**：

> Elements 面板用于调试“页面长什么样、为什么这么显示”。

------

### 2. Console（控制台）

**作用**：
 用于 **JavaScript 输出、报错查看和即时执行代码**。

**常见使用场景**：

- 查看运行时错误和警告
- 使用 `console.log / warn / error`
- 即时执行 JS（查看变量、调用函数）
- 查看 Promise 未捕获异常

**面试理解一句话**：

> Console 是前端的“运行时窗口”。

------

### 3. Sources（源码面板）

**作用**：
 用于 **调试 JavaScript 源码**。

**核心能力**：

- 打断点（行断点、条件断点）
- 单步执行（step over / into / out）
- 查看调用栈（Call Stack）
- 查看作用域变量（Scope）
- 调试 SourceMap 映射后的源码

**典型场景**：

- 定位复杂逻辑 Bug
- 调试异步代码（Promise / async）

**面试理解一句话**：

> Sources 面板解决的是“代码为什么这样执行”。

------

### 4. Network（网络面板）

**作用**：
 用于查看 **所有网络请求和资源加载过程**。

**可以看到什么**：

- 请求 URL、方法、状态码
- 请求头 / 响应头
- 请求参数 / 返回数据
- 请求耗时（DNS、TCP、TTFB）
- 是否命中缓存（Cache / Service Worker）

**常见使用场景**：

- 调试接口是否成功
- 分析接口慢的原因
- 验证缓存、跨域、Cookie
- 查看资源加载顺序

**面试理解一句话**：

> Network 面板是排查“请求为什么慢 / 为什么失败”的核心工具。

------

### 5. Performance（性能面板）

**作用**：
 用于 **分析页面运行性能和卡顿原因**。

**可以分析**：

- JS 执行时间
- 渲染（Layout / Paint）
- 主线程是否被阻塞
- 帧率（FPS）

**典型场景**：

- 页面卡顿
- 滚动不流畅
- 首屏加载慢

**面试理解一句话**：

> Performance 用来回答“页面为什么卡”。

------

### 6. Memory（内存面板）

**作用**：
 用于分析 **内存占用与内存泄漏**。

**主要功能**：

- Heap Snapshot（堆快照）
- 查看对象是否被释放
- 对比多次快照找泄漏

**典型场景**：

- 页面用久了越来越卡
- SPA 切换页面后内存不降

**面试理解一句话**：

> Memory 面板用于定位“内存为什么一直涨”。

------

### 7. Application（应用面板）

**作用**：
 用于查看和管理 **浏览器存储与应用状态**。

**包含内容**：

- Cookie
- localStorage / sessionStorage
- IndexedDB
- Cache Storage
- Service Worker
- Manifest

**典型场景**：

- 调试登录态
- 查看缓存是否生效
- 清除存储数据
- 调试 PWA

**面试理解一句话**：

> Application 面板是浏览器存储和离线能力的总控制台。

------

### 8. Security（安全面板）

**作用**：
 用于查看页面的 **安全状态**。

**可以看到**：

- HTTPS 是否生效
- 证书是否可信
- 混合内容（HTTP + HTTPS）

**面试理解一句话**：

> Security 面板用于判断“页面是否安全访问”。

------

### 9. Lighthouse（质量评估）

**作用**：
 用于生成页面的 **综合质量报告**。

**评估维度**：

- 性能（Performance）
- 可访问性（Accessibility）
- 最佳实践（Best Practices）
- SEO
- PWA

**典型场景**：

- 首屏性能评估
- 上线前质量检查

**面试理解一句话**：

> Lighthouse 是前端页面的“体检报告”。

