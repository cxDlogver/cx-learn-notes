// 数字操作

function double(x) {
  return x * 2;
}

function increment(x) {
  return x + 1;
}

// 手动组合
// const doubleThenIncrement = (x) => increment(double(x));

// console.log(doubleThenIncrement(3)); // 输出 7 (3*2+1)

// 自动组合
function compose(...funcs) {
  // funcs = [increment, double]
  // return (x) => increment(double(x))
  return (x) =>
    funcs.reduceRight((prev, cur) => {
      console.log("prev", prev);
      console.log("cur", cur);
      return cur(prev);
    }, x);
}

// 自动组合
function pipe(...funcs) {
  return (x) =>
    funcs.reduce((prev, cur) => {
      console.log("prev", prev);
      console.log("cur", cur);
      return cur(prev);
    }, x);
}

const doubleThenIncrement = compose(increment, double);
console.log(doubleThenIncrement(3));


const incrementThenDouble = pipe(increment, double);
console.log(incrementThenDouble(3));
