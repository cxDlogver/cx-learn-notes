本文围绕WebSocket核心知识点展开，涵盖其诞生背景、基础API、完整生命周期、鉴权方法、心跳机制，补充工程实践细节与易错点，适配前端面试重点，同时附上对应知识点问题，助力巩固记忆。

## WebSocket的诞生 —— HTTP的局限性

HTTP协议是典型的请求-响应模型，核心特征是“客户端先发请求，服务器才能响应”，这就决定了服务器无法主动向客户端发送消息，且通信多为短连接或逻辑上的短会话，无法满足实时通信需求。

在WebSocket出现之前，开发者为模拟实时通信，基于HTTP设计了多种方案，但均存在明显缺陷：

### 轮询（Polling）

客户端每隔固定时间向服务器发送请求，查询是否有新消息，流程如下：请求→无消息→请求→无消息→...→请求→有消息→返回。

核心问题：存在大量无意义请求，浪费服务器和网络资源；实时延迟取决于轮询间隔，间隔过长延迟高，间隔过短资源消耗大。

### 长轮询（Long Polling）

客户端发起请求后，服务器不立即返回响应，而是等待有新数据时再返回，客户端收到响应后立即发起下一次请求，流程如下：请求→等待→有消息→返回→立即发起下一次请求。

优势：相比普通轮询减少了无意义请求；缺陷：本质仍是HTTP请求，高并发场景下服务器压力较大，且仍存在一定延迟。

### Server-Sent Events（SSE）

服务器可单向向客户端推送数据，客户端只能接收消息，无法主动向服务器发送消息。

核心限制：仅支持单向通信，无法满足聊天室、在线协作等需要双向交互的场景，适用范围极窄。

### WebSocket的核心定位

上述方案的本质问题的是：HTTP协议并非为“持续、双向通信”设计，而WebSocket是一个全新的通信协议，核心目标是在浏览器与服务器之间建立一条真正的、持久的、全双工通信通道。

WebSocket与HTTP的关系：并非替代关系，而是“协作关系”——建立连接时依赖HTTP协议完成握手，连接建立后，通信完全脱离HTTP，改用WebSocket帧协议。具体流程为：客户端发起HTTP请求→请求头声明“升级为WebSocket”→服务器返回101状态码同意升级→协议切换为WebSocket→后续通信走WebSocket帧。

WebSocket核心特性：

- 全双工通信：客户端与服务器地位对等，双方可随时发送消息，无需依赖“请求-响应”前提。
- 持久连接：连接一旦建立，不会频繁创建和销毁，无需反复携带HTTP头部，网络和CPU开销显著降低。
- 轻量消息格式：采用二进制帧结构，无冗余HTTP头部，传输效率高，适合实时数据推送场景。
- 原生浏览器支持：现代浏览器内置WebSocket API，无需额外插件，可直接通过`new WebSocket(url)`创建连接。

## WebSocket基础用法

WebSocket用法分为浏览器端（HTML WebSocket API）和服务端（以NodeJS ws库为例），两者核心逻辑一致，服务端多了连接管理能力。

### 浏览器端HTML WebSocket API

#### 1. 创建连接

```javascript
// 格式：ws://（非加密）或wss://（加密，对应HTTPS）
const ws = new WebSocket("ws://localhost:8080");
```

#### 2. 常用属性

```javascript
// 连接状态（核心属性）
ws.readyState; 
// 0: CONNECTING（连接中）
// 1: OPEN（连接已建立，可收发消息）
// 2: CLOSING（连接关闭中）
// 3: CLOSED（连接已关闭）

ws.url; // 连接的URL路径
```

#### 3. 常用事件

有两种事件绑定方式，实际开发中可灵活选择，效果一致：

```javascript
// 方式一：addEventListener绑定
ws.addEventListener('open', () => {
  console.log("连接建立成功");
});
ws.addEventListener('message', (e) => {
  console.log("收到服务端消息：", e.data);
});
ws.addEventListener('close', (e) => {
  console.log("连接关闭，状态码：", e.code);
});
ws.addEventListener('error', (e) => {
  console.error("连接异常：", e);
});

// 方式二：直接赋值事件处理函数
ws.onopen = () => {
  console.log("连接建立成功");
};
ws.onmessage = (e) => {
  console.log("收到服务端消息：", e.data);
};
ws.onclose = (e) => {
  console.log("连接关闭，状态码：", e.code);
};
ws.onerror = (e) => {
  console.error("连接异常：", e);
};
```

