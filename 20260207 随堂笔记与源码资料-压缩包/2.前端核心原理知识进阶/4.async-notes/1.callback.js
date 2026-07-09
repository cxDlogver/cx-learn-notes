// 延迟执行函数

function delay(fn, delayTime) {
  setTimeout(fn, delayTime);
}


// 一秒以后执行，再一秒以后执行，再一秒以后执行
delay(() => {
  console.log('delay');
  delay(() => {
    console.log('delay2');
    delay(() => {
      console.log('delay3');
    }, 1000);
  }, 1000);
}, 1000);
