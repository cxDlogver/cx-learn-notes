# Monorepo 工程体系

Monorepo（Monolithic Repository，单体代码仓库）是一种**多项目代码仓库组织策略**：多个具有协作关系的工程项目共同存放在一个 Git Repository（代码仓库）中，再通过 Workspace、依赖管理、任务编排、构建发布和工程治理形成完整的多项目工程体系。

理解 Monorepo 时，不应从 pnpm、Nx、Turborepo 等工具名开始，而应先理解两条相互配合的知识线：

- **主生命周期**：多个 Project 怎样从“被放进同一个仓库”逐步走到“形成可运行或可发布的产物”。
- **工程治理（Engineering Governance）**：当 Project、依赖和 Task 数量增加后，怎样控制依赖边界、减少无效执行、约束 CI 和发布过程，使主生命周期仍然可维护。

主生命周期回答的是“工程怎样向前流动”，工程治理回答的是“规模扩大后怎样持续约束和优化这条链路”。二者不是前后两个阶段，而是主流程与横切能力的关系。

可以先用六个问题建立整体认知：

```text
为什么多个项目要放在同一个代码仓库？
        ↓
包管理工作区怎样发现并统一管理这些项目？
        ↓
项目之间怎样声明和解析代码依赖？
        ↓
开发、构建、测试等任务怎样建立执行关系？
        ↓
任务完成后会产生什么构建产物，
这些产物怎样形成可发布版本并进入运行环境？
        ↓
当项目、依赖和任务增多后，
怎样限制依赖方向、缩小变更影响范围、复用任务结果，
并通过持续集成、代码所有权和发布规则控制工程复杂度？
```

前五个问题构成 Monorepo 的主生命周期，第六个问题对应贯穿主生命周期的工程治理。

Monorepo 的主生命周期描述代码怎样从仓库组织逐步走向运行环境：

```text
Repository / Project
确定哪些工程共同存放，以及每个 Project 的职责边界
        ↓
Workspace / Dependency
发现 Project，并声明、解析 Project 之间的代码依赖
        ↓
Project Graph
把“谁依赖谁”组织成可分析的项目依赖关系
        ↓
Task Model / Task Graph
把 dev / build / test 等任务及其前后依赖组织成执行关系
        ↓
Build Artifact
把源码转换成可以继续验证、分发或运行的构建产物
        ↓
Release / Deploy
为产物建立版本和发布决策，并把应用产物送入目标环境
        ↓
Runtime
产物最终以 Browser、Process、Container、Service 等形式运行
```

这条主线中的每一层都会为下一层提供输入：

| 层级 | 上游输入 | 这一层解决的问题 | 输出给下一层 |
| --- | --- | --- | --- |
| Repository / Project | 业务与工程拆分结果 | 哪些工程放在同仓、每个 Project 的职责边界是什么 | 一组可独立管理的 Project |
| Workspace / Dependency | Project 集合与 Package Manifest | 包管理器怎样发现 Project，Project 之间怎样建立代码依赖 | 可解析的 Project 依赖关系 |
| Project Graph | 已声明的 Dependency | 整个仓库“谁依赖谁”，变化可能向哪里传播 | 可用于 Task、Affected、Boundary 分析的依赖图 |
| Task Model / Task Graph | Project Graph + Task 定义 / Task Rule | build、test、dev 应执行什么，哪些任务必须先完成 | 可被 Scheduler 执行的任务关系 |
| Build Artifact | Task 执行结果 | 源码最终生成什么可验证、可分发或可运行的产物 | Package、静态资源、Server Bundle、Image 等 Artifact |
| Release / Deploy | 已生成并验证的 Artifact | 哪个版本可以发布，以及应用产物怎样进入目标环境 | 已部署的版本 |
| Runtime | 已部署产物 + 运行环境 | 产物以什么进程、容器、服务或浏览器代码形式真正运行 | 实际运行的系统 |

因此这些概念不是一组并列术语。Repository 决定管理边界，Workspace 把 Project 变成可管理集合，Dependency 形成 Project Graph，Project Graph 再参与 Task Graph 和影响分析，Task 执行产生 Artifact，Artifact 经过 Release / Deploy 最终进入 Runtime。

