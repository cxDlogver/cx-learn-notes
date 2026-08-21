---
description: 初始化一次端到端前端需求交付流程，导入既有需求上下文、写入输入包，并更新 DELIVERY_STATE
argument-hint: <PRD链接或需求描述>
---

你现在必须按 `.trae/AGENTS.md` 的 Workflow Router Rules 执行端到端需求交付入口，不允许跳步。

用户输入：$ARGUMENTS

## Step 0：读取项目规则

如果 `.trae/DELIVERY_STATE.md` 不存在，必须先从 `.trae/skills/02-task-space-init/references/delivery-state-template.md` 创建初始状态机，再继续读取。状态机只允许放在 `.trae/DELIVERY_STATE.md`，不得在项目根目录创建或更新 `DELIVERY_STATE.md`。

必须先读取：

1. `.trae/AGENTS.md`
2. `.trae/PROJECT_CONTEXT.md`
3. `.trae/DELIVERY_STATE.md`
4. `.trae/skills/01-requirement-intake/SKILL.md`
5. `.trae/skills/02-task-space-init/SKILL.md`

## Step 1：解析或创建 artifacts workspace

执行 `task-space-init` skill。

在执行前必须先解析 artifacts 根目录：

1. 如果当前项目中存在 `/meego-{id}/context/` 目录：
   - 必须将该目录作为当前需求的 `context_source`。
   - 必须创建或复用 `artifacts/<meego-id>-<short-task-name>/` 作为正式 artifacts workspace。
   - 后续阶段产物、补充文档、阶段结论必须写入 `artifacts/<task>/`，不得写回 `meego-{id}/context/`。
   - 只有在当前项目中不存在匹配的 `/meego-{id}/context/` 时，才按 `task-space-init` 默认规则创建 `artifacts/<date>-<task-name>/`。
2. 如果存在多个 `/meego-{id}/context/`：
   - 必须优先选择与当前用户输入、Meego 链接、任务 id 对应的目录。
   - 若无法唯一确定，必须暂停提问，禁止自行猜测写入错误任务空间。
3. 本 command 的 context 导入规则优先级高于 `task-space-init` skill 的默认命名建议，但不得把 `context/` 本身设置为 `DELIVERY_STATE.workspace`。

必须创建：

- 当前解析出的 artifacts workspace
- `decision-log.md`
- `uncertainty-register.md`
- `00-inputs.md`
- `02-task-space.md`

上述初始化模板必须优先通过：

```bash
.trae/scripts/init_artifacts_workspace.sh <artifacts_workspace>
```

批量创建或复用；不得逐个手工补同一批模板文件。

如果 workspace 已存在，必须保留其中已有文件，只补齐缺失的初始化文件和本次导入索引；不得删除或覆盖后续阶段产物。

不得在本阶段重新执行已由 `meego-init-workspace` 完成的工区初始化动作，包括：

- 创建 `meego-{id}/context/` 或 `meego-{id}/repos/`
- 同步、clone 或 pull 团队 agent / skill 仓库
- 拉取目标业务仓库到 `repos/`
- 重跑 Meego 工作项读取、repo 路由或 PRD 抓取

## Step 2：拉取需求原文

如果 Step 1 已发现 `context_source`，必须先执行 context 导入，导入后再判断是否仍缺少 PRD 原文。

context 导入必须优先使用确定性脚本：

```bash
.trae/scripts/import_meego_context.sh <context_source> <artifacts_workspace>
```

如果当前 checkout 中 `.trae/scripts/` 实际对应仓库根目录的 `scripts/`，则使用等价路径执行该脚本。脚本失败时必须暂停并记录失败原因，不得手工猜测导入结果。

如果 `$ARGUMENTS` 是飞书、CloudDoc、PRD 或其他文档链接：

