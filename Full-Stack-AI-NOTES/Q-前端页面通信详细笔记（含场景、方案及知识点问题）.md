# 浏览器页面通信与跨上下文状态协调

页面通信要先判断参与者属于同一应用、同源多个浏览器上下文、具有关联窗口引用的不同源页面，还是跨设备的不同客户端。其次区分三种目标：**数据共享**决定数据存放在哪里，**消息通知**告知其他页面发生变化，**状态协调**解决并发操作与失败恢复。通信 API 能传递消息，并不自动保证状态一致、消息可靠送达或业务操作互斥。

浏览器上下文（Browsing Context）可理解为标签页或 iframe 所承载的页面运行环境；同源（Same-Origin）通常要求协议、主机名和端口一致。具体 API 还可能受到存储分区、窗口关系和浏览器支持情况约束。

```text
页面需要交换信息
    ↓ 先确定参与者与共享范围
同一应用内部 → 路由参数或应用状态（交接与共享数据）
不同标签页   → 存储变更事件或广播频道（通知状态变化）
关联窗口     → postMessage 或专用消息端口（跨窗口传递消息）
跨设备用户   → 服务端中转（跨客户端分发与授权）
    ↓ 消息到达不等于状态一致
读取权威状态 → 必要时协调并发 → 校验权限与恢复失败
```

上游输入是需要共享的数据或变化事件；各通信机制负责将信息交给符合访问范围的接收方。接收方再验证消息并更新或重新获取状态。涉及并发修改时，必须增加协调和服务端权威校验，不能只依赖广播通知。

## 1. 同一应用内部的数据交接

SPA（单页应用）内部页面通信，指Vue、React等框架中，同一应用内不同路由页面（如/list跳到/detail）的通信，核心需求是页面跳转传参或跨页面共享数据。

### 【路由参数与 URL 状态】

适用场景：详情页跳转、参数数量较少、需要刷新页面后数据仍保留，且数据可公开（不敏感）。路由参数分为路径参数（params）和查询参数（query）两种形式。

路径参数（params）：参数嵌入URL路径中，形式为`/path/param`，适合标识唯一资源（如商品ID、用户ID）。

代码示例（以React Router为例）：

```javascript
// 跳转页面（传递参数）
navigate('/detail/123'); // 123为路径参数，对应商品ID

// 目标页面读取参数
const { id } = useParams(); // 读取路径参数，id值为123
console.log('商品ID：', id);

```

查询参数（query）：参数拼接在URL末尾，形式为`/path?key=value&key2=value2`，适合传递多个简单参数。

代码示例（通用，适配所有SPA框架）：

```javascript
// 跳转页面（传递参数）
navigate('/detail?id=123&name=tom'); // id和name为查询参数

// 目标页面读取参数
const query = new URLSearchParams(location.search);
const id = query.get('id'); // 读取单个参数，值为123
const name = query.get('name'); // 读取单个参数，值为tom
const allParams = Object.fromEntries(query); // 读取所有参数，返回{id: "123", name: "tom"}

```

优点：实现简单直接，无需额外依赖；刷新页面后参数不丢失；URL可直接分享，便于场景复用（如分享详情页）。

缺点：不适合传递复杂对象（如嵌套对象、数组）；URL有长度限制，参数过多会导致URL过长；敏感信息（如token、密码）不适合放入URL，易被泄露。

### 【应用状态管理】

适用场景：复杂SPA项目、跨多个页面共享数据、需要全局统一管理状态（如用户信息、购物车数据、全局配置）。常用工具包括Redux、Pinia、Vuex、Zustand等。

代码示例（以Pinia为例，Vue项目）：

```javascript
// 1. 定义状态管理store
import { defineStore } from 'pinia';

const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null // 存储全局用户信息
  }),
  actions: {
    setUserInfo(info) {
      this.userInfo = info; // 存储数据
    }
  }
});

// 2. 页面A存储数据
const userStore = useUserStore();
userStore.setUserInfo({ name: 'Tom', age: 18, gender: 'male' });

// 3. 页面B读取数据
const userStore = useUserStore();
const userInfo = userStore.userInfo; // 读取全局共享的用户信息
console.log('用户信息：', userInfo);

```

