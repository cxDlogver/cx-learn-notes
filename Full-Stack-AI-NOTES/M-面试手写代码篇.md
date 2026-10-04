---
title: 前端面试手写代码篇
categories:
  - 前端面试
tags:
  - 面试
  - 手写代码
  - JavaScript
date: 2026-03-15 12:00:00
---

<!--more-->

## 文档目标

- 面向前端面试中的高频手写代码题，沉淀“解释 + 场景 + 代码 + 面试要点”的结构化笔记。
- 每个关键词尽量覆盖定义、业务使用场景、手写实现和高频追问。
- 统一格式，方便集中复习和快速回忆。

## 统一模板

### 关键词：

- 解释：
- 使用场景：
- 手写代码：
```js
function example() {}
```
- 面试要点：

## 内容沉淀区

> 后续每次输入前端关键词或手写题主题，按上面的结构直接追加到这里。

### 关键词：深拷贝

- 解释：深拷贝指的是创建一个全新的对象或数组，并把原数据里每一层的引用类型也递归复制一份。这样新对象和原对象结构相同，但内部引用地址不同，修改拷贝后的数据不会影响原数据。它和浅拷贝的核心区别是，浅拷贝只复制第一层，嵌套对象仍然共用同一个引用。
- 使用场景：
  - 需要复制一份复杂状态做编辑草稿，避免用户修改表单时直接污染原始数据。
  - 做撤销、重置、快照保存时，需要保留某个时间点的独立数据副本。
  - 处理接口返回数据时，希望基于副本加工展示数据，不影响原始响应对象。
  - 某些递归处理或树形结构操作中，需要生成新结构而不是原地修改旧结构。
- 手写代码：
```js
function deepClone(value, cache = new WeakMap()) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (cache.has(value)) {
    return cache.get(value);
  }

  const result = Array.isArray(value) ? [] : {};
  cache.set(value, result);

  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = deepClone(value[key], cache);
    }
  }

  return result;
}
```
- 面试要点：
  - 核心原则是“遇到基本类型直接返回，遇到引用类型递归复制”。
  - 手写时要先说清浅拷贝和深拷贝的区别，面试官通常先看你概念是否清楚。
  - `JSON.parse(JSON.stringify(obj))` 不是真正通用的深拷贝方案，因为会丢失 `undefined`、`function`、`symbol`，也不能处理循环引用。
  - 高频追问是“怎么处理循环引用”，标准回答是用 `WeakMap` 记录已经拷贝过的对象。
  - 这个版本主要覆盖对象和数组，若继续追问，才补充 `Date`、`RegExp`、`Map`、`Set`、原型链、不可枚举属性等完整边界。

### 关键词：浅拷贝

- 解释：浅拷贝指的是只复制对象或数组的第一层结构。对于基本类型，会直接复制值；对于引用类型，不会复制内部对象本身，而是复制它们的引用地址。所以新对象和原对象看起来分开了，但如果内部嵌套对象被修改，两边会相互影响。
- 使用场景：
  - 只需要复制一层配置项或参数对象，内部嵌套数据不需要独立副本时。
  - React、Vue 这类场景里，为了触发状态更新或生成一个新的外层对象时。
  - 合并默认配置和业务配置时，只关心顶层字段覆盖，不要求深层隔离时。
  - 数组或对象的顶层增删改比较频繁，但嵌套对象本身会继续复用时。
- 手写代码：
```js
function shallowClone(value) {
  if (Array.isArray(value)) {
    return value.slice();
  }

  if (value !== null && typeof value === "object") {
    const result = {};

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = value[key];
      }
    }

    return result;
  }

  return value;
}
```
- 面试要点：
  - 核心是“只拷贝第一层，嵌套引用继续共享”。
  - 常见实现方式有对象展开运算符、`Object.assign`、数组的 `slice`、`concat` 等，它们本质上都是浅拷贝。
  - 面试里最容易被追问的是和深拷贝的区别，建议直接用“第一层复制 vs 递归复制”来回答。
  - 如果嵌套对象需要完全隔离，浅拷贝就不够，必须换成深拷贝。
  - 可以顺手补一句：浅拷贝性能和实现复杂度都更低，所以业务里不要无脑上深拷贝，要看数据层级和修改范围。

### 关键词：判断二叉树是否对称

- 解释：判断二叉树是否对称，本质上就是判断这棵树是不是左右镜像。也就是说，根节点的左子树和右子树要在结构上对称、在节点值上相等。不是只看左右两边值差不多，而是要同时满足“位置镜像”和“值相等”这两个条件。
- 使用场景：
  - 算法面试里是高频递归题，用来考察你对二叉树递归定义是否清楚。
  - 前端做组件树、权限树、配置树这类树形结构遍历时，也常用类似的递归思路处理左右子树或双分支节点。
  - 需要验证某个树形数据是否满足镜像结构约束时，可以直接套这个判断逻辑。
- 手写代码：
```js
function isSymmetric(root) {
  if (!root) return true;

  function isMirror(left, right) {
    if (!left && !right) return true;
    if (!left || !right) return false;
    if (left.val !== right.val) return false;

    return (
      isMirror(left.left, right.right) &&
      isMirror(left.right, right.left)
    );
  }

  return isMirror(root.left, root.right);
}
```
- 面试要点：
  - 核心不是比较“同一侧”，而是比较“左子树的左边和右子树的右边”、“左子树的右边和右子树的左边”。
  - 递归终止条件一定要先写清楚：都为空返回 `true`，一个为空一个不为空返回 `false`。
  - 高频错误是把比较条件写成 `left.left` 对 `right.left`，那样判断的是相同方向，不是镜像方向。
  - 时间复杂度通常是 `O(n)`，因为每个节点最多访问一次；空间复杂度主要取决于递归栈深度，平均和树高有关。
  - 常见追问是“能不能用迭代写”，标准延伸是用队列成对入队节点，再按镜像顺序比较。

### 关键词：Promise.all

- 解释：`Promise.all` 用来并发执行多个异步任务，并在所有任务都成功时一次性返回结果数组。它的结果顺序和传入顺序一致，不看谁先完成；只要其中任意一个任务失败，整体就会立刻进入 `reject`。
- 使用场景：
  - 页面初始化时并行请求多个接口，比如用户信息、权限信息、菜单数据一起加载。
  - 需要等待多个独立异步任务全部完成后，再进入下一步逻辑时。
  - 批量处理多个图片、文件、接口请求，并在全部完成后统一汇总结果时。
  - 前端工程里需要并行加载多个资源，再统一做渲染或状态更新时。
- 手写代码：
```js
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError("argument must be an array"));
    }

    const result = [];
    let finishedCount = 0;

    if (promises.length === 0) {
      return resolve([]);
    }

    promises.forEach((item, index) => {
      Promise.resolve(item)
        .then((value) => {
          result[index] = value;
          finishedCount += 1;

          if (finishedCount === promises.length) {
            resolve(result);
          }
        })
        .catch(reject);
    });
  });
}
```
- 面试要点：
  - 核心特性有两个：一是全部成功才 `resolve`，二是一个失败就整体 `reject`。
  - 手写时一定要处理普通值，所以通常会先用 `Promise.resolve(item)` 包一层。
  - 返回结果必须按传入顺序存放，不能按完成顺序 `push`，这是高频扣分点。
  - 空数组是特殊情况，应该直接返回 `resolve([])`。
  - 高频追问包括 `Promise.allSettled` 和 `Promise.race` 的区别、失败后其他 Promise 会不会停止、以及如何做并发数量限制。

### 关键词：Promise.race

- 解释：`Promise.race` 表示多个异步任务一起开始，谁先有结果，就采用谁的结果作为最终结果。这里的“先有结果”既包括先 `resolve`，也包括先 `reject`，所以它关注的不是成功还是失败，而是谁最先结束。
- 使用场景：
  - 给接口请求加超时控制，比如“请求结果”和“超时 Promise”谁先返回就用谁。
  - 同时请求多个可替代资源，谁先成功或失败就先进入后续处理。
  - 做兜底策略时，让主任务和降级任务一起跑，优先使用先完成的那个结果。
  - 某些竞速类异步逻辑里，需要拿到最先完成的状态而不是全部完成状态时。
