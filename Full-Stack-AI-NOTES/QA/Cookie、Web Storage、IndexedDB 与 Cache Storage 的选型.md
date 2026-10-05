# Cookie、Web Storage、IndexedDB 与 Cache Storage 的选型

## 【知识概述】

**浏览器本地数据机制分别服务于请求状态、小规模键值、结构化业务数据和请求响应复用，选择时先明确数据用途与生命周期。**

浏览器提供多种本地数据保存机制，是因为不同数据的目标、生命周期和规模并不一样。在选择具体 API 之前，需要先区分**存储和缓存**。

存储更关注的是“数据要留下来”。它的主要目标是保存业务数据和用户状态，让应用在页面刷新、重新进入页面甚至重新打开浏览器以后，还能够记住之前的信息，例如用户配置、主题、表单草稿、搜索历史和离线业务数据。

缓存更关注的是“已有结果尽量复用”。它的核心目的是避免重复 HTTP 请求、重复下载或者重复计算，从而减少网络等待时间，提高资源加载速度和页面性能。例如浏览器已经下载过某个 JS、CSS、图片或者 API Response，如果资源仍然可以使用，就没有必要再次完整获取。缓存还可以进一步支持弱网和离线场景，但它最核心的设计目标仍然是复用结果和提升访问效率。

所以可以先概括成：**存储主要解决应用如何记住数据，缓存主要解决如何减少重复获取并提高性能。**

在具体存储方式里，首先是 Cookie。Cookie 可以看成浏览器保存的一小段站点相关数据，但它和普通前端存储不同，它与 HTTP 请求/响应机制天然关联。服务器可以通过 `Set-Cookie` 让浏览器保存 Cookie，之后符合条件的 HTTP 请求可以自动携带对应 Cookie。因此 Cookie 更适合保存少量、需要和服务端请求状态建立联系的数据，而不适合承担大量普通业务数据存储。Cookie 的属性、安全机制以及它如何和 Session、Token/JWT 配合实现登录态，可以单独作为下一题展开。

理解这组机制，可以沿以下主线展开：

先区分业务存储与资源缓存。

比较 Cookie 自动参与请求与 Web Storage 的同步字符串读写

再用 IndexedDB 的异步事务和 Cache Storage 的请求响应对象解释大数据及离线资源场景。

本地持久化受配额、清理及用户策略影响；会话凭证还需独立考虑 XSS、CSRF 等风险，不能按存储便利性单独选型。相关完整知识可结合 [浏览器存储方式](<../L-浏览器存储方式.md>) 阅读。

## 1. 机制说明与工程判断

### 【先区分“存储”和“缓存”的目标】

在浏览器里，**存储（Storage）和缓存（Cache）虽然最终都可能把数据保存在本地，但它们解决的问题不同。**

存储更关注的是：

> **把应用需要的数据保存下来，让应用在页面刷新、重新进入页面甚至重新打开浏览器以后，还能“记住”之前的状态。**

例如：

```text
用户登录相关状态、用户主题和语言配置、表单草稿、搜索历史、聊天记录、离线业务数据
```

所以存储的核心目标是：

```text
保存业务数据 / 用户状态
        ↓
让应用能够长期或按会话记住这些数据
```

而缓存更关注的是：

> **复用已经获取或计算过的结果，避免重复请求、重复下载或重复计算，从而提高访问速度和页面性能。**

例如浏览器已经下载过：

```text
app.js、style.css、logo.png、某个 API Response
```

如果资源没有变化，就没有必要每次都重新通过网络获取。

因此缓存的核心目标可以概括成：

```text
减少重复 HTTP 请求 / 回源
        ↓
减少网络传输和等待时间
        ↓
提高资源加载速度
        ↓
提高页面访问性能
```

所以二者可以先这样区分：

```text
存储
→ 重点是“数据要留下来”
→ 让应用记住用户状态和业务数据

缓存
→ 重点是“已有结果尽量复用”
→ 减少重复请求和重复获取，提高性能
```

不过二者不是完全割裂的概念。缓存本身也需要某种存储介质保存数据，而且像 Cache Storage 除了性能优化，还可以进一步支持弱网和离线访问。区别主要在于**设计目标和使用语义**。

