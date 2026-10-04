## TypeScript 简介

TypeScript由微软开发，是基于JavaScript的一门扩展语言，本质上是JavaScript的超集，包含JavaScript的所有语法和功能，同时增加了静态类型检查、接口、泛型等现代开发特性，更适合大型项目的开发与维护。

与JavaScript不同，TypeScript无法被浏览器或其他JavaScript运行环境直接执行，必须先编译为JavaScript代码，再交由运行环境解析执行。其设计目标是解决JavaScript在大型项目中出现的类型混乱、维护困难等问题，提升代码的可读性、可维护性和健壮性。

### 核心知识点补充

1. 超集特性：TypeScript完全兼容JavaScript，任何合法的JavaScript代码都可以直接在TypeScript环境中运行，无需修改。
2. 静态类型：在代码编写阶段就对变量、函数参数、返回值等进行类型检查，提前发现错误，避免运行时出现类型相关的异常。

### 对应问题

1. TypeScript与JavaScript的核心关系是什么？
2. TypeScript为什么不能直接被浏览器执行？需要经过什么步骤才能执行？
3. TypeScript相比JavaScript，新增的核心特性有哪些？其核心优势是什么？

## 为何需要 TypeScript

### 今非昔比的 JavaScript

JavaScript诞生时的定位是浏览器脚本语言，用于在网页中嵌入简单的交互逻辑，代码量少、功能简单。随着技术的发展，JavaScript的应用场景不断扩展，如今已实现全栈编程（前端、后端、移动端等），项目代码量也大幅增加，一个普通的JavaScript项目代码量可轻松达到几万行甚至十几万行。

但JavaScript的设计初衷并未考虑到如今的大规模应用场景，导致其在大型项目开发中逐渐暴露出诸多问题，难以满足工程化开发的需求。

### JavaScript 中的困扰

1. 不清楚的数据类型：JavaScript是动态类型语言，变量的类型可随时改变，容易出现类型不匹配的错误，且错误只能在运行时发现。

```typescript
let welcome = 'hello';
welcome(); // 运行时报错：TypeError: welcome is not a function
```

2. 有漏洞的逻辑：由于类型不明确，容易出现逻辑漏洞，导致代码执行结果不符合预期。

```typescript
const str = Date.now() % 2 ? '奇数' : '偶数';

if (str !== '奇数') {
  alert('hello');
} else if (str === '偶数') {
  alert('world');
}
// 逻辑漏洞：当str为'奇数'时，两个条件都不满足，无任何弹窗
```

3. 访问不存在的属性：拼写错误或逻辑疏忽导致访问对象不存在的属性，运行时才会报错，难以提前排查。

```typescript
const obj = { width: 10, height: 15 };
const area = obj.width * obj.heigth; // 拼写错误：heigth应为height，运行时NaN
```

4. 低级的拼写错误：函数名、变量名拼写错误，同样只能在运行时发现，增加调试成本。

```typescript
const message = 'hello,world';
message.toUperCase(); // 拼写错误：toUperCase应为toUpperCase，运行时报错
```

### 静态类型检查

静态类型检查是TypeScript的核心功能，指在代码运行前对代码进行类型检查，发现错误或不合理之处，将运行时的错误前置，减小运行时异常的几率。

虽然使用TypeScript编写的代码量会略多于JavaScript，但TypeScript的代码结构更清晰、类型更明确，在后期代码维护、迭代时，效率远高于JavaScript，尤其适合多人协作的大型项目。

### 对应问题

1. JavaScript在大型项目中主要存在哪些困扰？这些困扰的核心原因是什么？
2. 什么是静态类型检查？TypeScript的静态类型检查能解决JavaScript的哪些问题？
3. 既然TypeScript代码量更多，为什么还推荐大型项目使用TypeScript？

## 编译 TypeScript

浏览器和其他JavaScript运行环境只能解析执行JavaScript代码，无法直接识别TypeScript代码，因此必须将TypeScript代码编译为JavaScript代码后，才能正常执行。TypeScript的编译主要分为命令行编译和自动化编译两种方式。

### 命令行编译

命令行编译适用于简单的单个文件编译，需要先配置TypeScript编译环境，具体步骤如下：

1. 创建.ts文件：新建一个后缀为.ts的文件，编写TypeScript代码。

```typescript
// demo.ts
const person = {
  name: '李四',
  age: 18
};
console.log(`我叫${person.name}，我今年${person.age}岁了`);
```

