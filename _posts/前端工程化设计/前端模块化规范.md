# JS模块化详细笔记

## 模块化概述

- 什么是模块化？模块化解决的问题有哪些？
- 没有模块化之前 IIFE是如何实现简易的模块化？
- 模块化规范有哪些？
- CommonJS vs ESM 模块化使用？

### 什么是模块化

将程序文件依据一定规则拆分到多个文件中，这种编码方式就是模块化的编码方式。其核心特点如下：

- 拆分后的每个文件就是一个模块，模块内部的数据默认是私有的，模块之间相互隔离，避免了全局变量污染。

- 模块可以通过特定方式，将内部指定的数据（变量、函数、对象等）暴露出去，供其他模块引用和使用。

补充说明：模块化的本质是“分而治之”，将复杂的程序拆分为多个独立、可维护的小模块，降低开发难度，提升代码复用性和可维护性。

对应问题：模块化编码的核心特点是什么？模块内部的数据默认具有什么特性？

### 为什么需要模块化

随着前端应用复杂度的不断提升，代码量和文件数量会急剧增加，若不使用模块化，会出现以下三个核心问题：

1. **全局污染问题**：所有变量、函数都定义在全局作用域中，容易出现变量名冲突，导致代码报错或功能异常。

2. **依赖混乱问题**：多个文件之间的依赖关系不明确，加载顺序错误会导致代码无法正常运行，后期维护时难以梳理依赖。

3. **数据安全问题**：全局作用域中的数据可被任意修改，无法保证数据的安全性和完整性。

对应问题：不使用模块化会引发哪些核心问题？请简要说明每个问题的影响。

## IIFE

在模块化规范出现之前，前端开发处于“无模块”的混乱状态，核心痛点是全局变量污染和数据隔离不足——多个脚本文件的变量、函数共享全局作用域，变量名重复会导致代码报错，全局数据也可被任意修改，无法保证安全。为解决这些问题，前端开发者常用IIFE（立即执行函数表达式）实现简单模块化，这是模块化思想的早期实践。

### IIFE核心原理与语法

在 JavaScript 模块化机制尚未完善之前，**立即执行函数**是一种常用的封装手段，用来避免变量污染全局作用域。其核心思想是：**创建一个只执行一次的私有作用域，把变量和方法包裹在里面**。

```
(function () {})();
```

立即执行函数（Immediately Invoked Function Expression，IIFE）本质上是一个**函数表达式**。通过外层括号将函数声明转换为表达式后，紧随其后的 `()` 会使其在定义后立刻执行。由于它是表达式，因此**可以有返回值**，并将结果赋给变量。

```js
var Counter = (function () {
  let count = 0;
  return {
    increment() {
      count++;
      console.log(count);
    },
    reset() {
      count = 0;
      console.log("reset");
    }
  };
})();
```

在这段代码中，IIFE 只执行一次，创建了一个私有作用域，变量 `count` 只存在于该作用域内部。函数执行完成后返回一个对象，并赋值给 `Counter`。从外部只能通过 `increment` 和 `reset` 这两个方法操作 `count`，而无法直接访问或修改它，从而实现了**模块化封装**。

基础语法（两种常用写法，效果一致）：

```javascript
// 写法1：括号包裹函数表达式，末尾加执行括号
(function() {
  // 模块内部私有逻辑
})();

// 写法2：函数前加void，避免语法冲突（推荐简洁写法）
void function() {
  // 模块内部私有逻辑
}();
```

### 实例1：基础封装（解决全局污染）

假设页面中需要两个统计功能（用户数、商品数），不使用IIFE会出现全局变量冲突，用IIFE封装如下：

```javascript
// 统计用户数的IIFE模块（私有变量不污染全局）
(function() {
  // 私有变量：仅模块内部可访问，全局无法直接修改
  let userCount = 100;
  // 私有函数：内部逻辑封装
  function addUser() {
    userCount++;
  }
  // 暴露接口：通过window挂载，供全局调用
  window.userModule = {
    getCount: function() {
      return userCount; // 仅暴露获取方法，不暴露私有变量
    },
    addUser: addUser
  };
})();

// 统计商品数的IIFE模块（与用户模块隔离，无变量冲突）
(function() {
  // 同名变量userCount，但属于不同作用域，互不影响
  let userCount = 50;
  function addGoods() {
    userCount++;
  }
  window.goodsModule = {
    getCount: function() {
      return userCount;
    },
    addGoods: addGoods
  };
})();
```

解析：两个IIFE模块都有同名变量`userCount`，但因各自拥有独立作用域，不会出现全局冲突；且私有变量无法直接修改，只能通过暴露的接口操作，保证了数据安全。

### 实例2：IIFE模块间通信

若两个IIFE模块需要相互调用，可通过全局挂载的接口实现简单通信，示例如下：

```javascript
// 工具类IIFE模块：提供格式化时间的功能
(function() {
  function formatTime(time) {
    return new Date(time).toLocaleString(); // 私有工具函数
  }
  // 暴露接口到全局
  window.toolModule = { formatTime };
})();

// 用户信息IIFE模块：依赖工具模块的格式化功能
(function() {
  let user = {
    name: "张三",
    registerTime: 1740000000000 // 时间戳
  };
  // 调用工具模块的接口（通过全局window访问）
  function getRegisterTime() {
    return toolModule.formatTime(user.registerTime);
  }
  // 暴露用户相关接口
  window.userModule = {
    getName: () => user.name,
    getRegisterTime
  };
})();

// 全局调用测试
console.log(userModule.getName()); // 输出：张三
console.log(userModule.getRegisterTime()); // 输出：对应格式化时间
```

