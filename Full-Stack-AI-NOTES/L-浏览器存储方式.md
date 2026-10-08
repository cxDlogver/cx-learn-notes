从工程视角看，浏览器存储主要分为四类：协议级存储 Cookie、页面级状态存储 Web Storage、本地数据层 IndexedDB，以及网络缓存层 Cache API。

Cookie 是 HTTP 协议级存储机制，主要用于会话保持和身份识别，最大特点是会在满足条件时自动随请求发送给服务器，并支持 HttpOnly、Secure、SameSite 等安全属性，因此非常适合存放 Session ID 等高安全信息，但不适合存储业务数据。

localStorage 和 sessionStorage 属于 Web Storage，用于在前端持久化保存少量状态数据，不参与 HTTP 请求。二者区别在于生命周期：localStorage 是持久化的、同源多标签共享；sessionStorage 只在当前标签页有效。它们都是同步 API，适合存储用户偏好或页面中间态，但不适合高频、大数据或安全敏感信息。

IndexedDB 是浏览器内置的本地数据库，支持异步 API、对象存储、索引和事务，能够存储大规模结构化数据。所有读写操作必须在事务中完成，通过原子提交和自动回滚保证数据一致性，因此 IndexedDB 通常作为前端的数据层，用于离线应用、大数据缓存或实时系统的数据缓冲。

Cache API 是用于缓存 HTTP 请求与响应的存储机制，通常与 Service Worker 配合使用，主要解决静态资源缓存、接口响应缓存、离线访问和首屏性能优化等问题。它缓存的是 Request-Response，而不是业务对象，与 IndexedDB 的职责是明确区分的。

总体来说，浏览器存储并不是相互替代关系，而是协议层、状态层、数据层和网络层各司其职，在实际工程中往往需要组合使用。

<!--more-->

## 浏览器存储方式

但随着 Web 应用形态从“页面文档”演进为“富客户端应用（Rich Web App）”，浏览器开始承担以下职责：

- 保存用户会话状态
- 缓存用户配置与偏好
- 支持离线访问与断网恢复
- 本地持久化大量结构化数据
- 优化网络性能与资源加载效率

单一的存储方案无法同时满足 **安全性、容量、性能、生命周期、网络参与度** 等多维约束，因此浏览器逐步形成了**分层、分工明确的存储体系**。

### 1. 浏览器存储的整体分层视角

从工程视角看，浏览器存储可以划分为四个层次：

1. **协议级存储（HTTP 层）**
    Cookie
2. **页面级状态存储（Web Storage）**
    localStorage / sessionStorage
3. **本地数据层存储（Client-side Database）**
    IndexedDB
4. **网络资源缓存层（Network Cache）**
    Cache Storage（Service Worker）

理解这一分层，是后续所有选型与设计的前提。

| 维度               | Cookie                               | localStorage     | sessionStorage  | IndexedDB          | Cache Storage          |
| ------------------ | ------------------------------------ | ---------------- | --------------- | ------------------ | ---------------------- |
| 所属层级           | HTTP 协议层                          | Web Storage      | Web Storage     | 本地数据库层       | 网络缓存层             |
| 设计初衷           | 会话保持 / 身份识别                  | 持久化前端状态   | 页面会话状态    | 本地结构化数据存储 | HTTP 响应缓存          |
| 是否随请求发送     | 是（自动）                           | 否               | 否              | 否                 | 否（由 SW 控制）       |
| 生命周期           | 会话 / 持久（可配置）                | 永久（手动清除） | 页面生命周期    | 永久（可管理）     | 由缓存策略控制         |
| 作用域             | 同源 + Path / Domain                 | 同源             | 同源 + 单标签页 | 同源               | 同源                   |
| 存储容量           | 极小（≈4KB/条）                      | 小（≈5–10MB）    | 小（≈5MB）      | 大（几十 MB 以上） | 不固定（依浏览器策略） |
| 数据结构           | 字符串                               | 字符串           | 字符串          | 对象 / 索引 / Blob | Request → Response     |
| API 特性           | 自动读写（HTTP）                     | 同步             | 同步            | 异步               | 异步                   |
| 是否阻塞主线程     | 否                                   | 是               | 是              | 否                 | 否                     |
| 安全控制能力       | 很强（HttpOnly / Secure / SameSite） | 无内建安全       | 无内建安全      | 同源隔离           | 同源 + SW              |
| XSS 风险           | 低（HttpOnly）                       | 高               | 高              | 中                 | 低                     |
| 是否适合业务数据   | 否                                   | 少量             | 临时            | 是                 | 否                     |
| 典型使用场景       | 登录态、Session、鉴权                | 用户配置、偏好   | 表单中间态      | 离线数据、大缓存   | 离线资源、接口缓存     |
| 是否推荐新项目使用 | 必须（合理配置）                     | 适度             | 适度            | 强烈推荐           | 强烈推荐               |

