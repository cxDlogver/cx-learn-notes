# NestJS 快速上手

> **本文目标**：先建立 NestJS 的完整框架认知，再进入具体 API。第一阶段重点不是记住所有装饰器，而是理解 NestJS 为什么存在、应用如何启动、Module 如何建立能力边界、Provider 与 DI 如何构造对象关系，以及一次 HTTP 请求如何穿过整个应用。

> **学习边界**：本文讲 NestJS 的通用设计。项目中的 Fastify、Redis、PostgreSQL、Session、CSRF 等实现用于帮助理解这些概念，但具体项目代码仍应放在实践文档中分析。

## 1. NestJS 位于 Node.js HTTP Server 之上，解决的是应用组织问题

### 【NestJS 不是 HTTP Server，也不是 Node.js 的替代品】

从服务端完整链路看，NestJS 位于运行时和底层 Web Framework 之上。Node Process、Event Loop、异步 I/O、Worker Thread 等更底层运行机制统一参考 [Node.js Runtime 完整知识体系](./N-NodeJS核心总结.md)：

```text
Client
  ↓
Reverse Proxy
  ↓
Node.js Runtime / HTTP Server
  ↓
Express / Fastify
  ↓
NestJS Application
  ↓
Controller
  ↓
Service
  ↓
Database / Cache / External Service
```

这些层次解决的问题不同：

| 层次 | 主要职责 |
| --- | --- |
| Node.js | JavaScript 服务端运行时、进程、事件循环与 I/O |
| Node.js HTTP Server | 监听端口、接收请求、返回响应 |
| Express / Fastify | 路由、请求解析、插件或中间件、HTTP 生命周期 |
| NestJS | Module、DI、Controller、Provider、Guard、Interceptor、生命周期等应用结构 |
| Service / Data Layer | 业务规则、数据库、缓存和外部服务调用 |

因此 NestJS 最核心的价值不是“帮我们监听一个端口”，而是：

> **把一个不断增长的服务端应用组织成可理解、可装配、可维护的模块与对象依赖图。** [[1]](https://docs.nestjs.com/first-steps)

### 【NestJS 的第一阶段知识应形成一条连续主线】

```text
Application Bootstrap
        ↓
Module Graph
        ↓
Provider / DI Container
        ↓
Controller
        ↓
Request Lifecycle
        ↓
Service / Data Access
        ↓
Application Lifecycle
```

这些并不是孤立 API：

- Bootstrap 决定应用怎样被创建并真正运行；
- Module 决定应用由哪些能力组成、模块之间如何依赖；
- Provider 描述可被容器管理的能力；
- DI Container 创建并连接这些 Provider；
- Controller 把 HTTP 语义转换成应用方法调用；
- Guard、Pipe、Interceptor、Filter 组织一次请求的横向处理；
- Lifecycle 管理应用从初始化到退出的全过程。

## 2. Application Bootstrap 把源码装配成真正运行的 HTTP 服务

### 【NestFactory.create 从 Root Module 构建整个 Application】

典型入口位于 `main.ts`：

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

bootstrap();
```

`NestFactory.create(AppModule)` 不是简单执行 `new AppModule()`，而是让 Nest 从 Root Module 开始建立完整应用：

```text
执行 main.ts
    ↓
NestFactory.create(AppModule)
    ↓
读取 Root Module 元数据
    ↓
建立 Module Graph
    ↓
建立 DI Container
    ↓
解析并实例化 Controller / Provider
    ↓
注册路由和框架组件
    ↓
得到 Nest Application
```

Root Module 因此既是应用入口，也是 Nest 构建 Application Graph 的起点。[[2]](https://docs.nestjs.com/modules)

### 【FastifyAdapter 把 Nest 的应用抽象连接到底层 Fastify】

Nest 默认可以运行在 Express 上，也可以显式使用 Fastify Adapter：

```ts
const adapter = new FastifyAdapter({
  bodyLimit: 256 * 1024,
  trustProxy: true,
});

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  adapter,
);
```

关系可以理解为：

```text
Nest Application
      ↓
FastifyAdapter
      ↓
Fastify
      ↓
Node.js HTTP Server
```

NestJS 负责应用结构，Fastify 仍然负责大量底层 HTTP 行为。项目里调用 `app.register(...)` 时，本质上就是在使用 Fastify 的 Plugin 系统，而不是在注册 Nest Module。Fastify 的 `register()` 会创建封装上下文，这与 Nest 的 Module Graph 是两套不同机制。[[3]](https://fastify.dev/docs/latest/Reference/Encapsulation/)

### 【Fastify Plugin 可以在 Bootstrap 阶段补充底层 HTTP 能力】

例如 Cookie：

```ts
await app.register(cookie as never, {
  secret: config.COOKIE_SECRET,
});
```

注册 `@fastify/cookie` 后，Fastify Request / Reply 才具备 Cookie 解析、设置、清理等能力：

```text
HTTP Cookie Header
      ↓
@fastify/cookie
      ↓
request.cookies

reply.setCookie(...)
reply.clearCookie(...)
```

`secret` 用于签名 Cookie 的完整性校验；签名不是加密，是否真正使用签名还取决于设置 Cookie 时是否启用 signed 选项。[[4]](https://github.com/fastify/fastify-cookie)

`cookie as never` 属于 TypeScript 类型层的规避写法：

```text
插件运行时对象
      ↓
类型定义无法完全匹配 app.register 的签名
      ↓
