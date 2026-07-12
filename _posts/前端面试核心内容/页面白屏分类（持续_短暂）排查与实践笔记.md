# 页面白屏分类（持续/短暂）排查与实践笔记

**一句话结论**：持续白屏通常说明页面已进入“异常状态”，核心是渲染流程未启动（如资源加载失败、JS报错、挂载失败等）；短暂白屏说明页面最终能正常渲染，但存在“渲染空档”（如路由切换、异步加载无承接等）。实践中排查需按“网络→资源→JS错误→框架挂载→路由切换→接口数据→渲染时机”的顺序，精准定位问题并处理。

### 持续白屏：现象、原因分类及排查

#### 现象理解

持续白屏的核心特征的是页面无法正常进入可渲染状态，具体表现为：

- 页面打开后一直空白，仅显示纯背景色，无任何业务内容；

- 刷新页面后问题不一定恢复，异常具有持续性；

- 浏览器控制台（Console）、网络面板（Network）中通常能找到明确的异常信息（如报错、资源404等）。

本质：页面初始化、资源加载、框架挂载等关键环节出现异常，导致渲染流程彻底中断。

**对应问题**：持续白屏的核心特征是什么？其本质是什么？

#### 常见原因分类（含现象、排查及实践细节）

##### 原因一：核心资源加载失败

核心资源（HTML、JS、CSS）未成功加载，导致页面无内容可渲染，是持续白屏最基础的原因。

常见场景：

- index.html 未正常返回（如服务器报错、路由配置错误）；

- 主bundle文件（main.js、vendor.js）加载失败（404、403、500错误）；

- 静态资源路径配置错误（如本地路径与线上路径不一致）；

- CDN失效，导致依赖CDN的资源无法加载；

- 发布后HTML引用旧hash值，对应的JS/CSS文件已被删除；

- MIME type配置错误，浏览器拒绝执行脚本（如JS文件被识别为文本文件）。

典型现象：

Network面板中可见对应资源加载失败，控制台会出现以下报错：

- net::ERR_ABORTED（资源加载被中断）；

- Failed to load module script（模块脚本加载失败）；

- Refused to execute script（浏览器拒绝执行脚本）。

排查重点与实践代码：

重点查看DevTools的Network（过滤Doc、JS、CSS）和Console面板，同时可通过代码监听资源加载失败事件，精准捕捉异常资源：

```javascript
<script>
  // 捕获阶段监听资源加载错误，可精准捕捉静态资源（JS、CSS、图片等）加载失败
  window.addEventListener(
    'error',
    function (e) {
      const target = e.target;
      // 筛选出有src或href的资源（排除非资源类错误）
      if (target && (target.src || target.href)) {
        console.log('资源加载失败:', target.src || target.href);
        // 实际项目中可将错误上报至监控平台
      }
    },
    true // 第三个参数true：捕获阶段监听，避免冒泡导致遗漏
  );
</script>
```

**对应问题**：核心资源加载失败的常见场景有哪些？如何通过代码监听资源加载失败事件？

##### 原因二：JS运行时报错，应用未启动成功

这是持续白屏最常见的原因，JS报错发生在应用初始化、挂载前，导致整个渲染流程中断。

常见场景：

- 入口文件（如main.js、main.ts）执行时报错；

- 框架初始化函数（render、createApp、ReactDOM.createRoot）执行前出现异常；

- 全局配置项为空（如window.__APP_CONFIG__未定义），访问其属性时报错；

- 访问undefined或null的属性（如undefined.xxx、null.xxx）；

- 运行环境变量缺失（如process.env相关变量未配置）；

- Chunk加载失败（ChunkLoadError）。

典型现象：

Console面板会出现明确的运行时错误，常见报错信息：

- Uncaught TypeError（类型错误）；

- Cannot read properties of undefined (reading 'xxx')（访问undefined属性）；

- xxx is not defined（变量未定义）；

- Unexpected token（语法错误，如括号不匹配、关键字错误）；

- ChunkLoadError: Loading chunk xxx failed（chunk加载失败）。

典型示例：

