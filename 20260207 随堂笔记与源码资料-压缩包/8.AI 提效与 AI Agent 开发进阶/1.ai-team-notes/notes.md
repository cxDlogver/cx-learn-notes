# 团队 AI 提效方案与实践


## AI大模型技术基础与前端行业演进

## 高级提示词工程：前端专属方法论

## 2026年前端AI提效工具矩阵全景

**Trae**/Qoder/CodeBuddy + **Codex**/Claude Code/OpenCode 结合用

## Codex（GPT-5.5）命令行完全指南

1. 安装 codex
2. taobao 买 codex，月 200 以内
    - baseUrl
    - key
3. 安装 CC-switch
4. 配置模型

### 使用

记住 / ，唤起所有命令

/init 初始化（codex AGENTS.md、 Claude code CLAUDE.md）
/model 选模型
/paln 规划，架构、设计、技术实现方案
    - 主要聊设计还原度，design.md、设计图（Pencil 100%）、公司组件库 MCP 化【codex 帮你把组件库开发 mcp 工具】
/compact 压缩上下文，解决上下文溢出问题

最高权限执行 `--dangerously-bypass-approvals-and-sandbox`

## AI核心能力体系：提示词/Tools/MCP/Skill/CLI概念解析

提示词、Tools 已经说了

1. MCP，标准化接口，比如说组件库想要让 AI 读懂并且基于它开发项目。你就需要将组件库组件 MCP 化，提供 MCP 能力
    - 组件库访问
    - 远程查天气
    - 地图导航
2. 自动化 scripts  -> skill（提示词 + scripts）
    - skill 自定义（skill creator）需求拆解、方案设计调研、review【回顾你以前怎么做 -> 教 AI 怎么做 -> AI 沉淀为 skill】
    - 步骤：plan 模式沟通
    - skill 节省 token、context 上下文
3. CLI AI 跟产品打交道最多的一种方式
    - 飞书 CLI
    - Anything-CLI https://github.com/HKUDS/CLI-Anything

## 团队规模化落地：全周期AI驱动与Spec驱动开发体系

1. 初始化与项目级通用规范定义【一次性】
2. 工作流拆解
    1. 需求评审
    2. 需求拆解
    3. 方案调研设计
    4. UI 设计
    5. 测试用例生成
    6. 编码（前后端） SDD 开发
    7. 代码审查验证
    8. 测试
    9. git 提交