### IIFE的局限性

从上述实例能看出，IIFE虽解决了全局污染和基础隔离问题，但存在明显不足：一是模块依赖关系不明确（如用户模块依赖工具模块，需确保工具模块先加载）；二是无规范的导入/导出机制，只能通过全局挂载接口通信，模块越多，全局挂载的对象越多，仍会造成全局混乱；三是复用性差，无法灵活引入模块。这些局限性，推动了后续CommonJS、AMD等标准化模块化规范的出现，为前端模块化发展奠定了基础。

## 模块化规范

历史背景：2009年，Node.js的出现推动了JavaScript在服务器端的应用，为了提升Node.js代码的可维护性，来自Mozilla的工程师Kevin Dangoor提出了CommonJS规范（初期名为ServerJS），随后被Node.js社区采纳。随着JavaScript的发展，针对不同运行环境（服务器端、浏览器端），相继出现了多种模块化规范，按时间先后顺序如下：

- **CommonJS**：主要用于服务器端（Node.js），应用广泛，是Node.js默认支持的模块化规范。

- **AMD**：主要用于浏览器端，解决浏览器端模块加载的异步问题，需依赖第三方库（如require.js）。

- **CMD**：同样用于浏览器端，强调“按需加载”，需依赖第三方库（如sea.js），语法更贴近CommonJS。

- **ES6模块化**：ECMAScript官方推出的模块化规范，是目前最流行的规范，浏览器和服务器端（Node.js 14.13+）均原生支持。

对应问题：四种模块化规范中，哪些用于浏览器端、哪些用于服务器端？ES6模块化的优势是什么？

## 导入与导出的概念

模块化的核心思想是“模块隔离，按需共享”，模块之间不能直接访问彼此的私有数据，必须通过“导入”和“导出”实现数据和功能的共享。

- **导出（暴露）**：模块将内部的变量、函数、对象等公开出去，允许其他模块引用这些内容。导出的内容是模块对外提供的“接口”。

- **导入（引入）**：模块通过特定语法，引用其他模块导出的内容，从而实现代码复用，避免重复开发。

补充说明：导入和导出是模块化的核心操作，不同模块化规范的导入、导出语法不同，但核心逻辑一致。

对应问题：导入和导出的核心作用是什么？二者的关系是什么？

## CommonJS规范

### 初步体验

CommonJS规范主要用于Node.js环境，以下通过三个示例文件，演示CommonJS的基本使用：

1. 创建school.js（模块文件，定义并导出数据）

```javascript
const name = '尚硅谷'
const slogan = '让天下没有难学的技术！'

function getTel (){
  return '010-56253825'
}

function getCities(){
  return ['北京','上海','深圳','成都','武汉','西安']
}

// 通过给exports对象添加属性的方式，导出数据（未导出getCities）
exports.name = name
exports.slogan = slogan
exports.getTel = getTel
```

2. 创建student.js（模块文件，定义并导出数据）

```javascript
const name = '张三'
const motto = '相信明天会更好！'

function getTel (){
  return '13877889900'
}

function getHobby(){
  return ['抽烟','喝酒','烫头']
}

// 导出数据（未导出getHobby）
exports.name = name
exports.motto = motto
exports.getTel = getTel
```

3. 创建index.js（入口文件，导入并使用模块）

```javascript
// 引入school模块暴露的所有内容，返回一个包含导出内容的对象
const school = require('./school')

// 引入student模块暴露的所有内容
const student = require('./student')

// 使用导入的内容
console.log(school.name) // 输出：尚硅谷
console.log(student.getTel()) // 输出：13877889900
```

对应问题：上述示例中，student.js未导出getHobby函数，在index.js中能否访问到getHobby？为什么？

### 导出数据

CommonJS规范中，导出数据有两种核心方式，且有明确的注意事项：

#### 两种导出方式

1. **方式一：module.exports = value**：直接将一个值（变量、函数、对象）作为模块的导出内容，可导出单个值或多个值（通过对象包裹）。

```JavaScript

  // 导出单个函数
module.exports = function getTel() {
  return '010-56253825'
}

// 导出多个值（对象形式）
module.exports = {
  name: '尚硅谷',
  slogan: '让天下没有难学的技术！',
  getTel: function() {
    return '010-56253825'
  }
}
```

1. **方式二：exports.name = value**：通过给exports对象添加属性，逐步导出多个数据，本质是对module.exports的引用。

```JavaScript

exports.name = '尚硅谷'
exports.slogan = '让天下没有难学的技术！'
exports.getTel = function() {
  return '010-56253825'
}
```

#### 关键注意点

- 每个模块内部，`this`、`exports`、`module.exports`初始时指向同一个空对象，这个空对象就是模块默认的导出内容。

- 无论使用哪种导出方式，最终模块导出的都是`module.exports`的值，`exports`只是`module.exports`的“快捷方式”，方便添加属性。

- 不能使用`exports = value`的形式导出数据（会切断exports与module.exports的引用关系，导出失效），但可以使用`module.exports = value`。

对应问题：为什么不能用`exports = value`导出数据？`exports`和`module.exports`的关系是什么？

### 导入数据

CommonJS规范中，使用内置的`require()`函数导入模块，`require()`的返回值就是模块导出的内容（即`module.exports`的值），主要有三种导入方式：