### 1. Cookie存储

> Cookie 是一种 HTTP 协议级存储机制，主要用于在无状态的 HTTP 请求之间维持会话和身份信息。它的最大特点是会在满足条件时自动随同源请求发送给服务器。Cookie 支持 HttpOnly、Secure、SameSite 等安全属性，因此非常适合存放 Session ID 等高安全要求的信息。相比 localStorage，Cookie 容量小、但安全性和协议参与度更高，主要用于登录态和服务端身份识别，而不适合存储业务数据。

#### 【什么是 Cookie（定义）】

**Cookie 是浏览器提供的一种 HTTP 协议级存储机制**，用于在**无状态的 HTTP 协议之上维持客户端与服务器之间的会话状态**。

其核心特征是：

- Cookie 由浏览器统一管理
- Cookie 会在满足条件时 **自动随同源 HTTP 请求发送到服务器**
- Cookie 是**协议的一部分，而不是普通前端存储**

#### 【Cookie 的核心作用】

Cookie 主要用于解决以下问题：

1. **身份识别（Authentication）**
2. **会话保持（Session Management）**
3. **安全控制（CSRF / 风控）**
4. **服务端无状态架构下的客户端标识**

一句话总结：

> Cookie 的本质作用是 **让服务器在多次请求中“识别同一个客户端”**

#### 【Cookie 的工作机制】

1. 设置阶段

- 服务端通过 `Set-Cookie` 响应头下发 Cookie

```
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Lax
```

2. 存储阶段

- 浏览器按 **Domain / Path / Secure / SameSite** 等规则保存 Cookie

3. 发送阶段

- 浏览器在后续请求中 **自动携带匹配的 Cookie**

```
Cookie: sessionId=abc123
```

**关键点**：

- 前端 JS 不需要（也无法）手动控制发送
- 是否发送由浏览器与 Cookie 属性共同决定

#### 【Cookie 的关键属性】

1. 生命周期控制

- `Expires` / `Max-Age`
  - 不设置：会话 Cookie（关闭浏览器失效）
  - 设置：持久 Cookie（到期才失效）

2. 作用域控制

- `Domain`：允许子域共享
- `Path`：限制请求路径

3. 安全相关属性（重点）

`HttpOnly`

- 禁止 JavaScript 访问
- 防止 XSS 窃取 Cookie

`Secure`

- 仅在 HTTPS 请求中携带
- 防止明文传输泄露

`SameSite`

- 控制跨站请求是否携带 Cookie
- 用于防御 CSRF
  - `Strict`：完全禁止跨站
  - `Lax`：默认推荐，安全与可用性平衡
  - `None`：允许跨站（必须配合 `Secure`）

#### 【Cookie 的安全特性与风险】

安全优势

- 支持 HttpOnly，JS 无法读取
- 支持 SameSite，防 CSRF
- 支持 Secure，防中间人攻击

安全风险

- 若 SameSite 配置不当，可能引发 CSRF
- 若未开启 Secure，可能被明文窃听
- 若 Domain / Path 配置过宽，可能被滥用

**工程结论**：

> Cookie 是目前 **唯一具备完整安全控制能力的浏览器存储机制**

### 2. localStorage / sessionStorage

> localStorage 和 sessionStorage 是浏览器提供的 Web Storage 机制，用于在客户端持久化保存前端状态数据，不会参与 HTTP 请求。二者的主要区别在于生命周期：localStorage 是持久化的，在同源下多个标签页共享；sessionStorage 只在当前标签页有效，关闭页面即失效。它们都是同步 API，只适合存储少量、非敏感的前端状态数据，不适合存储高安全信息。