工程治理不是主生命周期之后的新阶段，而是横向作用于多个阶段的约束体系。

工程治理（Engineering Governance）表示：**不改变主生命周期的基本阶段，而是在多个阶段同时增加依赖边界、增量执行、质量门禁、代码所有权和发布约束。**

```text
Repository / Project
      │
      ├── Ownership / Policy
      │     明确代码归属、Review 与仓库规则
      │
Workspace / Dependency
      │
      ├── Dependency Boundary
      │     约束哪些 Project 可以依赖哪些 Project
      │
Project Graph
      │
      ├── Affected Analysis
      │     根据代码变化和依赖传播缩小受影响范围
      │
Task Graph / Execution
      │
      ├── Task Cache
      │     对相同输入复用已有计算结果
      │
      └── CI / Scheduler
      │     决定任务如何验证、排序、并行和进入下一阶段
      │
Artifact / Release
      │
      └── Release Governance
            约束版本、发布条件和产物推进
```

这说明工程治理不是“Runtime 完成后的最后一步”。例如：

- Dependency Boundary 在建立和维护 Project Dependency 时就发挥作用；
- Affected Analysis 依赖 Project Graph 判断一次变更会影响哪些 Project；
- Task Cache 与 Scheduler 直接作用于 Task 执行；
- CI 可以贯穿 lint、test、build、Artifact 和 Release Gate；
- Release Governance 作用于 Artifact、Version、Release Decision，而不是等系统运行后再开始。

所以 Monorepo 的整体知识框架应理解为：

```text
主生命周期：
Repository
→ Workspace / Dependency
→ Project Graph
→ Task Graph
→ Artifact
→ Release / Deploy
→ Runtime

横切治理：
Boundary / Affected / Cache / CI / Ownership / Release Governance
分别作用于主生命周期中的对应阶段
```


---

## 1. Repository 与 Project Model 先确定多项目工程的管理边界

### 【Monorepo 与 Multi-repo 区分的是仓库边界】

Monorepo 与 Multi-repo（多仓库）首先描述的是**代码仓库如何组织**，而不是运行架构如何组织。

```text
Monorepo

one-repository/
├── app-a/
├── app-b/
├── package-c/
└── package-d/
```

Multi-repo 则是：

```text
repo-a → app-a
repo-b → app-b
repo-c → package-c
repo-d → package-d
```

二者都可以实现模块化、公共 Package、统一代码规范和 CI/CD。Monorepo 并不创造这些能力，它改变的是多个项目之间的**协作边界**。

当一个变更同时影响公共 Package 和多个消费者时，Monorepo 可以在同一个 Commit / Pull Request 中完成：

```text
修改 shared package
      +
修改 application A
      +
修改 application B
      ↓
一个原子变更
```

Multi-repo 也能实现同样的最终代码结果，但通常需要经过：

```text
修改公共 Package
      ↓
发布新版本
      ↓
不同仓库升级依赖
      ↓
分别提交和验证
```

所以 Monorepo 的核心收益不是“能够共享代码”，而是**降低多个强关联项目共同演进时的跨仓协调成本**。

### 【Monorepo 与 Monolith 属于不同维度】

Monolith（单体应用）描述的是运行架构或部署边界；Monorepo 描述的是代码仓库边界。

因此完全可能出现：

```text
一个 Monorepo
├── Web Application
├── API Service
├── Worker
└── Shared Library

运行时
├── Web Runtime
├── API Process
└── Worker Process
```

所以：

> 一个仓库并不等于一个应用，一个应用也不等于一个进程或一个容器。

### 【Project、Package、Application 与 Library 表达不同工程视角】

Project（项目）是多项目工程中的独立管理单元。

Package 强调包管理属性，例如：

```text
name
version
dependencies
exports
scripts
```

Application（应用）强调能够形成独立执行或交付入口，例如 Web、API、Worker。

Library（库）强调主要通过 import 被其他 Project 复用，而不是独立提供业务服务。