as never 跳过这一处编译期检查
```

它不会改变运行时 Cookie 行为。长期应优先检查 Nest、Fastify 和插件版本的类型兼容，而不是把 `as never` 当成业务语义。

### 【app.get 是 Bootstrap 在 DI 容器外部读取 Provider 的入口】

Bootstrap 本身只是普通函数，不能像 `@Injectable()` 类一样使用构造函数注入，因此常见写法是：

```ts
const config = app.get<ApiConfig>(API_CONFIG);
```

可以理解为：

```text
Nest Application 已创建
      ↓
DI Container 已经存在
      ↓
bootstrap() 通过 app.get(token)
      ↓
读取已经由容器管理的对象
```

这不是日常业务 Service 的首选依赖方式；业务类仍应该优先使用构造函数注入。

### 【enableCors 配置的是浏览器跨域规则，不是接口授权系统】

```ts
app.enableCors({
  origin: true,
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['content-type', 'x-csrf-token', 'x-request-id'],
});
```

CORS 解决的问题是：

```text
Browser 页面 Origin
      ↓
准备访问另一个 Origin 的 API
      ↓
浏览器根据服务端 CORS Response Header
决定是否允许前端 JavaScript 完成跨域交互
```

`origin: true` 在 Fastify CORS 中通常会反射请求 Origin，意味着跨域来源限制很宽；`credentials: true` 表示服务端允许带凭证的跨域请求；`methods` 和 `allowedHeaders` 控制预检允许的方法和请求头。Nest 在 Fastify 平台下使用 `@fastify/cors`，而 Fastify 默认只对 CORS safelist 方法提供默认允许，因此 PUT、DELETE、PATCH 等跨域方法应显式声明。[[5]](https://docs.nestjs.com/security/cors)

最重要的是区分：

```text
CORS
  → 浏览器跨域访问策略

Authentication
  → 你是谁

CSRF
  → 带 Cookie 的状态修改请求是否被伪造

Authorization
  → 你是否有权操作当前资源

Business Origin Validation
  → 当前业务对象是否允许这个来源
```

因此：

> **CORS 可以减少浏览器侧不必要的跨域访问，但不能替代服务端 Authentication、Authorization、CSRF、限流和输入校验。非浏览器 HTTP Client 并不会因为 CORS 配置而失去请求 API 的能力。**

如果系统存在两类白名单，还要进一步区分：

```text
全局 CORS Origin 白名单
    这个前端来源能否跨域访问这个 API 服务

Project Origin 白名单
    这个来源能否向某一个具体 Project 上报数据
```

项目级白名单通常依赖：

```text
publicKey
   ↓
解析 Project
   ↓
读取 Project.allowedOrigins
   ↓
校验当前 Origin
```

这是一条 `Origin × Project` 的业务关系，不能简单用一个全局 CORS 数组代替。即使 CORS 也做动态白名单，Service 层的业务校验仍然不能删除。

对于固定的管理后台域名，CORS 仍然可以配置更严格的固定白名单作为额外防线。`origin: true` 应理解为“CORS 边界较宽”，而不是“天然安全”。

### 【enableShutdownHooks 把操作系统退出信号接入 Nest 生命周期】

```ts
app.enableShutdownHooks();
```

Node.js 进程可以收到 `SIGINT`、`SIGTERM` 等信号。Nest 开启 Shutdown Hooks 后，会在终止阶段调用已经注册生命周期 Hook 的 Module、Provider 或 Controller。[[6]](https://docs.nestjs.com/fundamentals/lifecycle-events) [[7]](https://nodejs.org/api/process.html#signal-events)

例如：

```ts
class InfrastructureShutdown implements OnApplicationShutdown {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([
      this.database.close(),
      this.redis.quit(),
    ]);
  }
}
```

完整过程可以理解为：

```text
Ctrl + C / docker stop / 容器滚动更新
      ↓
SIGINT / SIGTERM
      ↓
Node Process
      ↓
Nest Shutdown Hooks
      ↓
onModuleDestroy()
      ↓
beforeApplicationShutdown()
      ↓
关闭 HTTP Server
      ↓
onApplicationShutdown()
      ↓
释放 Database / Redis / Timer 等资源
      ↓
Process Exit
```

`Promise.allSettled()` 很适合关闭阶段：数据库关闭失败不应该阻止 Redis 继续尝试退出。这里体现的不是业务请求生命周期，而是 **Process / Application Lifecycle**。

### 【listen 才让应用真正开始监听网络请求】

```ts
await app.listen(config.API_PORT, '0.0.0.0');
```

在 `listen()` 之前，Nest Application 已经被装配，但还没有对外监听端口。执行后才进入：

```text
Nest Application
    ↓
Fastify listen
    ↓
Node.js HTTP Server
    ↓
Bind Host + Port
    ↓
等待 Request
```

`0.0.0.0` 表示监听全部 IPv4 网络接口，在 Docker 容器中很常见，因为只监听 `127.0.0.1` 通常意味着只有容器自身可以访问。Fastify 官方也明确建议容器场景根据需要监听 `0.0.0.0`，同时提醒监听全部接口需要配合正确的网络安全边界。[[8]](https://fastify.dev/docs/latest/Reference/Server/)

最终可以把 Bootstrap 收敛成：

```text
NestFactory.create
      ↓
创建应用与 DI Container
      ↓
注册底层 HTTP Plugin
      ↓
配置 CORS 等边界
      ↓
开启 Shutdown Hooks
      ↓
listen
      ↓
