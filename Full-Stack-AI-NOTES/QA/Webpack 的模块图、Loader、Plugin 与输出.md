# Webpack 的模块图、Loader、Plugin 与输出

## 【知识概述】

**Webpack 以模块依赖图组织构建，Loader 转换模块内容，Plugin 参与构建生命周期，最终将模块组织为 chunk 和输出资源。**

Webpack 本质上是一个**静态模块打包工具，也可以理解为一个以模块依赖图为核心的前端构建工具**。

它解决的核心问题是：现代前端项目由大量 JavaScript、CSS、图片、字体以及第三方依赖组成，这些资源之间又存在复杂的依赖关系。Webpack 会从一个或者多个入口开始分析这些依赖，把项目组织成模块依赖图，然后对模块进行必要的转换、拆分和优化，最终生成浏览器可以加载的静态资源。Webpack 官方对自己的定义就是 Static Module Bundler：它会从 Entry Points 出发建立 Dependency Graph，再将项目需要的模块组合成一个或多个 Bundle。[[1]](https://webpack.js.org/concepts/)

Webpack 这里的“静态”并不是说它只能处理静态文件，也不是说它不能支持动态 `import()`。更准确地说，是 Webpack 在**构建阶段**会根据源码中能够分析到的模块依赖关系建立 Dependency Graph，再根据依赖图生成最终静态构建产物。

理解这组机制，可以沿以下主线展开：

从 entry 递归解析依赖建立模块图

解释不同资源通过 Loader 链进入构建及顺序。

再由 Plugin 扩展阶段行为，区分 Module、Chunk 与最终 Bundle 后说明 output。

Loader 与 Plugin 按职责区分而非文件类型；一个 chunk 与一个最终文件也不能在所有配置下机械等同。相关完整知识可结合 [Webpack基础进阶和原理剖析](<../W-Webpack基础进阶和原理剖析.md>) 阅读。

## 1. 机制说明与工程判断

这一题建议沿着这一条主线回答：

```text
Webpack 是什么
    ↓
读取配置并确定 Entry
    ↓
从入口解析模块
    ↓
Loader 转换模块源码
    ↓
分析模块中的依赖
    ↓
递归构建 Dependency Graph
    ↓
根据依赖关系组织 Chunk
    ↓
Plugin / 内置优化参与构建过程
    ↓
生成最终 Assets
    ↓
output 输出文件
```

这里有一个很重要的点：

> **不要机械地理解成“Loader 全执行完以后才执行 Plugin”。**

Loader 是针对模块内容进行转换的；Plugin 则可以通过 Webpack 的构建生命周期介入多个阶段，所以 Plugin 是贯穿构建流程的扩展机制，不是固定排在 Loader 后面的单独一步。Webpack 官方明确说明，Plugin 的 `apply` 方法会获得 Compiler，从而访问整个 compilation lifecycle。[[2]](https://webpack.js.org/concepts/plugins/)

---
### 【Webpack 是什么？】

Webpack 官方的定义是：

> Webpack 的核心是一个面向现代 JavaScript 应用的 **static module bundler**。

它会从一个或多个入口开始，在内部建立 Dependency Graph，然后把项目需要的模块组合为一个或者多个 Bundle，最终形成可以部署的静态资源。[[1]](https://webpack.js.org/concepts/)

所以 Webpack 不应该只理解成：

> “把几个 JS 文件合成一个 JS 文件。”

它真正解决的是一个完整的**模块构建问题**：

```text
项目里有大量模块
        ↓
模块之间存在依赖
        ↓
不同资源需要不同处理
        ↓
需要组织、转换、拆分和优化
        ↓
最终生成浏览器可以加载的资源
```

Webpack 的核心思维就是：

> **以模块和依赖关系为中心组织整个前端项目。**

---
### 【为什么叫 Static Module Bundler？】

这里的 `static` 很容易理解错。

它不是说：

> Webpack 只能处理“静态文件”。

也不是说：

> Webpack 不支持动态 `import()`。

更准确地理解是：

> **Webpack 在构建阶段从入口出发分析模块之间能够识别的依赖关系，建立模块依赖图，并根据这张图生成最终静态构建产物。**

例如：

```js
import App from './App.js'
import './style.css'
```

Webpack 不需要真正把应用启动起来、让用户点击页面以后，才知道：

```text
main.js
→ App.js
→ style.css
```

这些依赖可以在构建过程中被解析。

Webpack 官方描述也是：从 Entry Points 出发，递归建立 Dependency Graph，然后把模块组合成 Bundle。[[3]](https://webpack.js.org/concepts/dependency-graph/)

因此面试中更稳妥地说：

> **Webpack 的“静态模块打包”强调的是构建阶段对模块依赖关系进行分析和组织，而不是说它完全不支持动态依赖。**

例如：

```js
import('./UserPage.js')
```

Webpack 同样能够识别，并把它作为异步依赖参与 Chunk 划分。

---
### 【Entry 是什么？】

`entry` 就是：

> **Webpack 开始构建 Dependency Graph 的起点。**

例如：

```js
export default {
  entry: './src/main.js'
}
```

Webpack 首先找到：

```text
main.js
```

然后分析：

```js
import App from './App.js'
import './style.css'
```

再找到：

```text
App.js
style.css
```

如果 `App.js` 中：

```js
import User from './User.js'
import axios from 'axios'
```

继续找到：

```text
User.js
axios
```

形成：

```text
main.js
├── App.js
│   ├── User.js
│   └── axios
└── style.css
```

然后继续递归，直到把从入口能够到达的依赖分析出来。

Webpack 官方对 Entry 的解释正是：Entry 告诉 Webpack 从哪个模块开始建立内部 Dependency Graph，并继续寻找它直接和间接依赖的模块。[[1]](https://webpack.js.org/concepts/)

因此：

```text
Entry
≠ 最终输出文件

Entry
= 依赖分析的起点
```

Webpack 既可以有：

```text
单入口
```

也可以配置：

```text
多个入口
```

例如多页面应用：

```js
export default {
  entry: {
    home: './src/home.js',
    admin: './src/admin.js'
  }
}
```

Webpack 官方也支持从多个 Entry 构建相应的依赖关系。[[4]](https://webpack.js.org/concepts/entry-points/)

---
### 【Webpack 是怎么建立 Dependency Graph 的？】

核心过程可以理解成：

```text
Entry
↓
读取入口模块
↓
对模块进行必要转换
↓
解析模块内容
↓
找到 import / require / 资源引用
↓
解析这些依赖对应的模块
↓
重复执行
↓
Dependency Graph
```

例如：

```js
// main.js

import App from './App.js'
```

Webpack 得到：

```text
main.js
→ App.js
```

然后：

```js
// App.js

import User from './User.js'
```

继续得到：

```text
main.js
→ App.js
→ User.js
```

只要一个文件依赖另外一个文件，Webpack 就可以把这种关系记录为 Dependency。Webpack 官方还特别说明，这不仅包括代码，也可以包括图片和 Web Font 等非代码资源。[[3]](https://webpack.js.org/concepts/dependency-graph/)

最后形成：

> **Dependency Graph。**

这张图是后面：

- Chunk 划分；
- 公共依赖分析；
- Tree Shaking；
- Code Splitting；
- 最终 Bundle 生成

等工作的基础。

---
### 【为什么 Webpack 能处理 CSS、图片、字体，而不仅仅是 JS？】

Webpack 的一个核心设计思想是：

> **依赖关系不局限于 JavaScript 文件。**

例如：

```js
import './style.css'
import logo from './logo.png'
```

Webpack 可以把这些资源也纳入模块依赖关系。官方 Dependency Graph 文档明确说明，Webpack 可以把图片、Web Font 等非代码资源作为应用依赖处理。[[3]](https://webpack.js.org/concepts/dependency-graph/)

不过这里需要区分具体处理机制。

传统情况下，例如 CSS：

```js
import './style.css'
```

往往需要：

```text
css-loader
style-loader
```

等 Loader 处理。

Webpack 官方 Loader 文档就是以 CSS、TypeScript 为例，说明 Loader 可以将这些文件转换成 Webpack 可以继续处理的模块。[[5]](https://webpack.js.org/concepts/loaders/)

而图片、字体等资源在 Webpack 5 中还可以通过 **Asset Modules** 原生处理，不一定再依赖旧的 `file-loader`、`url-loader`。所以面试里不要绝对地说：

> “Webpack 所有非 JS 文件必须通过 Loader。”

更准确的是：

> **Webpack 能把不同资源纳入模块体系；Loader 是扩展模块转换能力的重要机制，而 Webpack 5 对部分静态资源还提供 Asset Modules 等内置能力。**

---
### 【Loader 到底是什么？】

Webpack 官方的定义很直接：

> **Loaders are transformations that are applied to the source code of a module.**

也就是：

> **Loader 本质上是模块源代码转换器。** [[5]](https://webpack.js.org/concepts/loaders/)

例如：

```text
TypeScript
↓
ts-loader
↓
JavaScript
```

或者：

```text
现代 JavaScript / JSX
↓
babel-loader
↓
调用 Babel
↓
转换后的 JavaScript
```

所以 Loader 自己和 Babel 不是同一个东西。

例如：

```js
{
  test: /\.js$/,
  use: 'babel-loader'
}
```

关系实际上是：

```text
Webpack
↓
发现 .js 模块需要处理
↓
babel-loader
↓
调用 Babel
↓
返回转换后的代码
↓
Webpack 继续处理
```

因此可以把：

```text
Babel
```

理解为真正负责 JavaScript 编译转换的工具；

而：

```text
babel-loader
```

负责把 Babel 接入 Webpack 的模块处理流程。

Webpack 官方示例同样使用 `babel-loader` 转换匹配的 `.js` 文件。[[1]](https://webpack.js.org/concepts/)

---
### 【为什么一个模块可以经过多个 Loader？】

因为一种资源可能需要多个处理步骤。

例如 SCSS：

```text
.scss
↓
sass-loader
↓
CSS
↓
css-loader
↓
处理 CSS import / url 等依赖
↓
style-loader
↓
把样式注入页面
```

因此 Webpack 支持 Loader Chain。

配置例如：

```js
{
  test: /\.scss$/,
  use: [
    'style-loader',
    'css-loader',
    'sass-loader'
  ]
}
```

Webpack 官方说明，普通 Loader 链在执行转换阶段通常按照**从右到左，也就是从下到上**执行。[[5]](https://webpack.js.org/concepts/loaders/)

所以：

```text
sass-loader
↓
css-loader
↓
style-loader
```

这体现了 Loader 的特点：

> **针对某类模块做链式转换。**

这一题记住这个结论即可，Loader 内部 pitch / normal 等更细的执行机制可以后面再展开。

---
### 【Plugin 是什么？】

Plugin 和 Loader 的定位完全不同。

Webpack 官方说明：

> Loader 主要用于转换特定类型的模块，而 Plugin 可以完成更广泛的任务，例如 Bundle 优化、Asset 管理、环境变量注入等。[[1]](https://webpack.js.org/concepts/)

例如：

```text
HtmlWebpackPlugin
→ 生成 HTML 并注入构建后的资源

DefinePlugin
→ 注入编译期常量

ProgressPlugin
→ 控制构建进度输出
```

Plugin 的关键不是：

> “处理一种文件。”

而是：

> **扩展 Webpack 的整体构建能力。**

一个 Webpack Plugin 通常提供：

```js
apply(compiler) {
  // 注册构建过程中的处理逻辑
}
```

Webpack Compiler 会调用 `apply`，Plugin 因此可以访问 compilation lifecycle。[[2]](https://webpack.js.org/concepts/plugins/)

所以可以理解成：

```text
Plugin
↓
接入 Webpack 构建生命周期
↓
在对应阶段执行自己的逻辑
```

这也是为什么 Plugin 能做：

```text
资源生成、资源优化、HTML 生成、环境变量处理、构建分析、压缩、进度统计、……
```

而不仅仅是修改某一个 `.js` 或 `.css` 文件。

---
### 【Loader 和 Plugin 最核心的区别是什么？】

这部分面试中最好不要只背：

> Loader 转换文件，Plugin 扩展功能。

还要解释为什么。

可以这样区分：

| | Loader | Plugin |
|---|---|---|
| 主要对象 | **某个 Module 的源码** | **整个 Webpack 构建过程** |
| 主要职责 | 转换模块内容 | 扩展构建能力 |
| 典型形式 | 输入模块 → 转换 → 返回结果 | 接入 Compiler / Compilation 生命周期 |
| 常见例子 | `babel-loader`、`css-loader`、`sass-loader` | `HtmlWebpackPlugin`、`DefinePlugin` |
| 典型问题 | “这个文件怎么处理？” | “整个构建过程还要做什么？” |

因此最容易记成：

```text
Loader
→ 管“模块怎么转换”

Plugin
→ 管“构建过程怎么扩展”
```

Webpack 官方同样明确将 Loader 定位为模块源码转换，将 Plugin 定位为完成 Loader 无法覆盖的更广泛构建任务。[[5]](https://webpack.js.org/concepts/loaders/)

---
### 【Module、Chunk、Bundle 在 Webpack 中是什么关系？】

Webpack 的构建需要放回通用模块构建流程来理解。

源码中的：

```text
main.js、App.js、User.js、style.css、axios
```

都可以进入 Webpack 的：

> **Module Graph。**

也就是：

```text
Module
```

Webpack根据依赖关系和拆分规则，再把多个 Module 组织成：

```text
Chunk
```

例如：

```text
Entry Chunk、Async Chunk、Shared Chunk
```

最后 Webpack 根据 Chunk 生成实际输出资源：

```text
main.js、vendors.js、UserPage.js
```

可以简化成：

```text
Module
↓
Dependency Graph

多个 Module
↓
组织成 Chunk

Chunk
↓
代码生成
↓
最终 Asset / Bundle
```

这也就是上一题“通用打包流程”到了 Webpack 内部以后对应的具体结构。

---
### 【output 是什么？】

`output` 解决的问题不是：

> “打包哪些模块。”

这件事主要由入口和依赖关系决定。

`output` 主要告诉 Webpack：

> **最终构建产生的文件应该怎样写到磁盘。**

例如：

```js
export default {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js'
  }
}
```

其中：

```text
path
→ 输出到哪里

filename
→ 输出文件叫什么
```

Webpack 官方定义也是：`output` 告诉 Webpack 如何把编译文件写到磁盘。[[6]](https://webpack.js.org/concepts/output/)

默认情况下，主输出文件会进入：

```text
./dist
```

但这可以配置。[[1]](https://webpack.js.org/concepts/)

Webpack 可以有多个：

```text
Entry
```

例如：

```js
entry: {
  app: './app.js',
  search: './search.js'
}
```

但是只有一份：

```js
output
```

配置对象。

这不意味着只能生成一个文件。

例如：

```js
output: {
  filename: '[name].js'
}
```

可以生成：

```text
app.js
search.js
```

Webpack 官方 Output 文档也特别说明：可以有多个 Entry，但只配置一个 `output`，通过类似 `[name]` 的占位符控制不同 Chunk 对应的文件名。[[6]](https://webpack.js.org/concepts/output/)

## 2. 完整回答与表达组织

Webpack 本质上是一个**静态模块打包工具，也可以理解为一个以模块依赖图为核心的前端构建工具**。

它解决的核心问题是：现代前端项目由大量 JavaScript、CSS、图片、字体以及第三方依赖组成，这些资源之间又存在复杂的依赖关系。Webpack 会从一个或者多个入口开始分析这些依赖，把项目组织成模块依赖图，然后对模块进行必要的转换、拆分和优化，最终生成浏览器可以加载的静态资源。Webpack 官方对自己的定义就是 Static Module Bundler：它会从 Entry Points 出发建立 Dependency Graph，再将项目需要的模块组合成一个或多个 Bundle。[[1]](https://webpack.js.org/concepts/)

Webpack 这里的“静态”并不是说它只能处理静态文件，也不是说它不能支持动态 `import()`。更准确地说，是 Webpack 在**构建阶段**会根据源码中能够分析到的模块依赖关系建立 Dependency Graph，再根据依赖图生成最终静态构建产物。

Webpack 一次基础构建首先从 **Entry** 开始。

例如：

```js
entry: './src/main.js'
```

Entry 告诉 Webpack从哪里开始建立依赖图。Webpack读取 `main.js` 后，如果发现：

```js
import App from './App.js'
import './style.css'
```

就会继续解析 `App.js` 和 `style.css`；如果 `App.js` 又依赖 `User.js` 和 `axios`，Webpack继续递归解析，最终得到整个应用从入口可达的 Dependency Graph。Webpack 官方就是把 Entry 定义为构建内部依赖图的起点，并递归跟踪其直接和间接依赖。[[4]](https://webpack.js.org/concepts/entry-points/)

在处理这些模块时，一个重要机制就是 **Loader**。

Loader 本质上是：

> **对模块源代码进行转换的函数链。**

Webpack 原生能够理解主要的 JavaScript、JSON 模块；对于 TypeScript、CSS 等其他类型的源文件，可以通过 Loader 转换为 Webpack 可以继续处理的模块。Webpack 官方将 Loader 定义为 applied to the source code of a module 的 transformations。[[5]](https://webpack.js.org/concepts/loaders/)

例如：

```js
{
  test: /\.js$/,
  use: 'babel-loader'
}
```

当 Webpack 遇到符合条件的 JavaScript 模块时，会交给 `babel-loader`，再由它调用 Babel 对源码进行转换。因此 Babel 和 `babel-loader` 不是一个东西：

```text
Babel
→ 真正进行 JavaScript 编译转换

babel-loader
→ 把 Babel 接入 Webpack 的模块转换流程
```

一个资源还可以经过多个 Loader。例如 SCSS 可能形成：

```text
SCSS
↓
sass-loader
↓
CSS
↓
css-loader
↓
处理 CSS 依赖
↓
style-loader
↓
把样式用于页面
```

普通 Loader 链的转换阶段一般按照从右到左执行。[[5]](https://webpack.js.org/concepts/loaders/)

除了 Loader 以外，Webpack 另一个非常重要的扩展机制是 **Plugin**。

Loader 主要解决：

> **某一种模块应该怎样转换。**

Plugin 解决的是：

> **整个 Webpack 构建过程还需要增加什么能力。**

例如 Plugin 可以用于资源优化、生成 HTML、注入环境变量、分析构建结果等。Webpack Plugin 会通过 `apply(compiler)` 接入 Compiler，并能够访问 Webpack 的 compilation lifecycle，因此 Plugin 不是只处理某个文件，而是可以介入更广泛的构建阶段。[[2]](https://webpack.js.org/concepts/plugins/)

所以 Loader 和 Plugin 最核心的区别可以概括成：

```text
Loader
→ 面向 Module
→ 解决“这个模块怎么转换”

Plugin
→ 面向整个构建流程
→ 解决“Webpack 构建过程怎么扩展”
```

而且不要把流程机械理解成：

```text
所有 Loader
↓
所有 Plugin
```

因为 Plugin 可以贯穿 Webpack 的多个构建阶段，Loader 则是在具体模块构建过程中参与源码转换。

Webpack 在递归处理模块之后，会形成完整的模块依赖图。接下来可以根据 Entry、动态 `import()` 以及代码拆分配置等，将不同 Module 组织成不同 **Chunk**。

所以可以理解成：

```text
Module
→ 项目中的基本模块

Dependency Graph
→ Module 之间的依赖关系

Chunk
→ Webpack 根据依赖和拆分规则组织的一组 Module

Asset / Bundle
→ 最终根据 Chunk 生成的输出文件
```

例如：

```text
main.js、UserPage.js、vendors.js
```

都可能成为最终输出的 JavaScript 资源。

最后由 **output** 控制这些构建文件怎样写入磁盘。

例如：

```js
output: {
  path: path.resolve(__dirname, 'dist'),
  filename: '[name].[contenthash].js'
}
```

其中 `path` 决定输出目录，`filename` 决定输出文件名。Webpack 可以存在多个 Entry，但只配置一个 `output` 对象；通过 `[name]` 等占位符，一份 `output` 规则仍然可以生成多个不同文件。[[6]](https://webpack.js.org/concepts/output/)

一次 Webpack 构建可以沿以下流程说明：

> **Webpack 是一个以模块依赖图为核心的静态模块打包工具。构建开始以后，它首先读取配置并确定 Entry，然后从入口模块开始解析。对于需要转换的模块，会按照 `module.rules` 使用相应 Loader，例如通过 `babel-loader` 调用 Babel 转换 JavaScript。Webpack 再分析转换后模块中的依赖关系，例如 `import`、`require` 等，找到依赖以后继续递归执行相同过程，最终形成完整的 Dependency Graph。之后 Webpack 根据入口、动态依赖以及代码拆分规则，把不同 Module 组织成 Chunk，并进行代码生成和相应优化。在整个过程中 Plugin 可以通过 Compiler / Compilation 生命周期参与资源生成、优化、环境变量注入等更广泛的构建工作。最后 Webpack 根据这些 Chunk 生成最终的 JavaScript、CSS、图片等 Assets，再按照 `output` 配置把文件写入 `dist` 等输出目录。** [[1]](https://webpack.js.org/concepts/)

这一题真正需要形成的核心关系就是：

```text
Entry
→ 从哪里开始构建

Dependency Graph
→ 项目模块之间是什么关系

Loader
→ 一个模块怎样转换

Plugin
→ Webpack 构建过程怎样扩展

Chunk
→ 模块最终怎样被组织

Output
→ 构建结果怎样写成最终文件
```

以及完整流程：

```text
读取配置 / 注册 Plugin
        ↓
确定 Entry
        ↓
读取入口 Module
        ↓
Loader 转换需要处理的模块
        ↓
解析 Module 的依赖
        ↓
递归处理依赖
        ↓
建立 Dependency Graph
        ↓
组织 Module 为 Chunk
        ↓
进行代码生成和构建优化
        ↓
生成 Assets
        ↓
按照 output 输出
```

这对应通用前端打包流程在 Webpack 中的落地。

## 3. 参考文献

[1] [webpack](<https://webpack.js.org/concepts/>)[EB/OL].

[2] [webpack](<https://webpack.js.org/concepts/plugins/>)[EB/OL].

[3] [webpack](<https://webpack.js.org/concepts/dependency-graph/>)[EB/OL].

[4] [webpack](<https://webpack.js.org/concepts/entry-points/>)[EB/OL].

[5] [webpack](<https://webpack.js.org/concepts/loaders/>)[EB/OL].

[6] [webpack](<https://webpack.js.org/concepts/output/>)[EB/OL].