2. 全局安装TypeScript：通过npm全局安装TypeScript编译工具，安装完成后可使用tsc命令进行编译。

```bash
npm i typescript -g
```

3. 执行编译命令：使用tsc命令指定要编译的.ts文件，编译后会在同级目录生成对应的.js文件。

```bash
tsc demo.ts // 编译demo.ts，生成demo.js
```

### 自动化编译

命令行编译每次修改.ts文件后都需要手动执行编译命令，效率较低，自动化编译可实现文件变化时自动编译，适用于项目开发场景，具体步骤如下：

1. 创建编译控制文件：执行tsc --init命令，在项目根目录生成tsconfig.json配置文件，该文件包含所有编译相关的配置项。

```bash
tsc --init
```

生成的tsconfig.json文件中，默认编译后的JS版本为ES7，可根据项目需求手动修改target配置项，指定编译后的JS版本（如ES5、ES6等）。

2. 监视文件变化：执行tsc --watch（或简写为tsc -w）命令，监视项目中所有.ts文件的变化，当文件修改并保存后，会自动进行编译。

```bash
tsc --watch // 或 tsc -w
```

3. 编译优化：执行tsc --noEmitOnError --watch命令，当编译出现错误时，不会生成.js文件，避免错误的JS文件被执行。也可以直接修改tsconfig.json中的noEmitOnError配置项为true，实现同样的效果。

```bash
tsc --noEmitOnError --watch
```

### 核心知识点补充

1. tsconfig.json是TypeScript的编译配置文件，核心配置项包括target（编译后JS版本）、module（模块规范）、outDir（编译后JS文件输出目录）、rootDir（TS文件根目录）等。
2. 局部安装TypeScript：若不想全局安装，可在项目中局部安装（npm i typescript --save-dev），通过npx tsc执行编译命令。

### 对应问题

1. TypeScript编译的核心目的是什么？
2. 命令行编译和自动化编译的区别是什么？分别适用于什么场景？
3. tsc --init命令的作用是什么？noEmitOnError配置项的作用是什么？

## 类型声明

TypeScript的核心是静态类型，类型声明是指定变量、函数参数、函数返回值等类型的方式，使用冒号（:）来实现，通过类型声明可以约束数据的类型，提前发现类型错误。

### 基本类型声明

对变量进行类型声明后，变量只能存储对应类型的值，若赋值类型不匹配，TypeScript会直接提示警告。

```typescript
// 变量类型声明
let a: string;  // 变量a只能存储字符串
let b: number;  // 变量b只能存储数值
let c: boolean; // 变量c只能存储布尔值

a = 'hello'; // 合法
a = 100;     // 警告：不能将类型“number”分配给类型“string”

b = 666;     // 合法
b = '你好';   // 警告：不能将类型“string”分配给类型“number”

c = true;    // 合法
c = 666;     // 警告：不能将类型“number”分配给类型“boolean”
```

### 函数类型声明

函数类型声明需要指定函数参数的类型和函数返回值的类型，确保函数调用时参数的类型、数量正确，返回值类型符合预期。

```typescript
// 函数参数x、y必须是number类型，返回值也必须是number类型
function demo(x: number, y: number): number {
  return x + y;
}

demo(100, 200);  // 合法
demo(100, '200'); // 警告：类型“string”的参数不能赋给类型“number”的参数
demo(100, 200, 300); // 警告：应有 2 个参数，但获得 3 个
demo(100); // 警告：应有 2 个参数，但获得 1 个
```

### 字面量类型声明

除了基本类型，还可以使用字面量作为类型，指定变量只能取某个具体的值，实际开发中使用频率较低，主要用于一些固定值的约束。

```typescript
let a: '你好'; // 变量a的值只能是字符串“你好”
let b: 100;    // 变量b的值只能是数字100

a = '欢迎'; // 警告：不能将类型“"欢迎"”分配给类型“"你好"”
b = 200;    // 警告：不能将类型“200”分配给类型“100”
```

### 对应问题

1. TypeScript中如何进行类型声明？核心语法是什么？
2. 函数类型声明需要约束哪些内容？未按声明的类型调用函数会出现什么情况？
3. 字面量类型的作用是什么？实际开发中可能在什么场景下使用？

## 类型推断

TypeScript具有自动类型推断功能，即当开发者未明确指定变量类型时，TypeScript会根据变量的初始化值、赋值操作等，自动推断出变量的类型，无需手动声明。

```typescript
// 未明确声明类型，TypeScript自动推断d的类型为number
let d = -99;
d = false; // 警告：不能将类型“boolean”分配给类型“number”
```

