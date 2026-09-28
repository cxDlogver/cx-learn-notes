# Less常用变量笔记（面试重点）

本文整理Less中变量的核心用法、常用类型、实战技巧及面试考点，详细说明变量的定义、使用场景、核心能力，配套项目实战示例和面试应答话术，便于日常开发复用样式、统一设计规范，同时应对面试考查，突出实用性和重点性。Less变量的核心价值的是“复用可变化样式值、统一设计规范、降低维护成本”，本质是用`@变量名`保存可复用的样式数据，实现一处修改、全局生效。

## Less变量核心基础

Less变量是Less预处理器最基础、最常用的功能，用于存储颜色、尺寸、间距等可复用样式值，通过`@`符号定义，使用时直接引用，核心作用是减少重复代码、统一页面样式规范，便于后期维护和主题切换。

### 基本写法

定义规则：使用`@变量名: 变量值;`格式，变量名可包含字母、数字、下划线、连字符（推荐使用连字符，如`@primary-color`），变量值支持颜色、尺寸、字符串等样式相关数据，末尾需加英文分号。

使用规则：定义后直接在样式中引用变量名，无需额外语法，Less编译时会自动将变量替换为对应的值。

```less
// 变量定义（可复用值）
@color: #409eff;       // 颜色变量
@fontSize: 14px;       // 字体尺寸变量
@padding: 12px;        // 间距变量
@border-radius: 4px;   // 尺寸变量

// 变量使用
.button {
  color: @color;                  // 引用颜色变量
  font-size: @fontSize;           // 引用字体尺寸变量
  padding: @padding;              // 引用间距变量
  border-radius: @border-radius;  // 引用尺寸变量
  border: 1px solid @color;       // 嵌套引用变量
}

// 编译后CSS（变量自动替换）
.button {
  color: #409eff;
  font-size: 14px;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #409eff;
}
```

注意事项：变量定义需在使用之前（Less变量遵循“先定义、后使用”原则）；变量名区分大小写（`@color`和`@Color`是两个不同变量）。

## 项目中最常用的变量类型

项目开发中，变量的核心作用是统一设计规范，因此通常会将高频复用、影响全局样式的数值抽转为变量，以下7类是最常用的变量类型，覆盖页面样式的核心场景。

### 颜色变量

最基础、最常用的变量类型，用于统一页面的主题色、文字色、边框色、背景色等，确保页面颜色风格统一，便于后期主题切换（如切换深色/浅色模式）。

```less
// 主题色（核心颜色，贯穿整个项目）
@primary-color: #1677ff;    // 主色调（按钮、链接、强调文字）
@success-color: #52c41a;    // 成功色（提示、操作成功状态）
@warning-color: #faad14;    // 警告色（提醒、待处理状态）
@danger-color: #ff4d4f;     // 危险色（错误、删除操作）
@info-color: #1890ff;       // 信息色（提示、说明文字）

// 文字色（层级区分，提升可读性）
@text-color: #333;          // 主文字色（正文、标题）
@text-color-secondary: #666;// 次要文字色（辅助说明、副标题）
@text-color-disabled: #999; // 禁用文字色（禁用按钮、失效内容）
@text-color-light: #ccc;    // 浅色文字色（占位提示、底部说明）

// 边框色（统一边框风格）
@border-color: #d9d9d9;     // 基础边框色
@border-color-light: #e8e8e8;// 浅色边框色（分割线、次要边框）

// 背景色（页面布局底色）
@bg-color: #f5f5f5;         // 页面基础背景色
@bg-color-white: #fff;      // 卡片、容器背景色
@bg-color-hover: #fafafa;   //  hover状态背景色
```

适用场景：

- 按钮、标签、导航等组件的颜色统一

- 页面文字层级区分（标题、正文、辅助文字）

- 卡片、弹窗、表单等容器的背景和边框颜色

- 主题切换（只需修改变量值，即可全局更新颜色风格）

### 字体变量

用于统一页面的字号、字重、行高，避免字体尺寸混乱，提升页面文字的一致性和可读性，尤其适用于多页面、多组件的大型项目。

