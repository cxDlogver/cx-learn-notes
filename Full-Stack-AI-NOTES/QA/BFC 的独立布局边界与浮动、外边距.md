# BFC 的独立布局边界与浮动、外边距

## 【知识概述】

**BFC 是块级格式化上下文，提供一组布局边界规则；包含浮动、避免部分外边距折叠及避让浮动都应从这些规则解释。**

BFC 是 **Block Formatting Context，块级格式化上下文**。

它不是一个具体 CSS 属性，而是一种**独立的块级布局环境**。

一个元素满足建立 BFC 的条件以后，并不是浏览器真的在它外面多套一个盒子，而是：

**这个元素的内部内容开始在一个新的 Formatting Context 中进行布局。**

内部和外部并不是“完全没有任何联系”，因为 BFC 本身的尺寸仍然会参与父级布局。

理解这组机制，可以沿以下主线展开：

先说明独立格式化环境及可创建它的方式。

分别用父容器高度、父子 margin 和浮动旁内容说明边界的作用。

再比较 flow-root 与 overflow 等创建方法的副作用。

创建 BFC 不意味着内部所有外边距都不折叠；overflow 还会改变裁剪和滚动，不能仅为清除浮动随意使用。相关完整知识可结合 [CSS核心内容](<../C-CSS核心内容.md>) 阅读。

## 1. 机制说明与工程判断

### 【BFC 的本质：建立一个独立的布局环境】

BFC 全称 **Block Formatting Context，块级格式化上下文**。

它不是一个 CSS 属性，也不是浏览器真的给元素外面新增了一层 DOM 或盒子，而是：

> **某个盒子为自己的内容建立了一套独立的块级布局环境。**

可以把它抽象成：

```text
外部 Formatting Context

┌────────── BFC 边界 ──────────┐
│                              │
│     内部元素按照这个 BFC      │
│     的规则进行布局             │
│                              │
└──────────────────────────────┘
```

这个“边界”是**布局计算上的边界**。

