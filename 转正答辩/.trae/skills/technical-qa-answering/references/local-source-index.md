# 当前目录知识点定位索引

这份文档按“知识类型”重新梳理当前目录，目标是快速回答两个问题：

- 想复习某一类知识，应该去哪些目录？
- 每个目录大概对应哪些知识点，适合用来学什么？

## 一、总览

当前目录可以理解为四层资料：

| 层级 | 目录 | 定位 |
|---|---|---|
| 系统课程主线 | `20260207 AI大前端全栈架构师训练营课程课件` | 结构最完整，适合按章节系统学习 |
| 课程源码与随堂实践 | `20260207 随堂笔记与源码资料-压缩包` | 和课程课件配套，适合看 demo、跑代码、理解实现 |
| 个人专题沉淀 | `AI`、`工程化`、`调研学习` | 偏个人理解、专题调研和工程实践总结 |
| 历史笔记与面试资料 | `_posts` | 覆盖面广，适合查漏补缺、项目复盘、面试准备 |

使用建议：

- 先从 `20260207 AI大前端全栈架构师训练营课程课件` 找知识体系。
- 再到 `20260207 随堂笔记与源码资料-压缩包` 找对应代码和 notes。
- 最后到 `_posts`、`AI`、`工程化`、`调研学习` 找补充资料、项目表达和面试材料。

## 二、按知识类型定位

### 1. 前端基础：HTML、CSS、浏览器基础

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 系统课程 | `20260207 AI大前端全栈架构师训练营课程课件/2.前端核心原理知识进阶/1.基于 Chrome 浏览器渲染原理.md` | 浏览器渲染流程、DOM、CSSOM、布局、绘制、合成、重排重绘 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/2.前端核心原理知识进阶/1.chrome-browser-notes` | 浏览器渲染相关测试页面和随堂材料 |
| 补充笔记 | `_posts/HTMLCSS/CSS核心内容.md` | CSS 基础、布局、样式能力 |
| 项目补充 | `_posts/Project/Web渲染架构.md` | 项目视角下的 Web 渲染架构理解 |

快速查找：

- 想理解浏览器如何渲染页面，看 `基于 Chrome 浏览器渲染原理.md`。
- 想补 CSS 基础，看 `_posts/HTMLCSS/CSS核心内容.md`。
- 想把渲染原理和项目结合，看 `_posts/Project/Web渲染架构.md`。

### 2. JavaScript 基础与核心机制

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 系统课程 | `20260207 AI大前端全栈架构师训练营课程课件/2.前端核心原理知识进阶` | 作用域、执行过程、V8、异步、面向对象、函数式编程 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/2.前端核心原理知识进阶/2.js-execute-notes` | 作用域、this、箭头函数、闭包代码示例 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/2.前端核心原理知识进阶/4.async-notes` | callback、Promise、async/await、Generator、Promise A+ |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/2.前端核心原理知识进阶/5.oop-notes` | 原型、继承、new、call、bind、构造函数 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/2.前端核心原理知识进阶/6.fp-notes` | 纯函数、缓存、柯里化、组合 |
| 补充笔记 | `_posts/JavaScript/JavaScript核心总结.md` | JS 基础、数据类型、类型转换、运算符等 |
| 面试资料 | `_posts/Resource/面试题/web-interview-master/docs/JavaScript` | JS 高频面试题：闭包、原型、事件循环、拷贝、防抖节流等 |

快速查找：

- 想复习 JS 基础语法和类型，看 `_posts/JavaScript/JavaScript核心总结.md`。
- 想深入作用域、闭包、this，看课程 `2.作用域与 JavaScript 执行过程深度解析.md` 和随堂 `2.js-execute-notes`。
- 想看异步实现和 Promise 练习，看随堂 `4.async-notes`。
- 想准备面试题，看 `_posts/Resource/面试题/web-interview-master/docs/JavaScript`。

### 3. V8、运行时与底层执行

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 系统课程 | `20260207 AI大前端全栈架构师训练营课程课件/2.前端核心原理知识进阶/3.JavaScript V8 引擎原理详解.md` | V8 执行流程、编译、优化、垃圾回收 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/2.前端核心原理知识进阶/3.v8-notes` | V8 demo、数组扩展、Torque 示例、Node 事件示例 |
| Node 补充 | `_posts/NodeJS/NodeJS核心总结.md` | Node 运行时、模块、服务端 JS 基础 |

