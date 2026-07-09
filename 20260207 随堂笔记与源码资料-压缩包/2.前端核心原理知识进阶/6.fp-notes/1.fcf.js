// 我们以前有个错觉，认为函数很特殊

// function test(a, b) {
//   return a + b;
// }
// function test(fna, fnb) {
//   return fna() + fna();
// }

// 1. 函数一样可以作为参数传递
function test(func) {
  const a = 1;
  const b = 2;
  return func(a, b);
}


// 2. 可以作为返回值
function test2() {
    return function() {
        // .....
    }
}

const fn2 = test2();
fn2()


// 3. 函数可以赋值给变量
const fn3 = test2()


// 4. 可存储
// 比如说在 React 里面，useMemo、useCallback 就是缓存场景
// useMemo 缓存最终计算结果
// useCallback 缓存函数
// 待会儿会给大家实现一个 memorize 函数讲解函数的存储特性