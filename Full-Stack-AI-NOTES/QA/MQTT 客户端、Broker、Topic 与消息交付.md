# MQTT 客户端、Broker、Topic 与消息交付

## 【知识概述】

**MQTT 用发布订阅及 Broker 路由定义消息流转，WebSocket 提供通信通道；两者可以组合，不能按同一职责简单互换。**

WebSocket 和 MQTT 都属于应用层协议，但它们解决的问题不在同一个功能抽象层次，因此不能简单理解成两种相互替代的实时通信协议。

WebSocket 的核心作用是提供一条持久、全双工的双向通信通道。经典 WebSocket 由浏览器内部先建立 TCP/TLS 连接，再通过 HTTP Upgrade 完成握手；握手成功后，双方在同一条底层连接上使用 WebSocket Frame 传输消息。JavaScript 本身没有直接操作 TCP Socket，而是通过浏览器提供的 WebSocket API 使用这种通信能力。

MQTT 的核心作用则是规定消息如何发布、订阅、路由和交付。它依赖一个已经可用的有序、无损、双向网络连接。普通 Java、Go、C++、Node.js 或物联网设备中的 MQTT Client，可以通过操作系统 Socket 建立到 Broker 的 TCP/TLS 连接，然后发送 MQTT `CONNECT`、`PUBLISH` 和 `SUBSCRIBE` 等报文。

理解这组机制，可以沿以下主线展开：

先区分 Client、Broker 和 Topic 的职责。

沿连接、订阅、发布及匹配转发解释消息路径。

再讨论 QoS 和 MQTT over WebSocket，说明浏览器为何经常借助 WebSocket 承载协议。

QoS 针对相应协议交付过程，不自动保证业务处理只执行一次；浏览器页面不能直接打开原始 TCP Socket。相关完整知识可结合 [MQTT 详细学习笔记（含知识点对应问题）](<../M-MQTT 详细学习笔记（含知识点对应问题）.md>) 阅读。

## 1. 机制说明与工程判断

### 【协议职责：WebSocket 提供通信通道，MQTT 规定消息如何流转】

#### <u>1. 核心结论</u>

从网络分层看，WebSocket 和 MQTT 都属于应用层协议；但从功能职责看，二者处于不同的抽象层次，不能简单理解成两种完全对等、相互替代的实时通信方案。

WebSocket 主要解决：

> 客户端和服务端如何在一条持久连接上进行低开销的全双工通信。

它规定了连接握手、消息帧、Ping/Pong 和连接关闭等机制，但不规定业务消息应该发送给谁，也不直接提供 Broker、Topic、发布订阅和多级 QoS。

MQTT 主要解决：

> 消息如何发布、订阅、路由和按照不同可靠性等级进行交付。

它规定了 `CONNECT`、`PUBLISH`、`SUBSCRIBE` 等 MQTT Control Packet，以及 Broker、Topic、QoS、会话、保留消息和遗嘱消息等消息能力。

二者的职责可以概括为：

```text
WebSocket
→ 强调通信通道怎样建立、双方怎样实时传输数据

MQTT
→ 强调消息怎样发布、订阅、路由和可靠交付
```

### 【底层连接：TCP 由操作系统网络栈建立】

HTTP、WebSocket 和 MQTT 都不会脱离操作系统直接创建 TCP 连接。实际过程是：

```text
应用或客户端库发起连接
→ 调用浏览器或操作系统提供的网络能力
→ 操作系统网络栈建立 TCP 连接
→ 在连接上传输应用层协议报文
```

因此，不能简单说“WebSocket 能建立 TCP，而 MQTT 不能建立 TCP”。更准确的表述是：

> WebSocket 和 MQTT 都依赖底层网络连接；具体连接由浏览器网络栈或客户端实现通过操作系统 Socket 建立。

#### <u>1. 浏览器中的 HTTP</u>

JavaScript 调用 `fetch()` 或 `XMLHttpRequest` 后，JavaScript 并不会获得 TCP Socket。浏览器内部负责 DNS 解析、建立 TCP/QUIC、完成 TLS 握手并发送 HTTP 请求。

