---
name: brief-writer
description: Use this skill when writing course briefs, teaching notes, or module summaries for the DeepAgents course. It enforces a concise engineering-oriented structure.
module: scripts/index.ts
---

# brief-writer

## 使用场景

当用户要求生成 DeepAgents 课程 brief、模块讲义、讲师提示词或课堂总结时，使用本 skill。

## 输出结构

请按以下结构输出：

1. 目标：本段内容要让学员掌握什么。
2. 核心概念：列出 3-5 个关键点。
3. Demo 指向：说明应该运行哪个 `npm run demo:*` 命令。
4. 练习：给出一个可在 5 分钟内完成的改造任务。
5. 风险点：说明工程落地时最容易踩坑的位置。

## 可导入 helper

在 interpreter 中可以导入 brief skeleton：

```typescript
const { buildBriefSkeleton } = await import("@/skills/brief-writer/scripts");
buildBriefSkeleton("skills");
```
