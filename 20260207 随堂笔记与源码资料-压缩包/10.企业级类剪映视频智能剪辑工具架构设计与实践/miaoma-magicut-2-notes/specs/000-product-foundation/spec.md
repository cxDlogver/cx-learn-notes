# 000 Product Foundation Spec

## 目标

- 建立 `miaoma-magicut` 的工程规范、目录规范、视觉基线和首批 feature 顺序。
- 为后续 AI Agent 实现任务提供稳定上下文。

## 范围

- 范围内：工程宪法、模板、根配置、基础校验脚本、规划文档索引。
- 范围外：完整 Electron 功能、FFmpeg 导出、AI 推理。
- 不做事项：不创建数据库，不引入服务端账号系统。

## 用户场景

- Given：开发者准备开始实现功能。
- When：读取 `.vibe/constitution.md` 与对应 feature spec。
- Then：能明确当前任务的边界、约束和验收方式。

## 非功能要求

- 文档必须是简体中文。
- 根配置必须支持后续 npm workspaces。
- 基础校验不依赖第三方 npm 包。

