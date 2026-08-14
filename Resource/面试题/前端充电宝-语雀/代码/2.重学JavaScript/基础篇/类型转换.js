function Gen (time) {
  return new Promise((resolve,reject) => {
    setTimeout(function () {
       resolve(time)
    },time)
  })
}

async function test () {
   let arr = [Gen(2000),Gen(100),Gen(3000)]
   setTimeout(() => {
    console.log(arr)
    debugger

   }, 6000)
}
test()