运行中的 HTTP Service
```

## 3. Module 同时定义业务能力边界和依赖可见性边界

### 【Module 不是文件夹，而是 Nest 组织 Application Graph 的基本单位】

```ts
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class ProjectsModule {}
```

可以直接把一个 Module 翻译成四个问题：

| 字段 | Module 在回答的问题 |
| --- | --- |
| `imports` | 当前能力依赖哪些其他 Module |
| `controllers` | 当前能力暴露哪些 HTTP 入口 |
| `providers` | 当前 Module 内部由容器管理哪些能力 |
| `exports` | 哪些 Provider 构成这个 Module 对外提供的公共能力 |

Nest 官方将 Module 描述为组织应用结构的单元，Root Module 是 Nest 构建 Application Graph 的起点；大多数业务应通过多个 Module 封装相关能力。[[2]](https://docs.nestjs.com/modules)

因此：

```text
Module
  = Feature Boundary
  + Dependency Boundary
  + Provider Visibility Boundary
```

### 【providers 决定当前 Module 拥有哪些可注入能力】

```ts
@Module({
  providers: [ProjectsService],
})
export class ProjectsModule {}
```

这里不是简单表示“创建 ProjectsService”，而是在告诉 Nest：

```text
ProjectsService
      ↓
注册为 ProjectsModule DI Context 中的 Provider
      ↓
由 Nest Injector 创建与管理
      ↓
可以被当前 Module 中可解析它的对象注入
```

Provider 是 Nest DI 系统的基本对象。Service 是最常见的 Provider，但配置、数据库句柄、Redis Client、生命周期处理器等同样可以作为 Provider。[[9]](https://docs.nestjs.com/providers)

### 【exports 把内部 Provider 变成 Module 的公共 API】

只有 `providers`：

```ts
@Module({
  providers: [ProjectsService],
})
export class ProjectsModule {}
```

表示它主要属于模块内部。

增加：

```ts
exports: [ProjectsService]
```

就意味着：

```text
ProjectsModule
┌──────────────────────────────┐
│ internal providers           │
│ internal implementation      │
│                              │
│ public capability            │
│   ProjectsService            │
└──────────────┬───────────────┘
               ↓
        Other Modules
