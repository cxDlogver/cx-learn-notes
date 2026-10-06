---
name: tech-planning
description: "技术规划。直接把阶段输入文件交给 `Use Skill: writing-plans`，生成 `/delivery:task` 可消费的 `04-tech-plan.md`。"
---

# Tech Planning

Execution context: fork. Preferred agent: `tech-planner`.

## Purpose

基于 PRD 解析结果和仓库现状，生成 delivery plan：明确实现范围、Figma / UI contract、接口 / 字段探索策略、真实集成禁区，以及是否进入 `MOCK_PREVIEW`。该阶段不修改业务代码、不生成 BAM mock、不生成测试用例，也不生成 mock 合同矩阵。

`04-tech-plan.md` 在本阶段是后续 `/delivery:task` 的上游计划事实源。默认保存在 active workspace；若调用方显式传入 `replay_workspace_override`，则保存到 override 指定的 shadow replay workspace。可执行 `### Task N:` 列表不属于本阶段产物；必须由 `/delivery:task` 基于本文件和可选 `delivery-mock.md` 生成独立 `delivery-task.md`。

独立测试用例、`BAM Mock Response Field Coverage Matrix`、`Mock Preview Scope`、`Mock / Real Boundary` 和 coverage audit 不属于本 skill 的职责范围，由后置 `/delivery:task` 调用 `test-case-planning` skill 基于已落盘的 `04-tech-plan.md`、`delivery-task.md` 与可选 mock 产物生成。

## Input Boundary

plan 阶段的需求事实主输入是 `prd-source.md`，不是 `03-prd-analysis.md`。

- `prd-source.md`：权威 PRD 原文；需求细节、验收语义、边界条件和 coverage 审查必须可回指原文。
- `03-prd-analysis.md`：结构化索引与门禁摘要；仅用于 requirement_id、模块拆解、范围 formalization、用户确认的 in-scope / out-of-scope 边界、Figma / evidence trace，不得替代原文细节。
- `decision-log.md`：用户确认、显式决策和范围改写输入。
- `uncertainty-register.md`：风险、未决项和 discovery 输入。
- `ui-source-map.md`：证据索引，不作为实现事实主输入。

硬约束：

- `04-tech-plan.md` 可以引用 `03-prd-analysis.md` 的 requirement_id 和模块结构，但不得把它当作唯一需求覆盖对象。
- `PRD Logic Coverage Matrix` 的 coverage 目标是 `prd-source.md` 中的本轮 in-scope 需求细节；`03-prd-analysis.md` 只负责给这些覆盖项提供结构化锚点。
- 如果 `03-prd-analysis.md` 缺少某些 PRD 细节，只能视为索引不完整，不能据此忽略 `prd-source.md` 原文中的需求。

## Replay Workspace Override

本 skill 支持仅供 shadow replay 使用的 override：

- `replay_workspace_override`：绝对 artifacts 路径。传入后，本阶段所有“当前 workspace 下”的输入与 `04-tech-plan.md` 输出都切换为该路径。
- `replay_execution_worktree_override`：可选绝对 worktree 路径。若阶段需要 repo 侧隔离探索、依赖恢复、命令执行或 diff 证据，必须在此 worktree 中执行，不得复用 active execution workspace。
- `replay_branch_override`：可选 branch 名称，仅作为 shadow execution worktree 的 branch 标识；不得切换 active branch。

硬约束：

- 未传入 `replay_workspace_override` 时，保持当前 active workspace 语义不变。
- `plan` 阶段默认只做 repo 只读探索与 shadow artifacts 落盘；若本次 replay 没有 repo 写操作、依赖恢复、服务启动、BAM 同步或 execution diff 需求，则不要求 `replay_execution_worktree_override` / `replay_branch_override`。
- 传入 override 时，禁止修改 `.trae/DELIVERY_STATE.md` 以切换 active workspace。
- 所有 `Plan Path`、自检路径、diff 摘要和 gate 审查都必须指向 override 后的目标 `04-tech-plan.md`。

## Data Interface Policy

技术规划阶段不要求用户预先提供完整数据接口合同。

必须遵守：

- 若 PRD 阶段仅缺少接口路径、请求字段、响应字段、分页、排序、错误码，不得因此拒绝进入 `/delivery:plan`。
- `tech-planner` 必须把这类问题作为 Plan Discovery 输入，通过以下来源继续闭合：
  - 仓库 `src/bam/**` 生成接口；
  - 已有 service / store / route 调用；
  - 已有 mock / 类型定义；
  - BAM 或后续技术文档（如可用）。
- 若规划时仍找不到接口定义，`04-tech-plan.md` 应输出接口探索结果、`Excluded Real Integration` 和后续 `/delivery:task` 的 mock 合同生成策略；不得把缺少用户手填接口合同作为唯一 BLOCKED 原因。
- 只有产品规则、操作语义、权限业务规则、设计主态、跨系统业务协议不明，且无法确定实现范围时，才允许输出 `BLOCKED`。

## Evidence-Bound Reference Policy

PRD 和 Figma 没有明确提及具体实现方式时，计划阶段不得主观臆断 UI、交互、状态流或数据语义。

必须遵守：

- 若 PRD / Figma 已明确实现方式、区域顺序、文案、字段、状态或交互，以 PRD / Figma 证据为准。
- 若 PRD / Figma 只明确“要实现什么”，但未明确“如何实现”，`tech-planner` 必须按优先级查找参考基线：
  1. 原页面 / 原路由 / 原组件的同类交互；
  2. 同业务域既有页面；
  3. 类似页面；
  4. 仓库通用模式或组件库默认模式。
- 若本次是在原页面上新增子页面、子状态、业务域 option 或 Tab，且 PRD / Figma 未说明某个交互细节，必须优先沿用原页面同类交互；只有原页面不存在同类交互或与 PRD / Figma 冲突时，才升级查找同业务域页面或类似页面。
- 参考基线必须写明来源，例如旧路由、旧组件、相似页面路径、截图、DOM 文案、store / service / columns 结构或已有交互模式。
- 计划中使用参考实现时，必须标注 `reference source`、`reuse scope` 和 `difference from PRD/Figma`；只能复用不与 PRD / Figma 冲突的结构和行为。
- 原页面或类似页面只能作为 PRD / Figma 未覆盖细节的实现参考；不得覆盖已确权的 Figma 主态、区域顺序、组件容器、文案或 PRD 业务规则。
- 若找不到原页面或类似页面参考，且该缺口会影响页面骨架、关键交互、状态流、权限、数据语义或验收标准，Plan Readiness 必须为 `BLOCKED` 或将对应任务标为 `PLAN_DISCOVERY` / `BLOCKED_FOR_REFERENCE`，不得编造实现。
- 若缺口只是非关键样式细节，可采用项目组件库默认模式，但仍必须写明 `reference source: design-system default`，并在验收中保留 design-check。

禁止：

- 用“按常规实现”“合理推断”“一般列表页做法”“后续开发补齐”等文字替代证据。
- 把相似页面的实现直接套到本需求中，而不说明适用范围和差异。
- 把 PRD / Figma 未提及的业务规则、筛选项、状态枚举、按钮行为或跨系统动作写成确定实现。

## Mock Preview Mode

本阶段支持 `--mock-preview`，用于在缺少后端设计、接口合同或跨系统协议时，先规划通过 BAM mock response 推进前端效果预览。

触发方式：

- `/delivery:plan --mock-preview`
- 用户明确要求“缺少后端设计时用 BAM mock 数据推进到前端效果预览”

规划规则：

