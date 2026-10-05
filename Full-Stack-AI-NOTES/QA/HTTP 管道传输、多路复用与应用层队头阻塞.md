# HTTP 管道传输、多路复用与应用层队头阻塞

## 【知识概述】

**持久连接解决连接复用，HTTP/1.1 管道传输仍受响应顺序限制，HTTP/2 用流和帧交错传输减少 HTTP 层的相互等待。**

HTTP/1.1 的持久连接、管道传输和 HTTP/2 的多路复用，是 HTTP 为了提高一个连接中多个请求的传输效率而逐步演进出来的机制。

也就是说，**多个 HTTP 请求可以共用同一个 TCP 连接**。

**前一个请求的响应没有返回时，后续请求能不能先发送出去的问题。**

HTTP/1.1 并没有像 HTTP/2 那样给每一个请求建立独立的 Stream ID。

**HTTP/1.1 Pipelining 的应用层队头阻塞。**

理解这组机制，可以沿以下主线展开：

先用顺序请求说明连接复用不等于并发响应

再解释管道请求为何仍要按序返回完整响应

引入流标识和帧，说明 HTTP/2 如何交错承载多个请求响应。

HTTP/2 仍建立在 TCP 有序字节流之上，解决 HTTP 层队头阻塞不等于消除传输层等待。相关完整知识可结合 [浏览器网络面试题](<../L-浏览器网络面试题.md>) 阅读。

## 1. 机制说明与工程判断

核心要点如下：
### 【持久连接】

- HTTP/1.1 可以让多个 HTTP 请求复用同一个 TCP 连接。
- 不必每完成一次请求就关闭 TCP，再为下一次请求重新建立连接。
- 持久连接解决的核心问题是**减少 TCP 连接反复建立和关闭的开销**。
### 【HTTP/1.1 管道传输】

- 在同一个 TCP 连接上，客户端不需要等待前一个响应返回，就可以继续发送后续请求。
- 例如：
  ```text
  Request A
  Request B
  Request C
  ```
  可以连续发送，而不必变成：
  ```text
  Request A → Response A
  Request B → Response B
  Request C → Response C
  ```
### 【为什么响应必须按请求顺序返回】

- HTTP/1.1 同一连接中的请求/响应没有 HTTP/2 Stream ID 这样的独立标识机制。
- 客户端主要依靠响应出现的顺序，将响应与请求一一对应：
  ```text
  第1个响应 → Request A
  第2个响应 → Request B
  第3个响应 → Request C
  ```
- 因此即使服务器内部先处理完 Request B，也不能先把 Response B 发出去，否则客户端无法按照 HTTP/1.1 的规则正确匹配请求和响应。
### 【HTTP/1.1 队头阻塞】

- 如果 Request A 很慢，而 B、C 很快：
  ```text
  A：5s
  B：100ms
  C：200ms
  ```
- 即使 B、C 已处理完成，因为 Response A 还没有返回，Response B、C 仍然要等待。
- 这就是 HTTP/1.1 Pipelining 的**应用层队头阻塞**。
### 【HTTP/2 多路复用】

- HTTP/2 在一个 TCP 连接中建立多个独立的逻辑 **Stream**。
- 每个请求/响应属于自己的 Stream。
- HTTP 消息进一步被拆成多个 **Frame**。
- 每个 Frame 带有 Stream ID，接收方可以知道它属于哪个请求。
- 因此不同 Stream 的 Frame 可以交错传输：
  ```text
  A1 → B1 → C1 → A2 → B2 → C2
  ```
- B 不需要等待整个 A 响应完成以后才能继续传输。
### 【HTTP/2 解决了什么】

- 它解决了 HTTP/1.1 中因为响应必须严格按顺序返回而产生的**HTTP 层队头阻塞**。
- 但 HTTP/2 仍然运行在 TCP 上。
- TCP 本身要求可靠、有序交付，因此发生 TCP 丢包时仍可能产生**TCP 层队头阻塞**。
- 所以不能说 HTTP/2 消灭了所有队头阻塞。
### 【三者关系】

```text
持久连接
→ 一个 TCP 连接可以处理多个 HTTP 请求

管道传输
→ 一个 TCP 连接上可以连续发送多个 HTTP/1.1 请求
→ 但响应仍必须按顺序返回

HTTP/2 多路复用
→ 一个 TCP 连接中建立多个 Stream
→ 每个请求/响应有自己的 Stream
→ Frame 可以交错传输
→ 不再要求整个 Response A 完成后才能发送 Response B
```