### 核心注意点

1. 类型推断仅适用于简单类型（基本类型、简单对象等），对于复杂类型（如嵌套对象、泛型、联合类型等），推断容易出现偏差，无法准确约束类型。
2. 为了保证代码的健壮性和可读性，在开发中，尤其是大型项目中，建议对所有变量、函数等明确编写类型声明，避免依赖类型推断。

### 对应问题

1. 什么是TypeScript的类型推断？它的作用是什么？
2. 类型推断的局限性是什么？为什么不建议过度依赖类型推断？

## 类型总览

TypeScript的类型体系基于JavaScript的类型，同时扩展了新的类型和自定义类型的方式，整体分为JavaScript原生类型、TypeScript新增类型、自定义类型三种。

### JavaScript 中的数据类型

JavaScript包含8种基本数据类型，其中前7种为原始类型，最后1种为引用类型：

1. string：字符串类型，如`'hello'`、`"world"`；
2. number：数值类型，包含整数和浮点数，如`100`、`3.14`；
3. boolean：布尔类型，只有`true`和`false`两个值；
4. null：表示空值，是一个单独的类型；
5. undefined：表示未定义，变量声明后未赋值时的默认值；
6. bigint：大整数类型，用于表示超出number范围的整数，如`100n`；
7. symbol：唯一值类型，用于创建唯一的标识符，如`Symbol('key')`；
8. object：引用类型，包含数组（Array）、函数（Function）、日期（Date）、错误（Error）等所有非原始类型。

### TypeScript 中的数据类型

TypeScript完全兼容JavaScript的所有类型，同时新增了6种类型，并提供了两种自定义类型的方式：

1. 新增6种类型：

   - any：任意类型，放弃类型检查，可赋值为任意类型；

   - unknown：未知类型，类型安全的any，使用前必须进行类型检查；

   - never：永不存在的类型，不能赋值任何值；

   - void：空类型，主要用于函数返回值，表示函数不返回任何值；

   - tuple：元组类型，固定长度、固定元素类型的数组；

   - enum：枚举类型，用于定义一组命名常量。

2. 自定义类型方式：

   - type：类型别名，为任意类型创建别名，实现类型复用；

   - interface：接口，用于定义对象、类、函数的结构。

### 原始类型与包装对象的区别

JavaScript中存在原始类型和对应的包装对象（Number、String、Boolean），TypeScript中进行类型声明时，需注意两者的区别：

1. 原始类型：如`number`、`string`、`boolean`，是简单数据类型，内存占用少、处理速度快，日常开发中主要使用原始类型进行类型声明。
2. 包装对象：如`Number`、`String`、`Boolean`，是复杂引用类型，内存占用多，日常开发中很少由开发者手动创建。

```typescript
let str1: string;
str1 = 'hello'; // 合法
str1 = new String('hello'); // 报错：不能将类型“String”分配给类型“string”

let str2: String;
str2 = 'hello'; // 合法（自动装箱）
str2 = new String('hello'); // 合法
```

3. 自动装箱：JavaScript在必要时会自动将原始类型包装成对应的包装对象，以便调用方法或访问属性（如字符串的`length`属性），操作完成后会自动销毁临时包装对象，开发者无感知。

```typescript
// 原始类型字符串
let str = 'hello';

// 访问str.length时，JavaScript引擎自动完成装箱操作
let size = str.length; // 等价于：new String(str).length，之后销毁临时对象
console.log(size); // 输出: 5
```

### 对应问题

1. JavaScript的8种数据类型分为哪两类？分别包含哪些类型？
2. TypeScript新增的6种类型分别是什么？各自的核心作用是什么？
3. TypeScript中`string`和`String`的区别是什么？什么是自动装箱？

## 常用类型与语法

### any 类型

any类型表示任意类型，一旦将变量声明为any类型，就意味着放弃了对该变量的类型检查，变量可以赋值为任意类型，也可以调用任意方法、访问任意属性，不会出现类型警告。

any类型分为显式any和隐式any：

```typescript
// 显式any：明确声明变量类型为any
let a: any;
a = 100; // 合法
a = '你好'; // 合法
a = false; // 合法

// 隐式any：未声明类型，且未初始化，TypeScript自动推断为any
let b;
b = 100; // 合法
b = '你好'; // 合法
b = false; // 合法
```

核心注意点：any类型的变量可以赋值给任意类型的变量，即使类型不匹配，也不会出现警告，这会破坏TypeScript的类型安全，因此开发中应尽量避免使用any类型。

