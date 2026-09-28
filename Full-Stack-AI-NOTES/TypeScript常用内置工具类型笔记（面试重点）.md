# TypeScript常用内置工具类型笔记（面试重点）

本文整理TypeScript官方内置的核心工具类型，详细说明每个工具类型的官方定义、语法示例、适用场景，标注高频重点工具类型，配套面试高频问题和速记技巧，便于快速掌握、应对面试及日常项目开发使用。所有工具类型均基于TS官方Utility Types规范，重点突出实用性和面试考点。

## 核心常用内置工具类型

以下为TS最常用的14个内置工具类型，涵盖类型裁剪、构造、推导等核心场景，是日常开发和面试的高频考查内容，其中标注的8个为优先记忆重点。

### Partial<T>

官方定义：构造一个将Type的所有属性都设为optional（可选）的类型。

核心作用：将目标类型的所有属性转为可选属性，无需手动给每个属性添加`?`，简化类型定义。

```typescript
// 示例
interface User {
  name: string;
  age: number;
  gender: string;
}

// 使用Partial<T>将User所有属性转为可选
type UpdateUser = Partial<User>;
// 等价于：{ name?: string; age?: number; gender?: string }

// 实际应用：更新接口参数（只需传递要修改的字段）
function updateUser(id: number, data: Partial<User>) {
  // 模拟接口请求
  console.log(`更新用户${id}，参数：`, data);
}

// 调用时可只传部分字段，无需传全部
updateUser(1, { name: "Tom" });
updateUser(1, { age: 21, gender: "male" });
```

适用场景：

- 更新接口参数（patch请求），只需传递待修改的局部字段

- 表单局部修改，无需校验所有字段

- 可选配置项定义，允许只传递部分配置

### Required<T>

官方定义：构造一个将Type的所有属性都设为required（必选）的类型。

核心作用：与`Partial<T>`完全相反，将目标类型的所有可选属性转为必选属性，强制要求所有字段都必须提供。

```typescript
// 示例
interface Config {
  url?: string; // 可选属性
  timeout?: number; // 可选属性
  method?: "GET" | "POST"; // 可选属性
}

// 使用Required<T>将Config所有可选属性转为必选
type FullConfig = Required<Config>;
// 等价于：{ url: string; timeout: number; method: "GET" | "POST" }

// 实际应用：配置项合并默认值后，确保所有配置都存在
function getFullConfig(config: Config): FullConfig {
  // 合并默认配置，确保所有字段都有值
  const defaultConfig = { url: "http://example.com", timeout: 5000, method: "GET" };
  return { ...defaultConfig, ...config };
}
```

适用场景：

- 配置项经过默认值合并后，需要确保所有字段都存在

- 某些业务流程中，要求对象的所有字段必须完整（如提交表单时）

- 强制约束类型，避免因可选属性缺失导致的逻辑错误

### Readonly<T>

官方定义：构造一个将Type的所有属性都设为readonly（只读）的类型。

核心作用：将目标类型的所有属性转为只读属性，一旦赋值后无法重新修改，防止对象被误操作修改。

```typescript
// 示例
interface Todo {
  title: string;
  content: string;
}

// 使用Readonly<T>将Todo所有属性转为只读
const todo: Readonly<Todo> = {
  title: "学习TS内置工具类型",
  content: "掌握Partial、Pick等常用工具"
};

// todo.title = "新标题"; // 报错：无法分配到 "title" ，因为它是只读属性
// todo.content = "修改内容"; // 报错：只读属性无法修改

// 实际应用：表示不可变数据（如接口返回的固定配置、常量对象）
const fixedConfig: Readonly<Config> = {
  url: "http://api.example.com",
  timeout: 3000
};
```

适用场景：

- 防止对象被误修改（如常量配置、接口返回的固定数据）

- 表示不可变数据，符合函数式编程的不可变性原则

- 保护核心数据，避免意外修改导致的业务异常

### Pick<T, K>

官方定义：从Type中挑选出指定的属性K（K必须是T的属性集），构造一个新的类型。

核心作用：从一个复杂类型中，提取需要的部分字段，组成新的简化类型，避免定义重复的类型。

