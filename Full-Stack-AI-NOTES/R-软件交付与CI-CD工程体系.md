# 软件交付与 CI/CD 工程体系建立从代码变化到生产验证的完整链路

软件交付（Software Delivery）解决的是：**一份代码变化怎样经过持续验证、形成可识别的构建产物，并安全进入目标运行环境，最后通过生产验证和恢复机制形成闭环。**

~~~text
Source Change
↓
Continuous Integration
↓
Build
↓
Artifact
↓
Verification
↓
Release Decision
↓
Deployment
↓
Production Verification
↓
Rollback / Roll Forward
~~~

CI/CD 不是某一个工具，也不等于把 install、test、build、deploy 几条命令顺序执行。GitHub Actions、GitLab CI/CD、Jenkins 等是实现 Pipeline 的工具；本文关注脱离具体平台仍然成立的交付模型。

## 1. 软件交付把代码变化转换为可运行版本

### 【开发完成、构建完成、发布和部署是不同阶段】

~~~text
Source
↓
Build
↓
Artifact
↓
Release
↓
Deploy
↓
Running Version
~~~

- **Build**：从 Source Code 生成可以继续验证、分发或运行的 Artifact。
- **Artifact**：构建阶段输出的稳定产物，例如前端静态文件、Package、Server Binary、Container Image。
- **Release**：把某个经过验证的 Artifact 认定为可以向目标用户或环境发布的版本，是版本与发布决策。
- **Deployment**：把选定 Artifact 安装、复制或启动到具体 Runtime Environment。

因此：

~~~text
Build Success
≠
Released
≠
Deployed
≠
Production Healthy
~~~

这个边界让构建、版本管理、Docker 和运行时部署可以进入同一条知识链。

当 Source Repository 本身采用 Monorepo 时，多个 Project 怎样被 Workspace 发现、怎样形成 Project / Task Graph，以及怎样分别产生 Artifact，属于 [Monorepo 工程体系](./M-Monorepo工程体系.md) 的职责；本文从这些 Artifact 和交付任务继续向 Release、Deployment 与 Production Verification 延伸。

```text
Monorepo
Project / Task / Artifact
↓
CI/CD
Verification / Release / Deployment / Production Recovery
```

### 【Build Once、Promote Artifact 是重要的工程目标】

更稳定的交付链倾向于：

~~~text
Source Revision
↓
Build Once
↓
Immutable / Identifiable Artifact
↓
Test / Staging
↓
Promote Same Artifact
↓
Production
~~~

这样不同环境验证的是同一份产物，而不是每进入一个环境就重新从源码构建。是否能够完全做到不可变产物仍取决于配置注入、前端 Runtime Config、平台打包方式等工程约束。

## 2. Continuous Integration 持续验证共享代码库中的变化

### 【CI 的核心是频繁集成和快速反馈】

Continuous Integration（持续集成）关注开发者持续把变化集成到共享代码库，并通过自动化验证尽早暴露集成问题。

~~~text
Commit / Pull Request
↓
Trigger
↓
Automated Checks
├── Lint
├── Type Check
├── Unit Test
├── Integration Test
└── Build
↓
Feedback
~~~

具体团队可以选择 Push、Pull Request、Merge Queue 或其他事件触发验证；“每天必须提交几次”不是 CI 的固定定义。

测试类型不由 CI/CD 定义。Unit / Component / Integration / E2E 应先在 [前端测试体系从验证边界到工程质量门禁](./Q-前端单元测试、集成测试与E2E测试笔记（面试版）.md) 中确定 Verification Boundary，再根据反馈速度、运行环境和风险把对应 Test Job 放入合适 Gate。

### 【Code Review 与 CI Checks 可以共同组成 Merge Gate】

~~~text
Pull Request
   │
   ├── Human Review
   │
   └── Automated Checks
          ├── Lint
          ├── Test
          └── Build
   │
   ↓
Merge Gate
~~~

Human Review 和 Automated Checks 可以并行发生。是否要求特定 Check、几名 Reviewer、审批顺序如何，由 Repository / Team Policy 决定，不应把某一种团队流程写成 CI 的定义。

