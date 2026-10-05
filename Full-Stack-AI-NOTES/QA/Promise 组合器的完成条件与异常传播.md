# Promise 组合器的完成条件与异常传播

## 【知识概述】

**all、race、allSettled 和 any 都组合多个结果，但分别等待全部成功、最先确定、全部确定或最先成功。**

这四个方法本质上都是 **Promise 组合器**，用于把多个异步结果组合成一个新的 Promise。

**所有输入都 fulfilled，整体才 fulfilled。**

ECMAScript 中 `PerformPromiseAll` 会为每个输入位置保存对应结果，因此最终数组按照**原始迭代顺序**组织，而不是哪个 Promise 先完成就排在前面。[[1]](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)

谁就决定最终结果。[[1]](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)

`allSettled()` 与 `all()` 最大的区别在于：

理解这组机制，可以沿以下主线展开：

先用成功与失败的混合时序对比各方法完成条件。

再解释返回结果顺序、拒绝原因和 AggregateError。

结合并行请求、超时竞争及容错结果收集选择组合器。

组合器本身不负责取消其余操作，也不代表输入任务由它启动；空集合和普通值的行为需要单独判断。相关完整知识可结合 [前端异步编程](<../Q-前端异步编程.md>) 阅读。

## 1. 机制说明与工程判断

### 【`Promise.all()`：全部成功才成功】

- 等待所有输入项 fulfilled。
- 只要一个输入 rejected，返回的 Promise 就会 rejected。
- 成功结果数组按照**输入顺序**排列，而不是完成顺序。[[1]](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)
### 【`Promise.race()`：谁先 settled 就采用谁】

- 不区分 fulfilled 和 rejected。
- 第一个 settled 的输入决定返回 Promise 的结果。
- 所以不能说成“谁先成功返回谁”。[[1]](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)
### 【`Promise.allSettled()`：等待全部结束】

- 不会因为其中一个失败就提前结束。
- 等所有输入都 settled 后 fulfilled。
- 返回每一项的状态和对应的 `value` 或 `reason`。
- 适合需要统计所有任务执行结果的场景。[[1]](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)
### 【`Promise.any()`：第一个成功就成功】

- 忽略前面的失败，继续等待其他输入。
- 只要有一个 fulfilled，就立即以该值 fulfilled。
- 只有所有输入都 rejected，才会整体 rejected，并产生 `AggregateError`。[[1]](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)
### 【四者的核心判断条件】

| 方法 | 什么时候成功 | 什么时候失败 |
|---|---|---|
| `Promise.all` | 全部成功 | 任意一个失败 |
| `Promise.allSettled` | 全部结束后总是成功返回结果集合 | 正常输入情况下不会因某项 rejected 而整体失败 |
| `Promise.race` | 第一个结束的是成功 | 第一个结束的是失败 |
| `Promise.any` | 任意一个成功 | 全部失败 |
### 【普通值也可以传入】

