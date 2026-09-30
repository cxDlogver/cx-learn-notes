# NestJS 快速上手

> **本文目标**：先建立 NestJS 的完整框架认知，再进入具体 API。第一阶段重点不是记住所有装饰器，而是理解 NestJS 为什么存在、应用如何启动、Module 如何建立能力边界、Provider 与 DI 如何构造对象关系，以及一次 HTTP 请求如何穿过整个应用。

> **学习边界**：本文讲 NestJS 的通用设计。项目中的 Fastify、Redis、PostgreSQL、Session、CSRF 等实现用于帮助理解这些概念，但具体项目代码仍应放在实践文档中分析。

## 1. NestJS 位于 Node.js HTTP Server 之上，解决的是应用组织问题

### 【NestJS 不是 HTTP Server，也不是 Node.js 的替代品】

从服务端完整链路看，NestJS 位于运行时和底层 Web Framework 之上：

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

## 4. Provider 与 Dependency Injection 把对象创建权交给容器

### 【DI 的本质是对象只声明依赖，而不负责寻找或创建依赖】

```ts
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly projects: ProjectsService,
  ) {}
}
```

这里 `AnalyticsService` 只表达：

```text
我需要 ProjectsService
```

而不是：

```ts
this.projects = new ProjectsService(...);
```

真正的对象创建和连接由 Nest IoC Container 完成：

```text
Module Graph
    ↓
Provider Definitions
    ↓
DI Container
    ↓
解析 Constructor Dependency
    ↓
创建 / 复用 Provider Instance
    ↓
得到 Provider Object Graph
```

这就是 Inversion of Control：业务对象不再主动控制依赖对象的构造，控制权交给容器。[[9]](https://docs.nestjs.com/providers)

### 【类 Token 适合普通 Service，Symbol Token 适合运行时对象与抽象能力】

普通 Service：

```ts
constructor(
  private readonly projects: ProjectsService,
) {}
```

类本身可以作为 DI Token。

而数据库连接、Redis Client、配置对象通常不是简单的 `@Injectable()` 类，因此可以显式定义 Token：

```ts
export const DATABASE = Symbol('DATABASE');
export const REDIS = Symbol('REDIS');
export const API_CONFIG = Symbol('API_CONFIG');
```

注入时：

```ts
constructor(
  @Inject(DATABASE) private readonly database: DatabaseHandle,
  @Inject(REDIS) private readonly redis: Redis,
) {}
```

于是 Token 与具体实现被分开。

### 【useFactory 描述复杂 Provider 怎样被创建】

```ts
{
  provide: DATABASE,
  inject: [API_CONFIG],
  useFactory: (config: ApiConfig) =>
    createDatabase(config.DATABASE_URL),
}
```

三个字段对应：

| 字段 | 含义 |
| --- | --- |
| `provide` | 这个依赖以什么 Token 存在 |
| `inject` | 创建它之前还需要哪些依赖 |
| `useFactory` | 真正的创建逻辑 |

这使得对象关系可以表达成：

```text
loadConfig()
    ↓
API_CONFIG
    ├──→ createDatabase() → DATABASE
    └──→ createRedis()    → REDIS
```

容器根据依赖关系决定创建顺序，而不是开发者手工管理全局初始化顺序。

### 【Provider 生命周期让资源创建和应用生命周期形成对应关系】

默认情况下，很多 Provider 与 Application 生命周期关联：应用启动时解析并创建，应用关闭时可以响应生命周期 Hook。[[6]](https://docs.nestjs.com/fundamentals/lifecycle-events)

因此：

```text
Provider 创建
   ↓
持有 Database / Redis / Timer 等资源
   ↓
Application Running
   ↓
Shutdown Signal
   ↓
Lifecycle Hook
   ↓
释放资源
```

Module、Provider、DI 与 Lifecycle 由此构成一套连续设计，而不是四个分散功能。

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