快速查找：

- 想理解 JS 为什么能执行，看 `JavaScript V8 引擎原理详解.md`。
- 想看 V8 实验代码，看随堂 `3.v8-notes`。
- 想了解 Node 运行时和模块，看 `_posts/NodeJS/NodeJS核心总结.md`。

### 4. ECMAScript、TypeScript、Babel 与编译原理

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 系统课程 | `20260207 AI大前端全栈架构师训练营课程课件/3.ECMAScript、Typescript 与编译原理详解` | ES 新特性、TS、编译器原理 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/3.ECMAScript、Typescript 与编译原理详解/1.ecma-notes` | let、Symbol、Set、Map、Class、Proxy、Reflect、Generator |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/3.ECMAScript、Typescript 与编译原理详解/2.typescript-notes` | TS 基础、tsconfig、Babel 编译 TS |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/3.ECMAScript、Typescript 与编译原理详解/3.babel-compiler-notes` | Babel 基础、自定义插件、编译工作流、公式编译 |
| 补充笔记 | `_posts/Project/TypeScript.md` | TypeScript 项目应用与总结 |

快速查找：

- 想复习 ES6+ 特性，看 `1.ecma-notes`。
- 想学 TypeScript，看课程 TS 文档和随堂 `2.typescript-notes`。
- 想理解 AST、Babel 插件、编译流程，看 `3.babel-compiler-notes`。

### 5. React 知识体系

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 系统课程 | `20260207 AI大前端全栈架构师训练营课程课件/4.React 核心知识进阶与源码剖析` | React19 基础、进阶、状态管理、路由、源码 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/4.React 核心知识进阶与源码剖析/1.react-basic-notes` | React 基础示例 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/4.React 核心知识进阶与源码剖析/2.react-advanced-notes` | React 进阶特性示例 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/4.React 核心知识进阶与源码剖析/3.react-state-notes` | React 状态管理 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/4.React 核心知识进阶与源码剖析/4.react-router-notes` | React Router |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/4.React 核心知识进阶与源码剖析/5.react-sourcecode-1-notes` | React 源码第一部分 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/4.React 核心知识进阶与源码剖析/6.react-sourcecode-2-notes` | React 源码第二部分 |
| 面试资料 | `_posts/Resource/面试题/web-interview-master/docs/React` | React 高频面试题 |

快速查找：

- 想系统学 React，看课程 `4.React 核心知识进阶与源码剖析`。
- 想看代码和 demo，看随堂 `react-*-notes`。
- 想准备 React 面试，看 `_posts/Resource/面试题/web-interview-master/docs/React`。
- 想重点突破源码，看 `React 源码解读【一】.md`、`React 源码解读【二】.md` 和随堂 sourcecode notes。

### 6. Vue 知识体系

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 系统课程 | `20260207 AI大前端全栈架构师训练营课程课件/5.Vue 核心知识进阶与源码剖析` | Vue3 基础、进阶、状态管理、路由、源码 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/5.Vue 核心知识进阶与源码剖析/1.vue-basic-notes` | Vue 基础、Vue CLI、Vite 项目 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/5.Vue 核心知识进阶与源码剖析/2.vue-advanced-notes` | Vue 进阶 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/5.Vue 核心知识进阶与源码剖析/3.vue-state-notes` | Vue 状态管理 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/5.Vue 核心知识进阶与源码剖析/4.vue-router-notes` | Vue Router |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/5.Vue 核心知识进阶与源码剖析/5.vue3-sourcecode-notes` | Vue3 源码、响应式、运行时 |
| 面试资料 | `_posts/Resource/面试题/Vue高频面试题.pdf` | Vue 高频面试题 |

快速查找：