---
### 【浏览器为什么需要多种本地存储机制？】

JavaScript 中普通变量的数据主要存在当前页面运行环境的内存中，例如：

```javascript
let user = {
  name: 'Tom'
}
```

页面刷新或者对应执行环境被销毁以后，这些运行时数据通常也会消失。

但真实应用中，有很多数据需要跨刷新、跨页面会话甚至跨浏览器重启保存，例如：

```text
用户主题、语言配置、表单草稿、用户偏好、搜索历史、离线业务数据
```

同时，不同数据的特点并不一样：

```text
用户主题
→ 少量简单配置

大量聊天记录
→ 大量结构化数据

JS / CSS / 图片 / API Response
→ 网络资源

会话标识
→ 需要和 HTTP 请求发生关系
```

因此浏览器没有只提供一种万能存储方案，而是提供了不同机制：

```text
浏览器端数据保存

├── Cookie
│   └── 小量数据，并且与 HTTP 请求天然关联
│
├── Web Storage
│   ├── localStorage
│   └── sessionStorage
│       └── 简单 Key-Value 业务数据
│
├── IndexedDB
│   └── 大量、结构化的本地业务数据
│
└── Cache Storage
    └── Request / Response 网络资源缓存
```

此外还有上一题讲过的 **HTTP Cache**。它主要属于浏览器网络缓存机制，不应该和 `localStorage`、IndexedDB 这类业务数据存储简单混为一谈。

---
### 【Cookie 在存储体系中是什么？】

Cookie 可以先理解成：

> **浏览器保存的一小段与站点相关的数据，同时它与 HTTP 请求/响应机制天然关联。**

服务器可以通过响应头：

```http
Set-Cookie: sessionId=abc123
```

让浏览器保存 Cookie。

之后浏览器访问符合条件的资源时，可以在 HTTP 请求中自动携带对应 Cookie：

```http
Cookie: sessionId=abc123
```

这也是 Cookie 和 `localStorage` 一个非常重要的结构性区别：

```text
localStorage
→ 主要给前端 JavaScript 自己保存和读取业务数据

Cookie
→ 不只是浏览器本地保存数据
→ 还可以参与 HTTP 请求和服务端状态关联
```

因此 Cookie 通常更适合保存**少量、需要与服务端请求产生联系的状态信息**，而不适合当成普通的大容量前端数据库。

Cookie 的具体属性、安全机制以及如何配合 Session、Token/JWT 实现登录态，下一题再展开。

---
### 【什么是 Web Storage？】

Web Storage 主要包括：

```text
localStorage
sessionStorage
```

它们都提供非常简单的：

```text
Key → Value
```

存储模型。

例如：

```javascript
localStorage.setItem('theme', 'dark')

const theme = localStorage.getItem('theme')

localStorage.removeItem('theme')
```

两者都通过 `Storage` 接口提供 `setItem()`、`getItem()`、`removeItem()` 和 `clear()` 等能力。

Web Storage 更适合：

> **保存体量不大、结构简单的前端业务状态。**

---
### 【`localStorage` 是什么？】

`localStorage` 适合保存：

> **简单、体量不大，并且希望跨页面刷新和浏览器重启继续存在的业务数据。**

例如：

```javascript
localStorage.setItem('theme', 'dark')
localStorage.setItem('language', 'zh-CN')
```

它最核心的生命周期特点是：

```text
页面刷新
→ 数据仍然存在

关闭浏览器
→ 数据通常仍然存在

重新打开网站
→ 仍然可以读取
```

`localStorage` 主要按 Origin 隔离，也就是通常按照：

```text
协议 + 主机 + 端口
```

划分存储空间。

因此同一个 Origin 下的页面通常可以共享同一份 `localStorage`。

常见场景包括：

```text
主题配置、语言配置、用户偏好、简单搜索历史、非敏感页面配置
```

---
### 【`sessionStorage` 是什么？】

`sessionStorage` 的 API 和 `localStorage` 基本一致：

```javascript
sessionStorage.setItem('step', '2')
sessionStorage.getItem('step')
```

但是它的生命周期和隔离范围不同。

可以先理解成：