因此一个 Project 可以同时是：

```text
Project
+
Package
+
Application
```

也可以是：

```text
Project
+
Package
+
Library
```

这种区分非常重要，因为后续 Dependency、Task、Artifact 和 Runtime 都依赖 Project 的职责边界。

---

## 2. Workspace 与 Dependency Model 建立多项目之间的代码关系

Repository 只能告诉 Git“哪些文件属于同一个版本控制仓库”，不能告诉包管理器仓库里有哪些独立 Project，更不能自动建立 A → B 的代码依赖关系。

Workspace（工作区）负责把多个 Project 组织成一个可统一安装和操作的包管理集合。

以 pnpm Workspace 为例，Workspace 根通过 `pnpm-workspace.yaml` 声明 Package 搜索范围。[[1]](https://pnpm.io/workspaces)

### 【Workspace Discovery 先发现有哪些 Project】

一个典型目录：

```text
repo/
├── pnpm-workspace.yaml
├── apps/
│   ├── web/
│   │   └── package.json
│   └── api/
│       └── package.json
└── packages/
    └── shared/
        └── package.json
```

Workspace 配置：

```yaml
packages:
  - apps/*
  - packages/*
```

可以把项目发现过程理解为：

```text
pnpm-workspace.yaml
        ↓
读取 packages 路径模式
        ↓
匹配 apps/*、packages/*
        ↓
读取匹配目录的 package.json
        ↓
得到 Workspace Project Set
```

到这里仅仅完成：

> Workspace 中有哪些 Project？

还没有产生：

```text
web → shared
api → shared
```

这样的依赖。

### 【Package Manifest 再声明 Project Identity 与 Dependency】

每个 Project 的 `package.json` 提供 Package Identity（包身份）：

```json
{
  "name": "@example/shared",
  "version": "1.0.0"
}
```

消费者通过自己的依赖字段建立关系：

```json
{
  "name": "@example/api",
  "dependencies": {
    "@example/shared": "workspace:*"
  }
}
```

这里包含两个不同事实：

```text
"@example/shared"
    ↓
依赖谁

"workspace:*"
    ↓
依赖应该从哪里解析
```

因此：

> `dependencies` 创建 Dependency Declaration；`workspace:*` 约束这个依赖必须使用当前 Workspace 中的 Package。

pnpm 官方的 Workspace Protocol 会要求对应依赖从当前 Workspace 解析，而不是静默退回 Registry 的同名 Package。[[1]](https://pnpm.io/workspaces)

### 【pnpm install 将声明转换为实际可解析关系】

Workspace 已经发现 Project、消费者也已经声明 Dependency 后，`pnpm install` 才进入 Dependency Resolution（依赖解析）和 Installation（安装）阶段。

```text
Workspace Project Set
        +
各 Project package.json
        +
pnpm-lock.yaml
        ↓
Dependency Resolution
        ↓
外部依赖 Fetch
+
Workspace Dependency Link
        ↓
node_modules 中形成可解析关系
```

这里必须区分：

```text
Package 可以被找到
≠
Package 已经完成 Build
```

如果一个 Library 的公开入口指向：

```text
dist/index.js
```

那么 Workspace Link 只解决“消费者可以解析到这个 Package”，仍然需要 Library 自己的 Build Task 先生成 `dist`。

### 【Project Graph 是前面依赖声明形成的结构模型】

当多个 Project 都声明 Dependency 后，就可以形成 Project Dependency Graph（项目依赖图）。

统一约定：

> A → B 表示 A depends on B。

例如：

```text
web → ui
api → shared
worker → shared
shared → protocol
```

Project Graph 可以继续回答：

- 某个公共 Package 变化后可能影响哪些 Dependents；
- 哪些 Build Task 需要先执行；
- 是否出现循环依赖；
- CI 中哪些 Project 可能受到本次变更影响。

pnpm 能沿 Workspace Dependency 进行 Filter；例如 Filter 可以选择一个 Package 及其 Dependencies 或 Dependents。[[2]](https://pnpm.io/filtering)

Project Graph 本身是一种关系模型，不意味着仓库必须维护一份静态 `project-graph.json`。不同工具可以在执行时计算、可视化或导出它。

---

## 3. Task Model 在 Project Graph 基础上建立任务执行关系

Project Graph 只回答“谁依赖谁”，并没有说明具体怎样 Build、Test 或 Dev。

每个 Project 首先需要定义自己的 Task：

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "test": "...",
    "typecheck": "..."
  }
}
```

然后多项目工程才需要决定这些 Task 之间的关系。

### 【Project Task 描述单个工程应该执行什么】

同一个 Monorepo 中不同 Project 可以拥有完全不同的 Build Implementation：

```text
Library
build → TypeScript Compiler / Bundler

Web Application
build → Frontend Bundler

Node Application
build → TypeScript Compiler

SDK
build → Library Bundler
```

Monorepo 统一的是 Task 管理入口，不要求所有 Project 使用同一种构建器。

开发任务也存在不同形态：

```text
Watch Build
源码变化 → 重新生成 Artifact

Process Watch
源码变化 → 重新执行 Application

Dev Server
源码变化 → 更新模块并通知 Browser
```

因此“一个 dev Task 长期不退出”并不意味着它一定是一个业务 Service。

### 【Task Graph 描述多 Project Task 的执行依赖】

假设 Project Graph：

```text
app → feature
feature → shared
```

如果 Build Rule 是：

> 当前 Project Build 前，需要先完成其 Dependency 的 Build。

那么 Task Graph 为：

```text
shared:build
      ↓
feature:build
      ↓
app:build
```

Project Graph 的节点是 Project：

```text
app
feature
shared
```

Task Graph 的节点是：

```text
app:build
feature:build
shared:build
```

两张图不能混为一谈。

### 【任务编排可以从显式脚本演进为规则驱动】

项目较少时，可以手工写：

```text
shared build
    &&
feature build
    &&
app build
```

这种方式透明、简单，但 Project Dependency 发生变化时需要人工同步 Task 顺序，也无法天然利用所有并行机会。

规模扩大后，Task Runner 通常采用：

```text
Project Graph
+
Task Rule
↓
Task Graph
↓
Scheduler
```

Nx 明确区分 Project Graph 和 Task Graph，并使用 Project Graph 与 Task Pipeline 决定任务执行关系。[[3]](https://nx.dev/docs/features/explore-graph) Nx 的 Task Pipeline 可以通过 `dependsOn` 声明“先执行依赖 Project 的同类 Task”，避免把具体包名顺序重复写入脚本。[[4]](https://nx.dev/docs/concepts/task-pipeline-configuration)

Turborepo 也使用 Task Configuration 描述任务关系，例如通过 `dependsOn` 定义依赖 Package 的 Task 应先完成。[[5]](https://turborepo.com/docs/crafting-your-repository/configuring-tasks)

所以 Nx/Turborepo 解决的主要不是“创建 Monorepo”，而是：

- Task Graph；
- 安全并行；
- Task Cache；
- Affected / 增量执行；
- 大规模 CI 执行效率。

---

## 4. Artifact 与 Release Model 解释不同 Project 最终交付什么

Task 执行完成后得到 Build Artifact（构建产物）。Project 类型不同，Artifact 也不同。

### 【Library 与 SDK 主要产生可被消费的 Package Artifact】

典型 Library：

```text
TypeScript Source
      ↓
Build
      ↓
dist/
├── index.js
└── index.d.ts
```

Package 的 `main`、`types`、`exports` 再决定消费者能够访问哪些入口。

SDK 也属于 Package，但可能额外输出：

```text
ESM
CJS
IIFE / Global Bundle
Type Declaration
```

以兼容不同消费者。

### 【Application 的 Artifact 由 Runtime Model 决定】

Node Application：

```text
TypeScript
    ↓
Build
    ↓
Server JavaScript
    ↓
Node.js Runtime
```

普通客户端 Web Application：

```text
React / Vue / TypeScript
    ↓
Frontend Build
    ↓
HTML / JavaScript / CSS
    ↓
Static Server / CDN
    ↓
Browser Runtime
```

因此：

> 同一个 Monorepo 可以拥有多种 Artifact，不存在“Monorepo 统一产物格式”。

### 【Build、Release 与 Deploy 属于三个不同阶段】

```text
Build
源码 → Artifact

Release
Artifact → 可识别版本 / 可分发产物

Deploy
Application Artifact → 具体运行环境
```

Library 的 Release 可能是 Package Registry Publish：

```text
Library
↓
Package Version
↓
Registry
```

Application 的 Release/Deploy 则可能是：

```text
Application
↓
Docker Image
↓
Environment
↓
Running Service
```

所以 Monorepo 不意味着所有 Package 必须使用相同 Version，也不意味着所有 Application 必须一起部署。

版本策略通常还需要额外解决：

- Fixed Versioning 与 Independent Versioning；
- SemVer；
- Changelog；
- Change Record；
- Package Publish；
- Release Automation。

这些属于 Release Governance，而不是 Workspace 本身提供的完整能力。Artifact 形成以后怎样经过验证、Release Decision、Deployment、Production Verification 与 Recovery，继续参考 [软件交付与 CI/CD 工程体系](./R-软件交付与CI-CD工程体系.md)。

---

## 5. Runtime 与 Deployment Model 必须与源码依赖分开理解

Monorepo 的 Package 关系发生在源码和构建阶段，程序运行后关注的对象变成 Process、Container、Service、Database、Message Broker 等运行单元。

### 【Package Boundary、Process Boundary 与 Service Boundary 不相同】

需要分别理解：

```text
Package
源码与依赖管理边界

Artifact
Build 输出边界

Process
操作系统执行边界

Container
隔离后的进程运行环境

Service
系统职责与网络访问边界
```

一个 Package 不一定形成独立 Process，一个 Image 也可以根据不同启动命令运行不同 Process。

### 【Source Dependency 与 Runtime Dependency 是两套关系】

Source Dependency：

```text
application
    ↓ import
shared library
```

Runtime Dependency：

```text
application process
    ↓ HTTP / TCP
database / API / cache
```

两个 Web/API Application 即使处于同一个 Monorepo，也可能完全没有 Package Dependency，而只通过 HTTP 在 Runtime 中通信。

所以至少要区分：

```text
Project Dependency Graph
    ↓
源码和构建关系

Runtime Graph
    ↓
进程、网络与服务关系
```

Docker Compose、Kubernetes 等工具管理的是后者，不是 Workspace Package Graph。

Docker Compose 的 `depends_on`、`healthcheck` 等机制用于描述 Runtime Service 的启动依赖和 Ready 条件。[[6]](https://docs.docker.com/compose/how-tos/startup-order/)

---

## 6. 工程治理通过依赖、任务和交付约束控制规模化成本

工程治理（Engineering Governance）解决的是 Monorepo 扩大后的第二类问题：主生命周期本身已经能够运行，但 Project、Dependency 和 Task 越来越多以后，如果每次变化都全仓执行、依赖可以任意穿透、发布没有统一约束，工程成本会随规模快速上升。

它主要围绕三类对象建立治理：

```text
Project / Dependency
→ 控制依赖边界和变化传播范围

Task / Execution
→ 控制哪些任务需要执行、哪些结果可以复用、任务怎样调度

Artifact / Delivery
→ 控制验证、版本、Release 与发布条件
```

因此工程治理不是一个独立于主流程的“额外系统”，而是利用前面已经建立的 Project Graph、Task Graph 和 Artifact Model，对主生命周期中的关键阶段施加约束和优化。

小型 Monorepo 可以直接执行：

```text
install
↓
typecheck
↓
test
↓
build
```

随着 Project 数量增加，全仓重复执行会逐渐成为主要成本，因此需要利用前面的 Project Graph 和 Task Graph 做增量治理。

### 【Affected 判断哪些 Project 真正受到代码变化影响】

基本链路：

```text
Git Diff
    ↓
Changed Files
    ↓
所属 Project
    ↓
Project Graph
    ↓
向 Dependents 传播
    ↓
Affected Projects
```

然后：

```text
Affected Projects
    ↓
只执行相关 build / test / lint
```

Affected 的前提是依赖边界足够准确，否则影响范围也会失真。

这里还需要区分：

```text
Changed Project
→ 文件直接发生变化的 Project

Affected Project
→ Changed Project
  + 依赖传播后可能受到影响的 Dependents
```

因此：

```text
Changed Project
≠
Affected Project
```

例如 shared 发生代码修改时，shared 是 Changed；如果 app → shared，那么 app 即使没有直接修改，也可能属于 Affected。

### 【Task Cache 判断相关任务是否必须重新计算】

Affected 回答：

> 这次变化与哪些 Task 有关？

Cache 回答：

> 即使 Task 相关，它是否已经对相同输入计算过？

典型思路：

```text
Task Command
+
Source Input
+
Dependency Input
+
Config / Environment
      ↓
Hash
      ↓
Cache Hit ?
   /         \
 Yes         No
 ↓            ↓
Restore      Execute
```

所以：

```text
All Tasks
↓
Affected Analysis
↓
Relevant Tasks
↓
Task Graph / Scheduling
↓
Cache Lookup
↓
Cache Miss Tasks
↓
Execute
```

三者分别回答不同问题：

```text
Affected
→ 哪些 Project / Task 需要考虑？

Cache
→ 其中哪些 Task 不需要重新计算？

Scheduler
→ 剩余 Task 应以什么依赖顺序和并发关系执行？
```

因此 Affected、Cache 与 Scheduler 不是三个孤立优化点，而是从“缩小候选范围”到“避免重复计算”再到“安排实际执行”的连续模型。

### 【Dependency Boundary 决定 Monorepo 是否能够长期维护】

Monorepo 降低跨项目引用成本，同时也降低错误耦合的门槛。

如果出现：

```text
App A → App B internal
App B → App C internal
App C → App A internal
```

即使目录很整齐，架构也已经失去明确边界。

更稳定的依赖方向通常是：

```text
Application
    ↓
Domain / Feature Package
    ↓
Shared Infrastructure / Protocol
```

因此规模化治理还需要：

- Dependency Boundary Rule；
- Circular Dependency Detection；
- CODEOWNERS / Review Ownership；
- Incremental CI；
- Remote Cache；
- Version / Release Governance。

---

## 7. Monorepo 选型应围绕协作密度而不是项目数量

是否采用 Monorepo，不应该只根据“项目多不多”判断。

更适合 Monorepo 的特征：

```text
多个项目需要频繁共同修改
+
存在大量内部 Package 依赖
+
希望一次 PR 完成跨项目原子变更
+
工具链和质量门禁需要统一治理
+
跨项目影响分析具有明显价值
```

更倾向 Multi-repo 的特征：

```text
项目生命周期高度独立
+
团队与权限边界完全分离
+
跨项目依赖非常少
+
发布周期长期独立
+
仓库级权限隔离比原子协作更重要
```

因此可以把判断问题收敛成：

> 这些 Project 是“需要共同演进的一组工程”，还是“只是恰好属于同一组织的多个独立系统”？

前者通常更容易从 Monorepo 获益。

---

## 8. 完整知识框架通过主生命周期与横切治理快速复述

复习 Monorepo 时，可以先回答“工程怎样向前流动”，再回答“规模扩大后怎样控制这条链路”。

主生命周期从 Repository 开始，到 Runtime 结束：

| 主生命周期层级 | 核心问题 | 常见机制 |
| --- | --- | --- |
| Repository / Project | 为什么放在同仓、Project 边界在哪里？ | Git Repository、Application、Library、Project Boundary |
| Workspace / Dependency | 包管理器怎样发现 Project，谁依赖谁？ | Workspace、package.json、Workspace Protocol、Dependency Resolution |
| Project Graph | 已有 Dependency 怎样形成全仓关系模型？ | Dependency Graph、Dependencies、Dependents |
| Task Model / Task Graph | dev / build / test 怎么组织和执行？ | Scripts、Task Rule、Task Graph、Scheduler、Nx、Turborepo |
| Artifact / Release | 构建以后得到什么、怎样形成可发布版本？ | Build Artifact、Package、Image、SemVer、Release |
| Runtime / Deployment | 应用产物最终在哪里、以什么形式运行？ | Browser、Process、Container、Service、Compose / Kubernetes |

把主生命周期串起来：

```text
多个 Project 进入一个 Repository
        ↓
Workspace 发现这些 Project
        ↓
Package Manifest 声明 Project 之间的 Dependency
        ↓
Project Graph 描述全仓代码依赖关系
        ↓
Task Rule 在 Project Graph 基础上形成 Task Graph
        ↓
Scheduler 执行 build / test / dev 等 Task
        ↓
Build 产生 Package / Static Bundle / Server Bundle / Image 等 Artifact
        ↓
Release 为 Artifact 建立版本和发布决策
        ↓
Deploy 把应用 Artifact 放入目标环境
        ↓
Browser / Process / Container / Service 进入 Runtime
```

横切治理不再增加新的生命周期节点，而是分别控制这些阶段：

| 治理能力 | 作用位置 | 解决的问题 |
| --- | --- | --- |
| Ownership / Policy | Repository / Project | 谁负责哪些代码，哪些 Review / Policy 必须满足 |
| Dependency Boundary | Workspace / Dependency / Project Graph | 哪些 Project 可以依赖哪些 Project，避免任意耦合 |
| Affected Analysis | Git Change + Project Graph | 本次变化真正影响哪些 Project / Task |
| Task Cache | Task Execution | 相同输入的 Task 是否可以直接复用已有结果 |
| CI / Scheduler | Task / Artifact / Release | Task 怎样验证、排序、并行以及何时允许进入下一阶段 |
| Release Governance | Artifact / Release | 版本、Changelog、Publish、Release Gate 怎样统一治理 |

最终可以形成一个稳定的判断顺序：

```text
先看代码组织：
Repository / Project

再看代码关系：
Workspace / Dependency / Project Graph

再看执行关系：
Task Model / Task Graph / Scheduler

再看交付结果：
Artifact / Release / Deploy / Runtime

最后把规模化问题挂回对应阶段：
Boundary / Affected / Cache / CI / Ownership / Release Governance
```

这套框架的重点不是记住 pnpm、Nx、Turborepo 或 Docker，而是能够判断一个 Monorepo 问题究竟发生在**仓库边界、依赖关系、任务执行、产物交付、运行边界还是规模化治理**中的哪一层，再选择对应工具和机制解决。


---

## 9. 项目实践通过独立项目文档验证通用知识

`Full-Stack-AI-NOTES` 中的本文只维护脱离具体项目的 Monorepo 知识框架，不复制某个仓库的目录、Package Name、Dockerfile、构建脚本和实际依赖图。

需要查看一套真实 Monorepo 如何把 Workspace、Dependency Graph、Task、Artifact 和 Runtime 落到代码与配置时，进入：

[Browser Monitor Monorepo 项目实践](https://github.com/cxDlogver/browser-monitor/blob/main/docs/Monorepo%E7%9F%A5%E8%AF%86%E4%BD%93%E7%B3%BB.md)

项目文档负责回答“这套知识在一个真实仓库中具体如何实现”；本文负责维护稳定、可迁移的通用知识，两者不互相复制项目细节。

---

## 10. 参考文献

1. pnpm, **Workspaces**：https://pnpm.io/workspaces
2. pnpm, **Filtering**：https://pnpm.io/filtering
3. Nx, **Explore your Workspace**：https://nx.dev/docs/features/explore-graph
4. Nx, **Task pipeline configuration**：https://nx.dev/docs/concepts/task-pipeline-configuration
5. Turborepo, **Configuring tasks**：https://turborepo.com/docs/crafting-your-repository/configuring-tasks
6. Docker Docs, **Control startup and shutdown order in Compose**：https://docs.docker.com/compose/how-tos/startup-order/
