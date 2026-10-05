# this 绑定规则与 call、apply、bind

## 【知识概述】

**普通函数的 this 主要由调用方式及函数模式决定，箭头函数沿词法环境取得 this；显式绑定需要结合构造调用等边界判断。**

`this` 是 JavaScript 在执行函数时提供的一个特殊绑定，用于表示当前函数调用所关联的上下文。

对于**普通函数**，`this` 通常不是在函数定义时固定，而是由**调用方式**决定。ECMAScript 内部会根据函数的 `[[ThisMode]]` 和调用时传入的 `thisArgument` 建立 `this` 绑定；箭头函数则使用 lexical this，不建立自己的 `this`。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

如果是非严格模式普通函数，调用时传入的 `this` 是 `undefined` 或 `null`，语言会将其替换成对应 Realm 的全局对象。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

理解这组机制，可以沿以下主线展开：

先比较直接调用、对象方法调用和构造调用

再通过方法提取说明调用表达式变化为何导致 this 改变

对比 call、apply 的立即调用与 bind 返回新函数，并补充参数和 new 的影响。

严格模式、箭头函数和绑定函数有不同规则，不能用单一优先级口号覆盖所有函数类型。相关完整知识可结合 [JavaScript核心总结](<../J-JavaScript核心总结.md>) 阅读。

## 1. 机制说明与工程判断

### 【普通函数的 `this` 主要由调用方式决定】

- 不是看函数在哪里定义，也不是简单看“函数属于哪个对象”。
- 普通函数调用时，根据具体调用形式确定 `this`。
- 箭头函数是例外，它没有自己的 `this`，而是使用外层词法环境中的 `this`。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)
### 【普通函数常见的 `this` 情况】

```text
fn()
→ 普通直接调用

obj.fn()
→ this 通常是 obj

fn.call(obj)
→ 显式指定 this 为 obj

new Fn()
→ this 指向新创建的实例
```
### 【直接调用的严格模式区别】

- 严格模式：`this` 保持传入的 `undefined`。
- 非严格模式：`undefined/null` 会被替换为全局对象；原始值会被包装为对象。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)
### 【方法提取可能导致 `this` 丢失】

```js
const fn = obj.say
fn()
```
此时调用形式已经从：
```js
obj.say()
```
变成：
```js
fn()
```
因此不再以 `obj` 作为调用基对象。
### 【箭头函数没有自己的 `this`】

