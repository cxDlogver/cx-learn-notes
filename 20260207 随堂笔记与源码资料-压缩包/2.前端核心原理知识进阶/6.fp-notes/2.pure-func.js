// 什么是纯函数？

// 纯函数是这样一种函数，即相同的输入，永远会得到相同的输出，而且没有任何可观察的副作用。

function sum(a, b) {
  return a + b;
}

sum(1, 2); // 3
sum(1, 2);
sum(1, 2);
sum(1, 2);
sum(1, 2);
sum(1, 2);
sum(1, 2);

let a = 2,
  b = 1;
function sub() {
  return a - b;
}

function other() {
  a = 1;
}

sub(); // 1
sub(); // 1

// 调了其它函数
other();

sub(); // -1

// ========================================
// 是否是纯函数 ✅
function add1(a, b) {
  return a + b;
}

// 是否是纯函数 ❌
let c = 0;
function add2(a) {
  return a + c;
}

add2(1);
add2(1);
add2(1);

// 是否是纯函数 ❌
function add3(a, b) {
  return a + b + new Date().getTime();
}

// 是否是纯函数 ❌
function add4(a, b) {
  return a + b + Math.random();
}

// 是否是纯函数 ❌
async function add5(a) {
  const res = await fetch("xxx");
  return a + res.body;
}
