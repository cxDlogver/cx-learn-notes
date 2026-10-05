# CSS 定位、包含块与 sticky 滚动约束

## 【知识概述】

**position 决定元素如何参与普通流，以及偏移相对于哪个参考环境；sticky 还需要同时理解滚动容器与包含块。**

理解这组机制，可以沿以下主线展开：

先比较 static 与 relative 是否保留原位置。

再解释 absolute、fixed 的包含块及可能改变参考系的祖先属性。

最后沿滚动、阈值和容器边界说明 sticky 为何粘住又停止。

fixed 不总是相对视口，sticky 的最近滚动容器和实际滚动位置可能不同；祖先 overflow 与剩余移动空间都会影响表现。相关完整知识可结合 [CSS核心内容](<../C-CSS核心内容.md>) 阅读。

## 1. 机制说明与工程判断

### 【五种定位方式】

| 定位 | 是否脱离普通流 | 主要参考 |
|---|---|---|
| `static` | 否 | 正常文档流 |
| `relative` | 否 | 自己原来的位置 |
| `absolute` | 是 | absolute containing block |
| `fixed` | 是 | 通常是视口 |
| `sticky` | 否 | **滚动参考 + 包含块限制** |

理解定位最重要的三个问题是：

```text
是否脱离普通流？、以谁作为定位参考？、滚动以后会发生什么？
```

---
### 【`static`】

`static` 是默认定位方式。

```css
.item {
  position: static;
}
```

元素完全按照正常文档流进行排列：

```text
元素 A
↓
元素 B
↓
元素 C
```

它不是定位元素，所以：

```css
top: 10px;
left: 20px;
```

通常不会产生定位偏移。

可以记：

> **static = 正常排版，没有额外的定位参考系。**

