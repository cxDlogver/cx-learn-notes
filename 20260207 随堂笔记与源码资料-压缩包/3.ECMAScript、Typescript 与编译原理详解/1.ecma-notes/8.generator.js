// 生成器

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), ms);
  });
}

function* generateSequence() {
  console.log("sleep1");
  yield sleep(1000);
  console.log("sleep2");
  yield sleep(1000);
  console.log("sleep3");
  yield sleep(1000);
  console.log("sleep4");
  yield sleep(1000);
  console.log("sleep5");
  yield sleep(1000);
  console.log("sleep6");
  yield sleep(1000);
  console.log("sleep7");
}

const sequence = generateSequence();

// setTimeout(() => {
//   console.log(sequence.next());
// }, 1000);
// setTimeout(() => {
//   console.log(sequence.next());
// }, 2000);
// setTimeout(() => {
//   console.log(sequence.next());
// }, 3000);
// for (const s of sequence) {
//   console.log(s);
// }

// function generatorToAsync(generatorFn) {
//   return function () {
//     return new Promise((resolve, reject) => {
//       const g = generatorFn();
//       const next1 = g.next();

//       next1.value.then((res1) => {
//         const next2 = g.next(res1); // 传入上次的res1
//         next2.value.then((res2) => {
//           const next3 = g.next(res2); // 传入上次的res2
//           next3.value.then((res3) => {
//             // 传入上次的res3
//             resolve(g.next(res3).value);
//           });
//         });
//       });
//     });
//   };
// }
function generatorToAsync(generatorFn) {
  return function () {
    const gen = generatorFn.apply(this, arguments); // gen有可能传参

    // 返回一个Promise
    return new Promise((resolve, reject) => {
      function go(key, arg) {
        let res;
        try {
          res = gen[key](arg); // 这里有可能会执行返回reject状态的Promise
        } catch (error) {
          return reject(error); // 报错的话会走catch，直接reject
        }

        // 解构获得value和done
        const { value, done } = res;
        if (done) {
          // 如果done为true，说明走完了，进行resolve(value)
          return resolve(value);
        } else {
          // 如果done为false，说明没走完，还得继续走

          // value有可能是：常量，Promise，Promise有可能是成功或者失败
          return Promise.resolve(value).then(
            (val) => go("next", val),
            (err) => go("throw", err),
          );
        }
      }

      go("next"); // 第一次执行
    });
  };
}

const asyncfunc = generatorToAsync(generateSequence);

asyncfunc().then((res) => console.log(res));
