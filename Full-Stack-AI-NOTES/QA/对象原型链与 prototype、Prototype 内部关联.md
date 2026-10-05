# 对象原型链与 prototype、Prototype 内部关联

## 【知识概述】

**对象的内部原型关联决定属性查找链，函数的 prototype 属性常用于构造实例；两者名称接近但指向关系不同。**

每个普通对象内部都有一个 `[[Prototype]]` 内部槽，它保存该对象的原型对象或者 `null`。当访问一个对象自身不存在的属性时，JavaScript 会沿着这个 `[[Prototype]]` 一层层向上查找，这条连续的查找关系就是**原型链**。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

ECMAScript 的普通对象 `[[Get]]` 算法就是这样规定的：如果当前对象没有自身属性，就取得其原型继续执行属性查找；如果原型已经是 `null`，则返回 `undefined`。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

理解这组机制，可以沿以下主线展开：

先沿自身属性到原型对象解释查找与遮蔽

再把构造函数、prototype 对象和实例放入同一图中

最后区分内部 Prototype、历史访问器 __proto__ 及 Object.getPrototypeOf 等接口。

原型链不是 constructor 属性串成的链，__proto__ 也不是推荐的通用读写接口；对象原型可以是 null。相关完整知识可结合 [JavaScript核心总结](<../J-JavaScript核心总结.md>) 阅读。

## 1. 机制示例

这些片段展示当前主题需要解释的操作、数据关系或请求路径。判断时应关注前后的依赖和边界，后续机制说明给出对应原因。

```js
p.__proto__ === Person.prototype

Object.getPrototypeOf(p) === Person.prototype
```

```js
p.name
```

```js
Person.prototype.name = 'prototype'

p.name = 'instance'
```

```text
Person.prototype、p 的 [[Prototype]]、p.__proto__
```

## 2. 机制说明与工程判断

### 【`[[Prototype]]` 是对象内部真正的原型关联】

- 普通对象内部都有 `[[Prototype]]`。
- 它的值要么是另一个对象，要么是 `null`。
- JavaScript 通过它实现属性继承。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)
### 【原型链就是多个 `[[Prototype]]` 串起来形成的链】

```text
实例
↓
构造函数.prototype
↓
Object.prototype
↓
null
```
### 【属性查找先找自身，再沿原型链向上】

- 当前对象没有该属性，就获取它的原型继续查找。
- 一直找到 `null` 仍没有，就返回 `undefined`。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)
### 【`prototype` 和 `[[Prototype]]` 不是一个东西】