- 手写代码：
```js
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError("argument must be an array"));
    }

    promises.forEach((item) => {
      Promise.resolve(item).then(resolve, reject);
    });
  });
}
```
- 面试要点：
  - 核心是“谁先结束就用谁”，不要求全部完成。
  - 和 `Promise.all` 最大区别是，`race` 不会等所有任务结束，`all` 则必须等全部成功。
  - 手写时同样要注意用 `Promise.resolve` 包装普通值，否则无法统一处理非 Promise 项。
  - 高频应用场景就是“请求超时控制”，这基本是面试里最常见的追问方向。
  - 常见误区是以为 `race` 只会返回第一个成功结果，实际上第一个失败结果也会直接让整体失败。

### 关键词：Promise.allSettled

- 解释：`Promise.allSettled` 用来等待一组异步任务全部结束，不管它们最终是成功还是失败。它不会像 `Promise.all` 那样遇到一个失败就直接中断，而是会等所有任务都完成后，返回一个结果数组，数组里每一项都会标明当前 Promise 的状态和值或失败原因。
- 使用场景：
  - 页面需要并行请求多个接口，但不希望因为其中一个失败就让整体流程直接中断时。
  - 批量上传、批量处理任务时，需要统计每一项成功还是失败，再统一展示结果时。
  - 后台管理、监控面板这类场景里，希望尽可能拿到所有可用结果，而不是一处失败就整批失败时。
  - 需要做“部分成功、部分失败”的容错汇总逻辑时。
- 手写代码：
```js
function promiseAllSettled(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError("argument must be an array"));
    }

    const result = [];
    let finishedCount = 0;

    if (promises.length === 0) {
      return resolve([]);
    }

    promises.forEach((item, index) => {
      Promise.resolve(item)
        .then((value) => {
          result[index] = {
            status: "fulfilled",
            value
          };
        })
        .catch((reason) => {
          result[index] = {
            status: "rejected",
            reason
          };
        })
        .finally(() => {
          finishedCount += 1;

          if (finishedCount === promises.length) {
            resolve(result);
          }
        });
    });
  });
}
```
- 面试要点：
  - 核心特征是“不管成功失败，等全部结束再统一返回结果”。
  - 和 `Promise.all` 的本质区别是，`all` 遇到一个失败就整体失败，`allSettled` 则会保留每一项的最终状态。
  - 返回结果格式是对象数组，成功项通常是 `{ status: 'fulfilled', value }`，失败项通常是 `{ status: 'rejected', reason }`。
  - 手写时不能在某一项失败时直接 `reject`，否则就写成 `Promise.all` 了，这是高频错误点。
  - 高频追问包括：它和 `Promise.all`、`Promise.race`、`Promise.any` 的区别，以及实际业务里什么时候该选“全部成功”还是“部分容错”。

### 关键词：Promise.any

- 解释：`Promise.any` 表示多个异步任务同时执行，只要有一个成功，就立刻返回那个成功结果。它和 `Promise.race` 不同，`race` 是谁先结束就用谁，而 `any` 是谁先成功就用谁。如果所有 Promise 都失败，`Promise.any` 才会最终失败，并返回一个 `AggregateError`。
- 使用场景：
  - 同时请求多个可替代接口、多个镜像服务或多个 CDN 节点，只要有一个成功就继续执行时。
  - 页面资源有多条兜底链路时，希望优先拿到任意一个可用结果。
  - 某些降级容灾场景里，主服务和备用服务一起请求，谁先成功就用谁。
  - 不关心哪个任务先失败，只关心是否至少有一个任务成功时。
- 手写代码：
```js
function promiseAny(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError("argument must be an array"));
    }

    const errors = [];
    let rejectedCount = 0;

    if (promises.length === 0) {
      return reject(new AggregateError([], "All promises were rejected"));
    }

    promises.forEach((item, index) => {
      Promise.resolve(item)
        .then(resolve)
        .catch((error) => {
          errors[index] = error;
          rejectedCount += 1;

          if (rejectedCount === promises.length) {
            reject(new AggregateError(errors, "All promises were rejected"));
          }
        });
    });
  });
}
```
- 面试要点：
  - 核心特点是“只要有一个成功就立即成功”，失败不会立刻结束整体流程。
  - 和 `Promise.race` 的关键区别是，`race` 第一个失败也会直接失败，而 `any` 会继续等其他成功结果。
  - 只有当所有 Promise 都失败时，`Promise.any` 才会 `reject`。
  - 手写时要注意记录所有失败原因，因为最终失败返回的不是单个错误，而是 `AggregateError`。
  - 高频追问是它和 `all`、`race`、`allSettled` 的对比，以及“空数组时为什么直接失败”。

### 关键词：手写 Promise

- 解释：手写 Promise 的核心是自己实现一个最小可用的异步状态机。它要解决三件事：第一，状态只能从 `pending` 变成 `fulfilled` 或 `rejected`，而且只能改一次；第二，`then` 要支持异步回调和链式调用；第三，回调的返回值要继续影响下一个 Promise 的状态，这就是常说的 Promise/A+ 里的“状态决议流程”。
- 使用场景：
  - 前端面试中是非常高频的综合题，常用来考察异步、状态管理、链式调用和错误传递。
  - 需要你理解 `then/catch/finally` 为什么能连续调用，以及为什么回调必须异步执行时。
  - 学习 `Promise.all`、`Promise.race`、`async/await` 这些能力前，手写 Promise 是最底层的原理题。
- 手写代码：
```js
function resolvePromise(promise2, x, resolve, reject) {
  if (promise2 === x) {
    return reject(new TypeError("Chaining cycle detected"));
  }

  if (x instanceof MyPromise) {
    return x.then(resolve, reject);
  }

  if (x !== null && (typeof x === "object" || typeof x === "function")) {
    let called = false;

    try {
      const then = x.then;

      if (typeof then === "function") {
        return then.call(
          x,
          (y) => {
            if (called) return;
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          (r) => {
            if (called) return;
            called = true;
            reject(r);
          }
        );
      }
    } catch (error) {
      if (called) return;
      called = true;
      return reject(error);
    }
  }

  resolve(x);
}

class MyPromise {
  constructor(executor) {
    this.status = "pending";
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (this.status !== "pending") return;
         // 如果 resolve 的还是一个 Promise，要继续展开
      if (value instanceof MyPromise) {
        return value.then(resolve, reject)
      }
       
      this.status = "fulfilled";
      this.value = value;
      this.onFulfilledCallbacks.forEach((fn) => fn());
    };

    const reject = (reason) => {
      if (this.status !== "pending") return;
      this.status = "rejected";
      this.reason = reason;
      this.onRejectedCallbacks.forEach((fn) => fn());
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          };

    const promise2 = new MyPromise((resolve, reject) => {
      const runFulfilled = () => {
        queueMicrotask(() => {
          try {
            const x = onFulfilled(this.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      };

      const runRejected = () => {
        queueMicrotask(() => {
          try {
            const x = onRejected(this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      };

      if (this.status === "fulfilled") {
        runFulfilled();
      } else if (this.status === "rejected") {
        runRejected();
      } else {
        this.onFulfilledCallbacks.push(runFulfilled);
        this.onRejectedCallbacks.push(runRejected);
      }
    });

    return promise2;
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(onFinally) {
    return this.then(
      (value) => MyPromise.resolve(onFinally()).then(() => value),
      (reason) =>
        MyPromise.resolve(onFinally()).then(() => {
          throw reason;
        })
    );
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const result = [];
      let count = 0;

      if (promises.length === 0) {
        return resolve([]);
      }

      promises.forEach((item, index) => {
        MyPromise.resolve(item).then(
          (value) => {
            result[index] = value;
            count += 1;

            if (count === promises.length) {
              resolve(result);
            }
          },
          reject
        );
      });
    });
  }
}
```
- 面试要点：
  - 先讲清 Promise 本质是“状态机 + 回调队列 + 链式决议”，不要一上来只背 API。
  - 状态只能从 `pending` 变成 `fulfilled/rejected`，并且状态一旦确定就不能再改。
  - `then` 必须返回一个新的 Promise，这是链式调用成立的关键。
  - 回调需要异步执行，规范里更接近微任务语义，所以这里用 `queueMicrotask` 比 `setTimeout` 更贴近原生 Promise。
  - 高频难点是 `resolvePromise`：既要处理普通值，也要处理 Promise/thenable，还要防止链式循环引用。
  - `catch` 本质上就是 `then(null, onRejected)`，`finally` 不改链路结果，除非它自己抛错。
  - 继续追问时，面试官通常会问 `Promise.all`、值穿透、错误冒泡、thenable 对象、以及为什么 `async/await` 底层仍然离不开 Promise。