#### <u>2. 浏览器中的 WebSocket</u>

JavaScript 调用：

```javascript
const socket = new WebSocket(
  'wss://example.com/socket'
)
```

浏览器内部负责建立 TCP/TLS 连接，并完成 WebSocket 握手。经典 WebSocket 通过 HTTP Upgrade 握手后，在同一条底层连接上使用 WebSocket Frame 进行全双工通信。

#### <u>3. 普通程序中的 MQTT</u>

Java、Go、C++、Python、Node.js 或物联网设备中的 MQTT Client，可以通过操作系统 Socket 建立到 Broker 的 TCP/TLS 连接，然后发送 MQTT `CONNECT` 报文：

```text
MQTT Client
→ 建立到 Broker 的 TCP/TLS 连接
→ 发送 MQTT CONNECT
→ Broker 返回 CONNACK
→ 开始发布和订阅消息
```

这里要区分两层连接：

```text
底层网络连接
→ TCP/TLS 连接已经建立

MQTT 协议连接
→ Client 发送 CONNECT，Broker 返回 CONNACK
```

### 【浏览器限制：普通网页 JavaScript 不能操作原始 TCP Socket】

普通网页中的 JavaScript 没有通用的原始 TCP Socket API，不能任意连接某个 IP 地址和端口。浏览器主要提供受安全模型约束的网络接口，例如：

- `fetch`；
- `XMLHttpRequest`；
- `WebSocket`；
- `EventSource`。

HTTP 和 WebSocket 能在网页中直接使用，不是因为 JavaScript 可以操作 TCP，而是因为浏览器原生实现并开放了对应的 Web API。

浏览器没有原生 MQTT API，因此普通网页不能直接连接：

```text
mqtt://broker.example.com:1883
```

浏览器接入 MQTT 系统时，通常使用 MQTT over WebSocket：

```text
MQTT Control Packet
↓
WebSocket Binary Frame
↓
TCP / TLS
```

此时浏览器使用 WebSocket API 建立通道，MQTT 客户端库负责生成、封装和解析 MQTT 报文，Broker 则需要提供 MQTT over WebSocket 接入地址。

### 【MQTT 角色：连接到 Broker 的端都属于 MQTT Client】

MQTT 使用 Client—Broker 架构。所有连接到 Broker 的程序或设备都属于 MQTT Client，可以是：

- 物联网设备；
- 手机应用；
- 浏览器前端；
- Java、Go 或 Node.js 后端服务；
- 数据处理和存储服务；
- 实时监控大屏。

MQTT 中各角色的职责是：

| 概念 | 作用 |
|---|---|
| Client | 连接到 Broker 的程序或设备，可以发布和订阅消息 |
| Broker | 接收客户端连接、维护订阅关系并转发消息 |
| Publisher | 向某个 Topic 发布消息的 Client |
| Subscriber | 订阅某个 Topic Filter 的 Client |
| Topic | 消息分类和路由所使用的名称 |

Publisher 和 Subscriber 不是固定的程序类型，而是客户端在某条消息链路中的角色。同一个 MQTT Client 可以同时发布和订阅不同的 Topic。

因此，Broker 转发的不是狭义的“客户端与服务端之间的消息”，而是：

> 多个 MQTT Client 之间通过 Broker 间接交换的消息。

后端服务虽然在业务架构中属于服务端，但只要它连接到 MQTT Broker，在 MQTT 协议关系中同样是 MQTT Client。

### 【消息路由：Broker 只向匹配 Topic 的订阅者转发】

MQTT 使用 Topic 对消息进行分类。例如车辆 001 发布位置：

```text
vehicle/001/location
```

不同客户端可以订阅：

```text
vehicle/001/location
vehicle/+/location
vehicle/#
```

完整路由过程是：