```typescript
// 示例
interface User {
  id: number;
  name: string;
  age: number;
  password: string;
  email: string;
}

// 从User中挑选id、name、email字段，组成新类型
type UserBasicInfo = Pick<User, "id" | "name" | "email">;
// 等价于：{ id: number; name: string; email: string }

// 实际应用：前端展示用户列表，只需展示基础信息（无需password）
function renderUserList(users: UserBasicInfo[]) {
  users.forEach(user => {
    console.log(`用户ID：${user.id}，姓名：${user.name}，邮箱：${user.email}`);
  });
}
```

适用场景：

- 从大对象类型中，提取前端展示所需的字段（如列表项、卡片项）

- 简化复杂类型，只保留业务所需的核心字段

- 复用已有类型，避免重复定义相似的简化类型

### Omit<T, K>

官方定义：从Type中排除指定的属性K（K必须是T的属性集），构造一个新的类型。

核心作用：与`Pick<T, K>`思路相反，从复杂类型中排除不需要的字段，组成新类型，常用于去掉敏感字段或无用字段。

```typescript
// 示例
interface User {
  id: number;
  name: string;
  age: number;
  password: string; // 敏感字段
}

// 从User中排除password字段，组成新类型（安全返回给前端）
type SafeUser = Omit<User, "password">;
// 等价于：{ id: number; name: string; age: number }

// 实际应用：接口返回用户信息时，去掉密码等敏感字段
function getUserInfo(): SafeUser {
  const user: User = { id: 1, name: "Tom", age: 20, password: "123456" };
  // 解构排除password，返回安全类型
  const { password, ...safeInfo } = user;
  return safeInfo;
}
```

适用场景：

- 去掉敏感字段（如密码、token等，避免泄露）

- 在已有类型基础上，删除不需要的字段，简化类型

- 避免重复定义，基于现有类型快速推导新类型

### Record<K, T>

官方定义：构造一个对象类型，其属性键为K类型，属性值为T类型。

核心作用：快速构造一个“键-值”映射类型，明确指定键的类型和值的类型，常用于定义字典、枚举映射等。

```typescript
// 示例1：枚举映射表
type Role = "admin" | "user" | "guest"; // 键的类型（联合类型）
type RoleDesc = string; // 值的类型

// 构造角色-描述的映射类型
type RoleMap = Record<Role, RoleDesc>;
const roleDesc: RoleMap = {
  admin: "管理员（拥有全部权限）",
  user: "普通用户（拥有基础权限）",
  guest: "游客（仅拥有浏览权限）"
};

// 示例2：状态码映射
type StatusCode = 200 | 400 | 404 | 500;
type StatusMsg = string;
const statusMap: Record<StatusCode, StatusMsg> = {
  200: "请求成功",
  400: "参数错误",
  404: "资源不存在",
  500: "服务器内部错误"
};

// 示例3：字典对象
type Dict = Record<string, number>;
const scoreDict: Dict = {
  "math": 90,
  "english": 85,
  "chinese": 95
};
```

适用场景：

- 枚举映射表（如角色、状态码、字典等的文字描述）

- 定义键值对结构的对象（如配置字典、数据映射表）

- 快速构造固定键类型和值类型的对象类型

### Exclude<T, U>

官方定义：从联合类型T中，排除掉可以赋值给U的所有成员，构造一个新的联合类型。

核心作用：过滤联合类型，去掉不需要的成员，仅保留无法赋值给U的成员。

```typescript
// 示例1：基础用法
type A = "a" | "b" | "c" | "d";
type B = "a" | "c";

// 从A中排除可以赋值给B的成员（即排除"a"、"c"）
type C = Exclude<A, B>;
// 等价于："b" | "d"

// 示例2：实际应用（过滤状态）
type AllStatus = "pending" | "success" | "fail" | "canceled";
type InvalidStatus = "canceled";

// 排除无效状态，得到有效状态类型
type ValidStatus = Exclude<AllStatus, InvalidStatus>;
// 等价于："pending" | "success" | "fail"

// 仅处理有效状态
function handleStatus(status: ValidStatus) {
  switch (status) {
    case "pending": console.log("处理中..."); break;
    case "success": console.log("处理成功"); break;
    case "fail": console.log("处理失败"); break;
  }
}
```

适用场景：

- 过滤联合类型，去掉不需要的成员（如无效状态、无用值）

- 从联合类型中排除特定类型，缩小类型范围

- 配合判别联合类型，筛选出符合条件的类型成员

### Extract<T, U>

官方定义：从联合类型T中，提取出可以赋值给U的所有成员，构造一个新的联合类型。

