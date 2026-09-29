# NestJS快速上手

## 1. NestJS 的整体定位与完整知识框架

NestJS 是运行在 Node.js 之上的服务端应用框架，它并不是替代 HTTP Server，而是在 Node.js HTTP Server 和 Web Framework（如 Express、Fastify）之上，进一步解决大型服务端应用的组织问题。

前面的请求链路可以理解为：

```text
Client
  ↓
Reverse Proxy
  ↓
Node.js HTTP Server
  ↓
Fastify / Express
  ↓
NestJS
  ↓
Controller
  ↓
Service
  ↓
Database / External Service
```

不同层次解决的问题不同：

| 层次 | 职责 |
| --- | --- |
| Node.js HTTP Server | 接收 HTTP 请求、监听端口、返回 HTTP Response |
| Fastify / Express | 路由、请求解析、生命周期管理、校验、序列化 |
| NestJS | 模块组织、依赖管理、业务结构、应用生命周期 |

因此：

```text
Node.js HTTP Server
    解决“请求如何进入系统”

Fastify
    解决“HTTP 请求如何被统一处理”

NestJS
    解决“服务端应用如何长期维护和扩展”
```

NestJS 的核心知识可以划分为：

```text
① Application Bootstrap
   应用如何启动

② Module
   应用如何拆分模块

③ Provider + Dependency Injection
   对象如何创建和管理

④ Controller
   HTTP 请求如何进入业务代码

⑤ Request Lifecycle
   请求经过哪些处理阶段

⑥ Service / Data Access
   业务逻辑和数据访问如何组织
```

---

## 2. NestFactory 负责创建 Nest 应用实例

Nest 项目的入口通常是 `main.ts`：

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(3000);
}

bootstrap();
```

`NestFactory.create(AppModule)` 不是简单创建一个 Module，而是启动整个 Nest Application：

```text
执行 main.ts
    ↓
NestFactory.create(AppModule)
    ↓
读取 Root Module
    ↓
构建 Module Graph
    ↓
创建 Dependency Injection Container
    ↓
初始化 Controller / Provider
    ↓
注册 HTTP Route
    ↓
listen()
    ↓
开始接收请求
```

如果使用 Fastify：

```ts
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
);
```

整体关系：

```text
Nest Application
      ↓
FastifyAdapter
      ↓
Fastify
      ↓
Node.js HTTP Server
```

NestJS 负责应用结构，Fastify 负责 HTTP 请求处理。

---

## 3. Module 是 NestJS 组织应用结构的核心

NestJS 使用 Module 定义应用边界。

```ts
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class UserModule {}
```

四个核心字段：

| 字段 | 作用 |
| --- | --- |
| imports | 当前模块依赖的其他模块 |
| controllers | 当前模块提供哪些 HTTP Controller |
| providers | 当前模块管理哪些 Provider |
| exports | 哪些 Provider 可以被其他模块使用 |

大型应用通常按照业务拆分：

```text
AppModule
   |
   ├── UserModule
   ├── AuthModule
   ├── OrderModule
   └── AnalyticsModule
```

Module 不只是文件夹，而是：

```text
业务能力边界
+
依赖关系边界
+
Provider 可见性边界
```

---

## 4. Provider 和 Dependency Injection 管理应用对象

Nest 中可以被框架管理的对象称为 Provider。

例如 Service：

```ts
@Injectable()
export class UserService {
  findAll() {
    return [];
  }
}
```

注册：

```ts
@Module({
  providers: [UserService],
})
export class UserModule {}
```

Controller 使用：

```ts
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}
}
```

Nest 会自动完成：

```text
UserController
      ↓
发现需要 UserService
      ↓
DI Container 查找 Provider
      ↓
创建或获取实例
      ↓
注入 Controller
```

Dependency Injection（依赖注入）的核心思想：

> 对象只声明自己需要什么，不负责创建依赖对象，由框架统一管理对象创建和连接。

---

## 5. Controller 将 HTTP 请求映射到应用入口

Controller 负责处理 HTTP Request。

```ts
@Controller('users')
export class UserController {

  @Get()
  findAll() {
    return [];
  }

  @Post()
  create() {
    return {};
  }
}
```

对应：

```text
GET /users
    ↓
UserController.findAll()

POST /users
    ↓
UserController.create()
```

Controller 主要负责：

```text
接收请求
解析参数
调用 Service
返回结果
```

业务逻辑不应该大量写在 Controller 中，而应该交给 Service。

---

## 6. Service 承载业务逻辑

Controller 负责 HTTP 边界，Service 负责业务能力。

```ts
@Injectable()
export class UserService {

  create(data) {
    // Business Logic

    return data;
  }
}
```

完整关系：

```text
HTTP Request
      ↓
Controller
      ↓
Service
      ↓
Repository
      ↓
Database
```

Controller 关注：

```text
这个请求是什么？
参数在哪里？
返回什么？
```

Service 关注：

```text
业务规则是什么？
需要调用哪些能力？
如何处理业务状态？
```

---

## 7. NestJS 的完整基础请求链路

一次请求进入 NestJS 后：

```text
HTTP Request
      ↓
Node.js HTTP Server
      ↓
Fastify / Express Adapter
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
Database / External Service
      ↓
Result
      ↓
Interceptor After
      ↓
Exception Filter
      ↓
HTTP Response
```

不同组件职责：

| 组件 | 作用 |
| --- | --- |
| Middleware | 通用请求前置处理 |
| Guard | 判断请求是否允许继续执行 |
| Pipe | 参数转换和校验 |
| Interceptor | 包裹请求执行前后逻辑 |
| Controller | HTTP 请求入口 |
| Service | 业务逻辑 |
| Exception Filter | 统一异常处理 |

---

## 8. 基础 NestJS 项目结构

```text
src/
│
├── main.ts
├── app.module.ts
│
└── user/
     ├── user.module.ts
     ├── user.controller.ts
     ├── user.service.ts
     └── dto/
          └── create-user.dto.ts
```

对应职责：

```text
main.ts
    启动应用

AppModule
    根模块

UserModule
    用户业务模块

UserController
    HTTP 接口

UserService
    用户业务逻辑

DTO
    请求数据结构
```

---

## 9. NestJS 第一阶段核心理解

学习 NestJS 第一阶段不需要深入源码，而需要建立完整模型：

```text
NestFactory
    创建应用

Module
    组织能力边界

Provider
    管理可复用对象

Dependency Injection
    自动连接对象关系

Controller
    接收 HTTP 请求

Service
    执行业务逻辑

Lifecycle
    组织请求执行过程
```

最终完整链路：

```text
NestFactory
      ↓
Root Module
      ↓
Module Graph
      ↓
DI Container
      ↓
Controller
      ↓
Service
      ↓
Data Layer
      ↓
Response
```

后续深入方向：

```text
第二部分：NestJS Module 与 Dependency Injection 机制

第三部分：NestJS Request Lifecycle
(Middleware / Guard / Pipe / Interceptor / Filter)

第四部分：数据库、认证、权限和工程化实践
```

## 参考文献

[1] NestJS. First steps. NestJS Documentation. https://docs.nestjs.com/first-steps

[2] NestJS. Controllers. NestJS Documentation. https://docs.nestjs.com/controllers

[3] NestJS. Providers. NestJS Documentation. https://docs.nestjs.com/providers

[4] NestJS. Modules. NestJS Documentation. https://docs.nestjs.com/modules

[5] NestJS. Request lifecycle. NestJS Documentation. https://docs.nestjs.com/faq/request-lifecycle
