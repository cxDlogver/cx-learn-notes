# SPA路由（history路由+hash路由）核心知识点笔记

本文基于原生JS的window.location、window.history及导航函数navigate，系统梳理SPA中history路由与hash路由的核心原理、完整流程、涉及API及使用场景，配套知识点对应问题帮助巩固理解，所有代码示例均贴合实际开发场景，严格遵循格式要求。

### 两种路由的本质区别

SPA（单页应用）中，“路由跳转”的本质并非浏览器重新请求新的HTML页面，而是通过**修改URL、监听URL变化、根据当前URL渲染对应视图**，实现页面内容的切换，核心是“无刷新页面更新视图”。两种路由的核心区别在于“URL的表现形式”和“监听URL变化的方式”，具体差异如下：

- hash路由：路由信息存储在URL的`#`后面（hash部分），URL格式如`/index.html#/home`、`/index.html#/chat`，依赖`window.location.hash`实现URL修改，通过`hashchange`事件监听变化，无需服务器额外配置。

- history路由：路由信息直接存储在URL的路径或查询参数中，URL格式如`/home`、`/chat`或`/index.html?page=chat`，依赖`window.history.pushState`/`replaceState`修改URL，通过`popstate`事件监听变化，需要服务器配合配置兜底（避免刷新404）。

#### 知识点对应问题

1.  SPA路由跳转的本质是什么？与传统多页面路由跳转有什么核心区别？

2.  hash路由和history路由的URL表现形式有什么不同？各自的核心依赖是什么？

### history路由完整流程

history路由的核心是通过`window.history`的API修改URL（不刷新页面），结合`window.location`解析当前路由，再手动渲染对应视图，完整流程分为“主动跳转”和“浏览器前进/后退跳转”两种场景，细节如下：

#### 场景1：用户主动点击按钮跳转（核心流程）

1.  用户触发交互：点击页面中的导航按钮（如“去聊天页”），绑定点击事件，触发自定义导航函数`navigate`。

```javascript
// 绑定导航按钮点击事件
const chatBtn = document.querySelector('#chat-btn');
chatBtn.addEventListener('click', () => {
  // 调用导航函数，跳转至chat页面
  navigate('chat');
});
```

2.  调用导航函数`navigate`：该函数核心做两件事——修改URL（新增历史记录）、手动触发页面渲染。

```javascript
// 自定义history路由导航函数
function navigate(page) {
  // 1. 拼接目标URL（此处用查询参数形式，也可采用路径形式如`/chat`）
  const url = `?page=${page}`;
  // 2. 新增历史记录，修改地址栏URL，不刷新页面
  window.history.pushState({ page: page }, '', url);
  // 3. 手动调用渲染函数，根据新URL更新视图（pushState不会自动触发渲染）
  renderApp();
}
```

3.  解析当前路由：渲染函数`renderApp`中，通过`window.location`读取当前URL，解析出当前需要渲染的页面。

```javascript
// 解析当前路由（从URL查询参数中获取page值）
function resolveRoute() {
  // 把当前完整URL包装成URL对象，便于结构化解析
  const url = new URL(window.location.href);
  // 读取查询参数中的page值，默认值为home（兜底）
  return url.searchParams.get('page') || 'home';
}
```

4.  渲染对应视图：根据解析出的路由（page值），渲染对应的页面内容，更新DOM。

```javascript
// 页面渲染函数
function renderApp() {
  const app = document.getElementById('app');
  const currentPage = resolveRoute();
  
  // 根据当前路由渲染不同页面
  if (currentPage === 'chat') {
    app.innerHTML = `<h1>聊天页面</h1><p>当前路由：?page=chat</p>`;
  } else if (currentPage === 'home') {
    app.innerHTML = `<h1>首页</h1><p>当前路由：?page=home</p>`;
  } else {
    // 路由不存在时，渲染404页面
    app.innerHTML = `<h1>404 页面不存在</h1>`;
  }
}
```

#### 场景2：用户点击浏览器前进/后退按钮跳转

1.  用户操作：点击浏览器的前进、后退按钮，或调用`window.history.back()`/`forward()`/`go()`方法。

2.  触发`popstate`事件：浏览器切换历史记录时，会自动触发`popstate`事件（注意：`pushState`/`replaceState`不会触发该事件）。

3.  重新渲染页面：监听`popstate`事件，在事件回调中手动调用`renderApp()`，根据切换后的URL重新解析路由、渲染视图。

```javascript
// 监听浏览器前进/后退操作，重新渲染页面
window.addEventListener('popstate', () => {
  renderApp();
});
```

