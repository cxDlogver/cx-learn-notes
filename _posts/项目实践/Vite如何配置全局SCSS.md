---
title: Vite如何配置全局SCSS?
tags: 前端项目实践
categories:
  - 项目实践
date: 2026-01-07 22:37:14
---

# Vite如何配置全局SCSS?

前端项目一旦进入多人协作阶段，样式如果没有“全局设计体系”，后期会出现：颜色不统一、组件风格割裂、暗色/主题难切换、维护成本暴涨。

这篇文章用一个**“科技蓝”风格**为例，搭建一套可扩展的全局 SCSS 体系，包括：

- 设计变量（SCSS Tokens）
- 运行时主题（CSS Variables）
- Reset 基础重置
- Vite 全局注入（组件里无需重复 import）

------

## Step 0：最终目录结构（先定工程边界）

在 `src/styles/` 下建立以下文件：

```
src/styles/
├─ index.scss                 # 全局样式入口（唯一被 main.ts 引入）
├─ reset.scss                 # 基础重置（只做“清底盘”）
├─ variables.tokens.scss      # 变量文件 1：SCSS 设计 tokens（给编译期用）
└─ variables.theme.scss       # 变量文件 2：CSS 主题变量（给运行时切换用）
```

**关键点：**

- `index.scss` 是唯一入口，所有全局样式统一从这里聚合，避免“到处引入导致依赖混乱”。
- 两套变量体系是有意义的：
  - **tokens（SCSS 变量）**：编译期，给 mixin、计算、生成样式用
  - **theme（CSS 变量）**：运行时，可实现亮/暗切换、动态换肤

------

## Step 1：安装 sass

Vite 使用 SCSS 需要 `sass`：

```
npm i -D sass
```

**关键点：**
 `sass` 是预处理器编译依赖，不是运行时依赖，所以安装到 devDependencies。

------

## Step 2：编写科技蓝 Tokens（variables.tokens.scss）

文件：`src/styles/variables.tokens.scss`

```scss
/* 编译期 Tokens：用于生成样式、mixin、计算等（不会直接输出到 CSS 变量） */

/* 品牌色（科技蓝） */
$color-brand-500: #1677ff;
$color-brand-600: #125fd6;
$color-brand-700: #0d47a1;

/* 中性色 */
$color-gray-0: #ffffff;
$color-gray-50: #f7f9fc;
$color-gray-100: #eef2f7;
$color-gray-200: #d9e2ef;
$color-gray-700: #344054;
$color-gray-900: #101828;

/* 语义色 */
$color-success: #2ecc71;
$color-warning: #f5a623;
$color-danger: #ff4d4f;

/* 尺寸与排版 */
$radius-sm: 6px;
$radius-md: 10px;
$radius-lg: 14px;

$shadow-soft: 0 10px 30px rgba(16, 24, 40, 0.08);
$shadow-glow-blue: 0 0 0 4px rgba(22, 119, 255, 0.18);

$font-family-base: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif;

$font-size-base: 14px;
$line-height-base: 1.6;

/* 动画与过渡 */
$transition-fast: 120ms ease;
$transition-base: 200ms ease;
```

**关键点：**

- Tokens 建议用“语义 + 强度”的命名（如 brand-500），便于扩展与统一。
- 不要用 `$blue` / `$darkBlue` 这种“描述颜色长相”的变量名，后期换色会很痛苦。

------

## Step 3：编写运行时主题变量（variables.theme.scss）

文件：`src/styles/variables.theme.scss`

```scss
/* 运行时主题：用 CSS Variables，便于动态切换亮/暗或多主题 */
:root {
  /* 背景与文本 */
  --bg: #0b1220;              /* 深蓝黑背景（科技感） */
  --bg-elevated: #0f1b2e;     /* 卡片/面板背景 */
  --text: #e6edf7;            /* 主文本 */
  --text-muted: rgba(230, 237, 247, 0.72);

  /* 边框与分割线 */
  --border: rgba(120, 170, 255, 0.18);

  /* 品牌（科技蓝） */
  --primary: #1677ff;
  --primary-hover: #2f88ff;
  --primary-active: #125fd6;

  /* 高亮与光晕 */
  --glow: rgba(22, 119, 255, 0.25);

  /* 状态色 */
  --success: #2ecc71;
  --warning: #f5a623;
  --danger: #ff4d4f;

  /* 圆角与阴影 */
  --radius: 12px;
  --shadow: 0 10px 30px rgba(0, 0, 0, 0.35);

  /* 字体 */
  --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* 可选：提供亮色主题（如果你未来要支持切换） */
[data-theme="light"] {
  --bg: #f6f9ff;
  --bg-elevated: #ffffff;
  --text: #0b1220;
  --text-muted: rgba(11, 18, 32, 0.65);
  --border: rgba(22, 119, 255, 0.16);
  --shadow: 0 12px 30px rgba(16, 24, 40, 0.12);
}
```

