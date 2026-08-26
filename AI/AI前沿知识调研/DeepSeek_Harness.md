# DeepSeek Harness 调研

> **资料状态：2026-08-15**  
> 本文重点解释 DeepSeek Harness 当前最值得关注的架构特点：为什么它强调“一切皆插件”，为什么底层采用 Cordis，插件之间存在依赖时系统如何保持可逆，以及这种设计为什么适合垂直 Agent、自主扩展和自进化。最后再与 Pi Agent 做对比。
>
> DeepSeek Harness 当前仍处于 **Developer Preview**，具体 API 与包结构仍可能变化，因此本文主要讨论其已经明确的架构思想和能力方向。

---

## 概述
DeepSeek Harness 本质上是一套 **<u>全插件化的 Agent 运行框架</u>**。它和传统 Agent 框架最大的区别，是它底层采用的是 微内核加全插件生态 的模式，微内核叫 Cordis。Cordis 本身不负责具体的 Agent 业务能力，它主要负责插件的注册、生命周期管理、依赖关系以及动态加载和卸载。真正的模型、工具、Agent Loop、Session、文件系统这些能力，都由上层插件来提供。

这个思路可以类比 Vite。Vite 本身负责稳定的开发和构建运行流程，而 React、Vue 以及很多额外能力可以通过插件接入。DeepSeek Harness 也是类似的思想，只不过它把这种插件化方式进一步应用到了 Agent Runtime 上，甚至 Agent Loop 和模型适配器本身都可以被替换。

这种架构带来的第一个优势，就是扩展能力非常强。企业要接自己的模型、数据库、搜索系统或者安全策略，不需要修改整个框架，只需要实现对应插件。

第二个优势，是可以针对不同业务构建不同的 Harness。比如 Coding Agent 可以组合文件系统、Shell、Git 和代码模型；Research Agent 可以组合搜索、浏览器和文档工具。也就是说，同一个底座可以通过不同插件组合，形成不同的垂直 Agent。

第三个也是我认为最值得关注的特点，就是它的自主优化和自进化能力。Agent 在执行任务时，如果发现现有能力不足，可以临时创建新的插件，或者对某个已有插件进行优化，等任务结束以后可以选择是否保留、回到之前的版本或者删除插件。

但是自进化会带来一个很关键的问题，就是：Agent 改完自己以后，还能不能安全地回到原来的状态？

这也是 Cordis 重点解决的问题，也就是论文中讲的 **<u>时空可组合性</u>**。

时间维度解决的是：一个插件被安装以后，对 Runtime 产生了 Tool、Listener、Service 等变化，那么插件删除以后，这些变化能不能一起撤销，让系统尽可能恢复到安装之前的状态。

空间维度解决的是插件之间的依赖关系。比如插件 B 依赖插件 A 提供的能力，如果 A 被卸载，B 就不能继续拿着已经失效的能力运行。Cordis 会让 B 暂时停止并进入等待状态；以后如果相同能力重新出现，B 又可以重新恢复运行。

所以时间维度解决的是“这个插件自己的影响怎么撤销”，空间维度解决的是“这个插件变化以后，依赖它的其他插件怎么办”。

最后和 Pi Agent 做对比。Pi Agent 更像是先提供一个已经可以工作的 Agent Runtime，里面已经有 Agent Loop、状态管理和工具调用，然后开发者再通过 Extension、Skill 去扩展它，这有点像 VS Code 加扩展。 DeepSeek Harness 则更进一步，它把 Agent Runtime 本身也拆成插件。也就是说，Pi 更像是“固定 Agent Core 加扩展”，而 DeepSeek Harness 更像是“插件运行时加一组组成 Agent 的插件”。

所以我认为 DeepSeek Harness 最适合的几个方向，一是针对不同业务快速组合垂直 Harness，二是构建企业内部共享插件生态的 Agent Platform，第三个，也是最前沿的方向，就是让 Agent 能够持续修改、评估和优化自己的 Runtime，最终形成真正的自进化 Agent。

![image-20260815074515524](/Users/bytedance/cx/spec-2/cxdlogver/cx-learn-notes/AI/AI前沿知识调研/DeepSeek_Harness.assets/image-20260815074515524.png)

## 一、DeepSeek Harness 是什么

DeepSeek Harness 是 DeepSeek 开源的一套 **Agent 运行框架（Agent Harness / Agent Runtime）**。

它的目标并不是再做一个“能调用模型和工具的 Agent”，而是构建一套：

> **可以灵活组装、可以按业务场景定制，并且能够在运行过程中继续扩展和优化自身能力的 Agent 运行底座。**

一个真正可工作的 Agent，除了大模型本身，还需要很多外围能力：

- 模型调用与模型适配；
- Agent Loop；
- Tool 系统；
- 文件系统；
- Shell / Bash；
- Web Search；
- Session；
- Context；
- Sandbox；
- Approval；
- Subagent；
- UI；
- 持久化。

