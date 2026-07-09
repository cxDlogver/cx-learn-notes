# 面向对象编程思想

## 对象基本概念

对象

面向对象

### 特征

1. 封装
2. 继承
3. 多态

```js
class Animal {
  color = undefined;

  eat() {
    console.log("eat");
  }
}
```

```js
class Dog extends Animal {
  beak() {
    console.log("beak");
  }
}
```

```js
// 我事先不知道到底是猫，还是狗，还是大象
function doSome(animal) {
  animal.eat(); // 不过问任何对象的细节，只关注对象抽象方法
}

class Dog extends Animal {
  beak() {
    console.log("beak");
  }
}

class Cat extends Animal {
  meom() {
    console.log("meom");
  }
}

const dog = new Dog();
const cat = new Cat();

doSome(dog);
doSome(cat);
```

## 原型 & 原型链

## 创建对象的多种方式&优缺点

1. 工厂模式创建
2. 构造函数
3. 原型模式
4. 组合