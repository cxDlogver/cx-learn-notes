# Vite 开发服务器、依赖预构建与生产构建

## 【知识概述】

**Vite 为开发反馈和生产加载分别组织流程：开发利用原生 ESM 按需转换源码，生产仍需要分析、打包和优化部署产物。**

Vite 是一个现代前端构建工具，它不是简单的 JavaScript 打包器，而是一套包含开发服务器、模块转换、热更新以及生产构建能力的工程化工具。

传统 Webpack 采用 Bundle-first 模式，在开发阶段通常需要先从入口文件开始递归分析整个项目依赖，建立完整依赖图，然后完成模块转换并生成 Bundle。这样虽然能够方便生产优化，但是项目规模增加后，会导致开发服务器启动慢、代码修改反馈慢。

Vite 针对这个问题重新设计了开发阶段流程。它认为开发阶段和生产阶段的目标不同：开发阶段关注开发者反馈速度，而生产阶段关注最终用户加载性能。因此 Vite 采用两套策略。

开发阶段，Vite 不提前构建整个应用 Bundle，而是利用现代浏览器支持的 Native ES Module，让浏览器参与模块加载。当浏览器请求入口模块后，Vite 根据请求实时转换对应模块并返回浏览器。如果浏览器继续解析 import 发现新的依赖，则继续请求，Vite 再处理对应模块。因此 Vite 的开发阶段是一个请求驱动的模块转换过程。

理解这组机制，可以沿以下主线展开：

先解释开发时为何不必预先打包全部应用源码。

沿模块请求、裸导入改写、依赖预构建和 HMR 说明反馈链路。

再对比生产构建目标，并明确底层构建引擎随版本演进。

当前官方文档采用 Rolldown，旧版本采用 Rollup 等工具；开发按需加载不等于完全没有构建，也不是所有框架能力都由外部插件提供。相关完整知识可结合 [Vite基础进阶和原理剖析](<../V-Vite基础进阶和原理剖析.md>) 阅读。

