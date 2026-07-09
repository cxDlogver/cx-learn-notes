# ECMAScript 核心特性详解

## 变量定义新形式

var

- 变量提升
- 无法形成块级作用域
- 可以重复声明以及覆盖

```js
function test() {
  console.log(a); // 变量提升。var 声明的变量存储在变量环境中（let、const 声明的变量存储在词法环境）
  var a = 1;
}
```

```js
function test() {
  for (var i = 0; i < 5; i++) {
    ((i) => {
      // 即调函数形成了块级作用域
      setTimeout(() => {
        console.log(i);
      }, 100);
    })(i);
  }
}

var a = 1;

var a = "sdfsdf";
```

## Symbol

1. 在对象 key 中使用
2. 通过 Symbol 定义的key，属性会隐藏，forin，还是 Object.keys 都无法遍历

### 高级应用

1. Symbol.for，在 React 源码中用来定义元素类型，全局注册表
2. Symbol.iterator

## Set、Map、WeakSet、WeakMap

- Set，散列，类数组结构，特点
  - 元素值唯一
  - 可以存储任意类型
- WeakSet，类数组结构，特点
  - 元素值唯一
  - 只能存对象，不能存原始类型数据
  - 对象是弱引用，不会阻止垃圾回收
- Map，键值对集合，键可以是任意值
- WeakMap，只能够存储对象作为键

## class

## 模板字符串

```js
const name = "heyi";
const temp = "my name" + name + "sdfsd";

const temp2 = `my name is ${name}`;
```

## 解构语法

## 箭头函数

箭头函数与普通函数有哪些不同？
1. this 指向，箭头函数不能定义构造器
2. 不能 new 
3. 内部无 arguments 对象
4. this 绑定方法失效，比如：call apply bind


## Generator

生成器为了解决什么问题？
可中断，可恢复

## Proxy、Reflect

对象操作的代理
反射的方式进行对象操作


proxy 代理用来拦截对象，
reflect 更优雅的方式操作对象

## BigInt