传统 Agent 框架经常采用下面这种结构：

```text
                  Agent Core
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
     Model         Agent Loop      Tools
                                      │
                  ┌───────────────────┼───────────────────┐
                  ▼                   ▼                   ▼
              Filesystem            Bash                Web
```

也就是说，先设计一个比较固定的 Agent Core，再不断把能力加进去。

这种方式比较直接，但当业务越来越多时，核心部分会越来越重：

```text
Coding Agent 需要 Git / LSP / Shell
Research Agent 需要 Web / Browser / Document
Data Agent 需要 SQL / Python / Data Warehouse
Enterprise Agent 需要权限 / Approval / Audit
```

DeepSeek Harness 选择的是另一种路线：

> **不先规定一个固定的 Agent，而是先提供一个插件运行环境，再通过不同插件组合出不同的 Agent Runtime。**

它的结构更接近：

```text
                        Cordis Runtime
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
     Model Plugin        Agent Loop Plugin      Tool Plugin
          │
          ├──────── Session Plugin
          ├──────── Filesystem Plugin
          ├──────── Shell Plugin
          ├──────── Web Plugin
          ├──────── Sandbox Plugin
          └──────── UI Plugin
```

因此，理解 DeepSeek Harness 最重要的一句话就是：

> **Agent Runtime 本身，就是插件组合的结果。**

---

## 二、核心理念：Everything is a Plugin

DeepSeek Harness 官方强调的核心原则是：

> **Everything is a Plugin —— 一切皆插件。**

很多软件也支持插件，但通常是：

```text
核心功能已经固定
        │
        ├── 插件 A：增加额外功能
        ├── 插件 B：增加额外功能
        └── 插件 C：增加额外功能
```

插件只能扩展外围能力，最核心的运行逻辑仍然固定。

DeepSeek Harness 的“全插件化”更进一步。

包括下面这些通常会被认为属于 Agent 核心的能力，都可以进入插件体系：

```text
模型适配器
Agent Loop
Tool Registry
Session
Filesystem
Shell
Web
Sandbox
Approval
Subagent
UI
Persistence
```

所以，一个 Harness 更接近：

```text
Harness
=
模型插件
+ Agent Loop 插件
+ Tool 插件
+ Session 插件
+ Filesystem 插件
+ Sandbox 插件
+ UI 插件
+ ...
```

它不是“一个 Agent 加几个插件”，而是：

> **整个 Agent 都是由插件拼出来的。**

---

## 1. 全插件化真正带来的好处

它最重要的价值不是“扩展点很多”，而是：

> **上层模块只依赖稳定的能力接口，不必知道底层具体用了哪一种实现。**

比如，一个 Bash Tool 只需要知道：

> “当前 Harness 能执行 Shell 命令。”

它并不需要关心 Shell 到底来自哪里。

```text
                   Bash Tool
                       │
                       ▼
                 Shell 能力接口
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Local Shell   Sandbox Shell  Remote Shell
```

开发阶段可以使用：

```text
Bash Tool
   ↓
Local Shell
```

上线后需要隔离执行时，可以替换为：

```text
Bash Tool
   ↓
Sandbox Shell
```

上层 Bash Tool 不需要因为底层实现发生变化而重写。

同样的逻辑也适用于模型、文件系统、Web、Session，甚至 Agent Loop。

所以，“一切皆插件”最终想解决的是：

> **让能力和具体实现解耦。**

---

## 三、底层架构：微内核 + 全插件生态

如果所有东西都变成插件，那么就必须有一个统一的底层去处理：

- 插件怎么加载；
- 插件什么时候启动；
- 插件需要哪些能力；
- 插件提供哪些能力；
- 插件之间怎么连接；
- 插件被替换时怎么办；
- 插件卸载时如何清理；
- 依赖它的其他插件如何处理。

DeepSeek Harness 把这些事情交给底层的 **Cordis**。

整个系统可以分成两层：

```text
┌──────────────────────────────────────────────┐
│            DeepSeek Harness 插件生态         │
│                                              │
│ Model  Loop  Tool  FS  Web  Session  Sandbox│
│ UI  Subagent  Approval  Persistence  ...    │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                   Cordis                     │
│                                              │
│ 插件加载 / 生命周期 / 依赖关系 / 事件 /       │
│ 动态组合 / 卸载恢复 / HMR                    │
└──────────────────────────────────────────────┘
```

Cordis 自己不会负责：

```text
调用哪个模型
怎么执行 Bash
怎么搜索网页
怎么做 Coding Agent
怎么管理业务流程
```

这些属于上层插件。

Cordis 负责的是：

> **让这些插件能够被可靠地安装、连接、运行、替换和卸载。**

这就是所谓的：

> **微内核 + 全插件生态。**

---

## 1. 为什么内核要尽可能小