## 2. 完整回答与表达组织

HTTP/1.1 的持久连接、管道传输和 HTTP/2 的多路复用，是 HTTP 为了提高一个连接中多个请求的传输效率而逐步演进出来的机制。
### 【HTTP/1.1 持久连接和管道传输】

首先是**持久连接**。

如果每发送一个 HTTP 请求都要重新建立 TCP：

```text
建立 TCP
→ Request A
→ Response A
→ 关闭 TCP

重新建立 TCP
→ Request B
→ Response B
→ 关闭 TCP
```

那么会重复产生 TCP 建连和关闭的开销。

HTTP/1.1 使用持久连接后，可以变成：

```text
建立一次 TCP
      ↓
Request A / Response A
      ↓
Request B / Response B
      ↓
Request C / Response C
      ↓
最终关闭 TCP
```

也就是说，**多个 HTTP 请求可以共用同一个 TCP 连接**。

但是仅有持久连接时，请求仍然可以按照：

```text
Request A
   ↓
等待 Response A
   ↓
Request B
```

这种串行方式工作。

HTTP/1.1 的 Pipelining 进一步允许客户端：

```text
Request A ─────→
Request B ─────→
Request C ─────→
```

不需要等 Response A 返回，就继续发送 B、C。

因此管道传输解决的是：

> **前一个请求的响应没有返回时，后续请求能不能先发送出去的问题。**

---
### 【为什么 HTTP/1.1 仍然会发生队头阻塞？】

虽然客户端可以连续发送：

```text
Request A、Request B、Request C
```

但是服务器返回响应时仍然必须保持：

```text
Response A、Response B、Response C
```

的对应顺序。

为什么？

核心原因在于 HTTP/1.1 的请求和响应匹配方式。

假设客户端发送：

```text
1. GET /a
2. GET /b
3. GET /c
```

HTTP/1.1 并没有像 HTTP/2 那样给每一个请求建立独立的 Stream ID。

也就是说，不存在这种机制：

```text
Request A → ID=1
Request B → ID=2
Request C → ID=3
```

然后响应再明确告诉客户端：

```text
Response → ID=2
```

所以客户端需要依靠**响应顺序**完成请求和响应之间的匹配：

```text
第1个响应
→ 第1个未完成请求 A

第2个响应
→ 第2个未完成请求 B

第3个响应
→ 第3个未完成请求 C
```

假设服务器处理速度是：

```text
A：5 秒、B：100 ms、C：200 ms
```

服务器内部可能出现：

```text
0.1s：B 已经完成
0.2s：C 已经完成
5.0s：A 才完成
```

但它不能直接返回：

```text
Response B、Response C、Response A
```

否则客户端收到第一个响应后，会按照请求顺序把它当成：

```text
Request A 的响应
```

请求与响应就无法正确对应。

所以即使 B、C 已经处理完，也必须：

```text
等待 A
   ↓
Response A
   ↓
Response B
   ↓
Response C
```

于是形成：

```text
A 很慢
  ↓
B 被 A 挡住
  ↓
C 也被 A 挡住
```

这就是：

> **HTTP/1.1 Pipelining 的应用层队头阻塞。**

因此管道传输只解决了：

```text
请求能不能提前发送
```

并没有解决：

```text
响应能不能彼此独立返回
```

---
### 【HTTP/2 的多路复用到底是什么意思？】

HTTP/2 解决这个问题的关键，是引入了：

```text
Stream + Frame + Stream ID
```

HTTP/2 仍然可以只建立**一个 TCP 连接**：

```text
Client ================= Server
             TCP
```

但是在这个 TCP 连接内部，不再只有一条逻辑上的 HTTP 请求响应队列，而是可以同时建立多个独立的逻辑 Stream：

```text
一个 TCP Connection
│
├── Stream 1
│      └── Request / Response A
│
├── Stream 3
│      └── Request / Response B
│
└── Stream 5
       └── Request / Response C
```

这里的 **Stream 可以理解为同一个 TCP 连接内部的一条逻辑通信通道**。

所谓：

> **多路**

就是一个 TCP 连接内部同时存在多个 Stream。

