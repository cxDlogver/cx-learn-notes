# Chrome 多进程架构与页面加载协作

## 【知识概述】

**Chrome 通过进程隔离控制故障和安全影响，再通过跨进程通信完成导航、网络、渲染和画面提交；隔离与协作需要一起理解。**

Chrome 采用多进程架构，核心目的是通过**进程隔离提高浏览器的稳定性和安全性**。不同进程拥有独立的内存空间，因此一个网页或组件出现异常时，不容易直接影响整个浏览器；同时配合 Site Isolation 和沙箱，可以进一步隔离不同站点以及限制网页直接访问系统资源。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

和页面加载最相关的主要有 Browser Process、Network Process、Renderer Process 和 GPU Process，但这些进程最好放到一次完整的 URL 访问流程中理解。

用户输入 URL 后，首先由 **Browser Process** 接收。它相当于浏览器的总调度中心，负责导航管理、进程管理和权限管理，同时判断当前页面应该使用已有 Renderer Process，还是创建新的 Renderer Process。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

理解这组机制，可以沿以下主线展开：

先区分进程拥有独立资源空间与线程共享进程资源的关系。

沿 URL 导航说明浏览器、网络、渲染及 GPU 等进程的主要职责。

最后解释 IPC 如何在受控接口上传递消息，同时保持隔离边界。

一个页面不必严格对应一个渲染进程，站点隔离、进程复用和运行配置会影响分配。相关完整知识可结合 [基于Chrome浏览器渲染原理](<../J-基于Chrome浏览器渲染原理.md>) 阅读。

## 1. 机制说明与工程判断

按照 **“为什么采用多进程 → 进程和线程怎么分 → URL 到页面展示的完整流水线 → 页面和渲染进程的关系 → IPC → 隔离和安全”** 的顺序回答。
### 【为什么 Chrome 采用多进程架构】

Chrome 采用多进程架构，核心目的是实现**进程隔离，提高稳定性和安全性**。

不同进程拥有独立的资源和内存空间，因此：

- 某一个网页或组件出现异常，不容易直接拖垮整个浏览器；
- 不同页面、不同站点之间的数据可以进行隔离；
- 网络、页面渲染、GPU 合成等工作被拆分到不同进程中，职责更加独立；
- 再配合 Site Isolation、沙箱和权限控制，提高浏览器整体安全性。

文档将这一点概括为：

> **进程管资源，线程做执行；隔离保安全，IPC 传消息。** [相关知识](<../J-基于Chrome浏览器渲染原理.md>)

---
### 【Chrome 中主要有哪些进程？和线程是什么关系？】

与页面加载最相关的核心进程主要包括：

- **Browser Process**：浏览器主进程，负责整体调度、导航、进程管理和权限管理；
- **Network Process**：网络进程，负责整个网络请求过程；
- **Renderer Process**：渲染进程，负责把 HTML、CSS、JavaScript 等资源变成页面；
- **GPU Process**：GPU 进程，负责配合图层和纹理完成最终画面合成与显示。[相关知识](<../J-基于Chrome浏览器渲染原理.md>) [相关知识](<../J-基于Chrome浏览器渲染原理.md>)

这里一定要区分：

> **Browser、Network、Renderer、GPU 是不同的进程；Main Thread、Compositor Thread、Raster Thread 是 Renderer Process 内部的线程。**

也就是说，结构上应该理解成：

```text
Chrome
├─ Browser Process
├─ Network Process
├─ Renderer Process
│  ├─ Main Thread
│  ├─ Compositor Thread
│  └─ Raster Threads
└─ GPU Process
```

渲染进程内部的核心线程，文档列出的是**主线程、合成线程和栅格线程**，并不是把网络线程作为渲染进程的核心线程。真正的网络请求由独立的 Network Process 负责。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

其中：

- **Main Thread**：负责 JS、DOM/CSS、样式计算、Layout、Paint 等页面主要逻辑；
- **Compositor Thread**：负责组织图层和合成调度；
- **Raster Thread**：负责图层栅格化；
- **GPU Process** 则不是 Renderer 里面的线程，而是独立进程，负责最终图层合成和画面呈现。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

---
### 【从输入 URL 到页面展示的完整进程流水线】

整个过程最好不要分开背每个进程，而要理解成一条连续流水线：

