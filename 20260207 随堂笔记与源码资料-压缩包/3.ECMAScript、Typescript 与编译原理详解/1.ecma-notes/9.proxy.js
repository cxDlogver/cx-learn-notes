const obj = {
  name: "heyi",
  age: 18,
};

// 希望外部访问 obj 时候是被我控制的
const proxyObj = new Proxy(obj, {
  get(target, prop) {
    console.log("🚀 ~ target, prop:", target, prop); // vue 追踪访问属性的组件

    // return target[prop]; // 对象本体操作，因为不符合解耦性
    return Reflect.get(target, prop);
  },

  set(target, prop, value) {
    console.log("🚀 ~ target, prop, value:", target, prop, value); // vue 中响应式数据变化后触发组件的更新

    // target[prop] = value;
    Reflect.set(target, prop, value);
  },
  deleteProperty(target, prop) {
    console.log("删除了属性：", prop);
    delete target[prop];
  },
  has(target, prop) {
    console.log("看是否存在某个属性：", prop);
    return prop in target;
  },
  ownKeys(target) {
    console.log("获取所有属性：");
    return Reflect.ownKeys(target);
  },
});

console.log(proxyObj.name);
proxyObj.name = "heer";
console.log(proxyObj.name);