优点：适合复杂项目，数据集中管理，便于维护；多页面、多组件共享数据便捷；可配合中间件实现异步请求、数据持久化等扩展功能。

缺点：刷新页面后数据默认丢失（需额外做持久化处理，如结合localStorage）；小项目或简单传值场景使用，会增加项目复杂度，显得偏重。

### 【浏览器存储与刷新恢复】

适用场景：简单页面传值、需要刷新页面后仍能获取数据，无需复杂状态管理，数据格式为简单对象或字符串。两者均为浏览器本地存储API，属于window对象的属性，核心区别在于存储有效期和访问范围。

localStorage：通常可在同源页面间持久化共享字符串数据，但仍受浏览器存储策略、分区、用户清理和配额限制，不应视为永久可靠存储。[[2]](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)

sessionStorage：按源与顶层浏览上下文划分的页面会话存储；刷新通常保留，关闭对应页面会话后清除。同一顶层页面中的同源 iframe 可共享相应区域；通过 opener 打开的新页面可能取得初始副本，但之后不持续同步。容量受浏览器配额与策略影响，写入应处理异常。[[1]](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)

代码示例：

```javascript
// 存储数据（需将对象转为字符串，因为本地存储仅支持字符串）
localStorage.setItem('userInfo', JSON.stringify({ name: 'Tom', age: 18 }));
sessionStorage.setItem('tempData', JSON.stringify({ page: 1, size: 10 }));

// 读取数据（需将字符串转为对象）
const userInfo = JSON.parse(localStorage.getItem('userInfo'));
const tempData = JSON.parse(sessionStorage.getItem('tempData'));

// 删除数据
localStorage.removeItem('userInfo'); // 删除指定key的数据
sessionStorage.clear(); // 清空当前标签页的所有sessionStorage数据

```

优点：实现简单，无需依赖框架或第三方库；刷新页面后数据仍可获取；无需与服务器交互，本地即可完成数据存取。

缺点：需要手动管理数据清理时机（否则会导致数据冗余）；数据不是响应式的（数据变化后，页面不会自动更新）；仅能存储字符串类型，复杂对象需手动序列化/反序列化。

知识点对应问题：1. SPA内部页面通信的三种常用方式是什么？各自的适用场景有何区别？2. 路由参数中，路径参数（params）和查询参数（query）的区别是什么？3. 状态管理工具（如Pinia）的核心作用是什么？如何解决其刷新数据丢失的问题？4. localStorage和sessionStorage的核心区别的是什么？两者的存储容量和访问范围分别是怎样的？

## 2. 同源浏览器上下文的消息通知

多个浏览器标签页通信，指同一浏览器中，打开多个同源站点的标签页（如两个https://example.com标签页），实现标签页之间的数据传递和通知（如A页修改数据，B页实时更新）。核心要求是同源（协议、域名、端口一致）。

### 【storage 事件】

核心原理：利用localStorage的存储特性，一个标签页修改localStorage中的数据时，其他同源标签页会触发storage事件，通过监听该事件实现数据通信。

注意事项：当前标签页自身修改localStorage时，不会触发自身的storage事件，仅能通知其他同源标签页；仅支持同源标签页通信，跨域标签页无法触发。

代码示例：

```javascript
// 标签页A（发送消息）
// 存储数据到localStorage，触发其他标签页的storage事件
localStorage.setItem('message', JSON.stringify({
  type: 'update',
  value: '页面A已更新数据',
  time: new Date().toLocaleString()
}));

// 标签页B（接收消息）
// 监听storage事件，获取其他标签页传递的数据
window.addEventListener('storage', (e) => {
  // 校验key，确保只处理目标数据
  if (e.key === 'message') {
    const data = JSON.parse(e.newValue); // 新值（传递的消息）
    const oldData = JSON.parse(e.oldValue); // 旧值（修改前的数据）
    console.log('收到其他标签页消息：', data);
    console.log('修改前的数据：', oldData);
  }
});

```

优点：实现简单，无需额外API，依赖浏览器原生localStorage；兼容性好，支持所有现代浏览器；数据可持久化（localStorage特性）。

