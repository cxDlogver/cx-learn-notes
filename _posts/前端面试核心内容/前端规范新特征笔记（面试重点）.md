# 前端规范新特征笔记（面试重点）

本文整理前端最新规范中的核心新特征，涵盖JavaScript、CSS、HTML/浏览器API三大板块，详细说明各特征的核心作用、语法示例、适用场景，并配套面试高频问题，重点标注面试优先记忆的内容，便于快速掌握和应对面试考查。

## JavaScript 新特征

JavaScript 新增的核心方法，主要用于简化代码逻辑、提升开发效率，解决传统写法繁琐的问题，是面试中高频考查的基础新特性。

### Object.groupBy()

核心作用：将数组按指定条件分组，返回一个对象，对象的键是分组依据，值是对应分组的数组。相比传统的`reduce`手写分组，语法更简洁、逻辑更直接，无需手动初始化累加器。

语法：`Object.groupBy(array, callback(element, index, array))`

回调函数返回值：作为分组的键（key），决定当前元素归属哪个分组。

```javascript
// 示例1：按数组元素的类型分组
const arr = [1, 'a', 2, 'b', 3, true];
const grouped = Object.groupBy(arr, (item) => typeof item);
console.log(grouped);
// 输出：
// {
//   number: [1, 2, 3],
//   string: ['a', 'b'],
//   boolean: [true]
// }

// 示例2：按数字奇偶性分组
const nums = [1, 2, 3, 4, 5, 6];
const oddEvenGroup = Object.groupBy(nums, (num) => num % 2 === 0 ? 'even' : 'odd');
console.log(oddEvenGroup);
// 输出：{ odd: [1, 3, 5], even: [2, 4, 6] }
```

适用场景：数组分组场景（如数据筛选、分类展示、统计分析），替代传统`reduce`手写分组，简化代码。

### Map.groupBy()

核心作用：与`Object.groupBy()`功能类似，均用于数组分组，但分组的键（key）支持更灵活的类型（如对象、Symbol、函数等），而`Object.groupBy()`的key只能是字符串或Symbol。

语法：`Map.groupBy(array, callback(element, index, array))`

区别：返回值是`Map`对象（而非普通对象），Map的key可任意类型，更适合需要非字符串key的分组场景。

```javascript
// 示例：按对象作为key分组
const users = [
  { name: 'tom', age: 20, gender: 'male' },
  { name: 'lucy', age: 18, gender: 'female' },
  { name: 'jack', age: 22, gender: 'male' }
];
// 以gender对应的对象作为分组key
const genderKey1 = { key: 'male' };
const genderKey2 = { key: 'female' };
const groupedMap = Map.groupBy(users, (user) => {
  return user.gender === 'male' ? genderKey1 : genderKey2;
});
console.log(groupedMap.get(genderKey1)); // 输出：[{name: 'tom', ...}, {name: 'jack', ...}]
console.log(groupedMap.get(genderKey2)); // 输出：[{name: 'lucy', ...}]
```

适用场景：需要灵活分组key的场景（如key为对象、Symbol），解决`Object.groupBy()`key类型受限的问题。

### Promise.withResolvers()

核心作用：直接获取`promise`实例、`resolve`方法和`reject`方法，无需手动封装Promise构造函数，简化异步桥接代码（如回调函数转Promise、异步逻辑封装）。

语法：`const { promise, resolve, reject } = Promise.withResolvers()`

传统写法对比：无需再写`new Promise((resolve, reject) => { ... })`，直接解构获取三个核心对象/方法。

```javascript
// 新写法：使用Promise.withResolvers()
function fetchData() {
  const { promise, resolve, reject } = Promise.withResolvers();
  // 模拟异步请求
  setTimeout(() => {
    const data = { code: 200, msg: 'success' };
    if (data.code === 200) {
      resolve(data); // 成功回调
    } else {
      reject(new Error('请求失败')); // 失败回调
    }
  }, 1000);
  return promise;
}
// 调用
fetchData().then(res => console.log(res)).catch(err => console.error(err));

// 传统写法（对比）
function fetchDataOld() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const data = { code: 200, msg: 'success' };
      data.code === 200 ? resolve(data) : reject(new Error('请求失败'));
    }, 1000);
  });
}
```