### 关键词：并发调度器

- 解释：并发调度器的核心作用是控制异步任务同时执行的最大数量。它不是让任务串行执行，也不是一股脑全部放出去，而是维护一个等待队列和一个运行中的计数器。每次有任务完成，就从队列里补一个新任务进去，这样既能提高吞吐量，又能避免瞬间请求过多把浏览器、服务端或第三方接口打爆。
- 使用场景：
  - 前端批量上传文件、批量下载资源时，需要限制同时进行的请求数量。
  - 页面里要并发请求很多接口，但后端有限流或浏览器连接数限制时。
  - 做图片预加载、爬取数据、批量处理任务时，希望控制资源占用，避免内存和网络峰值过高。
  - 面试里常作为 Promise 进阶题，考察你对队列、并发控制和任务补位机制是否理解。
- 手写代码：
```js
class Scheduler {
  constructor(maxNum) {
    this.maxNum = maxNum;
    this.tasks = [];
    this.runningCount = 0;
  }

  addTask(task) {
    return new Promise((resolve, reject) => {
      this.tasks.push({ task, resolve, reject });
      this.runTask();
    });
  }

  runTask() {
    while (this.runningCount < this.maxNum && this.tasks.length > 0) {
      const { task, resolve, reject } = this.tasks.shift();
      this.runningCount++;

      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          this.runningCount--;
          this.runTask();
        });
    }
  }
}

// test
const task1 = () =>
  new Promise((resolve) => setTimeout(() => resolve("task1"), 1000));
const task2 = () =>
  new Promise((resolve) => setTimeout(() => resolve("task2"), 500));
const task3 = () =>
  new Promise((resolve) => setTimeout(() => resolve("task3"), 300));
const task4 = () =>
  new Promise((resolve) => setTimeout(() => resolve("task4"), 400));
const task5 = () => "task5";
const task6 = () => {
  throw new Error("task6 error");
};

const scheduler = new Scheduler(2);

Promise.allSettled([
  scheduler.addTask(task1),
  scheduler.addTask(task2),
  scheduler.addTask(task3),
  scheduler.addTask(task4),
  scheduler.addTask(task5),
  scheduler.addTask(task6)
]).then((results) => {
  console.log(results);
});
```
- 面试要点：
  - 核心结构通常就是“三件套”：等待队列、最大并发数、当前运行数。
  - 真正的关键不是“存任务”，而是“任务完成后要自动补位”，否则并发数就维持不住。
  - 用 `while` 比单次 `if` 更稳，因为初始化时要一次性补满可执行槽位。
  - `Promise.resolve().then(task)` 的作用是统一捕获同步异常；如果直接写 `task()`，同步抛错可能绕过后续链路。
  - 你原测试里的 `task6 = () => new Error(...)` 其实不是失败，而是返回一个普通值；要写成 `throw new Error(...)` 或 `Promise.reject(...)` 才算 reject。
  - 高频追问包括：结果顺序怎么保证、怎么支持暂停/取消、怎么支持优先级、怎么做重试和超时控制。

### 关键词：防抖

- 解释：防抖的核心是“只认最后一次”。如果一个函数在短时间内被频繁触发，就不断取消前一次定时器，只保留最后一次调用，等到停止触发一段时间后再真正执行。这样可以避免高频事件导致函数被反复执行。
- 使用场景：
  - 搜索框输入联想，用户停止输入一段时间后再发请求。
  - 表单校验、自动保存这类“不需要每敲一个字都立即执行”的场景。
  - 浏览器窗口 `resize`、文本输入、滚动停止后的统计上报等高频触发场景。
  - 你给的例子里，`debounceTestFunc(1, 2)` 后又立刻执行 `debounceTestFunc(3, 4)`，前一次会被取消，只保留最后一次参数。
- 手写代码：
```js
function debounce(fn, delay) {
  let timer = null;

  return function (...args) {
    const context = this;

    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  };
}
```
- 面试要点：
  - 关键词就是“取消前一次，只执行最后一次”。
  - 实现核心是闭包保存 `timer`，每次触发都先 `clearTimeout` 再重新计时。
  - 高频追问是“能不能立刻执行一次”，延伸版通常会加 `immediate` 选项。
  - 另一个常见追问是“怎么取消防抖函数”，可以给返回函数挂一个 `cancel` 方法。
  - 要注意保留 `this` 和参数，所以手写时常配合 `apply` 或 `call`。

### 关键词：节流

- 解释：节流的核心是“按固定频率执行”。不管事件触发多频繁，都只允许函数在规定时间间隔内执行一次。也就是说，节流不是只执行最后一次，而是把高频调用压缩成“每隔一段时间最多执行一次”。
- 使用场景：
  - 滚动监听、鼠标移动、页面拖拽这类持续高频触发的事件。
  - 页面埋点、按钮频繁点击保护、窗口大小变化时的性能优化。
  - 地图拖动、图表联动、实时 UI 更新等需要稳定频率而不是完全延后执行的场景。
  - 你给的例子里，第一次 `throttleTestFunc(1, 2)` 会立即执行，紧接着的 `throttleTestFunc(3, 4)` 会被丢弃，1 秒后再调用 `throttleTestFunc(5, 6)` 才会再次执行。
- 手写代码：
```js
function throttle(fn, delay) {
  let lastTime = 0;

  return function (...args) {
    const now = Date.now();

    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
```
- 面试要点：
  - 关键词就是“限制频率，固定间隔内最多执行一次”。
  - 最常见实现有两种：时间戳版和定时器版；时间戳版通常是首次立即执行，定时器版通常是首次延后执行。
  - 高频追问是“防抖和节流的区别”，建议直接答成“防抖只要最后一次，节流按周期执行”。
  - 如果面试官继续追问，一般会问“如何同时支持首尾执行”，这时可以讲时间戳和定时器混合版。
  - 节流同样要注意保留 `this` 和参数，否则在真实业务里很容易出 bug。

### 关键词：虚拟列表

- 解释：虚拟列表的核心是“只渲染可视区附近的少量 DOM，而不是一次性把整份长列表都渲染出来”。它通常会保留一个完整高度的占位容器，保证滚动条长度正确；真正显示的内容只渲染当前可视区域加上前后缓冲区的那部分节点。这样可以显著减少 DOM 数量、布局计算和重绘开销，特别适合上万条数据场景。
- 使用场景：
  - 后台管理系统里的超长表格、日志列表、消息列表、商品列表等大量数据渲染场景。
  - 动态高度内容的长列表，比如评论流、富文本卡片流、聊天记录流。
  - 地图点位列表、监控面板事件流、操作记录流这类滚动频繁且数据量大的前端页面。
  - 面试里常用来考察你对滚动渲染、性能优化、二分查找、缓冲区和动态高度修正的理解。