各事件核心含义：

- open：WebSocket握手成功，连接正式建立，可开始收发消息。
- message：接收服务端发送的消息，消息内容通过`e.data`获取（可能是文本或二进制）。
- close：连接关闭（客户端或服务端主动关闭，或异常断开），可通过`e.code`获取关闭状态码。
- error：底层通信异常（如握手失败、网络中断），触发后通常会伴随close事件。

#### 4. 发送消息与关闭连接

```javascript
// 发送文本消息
ws.send("hello websocket");

// 发送二进制消息
ws.send(new Uint8Array([1, 2, 3]));

// 主动关闭连接（1000为正常关闭状态码，第二个参数为关闭原因）
ws.close(1000, "客户端主动关闭连接");
```

### NodeJS ws库API（服务端+客户端）

ws库是NodeJS中最常用的WebSocket实现，客户端用法与浏览器端基本一致，服务端主要负责监听连接、管理客户端、处理消息。

#### 1. 客户端用法（与浏览器端兼容）

```javascript
const WebSocket = require("ws");
const ws = new WebSocket("ws://localhost:8080");

// 发送消息
ws.send("客户端发送的消息");

// 主动关闭连接
ws.close(1000, "bye");

// 立即断开连接（不执行close握手，强制断开）
ws.terminate();
```

#### 2. 服务端用法（核心）

```javascript
const http = require("http");
const { WebSocketServer } = require("ws");

// 绑定HTTP服务器（也可直接绑定端口）
const server = http.createServer();
const wss = new WebSocketServer({ server });

// 监听客户端连接（核心事件）
wss.on("connection", (ws, request) => {
  // ws：当前连接的客户端实例（与客户端ws对象功能一致）
  // request：客户端发起的HTTP握手请求对象
  console.log("有新客户端连接");

  // 接收当前客户端发送的消息
  ws.on("message", (data, isBinary) => {
    console.log("收到客户端消息：", isBinary ? data : data.toString());
    // 回复客户端消息
    ws.send("服务端已收到消息");
  });

  // 监听当前客户端连接关闭
  ws.on("close", (code, reason) => {
    console.log("客户端连接关闭，状态码：", code);
  });

  // 监听当前客户端连接异常
  ws.on("error", (err) => {
    console.error("客户端连接异常：", err.message);
  });
});

// 启动服务器，监听8080端口
server.listen(8080, () => {
  console.log("WebSocket服务已启动，监听ws://localhost:8080");
});
```

#### 3. 服务端独有的能力

- 客户端集合：`wss.clients`，是一个Set集合，包含所有当前连接的客户端实例，常用于广播消息。        `// 广播消息：向所有在线客户端发送消息 ``wss.clients.forEach((client) => { ``  if (client.readyState === client.OPEN) { ``    client.send("这是一条广播消息"); ``  } ``});`
- 关闭整个服务：`wss.close()`，会关闭所有客户端连接，并停止监听新连接。`wss.close(() => { ``  console.log("WebSocket服务已关闭"); ``});`
- 握手阶段鉴权：通过`request`对象获取客户端携带的参数（如token），实现连接鉴权。        `wss.on("connection", (ws, req) => { ``  // 从URL查询参数中提取token ``  const token = new URL(req.url, "http://localhost").searchParams.get("token"); ``  // 鉴权失败，直接关闭连接 ``  if (!token || !verifyToken(token)) { ``    ws.close(1008, "未授权，拒绝连接"); ``    return; ``  } ``  // 鉴权成功，继续处理业务 ``});`

### 关键注意点

- WebSocket传输的是“帧”，而非HTTP请求，一旦握手成功，后续通信与HTTP无关，无需反复携带HTTP头部。
- 消息格式建议统一为JSON，避免混发裸字符串，便于前后端统一处理，示例：        `// 统一消息格式 ``ws.send(JSON.stringify({ ``  type: "chat", // 消息类型，用于业务分发 ``  payload: { text: "Hello" }, // 消息内容 ``  requestId: "uuid-123", // 请求唯一标识，用于匹配响应 ``  ts: Date.now() // 时间戳 ``}));`
- 服务端的`ws`对象与客户端的`ws`对象功能基本一致，核心区别是服务端可通过`wss.clients`管理多个客户端连接。

