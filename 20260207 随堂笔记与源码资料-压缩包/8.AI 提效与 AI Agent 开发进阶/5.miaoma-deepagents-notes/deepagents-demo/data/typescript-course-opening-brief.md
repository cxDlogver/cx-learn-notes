# TypeScript 课程 5 分钟开场讲解

---

## 👋 欢迎 & 课程介绍 (1分钟)

大家好！欢迎来到今天的 TypeScript 进阶课程。

在接下来的 **120 分钟**里，我们将：
- ✅ 深入理解 TypeScript 核心概念
- ✅ 掌握类型体操的实用技巧
- ✅ 学会在真实项目中优雅使用 TypeScript
- ✅ 解决大家日常开发中最常遇到的类型问题

**今天的课程目标**：让你从「只会写 `: string`」的 TS 初学者，变成能够利用类型系统提升代码质量、减少 bug、提高开发效率的高级开发者。

---

## 🔑 课前热身：type vs interface (3分钟)

在正式开始之前，我们先解决一个 90% 的 TypeScript 开发者都困惑过的问题：

> **type 和 interface 到底有什么区别？**

### 1️⃣ 相同点：90% 的场景下可以互换

```typescript
// interface 写法
interface User {
  name: string;
  age: number;
}

// type 写法
type User = {
  name: string;
  age: number;
};
```

✅ 都可以描述对象结构  
✅ 都支持可选属性 `?`、只读属性 `readonly`  
✅ 都支持扩展（继承）

---

### 2️⃣ 核心区别：什么时候必须用哪一个？

| 特性 | type | interface |
|------|------|-----------|
| **联合类型** | ✅ 支持 | ❌ 不支持 |
| **交叉类型** | ✅ 支持 | ⚠️ 需借助 extends |
| **元组 Tuple** | ✅ 原生支持 | ❌ 不支持 |
| **函数类型** | ✅ 更简洁 | ⚠️ 需写调用签名 |
| **映射类型** | ✅ 支持 | ❌ 不支持 |
| **声明合并** | ❌ 不支持 | ✅ 自动合并 |

---

### 3️⃣ 代码示例对比

#### ✅ type 独有的能力

```typescript
// 联合类型 - interface 做不到
type Status = 'pending' | 'success' | 'error';

// 元组 - interface 做不到
type Point = [number, number];

// 函数类型 - type 更简洁
type Callback = (data: any) => void;

// 映射类型 - interface 做不到
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
```

#### ✅ interface 独有的能力

```typescript
// 声明合并 - type 做不到
interface Window {
  title: string;
}

// 同名 interface 自动合并
interface Window {
  version: string;
}

// 最终 Window 同时有 title 和 version
const win: Window = { title: 'TS', version: '5.0' };
```

---

### 4️⃣ 最佳实践总结（记住这三句话）

1. **优先用 interface** —— 描述对象、类的公共 API，声明合并很有用
2. **需要联合/元组时用 type** —— 高级类型操作离不开 type
3. **团队保持一致** —— 比选哪个更重要的是整个项目风格统一

> 💡 记住：纠结的时候选 interface，遇到限制了再切 type，成本几乎为零！

---

## 🎯 课程预告 (30秒)

刚才这 3 分钟，我们已经搞懂了 TS 中最容易混淆的概念之一。

接下来的 115 分钟，我们会继续深入：
- 🔹 泛型的正确打开方式
- 🔹 条件类型与类型推断 infer
- 🔹 实用工具类型源码解析
- 🔹 类型体操实战训练

**准备好了吗？让我们正式开始！** 🚀

---

### ⏱️ 时间分配核对
- 欢迎 & 课程介绍：~1分钟
- type vs interface 详解：~3分钟
- 课程预告：~30秒
- **总计：约 4.5 - 5 分钟**