适用场景：异步桥接（如回调转Promise）、自定义异步逻辑封装、简化Promise创建流程，提升代码可读性。

JavaScript新特征对应问题：

- Object.groupBy()的核心作用是什么？与手写reduce分组相比有什么优势？

- Object.groupBy()和Map.groupBy()的核心区别是什么？各自的适用场景是什么？

- Promise.withResolvers()的作用是什么？它解决了传统Promise写法的什么问题？请写出示例代码。

## CSS 新特征

CSS新增的核心规范，主要用于简化样式编写、解决传统CSS的痛点（如无原生嵌套、样式污染），提升样式开发效率和可维护性，是前端样式面试的高频考点。

### CSS Nesting（原生CSS嵌套）

核心作用：支持CSS选择器嵌套编写，无需依赖Sass、Less等预处理器，直接在父选择器内部编写子选择器样式，简化样式结构，提升代码可读性和可维护性。

语法规则：父选择器后加`{}`，子选择器、伪类、伪元素直接写在内部，可多层嵌套；嵌套时可使用&指代父选择器。

```css
/* 原生CSS嵌套写法 */
.nav {
  width: 100%;
  height: 60px;
  background: #fff;
  
  /* 子选择器嵌套 */
  .nav-item {
    float: left;
    line-height: 60px;
    padding: 0 20px;
    
    /* 伪类嵌套（&指代父选择器.nav-item） */
    &:hover {
      color: #1890ff;
      background: #f5f5f5;
    }
    
    /* 伪元素嵌套 */
    &::after {
      content: '';
      display: inline-block;
      width: 1px;
      height: 16px;
      background: #eee;
      margin-left: 20px;
    }
  }
  
  /* 媒体查询嵌套 */
  @media (max-width: 768px) {
    height: 50px;
    .nav-item {
      padding: 0 15px;
    }
  }
}

/* 传统写法（对比，无嵌套） */
.nav {
  width: 100%;
  height: 60px;
  background: #fff;
}
.nav .nav-item {
  float: left;
  line-height: 60px;
  padding: 0 20px;
}
.nav .nav-item:hover {
  color: #1890ff;
  background: #f5f5f5;
}
@media (max-width: 768px) {
  .nav {
    height: 50px;
  }
  .nav .nav-item {
    padding: 0 15px;
  }
}
```

适用场景：所有需要编写嵌套样式的场景，替代CSS预处理器的嵌套功能，减少依赖，简化样式开发流程。

### :has() 关系选择器

核心作用：CSS关系选择器，常被称为“父选择器”（实际可匹配更广泛的关系），能够根据元素的子元素、后代元素的状态或存在性，来修改当前元素的样式，解决传统CSS无法“反向选择”的痛点。

语法：`selector:has(selector)`，表示“匹配包含指定子/后代选择器所匹配元素的当前元素”。

```css
/* 示例1：根据子元素状态修改父元素样式（父选择器效果） */
/* 当输入框聚焦时，修改父容器的边框颜色 */
.input-container:has(input:focus) {
  border: 2px solid #1890ff;
  box-shadow: 0 0 4px rgba(24, 144, 255, 0.3);
}

/* 示例2：根据后代元素存在性修改当前元素样式 */
/* 当列表包含.active类的li时，修改列表的背景色 */
.list:has(.active) {
  background: #f5f5f5;
}

/* 示例3：多条件匹配 */
/* 匹配包含input且input有value的容器 */
.container:has(input) :has(input[value]) {
  padding: 10px;
}
```

适用场景：需要根据子元素状态/存在性修改父元素样式的场景（如输入框聚焦时修改父容器样式、列表有激活项时修改列表样式），无需通过JavaScript控制样式。

### @scope 样式作用域

核心作用：限制CSS样式的作用范围，将样式约束在指定的选择器范围内，避免样式全局污染，替代传统的BEM命名规范、CSS Modules等方案，原生实现样式隔离。

语法：`@scope 选择器 { ... }`，样式仅作用于指定选择器内部的元素，不影响外部元素。