```less
// 字号变量（按层级划分）
@font-size-xs: 12px;    // 超小字号（占位提示、标签）
@font-size-sm: 13px;    // 小字号（辅助说明、次要文字）
@font-size-base: 14px;  // 基础字号（正文、表单文字）
@font-size-lg: 16px;    // 大字号（副标题、卡片标题）
@font-size-xl: 18px;    // 超大字号（页面主标题）
@font-size-xxl: 24px;   // 特大字号（页面头部标题）

// 字重变量（统一字体粗细）
@font-weight-normal: 400; // 常规字重（正文）
@font-weight-medium: 500; // 中等字重（副标题）
@font-weight-bold: 600;   // 粗体（标题、强调文字）

// 行高变量（统一行间距，提升可读性）
@line-height-base: 1.5;   // 基础行高（正文）
@line-height-lg: 1.8;     // 大行距（标题、多文字容器）
@line-height-sm: 1.2;     // 小行距（标签、紧凑文字）
```

适用场景：

- 页面标题、正文、辅助文字的字号统一

- 按钮、标签、表单等组件的字体粗细控制

- 文本容器（如卡片、弹窗）的行间距统一，提升阅读体验

### 间距变量

用于统一页面的`margin`（外间距）和`padding`（内间距），避免间距混乱，让页面布局更规整，同时减少重复的间距数值编写。

```less
// 间距变量（按尺寸划分，推荐4px递增，符合设计规范）
@spacing-xs: 4px;    // 超小间距（组件内部细节间距）
@spacing-sm: 8px;    // 小间距（标签、按钮内部间距）
@spacing-md: 12px;   // 中等间距（表单项、卡片内边距）
@spacing-lg: 16px;   // 大间距（组件之间、卡片间距）
@spacing-xl: 24px;   // 超大间距（页面区块之间、顶部间距）
@spacing-xxl: 32px;  // 特大间距（页面顶部、底部间距）
```

适用场景：

- 卡片、弹窗、表单的内边距（padding）统一

- 表单项、按钮、标签之间的外间距（margin）统一

- 页面区块、列表项之间的间距控制

### 尺寸变量

用于统一页面组件的宽高、圆角、边框宽度等固定尺寸，确保组件尺寸一致，提升页面整体协调性，尤其适用于表单、按钮、卡片等常用组件。

```less
// 组件高度变量（常用组件统一高度）
@height-xs: 24px;    // 超小高度（小型按钮、输入框）
@height-sm: 28px;    // 小高度（普通按钮、小型输入框）
@height-base: 32px;  // 基础高度（常规按钮、输入框、下拉框）
@height-lg: 40px;    // 大高度（大型按钮、搜索框）
@height-xl: 48px;    // 超大高度（顶部导航、大型按钮）

// 圆角变量（统一圆角风格）
@border-radius-xs: 2px;   // 超小圆角（标签、小型按钮）
@border-radius-base: 4px; // 基础圆角（按钮、输入框、卡片）
@border-radius-lg: 8px;   // 大圆角（弹窗、卡片、头像）
@border-radius-full: 50%; // 圆形（头像、圆形按钮）

// 宽度变量（常用固定宽度）
@width-base: 120px;   // 基础宽度（小型输入框、下拉框）
@width-lg: 200px;     // 大宽度（常规输入框）
@width-xl: 300px;     // 超大宽度（搜索框、大型输入框）
```

适用场景：

- 按钮、输入框、下拉框等表单组件的宽高统一

- 卡片、弹窗、头像等组件的圆角统一

- 固定宽度组件（如侧边栏、搜索框）的尺寸控制

### 边框和阴影变量

用于统一页面边框的宽度、样式，以及阴影效果，避免边框和阴影风格混乱，提升页面组件的质感和一致性。

```less
// 边框变量（统一边框样式）
@border-width-base: 1px;    // 基础边框宽度
@border-width-lg: 2px;      // 粗边框宽度（强调、选中状态）
@border-style-base: solid;  // 基础边框样式（实线）
@border-style-dashed: dashed;// 虚线边框（分割线、可编辑区域）

// 组合边框变量（复用性更高）
@border-base: @border-width-base @border-style-base @border-color;
@border-light: @border-width-base @border-style-base @border-color-light;

// 阴影变量（统一阴影效果）
@box-shadow-base: 0 2px 8px rgba(0, 0, 0, 0.15); // 基础阴影（卡片、弹窗）
@box-shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.15);  // 大阴影（强调弹窗、悬浮组件）
@box-shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.1); // hover阴影（按钮、卡片悬浮）
```

适用场景：

- 表单、卡片、弹窗等组件的边框统一

- 按钮、卡片、弹窗的阴影效果统一，提升质感

- 选中、hover状态的边框和阴影样式统一

### 层级变量