```text
localStorage
→ 更偏 Origin 级持久存储

sessionStorage
→ Origin + 当前页面会话
```

因此 `sessionStorage` 更接近：

> **当前 Tab / 页面会话中的临时业务存储。**

页面刷新时：

```text
sessionStorage
→ 通常仍然存在
```

而对应页面会话结束以后：

```text
sessionStorage
→ 会被清理
```

所以它比较适合：

```text
多步骤表单当前步骤、当前 Tab 的筛选条件、临时页面状态、一次页面流程中的数据
```

---
### 【`localStorage` 和 `sessionStorage` 最大区别是什么？】

可以从生命周期和隔离范围理解，而不只是简单记成“一个永久，一个临时”。

```text
localStorage
→ 主要按 Origin 隔离
→ 数据长期保留，除非主动清理或被浏览器清理

sessionStorage
→ 还与页面会话相关
→ 页面刷新通常保留
→ 页面会话结束后清除
```

例如用户主题：

```text
dark / light
```

希望下次重新打开浏览器仍然存在，更适合：

```text
localStorage
```

而一个三步表单：

```text
Step 1
↓
Step 2
↓
Step 3
```

如果只是希望当前 Tab 刷新时不要丢失步骤，可以考虑：

```text
sessionStorage
```

---
### 【Web Storage 保存的是什么类型的数据？】

Web Storage 的 Key 和 Value 最终都是字符串。

例如：

```javascript
localStorage.setItem('age', 18)
```

读取以后得到的实际上是：

```text
"18"
```

如果需要保存对象：

```javascript
const user = {
  name: 'Tom',
  age: 18
}
```

通常需要：

```javascript
localStorage.setItem(
  'user',
  JSON.stringify(user)
)
```

读取时再：

```javascript
const user = JSON.parse(
  localStorage.getItem('user')
)
```

因此 Web Storage 本质上更适合：

```text
简单字符串 Key-Value
```

而不是复杂的本地数据库需求。

---
### 【为什么不能把所有业务数据都放进 `localStorage`？】

主要有两个原因。

第一，**数据模型过于简单**。

它本质上只有：

```text
string key
→
string value
```

没有真正的：

```text
对象仓库、索引、事务、复杂查询
```

例如有十万条聊天记录，如果全部序列化成一个巨大 JSON：

```javascript
localStorage.setItem(
  'messages',
  JSON.stringify(messages)
)
```

后续进行复杂查询、局部修改和维护都会很麻烦。

第二，**Web Storage API 是同步的**。

例如：

```javascript
localStorage.getItem()
localStorage.setItem()
```

都会同步执行。

如果频繁读写大量数据，会占用主线程执行时间，因此不适合承担大规模复杂数据存储。

所以可以先记：

```text
少量、简单数据
→ Web Storage

大量、结构化数据
→ IndexedDB
```

---
### 【IndexedDB 是什么？】

IndexedDB 可以理解为：

> **浏览器内置的客户端结构化数据库。**

它和 `localStorage` 已经不是同一个层级的数据模型。

`localStorage` 更接近：

```text
key
↓
string
```

而 IndexedDB 可以形成：

```text
Database
  ↓
Object Store
  ↓
Object
  ↓
Index
```

例如一个聊天数据库：

```text
chat-database

messages
├── id
├── userId
├── content
├── timestamp
└── status
```

还可以针对 `userId`、`timestamp` 等字段建立索引。

IndexedDB 支持对象存储、索引和事务，因此更适合保存大量结构化客户端数据。

---
### 【为什么 IndexedDB 更适合大量数据？】

主要可以从三个方面理解。

第一，**可以直接保存结构化数据**。

例如：

```javascript
{
  id: 1,
  name: 'Tom',
  age: 18,
  tags: ['Vue', 'React']
}
```

而不需要像 Web Storage 一样把整个对象先转换成一个字符串再管理。

第二，**支持索引和事务**。

例如可以给：

```text
userId、timestamp、email
```

建立索引，从而更高效地查找数据。

第三，**主要 API 是异步的**。

例如：

```javascript
const request = indexedDB.open('app-db')
```

因此它比大量同步 Web Storage 操作更适合复杂、本地数据量较大的场景。

