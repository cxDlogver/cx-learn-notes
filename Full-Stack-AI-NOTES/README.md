# Full-Stack AI Notes

`Full-Stack-AI-NOTES` 是一套面向 **全栈工程、AI Agent、项目实践与技术问答** 的个人知识库。它不只保存 Markdown 笔记，还通过 **知识体系索引、Skill、QA、源码与附件资源** 建立统一的读取和维护方式。

这个目录的核心目标不是持续堆叠文件，而是让知识能够被：

```text
找到 → 阅读 → 核验 → 回答 → 实践 → 记录 → 重新接入知识体系
```

## 1. 读取知识时先经过三个入口

进入 `Full-Stack-AI-NOTES` 后，不建议直接在大量文件中无序搜索。默认按下面的顺序读取：

```text
README.md
   ↓ 先理解目录和维护规则
知识体系索引.md
   ↓ 找到主题、前置知识、相关文档
QA.md
   ↓ 检查是否已有相同或相关问题
相关知识 Markdown
   ↓ 阅读完整正文
source/ / resource/
   ↓ 需要实现或附件证据时继续读取
外部官方资料 / 标准 / 论文
   ↓ 对变化事实和关键结论做最终核验
```

三个入口承担不同职责：

| 入口 | 职责 | 不应该做什么 |
| --- | --- | --- |
| [知识体系索引.md](./知识体系索引.md) | 整个目录的主知识地图，组织主题、前置关系、主文档和延伸资料 | 不替代具体知识正文 |
| [QA.md](./QA.md) | 记录明确要求保存的问题、回答要点和问题之间的关联 | 不自动记录每次聊天，不成为第二套知识库 |
| [knowledge-document-organizer](./skills/knowledge-document-organizer/SKILL.md) | 规定 AI 如何读取本地知识、核验外部资料、整理文档、更新索引和记录 QA | 不把 Skill 中的规则当成技术事实 |

因此，**知识体系索引是“读什么”，Skill 是“怎么读、怎么写”，QA 是“已经问过什么、学到什么”。**

## 2. 目录结构区分知识正文、图片、代码和附件

```text
Full-Stack-AI-NOTES/
├── README.md
├── 知识体系索引.md
├── QA.md
│
├── *.md
│   └── 知识教程、专题笔记、工程知识与知识索引入口；知识点正文保持脱离具体项目上下文
│
├── skills/
│   └── knowledge-document-organizer/
│       ├── SKILL.md
│       ├── references/
│       └── agents/
│
├── assets/
│   └── Markdown 文档引用的图片资源
│
├── source/
│   └── 可运行代码、脚本、Demo、最小实现
│
└── resource/
    └── PDF、导出资料、Prompt 等非代码附件
```

目录边界是稳定约束：

- **文档图片必须放在 `assets/`。** PNG、JPG、JPEG、GIF、WebP、SVG 等文档图片不要散落在根目录。
- **完整代码资源必须放在 `source/`。** Markdown 正文可以保留用于解释的短代码片段，但独立 Demo、脚本、HTML 示例、可运行项目和测试代码都进入 `source/`。
- **PDF 等附件必须放在 `resource/`。** PDF、简历导出、资料附件、Prompt 或其他不适合作为知识正文维护的文件统一放入该目录。
- **根目录优先保留 Markdown 知识正文和入口文件。**
- **知识点正文必须能够脱离具体项目独立阅读。** 项目仓库可以提供实践证据和真实实现，但不能成为通用知识正文的默认上下文。
- **知识体系索引只直接链接 `Full-Stack-AI-NOTES` 内部内容。** 如果需要关联其他项目目录，先建立或使用本目录中的通用知识正文，再由正文提供“项目实践入口”；索引不直接跨目录链接项目文档。
- **通用知识与项目实现避免重复维护。** 已有完整项目文档时，通用正文保留稳定原理、机制、边界和通用示例，项目目录保留真实代码、配置、版本和工程取舍。

推荐关系：

```text
知识体系索引
    ↓
Full-Stack-AI-NOTES 通用知识正文
    ↓
项目实践入口
    ↓
其他项目目录的真实实现文档
```

移动文件后，必须同步检查并修正正文链接、知识体系索引和 QA 中的引用。

## 3. 知识体系覆盖六条主要学习主线

完整导航见 [知识体系索引.md](./知识体系索引.md)。从整体上可以把当前内容理解为六条主线：

