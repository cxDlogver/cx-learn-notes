# 001 Desktop Shell Spec

## 目标

- 建立 Electron Forge + Vite + Vue3 + shadcn-vue 风格桌面壳。
- 提供安全 preload API，为后续素材导入、FFmpeg、AI 编排接入做准备。

## 范围

- 范围内：Electron Forge 应用壳、Vite main/preload/renderer 配置、Electron 主进程、preload、Renderer 入口、暗色剪辑台 UI、基础 typed IPC。
- 范围外：真实文件导入、真实 FFmpeg 调用、真实 AI 推理。
- 不做事项：不实现生产打包签名，不接入数据库。

## 用户场景

- Given：用户打开应用。
- When：桌面壳加载完成。
- Then：看到类剪映布局：左侧素材/脚本区、中间预览、右侧 AI/属性区、底部时间线。

## 非功能要求

- Renderer 不能直接使用 Node API。
- `contextIsolation` 必须启用。
- UI 默认暗色主题。