- 想系统学 Vue3，看课程 `5.Vue 核心知识进阶与源码剖析`。
- 想看 Vue 项目和源码练习，看随堂 `vue-*-notes`。
- 想重点学响应式和源码，看 `5.vue3-sourcecode-notes`。

### 7. 前端工程化与构建工具

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 系统课程 | `20260207 AI大前端全栈架构师训练营课程课件/6.前端工程化设计` | Vite、Webpack、构建工具选型、工程化设计 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/6.前端工程化设计/1.vite-notes` | Vite 基础、配置、插件、原理 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/6.前端工程化设计/2.webpack-notes` | Webpack 基础、loader、plugin、构建流程 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/6.前端工程化设计/3.multi-bundler-notes` | 多构建工具选型 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/6.前端工程化设计/4.project-architecture-notes` | 项目架构、前后端工程结构 |
| 补充资源 | `_posts/Resource/vite-notes` | Vite 补充笔记 |
| 补充资源 | `_posts/Resource/project-architecture-notes` | 前端、后端、全栈项目架构示例 |

快速查找：

- 想学 Vite，看课程 Vite 文档、随堂 `1.vite-notes`、`_posts/Resource/vite-notes`。
- 想学 Webpack，看课程 Webpack 文档和随堂 `2.webpack-notes`。
- 想看完整项目架构，看 `4.project-architecture-notes` 和 `_posts/Resource/project-architecture-notes`。

### 8. Git、版本管理与团队协作

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 个人沉淀 | `工程化/版本管理.md` | Git 分支、提交、merge/rebase、冲突、回滚、tag、发布流程 |
| 面试资料 | `_posts/Resource/面试题/web-interview-master/docs/git` | Git 高频问题、命令区别、冲突处理 |

快速查找：

- 日常开发 Git 操作，看 `工程化/版本管理.md`。
- 想准备 Git 面试题，看 `_posts/Resource/面试题/web-interview-master/docs/git`。
- 想理解 merge 和 rebase 的差异，看 `工程化/版本管理.md` 中“功能分支同步最新主分支”部分。