- `04-tech-plan.md` 必须包含 `Implementation Mode: MOCK_PREVIEW`。
- Plan Readiness 不得仅因启用 `MOCK_PREVIEW` 自动降级；接口探索结论、`Excluded Real Integration` 和后续 `/delivery:task` mock 合同生成路径清楚时可为 `READY`，否则按未闭合范围判定为 `PARTIAL_READY` 或 `BLOCKED`。
- 必须说明哪些接口、字段或响应路径仍需在 `/delivery:task` 中转为 test case / rule 候选；不得在 plan 阶段发明 ruleId 或静态 mock 值。
- 必须说明 BAM mock 未来统一通过 `/delivery:mock` 生成或调整，且 `/delivery:mock` 必须优先基于 UI 自然操作触发的真实 request / response；只有必要接口两轮 UI 自然点击仍无法定位时，才允许 `/delivery:mock` 标记 `synthetic_contract`。
- 必须输出 `Excluded Real Integration`，明确禁止真实调用：
  - 未确认接口；
  - IM；
  - 触达任务；
  - BPO；
  - 下载 / 导出；
  - 上传解析。
- 缺少后端设计不得作为 `BLOCKED`，但必须写入 `PLAN_DISCOVERY` 或 `P1_RISK`，并标明后续由 `/delivery:task` 生成 mock 合同、由 `/delivery:mock` 闭合 BAM mock。
- `04-tech-plan.md` 不得规划 fallback store、preview service、业务代码内联 fixture、adapter 返回 fixture、本地保存成功或本地过滤 fixture。
- 若产品规则、权限业务规则或设计主态本身不明确，仍然可以 `BLOCKED`。

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- 有效 planning workspace（默认当前 workspace；若存在 `replay_workspace_override`，则为 override 路径）下的 `prd-source.md`
- 有效 planning workspace 下与 `prd-source.md`、`tech-doc-raw.md` 等 Markdown 相邻的资源目录，如 `prd-source/`、`prd-source.assets/`、`tech-doc-raw/`、`tech-doc-raw.assets/`（如存在）
- 有效 planning workspace 下的 `03-prd-analysis.md`（作为 requirement_id / 范围 / evidence 索引，不替代 PRD 原文）
- 有效 planning workspace 下的 `uncertainty-register.md`
- 有效 planning workspace 下的 `decision-log.md`（如存在关键决策）
- 有效 planning workspace 下的 `prd-figma-supplement.md`
- 有效 planning workspace 下的 `figma-evidence-pack.md`（如存在 Figma 链接或核心 UI 改造）
- 有效 planning workspace 下的 `figma-cache/manifest.md`（如存在 Figma 链接或核心 UI 改造）
- 有效 planning workspace 下的 `ui-source-map.md`（如存在，仅作为 evidence index / fallback）

如果 PRD 解析未完成，必须暂停。
如果存在影响技术规划的 P0_BLOCKER，必须先检查 `decision-log.md` / `prd-notes.md` 中是否已有 Ask First 人工答案、推荐方案授权、P1/P2 降级或明确继续阻塞结论。没有 Ask First 结论时，不得生成完整方案，必须返回 `/delivery:prd` 执行 Ask First。
但仅由“数据接口字段 / 路径 / 分页 / 排序 / 错误码未提供”造成的未决项，不应视为阻止 `/delivery:plan` 的 P0；必须进入本阶段继续探索。

## Mandatory Execution Flow

本阶段必须按顺序执行：

1. `tech-planner` subagent
   - 由 `/delivery:plan` command 派发承接本阶段执行。
    - 负责读取阶段输入文件、组织仓库 / BAM / service 探索，并调用 `writing-plans`。
    - 若存在 `replay_workspace_override`，必须把它作为有效 planning workspace 传到底层执行；若存在 `replay_execution_worktree_override`，repo 侧执行必须发生在该 worktree 中。
2. `Use Skill: writing-plans`
   - `tech-planner` 必须把以下文件直接作为规划输入交给 `writing-plans`：
      - 有效 planning workspace 下的 `prd-source.md`
      - 有效 planning workspace 下的 `prd-source/` 或 `prd-source.assets/`（如存在，作为 PRD 图片、白板、附件证据）
      - 有效 planning workspace 下的 `tech-doc-raw.md`、`tech-doc-raw/` 或 `tech-doc-raw.assets/`（如存在，作为技术文档和资源证据）
      - 有效 planning workspace 下的 `03-prd-analysis.md`（仅作 requirement_id、范围 formalization、用户决策边界和证据索引）
      - 有效 planning workspace 下的 `uncertainty-register.md`
      - 有效 planning workspace 下的 `prd-figma-supplement.md`
      - 有效 planning workspace 下的 `figma-evidence-pack.md`（如存在）
      - 有效 planning workspace 下的 `figma-cache/manifest.md`（如存在）
      - 有效 planning workspace 下的 `decision-log.md`（如存在关键决策）
      - 有效 planning workspace 下的 `ui-source-map.md`（如存在，仅作证据索引，不作为实现事实主输入）
   - 必须显式告诉 `writing-plans`：`prd-source.md` 是需求事实主输入，任何未被 `03-prd-analysis.md` 摘出的 in-scope 细节也必须继续纳入 plan coverage；`03-prd-analysis.md` 不能作为过滤原文细节的依据。
   - 在调用 `writing-plans` 前，必须先执行 `Figma Visual Data Acquisition Protocol`，把可执行样式数据整理为规划输入。
   - `04-tech-plan.md` 的主结构、覆盖矩阵、Figma contract、Mock / Real 边界和后续阶段输入全部在 `writing-plans`。
   - 可执行任务列表由 `/delivery:task` 最终补齐和复核；plan 阶段不得为了提前生成 task 而跳过 mock 边界分析。
    - 本项目覆盖 `writing-plans` 默认保存路径：不得保存到 `docs/superpowers/plans/...`，必须保存到有效 planning workspace 下的 `04-tech-plan.md`。
3. Plan Gate Self Check
    - `writing-plans` 落盘目标 `04-tech-plan.md` 后，`tech-planner` 必须重新读取该文件并按本 skill 的 `Plan Gate Checklist` 执行自检。
    - 自检失败时，`tech-planner` 必须在返回主 Agent 前直接修复同一个目标 `04-tech-plan.md`，不得把格式修复留给主 Agent。
    - 自检最多允许两轮：第一轮生成，第二轮修复。第二轮仍失败时，目标 `04-tech-plan.md` 必须标记 `Plan Readiness: BLOCKED`，并在结果中列出无法修复的门禁项。
   - `tech-planner` 最终回复必须包含 `Gate Self Check: PASS / FAIL`，以及 `Missing Sections`、`Invalid Enum`、`Mock Preview Leakage`、`Mock Contract Placement`、`Design Rework Coverage` 的结论。
- 自检还必须检查 `Unsupported Implementation Assumptions`：所有 PRD / Figma 未明确的实现细节，都必须有原页面、类似页面、代码路径、组件库默认模式或明确 `PLAN_DISCOVERY` / `BLOCKED_FOR_REFERENCE` 记录；否则自检失败。

适用所有规划场景：

- 首次生成 `04-tech-plan.md`。
- 重跑 `/delivery:plan`。
- 根据用户补充信息修复或增量更新 `04-tech-plan.md`。
- 输出 READY / PARTIAL_READY / BLOCKED 任一 Plan Readiness。
- 将 `USER_DEFERRED_PLAN_RISK` 收敛为限定实现计划。
- 将 `PLAN_DISCOVERY` 收敛为 mock / adapter / 类型隔离计划。
- 将 `--mock-preview` 收敛为前端效果预览计划。

禁止主 Agent 或 `tech-planner` 绕过 `writing-plans` 直接裸写完整技术方案。

## Figma Visual Data Acquisition Protocol

只有门禁不足以保证样式正确。`tech-planner` 在生成 `04-tech-plan.md` 前，必须主动采集可执行视觉数据。

## Visual Contract Boundary

