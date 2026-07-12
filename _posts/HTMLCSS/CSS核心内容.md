---
title: HTML核心内容
date: 2026-01-10 10:31:37
tags: CSS
categories: HTMLCSS
---

# Flex

## 1. Flex 是什么

**Flex（Flexible Box）是一种一维布局模型**，用于在**一条主轴**上对元素进行排列、对齐与分配空间。

适用场景：

- 横向或纵向排列的组件（导航栏、列表、工具栏）
- 不确定数量、不确定尺寸的子元素布局
- 响应式布局中的局部结构

## 2. Flex 的基本概念

### 【两个角色】

- **Flex Container（容器）**：设置了 `display: flex` 的元素
- **Flex Item（项目）**：容器的直接子元素

```css
.container {
  display: flex;
}
```

------

### 【两根轴】

Flex 布局中最重要的概念是 **轴向系统**：

- **主轴（main axis）**
   元素排列的方向，由 `flex-direction` 决定
- **交叉轴（cross axis）**
   垂直于主轴的方向

示例：

```css
flex-direction: row;        /* 主轴：水平方向（默认） */
flex-direction: column;     /* 主轴：垂直方向 */
```

## 3. 容器属性（决定整体布局规则）

### 1. display

```css
display: flex;        /* 块级 flex */
display: inline-flex;/* 行内 flex */
```

------

### 2. flex-direction（主轴方向）

```css
flex-direction: row;            /* 默认，从左到右 */
flex-direction: row-reverse;    /* 从右到左 */
flex-direction: column;         /* 从上到下 */
flex-direction: column-reverse; /* 从下到上 */
```

影响的是：

- 主轴方向
- `justify-content` 的方向
- `flex-basis` 的参考方向

### 3. flex-wrap（是否换行）

```css
flex-wrap: nowrap;  /* 默认，不换行 */
flex-wrap: wrap;    /* 自动换行 */
flex-wrap: wrap-reverse;
```

常见误区：

- **Flex 默认是单行布局**
- 多行布局必须显式开启 `wrap`

### 4. flex-flow

```css
flex-flow: row wrap;
```

### 5. justify-content（主轴对齐方式）

控制 **项目在主轴上的分布方式**

```css
justify-content: flex-start;
justify-content: flex-end;
justify-content: center;
justify-content: space-between;
justify-content: space-around;
justify-content: space-evenly;
```

核心理解：

- 对齐的是 **整体剩余空间**
- 不改变元素本身尺寸

### 6. align-items（交叉轴对齐，单行）

控制 **项目在交叉轴上的对齐方式**

```css
align-items: stretch;    /* 默认，拉伸 */
align-items: flex-start;
align-items: flex-end;
align-items: center;
align-items: baseline;
```

常见用途：

- 垂直居中（row 模式）
- 横向居中（column 模式）

### 7. align-content

只对 **多行 flex** 生效（必须 `wrap`）

```css
align-content: flex-start;
align-content: flex-end;
align-content: center;
align-content: space-between;
align-content: space-around;
align-content: stretch;
```

重要区分：

- `align-items`：控制 **每一行内的元素**
- `align-content`：控制 **多行整体**

## 4. 项目属性（控制单个元素行为）

### 1. order（排列顺序）

```css
.item {
  order: 1;
}
```

特点：

- 默认值为 `0`
- 数值越小，越靠前
- **只影响视觉顺序，不影响 DOM 顺序**

### 2. flex-grow（放大比例）

```css
.item {
  flex-grow: 1;
}
```

含义：

- 当容器有剩余空间时，按比例分配
- 默认值为 `0`（不参与扩展）

示例：

```css
.itemA { flex-grow: 1; }
.itemB { flex-grow: 2; }
```

A:B = 1:2

### 3. flex-shrink（缩小比例）

```css
.item {
  flex-shrink: 1;
}
```

含义：

- 空间不足时，按比例压缩
- 默认值为 `1`

常见问题：

- 子元素被压缩到小于内容宽度
- 可通过 `flex-shrink: 0` 禁止缩小

### 4. flex-basis（初始尺寸）

```css
.item {
  flex-basis: 200px;
}
```

含义：

