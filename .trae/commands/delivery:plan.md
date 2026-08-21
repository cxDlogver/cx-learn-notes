---
description: 执行 delivery plan。薄入口命令，只负责前置检查、启用参数传递、派发 `tech-planning`，并做主 Agent 门禁审查。
---

请按 `.trae/AGENTS.md` 的 Phase Gate Rules 执行 `/delivery:plan`。

## Responsibility Boundary

本命令只做阶段路由和主 Agent 门禁，不维护技术规划细则，也不生成 BAM mock 合同、BAM mock 或测试用例。

- 阶段规则唯一权威：`.trae/skills/04-tech-planning/SKILL.md`
- 阶段执行者：`.trae/agents/tech-planner.md`
- 计划生成器：`Use Skill: writing-plans`
- 计划产物：当前 workspace 下的 `04-tech-plan.md`

如果本命令与 `04-tech-planning` skill 存在冲突，以 `04-tech-planning` skill 为准；本命令不得复制或改写 skill 内的 checklist、表格模板、枚举和 readiness 规则。

## Optional Parameter

支持：

- `/delivery:plan --mock-preview`

当用户显式传入 `--mock-preview`，或明确表达“缺少后端设计，先用 BAM mock 数据推进到前端效果预览”时，把该模式传递给 `04-tech-planning` skill。具体放宽范围、禁止范围和 Plan Readiness 限制由 `04-tech-planning` skill 判定。

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `prd-source.md`
- 当前 workspace 下的 `03-prd-analysis.md`
- 当前 workspace 下的 `uncertainty-register.md`
- 当前 workspace 下的 `decision-log.md`
- 当前 workspace 下的 `prd-notes.md`
- 当前 workspace 下的 `prd-figma-supplement.md`
- 当前 workspace 下的 `figma-evidence-pack.md`（如存在 Figma 链接或核心 UI 改造）
- 当前 workspace 下的 `figma-cache/manifest.md`（如存在 Figma 链接或核心 UI 改造）
- 当前 workspace 下的 `bam/bam-psm-branch-evidence.json`（如 `tech-doc-raw.md` 包含 BAM 接口链接）
- 当前 workspace 下的 `bam/bam-interface-change-evidence.json`（如 `tech-doc-raw.md` 包含 BAM 接口链接）
- 当前 workspace 下的 `bam/bam-method-lookup-plan.json`（如 `tech-doc-raw.md` 包含 BAM 接口链接且存在分支证据）
- 当前 workspace 下的 `bam/bam-method-metadata.json`（如存在待查询 method）
- 当前 workspace 下的 `bam/bam-sync-report.md`（如 `tech-doc-raw.md` 包含 BAM 接口链接）
- 当前 workspace 下的 `07-design-alignment.md`（如存在，用于 design rework handoff）
- 当前 workspace 下的 `ui-source-map.md`（如存在，仅作为 evidence index / fallback，不作为实现事实主输入）
- `.trae/skills/04-tech-planning/SKILL.md`
- `.trae/agents/tech-planner.md`

如果 PRD 解析未完成，必须暂停，不得生成完整技术方案。

Ask First 前置门禁：

- `/delivery:plan` 前必须确认 `ask-first` 已执行并放行。
- 若 `decision-log.md` / `prd-notes.md` 中没有 `Ask First Gate`、`Ask First Decisions`、`Ask First Final Decisions` 或等价的 `PASS_NO_USER_DECISION` 记录，必须先执行 `ask-first`，不得直接生成 `04-tech-plan.md`。
- 若 `.trae/DELIVERY_STATE.md` 显示 `Pause State.is_paused = true` 且原因为 `Ask First feedback pending`，必须先读取飞书反馈或当前对话反馈并落盘；不得绕过用户决策。
- 若仍存在未回答、被跳过且未降级、或 Ask First Gate 标记为 `BLOCKED` 的 P0，必须暂停，不得生成完整技术方案。