- 手写代码：
```js
class VirtualList {
  constructor(container, full, visible, data) {
    this.container = container;
    this.full = full;
    this.visible = visible;
    this.data = data;
    this.itemHeight = 40;
    this.bufferSize = 5;
    this.list = [];

    this.init();
  }

  init() {
    for (let i = 0; i < this.data.length; i++) {
      this.list.push({
        index: i,
        text: this.data[i],
        height: this.itemHeight,
        top: i * this.itemHeight,
        bottom: (i + 1) * this.itemHeight
      });
    }

    this.full.style.height = `${this.data.length * this.itemHeight}px`;
    this.render();
    this.container.addEventListener("scroll", this.render.bind(this));
  }

  getStartIndex() {
    const scrollTop = this.container.scrollTop;
    let left = 0;
    let right = this.list.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.list[mid].bottom < scrollTop) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return left;
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;
    const startIndex = Math.max(0, this.getStartIndex() - this.bufferSize);

    let endIndex = startIndex;
    while (
      endIndex < this.list.length &&
      this.list[endIndex].top < scrollTop + containerHeight
    ) {
      endIndex++;
    }

    const renderList = this.list.slice(startIndex, endIndex + this.bufferSize);

    this.visible.innerHTML = renderList
      .map(
        (item) => `
          <div class="list-item">
            ${item.text}
          </div>
        `
      )
      .join("");

    let diff = 0;
    const children = this.visible.children;

    for (let i = 0; i < children.length; i++) {
      const current = this.list[startIndex + i];
      const currentHeight = children[i].clientHeight;
      const heightDiff = currentHeight - current.height;

      current.height = currentHeight;
      current.top += diff;
      current.bottom = current.top + current.height;
      diff += heightDiff;
    }

    for (let i = startIndex + children.length; i < this.list.length; i++) {
      this.list[i].top += diff;
      this.list[i].bottom += diff;
    }

    this.full.style.height = `${this.list[this.list.length - 1].bottom}px`;
    this.visible.style.transform = `translateY(${this.list[startIndex].top}px)`;
  }
}
```
- 面试要点：
  - 固定高度虚拟列表更简单，动态高度难点在于“先估算，再测量，再修正”。
  - 这类实现通常有两个容器：一个负责撑开总高度，一个负责承载真实渲染节点。
  - 起始索引不能每次从头遍历，常见优化是二分查找当前 `scrollTop` 对应的起点。
  - 缓冲区的作用是减少快速滚动时的白屏和频繁重绘，一般会多渲染前后几项。
  - 你这类实现里真正的难点不是切片，而是动态高度修正后如何同步更新后续节点的 `top/bottom`。
  - 高频追问包括：固定高度和动态高度的区别、为什么要二分查找、如何避免 `innerHTML` 全量重建、如何做节点复用、以及虚拟列表为什么能显著降低性能开销。

### 关键词：发布-订阅模式

- 解释：发布-订阅模式的核心是通过一个事件中心来解耦“发布者”和“订阅者”。发布者只负责触发事件，不直接关心谁来处理；订阅者只负责监听自己关心的事件，不需要知道事件是谁触发的。这样可以实现模块之间的低耦合通信，也常被用来实现自定义事件管理。
- 使用场景：
  - 组件之间没有直接父子关系，但需要通信时，可以通过事件总线传递消息。
  - 某个模块状态变化后，需要通知多个业务模块同步更新时。
  - 自定义事件系统、消息中心、全局通知、埋点派发等场景里，都很适合用发布-订阅模式。
  - 前端面试里常和“观察者模式”一起问，用来考察你是否理解它们的区别和事件中心的作用。
- 手写代码：
```js
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push(callback);
  }

  emit(eventName, ...args) {
    const handlers = this.events[eventName];
    if (!handlers || handlers.length === 0) return;

    handlers.forEach((handler) => handler(...args));
  }

  off(eventName, callback) {
    const handlers = this.events[eventName];
    if (!handlers) return;

    this.events[eventName] = handlers.filter((handler) => handler !== callback);
  }

  once(eventName, callback) {
    const wrapper = (...args) => {
      callback(...args);
      this.off(eventName, wrapper);
    };

    this.on(eventName, wrapper);
  }
}

// test
const eventBus = new EventEmitter();

function handler(data) {
  console.log("receive:", data);
}

eventBus.on("update", handler);
eventBus.emit("update", { id: 1 });

eventBus.once("login", (user) => {
  console.log("login once:", user);
});
eventBus.emit("login", "cx");
eventBus.emit("login", "cx2");

eventBus.off("update", handler);
eventBus.emit("update", { id: 2 });
```
- 面试要点：
  - 核心结构一般是 `on`、`emit`、`off`、`once` 四个方法。
  - `on` 负责订阅，`emit` 负责发布，`off` 负责取消订阅，`once` 负责只执行一次。
  - 本质上的关键点不是“调函数”，而是“通过事件中心做解耦”。
  - 高频追问是它和观察者模式的区别：观察者模式通常是观察者和目标对象直接关联，而发布-订阅模式中间多了一个事件中心。
  - 真正业务里还可能继续追问：如何支持通配符事件、如何做事件命名空间、如何避免重复订阅、如何处理内存泄漏。

### 关键词：Object.assign

- 解释：`Object.assign(target, ...sources)` 会把每个 `source` 的自有且可枚举属性，按顺序浅拷贝到 `target` 上，并返回 `target`。它拷贝的是属性值，不会做深拷贝，也不会改掉 `target` 的原型链。像 `Object.assign(target.prototype, source.prototype)` 这种写法，本质上是把 `source.prototype` 上“可枚举”的成员混入到 `target.prototype`，常用于做 mixin；它不是继承，`target.prototype.__proto__` 不会变。
- 使用场景：
  - 合并默认配置和用户配置，比如请求参数、组件 options、表单默认值。
  - 做一层浅拷贝，避免多个变量直接引用同一个对象。
  - 给构造函数原型批量挂方法，实现“能力混入”。
  - 组合工具对象或插件能力，把多个对象的方法合并到同一个目标对象上。
- 手写代码：
```js
function assign(target, ...sources) {
  if (target == null) {
    throw new TypeError("Cannot convert undefined or null to object");
  }

  const to = Object(target);

  for (const source of sources) {
    if (source == null) continue;

    const from = Object(source);
    const keys = [
      ...Object.keys(from),
      ...Object.getOwnPropertySymbols(from).filter((key) =>
        Object.prototype.propertyIsEnumerable.call(from, key)
      )
    ];

    for (const key of keys) {
      to[key] = from[key];
    }
  }

  return to;
}

function Animal(name) {
  this.name = name;
}

const runner = {
  run() {
    return `${this.name} is running`;
  }
};

Object.assign(Animal.prototype, runner);

const dog = new Animal("dog");
console.log(dog.run()); // dog is running
```
- 面试要点：
  - 只会拷贝“自有 + 可枚举”属性，继承属性和不可枚举属性不会被复制。
  - 它是浅拷贝，嵌套对象拷过去后仍然共享引用。
  - 读取 `source[key]` 时会触发 getter，写入 `target[key]` 时可能触发 setter。
  - `Object.assign(target.prototype, source.prototype)` 是“拷方法/混入”，不是“挂原型链”；如果 `source` 是 `class`，类原型方法默认不可枚举，这句往往拷不到方法。
  - 它和 `new` 的区别要说清楚：`new` 会创建实例、把实例原型指向构造函数的 `prototype`、并执行构造函数；`Object.assign` 只是把属性复制到现有对象上，不创建实例，也不调用构造函数。
  - 高频追问包括：对象展开运算符和 `Object.assign` 的区别、为什么它不是深拷贝、`Object.create` / 原型链继承和 mixin 的区别。

### 关键词：apply

- 解释：`apply` 的作用是显式指定函数执行时的 `this`，并且把参数以“数组或类数组”的形式传进去。它和 `call` 的核心能力一样，区别主要在于传参方式：`call` 是一个个传，`apply` 是整体传。
- 使用场景：
  - 已有参数列表是数组时，想直接调用某个函数。
  - 借用数组方法处理类数组对象，比如 `arguments`、`NodeList`。
  - 改变回调函数内部的 `this` 指向。
  - 面试里常和 `call`、`bind` 一起考，要求你说清三者区别。