```typescript
let c: any = 9;
let x: string;
x = c; // 无警告，即使c是number类型
```

### unknown 类型

unknown类型表示未知类型，适用于起初不确定数据具体类型、后期才能确定的场景，可理解为“类型安全的any”，相比any类型，unknown类型更安全，因为它会强制开发者在使用前进行类型检查。

```typescript
// 声明变量a为unknown类型
let a: unknown;
a = 100; // 合法
a = false; // 合法
a = '你好'; // 合法

let x: string;
x = a; // 警告：不能将类型“unknown”分配给类型“string”
```

使用unknown类型的变量时，需通过以下方式确认类型，才能正常使用：

```typescript
let a: unknown = 'hello';

// 方式1：类型判断
if (typeof a === 'string') {
  x = a; // 合法，此时a被推断为string类型
}

// 方式2：类型断言（as关键字）
x = a as string;

// 方式3：类型断言（尖括号语法）
x = <string>a;
```

核心区别：读取any类型变量的任何属性、调用任何方法都不会报错，而unknown类型变量未进行类型检查前，无法访问属性或调用方法。

```typescript
let str3: unknown = 'hello';
str3.toUpperCase(); // 警告：“str3”的类型为“未知”

// 断言后可正常调用方法
(str3 as string).toUpperCase(); // 合法
```

### never 类型

never类型表示“永不存在的值”，即不能赋值任何值（包括undefined、null、''、0等），几乎不会手动用never限制变量，因为没有实际意义，通常是TypeScript自动推断出来的。

```typescript
// 手动声明never类型变量，无实际意义
let a: never;
a = 1; // 警告
a = true; // 警告
a = undefined; // 警告
```

never类型的常见场景：

1. 逻辑无法到达的代码块：TypeScript会推断该代码块中变量的类型为never。

```typescript
let a: string = 'hello';
if (typeof a === 'string') {
  console.log(a.toUpperCase());
} else {
  console.log(a); // a的类型被推断为never，因为逻辑上无法进入该分支
}
```

2. 函数返回值：表示函数永远不会返回（如函数内部抛出错误）。

```typescript
// 函数抛出错误，永远不会返回值，返回类型为never
function throwError(str: string): never {
  throw new Error('程序异常退出:' + str);
}
```

### void 类型

void类型表示“空”，主要用于函数返回值声明，表示函数不返回任何值，调用者不应依赖其返回值进行任何操作。

```typescript
// 函数返回类型为void，不返回任何值
function logMessage(msg: string): void {
  console.log(msg);
}
```

核心注意点：

1. 函数未显式编写return语句时，会有隐式返回值undefined，而void类型可以接受undefined，即函数返回undefined时，也符合void类型的声明。

```typescript
// 以下三种写法均合法
function log1(msg: string): void { console.log(msg); }
function log2(msg: string): void { console.log(msg); return; }
function log3(msg: string): void { console.log(msg); return undefined; }
```

2. void与undefined的区别：void是“空”的概念，是一种语义上的约定（调用者不应依赖返回值），而undefined是void的一种具体实现（空的具体值）；返回值为void的函数，调用者无法用其返回值进行逻辑判断，而返回值为undefined的函数可以。

```typescript
// 返回值为void，无法判断返回值的真实性
function log1(msg: string): void { console.log(msg); }
let res1 = log1('你好');
if (res1) { /* 报错：无法测试 "void" 类型的表达式的真实性 */ }
// 返回值为undefined，可以判断返回值的真实性
function log2(msg: string): undefined { console.log(msg); }
let res2 = log2('你好');
if (res2) { /* 无警告，虽res2是undefined，但语法允许判断 */ }
```

### object 类型

TypeScript中有两种object类型：小写的object和大写的Object，两者范围不同，实际开发中使用频率都较低，因为范围过于宽泛。

1. object（小写）：表示所有非原始类型，即除了string、number、boolean、null、undefined、bigint、symbol之外的所有类型，可存储对象、数组、函数等。

```typescript
let a: object;
// 合法：非原始类型
a = {};
a = [1, 3, 5];
a = function() {};
a = new String('123');

// 警告：原始类型
a = 1;
a = '你好';
a = null;
```

2. Object（大写）：官方描述为“所有可以调用Object方法的类型”，简单记忆为“除了null和undefined之外的任何值”，范围比小写object更宽泛，包括原始类型的包装对象。