- 这些方法接收的是 iterable，不要求每一项本身都是 Promise。
- 每一项都会通过 Promise 构造器对应的 `resolve` 机制进行统一处理。[[2]](https://tc39.es/ecma262/2026/multipage/)

## 2. 完整回答与表达组织

这四个方法本质上都是 **Promise 组合器**，用于把多个异步结果组合成一个新的 Promise。

最核心的区别可以记成：

```text
all
→ 全部成功

allSettled
→ 全部结束

race
→ 第一个结束

any
→ 第一个成功
```
### 【`Promise.all()`】

例如：

```js
const p1 = Promise.resolve('A')
const p2 = Promise.resolve('B')
const p3 = Promise.resolve('C')

Promise.all([p1, p2, p3])
  .then(result => {
    console.log(result)
  })
```

得到：

```js
['A', 'B', 'C']
```

`Promise.all()` 要求：

> **所有输入都 fulfilled，整体才 fulfilled。**

只要其中一个 rejected：

```js
Promise.all([
  Promise.resolve('A'),
  Promise.reject('error'),
  Promise.resolve('C')
])
```

整体就会 rejected。

因此可以理解成：

```text
A 成功 ─┐
B 成功 ─┼→ 全部成功 → all 成功
C 成功 ─┘
```

如果：

```text
A 成功、B 失败、C ...
```

那么：

```text
B rejected
↓
Promise.all rejected
```

ECMAScript 中 `PerformPromiseAll` 会为每个输入位置保存对应结果，因此最终数组按照**原始迭代顺序**组织，而不是哪个 Promise 先完成就排在前面。[[1]](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)

例如：

```js
const p1 = new Promise(resolve => {
  setTimeout(() => resolve('A'), 3000)
})

const p2 = new Promise(resolve => {
  setTimeout(() => resolve('B'), 1000)
})

Promise.all([p1, p2]).then(console.log)
```

虽然：

```text
B 先完成
A 后完成
```

最终仍然是：

```js
['A', 'B']
```

而不是：

```js
['B', 'A']
```

所以 `all()` 特别适合：

> **多个任务必须全部成功，才能进入下一步。**

例如：

```text
页面初始化
├─ 用户信息
├─ 权限信息
└─ 系统配置

三个都拿到
↓
初始化页面
```

---
### 【`Promise.race()`】

`race` 的关键字不是：

> 第一个成功。

而是：

> **第一个 settled。**

也就是谁最先变成：

```text
fulfilled
或
rejected
```

谁就决定最终结果。[[1]](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)

例如：

```js
const p1 = new Promise(resolve => {
  setTimeout(() => resolve('A'), 3000)
})

const p2 = new Promise(resolve => {
  setTimeout(() => resolve('B'), 1000)
})

Promise.race([p1, p2])
  .then(console.log)
```

结果：

```text
B
```

但如果：

```js
const p1 = new Promise(resolve => {
  setTimeout(() => resolve('成功'), 3000)
})

const p2 = new Promise((resolve, reject) => {
  setTimeout(() => reject('失败'), 1000)
})
```

那么：

```js
Promise.race([p1, p2])
```

会：

```text
rejected
```

因为最先结束的是失败的 `p2`。

所以：

```text
race
≠
谁先成功用谁

race
=
谁先结束用谁
```

一个典型应用是**超时控制**：

```js
Promise.race([
  requestData(),
  timeout(5000)
])
```

请求和超时 Promise 谁先 settled，就采用谁。

---
### 【`Promise.allSettled()`】

`allSettled()` 与 `all()` 最大的区别在于：

```text
all
→ 有一个失败就整体失败

allSettled
→ 不管成功失败，都等全部结束
```

ECMAScript 对它的定义就是：等待所有输入 Promise 都 settled 后，再返回每一项的状态快照。[[1]](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)

例如：

```js
Promise.allSettled([
  Promise.resolve('A'),
  Promise.reject('B失败'),
  Promise.resolve('C')
]).then(console.log)
```

概念上得到：

```js
[
  {
    status: 'fulfilled',
    value: 'A'
  },
  {
    status: 'rejected',
    reason: 'B失败'
  },
  {
    status: 'fulfilled',
    value: 'C'
  }
]
```

所以即使：

```text
任务1 成功、任务2 失败、任务3 成功、任务4 失败
```

`allSettled()` 仍然会等到：

```text
1、2、3、4 全部结束
```

然后一次性告诉你：

```text
谁成功、谁失败、成功结果是什么、失败原因是什么
```

因此非常适合：

```text
批量上传、批量删除、批量请求、批量任务执行
```

因为这些场景经常允许：

> **部分成功、部分失败。**

---
### 【`Promise.any()`】

`any()` 可以理解成：

> **只要有一个成功，我就成功。**

例如：

```js
Promise.any([
  Promise.reject('A失败'),
  Promise.resolve('B成功'),
  Promise.resolve('C成功')
])
```

最终：

```text
fulfilled
value = B成功
```

即使 A 先失败：

```text
A rejected
↓
继续等待
```

不会立刻结束。

直到：

```text
B fulfilled
↓
Promise.any fulfilled
```

所以：

```text
race
→ 第一个结束

any
→ 第一个成功
```

这是二者最重要的区别。

ECMAScript 明确将 `Promise.any` 定义为在某个输入 fulfilled 时短路；如果所有输入都 rejected，则最终以 `AggregateError` rejected。[[1]](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)

例如：

```js
Promise.any([
  Promise.reject('A'),
  Promise.reject('B'),
  Promise.reject('C')
])
.catch(error => {
  console.log(error)
})
```

此时三个都失败：

```text
A rejected
B rejected
C rejected
↓
已经没有成功可能
↓
Promise.any rejected
↓
AggregateError
```

之所以使用 `AggregateError`，是因为这里需要表示：

> **多个 Promise 的失败结果共同导致了最终失败。**

---
### 【为什么普通值也可以传进去？】

例如：

```js
Promise.all([
  Promise.resolve(1),
  2,
  Promise.resolve(3)
])
```

最终可以得到：

```js
[1, 2, 3]
```

因为这些 Promise 组合方法并不要求 iterable 中的每一项原本都是 Promise。

规范算法会获取构造器的 Promise resolve 方法，然后对每个输入元素进行统一处理。[[2]](https://tc39.es/ecma262/2026/multipage/)

面试时可以简单理解成类似：

```js
Promise.resolve(item)
```

所以：

```js
2
```

可以被视为：

```js
Promise.resolve(2)
```

thenable 同样可以按照 Promise resolution 机制被处理。

因此：

```text
普通值、Promise、thenable
```

都能够作为这些组合方法的输入。

---
### 【四个方法怎么选？】

最容易记的是看**你到底在等什么**：

```text
我要等所有任务都成功
→ Promise.all
```

```text
我要知道所有任务最终怎么样
不在乎其中是否失败
→ Promise.allSettled
```

```text
我只关心谁最先结束
成功失败都接受
→ Promise.race
```

```text
我只需要最快的一个成功结果
前面的失败可以忽略
→ Promise.any
```

对应题目中的四个场景：

| 场景 | 选择 |
|---|---|
| 页面初始化必须等 3 个接口全部成功 | `Promise.all()` |
| 上传 10 个文件，要统计每一个成功/失败 | `Promise.allSettled()` |
| 主服务和备用服务谁先 settled 就采用谁 | `Promise.race()` |
| 多个镜像节点，只要一个成功即可 | `Promise.any()` |

这里要特别注意第三个场景。

如果业务真正想表达的是：

> “即使最快的服务失败了，也继续等另一个成功服务。”

那就不应该使用 `race()`，而应该使用：

```js
Promise.any()
```

---
### 【最终面试收敛回答】

> **`Promise.all`、`allSettled`、`race` 和 `any` 都用于组合多个异步结果。`Promise.all` 要求所有任务都 fulfilled，只要一个 rejected 就整体 rejected，而且成功结果按照输入顺序返回；`Promise.allSettled` 会等待所有任务都结束，并返回每项的成功或失败状态，适合允许部分失败的批量任务；`Promise.race` 采用第一个 settled 的结果，因此第一个完成的任务无论成功还是失败都会决定最终状态；`Promise.any` 则采用第一个 fulfilled 的结果，会忽略前面的失败，只有全部 rejected 时才以 `AggregateError` 失败。可以简单记成：all 是“全部成功”，allSettled 是“全部结束”，race 是“第一个结束”，any 是“第一个成功”。** [[1]](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)

## 3. 参考文献

[1] [ECMAScript® 2026 Language Specification](<https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html>)[EB/OL].

[2] [TC39](<https://tc39.es/ecma262/2026/multipage/>)[EB/OL].