- **主轴方向上的初始尺寸**
- 优先级高于 `width / height`

规则优先级：

```css
max-width/min-width
↓
flex-basis
↓
width / height
↓
content size
```

### 5. flex

```css
flex: 1;              /* 1 1 0% */
flex: 1 0 auto;
flex: 0 0 200px;
```

工程常用写法：

- `flex: 1`：自适应填满
- `flex: none`：等价于 `0 0 auto`
- `flex: 0 0 100px`：固定尺寸

### 6. align-self（单个项目的交叉轴对齐）

```css
.item {
  align-self: center;
}
```

会覆盖 `align-items`

## 5. Flex 布局计算流程

Flex 布局的核心步骤：

1. 确定主轴方向
2. 计算每个 item 的 **flex-basis**
3. 计算剩余空间（或溢出空间）
4. 根据 `flex-grow / flex-shrink` 分配空间
5. 再执行 `justify-content / align-items`

理解这一流程，有助于排查：

- 为什么元素被压缩
- 为什么宽度不生效
- 为什么居中失败

## 6. 常见布局场景总结

### 1. 水平 + 垂直居中

```css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

------

### 2. 两栏布局（左固定，右自适应）

```css
.left {
  width: 200px;
}
.right {
  flex: 1;
}
```

## 7. Flex 常见坑与注意点

1. **flex 默认不换行**
2. `align-content` 对单行无效
3. `flex-basis` 会覆盖 `width`
4. `flex: 1` 等价于 `1 1 0%`
5. 子元素最小宽度可能来自内容（`min-width: auto`）
6. Flex 是一维布局，不适合复杂二维网格（用 Grid）

# Grid

> [无废话！12分钟搞懂CSS Grid 一行代码实现响应式布局！_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1yXqaBoEv1/?spm_id_from=333.337.search-card.all.click&vd_source=ff414aaf189e3a685358d2a984fd4742)

在实际布局中，我们经常遇到以下问题：

- 页面是**二维布局**（既要控制行，又要控制列）
- 需要**整体规划区域结构**（Header / Sidebar / Content / Footer）
- 子元素之间存在**明确的网格关系**
- 不希望写大量嵌套 DOM 或手算宽高

**Flex 是一维布局（行或列），Grid 是二维布局（行 + 列）**

## 一、Grid 布局核心概念

### 什么是 Grid 布局？

CSS Grid Layout 是一种强大的**二维布局系统**，它允许开发者同时控制**行（rows）和列（columns）**，非常适合构建整体页面结构和复杂区域布局。

```html
<div class="container">
  <div class="item header">Header</div>
  <div class="item sidebar">Sidebar</div>
  <div class="item main">Main Content</div>
  <div class="item footer">Footer</div>