```text
Subscriber 向 Broker 订阅 Topic Filter
→ Broker 保存订阅关系
→ Publisher 向某个 Topic 发布消息
→ Broker 匹配 Topic 和 Topic Filter
→ 只转发给匹配的 Subscriber
```

因此，Broker 不会默认把每一条消息广播给所有客户端。设备只会收到自己订阅并且与 Topic Filter 匹配的消息，从而减少无关数据传输，并解除消息生产者与消费者之间的直接依赖。

### 【消息流程：先连接和订阅，再发布和转发】

一个典型 MQTT 消息流程是：

```text
1. Client 建立底层 TCP/TLS 或 WebSocket 连接
2. Client 发送 CONNECT
3. Broker 返回 CONNACK
4. Subscriber 发送 SUBSCRIBE
5. Broker 返回 SUBACK，并保存订阅关系
6. Publisher 发送 PUBLISH
7. Broker 根据 Topic 匹配订阅者
8. Broker 向匹配的 Subscriber 转发 PUBLISH
```

例如：

```text
GPS 设备
→ 发布 vehicle/001/location

Java 后端服务
→ 订阅 vehicle/+/location
→ 处理并存储数据
→ 发布 vehicle/001/alarm

浏览器地图大屏
→ 订阅 vehicle/+/location
→ 订阅 vehicle/+/alarm
```

GPS 设备、Java 后端和浏览器大屏在 MQTT 协议中都属于 Client，只是在不同消息流中承担 Publisher 或 Subscriber 角色。

### 【可靠性：MQTT 通过 QoS 定义消息交付等级】

MQTT 提供三个 QoS 等级：

| QoS | 含义 | 可能结果 |
|---:|---|---|
| 0 | At most once，至多一次 | 消息可能丢失，不进行协议重试 |
| 1 | At least once，至少一次 | 保证协议层交付，但可能重复 |
| 2 | Exactly once，恰好一次 | 在 MQTT 协议交付过程中避免丢失和重复，开销最高 |

在 Broker 架构中，下面两段属于独立的交付过程：

```text
Publisher → Broker
Broker → Subscriber
```

它们实际使用的 QoS 可能不同。

MQTT QoS 保证的是协议发送端与接收端之间的消息交付语义，不等于整个业务系统天然实现“恰好处理一次”。如果消息到达后还要写数据库、扣减库存或调用下游服务，仍然需要幂等、事务和去重机制。

### 【组合关系：MQTT 可以直接基于 TCP，也可以基于 WebSocket】

普通程序和物联网设备中的常见协议关系是：

```text
MQTT
↓
TCP / TLS
↓
IP
```

浏览器中的常见协议关系是：

```text
MQTT
↓
WebSocket
↓
TCP / TLS
↓
IP
```

在 MQTT over WebSocket 中：

- WebSocket 负责提供浏览器能够使用的全双工通信通道；
- MQTT 负责 `CONNECT`、`PUBLISH`、`SUBSCRIBE`、Topic、QoS 和会话等消息规则；
- MQTT Control Packet 通过 WebSocket Binary Frame 传输；
- WebSocket 子协议使用 `mqtt`；
- 生产环境通常使用 `wss://`。

因此，MQTT 和 WebSocket 不一定是二选一关系。浏览器场景下，WebSocket 可以作为承载 MQTT 报文的底层通信通道。

### 【最终选型：判断业务需要通信通道还是完整消息体系】

如果业务只是需要浏览器与业务服务之间进行实时双向通信，例如聊天、协同编辑、实时进度、在线游戏和实时看板，可以直接使用 WebSocket，再根据业务需要自行设计消息格式、房间、ACK 和状态恢复。

如果业务需要大量设备接入、Broker 统一管理、Topic 路由、发布订阅、一对多分发、QoS、会话和设备上下线管理，更适合使用 MQTT。

如果浏览器需要加入已经存在的 MQTT 消息体系，则使用 MQTT over WebSocket。

```text
只需要浏览器实时双向通信通道
→ WebSocket

需要 Broker、Topic 和发布订阅消息体系
→ MQTT

浏览器需要加入 MQTT 消息体系
→ MQTT over WebSocket
```