#### history路由完整流程梳理

主动跳转：用户点击按钮 → 调用`navigate(page)` → `history.pushState()`修改URL（新增历史记录） → 手动调用`renderApp()` → `resolveRoute()`通过`window.location`解析路由 → 渲染对应页面 → 更新DOM。

前进/后退跳转：浏览器前进/后退 → 触发`popstate`事件 → 调用`renderApp()` → `resolveRoute()`解析当前URL → 重新渲染页面 → 更新DOM。

#### 知识点对应问题

1.  history路由中，`navigate`函数的核心作用是什么？为什么必须手动调用`renderApp()`？

2.  用户点击浏览器后退按钮时，history路由是如何感知URL变化并重新渲染页面的？

3.  `resolveRoute`函数中，`new URL(window.location.href)`的作用是什么？

### hash路由完整流程

hash路由的核心是将路由信息存储在URL的`#`后面（hash部分），通过修改`window.location.hash`改变URL，浏览器会自动触发`hashchange`事件，进而监听路由变化、渲染对应视图，同样分为“主动跳转”和“浏览器前进/后退跳转”两种场景：

#### 场景1：用户主动点击按钮跳转（核心流程）

1.  用户触发交互：点击导航按钮，绑定点击事件，触发hash版导航函数`navigateHash`。

```javascript
// 绑定导航按钮点击事件
const chatBtn = document.querySelector('#chat-btn');
chatBtn.addEventListener('click', () => {
  navigateHash('chat');
});
```

2.  调用导航函数`navigateHash`：直接修改`window.location.hash`，改变URL的hash部分，不刷新页面。

```javascript
// 自定义hash路由导航函数
function navigateHash(page) {
  // 修改URL的hash部分，格式为 #/page（规范写法，便于解析）
  window.location.hash = `/${page}`;
  // 无需手动调用渲染函数：hash变化会自动触发hashchange事件，在事件中渲染
}
```

3.  触发`hashchange`事件：`window.location.hash`修改后，浏览器会自动触发`hashchange`事件，监听该事件并执行渲染逻辑。

```javascript
// 监听hash变化，触发页面渲染
window.addEventListener('hashchange', () => {
  renderAppByHash();
});
```

4.  解析当前hash路由：通过`window.location.hash`读取hash值，处理后得到当前需要渲染的页面。

```javascript
// 解析hash路由（处理hash值，提取页面名称）
function resolveHashRoute() {
  const hash = window.location.hash;
  // 正则处理：去除开头的#和/，如 #/chat → chat，# → home（兜底）
  return hash.replace(/^#\/?/, '') || 'home';
}
```

5.  渲染对应视图：根据解析出的页面名称，渲染对应的页面内容，更新DOM。

```javascript
// hash路由页面渲染函数
function renderAppByHash() {
  const app = document.getElementById('app');
  const currentPage = resolveHashRoute();
  
  if (currentPage === 'chat') {
    app.innerHTML = `<h1>聊天页面</h1><p>当前路由：#/chat</p>`;
  } else if (currentPage === 'home') {
    app.innerHTML = `<h1>首页</h1><p>当前路由：#/home</p>`;
  } else {
    app.innerHTML = `<h1>404 页面不存在</h1>`;
  }
}
```

#### 场景2：用户点击浏览器前进/后退按钮跳转

1.  用户操作：点击浏览器前进、后退按钮，或调用`window.history.back()`/`forward()`/`go()`方法。

2.  hash值变化：浏览器切换历史记录时，URL的hash部分会随之变化。

3.  触发`hashchange`事件：hash值变化后，浏览器自动触发`hashchange`事件。

4.  重新渲染页面：在`hashchange`事件回调中，调用`renderAppByHash()`，解析新的hash值，渲染对应视图。

#### hash路由完整流程梳理

主动跳转：用户点击按钮 → 调用`navigateHash(page)` → `window.location.hash`修改（URL变化） → 触发`hashchange`事件 → 调用`renderAppByHash()` → `resolveHashRoute()`解析hash → 渲染对应页面 → 更新DOM。

前进/后退跳转：浏览器前进/后退 → hash值变化 → 触发`hashchange`事件 → 调用`renderAppByHash()` → 解析当前hash → 重新渲染页面 → 更新DOM。

#### 知识点对应问题

1.  hash路由中，修改`window.location.hash`后，为什么不需要手动调用渲染函数？

2.  `resolveHashRoute`函数中，正则`/^#\/?/`的作用是什么？请举例说明处理过程。