```javascript
// 若window.__APP_CONFIG__未定义，以下代码会直接报错，导致应用无法启动
const appConfig = window.__APP_CONFIG__;
console.log(appConfig.apiBaseUrl); // Uncaught TypeError: Cannot read properties of undefined
```

实践排查方式：

在应用入口处添加日志和try-catch，定位初始化过程中的错误：

```javascript
console.log('应用入口开始执行'); // 日志1：确认入口是否执行

try {
  // 应用初始化逻辑（如框架创建、路由初始化等）
  bootstrapApp();
  console.log('bootstrapApp 执行完成'); // 日志2：确认初始化是否成功
} catch (err) {
  console.error('应用启动失败:', err); // 捕获初始化过程中的错误
}
```

排查判断：

- 若日志1未打印：说明脚本未加载成功（需回头查资源加载问题）；

- 若日志1打印、日志2未打印：说明初始化过程中报错（查看catch捕获的错误信息）。

**对应问题**：JS运行时报错导致持续白屏的常见场景有哪些？如何通过日志和try-catch定位报错位置？

##### 原因三：前端框架挂载失败

Vue、React等前端框架挂载过程中出现异常，导致页面无法渲染，常见于根节点缺失或挂载逻辑报错。

Vue示例（挂载失败场景）：

```javascript
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.mount('#app'); // 若页面中无id为app的节点，挂载失败
```

失败原因：页面中未存在<div id="app"></div>根节点，或App.vue组件初始化时报错。

React示例（挂载失败场景）：

```javascript
import ReactDOM from 'react-dom/client';
import App from './App';

// 若页面中无id为root的节点，getElementById('root')返回null，挂载失败
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

排查要点：

直接在入口文件中打印根节点，确认根节点是否存在：

```javascript
// Vue项目
console.log('Vue根节点:', document.getElementById('app'));

// React项目
console.log('React根节点:', document.getElementById('root'));
```

若打印结果为null，说明根节点缺失；若根节点存在仍挂载失败，需排查组件初始化逻辑（如App组件报错）。

**对应问题**：Vue和React框架挂载失败的常见原因是什么？如何排查挂载失败问题？

##### 原因四：路由逻辑异常，页面卡死

SPA项目中，路由守卫逻辑异常、无限重定向等问题，导致页面卡在空状态，无法进入目标页面。

常见场景：

- 路由守卫（beforeEach、beforeEnter）中未调用next()，导致路由切换流程中断；

- 路由无限重定向（如A→B→A循环）；

- 权限判断逻辑卡死（如死循环、异步权限请求未处理）；

- 动态路由未注册成功，无法匹配目标页面；

- 懒加载组件失败后无兜底逻辑。

Vue Router典型问题示例：

```javascript
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');

  if (to.meta.requiresAuth && !token) {
    next('/login');
    return;
  }

  // 遗漏next()，路由切换流程中断，页面卡死在白屏状态
});
```

排查方式：

在路由守卫中添加日志，跟踪路由切换流程：

```javascript
router.beforeEach((to, from, next) => {
  console.log('beforeEach:', from.fullPath, '->', to.fullPath);
  next(); // 确保调用next()，放行路由
});