```

`exports` 可以类比一个模块的 Public API：其他 Module 不需要理解内部 SQL、内部 Helper 或实现细节，只依赖被明确暴露的能力。

### 【imports 显式声明 Module Graph 中的依赖关系】

```ts
@Module({
  imports: [ProjectsModule],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
```

不要只理解成“加载 ProjectsModule”，而应读成：

```text
AnalyticsModule
      ↓ depends on
ProjectsModule
      ↓ exports
ProjectsService
```

于是 Module Graph 本身就是一张架构依赖图。

### 【AppModule 是 Composition Root，而不是业务模块的大杂烩】

```ts
@Module({
  imports: [
    InfrastructureModule,
    AuthModule,
    ProjectsModule,
    IngestionModule,
    AnalyticsModule,
    LabAuditsModule,
  ],
})
export class AppModule {}
```

`AppModule` 的主要职责是：

```text
把多个独立能力
      ↓
按照依赖关系装配
      ↓
形成一个完整 Application
```

因此 Root Module 更接近 **Composition Root / 应用装配根节点**。业务规则应尽量留在对应 Feature Module，而不是集中回 AppModule。

### 【Global Module 适合真正的全应用基础设施，但不应滥用】

如果 Database、Redis、Config 被绝大多数业务模块共享，可以使用：

```ts
@Global()
@Module({
  providers: [DATABASE, REDIS, API_CONFIG],
  exports: [DATABASE, REDIS, API_CONFIG],
})
export class InfrastructureModule {}
```

这样其他 Module 不需要反复 imports。

但如果把大量业务 Service 全部做成 Global：

```text
任何 Module
    ↓
都能直接依赖任何业务 Service
    ↓
Module 依赖关系逐渐不可见
    ↓
重新退化成巨大的全局容器
```

因此 Global 更适合基础设施能力，不应该用来逃避业务模块之间的显式 imports / exports。

## 4. Dependency Injection 负责构建和管理应用对象关系

这一章不要把 `Symbol Token`、`useFactory`、`@Inject`、生命周期钩子理解成几个独立技巧。它们共同描述的是同一件事：

> **NestJS 如何识别一个依赖、决定它怎样创建、解析它依赖谁，并最终把整个应用连接成运行中的对象图。**

可以先建立完整主线：

```text
Provider 是什么
    ↓
Nest 用什么识别 Provider
    ↓
Token
    ↓
Provider 实例怎样创建
    ↓
Provider Definition
    ↓
创建它还需要哪些依赖
    ↓
inject / constructor
    ↓
DI Container 解析依赖关系
    ↓
Provider Object Graph
    ↓
Provider Lifecycle
    ↓
应用关闭时释放资源
```

### 【Provider 是被 Nest 容器管理的能力对象】

Provider 是 Nest 依赖注入系统管理对象的基本单位。Service 是最常见的 Provider，但 Provider 并不等于 Service。[[9]](https://docs.nestjs.com/providers)

例如下面这些都可以成为 Provider：

```text
UserService
MetricsService
Database Handle
Redis Client
Config Object
Guard
Interceptor
Lifecycle Handler
```

普通 Service：

```ts
@Injectable()
export class UserService {
  findAll() {
    return [];
  }
}
```

注册到 Module：

```ts
@Module({
  providers: [UserService],
})
export class UserModule {}
```

此时真正发生的是：

```text
UserService
    ↓
注册为 Provider
    ↓
进入 Nest DI Container 的管理范围
    ↓
由容器负责创建、复用和注入
```

所以 Provider 最重要的理解不是“可以被注入的 Service”，而是：

> **Provider 是一个由 Nest IoC Container 负责识别、创建、连接和管理生命周期的对象或值。**

### 【Token 是 DI Container 识别 Provider 的运行时标识】

容器里可能有大量 Provider，因此 Nest 必须能够回答：

```text
当前需要的是哪一个 Provider？
```

这个运行时标识就是 **DI Token**。

可以抽象成：

```text
Token
   ↓
定位 Provider Definition
   ↓
得到 Provider Instance
```

例如普通 Service：

```text
Token
UserService class
    ↓
Provider
UserService
    ↓
Instance
UserService instance
```

也可以显式定义：

```ts
export const DATABASE = Symbol('DATABASE');
export const REDIS = Symbol('REDIS');
export const API_CONFIG = Symbol('API_CONFIG');
```

形成：

```text
DATABASE
    ↓
Database Provider
    ↓
DatabaseHandle instance

REDIS
    ↓
Redis Provider
    ↓
Redis client instance
```

因此需要区分两个概念：

```text
TypeScript Type
    → 帮助编译器检查类型

DI Token
    → 帮助 Nest 在运行时定位 Provider
```

这也是理解后面 `@Inject()` 的基础。

### 【Class 可以天然充当 Token，Symbol / String 用于显式定义依赖身份】

普通 Service：

```ts
@Injectable()
export class MetricsService {}
```

注册：

```ts
providers: [MetricsService]
```

可以把它理解成一种简写：

```ts
{
  provide: MetricsService,
  useClass: MetricsService,
}
```

这里：

```text
MetricsService
    ├── TypeScript Type
    └── Runtime DI Token
```

所以使用方通常可以直接写：

```ts
constructor(
  private readonly metrics: MetricsService,
) {}
```

Nest 可以根据运行时类元数据解析出：

```text
需要的 Token = MetricsService
```

但并不是所有依赖都有一个合适的 Class Token。

典型情况包括：

1. 工厂函数返回的运行时实例；
2. 普通配置对象；
3. 第三方客户端；
4. 希望把“依赖身份”和“具体实现类”解耦的抽象能力。

例如：

```ts
export const DATABASE = Symbol('DATABASE');
export const REDIS = Symbol('REDIS');
export const API_CONFIG = Symbol('API_CONFIG');
```

这里可以得到更准确的规则：

> **Class Token 适合由类自然表达的 Provider；Symbol / String Token 适合工厂实例、普通对象、第三方能力或需要显式抽象依赖身份的场景。**

使用 Symbol / String Token 时，Nest 无法仅通过 TypeScript 类型知道运行时应该查找哪个 Provider，因此需要显式：

```ts
@Inject(DATABASE)
private readonly database: DatabaseHandle
```

这里其实同时存在两个概念：

```text
DATABASE
    → Runtime DI Token

DatabaseHandle
    → TypeScript Type
```

### 【Provider Definition 决定一个 Token 对应的实例怎样创建】

有了 Token，只解决了：

```text
这个依赖叫什么？
```

还需要解决：

```text
这个依赖对应的实例从哪里来？
```

这就是 Provider Definition。

Nest 常见的 Custom Provider 形式包括：[[15]](https://docs.nestjs.com/fundamentals/custom-providers)

```text
useClass
    → 通过类创建实例

useValue
    → 直接提供一个现成值

useFactory
    → 执行工厂函数创建实例

useExisting
    → 给已有 Provider 建立别名
```

普通：

```ts
providers: [UserService]
```

可以理解为：

```ts
{
  provide: UserService,
  useClass: UserService,
}
```

而数据库这类运行时资源更适合：

```ts
{
  provide: DATABASE,
  useFactory: () => createDatabase(),
}
```

所以 `useFactory` 并不是另一套 DI 机制，而只是：

> **Provider Definition 中的一种实例创建策略。**

### 【useFactory + inject 描述“这个 Provider 怎样依赖其他 Provider”】

实际创建 Provider 时，它本身也可能依赖其他 Provider。

例如：

```ts
{
  provide: API_CONFIG,
  useFactory: (): ApiConfig => loadApiConfig(),
},
{
  provide: DATABASE,
  inject: [API_CONFIG],
  useFactory: (config: ApiConfig) =>
    createDatabase(config.DATABASE_URL),
},
{
  provide: REDIS,
  inject: [API_CONFIG],
  useFactory: (config: ApiConfig) =>
    createRedis(config.REDIS_URL),
},
```

三个字段可以直接理解成三个问题：

| 字段 | 回答的问题 |
| --- | --- |
| `provide` | 我要定义哪个 Provider / Token？ |
| `inject` | 创建它之前需要先拿到哪些 Provider？ |
| `useFactory` | 拿到依赖以后具体怎样创建实例？ |

DATABASE 的创建过程可以展开为：

```text
DI Container
    ↓
发现 DATABASE 依赖 API_CONFIG
    ↓
先解析 API_CONFIG
    ↓
把 config instance 传给 useFactory
    ↓
createDatabase(config.DATABASE_URL)
    ↓
得到 DatabaseHandle instance
    ↓
注册为 DATABASE 对应实例
```

因此：

```text
API_CONFIG
    ├──→ DATABASE
    └──→ REDIS
```

已经是一张 Provider Dependency Graph。

这里最重要的结论是：

> **Provider 自己也可以依赖其他 Provider。DI 不只是 Service → Service，也可以是 Config → Database → Business Service。**

具体 Redis Client 的重试、Ready Check、Lazy Connect 等参数属于 Redis 客户端运行配置，不属于 Nest DI 本身；在 DI 章节中只需要把它们理解为 `useFactory` 内部可以执行的初始化逻辑。

### 【构造函数负责声明依赖，DI Container 负责解析 Token】

业务对象使用依赖时，通常通过构造函数声明：

```ts
@Injectable()
export class IngestionService {
  constructor(
    @Inject(DATABASE)
    private readonly database: DatabaseHandle,

    @Inject(API_CONFIG)
    private readonly config: ApiConfig,

    @Inject(REDIS)
    private readonly redis: Redis,

    private readonly limiter: IngestionRateLimiter,
    private readonly metrics: MetricsService,
  ) {}
}
```

表面上看有两种写法：

```ts
@Inject(DATABASE)
private readonly database: DatabaseHandle
```

和：

```ts
private readonly metrics: MetricsService
```

但本质都是：

```text
IngestionService
    ↓
声明自己需要一个 Provider
```

区别只在于 Token 如何得到。

Class Token：

```text
metrics: MetricsService
       ↓
Class 本身就是 Runtime Token
       ↓
Nest 查找 MetricsService
```

Symbol Token：

```text
database: DatabaseHandle
       ↓
DatabaseHandle 只是 TypeScript Type
       ↓
运行时需要显式 @Inject(DATABASE)
       ↓
Nest 查找 DATABASE
```

因此比“类就自动注入，Symbol 就必须 `@Inject`”更完整的理解是：

> **Nest 在运行时真正根据 Token 查找 Provider。类可以同时充当类型和 Token，而 Symbol / String Token 需要通过 `@Inject(token)` 显式告诉 Nest。**

### 【DI 的核心是把对象创建权从业务对象交给 IoC Container】

如果没有 DI，代码可能自己创建依赖：

```ts
class AnalyticsService {
  private readonly projects =
    new ProjectsService(
      new Database(...),
    );
}
```

这样意味着：

```text
AnalyticsService
    ↓
必须知道 ProjectsService 怎么创建
    ↓
还必须知道 Database 怎么创建
    ↓
对象创建逻辑逐渐向业务代码扩散
```

使用 DI：

```ts
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly projects: ProjectsService,
  ) {}
}
```

业务对象只表达：

```text
我需要 ProjectsService
```

真正的创建关系变成：

```text
Provider Definitions
      ↓