### 9. 性能优化

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 系统课程 | `20260207 AI大前端全栈架构师训练营课程课件/7.AI大前端全栈架构之性能专项优化` | 资源优化、构建优化、Vue/React 性能、极端性能 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/7.AI大前端全栈架构之性能专项优化/1.assets-perf-notes` | 资源优化 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/7.AI大前端全栈架构之性能专项优化/2.bundle-perf-notes` | 编译构建与打包优化 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/7.AI大前端全栈架构之性能专项优化/3.vue-pref-notes` | Vue 应用性能 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/7.AI大前端全栈架构之性能专项优化/4.react-perf-notes` | React 应用性能 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/7.AI大前端全栈架构之性能专项优化/5.extreme-perf-notes` | 长任务、FPS、调度器、卡顿监控、虚拟列表、Canvas 表格 |
| 补充资源 | `_posts/Resource/extreme-perf-notes` | 极端性能 demo、WASM、Canvas、文件切片 |
| 项目补充 | `_posts/Project/动态高虚拟列表_报告.md` | 动态高虚拟列表性能案例 |

快速查找：

- 想复习性能优化体系，看课程 `7.AI大前端全栈架构之性能专项优化`。
- 想找极端性能 demo，看随堂 `5.extreme-perf-notes` 和 `_posts/Resource/extreme-perf-notes`。
- 想找虚拟列表案例，看 `_posts/Project/动态高虚拟列表_报告.md`。

### 10. 网络、WebSocket 与实时通信

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 项目专题 | `_posts/Project/11-Websocket从0到1.md` | WebSocket 基础、连接、通信机制 |
| 项目复盘 | `_posts/Project/走航车项目.md` | 实时链路不稳定、心跳、重连、补偿、乱序、时间驱动同步 |
| 项目总览 | `_posts/Project/项目概述.md` | 走航车、能源平台、漏洞检测、官网项目概览 |
| 网络资料 | `_posts/NodeJS/计算机网络.pdf` | 计算机网络基础 |
| 面试资料 | `_posts/Resource/面试题/网络面经总结.pdf` | 网络面试题 |
| 面试资料 | `_posts/NodeJS/1.6W字！梳理50道经典计算机网络面试题（收藏版）.pdf` | 网络高频面试题 |

快速查找：

- 想学 WebSocket 基础，看 `_posts/Project/11-Websocket从0到1.md`。
- 想看真实项目中的实时链路治理，看 `_posts/Project/走航车项目.md`。
- 想准备网络面试，看网络相关 PDF。

### 11. 数据可视化、地图与图表

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 项目专题 | `_posts/Project/12-ECharts从0到1.md` | ECharts 基础和使用 |
| 项目专题 | `_posts/Project/二维地图绘制.md` | 二维地图绘制、地图可视化 |
| 项目复盘 | `_posts/Project/走航车项目.md` | OpenLayer 地图、车辆轨迹、实时气体数据 |
| 项目复盘 | `_posts/Project/能源平台项目.md` | 能源数据分布、地图瓦片、大规模数据渲染 |
| 项目总览 | `_posts/Project/项目概述.md` | 项目级技术背景和表达 |

快速查找：

- 想查 ECharts，看 `_posts/Project/12-ECharts从0到1.md`。
- 想查地图渲染，看 `_posts/Project/二维地图绘制.md`。
- 想看地图和实时数据项目，看 `_posts/Project/走航车项目.md`、`_posts/Project/能源平台项目.md`。

### 12. Nuxt、SEO 与官网项目

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| Nuxt 专题 | `_posts/Nuxt/SEO 工程体系.md` | Nuxt、SEO、元信息、服务端/混合渲染 |
| Nuxt 实践 | `_posts/Nuxt/实战记录.md` | Nuxt 项目实践记录 |
| 项目复盘 | `_posts/Project/官网开发.md` | 官网项目、SEO 工程化、首屏优化 |
| 项目总览 | `_posts/Project/项目概述.md` | 官网项目面试表达 |

快速查找：

- 想学 Nuxt SEO，看 `_posts/Nuxt/SEO 工程体系.md`。
- 想看官网项目表达，看 `_posts/Project/官网开发.md`。

### 13. Node.js、后端与数据库

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| Node 笔记 | `_posts/NodeJS/NodeJS核心总结.md` | Node.js 核心知识 |
| Node 资料 | `_posts/NodeJS/NodeJS常用模块.pdf` | Node 常用模块 |
| 后端学习 | `_posts/后端学习/Django从0到1.md` | Django 后端入门 |
| 数据库 | `_posts/后端学习/DATABASE.md` | 数据库基础 |
| 项目架构 | `_posts/Resource/project-architecture-notes/project-architecture-notes/2.backend` | NestJS 后端项目结构 |
| 全栈架构 | `_posts/Resource/project-architecture-notes/project-architecture-notes/3.fullstack` | 全栈项目结构 |

快速查找：

- 想看 Node 基础，看 `_posts/NodeJS/NodeJS核心总结.md`。
- 想看 Django 和数据库，看 `_posts/后端学习`。
- 想看后端项目结构，看 `_posts/Resource/project-architecture-notes`。

### 14. AI Agent、AI 提效与 AI 工程化

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 系统课程 | `20260207 AI大前端全栈架构师训练营课程课件/8.AI 提效与 AI Agent 开发进阶` | 团队 AI 提效、Agent 基础、LangChain、LangGraph、RAG、PEFT、deepagents |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/8.AI 提效与 AI Agent 开发进阶/1.ai-team-notes` | AI 团队提效随堂笔记、codex skill |
| 个人沉淀 | `AI/AI 核心工具体系.md` | Prompt、Skill、MCP、Tools、CLI、Agent Runtime 分层 |
| 个人沉淀 | `AI/AI 学习核心问题.md` | AI 提效、Agent、SDD、Harness、团队落地问题 |
| 个人沉淀 | `AI/第一篇 AI Agent 开发报告.md` | Agent 分层、Prompt Engineering、Context Engineering、Harness Engineering |
| 历史专题 | `_posts/AI/AI团队赋能` | AI Agent、AI-DLC、Spec Kit、Figma MCP、Codex、AGENTS |
| Agent 设计 | `_posts/AI/agentic-design-patterns` | Agentic Design Patterns、工具使用、规划、多 Agent、记忆、RAG、MCP |
| Skills 专题 | `_posts/AI/agent-skills-with-anthropic` | Skills 设计、Skills vs Tools/MCP/Subagents、自定义 Skill |
| AI 总结 | `_posts/AI/Skills从0到1完整指南.md` | Skills 从 0 到 1 |
| AI 工具 | `_posts/Resource/codex/CodeX使用教程.md` | Codex 使用 |
| AI 工具 | `_posts/Resource/copilot` | Copilot 教程 |