router.afterEach((to, from) => {
  console.log('afterEach:', from.fullPath, '->', to.fullPath);
});
```

排查判断：若只打印beforeEach日志，未打印afterEach日志，说明路由切换流程异常（如未调用next()、无限重定向）。

**对应问题**：路由逻辑异常导致持续白屏的常见场景有哪些？如何通过日志排查路由切换异常？

##### 原因五：首屏渲染强依赖接口，接口异常无兜底

页面首屏渲染完全依赖接口数据，当接口阻塞、报错、超时，且无兜底UI时，页面会返回null，呈现持续白屏。

反面示例（无兜底逻辑）：

```javascript
// 组件渲染逻辑，无数据时直接返回null，导致白屏
function MainPage({ data }) {
  if (!data) return null; // 接口异常时，页面无任何内容
  return <div>{data.content}</div>;
}
```

更合理的写法（添加兜底UI）：

```javascript
function MainPage({ data, loading, error }) {
  if (loading) return <Skeleton />; // 加载中：骨架屏
  if (error) return <ErrorPage retry={fetchData} />; // 报错：错误页（可重试）
  if (!data) return <Empty />; // 无数据：空状态页
  return <div>{data.content}</div>; // 正常渲染
}
```

实践排查：

查看Network面板中首屏核心接口，重点关注：

- 接口是否长时间pending（无响应）；

- 接口是否返回401（未授权）、403（禁止访问）、500（服务器错误）；

- 接口是否存在跨域失败（Console中出现CORS报错）；

- 接口是否被拦截（如网关拦截、前端拦截器异常）。

**对应问题**：首屏强依赖接口导致持续白屏的核心原因是什么？如何通过兜底UI避免此类问题？

##### 原因六：构建部署问题

本地开发正常，线上部署后出现持续白屏，多为构建配置或部署流程异常导致。

常见场景：

- 资源base路径配置错误（如Vite/Webpack的publicPath/base配置错误）；

- Nginx静态目录配置与构建产物路径未对齐；

- SPA history路由刷新404（Nginx未配置history模式兜底）；

- 环境变量配置错误（如线上环境变量指向本地接口）；

- 发版流程异常（如只发布HTML文件，未发布对应JS/CSS静态资源）。

典型示例（Vite配置错误）：

```javascript
// vite.config.js 配置错误的base路径
export default defineConfig({
  base: '/wrong-path/', // 实际线上路径为/，导致资源引用路径错误
});
```

排查方式：

- 查看页面Source面板，确认资源引用URL是否正确；

- 校验构建配置文件（vite.config.js、webpack.config.js）中的publicPath/base配置；

- 检查Nginx配置，确认静态资源目录和history路由兜底配置。

**对应问题**：构建部署过程中，导致持续白屏的常见配置问题有哪些？如何排查此类问题？

### 短暂白屏：现象、原因分类及排查

#### 现象理解

短暂白屏的核心特征是页面最终能正常渲染，但渲染过程中存在“空档期”，用户会明显感知“闪一下白”，具体表现为：

- 页面加载完成后能正常显示内容，但中间会出现短暂空白；

- SPA路由切换时，空白现象尤为明显；

- 首屏加载时，先白屏一段时间，再逐步渲染内容；

- 无明显报错，Console和Network面板无异常，仅存在渲染时序问题。

本质：页面渲染流程正常，但某个阶段缺少视觉承接层，导致“加载空档”被用户感知。

**对应问题**：短暂白屏的核心特征是什么？其本质与持续白屏有何区别？

#### 常见原因分类（含现象、排查及实践细节）

##### 原因一：SPA路由切换，旧页面卸载早于新页面渲染

这是短暂白屏最典型的原因，路由切换时，旧页面组件先被销毁，新页面组件（尤其是异步组件）尚未渲染完成，中间出现空白。

常见场景：

- 点击路由跳转后，旧页面组件立即卸载；

- 新路由组件为异步加载（如Vue的懒加载、React的React.lazy），加载耗时较长；

- 新页面首屏数据未提前请求，需等待接口返回后再渲染；

- 路由切换时无骨架屏、占位UI等承接层。

示例（Vue异步路由）：

```javascript
// 异步加载路由组件，加载慢时会出现短暂白屏
const UserPage = () => import('./UserPage.vue');
```

实践解决思路（Vue示例）：

使用Suspense组件+骨架屏，为路由切换添加视觉承接层：

```vue
<template>
  <router-view v-slot="{ Component }">
    <Suspense>
      &lt;component :is="Component" /&gt; <!-- 新页面组件 -->
      &lt;template #fallback&gt;
        &lt;PageSkeleton /&gt; <!-- 路由切换空档期，显示骨架屏 -->
      </template>
    </Suspense>
  </router-view>