```javascript
// 1. 直接引入模块，获取模块导出的所有内容（返回一个对象）
const school = require('./school')

// 2. 引入同时解构出需要的数据（推荐，按需导入）
const { name, slogan, getTel } = require('./school')

// 3. 引入同时解构+重命名（解决变量名冲突）
const { name: stuName, motto, getTel: stuTel } = require('./student')

// 使用导入的内容
console.log(stuName) // 张三（重命名后的变量）
console.log(getTel()) // 010-56253825
```

补充说明：`require()`的参数是模块的路径，若导入的是自定义模块，需写相对路径（如`./school`），可省略`.js`后缀；若导入的是Node.js内置模块（如fs、path），直接写模块名即可（如`require('fs')`）。

对应问题：`require()`的返回值是什么？导入自定义模块和Node.js内置模块时，路径写法有什么区别？

### 扩展理解

CommonJS模块在执行时，会被自动包裹在一个内置函数中，这个函数会创建模块的独立作用域，因此模块内部的变量、函数不会污染全局作用域。

可通过以下代码验证这一特性：

```javascript
// 在任意CommonJS模块中执行以下代码
console.log(arguments) // 输出内置函数的参数
console.log(arguments.callee.toString()) // 输出内置函数的完整代码
```

内置函数的大致形式如下（可帮助理解模块的作用域）：

```javascript
function (exports, require, module, __filename, __dirname) {
  // 模块内部的代码（如变量、函数定义）
  // 这里的exports、require、module就是模块内部可直接使用的对象
}
```

参数说明：

- `exports`：用于导出数据的对象（与module.exports初始指向同一对象）。

- `require`：用于导入模块的函数。

- `module`：代表当前模块本身，`module.exports`是模块的导出接口。

- `__filename`：当前模块的完整文件路径（如D:\project\school.js）。

- `__dirname`：当前模块所在文件夹的完整路径（如D:\project）。

对应问题：CommonJS模块为什么不会污染全局作用域？内置函数的作用是什么？

### 浏览器端运行

Node.js默认支持CommonJS规范，但浏览器端原生不支持，若要在浏览器端运行CommonJS模块，需通过第三方工具（如browserify）编译，步骤如下：

1. **第一步：全局安装browserify**（需先安装Node.js）
        `npm i browserify -g`

2. **第二步：编译模块**，将入口文件（如index.js）编译为浏览器可识别的代码
        `browserify index.js -o build.js`说明：`index.js`是源入口文件，`build.js`是编译后的目标文件（可自定义文件名）。

3. **第三步：在页面中引入编译后的文件**`<script type="text/javascript" src="./build.js"></script>`

对应问题：浏览器端为什么不能直接运行CommonJS模块？编译的作用是什么？

## ES6模块化规范

ES6模块化规范是ECMAScript官方推出的标准模块化规范，解决了CommonJS、AMD、CMD规范的不足，具有语法简洁、原生支持、浏览器和服务器端通用等优势，是目前最主流的模块化规范。

### 初步体验

ES6模块化可在浏览器端和Node.js端使用，以下通过示例演示其基本用法：

1. 创建school.js（模块文件，定义并导出数据）

```javascript
// 分别导出变量和函数
export let name = { str: '尚硅谷' }
export const slogan = '让天下没有难学的技术！'
export function getTel () {
  return '010-56253825'
}

// 未导出的函数（私有函数）
function getCities() {
  return ['北京','上海','深圳','成都','武汉','西安']
}
```

2. 创建student.js（模块文件，定义并导出数据）

```javascript
export const name = '张三'
export const motto = '相信明天会更好！'
export function getTel () {
  return '13877889900'
}

// 未导出的函数（私有函数）
function getHobby() {
  return ['抽烟','喝酒','烫头']
}
```

3. 创建index.js（入口文件，导入并使用模块）

```javascript
// 导入school模块的所有内容，用school对象接收
import * as school from './school.js'

// 导入student模块的所有内容，用student对象接收
import * as student from './student.js'

// 使用导入的内容
console.log(school.name.str) // 输出：尚硅谷
console.log(student.getTel()) // 输出：13877889900
```

4. 浏览器端引入index.js（需添加`type="module"`属性）

```html
<script type="module" src="./index.js"></script>
```

对应问题：浏览器端引入ES6模块时，为什么要添加`type="module"`属性？

### Node.js中运行ES6模块

Node.js 14.13.0及以上版本支持ES6模块化，无需第三方工具，有两种启用方式：

1. **方式一：修改文件后缀**：将JavaScript文件的后缀从`.js`改为`.mjs`，Node.js会自动识别为ES6模块。
        `node index.mjs // 运行ES6模块`

2. **方式二：配置package.json**：在项目根目录的`package.json`中添加`"type": "module"`，此时所有`.js`文件都会被识别为ES6模块。
        `{
    "type": "module"
    }`配置后，直接运行`node index.js`即可执行ES6模块。

补充说明：若需要在ES6模块中导入CommonJS模块，可直接使用`import`语法；若在CommonJS模块中导入ES6模块，需将ES6模块后缀改为`.mjs`，或使用动态导入。

对应问题：Node.js中启用ES6模块化有哪两种方式？两种方式的区别是什么？

### 导出数据

ES6模块化提供3种导出方式，可单独使用，也可混合使用，灵活度更高：

#### 1. 分别导出（命名导出）