快速查找：

- 想理解 AI Agent 总体架构，看 `AI/第一篇 AI Agent 开发报告.md`。
- 想区分 Prompt、Skill、MCP、Tools、CLI，看 `AI/AI 核心工具体系.md`。
- 想学习 Agent 设计模式，看 `_posts/AI/agentic-design-patterns`。
- 想学习 Skill 机制，看 `_posts/AI/agent-skills-with-anthropic` 和 `_posts/AI/Skills从0到1完整指南.md`。
- 想看团队 AI 提效和 AI-DLC，看 `_posts/AI/AI团队赋能`。

### 15. MCP、CLI、飞书与授权调研

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 调研目录 | `调研学习` | Lark CLI、飞书授权、OpenAPI、sandbox、token broker |
| 飞书授权 | `调研学习/飞书-Lark-CLI-与-Web-授权流程整理.md` | 飞书 Web 授权和 Lark CLI 授权流程 |
| Lark CLI | `调研学习/Lark-CLI-登录验证与OpenAPI工作流.md` | Lark CLI 登录、验证、OpenAPI 工作流 |
| Lark CLI | `调研学习/lark-cli-notes.md` | Lark CLI 使用笔记 |
| BAM 授权 | `调研学习/AimiBAM 飞书服务授权逻辑.md` | AimiBAM 飞书服务授权逻辑 |
| OAuth Demo | `调研学习/lark-oauth-demo` | OAuth demo 和授权代码实验 |
| Sandbox 测试 | `调研学习/lark-cli-sandbox-stage-runs`、`调研学习/lark-cli-sandbox-token-broker-runs` | sandbox 登录状态迁移、token broker 测试记录 |

快速查找：

- 想查飞书授权链路，看 `调研学习/飞书-Lark-CLI-与-Web-授权流程整理.md`。
- 想查 Lark CLI 工作流，看 `调研学习/Lark-CLI-登录验证与OpenAPI工作流.md`。
- 想看实验记录，看 `lark-cli-sandbox-*` 目录。

### 16. 音视频、FFmpeg 与类剪映项目

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 系统课程 | `20260207 AI大前端全栈架构师训练营课程课件/9.音视频基础与开发进阶` | 音视频底层原理、FFmpeg、滤镜系统、媒体处理 |
| 系统课程 | `20260207 AI大前端全栈架构师训练营课程课件/10.企业级类剪映视频智能剪辑工具架构设计与实践` | 类剪映项目需求、架构、AI Coding、UI 评审、面试突击 |
| 随堂实践 | `20260207 随堂笔记与源码资料-压缩包/10.企业级类剪映视频智能剪辑工具架构设计与实践` | miaoma magicut notes、demo、计划文档、pen 文件 |

快速查找：

- 想学 FFmpeg，看 `9.音视频基础与开发进阶`。
- 想学视频剪辑工具架构，看 `10.企业级类剪映视频智能剪辑工具架构设计与实践`。
- 想看类剪映项目 demo 和执行过程，看随堂 `miaoma-magicut-*` 目录。

