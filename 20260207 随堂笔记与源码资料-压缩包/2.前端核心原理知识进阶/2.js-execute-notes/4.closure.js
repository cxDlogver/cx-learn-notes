function test(a) {
  //   let a = 1;
  return function test2(b) {
    return a + b; // 涉及到内部作用域存在外部数据的引用，闭包
  };
}

// function sum(a, b) {
//   return a + b;
// }

// sum(1, 2)

function sum(a) {
    function sum2(b) {
        return a + b;
    }

    return sum2;
}

const sum1 = sum(1);
// 中间做了很多操作以后，接下来可以接着来调用求和函数
sum1(2);

test(1)(2);