在定义变量、函数、对象时，直接添加`export`关键字，每次导出一个内容，可多次使用。

```javascript
// 导出变量
export const name = '尚硅谷'
export let age = 10

// 导出函数
export function getTel() {
  return '010-56253825'
}

// 导出对象
export const slogan = { text: '让天下没有难学的技术！' }
```

#### 2. 统一导出（命名导出）

先定义变量、函数、对象，再通过`export { 内容1, 内容2, ... }`的形式，一次性导出多个内容，适合批量导出。

```javascript
// 先定义所有内容
const name = '尚硅谷'
const slogan = '让天下没有难学的技术！'
function getTel() {
  return '010-56253825'
}
function getCities() {
  return ['北京','上海','深圳']
}

// 统一导出指定内容（可选择性导出）
export { name, slogan, getTel }
```

补充：统一导出时可给内容重命名，语法为`export { 原名称 as 新名称 }`，避免导出名称冲突。

```javascript
export { name as schoolName, slogan, getTel as getSchoolTel }
```

#### 3. 默认导出

使用`export default`导出一个“默认内容”，每个模块只能有一个默认导出，适合导出单个核心内容（如一个类、一个核心函数）。

```javascript
// 方式1：导出单个值
export default '尚硅谷'

// 方式2：导出函数
export default function getTel() {
  return '010-56253825'
}

// 方式3：导出对象（包含多个内容）
const student = {
  name: '张三',
  motto: '相信明天会更好！',
  getTel: function() {
    return '13877889900'
  }
}
export default student
```

#### 4. 混合导出

分别导出、统一导出、默认导出可同时使用，满足复杂场景的导出需求。

```javascript
// 分别导出
export const name = '尚硅谷'

// 定义内容
const slogan = '让天下没有难学的技术！'
function getTel() {
  return '010-56253825'
}

// 统一导出
export { slogan }

// 默认导出
export default getTel
```

对应问题：ES6模块化的三种导出方式分别是什么？每个模块最多能有几个默认导出？

### 导入数据

ES6模块化的导入方式与导出方式一一对应，不同的导出方式，需使用对应的导入语法，主要分为以下6种：

#### 1. 导入全部（通用）

使用`import * as 模块名 from '模块路径'`，将模块中所有导出的内容（命名导出+默认导出）整合到一个对象中，适合需要使用模块中多个内容的场景。

```javascript
// 导入school模块的所有内容，用school对象接收
import * as school from './school.js'

// 使用命名导出的内容
console.log(school.name)
console.log(school.getTel())

// 使用默认导出的内容（默认导出的内容会存放在对象的default属性中）
console.log(school.default)
```

#### 2. 命名导入（对应分别导出、统一导出）

使用`import { 内容1, 内容2, ... } from '模块路径'`，按需导入模块中命名导出的内容，导入的名称必须与导出的名称一致（大小写敏感）。

```javascript
// 导出模块（school.js）
export const name = '尚硅谷'
export const slogan = '让天下没有难学的技术！'
export function getTel() {
  return '010-56253825'
}

// 命名导入
import { name, slogan, getTel } from './school.js'

// 使用导入的内容
console.log(name)
console.log(getTel())
```

补充：命名导入时可重命名，语法为`import { 原名称 as 新名称 } from '模块路径'`，解决名称冲突。

```javascript
import { name as schoolName, getTel as schoolTel } from './school.js'
```

#### 3. 默认导入（对应默认导出）

使用`import 自定义名称 from '模块路径'`，导入模块的默认导出内容，自定义名称可任意命名（无需与导出时的名称一致）。

```javascript
// 导出模块（student.js）
export default {
  name: '张三',
  motto: '相信明天会更好！',
  getTel: function() {
    return '13877889900'
  }
}

// 默认导入（自定义名称为student）
import student from './student.js'

// 使用导入的内容
console.log(student.name)
console.log(student.getTel())
```

#### 4. 混合导入（命名导入+默认导入）

若模块同时有命名导出和默认导出，可在一次导入中同时获取两种内容，注意默认导入必须放在前面。

```javascript
// 导出模块（school.js）
export const name = '尚硅谷' // 命名导出
export const slogan = '让天下没有难学的技术！' // 命名导出
export default function getTel() { // 默认导出
  return '010-56253825'
}

// 混合导入（默认导入在前，命名导入在后）
import getTel, { name, slogan } from './school.js'

// 使用内容
console.log(name)
console.log(getTel())
```

#### 5. 动态导入（通用）

使用`import('模块路径')`，在运行时按需加载模块，返回一个Promise对象，适合需要条件加载、延迟加载的场景（如点击按钮后加载模块）。

```javascript
// 动态导入（async/await语法，更简洁）
async function loadModule() {
  const school = await import('./school.js')
  console.log(school.name)
  console.log(school.default())
}

// 调用函数，加载模块
loadModule()

// 普通Promise语法
import('./student.js').then(student => {
  console.log(student.name)
})
```

#### 6. 无接收导入

使用`import '模块路径'`，仅加载模块，不接收任何导出内容，适合模块只需执行自身代码（如初始化、注册全局方法）的场景。

```javascript
// 导入mock.js，仅执行其内部代码（如模拟数据、注册全局方法）
import './mock.js'
```

对应问题：动态导入的返回值是什么？混合导入时，默认导入和命名导入的顺序有什么要求？

### 数据引用问题

ES6模块化与CommonJS模块化在数据引用上有本质区别，通过三个思考题目，理解两者的差异：

