let symbol1 = Symbol("name");
let symbol2 = Symbol("name");

console.log(symbol1 === symbol2);

console.log(symbol1);

// 1. 在对象 key 中使用
const name1Symbol = Symbol("name");
const name2Symbol = Symbol("name");
const heyi = {
  [name1Symbol]: "heyi",
  [name2Symbol]: "heyi2",
};
// const heyi = {
//   name: "heyi",
//   name: "heyi2",
// };

console.log(heyi);

// 通过 Symbol 定义的key，属性会隐藏，forin，还是 Object.keys 都无法遍历
console.log(Object.keys(heyi));

const symbols = [name1Symbol, name2Symbol];

for (const symbol of symbols) {
  console.log(heyi[symbol]);
}

console.log(heyi[name1Symbol], heyi[name2Symbol]);

// =========框架库级别的 Symbol 使用特性=============
// React 源码，元素类型
// 1. 全局注册表
const globalSym1 = Symbol.for("globalKey");
const globalSym2 = Symbol.for("globalKey");

const localSym = Symbol("localKey");

console.log(Symbol.keyFor(globalSym1)); // 'globalKey'
console.log(Symbol.keyFor(localSym)); // undefined

// 2. iterator
// 通过 symbol 将对象变为按照指定规则迭代，for of 循环
const obj = {
  name: "heyi",
  age: 18,
  //   [Symbol.iterator]() {
  //     let step = 0;
  //     return {
  //       next() {
  //         return { value: step++, done: step > 5 };
  //       },
  //     };
  //   },
  [Symbol.iterator]() {
    const that = this;
    const keys = Object.keys(this);
    console.log("🚀 ~ keys:", keys);
    let step = -1;
    return {
      next() {
        step++;
        return {
          value: {
            [keys[step]]: that[keys[step]],
          },
          done: step >= keys.length,
        };
      },
    };
  },
};

for (const o of obj) {
  console.log(o);
}

class Heer {
  constructor() {}
}
const heer = new Heer();
heer[Symbol.toStringTag] = "Heer";
console.log("heer tostring", heer.toString());