## WebSocket完整生命周期

WebSocket的核心复杂度不在于连接本身，而在于连接建立后的全生命周期管理，完整生命周期分为7个阶段：连接建立→鉴权→状态绑定→心跳→业务消息处理→异常与重连→连接关闭与资源清理。

### 连接建立阶段（Connection Establishment）

核心是基于HTTP的Upgrade握手，流程如下：

1. 客户端发起HTTP请求，请求头中携带`Upgrade: websocket`和`Connection: Upgrade`，声明要升级协议。
2. 服务器收到请求后，校验升级请求的合法性，若同意，返回101 Switching Protocols状态码，告知客户端可切换协议。
3. 客户端收到101响应后，协议从HTTP切换为WebSocket，连接正式建立，触发客户端`open`事件。

关键误区：WebSocket连接成功（触发`open`事件）≠ 用户身份合法 ≠ 业务可用。`open`事件仅说明网络通信正常、协议升级成功，不代表用户已登录、权限已校验。

### 连接级鉴权（Authentication）

WebSocket必须单独鉴权，原因是其为长连接，无request body和REST路由，若不鉴权，会导致任意用户可建立连接占用资源、伪造身份发送消息、权限失控。

工程中最常用、最可靠的鉴权方式是“Token鉴权（JWT/Access Token）+ 首包鉴权”，典型流程：

1. 客户端通过HTTP登录，获取Token（JWT或Access Token）。
2. 客户端建立WebSocket连接。
3. 连接建立后（`open`事件触发），客户端立即发送一条`auth`类型的消息，携带Token。
4. 服务端接收`auth`消息，校验Token的合法性（签名、过期时间等）。
5. 鉴权成功：标记连接为“已授权”，允许处理后续业务消息；鉴权失败：立即关闭连接，返回对应状态码。

鉴权状态机：CONNECTED（连接建立）→ AUTH_PENDING（等待鉴权）→ AUTHED（已授权），在AUTHED状态之前，服务端不处理任何业务消息，非法消息直接关闭连接。

### 权限控制（Authorization）

鉴权与授权的区别：鉴权（Authentication）是“确认你是谁”，授权（Authorization）是“确认你能做什么”。

权限信息通常存储在数据库、Redis或内存缓存中，鉴权完成后，服务端会将权限信息加载并绑定到当前连接上下文（如`ws.userId`、`ws.roles`），后续处理业务消息时，根据权限判断是否允许操作。

```javascript
// 鉴权成功后绑定权限信息
ws.userId = 123;
ws.roles = ["user"]; // 普通用户
// ws.roles = ["admin"]; // 管理员

// 处理业务消息时校验权限
ws.on("message", (data) => {
  const msg = JSON.parse(data);
  if (msg.type === "delete" && !ws.roles.includes("admin")) {
    ws.send(JSON.stringify({ type: "error", msg: "无删除权限" }));
    return;
  }
  // 处理合法业务逻辑
});
```

### 连接状态绑定（Connection Binding）

WebSocket是“连接导向”的协议，而业务是“用户导向”的，因此必须建立“用户与连接”的映射关系，解决“一个用户多端登录”“一个用户多个连接”的问题。

常见映射结构（用对象或Map存储）：

```javascript
// userId -> Set<WebSocket>：一个用户对应多个连接（多端登录）
const userConnections = new Map();
// 连接建立并鉴权成功后，绑定映射
userConnections.set(ws.userId, (userConnections.get(ws.userId) || new Set()).add(ws));

// 连接关闭时，移除映射
ws.on("close", () => {
  const connections = userConnections.get(ws.userId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      userConnections.delete(ws.userId);
    }
  }
});
```

### 心跳机制（Heartbeat）

心跳机制的核心目的是检测连接是否存活，避免“假在线”连接（如客户端断网、NAT代理回收连接、手机锁屏，此时连接未触发close事件，但已无法通信），及时释放服务端资源。