缺点：通知依赖存储变更而非专用消息队列；同一写入者不会收到自己的 storage 事件，但多个标签页可以相互写入并接收通知，并非只能单向通信。事件不提供业务级确认或可靠补发；应处理删除时 newValue 为 null、clear 时 key 为 null，以及相同值写入不产生变更等情况。localStorage 的事件传播到共享存储区域的其他文档；sessionStorage 事件只传播到同一顶层浏览上下文中共享该区域的其他文档。[[3]](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)

### 【BroadcastChannel】

核心原理：浏览器原生提供的专门用于同源多标签页通信的API，通过创建同一名称的频道（channel），多个标签页订阅该频道，即可实现双向实时通信，无需借助本地存储。

代码示例：

```javascript
// 所有同源标签页，创建同一名称的频道（名称一致才能通信）
const channel = new BroadcastChannel('my_page_channel');

// 标签页A（发送消息）
channel.postMessage({
  type: 'login',
  user: 'Tom',
  status: 'success'
});

// 标签页B（接收消息）
channel.onmessage = (event) => {
  // event.data 即为传递的消息数据
  console.log('收到标签页消息：', event.data);
};

// 标签页C（发送消息）
channel.postMessage({
  type: 'logout',
  time: new Date().toLocaleString()
});

// 关闭频道（不再通信时，避免内存泄漏）
// channel.close();

```

优点：API 简洁，使用结构化克隆传递消息，不需要为通知写入 localStorage；适合同一存储分区中多个符合条件的上下文广播变化。不能脱离具体负载与浏览器环境断言性能必然优于 storage 事件。[[4]](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)

边界：除同源外还受存储分区限制；例如顶层 b.com 页面与嵌入 a.com 的 b.com iframe 即使同源，也可能无法通过同一频道通信。频道不持久化历史消息，后加入的页面不能依赖它补收旧消息；使用结束后应 close()。发送者自身的频道对象不会收到自己发出的消息，其他符合条件的频道对象可以接收。[[4]](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)

知识点对应问题：1. 多个同源标签页通信的两种常用方式是什么？各自的核心原理是什么？2. storage事件的触发条件是什么？为什么当前标签页修改localStorage不会触发自身的storage事件？3. BroadcastChannel相比storage事件，有哪些优势？4. 如何关闭BroadcastChannel频道？为什么要关闭？

## 3. 关联窗口与跨源页面通信

父页面与子页面通信，主要包含两种场景：一是通过window.open()方法打开的新窗口（子窗口）与父窗口通信；二是页面内嵌iframe（子页面）与父页面通信。核心方案为postMessage，支持同源和跨域通信，是最安全、最常用的方案。

### 【postMessage 的消息传递与安全校验】

核心原理：postMessage是浏览器原生API，允许不同窗口（包括同源、跨域）之间发送消息，通过监听message事件接收消息，同时可校验消息来源（origin），保障通信安全。

