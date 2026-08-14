var obj = {0: 'a', 1: 'b', 2:{0:'c', 1:'d'}, length: 3};
/** Array.from 拓展 */
function Function1(){
  let array = Array.from(obj, function (value, index){
    console.log(value, index, this, arguments.length);
    return value;   //必须指定返回值，否则返回 undefined
  }, obj);

  // 模拟Array.from 函数功能
  console.log('-----------------------');
  function SimulateArrayFrom(obj, callback, thisArg){
    let array = [];
    for(let i = 0; i < obj.length; i++){
      array.push(callback.call(thisArg, obj[i], i));
    }
    return array;
  }

  let array2 = []
  array2.__proto__.simulateArrayFrom = SimulateArrayFrom
  console.log(array2.simulateArrayFrom(obj, function (value,  index){
    console.log(value, index, this, arguments.length);
    return value;   //必须指定返回值，否则返回 undefined
  }, obj))
}
// Function1()

/** 数组判断 */
function Function2(){
  const obj = []
  // console.log(Object.prototype.toString.call(obj))
  // 使用 call 是为了设置 this 指向 value，这样你可以对任意数据类型调用它。
  console.log(obj.__proto__.__proto__)
  console.log(obj)
}
// Function2()

/** 转化方法 */
function Function3(){
  let array= [{name:'zz'}, 123, "abc", new Date()];
  console.log(array.toString())
  console.log(array.join())
  console.log(array.join('-'))
  console.log(array.toLocaleString())
  console.log(array.valueOf())
}
// Function3()

/** reduce 方法 */
function Function4(){
  let array = [1, 2, 3, 4, 5];
  // let sum = array.reduce(function (pre, cur){
    // return pre + cur;
  // }, 0);
  function SimulateReduce(callback, initialValue = null){
    // console.log(this.slice(1))
    if (initialValue === null){
      initialValue = array[0];
      this.splice(0, 1);
    }
    let pre = initialValue
    for(let i = 0; i < this.length; i++){
      pre = callback(pre, this[i]);
    }
    return pre;
  }
  array.__proto__.simulateReduce = SimulateReduce
  console.log(array.simulateReduce(function (pre, cur){
    return pre + cur;
  }))
}
// Function4()

/** 查找与搜索 */
function Function5(){
  let array = [2, 3, 3, 4, 5];
  console.log(array.indexOf(3))
  console.log(array.lastIndexOf(3))
  console.log(array.includes(3))
  console.log(array.find(function (value){
    return value > 3;
  }))
  console.log(array.findIndex(function (value){
    return value > 3;
  }))
}
// Function5()

const json = {name: "zhangsan", "age": 18, "city": "beijing"};


// console.log(array);
debugger