心跳机制有两种实现方式，工程中常用应用层自定义心跳。

### 业务消息处理（Business Processing）

WebSocket仅传输字节流，不理解业务语义，因此需要在应用层自定义消息协议（如统一JSON格式），核心处理流程：

1. 接收消息：通过`message`事件获取消息，解析为JSON格式。
2. 校验权限：根据当前连接的权限信息，判断是否允许处理该消息。
3. 业务处理：根据消息类型（`type`），执行对应业务逻辑（如聊天、推送、数据同步）。
4. 推送结果：将处理结果反馈给客户端，若有需要，可通过广播推送给其他相关客户端。

### 异常处理与重连策略（Error & Reconnect）

异常来源主要包括：网络中断、心跳超时、鉴权失败、协议错误、服务端异常。

WebSocket不会自动重连，需客户端自行实现重连逻辑，核心要点：

- 指数退避重连：每重连失败一次，下一次等待时间按指数级增长（如1s、2s、5s、10s），避免频繁重连消耗资源。
- 最大重试次数：设置最大重连次数，超过次数则停止重连，提示用户手动刷新。
- 网络恢复触发：监听客户端网络状态变化（如`navigator.onLine`），网络恢复后自动触发重连。

```javascript
// 客户端重连逻辑示例
let retryCount = 0;
const maxRetryCount = 5;
const backoff = [1000, 2000, 5000, 10000, 30000]; // 指数退避序列

function connect() {
  const ws = new WebSocket("ws://localhost:8080");
  
  ws.onclose = (e) => {
    // 正常关闭（1000）不重连，异常关闭（如1006）触发重连
    if (e.code !== 1000 && retryCount < maxRetryCount) {
      const delay = backoff[retryCount];
      setTimeout(() => {
        retryCount++;
        connect();
      }, delay);
    } else if (retryCount >= maxRetryCount) {
      console.log("重连失败，请手动刷新页面");
    }
  };
}

// 初始连接
connect();
```

### 连接关闭与资源清理（Cleanup）

连接关闭的来源包括：客户端主动关闭、服务端踢下线、心跳失败、异常断开。无论哪种关闭方式，都必须完成资源清理，否则会导致内存泄漏。

核心清理工作：

- 从“用户-连接”映射中移除当前连接，避免后续消息推送失败。
- 停止当前连接的心跳定时器、重连定时器，释放定时器资源。
- 清理连接绑定的上下文信息（如`ws.userId`、`ws.roles`），释放内存。

注意：所有资源清理必须放在`close`事件中完成，确保无论连接如何关闭，都能执行清理逻辑。

## WebSocket鉴权方法

WebSocket鉴权的核心是解决三个问题：身份确认（你是谁）、权限控制（你能做什么）、会话可信性（连接是否安全、Token是否有效）。所有鉴权方案的本质，都是在连接生命周期内完成一次可信的身份确认，常用鉴权入口有三类：HTTP握手阶段、连接建立后的首条消息、连接生命周期内的持续校验。

### HTTP握手阶段鉴权

WebSocket建立连接时，本质是一次HTTP请求，此时可通过HTTP相关方式携带鉴权信息，服务端在握手阶段拦截校验。

常见携带方式：

- Cookie鉴权：客户端已通过HTTP登录，Session/Token已写入Cookie，握手时浏览器自动携带Cookie，服务端解析Cookie中的Session/Token完成鉴权。        优势：前后端无感，与传统登录系统完全兼容；风险点：存在CSRF风险，需配合CSRF Token防护。
- URL Query Token：客户端将Token拼接在WebSocket连接URL的查询参数中，服务端在握手阶段解析查询参数获取Token。

```JavaScript
// 客户端
const ws = new WebSocket("ws://localhost:8080?token=JWT_TOKEN");

// 服务端（ws库）
wss.on("connection", (ws, req) => {
  const token = new URL(req.url, "http://localhost").searchParams.get("token");
  // 校验Token
});优势：实现简单，适合移动端、非浏览器客户端；缺点：Token可能出现在服务器日志中，不适合长期敏感凭证。
```

- 自定义Header（非浏览器）：客户端在建立连接时，通过自定义Header携带Token，服务端解析Header获取Token。