```css
/* 定义scope，样式仅作用于.modal内部 */
@scope .modal {
  h2 {
    font-size: 18px;
    color: #333;
  }
  .content {
    padding: 20px;
    line-height: 1.5;
  }
  button {
    padding: 8px 16px;
    background: #1890ff;
    color: #fff;
    border: none;
  }
}

/* 外部的h2、button不受上述样式影响 */
h2 {
  font-size: 24px;
  color: #666;
}
button {
  padding: 6px 12px;
  background: #fff;
  color: #333;
  border: 1px solid #eee;
}
```

适用场景：组件化开发、页面模块样式隔离，避免不同模块、组件之间的样式冲突，简化样式管理。

### Scroll-driven Animations（滚动驱动动画）

核心作用：根据页面滚动进度驱动动画执行，无需通过JavaScript监听滚动事件，原生实现滚动触发的动画效果（如元素滚动入场、进度条动画、滚动时元素缩放/平移）。

核心语法：通过`animation-timeline`指定动画的时间线为滚动进度，配合`animation-range`指定动画触发的滚动范围。

```css
/* 示例：滚动时元素从透明变为不透明，从下方平移入场 */
.scroll-animate {
  opacity: 0;
  transform: translateY(50px);
  /* 指定动画时间线为页面滚动（视口滚动） */
  animation-timeline: scroll(root);
  /* 指定动画触发范围：滚动到视口20%时开始，50%时结束 */
  animation-range: entry 20% cover 50%;
  /* 动画效果：2秒过渡，线性变化 */
  animation: fadeInUp 2s linear forwards;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 示例2：滚动进度条 */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: #1890ff;
  /* 时间线为视口滚动 */
  animation-timeline: scroll(root);
  /* 动画范围：从滚动开始到滚动结束 */
  animation-range: 0 100vh;
  /* 宽度从0变为100% */
  animation: progress 1s linear forwards;
}

@keyframes progress {
  to {
    width: 100%;
  }
}
```

适用场景：滚动入场动画、滚动进度指示、滚动时元素状态变化（如导航栏背景切换），减少JavaScript代码，提升动画性能。

CSS新特征对应问题：

- CSS Nesting的核心作用是什么？如何使用原生CSS实现嵌套？&符号的作用是什么？

- :has()选择器的作用是什么？为什么被称为“父选择器”？请写出一个实际应用示例。

- @scope的核心作用是什么？它如何解决CSS样式全局污染的问题？

- Scroll-driven Animations是什么？如何通过原生CSS实现滚动驱动的动画？

## HTML / 浏览器 API 新特征

HTML和浏览器新增的原生API，主要用于简化常用功能的开发（如弹出层、模块路径映射、视图切换动画），减少第三方库依赖，提升开发效率和页面性能。

### popover 原生弹出层

核心作用：浏览器原生的弹出层能力，无需依赖第三方库（如Element UI、Ant Design），即可快速实现菜单、提示层、弹窗等弹出效果，MDN标注为Baseline 2024，兼容性良好。

核心用法：给弹出层元素添加`popover`属性，给触发元素添加`popovertarget`属性，关联弹出层ID，即可实现点击触发弹出/关闭。

```html
<!-- HTML结构 --><!-- 触发按钮：popovertarget关联弹出层ID -->
<!-- 弹出层：添加popover属性，指定ID -->
首页我的设置退出<!-- CSS 简单样式 -->

```

关键特性：点击触发元素可切换弹出/关闭，点击弹出层外部自动关闭，支持原生聚焦管理，无需手动编写关闭逻辑。

适用场景：菜单、提示层、弹窗、下拉框等弹出类组件，替代第三方弹出层库，简化开发。

### inert 属性

核心作用：让指定区域及其所有子元素整体不可交互（无法点击、无法聚焦、无法选中），且不响应键盘事件，常用于弹窗显示时，禁用背景区域的交互，提升用户体验。

语法：给元素添加`inert`属性（布尔属性，无需赋值），即可禁用该区域的所有交互。

