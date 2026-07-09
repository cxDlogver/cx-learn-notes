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

    if (isObject(x) || isFunction(x)) {
      let called = false;
      try {
        let then = x.then;
        if (isFunction(then)) {
          then.call(
            x,
            (y) => {
              if (called) {
                return;
              }
              called = true;

              resolutionProcedure(promise, y);
            },
            (error) => {
              if (called) {
                return;
              }
              called = true;
              reject(error);
            },
          );
          return;
        }
      } catch (error) {
        if (called) {
          return;
        }
        called = true;
        reject(error);
      }
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

Promise.prototype.then = function (onFulfilled, onRejected) {
  // 值的容错判断
  onFulfilled = isFunction(onFulfilled) ? onFulfilled : (value) => value;
  onRejected = isFunction(onRejected)
    ? onRejected
    : (error) => {
        throw error;
      };

  // 更多边界处理
  // 1. 处理链式调用问题，返回一个 promise 对象
  // 2. 返回一个新的promise实例
  let promise2 = new Promise((resolve, reject) => {
    let wrapOnFulfilled = () => {
      setTimeout(() => {
        try {
          let x = onFulfilled(this.value);
          resolve(x);
        } catch (error) {
          reject(error);
        }
      }, 0);
    };
    let wrapOnRejected = () => {
      setTimeout(() => {
        try {
          let x = onRejected(this.value);
          resolve(x);
        } catch (error) {
          reject(error);
        }
      }, 0);
    };

    if (this.state === FULFILLED_STATE) {
      wrapOnFulfilled();
    } else if (this.state === REJECTED_STATE) {
      wrapOnRejected();
    } else {
      this.onFulfilledCallbacks.push(wrapOnFulfilled);
      this.onRejectedCallbacks.push(wrapOnRejected);
    }
  });

  return promise2;
};
Promise.prototype.catch = function (callback) {};


// Promise.prototype.finally 无论promise成功或失败，都会执行对应的回调函数，并返回一个promise实例。
// 如果回调函数执行出错，将以抛出的错误，拒绝新的promise；
// 否则，新返回的promise会沿用旧promise的决议值进行决议。
Promise.prototype.finally = function (callback) {
  return this.then(
    (data) => {
      callback();
      return data;
    },
    (error) => {
      callback();
      throw error;
    }
  );
};

// 如果Promise.resolve接收到的是一个promise，则会直接返回这个promise；否则，则会进一步执行决议操作。
Promise.resolve = function (value) {
  return value instanceof Promise
    ? value
    : new Promise((resolve) => resolve(value));
};

module.exports = exports = Promise;