DI Container
      ↓
解析 Constructor Dependency
      ↓
创建 / 获取 Provider Instance
      ↓
注入使用方
```

这就是 Inversion of Control：对象不再主动控制依赖对象如何构造，而由框架容器负责组装。[[9]](https://docs.nestjs.com/providers)

### 【Module Graph 决定去哪里找，Token 决定找谁】

上一章讲的是：

```text
Module Graph
```

这一章讲的是：

```text
Provider Object Graph
```

两者不是两套独立机制。

例如：

```text
AnalyticsModule
    ↓ imports
ProjectsModule
    ↓ exports
ProjectsService
```

这是 Module Graph，它决定：

```text
AnalyticsModule 是否有资格看到 ProjectsService
```

然后：

```text
AnalyticsService
      ↓
ProjectsService
```

这是 Provider Object Graph，它决定：

```text
运行时 AnalyticsService instance
具体依赖哪个 ProjectsService instance
```

整个解析过程可以总结为：

```text
Module Graph
      ↓
限定 Provider Visibility
      ↓
Constructor / inject 声明 Token
      ↓
DI Container 在可见范围内解析 Token
      ↓
读取 Provider Definition
      ↓
创建 / 获取 Provider Instance
      ↓
形成 Provider Object Graph
```

因此可以用一句话连接 Module 和 DI：

> **Module 决定“去哪里找”，Token 决定“找谁”，Provider Definition 决定“怎么创建”，DI Container 负责把这些信息连接成真正运行的对象图。**

### 【依赖关系应理解为图，而不是手工初始化顺序】

开发者通常不应该自己写：

```text
第一步 loadConfig
第二步 createDatabase
第三步 createRedis
第四步 new Service
```

而是声明关系：

```text
API_CONFIG
    ├──→ DATABASE
    └──→ REDIS

DATABASE
    ├──→ AnalyticsService
    ├──→ ProjectsService
    └──→ IngestionService

REDIS
    ├──→ SessionGuard
    ├──→ AnalyticsService
    └──→ IngestionService

MetricsService
    └──→ IngestionService
```

Nest DI Container 根据这些 Provider 定义和依赖声明解析对象关系。

这就是：

```text
Dependency Graph
        ↓
Provider Object Graph
```

### 【Provider Lifecycle 把对象创建与资源释放连接起来】

DI Container 的职责不只是：

```text
创建对象
```

它还参与对象生命周期管理。

例如一个生命周期 Provider：

```ts
@Injectable()
export class InfrastructureShutdown
  implements OnApplicationShutdown {

  constructor(
    @Inject(DATABASE)
    private readonly database: DatabaseHandle,

    @Inject(REDIS)
    private readonly redis: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([
      this.database.close(),
      this.redis.quit(),
    ]);
  }
}
```

只需要注册：

```ts
providers: [
  InfrastructureShutdown,
]
```

它不需要有业务方法，也不一定需要被其他 Module 注入。

它存在的意义是：

```text
Provider 被 Nest 创建
      ↓
进入 Application Lifecycle
      ↓
服务运行
      ↓
收到 Shutdown Signal
      ↓