**关键点：**

- 主题变量建议用 `--bg / --text / --border / --primary` 这种“语义化”命名。
- 用 `[data-theme="light"]` 这种方式，为未来主题切换留扩展口子。

------

## Step 4：写 Reset（reset.scss）

文件：`src/styles/reset.scss`

```
/* Reset：只做“清底盘”，不做业务样式，不做组件样式 */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
}

body {
  margin: 0;
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.6;

  background: var(--bg);
  color: var(--text);

  /* 字体渲染优化 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

img,
svg,
video,
canvas {
  display: block;
  max-width: 100%;
}

button,
input,
textarea,
select {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}

a {
  color: inherit;
  text-decoration: none;
}

ul,
ol {
  padding: 0;
  margin: 0;
  list-style: none;
}

:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* 可选：滚动条（偏科技感，谨慎使用） */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-thumb {
  background: rgba(22, 119, 255, 0.22);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(22, 119, 255, 0.35);
  background-clip: padding-box;
}
```

**关键点：**

- Reset 的目标：统一浏览器默认行为，减少样式差异。
- Reset 里不要出现 `.page`、`.header` 这类业务 class，否则会污染全局。

------

## Step 5：全局样式入口（index.scss）

文件：`src/styles/index.scss`

```scss
/* 全局入口：统一组织全局样式层级 */

/* 1) 主题变量（运行时） */
@use "./variables.theme.scss";

/* 2) Reset（清底盘） */
@use "./reset.scss";

/* 3) 可选：全局基础风格（少量、谨慎） */
:root {
  color-scheme: dark;
}

/* 卡片类基础样式（如果你想要全站统一的“科技蓝卡片感”） */
.app-surface {
  background: linear-gradient(
    180deg,
    rgba(22, 119, 255, 0.10),
    rgba(22, 119, 255, 0.02)
  );
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
}
```

**关键点：**

- `index.scss` 统一入口，保证全局样式加载顺序可控。
- `.app-surface` 这种属于“通用容器风格”，可保留，但不要扩展为一堆业务类。

------

## Step 6：在 main.ts 引入一次全局样式

`src/main.ts`

```ts
import { createApp } from "vue";
import App from "./App.vue";
import "@/styles/index.scss";

createApp(App).mount("#app");
```

**关键点：**

- 全局样式只引入一次，且在应用入口引入，避免组件重复加载造成不可控。

------

## Step 7：让每个组件自动可用 SCSS Tokens（Vite 注入）

你已经有 `variables.tokens.scss` 了，但组件里如果每次都写 `@use` 会很烦。
 工程上用 Vite 的 `additionalData` 统一注入。

`vite.config.ts`

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "@/styles/variables.tokens.scss" as *;
        `,
      },
    },
  },
});
```

现在组件里可以直接写：

```scss
<style scoped lang="scss">
.panel {
  border-radius: $radius-md;
  transition: $transition-base;
}
.panel:focus-within {
  box-shadow: $shadow-glow-blue;
}
</style>
```

**关键点：**

- `additionalData` 是编译期注入，不会在运行时报错。
- 只注入 tokens（SCSS 变量），不要注入 reset/theme，避免污染组件作用域概念。

------

## Step 8：验证“科技蓝风格”是否生效（快速自检）

在 `App.vue` 写一个简单面板：

```vue
<template>
  <div style="min-height: 100vh; padding: 24px;">
    <div class="app-surface panel">
      <h2>Tech Blue Dashboard</h2>
      <p>全局主题变量 + Reset + Tokens 注入已生效。</p>
      <button class="btn">Primary Action</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.panel {
  padding: 18px;
  border-radius: $radius-lg;
}

h2 {
  margin: 0 0 10px 0;
}

.btn {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: $radius-sm;
  background: var(--primary);
  color: #fff;
  transition: $transition-fast;
}
.btn:hover {
  background: var(--primary-hover);
}
.btn:active {
  background: var(--primary-active);
}
</style>
```

**关键点：**

- 按职责：
  - `var(--primary)` 负责主题色（运行时）
  - `$radius-sm` 等负责统一设计尺度（编译期）

------

## Step 9：主题切换

如果未来要支持亮/暗，直接改根节点属性即可：