3.  hash路由的URL中，`#`的作用是什么？删除`#`后会影响路由功能吗？

### 涉及的API清单

history路由与hash路由的实现，核心依赖以下API，涵盖URL读取/修改、历史记录操作、事件监听三大类：

1.  URL相关API：`window.location`（含`href`、`hash`、`pathname`、`search`）

2.  历史记录相关API：`window.history`（含`pushState`、`replaceState`、`back`、`forward`、`go`）

3.  事件监听API：`popstate`事件、`hashchange`事件

4.  辅助解析API：`new URL()`、`url.searchParams.get()`

### 每个API的含义、作用和使用方法

#### 一、window.location（URL信息对象）

`window.location`是浏览器地址栏在JS中的映射对象，用于读取和修改当前页面的URL信息，核心属性如下：

##### 1. window.location.href

含义：当前页面的完整URL字符串，包含协议、域名、路径、查询参数、hash等所有信息。

作用：读取当前完整URL，或直接赋值实现页面跳转（会刷新页面）。

使用方法：

```javascript
// 读取完整URL
const fullUrl = window.location.href;
console.log(fullUrl); // 示例：https://example.com/index.html?page=chat#/detail

// 赋值实现跳转（会刷新页面，不推荐用于SPA路由）
window.location.href = 'https://example.com/index.html?page=home';
```

##### 2. window.location.hash

含义：URL中`#`后面的所有内容（含`#`），为空时返回空字符串。

作用：hash路由的核心数据来源，修改它可实现无刷新URL变化，读取它可解析当前hash路由。

使用方法：

```javascript
// 读取hash值
const hash = window.location.hash;
console.log(hash); // 示例：#/chat（URL为https://example.com/index.html#/chat）

// 修改hash值（无刷新，触发hashchange事件）
window.location.hash = '/chat'; // URL变为https://example.com/index.html#/chat
```

##### 3. window.location.pathname

含义：URL的路径部分（不含协议、域名、查询参数、hash），以`/`开头。

作用：history路由（路径型）中，用于解析当前路由路径（如`/chat`、`/home`）。

使用方法：

```javascript
// 读取路径部分
const path = window.location.pathname;
console.log(path); // 示例：/chat/detail（URL为https://example.com/chat/detail?id=1）
```

##### 4. window.location.search

含义：URL的查询参数部分（含`?`），为空时返回空字符串。

作用：history路由（查询参数型）中，用于解析当前路由的查询参数（如`?page=chat`）。

使用方法：

```javascript
// 读取查询参数部分
const search = window.location.search;
console.log(search); // 示例：?page=chat&id=1（URL为https://example.com/index.html?page=chat&id=1）
```

#### 二、window.history（浏览器历史记录对象）

`window.history`用于操作浏览器的会话历史记录栈，可实现历史记录的新增、替换、前进、后退，核心方法如下：

##### 1. window.history.pushState(state, title, url)

含义：向浏览器历史记录栈**新增**一条历史记录，同时修改地址栏URL，不刷新页面。

作用：history路由主动跳转的核心API，让SPA实现“无刷新换页”的视觉效果。

参数说明：

- state：与该历史记录绑定的状态对象（可存储路由相关信息，如页面名称、参数），可通过`history.state`读取；

- title：历史记录的标题，目前几乎所有浏览器都忽略该参数，通常传空字符串；

- url：新的URL地址，可是相对路径（如`?page=chat`）或绝对路径（如`https://example.com/chat`）。

使用方法：

```javascript
// 新增历史记录，跳转至chat页面（查询参数型）
window.history.pushState({ page: 'chat' }, '', '?page=chat');

// 新增历史记录，跳转至chat页面（路径型）
window.history.pushState({ page: 'chat', id: 1 }, '', '/chat');
```

注意：该方法不会触发`popstate`事件，也不会自动渲染页面，需手动调用渲染函数（如`renderApp()`）。

##### 2. window.history.replaceState(state, title, url)

含义：**替换**当前历史记录栈中的当前记录，修改地址栏URL，不刷新页面，不新增历史记录。

作用：修正当前URL（如路由初始化、避免重复历史记录），适合不需要“后退回当前页面”的场景。

使用方法：

```javascript
// 替换当前历史记录，初始化路由为home（避免后退到无效路由）
window.history.replaceState({ page: 'home' }, '', '?page=home');
```

与`pushState`的区别：`pushState`新增一条记录，`replaceState`覆盖当前记录，不会增加历史栈长度。

##### 3. window.history.back()