#### 【基础概念】

localStorage 和 sessionStorage 是浏览器提供的 **Web Storage 机制**，用于在**不参与 HTTP 协议的前提下**，在客户端持久化保存前端状态数据。它们本质上是 **基于同源策略的 Key-Value 存储**。

一句话总结：

> Web Storage 是 **纯前端侧的状态存储方案**。

二者的核心区别（一句话必答）

localStorage 是 **持久化存储**，关闭浏览器仍然存在；

sessionStorage 是 **会话级存储**，仅在当前标签页生命周期内有效。

#### 【共同特性】

localStorage 和 sessionStorage 具有以下共同点：

1. **同源限制**
   - 协议 + 域名 + 端口一致才能访问
2. **Key-Value 存储**
   - 只能存字符串（对象需序列化）
3. **不参与 HTTP 请求**
   - 不会自动随请求发送到服务器
4. **同步 API**
   - 读写会阻塞主线程
5. **前端可直接访问**
   - 可被 JavaScript 读写

#### 【localStorage 关键点】

1. 生命周期

localStorage 的生命周期是 **长期的**：

- 页面刷新不会清除
- 关闭浏览器不会清除
- 仅在手动清除或被浏览器策略回收时失效

2. 作用范围

localStorage 在 **同源下的所有标签页共享**。

3. 典型使用场景

- 用户偏好设置（主题、语言）
- 本地缓存的前端配置
- 页面刷新后仍需保留的状态
- token值

4. 不适合的场景

- 高频读写的数据
- 大对象或大数组

5. 核心风险

localStorage 的主要风险在于：

- **同步阻塞主线程**
- **XSS 攻击可直接读取**
- **缺乏任何安全控制属性**

#### 【sessionStorage 关键点】

1. 生命周期

sessionStorage 的生命周期绑定 **单个浏览器标签页**：

- 页面刷新仍然存在
- 标签页关闭即被销毁
- 新开标签页不会共享

2. 作用范围

sessionStorage **仅在当前标签页内有效**，不同标签页相互隔离。

3. 典型使用场景

- 多步骤表单的中间状态
- 页面跳转过程中的临时数据
- 不希望跨页面、跨会话保留的状态
- 一个页面的临时数据缓存

4. 工程定位总结

sessionStorage 更适合作为**“页面生命周期内的临时状态容器”**。

#### 【安全性分析】

Web Storage 的安全特性较弱：

- 无 HttpOnly，JS 可直接访问
- 无 Secure / SameSite
- 一旦发生 XSS，数据可能全部泄露

工程结论：

> Web Storage **不适合存储任何高安全敏感信息**。

### 3. IndexedDB

> IndexedDB 是浏览器内置的本地数据库，采用对象存储模型，支持异步 API、索引和事务，主要用于在前端存储大规模、结构化的数据。
>  在 IndexedDB 中，所有读写操作都必须在事务中完成，事务是数据操作的最小安全执行单元，用来保证一组操作要么全部成功、要么全部失败，从而避免数据处于中间不一致状态。
>
> 事务在创建时指定作用的对象仓库和访问模式（readonly 或 readwrite），在事务内可以执行多次读写请求，最终以 `oncomplete` 作为真正提交成功的标志；如果过程中发生错误，事务会自动回滚。因此，IndexedDB 通过“异步 + 索引 + 事务”的组合，承担了前端应用中的本地数据层角色，常用于离线应用、大数据缓存和实时系统的数据缓冲。

#### 【为什么会有 IndexedDB】

在真正的工程场景中，前端很快会遇到以下问题：

1. localStorage / sessionStorage **容量小**
2. Web Storage **同步 API，会阻塞主线程**
3. 只能存字符串，**无法高效处理结构化数据**
4. 不支持索引、查询、事务
5. 无法承担“前端数据层”的角色

当 Web 应用开始具备以下特征时，**Web Storage 已经不够用**：

- 数据量达到 MB 级甚至更高
- 需要保存列表、对象、日志、历史记录
- 需要离线能力（断网仍可使用）
- 不允许阻塞 UI 渲染

**IndexedDB 正是为解决这些问题而设计的。**

> **ndexedDB 是浏览器内置的、基于对象存储的本地数据库系统，提供异步 API、事务机制、索引查询和大容量持久化能力。**

