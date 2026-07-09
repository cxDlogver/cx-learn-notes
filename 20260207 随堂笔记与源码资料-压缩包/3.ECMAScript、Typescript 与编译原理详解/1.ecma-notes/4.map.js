const map = new Map();

// 添加元素
map.set("name", "heyi");
map.set("age", 18);
map.set(14, "hah");
map.set({}, "some");

// 删除元素
map.delete("name");

console.log("🚀 ~ map[Symbol.iterator]:", map[Symbol.iterator]);
console.log("🚀 ~ [][Symbol.iterator]:", [][Symbol.iterator]);

for (const m of map) {
  console.log(m);
}

const weakMap = new WeakMap();
const o = {};
weakMap.set(o, "heyi"); // Vue3 响应式，依赖收集和更新触发
console.log('🚀 ~ weakMap:', weakMap)