```JavaScript
// 非浏览器客户端（如NodeJS）
const ws = new WebSocket("ws://localhost:8080", {
  headers: {
    Authorization: "Bearer JWT_TOKEN"
  }
});限制：浏览器不允许自定义WebSocket连接的Header，仅适用于NodeJS、原生客户端等非浏览器场景。
```

服务端典型流程：1. 监听HTTP的`upgrade`事件；2. 提取Token/Session；3. 校验合法性；4. 校验失败→销毁连接（`socket.destroy()`）；5. 校验成功→执行协议升级（`wss.handleUpgrade()`）。

### 连接建立后首条消息鉴权

核心原理：WebSocket连接建立后，不立即信任该连接，要求客户端发送第一条消息（通常为`auth`类型），携带Token，服务端校验通过后，才允许处理后续业务消息。

```javascript
// 客户端
ws.onopen = () => {
  // 连接建立后，立即发送鉴权消息
  ws.send(JSON.stringify({
    type: "auth",
    token: "JWT_TOKEN"
  }));
};

// 服务端
wss.on("connection", (ws) => {
  let isAuthed = false; // 标记是否已鉴权
  
  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    // 未鉴权时，仅处理auth消息
    if (!isAuthed) {
      if (msg.type !== "auth") {
        ws.close(1008, "未鉴权，拒绝处理消息");
        return;
      }
      // 校验Token
      if (!verifyToken(msg.token)) {
        ws.close(1008, "Token无效，拒绝连接");
        return;
      }
      // 鉴权成功，标记状态
      isAuthed = true;
      ws.send(JSON.stringify({ type: "authSuccess", msg: "鉴权成功" }));
      return;
    }
    // 鉴权成功后，处理业务消息
    handleBusinessMessage(msg);
  });
});
```

优势：不依赖HTTP握手，适合复杂自定义协议；缺点：连接已建立，若鉴权失败，会浪费一定的连接资源，容易被滥连攻击（DoS），工程中仅在无法控制握手阶段时使用。

### Token（JWT / Session）鉴权详解

工程中最主流的鉴权方案是Token鉴权，根据Token是否“自包含状态”，分为JWT（无状态）模式和Session/Redis（有状态）模式，两者适用场景不同。

#### JWT模式（无状态鉴权）

JWT（JSON Web Token）是一种自包含Token，载荷中直接包含身份信息和有效性信息（如userId、过期时间、签名），服务端无需保存会话状态，仅通过校验签名和过期时间，即可完成鉴权。

JWT结构：由Header（签名算法）、Payload（用户信息和声明）、Signature（签名，防篡改）三部分组成，格式为`Header.Payload.Signature`。

工程特性：服务端无状态，不依赖数据库、Redis，任意节点均可校验，适合横向扩展，是WebSocket场景中最常用的鉴权方案之一。

适用场景：分布式WebSocket服务、多实例/多节点部署、WebSocket Gateway架构、云原生/容器化部署、Serverless/边缘节点。

关键问题：WebSocket是长连接，连接存续期间，JWT可能会过期，工程中需明确过期处理策略：

- 策略一：Token过期后允许连接继续，优点是实现简单、连接稳定，缺点是安全窗口扩大，适合低风险业务、短连接周期。
- 策略二：Token过期后强制断连，优点是安全性高，缺点是用户体验下降，实现方式为定时检查或心跳时校验Token。
- 策略三：Token刷新机制（推荐），使用短期Access Token配合Refresh Token，在连接内完成Token刷新，刷新失败则断连，兼顾安全性和用户体验。

优缺点总结：优势是无状态、扩展性极佳、实现简单；劣势是无法主动失效、过期控制复杂、权限变更不即时生效（可通过手动处理弥补）。

#### Session / Redis模式（有状态鉴权）

核心设计思想：Token只是一个索引，真正的身份状态（userId、roles、权限）保存在服务端（Redis或内存），服务端通过Token查询服务端存储的Session数据，完成鉴权。

工程特性：服务端有状态，依赖Redis/内存存储，每次鉴权需访问存储，可随时修改、删除Session，实现主动失效。

