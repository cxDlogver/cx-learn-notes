const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

const isFunction = (value) => typeof value === 'function';
const isObjectOrFunction = (value) =>
  value !== null && (typeof value === 'object' || typeof value === 'function');

function resolveValue(promise, value, fulfill, reject) {
  if (promise === value) {
    reject(new TypeError('Chaining cycle detected for promise'));
    return;
  }

  if (!isObjectOrFunction(value)) {
    fulfill(value);
    return;
  }

  let then;
  try {
    then = value.then;
  } catch (error) {
    reject(error);
    return;
  }

  if (!isFunction(then)) {
    fulfill(value);
    return;
  }

  let called = false;
  try {
    then.call(
      value,
      (nextValue) => {
        if (called) return;
        called = true;
        resolveValue(promise, nextValue, fulfill, reject);
      },
      (reason) => {
        if (called) return;
        called = true;
        reject(reason);
      },
    );
  } catch (error) {
    if (called) return;
    called = true;
    reject(error);
  }
}

function MyPromise(executor) {
  if (!(this instanceof MyPromise)) {
    throw new TypeError('Promise constructor must be called with new');
  }
  if (!isFunction(executor)) {
    throw new TypeError('Promise resolver is not a function');
  }

  this.state = PENDING;
  this.value = undefined;
  this.fulfilledQueue = [];
  this.rejectedQueue = [];

  const fulfill = (value) => {
    if (this.state !== PENDING) return;
    this.state = FULFILLED;
    this.value = value;
    const queue = this.fulfilledQueue.slice();
    this.fulfilledQueue.length = 0;
    this.rejectedQueue.length = 0;
    queue.forEach((fn) => fn());
  };

  const reject = (reason) => {
    if (this.state !== PENDING) return;
    this.state = REJECTED;
    this.value = reason;
    const queue = this.rejectedQueue.slice();
    this.fulfilledQueue.length = 0;
    this.rejectedQueue.length = 0;
    queue.forEach((fn) => fn());
  };

  const resolve = (value) => {
    if (this.state !== PENDING) return;
    resolveValue(this, value, fulfill, reject);
  };

  try {
    executor(resolve, reject);
  } catch (error) {
    reject(error);
  }
}

MyPromise.prototype.then = function (onFulfilled, onRejected) {
  const fulfilledHandler = isFunction(onFulfilled) ? onFulfilled : (value) => value;
  const rejectedHandler = isFunction(onRejected)
    ? onRejected
    : (reason) => {
        throw reason;
      };

  let promise2;
  promise2 = new MyPromise((resolve, reject) => {
    const runFulfilled = () => {
      queueMicrotask(() => {
        try {
          const x = fulfilledHandler(this.value);
          resolveValue(promise2, x, resolve, reject);
        } catch (error) {
          reject(error);
        }
      });
    };

    const runRejected = () => {
      queueMicrotask(() => {
        try {
          const x = rejectedHandler(this.value);
          resolveValue(promise2, x, resolve, reject);
        } catch (error) {
          reject(error);
        }
      });
    };

    if (this.state === FULFILLED) {
      runFulfilled();
    } else if (this.state === REJECTED) {
      runRejected();
    } else {
      this.fulfilledQueue.push(runFulfilled);
      this.rejectedQueue.push(runRejected);
    }
  });

  return promise2;
};

MyPromise.prototype.catch = function (onRejected) {
  return this.then(undefined, onRejected);
};

MyPromise.prototype.finally = function (callback) {
  const run = isFunction(callback) ? callback : () => callback;
  return this.then(
    (value) => MyPromise.resolve(run()).then(() => value),
    (reason) =>
      MyPromise.resolve(run()).then(() => {
        throw reason;
      }),
  );
};

MyPromise.resolve = function (value) {
  if (value instanceof MyPromise) return value;
  return new MyPromise((resolve) => resolve(value));
};

MyPromise.reject = function (reason) {
  return new MyPromise((resolve, reject) => reject(reason));
};

MyPromise.race = function (iterable) {
  return new MyPromise((resolve, reject) => {
    for (const item of iterable) {
      MyPromise.resolve(item).then(resolve, reject);
    }
  });
};

MyPromise.all = function (iterable) {
  const items = Array.from(iterable);
  return new MyPromise((resolve, reject) => {
    if (items.length === 0) {
      resolve([]);
      return;
    }

    const result = new Array(items.length);
    let completed = 0;

    items.forEach((item, index) => {
      MyPromise.resolve(item).then(
        (value) => {
          result[index] = value;
          completed += 1;
          if (completed === items.length) resolve(result);
        },
        reject,
      );
    });
  });
};

MyPromise.allSettled = function (iterable) {
  const items = Array.from(iterable);
  return new MyPromise((resolve) => {
    if (items.length === 0) {
      resolve([]);
      return;
    }

    const result = new Array(items.length);
    let completed = 0;
    const finishOne = () => {
      completed += 1;
      if (completed === items.length) resolve(result);
    };

    items.forEach((item, index) => {
      MyPromise.resolve(item).then(
        (value) => {
          result[index] = { status: 'fulfilled', value };
          finishOne();
        },
        (reason) => {
          result[index] = { status: 'rejected', reason };
          finishOne();
        },
      );
    });
  });
};

MyPromise.deferred = function () {
  const deferred = {};
  deferred.promise = new MyPromise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

module.exports = MyPromise;
