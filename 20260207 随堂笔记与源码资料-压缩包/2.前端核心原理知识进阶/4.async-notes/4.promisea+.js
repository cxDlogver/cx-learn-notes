// 对象形式的简单 promise 实现
const pr = {
  then(onFulfilled, onRejected) {
    setTimeout(() => {
      onFulfilled("success");
    }, 1000);
  },
};

// 函数形式的简单 promise 实现

function prfn() {}
prfn.then = function (onFulfilled, onRejected) {
  setTimeout(() => {
    onFulfilled("prfn success");
  }, 1000);
};

async function test() {
  // 测试 对象形式的
  //   const value = await pr;
  //   console.log("🚀 ~ test ~ value:", value);
  // 测试 函数形式的
  const value = await prfn;
  console.log("🚀 ~ test ~ value:", value);
}

test();