Nest 调用 onApplicationShutdown()
      ↓
关闭 Database / Redis
```

因此生命周期 Provider 很好地说明：

> **Provider 不等于业务 Service。只要一个对象需要被 Nest 创建并在确定的生命周期阶段执行，它就可以成为 Provider。**

这一机制需要与前面 `app.enableShutdownHooks()` 配合，系统信号到来时 Nest 才会进入对应关闭生命周期。[[6]](https://docs.nestjs.com/fundamentals/lifecycle-events)

### 【Dependency Injection 最终形成完整闭环】

可以把这一章收敛成：

```text
@Module()
    ↓
注册 Provider Definition
    ↓
Token
标识 Provider
    ↓
useClass / useValue / useFactory / useExisting
定义实例如何产生
    ↓
inject / constructor
声明 Provider 依赖谁
    ↓
Module Graph
限定 Provider 可见范围
    ↓
DI Container
解析依赖并创建对象
    ↓
Provider Object Graph
形成运行时对象关系
    ↓
Application Lifecycle
管理对象直到应用退出
```

再进一步压缩：

```text
Module
    → 决定 Provider 属于哪里、对谁可见

Token
    → 决定需要找哪个 Provider

Provider Definition
    → 决定 Provider 怎样创建

inject / constructor
    → 声明 Provider 依赖谁

DI Container
    → 解析并连接所有对象

Lifecycle
    → 管理这些对象直到应用退出
```

因此 NestJS DI 最重要的结论不是：

```text
“自动给 constructor 传参数”
```

而是：

> **通过 Module 可见性、Token、Provider Definition 和依赖声明描述整个对象关系，再由 IoC Container 统一完成对象的创建、连接、复用和生命周期管理。**

## 5. Controller 负责 HTTP 边界，Service 负责业务能力

### 【Controller 把 HTTP 语义转换成方法调用】

```ts
@Controller('users')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }
}
```

Controller 主要负责：

```text
Route
参数从哪里来
HTTP Status
Request / Response Header
输入边界校验
调用哪个业务能力
```

常见参数来源包括：

| 装饰器 | 数据来源 |
| --- | --- |
| `@Param()` | URL Path Parameter |
| `@Query()` | Query String |
| `@Body()` | Request Body |
| `@Headers()` | Request Header |
| `@Req()` | 底层 Request 对象 |
| `@Res()` | 底层 Response 对象 |

### 【Service 应表达业务规则，而不是 HTTP 细节】

```ts
@Injectable()
export class UserService {
  async create(input: CreateUserInput) {
    // 业务校验
    // 数据写入
    // 事务
    // 调用其他能力
  }
}
```

职责边界可以记成：

```text
Controller
  这个 HTTP Request 是什么
  参数在哪里
  返回什么 HTTP 结果

Service
  业务规则是什么
  数据如何变化
  要调用哪些其他业务能力
```

典型链路：

```text
HTTP Request
    ↓
Controller
    ↓
Service
    ↓
Database / Cache / External Service
```

Repository 是否存在取决于项目规模和数据访问设计，Nest 并不要求每个 Service 后面一定再包一层 Repository。

## 6. Request Lifecycle 把一次请求拆成多个职责明确的阶段

### 【Nest 的请求生命周期不是单一 Controller 调用】

典型 HTTP 请求可以先建立下面的顺序：

```text
HTTP Request
    ↓
Middleware
    ↓
Guard
    ↓
Interceptor Before
    ↓
Pipe
    ↓
Controller
    ↓
Service
    ↓
Interceptor After
    ↓
Exception Filter（发生异常时）
    ↓
HTTP Response
```

Nest 官方对 Request Lifecycle 给出了更完整的作用域与执行顺序说明；入门阶段先掌握每一类组件解决什么问题即可。[[10]](https://docs.nestjs.com/faq/request-lifecycle)

| 组件 | 核心问题 | 常见用途 |
| --- | --- | --- |
| Middleware | 请求进入 Nest 路由前需要做什么 | 通用前置处理、兼容第三方中间件 |
| Guard | 这次请求允许继续吗 | Authentication、Authorization |
| Pipe | 参数是否合法、要不要转换 | Validation、Transformation |
| Interceptor | 请求执行前后要统一做什么 | 日志、耗时、响应包装、缓存 |
| Controller | 请求应该进入哪个应用方法 | HTTP 入口 |
| Service | 真正的业务规则是什么 | 业务处理 |
| Exception Filter | 异常如何映射成 Response | 错误响应统一化 |

### 【Fastify Plugin 和 Nest Middleware 不应混为一类】

例如：

```ts
app.register(cookie)
```

发生在 Fastify 层：

```text
Fastify Plugin System
```

而：

```ts
consumer.apply(SomeMiddleware).forRoutes(...);
```

属于 Nest Request Lifecycle：

```text
Nest Middleware
```

两者都可能对 Request 做前置处理，但属于不同框架层次。

### 【Guard 更适合声明请求能否继续，Service 仍需维护资源级业务权限】

例如可以分成：

```text
SessionGuard
    → 你是谁

CsrfGuard
    → 写请求是否携带合法防伪令牌

ProjectsService.requireAccess()
    → 当前用户能否访问这个具体 Project
```

这样 Authentication、请求防伪与业务 Authorization 不会全部塞进同一个 Guard。

## 7. 服务端安全应理解为多层边界，而不是依赖单个框架开关

### 【Cookie、CORS、Session、CSRF、Authorization 解决的是不同问题】

可以建立下面的安全分层：

```text
Browser
  ↓
