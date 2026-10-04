# Docker 工程体系

Docker 是一套围绕 **Image（镜像）构建、Container（容器）运行和多服务编排** 建立的应用交付与运行体系。理解 Docker 时，不应只记 Dockerfile、Compose 或几条 CLI 命令，而应该沿着“源码如何变成可重复运行环境”这条主线建立完整模型。

可以先把 Docker 放到软件交付链路中：

~~~text
Source Code
    ↓
Build Context
    ↓
Dockerfile
    ↓
Image
    ↓
Container
    ↓
Application Process
    ↓
Runtime Resources
├── Environment
├── Network
├── Port
└── Storage
    ↓
Docker Compose
    ↓
Multi-container Application
~~~

这条链对应三个核心问题：

~~~text
Build
源码和依赖如何变成 Image？

Runtime
Image 如何变成真正运行的 Process？

Orchestration
多个 Container 如何组成一个完整系统？
~~~

---

## 1. Docker 通过 Image 与 Container 分离构建环境和运行实例

### 【Docker 解决的是运行环境一致性，而不是替应用实现业务逻辑】

传统部署往往依赖目标机器提前安装 Runtime、System Package、Dependency、Config 和 Application Artifact。不同机器之间一旦版本或系统环境不一致，就可能出现“开发环境可以运行，但测试或生产环境行为不同”。

Docker 的核心思路是把应用运行所依赖的文件系统、Runtime 和默认配置组织成 Image，再从同一个 Image 创建 Container。

~~~text
Application + Runtime Dependency
            ↓
          Image
            ↓
   ┌────────┼────────┐
Container A Container B Container C
~~~

Image 负责描述“运行环境应该是什么”，Container 负责提供“这一次实际运行实例”。

### 【Image、Container 与 Process 属于不同层级】

| 对象 | 含义 |
| --- | --- |
| Image | 只读的应用运行模板 |
| Container | 基于 Image 创建的隔离运行环境 |
| Process | Container 中真正执行程序的操作系统进程 |
| Service | 对外承担某类系统职责的运行单元 |

真实运行链：

~~~text
Image
↓
Create Container
↓
Container Runtime Environment
↓
CMD / ENTRYPOINT
↓
Application Process
~~~

Container 自身不是业务逻辑执行者，真正处理 HTTP、消费任务或执行数据库迁移的是 Container 内的 Process。

### 【Container 与 Virtual Machine 的隔离层不同】

Virtual Machine（虚拟机）通常包含独立 Guest OS；Container 主要隔离 Process、Filesystem、Network 等运行资源，并共享 Host Kernel。

~~~text
Virtual Machine

Hardware
↓
Host OS
↓
Hypervisor
↓
Guest OS
↓
Application


Container

Hardware
↓
Host OS / Kernel
↓
Container Runtime
↓
Isolated Process
~~~

因此 Container 一般比完整虚拟机更轻量，但它不是“没有隔离”，而是隔离发生在进程和操作系统资源层。

---

## 2. Docker Build 将 Host 文件逐步转换为 Image

### 【Host Filesystem、Build Context 与 Image Filesystem 是三套空间】

Docker Build 涉及三个容易混淆的路径空间：

~~~text
Host Filesystem
开发机器上的真实文件
        ↓

Build Context
docker build 允许构建过程访问的输入范围
        ↓

Image Filesystem
Dockerfile 指令构建出的镜像内部文件系统
~~~

例如：

~~~bash
docker build -t my-api:1.0 .
~~~

最后的 `.` 表示当前目录作为 Build Context。

Dockerfile：

~~~dockerfile
WORKDIR /app
COPY package.json ./
COPY src ./src
~~~

这里 `package.json`、`src/` 来自 Build Context，而 `/app`、`/app/src` 位于 Image Filesystem。因此 Image 中出现 `/app` 不要求 Host 上本来存在一个 `/app` 目录。

### 【Dockerfile 用 Instruction 描述 Image 的构建过程】

一个最基础的 Node.js Dockerfile：

~~~dockerfile
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src

CMD ["node", "src/main.js"]
~~~

各指令关系：

~~~text
FROM
选择 Base Image
↓
WORKDIR
设置后续工作目录
↓
COPY
把 Build Context 文件复制进 Image
↓
RUN
在 Build 阶段执行命令并改变 Image
↓
CMD
记录 Container 的默认启动命令
~~~

需要区分：

~~~text
RUN
发生在 docker build
影响 Image