`/delivery:plan` 不只定义“做什么”，还必须对关键可见样式做确权；`/delivery:code` 只能实现已确权内容，不能自由决定视觉语义。

必须遵守：

- 对会影响用户识别和设计对齐的可见样式，`04-tech-plan.md` 必须写入明确 contract，而不是只写“按设计实现”。重点包括：颜色/底色、边框、圆角、尺寸级别、字号字重、容器形态，以及 badge / 裸文字 / 按钮 / 链接等呈现形态。
- 对表格 / 列表主态，`04-tech-plan.md` 必须至少覆盖一组可直接供 execute 消费的列级合同。若已存在 `## <页面名> 列表样式总表`，它可以直接替代该列表的 `Figma Cell Contract`，前提是已写清关键子元素、`execute` 提取字段和 `Code执行断言`。
- 对承载状态 / 权限 / 枚举 / 等级 / 归属语义的标签类元素，必须把视觉语义写进 contract；不得只写文案映射。
- 对 PRD / 飞书 / 设计评审中一条 UI 问题同时包含多种可见差异时，必须在 `04-tech-plan.md` 或对应 contract 中拆成原子检查项，至少覆盖：图标/图片资源、文案、颜色、形状（圆角/容器形态）、链接/交互。不得把“黄V和蓝V没有用正确的图标，黄V字色换成黄色”这类复合问题收敛成单条“认证主体样式调整”。
- visual contract 防漏能力必须融合进既有 `Figma Region Contract`、`Figma Interaction Contract` 与列级合同中；列表型 Figma 优先融合进列表样式总表，非列表型关键单元格再进入 `Figma Cell Contract`。字段必须同时覆盖正向确认（应出现什么）和反向断言（不应出现什么 / 不应残留什么）。
- 若某个关键视觉语义缺少足够 Figma / cache / MCP / reference 证据，Plan Readiness 必须为 `BLOCKED`，或把对应任务标记为 `PLAN_DISCOVERY / BLOCKED_FOR_VISUAL_DETAIL`；不得把该缺口留给 `/delivery:code` 现场判断。

## UI Implementation Directive Policy

Plan 阶段必须把“需求点按哪个 Figma node 执行、用 `/f2c` 还是复用哪个组件”写成可被 `/delivery:task` 直接物化的执行指令。不得只写“已有 Figma 证据”“按 Figma 实现”或“后续 design 对齐”。

必须输出 `UI Implementation Directive Matrix` 或等价章节，逐 UI requirement / Figma contract 写明：

- `requirement_id`
- `figma_contract_ref`：对应 `Figma Region Contract` / `Interaction Contract` / `Cell Contract` 行。
- `fileKey` / `nodeId`：当前实现所依据的精确 Figma 节点；若使用 reference source，写明 reference source 和为什么不使用 Figma node。
- `figma_state_scope`：当前 node 对应的页面 / 区域 / 状态 / 示例语义，例如 `author-detail header / default state / rating-row`；不得只写页面名或笼统 `main state`。
- `implementation_directive`：必须是可执行动作，例如 `use /f2c get_d2c_json node <nodeId> to implement <component/region>`、`reuse <existing component/path> and apply Figma token from <nodeId>`、`keep legacy <component/path> and only change copy/style/visibility`。
- `ui_evidence_mode`：`F2C_REQUIRED` / `RUNTIME_BASELINE_ALLOWED` / `NO_F2C_REQUIRED`。
- `component_strategy`：`F2C_BUILD` / `REUSE_EXISTING_COMPONENT` / `KEEP_LEGACY_WITH_PATCH` / `NO_VISIBLE_UI_CHANGE`。
- `code_locator_hint`：页面、组件、函数、selector、store 或 grep 依据，供 task 阶段转成 `code_locator`。
- `acceptance_focus`：文案、容器、子元素、顺序、状态、颜色、圆角、icon、交互热区和禁显残留中的具体核验点。
- `fallback_or_blocking`：缺 node、缺 token、组件不可复用或 PRD/Figma 冲突时的处理。

Gate 要求：

- `F2C_REQUIRED` 的指令必须明确 `/f2c` / d2c 动作和 nodeId；缺少时 Plan Gate 自检失败。
- 每行必须有 `figma_state_scope`，且能唯一说明当前 node 对应的视觉状态边界；若同一 requirement 需要多个 state / node，必须拆成多行或标记 `BLOCKED` / `MISMATCH_NEEDS_PRODUCT_OR_DESIGN_DECISION`，不得把模糊 state 留给 `/delivery:task` 或 `/delivery:code` 推断。
- `REUSE_EXISTING_COMPONENT` 必须写明具体组件或代码路径、复用范围，以及与 Figma 的差异；不得只写“复用仓库组件”。
- `RUNTIME_BASELINE_ALLOWED` 必须写明已有 DOM / screenshot / computed style baseline 的来源和只允许局部调整的边界。
- 若 PRD 需求点和 Figma 可见合同不匹配，必须在 plan 阶段记录 `MISMATCH_NEEDS_PRODUCT_OR_DESIGN_DECISION` / `BLOCKED`，不得把冲突交给 code 阶段判断。

### Acquisition Steps

1. 枚举核心 UI 区域
   - 从 `prd-source.md`、`03-prd-analysis.md`、`prd-figma-supplement.md`、`figma-evidence-pack.md` 中提取所有本轮 in-scope 页面与 `FIGMA_MAIN_STATE_CONFIRMED` 页面。
   - 对每个页面拆出核心区域：标题 / switcher、筛选区、推荐区、工具栏、表格 / 列表、分页、Modal / Drawer / Popover / Tooltip。
2. 优先读取本地 Figma cache
   - 先读 `figma-cache/manifest.md`。
   - 再读被 manifest、`prd-figma-supplement.md`、`figma-evidence-pack.md` 引用的 node cache、screenshot cache 和 evidence markdown。
   - 从 cache 中提取：node id、子节点层级、absoluteBoundingBox、autoLayout、itemSpacing、padding、fills、strokes、cornerRadius、effects、text style、visible text、component name、截图路径。
3. cache 不足时执行 Figma MCP targeted read
   - `tech-planner` 具备 `run_mcp` 能力；当 cache 不能支持 `Figma Region Contract` 的某个区域时，必须基于 node id / file key / Figma URL 发起定点读取。
   - 优先读取区域级 node，不得一次性无目标读取整份设计稿。
   - 目标字段包括：layout mode、size、spacing、padding、fills、border、radius、shadow/effects、text styles、visible copy、icons/images、component instance 信息。
   - 对带图标的标签、badge、按钮、卡片标题、认证标识或任意“文字 + 图形”组合区域，不能只读取文字容器或 instance 节点。必须继续核查父组、同组 sibling image/icon 节点、imageRef / assetRef、截图证据和本地资源替换落点；若图标是独立图片节点或外挂资源，必须把该节点或资源路径写进 contract。
   - 若需要截图辅助判断视觉效果，必须下载或引用对应区域 screenshot。
   - 若满足以下任一条件，优先使用 `Use Skill: ship-figma` 获取结构化视觉数据或参考代码，而不是只做零散截图比对：
     1. 新页面或新组件块首次落地；
     2. 单次需求涉及 3 个以上核心 UI 区域；
     3. Figma 对布局、token、多态状态有较强还原要求；
     4. 历史上已出现过一次及以上 design 漏检，需要提高视觉取证强度。
4. 参考来源兜底
   - Figma 对非关键样式细节没有暴露时，按优先级查找：原页面 / 原组件、同业务域页面、类似页面、组件库默认模式。
   - 兜底只能用于 Figma 未明确的细节，不能覆盖已确权的 Figma 主态。