#### 思考1：普通函数中的数据引用

```javascript
function count (){
  let sum = 1
  function increment(){
    sum += 1
  }
  return {sum,increment}
}

const {sum,increment} = count()

console.log(sum) // 输出：1
increment() 
increment()
console.log(sum) // 输出：1
```

解析：函数count返回的是一个对象，对象中的sum是当前sum的值（1）的副本，increment函数修改的是函数内部的sum（私有变量），不会影响返回的sum副本，因此两次输出都是1。

#### 思考2：CommonJS模块中的数据引用

count.js（导出模块）

```javascript
let sum = 1

function increment (){
  sum += 1
}

module.exports = {sum,increment}
```

index.js（导入模块）

```javascript
const {sum,increment} = require('./count.js')

console.log(sum) // 输出：1
increment()
increment()
console.log(sum) // 输出：1
```

解析：CommonJS模块导出的是`module.exports`对象的副本，导入时解构得到的sum是导出时sum的值（1）的副本，increment函数修改的是模块内部的sum（私有变量），不会影响导入的sum副本，因此两次输出都是1。

#### 思考3：ES6模块中的数据引用

count.js（导出模块）

```javascript
let sum = 1

function increment(){
  sum += 1
}

export {sum,increment}
```

index.js（导入模块）

```javascript
import {sum,increment} from './count.js'

console.log(sum) // 输出：1
increment()
increment()
console.log(sum) // 输出：3
```

解析：ES6模块的导入是“活引用”，导入的sum不是副本，而是直接引用模块内部的sum变量，因此increment函数修改模块内部的sum后，导入的sum值也会同步变化，最终输出3。

注意原则：导出的常量，务必用`const`定义，避免因模块内部修改导致外部引用的值意外变化，保证数据的稳定性。

对应问题：ES6模块和CommonJS模块在数据引用上的核心区别是什么？为什么ES6模块导入的是“活引用”？

## AMD模块化规范（了解）

AMD（Asynchronous Module Definition，异步模块定义）是专门为浏览器端设计的模块化规范，核心解决浏览器端模块加载的异步问题（避免因加载模块阻塞页面渲染），需依赖第三方库`require.js`实现。

### 环境准备

1. **第一步：准备文件结构**

    - js文件夹：存放业务模块（如school.js、student.js、main.js），main.js为入口文件，用于汇总所有模块。

    - libs文件夹：存放第三方库（如require.js）。

    - index.html：页面文件，引入require.js和入口文件。

2. **第二步：引入require.js和入口文件**`<script data-main="./js/main.js" src="./libs/require.js"></script>`说明：`data-main`属性指定入口文件（main.js），require.js会自动加载该文件。

3. **第三步：配置模块（main.js）**在入口文件中，通过`requirejs.config()`配置模块路径，注册所有业务模块。

```JavaScript

// AMD模块化入口文件，固定配置格式
requirejs.config({
  // 基本路径（所有模块的基准路径，简化后续路径写法）
  baseUrl: "./js",
  
  // 模块标识名与模块路径的映射（标识名可自定义，路径相对于baseUrl）
  paths: {
    school: "school", // 标识名school对应js/school.js
    student: "student", // 标识名student对应js/student.js
    welcome: "welcome" // 标识名welcome对应js/welcome.js
  }
})
```

### 导出数据

AMD规范使用`define()`函数定义模块并导出数据，若模块无依赖，只需传入一个回调函数，回调函数的返回值即为模块导出的内容。

```javascript
// student.js（无依赖模块）
define(function(){
  const name = '张三'
  const motto = '走自己的路，让别人无路可走！'

  function getTel (){
    return '13877889900'
  }

  function getHobby(){
    return ['抽烟','喝酒','烫头']
  }

  // 导出数据（回调函数返回的对象即为导出内容）
  return {name, motto, getTel}
})
```

### 导入数据

若模块依赖其他模块，需给`define()`传入两个参数：第一个参数是依赖模块的标识名数组，第二个参数是回调函数（参数为依赖模块导出的内容）。

```javascript
// school.js（依赖welcome模块）
// ['welcome']：当前模块依赖的模块标识名数组
// welcome：回调函数参数，对应welcome模块导出的内容
define(['welcome'], function(welcome){
  let name = {str: '尚硅谷'}
  const slogan = '让天下没有难学的技术！' + welcome

  function getTel (){
    return '010-56253825'
  }

  function getCities(){
    return ['北京','上海','深圳','成都','武汉','西安']
  }

  // 导出数据
  return {name, slogan, getTel}
})
```

### 使用模块

在入口文件（main.js）中，通过`requirejs()`函数加载并使用模块，参数与`define()`类似：依赖模块数组和回调函数。

```javascript
// main.js（入口文件，加载并使用school和student模块）
requirejs(['school', 'student'], function(school, student){
  // 使用导入的模块内容
  console.log('学校信息：', school)
  console.log('学生信息：', student)
})
```

对应问题：AMD规范的核心优势是什么？依赖模块时，define()函数的两个参数分别是什么作用？

## CMD模块化规范（了解）

CMD（Common Module Definition，通用模块定义）也是为浏览器端设计的模块化规范，由国内开发者推出，核心特点是“按需加载”（在需要使用模块时才加载，而非一开始就加载所有依赖），需依赖第三方库`sea.js`实现。

### 环境准备