适用场景：强权限控制系统、管理后台/运维平台、需要“强制下线”的系统、金融、风控类业务（这类场景中，“能否立即失效”比“是否无状态”更重要）。

WebSocket中的优势：可实现实时踢下线、权限变更立即生效、可绑定设备/IP/登录来源、可限制同时在线数量。

## WebSocket心跳机制

心跳机制是WebSocket生产环境必备功能，因为在客户端断网、手机锁屏、NAT/代理回收空闲连接、路由器重启等场景下，WebSocket连接不会立即触发`close`事件，会产生大量“假在线”连接，导致在线人数统计不准确、消息发送失败、连接池被僵尸连接占满。

心跳机制的核心目标：检测连接是否可达、尽早发现断线、触发重连或资源清理、保证在线状态的真实性。

### 两种主流心跳实现方式

#### 协议级Ping / Pong（WebSocket原生）

这是WebSocket协议（RFC 6455）自带的心跳能力，不进入业务层，浏览器端无法直接发送Ping，NodeJS（如ws库）支持。

工作方式：服务端定期发送Ping帧，客户端会自动回复Pong帧，若服务端长时间未收到Pong帧，则判定连接失效，主动关闭连接。

```javascript
// 服务端（ws库）协议级心跳示例
const { WebSocketServer } = require("ws");
const wss = new WebSocketServer({ port: 8080 });

// 心跳间隔（30秒）
const HEARTBEAT_INTERVAL = 30000;

wss.on("connection", (ws) => {
  // 标记连接存活状态
  ws.isAlive = true;

  // 收到Pong帧，更新存活状态
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  // 连接关闭时清理
  ws.on("close", () => {
    console.log("客户端连接关闭");
  });
});

// 服务端统一心跳扫描
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    // 若长时间未收到Pong，判定连接失效，强制断开
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    // 标记为待检测，发送Ping帧
    ws.isAlive = false;
    ws.ping(); // 发送协议级Ping
  });
}, HEARTBEAT_INTERVAL);

// 服务端关闭时，清理定时器
wss.on("close", () => {
  clearInterval(interval);
});
```

重要说明：服务端发送Ping时，客户端会自动回复Pong，不会触发客户端的`message`事件；客户端无法主动发送Ping帧，仅服务端可发起。

#### 应用层自定义心跳（工程常用）

通过普通WebSocket消息实现心跳，完全由业务层控制，浏览器和NodeJS统一支持，可结合鉴权、权限校验，灵活性更高。

核心逻辑：客户端定时发送Ping消息，服务端收到Ping后立即回复Pong消息，客户端若在规定时间内未收到Pong，判定连接失效，主动关闭连接并触发重连。

##### 客户端心跳实现

```javascript
let timeoutTimer = null;
const HEARTBEAT_INTERVAL = 30000; // 30秒发一次Ping
const PONG_TIMEOUT = 8000; // 8秒内未收到Pong，判定失效

// 发送Ping消息
function sendPing(ws) {
  // 生成唯一ID，用于匹配Pong消息
  const pingId = Date.now().toString();
  // 发送Ping消息
  ws.send(JSON.stringify({
    type: "ping",
    id: pingId
  }));
  // 启动超时定时器，等待Pong
  timeoutTimer = setTimeout(() => {
    console.log("心跳超时，连接失效");
    ws.close(1006, "心跳超时"); // 异常关闭，触发重连
  }, PONG_TIMEOUT);
}

// 初始化心跳
function initHeartbeat(ws) {
  // 连接建立后，启动心跳定时器
  const heartbeatTimer = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      sendPing(ws);
    }
  }, HEARTBEAT_INTERVAL);

  // 收到消息，判断是否为Pong
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "pong" && msg.id) {
      // 收到对应Pong，清除超时定时器
      clearTimeout(timeoutTimer);
    }
  };

  // 连接关闭，清理定时器
  ws.onclose = () => {
    clearInterval(heartbeatTimer);
    clearTimeout(timeoutTimer);
  };
}

// 建立连接并初始化心跳
const ws = new WebSocket("ws://localhost:8080");
ws.onopen = () => {
  initHeartbeat(ws);
};
```

##### 服务端心跳实现