5. 输出数据来源矩阵
   - `04-tech-plan.md` 必须包含 `Figma Region Contract`，说明每个核心区域的数据来自 cache、MCP、截图还是 reference source。
   - 如果某区域无法获得足够样式数据，但仍影响可见区域身份，Plan Readiness 必须为 `BLOCKED` 或该任务标记 `PLAN_DISCOVERY / BLOCKED_FOR_VISUAL_DETAIL`。

禁止：

- 只因为已有 Figma node id，就假设已经拿到了尺寸 / 间距 / 颜色 / 字体数据。
- 只读取文字容器或 tag instance，就假设该区域的 icon/image 资源也已取证完成。
- 只看 PRD/wiki 文案就生成视觉样式。
- 在 cache 缺失时跳过 MCP targeted read，直接写“按 Figma 实现”。
- 把未采集的样式细节交给 `/delivery:code` 自由发挥。

## Plan Gate Checklist

`tech-planner` 必须把本 checklist 当作 `/delivery:plan` 的内置验收，而不是建议项。`writing-plans` 负责生成 delivery plan 骨架；本 checklist 负责把通用计划收敛为本项目可进入 `/delivery:task` 的正式 `04-tech-plan.md`。

### Required Sections

`04-tech-plan.md` 必须包含以下章节。缺任一章节时，自检必须失败并修复：

- `## Plan Readiness`
- `## Implementation Mode`
- `## PRD Logic Coverage Matrix`
- `## Page-Level Figma Coverage Audit`
- `## Figma-to-Component Mapping Audit`
- `## UI Implementation Directive Matrix`
- `## Figma Region Contract`
- `## Figma Interaction Contract`
- `## Figma Cell Contract`（若存在表格 / 列表主态或关键单元格）
- `## Figma / UI 改造清单`

若存在业务域 / 页面 Tab / 内容 Tab / 权限身份态 / route mode 等选项型页面状态，还必须包含：

- `## Business State Disposition Matrix`
- `## Switcher Impact Contract`

若启用 `--mock-preview`，还必须包含：

- `## Excluded Real Integration`

若存在 `07-design-alignment.md` 指向未关闭设计 BLOCKER，还必须包含：

- `## Design Rework Task Materialization Inputs`

若页面包含列表型 Figma（table / list / columns / header / row / cell / custom columns / selectedAttrs / 动态列），还必须遵守：

- 优先 `Use Skill: list-figma-style-contract` 产出列级样式总表。
- `04-tech-plan.md` 中必须保留 `Figma Region Contract`、`Figma Interaction Contract` 的门禁信息；若列表样式总表已经完整覆盖列表列级执行信息，则该列表不应再额外维护等价的 `Figma Cell Contract`。
- 列表型 Figma 的完整列定义、固定列 / 默认列 / 自定义列 / selectedAttrs / 动态列 renderer，优先以下列形式落盘：
  - `## <页面名> 列表样式总表`
  - 或 `## <业务域> 列表样式总表`
- 若未调用 `list-figma-style-contract`，必须能证明现有列级合同已完整覆盖所有列表列及其渲染全集、`execute` 提取字段和 `Code执行断言`；否则自检失败。

### Exact Table Templates

以下表头必须逐字匹配。不得改成英文近义词、增加无关列、删除列或调整列顺序。

```md
## Business State Disposition Matrix
| State Axis | Option | 本次动作 | UI 策略 | 主态基线 / Evidence | Plan 约束 | Verification |
|---|---|---|---|---|---|---|
```

```md
## Page-Level Figma Coverage Audit
| 页面 / 子视图 | UI 改造范围 | Figma 主态证据 | cache_id / cache_path | 结构覆盖结论 | Plan 动作 |
|---|---|---|---|---|---|
```

```md
## Field Source Coverage Audit
| 字段来源 | 字段 key | 产品标签/表头 | UI 落点 | 筛选映射 | 表格/列表映射 | 契约映射 | Task 映射 | 未覆盖处理 |
|---|---|---|---|---|---|---|---|---|
```

该表是条件输出模板，不是默认必填章节。字段较少或字段已清晰融合进单一的列表样式总表、接口 / adapter 计划和 Task 时，不应为通过门禁而新增额外重复表。

```md
## Figma-to-Component Mapping Audit
| 现有组件 / 模块 | 当前可见行为 | Figma 对应区域 | 复用决策 | Plan 约束 |
|---|---|---|---|---|
```

```md
## Switcher Impact Contract
| Switcher | Option | 主态证据 | 影响区域 | 状态流向 | Plan 动作 |
|---|---|---|---|---|---|
```

```md
## Figma Region Contract
| 页面/状态 | UI区域 | fileKey | nodeId | 数据来源 | 需execute提取的数据 | 结构签名 | 必显元素/字段 | 禁显元素/残留 | 视觉结构与顺序 | 验收方式 | fallback/blocking |
|---|---|---|---|---|---|---|---|---|---|---|---|
```

```md
## Figma Interaction Contract
| 页面/状态 | UI区域 | 可操作控件/文案 | nodeId | 触发前状态 | 触发动作 | 触发后状态 | Code执行断言 | Verify点击断言 | 负向断言(禁显/无副作用) |
|---|---|---|---|---|---|---|---|---|---|
```

```md
## Figma Cell Contract
| 页面/表格 | 列名 | nodeId | 单元格类型 | 子元素(逐行) | 必显子元素/字段 | 禁显子元素/残留 | 形态/热区/空态 | execute提取数据 | 内联样式(简单标签可选) | Code执行断言 |
|---|---|---|---|---|---|---|---|---|---|---|
```

### Allowed Enum Check

自检必须扫描门禁表格中的枚举值，只允许以下值：

- `Page-Level Figma Coverage Audit.结构覆盖结论`
  - `FIGMA_MAIN_STATE_CONFIRMED`
  - `FIGMA_PARTIAL_STRUCTURE_ONLY`
  - `NON_FIGMA_FUNCTIONAL_ONLY`
- `Page-Level Figma Coverage Audit.Plan 动作`
  - `TASKIZE_UI_STRUCTURE`
  - `TASKIZE_NON_STRUCTURAL_ONLY`
  - `BLOCKED_FOR_UI_STRUCTURE`
- `Figma-to-Component Mapping Audit.复用决策`
  - `KEEP_VISIBLE`
  - `KEEP_LEGACY_VISIBLE`
  - `RESTRUCTURE_VISIBLE`
  - `LOGIC_ONLY`
  - `REMOVE_VISIBLE`
  - `CREATE_NEW_VISIBLE`
- `Business State Disposition Matrix.UI 策略`
  - `CREATE_NEW_VISIBLE`
  - `RESTRUCTURE_VISIBLE`
  - `KEEP_LEGACY_VISIBLE`
  - `REMOVE_VISIBLE`
  - `LOGIC_ONLY`
- `Switcher Impact Contract.Plan 动作`
  - `TASKIZE_FULL_STRUCTURE`
  - `TASKIZE_LEGACY_MAIN_STATE`
  - `TASKIZE_SKELETON_ONLY`
  - `DISABLE_UNTIL_FIGMA`
  - `BLOCKED_FOR_SWITCHER_STRUCTURE`
- `Plan Readiness`
  - `READY`
  - `PARTIAL_READY`
  - `BLOCKED`

用户确认 legacy 主态时，证据字段可以写 `USER_CONFIRMED_LEGACY_MAIN_STATE`；但动作字段仍必须使用上面的允许值。

### PRD Logic Coverage Check

`PRD Logic Coverage Matrix` 必须覆盖 `prd-source.md` 中所有本轮 in-scope 需求细节，并使用 `03-prd-analysis.md` 的 requirement_id / 模块拆解 / 范围 formalization 作为索引锚点。

自检必须确认：