- 手写代码：
```js
Function.prototype.myApply = function (context, args = []) {
  if (typeof this !== "function") {
    throw new TypeError("myApply must be called on a function");
  }

  const target = context == null ? globalThis : Object(context);
  const fnKey = Symbol("fn");
  target[fnKey] = this;

  const result = target[fnKey](...args);
  delete target[fnKey];

  return result;
};

function greet(city, job) {
  return `${this.name}-${city}-${job}`;
}

const user = { name: "cx" };
console.log(greet.myApply(user, ["Shanghai", "FE"]));
```
- 面试要点：
  - 核心就是“临时把函数挂到对象上执行”，这样函数内部的 `this` 就指向该对象。
  - `context` 为 `null` 或 `undefined` 时，非严格模式下一般指向全局对象，这里常用 `globalThis` 兜底。
  - 和 `call` 的区别只在参数传递方式，不在 `this` 绑定能力。
  - 面试常追问为什么要用 `Symbol`：为了避免覆盖对象原有同名属性。
  - 继续追问通常会连到：`call`、`apply`、`bind` 的区别，以及箭头函数为什么改不了 `this`。

### 关键词：call

- 解释：`call` 会立刻执行函数，并显式指定这次执行时的 `this`。它和 `apply` 的本质一样，都是改变函数调用时的上下文，只不过 `call` 是把参数一个个传入。
- 使用场景：
  - 需要马上调用函数，同时手动指定 `this`。
  - 做构造函数借用，比如在子构造函数里借用父构造函数初始化属性。
  - 借用原生方法处理类数组对象。
  - 手写继承、手写 `bind` 时，`call` 也是常见基础能力。
- 手写代码：
```js
Function.prototype.myCall = function (context, ...args) {
  if (typeof this !== "function") {
    throw new TypeError("myCall must be called on a function");
  }

  const target = context == null ? globalThis : Object(context);
  const fnKey = Symbol("fn");
  target[fnKey] = this;

  const result = target[fnKey](...args);
  delete target[fnKey];

  return result;
};

function sum(a, b) {
  return `${this.prefix}${a + b}`;
}

const obj = { prefix: "result:" };
console.log(sum.myCall(obj, 1, 2));
```
- 面试要点：
  - `call` 的执行是“立即执行”，不是返回一个新函数。
  - 基本类型会被装箱成对应包装对象，比如字符串会转成 `String` 对象。
  - 它常被用来做“函数借用”，比如 `Parent.call(this, name)`。
  - 如果目标函数是箭头函数，`call` 也改不了它的 `this`，因为箭头函数的 `this` 是词法绑定。
  - 高频追问包括：`call` 和 `apply` 的区别、`call` 和 `bind` 的区别、手写实现时如何避免属性冲突。

### 关键词：bind

- 解释：`bind` 不会立即执行函数，而是返回一个新的函数。这个新函数会永久绑定指定的 `this`，并且支持预置一部分参数，也就是常说的“柯里化一部分参数”。它和 `call`、`apply` 最大的区别就是“返回新函数，而不是立刻执行”。
- 使用场景：
  - 把事件回调、定时器回调里的 `this` 固定下来。
  - 预先收集一部分参数，生成一个更具体的新函数。
  - React class 组件里早期常用它绑定实例方法 `this`。
  - 面试里经常要求手写一个支持 `new` 的 `bind`。
- 手写代码：
```js
Function.prototype.myBind = function (context, ...presetArgs) {
  if (typeof this !== "function") {
    throw new TypeError("myBind must be called on a function");
  }

  const originalFn = this;

  function boundFn(...laterArgs) {
    const isNew = this instanceof boundFn;
    const thisArg = isNew ? this : context == null ? globalThis : Object(context);

    return originalFn.apply(thisArg, [...presetArgs, ...laterArgs]);
  }

      // 维护原型链：让 new boundFn() 创建的实例也能访问原函数原型上的方法
  if (originalFn.prototype) {
    boundFn.prototype = Object.create(originalFn.prototype);
  }

  return boundFn;
};

function Person(name, age) {
  this.name = name;
  this.age = age;
}

Person.prototype.sayHi = function () {
  return `${this.name}-${this.age}`;
};

const BoundPerson = Person.myBind({ name: "ignore" }, "cx");
const p = new BoundPerson(18);

console.log(p.sayHi()); // cx-18
```
- 面试要点：
  - `bind` 返回的是新函数，不会立即执行。
  - 可以分两次传参：第一次是预置参数，第二次是调用时参数。
  - 如果绑定后的函数被 `new` 调用，`this` 应该指向新实例，而不是最初传入的 `context`。
  - 手写时通常要处理原型链：`boundFn.prototype = Object.create(originalFn.prototype)`。
  - 高频追问包括：为什么 `bind` 需要兼容 `new`、`bind` 和箭头函数的区别、`bind` 是否能再次修改 `this`。

### 关键词：Vue 3.0 响应式系统

- 解释：Vue 3 的响应式系统核心就是“读取时收集依赖，修改时触发依赖”。它通过 `Proxy` 拦截对象的 `get`、`set`、`deleteProperty`，在 `get` 阶段执行 `track` 收集当前副作用函数，在 `set` 阶段执行 `trigger` 重新运行依赖。和 Vue 2 基于 `Object.defineProperty` 的做法相比，Vue 3 对新增属性、删除属性、数组索引和更深层对象的支持更自然。
- 使用场景：
  - `setup` 里用 `reactive` 或 `ref` 声明状态，模板和副作用函数自动跟踪依赖。
  - `watchEffect`、渲染函数、计算属性底层都依赖“收集依赖 + 触发更新”这套机制。
  - 表单状态、列表筛选、联动 UI 这类“数据变了就自动刷新视图”的前端场景。
  - 需要实现一个简化版响应式库、状态管理内核、依赖追踪机制时，这个题是最常见基础题。
- 手写代码：
```js
const isObject = (value) => value !== null && typeof value === "object";

const targetMap = new WeakMap();
const reactiveMap = new WeakMap();
let activeEffect = null;

function cleanup(effectFn) {
  for (const dep of effectFn.deps) {
    dep.delete(effectFn);
  }
  effectFn.deps.length = 0;
}

function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    fn();
    activeEffect = null;
  };

  effectFn.deps = [];
  effectFn();
  return effectFn;
}

function track(target, key) {
  if (!activeEffect) return;

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}

function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const dep = depsMap.get(key);
  if (!dep) return;

  const effectsToRun = new Set(dep);
  effectsToRun.forEach((effectFn) => effectFn());
}

function reactive(target) {
  if (!isObject(target)) return target;

  const existingProxy = reactiveMap.get(target);
  if (existingProxy) return existingProxy;

  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver);
      track(target, key);
      return isObject(result) ? reactive(result) : result;
    },
    set(target, key, value, receiver) {
      const oldValue = Reflect.get(target, key, receiver);
      const result = Reflect.set(target, key, value, receiver);

      if (oldValue !== value) {
        trigger(target, key);
      }

      return result;
    },
    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const result = Reflect.deleteProperty(target, key);

      if (hadKey && result) {
        trigger(target, key);
      }

      return result;
    }
  });

  reactiveMap.set(target, proxy);
  return proxy;
}

function ref(value) {
  return reactive({
    value
  });
}

// test
const state = reactive({
  count: 0,
  nested: {
    message: "Hello"
  }
});

effect(() => {
  console.log("count:", state.count);
});

effect(() => {
  console.log("message:", state.nested.message);
});

const age = ref(18);
effect(() => {
  console.log("age:", age.value);
});

state.count += 1;
state.nested.message = "Hi";
age.value = 20;
delete state.count;
```
- 面试要点：
  - 核心主线一定要按 `effect -> track -> trigger -> reactive/ref` 讲清楚，本质就是依赖收集和派发更新。
  - `WeakMap -> Map -> Set` 是经典依赖结构：`WeakMap` 按对象存，`Map` 按属性存，`Set` 存依赖该属性的副作用函数。
  - `reactive` 为什么用 `Proxy`：因为它可以拦截整个对象层级，天然支持新增属性、删除属性和动态 key，这也是 Vue 3 相比 Vue 2 的一个高频对比点。
  - 手写时容易漏掉依赖清理。没有 `cleanup`，副作用函数重复执行后会残留旧依赖，复杂场景下会产生多余触发甚至错误触发。
  - 高频追问包括：如何避免每次 `get` 都生成新代理、`ref` 和 `reactive` 的区别、`computed/watch` 底层如何基于 `effect` 扩展、数组和调度器为什么更复杂。