```javascript
wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    // 收到Ping消息，立即回复Pong，携带相同ID
    if (msg.type === "ping" && msg.id) {
      ws.send(JSON.stringify({
        type: "pong",
        id: msg.id
      }));
    }
    // 其他业务消息处理
  });
});
```

服务端核心逻辑：无需计时，收到Ping消息后原样回复Pong，不额外维护状态，实现简单，不干扰业务逻辑。

### 区分正常关闭与异常关闭

通过`close`事件的状态码（code）和`error`事件，可区分WebSocket连接的关闭类型，进而决定是否触发重连。

#### 1. 正常关闭（Graceful Close）

定义：按照WebSocket协议完成Close握手，双方都知晓连接关闭。

常见场景：客户端主动关闭、服务端业务结束、鉴权失败后主动关闭、被踢下线（策略性关闭）。

特征：触发`close`事件，code为1000（正常关闭）或明确的策略码（如1008），`wasClean`为true（正常完成握手）。

#### 2. 异常关闭（Abnormal Close）

定义：未完成Close握手，连接直接断开。

常见场景：客户端断网、进程被杀、服务端进程崩溃、NAT/代理回收端口、TCP连接被强制重置。

特征：触发`close`事件，code通常为1006（异常断开），`reason`为空，往往伴随`error`事件。

#### 常用Close Code含义

- 1000：正常关闭（手动关闭、业务结束）。
- 1001：端点离开（客户端刷新页面、切换页面）。
- 1006：异常断开（网络中断、端口回收，无法手动设置）。
- 1008：策略违规（鉴权失败、权限不足）。
- 1011：服务端内部错误。
- 4001：自定义码，JWT过期。
- 4003：自定义码，无实时权限。
- 4004：自定义码，用户被禁用。
- 4100：自定义码，客户端协议错误。
- 4500：自定义码，服务端业务异常。

#### 关闭连接的正确用法

`ws.close(code, reason)`支持传递状态码和关闭原因，工程中强烈推荐使用，便于排查问题。

```javascript
// 正常关闭
ws.close(1000, "正常关闭");

// 鉴权失败关闭
ws.close(1008, "未授权，拒绝连接");

// JWT过期关闭
ws.close(4001, "JWT过期，请重新登录");

// 服务端内部错误关闭
ws.close(1011, "服务端内部异常");

// 监听关闭事件，区分关闭类型
ws.onclose = (e) => {
  console.log("关闭状态码：", e.code, "原因：", e.reason, "是否正常握手：", e.wasClean);
  if (e.code === 1000) {
    console.log("正常关闭，不重连");
  } else if (e.code === 1006) {
    console.log("异常断开，触发重连");
    // 执行重连逻辑
  } else {
    console.log("其他关闭类型，根据业务处理");
  }
};
```

## WebSocket知识点对应问题（前端面试重点）

- WebSocket的作用是什么？它解决了HTTP协议的什么问题？
- HTTP与WebSocket的关系是什么？WebSocket连接建立的完整流程是什么？
- WebSocket的核心特性有哪些？与SSE、长轮询相比，有什么优势？
- 浏览器端WebSocket API的常用事件、属性和方法有哪些？`readyState`的四个值分别代表什么？
- NodeJS ws库中，服务端与客户端的API有什么区别？如何实现广播消息？
- WebSocket的完整生命周期分为哪几个阶段？每个阶段的核心任务是什么？
- 为什么WebSocket必须单独鉴权？常见的鉴权方式有哪些？各有什么优缺点？
- JWT鉴权与Session鉴权的区别是什么？WebSocket场景中，JWT过期问题如何解决？
- WebSocket为什么需要心跳机制？两种心跳实现方式（协议级、应用层）的区别是什么？
- 如何区分WebSocket的正常关闭和异常关闭？常见的Close Code有哪些？
- 客户端如何实现WebSocket重连？为什么要使用指数退避重连策略？
- WebSocket连接关闭时，需要做哪些资源清理工作？为什么？
- WebSocket传输消息时，为什么建议统一使用JSON格式？
- 服务端如何管理多个WebSocket连接？如何实现“一个用户多端登录”的连接绑定？
- WebSocket的`error`事件和`close`事件有什么区别？为什么不能依赖`error`事件判断断连？