如果 Agent Framework 的 Core 自己包含：

```text
LLM
Agent Loop
Filesystem
Bash
Search
Memory
Sandbox
UI
```

那么以后要替换这些能力，就容易不断修改 Core。

微内核的思路是：

```text
                Core
                 │
        只负责插件运行和管理
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
    Plugin     Plugin      Plugin
```

真正持续增长的是插件生态，而不是内核本身。

这可以让不同能力之间的边界更清楚，也让 Runtime 更容易长期演进。

---

## 四、用 Vite 理解“微内核 + 插件”模式

如果对 Agent Runtime 的插件化比较陌生，可以用前端领域的 **Vite** 做辅助理解。

需要说明的是：

> **Vite 和 DeepSeek Harness 不是完全相同的架构。**

Vite 自身已经内置了开发服务器、HMR、模块图、构建流程、TypeScript / JSX / CSS 等成熟能力，所以它不是一个纯粹的“空内核”。

这里使用 Vite，只是帮助理解：

> **为什么一个稳定的底层运行环境，加上一套插件接口，可以形成很强的生态扩展能力。**

---

## 1. Vite 的基本思路

Vite 自己维护稳定的开发和构建运行环境：

```text
                     Vite
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
     React           Vue          Custom Plugin
    Plugin          Plugin
```

很多框架适配和额外处理能力通过 Plugin API 接入。

这样，Vite 不需要为了每一个框架、每一种构建需求，都重新修改整个核心。

---

## 2. DeepSeek Harness 与 Vite 的相似点

可以做下面这个类比：

```text
                Vite                         DeepSeek Harness
                  │                                │
          稳定的构建运行环境                    Cordis Runtime
                  │                                │
       ┌──────────┼──────────┐         ┌───────────┼───────────┐
       ▼          ▼          ▼         ▼           ▼           ▼
     React       Vue      Transform   Model       Tool       Agent Loop
     Plugin     Plugin      Plugin    Plugin      Plugin       Plugin
```

共同点是：

> **把容易变化、容易扩展的能力放到插件层，把通用的运行和组合机制留在底层。**

它主要带来三个价值：

### 第一，扩展能力时不必频繁修改核心

```text
需要新能力
   ↓
增加 / 替换插件
   ↓
通过稳定接口接入
```

而不是：

```text
需要新能力
   ↓
修改 Core
   ↓
重新处理一整套耦合关系
```

### 第二，不同实现可以自由切换

比如 DeepSeek Harness 中：

```text
模型 Provider 可以换
Shell Provider 可以换
Filesystem 可以换
Agent Loop 也可以换
```

### 第三，模块变化更容易控制在自己的边界内

插件化能够降低系统耦合，让某一项能力的替换尽量不影响其他不相关模块。

需要注意的是：

> **这里的“风险隔离”主要是架构层面的影响范围控制，不等于插件之间天然具备进程级安全隔离。**

真正的安全隔离仍然需要 Sandbox、权限系统或独立执行环境。

---

## 五、DeepSeek Harness 的核心作用与优势：扩展、垂直化、自主优化与自进化

DeepSeek Harness 最值得关注的地方，并不是它提供了多少个 Tool，而是：

> **Agent Runtime 本身变得可以组合、替换和继续演进。**

它的优势可以分成四个层次理解。

---

## 1. 极强的扩展能力

传统 Agent Framework 中，开发者通常是在一个既定 Agent Core 上增加功能。

DeepSeek Harness 则希望让大部分关键能力都成为扩展点。

企业可以把自己的：

```text
内部搜索
内部数据库
私有模型
代码执行环境
企业权限
审批流程
知识库
安全策略
自定义 Agent Loop
```

分别做成插件。

最后形成：

```text
                     企业 Harness
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
    Private LLM       Internal Search     DB Plugin
        │
        ├──────── Enterprise Approval
        ├──────── Private Sandbox
        └──────── Custom Agent Loop
```

所以它更适合做：

> **Agent Platform 的底座。**

---

## 2. 针对不同垂直领域构建不同 Harness

不同业务需要的 Agent 能力并不一样。

### Coding Harness

```text
Coding Model
+ Agent Loop
+ Filesystem
+ Bash
+ Git
+ LSP
+ Sandbox
```

### Research Harness

```text
Reasoning Model
+ Agent Loop
+ Web Search
+ Browser
+ Document Reader
```

### Data Harness

```text
Reasoning Model
+ SQL
+ Python Runtime
+ Data Warehouse
+ Chart Tool
```

### Enterprise Harness

```text
Private Model
+ Internal Search
+ Internal Database
+ Approval
+ Audit
+ Enterprise Sandbox
```

传统思路更容易做成：

```text
一个超级 Agent
+ 大量配置开关
```

DeepSeek Harness 更倾向于：

```text
不同业务
   ↓
选择不同插件组合
   ↓
形成不同 Harness
```