### 关键词：节流（支持第一次执行和最后一次执行）

- 解释：这种节流是“首尾都执行”的版本。第一次触发时立刻执行，保证用户一开始就能得到反馈；在节流时间内如果又连续触发，不会每次都执行，而是把最后一次调用的信息保存下来，等这一轮间隔结束后再补执行一次。所以它和基础节流的区别是，不只保留“首执行”，还会把“最后一次有效调用”补上。
- 使用场景：
  - 页面滚动时先立刻更新吸顶状态、进度条，但用户停止滚动后还要再同步一次最终位置。
  - 窗口 resize、拖拽面板、分栏宽度调整时，过程里按固定频率更新，结束后再用最后一次尺寸做收尾计算。
  - 地图拖动、滑块拖拽、图表联动这类高频交互，既要保证过程流畅，也要保证结束状态准确。
  - 面试里经常作为普通节流的追问，考你是否能把时间戳版和定时器版的思路结合起来。
- 手写代码：
```js
function throttle(fn, wait) {
  let lastExecTime = 0;
  let timer = null;
  let lastArgs = null;
  let lastThis = null;

  function invoke(context, args) {
    lastExecTime = Date.now();
    fn.apply(context, args);
  }

  return function (...args) {
    const now = Date.now();

    if (lastExecTime === 0) {
      invoke(this, args);
      return;
    }

    const remaining = wait - (now - lastExecTime);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      invoke(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
      return;
    }

    if (!timer) {
      timer = setTimeout(() => {
        timer = null;

        if (lastArgs) {
          invoke(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        }
      }, remaining);
    }
  };
}
```
- 面试要点：
  - 这类题的关键词不是“每隔一段时间执行一次”这么简单，而是“第一次立即执行，结束前再补最后一次”。
  - 纯时间戳版通常偏向首执行，纯定时器版通常偏向尾执行；首尾都要时，一般就是两种思路的混合实现。
  - 尾执行一定要保存最新的 `this` 和参数，否则补执行时拿到的会是旧值。
  - 要避免单次调用时首尾各执行一次，所以只有在间隔期内真的发生了后续调用，才应该安排尾执行。
  - 高频追问包括：如何扩展成 `leading` / `trailing` 配置版、如何取消定时器、和防抖在交互体验上的区别。

### 关键词：请求失败自动重试 n 次

- 解释：这个题的核心是封装一个重试函数，接收一个“执行请求的函数”和最大重试次数。每次请求失败后，如果还没超过限制，就继续重新发起；如果已经达到最大次数，直接把最后一次错误抛出去。它和普通请求封装的区别在于，请求必须能被重复执行，所以传入的一定是函数，而不是已经执行过的 Promise。
- 使用场景：
  - 接口偶发超时、网络抖动、弱网环境下的请求容错处理。
  - 上传分片、轮询任务、配置拉取、埋点上报这类允许短暂失败后再次尝试的业务。
  - 页面初始化时拉远程配置、广告数据、推荐数据，想提升一次加载成功率但又不希望无限重试。
  - 面试里常用来考 Promise、错误处理、递归或循环控制，以及“为什么传函数不传 Promise”。
- 手写代码：
```js
function retryRequest(requestFn, retries, delay = 0) {
  return new Promise((resolve, reject) => {
    function attempt(count) {
      requestFn()
        .then(resolve)
        .catch((error) => {
          if (count >= retries) {
            reject(error);
            return;
          }

          setTimeout(() => {
            attempt(count + 1);
          }, delay);
        });
    }

    attempt(0);
  });
}

// test
let times = 0;

function mockRequest() {
  return new Promise((resolve, reject) => {
    times += 1;

    if (times < 3) {
      reject(new Error("request failed"));
      return;
    }

    resolve("success");
  });
}

retryRequest(mockRequest, 3, 1000)
  .then((res) => console.log(res))
  .catch((err) => console.log(err.message));
```
- 面试要点：
  - 关键点不是“失败后再调一次”这么简单，而是要把“最大重试次数、最终失败、异步链式返回”讲完整。
  - 入参必须是 `requestFn` 这种函数，因为 Promise 一旦创建就已经执行了，失败后没法靠同一个 Promise 重新发请求。
  - `retries` 表示的是“额外重试次数”还是“总尝试次数”要提前说清楚；这类题最容易在边界定义上答乱。
  - 延迟重试通常通过 `setTimeout` 实现，继续追问时可以扩展成指数退避，比如 1s、2s、4s 递增。
  - 高频追问包括：如何支持取消重试、如何只对特定错误码重试、并发请求失败后怎么做统一重试控制。

### 关键词：LRU 缓存

- 解释：LRU 是 Least Recently Used，也就是“最近最少使用”淘汰策略。它的核心思想是：缓存容量有限时，优先删除最久没有被访问过的数据；一旦某个 key 被读取或写入，就认为它刚刚被使用过，需要把它移动到最新位置。它和普通缓存的区别不在于存值，而在于要维护“访问顺序”。
- 使用场景：
  - 前端接口结果缓存、搜索结果缓存、详情页数据缓存，避免重复请求相同数据。
  - 图片资源、模块结果、计算结果这类“高频读取但容量有限”的本地缓存场景。
  - 路由页面缓存、keep-alive 扩展缓存、最近访问记录这类需要按使用频率淘汰旧数据的功能。
  - 面试里常用来考察你对 `Map`、数据结构设计、时间复杂度，以及哈希表加双向链表思路的理解。
- 手写代码：
```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return -1;
    }

    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, value);
  }
}

// test
const lru = new LRUCache(2);

lru.put(1, 1);
lru.put(2, 2);
console.log(lru.get(1)); // 1

lru.put(3, 3); // 淘汰 key 2
console.log(lru.get(2)); // -1

lru.put(4, 4); // 淘汰 key 1
console.log(lru.get(1)); // -1
console.log(lru.get(3)); // 3
console.log(lru.get(4)); // 4
```
- 面试要点：
  - 核心不是“删最早加入的元素”，而是“删最近最少使用的元素”，所以 `get` 也要更新顺序，不只是 `put`。
  - 用 `Map` 是因为它本身保持插入顺序，删除后再 `set` 就能把当前 key 移到最新位置，写法很适合前端面试。
  - 这版实现里 `get` 和 `put` 平均时间复杂度都可以认为是 `O(1)`，空间复杂度是 `O(capacity)`。
  - 如果面试官追问“不能用 `Map` 怎么办”，标准答案是“哈希表 + 双向链表”：哈希表负责快速定位节点，双向链表负责 `O(1)` 删除和移动。
  - 高频追问包括：为什么不能用数组硬写、LFU 和 LRU 的区别、缓存淘汰时机怎么设计、实际业务里如何加过期时间。

### 关键词：LFU 缓存

- 解释：LFU 是 Least Frequently Used，也就是“最不经常使用”淘汰策略。它的核心思想是：当缓存满了时，优先删除访问次数最少的元素；每次 `get` 或更新 `put` 都要让对应 key 的访问次数加一。如果多个 key 的访问次数相同，通常再淘汰这一组里最早使用的那个，所以它比 LRU 多维护了一层“访问频次”。
- 使用场景：
  - 热点数据和冷数据差异明显的接口缓存、搜索缓存、推荐结果缓存场景。
  - 本地计算结果缓存、组件渲染结果缓存，希望高频访问的数据尽量常驻内存。
  - 前端性能优化里需要有限缓存容量，但又不想像 LRU 那样因为一次偶然访问就把冷数据保留下来。
  - 面试里常用来考察数据结构设计，尤其是“哈希表 + 频次桶”以及淘汰策略的边界处理。
