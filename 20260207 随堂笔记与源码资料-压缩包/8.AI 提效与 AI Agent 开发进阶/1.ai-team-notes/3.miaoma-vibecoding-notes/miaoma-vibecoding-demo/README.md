# 大厂前端 AI 工程化与组件库基建公开课 Demo

这是一个用于 60 分钟公开课的预置演示工程，展示如何把团队组件库知识通过 MCP 暴露给 Codex，让 AI 编码能够理解并使用私有前端基建。

## 项目结构

```text
.
├── apps/demo                         # Vite React 示例应用
├── packages/ui                       # React + TypeScript + tsup 组件库
├── mcp/component-library-server      # 组件库知识 MCP Server
└── docs                              # 课程大纲、讲稿和演示脚本
```

## 快速开始

```bash
npm install
npm run build
npm run dev:demo
```

Demo 应用默认运行在 `http://127.0.0.1:5173`。

## MCP Server

本地启动组件库 MCP：

```bash
npm run dev:mcp
```

当前项目已经提供项目级 Codex 配置：[.codex/config.toml](.codex/config.toml)。
在项目根目录启动 Codex 后，`/mcp` 应能看到 `demo-component-library`。

该配置直接启动已构建的 MCP 入口。修改 MCP 源码后先执行：

```bash
npm run build:mcp
```

## 课程材料

- [60 分钟课程大纲](docs/course-outline.md)
- [PPT 页纲](docs/slides-outline.md)
- [讲稿要点](docs/speaker-notes.md)
- [现场演示脚本](docs/demo-script.md)