```typescript
let b: Object;
// 合法：除null、undefined之外的所有值
b = {};
b = 1; // 1的包装对象Number是Object的实例
b = '你好'; // 字符串的包装对象String是Object的实例

// 警告
b = null;
b = undefined;
```

### 声明对象类型

实际开发中，限制普通对象的类型，通常直接指定对象的属性和属性类型，可选属性用`?`表示，属性之间可用逗号、分号或换行分隔。

```typescript
// 限制person1必须有name属性，age为可选属性
let person1: { name: string, age?: number };

// 等价写法
let person2: { name: string; age?: number };
let person3: {
  name: string;
  age?: number;
};

// 合法赋值
person1 = { name: '李四', age: 18 };
person2 = { name: '张三' };

// 不合法：包含未声明的gender属性
person3 = { name: '王五', gender: '男' };
```

索引签名：用于描述具有动态属性的对象，允许对象拥有任意数量的指定类型的属性，语法为`[key: 键类型]: 值类型`，key可替换为任意名称。

```typescript
// 限制name为必填，age为可选，其他属性可任意（键为string，值为any）
let person: {
  name: string;
  age?: number;
  [key: string]: any; // 索引签名
};

// 合法赋值
person = {
  name: '张三',
  age: 18,
  gender: '男',
  address: '北京'
};
```

### 声明函数类型

函数类型声明用于约束函数的参数类型和返回值类型，语法为`(参数1: 类型1, 参数2: 类型2) => 返回值类型`，其中`=>`用于描述函数类型，与JavaScript中的箭头函数语法区分开。

```typescript
// 声明count是一个函数，参数为两个number，返回值为number
let count: (a: number, b: number) => number;

// 合法赋值
count = function(x, y) {
  return x + y;
};
```

注意：TypeScript中的`=>`用于描述函数类型（参数和返回值的约束），而JavaScript中的`=>`是箭头函数的语法（函数实现），两者含义不同。

### 声明数组类型

数组类型声明有两种方式，推荐使用第一种（简洁直观），第二种基于泛型实现。

```typescript
// 方式1：类型[]
let arr1: string[]; // 数组元素只能是string
arr1 = ['a', 'b', 'c'];

// 方式2：Array<类型>（泛型写法）
let arr2: Array<string>;
arr2 = ['hello', 'world'];
```

### tuple 元组类型

元组是一种特殊的数组类型，用于描述固定长度、固定元素类型的数组，元素类型可以不同，可选元素用`?`表示，还可以通过扩展运算符表示可变长度的后续元素。

```typescript
// 固定2个元素：第一个string，第二个number
let arr1: [string, number];
// 固定1-2个元素：第一个number，第二个可选boolean
let arr2: [number, boolean?];
// 至少1个元素：第一个number，后续可任意多个string
let arr3: [number, ...string[]];

// 合法赋值
arr1 = ['hello', 123];
arr2 = [100, false];
arr2 = [200];
arr3 = [100, 'hello', 'world'];

// 不合法：arr1固定2个元素，赋值3个
arr1 = ['hello', 123, false];
```

### enum 枚举类型

枚举用于定义一组命名常量，增强代码的可读性和可维护性，适用于一组相关的、固定的取值场景（如方向、状态等），分为数字枚举、字符串枚举和常量枚举三种。

1. 数字枚举：最常见的枚举类型，成员值默认自动递增（从0开始），支持反向映射（通过值获取枚举成员名称），枚举成员为只读属性，不能修改。

```typescript
// 数字枚举，成员值默认0、1、2、3
enum Direction {
  Up,
  Down,
  Left,
  Right
}

console.log(Direction.Up); // 0
console.log(Direction[0]); // 'Up'（反向映射）
Direction.Up = 'shang'; // 报错：枚举成员是只读的
```

也可以指定枚举成员的初始值，后续成员值会自动递增。

```typescript
enum Direction {
  Up = 6,
  Down, // 7
  Left, // 8
  Right // 9
}
console.log(Direction.Down); // 7
```

2. 字符串枚举：枚举成员的值为字符串，不支持反向映射，每个成员必须显式指定值。

```typescript
enum Direction {
  Up = "up",
  Down = "down",
  Left = "left",
  Right = "right"
}

let dir: Direction = Direction.Up;
console.log(dir); // 'up'
```

3. 常量枚举：用`const`关键字定义，编译时会被内联（将枚举成员引用替换为实际值），减少生成的JavaScript代码量，提升运行性能，不支持反向映射。