这使它更适合垂直 Agent、行业 Agent 和企业 Agent Platform。

---

## 3. 自主性和优化能力

全插件化真正有意思的地方，是 Agent 自己也可以操作插件。

例如：

```text
Agent 接到任务
     │
     ▼
发现当前能力不足
     │
     ▼
创建一个临时插件
     │
     ▼
运行插件完成任务
     │
     ▼
任务结束
     │
     ├── 以后仍有用 → 保留
     └── 只是临时使用 → 停止或删除
```

这意味着 Agent 不再只是：

> “使用开发者已经准备好的工具。”

它开始能够：

> **主动改变自己的能力集合。**

更进一步，如果当前已有 Plugin A：

```text
Plugin A v1
```

Agent 在长期运行中发现它效果不好，就可以尝试生成：

```text
Plugin A v2
```

然后进行验证：

```text
Plugin A v1
      │
      ▼
生成 v2
      │
      ▼
测试
     / \
    /   \
更好     更差
 │        │
 ▼        ▼
保留 v2   回到 v1
```

这就从“扩展能力”进一步进入：

> **优化自己的 Runtime。**

---

## 4. 自进化真正困难的问题：改完自己以后还能不能回来

大模型生成一个新插件，并不是最困难的部分。

真正困难的是：

> **Agent 修改了自己的运行环境以后，如何保证这些变化可以安全撤销？**

假设原来的 Harness 是：

```text
Harness T0

Plugin A
Plugin B
Plugin C
```

为了完成一个任务，Agent 临时增加 Plugin D：

```text
Harness T1

Plugin A
Plugin B
Plugin C
Plugin D
```

Plugin D 运行过程中可能：

```text
注册一个 Tool
增加一个事件监听
提供一个新的 Service
增加 Prompt 内容
创建其他运行时状态
```

任务结束以后，如果把 D 删除，真正需要确认的是：

```text
D 注册的 Tool 是否删除？
D 的 Listener 是否删除？
D 提供的 Service 是否删除？
依赖 D 的其他插件怎么办？
其他插件因为 D 而发生的变化能否恢复？
```

如果这些东西没有清理干净，就会出现：

> **插件看起来已经删除，但它对 Runtime 的影响还残留。**

Agent 每自我修改一次，系统就可能发生一点状态漂移。

长期运行后，Runtime 就会越来越难理解和控制。

所以：

> **自进化真正需要的，不只是“可以修改”，而是“修改必须可撤销”。**

这就引出了 Cordis 最重要的设计：**时空可组合性（Spatiotemporal Composability）**。

---

## 5. Cordis 的时空可组合性：时间维度与空间维度分别解决什么问题

Cordis 论文把动态组件组合的问题明确拆成两个相互独立的维度：

> **Temporal Composability（时间可组合性）**：一个组件被移除时，它此前对运行环境造成的副作用能否被完整撤销。  
>
> **Spatial Composability（空间可组合性）**：一个组件依赖哪些其他能力，这些依赖关系能否被明确声明，并且在运行环境发生变化时由系统动态调整。

```text
时间维度
关注的是一个插件“从进入系统到离开系统”的生命周期变化。

空间维度
关注的是同一时刻系统中“插件与插件之间如何连接和依赖”。
```

二者解决的是两个不同的问题：

```text
                    时空可组合性
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        时间可组合性             空间可组合性
              │                     │
              ▼                     ▼
     插件离开以后，             插件依赖什么？
     它造成的变化              依赖发生变化时，
     能否被完整撤销？          系统如何重新组织？
```

这两个维度结合起来，Cordis 才能支持插件在运行过程中动态加入、退出、替换和重新组合。

---

### 5.1 时间维度：插件离开后，能否撤销它造成的运行时变化

论文所说的 **Temporal Composability**，核心关注的是组件的生命周期。

假设原始 Harness 是：

```text
T0

Plugin A
Plugin B
Plugin C
```

Agent 为了完成一个临时任务，安装 Plugin D。

D 在运行过程中又注册了一些能力：

```text
T1

Plugin A
Plugin B
Plugin C
Plugin D

D 同时带来了：
+ Tool
+ Listener
+ Service
+ 其他运行时注册
```

任务完成以后，Agent 决定卸载 D。

真正的问题不是：

> “Plugin D 的代码文件有没有删除？”

而是：

> **D 在运行期间给整个 Harness 带来的变化，能不能一起撤销？**

理想过程是：

```text
                     安装 Plugin D
              ┌────────────────────────►
              │
       ┌──────┴──────┐
       │ Harness T0  │
       │ A + B + C   │
       └──────┬──────┘
              │
              ▼
       ┌──────────────┐
       │ Harness T1   │
       │ A + B + C+D  │
       │              │
       │ + Tool       │
       │ + Listener   │
       │ + Service    │
       └──────┬───────┘
              │
              │ 卸载 D
              ▼
       ┌──────────────┐
       │ Harness T2   │
       │ A + B + C    │
       └──────────────┘

目标：
T2 尽可能恢复到 T0
```

