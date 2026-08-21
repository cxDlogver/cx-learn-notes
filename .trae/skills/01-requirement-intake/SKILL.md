---
name: requirement-intake
description: 前端需求入口整理。用于在已创建任务空间后，基于 prd-source、用户输入和仓库上下文生成标准输入包、缺失材料清单和初始风险。
---

# Requirement Intake

## Purpose

将零散输入整理成后续阶段可复用、可追踪、可恢复的标准输入包。该 skill 不负责创建任务空间，也不负责深入 PRD 拆解。

## Mandatory Precheck

执行前必须读取：

- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `prd-source.md`
- 当前 workspace 下与 `prd-source.md`、`tech-doc-raw.md` 等 Markdown 相邻的资源目录，如 `prd-source/`、`prd-source.assets/`、`tech-doc-raw/`、`tech-doc-raw.assets/`（如存在）

如果没有 workspace 或没有 `prd-source.md`：

- 必须暂停。
- 要求用户先执行 `/delivery:init <PRD链接或需求描述>`。
- 不得只基于链接标题继续分析。

## Inputs

可能包括：

- PRD 原文：`prd-source.md`
- PRD 原文资源目录：`prd-source/` 或 `prd-source.assets/`（如存在）
- 用户补充说明
- 设计稿、白板、截图
- 后端技术文档、接口文档，以及其资源目录：`tech-doc-raw/` 或 `tech-doc-raw.assets/`（如存在）
- 群聊记录、评论、会议纪要
- 相关仓库、分支、历史 MR

## Steps

1. 读取 `prd-source.md`，同时检查同级资源目录和 Markdown 相对链接，提取来源、标题、背景、目标、明显模块。
2. 对 `prd-source.md` 正文、评论区、相对链接和已导入补充文档做一次**设计源发现**。先检查 `## Raw Body` 是否为 Feishu / Lark 导出的 HTML 风格正文；若是，必须先**直接回读 `Raw Body` 原文片段**，禁止只依赖一次 `Grep` / 关键词搜索的负结果就得出“未找到设计源”。
3. 只有在完成 `Raw Body` 原文回读后，才允许输出 `FIGMA_FOUND` 或 `FIGMA_NOT_FOUND`。扫描失败、链接模糊、或未执行回读 → P0 暂停问用户。
4. 禁止因为“没有 Markdown 链接”“没有 `href=`”或“一次 `Grep` 未命中”就下结论为 `FIGMA_NOT_FOUND`；若 `Raw Body` 存在，必须以原文回读结果为准。
5. 读取 `PROJECT_CONTEXT.md`，确认仓库技术栈、目录、验证命令。
6. 生成输入来源表：类型、来源、状态、权威等级、摘要、待补充。
7. 识别缺失材料，按 P0/P1/P2 登记。
8. 记录资源目录是否已导入、链接是否可访问；图片、白板、附件等资源不得被当作可忽略材料。
9. 生成初始风险与下一步建议。
10. 更新：
   - `00-inputs.md`
   - `01-intake.md`
   - `uncertainty-register.md`
   - `.trae/DELIVERY_STATE.md`

## Output Contract

`00-inputs.md` 必须包含：

- 输入来源清单
- `design_source_status`、`design_source_locations`
- PRD 初始摘要
- 已识别模块草图
- 当前缺失材料
- 初始风险
- 下一步

`01-intake.md` 必须包含：

- 阶段目标
- 输入
- 过程摘要
- 结论
- 风险与未决问题
- Gate Check

## Gate

本阶段只判断是否允许进入 `/delivery:prd`。

- 如果 PRD 原文缺失：P0_BLOCKER，暂停提问。
- 如果尚未完成“直接回读 `Raw Body`”：P0_BLOCKER，暂停提问。
- 如果 `design_source_status` 不是 `FIGMA_FOUND` 也不是 `FIGMA_NOT_FOUND`：P0_BLOCKER，暂停提问（扫描失败或链接模糊）。
- 如果需求涉及核心 UI 改造（页面结构、业务域切换、页面级 Tab、筛选区、推荐区、工具栏、表格 / 列表、Drawer / Modal / Popover / Confirm 等），且 `design_source_status = FIGMA_NOT_FOUND`：P0_BLOCKER，暂停提问（核心 UI 改造必须有设计稿）。
- 禁止进入 `/delivery:plan` 或 `/delivery:code`。

## Pause Behavior

遇到 P0_BLOCKER 时，按 `.trae/AGENTS.md` 的 Pause and Ask Protocol 回复用户，并请求主 Agent 最小更新本地 `DELIVERY_STATE.md` 的 Pause State。