- 手写代码：
```js
class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.size = 0;
    this.minFreq = 0;
    this.keyMap = new Map();
    this.freqMap = new Map();
  }

  get(key) {
    if (!this.keyMap.has(key)) {
      return -1;
    }

    const node = this.keyMap.get(key);
    this.updateFreq(node);
    return node.value;
  }

  put(key, value) {
    if (this.capacity === 0) {
      return;
    }

    if (this.keyMap.has(key)) {
      const node = this.keyMap.get(key);
      node.value = value;
      this.updateFreq(node);
      return;
    }

    if (this.size >= this.capacity) {
      const minFreqMap = this.freqMap.get(this.minFreq);
      const deleteKey = minFreqMap.keys().next().value;
      minFreqMap.delete(deleteKey);

      if (minFreqMap.size === 0) {
        this.freqMap.delete(this.minFreq);
      }

      this.keyMap.delete(deleteKey);
      this.size -= 1;
    }

    const newNode = {
      key,
      value,
      freq: 1
    };

    this.keyMap.set(key, newNode);

    if (!this.freqMap.has(1)) {
      this.freqMap.set(1, new Map());
    }

    this.freqMap.get(1).set(key, newNode);
    this.minFreq = 1;
    this.size += 1;
  }

  updateFreq(node) {
    const oldFreq = node.freq;
    const oldFreqMap = this.freqMap.get(oldFreq);
    oldFreqMap.delete(node.key);

    if (oldFreqMap.size === 0) {
      this.freqMap.delete(oldFreq);

      if (this.minFreq === oldFreq) {
        this.minFreq += 1;
      }
    }

    node.freq += 1;

    if (!this.freqMap.has(node.freq)) {
      this.freqMap.set(node.freq, new Map());
    }

    this.freqMap.get(node.freq).set(node.key, node);
  }
}

// test
const lfu = new LFUCache(2);

lfu.put(1, 1);
lfu.put(2, 2);
console.log(lfu.get(1)); // 1

lfu.put(3, 3); // 淘汰 key 2
console.log(lfu.get(2)); // -1
console.log(lfu.get(3)); // 3

lfu.put(4, 4); // 淘汰 key 1
console.log(lfu.get(1)); // -1
console.log(lfu.get(3)); // 3
console.log(lfu.get(4)); // 4
```
- 面试要点：
  - LFU 和 LRU 的最大区别是，LFU 看“使用次数”，LRU 看“最近一次使用时间”。
  - 这题的难点不在缓存本身，而在如何同时做到“快速查 key、快速更新频次、快速找到最小频次并淘汰”。
  - 这版写法里 `keyMap` 负责通过 key 找节点，`freqMap` 负责按频次分桶；桶内部再用 `Map` 保证同频次下的先后顺序。
  - `minFreq` 很关键，它记录当前缓存里的最小访问频次，否则每次淘汰都去遍历所有桶，复杂度就上去了。
  - 高频追问包括：同频次为什么还能 `O(1)` 淘汰、`put` 已存在 key 时是否算一次访问、LFU 为什么通常比 LRU 更复杂、实际业务里是否要加过期时间和最大内存限制。

### 关键词：合并 K 个升序链表

- 解释：这题的核心是把多个已经有序的链表合并成一个新的升序结果。常见面试写法有两种，一种是用最小堆每次取最小节点，另一种是分治，把 K 个链表不断两两合并。你这次要求最终输出数组，所以可以先把数组输入转换成链表，完成合并后再把结果链表转回数组。
- 使用场景：
  - 多路有序数据流合并，比如分页结果、日志分片、消息分片按时间顺序整合。
  - 前端面试里考察链表操作、分治思想、时间复杂度分析时，这题是高频经典题。
  - 后端返回的多组已排序数组，需要统一成一个升序结果供页面渲染或二次处理。
  - 本地缓存或离线数据同步时，把多个已经排序的数据片段合并成一份最终结果。
- 手写代码：
```js
class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function arrayToList(arr) {
  const dummy = new ListNode(0);
  let current = dummy;

  for (const num of arr) {
    current.next = new ListNode(num);
    current = current.next;
  }

  return dummy.next;
}

function listToArray(head) {
  const result = [];
  let current = head;

  while (current) {
    result.push(current.val);
    current = current.next;
  }

  return result;
}

function mergeTwoLists(l1, l2) {
  const dummy = new ListNode(0);
  let current = dummy;
  let left = l1;
  let right = l2;

  while (left && right) {
    if (left.val <= right.val) {
      current.next = left;
      left = left.next;
    } else {
      current.next = right;
      right = right.next;
    }

    current = current.next;
  }

  current.next = left || right;
  return dummy.next;
}

function normalizeLists(lists) {
  return lists.map((item) => {
    if (Array.isArray(item)) {
      return arrayToList(item);
    }

    return item;
  });
}

function mergeKListsToArray(lists) {
  if (!Array.isArray(lists) || lists.length === 0) {
    return [];
  }

  const normalizedLists = normalizeLists(lists);
  let interval = 1;

  while (interval < normalizedLists.length) {
    for (let i = 0; i + interval < normalizedLists.length; i += interval * 2) {
      normalizedLists[i] = mergeTwoLists(
        normalizedLists[i],
        normalizedLists[i + interval]
      );
    }

    interval *= 2;
  }

  return listToArray(normalizedLists[0]);
}

// test
console.log(
  mergeKListsToArray([
    [1, 4, 5],
    [1, 3, 4],
    [2, 6]
  ])
); // [1, 1, 2, 3, 4, 4, 5, 6]
```
- 面试要点：
  - 这题不要一上来就把所有值拍平成数组再排序，那样虽然能做出来，但会丢掉链表题真正考察的合并过程。
  - 分治合并的核心是“把 K 个问题不断变成合并两个有序链表”，时间复杂度是 `O(N log k)`，其中 `N` 是节点总数。
  - 如果输入可能是数组，先统一转链表再合并，最后再转数组输出，这样结构清晰，也方便你同时覆盖“数组”和“链表”两种输入。
  - `mergeTwoLists` 是母题，很多题都会从这里延伸，所以 `dummy` 虚拟头节点的写法要熟。
  - 高频追问包括：最小堆解法怎么写、为什么是 `O(N log k)`、如果链表里有空链表怎么办、以及最后为什么还能方便地转回数组。

### 关键词：素数判断与区间素数筛选

- 解释：素数指的是大于 1 且只能被 1 和它本身整除的数。判断一个数是不是素数，核心是看它在 `2` 到 `sqrt(n)` 之间有没有因子；因为如果一个数有更大的因子，另一半因子一定已经在平方根之前出现了。区间 `[n, m]` 的判断，本质上就是把单个数判断复用到整个区间里，逐个筛出来。
- 使用场景：
  - 算法题、笔试题里经常拿来考循环优化和数学边界处理。
  - 需要在前端做简单数论判断、练习复杂度分析或做题目演示时很常见。
  - 区间筛选适合做“输出某范围内所有素数”的功能，比如教学页面或在线题目工具。
  - 面试延伸时常会追问“为什么只需要判断到平方根”和“范围更大时如何继续优化”。
- 手写代码：
```js
function isPrime(num) {
  if (num < 2) {
    return false;
  }

  for (let i = 2; i * i <= num; i++) {
    if (num % i === 0) {
      return false;
    }
  }

  return true;
}

function getPrimesInRange(n, m) {
  const start = Math.max(2, Math.min(n, m));
  const end = Math.max(n, m);
  const result = [];

  for (let i = start; i <= end; i++) {
    if (isPrime(i)) {
      result.push(i);
    }
  }

  return result;
}

// test
console.log(isPrime(7)); // true
console.log(isPrime(12)); // false
console.log(getPrimesInRange(10, 30)); // [11, 13, 17, 19, 23, 29]
```
- 面试要点：
  - 单个数判断的关键优化是“只遍历到平方根”，不要从 `2` 一直遍历到 `n - 1`。
  - `0`、`1` 和负数都不是素数，这类边界最容易漏。
  - 上面区间版的时间复杂度大致是 `O((m - n + 1) * sqrt(m))`，范围不大时足够面试使用。
  - 如果面试官继续追问更大范围，通常可以延伸到埃氏筛或分段筛。
  - 高频追问包括：为什么判断到平方根就够了、如何优化偶数判断、如何快速求某区间全部素数。

### 关键词：数组扁平化