- `03-prd-analysis.md` 中的每条 requirement_id 都出现一次且至少出现一次。
- `prd-source.md` 中所有本轮 in-scope 的细粒度需求点都能映射到某条 coverage 行；不得因为 `03-prd-analysis.md` 未展开细节而漏记原文要求。
- 每条 requirement 都映射到 `implementation_task` 或明确的 excluded / skeleton / adapter 行为。
- 非 `MOCK_PREVIEW` 模式不得出现 `mock_preview_behavior` 列；应使用 `limited_behavior`、`adapter_behavior` 或 `excluded_real_integration` 等非 mock-preview 语义。
- `MOCK_PREVIEW` 模式必须出现 `mock_preview_behavior` 或等价的接口探索 / mock-preview 行为说明；不得仅因启用 mock-preview 自动降级 Plan Readiness。若 `Excluded Real Integration` 和后续 `/delivery:task` mock 合同生成路径清楚，可为 `READY`；限定范围未获用户确认或存在真实阻塞时才降为 `PARTIAL_READY` / `BLOCKED`。
- 权限显隐、推荐规则、筛选规则、排序、校验、状态流转、成功跳转、下载和跨系统动作不得只写模块级概括。

### Field Source Coverage Check

当阶段输入存在 tech-doc、TCC 配置、自定义列表头配置、BAM / IDL、动态字段配置、接口字段说明或类似字段来源时，自检必须做字段全集覆盖审计。审计是强制门禁，但独立 `Field Source Coverage Audit` 表是条件产物。

默认优先把字段覆盖证据融合进现有章节：

- 筛选字段进入 `Figma Region Contract` 的筛选区、接口 / adapter 参数计划和对应 Task。
- 表头 / 列表字段优先通过 `list-figma-style-contract` 产出的列表样式总表承载；只要总表已包含关键子元素、`execute` 提取字段和 `Code执行断言`，execute 与 verify 都直接消费该总表，不再要求为同一列表重复补 `Figma Cell Contract`。
- 导出字段进入接口 / adapter 计划、下载 Task 和测试矩阵。
- 标签 / 状态 / 权限 / 枚举视觉语义进入 Region / Cell 契约的正向断言与负向断言。
- 非可见字段进入接口 / adapter 计划或 Gate Self Check，并明确 `NOT_VISIBLE_LOGIC_ONLY` / `BACKEND_ONLY` / `OUT_OF_SCOPE` / `PLAN_DISCOVERY`。

只有满足以下任一条件时，才输出独立 `Field Source Coverage Audit` 表：

- 字段来源超过一个，且字段在筛选、表格、自定义列、导出之间存在多处落点。
- 存在动态列、自定义列、全部筛选、导出字段全集等容易被现有契约遗漏的字段集合。
- 存在正反语义、枚举值、权限/状态标签等高风险字段，例如 `is_inout_author`。
- 主 Agent 或 `tech-planner` 无法仅通过现有契约快速判断字段全集是否闭合。

自检必须确认：

- 每个被字段来源标记为“固定筛选、全部筛选、表头、自定义列、列表展示、导出字段、标签/状态/权限视觉语义”的字段，都进入字段覆盖证据；可融合在 Region / Cell / API / Task 中，复杂场景才进入独立 `Field Source Coverage Audit`。
- 每个字段必须明确映射到 UI 落点：筛选项、表格 / 列表列、单元格子元素、Drawer / Modal 字段、导出字段，或明确 `NOT_VISIBLE_LOGIC_ONLY` / `BACKEND_ONLY` / `OUT_OF_SCOPE`。
- 可见字段必须继续映射到 `Figma Region Contract` 的 `必显元素/字段` / `禁显元素/残留`，以及对应的列级合同（优先列表样式总表，其次 `Figma Cell Contract`）中的 `关键子元素/字段` 与负向约束；筛选字段必须映射到筛选区 Region 与可执行 Task。
- 字段 key、产品标签、正反语义、枚举值必须同时记录；例如 `is_inout_author` 这类“是否双栖作者 / 是否仅站外作者”正反语义字段，必须写清后端值、UI 文案、筛选 options 和禁止反向解释。
- 不得只因字段不在 Figma 首屏截图中就省略；动态列 / 自定义列 / 全部筛选字段仍必须在字段覆盖证据中出现，并说明可见策略。
- 字段来源中出现但 plan 不实现的字段，必须给出处理结论：`PLAN_DISCOVERY`、`P1_RISK`、`OUT_OF_SCOPE`、`BACKEND_ONLY` 或明确的用户/PRD证据；不得静默遗漏。

以下情况自检必须失败并修复：

- tech-doc / TCC / BAM 字段存在，但 Region / Cell / API / Task / Gate Self Check 或条件独立审计表中没有该字段。
- 字段只出现在接口计划中，没有进入筛选、表头、Cell / Region 契约或明确的非可见处理。
- 标签、状态、权限、归属、枚举字段只有文案映射，没有视觉形态、正向断言和反向断言。
- 正反语义字段未写清 UI 文案与后端值，导致可能把 `是否双栖作者` 反向实现成 `是否仅站外作者`。

### Figma Region Contract Check

对每个 `FIGMA_MAIN_STATE_CONFIRMED` + `TASKIZE_UI_STRUCTURE` 页面，自检必须确认 `Figma Region Contract` 覆盖所有核心可见 UI 区域，尤其是新增或重构的：

- 标题 / 业务域切换区
- 筛选区
- 推荐区
- 工具栏 / 批量操作区
- 表格 / 列表区
- 分页
- Modal / Drawer / Popover / Tooltip 等浮层容器

每一行必须写清：

- `fileKey` / `nodeId`：该区域的 Figma 节点锚点。plan 阶段不再内联具体色值 / 尺寸样例代码，nodeId 即为视觉契约；execute 阶段据此调用 Figma MCP 取实际数据。
- `数据来源`：必须是 `cache`、`mcp_targeted_read`、`screenshot`、`reference_source` 或其组合。
- `需execute提取的数据`：必须列出 execute 阶段需要从 nodeId 获取的可执行字段，例如 `layout/spacing/padding/fill/stroke/radius/text/copy/state`，不能只写“有 Figma”。
- `结构签名`：必须用可验证的结构摘要描述区域容器和直接子块，例如 `title -> filter -> recommend -> table`、`label+input grid`、`toolbar(left actions,right custom column)`；不得只写“保持一致”。
- `必显元素/字段`：必须列出该区域在主态必须出现的关键文案、控件、字段、列、状态或容器。
- `禁显元素/残留`：必须列出该区域不得出现的旧页面残留、臆造按钮、错误容器、错误默认值或与本轮 Figma 冲突的结构；没有禁显项时填 `-`，不得留空。
- `视觉结构与顺序`：区域内的排列方向、子区域顺序、相对位置和文案顺序，必须来自截图 / 节点树。
- `验收方式`：至少包含 mock-debug 截图或 design-checker 截图对齐；核心区域不得只用 build / DOM 文案 / 接口返回作为样式证据。
- `fallback / blocking`：若缺失影响视觉身份，必须写 `BLOCKED_FOR_VISUAL_DETAIL` 或 `PLAN_DISCOVERY`；依赖 reference source 时必须写明具体文件路径、组件名或组件库默认模式。

硬规则：