```html
<!-- HTML结构 -->
<!-- 背景内容：添加inert后，弹窗显示时不可交互 -->
首页内容这是背景内容，弹窗显示时无法点击、无法聚焦。<!-- 弹窗：可正常交互 -->
弹窗标题弹窗内容<!-- JavaScript：控制inert属性的添加/移除 -->

```

适用场景：弹窗、抽屉、侧边栏等组件，需要禁用背景区域交互时，替代传统的“遮罩层+事件阻止”方案，简化代码。

### Import Maps 原生模块路径映射

核心作用：浏览器原生支持的模块路径映射，无需使用构建工具（如Webpack、Vite），即可简化ES模块的导入路径，解决模块导入时路径过长、路径繁琐的问题。

语法：在HTML中添加`<script type="importmap">`标签，定义模块别名和路径映射关系。

```html
<!-- HTML中定义Import Maps -->
<!-- 导入模块时，直接使用别名 -->

```

适用场景：原生ES模块开发，无需构建工具，简化模块导入路径，提升代码可读性和可维护性。

### View Transition API 视图切换动画

核心作用：浏览器原生的视图切换动画API，支持页面内视图切换、SPA（单页应用）路由切换、MPA（多页应用）页面切换时的过渡动画，无需手动编写复杂的动画逻辑，提升页面切换体验。

核心用法：通过`document.startViewTransition(callback)`方法，包裹视图切换的逻辑，浏览器会自动生成过渡动画。

```javascript
// 示例1：页面内视图切换动画
const btn = document.querySelector('#switchView');
const view1 = document.querySelector('#view1');
const view2 = document.querySelector('#view2');

btn.addEventListener('click', () => {
  // 启动视图切换动画，包裹视图切换逻辑
  document.startViewTransition(() => {
    // 切换视图显示/隐藏
    view1.classList.toggle('hidden');
    view2.classList.toggle('hidden');
    // 可同时修改其他样式（如布局、颜色），都会被纳入动画
    document.body.style.backgroundColor = view1.classList.contains('hidden') ? '#f5f5f5' : '#fff';
  });
});

// CSS 配合（可选，可自定义动画效果）

// 示例2：SPA路由切换动画（配合React/Vue路由）
// Vue示例（简化）
router.beforeEach((to, from, next) => {
  document.startViewTransition(() => {
    next();
  });
});
```

适用场景：SPA路由切换、MPA页面切换、页面内视图切换（如标签页切换），简化动画开发，提升用户体验。

HTML/浏览器API新特征对应问题：

- popover属性的作用是什么？如何使用原生popover实现弹出菜单？

- inert属性的核心作用是什么？常用于什么场景？

- Import Maps的作用是什么？如何通过它简化ES模块的导入路径？

- View Transition API的作用是什么？SPA和MPA中如何使用它实现视图切换动画？

## 面试优先记忆的6个核心新特征

以下6个新特征是面试中最常考查、日常开发中最常用的，优先记忆核心作用和基础用法，可快速应对面试提问：

### 1. Object.groupBy()

核心：数组分组，替代reduce，语法更简洁，返回普通对象（key为字符串/Symbol）。

### 2. Promise.withResolvers()

核心：直接获取promise、resolve、reject，简化异步桥接代码，无需手动封装Promise。

### 3. CSS Nesting

核心：原生CSS嵌套，无需预处理器，用&指代父选择器，简化样式结构。

### 4. :has() 选择器

核心：关系选择器，可根据子元素状态修改父元素样式，解决传统CSS反向选择痛点。

### 5. popover

核心：原生弹出层，无需第三方库，点击触发、自动关闭，适用于菜单、弹窗。

### 6. View Transition API

核心：原生视图切换动画，支持SPA/MPA，简化页面切换动画开发。

## 综合面试问题

- 列举3个JavaScript新特征，并说明各自的核心作用和适用场景。

- CSS Nesting和Sass嵌套有什么区别？为什么推荐使用原生CSS嵌套？

- 前端开发中，哪些新特征可以替代第三方库？请举例说明（至少2个）。

- 简述你对View Transition API的理解，它在SPA开发中有什么优势？

- Object.groupBy()和Map.groupBy()的区别是什么？什么时候选择使用Map.groupBy()？
> （注：文档部分内容可能由 AI 生成）