核心作用：与`Exclude<T, U>`相反，从联合类型中筛选出需要的成员，仅保留可以赋值给U的成员。

```typescript
// 示例1：基础用法
type A = "a" | "b" | "c" | "d";
type B = "a" | "c" | "e";

// 从A中提取可以赋值给B的成员（即提取"a"、"c"）
type C = Extract<A, B>;
// 等价于："a" | "c"

// 示例2：实际应用（筛选联合类型）
type AllRoles = "admin" | "user" | "guest" | "superAdmin";
type ManageRoles = "admin" | "superAdmin";

// 从所有角色中，提取管理类角色
type AdminRoles = Extract<AllRoles, ManageRoles>;
// 等价于："admin" | "superAdmin"

// 仅允许管理类角色执行操作
function manageSystem(role: AdminRoles) {
  console.log(`${role}执行系统管理操作`);
}
```

适用场景：

- 从联合类型中筛选出特定成员（如管理角色、有效状态）

- 配合判别联合类型，提取符合条件的类型成员

- 缩小联合类型范围，明确可用的类型成员

### NonNullable<T>

官方定义：从类型T中，排除掉null和undefined，构造一个新的类型。

核心作用：确保类型中不包含null和undefined，明确数据一定存在，避免空值异常。

```typescript
// 示例1：基础用法
type A = string | null | undefined;
type B = number | null;

// 去掉A中的null和undefined
type C = NonNullable<A>; // 等价于：string
// 去掉B中的null
type D = NonNullable<B>; // 等价于：number

// 示例2：实际应用（接口返回值非空处理）
// 接口返回值可能为null
type ApiResponse = { data: User } | null;

// 处理接口返回值，确保data非空
function handleResponse(res: ApiResponse) {
  // 类型守卫，排除null
  if (res) {
    const user: NonNullable<ApiResponse>["data"] = res.data;
    console.log("用户信息：", user);
  }
}

// 示例3：明确数据一定存在
type RequiredData = NonNullable<string | undefined>;
const data: RequiredData = "hello"; // 不能赋值为null或undefined
```

适用场景：

- 接口返回值做非空处理，确保数据一定存在

- 明确某一阶段的数据不为null/undefined，避免空值异常

- 过滤类型中的空值，缩小类型范围，提升代码安全性

### Parameters<T>

官方定义：获取函数类型T的参数类型，返回一个元组类型，元组的每个元素对应函数的一个参数类型。

核心作用：复用已有函数的参数类型，无需手动重复定义，常用于高阶函数封装、函数参数复用。

```typescript
// 示例1：基础用法
// 定义一个函数类型
type Fn = (name: string, age: number, gender?: string) => void;

// 获取Fn的参数类型，返回元组
type FnParams = Parameters<Fn>;
// 等价于：[name: string, age: number, gender?: string | undefined]

// 示例2：实际应用（高阶函数封装）
function add(a: number, b: number): number {
  return a + b;
}

// 复用add的参数类型，定义一个包裹函数
function wrapAdd(...args: Parameters<typeof add>): number {
  console.log("执行add函数，参数：", args);
  return add(...args);
}

wrapAdd(1, 2); // 正确，参数类型匹配
// wrapAdd(1, "2"); // 报错，参数类型不匹配

// 示例3：提取参数类型中的某一个
type AddFirstParam = Parameters<typeof add>[0]; // 等价于：number
```

适用场景：

- 高阶函数封装，复用原函数的参数类型

- 提取函数的参数类型，用于其他地方（如回调函数参数）

- 避免手动重复定义与函数参数一致的类型

### ReturnType<T>

官方定义：获取函数类型T的返回值类型。

核心作用：从函数中自动推导返回值类型，无需手动定义，是日常开发和面试中最高频的工具类型之一。

```typescript
// 示例1：基础用法（普通函数）
function getUser() {
  return {
    id: 1,
    name: "Tom",
    age: 20
  };
}

// 从getUser函数中提取返回值类型
type User = ReturnType<typeof getUser>;
// 等价于：{ id: number; name: string; age: number }

// 示例2：箭头函数
const getConfig = () => ({
  url: "http://example.com",
  timeout: 5000
});

type Config = ReturnType<typeof getConfig>;
// 等价于：{ url: string; timeout: number }

// 示例3：函数类型
type Fn = (a: number, b: number) => number;
type FnReturn = ReturnType<Fn>; // 等价于：number
```

适用场景：

- 从函数推导返回值类型，避免手写重复的类型定义

