const PENDING_STATE = "pending";
const FULFILLED_STATE = "fulfiled";
const REJECTED_STATE = "rejected";

class MiaomaPromise {
  // 初始化，一定是 pending
  state = PENDING_STATE;

  // 确定初始值
  value = void 0;

  // 存储 onfulfiled 的回调，事件池
  onFulfilledCallbacks = [];
  // 存储 onrejected 的回调，事件池
  onRejectedCallbacks = [];

  constructor(executor) {
    setTimeout(() => {
      executor(this._resolve.bind(this), this._reject.bind(this));
    });
  }

  _resolve(value) {
    // 将状态置为执行态
    this.state = FULFILLED_STATE;
    this.value = value;

    for (const cb of this.onFulfilledCallbacks) {
      cb(value);
    }
  }

  _reject(reason) {
    // 将状态置为拒绝态
    this.state = REJECTED_STATE;
    this.value = reason;

    for (const cb of this.onRejectedCallbacks) {
      cb(value);
    }
  }

  then(onFulfilled, onRejected) {
    this.onFulfilledCallbacks.push(onFulfilled);
    this.onRejectedCallbacks.push(onRejected);
  }
}

// 测试使用
const promise = new MiaomaPromise((resolve, reject) => {
  setTimeout(() => {
    resolve("成功");
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
promise.then(
  (res) => {
    console.log("成功", res);
  },
  (res) => {
    console.log("失败", res);
  },
);
