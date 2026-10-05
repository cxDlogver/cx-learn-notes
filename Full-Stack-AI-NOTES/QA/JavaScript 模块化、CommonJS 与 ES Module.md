# JavaScript 模块化、CommonJS 与 ES Module

## 【知识概述】

**模块化通过作用域、导入导出及显式依赖组织代码；CommonJS 和 ESM 的核心差异在加载语义、绑定关系及静态可分析性。**

JavaScript 模块化本质上是一种**分而治之**的代码组织方式：把一个复杂程序按照职责拆分成多个相对独立的模块，每个模块负责自己的功能，再通过明确的导入和导出把这些模块组合起来。它并不只是把一个大文件拆成很多小文件，真正重要的是建立独立作用域、明确职责边界和显式依赖关系。

模块化主要解决三个问题。第一个是全局变量污染。如果大量变量和函数都定义在全局作用域中，不同文件出现同名变量时可能发生覆盖和冲突。模块化通过模块作用域将内部变量隔离起来，从而减少不同模块之间的变量污染。第二个是依赖混乱。在早期通过多个 `script` 标签组织代码时，如果 B 依赖 A，就必须人工保证 A 先于 B 加载和执行；模块化通过 `require` 或 `import` 显式声明依赖，使“当前代码依赖谁”直接体现在代码中。第三个是数据和实现边界问题。全局变量可以被其他代码任意访问和修改，而模块可以把内部数据隐藏在自己的作用域中，只暴露必要的接口，从而形成更明确的封装边界。

理解这组机制，可以沿以下主线展开：

先从全局污染和隐式脚本顺序引出模块边界。

再解释 CommonJS exports 与 require 的运行时行为。

对比 ESM 的静态声明和 live binding，继续说明构建分析及互操作。

CommonJS 导出对象也能被共享修改，不能笼统说所有导出都是深拷贝；运行时互操作和扩展名规则还取决于环境。相关完整知识可结合 [前端模块化规范](<../Q-前端模块化规范.md>) 阅读。

## 1. 机制说明与工程判断

建议按照这一条主线组织，不需要把知识点拆得过碎：

**模块化是什么、解决什么问题 → 常见模块化方式 → IIFE → CommonJS 的机制 → ESM 的机制 → 第一组区别：导出机制 → 第二组区别：静态与动态加载 → Tree Shaking。**
### 【模块化的本质是分而治之。】

把一个复杂程序按照职责拆成多个相对独立的小模块，每个模块负责自己的功能，通过明确的导入和导出把模块组合起来。模块化不是简单地“把一个大文件切成很多小文件”，关键是建立**独立作用域、明确职责边界和显式依赖关系**。

它主要解决三个问题：

- **全局变量污染**：如果大量变量、函数都放在全局作用域，不同代码可能使用相同变量名，产生覆盖、冲突甚至执行错误。模块通过模块作用域把内部变量隔离起来。
- **依赖混乱**：早期多个 `<script>` 之间通常依靠加载顺序维护依赖，例如 B 使用 A，就必须保证 A 先执行。模块系统通过 `require` 或 `import` 显式声明“当前模块依赖谁”，使依赖关系清晰。
- **数据和实现边界问题**：全局数据可以被其他代码任意访问和修改，而模块可以把内部状态保留在内部，只导出必要的函数和数据，从而形成封装边界。这里的“数据安全”主要是代码层面的封装和访问控制，而不是网络安全意义上的安全机制。

因此模块化最终是为了**降低复杂度，提高代码复用性、可维护性、可测试性和团队协作效率**。模块设计通常追求“高内聚、低耦合”：一个模块内部围绕同一类职责组织，而模块之间通过尽量少且明确的接口交互。
### 【前端中的模块化可以体现在不同层次。】

