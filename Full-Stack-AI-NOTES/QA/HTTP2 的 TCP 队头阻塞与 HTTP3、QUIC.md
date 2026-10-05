# HTTP2 的 TCP 队头阻塞与 HTTP3、QUIC

## 【知识概述】

**HTTP/2 的流共享同一 TCP 字节流，丢失字节可能阻止其他已到达数据交付；QUIC 将可靠性组织到各流以减少跨流阻塞。**

HTTP/1.1、HTTP/2 到 HTTP/3 的演进，可以围绕一个核心问题理解：

**如何让多个 HTTP 请求更高效地共享网络连接，同时减少相互等待。**

HTTP/1.1 可以让多个 HTTP 请求复用同一个 TCP：

HTTP/1.1 还可以通过 Pipelining 连续发送多个请求，但它仍存在明显的问题：**响应需要按照请求顺序对应返回**。因此如果 A 很慢：

这就是 HTTP/1.1 的应用层队头阻塞。RFC 9113 在介绍 HTTP/2 出现的背景时，也明确指出 HTTP/1.1 的 Pipelining 仍然存在应用层队头阻塞。[[1]](https://www.rfc-editor.org/rfc/rfc9113.html)

理解这组机制，可以沿以下主线展开：

先区分 HTTP 消息排序与 TCP 字节交付的等待

解释 HTTP/2 多路复用为何仍受 TCP 丢包影响

再沿 QUIC 多流、握手与连接迁移说明 HTTP/3 的改进方向。

QUIC 流内部仍需按规则交付，拥塞与连接资源也可由多流共享；HTTP/3 不意味着完全没有等待或丢包代价。相关完整知识可结合 [浏览器网络面试题](<../L-浏览器网络面试题.md>) 阅读。

## 1. 机制说明与工程判断

核心要点如下：
### 【HTTP/1.1：解决连接复用，但并发能力仍受限制】

- HTTP/1.1 通过持久连接减少重复建立 TCP 连接的开销。
- Pipelining 可以连续发送多个请求，但响应仍需按顺序返回。
- 因此前面的响应慢，会阻塞后面的响应，产生 HTTP 层队头阻塞。[[1]](https://www.rfc-editor.org/rfc/rfc9113.html)
### 【HTTP/2：通过多路复用解决 HTTP 层队头阻塞】

- HTTP/2 在一个 TCP 连接中建立多个 Stream。
- 每个请求/响应使用自己的 Stream，不同 Stream 的数据可以交错传输。
- 一个 HTTP 请求处理较慢时，不需要阻止其他 Stream 的 HTTP 数据继续传输。[[1]](https://www.rfc-editor.org/rfc/rfc9113.html)
- 但所有 Stream **仍然共用同一个 TCP 连接**。
### 【HTTP/2 仍然存在 TCP 层队头阻塞】

- TCP 提供可靠、有序的字节流。
- 如果 TCP 中前面的数据丢失，后续数据需要等待丢失的数据恢复后才能按序向上交付。
- 因为多个 HTTP/2 Stream 共用一条 TCP，所以一个 TCP 丢包可能让多个 Stream 暂时停顿。
- 因此 HTTP/2 解决了**HTTP 层队头阻塞**，但没有解决**TCP 层队头阻塞**。[[1]](https://www.rfc-editor.org/rfc/rfc9113.html)
### 【HTTP/3：把传输层从 TCP 换成 QUIC】

- HTTP/3 使用 QUIC，而不是 HTTP/2 的 TCP。
- QUIC 运行在 UDP 之上，但可靠传输、多路复用、拥塞控制等能力由 **QUIC 自己实现**，不是依靠 UDP 实现。[[2]](https://www.rfc-editor.org/rfc/rfc9114.html)
- QUIC 原生支持多个相对独立的 Stream，一个 Stream 因丢包等待恢复时，不要求其他无关 Stream 一起等待。[[2]](https://www.rfc-editor.org/rfc/rfc9114.html)
### 【QUIC 主要解决三个问题】

- **进一步减少队头阻塞**：把可靠、有序交付限制到各个 Stream，而不是让整个连接共享一条有序字节流。
- **降低连接建立延迟**：QUIC 将传输连接建立与加密握手结合起来，并支持低延迟连接建立。[[3]](https://www.rfc-editor.org/info/rfc9114/)
- **安全能力内置**：QUIC 集成 TLS 1.3，为 HTTP/3 提供加密和身份认证。[[3]](https://www.rfc-editor.org/info/rfc9114/)
### 【整个发展过程】

```text
HTTP/1.1
→ 重点解决 TCP 连接反复建立的问题
→ 持久连接、Pipelining
→ 仍有 HTTP 层队头阻塞

HTTP/2
→ Stream + Frame + 多路复用
→ 解决 HTTP 层队头阻塞
→ 但多个 Stream 共用 TCP
→ 仍有 TCP 层队头阻塞

HTTP/3
→ HTTP over QUIC
→ QUIC 原生支持独立 Stream
→ 避免 TCP 有序字节流造成的跨 Stream 队头阻塞
→ 同时优化连接建立和安全握手
```

## 2. 完整回答与表达组织

HTTP/1.1、HTTP/2 到 HTTP/3 的演进，可以围绕一个核心问题理解：

> **如何让多个 HTTP 请求更高效地共享网络连接，同时减少相互等待。**
### 【HTTP/1.1：开始复用连接】

HTTP/1.1 的一个重要改进是**持久连接**。

以前可以理解为：

```text
请求 A
→ 建 TCP
→ 发送
→ 返回
→ 关闭

请求 B
→ 再建 TCP
→ 发送
→ 返回
→ 关闭
```

HTTP/1.1 可以让多个 HTTP 请求复用同一个 TCP：

```text
一个 TCP
│
├── 请求 A
├── 请求 B
└── 请求 C
```

这样减少了不断建立、关闭 TCP 连接的开销。

HTTP/1.1 还可以通过 Pipelining 连续发送多个请求，但它仍存在明显的问题：**响应需要按照请求顺序对应返回**。因此如果 A 很慢：

```text
A：很慢、B：很快、C：很快
```

仍然可能形成：

```text
A
↓
B 等待
↓
C 等待
```

这就是 HTTP/1.1 的应用层队头阻塞。RFC 9113 在介绍 HTTP/2 出现的背景时，也明确指出 HTTP/1.1 的 Pipelining 仍然存在应用层队头阻塞。[[1]](https://www.rfc-editor.org/rfc/rfc9113.html)

---
### 【HTTP/2：用多路复用解决 HTTP 层排队】

HTTP/2 最大的变化之一，就是上一题讲到的：

> **多路复用。**

在一个 TCP 连接中建立多个 Stream：

```text
一个 TCP Connection
│
├── Stream A
├── Stream B
└── Stream C
```

不同请求和响应属于不同 Stream，数据可以交错传输。

所以：

```text
Stream A：A1 ───── A2 ───── A3
Stream B：   B1 B2
Stream C：      C1 C2 C3
```

即使 A 比较慢，B、C 也不用因为 **HTTP 响应必须按 A→B→C 顺序完整返回**而等待。

这就解决了 HTTP/1.1 的 HTTP 层队头阻塞。HTTP/2 标准明确将每个请求/响应关联到自己的 Stream，不同 Stream 可以在一个连接中并发、交错传输。[[1]](https://www.rfc-editor.org/rfc/rfc9113.html)

但是这里还有一个问题：

```text
Stream A ─┐
Stream B ─┼──→ 同一个 TCP
Stream C ─┘
```

HTTP/2 的多个 Stream 虽然在 HTTP 层是独立的，但底层**仍然只有一条 TCP 连接**。

TCP 本身要求可靠、有序地交付数据。

例如：

```text
TCP 数据：

1 → 2 → 3 → 4
        ↑
       丢失
```

即使后面的数据已经到了，TCP 也需要先把缺失的数据恢复，才能继续按照顺序向上层交付。

于是可能出现：

```text
TCP 丢包
   ↓
TCP 等待重传
   ↓
这一 TCP 连接暂时无法继续按序交付数据
   ↓
上面的多个 HTTP/2 Stream 都可能受到影响
```

因此：

> **HTTP/2 解决了 HTTP 层队头阻塞，但是没有解决 TCP 层队头阻塞。**

这也是 RFC 9113 明确指出的 HTTP/2 局限。[[1]](https://www.rfc-editor.org/rfc/rfc9113.html)

---
### 【HTTP/3：为什么要提出 QUIC？】

到了 HTTP/3，思路发生了进一步变化：

> **既然 HTTP/2 的多路复用已经做好了，但问题出在底层 TCP，那么就需要改变底层传输方式。**

于是 HTTP/3 不再使用：

```text
HTTP/2
↓
TLS
↓
TCP
```

而变成：

```text
HTTP/3
↓
QUIC
↓
UDP
```

HTTP/3 标准规定 HTTP/3 将 HTTP 语义映射到 QUIC 上，而 QUIC 本身提供 Stream 多路复用、流控制以及低延迟连接建立等能力。[[2]](https://www.rfc-editor.org/rfc/rfc9114.html)

这里容易出现一个误区：

> **HTTP/3 使用 UDP，并不意味着 HTTP/3 是“不可靠传输”。**

UDP 本身确实没有 TCP 那套可靠传输机制，但 QUIC 是建立在 UDP 之上的一套新的传输协议：

```text
UDP
↓
只负责发送数据报

QUIC
↓
自己实现
可靠传输
拥塞控制
丢包恢复
多路复用
加密
```

RFC 9000 将 QUIC 定义为一种基于 UDP 的、安全的、多路复用传输协议。[[4]](https://www.rfc-editor.org/info/rfc9000/)

所以更准确的理解是：

> **不是“把 TCP 简单换成 UDP”，而是利用 UDP 作为承载，在用户空间重新实现了一套更适合现代 HTTP 的 QUIC 传输协议。**

---
### 【QUIC 主要解决了什么？】

这里掌握三个概念即可。

**第一，进一步解决队头阻塞。**

QUIC 自己原生支持多个 Stream：

```text
QUIC Connection
│
├── Stream A
├── Stream B
└── Stream C
```

各个 Stream 的可靠、有序传输主要在**各自 Stream 内部**维护。

所以如果：

```text
Stream A
某个数据丢失
```

A 可以等待自己的数据恢复，但不会因为“整个连接是一条必须统一按序交付的字节流”，强制 B、C 一起等待。HTTP/3 标准明确指出，一个 QUIC Stream 被阻塞或遭遇丢包时，不会阻止其他 Stream 继续推进。[[2]](https://www.rfc-editor.org/rfc/rfc9114.html)

概念上可以理解为：

```text
HTTP/2：

多个 Stream
    ↓
共用一条 TCP 有序字节流
    ↓
TCP 丢包
    ↓
多个 Stream 可能一起等

HTTP/3：

多个 QUIC Stream
    ↓
Stream 相对独立
    ↓
A 丢包
    ↓
主要由 A 等待恢复
B、C 可以继续
```

---

**第二，减少连接建立延迟。**

传统 HTTPS 建立通信，大体需要完成：

```text
建立 TCP + 建立 TLS 安全连接
```

QUIC 则把传输连接建立和安全握手更加紧密地结合起来，设计目标之一就是降低连接建立延迟。它还支持在满足条件时使用 0-RTT 更早发送应用数据。[[3]](https://www.rfc-editor.org/info/rfc9114/)

这一题不需要记握手报文细节，只需要知道：

> **QUIC 的一个重要目标，是比传统 TCP + TLS 组合更快地建立可用的安全连接。**

---

**第三，QUIC 内置安全能力。**

QUIC 集成了 TLS 1.3，HTTP/3 依靠 QUIC 提供数据机密性、完整性和对端认证。[[3]](https://www.rfc-editor.org/info/rfc9114/)

因此不需要把它理解成：

```text
UDP 不安全
↓
HTTP/3 也不安全
```

而应该理解成：

```text
UDP
↓
QUIC
├── 可靠传输
├── 多路复用
├── 拥塞控制
└── TLS 1.3 安全能力
↓
HTTP/3
```

---
### 【HTTP/1.1 → HTTP/2 → HTTP/3 如何整体理解？】

把三个版本放到一起，发展路线就非常清楚：

```text
HTTP/1.1
│
│  持久连接
│  一个 TCP 可以处理多个请求
│
├── 解决：
│   减少重复建立 TCP
│
└── 问题：
    HTTP 层队头阻塞
            ↓

HTTP/2
│
│  Stream + Frame + 多路复用
│
├── 解决：
│   HTTP 层队头阻塞
│
└── 问题：
    所有 Stream 仍共用 TCP
    TCP 丢包可能阻塞多个 Stream
            ↓

HTTP/3
│
│  HTTP over QUIC
│
│  QUIC over UDP
│
├── QUIC 原生多 Stream
├── Stream 之间更加独立
├── 集成 TLS 1.3
└── 优化连接建立
```

所以这道题最终可以收敛成：

> **HTTP/1.1 主要通过持久连接减少重复建立 TCP 的开销，但多个请求之间仍存在 HTTP 层队头阻塞；HTTP/2 引入 Stream 和多路复用，让多个请求可以在同一个 TCP 连接中并发、交错传输，从而解决 HTTP 层队头阻塞，但由于所有 Stream 仍共享一条 TCP 有序字节流，TCP 丢包仍可能导致多个 Stream 一起等待。HTTP/3 因此进一步采用基于 UDP 构建的 QUIC，由 QUIC 原生提供多 Stream、可靠传输、拥塞控制和 TLS 1.3 安全能力，使不同 Stream 的丢包恢复更加独立，从而解决 HTTP/2 受 TCP 队头阻塞影响的问题，同时降低安全连接建立的延迟。** [[1]](https://www.rfc-editor.org/rfc/rfc9113.html)

## 3. 参考文献

[1] [RFC 9113: HTTP/2](<https://www.rfc-editor.org/rfc/rfc9113.html>)[EB/OL].

[2] [RFC 编辑器](<https://www.rfc-editor.org/rfc/rfc9114.html>)[EB/OL].

[3] [RFC 编辑器](<https://www.rfc-editor.org/info/rfc9114/>)[EB/OL].

[4] [RFC 编辑器](<https://www.rfc-editor.org/info/rfc9000/>)[EB/OL].
