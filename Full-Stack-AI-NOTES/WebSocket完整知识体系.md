# WebSocket 完整知识体系

WebSocket 的学习重点不只是会写 new WebSocket()，而是理解一条长期存在的双向连接从建立、认证、通信、存活检测、故障恢复到扩容和治理的完整生命周期。

这篇文档作为 Full-Stack-AI-NOTES 中 WebSocket 的通用主入口。它负责建立 WebSocket 自身的完整知识框架；身份认证、Token、反向代理等已经存在独立主文档的主题，只解释与 WebSocket 直接相关的连接点，再通过交叉引用继续深入。

---

## 1. WebSocket 知识体系先沿一条主链展开，再由横切能力补齐生产边界

WebSocket 不能按“握手、心跳、重连、ACK、背压”并列记忆。更稳定的理解方式是：**每解决上一层问题，系统才会暴露下一层问题。**

### 【总主线从“建立通道”逐步演进到“可恢复、可扩展、可证明”】

~~~text
实时通信需求
为什么普通 Request / Response 不够？
        ↓

协议与接口层
怎样建立 WebSocket？线上怎样传 Message？
        ↓

应用协议与状态层
Message 分别代表什么？当前阶段允许做什么？
        ↓

会话与连接生命周期层
谁在连接？身份何时失效？连接还活着吗？断了怎么办？
        ↓

可靠性与流控层
重连后从哪里继续？有没有重复 / 缺口？消费不过来怎么办？
        ↓

服务端系统层
连接越来越多以后怎样扩容、代理、发布和防护？
        ↓

观测与验证层
怎样证明连接、恢复、数据连续性和容量真的符合预期？
~~~

这条链可以用六个连续问题记忆：

| 层级 | 上一层暴露的问题 | 本层要得到的结果 |
| --- | --- | --- |
| 协议与接口 | 需要持续双向通信 | 建立可收发消息的通道 |
| 应用协议与状态 | 原始 Message 没有业务语义 | 得到可演进的消息协议和状态机 |
| 会话与生命周期 | 长连接期间身份和网络都会变化 | 得到可信、可判活、可恢复的连接 |
| 可靠性与流控 | 重连不等于数据连续，消费能力也有限 | 得到 Cursor、Replay、投递语义和背压控制 |
| 服务端系统 | 单机连接模型无法直接横向扩展 | 得到多实例、共享状态、入口和安全边界 |
| 观测与验证 | 有实现不等于能力成立 | 得到指标、测试和故障证据 |

### 【一条连接生命周期和一条数据进度线贯穿整个体系】

WebSocket 的知识实际上由两条长期主线交叉形成。

第一条是 Connection Lifecycle（连接生命周期）：

~~~text
HTTP Upgrade
    ↓
OPEN
    ↓
AUTH_PENDING
    ↓
LIVE
    ↓
CLOSE / FAILURE
    ↓
RECONNECT
~~~

第二条是 Data Progress（数据进度）：

~~~text
Message
   ↓
Validate
   ↓
Queue / Process
   ↓
Confirmed Cursor
   ↓ disconnect
Replay
   ↓
Live
~~~

因此很多容易混淆的概念其实位于不同主线：

```text
Heartbeat
属于连接生命周期

Cursor / Replay
属于数据进度

ACK
定义数据进度推进到哪一步才算完成

Backpressure
控制数据进入系统和被消费的速度差
```

### 【安全、性能和可观测性是横切能力，不是生命周期中的单独一步】

还有三类能力会横穿前面所有层级：

~~~text
Security
握手 Origin → Authentication → Authorization → Payload / Rate Limit

Performance / Capacity
bufferedAmount → Queue → Rendering → Connection Scale

Observability
Handshake → Auth → Live → Close → Reconnect → Replay
~~~

因此不要把“安全”理解成连接建立后的最后一个章节，也不要把“性能”只理解成 `bufferedAmount`。它们都是贯穿整条实时链路的约束。

---

## 2. 从实时通信需求到可用通道：协议与客户端接口层

这一层解决最底层的问题：**为什么要建立一条长期双向连接，以及浏览器和服务端怎样真正得到这条连接。**

依赖关系是：

~~~text
通信需求
  ↓
技术选型
  ↓
Opening Handshake
  ↓
Frame / Message
  ↓
Browser WebSocket API
~~~

如果这一层没有建立清楚，后面的鉴权、心跳和重连都没有承载对象。

### 【通信定位：先判断为什么需要 WebSocket】

这一章先回答为什么需要 WebSocket，以及它和 HTTP、SSE、WebTransport 等方案分别解决什么问题。

#### <u>WebSocket 解决持续双向通信而不是替代 HTTP</u>