- 创建箭头函数时使用 `lexical-this`。
- 内部 `this` 从外层词法环境解析。
- `call/apply/bind` 传入的 `thisArg` 对箭头函数不会生效。[[2]](https://tc39.es/ecma262/2024/multipage/ecmascript-language-functions-and-classes.html)
### 【`call` 和 `apply` 都立即调用函数】

- `call(thisArg, a, b)`
- `apply(thisArg, [a, b])`
- 核心区别是参数传递形式。[[3]](https://tc39.es/ecma262/multipage/fundamental-objects.html)
### 【`bind` 不立即执行】

- 返回一个新的 bound function。
- 可以预先绑定 `this` 和部分参数。
- 后续再调用这个新函数。[[3]](https://tc39.es/ecma262/multipage/fundamental-objects.html)
### 【`new` 调用 bound function 是重要边界】

- 如果目标函数可以被构造，绑定后的函数也可以被 `new`。
- 此时之前通过 `bind()` 指定的 `thisArg` 不再作为实例的 `this` 使用。
- `new` 创建的新实例成为构造调用中的 `this`。

## 2. 完整回答与表达组织

`this` 是 JavaScript 在执行函数时提供的一个特殊绑定，用于表示当前函数调用所关联的上下文。

对于**普通函数**，`this` 通常不是在函数定义时固定，而是由**调用方式**决定。ECMAScript 内部会根据函数的 `[[ThisMode]]` 和调用时传入的 `thisArgument` 建立 `this` 绑定；箭头函数则使用 lexical this，不建立自己的 `this`。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)
### 【普通函数的 `this` 怎么判断？】

最常见的情况可以这样理解。
#### <u>1. 直接调用</u>

```js
function show() {
  console.log(this)
}

show()
```

这里没有：

```text
某个对象.show()
```

这样的调用基对象。

如果函数是**严格模式函数**：

```js
'use strict'

function show() {
  console.log(this)
}

show()
```

那么：

```text
this === undefined
```

如果是非严格模式普通函数，调用时传入的 `this` 是 `undefined` 或 `null`，语言会将其替换成对应 Realm 的全局对象。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

所以面试时不要简单背：

> “普通函数直接调用，this 永远是 window。”

这并不准确。

更准确是：

```text
严格模式
→ undefined

非严格模式普通函数
→ undefined/null 会被替换为全局对象
```

并且在 ES Module 中，代码天然处于严格模式语义下，因此也不能到处套用“this 就是 window”。

---
#### <u>2. 对象方法调用</u>

例如：

```js
const user = {
  name: 'Tom',

  say() {
    console.log(this.name)
  }
}

user.say()
```

这里：

```text
this → user
```

因为调用形式是：

```js
user.say()
```

因此可以简单记：

> **普通方法通过 `obj.fn()` 调用时，函数中的 `this` 通常就是调用表达式中的 `obj`。**

---
### 【为什么会出现 `this` 丢失？】

例如：

```js
const user = {
  name: 'Tom',

  say() {
    console.log(this.name)
  }
}

const fn = user.say

fn()
```

很多人会认为：

```text
fn 本来是 user.say
所以 this 还是 user
```

这是错误的。

关键不是函数“原来放在哪里”，而是：

> **现在怎么调用它。**

原来是：

```js
user.say()
```

调用时保留了 `user` 这个引用基对象。

但：

```js
const fn = user.say
fn()
```

执行时已经变成普通函数调用：

```text
fn()
```

因此不会自动记住原来的 `user`。

这就是日常开发中经常说的：

> **方法被单独取出来后可能发生 `this` 丢失。**

这也是为什么事件回调、定时器回调等场景中经常会使用 `bind()` 或箭头函数保存需要的上下文。

---
### 【`call()`、`apply()`、`bind()` 有什么区别？】

三者都定义在：

```js
Function.prototype
```

上。

其中 `call()` 和 `apply()` 都会：

> **立即调用目标函数，并提供一个 `thisArg`。**

ECMAScript 对 `call()` 的处理最终会执行：

```text
Call(func, thisArg, args)
```

而 `apply()` 同样调用目标函数，只不过它先把数组或类数组参数转换成参数列表。[[3]](https://tc39.es/ecma262/multipage/fundamental-objects.html)

例如：

```js
function add(a, b) {
  return this.num + a + b
}

const obj = {
  num: 10
}
```

使用 `call()`：

```js
add.call(obj, 1, 2)
```

相当于：

```text
this → obj
a → 1
b → 2
```

结果：

```text
13
```

使用 `apply()`：

```js
add.apply(obj, [1, 2])
```

结果同样：

```text
13
```

所以二者核心区别非常简单：

```text
call
→ 参数一个一个传

apply
→ 参数通过数组或类数组传
```

即：

```js
fn.call(obj, 1, 2, 3)

fn.apply(obj, [1, 2, 3])
```

二者都会**立即执行函数**。

---

而 `bind()` 不一样。

```js
const newFn = add.bind(obj, 1)
```

这一步：

```text
不会执行 add
```

而是返回：

```text
一个新的绑定函数
```

然后：

```js
newFn(2)
```

最终相当于：

```js
add.call(obj, 1, 2)
```

所以可以直接记：

```text
call
→ 改 this
→ 立即执行
→ 参数逐个传

apply
→ 改 this
→ 立即执行
→ 参数数组传

bind
→ 绑定 this
→ 不立即执行
→ 返回新函数
→ 还可以预置参数
```

ECMAScript 中 `bind()` 会通过 `BoundFunctionCreate` 创建一个新的 bound function，并记录目标函数、绑定的 `this` 和预置参数。[[3]](https://tc39.es/ecma262/multipage/fundamental-objects.html)

---
### 【箭头函数的 `this` 为什么特殊？】

这是 `this` 最重要的边界之一。

例如：

```js
const obj = {
  name: 'Tom',

  normal() {
    console.log(this.name)
  },

  arrow: () => {
    console.log(this)
  }
}
```

不能因为 `arrow` 写在 `obj` 中，就认为：

```text
arrow 的 this = obj
```

箭头函数：

> **没有自己的 `this` 绑定。**

ECMAScript 创建箭头函数时明确使用 `lexical-this`；箭头函数中的 `this` 会继续向外层词法环境寻找。[[2]](https://tc39.es/ecma262/2024/multipage/ecmascript-language-functions-and-classes.html)

因此：

```js
const arrow = () => {
  console.log(this)
}
```

再执行：

```js
arrow.call(obj)
```

`obj` 不会成为箭头函数的 `this`。

同理：

```js
arrow.apply(obj)
arrow.bind(obj)
```

也不能改变它的 `this`。

ECMAScript 对 `call` 和 `apply` 也明确指出，如果目标是箭头函数，其传入的 `thisArg` 会被函数调用机制忽略。[[3]](https://tc39.es/ecma262/multipage/fundamental-objects.html)

所以：

```text
普通函数
→ this 通常看调用方式

箭头函数
→ 没有自己的 this
→ 使用外层词法 this
```

---
### 【为什么箭头函数经常用在回调里？】

例如：

```js
const user = {
  name: 'Tom',

  printLater() {
    setTimeout(() => {
      console.log(this.name)
    }, 1000)
  }
}
```

调用：

```js
user.printLater()
```

进入 `printLater` 时：

```text
this → user
```

内部箭头函数没有自己的 `this`：

```text
箭头函数 this
↓
向外找
↓
printLater 的 this
↓
user
```

所以最终可以访问：

```js
this.name
```

这就是箭头函数特别适合某些回调场景的原因之一。

---
### 【`bind()` 后再 `new` 会发生什么？】

这是一个比较容易答错的追问。

例如：

```js
function Person(name) {
  this.name = name
}

const obj = {}

const BoundPerson = Person.bind(obj)

const p = new BoundPerson('Tom')
```

很多人会认为：

```text
bind 绑定 obj
↓
this 永远等于 obj
```

这是错误的。

Bound Function 如果目标函数可以被构造，那么它本身也可以参与构造调用。

执行：

```js
new BoundPerson('Tom')
```

时，之前 `bind(obj)` 中绑定的 `obj` 不会作为构造函数内部的实例 `this`。

最终：

```text
this
→ new 创建出来的实例
```

所以：

```js
p.name
```

是：

```text
Tom
```

而不是把 `name` 写到原来的 `obj` 上。

因此面试时可以记：

> **普通调用 bound function 时使用绑定的 `this`；作为构造函数被 `new` 调用时，绑定的 `thisArg` 会被忽略。**

`bind()` 返回的函数本身是特殊的 Bound Function Exotic Object，这也是为什么不能把它简单理解成“永远把 this 写死”。[[3]](https://tc39.es/ecma262/multipage/fundamental-objects.html)

---
### 【几种 `this` 情况怎么统一记忆？】

面试时可以先掌握下面这套判断方式：

```text
① fn()
普通直接调用
→ 严格模式通常 undefined
→ 非严格模式下 undefined/null 会进行全局对象替换

② obj.fn()
方法调用
→ this = obj

③ fn.call(obj)
   fn.apply(obj)
   fn.bind(obj)
显式绑定
→ 普通函数按指定对象处理 this

④ new Fn()
构造调用
→ this = 新创建的实例

⑤ () => {}
箭头函数
→ 没有自己的 this
→ 从外层词法环境获取
```

但不要机械理解成“五种谁优先级更高”就能解决所有情况，因为：

- 箭头函数根本没有自己的动态 `this`；
- Bound Function 还有 `new` 的特殊构造语义；
- 严格模式会影响普通函数对 `thisArgument` 的处理。

---
### 【最终面试收敛回答】

> **JavaScript 中普通函数的 `this` 主要由调用方式决定，而不是由函数定义位置决定。普通函数直接调用时，严格模式下 `this` 通常是 `undefined`，非严格模式下 `undefined/null` 会被替换为全局对象；通过 `obj.fn()` 调用时，`this` 通常指向 `obj`；通过 `call`、`apply` 可以显式指定 `this`，二者都会立即执行函数，区别主要是 `call` 逐个传参，而 `apply` 使用数组或类数组传参；`bind` 不立即执行，而是返回一个绑定了 `this` 和可选预置参数的新函数。箭头函数没有自己的 `this`，它使用外层词法环境中的 `this`，所以 `call`、`apply`、`bind` 都不能改变它的 `this`。另外，绑定函数如果通过 `new` 构造调用，之前 `bind` 设置的 `thisArg` 会被忽略，此时 `this` 指向新创建的实例。** [[3]](https://tc39.es/ecma262/multipage/fundamental-objects.html)

## 3. 参考文献

[1] [ECMAScript® 2026 Language Specification](<https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html>)[EB/OL].

[2] [TC39](<https://tc39.es/ecma262/2024/multipage/ecmascript-language-functions-and-classes.html>)[EB/OL].

[3] [TC39](<https://tc39.es/ecma262/multipage/fundamental-objects.html>)[EB/OL].
