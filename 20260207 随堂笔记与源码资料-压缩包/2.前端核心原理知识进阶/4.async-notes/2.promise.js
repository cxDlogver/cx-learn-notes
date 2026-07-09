// 延迟执行函数

function delay(delayTime) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('delay');
        }, delayTime);
    })
}

// 一秒以后执行，再一秒以后执行，再一秒以后执行
delay(1000).then(res => {
    console.log(res);
    return delay(1000);
}).then(res => {
    console.log(res);
    return delay(1000);
}).then(res => {
    console.log(res);
});
