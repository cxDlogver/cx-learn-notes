// 封装形式选择，面向对象
// 发布订阅
class MiaomaPromise {
  onFulfilledCallbacks = [];
  onRejectedCallbacks = [];

  constructor(executor) {
    executor(
      (value) => {
        for (const cb of this.onFulfilledCallbacks) {
          cb(value);
        }
      },
      (value) => {
        // 3. 执行
        console.log("3. 执行");
        for (const cb of this.onRejectedCallbacks) {
          cb(value);
        }
      },
    );
  }

  then(onFulfilled, onRejected) {
    // 2. 订阅
    console.log("2. 订阅", onFulfilled);
    console.log("2. 订阅", onRejected);
    this.onFulfilledCallbacks.push(onFulfilled);
    this.onRejectedCallbacks.push(onRejected);
  }
}

const promise = new MiaomaPromise((resolve, reject) => {
  // 1. 初始化
  console.log("1. 初始化");
  setTimeout(() => {
    // resolve("成功");
    reject("失败");
  }, 1000);
});

// 真正 promise 调用需要 then 来进行后续操作
promise.then(
  (res) => {
    console.log("成功", res);
  },
  (res) => {
    console.log("失败", res);
  },
);

// .then 用自然语言来描述，当你 xxx 操作执行完之后，我就要打印 res 结果
// then 第一个 onFulfilled 订阅成功，第二个 onRejected 订阅失败