**版本边界：** 当前 Vite 官方文档使用 Rolldown；早期版本采用 Rollup，依赖预构建等底层实现也曾采用其他工具。这里保留开发与生产的职责模型，并按当前文档说明构建引擎及插件接口。[[1]](https://vite.dev/guide/build) [[2]](https://vite.dev/guide/api-plugin)

## 1. 机制说明与工程判断

### 【Vite 的定位：现代前端构建工具，而不是单纯的 Bundler】

Vite 首先需要明确定位：它不是一个简单替代 Webpack 的打包工具，而是一套面向现代前端项目的构建体系。

传统 Webpack 更强调：

> 将多个模块提前分析、转换并组合成 Bundle。

而 Vite 更关注完整的开发体验，包括：

- 开发服务器启动速度；
- 模块加载和转换；
- 热更新速度；
- 生产环境资源构建。

因此 Vite 的核心思想不是“重新发明一个更快的打包器”，而是：

> 重新设计开发阶段的模块处理方式，减少开发过程中不必要的 Bundle 工作；而在生产阶段仍然使用成熟的 Bundle 技术生成优化后的产物。

Vite 将整个流程分成两个阶段：

- 开发阶段（Development）
- 生产阶段（Production Build）

两个阶段的目标不同，因此采用不同策略。

开发阶段关注：

> 修改代码后，开发者能够快速看到结果。

生产阶段关注：

> 用户访问网站时，资源加载性能最佳。

---
### 【传统 Bundle-first 构建模式存在的问题】

Webpack 这类传统 Bundler 采用的是 Bundle-first 思想。

也就是说：

> 在浏览器运行代码之前，先由构建工具完成模块分析和资源组织。

一个典型流程：

```text
入口文件

↓

递归分析 import 依赖

↓

建立完整依赖图

↓

Loader / Plugin 转换模块

↓

生成 Bundle

↓

浏览器加载
```

这种方式的优势是：

- 浏览器只需要加载少量文件；
- 可以进行 Tree Shaking；
- 可以进行代码压缩和优化。

但是在开发阶段，它存在两个明显问题。
#### <u>1. 启动速度慢</u>

因为开发服务器启动之前，需要提前处理整个应用。

随着项目规模扩大：

- JavaScript 文件数量增加；
- 第三方依赖增加；
- 依赖关系更加复杂；

构建工具需要分析和转换的内容越来越多。

因此：

> 项目越大，开发服务器首次启动时间越长。

---
#### <u>2. 代码更新速度慢</u>

修改一个文件时：

例如修改：

```text
src/components/Button.vue
```

传统方式需要：

- 判断模块依赖关系；
- 重新处理相关模块；
- 更新 Bundle；
- 通知浏览器刷新。

虽然 HMR 可以减少刷新范围，但是它仍然建立在 Bundle 系统之上。

因此：

> 传统构建工具的问题不是不能优化，而是开发阶段承担了大量本可以延迟的构建工作。

---
### 【Vite 的核心设计思想：开发阶段减少 Bundle，生产阶段继续优化 Bundle】

Vite 的核心设计思想是：

> 不要在开发阶段提前构建整个应用，而是利用浏览器已经具备的模块加载能力，让浏览器参与模块解析。

因此 Vite 将代码分为两类处理。

---
#### <u>1. 业务源码</u>

例如：

```text
src/
 ├── components
 ├── pages
 └── utils
```

业务源码特点：

- 经常修改；
- 需要快速反馈。

所以 Vite 不会在启动阶段把全部业务代码打成 Bundle。

而是：

> 当浏览器请求某个模块时，Vite 再实时转换并返回该模块。

---
#### <u>2. 第三方依赖</u>

例如：

```text
react、vue、lodash、axios
```

第三方依赖特点：

- 修改频率低；
- 模块数量多；
- 可能存在 CommonJS 格式。

这些依赖如果每次都重新处理，会浪费大量时间。

所以 Vite 会提前进行：

> Dependency Pre-Bundling（依赖预构建）。

也就是：

先处理一次第三方依赖，然后缓存结果。

---
### 【Vite 开发阶段如何工作？】

Vite 开发阶段的核心特点是：

> 不提前构建整个应用 Bundle，而是根据浏览器请求按需处理模块。

假设项目入口：

```javascript
// main.js

import App from './App.vue'
```

传统 Bundler：

会在启动阶段：

```text
main.js

↓

App.vue

↓

其他依赖

↓

全部分析

↓

生成 Bundle
```

而 Vite：

首先启动一个 Dev Server。

浏览器访问页面后，请求入口模块：

```text
浏览器

↓

请求 main.js

↓

Vite 收到请求

↓

转换 main.js

↓

返回浏览器
```

浏览器继续解析：

```javascript
import App from './App.vue'
```

发现需要：

```text
App.vue
```

于是继续请求。

Vite 收到请求后：

- 判断文件类型；
- 调用对应转换逻辑；
- 返回浏览器可以执行的 ES Module。

例如 Vue：

```text
App.vue

↓

Vue SFC 转换

↓

JavaScript Module

↓

浏览器执行
```

因此 Vite 开发阶段的模式是：

> 浏览器需要哪个模块，Vite 就处理哪个模块。

而不是：

> 项目启动时，Vite 先把整个项目全部构建完成。

---
### 【Native ESM 为什么是 Vite 开发模式成立的基础？】

过去浏览器不支持模块化开发。

例如：

```javascript
import App from './App.js'
```

浏览器无法直接执行。

因此需要：

```text
多个模块

↓

Webpack

↓

Bundle

↓

浏览器
```

也就是说：

过去 Bundler 同时承担两个职责：

1. 分析模块依赖；
2. 帮助浏览器加载模块。

现代浏览器支持 ES Module 后：

浏览器自身可以：

- 解析 import；
- 请求依赖模块；
- 管理模块加载关系。

因此 Vite 可以减少 Bundler 在开发阶段承担的工作。

Vite 主要负责：

- 转换浏览器无法直接理解的代码；
- 提供模块；
- 管理开发过程。

这就是 Vite 官方提出的：

> Serve source code over native ESM.

---
### 【Dependency Pre-Bundling 为什么存在？】

Dependency Pre-Bundling（依赖预构建）是 Vite 针对第三方依赖设计的优化机制。

它不是为了打包业务代码，而是解决：

> 第三方依赖无法直接按照业务源码方式交给浏览器加载的问题。

主要解决两个问题。
#### <u>1. CommonJS 兼容问题</u>

npm 生态发展过程中，大量第三方包仍然采用 CommonJS：

```javascript
const xxx = require('xxx')
```

或者：

```javascript
module.exports = xxx
```

但是浏览器原生模块系统使用：

```javascript
import
export
```

两者格式不同。

因此 Vite 会提前处理：

```text
CommonJS

↓

转换

↓

ES Module

↓

浏览器加载
```

---
#### <u>2. 减少大量模块请求</u>

即使第三方依赖本身是 ES Module，也可能存在大量内部模块。

例如：

一个库：

```text
module A、module B、module C、...、module N
```

如果完全交给浏览器加载：

浏览器需要发送大量请求。

因此 Vite 会提前：

- 分析依赖；
- 优化模块结构；
- 合并处理。

最终减少浏览器请求数量。

---
#### <u>3. 预构建结果缓存</u>

第三方依赖通常不会频繁变化。

所以：

第一次启动：

```text
扫描依赖

↓

预构建

↓

缓存
```

之后启动：

直接复用缓存结果。

因此：

> Vite 将变化少的第三方依赖提前处理，将变化多的业务源码延迟处理，这是开发阶段速度快的重要原因。

---
### 【Vite 如何实现快速 HMR？】

Vite 的 HMR（Hot Module Replacement）并不是简单地“重新编译修改文件”。

核心是：

> 根据模块之间的依赖关系，找到受影响范围，只更新必要模块。

为此 Vite 在开发阶段维护：

Module Graph。

它记录：

- 哪些模块被哪些模块引用；
- 模块之间的依赖关系；
- 模块状态。

例如：

```text
App.vue

↓

User.vue

↓

Avatar.vue
```

当 Avatar.vue 修改时：

Vite 可以沿着 Module Graph 查找：

- 谁依赖 Avatar；
- 哪个模块能够接受更新；
- 更新边界在哪里。

这个边界称为：

HMR Boundary。

因此更新过程：

```text
文件变化

↓

定位模块

↓

查询 Module Graph

↓

寻找 HMR Boundary

↓

只更新相关模块
```

而不是：

```text
重新构建整个项目
```

所以 Vite 的 HMR 性能不会简单随着项目规模增加而下降。

---
### 【为什么 Vite 生产阶段仍然需要 Bundle？】

虽然 Vite 开发阶段减少 Bundle，但是生产环境仍然需要。

原因：

开发阶段目标：

> 提高开发者反馈速度。

生产阶段目标：

> 提高用户加载性能。

如果生产环境直接部署大量 ES Module：

会产生：

- 大量 HTTP 请求；
- 网络开销增加；
- 加载时间增加。

因此生产环境仍然需要：

- Bundle；
- Tree Shaking；
- Code Splitting；
- 压缩；
- 缓存优化。

生产流程：

```text
入口

↓

依赖分析

↓

模块转换

↓

代码拆分

↓

Tree Shaking

↓

压缩

↓

输出 Bundle
```

---
### 【Vite 和 Rolldown 的关系】

Vite 并不是自己重新实现完整 Bundler。

它采用：

> Vite 核心能力 + Rolldown 生产构建能力。

开发阶段：

Vite：

- Dev Server；
- Native ESM；
- HMR；
- Module Graph。

生产阶段：

Rolldown：

- 模块分析；
- Tree Shaking；
- Code Splitting；
- Bundle 输出。

所以：

```text
Vite

开发：
自己的 Dev Server

生产：
调用 Rolldown 完成构建
```

可以总结：

> Vite 不是取消 Bundle，而是把 Bundle 从开发阶段移动到了生产阶段，让开发阶段采用更适合快速反馈的模块服务模式。

## 2. 完整回答与表达组织

Vite 是一个现代前端构建工具，它不是简单的 JavaScript 打包器，而是一套包含开发服务器、模块转换、热更新以及生产构建能力的工程化工具。

传统 Webpack 采用 Bundle-first 模式，在开发阶段通常需要先从入口文件开始递归分析整个项目依赖，建立完整依赖图，然后完成模块转换并生成 Bundle。这样虽然能够方便生产优化，但是项目规模增加后，会导致开发服务器启动慢、代码修改反馈慢。

Vite 针对这个问题重新设计了开发阶段流程。它认为开发阶段和生产阶段的目标不同：开发阶段关注开发者反馈速度，而生产阶段关注最终用户加载性能。因此 Vite 采用两套策略。

开发阶段，Vite 不提前构建整个应用 Bundle，而是利用现代浏览器支持的 Native ES Module，让浏览器参与模块加载。当浏览器请求入口模块后，Vite 根据请求实时转换对应模块并返回浏览器。如果浏览器继续解析 import 发现新的依赖，则继续请求，Vite 再处理对应模块。因此 Vite 的开发阶段是一个请求驱动的模块转换过程。

但是第三方依赖不能完全按照业务源码处理，因为 npm 生态中存在 CommonJS 模块，同时部分第三方库内部包含大量模块。如果直接交给浏览器加载，会导致兼容性问题和大量网络请求。因此 Vite 引入 Dependency Pre-Bundling，对第三方依赖提前进行优化，将 CommonJS 转换为 ES Module，同时减少模块数量，并缓存预构建结果。

另外，由于浏览器无法直接解析 npm 裸模块导入，例如 `import React from 'react'`，Vite 会通过 import rewrite 将其转换为浏览器能够访问的路径。

在热更新方面，Vite 通过维护 Module Graph 记录模块之间的依赖关系。当文件发生变化时，Vite 不需要重新构建整个项目，而是根据模块关系找到受影响范围以及 HMR Boundary，只更新必要模块，因此能够保持较快的更新速度。

生产阶段由于目标变成用户加载性能，因此仍然需要 Bundle。Vite 使用 Rolldown 完成生产构建，通过模块分析、Tree Shaking、代码拆分、压缩等方式生成最终静态资源。

因此，Vite 的核心设计思想可以总结为：

> 开发阶段利用浏览器原生 ES Module，减少传统 Bundle 工作，通过依赖预构建、import rewrite 和 HMR 提升开发体验；生产阶段继续利用成熟的 Bundle 技术生成高性能产物。Vite 的本质不是取消构建，而是重新划分开发阶段和生产阶段的构建职责。

## 3. 参考文献

[1] [Vite 构建](<https://vite.dev/guide/build>)[EB/OL].

[2] [Vite 插件接口](<https://vite.dev/guide/api-plugin>)[EB/OL].