- 若核心区域没有进入 `Figma Region Contract`，Plan Gate Self Check 必须失败。
- 每行必须有具体 `nodeId`；只写“卡片 / 浅蓝推荐区 / mock div / 按 Figma 实现 / 后续视觉对齐”而无 nodeId，自检必须失败。
- 如果 Figma 已有截图 / 节点树，但计划只写“卡片组”“白底卡片”“按 Figma 实现”“后续设计对齐”，自检必须失败。
- 如果核心区域缺少 `结构签名`、`必显元素/字段` 或 `禁显元素/残留`，自检必须失败；禁显项未知时必须写 `PLAN_DISCOVERY` 或回到 Figma / reference source 补证。
- 如果计划中的验收方式只验证 DOM 顺序、文案或数据，而没有截图 / design-checker 证据，自检必须失败。
- 如果某个视觉细节 Figma 未明确且会影响可见样式，必须写 `reference source`：原页面、同业务域页面、类似页面、组件库默认模式或 `PLAN_DISCOVERY`；不得让 code 阶段自由发挥。
- `/delivery:code` 不得把 `Figma Region Contract` 中的核心样式约束降级为“后续 /delivery:design 再看”。

### UI Implementation Directive Check

自检必须确认 `UI Implementation Directive Matrix` 已覆盖所有进入 `Figma / UI 改造清单`、`Figma Region Contract`、`Figma Interaction Contract`、`Figma Cell Contract` 的可见 UI requirement。

每行必须有：

- 精确 `fileKey/nodeId` 或明确 reference source。
- 可执行 `implementation_directive`。
- `ui_evidence_mode`。
- `component_strategy`。
- `code_locator_hint`。
- `acceptance_focus`。

若 `F2C_REQUIRED` 行没有明确 `/f2c` / d2c 动作和 nodeId，自检失败。若复用组件行没有具体组件路径或复用边界，自检失败。若只写“按 Figma 实现 / 对齐设计 / 复用组件”，自检失败。

### Figma Interaction Contract Check

自检必须确认 `Figma Interaction Contract` 覆盖所有看起来可操作的可见控件和文案，包括但不限于：

- `收起` / `展开`
- `一键筛选`
- `全部筛选` / `所有筛选`
- `自定义列`
- `下载`
- `批量创建`
- Tab / Select / Dropdown / Popover trigger
- Modal / Drawer / Confirm 的打开、关闭、确认、取消

每行必须写清：

- `可操作控件 / 文案`：用户可点击或可交互的具体文案或控件。
- `触发前状态`：点击前必须存在的 DOM、文案、数据或 UI 状态。
- `触发动作`：点击、选择、输入、hover、关闭、确认等具体动作。
- `触发后状态`：点击后必须变化的 DOM、文案、显隐、筛选参数、store 状态、Network 或弹层状态。
- `Code 执行断言`：代码阶段必须实现的 state / handler / store / adapter 落点，不能只渲染静态文案。
- `Verify 点击断言`：mock-debug / integration-debug 必须实际触发动作并采集证据，不能只检查文案可见。
- `负向断言(禁显/无副作用)`：必须写清点击前后不得出现的错误文案、错误弹层、旧交互残留、重复请求、异常 loading 或不应变化的状态；没有负向断言时填 `-` 并说明原因。

硬规则：

- 如果 Figma 或截图中出现看起来可点击的文案，但 Plan 只把它写入 `Typography / Content` 或 `文案与顺序`，自检必须失败。
- 如果交互效果在 Figma 主态未展示，必须按 reference source 优先级查找原页面 / 同业务域 / 类似页面 / 组件库默认行为；找不到且影响实现，标记 `PLAN_DISCOVERY / BLOCKED_FOR_INTERACTION`。
- 如果可操作控件缺少 `负向断言(禁显/无副作用)`，自检必须失败；常见禁显项包括旧 Drawer、错误 Popover、重复按钮、点击后仍保持旧文案或无效状态。
- `/delivery:code` 不得把 `Figma Interaction Contract` 中的控件实现为无点击事件的静态文本。
- `/delivery:verify` 不得只验证交互控件文案存在；必须执行点击并验证触发后状态。

### Figma Cell Contract Check

存在表格 / 列表主态或关键单元格时，自检必须确认对应的列级合同已覆盖承载核心识别和操作语义的关键列，如名片、标签、状态、权限、操作等。列表型 Figma 优先检查列表样式总表，非列表型关键单元格再检查 `Figma Cell Contract`。

若识别到列表型 Figma，必须优先调用 `list-figma-style-contract` 生成列表样式总表，并按以下分工收敛：

- 列表样式总表负责列表列全集、固定列 / 默认列 / 自定义列 / selectedAttrs、各列所有可能渲染形态，以及 execute 直接需要的关键子元素、`execute提取数据` 和 `Code执行断言`。
- 对已被列表样式总表完整承接的列表，不再额外维护等价的 `Figma Cell Contract`；execute 不应在两张表之间跳转查找同一列表信息。
- `Figma Cell Contract` 只保留尚未拥有独立列表样式总表的非列表型关键单元格，或少数需要单独验收的非列表表格 / Drawer / 上传结果行。
- 若列表样式总表缺少关键子元素、`execute提取数据` 或 `Code执行断言` 任一项，则视为未完整承接，必须补齐或退回使用 `Figma Cell Contract`。

每行必须写清：

- `列名` / `nodeId`：单元格对应的 Figma 节点锚点；只写“按 Figma 实现”而无 `nodeId` 自检必须失败。
- `单元格类型`：简单标签、复合卡片、操作列、状态列等。
- `子元素(逐行)`：复杂单元格的每个子元素。
- `必显子元素/字段`：首行关键单元格必须出现的字段、标签、图标、按钮、hover 入口或状态。
- `禁显子元素/残留`：首行关键单元格不得出现的错误列、旧标签、裸文字替代、重复操作、错误空态或错位热区；没有禁显项时填 `-`。
- `形态/热区/空态`：标签形态（badge / 裸文字 / 链接）、可点击热区、空态 / zero count 表现。
- `execute提取数据`：execute 阶段需从 nodeId 获取的字段（颜色 / 底色 / 边框 / 圆角 / 尺寸 / 字号字重 / 容器形态等）。
- `内联样式(简单标签可选)`：简单标签可内联具体 style token 做双保险，但仍必须填 `nodeId`。
- `Code 执行断言`：代码阶段必须落地的 class 名、DOM 结构或 style token。

硬规则：

- 简单标签列写一行（允许内联样式做双保险，但必须填 `nodeId`）。
- 复杂单元格必须拆成多行展开：每个子元素一行，共用同一个列名，不强制内联样式。
- 不得用一行概括复杂单元格；不得把多个不同语义标签合并到一行；只写“按 Figma”而无 `nodeId`，自检必须失败。
- 如果首行关键单元格缺少 `必显子元素/字段` 或 `禁显子元素/残留`，自检必须失败；不得只通过表头、列顺序或整表截图替代逐格防漏。
- 对承载状态 / 归属语义的标签类元素，必须把视觉语义（badge / 裸文字 / 链接形态、颜色、圆角）写进 contract，不得只写文案映射。
- 若列表样式总表已经完整覆盖某个列表的列定义、关键子元素、`execute提取数据` 和 `Code执行断言`，则该列表不得再在 `Figma Cell Contract` 中重复展开；重复维护视为 plan 冗余，必须收敛。

### Evidence-Bound Reference Check

自检必须确认计划没有把 PRD / Figma 未明确的实现细节写成无来源结论。

检查规则：

- 每个任务中的 UI 结构、交互、状态流、数据语义、权限、筛选项、表格列、按钮行为和跨系统动作，都必须能回溯到 PRD、Figma、原页面、类似页面、组件库默认模式或明确的 discovery / blocked 记录。
- 使用原页面或类似页面时，任务或门禁表必须写明 `reference source`，且说明复用范围；只写“参考旧页面”不合格。
- 若参考实现与 PRD / Figma 冲突，必须以 PRD / Figma 为准，并在计划中写明差异处理。
- 若没有任何参考来源，且缺口影响可执行性或验收，Plan Readiness 不得为 `READY`；必须写 `PLAN_DISCOVERY`、`P1_RISK` 或 `BLOCKED_FOR_REFERENCE`，按影响等级阻断或限制实现。
- 对非关键样式细节，允许 `reference source: design-system default`，但必须在验证中增加 design-check 或截图核对。
- 自绘可见控件必须在 `Figma-to-Component Mapping Audit` 或 `Figma / UI 改造清单` 写明原因、影响范围和验证方式；否则应优先复用基础组件或业务包装组件。