CSS Display 规范对 independent formatting context 的描述也非常接近这个理解：除盒子自身尺寸等联系外，内部后代的布局通常不受外部格式化上下文内容影响，内部布局的影响通常也不会向外逃逸。[[1]](https://www.w3.org/TR/css-display-3/)

---
### 【常见创建 BFC 的方式】

例如：

```css
display: flow-root;
```

以及常见的：

```css
overflow: hidden;
overflow: auto;
overflow: scroll;
```

还有：

```text
float 不为 none
position: absolute / fixed
display: inline-block
table-cell 等
```

CSS2 规范明确列出了浮动、绝对定位、`inline-block`、`table-cell`、部分 `overflow` 非 `visible` 的块盒等会建立新的 BFC。[[2]](https://www.w3.org/TR/CSS2/visuren.html)

现代 CSS 中如果单纯为了建立 BFC，最容易理解的是：

```css
display: flow-root;
```

因为它的语义就是建立一个新的块级格式化上下文。[[1]](https://www.w3.org/TR/css-display-3/)

---
### 【三个作用的共同原理】

可以把 BFC 的核心原理统一理解成：

```text
创建 BFC
↓
形成独立的块级格式化上下文
↓
形成布局计算边界
↓
浮动、margin、块盒布局
按照 BFC 边界相关规则处理
```

所以 BFC 解决的三个经典问题：

```text
高度塌陷、Margin 折叠、浮动遮盖
```

确实都可以从：

> **BFC 建立了新的布局上下文和布局边界**

这个角度理解。

但三个问题对应的**具体规范规则并不完全一样**，这一点面试时讲出来会更准确。

## 2. 完整回答与表达组织

BFC 是 **Block Formatting Context，块级格式化上下文**。

它不是一个具体 CSS 属性，而是一种**独立的块级布局环境**。

一个元素满足建立 BFC 的条件以后，并不是浏览器真的在它外面多套一个盒子，而是：

> **这个元素的内部内容开始在一个新的 Formatting Context 中进行布局。**

因此可以把 BFC 理解成存在一条**布局边界**：

```text
外部布局环境

┌──────────── BFC ────────────┐
│                             │
│       内部自己的布局环境      │
│                             │
└─────────────────────────────┘
```

内部和外部并不是“完全没有任何联系”，因为 BFC 本身的尺寸仍然会参与父级布局。

更准确的是：

> **内部的布局规则和影响通常不会直接跨越 Formatting Context 边界，外部的相关布局影响通常也不会直接进入内部。**

CSS Display 对 independent formatting context 的定义就是：内部后代的布局通常不受外部 Formatting Context 的规则和内容影响，反过来也一样；其中还特别举出了 float 和 margin 的例子。[[1]](https://www.w3.org/TR/css-display-3/)
### 【为什么 BFC 能解决浮动导致的高度塌陷？】

例如：

```html
<div class="parent">
  <div class="child"></div>
</div>
```

```css
.child {
  float: left;
  width: 100px;
  height: 100px;
}
```

浮动元素不再按照普通流的方式参与周围盒子的常规排布，所以普通父元素可能出现：

```text
parent
┌────────────────┐
└────────────────┘

child float
┌────────┐
│        │
│        │
└────────┘
```

看起来父元素没有被浮动子元素撑起来，也就是常说的**高度塌陷**。

如果让父元素建立新的 BFC：

```css
.parent {
  display: flow-root;
}
```

这时候：

```text
parent 建立 BFC
↓
child 是这个 BFC 内部的浮动
↓
这个浮动的影响被限制在当前 Formatting Context
↓
BFC 根计算高度时需要包含内部浮动
↓
parent 高度被撑开
```

可以画成：

```text
┌──────────── parent / BFC ────────────┐
│                                      │
│   ┌──── float child ────┐            │
│   │                     │            │
│   │                     │            │
│   └─────────────────────┘            │
│                                      │
└──────────────────────────────────────┘
```

所以统一理解是：

> **BFC 把内部浮动限制在自己的布局环境中，并按照 BFC 的高度规则将内部浮动纳入 BFC 根的尺寸计算，因此能够包含浮动。**

CSS Display 也明确用 float 说明独立格式化上下文：float 的影响不会逃出自己的 Formatting Context，而建立该上下文的盒子会增长以包含它们。[[1]](https://www.w3.org/TR/css-display-3/)

---
### 【为什么 BFC 能解决父子 Margin 折叠？】

普通情况下：

```html
<div class="parent">
  <div class="child"></div>
</div>
```

```css
.child {
  margin-top: 50px;
}
```

在满足 margin collapse 条件时：

```text
parent
┌──────────────────────────┐
│
│ child 的 margin-top
│ 可能与 parent 的 margin
│ 发生折叠
```

可以表现得像：

```text
child 的 margin
“越过了父元素的边界”
```

原因是父元素和子元素原本参与同一个 BFC，满足 margin adjoining 的条件。

CSS2 对 margin collapse 有一个非常关键的前提：

> 两个 margin 要发生折叠，它们必须属于**参与同一个 BFC 的正常流块级盒子**。[[3]](https://www.w3.org/TR/CSS2/box.html)

如果父元素自己建立新的 BFC：

```css
.parent {
  display: flow-root;
}
```

那么：

```text
外部 BFC
│
├─ parent
│   │
│   └── 新 BFC
│        ↓
│       child
```

父元素自身的外部布局和子元素参与的内部 BFC 被分开。

所以：

```text
child 的内部 margin
×
不能跨 Formatting Context 边界
与 parent 外部 margin 折叠
```

这就是为什么：

> **创建 BFC 可以阻断典型的父子 margin 折叠。**

CSS2 也直接规定，建立新 BFC 的元素，其 margin 不会和正常流子元素的 margin 折叠。[[3]](https://www.w3.org/TR/CSS2/box.html)

---
### 【但“两个兄弟各自是 BFC，就一定不 Margin 折叠”是不准确的】

这是这里最重要的修正。

假设：

```html
<div class="a"></div>
<div class="b"></div>
```

即使：

```css
.a {
  display: flow-root;
  margin-bottom: 20px;
}

.b {
  display: flow-root;
  margin-top: 30px;
}
```

`.a` 和 `.b` **内部**分别有自己的 BFC：

```text
父 BFC

┌──── a ────┐
│ a 的 BFC   │
└───────────┘
    margin

    margin
┌──── b ────┐
│ b 的 BFC   │
└───────────┘
```

但是：

```text
a 的 margin-bottom
b 的 margin-top
```

是 `.a` 和 `.b` **自身的外部 margin**。

这两个盒子作为兄弟，仍然参与父元素建立的**同一个 BFC**。

所以它们的外部垂直 margin：

> **仍然可能发生折叠。**

CSS2 甚至直接规定：正常流块级元素的 bottom margin 与后续正常流块级兄弟的 top margin，在满足条件时会折叠。[[3]](https://www.w3.org/TR/CSS2/box.html)

因此一定不要记成：

```text
两个元素分别创建 BFC
↓
两个兄弟 margin 一定不折叠
```

不成立。

真正要抓住的是：

> **Margin 不能跨 Formatting Context 边界折叠。**

但 BFC 根自己的**外部 margin**仍然属于它所在的父 Formatting Context。

所以：

```text
父子 margin
→ 建立 BFC 通常可以阻断

BFC 内部与外部 margin
→ 不能跨边界 collapse

两个 BFC 根作为兄弟的外部 margin
→ 仍可能在共同父 BFC 中 collapse
```

这三个要区分开。

---
### 【为什么 BFC 能避免浮动元素遮盖？】

例如：

```html
<div class="left"></div>
<div class="right"></div>
```

```css
.left {
  float: left;
  width: 200px;
}
```

普通 `.right`：

```text
float
┌───────┐
│ left  │  right 的内容可能绕着 float
│       │
└───────┘
```

如果：

```css
.right {
  display: flow-root;
}
```

`.right` 创建新的 BFC。

那么 CSS 对 BFC 根还有一个明确规则：

> **正常流中建立新 BFC 的元素，其 border box 不允许与同一个外部 BFC 中 float 的 margin box 重叠。** [[2]](https://www.w3.org/TR/CSS2/visuren.html)

因此浏览器会调整它：

```text
┌─────────┐ ┌──────────────────┐
│  float  │ │     right BFC    │
│  left   │ │                  │
│         │ │                  │
└─────────┘ └──────────────────┘
```

这仍然可以从“布局边界”理解：

```text
right 创建 BFC
↓
成为独立的布局区域
↓
BFC 根不能直接侵入 float 的区域
↓
浏览器重新计算 right 的可用区域
↓
避免盒级遮盖
```

这里并不是因为：

```text
margin 不互相影响
```

而是因为 **BFC 与 float 有专门的避让规则**。[[2]](https://www.w3.org/TR/CSS2/visuren.html)

---
### 【最终面试收敛回答】

> **BFC 是 Block Formatting Context，也就是块级格式化上下文。它不是一个 CSS 属性，而是一种独立的块级布局环境。元素建立 BFC 后，可以把它理解成形成了一条布局计算上的边界：内部后代按照这个 Formatting Context 的规则进行布局，内部布局的影响通常不会直接逃逸到外部，外部 Formatting Context 的相关布局影响通常也不会直接进入内部。BFC 能解决的几个经典问题都可以从这个“布局边界”理解。第一，对于浮动，内部 float 的影响被限制在 BFC 内，同时 BFC 根计算尺寸时会包含内部 float，所以能解决父元素高度塌陷；第二，margin 折叠要求相关 margin 参与同一个 BFC，因此建立新的 BFC 可以阻断典型的父子 margin 折叠，但两个 BFC 根作为兄弟时，它们自己的外部 margin 仍可能在共同父 BFC 中折叠；第三，一个正常流元素建立 BFC 后，其 border box 按规范不能和同一个外部 BFC 中 float 的 margin box 重叠，因此能够避免浮动元素造成的盒级覆盖。所以统一原理可以记成：BFC 建立独立布局边界，但高度、margin 和 float 分别有对应的具体布局规则。** [[1]](https://www.w3.org/TR/css-display-3/)

## 3. 参考文献

[1] [CSS Display Module Level 3](<https://www.w3.org/TR/css-display-3/>)[EB/OL].

[2] [W3C](<https://www.w3.org/TR/CSS2/visuren.html>)[EB/OL].

[3] [W3C](<https://www.w3.org/TR/CSS2/box.html>)[EB/OL].