---
### 【IndexedDB 适合什么场景？】

例如：

```text
大量聊天记录、离线文档、邮件数据、大量表单草稿、客户端业务数据、PWA 离线业务数据
```

都可以考虑 IndexedDB。

例如聊天应用需要保存几万条：

```javascript
{
  id,
  senderId,
  content,
  timestamp,
  status
}
```

这样的消息对象，就明显比全部塞入 `localStorage` 更适合 IndexedDB。

---
### 【Cache Storage 是什么？】

Cache Storage 和前面的业务数据存储机制不同。

它主要管理的是：

```text
Cache
```

而一个 Cache 中保存的核心关系可以理解为：

```text
Request
↓
Response
```

例如：

```text
GET /app.js
→ app.js Response

GET /logo.png
→ logo.png Response

GET /api/news
→ API Response
```

因此 Cache Storage 更适合：

> **缓存网络请求和响应，而不是保存普通用户配置或业务对象。**

例如：

```javascript
const cache = await caches.open('app-v1')
await cache.add('/app.js')
```

之后可以：

```javascript
const response = await cache.match('/app.js')
```

它最常和 Service Worker 配合，实现静态资源缓存、运行时缓存以及离线访问。

---
### 【Cache Storage 是 Service Worker 专属的吗？】

不是。

Service Worker 非常常用 Cache Storage，但 Cache Storage 本身并不是只能在 Service Worker 中使用。

它可以在支持该 API 的 Window 和 Worker 环境访问。

只是最经典的组合仍然是：

```text
Service Worker
       ↓
拦截 fetch
       ↓
Cache Storage
```

由 Service Worker 决定：

```text
先查缓存？、先请求网络？、网络失败再走缓存？
```

从而实现可编程缓存和离线能力。

---
### 【Cache Storage 和 HTTP Cache 有什么区别？】

这也连接到分层缓存中资源复用与业务数据保存的区别。

HTTP Cache 主要由浏览器网络栈按照 HTTP 缓存规则管理，例如：

```http
Cache-Control
ETag
Last-Modified
Expires
```

浏览器根据这些响应头判断资源能否直接复用、是否需要重新验证。

因此它更接近：

```text
HTTP 缓存规则驱动
→ 浏览器自动管理
```

而 Cache Storage 提供：

```javascript
caches.open()
cache.put()
cache.match()
cache.delete()
```

允许 JavaScript 主动管理缓存。

因此可以区分为：

```text
HTTP Cache
→ HTTP 协议和浏览器网络缓存规则驱动

Cache Storage
→ JavaScript 可编程管理的 Request / Response 缓存
```

两套缓存可以同时存在。

---
### 【Cookie、Web Storage、IndexedDB 和 Cache Storage 应该怎么选？】

不要把它们背成四个独立 API，而应该先判断：

> **我要保存的到底是什么数据？**

如果是**少量、需要和 HTTP 请求及服务端状态产生关联的数据**：

```text
→ 考虑 Cookie
```

如果是**少量、简单、希望长期保存的前端业务配置**：

```text
→ localStorage
```

如果是**只需要在当前页面会话中保存的临时状态**：

```text
→ sessionStorage
```

如果是**大量、结构化、需要索引和事务的客户端业务数据**：

```text
→ IndexedDB
```

如果保存的是**HTTP Request / Response、静态资源或者接口响应缓存**：

```text
→ Cache Storage
```

因此可以最终记成：

```text
Cookie
→ 小量、与 HTTP 状态相关的数据

localStorage
→ 简单、长期保存的业务数据

sessionStorage
→ 当前页面会话中的临时业务数据

IndexedDB
→ 大量、结构化的客户端业务数据

Cache Storage
→ Request / Response 网络资源缓存
```

## 2. 完整回答与表达组织

浏览器提供多种本地数据保存机制，是因为不同数据的目标、生命周期和规模并不一样。在选择具体 API 之前，需要先区分**存储和缓存**。

存储更关注的是“数据要留下来”。它的主要目标是保存业务数据和用户状态，让应用在页面刷新、重新进入页面甚至重新打开浏览器以后，还能够记住之前的信息，例如用户配置、主题、表单草稿、搜索历史和离线业务数据。

