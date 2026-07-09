// 异步处理同步化
// 函数执行可中断

// function generator() {
//     return 1;
//     // return 2;
//     // return 3;
// }
function* generator() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = generator();


// 获得第一次结果
console.log(gen.next())
console.log(gen.next())
console.log(gen.next())


// redux-saga