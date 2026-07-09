// 数组
const numArr = [1, 2, 3, 3, 3, 4, 5, 7];
// 保证数字不重复
const set = new Set(numArr);
console.log("🚀 ~ set:", set);
// set api
set.add(0);
console.log("🚀 ~ set:", set);

set.delete(0);
console.log("🚀 ~ set:", set);

const set2 = new Set([1, 5, 7, 8, 9]);

// 差集 diff。不同内容拧出来
const diff = set.difference(set2);
console.log("🚀 ~ diff:", diff);

// 并集
const union = set.union(set2);
console.log("🚀 ~ union:", union);

// 交集
const inter = set.intersection(set2);
console.log("🚀 ~ inter:", inter);

// ========WeakSet

const weakSet = new WeakSet([{ name: "hah" }, { name: "sdgg" }]);
console.log("🚀 ~ weakSet:", weakSet);
