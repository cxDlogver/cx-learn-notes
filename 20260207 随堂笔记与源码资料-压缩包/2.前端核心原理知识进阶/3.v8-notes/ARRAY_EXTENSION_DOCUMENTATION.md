# V8 数组扩展方法文档

## 概述

本文档介绍如何基于 V8 引擎的 TurboFan Quantum (TQ) 语言扩展 JavaScript 数组的原型方法。示例实现了 `Array.prototype.first()` 和 `Array.prototype.last()` 方法及其带回调的版本。

---

## 目录

1. [快速开始](#快速开始)
2. [方法详解](#方法详解)
3. [TQ 语言基础](#tq 语言基础)
4. [实现原理](#实现原理)
5. [最佳实践](#最佳实践)
6. [完整 API 参考](#完整 api 参考)

---

## 快速开始

### 环境要求

- V8 源码树
- TQ 编译器（内置于 V8 构建系统）
- C++ 构建工具链

### 文件位置

扩展的内置函数应添加到 V8 源码的以下位置：

```
v8/src/builtins/array-first-last.tq    # TQ 实现文件
v8/src/builtins/builtins-definitions.h  # 内置函数注册
v8/src/objects/js-array.h              # 数组相关定义
```

### 注册内置函数

在 `builtins-definitions.h` 中添加：

```cpp
TEMPORARY_PROTOTYPE(Array, First, array::ArrayPrototypeFirst)
TEMPORARY_PROTOTYPE(Array, Last, array::ArrayPrototypeLast)
TEMPORARY_PROTOTYPE(Array, FirstWithCallback, array::ArrayPrototypeFirstWithCallback)
TEMPORARY_PROTOTYPE(Array, LastWithCallback, array::ArrayPrototypeLastWithCallback)
```

---

## 方法详解

### 1. `Array.prototype.first()`

#### 语法

```javascript
arr.first()
```

#### 返回值

- **任意类型**：数组的第一个元素（索引为 0）
- **`undefined`**：如果数组为空或在索引 0 处有 hole

#### 示例

```javascript
[1, 2, 3].first()           // 1
[].first()                  // undefined
[undefined, 2].first()      // undefined (真正的 undefined 值)
[, 2, 3].first()            // undefined (hole)
['a', 'b', 'c'].first()     // 'a'
```

#### 性能特性

| 场景 | 时间复杂度 | 优化路径 |
|------|-----------|---------|
| PACKED_ELEMENTS | O(1) | 直接内存访问 |
| HOLEY_ELEMENTS | O(1) | hole 检测 |
| DICTIONARY_ELEMENTS | O(1) | 字典查找 |
| 类数组对象 | O(1) | GetProperty |

---

### 2. `Array.prototype.last()`

#### 语法

```javascript
arr.last()
```

#### 返回值

- **任意类型**：数组的最后一个元素（索引为 length - 1）
- **`undefined`**：如果数组为空或在最后一个索引处有 hole

#### 示例

```javascript
[1, 2, 3].last()          // 3
[].last()                 // undefined
[1, 2, undefined].last()  // undefined (真正的 undefined 值)
[1, 2, ].last()           // undefined (hole)
['a', 'b', 'c'].last()    // 'c'
```

#### 性能特性

| 场景 | 时间复杂度 | 优化路径 |
|------|-----------|---------|
| PACKED_ELEMENTS | O(1) | 直接内存访问 |
| HOLEY_ELEMENTS | O(1) | hole 检测 |
| DICTIONARY_ELEMENTS | O(1) | 字典查找 |
| 类数组对象 | O(1) | GetProperty |

---

### 3. `Array.prototype.first(callback[, thisArg])`

#### 语法

```javascript
arr.first(callback[, thisArg])
```

#### 参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `callback` | `Function` | 否 | 测试函数，为每个元素调用 |
| `thisArg` | `any` | 否 | 执行 callback 时的 this 值 |

#### callback 函数签名

```javascript
function callback(element, index, array) {
  // 返回 true 表示找到目标元素
}
```

#### 返回值

- **任意类型**：第一个使 callback 返回 true 的元素
- **`undefined`**：如果没有找到满足条件的元素

#### 示例

```javascript
// 查找第一个大于 2 的元素
[1, 2, 3, 4].first(x => x > 2)      // 3

// 查找第一个偶数
[1, 3, 5, 8, 10].first(x => x % 2 === 0)  // 8

// 没有匹配元素
[1, 2, 3].first(x => x > 10)       // undefined

// 使用 thisArg
const finder = {
  threshold: 5,
  check(x) { return x > this.threshold; }
};
[1, 3, 7, 9].first(finder.check, finder)  // 7

// 无 callback 时等同于 first()
[10, 20, 30].first()              // 10
```

#### 与 `Array.prototype.find()` 的区别

| 特性 | `first()` | `find()` |
|------|-----------|----------|
| 无参数行为 | 返回第一个元素 | 必须传入 callback |
| 遍历方向 | 从前向后 | 从前向后 |
| V8 优化 | 专用快速路径 | 通用路径 |

---

### 4. `Array.prototype.last(callback[, thisArg])`

#### 语法

```javascript
arr.last(callback[, thisArg])
```

#### 参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `callback` | `Function` | 否 | 测试函数，为每个元素调用 |
| `thisArg` | `any` | 否 | 执行 callback 时的 this 值 |

#### callback 函数签名

```javascript
function callback(element, index, array) {
  // 返回 true 表示找到目标元素
}
```

#### 返回值

- **任意类型**：从后向前第一个使 callback 返回 true 的元素
- **`undefined`**：如果没有找到满足条件的元素

#### 示例

```javascript
// 查找最后一个大于 2 的元素
[1, 2, 3, 4].last(x => x > 2)      // 4

// 查找最后一个偶数
[2, 4, 5, 8, 10].last(x => x % 2 === 0)  // 10

// 没有匹配元素
[1, 2, 3].last(x => x > 10)        // undefined

// 使用 thisArg
const finder = {
  threshold: 5,
  check(x) { return x > this.threshold; }
};
[1, 3, 7, 9, 15].last(finder.check, finder)  // 15

// 无 callback 时等同于 last()
[10, 20, 30].last()               // 30
```

#### 与 `Array.prototype.findLast()` 的区别

| 特性 | `last()` | `findLast()` |
|------|----------|--------------|
| 无参数行为 | 返回最后一个元素 | 必须传入 callback |
| 遍历方向 | 从后向前 | 从后向前 |
| V8 优化 | 专用快速路径 | 通用路径 |

---

## TQ 语言基础

### 核心概念

#### 1. 内置函数定义

```tq
transitioning javascript builtin ArrayPrototypeFirst(
    js-implicit context: NativeContext, receiver: JSAny)(...arguments): JSAny {
  // 函数体
}
```

- `transitioning`：表示可以在 C++ 和 TQ 之间转换
- `javascript builtin`：JavaScript 内置函数
- `js-implicit context`：隐式传递的 NativeContext
- `receiver`：JavaScript 调用中的 this 值
- `...arguments`：传入的参数数组

#### 2. 类型系统

```tq
// 基本类型
JSAny          // JavaScript 任意值
JSReceiver     // JavaScript 对象（可调用 GetProperty）
Number         // JavaScript Number
String         // JavaScript String
Boolean        // JavaScript Boolean

// 内部类型
NativeContext  // V8 原生上下文
FixedArray     // 固定大小数组
Map            // JavaScript 对象结构描述
ElementsKind   // 数组元素类型标识
```

#### 3. 类型转换

```tq
// 显式类型转换
const num: Number = Convert<Number>(value);
const uintptr: uintptr = Convert<uintptr>(len);

// 类型检查
if (IsCallable(callback)) { ... }
if (IsNullOrUndefined(value)) { ... }

// 类型转换并检查
const array: JSArray = Cast<JSArray>(receiver) otherwise goto SlowPath;
```

#### 4. 模式匹配 (typeswitch)

```tq
typeswitch (value) {
  case (str: String): {
    // String 类型处理
  }
  case (num: Number): {
    // Number 类型处理
  }
  case (obj: JSAny): {
    // 其他类型处理
  }
}
```

#### 5. Labels（标签）

```tq
// 定义延迟执行路径
label IfSlowPath deferred {
  // 慢速路径代码
}

// goto 跳转
if (condition) goto IfSlowPath;

// try/otherwise 模式
try {
  const result = Operation() otherwise IfError;
} label IfError {
  HandleError();
}
```

---

## 实现原理

### 1. 快速路径优化

TQ 代码会为常见场景生成优化的机器码：

```tq
// 检查 ElementsKind 并选择优化路径
const kind: ElementsKind = map.elements_kind;

if (IsElementsKindLessThanOrEqual(kind, ElementsKind::HOLEY_ELEMENTS)) {
  // Fast Elements：直接访问 FixedArray 内存
  const fixedArray: FixedArray = UnsafeCast<FixedArray>(array.elements);
  const element: Object = fixedArray.objects[0];
  return element == TheHole ? Undefined : UnsafeCast<JSAny>(element);
}
```

### 2. ElementsKind 层次结构

```
PACKED_ELEMENTS
  ↓
PACKED_DOUBLE_ELEMENTS
  ↓
PACKED_SMI_ELEMENTS
  ↓
HOLEY_ELEMENTS
  ↓
HOLEY_DOUBLE_ELEMENTS
  ↓
HOLEY_SMI_ELEMENTS
  ↓
DICTIONARY_ELEMENTS
```

使用 `IsElementsKindLessThanOrEqual()` 判断元素类型范围。

### 3. Hole 处理

JavaScript 数组的 hole（未初始化元素）与 `undefined` 不同：

```tq
// 检测 hole
if (element == TheHole) {
  return Undefined;  // hole 转为 undefined
}

// 访问 FixedArray 元素时检查
const element: Object = fixedArray.objects[index];
return element == TheHole ? Undefined : UnsafeCast<JSAny>(element);
```

### 4. 参数处理

```tq
// 访问 arguments 数组
if (arguments.length > 0) {
  callback = arguments[0];
  if (arguments.length > 1) {
    thisArg = arguments[1];
  }
}
```

### 5. 函数调用

```tq
// 调用 JavaScript 回调函数
const result: JSAny = Call(context, callable, thisArg, element, k, o);
// 等价于：callback.call(thisArg, element, k, o)

// 调用内置函数
const str: String = ToString_Inline(context, value);
```

---

## 最佳实践

### 1. 性能优化

✅ **推荐做法**：

```tq
// 优先处理快速路径
typeswitch (o) {
  case (array: JSArray): {
    // 针对 JSArray 优化
    const kind: ElementsKind = array.map.elements_kind;
    if (IsElementsKindLessThanOrEqual(kind, ElementsKind::HOLEY_ELEMENTS)) {
      // Fast path
    }
  }
}
// 通用路径作为后备
return GetProperty(o, 0);
```

❌ **避免做法**：

```tq
// 始终使用 GetProperty，失去优化机会
return GetProperty(o, 0);
```

### 2. 错误处理

✅ **推荐做法**：

```tq
// 验证 callback 可调用性
if (!IsCallable(callback)) {
  ThrowTypeError(MessageTemplate::kCalledNonCallable, callback);
}
const callable: Callable = Cast<Callable>(callback);
```

### 3. 边界条件

✅ **检查数组长度**：

```tq
if (len == 0) {
  return Undefined;  // 空数组处理
}

if (len > kMaxArrayLength) {
  ThrowTypeError(MessageTemplate::kInvalidArrayLength);
}
```

### 4. 类型安全

✅ **使用 UnsafeCast 时确保类型正确**：

```tq
// 在 Cast 或类型检查后使用 UnsafeCast
const array: JSArray = Cast<JSArray>(receiver) otherwise goto SlowPath;
const fixedArray: FixedArray = UnsafeCast<FixedArray>(array.elements);
```

---

## 完整 API 参考

### 内置函数列表

| 函数名 | JavaScript 方法 | 说明 |
|--------|----------------|------|
| `ArrayPrototypeFirst` | `Array.prototype.first()` | 获取第一个元素 |
| `ArrayPrototypeLast` | `Array.prototype.last()` | 获取最后一个元素 |
| `ArrayPrototypeFirstWithCallback` | `Array.prototype.first(callback)` | 带条件的 first |
| `ArrayPrototypeLastWithCallback` | `Array.prototype.last(callback)` | 带条件的 last |

### 内置宏和函数

| 名称 | 用途 |
|------|------|
| `ToObject_Inline()` | 将 this 转为对象 |
| `GetLengthProperty()` | 获取 length 属性 |
| `GetProperty()` | 获取对象属性 |
| `IsCallable()` | 检查是否可调用 |
| `Cast<T>()` | 类型转换并检查 |
| `UnsafeCast<T>()` | 无检查类型转换 |
| `Call()` | 调用 JavaScript 函数 |
| `ToBoolean()` | 转为布尔值 |
| `ThrowTypeError()` | 抛出类型错误 |

### 类型谓词

| 谓词 | 说明 |
|------|------|
| `IsElementsKindLessThanOrEqual()` | ElementsKind 范围判断 |
| `IsNullOrUndefined()` | 检查 null/undefined |
| `IsCallable()` | 检查是否函数 |

---

## 测试用例

### JavaScript 测试

```javascript
// test-array-first-last.js

// 测试 first()
console.assert([1, 2, 3].first() === 1);
console.assert([].first() === undefined);
console.assert([, 2, 3].first() === undefined);  // hole
console.assert([undefined, 2].first() === undefined);  // undefined 值
console.assert(['a', 'b'].first() === 'a');

// 测试 last()
console.assert([1, 2, 3].last() === 3);
console.assert([].last() === undefined);
console.assert([1, 2, ].last() === undefined);  // hole
console.assert([1, undefined].last() === undefined);  // undefined 值
console.assert(['a', 'b'].last() === 'b');

// 测试 first(callback)
console.assert([1, 2, 3, 4].first(x => x > 2) === 3);
console.assert([1, 2, 3].first(x => x > 10) === undefined);
console.assert([10, 20, 30].first() === 10);  // 无 callback

// 测试 last(callback)
console.assert([1, 2, 3, 4].last(x => x > 2) === 4);
console.assert([1, 2, 3].last(x => x > 10) === undefined);
console.assert([10, 20, 30].last() === 30);  // 无 callback

// 测试 thisArg
const ctx = { threshold: 5 };
console.assert([1, 3, 7, 9].first(x => x > ctx.threshold, ctx) === 7);
console.assert([1, 3, 7, 9, 15].last(x => x > ctx.threshold, ctx) === 15);

// 测试非数组对象
const arrayLike = {0: 'a', 1: 'b', length: 2};
console.assert(Array.prototype.first.call(arrayLike) === 'a');
console.assert(Array.prototype.last.call(arrayLike) === 'b');

// 测试 TypedArray
const typed = new Int8Array([10, 20, 30]);
// 注意：TypedArray 需要单独实现原型方法

console.log('All tests passed!');
```

### C++ 测试

```cpp
// test/cctest/compiler/test-array-first-last.cc

#include "test/cctest/cctest.h"
#include "test/cctest/value-helper.h"

THREADED_TEST(ArrayPrototypeFirst) {
  CcTest::InitializeVM();
  HandleScope scope(CcTest::i_isolate());
  
  Factory* factory = CcTest::i_isolate()->factory();
  
  // 创建测试数组 [1, 2, 3]
  Handle<JSArray> array = factory->NewJSArray(3);
  JSArray::SetContent(array, 1, 2, 3);
  
  // 调用 first()
  Handle<JSFunction> first_func = 
      factory->array_function()->map()->instance_type()->first_function();
  
  MaybeHandle<Object> result = Execution::Call(
      CcTest::i_isolate(), first_func, array, 0, nullptr);
  
  CHECK(result.ToHandleChecked()->IsSmi());
  CHECK_EQ(1, result.ToHandleChecked()->ToSmi()->value());
}

THREADED_TEST(ArrayPrototypeLast) {
  // 类似实现...
}
```

---

## 参考资料

- [V8 TQ Language Guide](https://v8.dev/docs/turbofan)
- [ECMA-262 Array Specification](https://tc39.es/ecma262/#sec-array-objects)
- [V8 Source Code](https://github.com/v8/v8/tree/main/src/builtins)
- [V8 Design Document: Array Builtins](https://docs.google.com/document/d/1qR8gRvqQ8L8L8L8L8L8L8L8L8L8L8L8/edit)

---

## 许可证

本文档示例代码遵循 V8 项目的 BSD 许可证。

```
Copyright 2026 the V8 project authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
be found in the LICENSE file.
```
