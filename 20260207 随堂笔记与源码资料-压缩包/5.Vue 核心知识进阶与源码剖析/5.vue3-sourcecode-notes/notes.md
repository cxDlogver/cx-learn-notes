# Vue3 源码解读

## Vue3 工程架构设计

### vue 编译相关 compiler

compiler-core，编译核心模块，模板转为渲染函数（Hello.vue）。Parse解释器 -> transform转换器->codegen代码生成器

```html
<template>
  <div>123</div>
</template>
```

```js
const Hello = h("div", "123");
```

compiler-dom，针对浏览器环境拓展，DOM属性支持、html 标签、属性、事件
compiler-sfc，sfc（single-file-component），专门负责单文件组件的编译，编译 script、style、template
compiler-ssr，ssr（server-side-render），跟服务端渲染相关的编译逻辑

### vue 响应式 reactivity

reactivity，响应式完整实现，reactive、ref「reactive 基于 proxy、ref 基于对象 get/set」

### vue 运行时相关 runtime

runtime-core，运行时核心，负责组件实例化、生命周期管理、渲染器逻辑、调度机制
runtime-dom，对于浏览器支持，dom 增删改查、事件处理
runtime-test，测试

### 杂项

server-renderer，服务端渲染
shared，公共逻辑
vue-compat，不重要 `@vue/compat`（又称“迁移构建版”）是 Vue 3 的一个构建版本，提供可配置的 Vue 2 兼容行为。

### 框架入口

vue，给开发者暴露 vue 接口，createApp

## Vue3 编译时

```html
<template>
  <div>123</div>
</template>
```

```js
const Hello = h("div", "123");
```

## Vue3 响应式

为什么需要响应式

- 不用直接操作 DOM，而是通过虚拟 dom 方式让开发者不用关心 dom 操作，而只关注数据的增删改查。

框架要处理数据增删改查以后，视图的更新逻辑

数据的更新怎么触发视图更新【发布订阅模式】

- 数据追踪「视图用了什么数据，就需要追踪什么数据」
- 视图更新「当数据变化后，某些视图部分追踪了我的变化的需要通知更新」

---

为什么 ref 状态，需要用 value 来获取值？
因为 ref 实现是通过 **class** 类实现的，值的获取和赋值是通过 get/set 实现

当组件内有获取 ref 状态的逻辑，我就需要追踪状态的变化
「依赖追踪」this.dep.track()

当状态发生变化时，就需要将变化逻辑同步触发给组件
「状态触发视图更新」this.dep.trigger()

reactive
先根据不同 API，确定 **proxy** 定义的拦截器表现，确定 proxy get/set 逻辑应该怎么处理

```js
const deps = []

const person = new Proxy({age: 18}, {
    get(target, pro) {
        console.log(pro)
        deps.push({name: pro})
    },
    set(target, pro, val) {
        console.log(target, pro, val)

        // const triggerList = deps.find(e => { return e.name === pro})
        deps.forEach(dep => {
            if (dep.name === pro)   {
                console.log(dep)
            }
        })
    }
})

//赋值
person.age = 19

// 此时 deps 还没有被追踪记录


// 消费状态，会导致 deps 追踪记录
person.age


deps
[{…}]

// 在此消费状态
person.age

deps
[{…}]
[{…}]
```


## Vue3 运行时

1. 初始化应用
2. 组件生命周期
3. 响应式数据
4. diff 过程
5. 视图渲染


使用 AI 辅助理解 快速 diff patch 过程

### 一、5步执行顺序概述

Vue 3 的 keyed children diff 算法采用 **"两端比较 + 最长递增子序列"** 的优化策略，执行顺序如下：

| 步骤 | 名称 | 作用 |
|------|------|------|
| 1 | 从头同步 | 从左到右比较，跳过相同节点 |
| 2 | 从尾同步 | 从右到左比较，跳过相同节点 |
| 3 | 挂载新节点 | 旧节点用完了，剩余新节点直接挂载 |
| 4 | 卸载旧节点 | 新节点用完了，剩余旧节点直接卸载 |
| 5 | 未知序列处理 | 中间乱序部分，用最长递增子序列优化 |

---

### 二、详细分析每一步

#### **第1步：从头同步 (sync from start)**
```typescript
while (i <= e1 && i <= e2) {
  const n1 = c1[i]
  const n2 = ...
  if (isSameVNodeType(n1, n2)) {
    patch(n1, n2, ...)  // 更新相同节点
  } else {
    break  // 遇到不同节点，停止
  }
  i++
}
```