CORS
  浏览器跨域策略
  ↓
Cookie / Session
  身份凭证与服务端会话
  ↓
CSRF
  Cookie 自动携带场景中的请求防伪
  ↓
Authentication
  当前请求是谁
  ↓
Authorization
  当前用户能否操作资源
  ↓
Business Validation
  Origin / Key / Rate Limit / Schema 等业务约束
```

这也是为什么：

```text
allowedHeaders: ['x-csrf-token']
```

只表示浏览器被允许发送这个 Header，并不代表 CSRF 已经被验证。真正的验证仍需 Guard 或其他服务端逻辑执行。

同样：

```text
Access-Control-Allow-Origin
```

也不表示当前请求已经通过业务授权。

### 【公开采集接口和管理接口可以采用不同安全边界】

管理接口可能采用：

```text
固定 CORS 白名单
    ↓
Session
    ↓
CSRF
    ↓
Project Authorization
```

公开 SDK 采集接口则可能采用：

```text
较宽 CORS
    ↓
Ingestion Key
    ↓
Project Origin Validation
    ↓
Rate Limit
    ↓
Schema Validation
```

关键原则不是“所有接口必须使用同一套 Guard”，而是：

> **真正决定请求是否有权执行的规则必须在服务端完成，不能只依赖浏览器执行的策略。**

## 8. NestJS 的 Module + DI 是一种强约束架构，其他框架采用了不同组织模式

### 【比较框架时应同时看“代码怎么分组”和“依赖怎么连接”】

不同 Web Framework 都可以实现模块化，但它们对架构边界的约束强度不同：

| 框架 | 主要组织单位 | 依赖关系的典型组织方式 |
| --- | --- | --- |
| Express | Router / Middleware / 自定义目录 | ES Module import、手工组装，框架基本不规定应用架构 |
| Fastify | Plugin / Encapsulation Context | `register()` 建立插件上下文，能力向子 Context 传播 |
| FastAPI | APIRouter + Dependency | Router 拆接口，通过 `Depends()` 构造请求级函数依赖图 |
| Django | Application | App Registry + Python Package + `INSTALLED_APPS` 组织功能 |
| Spring | Bean / ApplicationContext | IoC Container 创建、配置并注入 Bean |
| NestJS | Module + Provider | Module Graph 控制 Provider 可见性，DI Container 构造对象图 |

Express 官方把自身描述为以 routing 和 middleware 为核心的最小化 Web Framework，应用架构的大量决策留给开发者。[[11]](https://expressjs.com/en/guide/using-middleware/)

Fastify 强调 Plugin 和 Encapsulation Context；`register()` 默认创建新的 scope，使装饰器、Hook 和插件按上下文继承。[[3]](https://fastify.dev/docs/latest/Reference/Encapsulation/)

FastAPI 使用 `APIRouter` 组织大型应用，并通过 Dependency 系统建立函数式依赖。[[12]](https://fastapi.tiangolo.com/tutorial/bigger-applications/)

Django 的 Application 是提供一组功能的 Python Package，通过 App Registry 和 `INSTALLED_APPS` 接入 Project，但它并不采用 Nest 的 Provider imports / exports 可见性模型。[[13]](https://docs.djangoproject.com/en/6.0/ref/applications/)

Spring 与 NestJS 在 IoC / DI 思想上更接近：对象声明依赖，由容器负责实例化、配置和组装；Spring 将这些受容器管理的对象称为 Bean。[[14]](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html)

### 【NestJS 的主要收益是把架构约束做进框架运行模型】

如果只是目录拆分：

```text
auth/
projects/
analytics/
```

并不能保证：

```text
Analytics 不会任意依赖 Auth / Ingestion / Redis / 任意内部实现
```

Nest Module 通过：

```text
providers
exports
imports
```

让依赖关系更加显式：

```text
AnalyticsModule
     ↓ imports
ProjectsModule
     ↓ exports
ProjectsService
```

主要工程收益包括：

1. **依赖显式化**：从 Module Graph 就能看到主要业务依赖；
2. **默认封装**：未 export 的 Provider 不自动成为其他模块的公共能力；
3. **对象生命周期统一**：Provider 由 IoC Container 创建、复用和销毁；
4. **团队结构统一**：Module / Controller / Service / Provider 的职责具有一致语义；
5. **测试更容易替换依赖**：业务对象不自己 `new` 数据库、Redis 或其他 Service。

### 【强约束同时意味着更高的框架成本】

NestJS 的代价也很明确：

```text
更多 Module 声明
+
更多 Decorator
+
更多 DI 间接层
+
更多框架生命周期概念
```

一个只有几个接口的小服务，用 Express / Fastify 直接组合可能更简单；当业务域、Service 依赖、团队人数和运行生命周期复杂度持续增长时，NestJS 的显式边界和容器管理价值才会越来越明显。

因此不是：

```text
NestJS > 其他框架
```

而是：

```text
更自由、更轻的框架
    → 开发者自己承担架构约束

NestJS
    → 用更多框架结构换取更显式的模块与依赖关系
```

## 9. 一个 NestJS 应用最终形成 Module Graph 与 Provider Object Graph 两张核心图

### 【Module Graph 描述业务能力之间的关系】

```text
                     AppModule
                         │
       ┌─────────────────┼─────────────────┐
       ↓                 ↓                 ↓
Infrastructure       Projects          Ingestion
                         ↑
                  ┌──────┴──────┐
                  ↓             ↓
              Analytics      LabAudits