> **输入 URL → 浏览器调度 → 网络请求 → 页面渲染 → 图层合成 → 页面显示**
#### <u>1. 用户输入 URL，Browser Process 接管</u>

用户在地址栏输入 URL 后，首先由 **Browser Process** 接收到这个操作。

它负责判断这是一次什么导航、目标 URL 是什么，以及应该使用哪个 Renderer Process 来承载这个页面。

如果需要，它还会创建新的 Renderer Process；如果满足条件，也可能复用已有的 Renderer Process。

所以这一阶段可以简单理解为：

> **Browser Process 负责接收用户操作和总调度。**

它自己并不负责真正下载 HTML，也不负责解析 DOM。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

---
#### <u>2. 进入网络请求，Network Process 获取资源</u>

确定导航以后，Browser Process 会协调 **Network Process** 发起网络请求。

Network Process 负责整个网络请求过程，包括：

缓存检查、DNS、建立 TCP 或 QUIC 连接、HTTPS 下的 TLS 握手、发送 HTTP 请求、接收 HTTP 响应，以及缓存、Cookie、连接复用等网络相关工作。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

这些内容不需要拆散理解，本质上就是一句话：

> **Network Process 负责根据 URL 把网页需要的资源从服务器拿回来。**

---
#### <u>3. 收到 HTML 后，Renderer Process 开始把资源变成页面</u>

服务器响应开始返回以后，HTML 等数据会交给对应的 **Renderer Process**。

从这里开始进入真正的页面渲染逻辑。

Renderer Process 会完成：

- HTML 解析形成 DOM；
- CSS 解析形成 CSSOM；
- JavaScript 执行；
- 形成渲染树；
- Layout；
- Paint；
- 分层；
- 合成前准备。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

所以这一阶段最简单的理解是：

> **Network Process 负责把资源拿回来，Renderer Process 负责把这些资源变成页面。**

Renderer Process 内部又由多个线程合作。

首先是 **Main Thread** 完成主要页面逻辑，包括 JavaScript、DOM/CSS、Layout 和 Paint。

之后 **Compositor Thread** 负责组织图层和合成相关信息。

再由 **Raster Thread** 负责将需要绘制的图层进行栅格化。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

也就是：

```text
Renderer Process

Main Thread
   ↓
页面解析 / JS / Layout / Paint
   ↓
Compositor Thread
   ↓
图层组织 / 合成调度
   ↓
Raster Thread
   ↓
栅格化
```

---
#### <u>4. GPU Process 完成最终画面</u>

Renderer Process 完成图层以及合成相关准备以后，会将相关图层和合成信息提交给 **GPU Process**。

GPU Process 主要负责配合纹理和图层完成最终合成，例如处理图层的层级、位置、`transform`、`opacity` 等，然后形成最终的一帧画面并提交给系统显示管线。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

所以整个过程最终可以概括成：

> **Browser Process 负责调度 → Network Process 负责获取资源 → Renderer Process 负责生成页面 → GPU Process 负责最终合成并上屏。**

---
### 【一个页面一定对应一个 Renderer Process 吗？】

**不一定。**

不能简单理解成：

> 一个页面 = 一个 Renderer Process。

页面与进程的关系是：

> **通常每个页面，或者同一站点的多个页面，会分配一个 Renderer Process。** [相关知识](<../J-基于Chrome浏览器渲染原理.md>)

也就是说，页面与 Renderer Process 不是严格的一对一关系。

Browser Process 在导航过程中会根据页面关系、站点隔离以及进程分配策略决定：

- 是复用已有 Renderer Process；
- 还是创建新的 Renderer Process。

因此更准确的说法是：

> **每个页面都会由某个 Renderer Process 承载，但并不意味着每个页面都一定独占一个 Renderer Process。**

Chrome 还会通过 Site Isolation，将需要隔离的不同站点内容分配到不同 Renderer Process 中，从而提高安全性。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

---
### 【Renderer Process 里的线程，和 Network Process、GPU Process 有什么区别？】

这里需要明确页面与渲染进程不是固定的一一对应关系。

**进程是资源和隔离的单位，而线程是一个进程内部真正执行任务的单位。**

例如：

Renderer Process 是一个完整的进程，它有自己独立的内存空间。

但是这个进程内部又有：

- Main Thread；
- Compositor Thread；
- Raster Thread。

这些线程属于同一个 Renderer Process，因此共享该进程内部的资源。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