- 函数返回值类型不确定时，自动推导，提升代码准确性

- 复用函数返回值类型，用于接口返回、变量定义等

### ConstructorParameters<T>

官方定义：获取构造函数类型T的参数类型，返回一个元组类型，元组的每个元素对应构造函数的一个参数类型。

核心作用：提取类的构造函数参数类型，用于类的实例化、继承或封装。

```typescript
// 示例
class Person {
  // 构造函数
  constructor(public name: string, public age: number, public gender: string) {}
}

// 获取Person构造函数的参数类型
type PersonCtorParams = ConstructorParameters<typeof Person>;
// 等价于：[name: string, age: number, gender: string]

// 实际应用：封装类的实例化函数
function createPerson(...args: PersonCtorParams): Person {
  return new Person(...args);
}

const person = createPerson("Tom", 20, "male"); // 正确，参数类型匹配
```

适用场景：

- 封装类的实例化函数，复用构造函数的参数类型

- 类的继承或扩展时，复用父类构造函数的参数类型

- 面向类库开发时，提取类的构造参数类型，用于类型约束

### InstanceType<T>

官方定义：获取构造函数类型T对应的实例类型。

核心作用：从类（构造函数）中提取实例类型，明确类的实例结构，用于类型约束。

```typescript
// 示例
class Person {
  name: string;
  age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  sayHello() {
    console.log(`Hello, I'm ${this.name}`);
  }
}

// 获取Person类的实例类型
type PersonInstance = InstanceType<typeof Person>;
// 等价于：Person（即Person类的实例类型，包含name、age属性和sayHello方法）

// 实际应用：约束变量为类的实例
const person: PersonInstance = new Person("Tom", 20);
person.sayHello(); // 正确，实例拥有sayHello方法

// 错误示例：不能赋值为非Person实例
// const wrongPerson: PersonInstance = { name: "Tom", age: 20 }; // 报错，缺少sayHello方法
```

适用场景：

- 类实例类型提取，用于变量、函数参数的类型约束

- 面向类库封装时，明确类的实例结构

- 类的实例化相关逻辑中，确保变量是类的合法实例

### Awaited<T>

官方定义：获取Promise类型T最终解析后的类型，会递归展开嵌套的Promise类型。

核心作用：解析Promise的返回值类型，无需手动嵌套解析，简化异步类型处理。

```typescript
// 示例1：基础用法（单层Promise）
type A = Awaited<Promise<string>>;
// 等价于：string（解析Promise后的类型）

// 示例2：嵌套Promise
type B = Awaited<Promise<Promise<number>>>;
// 等价于：number（递归展开嵌套的Promise）

// 示例3：实际应用（异步函数返回值）
async function fetchUser() {
  return { id: 1, name: "Tom" } as User;
}

// 解析异步函数的返回值类型（异步函数返回值是Promise）
type UserResult = Awaited<ReturnType<typeof fetchUser>>;
// 等价于：User（即{ id: number; name: string; age: number }）

