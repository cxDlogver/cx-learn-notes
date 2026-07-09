# 函数式编程思想

## 函数式编程思想基本概念

面向对象编程思想的问题

1. 状态难以管理
2. 副作用、可预测性差
3. 继承问题

```js
class Person {
  age = 18;

  state = {
    count: 1,
  };

  update() {
    this.state = {
      count: 2,
    };
  }

  plusAge(age) {
    // this.age++
    return age++;
  }

  some() {
    this.age--;
  }
}

class Student extends Person {}
```

面向对象编程思想可以解决库、相对固定流程封装 webpack、vite

函数式编程思想

1. 不可变性
2. 无副作用
3. 纯函数

```js
// 纯函数版本
function sum(a, b) {
  return a + b;
}

sum(4, 6);
```

```js
// 非纯函数版本
let a = 1,
  b = 1;

function sum() {
  return a + b;
}

a = 10;

sum();
```

react 类组件和 react 函数式组件哪个更灵活？
vue 选项式 API 和组合式 API 哪个更灵活

### 函数式编程思想核心

- 函数为一等公民
- 纯函数（Pure Functions）
- 不可变性（Immutability）
- 函数组合（Function Composition）
- 高阶函数（Higher-Order Functions）

## 纯函数

纯函数是这样一种函数，即相同的输入，永远会得到相同的输出，而且没有任何可观察的副作用。

## 函数柯里化

柯里化是函数式编程中的一个技术，它涉及将一个多参数的函数转换成一系列使用一个参数的函数。柯里化的函数通常返回另一个接受剩余参数的函数，这个过程一直持续，直到所有参数都被消耗掉。

```js
function sum(a, b, c, d) {
  return a + b + c + d;
}

// 一些其他操作，得到 a = 1
const subSum1 = sum(1);

// 中间又要做很多其他的操作
// 得到  b = 2
const subSum2 = subSum1(2);

// 中间做很多其他操作
// 得到 c = 3
const subSum3 = subSum2(3);

// 中间做很多其他操作
// 得到 d = 4
const subSum4 = subSum3(4);

sum(1, 2, 3, 4); // sum(1)(2)(3)(4)
```

同学们以后学习源码原理，都一定要在理解 API 和写法的基础上倒退实现

## 函数组合

为什么学习函数组合？
组合（Vue 组合式 API）是函数式编程思想中的复用逻辑
继承是面向对象编程思想中的复用逻辑

### 特性

1. 模块性：通过将小而专一的函数组合成复杂的行为，增强代码的模块性。
2. 可读性：适当的函数组合可以使代码更加直观和易于理解。
3. 复用性：独立的函数可以在多个地方被复用，减少代码重复。
4. 声明性：通过组合方式，代码更加声明性，聚焦于“做什么”而非“怎么做”。

题外话：指挥 AI 帮你自动剪视频

- 转字幕 whisper、巨量、阿里云【skill】
- 字幕识别高光时刻【skill】
- 搜集其他补充素材 agent browser【skill】
- 文字转语音合成 tts，基于 cosyvoive、f5-tts【skill】
- 合成 ffmpeg、ffprobe【skill】

```js
// pointfree 模式指的是，永远不必说出你的数据。
// 非 pointfree，因为提到了数据：word
var snakeCase = function (word) {
  //   return word.toLowerCase().replace(/\s+/ig, '_');
  const str1 = word.toLowerCase();

  const str2 = str1.replace(/\s+/gi, "_");

  return str2;
};

// function toLowerCase(s) {
//   return s.toLowerCase();
// }
// function replace(s) {
//   return s.replace(/\s+/gi, "_");
// }

// const str1 = toLowerCase("ffff");

// const str2 = replace(str1);

// pointfree
var snakeCase = compose(replace(/\s+/gi, "_"), toLowerCase);
```