而：

- Network Process；
- GPU Process；

是另外两个独立进程，和 Renderer Process 的内存空间相互隔离。

所以不能把：

> Compositor Thread 和 GPU Process

理解成同一层级。

更准确的是：

> **Compositor Thread 是 Renderer Process 内部负责“怎么组织图层”的线程；GPU Process 是独立进程，负责将准备好的图层和纹理最终组合成画面。**

同样，也不能把 Raster Thread 和 Network Process 混为一谈。

Raster Thread 属于 Renderer Process，负责图层栅格化。

Network Process 是独立进程，负责整个浏览器的网络请求。

所以最简单的区别就是：

> **进程负责划分职责和资源边界，线程负责在某个进程内部具体执行任务。**

---
### 【不同进程之间怎么通信？-- IPC】

由于 Browser、Network、Renderer、GPU 是不同进程，所以它们拥有独立的内存空间。

也就是说，Renderer Process 不能直接读取 Network Process 内存中的变量，也不能像同一个进程里的函数调用一样直接进入 Network Process 执行代码。

因此不同进程之间需要使用：

> **IPC，Inter-Process Communication，进程间通信。**

IPC 的核心可以非常简单地理解成：

> **一个进程把数据包装成结构化消息发送出去，另一个进程收到消息后解析并执行，再把结果作为消息返回。**

