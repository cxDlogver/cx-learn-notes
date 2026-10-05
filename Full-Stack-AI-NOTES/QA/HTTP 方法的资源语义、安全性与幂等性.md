# HTTP 方法的资源语义、安全性与幂等性

## 【知识概述】

**方法表达客户端希望对资源执行的动作；安全性关注是否要求改变服务端状态，幂等性关注重复相同请求的预期效果。**

HTTP 方法最重要的不是记住“GET 查、POST 增、PUT 改、DELETE 删”这类 CRUD 对应关系，而是理解：

**HTTP Method 表达客户端希望对目标资源执行什么语义。**

这些属性来自 HTTP Semantics 标准；PATCH 的语义则由 RFC 5789 定义。[[1]](https://www.rfc-editor.org/info/rfc9110/)

表示请求删除这个目标资源的关联。[[1]](https://www.rfc-editor.org/info/rfc9110/)

**GET 表达资源获取语义；POST 表达让目标资源处理请求内容的语义。** [[1]](https://www.rfc-editor.org/info/rfc9110/)

理解这组机制，可以沿以下主线展开：

先按 GET、POST、PUT、PATCH、DELETE 等解释语义

用重复请求区分效果相同与响应相同

再讨论重试、日志等附带行为及接口实现必须遵守的约束。

HTTP 安全方法不等于传输加密或权限安全；PATCH 和 POST 的具体接口可以设计为幂等，但不能仅凭名称作保证。相关完整知识可结合 [计算机网络连接概述](<../J-计算机网络连接概述.md>) 阅读。

## 1. 机制说明与工程判断

核心要点如下：
### 【常见 HTTP 方法的语义】

- `GET`：获取目标资源当前的表示。
- `POST`：让目标资源根据请求内容执行特定处理，例如创建资源、提交表单、触发业务操作。
- `PUT`：使用请求中的内容**创建或整体替换**目标资源的状态。
- `PATCH`：对已有资源进行**部分修改**。
- `DELETE`：请求删除目标资源与其当前功能之间的关联。
- `HEAD`：语义与 GET 类似，但响应中不传输响应内容。
- `OPTIONS`：查询目标资源或服务器支持的通信选项。[[1]](https://www.rfc-editor.org/info/rfc9110/)
### 【GET 和 POST 的区别首先是“语义”】

- GET 的语义是**获取资源**。
- POST 的语义是**把请求内容交给目标资源进行处理**。
- “GET 查询、POST 提交”可以作为常见使用习惯帮助记忆，但不是 HTTP 标准对二者最根本的定义。[[1]](https://www.rfc-editor.org/info/rfc9110/)
### 【PUT 和 PATCH】

- PUT 更强调：用这份表示去**创建或整体替换目标资源状态**。
- PATCH 更强调：给服务器一组修改指令，**部分修改已有资源**。
- PUT 本身是幂等方法；PATCH 按标准定义不是天然幂等，但具体 PATCH 操作可以设计成幂等。[[1]](https://www.rfc-editor.org/info/rfc9110/)
### 【安全性 Safe】

- “安全”指方法定义的语义本质上是**只读的**，客户端没有要求服务器改变资源状态。
- GET、HEAD、OPTIONS 都属于安全方法。
- 安全不代表服务器内部绝对没有任何变化，比如记录访问日志、统计访问次数等副作用仍然可能发生。[[1]](https://www.rfc-editor.org/info/rfc9110/)
### 【幂等性 Idempotent】

- 对同一个请求执行一次和执行多次，服务器产生的**预期效果相同**，就是幂等。
- GET、HEAD、OPTIONS、PUT、DELETE 都是幂等方法。
- POST 通常不是幂等方法。
- 幂等关注的是**最终预期效果**，不是“每次响应完全一样”。[[1]](https://www.rfc-editor.org/info/rfc9110/)
### 【DELETE 为什么幂等】

- 第一次：
  ```text
  删除资源 A
  → A 不存在
  ```
- 再删除：
  ```text
  删除资源 A
  → A 仍然不存在
  ```
- 最终目标状态没有进一步改变，因此 DELETE 的语义是幂等的。
- 两次返回的状态码可以不同，但不影响幂等性的判断。[[1]](https://www.rfc-editor.org/info/rfc9110/)
### 【PATCH 的幂等性】

- PATCH 标准本身没有定义为幂等。
- 但具体操作可以设计成幂等。
- 判断的关键仍然是：**相同 PATCH 重复执行，预期结果是否与执行一次相同。** [[2]](https://www.rfc-editor.org/info/rfc5789/)
### 【HEAD】

- 相当于获取 GET 本来会返回的元数据，但不传输响应内容。
- 常用于检查资源是否存在、查看 `Content-Length`、`Last-Modified`、`ETag` 等元数据，从而避免下载完整资源。[[1]](https://www.rfc-editor.org/info/rfc9110/)
### 【OPTIONS】

- 用来查询目标资源支持什么通信能力。
- 浏览器的 CORS 预检请求会使用 OPTIONS，询问服务器是否允许接下来真正要发送的跨域方法和请求头。[[1]](https://www.rfc-editor.org/info/rfc9110/)

## 2. 完整回答与表达组织

HTTP 方法最重要的不是记住“GET 查、POST 增、PUT 改、DELETE 删”这类 CRUD 对应关系，而是理解：

> **HTTP Method 表达客户端希望对目标资源执行什么语义。**
### 【常见 HTTP 方法】

首先可以建立整体认识：

| 方法 | 核心语义 | 常见场景 | Safe | Idempotent |
|---|---|---|---|---|
| GET | 获取资源表示 | 查询数据、获取页面 | 是 | 是 |
| HEAD | 与 GET 类似，但不返回响应内容 | 获取资源元数据 | 是 | 是 |
| POST | 让资源处理请求内容 | 创建资源、提交数据、触发操作 | 否 | 否 |
| PUT | 创建或整体替换目标资源 | 整体更新资源 | 否 | 是 |
| PATCH | 对资源进行部分修改 | 修改部分字段 | 否 | 不保证 |
| DELETE | 删除目标资源的关联 | 删除资源 | 否 | 是 |
| OPTIONS | 查询通信选项 | 查询支持方法、CORS 预检 | 是 | 是 |

这些属性来自 HTTP Semantics 标准；PATCH 的语义则由 RFC 5789 定义。[[1]](https://www.rfc-editor.org/info/rfc9110/)

例如有这样一个资源：

```text
/users/1001
```

GET：

```http
GET /users/1001
```

表示：

```text
获取用户 1001 的当前表示
```

POST：

```http
POST /users
```

可能表示：

```text
把这份数据交给 /users 处理
→ 创建一个新用户
```

PUT：

```http
PUT /users/1001
```

通常表示：

```text
使用当前请求内容
整体替换 /users/1001 的资源状态
```

PATCH：

```http
PATCH /users/1001
```

可能表示：

```text
只修改用户 1001 的某些字段
```

DELETE：

```http
DELETE /users/1001
```

表示请求删除这个目标资源的关联。[[1]](https://www.rfc-editor.org/info/rfc9110/)

---
### 【GET 和 POST 最核心的区别是什么？】

可以用：

```text
GET → 查询
POST → 提交
```

帮助记忆，但不能把它当作标准定义。

更准确的是：

```text
GET
↓
请求获取目标资源当前的表示
```

而：

```text
POST
↓
把请求内容提交给目标资源
↓
让服务器按照这个资源自己的语义进行处理
```

所以 POST 不一定只是“新增数据”。

例如：

```http
POST /orders
```

可以创建订单。

但：

```http
POST /orders/1001/cancel
```

也可能是触发“取消订单”操作。

因此两者最根本的区别是：

> **GET 表达资源获取语义；POST 表达让目标资源处理请求内容的语义。** [[1]](https://www.rfc-editor.org/info/rfc9110/)

---
### 【PUT 和 PATCH 有什么区别？】

这两个方法都经常用于修改资源，但关注点不同。

PUT 更接近：

```text
原资源：

{
  "name": "Tom",
  "age": 20,
  "city": "Tokyo"
}

        ↓ PUT

{
  "name": "Jack",
  "age": 21,
  "city": "Shanghai"
}

        ↓

用新的表示替换目标资源状态
```

HTTP 标准定义 PUT 的语义就是：使用请求内容创建或替换目标资源的状态。[[1]](https://www.rfc-editor.org/info/rfc9110/)

PATCH 则更接近：

```text
原资源：

{
  "name": "Tom",
  "age": 20,
  "city": "Tokyo"
}

PATCH：

只把 age 改为 21

        ↓

{
  "name": "Tom",
  "age": 21,
  "city": "Tokyo"
}
```

所以可以记成：

```text
PUT
→ 整体创建 / 替换

PATCH
→ 部分修改
```

RFC 5789 正是因为 PUT 只有完整替换语义，而很多应用需要部分修改资源，才定义了 PATCH。[[2]](https://www.rfc-editor.org/info/rfc5789/)

---
### 【什么是安全性？】

HTTP 中的 Safe 不是：

```text
HTTPS、数据加密、没有漏洞、不会被攻击
```

这里的“安全”完全不是网络安全意义上的安全。

它指的是：

> **客户端发起这个方法时，没有要求服务器修改目标资源状态，方法的定义语义本质上是只读的。** [[1]](https://www.rfc-editor.org/info/rfc9110/)

典型的安全方法是：

```text
GET、HEAD、OPTIONS
```

比如：

```http
GET /users/1001
```

我的意图只是：

```text
把这个用户的数据给我
```

而不是：

```text
修改这个用户
```

---

但是 Safe 并不意味着：

> 服务器内部一丁点变化都不能发生。

例如执行 GET 时：

```text
GET /article/1
        ↓
服务器记录：
访问日志 +1
访问统计 +1
```

这些副作用是允许存在的。

因为 GET 的**请求语义本身**仍然是读取资源，客户端并没有请求服务器修改目标资源。

所以判断安全性看的是：

> **客户端请求的语义是否以改变服务器状态为目的。** [[1]](https://www.rfc-editor.org/info/rfc9110/)

---
### 【什么是幂等性？】

幂等的核心定义是：

> **对于相同请求，执行一次和执行多次，对服务器产生的预期效果相同。** [[1]](https://www.rfc-editor.org/info/rfc9110/)

比如 PUT：

```http
PUT /users/1001

{
  "name": "Tom"
}
```

执行一次：

```text
用户 1001
→ name = Tom
```

再执行一次：

```text
用户 1001
→ name = Tom
```

再执行十次：

```text
用户 1001
→ name = Tom
```

最终预期状态都一样：

```text
name = Tom
```

所以 PUT 是幂等的。

---
### 【DELETE 为什么也是幂等的？】

假设：

```http
DELETE /users/1001
```

第一次执行：

```text
用户存在
↓
删除
↓
用户不存在
```

第二次执行：

```text
用户已经不存在
↓
仍然不存在
```

第三次：

```text
仍然不存在
```

所以从请求的预期效果来看：

```text
执行一次
→ 资源不存在

执行十次
→ 资源还是不存在
```

因此 DELETE 是幂等的。[[1]](https://www.rfc-editor.org/info/rfc9110/)

这里有一个特别重要的地方：

> **幂等不要求每一次 HTTP 响应完全相同。**

比如第一次 DELETE 可能返回：

```text
204 No Content
```

第二次因为资源已经不存在，服务器可能返回另一种结果。

这不影响 DELETE 方法本身的幂等语义，因为资源最终都处于：

```text
不存在
```

的状态。[[1]](https://www.rfc-editor.org/info/rfc9110/)

---
### 【为什么 POST 通常不是幂等的？】

比如：

```http
POST /orders
```

请求内容：

```json
{
  "product": "Book"
}
```

执行一次：

```text
创建订单 001
```

再执行一次：

```text
又创建订单 002
```

再执行：

```text
又创建订单 003
```

于是：

```text
执行一次
→ 1 个订单

执行三次
→ 3 个订单
```

预期效果不同，所以 POST 在 HTTP 标准中不是幂等方法。[[1]](https://www.rfc-editor.org/info/rfc9110/)

不过这并不是说：

> “所有使用 POST 的业务永远不可能做成幂等。”

应用完全可以通过：

```text
幂等键、业务唯一 ID、去重机制
```

把某个具体 POST 接口设计成重复调用仍产生同一个业务效果。

但是：

> **POST 方法本身没有 HTTP 标准提供的幂等语义保证。** [[1]](https://www.rfc-editor.org/info/rfc9110/)

---
### 【PATCH 到底是不是幂等的？】

PATCH 在标准中被定义为：

> **不是天然幂等的方法。**

但是 PATCH **可以被设计成幂等操作**。[[2]](https://www.rfc-editor.org/info/rfc5789/)

比如：

```text
把 age 设置为 20
```

重复执行：

```text
20
20
20
```

结果可能保持一致。

但是：

```text
把 age 增加 1
```

第一次：

```text
20 → 21
```

第二次：

```text
21 → 22
```

第三次：

```text
22 → 23
```

这显然不幂等。

所以不要机械记成：

```text
PATCH = 一定不幂等
```

更准确的是：

> **HTTP 标准没有赋予 PATCH 幂等性保证；具体 PATCH 是否表现为幂等，要看补丁格式和操作语义。** [[2]](https://www.rfc-editor.org/info/rfc5789/)

---
### 【HEAD 和 GET 有什么关系？】

HEAD 可以理解为：

> **和 GET 获取相同资源的元数据，但不传输 GET 会返回的响应内容。** [[1]](https://www.rfc-editor.org/info/rfc9110/)

例如：

```http
GET /image.png
```

可能返回：

```text
响应头 + 5 MB 图片数据
```

而：

```http
HEAD /image.png
```

主要获得：

```text
Content-Type、Content-Length、Last-Modified、ETag、……
```

但是：

```text
不传输图片本身
```

所以如果客户端只是想知道：

```text
文件是否存在？、多大？、什么时候修改？、缓存是否可能变化？
```

就没有必要下载整个资源。

这就是 HEAD 的价值。[[1]](https://www.rfc-editor.org/info/rfc9110/)

---
### 【OPTIONS 和 CORS 预检是什么关系？】

OPTIONS 的标准语义是：

> **查询目标资源可以使用哪些通信选项或服务器能力。** [[1]](https://www.rfc-editor.org/info/rfc9110/)

例如客户端可以通过 OPTIONS 去询问目标资源支持什么通信方式。

浏览器的 CORS 又利用了 OPTIONS 的这个特点。

假设网页要跨域发起一个比较复杂的请求：

```text
https://a.com
        ↓
跨域请求
        ↓
https://api.b.com
```

浏览器在真正发送请求之前，某些情况下会先发送：

```http
OPTIONS /resource
```

其中告诉服务器：

```text
我之后准备使用什么 Method
我之后准备携带哪些请求头
```

服务器通过响应中的 CORS 相关信息告诉浏览器：

```text
是否允许这个 Origin、是否允许这个 Method、是否允许这些 Headers
```

如果预检通过：

```text
OPTIONS 预检
    ↓
允许
    ↓
发送真正的跨域请求
```

如果预检失败：

```text
OPTIONS 预检
    ↓
不允许
    ↓
浏览器不会按该 CORS 请求继续完成实际跨域访问
```

WHATWG Fetch Standard 明确定义 CORS preflight 使用 `OPTIONS` 方法，并通过 `Access-Control-Request-Method` 和可选的 `Access-Control-Request-Headers` 告知服务器后续请求计划使用的方法和请求头。[[3]](https://fetch.spec.whatwg.org/)

---

所以这一题最重要的是把 **Safe 和 Idempotent 分开**：

```text
Safe
↓
关注“这个请求是不是以修改服务器状态为目的”

Idempotent
↓
关注“同一个请求重复执行，预期效果是否与执行一次相同”
```

二者关系可以记成：

```text
GET
→ Safe
→ Idempotent

HEAD
→ Safe
→ Idempotent

OPTIONS
→ Safe
→ Idempotent

PUT
→ 不 Safe
→ Idempotent

DELETE
→ 不 Safe
→ Idempotent

POST
→ 不 Safe
→ 不保证 Idempotent

PATCH
→ 不 Safe
→ 不保证 Idempotent
```

最终面试时可以收敛成：

> **HTTP 方法表达客户端希望对目标资源执行的操作语义。GET 用于获取资源表示；POST 用于让目标资源处理请求内容；PUT 用请求内容创建或整体替换目标资源；PATCH 用于部分修改；DELETE 请求删除目标资源；HEAD 与 GET 语义类似但不传输响应内容；OPTIONS 用于查询通信能力。Safe 表示方法本身的定义语义基本只读，GET、HEAD、OPTIONS 属于安全方法；Idempotent 表示相同请求执行多次与执行一次具有相同的预期效果，因此 GET、HEAD、OPTIONS、PUT、DELETE 都是幂等的。POST 不提供幂等保证，PATCH 也不是天然幂等，但具体应用可以把它们设计成幂等操作。** [[1]](https://www.rfc-editor.org/info/rfc9110/)

## 3. 参考文献

[1] [RFC 9110: HTTP Semantics | RFC Editor](<https://www.rfc-editor.org/info/rfc9110/>)[EB/OL].

[2] [RFC 编辑器](<https://www.rfc-editor.org/info/rfc5789/>)[EB/OL].

[3] [Fetch Standard](<https://fetch.spec.whatwg.org/>)[EB/OL].