1. **第一步：准备文件结构**

    - js（或modules）文件夹：存放业务模块（如school.js、student.js、main.js），main.js为入口文件。

    - libs文件夹：存放第三方库（如sea.js）。

    - index.html：页面文件，引入sea.js并加载入口文件。

2. **第二步：引入sea.js并加载入口文件**

```JavaScript

<script type="text/javascript" src="./libs/sea.js"></script>
<script type="text/javascript">
  // 加载入口文件main.js
  seajs.use('./modules/main.js')
</script>
```

### 导出数据

CMD规范同样使用`define()`函数定义模块，回调函数会接收三个参数：`require`（导入模块的函数）、`exports`（导出数据的对象）、`module`（模块本身），通过`module.exports`或`exports`导出数据。

```javascript
// school.js（CMD模块）
define(function(require, exports, module){
  const name = '尚硅谷'
  const slogan = '让天下没有难学的技术！'

  function getTel (){
    return '010-56253825'
  }

  function getCities(){
    return ['北京','上海','深圳','成都','武汉','西安']
  }

  // 方式1：通过module.exports导出（推荐）
  module.exports = {name, slogan, getTel}

  // 方式2：通过exports添加属性导出
  // exports.name = name
  // exports.slogan = slogan
})
```

### 导入数据

CMD规范中，通过`require()`函数（回调函数的第一个参数）导入模块，可在需要使用模块的地方调用`require()`，实现“按需加载”。

```javascript
// student.js（依赖welcome模块，按需加载）
define(function(require, exports, module){
  const name = '张三'
  const motto = '相信明天会更好！'

  // 按需加载：在需要使用welcome模块时才导入
  const welcome = require('./welcome')
  console.log('欢迎语：', welcome)
  
  function getTel (){
    return '13877889900'
  }

  function getHobby(){
    return ['抽烟','喝酒','烫头']
  }

  // 导出数据
  exports.name = name
  exports.motto = motto
  exports.getTel = getTel
})
```

### 使用模块

在入口文件（main.js）中，通过`define()`函数导入并使用所需模块，同样遵循“按需加载”原则。

```javascript
// main.js（入口文件）
define(function(require){
  // 按需加载school和student模块
  const school = require('./school')
  const student = require('./student')

  // 使用模块内容
  console.log('学校信息：', school)
  console.log('学生信息：', student)
})
```

补充：CMD与AMD的区别：AMD强调“提前加载”（一开始就加载所有依赖），CMD强调“按需加载”（使用时才加载依赖）；CMD语法更贴近CommonJS，使用更灵活。

对应问题：CMD规范的核心特点是什么？CMD与AMD在加载依赖的方式上有什么区别？

## 模块化规范对比

- **CommonJS**：服务器端为主，同步加载，Node.js默认支持，导出`module.exports`的副本。

- **AMD**：浏览器端为主，异步加载，依赖require.js，提前加载所有依赖。

- **CMD**：浏览器端为主，异步加载，依赖sea.js，按需加载依赖，语法贴近CommonJS。

- **ES6模块化**：通用（浏览器+服务器端），原生支持，异步加载，导入为活引用，语法简洁，是目前主流规范。

- **UMD：** 可同时满足CommonJS， AMD， CMD标准的实现。

对应问题：模块化规范中，哪一种是目前最主流的？其核心优势是什么？

## CommonJS与ES Module（ESM）核心差异详细笔记

CommonJS与ES Module（简称ESM）是JavaScript中最常用的两种模块化规范，前者主要用于Node.js服务器端，后者是ECMAScript官方标准规范，支持浏览器和服务器端通用。两者的核心差异集中在导出机制、加载方式、解析时机三个维度，以下结合精准定义、实操示例及细节补充，全面详解两者差异。

### 核心定义详解（最正确且可解释）

模块化规范的核心是“导出”与“导入”的机制，CommonJS与ESM的本质差异，首先体现在导出内容的本质不同，这也是后续所有差异的根源。

#### CommonJS 定义

CommonJS 导出的是“导出对象的快照式结果”，常被通俗表述为“值拷贝”，但需明确其精确含义：

CommonJS模块对外暴露的核心是`module.exports`对象（或其引用），`require()`函数执行时，会获取“当下执行完成后，`module.exports`对象中已有的所有属性值”，并将这些值返回给导入方。

关键细节：导入方若使用解构语法（如`const { counter } = require('./lib')`），本质是将`module.exports.counter`此时的值读取出来，赋值给导入方的本地变量。后续即使模块内部修改了`module.exports.counter`对应的原始变量，导入方的本地变量也不会自动同步变化——因为导入时拿到的是“快照值”，而非动态关联。

重要补充（易混淆点）：CommonJS并非“永远是值拷贝”。若导出的是对象、数组、函数等引用类型，导入方拿到的是该引用类型的“引用地址”，此时修改引用类型的内部属性/方法，模块内部和导入方会看到相同的变化。这也是很多开发者误解“CommonJS是否是值拷贝”的核心原因，本质是“基本类型值拷贝，引用类型引用共享”。

对应问题：CommonJS导出的“快照式结果”具体指什么？为什么说“CommonJS并非永远是值拷贝”？

#### ES Module（ESM）定义

ESM 导出的是“live binding（活绑定）”，而非简单的“值”或“引用”，其精确含义如下：

ESM中，`import { counter } from './lib.js'`的操作，不是将模块中的`counter`值复制到导入方的本地变量，而是在导入方与导出模块之间，建立一种“动态绑定关系”。

