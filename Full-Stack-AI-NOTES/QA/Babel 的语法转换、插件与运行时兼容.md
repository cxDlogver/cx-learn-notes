# Babel 的语法转换、插件与运行时兼容

## 【知识概述】

**Babel 是代码转换工具链，通过解析、变换和生成处理目标环境不能直接理解的语法；运行时 API 兼容需要另外处理。**

Babel 本质上是一个 **JavaScript 编译器和代码转换工具链**。它主要解决的问题是：我们在开发阶段希望使用现代 JavaScript、JSX、TypeScript 等语法，但是最终代码运行的浏览器或者其他 JavaScript 环境不一定全部支持这些写法，因此需要在代码真正运行之前进行一次转换。Babel 官方也把自己的核心定位定义为 JavaScript compiler，主要用于把现代 ECMAScript 代码转换为目标环境能够执行的 JavaScript。[[1]](https://babeljs.io/docs/)

Babel 最基础的能力是**语法转换**。比如开发时使用箭头函数：

如果目标环境不支持箭头函数，Babel 可以通过对应的转换插件生成兼容性更高的普通函数形式。类似的现代 JavaScript 语法，也可以根据目标环境决定是否需要转换。

理解这组机制，可以沿以下主线展开：

先用新语法说明转换目标。

沿 AST 的 Parse、Transform、Generate 解释插件及预设的职责。

再区分语法降级、polyfill、JSX 和 TypeScript 语法处理，并连接构建工具。

Babel 去除 TypeScript 类型语法不等于类型检查；语法转换也不会自动补齐所有 Promise 等运行时 API。相关完整知识可结合 [Babel核心知识点笔记](<../B-Babel核心知识点笔记.md>) 阅读。

## 1. 机制说明与工程判断

建议按照：

**Babel 是什么 → 为什么需要 → 语法转换与 API 兼容 → JSX/TS → AST 工作流程 → Plugin/Preset → preset-env → Babel 与构建工具的边界**

这条逻辑回答。
### 【Babel 的核心定位】

Babel 官方对自己的定义非常直接：

> **Babel is a JavaScript compiler。**

它主要把较新的 JavaScript 代码转换成目标运行环境能够理解的 JavaScript，同时还可以通过第三方 Polyfill 方案补充目标环境缺少的能力。[[1]](https://babeljs.io/docs/)

所以 Babel 最核心解决的是：

```text
开发时希望使用现代 JavaScript
          ↓
目标浏览器 / Node 环境不一定全部支持
          ↓
Babel 根据目标环境进行代码转换
          ↓
输出目标环境可以运行的 JavaScript
```

例如开发时写：

```js
const add = (a, b) => a + b
```

对于不支持箭头函数的目标环境，可以转换成类似：

```js
var add = function (a, b) {
  return a + b
}
```

这就是最典型的**语法转换**。Babel 官方首页也直接用箭头函数到普通函数的转换作为示例。[[1]](https://babeljs.io/docs/)

不过要注意：**现代前端项目并不是一定必须手动使用 Babel。** 如果目标环境本身已经支持所使用的语法，或者 Vite、SWC、esbuild 等工具已经承担了对应转换，就不一定需要额外接入 Babel。Babel 是解决代码转换问题的一种成熟工具链，而不是所有项目必须存在的一层。

---
### 【Babel 最重要的是区分“语法兼容”和“API 兼容”】

这是这一题最容易答混的地方。

第一类是**语法问题**。

例如：

```js
const add = (a, b) => a + b

const name = user?.profile?.name

const result = value ?? 'default'
```

如果目标环境不能识别这些语法，Babel 可以通过对应的 transform plugin 将源码改写为目标环境能够解析、执行的形式。

也就是说：

```text
新语法
↓
Babel 改写代码结构
↓
旧环境能够执行的语法
```

这是 Babel 最典型的工作。

但第二类问题不是“语法”，而是**运行环境根本没有某个 API**。

例如：

```js
new Promise(...)

new Map()

new Set()

Array.from(...)
```

假设某个旧浏览器根本没有：

```js
window.Promise
```

那么单纯把代码：

```js
new Promise(...)
```

换一种写法，并不能凭空让这个浏览器拥有 Promise 的实现。

所以：

```text
语法不认识
→ Transform

环境里没有这个 API
→ Polyfill
```

Babel 官方明确说明，它能够进行 syntax transform；缺少的运行时特性则需要借助 `core-js` 等第三方 Polyfill。[[1]](https://babeljs.io/docs/)

因此面试时不要说：

> Babel 可以把所有新 JavaScript 都转换成旧浏览器支持的代码。

更准确的是：

> **Babel 可以进行语法转换；对于目标环境缺失的内置对象和 API，通常还需要 Polyfill。**

---
### 【Polyfill 和 core-js 是什么关系？】

Polyfill 可以理解为：

> **在运行环境原本没有某项标准能力时，用 JavaScript 提供一份兼容实现。**

比如目标浏览器没有 Promise，就需要给运行环境补充 Promise 实现。

`core-js` 是 JavaScript 生态中常见的标准库 Polyfill 实现，Babel 可以根据目标环境与配置配合相关 Polyfill 工具注入所需要的能力。Babel 的 `preset-env` 会根据目标环境支持情况建立语法转换、浏览器能力以及 `core-js` Polyfill 之间的映射。[[2]](https://babeljs.io/docs/babel-preset-env/)

可以把关系简单理解成：

```text
Babel
→ 判断 / 转换代码

core-js 等 Polyfill
→ 真正提供环境缺失的 API 实现
```

这里还有一个版本细节需要注意：很多旧教程会介绍 Babel 7 中：

```js
useBuiltIns
corejs
```

与 `@babel/preset-env` 配合的方式；当前 Babel 8 官方文档已经说明，这两个 `preset-env` 选项被移除，Polyfill 注入推荐使用专门的 polyfill plugin，例如 `babel-plugin-polyfill-corejs3`。因此理解机制比死背旧配置更重要。[[2]](https://babeljs.io/docs/babel-preset-env/)

---
### 【Babel 还可以处理 JSX 和 TypeScript】

Babel 不只转换 ECMAScript 新语法。

例如 React 中写：

```jsx
const element = <div>Hello</div>
```

浏览器的 JavaScript 引擎不能直接把 JSX 当普通 JavaScript 执行，因此可以通过 `@babel/preset-react` 中的 JSX transform 将其转换成普通 JavaScript 调用。当前 React automatic runtime 下，会转换为对应 `jsx` runtime 调用。[[3]](https://babeljs.io/docs/babel-preset-react/)

TypeScript 也可以：

```ts
const count: number = 10
```

通过：

```text
@babel/preset-typescript
```

处理成：

```js
const count = 10
```

也就是把类型语法去掉。[[4]](https://babeljs.io/docs/babel-preset-typescript/)

但这里必须注意：

> **Babel 可以转换 TypeScript 语法，不等于 Babel 会做 TypeScript 类型检查。**

Babel 官方明确说明，它可以移除 TypeScript 类型标注，但不负责 type checking；真正的类型检查仍需要 TypeScript 等工具完成。[[1]](https://babeljs.io/docs/)

所以：

```text
Babel + TypeScript
→ 可以把 TS 代码转换成 JS

tsc / TypeScript Language Service
→ 负责类型检查
```

两件事情不要混淆。

---
### 【Babel 的基本工作原理：Parse → Transform → Generate】

理解 Babel，核心要理解 AST。

假设源代码：

```js
const add = (a, b) => a + b
```

Babel 并不是简单做字符串替换：

```text
看到 =>
→ 换成 function
```

真正的过程可以抽象为：

```text
源代码
  ↓
Parse
  ↓
AST
  ↓
Transform
  ↓
新的 AST
  ↓
Generate
  ↓
新的 JavaScript 代码
```

首先是 **Parse**。

`@babel/parser` 会把 JavaScript 源码解析成 AST，也就是：

> **Abstract Syntax Tree，抽象语法树。**

Babel 官方 parser 的输出就是 Babel AST。[[5]](https://babeljs.io/docs/babel-parser)

例如：

```js
const age = 18
```

不会再被 Babel 单纯理解成字符串，而会形成类似：

```text
VariableDeclaration
└── VariableDeclarator
    ├── Identifier(age)
    └── NumericLiteral(18)
```

这样的结构化语法树。

然后进入 **Transform**。

Babel 会遍历 AST：

```text
AST
↓
找到目标节点
↓
Plugin 对节点进行处理
↓
替换 / 修改 / 删除 AST 节点
```

`@babel/traverse` 官方文档就展示了对 AST 节点进行遍历和修改的能力。[[6]](https://babeljs.io/docs/babel-traverse)

例如：

```text
ArrowFunctionExpression
```

经过转换插件之后，可能被转换为：

```text
FunctionExpression
```

最后进入 **Generate**。

`@babel/generator` 的职责就是：

> **把 Babel AST 再生成 JavaScript 代码。**

Babel 官方对此直接定义为 “Turns Babel AST into code”。[[7]](https://babeljs.io/docs/babel-generator/)

所以 Babel 最核心的编译过程就是：

```text
源码
→ AST
→ 修改 AST
→ 新源码
```

---
### 【Plugin 和 Preset 是什么？】

Babel 真正完成各种代码转换的核心是 **Plugin**。

例如某个 Plugin 可以负责：

```text
箭头函数转换、JSX 转换、TypeScript 语法转换、某种 Proposal 语法转换
```

Babel 官方说明，代码转换能力是通过配置 Plugin 或 Preset 来启用的。[[8]](https://babeljs.io/docs/plugins/)

因此 Plugin 可以理解成：

> **一个具体的 Babel 转换规则或扩展能力。**

但一个现代项目可能需要几十个转换规则。

如果用户需要自己写：

```json
{
  "plugins": [
    "插件1",
    "插件2",
    "插件3",
    "插件4",
    "插件5"
  ]
}
```

配置会非常复杂。

所以 Babel 提供了 **Preset**。

Preset 本质上就是：

> **一组可以共享和复用的 Babel Plugins 和相关配置的集合。**

这是 Babel 官方对 Preset 的定义。[[9]](https://babeljs.io/docs/presets/)

所以可以记：

```text
Plugin
→ 一个具体转换能力

Preset
→ 一组 Plugin / 配置的集合
```

例如：

```text
@babel/preset-env
→ ECMAScript 环境适配

@babel/preset-react
→ React / JSX

@babel/preset-typescript
→ TypeScript
```

这些都是 Babel 官方提供的 Preset。[[9]](https://babeljs.io/docs/presets/)

---
### 【`@babel/preset-env` 是做什么的？】

`@babel/preset-env` 最重要的作用不是：

> “把所有新语法全部转成 ES5。”

而是：

> **根据你的目标运行环境，决定究竟需要哪些转换。**

例如你的项目只支持最新 Chrome：

```text
Chrome 最新版本
```

很多现代语法本身已经支持，就没有必要全部降级。

但如果要求支持更老的浏览器：

```text
Chrome 旧版本、Safari 旧版本、……
```

需要进行的转换就会增加。

所以：

```text
targets / Browserslist
        ↓
目标浏览器范围
        ↓
preset-env 查询兼容性数据
        ↓
决定需要哪些 Babel transform
```

Babel 官方说明，`preset-env` 会结合 Browserslist、兼容性数据以及目标环境，计算所需要的一组转换插件。[[2]](https://babeljs.io/docs/babel-preset-env/)

例如可以通过 Browserslist 表达：

```text
> 0.25%
not dead
```

然后 Babel 根据这些目标决定哪些语法需要转换。

因此：

> **Babel 不是简单地“越旧越好”，而应该围绕项目真正需要支持的目标环境进行转换。**

这样既保证兼容性，也避免生成大量没有必要的降级代码。

---
### 【Babel 和 Webpack / Vite 的关系】

最后一定要把 Babel 的边界讲清楚。

Babel **不是一个完整的模块打包工具**。

例如项目：

```text
main.js
├── user.js
├── order.js
├── style.css
├── logo.png
└── lodash
```

Webpack 这类构建工具会关心：

```text
入口是什么？、模块之间怎么依赖？、需要生成几个 chunk？、CSS 怎么处理？、图片怎么处理？、资源怎么输出？、如何代码分割？、最终 dist 是什么？
```

而 Babel 更关注：

```text
这一份 JavaScript / JSX / TS 源代码
↓
需要进行什么语法转换
↓
输出什么 JavaScript
```

所以：

```text
Babel
→ 编译 / 转换代码

Webpack
→ 构建模块依赖图、处理各种资源并打包

Vite
→ 提供开发服务器和完整构建工具链
```

Babel 官方也明确建议，在生产项目中通常让 Webpack、Rollup、Parcel 等构建系统集成 Babel，而不是在浏览器里直接运行 Babel。[[10]](https://babeljs.io/docs/babel-standalone/)

它们之间可以形成：

```text
Webpack
    ↓
发现某个 JS 文件
    ↓
交给 Babel 转换
    ↓
得到转换后的 JS
    ↓
Webpack 继续完成依赖分析、打包和输出
```

所以两者不是竞争关系。

更加准确地说：

> **Babel 解决“代码怎么转换”，Webpack/Vite 解决“整个项目怎么开发、组织、构建和输出”。**

## 2. 完整回答与表达组织

Babel 本质上是一个 **JavaScript 编译器和代码转换工具链**。它主要解决的问题是：我们在开发阶段希望使用现代 JavaScript、JSX、TypeScript 等语法，但是最终代码运行的浏览器或者其他 JavaScript 环境不一定全部支持这些写法，因此需要在代码真正运行之前进行一次转换。Babel 官方也把自己的核心定位定义为 JavaScript compiler，主要用于把现代 ECMAScript 代码转换为目标环境能够执行的 JavaScript。[[1]](https://babeljs.io/docs/)

Babel 最基础的能力是**语法转换**。比如开发时使用箭头函数：

```js
const add = (a, b) => a + b
```

如果目标环境不支持箭头函数，Babel 可以通过对应的转换插件生成兼容性更高的普通函数形式。类似的现代 JavaScript 语法，也可以根据目标环境决定是否需要转换。

但是这里需要区分两个不同的兼容性问题：**语法兼容和运行时 API 兼容**。

像箭头函数这类问题属于语法兼容，因为旧浏览器只是无法解析这种代码结构，所以 Babel 可以通过改写语法解决。但是 `Promise`、`Map`、`Set`、`Array.from` 等属于运行时提供的内置对象或 API。如果目标浏览器本身根本没有 `Promise`，简单修改语法无法凭空产生 Promise 实现，因此还需要 Polyfill。Babel 可以根据配置配合 `core-js` 等第三方 Polyfill 方案，为目标环境补充缺失的标准能力。[[1]](https://babeljs.io/docs/)

因此这两个概念一定要分开：

```text
语法不支持
→ Babel Transform

运行环境缺少 API
→ Polyfill
```

除了 ECMAScript 新语法以外，Babel 还可以处理 JSX 和 TypeScript。React 中的 JSX 可以通过 `@babel/preset-react` 转换成普通 JavaScript runtime 调用；TypeScript 可以通过 `@babel/preset-typescript` 去除类型语法并输出 JavaScript。[[3]](https://babeljs.io/docs/babel-preset-react/)

但 Babel 处理 TypeScript 并不代表进行了类型检查。比如：

```ts
const count: number = 10
```

Babel 可以转换成：

```js
const count = 10
```

但不会像 TypeScript 编译器那样完整检查变量类型是否正确。Babel 官方明确说明，它可以移除 TypeScript 类型标注，但类型检查仍需要 TypeScript 等工具完成。[[1]](https://babeljs.io/docs/)

Babel 内部的基本工作流程可以概括成：

```text
Parse
→ Transform
→ Generate
```

首先 Babel Parser 把源代码解析成 AST，也就是抽象语法树。AST 把代码从普通文本转换成结构化的语法节点。然后 Babel 根据配置的 Plugin 遍历和修改 AST，例如把某种新的语法节点转换成兼容性更好的节点。最后 Babel Generator 再根据修改后的 AST 生成新的 JavaScript 源码。Babel 官方分别提供 `@babel/parser`、`@babel/traverse` 和 `@babel/generator` 来完成这些 AST 相关能力。[[5]](https://babeljs.io/docs/babel-parser)

因此 Babel 并不是简单做字符串替换，而更接近：

```text
JavaScript
↓
AST
↓
Plugin 修改 AST
↓
新的 AST
↓
新的 JavaScript
```

Babel 中真正承担具体转换工作的主要是 **Plugin**。一个 Plugin 可以负责一种具体的语法或者代码转换能力，例如 JSX 转换等。[[8]](https://babeljs.io/docs/plugins/)

但是实际项目需要的转换规则很多，如果每个项目都自己维护大量 Plugin，会非常麻烦，所以 Babel 又提供了 **Preset**。Preset 可以理解为一组预先组织好的 Plugins 和配置。Babel 官方目前提供的常见 Preset 包括 `@babel/preset-env`、`@babel/preset-react` 和 `@babel/preset-typescript`。[[9]](https://babeljs.io/docs/presets/)

所以二者关系可以记成：

```text
Plugin
→ 单个具体转换能力

Preset
→ 一组 Plugin / 配置的集合
```

其中非常重要的是 `@babel/preset-env`。它并不是无脑把所有代码都转换成最老的 JavaScript，而是会根据项目配置的目标运行环境，结合 Browserslist 和兼容性数据，判断哪些语法需要转换，然后选择对应的 transform plugins。[[2]](https://babeljs.io/docs/babel-preset-env/)

所以整体关系是：

```text
targets / Browserslist
↓
告诉 Babel 项目需要支持哪些环境
↓
preset-env 判断这些环境支持哪些能力
↓
只选择需要的转换
```

这样可以在兼容性和产物体积之间取得更合理的平衡。

最后还需要区分 **Babel 和 Webpack、Vite**。

Babel 不是完整的打包工具，它主要关注的是：

> **一份源代码应该怎样转换成另一份 JavaScript。**

Webpack 这类工具则需要从项目入口出发处理模块之间的依赖关系，并进一步处理 JavaScript、CSS、图片、字体等资源，最终生成 Bundle、Chunk 和可部署的静态产物。Vite 则进一步提供开发服务器以及生产构建等完整的工程化能力。

因此：

```text
Babel
→ 代码编译与转换

Webpack / Vite
→ 项目级开发和构建体系
```

实际项目中它们可以配合，例如 Webpack 发现一个 JavaScript 模块之后，可以把它交给 Babel 转换，再继续参与后续模块打包。Babel 官方也推荐生产应用通常通过 Webpack、Rollup 等构建系统在构建阶段完成 Babel 转换，而不是在浏览器运行时直接编译。[[10]](https://babeljs.io/docs/babel-standalone/)

所以这一题最终应该形成这样的完整认识：

> **Babel 是 JavaScript 编译转换工具，核心解决现代代码和目标运行环境之间的兼容问题。它通过 Parse → AST → Transform → Generate 的过程修改代码，其中 Plugin 提供具体转换能力，Preset 是一组 Plugin 和配置的集合，`preset-env` 根据 targets/Browserslist 决定真正需要进行哪些转换。语法兼容主要依靠 Babel transform，而 Promise、Map 等运行时 API 缺失需要 Polyfill；Babel 可以处理 JSX、TypeScript 语法，但不负责 TypeScript 类型检查。最后，Babel 解决的是“代码怎么转换”，Webpack、Vite 解决的是“整个项目怎么构建”，两者职责不同但可以组合使用。**

## 3. 参考文献

[1] [What is Babel? · Babel](<https://babeljs.io/docs/>)[EB/OL].

[2] [Babel](<https://babeljs.io/docs/babel-preset-env/>)[EB/OL].

[3] [Babel](<https://babeljs.io/docs/babel-preset-react/>)[EB/OL].

[4] [Babel](<https://babeljs.io/docs/babel-preset-typescript/>)[EB/OL].

[5] [Babel](<https://babeljs.io/docs/babel-parser>)[EB/OL].

[6] [Babel](<https://babeljs.io/docs/babel-traverse>)[EB/OL].

[7] [Babel](<https://babeljs.io/docs/babel-generator/>)[EB/OL].

[8] [Babel](<https://babeljs.io/docs/plugins/>)[EB/OL].

[9] [Babel](<https://babeljs.io/docs/presets/>)[EB/OL].

[10] [Babel](<https://babeljs.io/docs/babel-standalone/>)[EB/OL].