1. 飞书 / Lark 文档必须统一执行 `feishu-doc-extractor` 技能，不得另用 fetch-doc、Parser 或浏览器流程替代。
2. PRD 指定 `artifact_base=prd-source`，先在 Extractor 规范的 staging 输出目录完成完整抽取和 Gate，再把最终报告保存为当前 workspace 的 `prd-source.md`，并使用 `.trae/scripts/copy_markdown_references.mjs` 从 staging 输出逐文件导入引用资源。不得让 Extractor 的完整资源目录直接落入 artifacts workspace。
3. artifacts 中只保留 `prd-source.md` 实际引用的资源文件；不导入未引用 raw、logs、manifest、下载缓存或其他中间文件。
4. 如果 Extractor Gate 未通过，必须执行 Pause and Ask Protocol：暂停并向用户提问，禁止只基于标题继续分析。

如果 `$ARGUMENTS` 是自然语言需求：

1. 将其写入 `prd-source.md`。
2. 标记来源为用户直接输入。

从 Extractor staging 导入时，先复制最终 `.md` 主文件，再执行引用资源导入：

```bash
node .trae/scripts/copy_markdown_references.mjs \
  --source <extractor-output-folder> \
  --dest <artifacts-workspace> \
  --entry prd-source.md
```

技术文档将 entry 改为 `tech-doc-raw.md`。该工具只复制主文档引用闭包内的文件；缺失的本地引用会使导入失败。

## Step 2.5：准备补充材料

在执行 requirement-intake 之前，必须主动准备当前需求的补充文档，且**文档来源优先级**如下：

1. 当前项目下匹配的 `/meego-{id}/context/`
2. 用户当前输入显式补充的链接或路径
3. PRD 原文中引用的补充文档链接
4. 其他内部 CLI / MCP / 仓库工具可发现的来源

必须优先检查 `/meego-{id}/context/` 中是否已存在：

- PRD 摘要 / PRD 原文
- repo-routing / 任务空间说明
- 后端技术文档
- API 文档
- 设计稿补充说明
- 其他会补充具体需求点的飞书文档、表格、wiki

如果 `context/` 中已存在可复用文档：

1. 必须优先将其导入 `artifacts/<task>/` 输入包。
2. 不得跳过这些已有文档而直接只读主 PRD。
3. 对于后端技术文档，必须在 init 阶段就完成"已获取 / 未获取"判断，并记录来源。

context 导入必须遵守 `task-space-init` 的 artifacts 同名导入规则。`meego-init-workspace` 产出的 context 主文件必须已经采用 artifacts 侧命名。

导入要求：

1. 如果目标 artifacts 文件不存在，直接从 `context_source` 同名复制内容。
2. 如果目标 artifacts 文件已存在且不是 `TEMPLATE_ONLY`，不得覆盖；必须在 `00-inputs.md` 记录该 context 文件已作为外部证据保留。
3. 如果 `prd-source.md` 已存在但仍是 `TEMPLATE_ONLY`，且 `context/prd-source.md` 存在，必须用 `context/prd-source.md` 替换模板内容。
4. 如果 `context/prd-source.md` 不存在但存在历史 `context/prd-raw.md`，必须将其作为兼容输入导入为 artifacts `prd-source.md`，并在 `00-inputs.md` / `02-task-space.md` 记录“legacy fallback imported as artifacts/prd-source.md”；不得回写或重命名 `context/` 原文件。
5. 资源迁移必须按 Markdown 引用逐文件执行：从本次实际导入的 `.md` 文件只解析本地相对链接，只复制这些本地链接直接或递归引用的资源，并保持原相对路径。线上 URL 不属于资源复制对象，`http://`、`https://`、`mailto:`、`tel:`、`data:`、`javascript:`、锚点链接，以及编码或转义后仍表示线上 URL 的目标，必须保留为外部链接，不得按本地路径复制，也不得因线上 URL 不存在本地文件而阻塞 init。不得整目录复制 `prd-source/`、`tech-doc-raw/` 或其他飞书资源目录。
5. 未被导入文档引用的 `raw/`、`logs/`、comments、parser_images、manifest、节点下载缓存、临时文件和其他 Extractor 中间产物不得复制到 artifacts workspace；如果报告明确链接其中某个文件，则只复制该文件及其递归 Markdown 依赖。
6. 必须在 `02-task-space.md` 记录 `context_source`、导入文档清单、导入资源文件清单、跳过覆盖文件清单、跳过的未引用中间文件规则和 `meego-{id}/repos/` 位置。
7. 必须在 `00-inputs.md` 中记录：正式 artifacts workspace、context_source、PRD 来源、技术文档状态、repo-routing 来源、引用资源文件来源，以及 `design_source_status`、`design_source_locations`。
8. 后续读取 `prd-source.md`、`tech-doc-raw.md` 或补充文档时，必须同时检查 Markdown 相对链接指向的已导入资源；图片、白板、附件也是文档证据，不得忽略。

