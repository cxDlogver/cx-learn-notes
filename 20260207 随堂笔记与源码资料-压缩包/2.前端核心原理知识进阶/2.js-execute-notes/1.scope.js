var a = 1;

function test() {
  var b = 2;
  // 新特性
  let c = 3;
}

function foo() {
  var a_var = 1;
  let b_let = 2;
  {
    let b_let = 3;
    var c_var = 4;
    let d_let = 5;
    console.log(a_var);
    console.log(b_let);
  }
  console.log(b_let);
  console.log(c_var);
  console.log(d_let);
}