含义：回退到历史记录栈中的上一条记录，等价于浏览器的“后退”按钮。

作用：实现历史记录的回退操作，会触发`popstate`事件（history路由）或`hashchange`事件（hash路由）。

使用方法：

```javascript
// 回退到上一条历史记录
window.history.back();
```

##### 4. window.history.forward()

含义：前进到历史记录栈中的下一条记录，等价于浏览器的“前进”按钮。

作用：实现历史记录的前进操作，会触发`popstate`或`hashchange`事件。

使用方法：

```javascript
// 前进到下一条历史记录
window.history.forward();
```

##### 5. window.history.go(n)

含义：在历史记录栈中前进或后退指定步数，`n`为整数（正数前进，负数后退）。

作用：灵活控制历史记录的跳转，是`back()`和`forward()`的通用形式。

使用方法：

```javascript
window.history.go(-1); // 等价于back()，回退1步
window.history.go(1);  // 等价于forward()，前进1步
window.history.go(2);  // 前进2步
```

#### 三、事件监听API

##### 1. popstate事件

含义：当浏览器历史记录栈中的“当前活动记录”发生变化时触发。

触发场景：浏览器前进/后退按钮、`history.back()`/`forward()`/`go()`、历史记录栈长度变化（不含`pushState`/`replaceState`）。

作用：history路由中，监听用户的前进/后退操作，触发页面重新渲染。

使用方法：

```javascript
// 监听popstate事件，重新渲染页面
window.addEventListener('popstate', () => {
  renderApp();
});
```

注意：`pushState()`和`replaceState()`不会触发该事件，需手动调用渲染函数。

##### 2. hashchange事件

含义：当URL的hash部分（`#`后面的内容）发生变化时触发。

触发场景：修改`window.location.hash`、用户点击带hash的链接、浏览器前进/后退导致hash变化。

作用：hash路由中，监听路由变化，触发页面重新渲染。

使用方法：

```javascript
// 监听hashchange事件，重新渲染页面
window.addEventListener('hashchange', () => {
  renderAppByHash();
});
```

#### 四、辅助解析API

##### 1. new URL(window.location.href)

含义：将当前完整URL字符串包装成一个`URL`对象，提供结构化的URL解析方法。

作用：便捷解析URL的路径、查询参数、hash等信息，无需手动拆分字符串。

使用方法：

```javascript
// 包装当前URL为URL对象
const url = new URL(window.location.href);
console.log(url.pathname); // 解析路径：/chat/detail
console.log(url.search);   // 解析查询参数：?page=chat
console.log(url.hash);     // 解析hash：#/detail
```

##### 2. url.searchParams.get(name)

含义：通过查询参数名称，获取URL查询参数中的对应值，属于`URL`对象的方法。

作用：history路由（查询参数型）中，快速解析当前路由参数（如`page`、`id`）。

使用方法：

```javascript
const url = new URL(window.location.href);
// 获取查询参数中page的值，无值时返回null
const page = url.searchParams.get('page');
// 获取查询参数中id的值，无值时返回默认值1
const id = url.searchParams.get('id') || 1;
```

#### 知识点对应问题

1.  `window.history.pushState`和`window.history.replaceState`的核心区别是什么？分别适用于什么场景？

2.  `popstate`事件和`hashchange`事件的触发场景有哪些？两者的核心区别是什么？

3.  如何通过`window.location`和`new URL()`，解析出URL中的`page`参数和`hash`值？

### 两种方案对比

#### hash路由

优点：

1.  实现简单：无需服务器额外配置，仅通过`window.location.hash`和`hashchange`事件即可实现；

2.  兼容性好：支持所有主流浏览器，包括IE等老版本浏览器；

3.  无刷新跳转：修改hash不会触发页面刷新，符合SPA核心需求。

缺点：

1.  URL不美观：带有`#`符号，与真实页面路径差异较大，语义性差；

2.  SEO不友好：搜索引擎可能会忽略`#`后面的内容，影响页面SEO；

3.  功能限制：hash值仅能包含特定字符，无法传递复杂参数（需手动编码）。

#### history路由

优点：

1.  URL更自然：无`#`符号，与传统多页面URL格式一致，语义清晰，美观易读；

2.  SEO更友好：搜索引擎可正常抓取路由路径和参数，有利于SEO优化；

3.  功能灵活：支持路径型路由（`/chat`）和查询参数型路由（`?page=chat`），可传递复杂参数。

缺点：