在 context 导入完成、且 `prd-source.md` 已就绪后，必须立即执行一次设计源发现，并将结果写入 `00-inputs.md` 的 `design_source_status`、`design_source_locations`。

该步骤只负责**发现和登记**，不负责 Figma MCP 深扫；具体扫描范围、`Raw Body` / 裸 URL 识别、`FIGMA_FOUND` / `FIGMA_NOT_FOUND` 定义，以及“`未识别到 Figma` 不等于 `确认没有 Figma`”的判定细则，以 `requirement-intake` skill 为唯一权威。

设计源发现的具体执行与判定细则，以 `requirement-intake` skill 为唯一权威；`/delivery:init` 只负责确保该步骤被实际执行完成，并将结果写入 `00-inputs.md`。

如果 `context/` 中不存在后端技术文档：

1. 再从用户输入、PRD 引用链接或其他内部工具中查找。
2. 发现飞书 / Lark 技术文档后，统一使用 `feishu-doc-extractor`，指定 `artifact_base=tech-doc-raw`；在 staging 完成 Gate 后，只把最终报告及其通过 `.trae/scripts/copy_markdown_references.mjs` 解析出的本地引用资源纳入 artifacts 输入包，线上 URL 只作为外部链接保留。
3. 将查找与 Extractor 结果写入输入来源清单。
4. 若当前仍未找到，只能标记为缺失材料，不得伪造文档已具备。

## Step 3：需求入口整理

执行 `requirement-intake` skill。

基于 `prd-source.md`、仓库上下文、用户输入以及已准备的补充材料更新：

- `00-inputs.md`
- `01-intake.md`
- `.trae/DELIVERY_STATE.md`

同时必须确保：

- `00-inputs.md` 中明确记录 artifacts 根目录是 `artifacts/...`，以及 `context_source` 是否存在
- `01-intake.md` 中必须基于 `00-inputs.md` 同步设计源结论，说明 `design_source_status` 的判断依据与 Gate 影响
- `00-inputs.md` / `01-intake.md` 中明确记录后端技术文档的来源、状态和缺失情况
- 若后端技术文档来自 `/meego-{id}/context/`，必须优先标记该来源，而不是外部链接
- `DELIVERY_STATE.md` 的 `workspace` 必须指向 `artifacts/<task>/`，不得指向 `meego-{id}/context/`

## Step 4：入口 Gate

只允许推进到 `/delivery:prd`。
禁止直接进入 `/delivery:plan`、`/delivery:code` 或修改业务代码。

若满足以下任一条件，必须暂停：

- `design_source_status` 不是 `FIGMA_FOUND` 也不是 `FIGMA_NOT_FOUND`（扫描失败或链接模糊）
- PRD 存在核心 UI 改造信号，且 `design_source_status = FIGMA_NOT_FOUND`

## 输出

最后只输出：

1. 当前任务空间路径。
2. 已获取材料。
3. 缺失材料。
4. 是否暂停。
5. 下一步建议命令：`/delivery:prd`。