</template>
```

核心作用：即使新组件未加载完成，也会显示骨架屏，避免纯白屏，提升用户体验。

**对应问题**：SPA路由切换导致短暂白屏的核心原因是什么？如何通过Vue的Suspense组件解决？

##### 原因二：异步组件/懒加载chunk加载慢

首屏或大模块拆包后，异步组件、懒加载chunk体积过大，或网络环境较差，导致加载耗时较长，出现短暂白屏。

常见场景：

- chunk体积过大（未做代码分割、未压缩）；

- 网络环境差（如3G/4G网络），资源加载速度慢；

- CDN节点延迟高，chunk加载耗时久；

- 浏览器缓存未命中，需重新下载chunk。

排查方式：

在Network面板中过滤JS文件，查看异步chunk（如chunk-xxx.js）的加载耗时，重点关注Size（体积）和Time（加载时间）。

实践监控代码（监听chunk加载异常）：

```javascript
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  // 捕捉chunk加载失败异常
  if (msg.includes('Loading chunk') || msg.includes('ChunkLoadError')) {
    console.error('Chunk 加载异常:', msg);
    // 实际项目中可上报异常，触发重试逻辑
  }
});
```

**对应问题**：异步组件/懒加载chunk加载慢导致短暂白屏的常见原因有哪些？如何监控chunk加载异常？

##### 原因三：CSS未及时到位，导致内容不可见

CSS文件加载慢、关键CSS未内联，导致HTML加载完成后，内容因缺少样式而不可见，或布局闪烁，看起来像短暂白屏。

常见场景：

- CSS文件体积过大，加载耗时久；

- 关键CSS未内联，需等待外部CSS加载完成后才渲染内容；

- 页面默认背景为白色，内容依赖CSS才显示（如display: none默认隐藏，加载CSS后显示）；

- 字体加载慢，导致文本闪烁，视觉上类似白屏。

典型现象：

HTML快速加载完成，但页面在CSS加载到位前，呈现空白或布局混乱，CSS加载完成后瞬间恢复正常。

排查方式：

- 查看Network面板，确认CSS文件的加载耗时，是否存在阻塞渲染；

- 查看Performance面板，分析render、paint阶段的时序，确认CSS加载与渲染的关系。

优化思路：

- 提取关键CSS，内联到HTML头部（减少CSS加载阻塞）；

- 压缩CSS文件，减少体积，提升加载速度；

- 避免首屏重要内容依赖过晚加载的样式（如关键内容样式内联）。

**对应问题**：CSS未及时到位导致短暂白屏的常见场景有哪些？如何优化CSS加载，避免此类问题？

##### 原因四：首屏数据请求串行，渲染被延后

首屏渲染依赖多个接口，若接口请求采用串行方式，整个请求链路耗时过长，中间无占位UI，导致短暂白屏。

反面示例（串行请求）：

```javascript
// 串行请求，需等待前一个接口完成，才能发起下一个接口
async function initPage() {
  const user = await getUser(); // 接口1：获取用户信息
  const permission = await getPermission(); // 接口2：获取权限
  const menu = await getMenu(); // 接口3：获取菜单
  const data = await getPageData(); // 接口4：获取首屏数据

  renderPage({ user, permission, menu, data }); // 所有接口完成后才渲染
}
```

问题：四个接口串行执行，总耗时为四个接口耗时之和，若某一个接口耗时久，会显著延长白屏时间。

优化思路（并行请求）：

```javascript
// 并行请求，多个接口同时发起，总耗时为耗时最长的接口时间
async function initPage() {
  const [user, permission, menu, data] = await Promise.all([
    getUser(),
    getPermission(),
    getMenu(),
    getPageData(),
  ]);

  renderPage({ user, permission, menu, data });
}
```

补充优化：配合骨架屏、占位UI，即使接口未完成，也能显示页面框架，减少白屏感知。

**对应问题**：首屏数据请求串行为什么会导致短暂白屏？如何通过并行请求优化？

##### 原因五：重渲染时无视觉承接，旧内容清空早于新内容准备

组件重渲染时，旧内容被提前清空，而新内容尚未准备完成，中间出现短暂空白，常见于loading态处理不当。

反面示例（无承接逻辑）：

```javascript
// loading切换时，直接返回null，导致页面空白
function Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  return loading ? null : <PageContent data={data} />; // 错误写法
}
```

更合理的写法（添加承接层）：

```javascript
function Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  return loading ? <PageSkeleton /> : <PageContent data={data} />; // 正确写法
}
```

本质：不是加载速度慢，而是加载期间缺少视觉承接，导致用户感知到空白。

**对应问题**：重渲染时导致短暂白屏的核心原因是什么？如何通过视觉承接层避免？

##### 原因六：首屏图片/大资源主导视觉，无占位

首屏视觉主要由图片（如banner图）占据，图片加载完成前，容器无固定高度、无占位背景，视觉上呈现大片空白，类似短暂白屏。

常见场景：

- 官网首屏banner图体积大，加载耗时久；

- 图片容器无固定高度，图片未加载时，容器高度为0，呈现空白；

- 未设置图片占位背景，图片加载期间为纯白。

优化做法（CSS+占位）：

```css
/* 给banner图容器设置固定高度和占位背景，避免空白 */
.hero-banner {
  min-height: 420px; /* 固定高度，与图片高度一致 */
  background: #f5f5f5; /* 占位背景，与页面风格匹配 */
  background-size: cover;
  background-position: center;
}

