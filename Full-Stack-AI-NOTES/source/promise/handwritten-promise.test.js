const assert = require('node:assert/strict');
const MyPromise = require('./handwritten-promise');

const toNative = (promise) =>
  new Promise((resolve, reject) => promise.then(resolve, reject));

(async () => {
  const order = [];
  const chained = MyPromise.resolve(1).then((value) => {
    order.push('then');
    return value + 1;
  });
  order.push('sync');

  assert.equal(await toNative(chained), 2);
  assert.deepEqual(order, ['sync', 'then']);

  const nestedThenable = {
    then(resolve) {
      resolve({
        then(nextResolve) {
          nextResolve(7);
        },
      });
    },
  };
  assert.equal(await toNative(MyPromise.resolve(nestedThenable)), 7);

  const propagated = await toNative(
    MyPromise.reject(new Error('boom')).catch((error) => error.message),
  );
  assert.equal(propagated, 'boom');

  const values = await toNative(
    MyPromise.all([
      new MyPromise((resolve) => setTimeout(() => resolve('a'), 10)),
      MyPromise.resolve('b'),
    ]),
  );
  assert.deepEqual(values, ['a', 'b']);

  let finallyCount = 0;
  const finalValue = await toNative(
    MyPromise.resolve(3).finally(() => {
      finallyCount += 1;
    }),
  );
  assert.equal(finalValue, 3);
  assert.equal(finallyCount, 1);

  let cycle;
  cycle = MyPromise.resolve('x').then(() => cycle);
  await assert.rejects(() => toNative(cycle), TypeError);

  const deferred = MyPromise.deferred();
  deferred.resolve(9);
  assert.equal(await toNative(deferred.promise), 9);

  console.log('self-tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
