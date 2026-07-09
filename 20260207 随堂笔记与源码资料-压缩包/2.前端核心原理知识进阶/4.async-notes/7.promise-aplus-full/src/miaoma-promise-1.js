const PENDING_STATE = "pending";
const FULFILLED_STATE = "fulfiled";
const REJECTED_STATE = "rejected";

// 判断给定参数是否是函数
const isFunction = function (fun) {
  return typeof fun === "function";
};

// 判断给定参数是否是对象
const isObject = function (value) {
  return value && typeof value === "object";
};

// 定义构造函数
function Promise(fun) {
  this.state = PENDING_STATE;
  this.value = void 0;

  // 存储 onfulfiled 的回调，事件池
  this.onFulfilledCallbacks = [];
  // 存储 onrejected 的回调，事件池
  this.onRejectedCallbacks = [];

  const resolve = (value) => {
    resolutionProcedure(this, value); // value，既可以是普通数据，当前 promise，也可以其他 promise 对象
  };

  const resolutionProcedure = function (promise, x) {
    if (x === promise) {
      return reject(new TypeError("Promise can not resolved with it seft"));
    }

    if (x instanceof Promise) {
      return x.then(resolve, reject);
    }
  };

  const reject = (reason) => {
    // 当前状态一定要是 pending
    if (this.state === PENDING_STATE) {
      this.state = REJECTED_STATE;
      this.value = reason;

      this.onRejectedCallbacks.forEach((cb) => cb());
    }
  };

  try {
    fun(resolve, reject);
  } catch (error) {
    reject(error);
  }
}

Promise.prototype.then = function (onFulfilled, onRejected) {};
Promise.prototype.catch = function (callback) {};

module.exports = exports = Promise;