Cordis 为此引入 **revertible effects（可逆副作用）**。

在理解层面，不需要深入 Effect 的代码实现，只需要知道：

> **插件通过 Cordis 注册到 Runtime 中的主要变化，会和这个插件自己的生命周期绑定。**

例如：

```text
Plugin D
   │
   ├── 注册 Tool
   ├── 注册 Listener
   └── 提供 Service
```

Cordis 会管理这些注册与 D 的生命周期关系。

所以当 D 被卸载时：

```text
Plugin D 卸载
      │
      ▼
撤销 D 对应的运行时注册
      │
      ├── Tool 移除
      ├── Listener 移除
      └── Service 移除
```

这就是论文中“时间可组合性”的实际意义：

> **一个组件不仅要能够被加入系统，还必须能够被干净地移出系统。**

对于自进化 Agent 来说，这一点尤其重要。

因为 Agent 如果可以不断：

```text
创建插件
→ 试用
→ 优化
→ 替换
→ 删除
```

却不能撤销旧插件造成的运行时变化，那么系统长期运行后就会不断出现状态残留，最终很难判断当前 Harness 到底是什么状态。

---

### 5.2 空间维度：插件之间的依赖关系能否被明确管理

论文所说的 **Spatial Composability**，关注的不是插件自身的生命周期，而是：

> **同一套 Runtime 中，不同插件之间是什么关系。**

例如：

```text
Plugin A
提供 shell 能力

Plugin B
需要 shell 能力

Plugin C
需要 Plugin B 提供的另一项能力
```

它们实际上形成了一张运行时依赖关系：

```text
Plugin A
   │
   ▼
 shell
   │
   ▼
Plugin B
   │
   ▼
另一项能力
   │
   ▼
Plugin C
```

如果这些依赖关系都是插件内部隐式写死的，那么 Runtime 并不知道：

- 谁依赖谁；
- 一个能力消失以后谁会受影响；
- 换一个新的 Provider 后哪些插件应该重新连接；
- 哪些插件当前已经不具备运行条件。

Cordis 的做法是：

> **让插件明确声明自己运行所必需的 Service，并由 Runtime 持续管理这些依赖关系。**

因此，空间可组合性解决的不是：

> “怎样自动安装 npm 依赖包？”

而是：

> **当前 Runtime 中有哪些能力，以及哪些插件依赖这些能力。**

可以把它理解成：

```text
                 Cordis Runtime
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
      Model          Tools        Session
        │             │
        │        ┌────┴────┐
        │        ▼         ▼
        │       FS        Shell
        │
        ▼
    Agent Loop
```

Cordis 需要理解这张关系图。

只有 Runtime 知道这些关系以后，当其中某个能力发生变化时，系统才能自动把相关插件调整到正确状态。

---

### 5.3 如果被依赖的插件卸载，依赖它的插件会怎么办

这是空间可组合性最直观的例子。

假设：

```text
Plugin A
提供 shell Service

Plugin B
把 shell 声明为必需依赖
```

正常情况下：

```text
Plugin A
   │
   ▼
 shell
   │
   ▼
Plugin B ACTIVE
```

现在 Plugin A 被卸载。

A 提供的 `shell` Service 也随之消失。

此时 Plugin B 已经不再具备正常运行的前提。

Cordis 会把 B 当前正在运行的实例卸载，并清理 B 自己在本轮运行中注册的受管理能力：

```text
Plugin A 卸载
      │
      ▼
shell Service 消失
      │
      ▼
Plugin B 当前运行实例卸载
      │
      ├── B 注册的 Tool 清理
      ├── B 注册的 Listener 清理
      └── B 的其他受管理注册清理
      │
      ▼
Plugin B 进入 PENDING
```

这里需要区分两个概念：

```text
“卸载当前运行实例”
≠
“永久删除 Plugin B”
```

Plugin B 的插件定义和配置仍然存在。

只是因为它现在缺少必需的 `shell` 能力，所以暂时不能运行。

如果之后另一个 Provider 又重新提供了 `shell`：

```text
新的 Shell Provider
        │
        ▼
shell Service 恢复
        │
        ▼
Plugin B 再次满足运行条件
        │
        ▼
Plugin B 重新加载
        │
        ▼
Plugin B ACTIVE
```

完整过程可以表示为：

```text
阶段 1：依赖存在

Shell Provider A
      │
      ▼
    shell
      │
      ▼
Plugin B ACTIVE


阶段 2：依赖消失

Shell Provider A 卸载
      │
      ▼
    shell 消失
      │
      ▼
Plugin B 当前实例卸载
      │
      ▼
Plugin B PENDING


阶段 3：依赖恢复

Shell Provider C
      │
      ▼
    shell 恢复
      │
      ▼
Plugin B 重新加载
      │
      ▼
Plugin B ACTIVE
```