核心注意事项：发送时指定准确的 targetOrigin；接收时同时按业务需要校验 event.origin、event.source 和 event.data 的结构与权限。origin 反映发送时的来源，窗口之后仍可能导航；不应只凭 origin 就执行敏感操作。对于无法使用明确目标源的特殊场景须单独评估风险。[[5]](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

#### <u>1. window.open 子窗口通信</u>

父页面发送消息，子页面接收消息：

```javascript
// 父页面：打开子窗口，并发送消息
const childWindow = window.open('http://localhost:3000/child.html');

// 子窗口先注册监听器，再发 ready；父窗口收到并校验后才发送
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:3000' || event.source !== childWindow) return;
  if (event.data?.type !== 'ready') return;
  childWindow.postMessage({ type: 'sendData', value: 123 }, 'http://localhost:3000');
});

// 子页面：接收父页面消息
window.addEventListener('message', (event) => {
  // 校验消息来源，仅接收指定域名的消息（安全校验）
  if (event.origin !== 'http://localhost:3000' || event.source !== window.opener) return;
  if (event.data?.type !== 'sendData' || typeof event.data.value !== 'number') return;
  console.log('收到父页面消息：', event.data);
});
// 注册监听后才通知父窗口；noopener / COOP 等策略可能使 opener 不可用
window.opener?.postMessage({ type: 'ready' }, 'http://localhost:3000');

```

子页面回传消息给父页面：

```javascript
// 子页面：回传消息给父页面
window.opener?.postMessage({ type: 'reply', msg: '已收到消息，正在处理' }, 'http://localhost:3000');

// 父页面：接收子页面回传的消息
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:3000' || event.source !== childWindow) return;
  if (event.data?.type !== 'reply') return;
  console.log('收到子页面回传消息：', event.data);
});

```

#### <u>2. iframe 内嵌页面通信</u>

父页面（包含iframe）发送消息，子页面（iframe内部）接收消息：

```javascript
// 父页面：获取iframe元素，发送消息
const iframe = document.getElementById('myIframe'); // iframe的id为myIframe

// 子页面先安装监听器并发 ready；父页面确认后发送业务消息
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:3001' || event.source !== iframe.contentWindow) return;
  if (event.data?.type !== 'ready') return;
  iframe.contentWindow.postMessage({ type: 'hello', content: '来自父页面的问候' }, 'http://localhost:3001');
});

// 子页面（iframe内部）：接收父页面消息
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:3000' || event.source !== window.parent) return;
  if (event.data?.type !== 'hello') return;
  console.log('iframe收到父页面消息：', event.data);
});
window.parent.postMessage({ type: 'ready' }, 'http://localhost:3000');

```

子页面（iframe）回传消息给父页面：

```javascript
// 子页面（iframe内部）：回传消息
window.parent.postMessage({ type: 'reply', content: '已收到问候' }, 'http://localhost:3000');

// 父页面：接收iframe回传的消息
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:3001' || event.source !== iframe.contentWindow) return;
  console.log('父页面收到iframe消息：', event.data);
});

```

以上代码是最小消息交互示例，实际业务还应为消息设置 requestId、超时和失败反馈，并对每类事件校验结构；跨源导航、窗口关闭、noopener 与 Cross-Origin-Opener-Policy 都可能影响窗口引用。iframe 的 load 只表示文档加载事件，不能保证应用消息监听已就绪，因此采用应用级 ready 握手。[[5]](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

postMessage的核心优势：支持同源和跨域通信，兼容性好；安全可控，可通过origin校验防止恶意消息；可传递复杂对象，不受存储限制；适用于所有父子窗口、iframe场景。

### 【同源窗口直接访问】

适用场景：两个页面通过window.open()打开，且为同源（协议、域名、端口一致），可直接通过window引用操作对方页面的方法和属性，实现通信。

代码示例：

```javascript
// 父页面：打开子窗口，直接操作子页面
const childWindow = window.open('http://localhost:3000/child.html');

// 子窗口加载完成后，调用子页面的方法、修改子页面属性
// 必须等待同源子窗口加载并确认目标方法已定义
childWindow.addEventListener('load', () => {
  if (typeof childWindow.someMethod === 'function') childWindow.someMethod();
  childWindow.document.title = '子页面新标题';
  childWindow.userInfo = { name: 'Tom' };
});

// 子页面：操作父页面
if (window.opener) window.opener.document.title = '父页面标题被修改'; // 修改父页面标题
if (typeof window.opener?.someParentMethod === 'function') window.opener.someParentMethod(); // 调用父页面定义的someParentMethod方法

```

优点：实现简单，无需额外API，直接操作窗口对象即可；通信效率高，无需中间载体。

缺点：限制极大，仅支持同源页面；页面间耦合度高，一旦页面结构或方法名修改，会导致通信失败；不推荐作为通用方案，仅适用于简单同源场景，优先使用postMessage。

知识点对应问题：1. 父页面与子页面（window.open/iframe）通信的最常用方案是什么？它的核心优势是什么？2. postMessage通信中，为什么必须校验origin？如何校验？3. iframe场景中，父页面如何获取子页面的window对象？子页面如何获取父页面的window对象？4. 同源页面直接访问的适用条件是什么？为什么不推荐作为通用方案？

## 4. 跨标签页状态协调与可靠性

### 【消息通知、重新获取与互斥执行】

广播事件只说明“可能有状态变化”，不能证明接收方已拿到最新数据，更不能保证多个标签页不会同时发起同一操作。可将流程拆为：检测变化 → 在必要时协调同一资源的并发操作 → 通过服务端完成受权威校验的更新 → 广播变化通知 → 其他标签页重新获取或验证状态。Web Locks API 可以在支持的浏览器中通过同名锁协调共享资源访问，但不替代服务端事务、鉴权和幂等控制。[[6]](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)

```javascript
// 同一存储分区内的多个页面使用相同锁名协调刷新
async function refreshOnce(refreshSession) {
  if (!navigator.locks?.request) return refreshSession(); // 降级路径仍须依赖服务端保护
  return navigator.locks.request('session-refresh', async () => {
    // 获得锁后应重新检查会话是否已被其他标签页更新
    return refreshSession();
  });
}
```

该示例只说明互斥入口，不包含“获得锁后重新检查状态”的具体实现，也不保证所有浏览器均支持 Web Locks。对于 Token Rotation 等高风险操作，服务端仍须处理并发重放与失效恢复。

### 【消息丢失、重复执行与状态恢复】

页面可能在后台被挂起、在订阅前错过消息、被关闭或网络中断。因而广播适合传递“状态发生变化”的提示，持久化或服务端权威数据负责恢复；接收端在页面重新可见、重新联网或重新登录时可主动校验最新状态。消息附带版本或事件标识可帮助避免过期更新，但不能代替服务端冲突控制。

### 【专用消息端口与共享执行环境】

MessageChannel 提供两个 MessagePort，可建立一对一的消息通道；SharedWorker 可让符合条件的多个页面连接到共享 Worker 执行环境；Service Worker 可以通过客户端消息接口参与页面与后台工作线程的协调。这些机制并非 BroadcastChannel 的简单替代，选型取决于是否需要专用端口、共享计算或离线生命周期。[[7]](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel) [[8]](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) [[9]](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker/postMessage)

## 5. 跨设备与跨用户的服务端中转

适用场景：两个页面不仅需要简单传值，还需要实时同步数据；多个用户、多端（如PC端、移动端）同步数据；跨域且无法使用postMessage的复杂场景（如多标签页跨域、不同应用间通信）。核心是通过后端或WebSocket建立中转，实现数据实时同步。

常用中转方式：

1. WebSocket：浏览器与服务器建立长连接，实现双向实时通信，多个页面同时连接到同一个WebSocket服务器，通过服务器中转消息，实现页面间通信（如在线协作、实时通知）。

代码示例（WebSocket基础用法）：

```javascript
// 页面A：连接WebSocket服务器，发送消息
const ws = new WebSocket('ws://localhost:8080');

// 连接成功后发送消息
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'updateData',
    data: { id: 1, content: '新数据' },
    from: 'pageA'
  }));
};

// 接收服务器中转的消息（来自其他页面）
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('页面A收到中转消息：', data);
};

// 页面B：连接同一个WebSocket服务器，接收消息
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('页面B收到中转消息：', data);
  // 可根据消息类型，执行对应操作（如更新页面数据）
  if (data.type === 'updateData') {
    updatePageData(data.data);
  }
};

```

2. SSE（Server-Sent Events）：服务器向客户端单向推送消息，适用于仅需要服务器向页面推送数据的场景（如实时公告、数据更新通知），比WebSocket更轻量。

3. 轮询接口：页面定期向后端接口发送请求，获取最新数据，适用于实时性要求不高的场景（如每隔30秒更新一次数据），实现简单但性能较差。

优点：支持跨域、多端、多用户同步；实时性强，可实现双向通信（WebSocket）；不受浏览器窗口、标签页限制，适用复杂场景。

缺点：需要后端配合，增加服务器开发成本；WebSocket需要维护长连接，对服务器性能有一定要求；轮询接口会增加服务器请求压力，实时性较差。

知识点对应问题：1. 什么场景下需要用后端/WebSocket作为中转实现页面通信？2. WebSocket、SSE、轮询接口的核心区别是什么？各自的适用场景有哪些？3. WebSocket通信的基本流程是什么？如何实现多个页面通过WebSocket中转通信？

## 6. 工程选型与验收

### 【按通信范围、数据权威性与可靠性选型】

优先判断参与者是否共享浏览器上下文或存储分区，再判断是需要传值、广播通知、共享计算还是协调并发；涉及跨设备或跨用户的数据更新，应以服务端作为权威数据源。即使使用 WebSocket、SSE 或轮询，服务端仍需要鉴权和订阅权限控制。协议细节见 [WebSocket 完整知识体系](./W-WebSocket完整知识体系.md) 与 [流式输出](./L-流式输出从0到1知识梳理.md)。

### 【异常与验收矩阵】

至少覆盖：发送方与接收方启动顺序颠倒、同值写入、删除存储键、跨源或跨分区、窗口导航、noopener、非法消息结构、接收方关闭、后台恢复、两个标签页并发刷新、Web Locks 不可用、服务端拒绝更新。验证结果要区分“消息发送成功”“接收方实际处理”“服务端状态正确”，不可仅以日志出现判断端到端可靠。



实际开发中，页面通信方案的选型需结合场景、需求（是否跨域、是否实时、是否需要刷新保留），以下为高频场景的选型建议：

1. 页面间仅需要跳转带参数，且参数简单、可公开：优先使用路由参数（params/query）。

2. 跨页面共享业务状态（如用户信息、全局配置），且为SPA项目：优先使用状态管理工具（Pinia/Redux），需持久化则配合localStorage。

3. 同站点多个标签页同步数据，且无需复杂交互：优先使用BroadcastChannel；兼容性要求高则使用storage事件。

4. 父子窗口、iframe通信（无论同源还是跨域）：优先使用postMessage，严格校验origin保障安全。

5. 多端同步、实时通信、多用户协作：优先使用WebSocket + 后端中转；实时性要求不高则使用轮询接口。

### 【知识问答与判断路径】

面试中回答“前端页面通信”问题，需先明确场景划分，再对应给出方案，重点突出核心方案的用法和注意事项，推荐回答框架如下：

前端页面通信需先根据场景分类，核心区分维度是“是否同源、是否为父子窗口、是否为同一标签页”，不同场景对应不同方案：

1. 若为SPA内部页面通信，常用路由参数（传简单参数、刷新保留）、状态管理（全局共享）、localStorage/sessionStorage（简单传值、刷新保留）。

2. 若为多个同源标签页通信，可用storage事件（依赖localStorage，兼容性好）或BroadcastChannel（专门用于多标签页，更适合专用消息广播）。

3. 若为父子窗口、iframe通信，最常用postMessage，支持同源和跨域，需注意校验origin保障安全。

4. 若需要实时、多端、多用户同步，需用WebSocket或后端作为中转。

其中，重点掌握postMessage、storage事件、BroadcastChannel和全局状态管理，这是开发和面试的高频考点。

知识点对应问题：1. 前端页面通信的核心场景划分维度是什么？请分别说明不同场景对应的核心方案。2. 开发中最常用的页面通信方案有哪些？各自的适用场景是什么？3. postMessage、BroadcastChannel、storage事件的核心区别是什么？4. 如何保障页面通信的安全性？（重点回答postMessage的origin校验）
## 7. 关联知识与工程实践

浏览器存储的配额、隔离与生命周期以 [浏览器存储方式](./L-浏览器存储方式.md) 为主要知识入口；跨源安全边界参考 [跨域问题](./K-跨域问题.md)；服务端会话权威性与 Token 更新参考 [Web 身份认证、会话控制与访问控制体系](./W-Web身份认证会话控制与访问控制体系.md)。多标签页会话广播和刷新互斥可在具体项目中通过源码与并发测试验证；**代码调用 BroadcastChannel 或 Web Locks 不等于异常恢复已通过验收**。

## 8. 参考文献

1. MDN, Window.sessionStorage：<https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage>
2. MDN, Web Storage API：<https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API>
3. MDN, Window.storage event：<https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event>
4. MDN, Broadcast Channel API：<https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API>
5. MDN, Window.postMessage：<https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage>
6. MDN, Web Locks API：<https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API>
7. MDN, MessageChannel：<https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel>
8. MDN, SharedWorker：<https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker>
9. MDN, ServiceWorker.postMessage：<https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker/postMessage>