# 第一章 服务端完整框架体系建立从请求到运行环境的全景认知

从最简单的通信模型看，服务端只是客户端请求的接收方：

```
Client
   ↓ Request
Server
   ↓ Response
Client
```

HTTP 规范 RFC 9110 将 HTTP 定义为一种基于 **Client / Server（客户端 / 服务端）** 的请求—响应协议。客户端负责构造并发送 Request（请求），服务端接收和解释请求，再返回一个或多个 Response（响应）。[[1]]

因此，只观察一次 HTTP 通信时，可以先形成：

```
Client
   ↓
Request
   ↓
Server
   ↓
Response
   ↓
Client
```

这个模型描述的是**客户端和服务端之间的通信关系**，但还没有描述一个真实服务端系统内部是怎样工作的。

## 1. 真实服务端是在简单请求响应模型上不断扩展形成的工程系统

真实工程中的 `Server` 并不是一个函数，也不等于某一个具体框架。

一次请求真正进入系统以后，通常还需要完成：

```
接收网络请求
    ↓
确定请求应该由谁处理
    ↓
解析和校验请求
    ↓
执行具体业务逻辑
    ↓
读取或修改数据
    ↓
必要时调用其他服务
    ↓
返回处理结果
```

与此同时，并不是所有工作都适合在当前请求中完成。

例如邮件发送、数据统计、大规模计算等工作，可以先记录为任务，再由后台程序继续处理：

```
Request
   ↓
接收任务
   ↓
先返回结果

      后台任务
          ↓
      Worker
          ↓
      继续处理
```

程序本身还必须真正运行起来。

以 Node.js 为例，Node.js 官方将它定义为一个 **asynchronous event-driven JavaScript runtime（异步、事件驱动的 JavaScript 运行环境）**，可以用来构建网络应用。这里的 Runtime（运行环境）可以先理解为：**负责让 JavaScript 程序真正执行起来的一套运行基础。** [[2]]

所以：

```
业务代码
   ↓
运行环境
   ↓
运行中的程序
   ↓
持续接收请求或执行任务
```

程序运行以后，还需要考虑它怎样部署到真正的机器上。

Container（容器）就是这一层常见的工程能力。Docker 官方将 Container 描述为运行应用组件的隔离环境，一个应用所需要的运行依赖可以一起被封装并运行。[[3]]

除此之外，服务真正上线以后，还需要持续知道：

```
程序有没有发生错误？
请求处理是否正常？
响应是否越来越慢？
某一次请求经过了哪些服务？
程序当前是否还能正常提供服务？
```

这就进一步产生了 Logging（日志）、Metrics（指标）、Tracing（链路追踪）等可观测性能力。

OpenTelemetry 将 Logs、Metrics 和 Traces 作为观察系统运行行为的重要 Telemetry（遥测数据）形式。Telemetry 可以理解为：**系统主动产生、用于描述自己运行状态的数据。** [[4]]

因此，真实服务端已经从最简单的：

```
Request
   ↓
Server
   ↓
Response
```

逐渐扩展成：

```
请求进入系统
    ↓
处理业务
    ↓
访问和管理数据
    ↓
执行后台任务
    ↓
程序长期运行
    ↓
部署到实际环境
    ↓
持续保证安全和运行稳定
```

基于这些共同问题，可以先把服务端理解为：

> **服务端是一套长期运行并对外提供能力的程序系统。它负责接收外部请求、执行具体业务逻辑、管理系统数据，并通过异步处理、运行部署、安全和监控等能力，使整个系统能够持续稳定地提供服务。**

这里需要特别说明：

> **这不是某个标准组织对“服务端”的统一正式定义，而是本文为了建立服务端工程全景而使用的学习模型。**

RFC 9110 严格定义的是 HTTP 中 Client、Server、Request、Response 等通信角色；至于数据库、任务系统、容器、日志和监控如何组织，属于实际软件系统的工程设计。

## 2. 服务端完整框架可以先从五类核心问题建立全景

```
外部请求怎样进入并完成处理？
            ↓
        请求处理体系


系统的数据怎样保存和读取？
            ↓
        状态与数据体系


不适合阻塞当前请求的工作怎样完成？
            ↓
        异步处理体系


写好的代码怎样真正长期运行？
            ↓
        运行与部署体系


整个系统怎样保持安全并知道自己是否正常？
            ↓
        横向系统能力
```

于是形成下面这张服务端全景图：

```
                                Client
                    Browser / SDK / App / Web
                                  │
                                  │ HTTP / HTTPS
                                  ↓
┌─────────────────────────────────────────────────────────────┐
│                     一、请求处理体系                         │
│                                                             │
│  网络接入 → HTTP Server → Framework → Controller → Service │
└─────────────────────────────┬───────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 ↓                         ↓
┌────────────────────────┐      ┌─────────────────────────┐
│   二、状态与数据体系    │      │   三、异步处理体系      │
│                        │      │                         │
│ Database               │      │ Task / Queue / Outbox │
│ Cache                  │      │ Worker                 │
│ Storage                │      │ Retry / Dead Letter   │
└────────────┬───────────┘      └────────────┬────────────┘
             │                               │
             └──────────────┬────────────────┘
                            ↓
                    External Services

───────────────────────────────────────────────────────────────

                 四、运行与部署体系

Source → Build → Process → Service → Container → Host

───────────────────────────────────────────────────────────────

                 五、横向系统能力

Security / Config / Log / Metric / Trace / Health
```

这里的英文概念先只需要建立最基本的对应关系：

| 概念                     | 当前阶段的直观理解                 |
| ------------------------ | ---------------------------------- |
| HTTP Server              | 接收和响应 HTTP 请求的程序能力     |
| Framework（应用框架）    | 帮助组织服务端代码和请求处理流程   |
| Database（数据库）       | 长期保存业务数据                   |
| Cache（缓存）            | 保存需要快速访问的数据             |
| Worker（后台工作程序）   | 在请求之外持续执行任务             |
| Container（容器）        | 为程序提供相对隔离、一致的运行环境 |
| Security（安全）         | 控制身份、权限以及数据访问边界     |
| Configuration（配置）    | 管理不同运行环境中的参数           |
| Log（日志）              | 记录具体发生了什么                 |
| Metric（指标）           | 用数值观察一段时间内系统表现       |
| Trace（链路追踪）        | 观察一次请求经过了哪些处理环节     |
| Health Check（健康检查） | 判断程序当前是否能够正常提供服务   |

这些概念在第一章都**只定位，不深入机制**。

## 4. 参考文献

[1] IETF. *RFC 9110: HTTP Semantics*. June 2022. HTTP Client / Server、Request / Response 与 HTTP 核心语义。[RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html?utm_source=chatgpt.com)

[2] OpenJS Foundation. *About Node.js®*. Node.js 官方对 asynchronous event-driven JavaScript runtime 的说明。[Node.js — About Node.js](https://nodejs.org/en/about?utm_source=chatgpt.com)

[3] Docker Inc. *What is Docker? / What is a container?*. Docker Container 与应用运行环境说明。[Docker overview](https://docs.docker.com/get-started/docker-overview/?utm_source=chatgpt.com)

[4] OpenTelemetry Authors. *Observability Primer*. Logs、Metrics、Traces 与 Telemetry 基本概念。[OpenTelemetry Observability Primer](https://opentelemetry.io/docs/concepts/observability-primer/?utm_source=chatgpt.com)