WebSocket 是一种在客户端和服务端之间建立 Persistent Full-duplex Connection（持久全双工连接）的协议。RFC 6455 将它描述为：先通过 Opening Handshake（开启握手）建立连接，随后在同一连接上以消息和 Frame 的方式双向传输数据。[[1]](https://www.rfc-editor.org/rfc/rfc6455)

它适合这样的通信模型：

~~~text
Client
  │
  ├──────── message ────────► Server
  │
  ◄─────── message ─────────┤
  │
  ├──────── message ────────►
  │
  ◄─────── message ─────────┤
  │
连接长期保持
~~~

HTTP 请求更接近：

~~~text
Client
  │
  ├──── Request ────► Server
  │
  ◄─── Response ─────
  │
等待下一次 Request
~~~

两者并不是替代关系。

HTTP 仍然适合：

- 登录；
- 查询列表；
- 上传文件；
- CRUD；
- 页面和静态资源；
- 一次性命令。

WebSocket 更适合：

- 聊天；
- 在线协作；
- 实时行情；
- 游戏状态；
- 实时设备数据；
- 双向控制；
- 持续状态同步。

一个系统经常同时存在：

~~~text
HTTP
负责一次性 Request / Response

WebSocket
负责持续双向实时通道
~~~

因此“系统使用了 WebSocket”并不意味着 HTTP 消失。

---

#### <u>实时通信方案应根据通信方向和可靠性需求选择</u>

常见 Web 实时通信方案可以先按通信方向理解。

| 方案 | 通信方向 | 连接模型 | 适合场景 |
| --- | --- | --- | --- |
| Polling | Client 主动请求 | 周期性 HTTP | 更新不频繁、实现优先 |
| Long Polling | Client 发起、Server 延迟响应 | 多次长 HTTP 请求 | 兼容性要求高的服务端推送 |
| SSE | Server → Client | 持久 HTTP Event Stream | 通知、日志、AI 文本流、行情展示 |
| WebSocket | Client ↔ Server | 持久双向连接 | 聊天、协同、实时控制、状态同步 |
| WebTransport | 双向、多 Stream、Datagram | HTTP/3 / QUIC | 需要多流或不可靠 Datagram 的高级实时场景 |

SSE（Server-Sent Events，服务器发送事件）通过 EventSource 建立服务端到浏览器的单向事件流；客户端如果还需要向服务端发送数据，通常另外使用 HTTP。[[2]](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)

WebTransport 基于 HTTP/3，可以同时提供可靠 Stream 和不可靠 Datagram，比 WebSocket 的单条可靠有序消息通道更灵活，但服务端实现、部署和兼容性决策也更复杂。[[3]](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API)

因此选 WebSocket 的关键条件不是“实时”两个字，而是：

~~~text
需要持续连接
+
Client 和 Server 都需要主动发送
+
可靠有序消息模型基本符合业务需求
~~~

如果只有服务端推送，SSE 往往更简单；如果只是偶尔查询，普通 HTTP 更简单；如果需要多个独立流和不可靠低延迟 Datagram，再考虑 WebTransport。

---

### 【建链协议：HTTP 握手把请求入口升级为持续双向通道】

经典 WebSocket 建连不是直接在 TCP 上凭空出现一条新协议，而是先利用 HTTP 请求完成协议协商。

#### <u>HTTP Opening Handshake 完成协议升级</u>

RFC 6455 的经典 HTTP/1.1 建连过程：

~~~text
Browser
   │
   │ HTTP Request
   │ Upgrade: websocket
   ▼
Server
   │
   │ 101 Switching Protocols
   ▼
WebSocket Connection
~~~

典型请求：

~~~http
GET /socket HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: <random-base64>
Origin: https://app.example.com
~~~

服务端成功接受后返回：

~~~http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: <derived-value>
~~~

Sec-WebSocket-Key 和 Sec-WebSocket-Accept 用来确认双方确实按 WebSocket 握手规则完成升级，而不是普通 HTTP 响应。[[1]](https://www.rfc-editor.org/rfc/rfc6455)

握手完成后进入数据传输阶段：

~~~text
HTTP Handshake
    ↓
WebSocket Frames
    ↓
WebSocket Messages
~~~

这里需要避免一个过度简化：

> “WebSocket 永远只能通过 HTTP/1.1 Upgrade 工作”并不完整。

RFC 8441 还定义了通过 HTTP/2 Extended CONNECT 引导 WebSocket 的机制。[[4]](https://www.rfc-editor.org/rfc/rfc8441)

浏览器 API 通常会屏蔽这些底层差异，所以应用代码仍然使用 WebSocket(url)。

---

#### <u>Subprotocol 用来协商应用协议而不是认证用户</u>

WebSocket 握手支持 Sec-WebSocket-Protocol，用来选择应用级 Subprotocol（子协议）。

客户端：

~~~ts
const socket = new WebSocket(
  "wss://example.com/socket",
  ["chat.v2", "chat.v1"]
);
~~~

服务端可以在握手响应中选择：

~~~http
Sec-WebSocket-Protocol: chat.v2
~~~

浏览器最终通过：

~~~ts
socket.protocol
~~~

读取服务端选中的协议。

适合通过 Subprotocol 表达：

- chat.v1；
- telemetry.v2；
- graphql-transport-ws；
- 自定义二进制协议名称。

不推荐把长期敏感 Token 当作 Subprotocol 名称使用，因为 Subprotocol 的语义本来是协议协商，并且握手元数据可能进入基础设施日志。

---

#### <u>Extension 在握手阶段协商额外协议能力</u>

Sec-WebSocket-Extensions 用来协商协议扩展。

最常见的是 permessage-deflate：

~~~text
Message
   ↓
DEFLATE Compression
   ↓
WebSocket Frame
~~~

RFC 7692 规定了 WebSocket 每消息压缩框架和 permessage-deflate。[[5]](https://www.rfc-editor.org/rfc/rfc7692)

压缩不是免费的：

~~~text
更少网络字节
      ↕
更多 CPU
更多内存
压缩上下文成本
~~~

Node.js 常用 ws 库也明确提醒，permessage-deflate 会带来性能和内存开销，生产环境应使用接近真实流量的负载测试决定是否启用。[[6]](https://github.com/websockets/ws)

因此不要因为“压缩能省流量”就默认所有实时消息都压缩。

对于：

- 已压缩图片；
- 很小的 JSON；
- 高频短消息；

压缩收益可能低于 CPU 和内存代价。

---

### 【传输模型：Message、Frame 与 Control Frame 定义线上数据结构】

理解 Message 和 Frame 的区别，是理解分片、Ping/Pong、消息大小限制和抓包结果的基础。

#### <u>Message 是应用看到的逻辑消息</u>

RFC 6455 中，客户端和服务端传输的逻辑单位叫 Message（消息）。

消息主要分两类：

~~~text
Text Message
UTF-8 Text

Binary Message
Binary Data
~~~

浏览器代码看到的是完整 Message：

~~~ts
socket.onmessage = event => {
  console.log(event.data);
};
~~~

event.data 可能是：

- string；
- Blob；
- ArrayBuffer。

可以通过 binaryType 控制二进制接收形式：

~~~ts
socket.binaryType = "arraybuffer";
~~~

---

#### <u>Frame 是线上实际传输的协议片段</u>

一个 Message 可以由一个 Frame 组成，也可以被拆成多个 Fragment（分片）：

~~~text
Application Message
        ↓
Frame 1
Frame 2
Frame 3
        ↓
Network
~~~

浏览器 WebSocket API 通常不会把这些 Frame 分片直接暴露给业务 JavaScript。

所以：

~~~text
WebSocket Frame
≠
业务消息
~~~

业务层应该围绕 Message 设计协议，不要依赖底层一个 Message 被拆成多少 Frame。

---

#### <u>Control Frame 负责连接控制</u>

WebSocket 定义了三类核心 Control Frame：

~~~text
Close
Ping
Pong
~~~

它们不承担普通业务数据。

Ping/Pong 可以用于存活检测；Close 用于协议级关闭握手。

Control Frame 和数据 Message 的职责应该分开：

~~~text
Protocol Control
Ping / Pong / Close

Application Data
chat / telemetry / command / event
~~~

后文心跳章节会继续区分“协议 Ping/Pong”和“应用层 heartbeat”。

---

#### <u>浏览器发往服务端的 Frame 必须 Mask</u>

RFC 6455 要求 Client → Server Frame 使用 Masking（掩码），Server → Client 不使用同样的客户端 Mask 规则。[[1]](https://www.rfc-editor.org/rfc/rfc6455)

这个机制位于协议层，浏览器自动完成。

应用代码不需要：

~~~ts
mask(payload)
~~~

也不应该把 Masking 理解为加密。

真正保护网络内容的是：

~~~text
wss://
→ TLS
~~~

而不是 Frame Mask。

---

### 【浏览器接口：WebSocket API 只提供基础连接能力】

浏览器标准 WebSocket API 很小，复杂性主要来自应用自己设计的生命周期。

#### <u>构造函数建立连接但不能自由设置 Authorization Header</u>

浏览器端标准 API：

~~~ts
const socket = new WebSocket(
  "wss://example.com/socket"
);
~~~

或者：

~~~ts
const socket = new WebSocket(
  "wss://example.com/socket",
  ["telemetry.v2"]
);
~~~

构造器只接受 URL 和可选 Subprotocol，没有 fetch / Axios 那样的自定义 Header 配置对象。[[7]](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket)

因此浏览器端 WebSocket 鉴权常见方案会受到这个 API 边界影响，后面会继续展开。

---

#### <u>readyState 只描述 Transport State</u>

WebSocket.readyState 有四种状态：

~~~text
CONNECTING = 0
OPEN       = 1
CLOSING    = 2
CLOSED     = 3
~~~

最小状态机：

~~~text
CONNECTING
    ↓ open
OPEN
    ↓ close()
CLOSING
    ↓
CLOSED
~~~

它只描述 WebSocket Transport（传输层连接）状态。

实际应用往往还需要另一套业务状态：

~~~text
CONNECTING
    ↓
AUTH_PENDING
    ↓
RECOVERING
    ↓
LIVE
~~~

因此：

~~~text
socket.readyState === OPEN
≠
业务连接已经可用
~~~

---

#### <u>open、message、close、error 是主要生命周期事件</u>

~~~ts
const socket =
  new WebSocket("wss://example.com/socket");

socket.addEventListener(
  "open",
  () => {
    console.log("transport open");
  }
);

socket.addEventListener(
  "message",
  event => {
    console.log(event.data);
  }
);

socket.addEventListener(
  "close",
  event => {
    console.log(
      event.code,
      event.reason,
      event.wasClean
    );
  }
);

socket.addEventListener(
  "error",
  event => {
    console.error(event);
  }
);
~~~

工程上不要依赖 error 事件直接决定复杂恢复策略。

更稳定的模式通常是：

~~~text
error
记录诊断信息
    ↓
close
统一进入关闭原因分类和恢复状态机
~~~

因为 CloseEvent 才提供 code、reason、wasClean 等关闭语义。[[8]](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent)

---

#### <u>send() 是入发送队列，不等于对端已经收到</u>

调用：

~~~ts
socket.send(payload);
~~~

不是同步把数据“送到服务端业务代码”。

浏览器会先把数据放进待发送队列。MDN 明确说明 send() 会把数据加入传输队列，同时增加 bufferedAmount。[[9]](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send)

因此：

~~~text
socket.send()
    ↓
Browser Send Queue
    ↓
OS / Network
    ↓
Server
~~~

所以：

~~~text
send() return
≠
Server received
≠
Server processed
~~~

如果业务需要“服务端确实处理完成”，要自己设计 Application ACK（应用层确认）。

---

#### <u>bufferedAmount 用于观察发送侧积压</u>

WebSocket.bufferedAmount 表示已经通过 send() 排队、但尚未实际传输到网络的字节数。[[10]](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/bufferedAmount)

可以做简单发送侧保护：

~~~ts
const HIGH_WATER_MARK =
  1024 * 1024;

function safeSend(
  socket: WebSocket,
  data: string
) {
  if (
    socket.readyState !==
    WebSocket.OPEN
  ) {
    return false;
  }

  if (
    socket.bufferedAmount >
    HIGH_WATER_MARK
  ) {
    return false;
  }

  socket.send(data);
  return true;
}
~~~

但 bufferedAmount 只反映浏览器发送队列，不代表：

- 服务端业务是否消费得过来；
- 服务端内部队列是否积压；
- 客户端接收端是否积压。

因此它只是背压观测的一层。

---

## 3. 从“连接已打开”到“业务可维护”：应用协议与连接状态层

协议层只给出一条能够双向收发 Message 的通道，却不知道什么是登录、订阅、遥测、ACK 或 Replay。因此第二层必须把**原始通道变成业务协议**，再用状态机限制不同阶段允许发生的行为。

~~~text
Raw WebSocket Message
        ↓
Application Envelope / Schema
        ↓
Protocol State Validation
        ↓
Business Handler
~~~

这一层向上承接浏览器 API，向下为鉴权、恢复和可靠性提供统一消息语义。

### 【应用协议：Envelope、消息类型与 Schema 赋予业务语义】

WebSocket 协议只负责把 Message 送到对端，并不知道业务里的“登录”“订阅”“事件”“错误”和“ACK”。

这些都需要应用自己定义。

#### <u>消息 Envelope 用统一外层结构承载协议语义</u>

一个可维护的消息通常不只发送裸数据：

~~~json
{
  "type": "telemetry.update",
  "version": 2,
  "requestId": "req-123",
  "sequence": 1042,
  "timestamp": 1730000000000,
  "payload": {
    "value": 42
  }
}
~~~

常见字段职责：

| 字段 | 解决的问题 |
| --- | --- |
| type | 这是什么消息 |
| version | 当前消息遵循哪一版 Schema |
| requestId | 请求与响应如何关联 |
| sequence | 顺序和缺口如何判断 |
| timestamp | 事件什么时候产生 |
| payload | 真实业务数据 |

不同系统不需要完全相同字段，但必须建立稳定的 Envelope（消息信封）概念。

---

#### <u>消息类型通常分为 Command、Event、Response 和 Control</u>

可以把应用消息按语义区分：

~~~text
Command
客户端要求服务端执行动作
例：subscribe / update / delete

Event
服务端宣布某件事发生
例：telemetry.update / order.changed

Response
对某个 requestId 的结果
例：success / error / data

Application Control
业务协议自身的控制消息
例：authenticate / heartbeat / ack / replay_complete
~~~

如果所有消息都只用：

~~~json
{
  "type": "message"
}
~~~

后续协议很难扩展。

---

#### <u>Schema Validation 必须发生在业务处理之前</u>

不要直接：

~~~ts
const message =
  JSON.parse(raw);

handleBusiness(message);
~~~

更稳妥：

~~~text
Raw Data
   ↓
Parse
   ↓
Schema Validation
   ↓
Protocol Version
   ↓
Connection State
   ↓
Authorization
   ↓
Business Handler
~~~

最小伪代码：

~~~ts
function onMessage(raw: string) {
  const parsed =
    parseJson(raw);

  const message =
    validateClientMessage(parsed);

  assertStateAllows(message.type);

  authorize(message);

  routeMessage(message);
}
~~~

这里每层解决不同问题：

- Parse：是不是合法 JSON；
- Schema：字段和类型是否合法；
- Version：双方协议语义是否一致；
- State：当前连接阶段能不能发这种消息；
- Authorization：这个身份有没有执行权限。

---

#### <u>协议版本应该显式治理而不是靠前后端同时上线</u>

长期连接系统很容易出现：

~~~text
Old Client
   ↓
New Server
~~~

或者：

~~~text
New Client
   ↓
Old Server
~~~

所以需要 Protocol Version（协议版本）策略。

简单方式：

~~~json
{
  "type": "authenticate",
  "protocolVersion": 2
}
~~~

服务端可以：

~~~text
supported
→ continue

unsupported
→ close / error
~~~

复杂系统还可以通过 Subprotocol：

~~~text
telemetry.v1
telemetry.v2
~~~

在握手阶段选择版本。

---

### 【连接状态：Transport State 与 Application State 必须分离】

只依赖 readyState 无法表达“正在认证”“正在补历史数据”“正在恢复登录态”等状态。

#### <u>Transport State 和 Application State 是两套状态</u>

Transport：

~~~text
CONNECTING
OPEN
CLOSING
CLOSED
~~~

Application：

~~~text
IDLE
  ↓
CONNECTING
  ↓
AUTH_PENDING
  ↓
RECOVERING
  ↓
LIVE
  ├─ auth expired
  │    → AUTH_RECOVERING
  │
  ├─ network failure
  │    → RECONNECT_WAIT
  │
  └─ fatal
       → STOPPED
~~~

这样才能回答：

- OPEN 后能否立即处理业务消息；
- Replay 期间是否允许 Live 数据进入；
- Token 过期时先 Refresh 还是先 Reconnect；
- 页面主动离开后是否还应该重连。

---

#### <u>状态约束可以阻止大量竞态问题</u>

例如首包认证：

~~~text
OPEN
    ↓
AUTH_PENDING
    ↓
authenticate
    ↓
AUTHENTICATED
~~~

如果 AUTH_PENDING 时收到：

~~~json
{
  "type": "delete-resource"
}
~~~

应该拒绝，而不是先处理业务再等待认证。

如果正在 AUTHENTICATING 又收到第二个 authenticate，也需要定义：

~~~text
reject
或
ignore
~~~

而不是让两个异步验证同时修改连接上下文。

---

#### <u>异步回调必须防旧连接事件污染新连接</u>

一个常见竞态：

~~~text
Socket A 断线
    ↓
创建 Socket B
    ↓
Socket A 的旧 close / message 回调晚到
    ↓
误修改 Socket B 状态
~~~

常见保护：

~~~ts
const socket =
  new WebSocket(url);

this.socket = socket;

socket.onmessage = event => {
  if (
    this.socket !== socket
  ) {
    return;
  }

  handleMessage(event);
};
~~~

这个“引用比对”看似简单，却是很多重连 Bug 的关键防线。

---

## 4. 从“能够通信”到“长期可信”：会话、存活与故障恢复层

长连接和普通 HTTP Request 最大的差别是：**身份、网络和服务状态都会在连接存活期间发生变化。** 因此这一层不是三个独立专题，而是一条长期连接生命周期。

~~~text
AUTH_PENDING
    ↓
AUTHENTICATED
    ↓
LIVE
    │
    ├─ Credential Expired / Session Revoked
    │      → Session Recovery
    │
    ├─ Heartbeat Failed
    │      → Connection Failure
    │
    └─ Close
           ↓
       Failure Classification
           ↓
       Refresh / Reconnect / Stop
~~~

所以本层依次回答三个问题：**这条连接可信么 → 它还活着么 → 出故障后应该怎样恢复。**

### 【可信连接：Authentication、Session 与 Authorization 接入长连接】

WebSocket 没有内建 Authentication（身份认证）和 Authorization（访问控制）。RFC 6455 本身只定义连接和消息协议。

完整身份体系继续参考：

- [Web 身份认证、会话控制与访问控制体系](./Web身份认证会话控制与访问控制体系.md)
- [Access Token 与 Refresh Token 核心知识点](./Access%20Token与Refresh%20Token核心知识点笔记.md)
- [Cookie 安全性概述](./Cookie安全性概述笔记.md)

本节只讨论它们怎样接到 WebSocket 生命周期。

#### <u>浏览器不能自由给 WebSocket 握手增加 Authorization Header</u>

浏览器标准 WebSocket 构造器只提供：

~~~ts
new WebSocket(url);
new WebSocket(url, protocols);
~~~

没有：

~~~ts
new WebSocket(url, {
  headers: {
    Authorization:
      "Bearer ..."
  }
});
~~~

因此浏览器 WebSocket 常见凭证入口主要有：

| 方式 | 阶段 | 优点 | 风险 / 代价 |
| --- | --- | --- | --- |
| Cookie | Upgrade | 和 Server Session 自然结合 | 自动携带，需要 Origin 防护 |
| Query 临时票据 | Upgrade | 服务端可在 Upgrade 前拒绝 | URL 可能进入日志，应使用短期一次性票据 |
| 首条认证消息 | OPEN 后 | Token 不进入 URL | 未认证连接已经占资源 |
| 非浏览器自定义 Header | Upgrade | 语义直接 | 浏览器原生 API 不支持 |

---

#### <u>首条认证需要认证超时和状态限制</u>

完整流程：

~~~text
HTTP Upgrade
    ↓
OPEN
    ↓
AUTH_PENDING
    │
    ├─ timeout
    │    → close
    │
    └─ authenticate
          ↓
      verify credential
          ↓
      bind principal
          ↓
      AUTHENTICATED
~~~

最小示例：

~~~ts
function attach(
  socket: WebSocket
) {
  let authenticated = false;

  const timer =
    setTimeout(() => {
      if (!authenticated) {
        socket.close(
          4001,
          "authentication timeout"
        );
      }
    }, 5000);

  socket.on("message",
    async raw => {
      const message =
        parse(raw);

      if (!authenticated) {
        if (
          message.type !==
          "authenticate"
        ) {
          socket.close(
            4001,
            "authenticate first"
          );
          return;
        }

        const principal =
          await verifyCredential(
            message.token
          );

        bindPrincipal(
          socket,
          principal
        );

        authenticated = true;
        clearTimeout(timer);
        return;
      }

      routeBusinessMessage(
        message
      );
    }
  );
}
~~~

这里真正重要的是：

~~~text
Transport OPEN
和
Business Authenticated
分离
~~~

---

#### <u>Authentication 成功后仍然需要 Authorization</u>

Token 有效只能证明：

~~~text
“这是一个合法身份”
~~~

不能证明：

~~~text
“这个身份可以访问任意资源”
~~~

消息处理仍需要：

~~~text
Principal
+
Resource
+
Action
+
Context
    ↓
Authorization
    ↓
Allow / Deny
~~~

例如：

~~~ts
authorize({
  principal,
  resource: {
    type: "room",
    id: message.roomId
  },
  action: "room:publish"
});
~~~

这一点和 HTTP API 完全一样，只是 WebSocket 的权限判断发生在长期连接上的消息处理阶段。

---

#### <u>长连接身份有效性要拆成自然过期、主动撤销和连接存活三条线</u>

Access Token 可能只有 15 分钟，但 WebSocket 可以持续数小时。只在建连时验证一次会产生：

~~~text
10:00
Access Token valid
→ WebSocket authenticated

10:15
Access Token expired

14:00
socket 仍然在传业务数据
~~~

但这里不应该把所有问题都归为“周期重新鉴权”。长期连接实际上存在三类完全不同的状态：

| 问题 | 本质 | 更自然的处理方式 |
| --- | --- | --- |
| Access Token 自然到期 | 一个已知时间事件 | Expiry Timer / 到期关闭 |
| Session 被提前撤销 | 服务端状态发生变化 | Revocation Event + Connection Registry |
| 网络连接是否仍存活 | Transport / Endpoint 状态 | Ping / Pong + Heartbeat |

这三条线应该尽量分离。

**1. 自然过期不需要客户端周期重新 authenticate**

如果首次认证以后服务器已经得到：

~~~text
principal.accessTokenExpiresAt
~~~

那么“什么时候自然过期”已经是一个确定答案。服务端可以直接计算：

~~~text
delay = expiresAt - now
~~~

并给当前连接设置一次性 Expiry Timer：

~~~ts
const delay = Math.max(
  0,
  principal.accessTokenExpiresAt - Date.now()
);

context.authExpiryTimer = setTimeout(() => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.close(
      4001,
      "access token expired"
    );
  }
}, delay);
~~~

因此：

~~~text
Client 周期发送 authenticate
不是判断自然过期的必要条件

Server 每几秒重新解析同一 Token
也不是判断自然过期的必要条件
~~~

客户端通常只需要在新连接建立时提供 Credential；Token 到期后由服务端关闭连接，客户端再进入 Refresh → Reconnect → Authenticate 的恢复链。

这一思路同时适用于 JWT 和 Opaque Token：JWT 可以从 `exp` 得到到期时间；Opaque Token 的 Session Store 也可以保存 `expires_at`。

**2. Session Revocation 不能只靠 Expiry Timer**

Expiry Timer 只能回答：

> 这个 Access Token 什么时候自然到期？

它无法知道：

- 用户刚刚 Logout；
- 管理员主动封禁账号；
- Refresh Token Reuse 导致整个 Token Family 被撤销；
- 权限策略要求当前 Session 立即失效。

例如 Access Token 10:15 到期，但 10:05 用户 Logout，如果只等 Expiry Timer，这条 WebSocket 还可能继续存活 10 分钟。

更及时的做法是维护：

~~~text
sessionId / familyId
        ↓
Set<WebSocket Connection>
~~~

当 Session 被 revoke 时：

~~~text
revoke session
    ↓
publish session.revoked
    ↓
Connection Registry
    ↓
找到相关连接
    ↓
close immediately
~~~

单实例可以直接在内存 Registry 中完成；多实例可以通过 Redis Pub/Sub、消息总线或其他 Session Invalidation Channel 把撤销事件广播到各 WebSocket 节点。

**3. 周期 Revalidation 是一种折中，而不是默认最优解**

周期调用完整 `verifyAccessToken()` 确实可以同时检查：

~~~text
exp
session revoked?
user still active?
~~~

优点是实现简单，不需要额外的 Revocation Event；但连接数增加以后，它会形成：

~~~text
connection count
×
revalidation frequency
=
持续认证开销
~~~

而且如果过期时间本来已经确定，周期重新检查 `exp` 本身属于重复工作。

所以更清晰的优先级通常是：

~~~text
Natural Expiration
→ Expiry Timer

Immediate Revocation
→ Session Event + Connection Registry

Connection Liveness
→ Heartbeat

Periodic Revalidation
→ 当系统暂时没有主动撤销通道时的折中方案
~~~

完整 Token Family、Rotation、Reuse Detection 和过期模型继续阅读 [Access Token 与 Refresh Token 核心知识点](./Access%20Token与Refresh%20Token核心知识点笔记.md)。

---

### 【存活判断：协议心跳、应用心跳与业务 Watchdog 分别回答不同问题】

“做了 heartbeat”并不能说明监控的是哪一层。

#### <u>Protocol Ping/Pong 检查 WebSocket Endpoint</u>

RFC 6455 自带 Ping / Pong Control Frame。

服务端库通常可以：

~~~ts
socket.ping();
~~~

客户端协议栈自动回 Pong。

Node.js ws 官方示例也通过 Ping/Pong 检查失效连接。[[6]](https://github.com/websockets/ws)

它主要判断：

~~~text
WebSocket Endpoint
是否还在响应
~~~

---

#### <u>浏览器 JavaScript 不能直接发送协议 Ping Frame</u>

浏览器标准 WebSocket API 暴露：

- send；
- close；
- message；
- open；
- error；
- close。

但没有：

~~~ts
socket.ping()
~~~

所以浏览器应用如果希望主动探测应用链，通常会发送普通业务消息：

~~~json
{
  "type": "ping",
  "nonce": "abc",
  "sentAt": 1730000000000
}
~~~

服务端回复：

~~~json
{
  "type": "pong",
  "nonce": "abc",
  "serverTime": 1730000000123
}
~~~

这不是 RFC Ping Frame，而是 Application Heartbeat（应用层心跳）。

---

#### <u>Business Watchdog 检查业务数据有没有继续推进</u>

还存在第三种异常：

~~~text
Protocol Ping/Pong 正常
Application Ping/Pong 正常
        ↓
业务实时数据停止更新
~~~

说明 Transport 和消息循环都活着，但业务生产链已经停了。

所以高价值实时系统还需要：

~~~text
lastBusinessDataAt
lastSequence
lastBucket
lastEventTime
~~~

等业务进度指标。

三层关系：

~~~text
Protocol Heartbeat
→ connection endpoint alive?

Application Heartbeat
→ application message path alive?

Business Watchdog
→ business stream progressing?
~~~

这三层不能互相替代。

---

#### <u>Heartbeat Interval 需要结合基础设施 Idle Timeout</u>

心跳间隔不能只拍脑袋写 30 秒。

完整链路可能包含：

~~~text
Browser
  ↓
CDN
  ↓
Load Balancer
  ↓
Reverse Proxy
  ↓
WebSocket Server
~~~

任何一层都可能存在 Idle Timeout（空闲超时）。

因此设计时要检查：

~~~text
heartbeat interval
<
minimum idle timeout
~~~

同时不能过于频繁，否则：

~~~text
100,000 connections
×
1 heartbeat / second
=
100,000 extra messages / second
~~~

心跳本身会成为负载。

---

### 【故障恢复：Close Code 决定刷新、重连还是停止】

WebSocket 不会自动替业务决定“断开以后怎么办”。

#### <u>Close Code 提供关闭语义</u>

常见关闭码：

| Code | 含义 |
| --- | --- |
| 1000 | Normal Closure |
| 1001 | Going Away |
| 1002 | Protocol Error |
| 1008 | Policy Violation |
| 1009 | Message Too Big |
| 1011 | Internal Error |
| 1012 | Service Restart |
| 1013 | Try Again Later |
| 4000–4999 | Application Private Use |

MDN 对 CloseEvent.code 的注册含义有完整列表。[[11]](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code)

特别注意：

> 1006 是 Reserved（保留值），表示没有收到 Close Frame 的异常断开，不能由应用主动作为 Close Frame 状态码发送。

所以旧代码里这种写法是错误示例：

~~~ts
socket.close(
  1006,
  "network error"
);
~~~

应用应该选择可发送的合法关闭码，或者直接让异常网络断开由浏览器最终表现为 1006。

---

#### <u>故障分类比固定重连更重要</u>

恢复决策：

~~~text
Close
  │
  ├─ Normal
  │    → stop
  │
  ├─ Authentication Expired
  │    → refresh session
  │    → reconnect
  │
  ├─ Forbidden / Protocol Error
  │    → stop
  │
  ├─ Service Restart / Temporary Failure
  │    → backoff reconnect
  │
  └─ Network Failure
       → backoff reconnect
~~~

如果所有错误都：

~~~text
close
→ reconnect
→ reconnect
→ reconnect
~~~

权限错误、协议不兼容和登录失效都会形成无限循环。

---

#### <u>Exponential Backoff 控制单客户端，Jitter 控制群体同步</u>

指数退避：

~~~text
delay =
base × 2^attempt
~~~

例如：

~~~text
500ms
1s
2s
4s
8s
15s cap
~~~

但是如果服务器重启导致所有客户端同时断开，大家仍可能在相同时刻重连。

因此还要加 Jitter（随机抖动）：

~~~ts
const ceiling =
  Math.min(
    15000,
    500 * 2 ** attempt
  );

const delay =
  Math.random() *
  ceiling;
~~~

这样可以把：

~~~text
10,000 clients
同一秒重连
~~~

摊到一个时间窗口。

---

#### <u>页面和网络生命周期也应该进入重连决策</u>

浏览器还可以利用：

~~~text
navigator.onLine
document.visibilityState
online / offline event
visibilitychange
~~~

避免：

- 明确离线时持续连接；
- 页面已经离开仍不断创建连接；
- hidden 页面无意义地高频重试。

但“页面 hidden 就一定断 WebSocket”也不是固定规则，要根据业务是否需要后台实时更新判断。

---

## 5. 从“重新连上”到“业务数据连续”：可靠性与流量控制层

重连只恢复 Transport，不能证明断线期间的数据已经补齐，也不能证明消息只处理一次，更不能解决生产速度大于消费速度的问题。因此可靠性必须继续沿数据流向下分析。

~~~text
Reconnect
   ↓
Recovery Cursor
   ↓
Replay / Gap
   ↓
ACK / Delivery Semantics
   ↓
Application Queue
   ↓
Backpressure / Flow Control
~~~

这一层把“连接可靠”升级为“业务进度可恢复、数据处理可解释、流量不会把系统压垮”。

### 【数据恢复：Cursor、Replay 与 Gap 跨连接延续业务进度】

连接重新 OPEN 并不意味着断线期间的数据自动回来。

#### <u>Recovery Cursor 表示业务数据进度</u>

常见 Cursor：

| Cursor | 优点 | 局限 |
| --- | --- | --- |
| sequence / offset | 单调，Gap 易判断 | 服务端要维护稳定编号 |
| eventId | 事件级唯一 | 查询和索引成本 |
| timestamp | 直观 | 同时间多事件和时钟问题 |
| time bucket | 适合时间窗口数据 | 粒度更粗 |

恢复链：

~~~text
last confirmed cursor = N
        ↓
disconnect
        ↓
reconnect
        ↓
resume from N + 1
        ↓
Replay
        ↓
Replay Complete
        ↓
Live
~~~

---

#### <u>Replay 和 Live 最好有明确边界</u>

如果补发和实时流混在一起：

~~~text
10:05 replay
10:08 live
10:06 replay
10:09 live
~~~

客户端需要额外：

- 排序；
- 缓冲；
- 去重；
- 延迟 Live 提交。

更容易证明正确性的状态：

~~~text
AUTHENTICATED
    ↓
REPLAYING
    ↓
history
    ↓
REPLAY_COMPLETE
    ↓
LIVE
~~~

---

#### <u>Retention Gap 和真正 No-data 必须区分</u>

两种“查不到数据”含义完全不同：

~~~text
No-data
这个时间窗口本来就没有事件

Retention Gap
这个时间窗口可能有事件
但服务端已经不再保留
~~~

协议最好显式表达：

~~~json
{
  "type": "gap",
  "requestedFrom": 100,
  "earliestAvailable": 300,
  "latest": 500
}
~~~

而不是只发送：

~~~json
{
  "points": []
}
~~~

否则客户端无法判断历史是否完整。

---

### 【投递语义：TCP 可靠不等于业务 Exactly-once】

这是 WebSocket 面试和工程设计里最容易混淆的一层。

#### <u>单连接可靠传输只解决网络传输的一部分语义</u>

TCP / WebSocket 能保证一条存活连接上的数据可靠、有序传输，但应用仍然不知道：

~~~text
server.send()
客户端是否已收到？

message event
业务是否处理？

业务处理完成
服务端是否知道？

断线发生时
最后一条处于哪个阶段？
~~~

因此需要 Application-level Delivery Semantics（应用层投递语义）。

---

#### <u>ACK 定义哪一步才算确认</u>

可以在不同阶段 ACK：

| ACK 阶段 | 表示什么 |
| --- | --- |
| receive ACK | 客户端已收到 |
| queue ACK | 已进入本地可靠队列 |
| process ACK | 业务处理完成 |
| persist ACK | 已持久化 |

例子：

~~~ts
// Server
send({
  type: "event",
  sequence: 1042,
  payload
});

// Client
await process(payload);

send({
  type: "ack",
  sequence: 1042
});
~~~

服务端收到 ACK 后才推进 confirmed cursor。

---

#### <u>At-most-once、At-least-once 和 Exactly-once 是应用语义</u>

可以这样理解：

~~~text
At-most-once
不重试
可能丢
不会因为重试重复

At-least-once
超时重试
尽量不丢
可能重复

Exactly-once Effect
允许底层重试
但业务通过幂等 / 去重 / 事务
保证最终只产生一次业务效果
~~~

因此：

> Exactly-once 不是 WebSocket 协议自动提供的属性。

常见组合：

~~~text
sequence / eventId
+
ACK
+
retry
+
dedupe / idempotency
+
durable progress
~~~

---

### 【流量控制：Backpressure 处理生产速度大于消费速度】

MDN 明确指出标准 WebSocket 接口本身不提供自动 Backpressure（背压）；如果消息到达速度高于应用处理能力，可能导致内存增长或 CPU 长时间占满。[[12]](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

这是实时系统性能设计的核心问题。

#### <u>发送侧可以通过 bufferedAmount 观察浏览器队列</u>

~~~text
Application send()
      ↓
Browser Send Queue
      ↓
Network
~~~

bufferedAmount 高说明发送侧开始积压。

可以：

- 暂停低优先级消息；
- 合并状态更新；
- 降采样；
- 等待 bufferedAmount 回落；
- 直接断开慢消费者。

---

#### <u>接收侧需要应用自己的 Queue</u>

标准 WebSocket 没有：

~~~ts
await socket.read()
~~~

这种基于 Streams Backpressure 的标准接口。

message event 会持续进入应用。

因此高频数据通常需要：

~~~text
WebSocket message
      ↓
轻量 Parse / Validate
      ↓
Application Queue
      ↓
Consumer Scheduler
      ↓
State / Chart / Map
~~~

不要：

~~~text
每收到一条消息
→ 立即执行重渲染
~~~

否则网络到包节奏会直接绑死 UI 更新节奏。

---

#### <u>背压至少要区分三层</u>

~~~text
Transport Backpressure
发送缓冲 / socket buffer

Application Backpressure
业务 Queue 增长

Rendering Backpressure
UI / Canvas / Map 消费不过来
~~~

它们的指标和解决方法不同。

例如：

~~~text
socket bufferedAmount 高
→ 网络 / 对端消费慢

socket 正常但 app queue 高
→ 本地业务处理慢

queue 已清空但 FPS 低
→ 单次渲染复杂度高
~~~

不能用一个 FPS 或一个 Queue Length 解释全部问题。

---

#### <u>WebSocketStream 提供自动 Streams Backpressure，但不能作为通用默认</u>

MDN 还介绍 WebSocketStream，它利用 Streams API 提供自动背压，但目前属于非标准 / 实验性接口，不应该在需要广泛浏览器兼容的生产系统中直接替代标准 WebSocket。[[13]](https://developer.mozilla.org/en-US/docs/Web/API/WebSocketStream)

所以目前更通用的工程策略仍然是：

~~~text
standard WebSocket
+
application queue
+
explicit flow control
~~~

---

## 6. 从“一个连接能工作”到“生产系统能承载”：服务端架构、入口与安全层

单机 Demo 中，一个 `Set<WebSocket>` 就能广播；生产环境却还要面对多实例、共享订阅、负载均衡、TLS、反向代理、滚动发布和攻击面。它们共同属于**运行 WebSocket 服务的系统边界**。

~~~text
Client
  ↓
TLS / Load Balancer / Reverse Proxy
  ↓
WebSocket Server Instance
  ↓
Connection Registry
  ↓
Shared Backplane / State
~~~

Security（安全）横切整个链路：握手入口、身份、消息、资源和流量都需要独立控制。

### 【连接扩展：Connection Registry 与共享背板支撑多实例】

单机 Demo 常见：

~~~ts
const clients =
  new Set<WebSocket>();
~~~

生产系统扩大后，需要回答：

- 一个用户有几个连接；
- 一个房间在哪些实例有连接；
- 广播怎样跨实例；
- 重连落到另一台机器怎么办；
- 部署时怎样优雅迁移连接。

#### <u>Connection Registry 管理用户和连接关系</u>

常见映射：

~~~text
connectionId
→ connection context

userId
→ Set<connectionId>

roomId
→ Set<connectionId>
~~~

连接上下文可以包括：

~~~text
principal
subscriptions
protocolVersion
lastSeenAt
cursor
rate limit state
connection metadata
~~~

Close 时必须清理所有反向索引。

---

#### <u>多实例不能只依赖进程内 Map</u>

假设：

~~~text
Client A → Server 1
Client B → Server 2
~~~

用户 A 在 Server 1 发布一条事件，要推给 Server 2 上的 B：

~~~text
Server 1 local clients
看不到
Server 2 local clients
~~~

因此需要 Shared Backplane（共享消息背板）：

~~~text
WebSocket Server 1
        │
        ├── Redis Pub/Sub
        ├── NATS
        ├── Kafka
        └── Other Broker
        │
WebSocket Server 2
~~~

选择什么组件取决于：

- 是否需要持久化；
- 是否允许丢；
- 顺序要求；
- Replay；
- 吞吐；
- 延迟；
- 消费模型。

Redis Pub/Sub 适合简单瞬时广播，但不能因为“能 Pub/Sub”就等同于持久事件日志。

---

#### <u>Sticky Session 不是 WebSocket 扩容的唯一答案</u>

Load Balancer 在握手时把连接分给某个实例后，这条长连接会继续留在该实例。

真正的问题出现在：

~~~text
disconnect
→ reconnect
→ another instance
~~~

如果：

- Session；
- Cursor；
- Subscription；
- Replay 数据；

都只存在旧实例内存，新实例无法恢复。

两种路线：

~~~text
Sticky Session
尽量回到原实例

或者

Externalized State
把恢复需要的状态放到共享存储
允许重连到任意实例
~~~

长期来看，真正高可用系统通常更依赖状态外置，而不是把正确性完全建立在 Sticky Session 上。

---

#### <u>服务发布需要 Connection Draining</u>

HTTP 服务更新时，旧请求很快结束；WebSocket 连接可能保持数小时。

如果进程直接被杀：

~~~text
thousands of connections
→ abnormal close
→ reconnect storm
~~~

更稳妥的发布：

~~~text
stop accepting new connections
      ↓
mark draining
      ↓
notify / close existing connections
      ↓
clients reconnect with jitter
      ↓
wait grace period
      ↓
terminate old instance
~~~

Close Code 1012 Service Restart 可以作为一种明确的服务重启语义。[[11]](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code)

---

### 【网络入口：TLS、Proxy 与 Load Balancer 承接生产连接】

WebSocket 服务很少直接裸露在公网。

常见链路：

~~~text
Browser
  ↓ wss://
CDN / Load Balancer
  ↓
Reverse Proxy / Gateway
  ↓
WebSocket Server
~~~

完整入口体系继续阅读：

- [反向代理与 Web 入口体系](./反向代理与Web入口体系.md)
- [跨域问题](./跨域问题.md)

这里只解释 WebSocket 特有的注意点。

#### <u>生产环境优先使用 WSS</u>

~~~text
ws://
WebSocket over plaintext

wss://
WebSocket over TLS
~~~

如果网页本身运行在 HTTPS 下，生产系统通常也应该使用 WSS，避免 Mixed Content 和明文传输风险。

---

#### <u>Proxy 必须正确支持 WebSocket Upgrade 或对应新协议机制</u>

经典 HTTP/1.1 代理链要正确转发 Upgrade 相关语义。

否则可能表现为：

~~~text
HTTP API 正常
但 WebSocket 一直握手失败
~~~

除了 Upgrade 支持，还要检查：

- idle timeout；
- read timeout；
- connection draining；
- 最大连接数；
- Header 大小；
- Origin；
- TLS termination；
- HTTP/2 WebSocket 支持方式。

所以“本机 ws://localhost 能连”不等于生产入口已经正确。

---

### 【安全治理：连接、消息与资源必须分层防护】

WebSocket 是长期开放的双向输入通道，攻击面不仅发生在握手。

OWASP WebSocket Security Cheat Sheet 重点覆盖 CSWSH、认证绕过、注入、DoS 和监控缺口等问题。[[14]](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)

#### <u>Origin Validation 防止跨站建立已认证连接</u>

浏览器握手会携带 Origin。

特别是 Cookie 自动认证时，如果服务端不校验 Origin，恶意站点可能诱导用户浏览器建立带用户 Cookie 的 WebSocket，这类攻击称为 Cross-Site WebSocket Hijacking（跨站 WebSocket 劫持，CSWSH）。

因此：

~~~text
HTTP CORS
≠
WebSocket Origin Validation
~~~

服务端应该显式维护允许来源：

~~~ts
const allowedOrigins =
  new Set([
    "https://app.example.com"
  ]);

function verifyOrigin(
  origin: string | undefined
) {
  return (
    origin !== undefined &&
    allowedOrigins.has(origin)
  );
}
~~~

完整 Same-Origin / CORS 知识继续阅读 [跨域问题](./跨域问题.md)。

---

#### <u>Authentication 之后仍然要验证每条消息</u>

完整入站链：

~~~text
Connection
    ↓
Authentication
    ↓
Payload Size
    ↓
Parse
    ↓
Schema
    ↓
Protocol State
    ↓
Authorization
    ↓
Rate Limit
    ↓
Business Handler
~~~

不要认为“Token 合法”就可以：

~~~ts
database.execute(
  message.sql
);
~~~

WebSocket 消息仍然是不可信输入。

---

#### <u>限制 Message Size 和 Message Rate 防止 DoS</u>

常见保护：

~~~text
max payload
max JSON depth
max messages / second
max connections / user
max connections / IP
max subscriptions
max replay range
~~~

Node.js ws 提供 maxPayload 等限制项；实际阈值应该根据业务数据大小和负载测试决定，而不是直接使用最大默认值。[[15]](https://github.com/websockets/ws/blob/master/doc/ws.md)

---

#### <u>日志不能记录 Secret</u>

避免记录：

- Access Token；
- Refresh Token；
- Cookie；
- 完整 authenticate payload；
- URL 中的敏感 Query。

否则鉴权设计本身可能没问题，但日志系统变成凭证泄漏入口。

---

## 7. 从“代码里有这些机制”到“生产能力可证明”：可观测性与测试层

连接、重连、Replay 和 Backpressure 写进代码并不代表能力已经成立。最后必须通过 Metrics、Logs、Integration Test、Load Test 和 Fault Injection 回答：**它为什么断、多久恢复、数据是否完整、扩容后是否仍然正确。**

~~~text
Runtime State
   ↓
Metrics / Logs
   ↓
Failure Evidence
   ↓
Integration / Load / Fault Test
   ↓
可验证的工程结论
~~~

### 【可观测性：指标覆盖连接、消息与恢复生命周期】

WebSocket 的问题很多发生在 HTTP Access Log 看不到的阶段。

#### <u>连接指标回答“连接是否健康”</u>

建议指标：

| 指标 | 回答的问题 |
| --- | --- |
| active_connections | 当前多少连接 |
| connection_attempts | 建连频率 |
| handshake_failures | 握手为什么失败 |
| auth_failures | 认证失败原因 |
| close_codes | 主要断线类型 |
| connection_duration | 一条连接活多久 |
| heartbeat_timeout | 僵尸连接情况 |
| reconnect_attempts | 客户端恢复压力 |

---

#### <u>消息指标回答“实时流是否健康”</u>

~~~text
messages_in / sec
messages_out / sec
bytes_in / sec
bytes_out / sec
parse failures
schema failures
rate-limit rejects
send buffer
queue depth
oldest queue age
~~~

只看“在线连接数”无法发现：

~~~text
连接全都在线
但业务消息已经不流动
~~~

---

#### <u>可靠性指标回答“断线后恢复得怎么样”</u>

~~~text
replay count
replay duration
gap count
unrecoverable gap
close → live duration
duplicate count
ack latency
~~~

如果系统声称“支持断线恢复”，至少应该有指标证明：

> 断线以后多久重新进入 Live，以及有多少恢复失败。

---

### 【测试验证：沿状态机和故障链验证生产能力】

只测试“能连接并发送 hello”无法覆盖生产问题。

#### <u>协议和消息测试</u>

~~~text
valid message
invalid JSON
invalid schema
unsupported version
oversized message
message before auth
duplicate auth
invalid state transition
~~~

---

#### <u>连接和会话测试</u>

~~~text
handshake success
handshake failure
authentication timeout
expired credential
revoked session
heartbeat timeout
server close
network drop
service restart
~~~

---

#### <u>恢复测试</u>

~~~text
reconnect same cursor
replay range
duplicate replay
gap
retention exceeded
refresh success
refresh failure
backoff
jitter
~~~

---

#### <u>压力和故障注入测试</u>

需要验证：

~~~text
大量并发建连
大量同时断线
reconnect storm
slow consumer
large payload
message flood
broker failure
single node restart
proxy timeout
~~~

这类测试才能发现普通单元测试看不到的“群体行为”。

---

## 8. 从单篇知识到可迁移体系：知识树、关联文档与项目实践

前面六层解决 WebSocket 自身的工程链路；这一层负责把它重新接回完整 Full-Stack 知识体系，并通过真实项目验证哪些机制已经实现、哪些只是设计选择。

### 【知识树：把协议、会话、可靠性和系统架构连成整体】

最终可以把整套知识压缩为下面这棵树：

~~~text
WebSocket
│
├─ 1. 技术定位
│   ├─ HTTP
│   ├─ Polling / Long Polling
│   ├─ SSE
│   └─ WebTransport
│
├─ 2. 协议建立
│   ├─ HTTP Opening Handshake
│   ├─ Upgrade / Extended CONNECT
│   ├─ Origin
│   ├─ Subprotocol
│   └─ Extension
│
├─ 3. 数据协议
│   ├─ Message
│   ├─ Frame / Fragmentation
│   ├─ Text / Binary
│   ├─ Ping / Pong / Close
│   ├─ Masking
│   └─ Compression
│
├─ 4. Browser API
│   ├─ WebSocket()
│   ├─ readyState
│   ├─ open / message / error / close
│   ├─ send / close
│   ├─ binaryType
│   └─ bufferedAmount
│
├─ 5. Application Protocol
│   ├─ Envelope
│   ├─ type / version
│   ├─ requestId
│   ├─ sequence
│   ├─ schema validation
│   └─ state validation
│
├─ 6. Connection Lifecycle
│   ├─ CONNECTING
│   ├─ AUTH_PENDING
│   ├─ RECOVERING
│   ├─ LIVE
│   ├─ RECONNECT_WAIT
│   └─ STOPPED
│
├─ 7. Identity
│   ├─ Authentication
│   ├─ Session
│   ├─ Authorization
│   ├─ Credential Transport
│   └─ Session Revalidation
│
├─ 8. Liveness
│   ├─ Protocol Ping/Pong
│   ├─ Application Heartbeat
│   └─ Business Watchdog
│
├─ 9. Failure Recovery
│   ├─ Close Code
│   ├─ Error Classification
│   ├─ Exponential Backoff
│   ├─ Jitter
│   └─ Lifecycle Gating
│
├─ 10. Data Recovery
│   ├─ Cursor
│   ├─ Replay
│   ├─ Gap
│   ├─ Retention
│   ├─ ACK
│   ├─ Dedupe
│   └─ Delivery Semantics
│
├─ 11. Flow Control
│   ├─ bufferedAmount
│   ├─ Application Queue
│   ├─ Backpressure
│   ├─ Slow Consumer
│   └─ Render Scheduling
│
├─ 12. Server Architecture
│   ├─ Connection Registry
│   ├─ Subscription Registry
│   ├─ Pub/Sub Backplane
│   ├─ Multi-instance
│   ├─ Sticky / External State
│   └─ Connection Draining
│
├─ 13. Deployment
│   ├─ WSS / TLS
│   ├─ Proxy
│   ├─ Load Balancer
│   ├─ Idle Timeout
│   └─ Rolling Update
│
├─ 14. Security
│   ├─ Origin Validation
│   ├─ Authentication
│   ├─ Authorization
│   ├─ Input Validation
│   ├─ Payload Limit
│   ├─ Rate Limit
│   └─ Secret Logging
│
└─ 15. Engineering Verification
    ├─ Metrics
    ├─ Logs
    ├─ Tracing / Events
    ├─ Integration Test
    ├─ Load Test
    └─ Fault Injection
~~~

这棵树的关系不是随机并列：

~~~text
先建立连接
    ↓
再定义如何通信
    ↓
再让连接可信
    ↓
再保证长期存活
    ↓
断了以后恢复连接
    ↓
恢复连接以后恢复数据
    ↓
流量变大以后处理背压和扩容
    ↓
最后用安全、部署、观测和测试保证生产可用
~~~

---

### 【关联知识：网络、身份与其他实时协议形成前后置关系】

为了避免同一知识重复维护，本篇只把相关分支连接到已有主文档。

#### <u>网络和入口是 WebSocket 的前置知识</u>

建议先理解：

- [计算机网络连接概述](./计算机网络连接概述.md)
- [浏览器网络面试题](./浏览器网络面试题.md)
- [反向代理与 Web 入口体系](./反向代理与Web入口体系.md)

它们分别解释：

~~~text
TCP / 网络连接
    ↓
Browser Network
    ↓
Public Entry / Proxy
    ↓
WebSocket
~~~

---

#### <u>身份体系是 WebSocket 鉴权的上位知识</u>

继续阅读：

- [Web 身份认证、会话控制与访问控制体系](./Web身份认证会话控制与访问控制体系.md)
- [Cookie 安全性概述笔记](./Cookie安全性概述笔记.md)
- [Access Token 与 Refresh Token 核心知识点笔记](./Access%20Token与Refresh%20Token核心知识点笔记.md)
- [浏览器存储方式](./浏览器存储方式.md)

本篇只负责：

~~~text
这些 Credential
怎样进入 WebSocket 生命周期
~~~

而不重复维护完整的登录和权限知识。

---

#### <u>其他实时协议用于建立选型边界</u>

- [MQTT 详细学习笔记](./MQTT%20详细学习笔记（含知识点对应问题）.md)
- [流式输出从0到1知识梳理](./流式输出从0到1知识梳理.md)
- [前端页面通信详细笔记](./前端页面通信详细笔记（含场景、方案及知识点问题）.md)

这样可以继续比较：

~~~text
WebSocket
SSE
MQTT
Streaming HTTP
Browser-local Communication
~~~

分别适合什么通信模型。

---

### 【项目实践：用真实源码验证通用机制】

通用知识正文不以项目为上下文，但可以通过项目分析文档验证真实工程是怎样组合这些机制的。

#### <u>QHZHC 实时平台：鉴权、重连与数据恢复</u>

项目实践文档：

[WebSocket 鉴权与可恢复实时连接](https://github.com/cxDlogver/qhzhc-realtime-platform/blob/main/docs/WebSocket鉴权与可恢复实时连接.md)

这篇实践文档可以用于验证：

~~~text
通用知识
HTTP Upgrade
→ 项目中的 server.on("upgrade")

通用知识
首条消息认证
→ authenticate + auth timeout

通用知识
Long-lived Session Validation
→ 自然过期 Timer + 主动撤销 + Heartbeat 职责分离

通用知识
Close Classification
→ close code → refresh / reconnect / stop

通用知识
Recovery Cursor
→ resumeFromBucketStartMs

通用知识
Replay / Live Boundary
→ replaying + replay_complete

通用知识
Gap
→ retention / unavailable range

通用知识
Backpressure
→ bufferedAmount / slow consumer
~~~

阅读顺序建议：

~~~text
本篇通用知识
    ↓
理解机制和边界
    ↓
项目实践文档
    ↓
真实源码和测试
    ↓
回到通用知识总结可迁移设计
~~~

---

## 9. 参考文献

1. RFC Editor, RFC 6455: The WebSocket Protocol  
   https://www.rfc-editor.org/rfc/rfc6455
2. MDN, Using server-sent events  
   https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
3. MDN, WebTransport API  
   https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API
4. RFC Editor, RFC 8441: Bootstrapping WebSockets with HTTP/2  
   https://www.rfc-editor.org/rfc/rfc8441
5. RFC Editor, RFC 7692: Compression Extensions for WebSocket  
   https://www.rfc-editor.org/rfc/rfc7692
6. websockets/ws, Node.js WebSocket implementation and documentation  
   https://github.com/websockets/ws
7. MDN, WebSocket() constructor  
   https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket
8. MDN, CloseEvent  
   https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
9. MDN, WebSocket.send()  
   https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
10. MDN, WebSocket.bufferedAmount  
    https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/bufferedAmount
11. MDN, CloseEvent.code  
    https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
12. MDN, WebSocket API  
    https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
13. MDN, WebSocketStream  
    https://developer.mozilla.org/en-US/docs/Web/API/WebSocketStream
14. OWASP Cheat Sheet Series, WebSocket Security Cheat Sheet  
    https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
15. websockets/ws API Documentation  
    https://github.com/websockets/ws/blob/master/doc/ws.md