**示例：**
```
旧: (a b) c
新: (a b) d e
     ↑↑
     这部分直接 patch，i 最终 = 2
```

**目的：** 快速跳过前缀相同的节点，减少后续处理量。

---

#### **第2步：从尾同步 (sync from end)**
```typescript
while (i <= e1 && i <= e2) {
  const n1 = c1[e1]
  const n2 = c2[e2]
  if (isSameVNodeType(n1, n2)) {
    patch(n1, n2, ...)
  } else {
    break
  }
  e1--
  e2--
}
```

**示例：**
```
旧: a (b c)
新: d e (b c)
        ↑↑
        这部分直接 patch，e1 最终 = 0, e2 最终 = 1
```

**目的：** 快速跳过后缀相同的节点。

---

#### **第3步：挂载新节点 (common sequence + mount)**
```typescript
if (i > e1) {
  if (i <= e2) {
    while (i <= e2) {
      patch(null, c2[i], container, anchor, ...)  // 挂载新节点
      i++
    }
  }
}
```

**触发条件：** 旧节点已全部处理完（`i > e1`），但还有新节点需要挂载。

**场景1：中间追加**
```
旧: (a b)
新: (a b) c
     i=2, e1=1, e2=2
           ↑
           挂载 c
```

**场景2：开头追加**
```
旧: (a b)
新: c (a b)
     i=0, e1=-1, e2=0
     ↑
     挂载 c
```

---

#### **第4步：卸载旧节点 (common sequence + unmount)**
```typescript
else if (i > e2) {
  while (i <= e1) {
    unmount(c1[i], ...)  // 卸载多余节点
    i++
  }
}
```

**触发条件：** 新节点已全部处理完（`i > e2`），但还有旧节点需要删除。

**场景1：中间删除**
```
旧: (a b) c
新: (a b)
     i=2, e1=2, e2=1
           ↑
           删除 c
```

**场景2：开头删除**
```
旧: a (b c)
新: (b c)
     i=0, e1=0, e2=-1
     ↑
     删除 a
```

---

#### **第5步：未知序列处理 (unknown sequence)**

这是算法的核心部分，处理中间乱序的节点。

##### **5.1 构建 key:index 映射表**
```typescript
const keyToNewIndexMap: Map<PropertyKey, number> = new Map()
for (i = s2; i <= e2; i++) {
  if (nextChild.key != null) {
    keyToNewIndexMap.set(nextChild.key, i)
  }
}
```

**作用：** 快速通过 key 查找新节点在新数组中的位置。

---

##### **5.2 遍历旧节点，匹配并构建映射**
```typescript
const newIndexToOldIndexMap = new Array(toBePatched)
for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0

for (i = s1; i <= e1; i++) {
  const prevChild = c1[i]
  let newIndex
  
  // 通过 key 或类型查找匹配
  if (prevChild.key != null) {
    newIndex = keyToNewIndexMap.get(prevChild.key)
  } else {
    // 无 key 节点，遍历查找同类型未匹配节点
  }
  
  if (newIndex === undefined) {
    unmount(prevChild, ...)  // 找不到匹配，卸载
  } else {
    newIndexToOldIndexMap[newIndex - s2] = i + 1  // 记录映射（+1 是为了避开 0）
    
    // 判断是否移动
    if (newIndex >= maxNewIndexSoFar) {
      maxNewIndexSoFar = newIndex
    } else {
      moved = true  // 标记需要移动
    }
    
    patch(prevChild, c2[newIndex], ...)  // 更新节点内容
    patched++
  }
}
```

**关键数据结构：**
- `newIndexToOldIndexMap`: 长度为待处理节点数，记录"新索引 → 旧索引"的映射
- 初始值为 **0** 表示该位置是新增节点
- 非 0 值是旧索引 **+1** 后的结果

---

##### **5.3 最长递增子序列优化移动**
```typescript
const increasingNewIndexSequence = moved
  ? getSequence(newIndexToOldIndexMap)
  : EMPTY_ARR

j = increasingNewIndexSequence.length - 1

for (i = toBePatched - 1; i >= 0; i--) {
  const nextIndex = s2 + i
  const nextChild = c2[nextIndex] as VNode
  
  if (newIndexToOldIndexMap[i] === 0) {
    // 挂载新节点
    patch(null, nextChild, container, anchor, ...)
  } else if (moved) {
    // 不在最长递增子序列中的节点需要移动
    if (j < 0 || i !== increasingNewIndexSequence[j]) {
      move(nextChild, container, anchor, MoveType.REORDER)
    } else {
      j--  // 匹配到，跳过
    }
  }
}
```