主要用于管理页面组件的`z-index`值，避免层级混乱导致组件遮挡（如下拉框被弹窗遮挡、提示框被导航遮挡），统一层级规则，便于维护。

```less
// 层级变量（按组件优先级划分，数值递增）
@z-index-base: 100;        // 基础层级（普通组件、卡片）
@z-index-dropdown: 1000;   // 下拉框层级（下拉菜单、选择器）
@z-index-sticky: 1020;     // 粘性布局层级（粘性导航）
@z-index-fixed: 1030;      // 固定布局层级（固定导航、回到顶部）
@z-index-modal: 1050;      // 弹窗层级（模态框、对话框）
@z-index-tooltip: 1060;    // 提示层层级（提示框、气泡提示）
@z-index-loading: 1080;    // 加载层层级（加载动画、遮罩）
```

适用场景：

- 解决下拉框、弹窗、提示框、加载层的遮挡问题

- 统一页面组件的层级规则，便于后期调整和维护

- 区分组件的优先级（如加载层优先级最高，不被任何组件遮挡）

### 布局变量

用于控制页面整体布局的固定尺寸，如下头部高度、侧边栏宽度、内容区最大宽度等，统一页面布局结构，尤其适用于后台管理系统、固定布局的网站。

```less
// 布局变量（固定布局尺寸）
@header-height: 64px;      // 头部导航高度
@sidebar-width: 220px;     // 侧边栏宽度（收缩状态可另设变量）
@sidebar-width-collapsed: 80px; // 侧边栏收缩宽度
@content-max-width: 1200px;// 内容区最大宽度（居中布局）
@footer-height: 48px;      // 底部高度
@gutter-width: 24px;       // 栅格间距（响应式布局）
```

适用场景：

- 后台管理系统的头部、侧边栏、内容区布局

- 固定布局网站的整体结构控制

- 响应式布局的栅格间距、内容区宽度控制

### 路径变量

用于存储静态资源（图片、字体、图标等）的路径，避免在样式中重复编写冗长的资源路径，便于后期资源路径修改（如资源迁移时，只需修改变量值）。

```less
// 路径变量（静态资源路径）
@img-path: "../images";    // 图片资源路径
@font-path: "../fonts";    // 字体资源路径
@icon-path: "../icons";    // 图标资源路径

// 路径变量使用（需配合变量插值 @{}）
.logo {
  background: url("@{img-path}/logo.png"); // 图片路径引用
}

@font-face {
  font-family: "myFont";
  src: url("@{font-path}/myFont.ttf"); // 字体路径引用
}

.icon {
  background: url("@{icon-path}/home.png"); // 图标路径引用
}
```

适用场景：

- 页面背景图、图标、字体等静态资源的路径统一管理

- 资源路径修改时，无需逐个修改样式，只需修改路径变量

## Less常用变量核心能力

Less变量不仅能存储简单的样式值，还支持插值、运算、相互引用等能力，极大提升了样式的复用性和灵活性，是项目开发中提升效率的关键。

### 变量插值

核心作用：将变量值拼接到选择器、属性名、资源路径、字符串中，突破变量只能用于属性值的限制，提升变量的灵活性，语法为`@{变量名}`。

```less
// 1. 选择器插值（动态生成选择器）
@btn-name: primary;
@card-type: normal;

// 动态生成 .primary-btn 选择器
.@{btn-name}-btn {
  color: @primary-color;
  background: @bg-color-white;
}

// 动态生成 .normal-card 选择器
.@{card-type}-card {
  padding: @spacing-md;
  border: @border-base;
}

// 2. 属性名插值（动态生成属性名）
@property-name: font-size;
@prefix: border;

.heading {
  @{property-name}: @font-size-xl; // 等价于 font-size: 18px;
  @{prefix}-color: @border-color;  // 等价于 border-color: #d9d9d9;
  @{prefix}-radius: @border-radius-base; // 等价于 border-radius: 4px;
}

// 3. 路径插值（拼接资源路径，最常用）
@img-path: "../images";
.banner {
  background: url("@{img-path}/banner.png"); // 拼接路径
}

// 编译后CSS
.primary-btn {
  color: #1677ff;
  background: #fff;
}
.normal-card {
  padding: 12px;
  border: 1px solid #d9d9d9;
}
.heading {
  font-size: 18px;
  border-color: #d9d9d9;
  border-radius: 4px;
}
.banner {
  background: url("../images/banner.png");
}
```

### 变量之间可以相互引用