如果依赖链更长：

```text
A → B → C
```

A 的消失导致 B 停止，而 B 又恰好提供 C 所必需的能力，那么影响还会继续沿着依赖关系传递。

这正是论文所谓 **reactive management of inter-component dependencies** 的实际含义：

> **依赖关系不是只在程序启动时检查一次，而是在整个 Runtime 生命周期中持续生效。**

---

### 5.4 时间维度和空间维度为什么必须同时存在

现在可以把两个维度放到同一个例子里。

假设 Agent 临时安装 Plugin D，而 Plugin E 必须依赖 D 提供的某项 Service：

```text
Plugin D
   │
   ▼
Service X
   │
   ▼
Plugin E
```

D 被安装以后：

```text
D ACTIVE
   ↓
Service X 出现
   ↓
E ACTIVE
```

如果 Agent 判断这次自我优化失败，需要撤销 Plugin D：

```text
D 卸载
   │
   ├──────────── 时间维度
   │             D 自己注册的 Tool、Listener、
   │             Service 等受管理变化被撤销
   │
   ▼
Service X 消失
   │
   ├──────────── 空间维度
   │             Cordis 发现 E 的必需依赖消失
   │
   ▼
E 当前实例卸载
   │
   ▼
E 回到等待状态
```

所以：

> **时间维度负责“把 D 自己带来的变化撤掉”。**

而：

> **空间维度负责“处理 D 消失以后，对其他依赖组件造成的连锁影响”。**

这两个机制共同作用，Runtime 才有机会从一次动态修改中恢复到一个合法、可理解的状态。

也正因为如此，Cordis 的时空可组合性才和 DeepSeek Harness 的自进化直接相关：

```text
Agent 修改 Runtime
       │
       ▼
时间可组合性
保证单个插件的受管理变化可以撤销
       │
       +
       │
空间可组合性
保证依赖关系随着变化重新调整
       │
       ▼
Runtime 可以更安全地
试验 / 替换 / 回滚插件
```

---

### 5.5 可逆性的边界

Cordis 所说的可逆性主要针对：

> **由 Cordis 生命周期管理的 Runtime 变化。**

例如：

```text
Tool
Listener
Service
某些 Prompt / Runtime 注册
```

但如果插件已经做了外部现实操作：

```text
向数据库写入数据
删除磁盘文件
调用第三方 API
发送邮件
修改外部系统
```

这些操作并不会因为插件被卸载而自动倒放。

所以准确理解应该是：

```text
Cordis 的时间可组合性
=
Runtime 中由 Cordis 管理的组件副作用可以随组件移除而撤销
```

而不是：

```text
插件做过的一切现实世界操作都能自动回滚
```

如果希望外部操作也具有回退能力，还需要业务层额外设计 Transaction、Snapshot、Compensation、Versioning、Sandbox 或 Approval 等机制。

---

## 6. DeepSeek Harness 当前的自修改能力

DeepSeek Harness 当前已经提供面向 Agent 的动态 Cordis Plugin 能力。

可以概括为：

```text
Inspect
   ↓
Define
   ↓
Run / Update
   ↓
Evaluate
   ↓
Stop / Rollback / Remove
```

### Inspect

Agent 可以先了解：

```text
当前有哪些动态插件？
哪个版本正在运行？
已有几个 Package？
```

### Define

可以创建新的 Plugin，或者为已有 Plugin 增加新版本。

例如：

```text
Plugin A
  │
  ├── Package v1
  ├── Package v2
  └── Package v3
```

而不是直接覆盖旧代码。

### Run / Update

可以尝试运行新版本。

当前实现的重要原则是：

> **新 Package 成功后，当前版本指针才会真正切换。**

所以可以形成：

```text
          v1（当前版本）
                │
                ▼
            尝试 v2
           /        \
          /          \
       成功           失败
        │              │
        ▼              ▼
   current = v2    旧版本继续保留
```

### Stop / Rollback / Remove

临时插件不需要时可以停止。

新版效果不好，可以重新运行旧版本。

整个插件确定不需要时，也可以删除。

因此 Agent 开始拥有：

```text
看自己的 Runtime
↓
增加能力
↓
修改能力
↓
验证能力
↓
保留或回滚
```

这比传统的 Tool Calling 更接近：

> **Self-Modifiable Agent Runtime。**

---

## 7. 可逆性的边界

Cordis 的可逆性主要针对：

> **由 Cordis 生命周期管理的运行时变化。**

例如：

```text
Tool
Listener
Service
某些 Prompt / Runtime 注册
```

但如果 Plugin 已经执行了外部现实操作：

```text
写数据库
删除文件
调用第三方 API
发送邮件
修改外部系统
```

这些操作不会因为 Plugin 被卸载而自动倒放。

