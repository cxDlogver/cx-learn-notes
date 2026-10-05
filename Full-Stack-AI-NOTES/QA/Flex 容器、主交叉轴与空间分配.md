# Flex 容器、主交叉轴与空间分配

## 【知识概述】

**Flex 是一维布局模型，通过容器定义方向及对齐，通过项目定义伸缩和基础尺寸；理解轴和可用空间比孤立背属性更重要。**

Flex 是 CSS 中的一种**一维布局模型**，主要用于解决元素在水平或者垂直一个方向上的排列、对齐以及空间分配问题。它比较适合导航栏、工具栏、水平居中、垂直居中、左右布局以及一行多个元素自适应这类场景。

此时 `.container` 是 Flex 容器，它的直接子元素就是 Flex Item。

主轴和交叉轴并不是固定对应水平和垂直方向。**主轴由 `flex-direction` 决定，交叉轴与主轴垂直。**

Flex 的属性最好分成**容器属性**和**项目属性**来记。

`flex-wrap` 控制 Flex Item 是否允许换行：

理解这组机制，可以沿以下主线展开：

先建立容器、项目、主轴和交叉轴的关系。

比较 justify-content、align-items 与多行 align-content

再按 flex-basis、grow、shrink 解释剩余空间或不足空间怎样分配。

主轴不总是水平，shrink 也不代表按同一数值简单等量压缩；最小尺寸与内容会影响最终布局。相关完整知识可结合 [CSS核心内容](<../C-CSS核心内容.md>) 阅读。

## 1. 机制说明与工程判断

### 【Flex 的基本概念】

- Flex 是 CSS 中的一种**一维布局模型**。
- 主要解决元素在一个方向上的排列、对齐和空间分配问题。
- 可以用于水平布局，也可以用于垂直布局。
- 如果需要同时精确控制行和列，一般更适合使用 Grid。
### 【Flex 的核心模型】

- 设置 `display: flex` 的元素叫 **Flex Container**。
- 它的直接子元素叫 **Flex Item**。
- Flex 布局围绕两条轴展开：
  - Main Axis：主轴。
  - Cross Axis：交叉轴。
- 主轴方向由 `flex-direction` 决定，因此主轴不一定是水平方向。
### 【Flex 容器属性】

- `flex-direction`：设置主轴方向。
- `flex-wrap`：控制项目是否换行。
- `justify-content`：控制项目在主轴方向的对齐和空间分配。
- `align-items`：控制项目在交叉轴上的默认对齐。
- `align-content`：多行情况下，控制各行在交叉轴上的分布。
- `gap`：设置项目之间的间距。
### 【Flex 项目属性】

- `flex-grow`：有剩余空间时，项目如何增长。
- `flex-shrink`：空间不足时，项目如何收缩。
- `flex-basis`：参与伸缩计算前的基础尺寸。
- `flex`：`grow`、`shrink`、`basis` 的简写。
- `align-self`：单独设置某个项目在交叉轴上的对齐。
- `order`：调整项目的视觉排列顺序。
### 【高频区别】

- `align-items` 是**容器属性**，控制所有项目默认的交叉轴对齐。
- `align-self` 是**项目属性**，只控制当前项目，并可以覆盖 `align-items`。
- `flex: 1` 常见情况下可理解为：
  ```css
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: 0;
  ```

## 2. 完整回答与表达组织

Flex 是 CSS 中的一种**一维布局模型**，主要用于解决元素在水平或者垂直一个方向上的排列、对齐以及空间分配问题。它比较适合导航栏、工具栏、水平居中、垂直居中、左右布局以及一行多个元素自适应这类场景。

Flex 中首先要理解四个基本概念：

```text
Flex Container → Flex 容器
Flex Item      → Flex 项目
Main Axis      → 主轴
Cross Axis     → 交叉轴
```

例如：

```css
.container {
  display: flex;
}
```

此时 `.container` 是 Flex 容器，它的直接子元素就是 Flex Item。

主轴和交叉轴并不是固定对应水平和垂直方向。**主轴由 `flex-direction` 决定，交叉轴与主轴垂直。**

例如：

```css
flex-direction: row;
```

在常见书写模式下主轴是水平方向；而：