## 3. Pipeline 将交付过程组织为 Trigger、Job、Step 与 Gate

### 【Pipeline 不是只能串行执行的脚本】

以 GitHub Actions 的通用执行模型为例，一个 Workflow 可以由 Repository Event、手动操作或 Schedule 触发，并包含一个或多个 Job；Job 默认可以并行，也可以通过依赖关系建立执行顺序，每个 Job 再由 Step 组成。[[1]](https://docs.github.com/en/actions/about-github-actions/understanding-github-actions)[[2]](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows)

可以抽象成：

~~~text
Trigger
↓
Workflow / Pipeline
↓
Jobs
├── Lint
├── Type Check
├── Unit Test
└── Build
      ↓
   Artifact
      ↓
Later Stage / Environment
~~~

### 【Trigger、Workflow、Job、Step、Runner 与 Gate 属于不同层级】

| 概念 | 负责的问题 |
| --- | --- |
| Trigger | Pipeline 为什么开始 |
| Workflow / Pipeline | 一次自动化交付流程怎样组织 |
| Job | 一组可以在某个执行环境中运行的工作 |
| Step | Job 内的具体 Action / Command |
| Runner | Job 实际运行在哪里 |
| Artifact | Job 产生并供后续阶段使用的稳定产物 |
| Gate | 哪些条件满足后才能进入下一阶段 |

不同 CI/CD 产品的术语并不完全一致，因此应先掌握职责，再映射到具体平台。

### 【Dependency Graph 比固定步骤列表更接近真实 Pipeline】

~~~text
          ┌─ Lint ────────┐
Trigger ──┼─ Type Check ──┼─→ Gate
          ├─ Unit Test ───┤
          └─ Build ───────┘
                              ↓
                           Artifact
                              ↓
                         Deploy Stage
~~~

并行可以缩短反馈时间，Dependency 则保证存在前置关系的 Job 按要求执行。Pipeline 的重点是依赖、产物和 Gate，而不是机械地把所有命令排成一列。

## 4. Build Artifact 是开发流程和部署流程之间的稳定边界

### 【Artifact 将源码验证与环境部署解耦】

~~~text
Development Side
Source → Build → Artifact

Delivery Side
Artifact → Environment → Runtime
~~~

常见 Artifact：

| 项目类型 | Artifact 示例 |
| --- | --- |
| Web Frontend | dist / static bundle |
| Node / Java Service | package / binary / jar |
| Containerized Service | OCI / Docker Image |
| Library | npm package / Maven artifact |

Artifact 最好具有 Version、Commit SHA、Build Metadata 等可追踪标识，使线上版本能够回溯到源代码和 Pipeline。

### 【Container Image 是一种 Deployable Artifact】

Docker 链路可以放回完整交付体系：

~~~text
Source
↓
Build Application
↓
Build Image
↓
Image Tag / Digest
↓
Registry
↓
Deploy
↓
Container Runtime
~~~

Docker 负责 Image / Container / Runtime 模型，CI/CD 负责这个 Artifact 怎样被验证、发布和推进到不同环境。Docker 的完整知识见 [Docker 工程体系](./D-Docker工程体系.md)。

## 5. Continuous Delivery 与 Continuous Deployment 描述不同自动化边界

### 【Continuous Delivery 的目标是让变化保持可安全发布状态】

Continuous Delivery 建立在 Continuous Integration 之上。核心不是“必须自动部署测试环境”，而是通过可重复的 Build、Test、Environment Verification 和 Release Process，让通过 Pipeline 的变化持续保持可发布状态。

常见实现可以包含：

~~~text
CI
↓
Build Artifact
↓
Automated Verification
↓
Test / Staging
↓
Production Release Gate
~~~

生产发布可以由业务或团队在合适时间做出决定。

### 【Continuous Deployment 将通过 Pipeline 的变化自动推进到生产】

~~~text
Continuous Delivery
↓
Production Release Decision
由 Human / Business Gate 控制

Continuous Deployment
↓
通过既定 Gate 的变化
自动进入 Production
~~~

二者差异不应简化成“有没有测试环境”，而应看生产 Release / Deployment 是否还需要显式人工决策。

### 【Deployment Pipeline 通过逐层验证增加发布信心】

Martin Fowler 对 Deployment Pipeline 的经典描述强调，把 Build 划分成多个 Stage，每个 Stage 对 Build 提供更高的信心，后续阶段可能包含自动或人工 Gate。[[3]](https://martinfowler.com/bliki/DeploymentPipeline.html)

因此 Pipeline 的目标不是“自动化越多越好”，而是在反馈速度、验证成本和发布风险之间建立可重复的决策路径。

## 6. Deployment Strategy 控制新版本怎样进入 Runtime

### 【Deployment 与 Release Strategy 需要区分】

Deployment 解决版本怎样进入 Runtime；Feature Flag 等机制还可以进一步把“代码已部署”和“功能是否向用户开放”分开：

~~~text
Code Deployed
≠
Feature Released to All Users
~~~

常见策略包括：

- **Rolling Deployment**：逐步替换旧实例。
- **Blue-Green Deployment**：维护两套可切换环境，通过流量切换改变生效版本。
- **Canary / Progressive Delivery**：先让部分流量或用户进入新版本，再根据验证结果扩大范围。
- **Feature Flag**：让功能开放与代码部署解耦。

这些策略解决的问题不同，不能简单按“先进程度”排序。

### 【Environment Promotion 应围绕 Artifact 而不是重新定义源码版本】

~~~text
Artifact v1
├── Test
├── Staging
└── Production
~~~

环境差异通常应由 Environment Configuration、Secret、Infrastructure 等控制，而不是随意改变已经验证过的应用 Artifact。

## 7. Production Verification 与 Recovery 形成交付闭环

### 【Deployment 完成不等于 Delivery 成功】

~~~text
Deploy
↓
Smoke / Health Check
↓
Metrics / Logs / Errors
↓
Healthy?
├── Yes → Continue / Expand
└── No  → Stop / Rollback / Roll Forward
~~~

因此软件交付必须继续连接 Observability。发布后需要观察错误率、关键性能、业务指标和依赖健康情况，而不是只确认 Deployment Command 返回成功。

### 【Rollback 与 Roll Forward 都是恢复策略】

- **Rollback**：恢复到之前已知稳定版本。
- **Roll Forward**：通过新的修复版本继续向前恢复。

是否能够快速恢复依赖 Artifact 可追踪性、数据库兼容性、配置管理、Feature Flag 和 Deployment Strategy。数据库 Migration 尤其需要考虑向前/向后兼容，不能假设应用版本回滚就能自动恢复数据库状态。

### 【测试、Git、Docker 与监控在交付链中承担不同职责】

~~~text
Git / PR
↓
Change & Review
↓
CI Pipeline
↓
Test / Quality Gate
↓
Build Artifact
↓
Docker Image / Package
↓
Deploy
↓
Monitoring
↓
Rollback / Roll Forward
~~~

- [前端测试体系从验证边界到工程质量门禁](./Q-前端单元测试、集成测试与E2E测试笔记（面试版）.md)：负责 Verification Strategy，定义 Test Boundary、Environment、Dependency Fidelity、Fixture、Isolation 与不同测试层怎样组合；本文只负责这些 Test Result 怎样进入 Pipeline / Gate。
- [Git分支操作、发布流程及CI_CD相关面试笔记（完整版）](./G-Git分支操作、发布流程及CI_CD相关面试笔记（完整版）.md)：负责 Git Collaboration、PR / MR 与面试场景。
- [Docker 工程体系](./D-Docker工程体系.md)：负责 Image / Container / Runtime。
- [前端工程化设计全面解析](./Q-前端工程化设计全面解析.md)：负责前端项目中 Lint、Test、Build 等工程能力怎样接入交付链。

## 8. 参考文献

[1] GitHub Docs. *Understanding GitHub Actions*. https://docs.github.com/en/actions/about-github-actions/understanding-github-actions

[2] GitHub Docs. *Workflows*. https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows

[3] Martin Fowler. *Deployment Pipeline*. https://martinfowler.com/bliki/DeploymentPipeline.html

[4] Playwright. *Browsers*. https://playwright.dev/docs/browsers