```

它回答：

```text
应用有哪些能力？
哪个业务依赖哪个业务？
哪些能力是全局基础设施？
```

### 【Provider Object Graph 描述运行时对象怎样被创建和连接】

```text
API_CONFIG
   ├──→ DATABASE
   └──→ REDIS

ProjectsService
   └──→ DATABASE

AnalyticsService
   ├──→ DATABASE
   ├──→ REDIS
   └──→ ProjectsService
```

它回答：

```text
一个对象依赖谁？
依赖实例由谁创建？
生命周期由谁管理？
```

两张图结合起来，才是 Nest 应用真正的运行结构：

```text
Module
定义能力与可见性边界
   ↓
Provider
定义可管理对象
   ↓
DI Container
建立对象依赖图
   ↓
Controller / Guard / Interceptor
把请求接入这些对象
   ↓
Application
形成长期运行的服务端程序
```

## 10. 基础项目结构只是上述设计关系在文件系统中的投影

### 【目录结构应反映业务能力，而不是只按技术类型平铺】

典型结构：

```text
src/
│
├── main.ts
├── app.module.ts
│
├── infrastructure/
│    └── infrastructure.module.ts
│
├── auth/
│    ├── auth.module.ts
│    ├── auth.controller.ts
│    ├── auth.service.ts
│    └── session.guard.ts
│
├── projects/
│    ├── projects.module.ts
│    ├── projects.controller.ts
│    └── projects.service.ts
│
└── analytics/
     ├── analytics.module.ts
     ├── analytics.controller.ts
     └── analytics.service.ts
```

这套目录不是因为 Nest 强制文件名，而是因为：

```text
Feature Module
    ↓
聚合与该业务能力相关的
Controller / Service / Guard / Schema / Helper
```

文件系统只是 Module 边界的可视化结果；真正的运行边界仍然来自 `@Module()` 元数据和 DI Container。

## 11. 第一阶段最终建立的是一套 NestJS 应用心智模型

### 【不要把 NestJS 学成一组装饰器 API】

第一阶段真正要形成的是：

```text
main.ts
  ↓
NestFactory
创建 Application
  ↓
Root Module
建立 Module Graph
  ↓
Provider Definitions
建立可管理能力
  ↓
DI Container
构造 Provider Object Graph
  ↓
Controller / Request Lifecycle
把 HTTP Request 路由到业务能力
  ↓
Service
执行业务规则与数据访问
  ↓
Lifecycle Hooks
管理应用启动、运行与退出
```

可以把核心概念压缩成：

| 概念 | 最重要的理解 |
| --- | --- |
| `NestFactory` | 创建并启动整个 Nest Application |
| `AppModule` | 应用装配根节点 |
| `Module` | 业务能力 + 依赖可见性边界 |
| `Provider` | 被 Nest Container 创建和管理的能力对象 |
| `DI` | 对象声明依赖，容器负责创建和连接 |
| `Controller` | HTTP 边界 |
| `Service` | 业务能力 |
| `Guard / Pipe / Interceptor / Filter` | 请求生命周期中的横向处理机制 |
| `enableCors` | 浏览器跨域策略配置，不是授权系统 |
| `enableShutdownHooks` | 将进程终止信号接入 Nest Application Lifecycle |
| `listen` | 真正启动 HTTP Server 并绑定端口 |

下一阶段再分别深入：

```text
Module / DI
  → Scope、Dynamic Module、Circular Dependency、Custom Provider

Request Lifecycle
  → Middleware / Guard / Pipe / Interceptor / Filter 的作用域和执行顺序

Security
  → Session / Cookie / CSRF / Authentication / Authorization

Data
  → Transaction / Repository / PostgreSQL / Redis

Runtime
  → Node.js Event Loop / Process / Graceful Shutdown / Container
```

## 12. 参考文献

[1] NestJS. *First steps*. NestJS Documentation. https://docs.nestjs.com/first-steps

[2] NestJS. *Modules*. NestJS Documentation. https://docs.nestjs.com/modules

[3] Fastify. *Encapsulation*. Fastify Documentation. https://fastify.dev/docs/latest/Reference/Encapsulation/

[4] Fastify. *@fastify/cookie*. GitHub Repository. https://github.com/fastify/fastify-cookie

[5] NestJS. *CORS*. NestJS Documentation. https://docs.nestjs.com/security/cors

[6] NestJS. *Lifecycle events*. NestJS Documentation. https://docs.nestjs.com/fundamentals/lifecycle-events

[7] OpenJS Foundation. *Node.js Process — Signal events*. Node.js Documentation. https://nodejs.org/api/process.html#signal-events

[8] Fastify. *Server — listen*. Fastify Documentation. https://fastify.dev/docs/latest/Reference/Server/

[9] NestJS. *Providers*. NestJS Documentation. https://docs.nestjs.com/providers

[10] NestJS. *Request lifecycle*. NestJS Documentation. https://docs.nestjs.com/faq/request-lifecycle

[11] Express.js. *Using middleware*. Express Documentation. https://expressjs.com/en/guide/using-middleware/

[12] FastAPI. *Bigger Applications — Multiple Files*. FastAPI Documentation. https://fastapi.tiangolo.com/tutorial/bigger-applications/

[13] Django Software Foundation. *Applications*. Django Documentation. https://docs.djangoproject.com/en/6.0/ref/applications/

[14] Spring. *Dependency Injection*. Spring Framework Documentation. https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html

[15] NestJS. *Custom providers*. NestJS Documentation. https://docs.nestjs.com/fundamentals/custom-providers