### 17. 项目复盘与面试表达

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 项目总览 | `_posts/Project/项目概述.md` | 走航车、能源平台、漏洞检测、官网等项目概述 |
| 走航车 | `_posts/Project/走航车项目.md` | WebSocket、OpenLayer、ECharts、实时链路治理 |
| 能源平台 | `_posts/Project/能源平台项目.md` | 地图瓦片、大规模数据、渲染优化 |
| 漏洞项目 | `_posts/Project/漏洞虚拟化项目.md` | Python + Qt 客户端、交付闭环 |
| 官网项目 | `_posts/Project/官网开发.md` | Nuxt、SEO、首屏优化 |
| 面试表达 | `_posts/Project/项目场景回答要点.md` | 项目场景化回答 |
| 面试扩展 | `_posts/Project/项目扩展面试题.md` | 项目追问和扩展题 |
| 面试记录 | `_posts/Project/面试记录.md`、`_posts/Project/AI面试记录` | 模拟面试和真实面试记录 |

快速查找：

- 想准备项目自我介绍，看 `_posts/Project/项目概述.md`。
- 想准备走航车项目，看 `_posts/Project/走航车项目.md`。
- 想准备项目追问，看 `_posts/Project/项目扩展面试题.md`。
- 想复盘面试表现，看 `_posts/Project/面试记录.md` 和 `AI面试记录`。

### 18. 算法、手写题与通用面试题

| 用途 | 对应目录或文档 | 可定位内容 |
|---|---|---|
| 算法题 | `_posts/Project/力扣100题.md` | LeetCode 100 题 |
| 算法题 | `_posts/Project/力扣100题.pdf` | 算法 PDF 版 |
| 手写题 | `_posts/Resource/面试题/手写代码.pdf` | 前端手写代码题 |
| 综合面试 | `_posts/Resource/面试题/面试问题总结.pdf` | 综合面试问题 |
| Web 面试 | `_posts/Resource/面试题/web-interview-master/docs` | JS、React、Git 等分类面试题 |

快速查找：

- 想刷算法，看 `_posts/Project/力扣100题.md`。
- 想练手写题，看 `_posts/Resource/面试题/手写代码.pdf`。
- 想做综合面试复习，看 `_posts/Resource/面试题`。

## 三、快速定位清单

| 如果你想找 | 优先去这里 |
|---|---|
| 浏览器渲染原理 | `20260207 AI大前端全栈架构师训练营课程课件/2.前端核心原理知识进阶/1.基于 Chrome 浏览器渲染原理.md` |
| JS 作用域、this、闭包 | `20260207 随堂笔记与源码资料-压缩包/2.前端核心原理知识进阶/2.js-execute-notes` |
| Promise、async/await | `20260207 随堂笔记与源码资料-压缩包/2.前端核心原理知识进阶/4.async-notes` |
| 原型、继承、new、bind | `20260207 随堂笔记与源码资料-压缩包/2.前端核心原理知识进阶/5.oop-notes` |
| 函数式编程 | `20260207 随堂笔记与源码资料-压缩包/2.前端核心原理知识进阶/6.fp-notes` |
| V8 原理 | `20260207 AI大前端全栈架构师训练营课程课件/2.前端核心原理知识进阶/3.JavaScript V8 引擎原理详解.md` |
| TypeScript | `20260207 AI大前端全栈架构师训练营课程课件/3.ECMAScript、Typescript 与编译原理详解/2.Typescript 基础进阶与编译器详解.md` |
| Babel / AST / 编译器 | `20260207 随堂笔记与源码资料-压缩包/3.ECMAScript、Typescript 与编译原理详解/3.babel-compiler-notes` |
| React 基础和源码 | `20260207 AI大前端全栈架构师训练营课程课件/4.React 核心知识进阶与源码剖析` |
| Vue 基础和源码 | `20260207 AI大前端全栈架构师训练营课程课件/5.Vue 核心知识进阶与源码剖析` |
| Vite | `20260207 随堂笔记与源码资料-压缩包/6.前端工程化设计/1.vite-notes` |
| Webpack | `20260207 随堂笔记与源码资料-压缩包/6.前端工程化设计/2.webpack-notes` |
| 项目架构 | `20260207 随堂笔记与源码资料-压缩包/6.前端工程化设计/4.project-architecture-notes` |
| Git 版本管理 | `工程化/版本管理.md` |
| 性能优化 | `20260207 AI大前端全栈架构师训练营课程课件/7.AI大前端全栈架构之性能专项优化` |
| 极端性能 demo | `20260207 随堂笔记与源码资料-压缩包/7.AI大前端全栈架构之性能专项优化/5.extreme-perf-notes` |
| WebSocket 项目 | `_posts/Project/走航车项目.md` |
| 地图可视化 | `_posts/Project/二维地图绘制.md`、`_posts/Project/能源平台项目.md` |
| ECharts | `_posts/Project/12-ECharts从0到1.md` |
| Nuxt SEO | `_posts/Nuxt/SEO 工程体系.md` |
| AI Agent 架构 | `AI/第一篇 AI Agent 开发报告.md` |
| Prompt / Skill / MCP / Tools / CLI | `AI/AI 核心工具体系.md` |
| AI-DLC / Spec Kit | `_posts/AI/AI团队赋能` |
| Agent 设计模式 | `_posts/AI/agentic-design-patterns` |
| Skills 机制 | `_posts/AI/agent-skills-with-anthropic` |
| Codex / Copilot | `_posts/Resource/codex`、`_posts/Resource/copilot` |
| 飞书授权 / Lark CLI | `调研学习` |
| FFmpeg / 音视频 | `20260207 AI大前端全栈架构师训练营课程课件/9.音视频基础与开发进阶` |
| 类剪映视频编辑器 | `20260207 AI大前端全栈架构师训练营课程课件/10.企业级类剪映视频智能剪辑工具架构设计与实践` |
| 项目面试表达 | `_posts/Project/项目概述.md`、`_posts/Project/项目场景回答要点.md` |
| 算法与手写题 | `_posts/Project/力扣100题.md`、`_posts/Resource/面试题/手写代码.pdf` |