// 异步函数调用，类型自动匹配
async function handleFetch() {
  const user: UserResult = await fetchUser();
  console.log(user.name);
}
```

适用场景：

- 异步函数返回值类型提取，明确await后的变量类型

- 嵌套Promise类型展开，简化复杂异步类型处理

- 接口请求返回的Promise类型解析，确保数据类型正确

## 字符串处理内置工具类型

TS提供4个内置字符串操作工具类型，用于字符串类型的转换，常用于模板字面量类型、动态生成键名等场景。

### Uppercase<T>

核心作用：将字符串类型T转为全大写形式。

```typescript
type A = Uppercase<"hello">; // "HELLO"
type B = Uppercase<"ts utility">; // "TS UTILITY"
type C = Uppercase<string>; // string（非具体字符串类型，返回原类型）
```

### Lowercase<T>

核心作用：将字符串类型T转为全小写形式，与`Uppercase<T>`相反。

```typescript
type A = Lowercase<"HELLO">; // "hello"
type B = Lowercase<"TS UTILITY">; // "ts utility"
type C = Lowercase<string>; // string
```

### Capitalize<T>

核心作用：将字符串类型T的首字母转为大写，其余字母保持不变。

```typescript
type A = Capitalize<"tom">; // "Tom"
type B = Capitalize<"hello world">; // "Hello world"
type C = Capitalize<string>; // string
```

### Uncapitalize<T>

核心作用：将字符串类型T的首字母转为小写，其余字母保持不变，与`Capitalize<T>`相反。

```typescript
type A = Uncapitalize<"Tom">; // "tom"
type B = Uncapitalize<"Hello World">; // "hello World"
type C = Uncapitalize<string>; // string
```

字符串工具类型适用场景：

- 模板字面量类型（如动态生成组件名、键名）

- 字符串格式统一（如接口字段名、常量名的格式转换）

- 动态生成类型时，对字符串进行格式化处理

## 面试优先记忆的8个核心工具类型

以下8个工具类型是日常项目和面试中最高频的，优先记忆核心作用和基础用法，可快速应对面试提问，满足大部分开发场景需求：

### 1. Partial<T>

核心：将目标类型的所有属性转为可选，用于局部更新、可选配置。

### 2. Required<T>

核心：将目标类型的所有属性转为必选，用于确保配置完整、字段不缺失。

### 3. Readonly<T>

核心：将目标类型的所有属性转为只读，用于保护不可变数据、防止误修改。

### 4. Pick<T, K>

核心：从目标类型中挑选指定字段，用于提取简化类型、展示所需字段。

### 5. Omit<T, K>

核心：从目标类型中排除指定字段，用于去掉敏感字段、无用字段。

### 6. Record<K, T>

核心：构造键值对映射类型，用于字典、枚举映射、配置表。

### 7. Parameters<T>

核心：提取函数参数类型，用于高阶函数封装、参数复用。

### 8. ReturnType<T>

核心：提取函数返回值类型，用于自动推导类型、避免重复定义。

## 速记笔记（快速背诵用）

```typescript
Partial<T>              // 全部变可选
Required<T>             // 全部变必选
Readonly<T>             // 全部变只读
Pick<T, K>              // 挑字段（保留指定字段）
Omit<T, K>              // 去字段（排除指定字段）
Record<K, T>            // 构造 key-value 对象类型
Exclude<T, U>           // 从联合类型里排除指定成员
Extract<T, U>           // 从联合类型里提取指定成员
NonNullable<T>          // 去掉 null 和 undefined
Parameters<T>           // 函数参数类型（元组）
ReturnType<T>           // 函数返回值类型
ConstructorParameters<T>// 构造函数参数类型（元组）
InstanceType<T>         // 构造函数实例类型
Awaited<T>              // Promise 解包后的类型
// 字符串工具类型
Uppercase<T>            // 全大写
Lowercase<T>            // 全小写
Capitalize<T>           // 首字母大写
Uncapitalize<T>         // 首字母小写
```

## 面试应答话术（直接套用）

TypeScript常用的内置工具类型包括Partial、Required、Readonly、Pick、Omit、Record、Exclude、Extract、NonNullable、Parameters、ReturnType、InstanceType和Awaited，还有4个字符串处理工具类型。其中项目里最高频的通常是Partial、Pick、Omit、Record、Parameters和ReturnType，主要用于复用已有类型、做字段裁剪、构造映射对象，以及从函数或类中自动推导类型，减少重复定义，提升代码可读性和安全性。

## 面试高频问题

### 基础问题（单个工具类型考查）

- Partial<T>的核心作用是什么？常见应用场景有哪些？请写出示例代码。

- Partial<T>和Required<T>的区别是什么？分别适用于什么场景？

- Pick<T, K>和Omit<T, K>的区别是什么？如何从User类型中提取不含敏感字段的类型？

- Record<K, T>的作用是什么？如何用它定义一个角色-描述的映射类型？

- ReturnType<T>和Parameters<T>分别用于什么场景？如何提取一个函数的返回值类型和参数类型？

- Awaited<T>的核心作用是什么？如何用它解析异步函数的返回值类型？

- NonNullable<T>能解决什么问题？适用于哪些场景？

### 综合问题（多个工具类型结合考查）

- 请列举3个你最常用的TS内置工具类型，说明它们的作用和实际应用场景。

- 如何使用TS内置工具类型，从一个复杂的User类型中，提取出只读、不含敏感字段的基础信息类型？（结合Pick/Omit、Readonly）

- 简述Parameters<T>和ConstructorParameters<T>的区别，分别用于什么场景？

- 在异步开发中，如何结合ReturnType<T>和Awaited<T>提取异步函数的返回值类型？

- 为什么推荐使用TS内置工具类型？它们能带来哪些好处？
> （注：文档部分内容可能由 AI 生成）