</div>
```

### Grid 的核心角色

- **Grid Container（网格容器）**：设置 `display: grid | inline-grid` 的元素
- **Grid Items（网格项目）**：Grid 容器的直接子元素

### 核心术语图解

| 术语       | 描述                          |
| ---------- | ----------------------------- |
| Grid Line  | 网格线（行线/列线）           |
| Grid Track | 两条网格线之间的区域（行/列） |
| Grid Cell  | 行和列交叉形成的最小单元      |
| Grid Area  | 由多个 Cell 组成的矩形区域    |

## 二、网格定义：创建布局结构

### 1. 定义行和列

```css
.container {
  display: grid;
  grid-template-columns: 200px 1fr 2fr; /* 三列布局 */
  grid-template-rows: 100px auto; /* 两行布局 */
  gap: 20px; /* 行列间距 */
}
```

**常用单位解析：**

- `px`：固定尺寸
- `%`：相对于容器尺寸
- `fr`：剩余空间分配单位（推荐）
- `auto`：由内容决定尺寸

### 2. repeat() 简化写法

```css
.container {
  grid-template-columns: repeat(3, 1fr);
  /* 等价于：1fr 1fr 1fr */
}
```

### 3. minmax() 弹性约束

```css
.container {
  grid-template-columns: repeat(3, minmax(200px, 1fr));
}
```

**含义：** 每列最小宽度 200px，最大可伸展到 1fr

### 4. gap 间距控制

```css
.container {
  gap: 20px; /* 行列统一间距 */
  /* 或分别控制 */
  row-gap: 15px;
  column-gap: 30px;
}
```

### 5.`grid-template-areas`

```css
.container {
    grid-template-areas:
    "header header"
    "nav main"
    "footer footer";
}
```



## 三、网格项目放置方法

### 1. 基于网格线放置

```css
.item {
  grid-column: 1 / 3; /* 从第1条线到第3条线 */
  grid-row: 2 / 4;    /* 从第2条线到第4条线 */
}
```

### 2. span 跨越写法（推荐）

```css
.item {
  grid-column: span 2; /* 跨越2列 */
  grid-row: span 3;    /* 跨越3行 */
}
```

### 3. grid-area 简写

```css
.item {
  /* 起始行/起始列/结束行/结束列 */
  grid-area: 2 / 1 / 4 / 3;
}
```

### 4. 通过area声明

```css
.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }
```

## 四、隐式网格与自动流

### 显式 vs 隐式网格

- **显式网格**：通过 `grid-template-rows/columns` 明确定义
- **隐式网格**：项目超出定义区域时自动生成的行/列

### 隐式网格尺寸控制

```css
.container {
  grid-auto-rows: 100px; /* 隐式行高 */
  grid-auto-columns: 1fr; /* 隐式列宽 */
}
```

### 自动放置方向（grid-auto-flow）

```css
.container {
  grid-auto-flow: row;     /* 默认，按行填充 */
  grid-auto-flow: column;  /* 按列填充 */
  grid-auto-flow: row dense; /* 密集填充 */
}
```

**dense 模式的作用：** 尝试填充布局中的空白区域，可能改变 DOM 顺序的视觉呈现

### 自动布局应用场景

- 图片瀑布流
- 卡片列表
- 不定数量子元素布局

## 五、对齐方式

### 1. 容器内整体对齐（轨道级）

```css
.container {
  justify-content: center; /* 水平对齐 */
  align-content: center;   /* 垂直对齐 */
}
```

**可用值：** `start | center | end | space-between | space-around | space-evenly`

### 2. 单元格内项目对齐（项目级）

```css
.container {
  justify-items: center; /* 水平对齐 */
  align-items: center;   /* 垂直对齐 */
}
```

### 3. 单个元素对齐（优先级最高）

```css
.item {
  justify-self: end;   /* 水平对齐 */
  align-self: start;   /* 垂直对齐 */
}
```

### 4. stretch 规则

默认值为 `stretch`，项目会填满整个单元格（前提是项目没有固定宽高）

## 六、响应式布局策略

### 1. auto-fill / auto-fit

```css
.container {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}
```

**区别：**

- `auto-fill`：保留空轨道
- `auto-fit`：压缩空轨道，让内容拉伸

### 2. 无媒体查询响应式（推荐）

```css
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
```

**特点：** 列数自动变化，完美适配卡片、产品列表等布局

### 3. 媒体查询 + Grid

```css
@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr;
  }
}
```

### 4. Grid Areas 实现响应式结构切换

```css
.container {
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
}

@media (max-width: 768px) {
  .container {
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
  }
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }
```

## 实战案例：响应式仪表盘

```HTML
<div class="dashboard">
  <header>Dashboard Header</header>
  <nav>Navigation</nav>
  <main>Main Content Area</main>
  <aside>Additional Info</aside>
  <footer>Footer Content</footer>
</div>
```

```css
.dashboard {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 80px 1fr 100px;
  grid-template-areas:
    "header header"
    "nav main"
    "footer footer";
  height: 100vh;
  gap: 15px;
}

header { grid-area: header; }
nav { grid-area: nav; }
main { grid-area: main; }
aside { grid-area: aside; }
footer { grid-area: footer; }