数据接口例外：

- 如果未决项仅是接口路径、请求字段、响应字段、分页、排序、错误码缺失，不得因此停止 `/delivery:plan`。
- 这类问题必须交给 `04-tech-planning` / `tech-planner` 在本阶段继续探索和收敛。
- 产品规则、操作语义、权限业务规则、设计主态或跨系统业务协议不明时，必须先检查 Ask First 是否已有人工答案、推荐方案授权或 P1/P2 降级记录；没有则暂停。

BAM 前置门禁：

- 如果当前 workspace 的 `tech-doc-raw.md` 包含 BAM 接口链接，必须先执行 `/delivery:bam`，或提供等价的 `bam/bam-sync-report.md`。
- `/delivery:bam` 允许两种完成态：
  - mutation 完成态：必须提供 `bam/bam-psm-branch-evidence.json`、`bam/bam-interface-change-evidence.json`、`bam/bam-branch-preflight.json`、`bam/bam-method-lookup-plan.json` 和 `bam/bam-sync-report.md`；如存在待查询 method，还必须提供 `bam/bam-method-metadata.json`。
  - no-op 完成态：必须提供 `bam/bam-psm-branch-evidence.json`、`bam/bam-interface-change-evidence.json`、`bam/bam-branch-preflight.json` 和 `bam/bam-sync-report.md`；其中 `bam/bam-psm-branch-evidence.json.items` 为空，且 `bam/bam-branch-preflight.json.status = SKIPPED_NO_BRANCH_EVIDENCE`，`bam/bam-sync-report.md` 明确 `status: SKIPPED_NO_BRANCH_EVIDENCE`、未执行 BAM mutation、下一步进入 `/delivery:plan`。
- mutation 完成态下，`bam/bam-sync-report.md` 必须证明 frontend BAM target、目标分支、目标 app/package、`bam.config.js`、Required Include Entries、接口字段变更证据、结构化 `branch_preflight.*` 字段和 BAM 更新结果唯一且无 blocker；若使用 repo 级 fallback，还必须证明已清理非目标 app/package 的 `src/bam/**` 改动。
- 若 BAM 阶段未完成，不得生成完整技术方案；必须输出下一步：`/delivery:bam`。

## Execute

1. 执行 `tech-planning` skill。
2. 按 `04-tech-planning` skill 的 `Mandatory Execution Flow` 派发 subagent `tech-planner`。
3. 将 `--mock-preview`、design rework handoff、有效 planning workspace、可选 `replay_execution_worktree_override`、可选 `replay_branch_override` 和所有阶段输入文件作为固定输入包传给 `tech-planner`。
4. 明确要求 `tech-planner` 以 `prd-source.md` 作为需求事实主输入，以 `03-prd-analysis.md` 作为结构化索引与用户决策锚点；不得把 `03-prd-analysis.md` 当作细节需求原文。
5. 如存在 `bam/bam-sync-report.md`，将其作为接口 evidence 传给 `tech-planner`：
   - mutation 完成态：要求基于同步后的 `src/bam/**`、service 和现有调用点拆分接口相关实现计划。
   - no-op 完成态：要求把 `bam-sync-report.md` 视为“无 BAM 分支更新证据”的事实输入，不得假设已发生 BAM 同步；接口规划改为基于现有 `src/bam/**`、service、仓库调用点和技术文档继续探索。