关键细节：导入方的`counter`是一个“只读视图（read-only view）”，它直接指向导出模块中`counter`的绑定。只要导出模块内部修改了`counter`的绑定值（如`counter++`），导入方读取到的就是最新值——因为两者共享同一个绑定，而非拷贝值。

通俗理解：ESM可看作“导出模块维护一个状态，导入模块拿到的是这个状态的实时读取通道”，通道本身不可修改，但通道指向的状态会随导出模块的修改而同步更新。

对应问题：ESM的“live binding（活绑定）”是什么意思？导入方的变量为什么是“只读视图”？

### 用代码讲透ESM的“活绑定”

通过实操示例，结合原理拆解，彻底理解ESM活绑定的本质，明确“为什么导入方能实时获取导出模块的最新值”。

示例代码（两个文件，可直接运行，Node.js需启用ESM环境）：

1. 导出模块（lib.js）：定义变量和修改变量的函数，通过具名导出暴露

```javascript
// lib.js（ESM模块，需配置package.json "type": "module" 或后缀改为.mjs）
export let counter = 3; // 导出的是“绑定名counter”，而非值3
export function incCounter() {
  counter++; // 修改的是导出模块内部的counter绑定
}
```

2. 导入模块（main.js）：导入变量和函数，观察值的变化

```javascript
// main.js（ESM模块）
import { counter, incCounter } from './lib.js';

console.log(counter); // 输出：3（初始绑定值）
incCounter(); // 调用函数，修改导出模块内部的counter绑定
console.log(counter); // 输出：4（实时读取最新绑定值）
```

原理拆解：

1. `export let counter = 3`：这里导出的不是“值3”，而是“绑定名counter”——即模块内部维护一个名为`counter`的变量，同时对外暴露这个绑定的“读取通道”。
2. `import { counter } from './lib.js'`：导入方没有复制`counter`的值，而是通过“读取通道”，关联到导出模块的`counter`绑定，相当于“实时监听”这个绑定的值。
3. `incCounter()`：函数执行时，修改的是导出模块内部`counter`的绑定值（从3变为4），由于导入方的`counter`是绑定的“只读视图”，因此再次读取时，会获取到最新的4。

补充验证：若导入方尝试修改绑定值，会直接报错（只读视图特性）：

```javascript
// main.js 中尝试修改导入的counter
import { counter } from './lib.js';
counter = 5; // 报错：Uncaught TypeError: Assignment to constant variable.（本质是只读绑定）
```

对应问题：上述示例中，调用incCounter()后，counter值能实时更新的核心原因是什么？导入方为什么不能修改导入的counter变量？

### 为什么CommonJS做不到“活绑定”（最小反例说明）

CommonJS的“快照式导出”机制，决定了它无法实现ESM那样的“活绑定”，以下通过两个最小反例，清晰展示差异及原因。

#### 反例1：解构导入导致“脱钩”（典型值拷贝表现）

代码示例（CommonJS模块，后缀为.cjs或未配置package.json "type": "module"）：

1. 导出模块（lib.cjs）：定义变量和修改变量的函数

```javascript
// lib.cjs（CommonJS模块）
let counter = 3;
function incCounter() {
  counter++; // 修改模块内部的counter变量
}
// 导出对象，此时exports.counter的值为3（快照）
module.exports = { counter, incCounter };
```

2. 导入模块（main.cjs）：解构导入，观察值的变化

```javascript
// main.cjs（CommonJS模块）
const { counter, incCounter } = require('./lib.cjs');

console.log(counter); // 输出：3（导入时的快照值）
incCounter(); // 调用函数，模块内部counter变为4，但exports.counter未更新
console.log(counter); // 输出：3（本地变量仍为导入时的快照值，未同步）
```

原因解析：

当执行`module.exports = { counter, incCounter }`时，`module.exports.counter`被赋值为此时`counter`的具体值（3），相当于“拍了一张快照”。后续`incCounter()`修改的是模块内部的`counter`变量，但并没有同步更新`module.exports.counter`的值。导入方解构得到的`counter`，是导入时从`module.exports`中读取的快照值（3），与模块内部后续修改的`counter`无关，因此不会同步变化。

#### 反例2：不解构导入，仍无法实现“活绑定”

有开发者认为“不解构，直接导入整个模块对象，就能实现动态更新”，但实际并非如此，反例如下：

```javascript
// main.cjs（不解构，直接导入模块对象）
const lib = require('./lib.cjs');

console.log(lib.counter); // 输出：3（模块对象上的counter值，即快照值）
lib.incCounter(); // 模块内部counter变为4，但lib.counter（即exports.counter）未更新
console.log(lib.counter); // 输出：3（仍为初始快照值）
```

补充：若想让CommonJS实现“类似活绑定”的效果，需手动在修改变量后，同步更新`module.exports`上的属性，代码如下：

```javascript
// lib.cjs（手动同步更新exports）
let counter = 3;
function incCounter() {
  counter++;
  module.exports.counter = counter; // 手动将更新后的值赋值给exports.counter
}
module.exports = { counter, incCounter };

// main.cjs 再次执行
const lib = require('./lib.cjs');
console.log(lib.counter); // 3
lib.incCounter();
console.log(lib.counter); // 4（手动同步后，才能获取最新值）
```

关键结论：CommonJS没有语言层面的“活绑定”机制，所谓的“动态更新”，是开发者手动维护`module.exports`对象的结果，而非规范本身的特性；而ESM的活绑定是规范层面的设计，无需手动维护，自动同步。