所谓：

> **复用**

就是这些 Stream **共同复用同一个底层 TCP 连接**。

这就是“多路复用”这个词真正的含义。

---

HTTP/2 又进一步把每一个 HTTP 消息拆成更小的 **Frame**。

例如：

```text
Response A
→ A1 A2 A3 A4

Response B
→ B1 B2

Response C
→ C1 C2 C3
```

每个 Frame 都知道自己属于哪个 Stream。

因此底层真正传输时，可以变成：

```text
A1、B1、C1、A2、B2、C2、A3、C3、A4
```

也就是：

> **不同请求和响应的数据可以在同一个 TCP 连接中交错传输。**

接收方看到：

```text
A1
```

知道：

```text
属于 Stream A
```

看到：

```text
B1
```

知道：

```text
属于 Stream B
```

最后分别重新组装：

```text
Stream A
→ A1 + A2 + A3 + A4

Stream B
→ B1 + B2

Stream C
→ C1 + C2 + C3
```

因此假设 A 很慢：

```text
Stream A：A1 ───── A2 ───────── A3

Stream B：   B1 B2
                  ↓
                 完成

Stream C：      C1 C2 C3
                        ↓
                       完成
```

B、C 不需要等 A 的整个响应结束以后才能返回。

所以 HTTP/2 解决了 HTTP/1.1 的这个限制：

```text
HTTP/1.1：

Response A 必须完成
        ↓
Response B 才能继续
        ↓
Response C

HTTP/2：

Stream A
Stream B
Stream C
   ↓
彼此可以交错传输
```

---

但是需要注意，HTTP/2 **没有彻底消灭所有队头阻塞**。

因为 HTTP/2 仍然建立在 TCP 之上，而 TCP 提供的是可靠、有序字节流。

假设 TCP 数据是：

```text
Segment 1
Segment 2  ← 丢失
Segment 3
Segment 4
```

即使 Segment 3、4 已经到达，TCP 仍然需要等待 Segment 2 被重传和恢复以后，才能保证按序向上层交付完整字节流。

而所有 HTTP/2 Stream 又共用这一条 TCP 连接，因此一次 TCP 丢包可能同时影响多个 Stream。

所以应当准确地区分：

```text
HTTP/1.1 Pipelining
        ↓
存在 HTTP 应用层队头阻塞

HTTP/2 Multiplexing
        ↓
解决 HTTP 层响应顺序造成的队头阻塞

但是 HTTP/2 基于 TCP
        ↓
仍然存在 TCP 层队头阻塞
```

最终整个演进关系可以总结为：

```text
HTTP/1.1 持久连接
        ↓
一个 TCP 可以复用多个 HTTP 请求
        ↓

HTTP/1.1 Pipelining
        ↓
多个请求可以连续发送
        ↓
但响应必须按请求顺序返回
        ↓
前面的 Response 慢
        ↓
后面的 Response 全部等待
        ↓
HTTP 层队头阻塞
        ↓

HTTP/2 Multiplexing
        ↓
一个 TCP 内建立多个 Stream
        ↓
每个请求/响应属于独立 Stream
        ↓
消息拆成带 Stream ID 的 Frame
        ↓
不同 Stream 的 Frame 可以交错传输
        ↓
某个 HTTP 响应慢
不会再因为 HTTP 响应顺序限制
阻塞其他 Stream
```

面试时可以最终收敛为：

> **HTTP/1.1 Pipelining 允许客户端在同一个持久 TCP 连接中连续发送多个请求，不必等待前一个响应返回。但是 HTTP/1.1 没有为同一连接中的各个请求提供类似 Stream ID 的独立标识，因此客户端依靠响应顺序匹配请求和响应，服务器必须按照请求顺序发送响应。如果排在前面的请求处理很慢，后面的响应即使已经准备好，也必须等待，从而产生应用层队头阻塞。HTTP/2 则在一个 TCP 连接内部建立多个独立 Stream，每个请求和响应属于自己的 Stream，并把消息拆成带 Stream ID 的 Frame，不同 Stream 的 Frame 可以交错传输，这就是多路复用。因此 HTTP/2 解决了 HTTP/1.1 的应用层队头阻塞，但由于底层仍然使用 TCP，所以仍然存在 TCP 层的队头阻塞。**