/* 图片加载完成后，覆盖占位背景 */
.hero-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

**对应问题**：首屏图片主导视觉导致短暂白屏的原因是什么？如何通过CSS设置占位，优化用户体验？

### 实践中白屏排查流程（面试重点）

排查核心：先区分白屏类型，再按“从易到难、从表面到深层”的顺序定位问题，高效排查。

#### 第一步：区分白屏类型（持续/短暂）

先观察或询问两个关键问题，确定排查方向：

- 是一直白屏，还是过几秒会恢复正常？

- 是首次加载白屏，还是路由切换时白屏？

排查方向定位：

- 持续白屏：优先查「资源加载、JS报错、框架挂载、路由卡死、接口异常无兜底」；

- 短暂白屏：优先查「异步加载、路由切换、接口串行、CSS加载、视觉承接缺失」。

#### 第二步：先看Console，再看Network（最高效两板斧）

##### 1. 查看Console面板（重点找异常）

重点关注以下报错类型，快速定位问题：

- Uncaught Error（JS运行时错误）；

- TypeError（类型错误，如访问undefined属性）；

- ChunkLoadError（chunk加载失败）；

- 跨域报错（CORS相关错误）；

- Hydration Error（服务端渲染 hydration 异常）；

- 路由相关警告（如路由未匹配、未调用next()）。

实践补充：全局错误监听，捕捉所有未处理异常（项目中必用）：

```javascript
// 监听全局JS错误
window.onerror = function (message, source, lineno, colno, error) {
  console.log('全局JS错误:', { message, source, lineno, colno, error });
  // 上报错误至监控平台
};

// 监听未处理的Promise异常（如接口请求失败未catch）
window.addEventListener('unhandledrejection', function (event) {
  console.log('未处理Promise异常:', event.reason);
  // 上报错误至监控平台
  event.preventDefault(); // 阻止浏览器默认报错提示
});
```

##### 2. 查看Network面板（重点找资源/接口问题）

按以下顺序过滤资源，逐一排查：

1. Doc：查看HTML文件是否正常返回（状态码200）；

2. JS：查看主bundle、chunk文件是否加载成功，有无404、500错误，加载耗时是否过长；

3. CSS：查看CSS文件是否加载成功，加载耗时是否过长，是否阻塞渲染；

4. XHR/Fetch：查看首屏核心接口，是否pending、报错、超时，状态码是否正常。

#### 第三步：确认应用入口和框架挂载状态

在应用入口文件（如main.js/ts）添加日志，确认入口执行和根节点挂载情况：

```javascript
console.log('应用入口开始执行'); // 确认入口是否执行

// 确认根节点是否存在
const rootEl = document.getElementById('app'); // Vue项目用app，React项目用root
console.log('根节点:', rootEl);

if (!rootEl) {
  console.error('根节点不存在，挂载失败');
  return;
}
```

排查判断：

- 若“应用入口开始执行”未打印：脚本未加载成功（回头查资源加载）；

