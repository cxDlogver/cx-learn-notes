// 延迟执行函数

function delay(delayTime) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve("delay");
    }, delayTime);
  });
}

async function test() {
  await delay(1000);
  console.log("delay1");
  await delay(1000);
  console.log("delay2");
  await delay(1000);
  console.log("delay3");
}

test();
