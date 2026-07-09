# 001 Desktop Shell Plan

## 技术方案

- `apps/desktop/forge.config.ts` 负责 Electron Forge 打包、maker 和 Vite 插件配置。
- `vite.main.config.ts`、`vite.preload.config.ts`、`vite.renderer.config.ts` 分别负责主进程、preload 和 Vue Renderer 构建。
- `apps/desktop/src/main` 负责 Electron 主进程和 IPC。
- `apps/desktop/src/preload` 通过 `contextBridge` 暴露 `window.miaoma`。
- `apps/desktop/src/renderer` 负责 Vue UI。
- `packages/shared` 提供 API 类型。

## IPC/API

- `app:get-version`：读取应用版本。
- `project:get-current`：读取当前项目摘要占位。
- `ai:get-capabilities`：读取 AI 编排能力占位。

## 测试策略

- 裸 Node 环境先跑 `scripts/validate-foundation.mjs`。
- 依赖安装后跑 typecheck、`electron-forge start` 和 Playwright 截图。