工程上可以直接理解为：

> IndexedDB 是浏览器中**唯一能够承担“前端数据层”角色的存储机制**，用于存储**大规模、结构化、需要异步处理的数据**。

IndexedDB 是**唯一**适合承担以下职责的浏览器存储方案：

- 大规模
- 结构化
- 异步
- 可查询
- 可事务

#### 【IndexedDB核心设计】

##### 异步 API

IndexedDB 的所有操作都是**异步的**：

- 不阻塞主线程
- 不影响页面渲染
- 适合大数据操作

这与 localStorage 的**同步阻塞模型**形成根本区别。

工程意义：

IndexedDB 可以在前端安全地处理“真正的数据量”。

##### 对象存储（不是 Key-Value）

IndexedDB 存的不是简单字符串，而是**JavaScript 对象**。

```js
{
  id: 1,
  name: "Alice",
  age: 25,
  tags: ["admin", "editor"]
}
```

- 不需要 JSON 序列化
- 支持嵌套对象
- 支持数组、Blob、ArrayBuffer

##### 索引（Index）

IndexedDB 支持为对象字段建立索引：

- 单字段索引
- 唯一索引
- 多字段（组合）索引

什么字段建立索引表是用户自己决定的，索引的意义是：

> **不必全表扫描，也能快速查询数据**

这是 Web Storage 完全不具备的能力。

------

##### 事务（Transaction）

IndexedDB 的所有读写都必须在**事务中进行**：

- 原子性
- 一致性
- 失败可回滚

工程上这意味着：

> 前端也具备“数据库级别的数据一致性保障”。

------

##### 同源隔离

IndexedDB 严格遵循同源策略：

- 不同域名之间完全隔离
- 提供浏览器级安全边界

#### 【IndexedDB事务】

