---
categories:
  - 前端核心原理知识进阶
---

# 前端异步编程

## 0.目标

- 理解异步编程的演变：从回调（callback）到 Promise，再到 async，了解不同阶段异步任务的处理方式。    
- 了解 Promise A+ 规范：掌握 Promise A+ 规范，能够清晰阐述其细节和关键特性。    
- 能实现简单版 Promise：熟悉发布订阅模式，理解 Promise 执行机制，并能手写实现一个简易版本的 Promise。
-  深入理解异步处理机制：深入掌握 Promise 的原理，理解 async 的实现细节，了解 generator（生成器）相关的特性与应用。
- 手写实现完整 Promise：从零开始完整实现 Promise，并能够通过 Promise A+ 规范进行测试。

### 补充资料

- Chromium V8 Promise 源码：https://chromium.googlesource.com/v8/v8/+/refs/tags/12.6.236/src/builtins/promise-jobs.tq
- Promise A+ 规范：https://promisesaplus.com/
- Promise A+ 测试：https://github.com/promises-aplus/promises-tests
- 老版 Promise 实现：https://github.com/tj/co
- async 实现：https://dev.to/gsarciotto/implementing-async-await-55f
- redux-saga 使用 generator：https://github.com/redux-saga/redux-saga/blob/9a6210bf891d3d74d4bab8d0f55c171e3c68355e/examples/async/src/sagas/index.js#L12

#### **相关面试题**

####  Promise

答案：见前面完整代码实现部分。

#### 如何解决 Promise 地狱问题

所谓的 `Promise` 地狱，通常指的是代码中存在多层嵌套的 `Promise` 调用，这种情况会使代码难以理解和维护。

解决 `Promise` 地狱的常见方法包括：

- 链式调用：利用 `Promise` 的 `.then()` 方法可以返回另一个 `Promise`，通过链式调用避免深层嵌套。
- 异步函数 `async/await`：使用 ES2017 引入的 `async` 和 `await` 语法可以让异步代码看起来像同步代码，极大提高可读性和可维护性。使用 `async` 标记的函数总是返回一个 `Promise`，而 `await` 关键字可以暂停 `async` 函数的执行，等待 `Promise` 决议。

#### Promise.all 和 Promise.race 的区别

- `Promise.all`：接受一个 `Promise` 数组，只有当所有 `Promise` 都变成 `fulfilled` 状态时，返回的 `Promise` 才会 `fulfilled`，并将结果数组传递给处理函数。如果任意一个输入 `Promise` 变成 `rejected`，返回的 `Promise` 立即 `rejected`，失败原因为第一个失败的 `Promise` 结果。
- `Promise.race`：同样接受 `Promise` 数组，返回的 `Promise` 状态由**第一个改变状态**的输入 `Promise` 决定。任何一个 `Promise` 先变成 `fulfilled` 或 `rejected`，返回的 `Promise` 立即变成相同状态，并以那个 `Promise` 的结果作为返回值。

#### 实现异步调度器 Scheduler

实现一个带并发限制的异步调度器 `Scheduler`，保证同时运行的任务最多有 N 个。

```js
class Scheduler {
  add(promiseCreator) { ... }
}

const timeout = (time) => new Promise(resolve => {
  setTimeout(resolve, time)
})

const scheduler = new Scheduler(n)
const addTask = (time, order) => {
  scheduler.add(() => timeout(time)).then(() => console.log(order))
}

addTask(1000, '1')
addTask(500, '2')
addTask(300, '3')
addTask(400, '4')

// 打印顺序：2 3 1 4
```

##### 流程分析

1. 起始任务 1、2 开始执行。
2. 500ms 时，任务 2 执行完毕，输出 2，任务 3 开始执行。
3. 800ms 时，任务 3 执行完毕，输出 3，任务 4 开始执行。
4. 1000ms 时，任务 1 执行完毕，输出 1，此时只剩任务 4 在执行。
5. 1200ms 时，任务 4 执行完毕，输出 4。

当资源不足时将任务加入等待队列，当资源空闲时从等待队列取出任务执行。

##### 完整实现

```js
class Scheduler {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.queue = [];
  }

  async add(promiseCreator) {
    if (this.count >= this.max) {
      await new Promise((resolve) => this.queue.push(resolve));
    }

    this.count++;
    const res = await promiseCreator();
    this.count--;

    if (this.queue.length) {
      this.queue.shift()();
    }

    return res;
  }
}

const timeout = (time) =>
  new Promise(resolve => {
    setTimeout(resolve, time);
  });

// 示例使用
const scheduler = new Scheduler(2);

const addTask = (time, order) => {
  scheduler.add(() => timeout(time))
    .then(() => console.log(order));
};

addTask(1000, '1');
addTask(500, '2');
addTask(300, '3');
addTask(400, '4');

// 输出：2 3 1 4
```

## 1.从 `Promise` 到 `Async`和`await`