```typescript
// 常量枚举
const enum Directions {
  Up,
  Down,
  Left,
  Right
}

let x = Directions.Up; // 编译后：let x = 0; （内联替换）
```

枚举的应用场景：替代魔法字符串（无意义的字符串常量），让代码更直观。

```typescript
// 未使用枚举（魔法字符串，易写错）
function walk(str: string) {
  if (str === 'up') { /* 逻辑 */ }
}

// 使用枚举（类型安全，可读性强）
enum Direction { Up, Down, Left, Right }
function walk(n: Direction) {
  if (n === Direction.Up) { /* 逻辑 */ }
}
```

### type 类型别名

type用于为任意类型创建别名，简化类型声明，提升代码可读性，支持类型复用和扩展，可用于基本类型、联合类型、交叉类型等所有类型。

1. 基本用法：为基本类型创建别名，简化重复的类型声明。

```typescript
// 为number类型创建别名num
type num = number;
let price: num = 100;
```

2. 联合类型：表示一个值可以是几种不同类型之一，用`|`分隔。

```typescript
// Status可以是number或string
type Status = number | string;
// Gender只能是'男'或'女'
type Gender = '男' | '女';

function printStatus(status: Status) {
  console.log(status);
}

printStatus(404); // 合法
printStatus('200'); // 合法
```

3. 交叉类型：将多个类型合并为一个类型，合并后的类型拥有所有被合并类型的成员，用`&`分隔，常用于对象类型的合并。

```typescript
// 面积类型
type Area = {
  height: number;
  width: number;
};

// 地址类型
type Address = {
  num: number; // 楼号
  cell: number; // 单元号
};

// House类型合并Area和Address的所有属性
type House = Area & Address;

const house: House = {
  height: 180,
  width: 75,
  num: 6,
  cell: 3
};
```

特殊情况：用type声明函数返回值为void时，TypeScript不会严格要求函数返回空，允许返回非空值，这是为了兼容一些场景（如数组forEach的回调函数）。

```typescript
type LogFunc = () => void;

// 允许返回非空值
const f1: LogFunc = () => 100;
```

### 对应问题

1. any类型和unknown类型的区别是什么？为什么推荐使用unknown而非any？
2. void类型和undefined类型的核心区别是什么？函数返回值为void时，允许返回什么值？
3. 元组和普通数组的区别是什么？枚举类型的核心作用是什么？
4. type类型别名支持哪些类型？联合类型和交叉类型的区别是什么？

## 类相关知识复习

TypeScript完全兼容JavaScript的类语法，同时增加了类型声明、属性修饰符、抽象类等特性，让类的定义更规范、更安全。

### 基本类语法

```typescript
class Person {
  // 属性声明（指定类型）
  name: string;
  age: number;

  // 构造器（初始化属性）
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  // 方法声明
  speak() {
    console.log(`我叫：${this.name}，今年${this.age}岁`);
  }
}

// 创建实例
const p1 = new Person('周杰伦', 38);
p1.speak();
```

类的继承：使用`extends`关键字实现继承，子类可以继承父类的属性和方法，还可以重写父类的方法（用`override`关键字标识）。

```typescript
class Student extends Person {
  // 子类新增属性
  grade: string;

  // 构造器（必须调用super()调用父类构造器）
  constructor(name: string, age: number, grade: string) {
    super(name, age); // 调用父类构造器
    this.grade = grade;
  }

  // 重写父类的speak方法
  override speak() {
    console.log(`我是学生，我叫：${this.name}，今年${this.age}岁，在读${this.grade}年级`);
  }

  // 子类新增方法
  study() {
    console.log(`${this.name}正在努力学习中......`);
  }
}
```

### 属性修饰符

TypeScript提供了四种属性修饰符，用于控制类属性的访问权限和可修改性：

1. public（公开的）：默认修饰符，类内部、子类、类外部都可以访问该属性。

```typescript
class Person {
  public name: string;
  age: number; // 默认public

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  speak() {
    console.log(this.name); // 类内部可访问
  }
}

const p1 = new Person('张三', 18);
console.log(p1.name); // 类外部可访问

class Student extends Person {
  study() {
    console.log(this.name); // 子类可访问
  }
}
```

2. protected（受保护的）：类内部、子类可以访问，类外部无法访问。

