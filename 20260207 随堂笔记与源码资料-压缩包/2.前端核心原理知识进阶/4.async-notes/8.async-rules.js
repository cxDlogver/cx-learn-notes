function delay(delayTime) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve("delay");
    }, delayTime);
  });
}

async function test() {
  await delay(1000);
}


test()
