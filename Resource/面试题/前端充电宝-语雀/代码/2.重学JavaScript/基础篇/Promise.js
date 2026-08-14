function fun2() {
    let a,b,c
    return new Promise((resolve, reject)=>{
        a = 1
        resolve("")        
    }).then((resolve)=>{
        return new Promise((resolve,reject)=>{
            setTimeout(function(){
            	resolve('setTimeout')
        	},3000)
    	})
    }).then((resolve)=>{
        b = resolve
        return 'function'
    }).then((resolve)=>{
        c = resolve
        console.log(a,b,c)
    })
}
// fun2()


async function fun(){
    let a = await 1;
    let b = await new Promise((resolve,reject)=>{
        setTimeout(function(){
            resolve('setTimeout')
        },3000)
    })
    let c = await function(){
        return 'function'
    }()
    console.log(a,b,c)
}
// fun()

function log(time){
    setTimeout(function(){
        console.log(time);
        return 1;
    },time)
}
function fun2(){
  let a
    return new Promise((resolve, reject)=>{
      a = log(1000)

        resolve(a)
    }).then(resolve=>{
        log(3000);
        log(2000);
        console.log(a);
    	console.log(1)
    })
}
console.log(fun2())

