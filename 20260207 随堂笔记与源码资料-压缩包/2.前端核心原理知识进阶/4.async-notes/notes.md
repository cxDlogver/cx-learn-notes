# 4.前端异步编程

## 异步处理发展史

1. 回调函数
2. promise
3. async/await

### 发展史代码示例

#### 回调函数

```js
setTimeout(() => {
  console.log("1");
  setTimeout(() => {
    console.log("2");
    setTimeout(() => {
      console.log("3");
    }, 1000);
  }, 1000);
}, 1000); // 在 xx ms 执行 xx 操作
```

1s 后执行 a 操作，然后再 1 s 后执行 b 操作，1s 后执行 c 操作
回调函数引起的 **回调地狱**

#### promise

```js
const sleep = (ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

sleep(1000)
  .then(() => {
    console.log("1");
    return sleep(1000);
  })
  .then(() => {
    console.log("2");
    return sleep(1000);
  })
  .then(() => {
    console.log("3");
  });
```

#### async/await

```js
const sleep = (ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

async function invoke() {
  await sleep(1000);
  console.log("1");
  await sleep(1000);
  console.log("2");
  await sleep(1000);
  console.log("3");
}

invoke()
```

## Promise A+ 规范

规范、协议、约束

## Promise 手写实现

### 核心点

1. 面向对象编程，（面向对象编程、函数式编程）  Promise
2. 发布订阅模式
3. 链式调用


```js
class MiaomaPromise {}

function MiaomaPromise() {}
```