```typescript
class Person {
  constructor(
    protected name: string, // 受保护属性
    protected age: number
  ) {}

  protected getDetails() { // 受保护方法
    return `我叫：${this.name}，年龄：${this.age}`;
  }

  introduce() {
    console.log(this.getDetails()); // 类内部可访问受保护方法
  }
}

const p1 = new Person('杨超越', 18);
p1.introduce(); // 公开方法可访问
// p1.name; // 报错：类外部无法访问受保护属性
// p1.getDetails(); // 报错：类外部无法访问受保护方法
```

3. private（私有的）：只有类内部可以访问，子类、类外部都无法访问。

```typescript
class Person {
  constructor(
    public name: string,
    private IDCard: string // 私有属性
  ) {}

  private getPrivateInfo() { // 私有方法
    return `身份证：${this.IDCard}`;
  }

  getFullInfo() {
    return `${this.name}，${this.getPrivateInfo()}`; // 类内部可访问
  }
}

const p1 = new Person('张三', '110114198702034432');
console.log(p1.getFullInfo()); // 公开方法可访问
// p1.IDCard; // 报错：类外部无法访问私有属性
```

4. readonly（只读属性）：属性声明后无法修改，只能在构造器中初始化。

```typescript
class Car {
  constructor(
    public readonly vin: string, // 只读属性
    public color: string
  ) {}
}

const car = new Car('1HGCM82633A123456', '黑色');
// car.vin = '123'; // 报错：只读属性无法修改
```

属性简写：在构造器中使用修饰符，可以直接简化属性的声明和初始化，无需在类中单独声明属性。

```typescript
// 简写前
class Person {
  public name: string;
  public age: number;
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
}

// 简写后（等价）
class Person {
  constructor(
    public name: string,
    public age: number
  ) {}
```

### 抽象类

抽象类是一种无法被实例化的类，用`abstract`关键字定义，专门用于为派生类提供基础结构，类中可以包含抽象方法（无实现）和具体方法（有实现），派生类必须实现抽象类中的所有抽象方法。

```typescript
// 抽象类（无法实例化）
abstract class Package {
  constructor(public weight: number) {}

  // 抽象方法（无实现，派生类必须实现）
  abstract calculate(): number;

  // 具体方法（有实现，派生类可继承）
  printPackage() {
    console.log(`包裹重量：${this.weight}kg，运费：${this.calculate()}元`);
  }
}

// 派生类（实现抽象方法）
class StandardPackage extends Package {
  constructor(
    weight: number,
    public unitPrice: number // 每公斤费率
  ) { super(weight); }

  // 实现抽象方法
  calculate(): number {
    return this.weight * this.unitPrice;
  }
}

// const p = new Package(10); // 报错：抽象类无法实例化
const s1 = new StandardPackage(10, 5);
s1.printPackage(); // 调用继承的具体方法
```

抽象类的使用场景：

1. 为一组相关的类定义通用接口和基础逻辑；
2. 强制派生类实现关键方法，确保类的一致性；
3. 共享代码逻辑，避免重复编写。

### 对应问题

1. TypeScript中四种属性修饰符的作用分别是什么？访问权限有何区别？
2. 抽象类的核心特点是什么？为什么不能实例化抽象类？
3. 子类继承父类时，需要注意什么？如何重写父类的方法？

## interface（接口）

interface用于定义结构契约，规定对象、类、函数等的格式，只能定义结构（属性、方法的声明），不能包含任何实现代码，核心作用是确保代码的一致性和类型安全。

### 定义类结构

使用`implements`关键字让类实现接口，类必须实现接口中声明的所有属性和方法，否则会报错。

```typescript
// 定义接口（规定类的结构）
interface PersonInterface {
  name: string;
  age: number;
  speak(n: number): void; // 方法声明（无实现）
}

// 类实现接口
class Person implements PersonInterface {
  constructor(
    public name: string,
    public age: number
  ) {}

  // 实现接口中的speak方法
  speak(n: number): void {
    for (let i = 0; i < n; i++) {
      console.log(`我叫${this.name}，今年${this.age}岁`);
    }
  }
}
```

### 定义对象结构

接口可用于描述对象的属性、属性类型，支持可选属性、只读属性，还可通过索引签名描述动态属性，确保对象结构符合预期，提升代码的可维护性。

1. 可选属性：用`?`标识，标识该属性可选，对象中可包含也可不包含该属性，适用于属性非必需的场景。

```typescript
// 定义接口，age为可选属性
interface User {
  name: string; // 必选属性
  age?: number; // 可选属性
  gender?: string; // 可选属性
}

// 合法赋值：包含必选属性，可选属性可省略
const user1: User = { name: '张三' };
// 合法赋值：包含必选属性和部分可选属性
const user2: User = { name: '李四', age: 18 };
// 合法赋值：包含所有属性
const user3: User = { name: '王五', age: 20, gender: '男' };
// 不合法：缺少必选属性name
const user4: User = { age: 19 };
```