1.  需服务器配置：刷新页面时，浏览器会向服务器请求当前URL，需服务器配置兜底（将所有路由请求指向同一个入口HTML），否则会返回404；

2.  实现稍复杂：需手动调用渲染函数，监听`popstate`事件，处理路由解析逻辑；

3.  兼容性稍差：不支持IE10及以下版本浏览器（`pushState`/`replaceState`不支持）。

#### 知识点对应问题

1.  为什么history路由需要服务器配置兜底？具体需要配置什么？

2.  从SEO、实现难度、兼容性三个维度，对比hash路由和history路由的差异。

3.  开发一个正式的企业级SPA，优先选择哪种路由方案？为什么？

### 两种路由的代码骨架

#### history路由代码骨架（查询参数型）

```javascript
// 获取页面容器
const app = document.getElementById('app');

// 1. 解析当前路由（从查询参数中获取page）
function resolveRoute() {
  const url = new URL(window.location.href);
  return url.searchParams.get('page') || 'home';
}

// 2. 页面渲染函数
function renderApp() {
  const currentPage = resolveRoute();
  switch (currentPage) {
    case 'chat':
      app.innerHTML = `<h1>聊天页面</h1><button id="back-btn">返回首页</button>`;
      // 绑定返回按钮事件
      document.getElementById('back-btn').addEventListener('click', () => navigate('home'));
      break;
    case 'home':
      app.innerHTML = `<h1>首页</h1><button id="chat-btn">去聊天页</button>`;
      // 绑定聊天页跳转按钮事件
      document.getElementById('chat-btn').addEventListener('click', () => navigate('chat'));
      break;
    default:
      app.innerHTML = `<h1>404 页面不存在</h1>`;
  }
}

// 3. 导航函数（主动跳转）
function navigate(page) {
  window.history.pushState({ page }, '', `?page=${page}`);
  renderApp();
}

// 4. 监听浏览器前进/后退，重新渲染
window.addEventListener('popstate', renderApp);

// 5. 初始化页面渲染
renderApp();
```

#### hash路由代码骨架

```javascript
// 获取页面容器
const app = document.getElementById('app');

// 1. 解析当前hash路由
function resolveHashRoute() {
  return window.location.hash.replace(/^#\/?/, '') || 'home';
}

// 2. 页面渲染函数
function renderAppByHash() {
  const currentPage = resolveHashRoute();
  switch (currentPage) {
    case 'chat':
      app.innerHTML = `<h1>聊天页面</h1><button id="back-btn">返回首页</button>`;
      document.getElementById('back-btn').addEventListener('click', () => navigateHash('home'));
      break;
    case 'home':
      app.innerHTML = `<h1>首页</h1><button id="chat-btn">去聊天页</button>`;
      document.getElementById('chat-btn').addEventListener('click', () => navigateHash('chat'));
      break;
    default:
      app.innerHTML = `<h1>404 页面不存在</h1>`;
  }
}

// 3. 导航函数（主动跳转）
function navigateHash(page) {
  window.location.hash = `/${page}`;
}

// 4. 监听hash变化，重新渲染
window.addEventListener('hashchange', renderAppByHash);

// 5. 初始化页面渲染
renderAppByHash();
```

### 适合面试回答的总结

SPA路由的核心本质是“无刷新修改URL、监听URL变化、渲染对应视图”，无需向服务器请求新的HTML页面，主要分为history和hash两种实现方案：

hash路由：核心依赖`window.location.hash`修改URL，通过`hashchange`事件监听路由变化，将路由信息存储在`#`后面，实现简单、无需服务器配置，但URL带`#`、SEO较差，适合小型项目或兼容性要求高的场景。

history路由：核心依赖`window.history.pushState`/`replaceState`修改URL，通过`popstate`事件监听前进/后退操作，URL与传统路径一致、语义清晰、SEO友好，但需要服务器配置兜底（避免刷新404），实现稍复杂，适合正式企业级SPA项目。

两者的共同点是“URL变化后手动渲染视图”，核心区别在于URL表现形式、监听事件和服务器依赖；实际开发中，可根据项目规模、SEO需求和兼容性要求选择对应方案，大型项目优先选择history路由。

### 核心知识点最简记忆

history路由：读（`window.location`）→ 写（`history.pushState`）→ 监听（`popstate`）→ 渲染（手动`renderApp`），需服务器兜底。

hash路由：读（`window.location.hash`）→ 写（`location.hash = ...`）→ 监听（`hashchange`）→ 渲染（自动触发`renderAppByHash`），无需服务器配置。
> （注：文档部分内容可能由 AI 生成）