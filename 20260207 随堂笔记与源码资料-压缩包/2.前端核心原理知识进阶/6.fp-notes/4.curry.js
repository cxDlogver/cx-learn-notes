function sum(a, b, c, d) {
  return a + b + c + d;
}

console.log("sum 的参数有", sum.length);

// 我期望 sum(1, 2, 3, 4)   ===>  sum(1)(2)(3)(4)

function curry(func) {
  // 有多少个参数，就需要 return 多少个 function，递归
  // 函数的参数个数
  const len = func.length;

  //   判断当前到底有没有生成 len 个 function
  return function curried(...args) {
    // 如果当前传入参数个数等于或者大于了 func 参数个数，说明参数收集完成了
    if (args.len >= len) {
        console.log("参数收集完成，执行最终函数")
        return func.apply(this, args)
    } else {
        console.log("上一次的 args 是", args)
        return function(...args2) {
            console.log("参数收集中，上一次的 args 是", args, "本次传入参数 args2", args2)

            return curried.apply(this, args.concat(args2))
        }
    }
  };
}

const curriedSum = curry(sum)
// curriedSum(1)(2)(3)(4)
curriedSum(1, 2)(3, 4)

// function sum(a) {
//   return function (b) {
//     return function (c) {
//       return function (d) {
//         return a + b + c + d;
//       };
//     };
//   };
// }
// function sum(a, b) {
//   return function (c) {
//     return function (d) {
//       return a + b + c + d;
//     };
//   };
// }
// function sum(a, b) {
//   return function (c, d) {
//     return a + b + c + d;
//   };
// }

// const res = sum(1)(2)(3)(4);
// console.log('🚀 ~ res:', res)