6. 要求 `tech-planner` 先执行 `Figma Visual Data Acquisition Protocol`：读 `figma-cache/manifest.md` 和被引用 cache；cache 不足时通过 Figma MCP targeted read 获取区域级 layout / visual / typography / state 数据；必要时引用或下载截图。
7. 要求 `tech-planner` 对所有已确权 Figma 主态核心区域生成 `Figma Region Contract`，推荐区 / 筛选区 / 工具栏 / 表格 / 分页 / 浮层不得只写结构级约束。
8. 要求 `tech-planner` 生成 `UI Implementation Directive Matrix`：逐 UI requirement 写明精确 `fileKey/nodeId`、`figma_state_scope`、`implementation_directive`、`ui_evidence_mode`、`component_strategy`、`code_locator_hint` 和 `acceptance_focus`。指令必须明确使用 `/f2c` / d2c 实现、复用具体组件路径，或保留 legacy 组件做局部 patch；不得只写“按 Figma 实现”。
9. 要求 `tech-planner` 对可见样式生成或融合 `Style Source Contract Matrix`：若样式来自后端字段、设计 token、组件库 token、reference source 或用户决策，必须记录 `style_source`、source field / token、前端行为、fallback 边界和后端配置动作；不得把后端可配置样式规划成前端强制覆盖。
10. 等待 `tech-planner` 在有效 planning workspace 下生成或修复 `04-tech-plan.md`。

## Main Agent Gate Review

`tech-planner` 完成后，主 Agent 必须按 `04-tech-planning` skill 的 `Main Agent Gate Review` 审查：

- `Agent Gate Summary`
- `Gate Self Check`
- `Plan Readiness` 与 `Implementation Mode`
- `04-tech-plan.md` 的关键门禁表、P0/P1、Design Rework Task Materialization Inputs 和 diff 摘要
- `PRD Literal Copy Contract`：若 PRD / 用户补充 / Figma 明确给出用户可见文案，必须逐字列出 copy_id、source_ref、原文文案、允许改写和验收方式；不得只写“文案按 PRD / 设计实现”。
- `Figma Region Contract`：若核心 UI 区域缺少 fileKey / nodeId、数据来源（cache / MCP targeted read / screenshot / reference source）、需 execute 提取的数据、结构签名、必显元素/字段、禁显元素/残留、视觉结构与顺序或验收方式，不得放行 `/delivery:code`。
- `UI Implementation Directive Matrix`：若 UI requirement 只记录有 Figma evidence，而没有明确按哪个 node / state 执行、使用 `/f2c` / d2c 还是复用哪个具体组件、以及 task/code 定位提示，不得放行 `/delivery:task`。
- `Style Source Contract Matrix`：若样式存在后端配置、token、reference source 或用户明确 source 决策，必须确认 `style_id`、`style_source`、source field / token、frontend behavior、fallback boundary 和 backend config action 已落盘；`BACKEND_CONFIG` 不得规划为前端强覆盖。
- `backend config action` 落点：默认权威记录必须在 `04-tech-plan.md`；若需要独立对后端交付，可补充生成当前 workspace 下的 `backend-config-change-request.md`，但其内容不得超出或冲突于 plan 中已确权的配置事实。
- `Implementation Mode: MOCK_PREVIEW` 时，只审查 plan 是否声明实现模式、接口探索结论、`Excluded Real Integration`、禁止 fallback store / preview service / 内联 fixture / adapter 造数 / fake success。`BAM Mock Response Field Coverage Matrix`、`Mock Preview Scope` 和 `Mock / Real Boundary` 不属于 plan 阶段产物，必须交由 `/delivery:task` 生成。

## Gate

`04-tech-plan.md` 必须给出 Plan Readiness：

8. 等待 `tech-planner` 在有效 planning workspace 下生成或修复 `04-tech-plan.md`。
- BLOCKED：必须暂停提问，不得进入代码实现。

注意：`READY` / `PARTIAL_READY` 只表示 plan 阶段完成。真正进入 `/delivery:code` 前仍必须通过 `/delivery:task`；若 `Implementation Mode: MOCK_PREVIEW`，BAM mock 合同必须先由 `/delivery:task` 生成，并由 verify / design 在具体 active case 通过 `/delivery:mock` 定向补齐。

## 输出

只输出：

1. Plan Readiness。
2. 关键代码落点。
4. 下一步：等待用户回答；无论是否 `MOCK_PREVIEW`，plan 完成后均输出 `/delivery:task`。