核心作用：一个变量可以引用另一个已定义的变量，实现变量的复用和关联，便于统一维护（如主题色衍生出其他相关颜色）。

```less
// 基础变量定义
@primary-color: #1677ff;
@border-color: #d9d9d9;
@spacing-md: 12px;

// 变量相互引用
@link-color: @primary-color; // 引用主题色作为链接色
@border-light: fade(@primary-color, 20%); // 引用主题色，配合颜色函数
@padding-lg: @spacing-md * 2; // 引用间距变量，配合运算
@btn-border: 1px solid @border-color; // 引用边框色变量

// 使用引用后的变量
a {
  color: @link-color;
}
.btn {
  padding: @padding-lg;
  border: @btn-border;
}
.card {
  border: 1px solid @border-light;
}
```

### 变量可以参与运算

核心作用：变量支持加减乘除等数学运算，可根据基础变量动态生成新的变量值，减少重复定义，适配不同尺寸需求。

注意：运算时需保证单位一致（如px与px运算），Less会自动处理单位，无需手动转换。

```less
// 基础变量
@base-size: 10px;
@spacing-md: 12px;
@width-base: 200px;

// 变量运算（加减乘除）
@font-size-sm: @base-size + 2px;  // 12px
@font-size-lg: @base-size * 1.6;  // 16px
@padding-xl: @spacing-md * 2;     // 24px
@width-lg: @width-base + 100px;   // 300px
@height-base: @base-size * 3.2;   // 32px

// 使用运算后的变量
.text-sm {
  font-size: @font-size-sm;
}
.container {
  width: @width-lg;
  padding: @padding-xl;
}
.btn {
  height: @height-base;
}
```

### 颜色函数常配合变量使用

核心作用：Less提供多种颜色处理函数，可配合颜色变量生成新的颜色（如加深、变浅、透明化），实现颜色的灵活衍生，无需手动计算颜色值。

常用颜色函数（重点记忆）：

- `lighten(color, percentage)`：将颜色变浅，percentage为百分比（如10%）

- `darken(color, percentage)`：将颜色加深，percentage为百分比

- `fade(color, percentage)`：将颜色透明化，percentage为透明度（0-100，数值越小越透明）

- `saturate(color, percentage)`：增加颜色饱和度

- `desaturate(color, percentage)`：降低颜色饱和度

```less
// 基础颜色变量
@primary-color: #1677ff;

// 配合颜色函数生成新颜色
@primary-hover: lighten(@primary-color, 10%);  // 主色变浅10%（hover状态）
@primary-active: darken(@primary-color, 10%);  // 主色加深10%（点击状态）
@primary-border: fade(@primary-color, 20%);    // 主色透明化20%（边框）
@primary-saturate: saturate(@primary-color, 20%); // 主色饱和度增加20%
@primary-desaturate: desaturate(@primary-color, 20%); // 主色饱和度降低20%

// 使用衍生颜色
.btn-primary {
  background: @primary-color;
}
.btn-primary:hover {
  background: @primary-hover;
}
.btn-primary:active {
  background: @primary-active;
}
.input-focus {
  border-color: @primary-border;
}
```

## 项目实战：Less变量文件示例

大型项目中，通常会专门创建一个`variables.less`文件，集中管理所有变量，然后在其他Less文件中通过`@import`引入，实现全局变量复用和统一维护。

### variables.less（全局变量文件）

```less
// 1. 主题色变量
@primary-color: #1677ff;
@success-color: #52c41a;
@warning-color: #faad14;
@danger-color: #ff4d4f;
@info-color: #1890ff;

// 2. 文字色变量
@text-color: #333;
@text-color-secondary: #666;
@text-color-disabled: #999;
@text-color-light: #ccc;

// 3. 背景色变量
@bg-color: #f5f5f5;
@bg-color-white: #fff;
@bg-color-hover: #fafafa;
@bg-color-dark: #f0f0f0;

// 4. 边框变量
@border-color: #d9d9d9;
@border-color-light: #e8e8e8;
@border-width-base: 1px;
@border-style-base: solid;
@border-base: @border-width-base @border-style-base @border-color;

// 5. 字体变量
@font-size-xs: 12px;
@font-size-sm: 13px;
@font-size-base: 14px;
@font-size-lg: 16px;
@font-size-xl: 18px;
@font-weight-normal: 400;
@font-weight-bold: 600;
@line-height-base: 1.5;

// 6. 间距变量
@spacing-xs: 4px;
@spacing-sm: 8px;
@spacing-md: 12px;
@spacing-lg: 16px;
@spacing-xl: 24px;

// 7. 尺寸变量
@height-base: 32px;
@height-sm: 28px;
@height-lg: 40px;
@border-radius-base: 4px;
@border-radius-lg: 8px;

// 8. 层级变量
@z-index-dropdown: 1000;
@z-index-fixed: 1030;
@z-index-modal: 1050;
@z-index-tooltip: 1060;

// 9. 布局变量
@header-height: 64px;
@sidebar-width: 220px;
@sidebar-width-collapsed: 80px;
@content-max-width: 1200px;

// 10. 路径变量
@img-path: "../images";
@font-path: "../fonts";
@icon-path: "../icons";
```

