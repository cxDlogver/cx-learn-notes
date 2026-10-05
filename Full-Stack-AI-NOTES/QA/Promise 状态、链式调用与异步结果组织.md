# Promise 状态、链式调用与异步结果组织

## 【知识概述】

**Promise 表示一个异步结果最终如何确定，链式调用让后续处理和错误传播形成连续结构；它不会把异步工作变成同步执行。**

Promise 是 JavaScript 用来处理异步结果的核心抽象。按照 ECMAScript 的定义，**Promise 是一个表示延迟计算最终结果的对象**。所以更准确地说，Promise 不是“异步任务本身”，而是对一个现在可能还没有得到、未来才会确定的结果进行封装。[[1]](https://tc39.es/ecma262/multipage/control-abstraction-objects.html)

此时用户数据可能还没有回来，但 `promise` 已经可以代表这个未来结果。

ECMAScript 规范明确规定 Promise 有且只有这三个互斥状态。[[1]](https://tc39.es/ecma262/multipage/control-abstraction-objects.html)

理解这组机制，可以沿以下主线展开：

先区分 pending、fulfilled、rejected 与结果采用过程

沿 then 回调的返回值、抛错和返回 Promise 解释新 Promise 的状态

再说明 catch、finally 和 async、await 如何利用同一机制。

resolved 不完全等同 fulfilled；Promise executor 同步执行，反应回调异步调度，错误恢复还取决于处理器返回值。相关完整知识可结合 [前端异步编程](<../Q-前端异步编程.md>) 阅读。

## 1. 机制说明与工程判断

### 【Promise 是“未来结果”的抽象】

- ECMAScript 将 Promise 定义为一个对象，用来表示某个延迟计算最终产生的结果。
- Promise 本身不是“异步任务”的同义词，而是对异步或延迟结果进行统一表示和组合的机制。[[1]](https://tc39.es/ecma262/multipage/control-abstraction-objects.html)
### 【Promise 有三种状态】

- `pending`：尚未确定最终结果。
- `fulfilled`：操作成功完成，并具有 fulfillment value。
- `rejected`：操作失败，并具有 rejection reason。
- `fulfilled` 和 `rejected` 统称 `settled`。[[1]](https://tc39.es/ecma262/multipage/control-abstraction-objects.html)
### 【状态一旦 settled 就不会再次改变】

```text
pending → fulfilled
pending → rejected
```
一旦进入 `fulfilled` 或 `rejected`，后续再次尝试改变结果不会产生作用。[[1]](https://tc39.es/ecma262/multipage/control-abstraction-objects.html)
### 【注意：resolved 不完全等于 fulfilled】

- 调用 `resolve(value)` 时，如果 `value` 是普通值，通常最终会 fulfilled。
- 如果 `value` 是另一个 Promise 或 thenable，当前 Promise 会采用它的最终状态。
- 因此 Promise 可能已经 **resolved**，但暂时仍然是 `pending`。
- 这是 Promise 高频易错点。[[1]](https://tc39.es/ecma262/multipage/control-abstraction-objects.html)
### 【`then()` 是 Promise 链的核心】

- `then(onFulfilled, onRejected)` 注册结果处理逻辑。
- 每次调用 `then()` 都会创建并返回一个**新的 Promise**。
- 因此才能把多个操作连续组合起来。ECMAScript 的 `Promise.prototype.then` 明确会创建新的 Promise capability，并返回其 Promise。[[2]](https://tc39.es/ecma262/pr/3770/multipage/control-abstraction-objects.html)
### 【`then()` 回调的返回结果决定新 Promise】

- 返回普通值 → 后续 Promise 通常以该值 fulfilled。
- 抛出异常 → 后续 Promise rejected。
- 返回 Promise/thenable → 后续 Promise 采用其最终结果。
### 【`catch()`】

- 本质上相当于：
  ```js
  promise.then(undefined, onRejected)
  ```
- 用于处理 Promise 链中的 rejection。[[2]](https://tc39.es/ecma262/pr/3770/multipage/control-abstraction-objects.html)
### 【`finally()`】

- 无论前一个 Promise fulfilled 还是 rejected，都会执行收尾逻辑。
- 常用于清理状态，例如关闭 loading。
- 正常情况下不会把前面的成功值或失败原因替换掉；如果 `finally` 自己抛错或产生 rejected Promise，则会影响后续结果。[[2]](https://tc39.es/ecma262/pr/3770/multipage/control-abstraction-objects.html)
### 【Promise 没有把异步变成同步】

- Promise 改变的是**异步结果的表达和组合方式**。
- 它让成功处理、失败传播和多步骤异步流程有统一模型。
### 【`async/await` 建立在 Promise 机制之上】

 - `async` 函数使用 Promise 表达最终完成结果。
 - `await` 会暂停当前 async 函数的后续执行，等待对应结果后再恢复，而不是阻塞整个 JavaScript 执行线程。[[3]](https://tc39.es/ecma262/2025/multipage/control-abstraction-objects.html)

## 2. 完整回答与表达组织

Promise 是 JavaScript 用来处理异步结果的核心抽象。按照 ECMAScript 的定义，**Promise 是一个表示延迟计算最终结果的对象**。所以更准确地说，Promise 不是“异步任务本身”，而是对一个现在可能还没有得到、未来才会确定的结果进行封装。[[1]](https://tc39.es/ecma262/multipage/control-abstraction-objects.html)
### 【Promise 为什么会出现？】

传统异步操作可以通过回调函数处理。

例如有三个依赖关系：

```text
获取用户
↓
根据用户获取订单
↓
根据订单获取详情
```

使用嵌套回调可能写成：

```js
getUser(function (user) {
  getOrders(user.id, function (orders) {
    getDetail(orders[0].id, function (detail) {
      console.log(detail)
    })
  })
})
```

当异步步骤越来越多时：

```text
Callback
└─ Callback
   └─ Callback
      └─ Callback
```

容易出现几个问题：

```text
嵌套越来越深、控制流程不直观、错误处理容易分散、多个异步操作不容易组合
```

Promise 提供了一套统一的：

```text
结果表示 + 状态管理 + 结果传递 + 错误传播
```

机制，使异步流程可以从“嵌套回调”转变成更容易组合的链式结构。

---
### 【Promise 到底是什么？】

可以把 Promise 理解成：

> **现在先拿到一个对象，这个对象代表未来会确定的结果。**

例如：

```js
const promise = getUser()
```

此时用户数据可能还没有回来，但 `promise` 已经可以代表这个未来结果。

整个过程可以理解为：

```text
Promise
│
├─ 结果还没确定
│   → pending
│
├─ 最终成功
│   → fulfilled
│
└─ 最终失败
    → rejected
```

ECMAScript 规范明确规定 Promise 有且只有这三个互斥状态。[[1]](https://tc39.es/ecma262/multipage/control-abstraction-objects.html)

---
### 【Promise 的三种状态】

Promise 初始通常处于：

```text
pending
```

后续可能变成：

```text
pending
↓
fulfilled
```

表示成功。

或者：

```text
pending
↓
rejected
```

表示失败。

其中：

```text
fulfilled
+
rejected
=
settled
```

一旦 Promise 已经 settled，最终结果就确定了。

因此不能：

```text
fulfilled
↓
rejected
```

也不能：

```text
rejected
↓
fulfilled
```

对已经确定结果的 Promise 再进行 resolve 或 reject，不会再次修改它的最终结果。[[1]](https://tc39.es/ecma262/multipage/control-abstraction-objects.html)

---
### 【`resolve()` 和 `reject()` 怎么理解？】

创建 Promise：

```js
const p = new Promise((resolve, reject) => {
  // ...
})
```

如果操作失败，可以：

```js
reject(error)
```

让 Promise 以对应的失败原因进入 rejected 状态。

但 `resolve()` 有一个很容易答错的地方：

> **调用 `resolve()` 不一定等于“立即 fulfilled”。**

例如：

```js
const p1 = new Promise(resolve => {
  resolve(100)
})
```

这里传进去的是普通值，所以最终得到：

```text
fulfilled
value = 100
```

但如果：

```js
const p2 = new Promise(resolve => {
  resolve(otherPromise)
})
```

那么 `p2` 会采用 `otherPromise` 的最终结果。

因此可能出现：

```text
p2 已经 resolved
↓
otherPromise 仍然 pending
↓
p2 暂时仍然 pending
```

所以严格区分：

```text
resolved
≠
一定已经 fulfilled
```

Promise 的 `resolved` 和三种状态并不是完全相同的概念。[[1]](https://tc39.es/ecma262/multipage/control-abstraction-objects.html)

这是 Promise 面试中比较重要的加分点。

---
### 【`then()` 为什么可以链式调用？】

例如：

```js
getUser()
  .then(user => getOrders(user.id))
  .then(orders => getDetail(orders[0].id))
  .then(detail => {
    console.log(detail)
  })
```

关键不是“`then` 可以一直写”。

真正的原因是：

> **每次调用 `then()` 都会返回一个新的 Promise。**

规范中的逻辑可以概念化成：

```text
Promise1
↓
then()
↓
创建 Promise2
↓
返回 Promise2
↓
then()
↓
创建 Promise3
↓
返回 Promise3
```

因此才形成：

```text
Promise1
  ↓
Promise2
  ↓
Promise3
  ↓
Promise4
```

ECMAScript 对 `Promise.prototype.then()` 的定义明确会为结果创建新的 Promise capability，然后返回对应的新 Promise。[[2]](https://tc39.es/ecma262/pr/3770/multipage/control-abstraction-objects.html)

所以：

```js
const p2 = p1.then(fn)
```

通常：

```js
p1 !== p2
```

---
### 【`then()` 返回什么，会发生什么？】

这是理解 Promise 链的核心。

假设：

```js
const p2 = p1.then(value => {
  return ???
})
```

主要有三种情况。

**第一种：返回普通值**

```js
p1.then(() => {
  return 100
})
```

新的 Promise 最终会得到：

```text
fulfilled
value = 100
```

于是：

```js
Promise.resolve()
  .then(() => 100)
  .then(value => {
    console.log(value) // 100
  })
```

---

**第二种：抛出异常**

```js
Promise.resolve()
  .then(() => {
    throw new Error('失败')
  })
```

新 Promise 会变成 rejected：

```text
throw Error
↓
新的 Promise rejected
↓
后续 rejection handler / catch 可以处理
```

因此：

```js
Promise.resolve()
  .then(() => {
    throw new Error('失败')
  })
  .catch(error => {
    console.log(error)
  })
```

---

**第三种：返回另一个 Promise**

```js
getUser()
  .then(user => {
    return getOrders(user.id)
  })
  .then(orders => {
    console.log(orders)
  })
```

后一个 Promise 会采用返回 Promise 的最终结果。

因此：

```text
获取用户
↓
等待用户结果
↓
获取订单
↓
等待订单结果
↓
继续下一步
```

这就是为什么 Promise 可以非常自然地表达**存在依赖关系的异步操作**。

---
### 【`then()`、`catch()`、`finally()` 怎么区分？】

最简单可以记：

```text
then
→ 处理结果并继续链式转换

catch
→ 处理 rejected

finally
→ 无论成功失败都执行收尾逻辑
```

例如：

```js
showLoading()

request()
  .then(data => {
    render(data)
  })
  .catch(error => {
    showError(error)
  })
  .finally(() => {
    hideLoading()
  })
```

其中 `catch(onRejected)` 在规范上相当于：

```js
then(undefined, onRejected)
```

[[2]](https://tc39.es/ecma262/pr/3770/multipage/control-abstraction-objects.html)

`finally()` 更适合：

```text
关闭 loading、释放资源、恢复按钮状态
```

因为这些操作通常不关心前面到底成功还是失败。

---
### 【Promise 有没有把异步变成同步？】

**没有。**

例如：

```js
console.log(1)

Promise.resolve().then(() => {
  console.log(2)
})

console.log(3)
```

Promise 没有把异步流程变成：

```text
1
2
3
```

Promise 解决的是：

> **如何表示、组合和传递异步操作的结果。**

所以不要回答：

> “Promise 可以把异步代码变成同步代码。”

更准确的说法是：

> **Promise 没有改变异步执行本身，而是提供了一套结构化的异步结果管理机制。**

至于 `then()` 回调具体什么时候执行，属于下一层 **Promise Job / 微任务 / Event Loop** 的知识点，可以之后再展开。

---
### 【Callback、Promise、async/await 是什么关系？】

可以理解为三种不同层次的异步代码组织方式。

最基础的是：

```text
Callback
```

例如：

```js
request(result => {
  // 处理结果
})
```

能解决问题，但是多层依赖容易嵌套。

之后出现 Promise：

```text
Callback
↓
Promise
```

将异步结果对象化：

```js
request()
  .then(...)
  .then(...)
  .catch(...)
```

使结果组合和错误传播更加统一。

再往上：

```text
Promise
↓
async / await
```

例如：

```js
async function load() {
  const user = await getUser()
  const orders = await getOrders(user.id)
  const detail = await getDetail(orders[0].id)

  return detail
}
```

它看起来更加接近：

```text
先做 A、再做 B、再做 C
```

但是：

> **`async/await` 并没有取代 Promise，它建立在 Promise 机制之上。**

ECMAScript 对 async function 的执行就是通过 Promise capability 表示其最终结果；`await` 则会暂停当前 async function 的执行，并在等待的结果完成后恢复，而不是阻塞整个执行线程。[[3]](https://tc39.es/ecma262/2025/multipage/control-abstraction-objects.html)

所以三者可以收敛为：

```text
Callback
→ 用函数接收未来结果

Promise
→ 把未来结果对象化、可组合化

async / await
→ 用更接近同步流程的语法组织 Promise
```
### 【面试收敛回答】

> **Promise 是 JavaScript 用来表示延迟或异步操作最终结果的对象。它有 pending、fulfilled 和 rejected 三种状态，一旦进入 fulfilled 或 rejected，最终状态就不会再次改变。Promise 最核心的能力是统一表示成功和失败结果，并通过 `then()` 进行链式组合；每次调用 `then()` 都会返回一个新的 Promise，而回调函数的返回值、抛出的异常或返回的另一个 Promise 会决定这个新 Promise 的结果。`catch()` 用于处理 rejection，`finally()` 用于执行与成功失败无关的收尾逻辑。Promise 并没有把异步变成同步，它解决的是异步结果的表示、组合和错误传播问题；`async/await` 则建立在 Promise 机制之上，用更接近同步流程的语法来组织异步代码。** [[1]](https://tc39.es/ecma262/multipage/control-abstraction-objects.html)

## 3. 参考文献

[1] [ECMAScript® 2027 Language Specification](<https://tc39.es/ecma262/multipage/control-abstraction-objects.html>)[EB/OL].

[2] [TC39](<https://tc39.es/ecma262/pr/3770/multipage/control-abstraction-objects.html>)[EB/OL].

[3] [TC39](<https://tc39.es/ecma262/2025/multipage/control-abstraction-objects.html>)[EB/OL].