- 解释：数组扁平化就是把多层嵌套数组展开成一层数组。比如 `[1, [2, [3, 4]]]` 最终变成 `[1, 2, 3, 4]`。它和简单遍历数组的区别在于，需要处理“元素仍然是数组”的递归场景。
- 使用场景：
  - 树形数据、分类数据、菜单数据处理后，需要统一成一维数组渲染或查找。
  - 路由配置、权限配置、表单配置这类嵌套结构，经常需要先拍平成列表再处理。
  - 面试里常用来考递归、栈思路和对 `Array.isArray` 的使用。
  - 业务里需要兼容 `flat(Infinity)` 逻辑，但又想手写实现时，这题最常见。
- 手写代码：
```js
function flatten(arr) {
  const result = [];

  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...flatten(item));
    } else {
      result.push(item);
    }
  }

  return result;
}

// test
console.log(flatten([1, [2, [3, 4], 5], 6])); // [1, 2, 3, 4, 5, 6]
```
- 面试要点：
  - 递归版最适合手写，因为思路直观：遇到数组就继续展开，遇到普通值就直接放进结果。
  - 核心判断一般用 `Array.isArray`，不要直接用 `typeof`，因为数组的 `typeof` 是 `object`。
  - 这版代码的时间复杂度是 `O(n)`，其中 `n` 是最终所有元素总数。
  - 如果面试官追问“不能用递归怎么办”，可以扩展成栈实现，避免超深嵌套导致调用栈过深。
  - 高频追问包括：如何支持指定拍平层数、和 `flat(Infinity)` 的区别、空数组和稀疏数组怎么处理。

### 关键词：合并两个有序数组

- 解释：这题的核心不是把两个数组拼起来再排序，而是利用“两个数组本来就有序”这个条件，用双指针按顺序合并。这样每次只比较当前两个指针指向的值，把较小的放进结果里，直到某一边遍历结束。
- 使用场景：
  - 接口分页结果、排序列表、时间线数据这类已经有序的数据源合并。
  - 归并排序的合并步骤，本质上就是这道题。
  - 前端做本地数据整合时，两个数据源都已排序，就不该再走一次全量排序。
  - 面试里常用来考双指针、边界处理和复杂度分析。
- 手写代码：
```js
function mergeSortedArray(arr1, arr2) {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < arr1.length && j < arr2.length) {
    if (arr1[i] <= arr2[j]) {
      result.push(arr1[i]);
      i += 1;
    } else {
      result.push(arr2[j]);
      j += 1;
    }
  }

  while (i < arr1.length) {
    result.push(arr1[i]);
    i += 1;
  }

  while (j < arr2.length) {
    result.push(arr2[j]);
    j += 1;
  }

  return result;
}

// test
console.log(mergeSortedArray([1, 3, 5], [2, 4, 6])); // [1, 2, 3, 4, 5, 6]
console.log(mergeSortedArray([1, 2, 7], [3, 4])); // [1, 2, 3, 4, 7]
```
- 面试要点：
  - 最佳思路是双指针，不要写成 `arr1.concat(arr2).sort(...)`，那样没有利用“原数组有序”这个条件。
  - 时间复杂度是 `O(n + m)`，空间复杂度是 `O(n + m)`。
  - 要注意某一个数组先走完后，另一个数组的剩余元素要整体补上。
  - 如果题目改成“合并到第一个数组里且原地修改”，那就是另一种经典变体，通常从尾部开始填。
  - 高频追问包括：原地合并怎么做、如果有重复元素怎么办、和归并排序的关系是什么。

### 关键词：axios 通用响应拦截器

- 解释：axios 拦截器本质上是在请求发出去前、响应回来后统一做一层处理。面试里说“通用拦截器统一提示错误”，通常指的是在响应拦截器里集中判断接口是否成功；如果不是成功状态，就在这里统一弹 toast，并把错误继续抛出去，避免每个页面都重复写一遍 `if (code !== 200)`。
- 使用场景：
  - 项目里所有接口都要统一处理成功态、失败态和错误提示。
  - 后端约定业务码放在 `res.data.code` 中，前端希望非 `200` 时统一提示。
  - 登录过期、权限不足、服务异常这类公共错误，需要在一个地方集中拦截。
  - 方便后续扩展请求 loading、token 注入、错误上报和重试机制。
- 手写代码：
```js
import axios from 'axios';

function showToast(message) {
  // 这里可以替换成项目里的 Toast 组件，例如 ElMessage.error / Toast.fail
  console.error(message);
}

const service = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

service.interceptors.response.use(
  (response) => {
    const { status, data } = response;
    const code = data?.code ?? status;

    if (code !== 200) {
      const message = data?.message || '请求失败';
      showToast(message);
      return Promise.reject({
        ...response,
        message,
      });
    }

    return data;
  },
  (error) => {
    const status = error.response?.status;

    let message = '网络异常，请稍后重试';

    if (status === 401) {
      message = '登录已过期，请重新登录';
    } else if (status === 403) {
      message = '暂无权限访问';
    } else if (status === 404) {
      message = '请求地址不存在';
    } else if (status >= 500) {
      message = '服务器异常，请稍后重试';
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    }

    showToast(message);
    return Promise.reject(error);
  }
);

export default service;
```
- 面试要点：
  - 这类题的核心是“把重复的错误处理收口到响应拦截器”，而不是每个接口调用方自己判断。
  - 要区分两种失败：`HTTP 状态码非 2xx` 会直接走 `response.use` 的第二个回调；很多项目里的“业务码非 200”则发生在第一个回调里。
  - 成功时一般直接 `return data`，这样业务层拿到的是后端返回体，不是完整的 axios 响应对象。
  - 统一 toast 之后仍然要 `Promise.reject(...)`，否则调用方会误以为请求成功，`catch` 逻辑接不到错误。
  - 高频追问包括：如何做重复 toast 去重、401 时如何跳登录页、是否要对白名单接口跳过提示、请求拦截器里 token 怎么注入。

### 关键词：手写 Array.prototype.flat

- 解释：`Array.prototype.flat` 的作用是按指定层级展开数组。它和普通“数组扁平化”题的区别在于，`flat` 默认只拍平一层，还要支持传入层数，比如 `flat(2)`，以及 `flat(Infinity)` 这种全部拍平的场景。
- 使用场景：
  - 接口返回的数据是多层嵌套数组，前端渲染前需要按层级展开。
  - 菜单、权限、路由配置等嵌套结构，需要转成更平的列表方便查找和遍历。
  - 面试里常用这题考察递归、参数控制、边界处理和对原生 `flat` 行为的理解。
  - 业务中需要兼容低版本环境，或者要自己实现一个 `flat` polyfill 思路时。
- 手写代码：
```js
Array.prototype.myFlat = function (depth = 1) {
  const result = [];
  const maxDepth =
    depth === Infinity ? Infinity : Math.max(0, Math.floor(depth));

  function walk(arr, currentDepth) {
    for (let i = 0; i < arr.length; i += 1) {
      // 跳过稀疏数组空位，行为更接近原生 flat
      if (!(i in arr)) continue;

      const item = arr[i];

      if (Array.isArray(item) && currentDepth < maxDepth) {
        walk(item, currentDepth + 1);
      } else {
        result.push(item);
      }
    }
  }

  walk(this, 0);
  return result;
};

// test
console.log([1, [2, [3, 4]], 5].myFlat()); // [1, 2, [3, 4], 5]
console.log([1, [2, [3, 4]], 5].myFlat(2)); // [1, 2, 3, 4, 5]
console.log([1, [2, [3, 4]], , 5].myFlat(Infinity)); // [1, 2, 3, 4, 5]
```
- 面试要点：
  - 和普通递归拍平题相比，这题的重点是支持 `depth`，默认值是 `1`，不是直接全部拍平。
  - `flat(Infinity)` 本质上就是“无限层递归展开”，面试里通常会单独追问这一点。
  - 如果想更接近原生行为，要注意跳过稀疏数组空位，所以代码里用了 `i in arr` 判断。
  - 挂在原型上时不要用箭头函数，因为箭头函数没有自己的 `this`，容易拿错调用对象。
  - 时间复杂度通常看作 `O(n)`，空间复杂度和结果数组、递归栈深度有关；高频追问包括 `reduce` 写法、非递归写法，以及和 `flatMap` 的区别。
