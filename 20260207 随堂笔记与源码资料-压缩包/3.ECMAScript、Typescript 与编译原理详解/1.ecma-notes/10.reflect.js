const obj = {
  name: "heyi",
  age: 18,
};

const ageKey = 'age'
// obj[ageKey] = 19;
Reflect.set(obj, ageKey, 19)


console.log(obj);

// Reflect 反射，想要对象的操作更加优雅，更加符合函数式编程的风格
// Proxy 负责拦截
// Reflect 负责操作
// 并且方法名称，和对象的方法名称是一致的
// 比如：
// Reflect.get()
// Reflect.set()
// Reflect.has()
// Reflect.delete()
// Reflect.ownKeys()