```js
document.documentElement.setAttribute("data-theme", "light");
// 恢复暗色（默认）
document.documentElement.removeAttribute("data-theme");
```

**关键点：**

- 切主题只改 DOM 属性，不需要重编译，不需要重载 CSS。

## SCSS的用法

### 【定义变量】

```scss
$radius-md: 10px;
```

- `$radius-md` **只在编译时存在**
- 编译后，浏览器根本不知道这个变量的存在

编译结果：

```scss
.panel {
  border-radius: 10px;
}
```

### 【`@use` 与命名空间】

你在项目中用的是：

```scss
@use "@/styles/variables.tokens.scss" as *;
```

这意味着：

- `@use` 是 **官方推荐**（替代老的 `@import`）
- `as *` 表示“展开为全局变量”

如果不用 `as *`：

```scss
@use "@/styles/variables.tokens.scss" as tokens;

.panel {
  border-radius: tokens.$radius-md;
}
```

**工程建议：**

- **全局注入用 `as \*`**
- 模块内部或库开发用命名空间，避免变量污染

### 【SCSS 嵌套】

```scss
.panel {
  padding: 16px;

  &:hover {
    box-shadow: $shadow-glow-blue;
  }

  .title {
    font-weight: 600;
  }
}
```

**工程铁律：**

- 嵌套不超过 **3 层**
- 禁止 `.a .b .c .d`

## CSS Variables

在前面的章节中，我们已经在项目中使用了如下代码：

```scss
:root {
  --bg: #0b1220;
  --text: #e6edf7;
  --primary: #1677ff;
}
```

并在 reset / 组件中这样使用：

```css
body {
  background: var(--bg);
  color: var(--text);
}
```

这一节，我们就来彻底讲清楚：**CSS Variables 到底解决了什么问题，以及它是如何支撑“动态主题系统”的**。

### 最直观的定义

**CSS Variables（CSS 自定义属性）** 是：

> **存在于浏览器运行时的变量，可被 CSS 和 JavaScript 同时读写。**

语法形式：

```css
:root {
  --primary: #1677ff;
}
```

使用：

```css
.button {
  background: var(--primary);
}
```

### `:root`

`:root` 是什么？

```scss
:root { ... }
```

- 表示 **文档树的根节点**
- 在 HTML 中等价于 `html`
- 但 `:root` 的 **CSS 变量优先级更高**

> 所以：**全局主题变量，统一定义在 `:root` 是最佳实践**

------

为什么不用 `body`？

```scss
body {
  --bg: #0b1220;
}
```

这种写法的问题：

- CSS 变量的作用域是“向下继承”
- `body` 的变量在某些场景（如 portal / iframe / shadow DOM）会出现边界问题

工程上统一用：

```scss
:root {
  --bg: ...;
}
```

### CSS Variables 的“作用域机制”

CSS Variables **遵循 CSS 作用域规则**。

#### 全局变量

```scss
:root {
  --primary: #1677ff;
}
```

所有子节点都能使用。

------

#### 局部覆盖

```scss
[data-theme="light"] {
  --bg: #f6f9ff;
  --text: #0b1220;
}
```

这意味着：

```
<html data-theme="light">
```

时：

- `--bg` / `--text` 会覆盖 `:root` 中的定义
- 未定义的变量仍然从 `:root` 继承

> 这就是“主题切换”的**底层原理**

### 亮 / 暗主题切换

#### 默认主题（暗色 · 科技蓝）

```scss
:root {
  --bg: #0b1220;
  --text: #e6edf7;
  --primary: #1677ff;
}
```

------

#### 亮色主题覆盖

```scss
[data-theme="light"] {
  --bg: #f6f9ff;
  --text: #0b1220;
}
```

------

#### 切换时发生了什么？

```js
document.documentElement.setAttribute("data-theme", "light");
```

浏览器执行流程：

1. DOM 属性变化
2. CSS 选择器 `[data-theme="light"]` 生效
3. 对应的 CSS Variables 被覆盖
4. 所有使用 `var(--bg)` 的地方自动更新

**没有 JS 操作样式，没有重绘逻辑，没有额外计算。**

### JS 如何操作 CSS Variables（核心 API）

#### 设置变量

```
document.documentElement.style.setProperty("--primary", "#ff4d4f");
```

------

#### 读取变量（调试或计算）

```
const value = getComputedStyle(document.documentElement)
  .getPropertyValue("--primary")
  .trim();
```

------

#### 移除变量（回退到 CSS 定义）

```
document.documentElement.style.removeProperty("--primary");
```