> [NodeJS核心总结 - 相](https://cxdlogver.github.io/2025/12/17/前端学习/NodeJS核心总结/#Promise核心总结)
>
> [异步编程 – 李立超 | lilichao.com](https://lilichao.com/?p=6460)
>
> [03_Promise介绍_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1qN4y1A7jM?spm_id_from=333.788.videopod.episodes&vd_source=ff414aaf189e3a685358d2a984fd4742&p=3)

推荐B站李立超老师的教学视频和笔记，重点突出且内容精简，已针对老师视频和资料做了详细的总结。

---

1. 为什么要引入Promise？
2. 如何理解Promise？
3. 什么是微任务与宏任务？
4. async 和 await 的原理和作用是什么？

<font color='#409eff'>面试模板：</font>

**Promise 是 ES6 引入的一个构造函数，用来解决传统异步编程中回调地狱、回调嵌套等问题。**它本质上是一个对象，用来**存储异步操作的结果**，并提供链式调用和统一的错误处理能力。在传统回调方式中，如果多个异步操作相互依赖，我们需要层层嵌套回调，代码结构混乱，可读性差，异常处理也分散，不易维护。而 Promise 的出现就是为了解决这些问题。

存储数据时，在Promise中维护着两个隐藏的值PromiseResult和PromiseState，PromiseResult是Promise中真正存储值的地方，在Promise中无论是通过resolve、reject还是报错时的异常信息都会存储到PromiseResult中。PromiseState用来表示Promise中值的状态，Promise一共有三种状态：pending、fulfilled、rejected。pending是Promise的初始化状态，此时Promise中没有任何值。fulfilled是Promise的完成状态，此时表示值已经正常存储到了Promise中（通过resolve）。rejected表示拒绝，此时表示值是通过reject存储的或是执行时出现了错误。<font color='#409eff'>异步任务完成后，通过调用 `resolve` 或 `reject` 将结果“写入” Promise 对象，而不是通过回调函数“传出”。</font>

调用数据时，使用 `.then()` 可以注册回调函数，用于处理 `resolve` 或 `reject` 的结果。每次调用 `.then()` 都会返回一个**新的 Promise**，并把上一个回调的返回结果继续向下传递，实现**链式调用**，避免了回调嵌套。`.catch()` 方法用于统一捕获 Promise 中的异常，不再需要在每一步都处理错误。当我们调用Promise的then方法时，相当于为Promise设置了一个回调函数，换句话说，<font color='#409eff'>then中的回调函数不会立即执行，而是在Promise的PromiseState发生变化时才会执行</font>。如果PromiseState从pending变成了fulfilled则then的第一个回调函数执行，且PromiseResult的值作为参数传递给回调函数。如果PromiseState从pending变成了rejected则then的第二个回调函数执行，且PromiseResult的值作为参数传递给回调函数。

最终解决问题：

- **回调地狱** → 通过链式调用让逻辑扁平化
- **错误分散** → 通过 `.catch()` 实现集中错误处理
- **结果不可直接返回** → 通过 `resolve()` 封装返回值，延迟处理
- **可组合性差** → Promise 提供 `Promise.all()`、`Promise.race()` 等组合方法来管理多个异步任务

---

### 1.Promise的引入

**Promise 在 JavaScript 中用于实现异步编程？**

Promise、Microtask 与 async / await 属于 JavaScript 异步控制流；当这些机制运行在 Node.js 中时，Event Loop、异步 I/O、Worker Thread 与 Process 的 Runtime 边界继续参考 [Node.js Runtime 完整知识体系](./N-NodeJS核心总结.md)。

在 JavaScript 中，**异步编程**是为了解决**单线程模型下的耗时操作阻塞主线程**的问题。

JavaScript 本身是**单线程执行**的，所有代码默认是同步执行的。如果将网络请求、文件读取、定时器等**耗时操作**都以同步方式执行，会直接阻塞主线程，导致页面卡顿甚至失去响应。

与JAVA等语言通过多线程的方式不同，为了解决这个问题，JavaScript 采用了**异步机制**：

- 将耗时任务**交给宿主环境（如浏览器或 Node.js）中的异步 API 执行**
- 当异步操作完成后，宿主环境会把对应的回调任务**以事件的形式放入任务队列**
- JavaScript 主线程通过事件循环机制，在合适的时机取出这些任务并执行回调函数

这就是 JavaScript 异步执行的基本原理，例如：`setTimeout` 的异步任务由**宿主环境执行**，计时完成后，宿主环境将**回调函数作为一个宏任务放入任务队列**；当 JS 主线程空闲时，事件循环机制会将该回调函数取出并压入调用栈执行。

**最早的异步方案：回调函数**

JavaScript 最早通过**回调函数（callback）**来处理异步操作：在发起异步任务时传入一个回调函数，等任务完成后再调用该回调处理结果。

但回调方式存在明显缺陷：

1. 多层异步嵌套会形成“**回调地狱**”，代码结构混乱、可读性差
2. 错误处理分散在各个回调中，难以统一管理
3. 异步流程不直观，不利于维护和扩展

**Promise 的作用**

为了解决回调函数的问题，ES6 引入了 **Promise**。

**Promise 本质上是一个用于描述“异步操作最终结果”的对象**，它有三种状态：

- `pending`（进行中）
- `fulfilled`（已成功）
- `rejected`（已失败）

Promise 的核心价值在于：

1. **支持链式调用**（`then` / `catch`），避免回调地狱
2. **统一错误处理**，异常可以沿链向下传递
3. **使异步流程更清晰**，逻辑结构更接近同步代码
4. 为 `async / await` 提供了基础能力

**总结一句话**

JavaScript 的异步编程是通过将耗时任务交给宿主环境执行、再通过事件机制回到主线程完成的；Promise 通过<font color='#409eff'>状态管理</font>和<font color='#409eff'>链式调用</font>，解决了回调函数在可读性、错误处理和维护性上的问题，是现代 JavaScript 异步编程的核心基础。

### 2.Promise介绍 

#### 【状态管理】

首先要明确一点：**Promise 本质上也是一个对象**，它的作用是用来“保存数据”。
 那它和普通对象（比如 `{}`、`Map`）有什么本质区别？

区别不在于“能不能存数据”，而在于——**Promise 专门用来存储「异步任务的结果」**。

**异步任务有一个天然的问题：结果不是立即产生的，而是在未来某个时间点才会出现。**因此，异步任务在设计上必须依赖**回调函数**来“通知结果已经产生”。

这样的回调函数再Promise中有两个，`resolve`表示任务成功时的回调，`reject` 表示失败时的回调，最原始的异步模型大致是这样的。

```js
function AsynchronousFunction(resolve, reject) {
    setTimeout(() => {
        resolve('哈哈')
    }, 10000)
}

AsynchronousFunction((args)=>{
    console.log(args)
}, (args)=>{
    console.log(args)
})
```

这里的 `AsynchronousFunction` 并不是返回结果，而是**在未来的某个时间点主动调用回调函数**。

在 Promise 中，`resolve` 和 `reject` **不再负责“打印结果”或“立刻处理结果”**，
 而是负责——**把结果保存到 Promise 对象内部**。

因此，异步函数不再是我们自己调用的函数，而是作为 **Promise 构造函数的参数**：

```
const promise = new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve("哈哈")
    }, 10000)
})
```

这段代码里有两个非常重要的点：

1. `new Promise(...)` 会**立刻执行**传入的函数
2. 异步任务在这个函数内部执行，结果通过 `resolve / reject` 存入 Promise

此时，Promise 对象已经创建完成了，但异步任务还没有结束。

```js
const promise = new Promise((resolve, reject)=>{
    setTimeout(() => {
        resolve("哈哈")
    }, 10000)
})

console.log(promise) // PromiseState = 'pending', PromiseResult = 'undefined'
```

如果我们立刻读取这个 Promise是读不到结果的。原因是数据还没回来。这个时候我们就需要<font color='#409eff'>promise告诉我们任务是否结束</font>，也就是当前的状态，这里就引出了 Promise 的第一个核心能力：**状态管理**。

Promise 内部维护了两个“隐藏属性”：

- `PromiseState`：表示当前状态
- `PromiseResult`：真正存储数据的位置

Promise 一共有三种状态：

- `pending`：初始状态，异步任务尚未完成
- `fulfilled`：任务成功完成，数据通过 `resolve` 存入
- `rejected`：任务失败或抛出异常，数据通过 `reject` 或错误存入

状态变化只有一种方向：

```js
pending → fulfilled
pending → rejected
```

**一旦状态发生变化，就不可逆转**。
 这也意味着：

- `resolve` 和 `reject` 只能有一个生效
- 且只能执行一次

当异步任务完成后，Promise 内部会变成：

```js
const promise = new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve("哈哈")
    }, 10000)
})

setTimeout(() => {
    console.log(promise)
    // PromiseState: "fulfilled"
    // PromiseResult: "哈哈"
}, 11000)
```

问题到这里就变成了：

***既然不能同步读取 PromiseResult，那怎么才能在“合适的时机”拿到结果？***

答案就是：`then`。

`then` 是 Promise 的实例方法，用来**注册“当状态发生变化后要执行的回调函数”**。

- 当 Promise 变为 `fulfilled` 时，执行第一个回调
- 当 Promise 变为 `rejected` 时，执行第二个回调

```js
const promise = new Promise((resolve, reject) => {
    setTimeout(() => {
        reject("哈哈")
    }, 10000)
})

promise.then(
    (data) => {
        console.log(data)
    },
    (err) => {
        console.log("出错了", err)
    }
)
```

这里的关键不是“then 能拿到数据”，而是**then 会被 Promise 主动调用，而不是我们去“轮询”Promise 的状态。**

这也是 Promise 相比定时器、回调嵌套最大的进步。

在实际开发中，为了让错误处理更集中，通常会使用 `catch`：

```js
promise
    .then((data) => {
        console.log(data)
    })
    .catch((err) => {
        console.log("出错了", err)
    })
```

`catch` 本质上只关心 `rejected` 状态。

此外，Promise 还提供了 `finally` 方法：

```js
promise.finally(() => {
    console.log("无论成功还是失败都会执行")
})
```

`finally` 不接收结果参数，也不区分状态，它只关心一件事：**这个异步任务“结束了”。**

#### 【链式调用】

到这里我们已经知道，Promise 的核心作用是：
 **通过状态管理，在合适的时间点取到异步任务的结果**。

但仅仅能“取到结果”还不够。真实开发中，异步任务往往不是一步，而是**多个异步步骤顺序执行**，并且要求：

1. 上一步的结果作为下一步的输入
2. 错误能够统一处理
3. 代码不能层层嵌套形成“回调地狱”

这正是 Promise 的**链式调用**要解决的问题。

那么，什么是链式调用？

从语法角度看，链式调用并不神秘，它只依赖一个条件：**一个对象的方法，返回的还是一个对象，并且这个对象也具有相同的方法。**

例如：

```js
object.method1().method2().method3()
```

只要 `method1` 的返回值仍然是一个拥有 `method2` 的对象，这个链条就可以一直写下去。

如果某个方法返回的还是同一个对象实例，那么形式可能变成：

```js
object.method1().method1().method1()
```

而 Promise 的 `then`，正是基于这种思想设计的。

关键结论是：**每一次 `then` 执行，都会返回一个全新的 Promise 对象。**

这个新的 Promise 会把 `then` 回调函数的**返回值**作为自己的结果保存起来：

- 如果 `then` 中 **返回普通值**
  → 这个值会被包装成一个“已成功的 Promise”
- 如果 **没有显式 return**
  → 新 Promise 的结果为 `undefined`
- 如果 **返回的是一个 Promise**
  → 新 Promise 会“等待”这个 Promise 的结果

先看一个最直观的例子：

```js
const promise = new Promise((resolve, reject) => {
    resolve("第一步执行结果")
})

const promise2 = promise.then(result => {
    console.log("收到结果：", result)
    return "第二步执行结果"
})

const promise3 = promise2.then(result => {
    console.log("收到结果：", result)
    return "第三步执行结果"
})
```

这里并没有发生什么“魔法”，只是：

1. 第一个 Promise 成功
2. `then` 被触发
3. `then` 返回一个值
4. 这个值被存入**新的 Promise**
5. 下一个 `then` 再从这个新 Promise 中取值

因为 `then` 返回的一定是 Promise，所以这段代码完全可以写成链式形式：

```js
const promise = new Promise((resolve, reject) => {
    resolve("第一步执行结果")
})

promise
    .then(result => {
        console.log("收到结果：", result)
        return "第二步执行结果"
    })
    .then(result => {
        console.log("收到结果：", result)
        return "第三步执行结果"
    })
```

这样写的本质是：**把“嵌套的回调结构”，改造成“值的顺序传递模型”。**

也正因为每一步都只是“返回一个值或 Promise”，代码结构从“向右不断缩进”，变成了“从上到下线性展开”，这就从根本上解决了**回调地狱**的问题。

接下来是另一个关键问题：**错误应该怎么处理？**

如果在每一个 `then` 中都写错误处理代码，不但冗余，而且很难维护。Promise 提供的做法是：**统一在链条末尾使用 `catch`**。

```js
sum(123, 456)
    .then(result => sum(result, 777))
    .then(result => sum(result, 888))
    .then(result => console.log(result))
    .catch(err => {
        console.log("哎呀出错了，随便返回一个吧", 8888)
    })
```

这段代码里有一个非常重要但常被忽略的规则：**只要前面的 Promise 链条处于“正常 fulfilled 状态”，`catch` 就不会执行，将参数不变地封装成一个新的 Promise 并返回。**

也就是说：

- `catch` 只会在**某一步返回 rejected 或抛出异常**时触发
- 一旦进入 `catch`，错误就被“接住”了
- 如果错误被处理并返回一个值，链条仍然可以继续

因此可以这样理解：

- `then` 负责**正常流程的结果传递**
- `catch` 负责**异常流程的集中处理**

Promise 的链式调用，本质上并不是“连续调用函数”，而是**用 Promise 对象，把“异步执行过程”拆分成一段一段可组合的状态转换。**

到这里，Promise 的三个核心能力已经完整闭合：

1. 用状态保存异步结果
2. 用 `then` 实现顺序依赖
3. 用 `catch` 实现统一错误处理

### 3.微任务与 Task

这一节只解释 Promise 为什么通过 Microtask 延续异步结果；浏览器主线程、Event Loop、Rendering Opportunity、requestAnimationFrame、Timer、Long Task、Yield 与 Worker 的完整关系统一参考 [浏览器主线程、Event Loop 与任务调度完整知识体系](./B-浏览器主线程Event Loop与任务调度完整知识体系.md)。

需要先纠正两个常见简化：

- HTML Standard 的正式术语是 Task；“宏任务”主要是社区和面试中的习惯叫法。
- Event Loop 不是“宏任务队列和微任务队列轮流执行”的两个固定队列模型。浏览器还要协调事件、网络、渲染机会等工作。

从 Promise 角度，最重要的链路是：

~~~text
当前 Task 中执行同步 JavaScript
        ↓
Promise 状态发生变化
        ↓
对应 Promise Reaction 被安排为 Microtask
        ↓
当前 Task 结束
        ↓
Microtask Checkpoint
        ↓
持续处理 Microtask，直到当前队列为空
        ↓
浏览器之后继续推进 Rendering Opportunity 或后续 Task
~~~

因此下面代码：

~~~js
setTimeout(() => {
  console.log(1);
}, 0);

Promise.resolve().then(() => {
  console.log(2);
});
~~~

通常输出：

~~~text
2
1
~~~

原因不是“Promise 天生执行速度比 setTimeout 快”，而是二者进入了不同的调度机制：Promise Reaction 属于 Microtask，而 Timer 回调需要等待后续 Task 调度机会。

需要特别注意：

> **Microtask 并不适合拿来拆分长任务。**

如果 Microtask 在执行过程中不断继续创建新的 Microtask，Microtask Checkpoint 会长时间无法结束，后续 Task 和 Rendering Opportunity 同样会被延迟。

Promise 的核心仍然是：

~~~text
异步结果状态
+
Reaction 登记
+
Microtask 延续
~~~

而不是把所有浏览器异步行为都塞进“宏任务 / 微任务”二分法。

进一步阅读：[浏览器事件循环、任务、微任务与渲染时机](./QA/浏览器事件循环、任务、微任务与渲染时机.md)。

### 4.async 和 await

`async` 和 `await` 是 ES2017 引入的基于 Promise 的语法糖，用来以同步的书写方式处理异步操作。被 `async` 修饰的函数会始终返回一个 Promise，当函数返回普通值时会被自动包装成一个已完成状态的 Promise，当函数抛出异常时则会返回一个拒绝状态的 Promise。`await` 只能在 `async` 函数中使用，它会暂停函数的执行，等待其后表达式返回的 Promise 完成，并将完成的值作为返回结果，如果 Promise 被拒绝则会抛出异常，需要用 `try...catch` 来捕获。<font color='#409eff'>即使 `await` 后面不是 Promise，也会被转换成一个已完成的 Promise 再处理。</font>`async/await` 的核心优势是让异步代码看起来像同步代码一样直观，减少回调嵌套和链式 then 带来的可读性问题，同时可以通过 `try...catch` 统一捕获错误，从而让异步逻辑结构更清晰。但它并没有改变 JavaScript 单线程、事件循环的本质，底层依然是通过 Promise 和微任务机制来调度执行的。

#### 【async函数】

async是一个加在函数前的修饰符，用来创建一个异步函数，<span style="color:#409eff">被async定义的函数会默认返回一个Promise对象resolve的值</span>。

因此对async函数可以直接then。

~~~js
// async基础语法
async function fun0(){
    console.log(1);
    return 1;
}
fun0().then(val=>{
    console.log(val) // 1,1
})

// ===> 等价于
function fun0(){
    return new Promise(function(resolve,reject){
        console.log(1);
        resolve(1);
    })
}

async function fun1(){
    console.log('Promise');
    return new Promise(function(resolve,reject){
        resolve('Promise')
    })
}
fun1().then(val => {
    console.log(val); // Promise Promise
}
~~~

#### 【await】

await 也是一个修饰符，只能放在async定义的函数内。可以理解为**等待**。

await 修饰的如果是Promise对象，可以获取Promise中返回的内容（resolve或reject的参数），且取到值后语句才会往下执行；如果不是Promise对象：把这个非promise的东西当做await表达式的结果。

`await expr` 的语义近似是**把 `expr` 先变成 `Promise.resolve(expr)`，然后在它 fulfilled 之后，用 `.then(...)` 继续执行后续代码。**即使 `expr` 是普通值（比如 `1`），也会走一次“异步恢复”（微任务）。

注意事项

- await必须写在async函数中，但是async函数中可以没有await
- 如果await的promise失败了，就会抛出异常，需要通过try...catch捕获处理
- <font color='#409eff'>当我们使用await调用函数后，当前函数后面的所有代码会在当前函数执行完毕以后，被放入到微任务队列中。</font>

#### 【面试题】

~~~js
async function fun(){
    let a = await 1; // 非promise的东西当做await表达式的结果
    let b = await new Promise((resolve,reject)=>{
        setTimeout(function(){
            resolve('setTimeout')
        },3000)  // Promise中返回的内容（resolve或reject的参数）
    })
    let c = await function(){
        return 'function'
    }()
    console.log(a,b,c)
}
// === > 
function fun2() {
  let a, b, c;

  return Promise.resolve(1)                 // await 1
    .then((v) => {
      a = v;
      return new Promise((resolve) => {     // await new Promise(...)
        setTimeout(() => {
          resolve("setTimeout");
        }, 3000);
      });
    })
    .then((v) => {
      b = v;
      return Promise.resolve((function () { // await IIFE
        return "function";
      })());
    })
    .then((v) => {
      c = v;
      console.log(a, b, c);
      // async fun 默认返回 Promise<undefined>
      // 这里不 return 等价于 return undefined，链会 resolve(undefined)
    });
}


fun(); // 3秒后输出： 1 "setTimeout" "function"
~~~

~~~js
aysnc function fn4(){
    console.log(1)
    await console.log(2)
    console.log(3)
}
fn4()
console.log(4)

// =>
function fn4(){
    return new Promise((resolve, reject)=>{
        console.log(1)
        console.log(2)
        resolve()
    }).then((resolve)=>{
        console.log(3)
    })
}
console.log(4)

// 1,2,4,3
~~~

```js
const first = () => (new Promise((resolve, reject) => {
    console.log(3)
    let p = new Promise((resolve, reject) => {
        console.log(7)
        setTimeout(() => {
            console.log(5)
            resolve(6)
        }, 0)
        resolve(1)
    })
    resolve(2)
    p.then((arg) => {
        console.log(arg)
    })

}))
first().then((arg) => {
    console.log(arg)
})
console.log(4)
// 3,7,4,1,2,5
```

### 5. Promise 的静态方法

> [NodeJS核心总结 - 相](https://cxdlogver.github.io/2025/12/17/前端学习/NodeJS核心总结/#【Promise静态方法】)

#### 手写 `Promise.all`

**规则**：

- 全部成功 → resolve 结果数组（保持顺序）
- 任意失败 → 立即 reject

```js
function myPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    const result = [];
    let count = 0;
    const len = promises.length;

    if (len === 0) {
      resolve([]);
      return;
    }

    promises.forEach((p, index) => {
      Promise.resolve(p).then(
        value => {
          result[index] = value;
          count++;
          if (count === len) {
            resolve(result);
          }
        },
        err => {
          reject(err);
        }
      );
    });
  });
}
```

------

#### 手写 `Promise.race`

**规则**：

- 第一个 settled（resolve 或 reject）的结果直接返回

```js
function myPromiseRace(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => {
      Promise.resolve(p).then(resolve, reject);
    });
  });
}
```

```js
Promise.resolve(p).then(resolve, reject);
```

等价于：

```js
Promise.resolve(p).then(
  value => resolve(value),
  error => reject(error)
);
```

意思是：

- **如果 p 成功** → 尝试 `resolve(value)`
- **如果 p 失败** → 尝试 `reject(error)`

------

#### 手写 `Promise.any`

**规则**：

- 任意一个成功 → resolve
- 全部失败 → reject（AggregateError）

```js
function myPromiseAny(promises) {
  return new Promise((resolve, reject) => {
    const errors = [];
    let rejectedCount = 0;
    const len = promises.length;

    if (len === 0) {
      reject(new AggregateError([], "All promises were rejected"));
      return;
    }

    promises.forEach((p, index) => {
      Promise.resolve(p).then(
        value => {
          resolve(value);
        },
        err => {
          errors[index] = err;
          rejectedCount++;
          if (rejectedCount === len) {
            reject(new AggregateError(errors, "All promises were rejected"));
          }
        }
      );
    });
  });
}
```

------

#### 手写 `Promise.allSettled`

**规则**：

- 不关心成功或失败
- 全部结束后返回状态数组

```js
function myPromiseAllSettled(promises) {
  return new Promise(resolve => {
    const result = [];
    let count = 0;
    const len = promises.length;

    if (len === 0) {
      resolve([]);
      return;
    }

    promises.forEach((p, index) => {
      Promise.resolve(p).then(
        value => {
          result[index] = {
            status: "fulfilled",
            value
          };
          count++;
          if (count === len) resolve(result);
        },
        reason => {
          result[index] = {
            status: "rejected",
            reason
          };
          count++;
          if (count === len) resolve(result);
        }
      );
    });
  });
}
```

## 2. `Promise`进阶

- thenable是什么？Promise是满足Promise/A+规范的thenable？
- 什么是Promise/A+？
- generator函数 和 async/await的对比？
- 手写Promise对象？

### 1.Promise/A+规范

Promise A+ 规范详细描述了 JavaScript 中 Promise 的行为标准，确保不同的 Promise 实现可以相互兼容，以下是规范的完整细节梳理。

#### 术语

- **promise**：一个对象或函数，其具有 `then`方法，且行为符合本规范。
- **thenable**：一个具有 `then` 方法的对象或函数。
- **value**：任何合法的 JavaScript 值（包括 `undefined`、一个 thenable、或一个 promise）。
- **exception**：一个使用 `throw` 语句抛出的值。
- **reason**：一个表示 promise 被拒绝的原因。
- **resolve / reject**：把 promise 变为`fulfilled` / `rejected` 的动作。

##### `Promise` 和 `thenable`

**thenable**：任何 **对象或函数**，只要它有一个 `then` 方法（`typeof x.then === 'function'`），就叫 thenable。 它不一定完全符合 Promise/A+ 的全部细则，可能实现得不规范。

**Promise（A+/ES Promise）**：一种特定 thenable（通常也有 `then`），并且满足更严格的行为约束（状态不可逆、回调异步、链式返回、解析过程等）。

##### 术语示例

```javascript
// 符合 thenable 特征的对象
const pr = {
    then: function (onFulfilled, onRejected) {
        onFulfilled("success")
    }
}

async function test() {
    const res = await pr
    console.log(res) // 输出：success
}

// 符合 thenable 特征的函数
const prfn = function(){}
prfn.then = function (onFulfilled, onRejected){
    onFulfilled('success')
}

async function test() {
    const res = await prfn
    console.log(res) // 输出：success
}
```

#### Promise 的三态与不可逆

- 状态只能是以下三种之一：        
  - `pending`（进行中）
  - `fulfilled`（已成功）
  - `rejected`（已失败）
- 状态变更规则：只能从 `pending → fulfilled` 或 `pending → rejected`，一旦变更就不可再变（不可逆、不可二次决议）。
- 状态关联值：`fulfilled` 状态拥有一个不可变的 `value`；`rejected` 状态拥有一个不可变的 `reason`。

#### then 方法的基本要求

`then` 方法是 Promise 规范的核心，其行为必须严格遵循以下要求，也是实现链式调用的基础。

##### 【返回新 promise】

- `promise.then(onFulfilled, onRejected)` 必须返回一个新的 promise，确保链式调用可正常衔接。
- 回调参数非函数时需忽略，实现“穿透”效果：
  - 若 `onFulfilled` 不是函数，相当于 `value => value`（值穿透），直接将上一个 promise 的 `value` 传递给下一个 promise。
  - 若 `onRejected` 不是函数，相当于 `reason => { throw reason }`（错误穿透），直接将上一个 promise 的 `reason` 传递给下一个 promise。

##### 【回调必须异步执行】

- `onFulfilled` 和 `onRejected` 不能在当前同步调用栈立刻执行，而是放到微任务队列中，必须在当前代码执行完毕后异步排队执行。
- 规范未强制异步执行的具体类型（microtask 或 macrotask），但现代 JavaScript 原生 Promise 均将其实现为 microtask（微任务），保证回调执行的可预测性。

##### 【回调最多调用一次】

- 同一个 promise 上，`onFulfilled` 最多被调用一次。
- 同一个 promise 上，`onRejected` 最多被调用一次。
- `onFulfilled` 和 `onRejected` 不会同时被调用。

#### 链式返回值的解析过程

这是 Promise/A+ 规范最核心、最易踩坑的部分：`then` 方法的回调返回值，将直接决定其返回的新 promise（记为 `promise2`）的最终状态。

设 `promise2 = promise1.then(onFulfilled, onRejected)`，根据回调返回值的不同，解析规则如下：

##### 【回调返回普通值 x】

若回调返回的是普通值（非 promise、非 thenable），则 `promise2` 状态变为 `fulfilled`，其 `value` 等于 x。

##### 【回调抛出异常 e】

若回调执行过程中抛出异常 e，则 `promise2` 状态变为 `rejected`，其 `reason` 等于 e。

##### 【回调返回 promise / thenable（x）】

若回调返回的是 promise 或 thenable（x），则 `promise2` 会“展开/吸收”x 的最终状态，即：

- 若 x 状态变为 `fulfilled`，则 `promise2` 状态变为 `fulfilled`，其 `value` 等于 x 的 `value`。
- 若 x 状态变为 `rejected`，则 `promise2` 状态变为 `rejected`，其 `reason` 等于 x 的 `reason`。

##### 【关键安全规则】

为避免逻辑异常或恶意代码影响，解析过程需遵循以下三条安全规则：

###### 自解析禁止

- 含义：若回调返回值 x 等于 `promise2`（即新 promise 自身），则 `promise2` 必须立即变为 `rejected`，且 `reason` 为 TypeError。
- 原因：防止出现逻辑死循环——`promise2` 的状态依赖 x，而 x 就是 `promise2` 自身，相当于“等待自己完成”，永远无法决议。

```JavaScript
let promise2
promise2 = Promise.resolve().then(() => promise2)
// 规范要求：promise2 必须 reject(TypeError)
```

###### thenable 取用只读一次

- 含义：当 x 是对象或函数时，需读取 `x.then` 判断其是否为 thenable，但读取过程需严格执行“只读一次”规则；若读取时抛出异常，`promise2` 直接变为 `rejected`，`reason` 为抛出的异常。
- 原因：防止恶意对象通过 then 的 getter 抛错或产生副作用，同时避免多次读取 `x.then` 导致的行为不一致。

```JavaScript
const x = {
  get then() {
    throw new Error("boom")
  }
}

Promise.resolve().then(() => x)
// 读取 x.then 时抛错 → promise2 必须 reject(Error("boom"))
```

实现要点：通常用以下代码确保只读一次：

```JavaScript
let then;
try {
  then = x.then
} catch (e) {
  reject(e);
  return;
}
```

###### thenable 的 resolve/reject 只能生效一次

- 含义：当调用 `then.call(x, resolveFn, rejectFn)` 吸收 thenable 的状态时，若 thenable 多次调用 `resolveFn` 或 `rejectFn`（如先 resolve 再 reject、多次 resolve），仅第一次调用生效，后续调用全部忽略。
- 原因：Promise 的状态变更具有不可逆性，需保证新 promise 的状态唯一、不可篡改，避免链式调用逻辑混乱。
- 示例：

```JavaScript
const x = {
  then(res, rej) {
    res(1)
    rej(new Error("late reject"))
    res(2)
  }
}

Promise.resolve().then(() => x)
// 结果：promise2 变为 fulfilled(1)，后续的 reject 和 res(2) 均被忽略
```

- 实现要点：通常用 `called` 标记控制调用次数：

```JavaScript
let called = false;
const resolveFn = (y) => {
  if (called) return;
  called = true;
  // 处理 resolve 逻辑
};
const rejectFn = (r) => {
  if (called) return;
  called = true;
  // 处理 reject 逻辑
};
```

#### then 里的 onFulfilled 和 resolve 的关系

`onFulfilled` 和 `resolve` 并非同一概念，但在链式调用中存在前后衔接关系：`onFulfilled` 的返回值，会驱动下一个 promise 的 `resolve` 动作。

##### 两者的定义

- **onFulfilled**：开发者传给 `then` 方法的成功回调函数。作用是当当前 promise 变为 `fulfilled` 时被调用，处理当前 promise 的 `value` 并产生返回值 x。
- **resolve**：某个 promise 的决议函数，用于将该 promise 的状态置为 `fulfilled`：        
  - 在 `new Promise((resolve, reject) => {})` 中，`resolve` 用于决议当前创建的 promise。
  - 在 `then` 方法的实现中，会为其返回的新 promise（promise2）内部创建一对决议函数 `resolve2/reject2`，用于决议 promise2 的状态。

##### 核心关系：onFulfilled 的结果决定 resolve2/reject2 的调用

设 `promise2 = promise1.then(onFulfilled, onRejected)`，当 `promise1` 变为 `fulfilled`时，流程如下：

1. 调用 `onFulfilled(value1)`（value1 是 promise1 的 value），得到返回值 x。
2. 按 Promise/A+ 解析过程处理 x，最终驱动 `resolve2` 或 `reject2` 的调用：        
   1. 若 x 是普通值：调用 `resolve2(x)`，使 promise2 变为 `fulfilled`。
   2. 若 x 抛异常：调用 `reject2(err)`，使 promise2 变为 `rejected`。
   3. 若 x 是 promise/thenable：等待 x 决议完成后，再调用 `resolve2` 或 `reject2`。

总结：`onFulfilled` 是“产生处理结果 x 的函数”，`resolve2` 是“将结果 x 定格到 promise2 上的动作”。

##### 直观类比

- `onFulfilled`：加工函数，负责将上一个 promise 的结果加工成下一个 promise 所需的结果。
- `resolve2`：封装落地动作，负责将加工后的结果写入新的 promise，完成新 promise 的状态决议。

##### 具体示例（值的流动过程）

```javascript
Promise.resolve(1)
  .then(v => v + 1)     // onFulfilled1：返回普通值 2 → 内部调用 resolve2(2)，promise2 变为 fulfilled(2)
  .then(v => Promise.resolve(v * 10)) // onFulfilled2：返回 promise → 吸收其状态，调用 resolve3(20)，promise3 变为 fulfilled(20)
  .then(console.log)    // onFulfilled3：接收 20，打印输出 20
```

##### 常见误解澄清

- `onFulfilled` 不是 `resolve` 的别名。开发者可在 `onFulfilled` 中手动调用某个 `resolve`（如手写 Promise 实现），但这是自定义逻辑，并非规范强制要求。
- `resolve` 的调用场景分为两类：
  - 创建 promise 时手动调用的 `resolve`，用于决议当前创建的 promise。
  - `then` 方法返回的新 promise 内部的 `resolve2`，由回调返回值的解析过程驱动调用。

### 2.`async`与`awiat`进阶

async/await 是 ES7 推出的异步编程语法糖，核心依赖 ES6 的 generator 函数、Promise 及自动执行器，其核心价值是将异步代码“同步化”书写，规避 Promise 链式调用的嵌套问题,async/await 是 `generator 函数 + Promise + 自动执行器` 的语法糖。其功能完全可通过 generator 函数 + 手动执行逻辑实现，async/await 仅帮我们完成了自动化封装，简化了异步代码的编写流程。

#### `generator` 函数

generator 函数是带有 `*` 标记的特殊函数，核心能力是“暂停/恢复”执行，配合 `yield` 关键字和 `next()` 方法实现，关键特性如下：

##### 基础暂停 / 恢复

- `yield` 作为“暂停点”：函数执行到 `yield` 时会暂停，返回一个包含 `value`（yield 后的值）和 `done`（是否执行完毕）的对象。
- `next()` 作为“恢复键”：调用 `next()` 后函数恢复执行，直到遇到下一个 `yield` 或函数结束。
- 函数末尾的 `return` 值，会在最后一次调用 `next()` 时，作为返回对象的 `value`（此时 `done: true`）。

```javascript
function* gen() {
  yield 1;
  yield 2;
  return 3;
}
const g = gen();
console.log(g.next()); // { value: 1, done: false }
console.log(g.next()); // { value: 2, done: false }
console.log(g.next()); // { value: 3, done: true }
```

##### yield 后接函数 / Promise

- yield 后接普通函数：执行到该 yield 时，函数会立即执行，其返回值作为 yield 返回对象的 `value`。
- yield 后接 Promise：yield 返回对象的 `value` 会是该 Promise 实例，需通过 `.then` 手动获取 Promise 结果。

```javascript
// 模拟异步函数
function fn(num) {
  return new Promise(resolve => setTimeout(() => resolve(num * 2), 1000));
}

function* gen() {
  yield fn(1); // value 是 Promise { <pending> }
}
const g = gen();
g.next().value.then(res => console.log(res)); // 2（1秒后）
```

##### next() 传参（核心）

- 第一次调用 `next()`传参无效，因为此时函数尚未执行到第一个 yield 暂停点。
- 从第二次调用 `next(参数)` 开始，传入的参数会作为**上一个 yield 表达式的返回值**。
- 执行顺序：先完成上一个 yield 后续的逻辑，再将传入的参数赋值给上一个 yield 表达式。

```javascript
function* gen() {
  const a = yield 1; // 第二个 next(10) 的 10 赋值给 a
  const b = yield a + 1;
  return b + 1;
}
const g = gen();
console.log(g.next());    // { value: 1, done: false }
console.log(g.next(10));  // { value: 11, done: false } → a=10，yield 10+1=11
console.log(g.next(20));  // { value: 21, done: true } → b=20，return 20+1=21
```

#### async/await vs generator

generator 可模拟异步代码同步化，但需手动调用 `next()` 执行；async/await 本质是“自动化的 generator”，两者核心差异如下：

- **返回值**：generator 函数返回迭代器对象；async 函数返回 Promise 实例。
- **执行方式**：generator 需手动调用 `next()`逐步执行；async 函数自动执行，直至函数结束。
- **异常处理**：generator 需手动捕获异常；async 函数可直接用 `try/catch` 捕获异常。
- **异步结果获取**：generator 需手动处理 Promise 的 `.then/.catch` 获取异步结果；async/await 可自动解析 Promise 结果，直接赋值给 await 后续的变量。

Promise 与 next() 传参结合使用示例

结合 yield 接 Promise 和 next() 传参的特性，可实现异步结果的链式传递，示例如下：

```javascript
function fn(nums) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(nums * 2)
    }, 1000)
  })
}
function* gen() {
  const num1 = yield fn(1)
  const num2 = yield fn(num1)
  const num3 = yield fn(num2)
  return num3
}
const g = gen()
const next1 = g.next()

next1.value.then(res1 => {
  console.log(next1) // 1秒后输出 { value: Promise { 2 }, done: false }
  console.log(res1) // 1秒后输出 2

  const next2 = g.next(res1) // 传入上次的res1
  next2.value.then(res2 => {
    console.log(next2) // 2秒后输出 { value: Promise { 4 }, done: false }
    console.log(res2) // 2秒后输出 4

    const next3 = g.next(res2) // 传入上次的res2
    next3.value.then(res3 => {
      console.log(next3) // 3秒后输出 { value: Promise { 8 }, done: false }
      console.log(res3) // 3秒后输出 8

      // 传入上次的res3，获取最终返回值
      console.log(g.next(res3)) // 3秒后输出 { value: 8, done: true }
    })
  })
})
```

#### 手动实现 async/await：核心逻辑（封装自动执行器）

核心思路：编写一个高阶函数，接收 generator 函数作为参数，返回一个新函数；内部封装自动执行逻辑，完成以下三件事：

- 自动迭代 generator 函数，直至其执行完毕（`done: true`）。
- 解析 yield 后的值（兼容普通值和 Promise），将结果传给下一次 `next()`。
- 捕获执行过程中的异常，最终返回 Promise 实例（对齐 async 函数的返回值特性）。

##### 完整封装代码

```javascript
/**
 * 高阶函数：将generator函数转换为等效的async函数
 * @param {GeneratorFunction} gen - 传入的generator函数
 * @returns {Function} 等效的async函数（返回Promise）
 */
function generatorToAsync(gen) {
  return function(...args) {
    // 最终返回Promise（对齐async函数的返回值）
    return new Promise((resolve, reject) => {
      const g = gen(...args); // 执行generator，得到迭代器

      // 自动执行的核心函数：递归调用next/throw
      function go(key, arg) {
        let res;
        try {
          // 执行next(arg)或throw(err)，获取value和done
          res = g[key](arg);
        } catch (error) {
          // 捕获同步异常，直接reject
          return reject(error);
        }

        const { value, done } = res;
        if (done) {
          // 迭代完成：resolve最终结果（对应async函数的return值）
          return resolve(value);
        } else {
          // 未完成：解析value（兼容普通值/Promise），递归执行
          return Promise.resolve(value).then(
            // Promise成功：将结果传给下一个next
            val => go('next', val),
            // Promise失败：调用throw，让generator内部捕获异常
            err => go('throw', err)
          );
        }
      }

      // 启动第一次执行（无参）
      go('next');
    });
  };
}
```

##### 测试验证（对比原生 async/await）

先定义模拟异步函数，用于后续测试验证：

```javascript
// 模拟异步操作：1秒后返回num*2，负数抛异常
function fn(num) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (num < 0) reject(new Error('num不能为负数'));
      resolve(num * 2);
    }, 1000);
  });
}
```

###### 1. 原生 async/await 写法

```javascript
async function asyncFn() {
  const num1 = await fn(1);
  console.log(num1); // 2（1秒后）
  const num2 = await fn(num1);
  console.log(num2); // 4（2秒后）
  const num3 = await fn(num2);
  console.log(num3); // 8（3秒后）
  return num3;
}
const asyncRes = asyncFn();
console.log(asyncRes); // Promise { <pending> }
asyncRes.then(res => console.log('最终结果:', res)); // 8（3秒后）
```

###### 2. 封装后的 generator 写法

```javascript
// 定义generator函数（逻辑与asyncFn完全一致）
function* gen() {
  const num1 = yield fn(1);
  console.log(num1); // 2（1秒后）
  const num2 = yield fn(num1);
  console.log(num2); // 4（2秒后）
  const num3 = yield fn(num2);
  console.log(num3); // 8（3秒后）
  return num3;
}

// 转换为等效的"async函数"
const genToAsync = generatorToAsync(gen);
const asyncRes = genToAsync();
console.log(asyncRes); // Promise { <pending> }
asyncRes.then(res => console.log('最终结果:', res)); // 8（3秒后）
```

###### 3. 异常处理测试

```javascript
// 原生async/await异常捕获
async function asyncFnError() {
  try {
    const num = await fn(-1);
    console.log(num);
  } catch (err) {
    console.log('捕获异常:', err.message); // 捕获异常: num不能为负数
  }
}
asyncFnError();

// 封装函数的异常捕获
function* genError() {
  try {
    const num = yield fn(-1);
    console.log(num);
  } catch (err) {
    console.log('捕获异常:', err.message); // 捕获异常: num不能为负数
  }
}
const genToAsyncError = generatorToAsync(genError);
genToAsyncError();
```

##### 核心逻辑拆解（go 函数）

`go` 函数是自动执行器的核心，负责迭代 generator 函数、处理 Promise、传递参数、捕获异常，其核心逻辑拆解如下：

- `try/catch` 语句：捕获 generator 函数执行过程中的同步异常（如代码语法错误、逻辑报错等）。
- `g[key](arg)`：根据执行状态，调用 `g.next(arg)`（正常执行）或 `g.throw(err)`（异常执行），获取返回对象中的 `value` 和 `done`。
- `done: true`：generator 函数迭代完成，调用`resolve(value)`，将 generator 函数的最终返回值，作为 Promise 的成功结果。
- `done: false`：generator 函数未执行完毕：        
  - 用 `Promise.resolve(value)` 统一包装 yield 后的值，兼容普通值和 Promise 两种情况。
  - Promise 成功：调用 `go('next', val)`，将 Promise 的成功结果传给下一次 `next()`，作为上一个 yield 表达式的返回值。
  - Promise 失败：调用 `go('throw', err)`，将异常抛出，让 generator 函数内部的 `try/catch` 捕获处理。

##### 总结

- async/await 的本质是 `generator 函数 + 自动执行器` 的语法糖，核心依赖 Promise 处理异步逻辑、generator 实现函数的暂停/恢复。
- 手动实现 async/await 的核心，是封装 `自动执行器（go 函数）`：通过递归调用 `next()`，自动解析 yield 后的 Promise 结果并传递，直至 generator 函数执行完毕。
- async 函数的关键特性（返回 Promise、自动执行、异常捕获），均可通过 generator 函数 + 高阶函数封装实现。

#### await 的机制梳理

`await` 的本质是：将右侧表达式 `x` 先“Promise 化”（即执行 PromiseResolve 过程），再暂停当前 async 函数；等待该 Promise 最终变为 `fulfilled` 时，将其 `value` 作为 `await` 表达式的结果；若 Promise 最终变为 `rejected`，则抛出对应异常。

工程上可通过以下“语义等价”代码理解（概念级，非源码实现）：

```javascript
async function f() {
  const v = await x
}
```

近似等价于：

```javascript
async function f() {
  return Promise.resolve(x).then(
    v => v,          // fulfilled：把成功值当作 await 的结果
    e => { throw e } // rejected：让 await 抛异常
  )
}
```

核心关键点在于 `Promise.resolve(x)`，它定义了 `await` 对不同类型 `x` 的处理规则。

##### 1. await 普通值

当 `x` 不是对象/函数（或不是 thenable）时，`Promise.resolve(x)` 会返回一个立即 `fulfilled` 的 Promise，其 `value` 就是 `x`，因此 `await x` 的结果就是 `x`。

```javascript
const v = await 123 // v === 123
```

##### 2. await Promise

当 `x` 本身就是 Promise 时，`Promise.resolve(x)` 会“跟随”这个 Promise 的最终状态：

- 若 `x` 变为`fulfilled(value)`，则 `await x` 的结果就是 `value`。
- 若 `x` 变为 `rejected(reason)`，则 `await x` 会直接抛出 `reason`。

```javascript
const v = await Promise.resolve("ok") // v === "ok"
```

补充说明：`v` 的值，来自该 Promise 最终 `fulfilled` 时的 `value`（通常是某次 `resolve(value)` 决议的结果）。

##### 3. await thenable

thenable 指：对象/函数上存在 `then` 方法（且 `then` 是函数）。`Promise.resolve(thenable)` 会执行“吸收/展开”过程，概念上类似：

```javascript
new Promise((resolve, reject) => {
  thenable.then(resolve, reject)
})
```

因此，在 thenable 的 `then(onFulfilled, onRejected)` 方法中，调用 `onFulfilled(值)`，等价于内部调用`resolve(值)`，该值就是 `await` 表达式的结果。

```javascript
const prfn = function(){}
prfn.then = function (onFulfilled, onRejected){
  onFulfilled('success')
}

async function test() {
  const res = await prfn
  console.log(res) // success
}
test()
```

结论：`res` 的值，来自 `prfn.then(resolve, reject)` 中 `resolve` 被调用时传入的参数。

##### 4. “继续展开”的含义

“继续展开”指：thenable/Promise 的 resolve 中传入的值，如果还是 Promise/thenable，不会把这个 Promise/thenable 当作最终值返回，而是会继续跟随其状态，直到拿到一个非 thenable 的最终值（或遇到 reject）。

```javascript
const pr = {
  then(resolve) {
    resolve(Promise.resolve(42))
  }
}

const v = await pr
// v 最终是 42，而不是 Promise.resolve(42) 这个对象
```

补充：这是 Promise 规范的核心特性——`resolve` 并非“将参数原封不动作为最终值”，而是会对参数进行“同化/吸收”。

##### 5. await 遇到 reject

- 在 async 函数内部，`await` 遇到 Promise 变为 `rejected` 时，会直接抛出异常。
- 从 async 函数外部看，其返回的 Promise 会变为`rejected`，异常可通过 `.catch` 捕获。

```javascript
async function f() {
  await Promise.reject("bad") // 这里会 throw "bad"
}
f().catch(console.log) // bad
```

##### 6. 一句话总结

`await x` 的结果，来自 `Promise.resolve(x)` 的最终 `fulfilled value`：

- `x` 是普通值：直接得到 `x`。
- `x` 是 Promise：得到它最终 resolve 的值。
- `x` 是 thenable：得到它`then(resolve, reject)` 中 `resolve(...)` 传入的值；若该值仍是 Promise/thenable，会继续展开，直至拿到最终值（或遇到 reject）。

## 3. 手写`Promise`对象

### 核心实现要点（前置认知）

手写Promise的核心是围绕 **Promises/A+ 规范**，结合三大核心思路：

1. 面向对象编程：用构造函数创建Promise实例，实例包含状态、值、回调等属性；
2. 发布订阅模式：保存then注册的回调函数，待Promise决议（fulfilled/rejected）后批量执行；
3. 链式调用：then方法返回新的Promise实例，确保异步操作可链式衔接。

后续所有步骤均围绕这三点展开。分步代码用于解释状态、决议、回调队列和链式调用分别承担什么职责，因此部分片段只代表当前步骤已经实现的能力，不能把早期片段直接拼接成最终可运行版本。完整可运行实现与自测文件分别见 [handwritten-promise.js](./source/promise/handwritten-promise.js) 和 [handwritten-promise.test.js](./source/promise/handwritten-promise.test.js)。

### 1.基础准备（状态+工具函数）

#### 核心目的

定义Promise的固定状态、校验工具函数，为后续实现铺垫，避免重复代码，提升可维护性。

#### 代码实现

```javascript
// 1. 定义Promise的三种状态（不可修改，用常量区分，避免魔法字符串）
const PENDING_STATE = "pending";    // 等待态（初始态）
const FULFILLED_STATE = "fulfilled";// 成功态（决议态，不可逆转）
const REJECTED_STATE = "rejected";  // 失败态（决议态，不可逆转）

// 2. 工具函数：校验是否为函数（用于判断Promise构造函数参数、then方法参数）
const isFunction = function (fun) {
  return typeof fun === "function";
};

// 3. 工具函数：校验是否为对象（用于判断`thenable`对象）
const isObject = function (value) {
  return value && typeof value === "object"; // 排除null（null typeof是object，但不是对象）
};
```

#### 规范说明

Promises/A+ 规范要求：Promise只有三种状态，且状态只能从pending→fulfilled、pending→rejected，一旦决议，状态不可再变。

### 2.实现Promise构造函数（核心基础）

#### 核心目的

初始化Promise实例的基础属性，校验调用方式和参数，定义resolve/reject方法（用于决议Promise），执行传入的异步函数。

#### 代码实现（逐步完善）

```javascript
function Promise(fun) {
  // 1. 校验调用方式：必须通过new关键字调用（防止直接调用Promise()）
  if (!this || this.constructor !== Promise) {
    throw new TypeError("Promise must be called with new");
  }

  // 2. 校验参数：传入的fun必须是函数（Promise构造函数接收一个 `executor` 执行器函数）
  if (!isFunction(fun)) {
    throw new TypeError("Promise constructor's argument must be a function");
  }

  // 3. 初始化实例属性
  this.state = PENDING_STATE; // 初始状态：等待态
  this.value = void 0;        // 决议值：成功时存结果，失败时存原因
  // 4. 回调数组：保存then方法注册的回调（支持多次调用then，按注册顺序执行）
  this.onFulfilledCallbacks = []; // 成功态回调队列
  this.onRejectedCallbacks = [];  // 失败态回调队列

  // 5. 定义resolve方法（后面结合决议流程完善，先定义骨架）
  const resolve = (value) => {
    // 后续步骤3完善：决议流程（resolutionProcedure）
  };

  // 6. 定义reject方法（直接拒绝，不解析值，先完善基础逻辑）
  const reject = (reason) => {
    // 状态不可逆转：只有pending态才能切换为rejected
    if (this.state === PENDING_STATE) {
      this.state = REJECTED_STATE; // 更新状态为失败态
      this.value = reason;         // 保存失败原因
      // 执行所有注册的失败回调（发布订阅：决议后触发回调）
      this.onRejectedCallbacks.forEach((callback) => callback());
    }
  };

  // 7. 执行`executor`函数（传入resolve和reject，供用户手动决议）
  try {
    fun(resolve, reject); // 执行时若抛出异常，直接reject
  } catch (error) {
    reject(error);
  }
}
```

#### 关键说明

- `resolve/reject`定义在构造函数内部，通过闭包访问实例的state、value和回调数组；
- `executor`函数执行时可能抛出同步异常，需用try/catch捕获，直接调用reject处理；
- 回调数组的作用：支持多次调用then（如`p.then(fn1).then(fn2)、p.then(fn3)`），所有回调按注册顺序保存，决议后批量执行。

### 3.实现核心决议流程（resolutionProcedure）

#### 核心目的

这是Promise实现的核心！负责解析resolve传入的值（可能是普通值、Promise、`thenable`对象），确保符合Promises/A+规范，避免循环引用、多次决议等问题。

#### 代码实现（先定义函数，再整合到resolve中）

```javascript
// 决议流程：接收Promise实例和resolve传入的值x，解析x并决议Promise
const resolutionProcedure = function (promise, x) {
  // 规范点1：避免循环引用（x就是当前Promise实例，直接reject）
  if (x === promise) {
    return reject(new TypeError("Promise cannot resolve itself"));
  }

  // 规范点2：x是另一个Promise实例 → 等待x决议，沿用其状态和值
  if (x instanceof Promise) {
    return x.then(resolve, reject);
  }

  // 规范点3：x是`thenable`对象（有then方法的对象/函数）→ 尝试调用其then方法，模拟Promise行为
  if (isObject(x) || isFunction(x)) {
    let called = false; // 标记：确保then方法只调用一次（避免多次决议）
    try {
      let then = x.then; // 取出x的then方法（可能是getter，需try/catch捕获异常）
      if (isFunction(then)) {
        // 调用then方法，传入resolvePromise和rejectPromise（模拟Promise的决议逻辑）
        then.call(
          x,
          // 成功回调：递归解析y（y可能还是Promise/`thenable`）
          (y) => {
            if (called) return; // 防止多次调用
            called = true;
            resolutionProcedure(promise, y); // 递归解析y
          },
          // 失败回调：直接reject
          (r) => {
            if (called) return;
            called = true;
            reject(r);
          }
        );
      } else {
        // then不是函数 → 直接以x为值，决议为成功态
        if (promise.state === PENDING_STATE) {
          promise.state = FULFILLED_STATE;
          promise.value = x;
          promise.onFulfilledCallbacks.forEach((callback) => callback());
        }
      }
    } catch (e) {
      // 调用then方法时抛出异常 → 若未决议，直接reject
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    // 规范点4：x是普通值（非对象/非函数）→ 直接决议为成功态
    if (promise.state === PENDING_STATE) {
      promise.state = FULFILLED_STATE;
      promise.value = x;
      // 执行所有注册的成功回调
      promise.onFulfilledCallbacks.forEach((callback) => callback());
    }
  }
};

// 完善构造函数中的resolve方法（整合决议流程）
const resolve = (value) => {
  // 状态不可逆转：只有pending态才能执行决议
  if (this.state === PENDING_STATE) {
    // 调用核心决议流程，解析value
    resolutionProcedure(this, value);
  }
};
```

#### 规范重点（必记）

1. 循环引用：x === promise → 直接reject（规范不允许Promise决议自身）；
2. x是Promise：沿用其状态（x成功则当前Promise成功，x失败则当前失败）；
3. `thenable`对象：必须尝试调用其then方法，且确保then只执行一次（避免用户恶意多次调用resolve/reject）；
4. 普通值：直接切换状态为fulfilled，保存值并执行成功回调。

### 4.实现then方法（链式调用核心）

#### 核心目的

then方法是Promise链式调用的核心，需满足：接收成功/失败回调、返回新Promise、支持异步回调、按规范处理回调返回值。

#### 代码实现

```javascript
Promise.prototype.then = function (onFulfilled, onRejected) {
  // 规范点1：onFulfilled/onRejected可选，若不是函数，需做默认处理（透传值/抛出错误）
  onFulfilled = isFunction(onFulfilled) ? onFulfilled : (value) => value;
  onRejected = isFunction(onRejected)
    ? onRejected
    : (error) => { throw error; }; // 未传失败回调，透传错误

  // 规范点2：then必须返回一个新的Promise实例（实现链式调用）
  let promise2 = new Promise((resolve, reject) => {
    // 包装回调：转为异步执行（规范要求：回调不能同步执行，需放入微任务，这里用setTimeout模拟）
    let wrapOnFulfilled = () => {
      setTimeout(() => {
        try {
          // 执行成功回调，获取返回值x
          let x = onFulfilled(this.value);
          // 解析x，决议新的Promise（复用决议流程）
          resolutionProcedure(promise2, x);
        } catch (error) {
          // 回调执行抛出异常 → 直接reject新Promise
          reject(error);
        }
      }, 0);
    };

    let wrapOnRejected = () => {
      setTimeout(() => {
        try {
          // 执行失败回调，获取返回值x
          let x = onRejected(this.value);
          // 解析x，决议新的Promise（即使回调返回错误，也按成功解析x）
          resolutionProcedure(promise2, x);
        } catch (error) {
          reject(error);
        }
      }, 0);
    };
    // 用setTimeout模拟异步，会放到宏任务队列中，实际上是微任务队列。

    // 按当前Promise的状态，执行对应回调
    if (this.state === FULFILLED_STATE) {
      // 已成功：立即执行包装后的成功回调
      wrapOnFulfilled();
    } else if (this.state === REJECTED_STATE) {
      // 已失败：立即执行包装后的失败回调
      wrapOnRejected();
    } else {
      // 等待态：将回调存入队列，待决议后执行
      this.onFulfilledCallbacks.push(wrapOnFulfilled);
      this.onRejectedCallbacks.push(wrapOnRejected);
    }
  });

  return promise2;
};
```

#### 关键说明

- 异步回调：用setTimeout模拟微任务（规范要求回调需异步执行，避免阻塞主线程）；
- 链式核心：返回新Promise（promise2），回调返回值x通过决议流程解析，确保链式调用的状态衔接；
- 透传特性：未传onFulfilled则透传成功值，未传onRejected则透传失败原因（为catch方法铺垫）。

### 5.实现catch/finally方法（拓展方法）

#### catch方法（语法糖）

核心：catch是then方法的语法糖，等价于then(null, 失败回调)，用于集中捕获异步错误。

```javascript
Promise.prototype.catch = function (callback) {
  return this.then(null, callback); // 只注册失败回调，成功回调透传
};
```

#### finally方法（拓展）

核心：无论Promise成功/失败，都会执行回调，且返回新Promise，沿用原Promise的决议值（回调报错则新Promise失败）。

```javascript
Promise.prototype.finally = function (callback) {
  return this.then(
    (data) => {
      callback(); // 执行回调，不影响成功值
      return data; // 透传原成功值
    },
    (error) => {
      callback(); // 执行回调，不影响失败原因
      throw error; // 透传原错误（若回调不报错）
    }
  );
};
```

### 6.实现静态方法（Promise.resolve/reject/all等）

核心：提供便捷的Promise创建/批量处理方法，贴合原生Promise的使用场景，全部符合Promises/A+规范。

```javascript
// 1. Promise.resolve：快速创建成功态Promise（解析传入值）
Promise.resolve = function (value) {
  // 若传入的是Promise实例，直接返回；否则创建新Promise并resolve
  return value instanceof Promise ? value : new Promise((resolve) => resolve(value));
};

// 2. Promise.reject：快速创建失败态Promise（不解析值，直接拒绝）
Promise.reject = function (reason) {
  return new Promise((resolve, reject) => reject(reason));
};

// 3. Promise.race：竞速模式，返回第一个决议的Promise（无论成功/失败）
Promise.race = function (promises) {
  return new Promise((resolve, reject) => {
    // 遍历所有promise，第一个决议的结果就是race的结果
    promises.forEach((promise) => {
      Promise.resolve(promise).then(resolve, reject);
    });
  });
};
// 注意：若传入空数组，race会一直处于pending态（规范未要求处理空数组）

// 4. Promise.all：全成则成，一败则败（返回所有成功结果的数组，按传入顺序）
Promise.all = function (promises) {
  return new Promise((resolve, reject) => {
    // 空数组：直接resolve空数组（规范要求）
    if (!promises.length) {
      resolve([]);
      return;
    }

    let result = []; // 保存所有成功结果
    let resolvedCount = 0; // 计数：已成功的Promise数量

    // 遍历所有promise，按索引保存结果（保证顺序一致）
    for (let index = 0, length = promises.length; index < length; index++) {
      Promise.resolve(promises[index]).then(
        (data) => {
          result[index] = data;
          resolvedCount++;
          // 所有promise都成功，resolve结果数组
          if (resolvedCount === length) {
            resolve(result);
          }
        },
        (error) => {
          // 有一个失败，直接reject（失败优先）
          reject(error);
        }
      );
    }
  });
};

// 5. Promise.allSettled：等待所有Promise决议（无论成功/失败），返回所有结果详情
Promise.allSettled = function (promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) {
      resolve([]);
      return;
    }

    let result = [];
    let resolvedCount = 0;

    for (let index = 0, length = promises.length; index < length; index++) {
      Promise.resolve(promises[index])
        .then((data) => {
          // 成功：保存状态和值
          result[index] = { status: FULFILLED_STATE, value: data };
        })
        .catch((error) => {
          // 失败：保存状态和原因
          result[index] = { status: REJECTED_STATE, reason: error };
        })
        .finally(() => {
          resolvedCount++;
          if (resolvedCount === length) {
            resolve(result);
          }
        });
    }
  });
};
```

### 7. 可运行实现与验证边界

完整实现已经从 Markdown 中移入 [source/promise/handwritten-promise.js](./source/promise/handwritten-promise.js)。正文继续保留前面的分步实现，用于解释状态迁移、Thenable 展开、回调队列和链式调用；完整文件负责提供可以直接运行和继续测试的实现。

实现中的关键决议函数接收当前 Promise、待解析值以及 fulfill / reject 能力，避免依赖函数作用域外不存在的 resolve / reject：

~~~javascript
function resolveValue(promise, value, fulfill, reject) {
  if (promise === value) {
    reject(new TypeError('Chaining cycle detected for promise'))
    return
  }

  // 普通值直接 fulfill；
  // Thenable 则读取 then，并且只允许第一次 resolve / reject 生效。
}
~~~

then 方法创建新的 Promise 后，把回调返回值重新交给同一套决议流程：

~~~javascript
promise2 = new MyPromise((resolve, reject) => {
  const runFulfilled = () => {
    queueMicrotask(() => {
      try {
        const x = fulfilledHandler(this.value)
        resolveValue(promise2, x, resolve, reject)
      } catch (error) {
        reject(error)
      }
    })
  }
})
~~~

这两个片段验证的是“链式 Promise 的结果必须继续经过统一决议流程”；完整代码还包含 reject、catch、finally、resolve、race、all、allSettled 和 deferred 适配器。

自测文件位于 [source/promise/handwritten-promise.test.js](./source/promise/handwritten-promise.test.js)，覆盖：

- then 回调异步执行；
- 链式返回值；
- 多层 Thenable 展开；
- reject / catch 传播；
- Promise.all 结果顺序；
- finally 值透传；
- Chaining Cycle 拒绝；
- deferred.resolve 基本行为。

当前自测可以使用：

~~~bash
node Full-Stack-AI-NOTES/source/promise/handwritten-promise.test.js
~~~

本地 Node.js 22 环境执行结果为：

~~~text
self-tests passed
~~~

这组自测只证明上述行为已经通过本地验证，**不能等价为完整 Promises/A+ Test Suite 已经通过**。如果需要声明“Promises/A+ 兼容”，还应继续使用官方兼容测试工具运行完整规范用例，并以实际测试结果为准。

### 总结（核心逻辑回顾）

1. 基础：状态（pending/fulfilled/rejected）不可逆转，工具函数用于校验；
2. 核心：决议流程（resolutionProcedure）处理resolve传入的值，解决循环引用、`thenable`等复杂场景；
3. 链式：then方法返回新Promise，通过决议流程解析回调返回值，实现链式调用；
4. 拓展：catch/finally是语法糖/拓展方法，静态方法提供便捷操作；
5. 规范：所有实现贴合Promises/A+，可通过`promises-aplus-tests`验证正确性。？
