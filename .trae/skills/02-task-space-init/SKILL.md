---
name: task-space-init
description: 前端需求 artifacts workspace 初始化。用于创建或复用仓库根目录 artifacts 目录、导入既有 context、补齐阶段文档，并更新 DELIVERY_STATE。
---

# Task Space Init

## Purpose

为一次需求创建独立、可追踪、可恢复的 artifacts workspace。后续阶段必须围绕该 workspace 读写产物，不依赖聊天历史。

如果需求已经通过 `meego-init-workspace` 初始化出 `meego-<id>/context/` 和 `meego-<id>/repos/`，本 skill 只负责把 `context/` 的 artifacts 同名主文档及其实际引用资源导入仓库根目录的 `artifacts/<task>/`，并更新状态文件。不得整目录复制飞书 Extractor 资源，不得重复创建 Meego 工区、同步 agent / skill 仓库、拉取业务仓库或重跑已经完成的 Meego / repo-routing 初始化。

## Inputs

- 用户输入的 PRD 链接或需求描述。
- 可选：`meego-<id>/context/` 作为 `context_source`。
- 可选：`meego-<id>/repos/` 作为已初始化业务仓库位置。
- 当前日期。
- 当前仓库名、分支名。
- `.trae/PROJECT_CONTEXT.md`。

## Naming Rule

workspace 命名建议：

```text
artifacts/<yyyy-mm-dd>-<short-task-name>/
```

当存在 `meego-<id>/context/` 时，优先使用：

```text
artifacts/<meego-id>-<short-task-name>/
```

`short-task-name` 必须使用英文、数字和连字符，避免中文路径造成脚本兼容问题。

## Steps

1. 根据 PRD 标题、用户描述、Meego ID 或链接 token 生成 `short-task-name`。
2. 创建或复用仓库根目录的 `artifacts/<task>/` workspace。不得把 `meego-<id>/context/` 作为 workspace。
3. 必须优先执行 `.trae/scripts/init_artifacts_workspace.sh <artifacts-workspace>` 批量创建或复用初始化模板；不得再逐个手工初始化同一批模板文件。
4. 模板脚本负责创建以下文件：
   - `prd-source.md`：原始需求来源，若未拉取成功则写入待补状态。
   - `00-inputs.md`
   - `01-intake.md`
   - `02-task-space.md`
   - `03-prd-analysis.md`
   - `04-tech-plan.md`
   - `05-implementation-log.md`
   - `06-debug-verification.md`
   - `07-design-alignment.md`
   - `08-acceptance-report.md`
   - `ui-source-map.md`
   - `uncertainty-register.md`
   - `omission-risk-scan.md`
   - `decision-log.md`
5. 初始化文档时必须标记 `status: TEMPLATE_ONLY`，避免误判为阶段完成。
6. 如果存在 `context_source`，按 artifacts 同名导入规则导入已准备材料，并按 Markdown 引用逐文件导入资源。必须优先执行 `.trae/scripts/import_meego_context.sh <context_source> <artifacts-workspace>`；如果当前 checkout 中 `.trae/scripts/` 实际对应仓库根目录的 `scripts/`，则使用等价路径执行。
7. 更新 `.trae/DELIVERY_STATE.md`：
   - task_id
   - task_name
   - workspace = `artifacts/<task>/`
   - current_phase = init
   - current_command = /delivery:init
   - Pause State = false

## State Machine File

- `.trae/DELIVERY_STATE.md` 是唯一运行态状态机；不得在项目根目录创建或更新 `DELIVERY_STATE.md`。
- 如果 `.trae/DELIVERY_STATE.md` 不存在，先用 `references/delivery-state-template.md` 初始化，再填入当前任务信息。
- `references/delivery-state-template.md` 只能作为 init 阶段的模板资源；后续阶段不得直接修改该 reference 文件。
- 初始化完成后，`.trae/DELIVERY_STATE.md` 可以保留 `TEMPLATE_ONLY` 直到本阶段 Gate 真实通过；不得把模板 reference 当作阶段完成证据。

可导入的 context 主产物包括：

- `prd-source.md`
- `meego-summary.md`
- `repo-routing.md`
- `tech-doc-raw.md`
- `prd-summary.md`
- `prd-notes.md`
- `tech-design.md`
- `change-plan.md`

导入时必须保护已有阶段产物：

- 目标文件不存在时，写入 context 内容。
- 目标文件是 `TEMPLATE_ONLY` 时，允许替换为 context 内容，并移除模板状态。
- 目标文件已是 `DONE`、`PARTIAL_READY`、`BLOCKED` 或无模板标记时，不得覆盖；在 `02-task-space.md` 记录 skipped import。
- 无论是否覆盖，都必须在 `00-inputs.md` 记录 context 来源与导入状态。

`prd-source.md` 的权威来源优先级：

1. `context_source/prd-source.md`
2. `context_source/prd-raw.md` 作为历史兼容输入，导入后统一落为 artifacts `prd-source.md`
3. 用户输入的 PRD / 文档链接拉取结果
4. 用户直接输入的需求文本

如果 `context_source/prd-source.md` 存在，后续阶段必须以导入后的 `prd-source.md` 为 PRD 权威来源。若仅存在历史 `context_source/prd-raw.md`，也必须在 init 阶段导入为 artifacts `prd-source.md`，并把该兼容来源记录到 `00-inputs.md` / `02-task-space.md`。

## Context Resource Import

资源导入以“本次实际导入的 Markdown 文档”为根，只解析其中的本地相对链接，并递归处理被引用的 Markdown 文件。只复制本地引用闭包内的文件，保持相对路径不变。

资源导入规则：

- 不得整目录复制 `prd-source/`、`prd-source.assets/`、`tech-doc-raw/`、`tech-doc-raw.assets/` 或其他 Extractor 目录。
- 线上 URL 不属于 artifacts 资源导入对象。`http://`、`https://`、`mailto:`、`tel:`、`data:`、`javascript:`、锚点链接，以及编码或转义后仍表示线上 URL 的目标，必须作为外部链接保留在 Markdown 中，不得尝试按本地路径复制，也不得因线上 URL 不存在本地文件而阻塞 init。
- 只复制文档实际引用的图片、白板缩略图、白板分析、节点 JSON、附件及其他本地文件；被引用 Markdown 中继续引用的资源也要递归复制。
- 未被引用的 `raw/`、`logs/`、comments、parser_images、manifest、节点下载缓存、临时文件和其他中间产物不得导入。某个中间文件若被报告明确链接，只复制该文件。
- 目标资源不存在时写入；已存在时不覆盖，并在 `02-task-space.md` 记录 skipped resource import。
- 必须在 `00-inputs.md` 和 `02-task-space.md` 记录实际导入的资源文件列表，而不是笼统记录整个资源目录。
- 后续阶段读取 `prd-source.md`、`tech-doc-raw.md` 或补充文档时，必须检查 Markdown 相对链接指向的已导入资源；图片、白板和附件同样属于证据来源。

## Template Rule

初始化模板必须包含醒目标记：

```md
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。
```

阶段真正执行完成后，才允许改为：

```md
> status: DONE
```

或：

```md
> status: BLOCKED
```

## Gate

本阶段完成后只允许继续执行 requirement-intake 或 `/delivery:prd`。
禁止进入技术规划、代码实现、验证或验收。

## Output

只输出：

- workspace 路径
- 已创建文件
- 当前阶段
- 下一步：拉取 PRD 原文并执行 requirement-intake
