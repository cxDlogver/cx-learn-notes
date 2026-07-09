const square = function (x) {
  return x * x;
};

function memoize(func) {
  // 缓存，要么使用 {}，Map，[]
  const cache = {};

  // 技巧，当你要去加工一个函数的时候，没办法直接获取函数名称或者参数，这时你就要想到闭包/柯里化
  return function (...args) {
    const funcName = func.name;
    const funcArgs = args.join("_"); // 参数序列化 serialize

    const cacheKey = funcName + funcArgs;
    console.log('🚀 ~ memoize ~ cacheKey:', cacheKey)

    if (!!cache[cacheKey]) {
      console.log("缓存命中");
      //   return cache[cacheKey]
    }

    cache[cacheKey] = cache[cacheKey] || func(...args);

    // console.log("funcName===>", funcName, "funcArgs=====>", funcArgs);
    return cache[cacheKey];

  };
}

const squareNumber = memoize(square);

// 第一次需要计算
// 第二次如果输入的参数之前有计算过，那么就直接从缓存中拿取

squareNumber(2); // 2*2 = 4
squareNumber(2); // 4
squareNumber(2); // 4
squareNumber(2); // 4
squareNumber(2); // 4


// 可测试性
// const res = squareNumber(2) // 4