```css
flex-direction: column;
```

主轴就会变成垂直方向。
### 【Flex 容器属性】

Flex 的属性最好分成**容器属性**和**项目属性**来记。

容器属性主要负责整个 Flex 布局的整体规则。

`flex-direction` 用来设置主轴方向：

```css
flex-direction: row;
flex-direction: row-reverse;
flex-direction: column;
flex-direction: column-reverse;
```

`flex-wrap` 控制 Flex Item 是否允许换行：

```css
flex-wrap: nowrap;
flex-wrap: wrap;
```

默认通常是：

```css
flex-wrap: nowrap;
```

因此空间不足时，项目通常会先参与收缩，而不是直接换行。

对齐方面最常用的是：

```css
justify-content
align-items
```

其中：

```text
justify-content
→ 容器属性
→ 控制主轴方向上的对齐和空间分配

align-items
→ 容器属性
→ 控制项目在交叉轴上的默认对齐
```

例如：

```css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

当主轴为水平方向时，可以实现常见的水平、垂直居中。

还有：

```css
align-content
```

它同样是**容器属性**，主要用于存在多行 Flex Item 时，控制多行整体在交叉轴上的分布。

此外：

```css
gap: 16px;
```

可以统一设置 Flex Item 之间的间距。

所以容器属性可以整体记成：

```text
flex-direction、flex-wrap、justify-content、align-items、align-content、gap
```
### 【Flex 项目属性】

项目属性控制的是某一个 Flex Item 自己如何参与布局。

最重要的是：

```text
flex-grow、flex-shrink、flex-basis
```

`flex-grow` 表示：

> 容器存在剩余空间时，这个项目按照什么比例参与增长。

`flex-shrink` 表示：

> 容器空间不足时，这个项目按照什么规则参与收缩。

`flex-basis` 表示：

> 在 Flex 进行伸缩计算之前，该项目在主轴方向上的基础尺寸。

这三个属性可以通过：

```css
flex
```

简写。

例如：

```css
.item {
  flex: 1;
}
```

常见情况下可以理解为：

```css
flex-grow: 1;
flex-shrink: 1;
flex-basis: 0;
```

也就是这个项目：

```text
可以增长 + 可以收缩 + 以 0 作为弹性分配的基础尺寸
```

因此经常用于让元素自动占据剩余空间。

另一个非常容易和 `align-items` 混淆的是：

```css
align-self
```

这里一定要区分：

```text
align-items
→ 容器属性
→ 设置所有 Flex Item 默认的交叉轴对齐

align-self
→ 项目属性
→ 单独修改当前 Flex Item 的交叉轴对齐
```

例如：

```css
.container {
  display: flex;
  align-items: center;
}

.item {
  align-self: flex-start;
}
```

其他项目仍然按照 `center` 对齐，而这个 `.item` 单独使用 `flex-start`。

项目自身还可以通过：

```css
order
```

调整视觉排列顺序。

因此项目属性可以整体记成：

```text
flex-grow、flex-shrink、flex-basis、flex、align-self、order
```

最后，Flex 和 Grid 的核心区别可以概括为：

```text
Flex
→ 一维布局
→ 主要解决一行或一列

Grid
→ 二维布局
→ 同时处理行和列
```
### 【最终面试收敛回答】

> **Flex 是 CSS 中的一维布局模型，主要解决元素在水平或垂直一个方向上的排列、对齐和空间分配问题。设置 `display: flex` 的元素叫 Flex Container，它的直接子元素叫 Flex Item。Flex 通过主轴和交叉轴组织布局，主轴方向由 `flex-direction` 决定。Flex 属性最好分成两类来记：容器属性包括 `flex-direction`、`flex-wrap`、`justify-content`、`align-items`、`align-content` 和 `gap`；项目属性包括 `flex-grow`、`flex-shrink`、`flex-basis`、`flex`、`align-self` 和 `order`。其中 `justify-content` 控制主轴，`align-items` 是容器属性，控制项目在交叉轴上的默认对齐，而 `align-self` 是项目属性，可以单独覆盖某个项目的对齐。`flex: 1` 常见情况下可以理解为 `flex: 1 1 0`。**