对应问题：CommonJS不解构导入模块对象，为什么也无法实现活绑定？手动同步更新`module.exports`的本质是什么？

### 第二个核心差异：运行时加载 vs 编译时（静态）解析接口

除了导出机制的差异，CommonJS与ESM的加载、解析时机也完全不同，这直接影响了模块的灵活性、性能及可优化性（如tree-shaking）。

#### CommonJS：运行时加载（动态加载）

CommonJS的`require()`是一个函数，模块加载发生在代码“运行时”，具备动态特性，具体表现如下：

1. `require()`可在任意代码位置调用（如if条件、for循环、函数内部），甚至可以通过字符串拼接动态生成模块路径。
2. 模块的加载和解析，必须等到代码执行到`require()`这一行时才会触发，引擎在运行前无法提前知道要加载哪些模块。
3. `module.exports`对象是在代码运行过程中逐步构建的，可根据运行时条件（如环境变量、函数返回值）决定导出哪些内容。

实操示例（动态加载特性）：

```javascript
// CommonJS 动态加载示例（main.cjs）
// 1. 根据环境变量动态决定加载的模块
const env = process.env.NODE_ENV;
const mod = require(`./${env === 'dev' ? 'devModule' : 'prodModule'}`);

// 2. 在条件判断中加载模块
if (env === 'dev') {
  const devTools = require('./devTools');
  devTools.log();
}

// 3. 运行时动态构建module.exports
module.exports = {};
if (Math.random() > 0.5) {
  module.exports.name = '张三';
} else {
  module.exports.age = 20;
}
```

对应问题：CommonJS的“运行时加载”具体指什么？这种加载方式的灵活性体现在哪里？

#### ESM：编译时（静态）解析接口

ESM的`import`/`export`语法是“静态”的，模块的解析和依赖分析发生在代码“编译时”（即代码执行前），具体表现如下：

1. `import`/`export`必须写在代码顶层（不能嵌套在if、循环、函数内部），导入路径通常是静态字符串（动态import语法除外，后续补充）。
2. 引擎在执行代码前，就能提前解析出模块的“依赖图（import graph）”——即哪些模块依赖哪些模块，以及每个模块导出、导入的具体符号（变量、函数名）。
3. 静态解析的核心优势：支持tree-shaking（树摇），即工具（如webpack、rollup）可分析出哪些导出的符号未被使用，从而在打包时删除这些无用代码，减小包体积。

实操示例（静态解析特性）：

```javascript
// ESM 静态解析示例（main.js）
// 1. import必须写在顶层，不能嵌套在条件中（报错）
// if (true) {
//   import { counter } from './lib.js'; // 报错：Unexpected token 'import'
// }

// 2. 导入路径通常是静态字符串（推荐）
import { counter, incCounter } from './lib.js';

// 3. 静态export，导出内容可提前解析
export const name = 'ESM模块';
export function fn() {}

// 补充：动态import（特殊情况，仍属于运行时加载）
// 动态import返回Promise，可在条件中使用，不影响静态解析的核心特性
if (true) {
  import('./lib.js').then(({ counter }) => {
    console.log(counter);
  });
}
```

重要补充（易忽略点）：ESM之所以能实现tree-shaking，本质是依赖“静态import/export”——因为引擎能提前确定哪些导出符号被导入、哪些未被使用；而CommonJS由于`require()`是动态加载，工具无法提前确定模块的依赖关系和未使用的导出，因此很难实现可靠的tree-shaking，容易误删有用代码。

对应问题：ESM的“编译时静态解析”是什么意思？为什么静态解析能支持tree-shaking，而CommonJS不能？

### 补充：动态import（ESM的特殊情况）

ESM虽然默认是静态解析，但也支持“动态import”语法（`import('./module.js')`），用于满足运行时动态加载的需求，需注意以下细节：

1. 动态import返回一个Promise对象，需通过`.then()`或`async/await`获取模块内容。
2. 动态import可嵌套在条件、循环、函数内部，弥补了静态import灵活性不足的问题。
3. 动态import不影响ESM的静态解析特性——静态import负责构建依赖图，动态import负责运行时按需加载，两者可结合使用。

示例代码：

```javascript
// ESM 动态import示例
async function loadModule() {
  const env = process.env.NODE_ENV;
  // 运行时动态加载模块
  const mod = await import(`./${env === 'dev' ? 'devModule' : 'prodModule'}.js`);
  mod.doSomething();
}
loadModule();
```

对应问题：ESM的动态import与CommonJS的require()有什么区别？动态import会影响tree-shaking吗？

### 核心差异总结

CommonJS与ESM的所有差异，本质源于“导出机制”和“解析时机”的不同，以下梳理核心差异要点，便于快速理解和记忆：

1. 导出机制：CommonJS是“快照式导出（值拷贝/引用共享）”，ESM是“live binding（活绑定）”。
2. 加载时机：CommonJS是运行时加载，ESM是编译时静态解析（动态import除外）。
3. 灵活性：CommonJS动态性更强（require可任意位置调用），ESM静态性更强（import需顶层）。
4. 优化性：ESM支持tree-shaking，CommonJS难以实现可靠tree-shaking。
5. 只读特性：ESM导入的绑定是只读的，CommonJS导入的变量可修改（基本类型）。

对应问题：结合导出机制和加载时机，总结CommonJS与ESM最核心的两个差异是什么