以下写法必须判定为失败并修复：

- “按常规实现”
- “合理推断”
- “参考类似页面”但没有路径或组件名
- “后续开发补齐”
- 未说明来源却新增业务规则、状态枚举、筛选项、按钮行为或跨系统动作

### Task Materialization Input Check

plan 阶段不得生成最终可执行 Task，但必须提供 `/delivery:task` 能稳定消费的任务拆分输入。最终 `### Task N:` 必须写入 `delivery-task.md`，不得写入或回写进 `04-tech-plan.md`。

自检必须确认：

- `04-tech-plan.md` 中每条 requirement、Figma contract、字段来源和真实集成禁区都能推导到 `delivery-task.md` 的任务输入；不得只输出概览后让 task 阶段重新理解 PRD。
- `04-tech-plan.md` 不得包含最终 `### Task N:` 执行清单；若需要提示任务拆分，只能写在 `Task Materialization Inputs` 中，作为 `delivery-task.md` 的输入。
- `Task Materialization Inputs` 必须至少说明：候选代码落点、实现指令来源（来自 `UI Implementation Directive Matrix` 的 `implementation_directive`）、允许文件范围提示、禁止文件范围、验证命令建议、真实集成禁区、设计返工输入和停止条件。
- `MOCK_PREVIEW` 下，task 输入必须说明后续由 `/delivery:task` 生成 Test Case Matrix、BAM Mock Response Field Coverage Matrix、Mock Preview Scope 和 Mock / Real Boundary；不得要求业务代码创建 mock 数据。

### Mock Preview Leakage Check

非 `MOCK_PREVIEW` 模式下，自检必须检查并修复：

- `Implementation Mode` 不得写 `MOCK_PREVIEW`。
- 表格列名不得出现 `mock_preview_behavior`。
- 任务描述不得把限定真实实现写成“mock-preview 完成”。
- 运行时业务闭环不得来自 BAM mock response、inline fake data、fallback store 或 adapter 功能补全；测试 fixture 只能出现在测试脚本 / case fixture。

`MOCK_PREVIEW` 模式下，自检必须检查：

- `Implementation Mode: MOCK_PREVIEW`。
- `Plan Readiness` 可为 `READY`、`PARTIAL_READY` 或 `BLOCKED`；`READY` 时必须明确下一步是 `/delivery:task`，BAM mock 合同由 task 阶段生成，BAM mock 产物统一通过 `/delivery:mock` 闭合。
- 明确 `Excluded Real Integration`，并明确 plan 阶段不得输出 `BAM Mock Response Field Coverage Matrix`、`Mock Preview Scope` 或 `Mock / Real Boundary`。
- 不规划真实 IM、触达任务、BPO、下载、上传解析调用。
- 不规划 `/delivery:code` 直接修改 `src/bam/**`；BAM mock patch 只能由 `/delivery:mock` 按门禁执行。
- 不出现 fallback store、preview service、`fetchXXXPreview`、`updateXXXPreviewNoop`、业务代码内联 fixture、adapter 返回 fixture、本地保存成功或本地过滤 fixture。

### Design Rework Coverage Check

若存在 `07-design-alignment.md` 中存在未关闭设计 BLOCKER，自检必须确认：

- `04-tech-plan.md` 保留原始 PRD / Figma / repo 事实，不全量丢弃用户已确认决策。
- 新增或更新 `Design Rework Task Materialization Inputs`，供 `/delivery:task` 写入 `delivery-task.md`。
- 每个 BLOCKER ID 都映射到后续 `delivery-task.md` 的 task step 输入。
- 如果某个 BLOCKER 不能转成可执行步骤，`Plan Readiness` 必须是 `BLOCKED`。

### Gate Self Check Report

`tech-planner` 最终回复必须包含：

```md
## Gate Self Check

- Result: PASS / FAIL
- Missing Sections: none / ...
- Invalid Enum: none / ...
- Task Materialization Inputs: ready / gaps ...
- Mock Preview Leakage: none / ...
- Mock Contract Placement: none / ...
- PRD Coverage Gaps: none / ...
- Field Source Coverage Gaps: none / ...
- Figma Contract Gaps: none / ...
- Figma Region Contract Gaps: none / ...
- Figma Cell Contract Gaps: none / ...
- Figma Interaction Gaps: none / ...
- Unsupported Implementation Assumptions: none / ...
- Design Rework Coverage: none / ...
```

`Result: FAIL` 时不得建议进入 `/delivery:code`。

## Main Agent Gate Review

主 Agent 必须遵守 `.trae/AGENTS.md` 的 `Main / Subagent Collaboration Contract`。

`tech-planner` 返回后，主 Agent 只审以下高信号内容：

- `Agent Gate Summary`。
- `Plan Readiness` 与 `Implementation Mode`。
- `PRD Logic Coverage Matrix`。
- `Business State Disposition Matrix`（如适用）。
- `Page-Level Figma Coverage Audit`。
- 字段来源覆盖证据：优先审 Region / Cell / API / Task 中的字段映射；存在复杂字段来源或高风险枚举时，再审 `Field Source Coverage Audit`。
- `Figma-to-Component Mapping Audit`。
- `Switcher Impact Contract`（如适用）。
- `Figma Region Contract`。
- `Figma Interaction Contract`。
- `Figma Cell Contract`。
- `Excluded Real Integration` 和后续 `/delivery:task` mock 合同生成路径（当 `MOCK_PREVIEW`）。
- P0/P1、Design Rework Task Materialization Inputs、Plan diff 摘要。

主 Agent 不默认重读完整 PRD、完整 Figma cache 或完整代码仓库。除异常项定向回读外，plan 阶段固定复核项只有一项：主 Agent 必须续派 `tech-planner` 审计 `prd-source.md` 的全部 in-scope 需求细节是否被 `PRD Logic Coverage Matrix` 全量覆盖，并使用 `03-prd-analysis.md` 的 requirement_id、模块拆解和范围 formalization 做索引核对，返回遗漏项、误映射项和低置信度项；必要时可同文件修复 `04-tech-plan.md`。除此之外，只有当 summary 或关键表显示 `BLOCKED`、`NEEDS_TARGETED_REVIEW`、LOW confidence、状态分类冲突、Figma evidence 缺失、legacy 保留策略缺失时，才围绕单一高信号问题续派 `tech-planner` 做聚焦复核 / 同文件修复；不得转为主 Agent 全文复审。
主 Agent 不默认重读完整 PRD、完整 Figma cache 或完整代码仓库。除异常项定向回读外，plan 阶段固定复核项只有一项：主 Agent 必须新开一个 `tech-planner` subagent 实例，审计 `prd-source.md` 的全部 in-scope 需求细节是否被 `PRD Logic Coverage Matrix` 全量覆盖，并使用 `03-prd-analysis.md` 的 requirement_id、模块拆解和范围 formalization 做索引核对，返回遗漏项、误映射项和低置信度项；必要时可同文件修复 `04-tech-plan.md`。该固定聚焦复核不得复用生成 `04-tech-plan.md` 的同一 subagent 会话；若这一步未完成，plan 阶段不得输出最终 `Plan Readiness`，不得建议进入 `/delivery:task`。除此之外，只有当 summary 或关键表显示 `BLOCKED`、`NEEDS_TARGETED_REVIEW`、LOW confidence、状态分类冲突、Figma evidence 缺失、legacy 保留策略缺失时，才围绕单一高信号问题续派 `tech-planner` 做聚焦复核 / 同文件修复；不得转为主 Agent 全文复审。