```javascript
/**
 * IndexedDB 生命周期流程演示（展开版）
 *
 * 你需要先理解两条规则：
 * 1) 数据库结构（建 store / 建索引）只能在 onupgradeneeded 里做
 * 2) 任何读写必须在 transaction（事务）里做；事务会自动提交或回滚
 *
 * 运行方式：
 * - 打开页面 DevTools Console
 * - 复制粘贴运行
 */

const DB_NAME = "demo_db_lifecycle";
const DB_VERSION = 1;
const STORE = "users";

// -------------------------
// 0. 打开数据库（整个流程入口）
// -------------------------
function openDBWithLifecycleLogs() {
  return new Promise((resolve, reject) => {
    console.log("[0] 调用 indexedDB.open(name, version) 发起打开请求");
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    // A) 第一次创建数据库 或 版本号变大时，会进入“升级生命周期”
    req.onupgradeneeded = (event) => {
      console.log("[A] onupgradeneeded 触发：进入数据库升级/初始化阶段");
      const db = event.target.result;

      // 只能在这里做“结构性变更”
      // 建对象仓库（相当于建表）
      if (!db.objectStoreNames.contains(STORE)) {
        console.log("    - 创建 ObjectStore:", STORE);
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });

        console.log("    - 创建索引: email_idx (unique)");
        store.createIndex("email_idx", "email", { unique: true });

        console.log("    - 创建索引: name_idx (non-unique)");
        store.createIndex("name_idx", "name", { unique: false });
      }

      // 注意：onupgradeneeded 并不等于打开成功
      // 升级完成后，还会继续走 onsuccess
      console.log("[A] 升级阶段结构定义完成（尚未 onsuccess）");
    };

    // B) 打开成功：拿到 db 连接句柄
    req.onsuccess = () => {
      const db = req.result;
      console.log("[B] onsuccess 触发：数据库连接已打开，获得 db 句柄");

      // 可选：监听版本变化（例如另一个标签页升级了 DB）
      db.onversionchange = () => {
        console.log("[B-1] onversionchange：检测到版本变化，应 close 以允许升级");
        db.close();
      };

      resolve(db);
    };

    req.onerror = () => {
      console.log("[E] onerror：打开数据库失败", req.error);
      reject(req.error);
    };

    req.onblocked = () => {
      // 常见于：旧连接未关闭，导致升级被阻塞
      console.log("[E] onblocked：升级被阻塞，可能有其他页面/连接未关闭");
    };
  });
}

// -------------------------
// 1. 一个“事务”的完整生命周期（readwrite）
// -------------------------
function addUserWithTxLifecycle(db, user) {
  return new Promise((resolve, reject) => {
    console.log("\n[1] 准备写入：创建 readwrite 事务");
    const tx = db.transaction(STORE, "readwrite"); // 事务开始（开始于此）
    const store = tx.objectStore(STORE);

    // 事务生命周期事件
    tx.oncomplete = () => {
      console.log("[1-C] tx.oncomplete：事务成功提交（所有写入/索引更新/落盘完成）");
      resolve();
    };
    tx.onerror = () => {
      console.log("[1-E] tx.onerror：事务失败（将回滚）", tx.error);
      reject(tx.error || new Error("tx failed"));
    };
    tx.onabort = () => {
      console.log("[1-A] tx.onabort：事务被中止（回滚完成）", tx.error);
      reject(tx.error || new Error("tx aborted"));
    };

    console.log("[1-2] 在事务内发起 store.add 请求（这只是‘发请求’，不是立刻完成）");
    const req = store.add(user);

    // 请求生命周期事件
    req.onsuccess = () => {
      console.log("[1-3] add.onsuccess：单条写入请求成功，生成主键 id =", req.result);
      // 注意：此时仍然不代表事务提交完成
      // 事务可能还在更新索引、写入磁盘等
    };
    req.onerror = () => {
      console.log("[1-4] add.onerror：单条写入请求失败", req.error);
      // 这里失败会导致整个事务失败 -> tx.onerror/tx.onabort
      // 典型原因：unique 索引冲突（email 重复）
    };

    console.log("[1-5] 函数末尾：等待事务进入 complete 或 error/abort");
  });
}

// -------------------------
// 2. 读事务（readonly）的生命周期
// -------------------------
function getByEmailWithTxLifecycle(db, email) {
  return new Promise((resolve, reject) => {
    console.log("\n[2] 准备查询：创建 readonly 事务");
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("email_idx");

    tx.oncomplete = () => {
      console.log("[2-C] tx.oncomplete：读事务结束");
    };
    tx.onerror = () => {
      console.log("[2-E] tx.onerror：读事务失败", tx.error);
      reject(tx.error || new Error("tx failed"));
    };
    tx.onabort = () => {
      console.log("[2-A] tx.onabort：读事务中止", tx.error);
      reject(tx.error || new Error("tx aborted"));
    };

    console.log("[2-2] 在事务内发起 index.get(email) 请求");
    const req = index.get(email);

    req.onsuccess = () => {
      console.log("[2-3] get.onsuccess：查到结果 =", req.result || null);
      resolve(req.result || null);
    };
    req.onerror = () => {
      console.log("[2-4] get.onerror：查询失败", req.error);
      reject(req.error);
    };
  });
}

// -------------------------
// 3. 更新（put）与删除（delete）示例（同理）
// -------------------------
function updateUserWithTxLifecycle(db, user) {
  return new Promise((resolve, reject) => {
    console.log("\n[3] 准备更新：创建 readwrite 事务");
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    tx.oncomplete = () => {
      console.log("[3-C] tx.oncomplete：更新事务提交完成");
      resolve();
    };
    tx.onerror = () => {
      console.log("[3-E] tx.onerror：更新事务失败（回滚）", tx.error);
      reject(tx.error);
    };
    tx.onabort = () => {
      console.log("[3-A] tx.onabort：更新事务中止（回滚完成）", tx.error);
      reject(tx.error);
    };

    console.log("[3-2] 发起 store.put(user) 请求（有则更新，无则新增）");
    const req = store.put(user);

    req.onsuccess = () => {
      console.log("[3-3] put.onsuccess：单条 put 请求成功");
    };
    req.onerror = () => {
      console.log("[3-4] put.onerror：单条 put 请求失败", req.error);
    };
  });
}

function deleteUserWithTxLifecycle(db, id) {
  return new Promise((resolve, reject) => {
    console.log("\n[4] 准备删除：创建 readwrite 事务");
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    tx.oncomplete = () => {
      console.log("[4-C] tx.oncomplete：删除事务提交完成");
      resolve();
    };
    tx.onerror = () => {
      console.log("[4-E] tx.onerror：删除事务失败（回滚）", tx.error);
      reject(tx.error);
    };
    tx.onabort = () => {
      console.log("[4-A] tx.onabort：删除事务中止（回滚完成）", tx.error);
      reject(tx.error);
    };

    console.log("[4-2] 发起 store.delete(id) 请求");
    const req = store.delete(id);

    req.onsuccess = () => {
      console.log("[4-3] delete.onsuccess：单条 delete 请求成功");
    };
    req.onerror = () => {
      console.log("[4-4] delete.onerror：单条 delete 请求失败", req.error);
    };
  });
}

// -------------------------
// 5. 把整个生命周期串起来跑一遍
// -------------------------
(async function runLifecycleDemo() {
  // 打开数据库：可能经历 onupgradeneeded -> onsuccess
  const db = await openDBWithLifecycleLogs();

  // 第一次写入：事务生命周期（readwrite）
  await addUserWithTxLifecycle(db, { name: "Alice", email: "alice@example.com", age: 25 });

  // 再写一条
  await addUserWithTxLifecycle(db, { name: "Bob", email: "bob@example.com", age: 30 });

  // 查询：读事务生命周期（readonly）
  const bob = await getByEmailWithTxLifecycle(db, "bob@example.com");

  // 更新：put（仍然是事务）
  bob.age = 31;
  await updateUserWithTxLifecycle(db, bob);

  // 删除：delete（仍然是事务）
  // 这里为了演示，删 Alice（主键一般是 1，但增强健壮性应先查）
  const alice = await getByEmailWithTxLifecycle(db, "alice@example.com");
  if (alice) await deleteUserWithTxLifecycle(db, alice.id);

  console.log("\n[Done] 全流程结束，关闭 db");
  db.close();
})();

```