所以应该准确理解成：

```text
Cordis 可逆性
=
Harness Runtime 中受 Cordis 管理的变化可以撤销
```

而不是：

```text
Plugin 做过的一切现实世界操作都能自动回滚
```

如果要让外部操作也支持回退，还需要额外的：

- Transaction；
- Snapshot；
- Compensation；
- Versioning；
- Sandbox；
- Approval。

---

## 六、Pi Agent：框架结构、扩展机制以及与 DeepSeek Harness 的区别

Pi 是当前很有代表性的 **简洁、可扩展 Coding Agent Harness**。

它和 DeepSeek Harness 都强调扩展，但两者的核心架构思想并不一样。

---

## 1. Pi Agent 的基本结构

Pi 当前的核心结构可以简化为三层：

```text
@earendil-works/pi-ai
        │
        ▼
@earendil-works/pi-agent-core
        │
        ▼
@earendil-works/pi-coding-agent
```

### pi-ai

负责统一不同模型 Provider 的调用。

### pi-agent-core

这里已经包含一个明确的 Agent Runtime，包括：

- Agent State；
- Tool Calling；
- Tool Execution；
- Agent Loop。

也就是说：

> **Pi 先提供一个 Agent Core。**

### pi-coding-agent

在这个 Core 上继续提供：

- CLI；
- Session；
- 默认工具；
- Resource Loader；
- Extensions；
- Skills；
- Prompt；
- UI。

结构可以简化成：

```text
                  pi-agent-core
                ┌───────────────┐
                │ Agent Loop    │
                │ Agent State   │
                │ Tool Runtime  │
                └───────┬───────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
      Extension        Skill       Provider
```

---

## 2. Pi 的 Extension 能力很强

Pi 并不是一个只能增加简单 Hook 的框架。

当前 Extension 可以：

- 注册 Tool；
- 覆盖内置 Tool；
- 注册 Command；
- 拦截 Tool Call；
- 修改 Context；
- 注册 Provider；
- 修改 Compaction；
- 自定义 UI；
- 监听生命周期；
- 保存 Extension 状态。

同时支持：

```text
/reload
```

重新加载 Extension、Skill、Prompt、Theme 等资源。

所以 Pi 同样可以做到：

```text
发现缺少能力
    ↓
生成一个 Extension
    ↓
reload
    ↓
继续使用新能力
```

因此不能把两者区别简单写成：

```text
DeepSeek Harness 能热更新
Pi 不能热更新
```

现在的 Pi 同样具备很强的动态扩展能力。

---

## 3. 两者真正的区别：什么东西是“核心”

### Pi：Agent Runtime 是核心

Pi 更接近：

```text
                   Agent Runtime
                 （pi-agent-core）
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
        Extension      Skill      Provider
```

它的思想是：

> **先提供一个简洁、可工作的 Agent Runtime，再围绕它持续增加能力。**

所以：

```text
Agent Core
是中心

Extension
围绕 Core 扩展
```

---

### DeepSeek Harness：Plugin Runtime 是核心

DeepSeek Harness 更接近：

```text
                       Cordis
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
      Agent          Agent Loop          LLM
      Plugin           Plugin           Plugin
        │
        ├── Tool Plugin
        ├── Session Plugin
        ├── FS Plugin
        ├── Sandbox Plugin
        └── UI Plugin
```

它的思想是：

> **先提供一个 Plugin Runtime，然后连 Agent Runtime 本身都通过插件组合出来。**

可以简单概括为：

```text
Pi
=
Agent Core + Extensions
```

而：

```text
DeepSeek Harness
=
Plugin Runtime + 一组组成 Agent 的 Plugins
```

---

## 4. DeepSeek Harness 与 Pi Agent 对比

| 对比维度 | DeepSeek Harness | Pi Agent |
|---|---|---|
| 核心定位 | 可组合的 Agent Runtime / Plugin Runtime | 简洁、自扩展的 Coding Agent Harness |
| 最核心抽象 | Cordis Plugin Runtime | Agent Runtime |
| Agent Loop | Agent Loop 本身属于插件体系 | 属于 `pi-agent-core` |
| 模型层 | 模型适配也进入 Harness Plugin / Service 体系 | `pi-ai` 提供统一多模型能力 |
| Tool | Tool Runtime 本身属于插件组合体系 | Core 提供 Tool Runtime，Extension 可新增或覆盖 Tool |
| Session | 可以作为 Harness 插件能力组合 | Coding Agent 的核心组成 |
| 扩展范围 | 可以扩展 Runtime 的核心组成 | 主要围绕固定 Agent Core 深度扩展 |
| 热加载 | Cordis 生命周期、HMR、动态 Plugin | `/reload`、动态 Tool / Provider |
| 自扩展 | 可以动态创建和运行 Cordis Plugin | 可以创建 Extension / Skill 并 reload |
| 自修改层级 | Runtime Plugin / Package 本身可以成为 Agent 操作对象 | 主要修改 Agent Core 外围扩展层 |
| 可逆机制 | Cordis 将 Runtime 注册与插件生命周期绑定 | Extension 可 reload，但没有把统一的时空可组合性作为整个 Runtime 的核心设计 |
| 更适合 | Agent Platform、垂直 Harness、自修改 Agent 研究 | Coding Agent、个人开发工作流、快速扩展 Coding 能力 |