[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

例如网页执行：

```javascript
fetch("/api/user")
```

Renderer Process 自己不会直接完成整个网络请求。

它会通过 IPC 向 Network Process 发送一条网络请求消息。

Network Process 收到以后，真正执行 DNS、建连、HTTP 请求等工作。

拿到结果之后，再通过 IPC 把响应数据返回给 Renderer Process。

整个过程可以理解为：

```text
Renderer Process
      ↓
发送结构化 IPC 消息
      ↓
Network Process
      ↓
执行真正的网络请求
      ↓
返回 IPC 消息
      ↓
Renderer Process
```

`fetch` 请求也经过相应的进程协作。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

---
### 【Chrome 的 IPC 和操作系统 IPC 有什么区别？】

两者不是完全不同的东西，而是**上下层关系**。

操作系统本身提供了基础的进程间通信能力，例如：

- Named Pipe；
- socketpair；
- 共享内存等。

这些机制主要解决：

> **如何把数据从一个进程传到另一个进程。**

Chrome 在这些操作系统能力之上，又使用 **Mojo** 对 IPC 进行进一步封装。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

Mojo 主要负责：

- 定义进程之间可以调用哪些接口；
- 规定消息的数据结构；
- 将数据进行序列化和反序列化；
- 将消息发送给正确的服务。

所以可以非常直白地理解为：

> **操作系统 IPC 解决“消息怎么送过去”，Mojo 解决“发送什么消息、消息是什么格式、谁允许调用什么能力”。**

因此 Chrome 所说的结构化消息 IPC，本质上还是建立在操作系统的进程通信机制之上的，只不过 Chrome 又在上层定义了一套统一的通信规则。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

---
### 【IPC 为什么不会破坏进程隔离？】

这里最关键的一点是：

> **不是 IPC 产生了进程隔离，而是进程本身已经具有独立内存空间，IPC 只是提供了一个受控的通信通道。**

例如 Renderer Process 想访问网络。

它不能直接进入 Network Process 的内存，也不能直接使用 Network Process 的内部对象。

它只能按照浏览器允许的 IPC 接口发送：

> “我要请求这个 URL。”

然后由 Network Process 自己执行。

因此：

> **进程隔离负责“不让你直接访问我的内存”，IPC 负责“允许你按照规定给我发消息”。**

同时，Chrome 还会配合：

- Renderer Process 沙箱；
- Browser Process 权限裁决；
- Site Isolation；
- Mojo 接口限制；
- IPC 参数校验。

文档将其概括成：

> **可信进程负责裁决，不可信进程受到限制。** [相关知识](<../J-基于Chrome浏览器渲染原理.md>)

可以用一个直白的比喻理解：

> **Renderer Process 被放在一个独立房间里，它不能直接跑进 Network Process 或 Browser Process 的房间。如果需要某种能力，只能通过 IPC 窗口提出请求，由有权限的进程决定怎么处理。**

## 2. 完整回答与表达组织

Chrome 采用多进程架构，核心目的是通过**进程隔离提高浏览器的稳定性和安全性**。不同进程拥有独立的内存空间，因此一个网页或组件出现异常时，不容易直接影响整个浏览器；同时配合 Site Isolation 和沙箱，可以进一步隔离不同站点以及限制网页直接访问系统资源。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

和页面加载最相关的主要有 Browser Process、Network Process、Renderer Process 和 GPU Process，但这些进程最好放到一次完整的 URL 访问流程中理解。

用户输入 URL 后，首先由 **Browser Process** 接收。它相当于浏览器的总调度中心，负责导航管理、进程管理和权限管理，同时判断当前页面应该使用已有 Renderer Process，还是创建新的 Renderer Process。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

之后进入网络请求阶段。Browser Process 会协调 **Network Process** 获取页面资源。Network Process 负责完整的网络请求过程，包括缓存、DNS、连接建立、TLS、HTTP 请求和响应等，因此可以简单理解成：

> **Network Process 负责根据 URL 把网页资源从服务器拿回来。**

[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

HTML 数据返回之后，就进入 **Renderer Process**。Renderer Process 负责把 HTML、CSS 和 JavaScript 等资源真正变成页面，包括 HTML 到 DOM、CSS 到 CSSOM、JavaScript 执行、Render Tree、Layout、Paint 和分层等整个渲染逻辑。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

Renderer Process 本身又包含多个线程，其中 **Main Thread** 负责页面主要计算和执行，**Compositor Thread** 负责图层组织和合成调度，**Raster Thread** 负责栅格化。

所以要特别注意：

> **Renderer Process 是一个进程，而 Main Thread、Compositor Thread 和 Raster Thread 是这个进程内部的线程。**

Network Process 和 GPU Process 则都是 Renderer Process 之外的独立进程。

渲染完成以后，图层和合成相关信息会交给 **GPU Process**。GPU Process 负责配合纹理、图层位置、层级、`transform`、`opacity` 等信息完成最终图层合成，并生成最终一帧画面提交给显示系统。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

因此从进程视角看，整个页面加载流程可以总结为：

> **Browser Process 负责调度 → Network Process 负责获取资源 → Renderer Process 负责生成页面 → GPU Process 负责最终合成和显示。**

另外，一个页面并不一定严格对应一个 Renderer Process。文档中的表述是，通常每个页面或者同一站点的多个页面会分配一个 Renderer Process。具体是否复用或创建新的 Renderer Process，由 Browser Process 根据站点隔离和进程分配策略决定。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

由于这些进程拥有独立的内存空间，所以不同进程之间不能像同一进程内部的线程那样直接共享对象和调用函数，而必须通过 **IPC** 进行通信。

IPC 本质上就是：

> **发送结构化消息 → 对方接收并解析 → 执行任务 → 返回结果。**

例如 Renderer Process 中的 JavaScript 调用 `fetch` 时，Renderer 并不会自己完成 DNS、TCP 和 HTTP，而是通过 IPC 向 Network Process 发送网络请求信息，由 Network Process 真正完成请求，然后再通过 IPC 返回结果。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

Chrome 的 IPC 和操作系统 IPC 并不是两套完全不同的机制。操作系统提供 Named Pipe、socketpair、共享内存等底层通信能力，解决“数据怎样从一个进程传到另一个进程”；Chrome 则通过 Mojo 在这些能力之上定义接口、消息结构和服务，解决“进程之间允许发送什么消息以及应该怎样处理”。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

最后，IPC 并不会破坏进程隔离。

进程本身仍然拥有独立的内存空间，Renderer Process 不能直接访问 Browser、Network 或 GPU Process 的内部资源，只能够通过预定义的 IPC 接口提出请求。同时 Renderer Process 运行在沙箱中，Browser Process 负责重要权限的裁决，并且 IPC 接口还会对调用和参数进行限制。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

页面加载的进程协作关系可以概括为：

> **Chrome 用多个进程划分职责和安全边界：Browser 负责总调度，Network 负责网络请求，Renderer 负责整个页面渲染逻辑，GPU 负责最终合成；Renderer 内部再通过 Main、Compositor、Raster 等线程完成具体工作。不同进程拥有独立内存空间，通过 IPC 发送受控的结构化消息进行协作，因此既能完成从 URL 到页面展示的完整流水线，又能够保证较好的隔离性、稳定性和安全性。**