2. 只读属性：用`readonly`标识，标识该属性只能在对象初始化时赋值，后续无法修改，与类的readonly修饰符作用一致。

```typescript
interface Book {
  readonly id: number; // 只读属性，初始化后不可修改
  title: string;
  author: string;
}

const book: Book = { id: 1001, title: 'TypeScript入门', author: '张三' };
console.log(book.id); // 合法：可读取
// book.id = 1002; // 报错：只读属性无法修改
```

3. 索引签名：与对象类型的索引签名用法一致，用于描述对象的动态属性，允许对象拥有任意数量的指定类型的属性，解决属性名不确定的场景。

```typescript
// 索引签名：key为string类型，值为string类型
interface Product {
  id: number; // 固定属性
  name: string; // 固定属性
  [key: string]: string; // 动态属性，键为string，值为string
}

// 合法赋值：包含固定属性和动态属性
const phone: Product = {
  id: 1001,
  name: '手机',
  color: '黑色',
  brand: '华为'
};

// 不合法：动态属性值类型错误（price为number）
const phone2: Product = {
  id: 1002,
  name: '耳机',
  price: 199
};
```

### 接口的继承

接口支持继承，用`extends`关键字实现，一个接口可以继承多个接口，继承后会拥有所有父接口的属性和方法，实现接口的复用和扩展，简化接口定义。

1. 单继承：一个接口继承一个父接口。

```typescript
// 父接口：基础用户信息
interface BaseUser {
  name: string;
  age: number;
}

// 子接口：继承BaseUser，新增属性
interface StudentUser extends BaseUser {
  grade: string; // 新增：年级属性
  study(): void; // 新增：学习方法
}

// 实现子接口，需包含父接口和子接口的所有属性/方法
const student: StudentUser = {
  name: '赵六',
  age: 16,
  grade: '高一',
  study() {
    console.log(`${this.name}正在读${this.grade}，努力学习中`);
  }
};
```

2. 多继承：一个接口继承多个父接口，用逗号分隔父接口，继承后拥有所有父接口的结构。

```typescript
// 父接口1：基础信息
interface BaseInfo {
  id: number;
  name: string;
}

// 父接口2：联系方式
interface Contact {
  phone: string;
  email?: string;
}

// 子接口：继承两个父接口，新增属性
interface UserInfo extends BaseInfo, Contact {
  gender: string;
}

// 实现子接口，需包含所有父接口和自身的属性
const userInfo: UserInfo = {
  id: 1001,
  name: '孙七',
  phone: '13800138000',
  email: 'sunqi@example.com',
  gender: '男'
};
```

### 接口与type的区别

interface和type都可用于定义自定义类型，实现类型复用，但两者在语法、功能上有明显区别，开发中需根据场景选择：

1. 语法差异：interface用`interface`关键字定义，type用`type`关键字定义，语法格式不同。

```typescript
// interface定义
interface Person {
  name: string;
  age: number;
}

// type定义（等价结构）
type PersonType = {
  name: string;
  age: number;
};
```

2. 继承差异：interface支持继承（单继承、多继承），type不支持继承，但可通过交叉类型实现类似效果。

```typescript
// interface继承
interface A { a: number }
interface B extends A { b: string }

// type交叉类型（类似继承）
type AType = { a: number }
type BType = AType & { b: string };
```

3. 扩展差异：interface可重复定义，多次定义会自动合并（合并所有属性和方法）；type不可重复定义，重复定义会报错。

```typescript
// interface重复定义，自动合并
interface User { name: string }
interface User { age: number }
// 最终User接口：{ name: string; age: number }

// type重复定义，报错
type UserType = { name: string }
// type UserType = { age: number } // 报错：标识符“UserType”重复
```

4. 适用场景差异：

- interface：更适合定义对象、类的结构（如类的实现、对象的约束），支持继承和合并，适合大型项目中统一接口规范。

- type：更灵活，可用于基本类型、联合类型、交叉类型、元组等所有类型，适合定义简单的类型别名或复杂的组合类型。

### 对应问题

1. 接口中可选属性和只读属性的作用分别是什么？语法上如何区分？
2. 接口的继承和type的交叉类型有什么区别？如何实现接口的多继承？
3. interface和type的核心区别是什么？分别适用于什么场景？