## 2. 完整回答与表达组织

WebSocket 和 MQTT 都属于应用层协议，但它们解决的问题不在同一个功能抽象层次，因此不能简单理解成两种相互替代的实时通信协议。

WebSocket 的核心作用是提供一条持久、全双工的双向通信通道。经典 WebSocket 由浏览器内部先建立 TCP/TLS 连接，再通过 HTTP Upgrade 完成握手；握手成功后，双方在同一条底层连接上使用 WebSocket Frame 传输消息。JavaScript 本身没有直接操作 TCP Socket，而是通过浏览器提供的 WebSocket API 使用这种通信能力。

MQTT 的核心作用则是规定消息如何发布、订阅、路由和交付。它依赖一个已经可用的有序、无损、双向网络连接。普通 Java、Go、C++、Node.js 或物联网设备中的 MQTT Client，可以通过操作系统 Socket 建立到 Broker 的 TCP/TLS 连接，然后发送 MQTT `CONNECT`、`PUBLISH` 和 `SUBSCRIBE` 等报文。

这里需要区分底层网络连接和 MQTT 协议连接。TCP/TLS 连接建立以后，MQTT Client 还要发送 `CONNECT`，Broker 返回 `CONNACK`，此后才表示 MQTT 协议层连接已经建立。因此不能简单说“WebSocket 能建立 TCP，而 MQTT 不能建立 TCP”；二者都依赖底层网络连接，连接由浏览器网络栈或客户端实现调用操作系统网络能力建立。

普通网页中的 JavaScript 没有通用的原始 TCP Socket API，而且浏览器没有原生 MQTT API，因此不能直接连接 Broker 的普通 MQTT TCP 端口。浏览器接入 MQTT 系统时，通常使用 MQTT over WebSocket：浏览器先使用 WebSocket API 建立通道，MQTT 客户端库再把 MQTT Control Packet 封装到 WebSocket Binary Frame 中传输。此时 WebSocket 负责提供全双工通信通道，MQTT 负责发布订阅、Topic 路由、QoS 和会话等消息规则。

MQTT 使用 Client—Broker 架构。所有连接到 Broker 的端都属于 MQTT Client，可以是物联网设备、浏览器、手机应用，也可以是 Java 后端服务。Publisher 和 Subscriber 只是客户端在某条消息链路中的角色，同一个 Client 可以同时发布和订阅不同的 Topic。

Publisher 向某个 Topic 发布消息，Broker 根据已经保存的订阅关系匹配 Topic Filter，只把消息转发给匹配的 Subscriber，而不是发送给所有客户端。因此 Broker 实现的是多个 MQTT Client 之间基于 Topic 的间接通信和消息解耦。

MQTT 还通过 QoS 0、QoS 1 和 QoS 2 定义不同的协议交付等级。QoS 0 表示至多一次，消息可能丢失；QoS 1 表示至少一次，能够保证协议层交付，但可能重复；QoS 2 表示在 MQTT 协议交付过程中恰好一次，可靠性最高但开销也最大。QoS 保证的是 MQTT 协议端点之间的交付语义，数据库写入等业务操作仍然需要幂等、事务和去重机制。

所以，WebSocket 强调的是如何建立和维护实时全双工通信通道；MQTT 强调的是消息如何发布、订阅、路由和可靠交付。普通浏览器实时业务可以直接使用 WebSocket；大量设备接入和发布订阅场景更适合 MQTT；浏览器如果需要加入已有的 MQTT 消息体系，则使用 MQTT over WebSocket。

## 3. 参考文献

[1] [RFC 6455: The WebSocket Protocol](<https://www.rfc-editor.org/rfc/rfc6455>)[EB/OL].

[2] [MQTT Version 5.0: OASIS Standard](<https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html>)[EB/OL].

[3] [MDN WebSocket API](<https://developer.mozilla.org/en-US/docs/Web/API/WebSocket>)[EB/OL].