- 若根节点为null：挂载节点缺失，需修改HTML添加根节点；

- 若根节点存在但页面白屏：继续排查框架初始化和组件树渲染。

#### 第四步：排查路由流程是否异常（SPA重点）

针对SPA项目，重点排查路由切换流程，添加路由守卫日志：

```javascript
// Vue Router 示例
router.beforeEach((to, from, next) => {
  console.log('beforeEach:', from.fullPath, '->', to.fullPath);
  next(); // 确保调用next()，避免流程中断
});

router.afterEach((to, from) => {
  console.log('afterEach:', from.fullPath, '->', to.fullPath);
});
```

排查重点：

- 是否有无限重定向（日志中出现循环跳转）；

- 是否有路由守卫未调用next()（只打印beforeEach，未打印afterEach）；

- 目标页面组件是否加载成功（查看Network中对应chunk是否加载）。

#### 第五步：排查首屏接口和数据依赖链

重点确认首屏渲染与接口的依赖关系，避免“无数据就不渲染”的问题：

- 页面是否存在“!data && return null”的写法（无数据时无兜底）；

- 首屏接口是否为串行请求（可优化为并行）；

- 接口报错、超时后，是否有错误兜底UI；

- loading态是否直接返回null（无视觉承接）。

推荐渲染逻辑（兜底完善）：

```javascript
function MainPage({ data, loading, error }) {
  if (loading) return <Skeleton />; // 加载中：骨架屏
  if (error) return <ErrorFallback retry={fetchData} />; // 报错：可重试错误页
  if (!data) return <EmptyState />; // 无数据：空状态页
  return <PageContent data={data} />; // 正常渲染
}
```

#### 第六步：用Performance面板还原白屏时序（复杂问题）

若以上步骤未定位到问题，使用Performance面板录制页面加载/路由切换过程，重点查看：

- Main线程：是否存在长任务（阻塞渲染）；

- FCP（首次内容绘制）：发生时间是否过晚；

- JS执行：哪段代码执行耗时过长（如初始化逻辑、接口请求）；

- 渲染时序：资源加载、JS执行、渲染的先后顺序，定位“空档期”所在阶段。

实践补充：手动埋点，精准定位白屏时长：

```javascript
// 路由切换白屏埋点
performance.mark('route-start'); // 路由切换开始标记

requestAnimationFrame(() => {
  performance.mark('page-painted'); // 页面首次渲染标记
  // 计算路由切换白屏时长
  performance.measure('route-white-screen', 'route-start', 'page-painted');
  const result = performance.getEntriesByName('route-white-screen').pop();
  console.log('路由白屏时长:', result.duration);
});

// 首屏业务渲染埋点
performance.mark('page-start'); // 页面加载开始标记

// 首屏核心模块渲染完成时执行
performance.mark('first-screen-ready');
// 计算首屏业务白屏时长
performance.measure('first-screen-time', 'page-start', 'first-screen-ready');
console.log('首屏业务白屏时长:', performance.getEntriesByName('first-screen-time')[0].duration);
```

**对应问题**：实践中排查白屏的核心流程是什么？如何用Performance面板和手动埋点定位白屏问题？

### 实践中白屏问题的处理思路

#### 持续白屏：修复异常链路，确保页面正常启动

- 资源问题：校验构建产物路径、CDN/nginx配置、base/publicPath配置，确保HTML与静态资源版本一致；

- JS启动问题：给入口代码加try-catch和日志，补全全局错误采集，排查环境变量缺失，给关键配置做兜底判空（如const apiBase = config?.api || '/api'）；

- 框架挂载问题：确保根节点存在，排查组件初始化报错，修复挂载逻辑；

- 路由问题：修复路由守卫逻辑，确保调用next()，避免无限重定向，给懒加载组件添加兜底；

- 接口问题：给首屏接口添加超时、重试逻辑，完善loading/error/empty兜底UI，避免“无数据就返回null”。

#### 短暂白屏：优化用户感知，填补渲染空档

- 路由切换：添加视觉承接层（骨架屏、Suspense fallback），保留旧页面到新页面ready后再卸载；