@media (max-width: 768px) {
  .dashboard {
    grid-template-columns: 1fr;
    grid-template-rows: 70px auto 1fr auto 70px;
    grid-template-areas:
      "header"
      "nav"
      "main"
      "aside"
      "footer";
  }
}
```

# 基础内容

## 布局 / 回流 · 重绘 · 合成

浏览器一次完整的渲染流程可以抽象为：

```
DOM → CSSOM
↓
Render Tree
↓
Layout（布局 / 回流）
↓
Paint（重绘）
↓
Composite（合成）
```

三者是**严格的递进关系**：

- 回流一定包含重绘
- 重绘一定包含合成
- 合成可以单独发生

------

**布局 / 回流（Layout / Reflow）**

本质：浏览器重新计算元素在页面中的**几何信息**，包括位置（x / y）、尺寸（width / height）、以及文档流关系（是否占位、是否脱离文档流）。这是整个渲染流程中**性能开销最大**的一步。

只要满足一句话即可判断是否发生回流：

> **是否需要重新计算元素的几何信息**

典型触发场景包括：

- 几何属性变化

  ```
  width / height
  margin / padding
  border
  top / left / right / bottom
  font-size
  ```

- 文档流结构变化

  ```
  display: none / block
  DOM 节点插入、删除、顺序变化
  position: static → absolute / fixed
  ```

- 强制同步布局读取

  ```
  offsetWidth / offsetHeight
  clientWidth
  scrollTop
  getComputedStyle()
  ```

性能特征：

- 可能影响父元素、子元素、兄弟元素
- 可能向上或向下递归传播
- DOM 规模越大，代价越高

结论：

> **回流是最昂贵、最需要避免的操作**

------

**重绘（Paint / Repaint）**

本质：元素的**几何信息未发生变化**，但需要重新绘制像素内容，即“外观变了，位置和大小没变”。

常见触发属性：

```
color
background-color
background-image
box-shadow
border-color
visibility
```

示例：

```
box.style.backgroundColor = 'red'
```

流程表现为：

```
跳过 Layout
→ Paint
→ Composite
```

性能特征：

- 不重新计算布局
- 需要 CPU / GPU 重新绘制像素
- 成本中等

结论：

> **重绘比回流便宜，但仍需控制频率**

------

**合成（Composite）**

本质：在布局和绘制完成后，浏览器只对**已有图层**进行位移、缩放、透明度等操作。

核心特点：

- 不重新计算布局
- 不重新绘制像素
- 直接操作图层

只触发合成的典型属性：

```
transform
opacity
filter（部分情况）
```

示例：

```
box.style.transform = 'translateX(100px)'
```

流程表现为：

```
跳过 Layout
跳过 Paint
→ Composite
```

性能特征：

- 通常由 GPU 执行
- 成本最低
- 非常适合动画和高频更新

结论：

> **高性能动画 = 尽量只触发合成**

------

**三者严格对照总结**

| 操作类型            | 是否回流 | 是否重绘 | 是否合成 | 性能 |
| ------------------- | -------- | -------- | -------- | ---- |
| 修改 width / height | 是       | 是       | 是       | 最差 |
| 修改 left / top     | 是       | 是       | 是       | 很差 |
| 修改 background     | 否       | 是       | 是       | 中   |
| opacity 变化        | 否       | 是       | 是       | 较好 |
| transform 变化      | 否       | 否       | 是       | 最优 |

------

**统一澄清的易错点**

- 脱离文档流 ≠ 不回流

  ```
  position: absolute;
  ```

  从 static 变为 absolute：**一定回流**，因为文档流结构发生变化。

- absolute + left / top 仍然回流

  ```
  position: absolute;
  left: -9999px;
  ```

  left 属于布局属性，仍需重新计算几何位置，只是局部回流而非零回流。

- transform 位移不影响布局

  ```
  transform: translateX(100px);
  ```

  文档流占位不变，仅发生视觉层移动，只触发合成。

------

**判断是否回流的“终极公式”**

> 是否需要重新计算几何信息？

- 需要 → 回流
- 不需要 → 不回流
  - 只是像素变化 → 重绘
  - 只是图层变化 → 合成

------

**实战级优化原则**

1. 避免频繁修改布局属性（width、left、margin）
2. 避免在循环中交替读写布局属性
3. 动画优先使用 transform / opacity
4. 批量 DOM 修改时先脱离文档流
5. 使用 class 切换代替多次 style 修改
6. 警惕 offsetWidth 等强制同步回流属性