- `[[Prototype]]`：对象内部的原型引用。
- `prototype`：某些函数对象上的普通属性，其值通常是一个对象，用于构造实例时建立实例的原型关系。
- 因此不能说“所有对象都有 `prototype`”。[[2]](https://tc39.es/ecma262/2024/)
### 【`__proto__` 只是访问原型的一种接口】

- `obj.__proto__` 本质上来自 `Object.prototype` 上的访问器。
- getter 最终读取对象的 `[[Prototype]]`。
- 更规范地获取原型使用 `Object.getPrototypeOf(obj)`；修改则使用 `Object.setPrototypeOf()`。[[3]](https://tc39.es/ecma262/pr/3713/multipage/fundamental-objects.html)
### 【构造函数与实例的典型关系】

```js
function Person() {}
const p = new Person()
```

一般成立：

```js
Object.getPrototypeOf(p) === Person.prototype
```
### 【原型方法可以被实例共享】

- 方法放在 `Person.prototype` 上。
- 多个实例通过原型链访问同一个方法，而不是每个实例各自保存一份。
### 【`Object.create(proto)`】

- 创建一个新对象。
- 并直接把新对象的 `[[Prototype]]` 设置为传入的 `proto`。
- 它不是复制 `proto` 的属性。[[4]](https://tc39.es/ecma262/2026/multipage/fundamental-objects.html)

## 3. 完整回答与表达组织

JavaScript 的继承机制本质上建立在**原型**之上。

每个普通对象内部都有一个 `[[Prototype]]` 内部槽，它保存该对象的原型对象或者 `null`。当访问一个对象自身不存在的属性时，JavaScript 会沿着这个 `[[Prototype]]` 一层层向上查找，这条连续的查找关系就是**原型链**。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)
### 【原型和原型链是什么？】

例如：

```js
const parent = {
  name: 'Tom'
}

const child = Object.create(parent)
```

这里：

```text
child
↓ [[Prototype]]
parent
```

也就是说：

```js
Object.getPrototypeOf(child) === parent
```

虽然：

```js
child
```

自身并没有：

```js
name
```

但执行：

```js
child.name
```

仍然得到：

```text
Tom
```

因为属性查找过程是：

```text
child 自己有没有 name？
↓
没有
↓
获取 child 的 [[Prototype]]
↓
parent 有没有 name？
↓
有
↓
返回 parent.name
```

ECMAScript 的普通对象 `[[Get]]` 算法就是这样规定的：如果当前对象没有自身属性，就取得其原型继续执行属性查找；如果原型已经是 `null`，则返回 `undefined`。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

所以原型链可以概括为：

> **对象在自身找不到属性时，沿 `[[Prototype]]` 不断向上查找形成的链。**

---
### 【`prototype` 和 `[[Prototype]]` 到底有什么区别？】

这是这一题最重要的地方。

先看：

```js
function Person() {}
```

`Person` 是一个函数对象。

它通常有一个普通属性：

```js
Person.prototype
```

这个属性的值本身是一个对象。

所以：

```text
Person
│
└── prototype
      ↓
      一个对象
```

而：

```text
[[Prototype]]
```

不是我们正常写出来的普通 JavaScript 属性，它是对象内部用于建立继承关系的内部槽。普通对象的 `[[Prototype]]` 要么指向另一个对象，要么是 `null`。[[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

因此两者分别是：

```text
prototype
→ 函数对象上的一个属性

[[Prototype]]
→ 对象内部真正的原型引用
```

不能把它们混成一个概念。

也不能说：

> 所有对象都有 `prototype`。

例如：

```js
const obj = {}
```

通常：

```js
obj.prototype
```

是：

```text
undefined
```

但是 `obj` 依然有内部的：

```text
[[Prototype]]
```

通常指向：

```js
Object.prototype
```

另一方面，即使是函数，也不意味着所有函数对象都有自己的 `"prototype"` 属性。例如规范中的 `Function.prototype` 自己就是函数对象，但没有 `"prototype"` 属性。[[4]](https://tc39.es/ecma262/2026/multipage/fundamental-objects.html)

---
### 【`new Person()` 到底建立了什么关系？】

例如：

```js
function Person() {}

const p = new Person()
```

创建实例时，构造过程会使用构造函数的 `"prototype"` 属性来确定新对象的 `[[Prototype]]`。[[2]](https://tc39.es/ecma262/2024/)

因此通常有：

```js
Object.getPrototypeOf(p) === Person.prototype
```

也就是：

```text
Person
│
│ prototype
↓
Person.prototype
↑
│ [[Prototype]]
│
p
```

面试中最常背的：

```js
p.__proto__ === Person.prototype
```

在普通环境下一般也成立。

但更推荐写：

```js
Object.getPrototypeOf(p) === Person.prototype
```

因为它直接使用标准 API 表达“获取对象原型”的语义。

---
### 【`__proto__` 又是什么？】

`__proto__` 很容易被误认为是：

> “对象内部真正存储的原型属性”。

这不准确。

规范中 `Object.prototype.__proto__` 是一个**访问器属性**。读取它时，其 getter 最终调用对象的 `[[GetPrototypeOf]]()`，也就是读取内部的原型关系。[[3]](https://tc39.es/ecma262/pr/3713/multipage/fundamental-objects.html)

所以可以理解成：

```text
obj.__proto__
↓
一个访问 [[Prototype]] 的接口

Object.getPrototypeOf(obj)
↓
标准 API 获取 [[Prototype]]
```

因此三者关系是：

```text
[[Prototype]]
→ 真正的内部原型关系

__proto__
→ 对这个内部关系的一种访问方式

Object.getPrototypeOf()
→ 标准 API
```

---
### 【一个完整的原型链长什么样？】

例如：

```js
function Person() {}

const p = new Person()
```

通常：

```js
Object.getPrototypeOf(p) === Person.prototype
```

继续：

```js
Object.getPrototypeOf(Person.prototype)
  === Object.prototype
```

而：

```js
Object.getPrototypeOf(Object.prototype)
  === null
```

所以原型链是：

```text
p
↓
Person.prototype
↓
Object.prototype
↓
null
```

`Object.prototype` 是这里的顶层普通原型对象，它自己的 `[[Prototype]]` 就是 `null`。[[4]](https://tc39.es/ecma262/2026/multipage/fundamental-objects.html)

---
### 【属性查找为什么是“就近原则”？】

例如：

```js
function Person() {}

Person.prototype.name = 'prototype'

const p = new Person()

p.name = 'instance'
```

现在：

```js
console.log(p.name)
```

得到：

```text
instance
```

不是：

```text
prototype
```

因为查找顺序是：

```text
先检查 p 自身
↓
找到 name
↓
直接返回
```

只有自身找不到时，才会继续：

```text
p
↓
Person.prototype
↓
Object.prototype
↓
null
```

这也是为什么实例属性可以**遮蔽**原型上的同名属性。

---
### 【为什么把方法放在 `prototype` 上可以共享？】

假设：

```js
function Person(name) {
  this.name = name
}

Person.prototype.say = function () {
  console.log(this.name)
}
```

创建：

```js
const p1 = new Person('A')
const p2 = new Person('B')
```

这里：

```text
p1
┐
├→ Person.prototype.say
│
p2
┘
```

`p1` 和 `p2` 自身都不需要保存一份 `say` 函数。

它们都通过：

```text
[[Prototype]]
```

找到：

```js
Person.prototype.say
```

因此共享同一个方法。

如果改成：

```js
function Person(name) {
  this.name = name

  this.say = function () {
    console.log(this.name)
  }
}
```

那么每执行一次：

```js
new Person()
```

都会为实例创建自己的 `say` 函数属性。

所以原型机制的重要价值之一就是：

> **多个对象可以通过原型共享属性和方法。**

ECMAScript 对 prototype 的定义也明确指出，构造函数的 `"prototype"` 属性用于实现继承和共享属性。[[2]](https://tc39.es/ecma262/2024/)

---
### 【`Object.create()` 做了什么？】

例如：

```js
const parent = {
  say() {
    console.log('hello')
  }
}

const child = Object.create(parent)
```

它不是：

```text
复制 parent
↓
生成 child
```

而是：

```text
创建 child
↓
child.[[Prototype]] = parent
```

所以：

```js
Object.getPrototypeOf(child) === parent
```

成立。

ECMAScript 对 `Object.create(O)` 的定义就是创建一个新对象，并以参数 `O` 作为指定的原型。[[4]](https://tc39.es/ecma262/2026/multipage/fundamental-objects.html)

因此：

```text
Object.assign
→ 更偏属性复制

Object.create
→ 建立原型关系
```

这两个一定不要混。

---
### 【三个概念最终怎么记？】

用下面这段代码：

```js
function Person() {}

const p = new Person()
```

直接记：

```text
Person.prototype
→ Person 函数上的普通属性
→ 值是一个对象

p.[[Prototype]]
→ p 内部真正的原型引用
→ 指向 Person.prototype

p.__proto__
→ 访问 p 原型的一种接口
→ 通常得到 Person.prototype
```

所以：

```js
Object.getPrototypeOf(p) === Person.prototype
```

一般成立。

而常见环境下：

```js
p.__proto__ === Person.prototype
```

也成立。

---
### 【最终面试收敛回答】

> **JavaScript 的继承建立在原型机制上。普通对象内部都有一个 `[[Prototype]]`，它指向另一个对象或者 `null`。访问属性时，会先查对象自身，如果没有，就沿着 `[[Prototype]]` 向上查找，直到找到属性或者到达 `null`，这条链就是原型链。`prototype` 和 `[[Prototype]]` 不是一个概念：`prototype` 是某些函数对象上的普通属性，构造调用时它通常会成为新实例的 `[[Prototype]]`；而 `[[Prototype]]` 是对象内部真正用于继承的原型引用。`__proto__` 则是访问这一内部原型关系的访问器，更推荐使用 `Object.getPrototypeOf()`。例如 `const p = new Person()` 后，通常有 `Object.getPrototypeOf(p) === Person.prototype`，原型链继续向上通常是 `Person.prototype → Object.prototype → null`。** [[1]](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html)

## 4. 参考文献

[1] [ECMAScript® 2026 Language Specification](<https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html>)[EB/OL].

[2] [TC39](<https://tc39.es/ecma262/2024/>)[EB/OL].

[3] [TC39](<https://tc39.es/ecma262/pr/3713/multipage/fundamental-objects.html>)[EB/OL].

[4] [TC39](<https://tc39.es/ecma262/2026/multipage/fundamental-objects.html>)[EB/OL].