- 异步资源：合理拆包（减小chunk体积），预加载关键chunk（如用户即将进入的页面），优化CDN节点；

- 首屏数据：串行请求改并行，降低首屏强依赖接口数量，先渲染页面框架，再增量填充数据；

- 视觉占位：图片容器预留固定高度+占位背景，用骨架屏替代空白，避免loading时直接清空DOM。

**对应问题**：持续白屏和短暂白屏的处理思路有何区别？分别有哪些核心处理手段？

### 面试高频回答（可直接使用）

页面白屏我会先分成持续白屏和短暂白屏两类来分析。持续白屏一般说明页面没有成功进入可渲染状态，常见原因包括主JS/CSS资源加载失败、入口脚本报错、Vue/React根节点挂载失败、路由守卫卡住、首屏强依赖接口但失败后没有兜底，以及构建部署路径错误。我排查时一般先看Console和Network，确认有没有资源404、JS运行时错误、接口阻塞，再检查应用入口是否执行、根节点是否存在、路由守卫是否正常放行，最后用Performance面板和手动埋点定位复杂问题。

短暂白屏通常说明页面最终可以正常显示，但渲染过程有空档，常见在SPA路由切换、异步组件加载、chunk过大、首屏数据串行请求、CSS没及时到位、图片主导首屏但没有占位这些场景。我在实践里会重点看路由切换链路、首屏接口依赖、Performance面板里的长任务和FCP时序，同时通过performance.mark、performance.measure、requestAnimationFrame做埋点，定位白屏发生在哪个阶段。

处理上，持续白屏更强调修复异常链路，比如修正资源路径、捕获JS错误、确保框架挂载成功、给接口添加兜底；短暂白屏更强调优化用户感知，比如添加骨架屏、Suspense fallback、预加载关键chunk、并行首屏请求和保留占位，尽量不让用户看到纯白空窗期。

### 面试精简背诵版（易记版）

#### 1. 持续白屏

本质：页面没真正启动成功。

优先排查：

- 主资源（HTML/JS/CSS）是否加载成功；

- JS是否有运行时错误；

- 根节点是否挂载成功；

- 路由守卫是否卡住（未调用next()）；

- 首屏接口是否阻塞且无兜底；

- 构建部署路径是否错误。

常用排查手段：window.onerror、unhandledrejection全局监听，结合DevTools的Console和Network。

#### 2. 短暂白屏

本质：页面有渲染空档，缺少视觉承接。

优先排查：

- 路由切换时旧页面是否提前卸载；

- 异步组件/chunk是否加载慢；

- 首屏接口是否串行请求；

- loading时是否直接返回null；

- 是否缺少骨架屏和占位UI。

常用定位手段：performance.mark、performance.measure、requestAnimationFrame手动埋点。

#### 3. 处理思路

- 持续白屏：修复异常链路，确保页面能正常启动；

- 短暂白屏：补充视觉承接（骨架屏、占位）+ 优化加载链路（并行请求、预加载）。

**对应问题**：请简要说明持续白屏和短暂白屏的本质、排查重点及处理思路（面试精简版）。

### 核心API总结（白屏排查常用）

#### 1. 全局错误监听相关

- `window.onerror`：监听全局JS运行时错误，捕捉同步错误；

- `window.addEventListener('unhandledrejection', ...)`：监听未处理的Promise异常（如接口请求失败未catch）。

#### 2. 性能埋点相关

- `performance.mark(name)`：打时间标记，用于标记白屏开始/结束时刻；

- `performance.measure(name, startMark, endMark)`：计算两个标记之间的时间差，获取白屏时长；

- `requestAnimationFrame(callback)`：等待浏览器下一帧渲染完成后执行回调，确保获取真实渲染时间。

#### 3. 资源/路由相关

- `window.addEventListener('error', ..., true)`：捕获阶段监听资源加载错误；

- 路由守卫（beforeEach、afterEach）：排查SPA路由切换异常。

**对应问题**：白屏排查过程中，常用的核心API有哪些？各自的作用是什么？
> （注：文档部分内容可能由 AI 生成）