把上面流程理解成两段“生命周期”就够了：第一段是数据库连接生命周期，调用 `indexedDB.open()` 后，如果是首次创建或版本升级会先触发 `onupgradeneeded`，在这个阶段只能做结构定义（建对象仓库、建索引），结构定义结束后并不代表可用，最终一定会进入 `onsuccess` 才算拿到 `db` 连接句柄，才可以开始读写；第二段是事务生命周期，每一次读或写都会先创建事务 `db.transaction(storeName, mode)`，这一步就意味着事务开始了，随后你在事务里发起一个或多个请求（add/put/get/delete 或索引查询），单个请求成功只代表该请求成功，不代表事务已提交，事务最终以 `tx.oncomplete` 作为“真正提交成功”的标志；如果过程中任何请求失败（比如 unique 索引冲突、空间不足、权限问题），事务会进入 `tx.onerror` 或 `tx.onabort`，并回滚整个事务内的改动，从而保证不会出现“写了一半导致数据和索引不一致”的中间态。这就是事务存在的核心意义：把一组读写和索引维护、落盘过程绑定成一个不可分割的安全单元。

### 4. Cache API

Cache Storage 的 Request/Response 存储模型与浏览器 HTTP Cache 的自动 Cache-Control 新鲜度管理不同。HTTP Cache 的浏览器、CDN 与 Web 服务器层级及过期验证机制，见 [HTTP 缓存机制知识体系](./H-HTTP缓存机制知识体系.md)；Service Worker 请求拦截、Cache First / Network First 和离线实践另见 [资源优化实战](./Z-资源优化实战.md)。


> Cache API 是浏览器提供的用于缓存 HTTP 请求与响应的存储机制，通常与 Service Worker 配合使用。它以 Request 为 key、Response 为值，用于实现离线访问、资源预缓存和网络性能优化。Cache API 不适合存储业务数据，而是专门用于缓存网络结果，开发者需要自行控制缓存策略和更新时机。在工程中，Cache API 主要用于静态资源和接口响应的缓存，与 IndexedDB 这种本地数据存储方案职责不同。

#### 【什么是Cache API】

> **Cache API（Cache Storage）是浏览器提供的一种用于存储 HTTP 请求与响应（Request → Response）的缓存机制**，主要配合 **Service Worker** 使用，用于实现离线访问、资源缓存和网络性能优化。

一句话理解：

> Cache API 不是“存数据”，而是**缓存网络请求结果**。

#### 【Cache API 的核心作用】