CMD
通常发生在 docker run / compose up 后
决定 Container 默认启动什么 Process
~~~

Dockerfile 的完整语义以 Docker 官方 Dockerfile Reference 为准。[[2]](https://docs.docker.com/reference/dockerfile/)

### 【Image Layer 保存构建步骤产生的文件系统变化】

Image 不是一个简单压缩目录，而是由多个只读 Layer（层）组成。可以简化理解为：

~~~text
Base Image Layer
↓
COPY Dependency Manifest
↓
RUN Install Dependency
↓
COPY Source
↓
Build Result
~~~

每一步产生的结果可以参与后续 Build Cache（构建缓存）。

### 【Build Cache 缓存的是某一步构建结果】

例如：

~~~dockerfile
COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
RUN npm run build
~~~

只修改 Source：

~~~text
COPY package.json
→ Cache Hit

RUN npm ci
→ Cache Hit

COPY src
→ Cache Miss

RUN npm run build
→ Re-run
~~~

所以 Dockerfile 常把变化频率低且执行成本高的依赖安装步骤放在源码复制之前，以增加 Cache Hit。Docker 官方将 Build Cache 描述为在输入未变化时复用已有构建结果。[[3]](https://docs.docker.com/build/cache/)

### 【Multi-stage Build 将构建环境和运行环境分开】

很多应用 Build 时需要完整工具链，但 Runtime 不需要。例如 Web Application：

~~~text
Stage 1
Node + npm + Source
↓
vite build
↓
dist/


Stage 2
Caddy / Nginx
↓
COPY dist
↓
Runtime Image
~~~

Dockerfile：

~~~dockerfile
FROM node:22 AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM caddy:2
COPY --from=build /app/dist /srv
~~~

这样 Final Image 不需要保留 Node、源码和构建依赖。[[4]](https://docs.docker.com/build/building/multi-stage/)

当 Final Stage 使用 Caddy / Nginx 时，还要继续区分三个层级：Vite 属于 Build Time，Caddy / Nginx 属于 Server Runtime，React / Vue 生产 JavaScript 最终运行在 Browser Runtime。静态文件服务、SPA Fallback 与 API Reverse Proxy 的完整关系见 [反向代理与 Web 入口体系](./F-反向代理与Web入口体系.md)。

---

## 3. Container Runtime 从 Image 创建隔离环境并启动 Process

### 【docker run 创建并启动新 Container】

执行：

~~~bash
docker run my-api:1.0
~~~

可以拆成：

~~~text
Image
↓
Create Container
↓
准备 Filesystem / Network / Environment
↓
Start Container
↓
执行 ENTRYPOINT / CMD
↓
Application Process
~~~

而 `docker start <container>` 是重新启动已经存在的 Container。

### 【CMD 与 ENTRYPOINT 共同决定 Container 的默认启动命令】

Dockerfile：

~~~dockerfile
CMD ["node", "dist/main.js"]
~~~

表示如果运行时没有覆盖启动命令，Container 默认执行 `node dist/main.js`。

Compose：

~~~yaml
services:
  worker:
    image: my-backend
    command: ["node", "dist/worker.js"]
~~~

则本次 Worker Container 使用 Compose 的 `command` 覆盖 Image 默认 CMD。

~~~text
Image CMD
= 默认值

Runtime command
= 本次 Container 的覆盖值
~~~

CMD 仍然保留在 Image 中，其他没有覆盖的 Container 仍然可以使用它。[[5]](https://docs.docker.com/reference/compose-file/services/)

### 【异步 Worker 是 Runtime Service 角色而不是 Worker Thread】

服务端异步体系中的 Worker Process / Worker Service 可以作为独立 Container 或 Compose Service 运行；它描述的是系统级后台任务消费者。Node.js Worker Thread 则是单个 Process 内的并行执行机制，两者不属于同一抽象层。

~~~text
Queue / Job Store
    ↓
Worker Service
    ↓
Container / Process

Worker Service 内部
    ↓
必要时还可以使用 Worker Thread
~~~

Task Lifecycle、Retry、Idempotency 与 Outbox 继续阅读 [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md)。Docker 本文只负责这些运行单元如何进入 Image / Container / Compose Runtime。

### 【One-shot Job 与 Long-running Service 来自主进程生命周期】

Compose 没有 `type: job` 这样的类型字段。真正区别首先来自 Main Process：

~~~text
Container Start
↓
Main Process
│
├── 完成任务后 Exit
│      → One-shot Job
│
└── 持续监听 / 轮询 / 消费
       → Long-running Service
~~~

例如：

~~~text
Migration
执行数据库迁移
↓
Exit 0
→ 正常成功

API
listen :3000
↓
持续处理 Request
→ 应长期 Running
~~~

Compose 再通过 `restart`、`healthcheck`、`depends_on.condition` 配合这种生命周期。

~~~yaml
services:
  migrate:
    image: app
    command: ["node", "migrate.js"]
    restart: "no"

  api:
    image: app
    depends_on:
      migrate:
        condition: service_completed_successfully
    restart: unless-stopped
~~~

`service_completed_successfully` 表示下游 Service 等待依赖任务成功执行完成。[[6]](https://docs.docker.com/compose/how-tos/startup-order/)

---

## 4. Container Storage 根据数据生命周期选择 Writable Layer、Volume、Bind Mount 或 tmpfs

Container 中程序产生的数据并不都应该放在同一种存储位置：

~~~text
Runtime Write
│
├── Container Writable Layer
├── Named Volume
├── Bind Mount
└── tmpfs
~~~

### 【Writable Layer 保存与当前 Container 生命周期绑定的数据】

Image Layer 是只读的，Container 启动后会增加可写层：

~~~text
Read-only Image Layers
        +
Container Writable Layer
~~~

如果程序修改 `/app/runtime.log`、`/tmp/cache`，且这些路径没有其他 Mount，就会写入 Container Writable Layer。

需要区分：

~~~text
docker stop
→ Container 仍存在
→ Writable Layer 仍存在

docker rm
→ Container 被删除
→ Writable Layer 一起删除
~~~

因此数据库等长期状态不应该只依赖 Writable Layer。

### 【Named Volume 保存独立于 Container 生命周期的数据】

Compose：

~~~yaml
services:
  db:
    image: postgres:17
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
~~~

这里 `db-data` 是 Docker 管理的 Named Volume，`/var/lib/postgresql/data` 是 Container 内的 Mount Target。

~~~text
Database Process
↓ write
/var/lib/postgresql/data
↓
Mounted Volume
↓
Container 删除
↓
Volume 仍可保留
~~~

Named Volume 适合 Database、Upload、持久状态等。[[7]](https://docs.docker.com/engine/storage/volumes/)

### 【Bind Mount 直接连接 Host Path 与 Container Path】

例如：

~~~yaml
services:
  app:
    volumes:
      - ./src:/app/src
~~~

表示：

~~~text
Host ./src
↔
Container /app/src
~~~

Bind Mount 常用于本地开发、配置注入或 Host 与 Container 需要直接共享文件的场景。[[8]](https://docs.docker.com/engine/storage/bind-mounts/)

### 【tmpfs 提供不需要持久化的临时可写区域】

tmpfs（Temporary Filesystem，临时文件系统）主要用于 Temporary File、Runtime Cache、Browser Profile、PID / Lock、短生命周期中间结果。

~~~yaml
services:
  app:
    tmpfs:
      - /tmp
~~~

意味着：

~~~text
Process
↓ write /tmp/a.txt
/tmp
↓
tmpfs Mount
↓
Container 停止后不保留
~~~

Docker 官方说明 tmpfs 主要位于 Host Memory；Linux 仍可能把相关内存页交换到 Swap，因此不应把它描述成“绝对不会接触磁盘”。[[9]](https://docs.docker.com/engine/storage/tmpfs/)

### 【read_only 与 tmpfs 可以组成最小可写面】

~~~yaml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
~~~

可以理解为：

~~~text
Container Root Filesystem
→ 默认 Read-only

/tmp
→ 通过 tmpfs 显式开放 Writable Area
~~~

所以 `/app/a.txt` 的普通写入会失败，而 `/tmp/a.txt` 可以写入。这种设计适合大部分文件系统不应被 Runtime 修改、但程序仍需要少量临时写入的场景。

---

## 5. Docker Network 负责 Container 间通信，Port Publishing 负责连接 Host 与 Container

### 【Container 拥有自己的 Network Namespace】

每个 Container 可以拥有独立的 Network Namespace（网络命名空间），其中包括 Network Interface、IP、Route、localhost 和 Port Space。

> `localhost` 始终指向当前 Process 所在网络空间自身，而不是“Docker Host”或“其他 Container”。

如果 API Container 中访问 `localhost:6379`，它找的是 API Container 自己的 6379，而不是另一个 Redis Container。

### 【同一 Docker Network 中的 Service 通常通过 Service Name 通信】

Compose：

~~~yaml
services:
  api:
    image: my-api

  redis:
    image: redis:7
~~~

默认会建立 Compose Network。通信可以写：

~~~text
redis:6379
~~~

其中：

~~~text
redis
→ Service Name
→ Docker DNS 解析目标 Container

6379
→ Redis Process 在 Container 内监听的 Port
~~~

这避免业务依赖 Container 重建后可能变化的 IP。[[10]](https://docs.docker.com/compose/how-tos/networking/)

### 【Container Port 是 Process 的监听端口】

假设程序 `listen 0.0.0.0:3000`，3000 是该 Process 在 Container Network Namespace 中监听的 Port。同 Network 的其他 Container 可以通过 `api:3000` 访问，不一定需要 Published Port。

### 【Port Publishing 将 Host Port 映射到 Container Port】

Compose：

~~~yaml
services:
  api:
    ports:
      - "8080:3000"
~~~

表示：

~~~text
Host :8080
↓
Published Port
↓
Container :3000
↓
Application Process
~~~

所以：

~~~text
Container → Container
通常使用 Service Name + Container Port

Host / External Client → Container
通常使用 Published Port
~~~

Port Publishing 的边界与安全行为以 Docker 官方文档为准。[[11]](https://docs.docker.com/engine/network/port-publishing/)

---

## 6. Docker Compose 将多个 Container 组织成一个 Runtime System

Docker Compose 用 YAML 描述 Multi-container Application（多容器应用）的运行模型。

~~~text
Compose Application
│
├── Service
│   ├── image / build
│   ├── command
│   ├── environment
│   ├── ports
│   ├── volumes
│   ├── depends_on
│   ├── healthcheck
│   └── restart
│
├── Network
└── Volume
~~~

Docker 官方将 Compose 定义为用于定义和运行多容器应用的工具。[[12]](https://docs.docker.com/compose/)

### 【Service 是 Runtime Unit 配置，不等于源码目录】

一个 Monorepo 可能有很多 Package，但只有真正需要独立 Runtime Process 的单元才通常成为 Compose Service。

~~~text
Workspace Package
≠
Compose Service
~~~

对应关系更接近：

~~~text
Source Project
↓ Build
Artifact
↓
Image
↓
Container
↓
Process
↓
Service Responsibility
~~~

这也是 [Monorepo 工程体系](./M-Monorepo工程体系.md) 中 Source Dependency 与 Runtime Dependency 必须分开理解的原因。

### 【depends_on 与 healthcheck 配合表达启动依赖和 Ready 条件】

简单 `depends_on` 可以表达启动顺序关系。如果 API 必须等待 Database 真正 Ready，可以使用：

~~~yaml
services:
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]

  api:
    depends_on:
      db:
        condition: service_healthy
~~~

因此：

~~~text
Container Started
≠
Application Ready
~~~

Healthcheck（健康检查）用于描述服务是否已经达到可以被依赖的状态。[[6]](https://docs.docker.com/compose/how-tos/startup-order/)

### 【Profile 控制可选 Service 是否参与本次运行】

~~~yaml
services:
  mail:
    image: mailpit
    profiles: ["dev"]
~~~

普通 `docker compose up` 不会默认启动 `mail`；执行 `docker compose --profile dev up` 时，会在默认 Service 基础上加入 dev Profile Service。

Profile 适合 Local Mail、Debug Tool、Mock Service、Development-only Dependency 等可选运行单元。[[13]](https://docs.docker.com/compose/how-tos/profiles/)

### 【多个 Compose 文件可以形成 Base + Override】

基础配置：

~~~yaml
# compose.yaml
services:
  api:
    environment:
      RATE_LIMIT: 100
~~~

测试覆盖：

~~~yaml
# compose.load.yaml
services:
  api:
    environment:
      RATE_LIMIT: 4000
~~~

执行：

~~~bash
docker compose \
  -f compose.yaml \
  -f compose.load.yaml \
  up
~~~

Compose 按指定顺序合并文件，后面的配置可以补充或覆盖前面的配置。[[14]](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)

这种模式适合 Base Runtime + Development Override + Load Test Override + Production-like Override，但 Override File 越多，配置合并规则和维护成本也会越高。

---

## 7. Environment Configuration 要区分 Compose 插值、Build ARG 与 Container ENV

`.env` 并不天然等于 Container Environment。

~~~text
Host Environment / .env
        ↓
Compose Variable Source
        ↓
${VAR:-default}
        ↓
Compose Configuration
        │
        ├── environment
        │      ↓
        │   Container Environment
        │      ↓
        │   Application Process
        │
        └── build.args
               ↓
            Dockerfile ARG
               ↓
            Image Build
~~~

### 【.env 与 --env-file 首先提供 Compose Variable】

例如：

~~~env
APP_PORT=3000
~~~

Compose：

~~~yaml
services:
  api:
    ports:
      - "8080:${APP_PORT}"
~~~

`${APP_PORT}` 在 Compose 解析阶段完成变量插值。

Docker Compose 可以从 Shell、`--env-file` 或默认 `.env` 等来源获得变量，具体优先级以官方文档为准。[[15]](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)

### 【environment 决定 Runtime Process 能读取什么变量】

~~~yaml
services:
  api:
    environment:
      NODE_ENV: ${NODE_ENV:-production}
~~~

最终：

~~~text
Compose Variable
↓
environment
↓
Container Environment
↓
Node.js process.env.NODE_ENV
~~~

如果 `.env` 中有很多变量，但 Compose 没有通过 `environment` 或 `env_file` 传入某个 Service，它们不会因为存在于 `.env` 就自动全部进入该 Container。[[16]](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/)

### 【ARG 主要作用于 Build，ENV 会进入后续 Runtime 默认环境】

Dockerfile：

~~~dockerfile
ARG PACKAGE_MIRROR=https://example.com
ENV NODE_ENV=production
~~~

可以区分：

~~~text
ARG
主要提供 Build-time 参数

ENV
写入 Image 配置
并成为 Container 的默认 Runtime Environment
~~~

Compose 可以分别写：

~~~yaml
services:
  app:
    build:
      args:
        PACKAGE_MIRROR: ${PACKAGE_MIRROR}

    environment:
      NODE_ENV: ${NODE_ENV:-production}
~~~

Secret 不应该因为 ENV 使用方便就直接固化到 Image 中；生产环境通常还需要独立 Secret Management。

---

## 8. Docker CLI 最值得记住的是从初始化到运行的一条工作流

### 【docker init 可以生成项目的初始 Docker 文件】

在普通项目根目录：

~~~bash
docker init
~~~

Docker Desktop 会根据项目类型引导生成：

~~~text
.dockerignore
Dockerfile
compose.yaml
README.Docker.md
~~~

这些文件是起始模板，不替代对 Runtime Boundary、Port、Volume、Environment 和 Service 生命周期的人工判断。[[17]](https://docs.docker.com/reference/cli/docker/init/)

### 【Compose 项目的核心操作链可以压缩成七步】

~~~bash
# 1. 初始化
docker init

# 2. 检查 Compose 最终解析结果
docker compose config

# 3. Build 并后台启动
docker compose up -d --build

# 4. 查看状态
docker compose ps

# 5. 查看某个 Service 日志
docker compose logs -f api

# 6. 进入正在运行的 Container
docker compose exec api sh

# 7. 停止并移除本次 Compose Runtime
docker compose down
~~~

对应对象变化：

~~~text
Project
↓ docker init
Dockerfile / compose.yaml
↓
docker compose config
↓
Resolved Compose Model
↓
docker compose up -d --build
↓
Image
↓
Container
↓
Process
↓
docker compose ps / logs / exec
↓
docker compose down
~~~

### 【单 Container 项目可以直接使用 build 与 run】

~~~bash
docker build -t my-api:1.0 .

docker run -d \
  --name my-api \
  -p 8080:3000 \
  my-api:1.0
~~~

排障常用：

~~~bash
docker ps -a
docker logs -f my-api
docker exec -it my-api sh
docker inspect my-api
~~~

Volume / Network 排障：

~~~bash
docker volume ls
docker volume inspect <volume>

docker network ls
docker network inspect <network>
~~~

命令不是独立知识点，而是对前面 Image、Container、Network、Volume 和 Compose 对象模型的操作入口。

---

## 9. Docker 工程治理连接构建、部署、安全与项目实践

### 【Dockerfile 优化围绕可重复构建、缓存和最小 Runtime 展开】

常见治理目标：

~~~text
Reproducible Build
固定 Dependency / Lockfile / Runtime Version

Build Cache
减少重复 Dependency Install / Build

Multi-stage
缩小 Final Runtime Image

.dockerignore
限制 Build Context

Least Privilege
避免不必要 Root / Capability

Read-only + Explicit Mount
缩小 Runtime Writable Surface
~~~

因此 Docker 优化不能只等价成“换更小 Base Image”。

### 【Docker 处于 Build Artifact 与 Deployment Runtime 之间】

在完整工程链中：

~~~text
Source Code
↓
Build
↓
Application Artifact
↓
Docker Image
↓
Registry
↓
Deployment Environment
↓
Container
↓
Running Service
~~~

Docker 与 CI/CD 的连接点通常包括 Build Image、Test Image、Scan Image、Tag、Push Registry、Deploy 和 Rollback。所以 Docker 是 Runtime / Deployment Model 的重要组成，但不是 CI/CD 本身。Artifact、Release、Deployment、Production Verification 与 Recovery 的完整边界见 [软件交付与 CI/CD 工程体系](./R-软件交付与CI-CD工程体系.md)。

### 【Compose 与 Kubernetes 管理规模不同】

~~~text
Dockerfile
→ 构建 Image

Container Runtime
→ 运行 Container

Docker Compose
→ 组织一个 Compose Application 中的多个 Service

Kubernetes
→ 在 Cluster 级别调度和治理 Workload
~~~

Kubernetes 会进一步关注 Replica、Scheduling、Self-healing、Rolling Update、Service Discovery 和 Resource Management 等集群级问题。

### 【Docker 与服务端、Monorepo 和数据库知识形成上下游连接】

建议阅读关系：

~~~text
服务端完整框架体系
↓
理解 Process / HTTP Server / Runtime Dependency
↓
Docker 工程体系
↓
理解 Image / Container / Compose / Runtime Resources
↓
CI/CD / Kubernetes / Deployment


Monorepo 工程体系
↓
Build Artifact / Runtime Boundary
↓
Docker 工程体系


DATABASE
↓
Database Runtime
↓
Volume / Network / Healthcheck
~~~

前置知识：

- [服务端完整框架体系](./F-服务端完整框架体系.md)
- [Monorepo 工程体系](./M-Monorepo工程体系.md)

延伸知识：

- [Git 分支、发布流程与 CI/CD](<./G-Git分支操作、发布流程及CI_CD相关面试笔记（完整版）.md>)
- [DATABASE](./D-DATABASE.md)

### 【实战分析入口】

通用知识正文不展开具体项目的 Dockerfile、Compose、Volume、Network 和运行拓扑。需要把本篇知识映射到真实源码时，可继续阅读：

- [Browser Monitor：Docker 体系源码学习](https://github.com/cxDlogver/browser-monitor/blob/main/docs/Docker%E4%BD%93%E7%B3%BB%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0.md)

## 10. 参考资料

1. Docker Docs, **Docker overview**：https://docs.docker.com/get-started/docker-overview/
2. Docker Docs, **Dockerfile reference**：https://docs.docker.com/reference/dockerfile/
3. Docker Docs, **Build cache**：https://docs.docker.com/build/cache/
4. Docker Docs, **Multi-stage builds**：https://docs.docker.com/build/building/multi-stage/
5. Docker Docs, **Compose services**：https://docs.docker.com/reference/compose-file/services/
6. Docker Docs, **Control startup order**：https://docs.docker.com/compose/how-tos/startup-order/
7. Docker Docs, **Volumes**：https://docs.docker.com/engine/storage/volumes/
8. Docker Docs, **Bind mounts**：https://docs.docker.com/engine/storage/bind-mounts/
9. Docker Docs, **tmpfs mounts**：https://docs.docker.com/engine/storage/tmpfs/
10. Docker Docs, **Networking in Compose**：https://docs.docker.com/compose/how-tos/networking/
11. Docker Docs, **Port publishing and mapping**：https://docs.docker.com/engine/network/port-publishing/
12. Docker Docs, **Docker Compose**：https://docs.docker.com/compose/
13. Docker Docs, **Using profiles with Compose**：https://docs.docker.com/compose/how-tos/profiles/
14. Docker Docs, **Merge Compose files**：https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/
15. Docker Docs, **Compose variable interpolation**：https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
16. Docker Docs, **Set environment variables within a container**：https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
17. Docker Docs, **docker init**：https://docs.docker.com/reference/cli/docker/init/