### 变量引入与使用示例

在其他Less文件（如`page.less`、`component.less`）中引入变量文件，直接使用变量：

```less
// 引入全局变量文件（路径根据实际项目调整）
@import "./variables.less";

// 页面样式使用变量
.page {
  width: 100%;
  min-height: 100vh;
  background: @bg-color;
  color: @text-color;
  padding: @spacing-lg;
}

// 卡片组件使用变量
.card {
  background: @bg-color-white;
  border: @border-base;
  border-radius: @border-radius-base;
  padding: @spacing-md;
  margin-bottom: @spacing-lg;
  box-shadow: @box-shadow-base;
}

// 按钮组件使用变量
.btn {
  height: @height-base;
  padding: 0 @spacing-md;
  border-radius: @border-radius-base;
  font-size: @font-size-base;
  font-weight: @font-weight-normal;
}

.btn-primary {
  background: @primary-color;
  color: @bg-color-white;
  border: 1px solid @primary-color;
}

.btn-primary:hover {
  background: lighten(@primary-color, 10%);
}
```

## 面试相关（直接套用）

### 面试应答话术

Less中最常用的是变量能力，核心是通过`@变量名`定义可复用的样式值，统一页面设计规范。项目中通常会将颜色、字体大小、间距、圆角、阴影、z-index、布局尺寸、静态资源路径等抽成变量，集中管理在`variables.less`文件中，便于全局复用和维护。此外，Less变量还支持插值、运算和颜色函数，不仅能减少重复代码，还能灵活衍生样式值，方便后期主题切换和样式调整，提升开发效率和代码可维护性。

### 速记笔记（快速背诵用）

```less
// Less变量核心
@变量名: 变量值; // 定义格式，先定义后使用
核心作用：复用、统一规范、降低维护成本

// 7类常用变量
1. 颜色变量：主题色、文字色、边框色、背景色
2. 字体变量：字号、字重、行高
3. 间距变量：margin、padding（按尺寸划分）
4. 尺寸变量：宽高、圆角、边框宽度
5. 边框/阴影变量：边框样式、阴影效果
6. 层级变量：z-index（按组件优先级）
7. 布局变量：头部、侧边栏、内容区尺寸
8. 路径变量：静态资源（图片、字体）路径

// 4个核心能力
变量插值：@{变量名}（拼接选择器、路径）
变量引用：变量之间相互引用
变量运算：加减乘除，单位自动适配
颜色函数：lighten/darken/fade（衍生颜色）

// 项目实战
单独创建variables.less，集中管理变量
其他文件用@import引入，全局复用
```

## 面试高频问题

### 基础问题（单个知识点考查）

- Less变量的定义格式是什么？使用时需要注意什么？

- Less变量支持哪些核心能力？请分别举例说明。

- 项目中常用的Less变量类型有哪些？颜色变量的作用是什么？

- Less变量插值的语法是什么？常用在哪些场景？请写出示例代码。

- Less中常用的颜色函数有哪些？lighten和darken函数的作用是什么？

- 为什么项目中要单独创建variables.less文件？有什么好处？

- Less变量运算需要注意什么？请写出一个运算示例。

### 综合问题（结合项目实战考查）

- 请简述项目中Less变量的使用流程，如何实现全局复用和统一维护？

- 如何通过Less变量和颜色函数，实现按钮的hover、active状态颜色切换？请写出示例代码。

- 项目中如何通过Less变量解决z-index层级混乱的问题？

- 简述Less变量在主题切换中的作用，如何通过变量实现浅色/深色模式切换？

- 请列举3个你在项目中最常用的Less变量类型，说明它们的用途和示例。
> （注：文档部分内容可能由 AI 生成）