缓存更关注的是“已有结果尽量复用”。它的核心目的是避免重复 HTTP 请求、重复下载或者重复计算，从而减少网络等待时间，提高资源加载速度和页面性能。例如浏览器已经下载过某个 JS、CSS、图片或者 API Response，如果资源仍然可以使用，就没有必要再次完整获取。缓存还可以进一步支持弱网和离线场景，但它最核心的设计目标仍然是复用结果和提升访问效率。

所以可以先概括成：**存储主要解决应用如何记住数据，缓存主要解决如何减少重复获取并提高性能。**

在具体存储方式里，首先是 Cookie。Cookie 可以看成浏览器保存的一小段站点相关数据，但它和普通前端存储不同，它与 HTTP 请求/响应机制天然关联。服务器可以通过 `Set-Cookie` 让浏览器保存 Cookie，之后符合条件的 HTTP 请求可以自动携带对应 Cookie。因此 Cookie 更适合保存少量、需要和服务端请求状态建立联系的数据，而不适合承担大量普通业务数据存储。Cookie 的属性、安全机制以及它如何和 Session、Token/JWT 配合实现登录态，可以单独作为下一题展开。

第二类是 Web Storage，包括 `localStorage` 和 `sessionStorage`。它们都提供简单的字符串 Key-Value 存储。`localStorage` 主要按 Origin 隔离，数据通常可以跨页面刷新以及浏览器重启继续存在，所以更适合主题、语言、用户偏好等简单持久化配置；`sessionStorage` 还和当前页面会话相关，页面刷新时通常仍然保留，但页面会话结束以后会被清理，所以更适合当前 Tab 的临时页面状态。

Web Storage 的优势是使用简单，但它的数据模型只是字符串 Key-Value，而且 API 是同步的。因此它适合小规模、简单业务数据，不适合大量复杂数据。如果要保存对象，通常还需要通过 `JSON.stringify()` 和 `JSON.parse()` 进行序列化和反序列化。

如果需要保存大量结构化数据，就更适合使用 IndexedDB。IndexedDB 是浏览器提供的客户端结构化数据库，支持 Object Store、Key、Index 和 Transaction，可以直接保存结构化 JavaScript 数据，并且主要通过异步 API 操作。因此大量聊天记录、离线文档、邮件、本地业务数据等场景，都比 `localStorage` 更适合使用 IndexedDB。

最后是 Cache Storage。它和前面的普通业务数据存储不同，它主要用于保存网络请求和响应，可以理解成 `Request → Response` 的映射，因此特别适合缓存 HTML、JavaScript、CSS、图片和 API Response。它经常和 Service Worker 配合，通过 Cache First、Network First 等策略实现可编程缓存和离线访问。

Cache Storage 还需要和上一题的 HTTP Cache 区分。HTTP Cache 主要由浏览器网络栈依据 `Cache-Control`、`ETag`、`Last-Modified` 等 HTTP 缓存规则自动管理，而 Cache Storage 则可以通过 JavaScript 使用 `caches.open()`、`cache.match()`、`cache.put()` 等 API 主动控制。两套缓存机制可以同时存在。

因此整个浏览器数据保存体系可以最终收敛成：

```text
Cookie
→ 小量、与 HTTP 状态相关的数据

localStorage
→ 简单、长期保存的业务数据

sessionStorage
→ 当前页面会话中的临时数据

IndexedDB
→ 大量、结构化的客户端业务数据

Cache Storage
→ Request / Response 网络资源缓存
```

实际选型时，先判断：这个数据是为了**让应用记住业务状态**，还是为了**复用资源、减少重复请求并提高性能**；然后再根据数据是否需要和服务器请求关联、是否需要长期保存、是否只属于当前页面会话、数据量是否很大、是否需要结构化查询，以及保存的是业务数据还是网络资源，选择对应的存储或缓存方案。

## 3. 参考文献

[1] [Web Storage API - MDN](<https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API>)[EB/OL].

[2] [Using the Web Storage API - MDN](<https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API>)[EB/OL].

[3] [IndexedDB API - MDN](<https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API>)[EB/OL].

[4] [CacheStorage - MDN](<https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage>)[EB/OL].
