// let const

/**
 *  - 变量提升
    - 无法形成块级作用域
    - 可以重复声明以及覆盖
 */

// function test1() {
//   console.log(a); // 变量提升。var 声明的变量存储在变量环境中（let、const 声明的变量存储在词法环境）
//   let a = 1;
// }
// test1();

function test2() {
  for (let i = 0; i < 5; i++) {
    // 即调函数形成了块级作用域
    setTimeout(() => {
      console.log(i);
    }, 100);
  }
}

test2();

function test3() {
  let a = 1;

  let a = "sdfsdf";
}

test3();