## 四、推荐使用方式

### 系统学习

按课程目录走：

```text
2.前端核心原理知识进阶
  ↓
3.ECMAScript、Typescript 与编译原理详解
  ↓
4.React 核心知识进阶与源码剖析
  ↓
5.Vue 核心知识进阶与源码剖析
  ↓
6.前端工程化设计
  ↓
7.性能专项优化
  ↓
8.AI 提效与 AI Agent 开发进阶
  ↓
9.音视频基础与开发进阶
  ↓
10.类剪映视频智能剪辑工具架构设计与实践
```

### 查漏补缺

按 `_posts` 分类找：

```text
_posts/JavaScript      → JS 基础
_posts/HTMLCSS         → CSS
_posts/NodeJS          → Node 和网络
_posts/Nuxt            → Nuxt 和 SEO
_posts/Project         → 项目、可视化、面试表达
_posts/AI              → AI Agent、AI-DLC、Skills、MCP
_posts/Resource        → 面试题、Codex、Copilot、性能 demo、架构 demo
```

### 项目面试准备

优先看：

```text
_posts/Project/项目概述.md
_posts/Project/走航车项目.md
_posts/Project/能源平台项目.md
_posts/Project/官网开发.md
_posts/Project/项目场景回答要点.md
_posts/Project/项目扩展面试题.md
```

### AI Agent 方向

优先看：

```text
AI/AI 核心工具体系.md
AI/AI 学习核心问题.md
AI/第一篇 AI Agent 开发报告.md
_posts/AI/AI团队赋能
_posts/AI/agentic-design-patterns
_posts/AI/agent-skills-with-anthropic
20260207 AI大前端全栈架构师训练营课程课件/8.AI 提效与 AI Agent 开发进阶
```

## 五、目录使用结论

当前目录最适合按两条线使用：

第一条是“前端架构师主线”：

```text
JS 底层 → 框架源码 → 工程化 → 性能优化 → 项目架构 → 项目面试表达
```

第二条是“AI Agent 工程化主线”：

```text
Prompt → Context → Tools → MCP → Skill → CLI/TUI → Agent Runtime → SDD → Harness Engineering
```

如果目标是快速定位资料，优先使用本文的“按知识类型定位”和“快速定位清单”。如果目标是系统学习，优先按课程目录推进，再用 `_posts` 和个人专题目录补充。
