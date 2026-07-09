function delay(delayTime) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve("delay" + delayTime);
    }, delayTime);
  });
}

// async function test() {
//     await delay(1000)
//     console.log('1000ms 后')
//     await delay(1000)
//     console.log('1000ms 后')
// }

// test()
function* test() {
  yield delay(1000);
  console.log("1000ms 后");
  yield delay(1000);
  console.log("1000ms 后");
}

const t = test();
console.dir(t);

// const promise1 = t.next().value;
// console.log("🚀 ~ promise1:", promise1);
// promise1.then((v) => {
//   const promise2 = t.next().value;
//   console.log("🚀 ~ promise2:", promise2);

//   promise2.then((v) => {
//     const promise3 = t.next().value;
//     console.log("🚀 ~ promise3:", promise3);
//   });
// });
// 改造成链式调用写法
const promise1 = t.next().value;
console.log("🚀 ~ promise1:", promise1);
promise1
  .then((v) => {
    const promise2 = t.next().value;
    console.log("🚀 ~ promise2:", promise2);

    return promise2;
  })
  .then((v) => {
    const promise3 = t.next();
    console.log("🚀 ~ promise3:", promise3);
  });

// 变成自动调用
// /*
// ....###....##.....##.########..#######......######...########.##....##.########.########.....###....########.########
// ...##.##...##.....##....##....##.....##....##....##..##.......###...##.##.......##.....##...##.##......##....##......
// ..##...##..##.....##....##....##.....##....##........##.......####..##.##.......##.....##..##...##.....##....##......
// .##.....##.##.....##....##....##.....##....##...####.######...##.##.##.######...########..##.....##....##....######..
// .#########.##.....##....##....##.....##....##....##..##.......##..####.##.......##...##...#########....##....##......
// .##.....##.##.....##....##....##.....##....##....##..##.......##...###.##.......##....##..##.....##....##....##......
// .##.....##..#######.....##.....#######......######...########.##....##.########.##.....##.##.....##....##....########
// */

function fn(nums) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(nums * 2);
    }, 1000);
  });
}
function* gen() {
  const num1 = yield fn(1);
  console.log('🚀 ~ gen ~ num1:', num1)
  const num2 = yield fn(num1);
  console.log('🚀 ~ gen ~ num2:', num2)
  const num3 = yield fn(num2);
  console.log('🚀 ~ gen ~ num3:', num3)
  return num3;
}
// function generatorToAsync(generatorFn) {
//   return function () {
//     return new Promise((resolve, reject) => {
//       const g = generatorFn()
//       const next1 = g.next()
//       next1.value.then(res1 => {

//         const next2 = g.next(res1) // 传入上次的res1
//         next2.value.then(res2 => {

//           const next3 = g.next(res2) // 传入上次的res2
//           next3.value.then(res3 => {

//             // 传入上次的res3
//             resolve(g.next(res3).value)
//           })
//         })
//       })
//     })
//   }
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

const asyncFn = generatorToAsync(gen);

asyncFn().then((res) => console.log(res)); // 3秒后输出 8
