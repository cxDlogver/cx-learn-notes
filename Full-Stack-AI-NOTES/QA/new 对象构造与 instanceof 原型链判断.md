# new 对象构造与 instanceof 原型链判断

## 【知识概述】

**new 按构造规则创建并初始化对象，instanceof 默认检查右侧构造器的 prototype 是否出现在左侧对象原型链上。**

`new` 和 `instanceof` 都与 JavaScript 的**构造机制和原型链**直接相关。

从 ECMAScript 规范角度，`new` 会先检查 `Person` 是否是构造器，如果不是构造器就抛出 `TypeError`；如果可以构造，则调用它的 `[[Construct]]` 内部方法。对于这种普通的基础构造函数，可以在面试中简化成“创建对象 → 建立原型 → 绑定 this → 执行构造函数 → 确定返回值”。[[1]](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html)

但这只是理解方式，并不是规范真的执行这一句 JavaScript。

这正是上一题原型链知识和 `new` 之间的连接点。普通基础构造函数的 `[[Construct]]` 会通过 `OrdinaryCreateFromConstructor` 创建对象。[[2]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

理解这组机制，可以沿以下主线展开：

先解释分配对象、关联原型、绑定 this 和执行构造逻辑

再比较构造器返回对象或基本值对最终结果的影响

用原型链说明 instanceof 的判断，并补充 Symbol.hasInstance 等扩展。

不是所有函数都可构造；跨 realm、原型变更和自定义 hasInstance 会影响判断，不能用 constructor 相等代替 instanceof。相关完整知识可结合 [JavaScript核心总结](<../J-JavaScript核心总结.md>) 阅读。

## 1. 机制示例

这些片段展示当前主题需要解释的操作、数据关系或请求路径。判断时应关注前后的依赖和边界，后续机制说明给出对应原因。

```js
function Person() {
  this.name = 'Tom'

  return {
    name: 'Jerry'
  }
}
```

```js
new Person()
```

```js
function Person() {
  this.name = 'Tom'
  return 123
}
```

```text
p.constructor === Person
```

```js
[] instanceof Array
[] instanceof Object
```

```text
数组实例
↓
Array.prototype
↓
Object.prototype
↓
null
```

```text
构造函数
↓
new
↓
实例
↓
[[Prototype]]
↓
Constructor.prototype
↓
instanceof
```

## 2. 机制说明与工程判断

### 【`new` 的核心作用】

- 检查目标是否是构造器，也就是是否具有 `[[Construct]]`。
- 对普通基础构造函数，创建一个新对象。
- 新对象的 `[[Prototype]]` 通常来自 `Constructor.prototype`。
- 以新对象作为 `this` 执行构造函数。
- 根据构造函数的返回值决定最终返回谁。[[1]](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html)
### 【普通构造函数可以简化记成四步】

```text
创建新对象
↓
建立原型关系
↓
this 指向新对象并执行构造函数
↓
根据构造函数返回值决定最终结果
```
### 【构造函数的返回规则】

- 没有显式返回对象 → 返回新创建的实例。
- 显式返回对象 → 返回这个对象。
- 普通基础构造函数返回基本类型 → 基本类型被忽略，仍返回新实例。[[2]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)
### 【箭头函数不能 `new`】

- `new` 要求右侧是 constructor。
- constructor 必须具有 `[[Construct]]`。
- 箭头函数没有构造能力，因此：
  ```js
  new (() => {})
  ```
  会抛出 `TypeError`。[[1]](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html)
### 【`instanceof` 不是比较 `constructor`】

- 普通情况下，本质是检查：
  ```text
  Constructor.prototype
  ```
  是否出现在左侧对象的原型链中。
- 更严格地说，`instanceof` 会先考虑右侧对象的 `Symbol.hasInstance`；默认函数行为才进一步执行普通原型链判断。[[1]](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html)
### 【因此 `new` 和 `instanceof` 正好连接起来】

```text
new
→ 建立实例的 [[Prototype]]

instanceof
→ 沿实例的 [[Prototype]] 链检查 Constructor.prototype
```

## 3. 完整回答与表达组织

`new` 和 `instanceof` 都与 JavaScript 的**构造机制和原型链**直接相关。

先看：

```js
function Person(name) {
  this.name = name
}

const p = new Person('Tom')
```

从 ECMAScript 规范角度，`new` 会先检查 `Person` 是否是构造器，如果不是构造器就抛出 `TypeError`；如果可以构造，则调用它的 `[[Construct]]` 内部方法。对于这种普通的基础构造函数，可以在面试中简化成“创建对象 → 建立原型 → 绑定 this → 执行构造函数 → 确定返回值”。[[1]](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html)
### 【`new Person()` 到底做了什么？】

可以先用面试版四步理解。
#### <u>1. 第一步：创建一个新对象</u>

概念上相当于先得到：

```js
const obj = {}
```

但这只是理解方式，并不是规范真的执行这一句 JavaScript。
#### <u>2. 第二步：建立原型关系</u>

对于普通构造函数，新对象的原型通常来自：

```js
Person.prototype
```

所以：

```js
Object.getPrototypeOf(p) === Person.prototype
```

通常为：

```text
true
```

因此形成：

```text
p
↓ [[Prototype]]
Person.prototype
```

这正是上一题原型链知识和 `new` 之间的连接点。普通基础构造函数的 `[[Construct]]` 会通过 `OrdinaryCreateFromConstructor` 创建对象。[[2]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

---
#### <u>3. 第三步：把新对象作为 `this` 执行构造函数</u>

执行：

```js
new Person('Tom')
```

时：

```js
function Person(name) {
  this.name = name
}
```

其中：

```text
this → 新创建的对象
```

于是：

```js
this.name = 'Tom'
```

实际就是给新实例创建：

```js
p.name = 'Tom'
```

所以：

```js
console.log(p.name)
```

得到：

```text
Tom
```

规范中，对普通 base constructor 创建出 `thisArgument` 后，会把它绑定为该次构造调用中的 `this`。[[2]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

---
#### <u>4. 第四步：根据构造函数返回值决定最终返回结果</u>

这是 `new` 的高频考点。
### 【构造函数不写 `return`】

例如：

```js
function Person() {
  this.name = 'Tom'
}

const p = new Person()
```

最终：

```text
返回新创建的实例
```

也就是：

```js
p.name === 'Tom'
```

---
### 【构造函数返回对象】

例如：

```js
function Person() {
  this.name = 'Tom'

  return {
    name: 'Jerry'
  }
}

const p = new Person()
```

结果：

```js
console.log(p.name)
```

得到：

```text
Jerry
```

因为构造函数显式返回了一个对象：

```js
{
  name: 'Jerry'
}
```

对于普通基础构造函数，如果构造函数返回的是对象，`new` 的最终结果就是这个对象，而不是最开始创建的实例。[[2]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

---
### 【构造函数返回基本类型】

例如：

```js
function Person() {
  this.name = 'Tom'

  return 123
}

const p = new Person()
```

这里：

```js
return 123
```

不会让：

```js
p === 123
```

对于这种普通基础构造函数，基本类型返回值会被忽略，最终仍然返回之前创建的实例。

所以：

```js
p.name
```

仍然是：

```text
Tom
```

可以直接记：

```text
构造函数返回对象
→ 返回该对象

构造函数不返回 / 返回基本类型
→ 返回 new 创建的实例
```

[[2]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

这里说的是题目中的**普通基础构造函数**；派生 class constructor 的返回规则还有更严格的边界，不需要混进这道基础题里。

---
### 【为什么箭头函数不能被 `new`？】

例如：

```js
const Person = () => {}

new Person()
```

会抛：

```text
TypeError
```

原因不能只回答：

> “因为箭头函数没有 prototype。”

更根本的原因是：

> **箭头函数不是 constructor，没有 `[[Construct]]` 内部方法。**

`new` 执行时会先进行构造器检查：

```text
IsConstructor(Person)
```

如果不是构造器：

```text
false
↓
TypeError
```

ECMAScript 明确规定，能够被 `new` 构造的对象必须具备 `[[Construct]]`。[[1]](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html)

所以：

```text
没有 [[Construct]]
↓
不能 new
```

才是根本原因。

---
### 【`instanceof` 到底判断什么？】

例如：

```js
p instanceof Person
```

很多人会误以为它判断：

```js
p.constructor === Person
```

这不是 `instanceof` 的默认核心机制。

普通情况下，它真正关注的是：

> **`Person.prototype` 是否存在于 `p` 的原型链中。**

例如：

```text
p
↓
Person.prototype
↓
Object.prototype
↓
null
```

因为：

```text
Person.prototype
```

确实出现在 `p` 的原型链里，所以：

```js
p instanceof Person
```

结果为：

```text
true
```

ECMAScript 的 `InstanceofOperator` 更完整：它会先查询右侧对象的 `Symbol.hasInstance`；普通函数继承默认实现时，最终执行普通的原型链判断。[[1]](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html)

面试时可以说：

> **默认情况下，`instanceof` 会检查右侧构造函数的 `prototype` 是否出现在左侧对象的原型链上。**

这样既准确，也不会过度复杂。

---
### 【为什么修改 `Person.prototype` 会影响 `instanceof`？】

看：

```js
function Person() {}

const p = new Person()

Person.prototype = {}

console.log(p instanceof Person)
```

结果是：

```text
false
```

原因是创建 `p` 时：

```text
p.[[Prototype]]
↓
旧的 Person.prototype
```

假设旧对象叫：

```text
prototypeA
```

那么：

```text
p
↓
prototypeA
↓
Object.prototype
```

随后执行：

```js
Person.prototype = {}
```

只是把：

```text
Person.prototype
```

这个属性重新指向了一个**新的对象**，假设叫：

```text
prototypeB
```

现在：

```text
Person.prototype
↓
prototypeB
```

但是已经创建的 `p` 不会自动改原型：

```text
p
↓
prototypeA
```

所以 `instanceof` 检查：

```text
当前 Person.prototype
也就是 prototypeB

是否存在于 p 的原型链？
```

答案：

```text
不存在
```

因此：

```js
p instanceof Person
```

变成：

```text
false
```

这也再次说明：

> **`instanceof` 判断的不是对象身上的 `constructor` 字段，而是默认情况下检查当前 `Constructor.prototype` 与对象原型链之间的关系。**

[[1]](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html)

---
### 【为什么数组既是 `Array` 的实例，又是 `Object` 的实例？】

例如：

```js
const arr = []

arr instanceof Array
```

结果：

```text
true
```

同时：

```js
arr instanceof Object
```

也是：

```text
true
```

因为数组的原型链大致是：

```text
arr
↓
Array.prototype
↓
Object.prototype
↓
null
```

判断：

```js
arr instanceof Array
```

是在问：

```text
Array.prototype
```

是否出现在原型链中。

答案：

```text
是
```

再判断：

```js
arr instanceof Object
```

是在问：

```text
Object.prototype
```

是否出现在原型链中。

答案也是：

```text
是
```

所以两个结果都是 `true`。

---
### 【为什么 `1 instanceof Number` 是 false？】

看：

```js
1 instanceof Number
```

结果：

```text
false
```

因为：

```js
1
```

是一个 Number **基本类型值**，不是对象。

普通 `instanceof` 判断中，如果左侧不是对象，默认 `OrdinaryHasInstance` 会直接得到 `false`。`instanceof` 不是在问“这个值的数据类型是不是 number”，而是在问对象是否属于某个原型链体系。[[3]](https://tc39.es/ecma262/2023/multipage/abstract-operations.html)

所以：

```js
typeof 1
```

得到：

```text
number
```

而：

```js
1 instanceof Number
```

得到：

```text
false
```

两者解决的问题不一样。

---

但：

```js
new Number(1) instanceof Number
```

结果：

```text
true
```

因为：

```js
new Number(1)
```

创建的是一个 Number 包装对象。

其原型链中存在：

```text
Number.prototype
```

因此：

```text
Number 对象
↓
Number.prototype
↓
Object.prototype
↓
null
```

所以默认 `instanceof` 判断为 `true`。

---
### 【把 `new` 和 `instanceof` 串起来】

现在可以把第 30、31 题整个连起来：

```text
function Person() {}
        │
        │ prototype
        ↓
 Person.prototype
        ↑
        │ [[Prototype]]
        │
   new Person()
        ↓
        p
```

`new` 做的核心事情之一：

```text
建立：
p.[[Prototype]]
=
Person.prototype
```

而：

```js
p instanceof Person
```

默认判断的核心就是：

```text
Person.prototype、是否在、p 的原型链中？
```

因此：

```text
new
↓
建立原型关系
↓
instanceof
↓
检查这条原型关系
```

这两个知识点本质上是连在一起的。

---
### 【最终面试收敛回答】

> **对于普通构造函数，`new` 可以理解为四个核心步骤：先创建一个新对象，把这个对象的 `[[Prototype]]` 关联到构造函数的 `prototype`，再把新对象作为 `this` 执行构造函数，最后根据构造函数返回值决定结果。如果显式返回对象，就返回该对象；如果没有返回或者返回基本类型，普通基础构造函数最终返回创建的新实例。箭头函数不能被 `new`，根本原因是它没有 `[[Construct]]`，不是 constructor。`instanceof` 默认也和原型链直接相关，它不是比较 `constructor` 属性，而是检查右侧构造函数当前的 `prototype` 是否出现在左侧对象的原型链中。因此 `new` 负责建立实例与 `Constructor.prototype` 的原型关系，而 `instanceof` 默认利用这条关系进行判断。** [[1]](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html)

## 4. 参考文献

[1] [ECMAScript® 2026 Language Specification](<https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html>)[EB/OL].

[2] [TC39](<https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html>)[EB/OL].

[3] [TC39](<https://tc39.es/ecma262/2023/multipage/abstract-operations.html>)[EB/OL].