CSS Position 规范将 `static` 定义为按照正常格式化上下文布局，inset 属性不适用于这种定位方式。[[1]](https://lists.w3.org/Archives/Public/public-css-archive/2018Apr/0044.html)

---
### 【`relative`】

`relative` 不脱离普通文档流。

它首先按照普通流得到自己的原始位置：

```text
正常布局位置
      ↓
┌─────────┐
│  item   │
└─────────┘
```

然后：

```css
position: relative;
top: 20px;
left: 30px;
```

再从原位置发生偏移。

关键在于：

> **视觉位置移动了，但是它原来占据的布局空间仍然保留。**

所以：

```text
relative
→ 不脱离普通流
→ 参考自己原来的位置
→ 原来的占位仍然存在
```

---
### 【`absolute`】

`absolute` 最大特点是：

> **脱离普通文档流。**

因此普通流中的其他元素不会再为它保留原来的位置。

它定位时并不是简单找：

```text
直接父元素
```

而是寻找自己的 **containing block**。

项目中最常见：

```css
.parent {
  position: relative;
}

.child {
  position: absolute;
  top: 0;
  left: 0;
}
```

此时可以理解为：

```text
parent
建立 absolute 的定位参考

        ↓

child absolute
相对于 parent 定位
```

所以经常总结：

```text
父 relative
子 absolute
```

但更严格的说法是：

> **absolute 相对于建立其 absolute positioning containing block 的祖先定位。**

因此不能死记成“相对于父元素”。

---
### 【`fixed`】

`fixed` 和 `absolute` 一样：

```text
都会脱离普通文档流
```

区别主要在参考系。

一般：

```css
position: fixed;
top: 0;
```

参考的是：

```text
Viewport
浏览器视口
```

所以页面滚动：

```text
页面内容 ↓↓↓

fixed 元素
保持在视口相同位置
```

因此非常适合：

```text
全屏遮罩、右下角悬浮按钮、固定工具栏、回到顶部
```

可以先记：

```text
absolute
→ 局部定位参考

fixed
→ 通常相对于视口
```

严格来说，某些祖先的 `transform` 等属性也可能改变 fixed 的 containing block，因此“永远相对 viewport”也不是绝对的。

---
### 【Sticky 是这一题最需要讲清楚的】

`sticky` 最重要的第一点：

> **Sticky 没有脱离普通文档流。**

例如：

```css
.header {
  position: sticky;
  top: 0;
}
```

它首先仍然像正常元素一样参与布局：

```text
内容 A

┌───────────┐
│  sticky   │
└───────────┘

内容 B
内容 C
```

它原来占据的位置是存在的。

这一点和：

```text
absolute
fixed
```

不同。

---
#### <u>1. Sticky 要看两个参考</u>

理解 Sticky 最核心的地方，就是**它其实同时受到两套约束**。

可以直接记：

```text
Sticky
│
├── ① 滚动参考
│      → 最近的 Scroll Container / Scrollport
│      → 决定“粘在哪里”
│
└── ② 活动范围
       → Sticky 自己的 containing block
       → 决定“最多能粘多久”
```

这是 Sticky 最清晰的理解模型。

---
#### <u>2. 最近的滚动容器</u>

例如：

```html
<div class="scroll">
  <div class="parent">
    <div class="sticky">标题</div>
  </div>
</div>
```

```css
.scroll {
  overflow: auto;
  height: 500px;
}

.sticky {
  position: sticky;
  top: 0;
}
```

那么 Sticky 的：

```css
top: 0;
```

主要参考的不是：

```text
parent 顶部
```

而是最近 scrollport 的顶部。

也就是这里的：

```text
.scroll
```

所以：

```text
.scroll
┌──────────────────────────┐ ← top: 0 的参考边缘
│ sticky                   │
│                          │
│                          │
└──────────────────────────┘
```

随着 `.scroll` 滚动，当 Sticky 原本的位置即将超过这个限制：

```text
sticky 到达 scrollport top: 0
```

浏览器开始对它进行粘性偏移。

CSS Position 规范对 sticky 的定义就是：它类似 relative positioning，但偏移会参考**最近 scrollport**进行调整。[[2]](https://lists.w3.org/Archives/Public/public-css-archive/2022Jul/0244.html)

---
#### <u>3. “最近滚动容器”怎么理解？</u>

开发中经常简单记成：

> **向上寻找最近设置了 `overflow` 滚动机制的祖先。**

例如：

```css
overflow: auto;
overflow: scroll;
overflow: hidden;
```

都可能改变 Sticky 所参考的最近 scrollport。

因此一个很经典的 Sticky Bug 是：

```html
<body>
  <div class="wrapper">
    <div class="sticky"></div>
  </div>
</body>
```

```css
.wrapper {
  overflow: hidden;
}
```

你原本以为：

```text
sticky
→ 相对浏览器窗口吸顶
```

但实际上这个祖先可能已经改变了它所关联的滚动环境。

所以排查 Sticky 时一定要向父级检查：

```text
overflow
```

需要注意，`overflow: clip` 和 `overflow: hidden` 在滚动容器语义上并不完全一样，不能简单概括成所有“不是 visible”的值效果完全相同。[[3]](https://lists.w3.org/Archives/Public/public-css-archive/2018Apr/0157.html)

---
#### <u>4. Containing Block 限制 Sticky 的活动范围</u>

这是 Sticky 和 Fixed 最大的区别之一。

Sticky 虽然可以：

```text
“吸附”
```

但它并不能无限粘在整个页面上。

因为：

> **Sticky 本身仍然属于正常文档流，也仍然受到自身 containing block 的范围约束。**

例如：

```html
<div class="parent">
  <div class="sticky">标题</div>

  很多内容……
</div>

<div class="next">
  下一个区域
</div>
```

开始时：

```text
┌──────── parent ──────────┐
│ sticky                   │
│                          │
│ 很多内容                  │
│                          │
└──────────────────────────┘

next
```

向下滚动以后：

```text
viewport top
──────────────────────────

sticky ← 暂时粘在这里

parent 其余内容
```

但是继续滚：

```text
parent 的底部
逐渐接近 sticky
```

Sticky 不能继续无限向下脱离自己的 containing block。

最终：

```text
parent 整体离开
↓
sticky 也跟着离开
```

定位机制可以概括为：

> **Sticky“粘在哪里”主要由最近 scrollport 决定，而“最多能粘多久、能活动到哪里”受到自身 containing block 的范围限制。**

这比简单说：

```text
sticky = relative + fixed
```

准确很多。

---
#### <u>5. Sticky 的两个角色可能来自不同祖先</u>

例如：

```html
<div class="scroll">
  <div class="section">
    <div class="sticky"></div>
  </div>
</div>
```

假设：

```css
.scroll {
  overflow: auto;
}

.sticky {
  position: sticky;
  top: 0;
}
```

那么可以理解：

```text
.scroll
↓
提供最近 scrollport
↓
决定 top: 0 相对于哪里

.section
↓
参与确定 sticky 的 containing block
↓
限制 sticky 的活动范围
```

也就是说：

```text
“粘在哪里”
和
“能粘到什么时候”

不一定由同一个元素决定
```

这是 Sticky 最核心的知识点。

---
#### <u>6. 为什么父级离开以后 Sticky 也会消失？</u>

这里不要简单解释为：

> “因为 Sticky 是父元素的孩子，所以父元素没了它也没了。”

应该从布局模型解释：

```text
sticky
仍然参与普通流
↓
它有自己的 containing block
↓
粘性定位只是对正常位置进行约束性偏移
↓
它不能无限逃离自己的 containing block
↓
包含区域滚动离开
↓
sticky 也必须随之离开
```

因此 Sticky 和 Fixed 本质不同：

```text
fixed

viewport
┌─────────────────────┐
│ fixed               │
│                     │
└─────────────────────┘

父内容滚走
fixed 通常仍然存在
```

而：

```text
sticky

viewport
┌─────────────────────┐
│ sticky              │
│                     │
└─────────────────────┘

所属 containing block 滚走
sticky 最终也离开
```

---
#### <u>7. 为什么 Sticky 有时候不生效？</u>

可以直接按三个条件排查。
#### <u>8. 看有没有阈值：</u>

```css
position: sticky;
top: 0;
```

如果只有：

```css
position: sticky;
```

通常没有明确的粘性约束边缘。
#### <u>9. 看最近滚动容器到底是谁：</u>

向祖先检查：

```css
overflow
```

特别是：

```text
auto、scroll、hidden
```

因为你以为参考 viewport，但实际上中间某个祖先可能已经改变了最近 scrollport。
#### <u>10. 看 containing block 有没有足够的活动范围。</u>

例如父元素只有：

```text
50px 高
```

Sticky 自己也是：

```text
50px 高
```

那它基本没有能够产生明显 sticky 效果的移动区间。

所以 Sticky 是否正常工作，可以记：

```text
有 sticky inset
+
找对最近 scrollport
+
containing block 有足够活动空间
```

## 2. 完整回答与表达组织

> **CSS 的定位主要有 `static`、`relative`、`absolute`、`fixed` 和 `sticky`。`static` 是默认正常布局，不能通过 `top/left` 等进行定位偏移；`relative` 不脱离普通流，以自己原来的位置为参考偏移，而且原来的布局空间仍然保留；`absolute` 脱离普通流，相对于自己的 containing block 定位，项目中常见的是父 `relative`、子 `absolute`；`fixed` 也脱离普通流，通常相对于 viewport 定位，因此页面滚动后仍保持在视口固定位置。**
>
> **Sticky 比较特殊，它不脱离普通流，同时要看两个参考：第一是最近的 scrollport，它决定 Sticky“粘在哪里”，例如 `top: 0` 是相对于最近 scrollport 的顶部进行限制；第二是 Sticky 自己的 containing block，它决定 Sticky“最多能够粘多久、活动到哪里”。因此 Sticky 到达滚动阈值后会产生吸附效果，但不能无限脱离自己的包含区域，当包含区域最终滚走时 Sticky 也会一起离开。所以 Sticky 可以概括为：正常流决定它属于哪里，最近 scrollport 决定它粘在哪里，containing block 决定它能粘到什么时候。** [[1]](https://lists.w3.org/Archives/Public/public-css-archive/2018Apr/0044.html)

## 3. 参考文献

[1] [W3C 邮件列表存档](<https://lists.w3.org/Archives/Public/public-css-archive/2018Apr/0044.html>)[EB/OL].

[2] [W3C 邮件列表存档](<https://lists.w3.org/Archives/Public/public-css-archive/2022Jul/0244.html>)[EB/OL].

[3] [W3C 邮件列表存档](<https://lists.w3.org/Archives/Public/public-css-archive/2018Apr/0157.html>)[EB/OL].