---

### 三、最长递增子序列 (LIS) 算法详解

#### **getSequence 函数实现**
```typescript
function getSequence(arr: number[]): number[] {
  const p = arr.slice()           // 前驱数组，记录每个元素的前驱索引
  const result = [0]              // 结果数组，存储索引
  let i, j, u, v, c
  const len = arr.length
  
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {             // 跳过新增节点（值为 0）
      j = result[result.length - 1]
      
      if (arr[j] < arrI) {
        // 比最后一个元素大，直接追加
        p[i] = j
        result.push(i)
        continue
      }
      
      // 二分查找插入位置
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      
      // 替换找到的位置
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  
  // 回溯构造结果
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  
  return result
}
```

---

#### **算法示例演示**

**示例场景：**
```
旧节点: [a, b, c, d, e]  索引: 0, 1, 2, 3, 4
新节点: [a, c, e, d, b]  索引: 0, 1, 2, 3, 4

经过前两步后：i=0, e1=4, e2=4
```

**步骤 5.1 构建 key:index 映射：**
```
c: 1, e: 2, d: 3, b: 4
```

**步骤 5.2 构建 newIndexToOldIndexMap：**
- a 匹配: map[0] = 0 + 1 = 1
- c 匹配: map[1] = 2 + 1 = 3  
- e 匹配: map[2] = 4 + 1 = 5
- d 匹配: map[3] = 3 + 1 = 4
- b 匹配: map[4] = 1 + 1 = 2

```
newIndexToOldIndexMap = [1, 3, 5, 4, 2]
                           ↑  ↑  ↑
                           a  c  e  d  b
```

**发现非递增：** 当处理到 d（值=4）时，发现 4 < 5，标记 `moved = true`

---

**步骤 5.3 计算最长递增子序列：**

输入数组：`[1, 3, 5, 4, 2]`

**算法执行过程：**
```
i=0, arrI=1: result=[0]
i=1, arrI=3: 3>1 → result=[0,1]
i=2, arrI=5: 5>3 → result=[0,1,2]
i=3, arrI=4: 二分查找，替换 5 → result=[0,1,3]
i=4, arrI=2: 二分查找，替换 3 → result=[0,4,3]
```

**回溯得到 LIS 索引：** `[0, 1, 2]`（对应值 [1, 3, 5]）

这意味着节点 a, c, e 的相对顺序不需要改变，而 d 和 b 需要移动。

---

**移动阶段（倒序遍历）：**
```
i=4 (b): 不在 LIS 中 → 移动 b
i=3 (d): 不在 LIS 中 → 移动 d
i=2 (e): 在 LIS 中 → 不移动，j--
i=1 (c): 在 LIS 中 → 不移动，j--
i=0 (a): 在 LIS 中 → 不移动
```

**最终只移动了 2 个节点，而不是 4 个！**

---

### 四、算法复杂度分析

| 阶段 | 时间复杂度 | 说明 |
|------|-----------|------|
| 两端比较 | O(n) | 线性扫描 |
| 构建映射 | O(n) | 线性扫描 |
| 匹配节点 | O(n) 或 O(n²) | 有 key 是 O(n)，无 key 最坏 O(n²) |
| LIS 计算 | O(n log n) | 贪心 + 二分 |
| 移动/挂载 | O(n) | 线性扫描 |

**总体复杂度：** 平均 O(n log n)，最坏 O(n²)（无 key 时）

---

### 五、核心优化思想总结

1. **两端比较**：快速跳过相同前后缀
2. **key 映射**：O(1) 时间查找匹配节点
3. **最长递增子序列**：最小化 DOM 移动次数
4. **倒序处理**：方便使用已处理节点作为锚点
5. **原地复用**：只移动必要的节点，尽量复用已有 DOM

这个算法是 Vue 3 性能优化的核心，特别是最长递增子序列的应用，大大减少了 DOM 操作的次数。


## 手写简版 Vue

1. 依赖追踪和触发
2. watcher 实现
3. 响应式
4. diff
5. render