| 主线 | 主要内容 | 推荐入口 |
| --- | --- | --- |
| 浏览器与前端基础 | 网络、浏览器渲染、JavaScript、TypeScript、CSS、异步、V8 | [计算机网络连接概述](./计算机网络连接概述.md)、[JavaScript核心总结](./JavaScript核心总结.md)、[基于Chrome浏览器渲染原理](./基于Chrome浏览器渲染原理.md) |
| 框架与前端工程化 | Vue、Router、模块化、Monorepo、Vite、Webpack、测试、CI/CD | [Vue3进阶学习](./Vue3进阶学习.md)、[Monorepo工程体系](./Monorepo工程体系.md)、[前端工程化设计全面解析](./前端工程化设计全面解析.md) |
| 性能、监控与 SEO | Web Vitals、资源、渲染、监控、Lighthouse、Nuxt、SEO | [性能专项优化](./性能专项优化.md)、[Nuxt SEO 学习笔记](<./Nuxt SEO 学习笔记.md>) |
| 服务端与全栈 | Node.js、HTTP、数据库、鉴权、Django、实时通信 | [NodeJS核心总结](./NodeJS核心总结.md)、[Django从0到1](./Django从0到1.md)、[DATABASE](./DATABASE.md) |
| AI Agent 与 AI Native | Context、Tool、Memory、Skill、MCP、Loop、Runtime、Harness、Workflow、Orchestration、Eval | [Agent完整学习教程](./Agent学习教程.md) → [Agent System 研发知识梳理](./Agent-System研发知识梳理.md) → [Agent Eval 与 Benchmark](./Agent-Eval与Benchmark.md)；可运行证据：[Minimal Agent 源码](./source/minimal-agent/) |
| 项目与面试表达 | 项目复盘、技术方案、面试追问、算法与表达 | [项目概述](./项目概述.md)、[前端面试核心问题](./前端面试核心问题.md)、[项目扩展面试题](./项目扩展面试题.md) |

这些主线不是彼此独立的目录，而是知识之间的依赖关系。例如：

```text
网络 / 浏览器 / JavaScript
        ↓
框架与前端工程化
        ↓
性能、监控与项目实践
        ↓
服务端与完整交付链路
        ↓
AI Native / Agent 工程化
        ↓
项目复盘与 QA 输出
```

## 4. Skill 负责知识库的读取、整理与写回

当前核心 Skill 是：

[skills/knowledge-document-organizer/SKILL.md](./skills/knowledge-document-organizer/SKILL.md)

它统一处理三类工作：

### 【知识问答】

回答问题前先读取：

```text
知识体系索引
  ↓
QA 历史
  ↓
相关本地知识正文
  ↓
source / resource（按需）
  ↓
权威外部资料
```

索引只能用于定位，正式回答不能只根据索引摘要生成。

### 【知识文档维护】

新增或修改知识后，需要同时判断：

- 应该补充已有文档还是新建独立知识文档；
- 新内容与哪些旧知识存在前置、延伸、对比或冲突；
- 是否需要补充图片、源码或附件；
- 是否需要更新 [知识体系索引.md](./知识体系索引.md)。

### 【QA 记录】

普通问答默认不写入 QA。只有明确提出“记录问题”“写入 QA”“保存这题”等要求时，才创建 QA 记录并同步 [QA.md](./QA.md)。

## 5. QA 是知识体系上的问题视图

[QA.md](./QA.md) 不重新组织整套知识，而是记录“知识被怎样问过”。

一个完整的 QA 关系应当是：

```text
知识体系索引
    ↓ 定位
知识正文
    ↓ 支撑
问题 → 标准回答
    ↓
QA.md 索引
    ↘ 相关问题 / 下一层知识
```

因此：

- 已有问题优先复用或继续深入，不重复制造同义问题；
- 回答中发现知识缺口时，优先补对应知识正文；
- QA 文件只在明确要求记录时创建；
- QA 中的结论仍需要回到知识正文和权威资料核验。

## 6. source 保存可以验证知识的实现

`source/` 用于独立的代码资源，目前包括：

- `source/ai-coding-workflow.ts`：需求、规划、编码、测试阶段组成的 AI Coding Workflow；
- `source/minimal-agent/`：五层 Agent 与受控 ReAct Loop 的最小实现；
- `source/5.dynamic-height-virtual-list.html`：动态高度虚拟列表示例。

知识正文中的代码用于解释；`source/` 中的代码用于运行、验证和继续扩展。一个完整实现不应长期只存在于 Markdown 代码块中。

## 7. resource 保存 PDF 与其他附件资料

`resource/` 用于不适合作为 Markdown 知识正文持续维护的附件。目前主要包括：

- 网络、Node.js、算法等 PDF 学习资料；
- 官网开发和面试资料的 PDF 导出；
- 简历 PDF；
- 历史 Prompt 等辅助资料。

附件可以作为补充材料，但**长期有效的知识应该沉淀回 Markdown 正文**，再由 [知识体系索引.md](./知识体系索引.md) 连接，而不是依赖 PDF 成为唯一知识来源。

## 8. 新增内容时同时维护四种关系

新增、移动或实质修改文件后，至少检查四件事：

1. **知识关系**：是否需要进入 `知识体系索引.md`，以及它与哪些知识存在依赖或延伸；索引只能直接连接 `Full-Stack-AI-NOTES` 内部内容。
2. **上下文边界**：知识正文是否可以脱离具体项目独立阅读；项目实现是否通过正文中的实践入口关联，而不是直接写进索引。
3. **QA 关系**：是否影响已有问题，或者暴露了新的知识缺口。
4. **资源关系**：图片是否位于 `assets/`、代码是否位于 `source/`、PDF 等附件是否位于 `resource/`。
5. **证据关系**：关键事实是否有可靠来源，代码结论是否有实现、测试或运行证据。

最终目标不是让仓库拥有更多文件，而是让任何一个知识点都能沿着：

```text
索引 → 正文 → 实现 / 附件 → QA → 继续学习
```

被稳定地找到和复用。