Cache API 主要解决三个问题：

1. **离线访问**
   - 无网络时仍能返回缓存的资源或接口响应
2. **网络性能优化**
   - 减少重复请求
   - 加快资源加载速度
3. **请求控制**
   - 前端可以决定：是用缓存、走网络，还是两者结合

#### 【Cache API 的工作机制】

Cache API 的基本逻辑是：

1. **拦截请求（通常由 Service Worker 完成）**
2. **根据策略查找 Cache**
3. **命中则直接返回 Response**
4. **未命中则走网络，并可选择写入 Cache**

核心点在于：

> Cache API 存的是 **完整的 HTTP Response 对象**， 而不是普通的 JS 数据。

#### 【Cache API 的关键特性】

##### 1. 面向 Request / Response

- 缓存单位是一次 HTTP 请求的完整响应
- 不适合存业务对象或状态数据

##### 2. 异步 API

- 不阻塞主线程
- 适合处理大资源或批量缓存

##### 3. 不自动失效

- Cache API **不遵循 HTTP 缓存头**
- 是否更新、何时删除，**完全由开发者控制**

##### 4. 通常由 Service Worker 管理

- 在页面 JS 中也可用
- 但真正发挥价值必须结合 SW 的 `fetch` 拦截

#### 【Cache API 的典型缓存策略】

1. Cache First（缓存优先）

- 先查缓存
- 缓存没有再请求网络
- 适合：静态资源

2. Network First（网络优先）

- 先请求网络
- 失败再用缓存
- 适合：数据接口

#### 【Cache API 的基本使用模型】

1. 打开一个缓存空间

```js
caches.open("v1");
```

2. 向缓存中写入请求响应

```js
cache.put(request, response);
```

3. 从缓存中读取

```js
caches.match(request);
```

4. 删除旧缓存

```js
caches.delete("v0");
```

你可以把它理解为：

> **一个由浏览器维护的、以 Request 为 key 的 Response Map**

#### 【Cache API 应用】

| 场景     | Cache API 解决的核心问题 |
| -------- | ------------------------ |
| 静态资源 | 减少重复下载             |
| 接口缓存 | 减少重复请求             |
| 离线应用 | 断网仍可用               |
| 首屏优化 | 加快首次可见             |

在静态资源场景中，一个典型例子是前端项目构建后生成的 `index.html`、`app.js`、`vendor.js`、`main.css` 以及站点中的图片和字体文件。这些资源在一次版本发布周期内对所有用户都是相同的，如果每次页面刷新都重新从服务器下载，会浪费带宽并拉长白屏时间。使用 Cache API 后，这些文件在首次访问时被缓存，后续刷新或再次访问时浏览器可以直接从本地缓存中读取，从而避免重复下载，大幅提升加载速度和稳定性。

在接口响应缓存场景中，一个常见例子是首页的只读数据接口，例如 `GET /api/articles?page=1` 或 `GET /api/config`。这些接口在短时间内返回的数据基本不变，但用户可能频繁刷新页面或多次进入同一页面。如果不做缓存，每次都会发起网络请求，既增加接口压力，也在弱网情况下影响体验。通过 Cache API 缓存这些 GET 请求的响应结果，后续访问可以直接返回缓存数据，在网络失败时仍能展示上一次成功获取的内容，从而减少重复请求并提高页面响应速度。

在离线应用场景中，一个典型例子是巡检系统或移动端 Web 应用，用户可能在地铁、电梯或网络不稳定的环境中打开页面。没有缓存时，一旦断网，HTML、JS 或接口请求失败，页面将无法加载或直接报错。通过 Service Worker 配合 Cache API，将页面骨架资源和关键接口响应提前缓存，即使在完全断网的情况下，应用仍然可以正常打开并展示已有数据，实现“断网可用”的基础体验。

在首屏性能优化场景中，一个常见例子是用户第二次打开一个内容型网站或后台管理系统。首屏渲染依赖的 HTML、核心 JS 和 CSS 如果每次都等待网络返回，会直接拖慢首次内容绘制时间。借助 Cache API，这些首屏关键资源可以在本地直接命中缓存，页面几乎立即开始渲染，显著缩短白屏时间和首屏可见时间，从而提升用户对“页面很快”的主观感受。