一句话总结：

> **Pi 是“给你一个优秀的 Agent Core，让它不断长出新能力”；DeepSeek Harness 是“给你一个插件运行时，让 Agent Core 本身也可以重新组合”。**

---

## 七、DeepSeek Harness 最值得关注的后续方向与使用场景

## 1. 按任务动态组合 Harness

今天的 Agent 通常是：

```text
先配置好一个 Agent
然后所有任务都交给它
```

未来可能变成：

```text
收到任务
   ↓
判断任务类型
   ↓
选择模型
   ↓
选择 Agent Loop
   ↓
选择工具
   ↓
选择 Sandbox
   ↓
组合一个更适合当前任务的 Harness
```

例如：

```text
写代码
→ Coding Harness

研究论文
→ Research Harness

企业数据分析
→ Data Harness
```

---

## 2. 企业内部 Agent Platform

企业未来很可能不是只有一个 Agent，而是：

```text
几十个 Agent
甚至几百个 Agent
```

它们需要共享：

- 企业模型；
- 权限；
- Sandbox；
- 数据；
- Tool；
- 审批；
- 日志；
- 安全策略。

全插件化 Runtime 可以把这些能力做成企业内部的标准组件：

```text
              Enterprise Agent Platform
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
  Coding Harness   Finance Harness   Research Harness
       │                 │                 │
       └──────────共享企业 Plugin──────────┘
```

---

## 3. Agent 持续优化自己的 Runtime

更前沿的方向是：

```text
Agent 长期运行
      │
      ▼
积累执行结果
      │
      ▼
发现某个能力效果不好
      │
      ▼
生成新 Plugin 版本
      │
      ▼
验证
      │
      ├── 更好 → 保留
      └── 更差 → 回滚
```

如果再配合：

- 自动评估；
- Benchmark；
- Sandbox；
- Approval；
- Versioning；
- Runtime Observability；

就有可能逐渐形成真正意义上的：

> **Self-Evolving Agent Runtime。**

---

## 八、最终理解

如果只记住 DeepSeek Harness 的一条逻辑链，可以记住：

```text
DeepSeek Harness
      │
      ▼
Everything is a Plugin
      │
      ▼
Agent Runtime 本身也被插件化
      │
      ▼
Cordis 管理插件组合、依赖和生命周期
      │
      ▼
不同业务可以组合不同 Harness
      │
      ▼
Agent 可以创建和修改 Plugin
      │
      ▼
修改必须能够验证、停止和回滚
      │
      ▼
Cordis 的时空可组合性提供基础
      │
      ▼
更加动态、可组合、可持续演进的 Agent Runtime
```

所以 DeepSeek Harness 真正值得关注的，不是：

> “它又提供了一套新的 Agent Tool API。”

而是：

> **它试图把 Agent 的运行环境本身，从固定软件变成一种可以组合、替换、动态修改和持续迭代的系统。**

Pi 更接近：

> **Self-Extensible Agent —— 在一个稳定 Agent Core 周围持续扩展能力。**

DeepSeek Harness 当前探索得更进一步：

> **Self-Modifiable Runtime —— 组成 Agent Runtime 的插件和版本本身，也开始成为 Agent 可以操作的对象。**

这就是“全插件化 + Cordis 时空可组合性”最值得关注的意义。

---

## 参考资料

1. DeepSeek Harness 官方仓库  
   https://github.com/deepseek-ai/deepseek-harness

2. DeepSeek Harness Architecture  
   https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md

3. DeepSeek Harness Cordis Tutorial - Services  
   https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-tutorial/03-services.md

4. DeepSeek Harness Cordis Tutorial - Lifecycle and Effects  
   https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-tutorial/02-lifecycle-and-effects.md

5. DeepSeek Harness Cordis Tutorial - Composition and HMR  
   https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-tutorial/06-composition-and-hmr.md

6. DeepSeek Harness Extensions Subsystem  
   https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/extensions.md

7. Cordis 官方仓库  
   https://github.com/cordiverse/cordis

8. Cordis Paper  
   https://github.com/cordiverse/paper

9. Vite 官方网站与 Plugin API  
   https://vite.dev/  
   https://vite.dev/guide/api-plugin

10. Pi Agent 官方仓库  
    https://github.com/earendil-works/pi

11. Pi Extensions 官方文档  
    https://pi.dev/docs/latest/extensions