## Output Contract for 04-tech-plan.md

`04-tech-plan.md` 必须是 `/delivery:task` 可消费的 delivery plan。它不得包含最终可执行任务清单、测试用例或 mock 合同矩阵；最终 `### Task N`、测试用例、BAM mock 矩阵、Mock Preview Scope 和 Mock / Real Boundary 均由 `/delivery:task` 生成。

必须从以下 header 开始：

```md
# <Feature Name> Delivery Plan

**Goal:** ...

**Architecture:** ...

**Tech Stack:** ...
```

随后必须包含：

1. 技术方案状态：READY / PARTIAL_READY / BLOCKED。
2. Implementation Mode：`REAL_READY` / `REAL_READY_LIMITED` / `MOCK_PREVIEW` / `BLOCKED`。
3. `PRD Logic Coverage Matrix`。
4. `Business State Disposition Matrix`（存在业务域 / Tab / 权限身份态等选项型页面状态时必填）。
5. `Page-Level Figma Coverage Audit`。
6. 字段来源覆盖证据：优先融合进 Region / Cell / API / Task；复杂字段来源或高风险枚举才输出 `Field Source Coverage Audit`。
7. 若存在列表型 Figma，优先 `Use Skill: list-figma-style-contract` 生成 `## <页面名> 列表样式总表`，作为列表列级与 execute 单一事实源。
8. `Figma-to-Component Mapping Audit`。
9. `Switcher Impact Contract`。
10. `Figma Region Contract`。
11. `Figma Interaction Contract`。
12. `Figma Cell Contract`（仅在列表样式总表尚未完整承接，或存在非列表型关键单元格时填写；若已有完整列表样式总表，则对应列表不再重复填写）。
13. `Figma / UI 改造清单`。
14. requirement_id、PRD 逻辑、UI 改造点、代码落点、验证方式之间的映射。
15. 若为 `MOCK_PREVIEW`，必须包含：
    - `Excluded Real Integration`
    - `/delivery:task` 生成 Test Case Matrix、BAM Mock Response Field Coverage Matrix、Mock Preview Scope 和 Mock / Real Boundary 的输入要求
    - `/delivery:mock` 优先基于 UI 真实 request / response 生成 BAM mock 的验收方式；必要接口两轮 UI 自然点击仍无法定位时的 `synthetic_contract` 标记与 real verify 回收方式
16. `Task Materialization Inputs`；不得输出最终 `### Task N: ...` 执行任务列表。

`PRD Logic Coverage Matrix` 硬要求：

- 必须逐条覆盖 `03-prd-analysis.md` 中所有 `Atomic Requirements`，并补齐 `prd-source.md` 中未被该摘要完全展开的本轮 in-scope 细节。
- 不能只写模块级范围，必须把权限、推荐规则、筛选规则、列表字段、排序、校验、状态流转、跳转、下载、跨系统动作和验收标准写成 plan item。
- 每条 requirement 必须标注：`plan_item` 或 `task_materialization_hint`、`verification`、`real_integration_gap`，并按模式选择行为列：
  - `MOCK_PREVIEW` 使用 `mock_preview_behavior`。
  - 非 `MOCK_PREVIEW` 限定实现使用 `limited_behavior` 或 `adapter_behavior`。
  - `REAL_READY` 无排除项时可写 `real_behavior`。
- `MOCK_PREVIEW` 的 `mock_preview_behavior` 必须描述真实调用链如何由 BAM mock response 驱动，例如“请求携带最终合同参数，BAM mock response 按 response path 返回覆盖场景”；不得描述本地过滤 fixture、fallback store 或 preview service。
- 若某条 PRD 逻辑在 mock-preview 或限定实现中不实现真实能力，也必须写明 skeleton / adapter / excluded / discovery 行为和后续复验点，不能省略。
- `/delivery:task` 必须把每条 requirement 物化为 Task step 或明确排除项；在此之前不得进入 `/delivery:code`。

不得包含人力评估。

`04-tech-plan.md` 的写作要求：

- 它是面向 `/delivery:mock` / `/delivery:task` / `/delivery:code` 的主计划事实源，不重复抄写 `03-prd-analysis.md` 原文。
- 只保留最终执行所需的规划结论、文件范围、Mock / Real 边界、验证方案和 blocker。
- 对仓库现状、PRD 事实、设计事实只做引用和归纳，不做大段原文搬运。
- 禁止只输出概览表后让 `/delivery:task` 重新理解需求；即使不生成最终 Task，也必须提供稳定的 task materialization 输入。
- 若存在服务端配置改动建议，默认权威落点是当前 workspace 的 `04-tech-plan.md` 中 `Style Source Contract Matrix` 的 `backend config action`；不得只在聊天中口头说明。
- 只有在需要把建议作为独立对后端交付、评审或提单材料时，才额外生成当前 workspace 下的 `backend-config-change-request.md`；该文件是从 `04-tech-plan.md` 派生的补充产物，不得替代 plan 中的权威记录。

推荐输入方式：

- 直接把 `prd-source.md` 作为权威原稿输入，用于回查原始需求语义。
- 把 `03-prd-analysis.md` 作为结构化索引输入，用于 requirement_id、范围 formalization、用户决策边界和 evidence trace，不作为细节需求原文。
- 直接把 `uncertainty-register.md` 和 `decision-log.md` 作为风险与已决策输入。
- 直接把 `prd-figma-supplement.md` 作为视觉稿结构事实和显示语义输入。
- 若需要追溯证据来源，再读取 `ui-source-map.md`；它是证据索引，不是 UI 改造点主输入。

接口计划要求：

- `04-tech-plan.md` 必须包含接口探索结论，而不是要求用户先提供接口。
- 对每个需求相关数据源标注：
  - `已在仓库/BAM 找到`
  - `可复用现有 service`
  - `需新增 BAM/service`
  - `MOCK_PREVIEW: 需 BAM mock response（由 /delivery:task 生成 mock 合同，并由 verify / design 按 active case 通过 /delivery:mock 定向补齐）`
  - `WAIT_BACKEND_VERIFY`
- 如果字段未完全闭合，写入 `PARTIAL_READY` 的不可实现范围或 `BLOCKED` 的真实原因；不得把“用户未提供接口文档”作为唯一原因。

## Gate Behavior

当 Plan Readiness = READY：

- 标记技术规划 DONE。
- 输出下一步：`/delivery:task`。若 `Implementation Mode: MOCK_PREVIEW`，说明 `/delivery:task` 将生成 Test Case Matrix、BAM Mock Response Field Coverage Matrix、Mock Preview Scope 和 Mock / Real Boundary；

当 Plan Readiness = PARTIAL_READY：

- 必须说明可实现范围和不可实现范围。
- 必须询问用户是否允许限定实现。
- 用户未确认前不得进入 `/delivery:mock`、`/delivery:task` 或 `/delivery:code`。

当 Plan Readiness = BLOCKED：

1. 标记 `04-tech-plan.md` 为 BLOCKED。
2. 更新 `uncertainty-register.md`。
3. 请求主 Agent 在 Gate Review 后最小更新本地 `DELIVERY_STATE.md` 的 Pause State。
4. 将新发现的 P0 按 Ask First 问题格式写入 `prd-notes.md` / `decision-log.md` 的待确认区，并向用户提出问题；后续恢复时必须把人工回复落盘为 Ask First 决策记录。
5. 不得进入 `/delivery:mock`、`/delivery:task` 或代码实现。

BLOCKED 判定约束：

- 缺少数据接口合同本身不构成 BLOCKED。
- 只有在完成仓库 / BAM / service 探索后，仍无法确定最小 BAM mock 需求、实现边界或跨系统业务协议时，才允许 BLOCKED。