功能模块化主要解决逻辑复用，例如把 `formatDate`、校验函数、请求封装、Storage 操作提取到 `utils`、`services` 中；组件化主要解决 UI 和交互复用，例如 Button、Table、Dialog、UserCard，组件化可以理解为模块化思想在 UI 层的具体应用；业务模块化则按照业务领域拆分，例如用户、订单、商品、权限、支付模块。大型项目往往同时存在功能、组件、业务、状态等多个层次的模块化，而不是只能选择一种。
### 【正式模块系统出现以前，常见做法之一是 IIFE。】

IIFE 是 Immediately Invoked Function Expression，即立即调用函数表达式。它真正能够减少全局污染的原因，不是“只执行一次”，而是**函数创建了自己的作用域**：

```js
(function () {
  var count = 0

  function add() {
    count++
  }
})()
```

`count` 和 `add` 被限制在函数作用域中，不会直接成为全局变量。MDN 也把“创建新作用域、避免污染全局命名空间”列为 IIFE 的典型用途。[[1]](https://developer.mozilla.org/en-US/docs/Glossary/IIFE)

但 IIFE 只是利用函数作用域模拟模块边界，它没有像 `import/export`、`require/module.exports` 这样的标准导入导出规则，模块之间往往仍需要依赖全局变量、参数传递或者返回对象，因此依赖管理和团队规范仍然不够统一。
### 【CommonJS 是 Node.js 原始的模块格式。】

当前 Node.js 同时支持 CommonJS 和 ECMAScript Modules，所以不宜再说“Node.js 只有 CommonJS”或“CommonJS 永远是 Node.js 唯一默认规范”。Node.js 官方把 CommonJS 描述为其“original way to package JavaScript code”，也就是 Node.js 最早采用的模块体系。[[2]](https://nodejs.org/api/modules.html)

CommonJS 中真正决定当前模块导出内容的是：

```js
module.exports
```

例如：

```js
function add(a, b) {
  return a + b
}

module.exports = {
  add
}
```

导入：

```js
const math = require('./math')
```

`require()` 对 CommonJS 模块返回的就是目标模块导出的内容，也就是它的 `module.exports`。Node.js 官方也将 `require(id)` 的返回值定义为 exported module content。[[2]](https://nodejs.org/api/modules.html)

因此可以：

```js
const math = require('./math')
math.add(1, 2)
```

也可以：

```js
const { add } = require('./math')
```

还可以使用 JavaScript 解构重命名：

```js
const { add: myAdd } = require('./math')
```

`exports` 则只是 `module.exports` 的一个快捷引用。模块开始执行时，可以简化理解为：

```js
exports = module.exports
```

所以：

```js
exports.add = add
```

实际上修改的是两者共同指向的那个对象，因此能够正常导出。

但：

```js
exports = {
  add
}
```

只是让局部变量 `exports` 重新指向另一个对象：

```text
原来：

exports ───────┐
               ↓
              {}
               ↑
module.exports ┘

重新赋值后：

exports → 新对象

module.exports → 原对象
```

而最终真正被 `require()` 使用的是 `module.exports`，所以直接重新赋值 `exports` 不能替代 `module.exports`。这与 Node.js 官方对 `exports` shortcut 的描述完全一致。[[2]](https://nodejs.org/api/modules.html)

CommonJS 还有一个很重要的内部机制：Node.js 在执行模块代码之前，会将它包装成类似：

```js
(function (
  exports,
  require,
  module,
  __filename,
  __dirname
) {
  // 当前模块代码
})
```

因此 CommonJS 文件顶层定义的 `var`、`let`、`const` 不会直接变成全局变量，同时模块内部才可以直接使用 `module`、`exports`、`require`、`__filename`、`__dirname`。这是 Node.js 官方明确说明的 module wrapper 机制。[[2]](https://nodejs.org/api/modules.html)
### 【ES Module 是 ECMAScript 官方定义的 JavaScript 模块标准。】

Node.js 官方将 ECMAScript Modules 描述为“official standard format to package JavaScript code for reuse”，浏览器也原生支持 `import/export`。[[3]](https://nodejs.org/api/esm.html)

ESM 的命名导出可以写成：

```js
export const name = 'Tom'

export function add(a, b) {
  return a + b
}
```

也可以统一导出：

```js
const name = 'Tom'
const age = 18

export {
  name,
  age
}
```

对应的命名导入：

```js
import {
  name,
  age
} from './user.js'
```

命名导入可以重命名：

```js
import {
  name as userName
} from './user.js'
```

默认导出：

```js
export default user
```

对应：

```js
import user from './user.js'
```

默认导入不需要花括号，而且本地名字由导入方决定。

一个模块可以同时拥有默认导出和多个命名导出，例如：

```js
export const name = 'Tom'
export const age = 18

export default user
```

对应：

```js
import user, {
  name,
  age
} from './user.js'
```

还可以：

```js
import * as userModule from './user.js'
```

这里得到的是模块命名空间对象，可以通过：

```js
userModule.name
userModule.age
userModule.default
```

访问对应导出。MDN 官方列出的静态 import 形式就包括 default import、named import 和 namespace import。[[4]](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)
### 【CommonJS 和 ESM 的第一组核心区别，是导出的关系不同。】

这里不建议把 CommonJS 简化成一句“值拷贝”，因为这很容易在对象场景下说错。更准确的官方机制是：

> **CommonJS 的 `require()` 得到目标模块的 `module.exports`；CommonJS 不提供 ESM 那种变量级的 Live Binding。**

例如：

```js
let count = 0

module.exports = {
  count
}

count = 10
```

当执行：

```js
module.exports = {
  count
}
```

时，`module.exports.count` 得到的是当时 `count` 的值 `0`。之后：

```js
count = 10
```

只修改了局部变量 `count`，并没有再次修改：

```js
module.exports.count
```

所以导入方不会自动从 `0` 变成 `10`。

这就是为什么在基本类型场景下，经常口语化地说 CommonJS 得到的是“当时值的快照”。

但是如果导出对象：

```js
const user = {
  name: 'Tom'
}

module.exports = {
  user
}
```

`module.exports.user` 保存的是对象引用：

```text
局部变量 user ───→ 对象 A
                     ↑
module.exports.user ─┘
```

所以：

```js
user.name = 'Jack'
```

修改的是同一个对象 A，导入方自然也能看到：

```text
name = Jack
```

这并不是 Live Binding，而只是因为双方保存的是**同一个对象引用**。

如果：

```js
let user = {
  name: 'Tom'
}

module.exports = {
  user
}

user = {
  name: 'Jack'
}
```

重新赋值之后：

```text
局部 user → 对象 B

module.exports.user → 对象 A
```

导入方仍然拿着对象 A，不会自动跟着局部变量重新绑定。

所以 CommonJS 最准确的总结应该是：

> **它没有把“模块内部原变量”和“导入方”建立持续的变量绑定；`module.exports` 中保存什么，`require()` 就获得什么。基本类型通常表现为当时的值，对象则表现为对象引用。**

ESM 则明确采用 **Live Binding**。MDN 对静态 `import` 的官方定义就是：它导入的是由其他模块导出的 **read-only live bindings**；这些绑定可以被导出模块更新，但不能由导入模块重新赋值。[[4]](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)

例如：

```js
// counter.js

export let count = 0

export function add() {
  count++
}
```

导入：

```js
import {
  count,
  add
} from './counter.js'

console.log(count) // 0

add()

console.log(count) // 1
```

导入方不是在第一次 import 时简单永久复制一个 `0`，而是读取 `counter.js` 中 `count` 这个导出绑定当前对应的值。

对象也一样：

```js
export let user = {
  name: 'Tom'
}
```

如果：

```js
user.name = 'Jack'
```

导入方能看到对象内部属性改变。

如果导出模块执行：

```js
user = {
  name: 'Mike'
}
```

因为 `user` 是一个被导出的 `let` 绑定，导入方后续读取到的也是新的对象。

因此这里最严谨的判断标准不是“基本类型还是引用类型”，而是：

> **ESM 导入的是被导出的绑定，只要导出模块更新这个绑定，导入方读取时就能观察到最新值。**

同时导入方不能：

```js
import { count } from './counter.js'

count = 100
```

因为 imported binding 对导入模块是只读的。
### 【CommonJS 和 ESM 的第二组核心区别，是依赖的确定方式不同。】

CommonJS 的：

```js
require()
```

是运行时调用，因此可以写：

```js
if (condition) {
  const moduleA = require('./a')
} else {
  const moduleB = require('./b')
}
```

也可以：

```js
const path =
  condition ? './a' : './b'

const module = require(path)
```

因此最终加载哪个模块可以根据运行时状态决定：

```text
运行程序
   ↓
判断 condition
   ↓
执行 require()
   ↓
确定真正加载哪个模块
```

所以通常说：

> **CommonJS 的依赖关系更偏运行时确定，`require()` 具有动态调用能力。**

传统 CommonJS 的 `require()` 又是同步接口：

```js
const user = require('./user')

console.log(user)
```

当前执行流程需要先完成模块解析、加载和执行，得到导出结果后，才继续执行下面的 `console.log`。这里说“同步”或者“当前执行流程会等待”比笼统说“它会阻塞所有线程”更加准确。

ESM 的静态 import 则完全不同：

```js
import {
  getUser
} from './user.js'
```

这条语句具有固定的语法结构。MDN 明确说明，`import` 声明被设计得非常严格，只能位于模块顶层，这使模块能够在真正执行之前进行静态分析和链接。[[4]](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)

因此运行代码之前就能知道：

```text
当前模块
   ↓
依赖 ./user.js
   ↓
使用 getUser
```

多个模块进一步组成：

```text
A
├── B
│   └── D
└── C
```

这样的模块依赖图。

这里需要纠正一个常见表述：

> 静态 `import` 要求的是**模块顶层**，不等于必须机械地写在“文件第一行”。

例如：

```js
if (condition) {
  import { user } from './user.js'
}
```

不合法，因为它位于 `if` 块内部；但静态 import 声明本身具有提升行为，MDN 也指出通常把它们集中写在代码顶部主要是为了提高依赖可读性。[[5]](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/import_decl_module_top_level)

ESM 同样支持真正的动态导入：

```js
import('./user.js')
```

它和：

```js
import user from './user.js'
```

不是同一种语法。

静态 import：

```text
import ... from ...
→ 模块顶层
→ 依赖关系提前确定
→ 模块加载阶段处理
```

动态 import：

```text
import(...)
→ 是表达式
→ 可以运行时执行
→ 可以用于条件加载
→ 返回 Promise
```

例如：

```js
if (condition) {
  const module =
    await import('./user.js')
}
```

MDN 明确说明 `import()` 是异步、动态加载 ESM 的语法，并返回一个 Promise，成功时 Promise 的值是模块命名空间对象。[[6]](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)

因此它很适合：

```text
路由懒加载、按需加载、代码分割、某个功能真正使用时再加载
```
### 【ESM 的静态结构也是它更适合 Tree Shaking 的关键原因。】

比如：

```js
// utils.js

export function add() {}

export function minus() {}

export function multiply() {}
```

业务代码只写：

```js
import {
  add
} from './utils.js'
```

因为 ESM 的 `import/export` 能够静态分析，构建工具可以在运行之前知道：

```text
add
→ 被引用

minus
→ 没有被引用

multiply
→ 没有被引用
```

于是生产构建中就有机会移除没有真正使用的导出。webpack 官方将 Tree Shaking 定义为依赖 ES2015 `import/export` 静态结构的 Dead Code Elimination；Rollup 也明确说明它会静态分析导入代码并排除未使用部分。[[7]](https://rollupjs.org/introduction/)

所以完整逻辑是：

```text
ESM 静态 import / export
        ↓
模块依赖可以静态分析
        ↓
建立模块依赖图
        ↓
判断哪些 export 真正被使用
        ↓
构建阶段移除无用代码
        ↓
Tree Shaking
```

## 2. 完整回答与表达组织

JavaScript 模块化本质上是一种**分而治之**的代码组织方式：把一个复杂程序按照职责拆分成多个相对独立的模块，每个模块负责自己的功能，再通过明确的导入和导出把这些模块组合起来。它并不只是把一个大文件拆成很多小文件，真正重要的是建立独立作用域、明确职责边界和显式依赖关系。

模块化主要解决三个问题。第一个是全局变量污染。如果大量变量和函数都定义在全局作用域中，不同文件出现同名变量时可能发生覆盖和冲突。模块化通过模块作用域将内部变量隔离起来，从而减少不同模块之间的变量污染。第二个是依赖混乱。在早期通过多个 `script` 标签组织代码时，如果 B 依赖 A，就必须人工保证 A 先于 B 加载和执行；模块化通过 `require` 或 `import` 显式声明依赖，使“当前代码依赖谁”直接体现在代码中。第三个是数据和实现边界问题。全局变量可以被其他代码任意访问和修改，而模块可以把内部数据隐藏在自己的作用域中，只暴露必要的接口，从而形成更明确的封装边界。

因此模块化最终是为了降低系统复杂度，提高代码复用性、可维护性、可测试性以及团队协作效率。模块设计通常强调高内聚、低耦合：模块内部尽量围绕同一类职责组织，模块之间尽量通过少量、稳定、明确的接口交互。

在前端项目中，模块化又可以体现在不同层次。把日期格式化、请求封装、校验函数等公共逻辑提取到 `utils`、`services` 中，属于功能模块化，主要解决逻辑复用；把 Button、Table、Dialog 等 UI 和交互逻辑封装成 Vue 或 React 组件属于组件化，组件化可以理解为模块化思想在 UI 层的具体应用；按照用户、订单、商品、权限等业务领域进行拆分，则属于业务模块化。实际大型项目通常同时存在这些不同层次的模块。

在正式模块规范出现以前，JavaScript 经常通过 IIFE，也就是立即调用函数表达式，解决一部分作用域隔离问题。IIFE 定义后立即执行，但它能够避免全局变量污染的真正原因是**函数会创建自己的作用域**。函数内部定义的变量不会直接进入全局命名空间。IIFE 因此可以模拟模块的私有变量，但是它没有标准化的导入导出语法，模块之间通常仍依赖全局变量、参数或返回对象传递能力，所以还不能提供完整统一的模块依赖管理。MDN 也将“创建作用域、避免污染全局命名空间”列为 IIFE 的典型用途。[[1]](https://developer.mozilla.org/en-US/docs/Glossary/IIFE)

CommonJS 是 Node.js 最早采用的模块体系之一，当前 Node.js 已经同时支持 CommonJS 和 ECMAScript Modules。CommonJS 中真正控制模块导出内容的是 `module.exports`，而 `require()` 用于加载模块并得到其导出的内容。[[2]](https://nodejs.org/api/modules.html)

例如：

```js
function add(a, b) {
  return a + b
}

module.exports = {
  add
}
```

导入：

```js
const math = require('./math')
```

或者：

```js
const { add } = require('./math')
```

`exports` 只是 `module.exports` 的快捷引用。初始化时可以理解为两者指向同一个对象，所以：

```js
exports.add = add
```

实际上修改的仍然是 `module.exports` 对应的那个对象。但是：

```js
exports = {
  add
}
```

只是让局部变量 `exports` 重新指向另一个对象，并没有替换 `module.exports`，所以不能用这种方式替换最终导出内容。Node.js 官方也明确说明 `exports` 是 `module.exports` 的 shortcut，而重新赋值 `exports` 只会重新绑定这个局部变量。[[2]](https://nodejs.org/api/modules.html)

CommonJS 模块还有一个重要的内部实现：Node.js 在执行模块之前，会把代码包装成类似：

```js
(function (
  exports,
  require,
  module,
  __filename,
  __dirname
) {
  // 模块代码
})
```

因此模块中的顶层变量被限制在当前模块作用域中，而 `module`、`exports`、`require`、`__filename` 和 `__dirname` 则由 Node.js 作为模块包装器参数提供。[[2]](https://nodejs.org/api/modules.html)

ES Module，简称 ESM，是 ECMAScript 官方定义的 JavaScript 模块标准，浏览器原生支持，Node.js 也完整支持。[[3]](https://nodejs.org/api/esm.html) 它主要使用 `export` 和 `import`。

命名导出：

```js
export const name = 'Tom'
export const age = 18
```

对应：

```js
import {
  name,
  age
} from './user.js'
```

可以重命名：

```js
import {
  name as userName
} from './user.js'
```

默认导出：

```js
export default user
```

对应：

```js
import user from './user.js'
```

一个模块可以同时存在默认导出和多个命名导出，还可以：

```js
import * as userModule from './user.js'
```

把模块导出的内容作为模块命名空间对象访问。[[4]](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)

CommonJS 和 ESM 第一组最核心的区别是**导出机制不同**。

这里不应该简单说“CommonJS 就是值拷贝”，更准确地说，CommonJS 的 `require()` 得到的是目标模块的 `module.exports`，它不会像 ESM 一样为局部原变量建立 Live Binding。

例如：

```js
let count = 0

module.exports = {
  count
}

count = 10
```

把 `count` 放入 `module.exports` 时，`module.exports.count` 得到的是当时的基本类型值 `0`。之后重新修改局部变量 `count`，并不会自动修改 `module.exports.count`，所以导入方不会自动同步。

如果导出的是对象：

```js
const user = {
  name: 'Tom'
}

module.exports = {
  user
}
```

`module.exports.user` 保存的是对象引用，因此模块内部：

```js
user.name = 'Jack'
```

修改的是双方共同指向的同一个对象，所以导入方可以看到属性变化。

但是如果模块内部重新执行：

```js
user = {
  name: 'Mike'
}
```

那么只是局部变量 `user` 改成指向另一个对象，原来的 `module.exports.user` 仍然指向旧对象，因此导入方不会自动跟随重新绑定。

所以 CommonJS 应该理解为：

> **`module.exports` 中保存什么，`require()` 就获得什么；它没有 ESM 那种变量级 Live Binding。基本类型通常表现为当时的值，对象则表现为对象引用。**

ESM 则明确采用 Live Binding。MDN 对静态 `import` 的定义就是导入其他模块导出的只读 Live Binding：导出模块可以更新这个绑定，而导入模块不能自己重新赋值。[[4]](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)

例如：

```js
export let count = 0

export function add() {
  count++
}
```

导入：

```js
import {
  count,
  add
} from './counter.js'

console.log(count) // 0

add()

console.log(count) // 1
```

导入方读取的是 `count` 这个导出绑定当前对应的值。

对于对象：

```js
export let user = {
  name: 'Tom'
}
```

修改：

```js
user.name = 'Jack'
```

导入方可以看到对象内容变化；如果导出模块进一步执行：

```js
user = {
  name: 'Mike'
}
```

由于被导出的 `user` 绑定本身重新指向了新对象，导入方之后读取到的也是这个新对象。

因此 ESM 中真正的判断标准不是“基本类型还是引用类型”，而是：

> **导入方持有对导出绑定的 Live Binding，导出模块更新这个绑定后，导入方能够读取到最新值。**

CommonJS 和 ESM 第二组核心区别是**依赖关系的确定方式不同**。

CommonJS 的 `require()` 是运行时调用，所以可以：

```js
if (condition) {
  const a = require('./a')
}
```

甚至：

```js
const path =
  condition ? './a' : './b'

const module = require(path)
```

也就是说最终加载哪个模块可以根据程序运行状态决定，因此 CommonJS 的依赖更偏运行时动态确定。传统 CommonJS 的 `require()` 又是同步接口，当前 JavaScript 执行流程需要先完成模块加载并得到导出结果，才能继续执行后面的代码。

ESM 的静态：

```js
import {
  getUser
} from './user.js'
```

则具有固定的语法结构。静态 `import` 必须出现在模块顶层，不能嵌套到 `if`、函数、循环等运行时结构中。这里的“顶层”并不意味着一定要写在文件第一行，而是不能位于其他语句块内部。MDN 明确指出，这种语法上的严格性使模块可以在执行之前进行静态分析和链接。[[5]](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/import_decl_module_top_level)

因此构建工具可以提前得到：

```text
当前模块
→ 依赖哪些模块
→ 从这些模块使用哪些导出
```

然后进一步建立整个项目的模块依赖图。

ESM 并不是不能动态导入。如果确实需要根据条件、路由或者用户行为按需加载模块，可以使用：

```js
import('./user.js')
```

动态 `import()` 是运行时执行的表达式，可以出现在条件语句或函数中，并且返回 Promise：

```js
const module =
  await import('./user.js')
```

因此：

```text
静态 import
→ 顶层声明
→ 依赖提前确定
→ 适合普通模块依赖

动态 import()
→ 运行时执行
→ 异步并返回 Promise
→ 适合条件加载、路由懒加载、按需加载和代码分割
```

MDN 和 Node.js 官方都明确把 `import()` 描述为异步的动态模块加载机制。[[6]](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)

最后，ESM 的静态结构也是它更适合 Tree Shaking 的原因。因为构建工具在真正执行代码之前就能分析 `import/export`，知道模块导出了哪些内容以及业务代码真正使用了哪些导出，因此可以在生产构建过程中删除没有被使用的代码。webpack 官方明确指出 Tree Shaking 依赖 ES2015 `import/export` 的静态结构，Rollup 也通过静态分析移除未使用内容。[[7]](https://rollupjs.org/introduction/)

所以这一题最终应该形成一条完整的知识链：

**模块化首先通过作用域隔离、显式依赖和接口暴露解决全局污染、依赖混乱和封装问题；IIFE 是正式模块规范之前利用函数作用域实现隔离的早期方式；CommonJS 使用 `module.exports/exports + require()`，Node.js 通过模块包装函数实现模块作用域；ESM 使用 `export/import`，是 JavaScript 官方模块标准。两者最核心的区别，一是 CommonJS 的 `require()` 获得 `module.exports`，没有 ESM 的变量级 Live Binding，而 ESM 导入的是只读的 Live Binding；二是 CommonJS 的 `require()` 可以在运行时动态决定依赖并且传统接口是同步的，而 ESM 的静态 `import/export` 在执行前即可分析和链接，需要运行时动态加载时使用异步的 `import()`。也正因为 ESM 的静态可分析性，它更适合 Tree Shaking。**

## 3. 参考文献

[1] [IIFE - Glossary | MDN](<https://developer.mozilla.org/en-US/docs/Glossary/IIFE>)[EB/OL].

[2] [Modules: CommonJS modules | Node.js v26.7.0 Documentation](<https://nodejs.org/api/modules.html>)[EB/OL].

[3] [Node.js](<https://nodejs.org/api/esm.html>)[EB/OL].

[4] [MDN Web Docs](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import>)[EB/OL].

[5] [MDN Web Docs](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/import_decl_module_top_level>)[EB/OL].

[6] [MDN Web Docs](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import>)[EB/OL].

[7] [Introduction - Rollup.js](<https://rollupjs.org/introduction/>)[EB/OL].
