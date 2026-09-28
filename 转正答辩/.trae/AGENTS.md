# Trae Frontend Delivery Harness

本项目的 `.trae` 目录用于约束 Trae 按“需求文档 → 仓库分析 → 技术规划 → 代码实现 → 调试验证 → 设计对齐 → 交付验收”的端到端流程工作。它不是提示词集合，而是一个有入口、有状态、有产物、有门禁、有暂停恢复机制的需求交付状态机。

## 0. 总原则

- 事实优先：所有结论必须来自 PRD、任务空间、设计稿、接口文档、仓库代码、验证命令或用户确认，禁止把推测写成事实。
- 状态优先：每个阶段开始前必须读取 `.trae/DELIVERY_STATE.md`，并围绕当前 `workspace` 写入阶段产物。
- 产物优先：阶段结论必须落盘到 `artifacts/<task>/`，不得只存在聊天上下文中。
- 中文正文优先：阶段产物、报告、Gate 结论、风险说明、任务说明和验证记录的主要正文必须使用中文；文件名、代码标识符、API 名、JSON key、枚举值、命令、路径、日志原文和引用的外部接口字段保持原样。
- `.trae` 路径语义：本文及全部 command、skill、agent、script 中的 `.trae/**`，始终指包含本 `AGENTS.md` 的交付 `.trae`，不按当前工作目录重新解析；业务子仓库内的同名 `.trae` 不是交付产物目录。
- 门禁优先：P0 未决问题未清零时，不得进入代码实现；验证未通过时，不得进入交付验收。
- 暂停优先：遇到阻塞时，必须主动暂停并向用户提问，等待用户回答后从当前阶段恢复，不得直接终止输出或继续猜测实现。

## 1. Workflow Router Rules

当用户输入以下任一意图时：

- “按 .trae 工作流处理这个需求”
- “处理这个 PRD / 飞书文档 / 需求文档”
- “根据需求文档完成开发”
- “从需求到代码实现并验证”
- “走端到端需求交付流程”
- “按照当前仓库的 .trae 工作流处理”

必须优先等价执行：

```text
/delivery:init <用户输入的需求链接或需求描述>
```

禁止直接跳到以下 skill：

- `requirement-intake`
- `prd-analysis`
- `tech-planning`
- `code-implementation`

除非用户显式输入对应命令，例如 `/delivery:prd`、`/delivery:plan`、`/delivery:code`。

标准命令顺序为：

```text
/delivery:init
/delivery:prd
/delivery:bam
/delivery:plan
/delivery:task
/delivery:code
/delivery:verify
/delivery:design
/delivery:accept
```

流程规则回归验证入口：

```text
/delivery:regress --stage <prd|bam|plan|mock|task|code|verify|design> --issue "<用户提出的问题>" --expected "<修复后必须满足的结果>"
```

BITS 开发任务辅助入口：

```text
/delivery:bits --init [--dry-run|--execute]
/delivery:bits --cr [MR链接或编号] [--dry-run|--submit]
/delivery:bits --coverage [--rounds 3] [--threshold 90] [--dry-run|--submit]
```

`/delivery:bits` 是需求交付的辅助入口，不纳入标准阶段顺序，也不得替代 `/delivery:code`、`/delivery:verify`、`/delivery:design` 或 `/delivery:accept` 的门禁。它只在当前 artifacts workspace 下维护 `bits-flow/` 产物：`--init` 创建或复用 BITS 开发任务；`--cr` 处理 Codebase Assistant / Aime / CodeGuard 评审问题，并按当前需求范围选择性修复、验证、默认逐 thread reply，且仅在提交授权后提交推送并 resolve；`--coverage` 拉取 Huatuo 覆盖率，按阈值和轮次做覆盖率优化、真实线上 UI 覆盖、报告刷新和可选评审表达。详细模式、授权边界、产物结构和 Gate 以 `.trae/skills/bits-dev-flow/SKILL.md` 为准。

当主 Agent 修改了 `.trae/skills/**`、`.trae/agents/**` 或 `.trae/commands/**` 来修复用户指出的流程失败时，必须优先建议或执行 `/delivery:regress`，用最新流程重跑目标阶段，并输出 `flow-regression-report.md`。不得只说“已更新规则”。

当用户要求创建 / 修改 `.trae` 的 command、skill、agent、阶段 Gate、handoff、角色分工或流程规则时，必须先使用 `trae-flow-maintainer` skill 判断权威落点和影响范围；不得只按关键词替换单个文件。该 skill 用于维护本 delivery framework 自身，不用于普通业务需求交付。

如果用户要求“一次性跑完整流程”，也必须在每个阶段 Gate 处检查是否允许继续；遇到 P0_BLOCKER 必须暂停提问。

## 2. Command / Skill / Agent 分工

- `commands/`：用户入口和阶段路由，负责读取状态、检查前置条件、调用对应 skill。
- `skills/`：阶段工作流，定义输入、步骤、产物、Gate、暂停策略。
- `agents/`：专业执行者，负责高 token 或专业任务，例如 PRD 拆解、仓库探索、代码实现、日志分析、设计对齐。
- `scripts/`：确定性工具，负责拉取文档、仓库快照、验证命令、debug 代码检查、阶段门禁检查。
- `artifacts/`：每个需求的阶段产物，作为跨会话、跨 compact 的事实来源。
- `flow-logs/`：git 内本地流程日志，只记录脱敏后的 hook 摘要，用于后续分析流程瓶颈；不得替代阶段产物或 Gate 证据。
- `flow-regression-cases/`：流程问题回归用例库，记录用户指出过且已通过修改 `.trae` 流程修复的问题；默认记录，不阻塞当前 skill / command / agent 修改。
- `flow-regression-runs/`：daily / suite 回归运行报告，记录集中执行结果、失败归因和对应 workflow 版本。

主 Agent 是流程编排者和最终判断者；子 Agent 只完成被委派的专业任务，不得擅自推进阶段。

### 2.1 Flow Log Hook Protocol

流程 hook 只观察，不决策。任何 command、skill、agent 或 script 都不得因为 flow log 写入成功 / 失败改变阶段 Gate、case 结论或 detour 路由。

日志落点固定为 `.trae/flow-logs/YYYY-MM-DD.ndjson`，必须通过 `.trae/scripts/append_flow_log.mjs` 或等价脱敏逻辑追加。日志目录在 git 中保留，便于 review 与后续本地分析；当前版本不自动上传外部服务。

推荐 hook 点：

- `phase_start` / `phase_end`：阶段开始和结束。
- `agent_dispatch` / `agent_return`：派发或收到 `code-writer`、`runtime-runner`、`design-checker` 等子 Agent 结果。
- `gate_result`：主 Agent 完成阶段 Gate Review 后。
- `detour_start` / `detour_end`：进入或恢复 `/delivery:mock`、code-fix、design auto-fix。
- `runtime_event`：dev server、HMR、typecheck、build、health check 等低上下文运行时事件。
- `artifact_write`：关键阶段产物写入或更新。

允许记录：阶段名、命令名、agent 名、case_id、ruleId、apiName、result、duration_ms、exit_code、错误分类、产物路径、当前 workflow 版本、脱敏后的摘要。

每条日志都应包含 `workflow_version`：`.trae` git commit、branch、dirty 标记和规则文件 hash。若正在验证某个流程实验，可额外传 `--workflow-version <id>` 作为人工标签；人工标签不能替代 git metadata / rules hash。

禁止记录：cookie、JWT、token、password、原始 request / response body、截图原图、完整 DOM、完整 Figma JSON、用户隐私内容、登录态文件内容。疑似敏感内容必须先脱敏；无法确认时不写入 flow log。

本地分析入口：

```bash
node .trae/scripts/analyze_flow_logs.mjs
node .trae/scripts/analyze_flow_logs.mjs --phase design --since 2026-06-24
```

### 2.2 Execution Record and Regression Case Policy

全流程记录分为三层，不得混用：

1. `flow-logs/*.ndjson`：自动追加的低成本事件日志，用户无感，不阻塞阶段。
2. `delivery-execution-record.md`：当前需求 workspace 内的人类可读执行记录，由用户主动或 daily 触发 `/delivery:record` 生成 / 更新。
3. `flow-regression-cases/**`：流程问题回归用例库，用于防止已修复的流程错误在未来改动中复发。

`/delivery:record` 只汇总当前需求执行历史，读取 flow logs 和阶段产物，输出关键产物、截图、问题、解决记录和遗留风险；它不得修改阶段 Gate、不得替代 `05-implementation-log.md` / `06-debug-verification.md` / `07-design-alignment.md` 等正式产物。

当主 Agent 因用户指出的流程错误而修改 `.trae/AGENTS.md`、`commands/**`、`skills/**` 或 `agents/**` 时，必须捕获一个 regression case。捕获用例只记录问题、断言、相关文件和重放成本，默认不立即运行，不阻塞当前流程修改。

回归用例执行策略：

- `capture`：修改流程时记录 case，默认不 replay。
- `daily`：每日或用户主动执行 `/delivery:regress --suite daily`，集中运行最近新增、最近失败和 P0/P1 用例，写入 `flow-regression-runs/YYYY-MM-DD.md`。
- `targeted`：用户明确要求或重大流程改动时，按 stage / tag / changed files 选择性运行。
- `full`：只在发布 / 合并前、全局 Gate 重构、`/delivery:regress` 自身修改、角色批量重命名或用户明确要求时运行。

回归用例按执行成本分级：

- `STATIC_ASSERTION`：只检查流程文件和关键标识符，最快。
- `ARTIFACT_ASSERTION_ONLY`：只检查阶段产物结构、Gate 断言和日志，不重跑阶段。
- `SHADOW_REPLAY_LIGHT`：可在 shadow replay workspace 重跑轻阶段，如 plan / task。
- `SHADOW_REPLAY_HEAVY`：verify / design / mock / code 等依赖环境、浏览器或执行仓库的重放，daily 默认只挑选少量 P0 或最近失败项。
- `MANUAL_CONTEXT_REQUIRED`：上下文过大或业务代码状态难复现，只记录断言和复现说明。

Code 阶段的流程问题默认不做完整业务代码 replay。只捕获可稳定断言的流程边界，例如 `code-writer` 派发、`runtime-runner` 不写代码、`code-fix-handoff.md` 字段完整性、micro fix allowed files 边界等。

### 2.3 Main / Subagent Collaboration Contract

全流程采用“子 Agent 处理长上下文，主 Agent 做门禁放行”的协作方式。

主 Agent 必须：

- 只做阶段编排、门禁审查、用户提问、状态更新和最终放行判断。
- 优先审查子 Agent 输出的 `Agent Gate Summary`、阶段关键表、blocker 和 diff 摘要。
- 默认不重新读取完整 PRD、完整 Figma 节点树、完整技术方案、完整日志或完整代码上下文。
- 对子 Agent 运行态与终态的判断一律以平台实例生命周期为准。只要已派发实例仍为 `running`、尚未显式返回终态，且未出现实例结束 / terminal blocker / tool failure，主 Agent 只能等待、催办或续派同一实例；`wait_agent` 超时、邮箱静默、未收到中途消息、长时间执行、暂未见新产物、仅有半成品落盘、缺少最新 mtime 变化，或状态催办未获回复，都只表示“仍在执行中”，不得据此关闭、替换、并行接管、重复写入，或以局部只读观察推翻其进行中状态。
- 主 Agent 只有在子 Agent 显式返回终态 `Agent Gate Summary`、显式 `BLOCKED` / `NEEDS_TARGETED_REVIEW` / tool failure / terminal blocker，或实例已结束且阶段产物经复核可安全接管时，才可进入 Gate Review 或围绕同一工作单元定向重派原角色子 Agent。
- 若子 Agent 在未返回终态 `Agent Gate Summary`、`TOOL_BLOCKED` / `TOOL_CAPABILITY_BLOCKED`、显式 `BLOCKED` / `NEEDS_TARGETED_REVIEW` 或 tool failure / terminal blocker 的情况下结束实例，主 Agent 必须将该实例判定为 `NONTERMINAL_EXIT / PROTOCOL_VIOLATION`，不得把最后一条非终态回复或其中途写盘当作阶段终态消费；主 Agent 只能基于同一输入包定向重派原角色子 Agent 继续当前工作单元，并在 review 中记录该异常退出。
- 只有子 Agent 已进入终态且主 Agent 完成最小复核后，当前阶段文档和 summary 才能作为下游阶段输入；运行中的半成品、未闭合 Gate 的中途写盘或仅用于恢复执行的局部草稿，不得被主 Agent 当作可推进下游的正式产物。
- 若命名型子 Agent 的运行时缺少该角色完成当前阶段所必需的工具能力，主 Agent 必须按 `Capability Substitution Protocol` 改派具备等价能力的子 Agent，并要求其读取原角色 agent 文件后扮演同一角色执行；不得把工具能力缺失误判为业务、PRD、Plan 或 artifacts blocker。
- 当 `Agent Gate Summary` 显示 `AUTO_FIX_REQUIRED` 时，只定向读取 auto-fix 所需的 task/mock 边界与 evidence；显示 `NEEDS_TARGETED_REVIEW` / `BLOCKED`，或关键表缺失 / 自相矛盾时，才扩大定向回读对应 evidence，或围绕单一高信号问题定向再派发原角色子 Agent；不得把主 Agent 变成全文 reviewer。
- 输出阶段结论前，必须把子 Agent 的建议收敛为 `PASS` / `AUTO_FIX_REQUIRED` / `BLOCKED` / `NEEDS_TARGETED_REVIEW`，不得只转述子 Agent 结论。`AUTO_FIX_REQUIRED` 表示当前阶段继续执行，不得转换为暂停状态。

子 Agent 必须：

- 读取和处理高 token 输入，产出结构化阶段文档。
- 在最终回复或阶段文档顶部输出 `Agent Gate Summary`，最多 30 行。
- 非终态的进度回复不得使用 `Agent Gate Summary` 标题；如需中途回报，使用 `Progress Update` 或等价标题即可。任何固定中途字段都仅是可选的人类可读信息，不承担判活职责。
- 收到主 Agent 的状态催办时，若当前没有被长命令、长 MCP 调用或长时间 Bash 占用且能安全回包，可返回 `Progress Update` 简述当前环节；若当前正被执行中的命令占用而无法即时回包，无需为了回应催办而中断当前执行。不得因为被催办就提前输出终态 `Agent Gate Summary` 或交出 ownership。
- 一旦输出 `Progress Update` 或其他非终态进度回复，而当前阶段 Gate、repair loop、mandatory checklist 或目标产物修复尚未闭合，子 Agent 必须继续执行同一工作单元，并继续持有同一工作单元的 ownership 与执行上下文，直到显式产出终态 `Agent Gate Summary`、`TOOL_BLOCKED` / `TOOL_CAPABILITY_BLOCKED`、显式 `BLOCKED` / `NEEDS_TARGETED_REVIEW` 或 tool failure / terminal blocker。`Progress Update` 只能表示“仍在执行中”，不得作为最后一条回复结束实例，也不得把该次回包视为交还 ownership。
- 在 summary 中列出本阶段放行所需的关键表、最高风险、阻塞项、低置信结论、需要主 Agent 定向回读的 evidence。
- 当运行时缺少必需工具能力时，必须返回 `TOOL_BLOCKED` / `TOOL_CAPABILITY_BLOCKED`，说明缺失能力和未执行的产物；不得把该问题写成上游事实缺失或阶段产物不合格。
- 不得要求主 Agent “整体复查全文”作为放行条件。
- 不得宣布进入下一阶段。

#### Capability Substitution Protocol

子 Agent 文件中的 `tools` / `mcpServers` 实际运行时可能由平台映射决定。凡阶段合同要求由子 Agent 完成高上下文读取、MCP 取证或 artifacts 写入时，若命名型 runtime 缺少对应能力，按以下规则处理：

- 先由该子 Agent 返回 `TOOL_BLOCKED` / `TOOL_CAPABILITY_BLOCKED`，列出缺失能力；这不是业务 blocker，不得写成 `BLOCKED_NEEDS_PLAN_REWORK`、`Figma 不可用`、`PRD 缺失` 或 `artifacts 不合格`。
- 若命名型子 Agent 已成功创建为平台实例，主 Agent 只有在该实例返回 `TOOL_BLOCKED` / `TOOL_CAPABILITY_BLOCKED`、显式终态 / tool failure / terminal blocker、平台生命周期显示已结束，或主 Agent 已显式关闭该实例后，才可改派替身实例。不得仅因发现更合适的 runtime、`wait_agent` 超时、邮箱静默或局部产物不完整，就在原实例仍可能存活时并行改派同一工作单元。
- 主 Agent 必须改派具备所缺能力的子 Agent，要求其读取原 `.trae/agents/<role>.md`，并在同一输入包、同一允许 / 禁止写入范围内扮演原角色执行。
- 改派只替换工具能力，不替换角色契约：输出产物、Gate Summary、权限边界、禁止修改范围和阶段职责仍以原 command / skill / agent 文件为准。
- 只有没有任何可用子 Agent 能满足必需能力，或改派后仍因外部权限 / 工具环境失败无法执行，主 Agent 才可暂停并报告工具环境问题；不得直接由主 Agent 接管本应由子 Agent 完成的高上下文阶段产物，除非对应阶段规则明确允许主 Agent fallback。
- PRD 阶段的 MCP-capable 改派、Task 阶段的 artifacts 读写改派、Design 阶段的 browser-capable 改派均遵守本协议。

`Agent Gate Summary` 统一格式：

```md
## Agent Gate Summary
- Stage:
- Result: PASS / AUTO_FIX_REQUIRED / BLOCKED / NEEDS_TARGETED_REVIEW
- Readiness:
- Key Gate Tables:
- Critical Decisions:
- P0 Blockers:
- P1 Risks:
- Low Confidence Items:
- Main Agent Review Needed:
- Suggested Next Command:
```

主 Agent 的审查顺序：

1. 读取 `Agent Gate Summary`。
2. 读取本阶段必须门禁表。
3. 读取 P0/P1 与关键 diff 摘要。
4. 仅对异常项回读 evidence 原文。
5. 决定是否进入下一阶段；如需记录运行态，只由主 Agent 最小更新本地 `.trae/DELIVERY_STATE.md`。

## 3. Blocker Policy

阻塞分为三类。

### P0_BLOCKER

影响需求理解、前后端边界、代码实现正确性或验证闭环的问题。遇到 P0_BLOCKER 时必须暂停，不允许进入下一阶段。

典型 P0：

- PRD 关键规则缺失或存在冲突。
- 产品业务状态枚举、权限业务规则或跨系统业务协议缺失。
- 设计稿缺失且影响布局、交互、状态或文案。
- 验证环境缺失且无法完成基本自测。
- 跨系统协议不明确，例如 IM、BPO、下载、跳转、消息触达。
- 用户未确认是否允许修改核心文件或跨仓文件。

数据接口规则：

- PRD / Plan 阶段不要求用户预先提供完整数据接口合同。
- 仅缺少接口路径、请求字段、响应字段、分页、排序或错误码时，不得单独作为阻塞 `/delivery:plan` 的 P0。
- 这类问题应登记为 `PLAN_DISCOVERY` / `P1_RISK`，由 `/delivery:plan` 通过 BAM、仓库现有接口、service 或技术文档继续闭合；若最终选择 `MOCK_PREVIEW`，运行时 mock 合同由 `/delivery:task` 的 Test Case Matrix 和 BAM Mock Response Field Coverage Matrix 物化，并写入对应 implementation task 的后置 mock 步骤。
- `/delivery:code` 阶段不得猜接口字段；若 task 阶段既没有真实接口策略，也没有可由 `BAM Mock Response Field Coverage Matrix` 支撑的 mock task 步骤，则不得进入实现。

### P1_RISK

不阻塞当前阶段，但必须登记到 `uncertainty-register.md` 并在后续阶段复核。

### P2_NOTE

普通注意事项，不影响推进，但可写入阶段文档或验收报告。

## 4. Pause and Ask Protocol

遇到 P0_BLOCKER 时，必须按以下格式回复用户：

```md
## 当前暂停阶段
- 阶段：
- 已完成：
- 未完成：
- 当前不能继续的原因：

## 需要你确认的问题
1. [P0] 问题：
   - 背景：
   - 影响：
   - 建议回答格式：

## 我建议的默认处理
- 如果你同意，我会：
- 如果你不同意，请提供：

## 等你回答后我会继续
- 下一步命令/阶段：
- 将更新的文件：
```

同时主 Agent 必须最小更新本地 `.trae/DELIVERY_STATE.md` 的 `Pause State`：

```md
## Pause State

- is_paused：true
- paused_phase：
- paused_reason：
- waiting_for_user：
- resume_command：
- last_question_to_user：
```

用户回答后，必须先将回答写入 `decision-log.md` 或 `uncertainty-register.md`，再从 `resume_command` 对应阶段继续，不得重新开始整个流程。

## 5. Phase Gate Rules

### Execution Environment Bootstrap Gate

`/delivery:bam`、`/delivery:mock`、`/delivery:code`、`/delivery:verify`、`/delivery:design`、`/delivery:accept` 都属于 execution phases。进入这些阶段前，必须先通过统一的 execution bootstrap 与环境前置门禁。

统一规则：

- 命令协议只从 `.trae/PROJECT_CONTEXT.md` 读取；必须根据当前仓库实际结构判定 `repo_command_model`，再选择安装、启动、构建和 BAM 命令，禁止默认猜 `pnpm` / `npm` / `emo`。
- 禁止在 `main/master` 上修改仓库代码或生成物。凡是会产生仓库写操作的阶段，必须先创建或复用 execution workspace，并在该 execution workspace 中执行。
- 仓库写操作包括但不限于：修改业务代码、修改配置文件、执行 BAM 同步、生成 `src/bam/**`、自动修复、设计返工、写入测试或脚本产物。
- 第一次进入 execution phases 时，必须先执行 execution workspace bootstrap，再执行 `.trae/PROJECT_CONTEXT.md` 约定的 `install_command`。最小判定规则：若 `.trae/DELIVERY_STATE.md` 的 `current_phase` 仍为 `init` 或 `prd`，而当前准备进入 `bam` / `code` / `verify` / `design` / `accept`，则视为“第一次进入 execution phases”。
- execution workspace bootstrap 的唯一入口是 `.trae/scripts/ensure_execution_workspace.sh`（或等价脚本）。若 `.trae/DELIVERY_STATE.md` 中已存在可用的 `Execution State`，则必须直接复用，不得重复创建分支或 worktree。
- `/delivery:bam` 是默认的首次 execution bootstrap 入口；若用户跳过 `/delivery:bam` 直接进入其他 execution phase，这些命令也必须先执行相同的 bootstrap 逻辑。
- 后续阶段若发现 `node_modules missing`、本地 generator 缺失、`emo` / `edenx` / build / BAM 命令不可用等环境失效信号，也必须在 execution workspace 中先执行 `.trae/PROJECT_CONTEXT.md` 约定的 `install_command`，再继续当前阶段。
- 若执行型阶段的命令输出表明命中了错误的全局 CLI、错误的外部生成器、或未命中项目本地工具链（例如 BAM 命令输出 `Welcome to bam v1` / `remote:org/repo#branch`），应先视为可恢复环境问题；对 execution workspace 执行 `.trae/PROJECT_CONTEXT.md` 中的 `install_command` 完成一次依赖恢复后，再重试原命令一次；仅当恢复后仍失败，才标记为最终 blocker。
- `init` / `prd` / `plan` 属于非 execution / read-only phases，不负责创建 execution workspace。

### Unified Mock Policy

支持在后端设计、接口合同或跨系统协议未完整提供时，用 BAM mock 前置推进前端效果验证。mock / 非 mock 的区别不是“能不能写测试数据”，而是“运行时业务闭环能否由接口响应 mock 提供”。

mock 数据分为以下三类：

| 类型 | 允许位置 | 用途 | 阶段约束 |
|---|---|---|---|
| `Runtime Contract Mock` | BAM / mock server / 生成器管理的 `__mock__` | 通过接口响应驱动页面业务闭环 | 只允许在 `MOCK_PREVIEW` 下通过 `/delivery:mock` 生成、调整和校验；命令内部使用 `bam-mock-runtime-generator` |
| `Test Fixture Mock` | 测试脚本、mock-debug fixture、case fixture、单测输入 | 验证 UI / 逻辑 / 空态 / 错误态 | mock / 非 mock 都允许，但不得进入业务代码 |
| `Sample Coverage Mock` | verify/design 阶段由 `/delivery:mock` 生成的定向 BAM runtime 临时补充规则 | 在接口 / 字段 / schema / 代码消费链路已明确时构造缺失状态样本，补足 hover / 状态 / 视觉证据 | 仅允许在 `verify` / `design` 的 `SAMPLE_COVERAGE_GAP` 下使用；必须与基础真实链路 / 合同证据并列记录，且不能替代真实 request / response 校验；当前 case 关闭后必须删除临时 mock 代码与产物 |
| `Inline Business Mock` | component、store、service、adapter、route 等业务代码 | 伪造业务数据或补全能力 | 始终禁止 |

触发方式：

- `/delivery:plan --mock-preview`
- `/delivery:mock`（在 `MOCK_PREVIEW` 下由 verify / design 中按受影响 case / rule 定向生成、调整、删除；或在 `verify` / `design` 中按 `SAMPLE_COVERAGE_GAP` 为单个 active case 生成补充证据）
- 用户明确表达“缺少后端设计，先用 BAM mock 数据推进到前端效果预览”

硬约束：

- `MOCK_PREVIEW` 下，页面运行链路仍必须是 `page -> store -> service -> BAM`，不得新增 fallback store 或 adapter 造数。
- 非 `MOCK_PREVIEW` 下，不要求存在 `delivery-mock.md`、`mock/**`、BAM mock matrix、manifest 或 mock closure；这些产物缺失必须视为 `N/A`，不得作为 task / code / verify / design 的 `BLOCKED`、`MOCK_ISSUE`、回退原因或 `/delivery:mock` 入口。
- 非 `MOCK_PREVIEW` 下，只有 `verify` / `design` 命中 `SAMPLE_COVERAGE_GAP` 时，才允许进入 `/delivery:mock` 做受控补充取证。触发前提必须同时满足：接口 method/path、请求字段、响应字段或枚举语义已通过技术文档 / BAM / IDL / generated types / 代码消费链路 / 至少一条同接口真实请求证据明确；当前缺口确认为样本或状态覆盖不足，而非真实响应与协议不一致；mock 只用于构造临时状态样本并补充 hover / 状态 / 视觉截图证据，不用于证明真实后端已经返回该状态、真实 request / response 字段值、权限、错误码或写副作用；浏览器验证必须带 `.trae/PROJECT_CONTEXT.md` 约定的 mock-debug 参数，当前项目示例为 vmok URL 上显式附带 `externalLeadsDomainMock=1`。
- 若真实接口字段、返回口径、权限语义或错误码与技术方案不一致，必须分类为 `API_ISSUE` / `DATA_CONTRACT_MISMATCH`；不得用 `Sample Coverage Mock` 或 `/delivery:mock` 抹平，也不得因此宣称 verify/design 已通过。
- `MOCK_PREVIEW` 下，`Runtime Contract Mock` 只能通过 `/delivery:mock` 生成、调整、patch 和验证；`/delivery:mock` 内部直接调用 `bam-mock-runtime-generator`，只允许修改 mock 产物、目标 BAM、目标 BAM wrapper 的 `BAM_MOCK_WRAPPER_FIELD` request 字段透传 marker 与生成器管理的 `__mock__` 文件。
- `/delivery:code` 不操作浏览器、不调用 `/delivery:mock`，也不写入 mock runtime、BAM marker、BAM wrapper request 字段透传或生成器管理的 `__mock__`。任务需要 runtime mock 。
- `/delivery:mock` 使用 `real_response_contract_first`：必须先基于正式代码链路，通过 UI 自然操作触发真实接口请求。真实 response 可取得时，用真实 request / 真实 response 作为 mock 基准；若 UI 可到达请求点但因安全、权限、写接口副作用等原因不能发到后端或不能取得 response，rule 标记为 `NO_RESPONSE_DATA`，仍必须生成可命中的 warning mock rule；若必要接口经过两轮 UI 自然点击仍无法在 Network 定位请求，允许标记为 `SYNTHETIC_CONTRACT` 并生成符合接口的 synthetic request / response 数据 mock，同时记录两轮尝试、接口必要性和 real verify 回收项；其他无法通过 UI 发起请求的场景才标记 `PENDING` / `BLOCKED`。
- Mock 规则只能按 `apiName + 关键自然业务请求字段 key/value` 匹配；禁止读取 response 反推 `ruleId`。只有字段值会影响 mock matcher 命中、ruleId 分流、mock 返回或当前 case 请求断言时，才是关键影响请求字段；仅为真实请求成功、id 透传、分页、上下文或采集证据服务且不改变当前 rule 的字段，必须作为 `realRequest` / `collectionOnlyFields` 记录，不得进入 matcher。`BAM Mock Response Field Coverage Matrix` 的 `request key/value` 可以把这类非影响字段写成 `field=<真实UI获取>`，仅用于提示 `/delivery:mock` 后续 UI 自然请求采集真实值，不能作为 rule 匹配条件。一个 `(接口 - 关键影响请求字段 - 字段值)` 只能对应一个 `ruleId`；同一次请求命中多个具体规则必须视为匹配失败并调整规则。不同响应场景必须通过不同自然请求字段区分；若同一影响字段的不同取值需要不同 mock 规则，必须拆分 `ruleId` 和 test case。
- 新增或后端尚未支持的目标业务请求字段仍必须完整发送到 BAM mock runtime，不得为了兼容真实接口当前缺口而删除或过滤。测试专用 selector 不得作为自然 UI Gate 条件；真实接口接入后再按后端合同决定是否清理或调整字段。
- 若 UI / store / service 已生成当前 case 必需的 request 字段，但 BAM 生成 wrapper 未透传该字段，`/delivery:mock` 可以在目标 BAM wrapper 内用 `BAM_MOCK_WRAPPER_FIELD` marker 补齐最小透传。这属于 BAM mock patch，不属于业务代码修改；必须在 manifest `requestFields`、`mock-log.md`、`delivery-mock.md` 和最终验证中记录。
- 不得真实调用未确认的 IM、触达任务、BPO、下载、上传解析或新增接口；写接口合同未确认时必须 `PLAN_DISCOVERY` / `BLOCKED` / `Excluded Real Integration`，不得 fake success。
- 不得把 `mock-preview` 标记为真实联调完成、READY 完成或交付验收完成。
- `04-tech-plan.md` 必须标注 `Implementation Mode: MOCK_PREVIEW`，Plan Readiness 最高为 `PARTIAL_READY`。
- BAM mock 一旦生成或调整，`delivery-mock.md` 与每接口 `mock/apis/<apiName>/manifest.json` 必须记录完整 BAM mock 规则、字段覆盖、patch 状态和最终验证结论；`mock/rule-map.json` 只记录最小索引，`mock/rule-map.md` 可展示人工总览摘要。
- `05-implementation-log.md` 必须登记 task 阶段生成的 `Mock Preview Scope`、`Mock / Real Boundary`、`delivery-mock.md` / `mock/rule-map.json` / 每接口 `manifest.json` 引用、被排除的真实集成范围，以及真实接口接入后必须重跑的验证。
- 只有 `MOCK_PREVIEW` 下 `/delivery:verify` 或 `/delivery:design` 才能把 BAM runtime mock 缺口分类为 `MOCK_ISSUE` 并转入 `/delivery:mock`。非 `MOCK_PREVIEW` 下不得因没有 mock 触发 detour；若页面或请求失败，应按真实 `API_ISSUE`、`DATA_ISSUE`、`ENV_ISSUE`、`CODE_ISSUE`、`DESIGN_ISSUE` 或 `UNKNOWN` 分类。
- `SAMPLE_COVERAGE_GAP` 只允许出现在 `verify` / `design`，且只能作为“基础真实链路或合同已明确 + 样本覆盖不足”的临时补充 detour 类型。阶段报告中必须同时记录 `base_contract_evidence`（技术文档 / BAM / IDL / generated types / 代码消费 / 同接口真实请求）与 `mock-only supplemental evidence`，两者不得互相替代。
- `SAMPLE_COVERAGE_GAP` 的 mock 产物必须是临时态：当前 active case 关闭后，主 Agent 必须在同一执行会话立即调用 `/delivery:mock` 清理本次补充规则、BAM patch / wrapper patch、manifest active rule、生成器管理的临时 `__mock__` 文件、`delivery-mock.md` 执行记录中的临时条目，并移除浏览器 URL 中的 mock-debug 参数后复查页面不再依赖该 mock。若当前阶段结束前仍残留 sample-gap mock 代码或产物，阶段 Gate 不得放行。

### Delivery Mock Detour Protocol

- `MOCK_PREVIEW` 的 verify / design 发现 BAM mock 缺口时，当前执行会话必须直接进入 `/delivery:mock`，并携带缺口证据、恢复点和受影响 `task_id` / `case_id` / `ruleId`；mock、BAM marker、BAM wrapper request 字段透传与生成器管理的 `__mock__` 变更由 `/delivery:mock` 完成。
- `verify` / `design` 在非 `MOCK_PREVIEW` 下若命中 `SAMPLE_COVERAGE_GAP`，且接口 / 字段 / schema / 代码消费链路已明确、当前 active case 只缺样本或状态覆盖，可直接进入 `/delivery:mock` 做单 case 临时补充取证。该 detour 必须携带 `case_id`、`origin_stage`、`resume_point`、`base_contract_evidence`、`supplemental_assertions`、`forbidden_contract_assertions`、`mock_debug_param`、`cleanup_required=true` 和恢复点；mock 只允许服务当前 case 的补充证据，不得扩大为阶段级 mock 依赖。
- `/delivery:mock` 直接使用 `bam-mock-runtime-generator` 更新 mock 产物、runtime、manifest、BAM marker 和必要的 BAM wrapper request 字段透传 patch，并把本次恢复信息写入 `delivery-mock.md` 的执行记录。
- 每次调整完成门禁是 BAM mock 审查通过：调整前日志、`rule-map` 索引 / manifest / runtime / BAM marker 一致、最终 patched BAM 验证通过、Forbidden Path Check 通过。
- 审查通过后必须立即回到原工作流继续：verify 回原 case，design 回原核验点；不得停在“mock 修复完成”。仅当 plan 无法闭合、自然请求字段无法确定、需改业务代码、越过授权路径或 BAM mock 审查无法通过时才中断。

### Shared Case Evidence Closure Protocol

`/delivery:verify` 与 `/delivery:design` 使用同一套逐 case 闭环骨架，但不得合并阶段职责：verify 关闭运行态事实，design 关闭 Figma / 视觉 / 可见交互合同。

统一闭环顺序：

1. 从 `09-test-case-matrix.md` 建立阶段专属 Case Queue，并设置唯一 `active_case_id`。
2. 读取当前 case 的 `contract_ref`、`positive_assertion`、`negative_assertion`、`visual_assertion`、`negative_visual_assertion`、`evidence_required`、`runtime_state`、`capture_scope`、`verify_screenshot_key`、`design_reuse_policy`、mock 边界和运行入口。
3. 按阶段职责采集证据，并用稳定 `evidence_requirement_id` 将断言逐项映射到实际证据。
4. 若出现 `MOCK_ISSUE`，必须记录 `origin_stage`、`case_id`、`ruleId`、`apiName`、`resume_point`、关键 request / response 或截图摘要，执行 `/delivery:mock` 后回到同一 `active_case_id` 重取证据。若出现 `SAMPLE_COVERAGE_GAP`，只允许在 `verify` / `design` 记录 `base_contract_evidence`、当前缺失样本、允许补充的断言和禁止用 mock 覆盖的 contract 断言，再执行 `/delivery:mock` 回到同一 `active_case_id`；当前 case 关闭后必须先完成临时 mock cleanup，才能进入下一个 case。
5. 若出现可执行代码修复，必须先物化受限任务边界、可执行范围（优先写允许 / 禁止路径，也可写页面、组件、代码落点或定位依据）、验证或 HMR 复核点，再派 `code-writer`；若修复已回流为 `/delivery:code` 的 `Task N`，则按正式 Task N 输入包派 `code-writer`。返回后只复验同一 `active_case_id`。
6. 只有当前 case 的证据对账、detour 恢复、closure evidence 和阶段报告归档完成后，才能进入下一个 case。

共享证据字段至少包含：

- `case_id`
- `contract_ref`
- `evidence_requirement_id`
- `assertion_ref`
- `verification_status`
- `execution_ref`
- `recording_status`
- `evidence_type`
- `evidence_source`
- `evidence_ref`
- `observed_value`
- `coverage_result` / `result`
- `runtime_state`
- `capture_scope`
- `verify_screenshot_key`

阶段专属扩展：

- verify 必须额外记录命令、Network、DOM / UI、mock hit、integration、code-fix handoff、`Runtime Screenshot Evidence Index` 和 `Case Evidence Coverage Audit`；verify 截图只能作为 runtime source，不得声明设计对齐通过。
- design 必须额外记录 `figma_source_type`、`figma_source`、`ui_evidence_mode`、`f2c_source`、`consumed_contract`、`runtime_source`、`structure_comparison`、`style_comparison`、`negative_scan`、`Design Evidence Debug Log` 和 `Design Case Ledger`；缺 Figma screenshot / Figma node data、缺匹配状态的 runtime screenshot，或 `F2C_REQUIRED` 缺 `/f2c` / d2c 结构证据时不得 PASS。

Gate 放宽范围：

- 缺少后端设计、接口路径、请求 / 响应字段、分页、排序、错误码、跨系统协议时，不阻塞 `/delivery:plan --mock-preview`。
- 这类问题必须进入 `PLAN_DISCOVERY` 或 `P1_RISK`；BAM mock rule 需求由 `/delivery:task` 从 Test Case Matrix 推导。若字段或调用链不足以让前端一次成型，必须 `BLOCKED` 或收缩范围。

Gate 不放宽范围：

- PRD 核心业务规则冲突。
- 权限业务规则无法判断且影响页面显隐。
- 设计主态缺失到无法确定页面结构。
- 用户未确认允许进入 mock-preview 代码实现。

### `/delivery:init` Gate

必须完成：

- 创建当前任务 workspace。
- 若输入是 PRD/飞书文档链接，必须先保存 `prd-source.md`；若拉取失败，必须暂停提问。
- 写入 `00-inputs.md`、`01-intake.md`。
- 更新 `.trae/DELIVERY_STATE.md`。

只允许进入 `/delivery:prd`，不得直接进入技术规划或代码实现。

### `/delivery:prd` Gate

必须完成：

- `03-prd-analysis.md`：模块、功能点、原子需求、验收标准。
- `uncertainty-register.md`：P0/P1/P2 未决问题。
- `ui-source-map.md`：PRD/设计稿/截图/白板来源映射。

如果 P0 影响技术规划，必须暂停提问。
PRD 后 Ask First 提问必须满足用户可回答性：Figma / 白板 / 评论 / 技术文档缺口必须列出具体缺什么、影响什么和可选处理口径；不得把内部 Gate 失败包装成泛化问题。若飞书卡片渲染 fallback、提交失败或回调未到达，必须按 `ask-first` skill 的 `TEXT_FALLBACK` 路径落盘用户决策，不得反复要求用户提交不可用卡片。

### `/delivery:bam` Gate

当当前 workspace 的 `tech-doc-raw.md` 包含 BAM 接口链接时，必须在 `/delivery:plan` 前完成本阶段。

必须完成：

- `bam/bam-sync-report.md`。
- `bam/bam-branch-preflight.json`。
- 先由 LLM 完整阅读技术文档并落盘 `bam/bam-psm-branch-evidence.json`，唯一记录 frontend BAM target 的 PSM 与目标分支；技术文档显式给出 PSM + 对应分支时优先使用该证据，未给出时才从 BAM 链接解析 PSM / `api_branch`。不得把技术文档里的 repo / rpc 分支直接外推到没有前端 HTTP 接口变更证据的 BAM PSM。
- 先由 LLM 完整阅读技术文档并落盘 `bam/bam-interface-change-evidence.json`，覆盖所有有变更的 HTTP 接口和字段。
- 若 `bam/bam-psm-branch-evidence.json.items` 非空，才继续：
  - 唯一定位目标业务仓库、目标 app/package 和目标 `bam.config.js`。
  - 先通过 `.trae/scripts/bam_branch_preflight.mjs` 执行 branch preflight，并落盘 `bam/bam-branch-preflight.json`；该脚本必须按 probe chain 优先使用项目本地 / skill 提供的 branch checker，再回退内置 probe，不得把 `bits-cli bam` 固化成唯一 checker。目标 PSM 的 branch 不存在、鉴权失败或 preflight blocker 未解除时，不得继续写 `bam.config.js` 或执行 BAM update。
  - 用脚本对比 `bam.config.js` 已有 include，生成 `bam/bam-method-lookup-plan.json`；技术文档明确给出的新增接口或缺 method 接口必须通过链接 endpoint_id 执行 `bytedcli --json bam method get --endpoint-id <ID>` 并落盘 `bam/bam-method-metadata.json`。
  - 仅通过 `.trae/scripts/sync_bam_config_from_tech_doc.mjs` 修改 `bam.config.js` 的 PSM 分支和 include 缺失项，不允许手工编辑；且必须传入 `--branch-preflight <workspace>/bam/bam-branch-preflight.json`，让 `bam-sync-report.md` 嵌入结构化 `branch_preflight.status`、`branch_preflight.checker_kind`、`branch_preflight.verification_level` 和 `branch_preflight.summary`。
  - 先执行 repo 级依赖恢复，再优先在目标 app/package 执行 BAM 更新命令；只有 app 级入口不可用或未命中本地 generator 时，才回退到 repo 级命令。
  - 若 repo 级 BAM 命令产生其他 app/package 的 `src/bam/**` 改动，必须在交付前自动回退无关 BAM 生成物，只保留目标 app/package 的结果。
- 若 `bam/bam-psm-branch-evidence.json.items` 为空，必须通过 `.trae/scripts/bam_branch_preflight.mjs --mode no-op-report` 将本阶段记为 `SKIPPED_NO_BRANCH_EVIDENCE` no-op：同时写 `bam/bam-branch-preflight.json` 与 `bam/bam-sync-report.md`，明确无分支证据、未执行 BAM mutation、下一步进入 `/delivery:plan`；不得基于现有 `bam.config.js` 默认分支继续 BAM update。

如果已提取出的 PSM / 分支 / 目标 app/package / config entry 不唯一，frontend BAM target 过宽，branch preflight 失败，任一接口无法确认 method/path，或 BAM 更新命令失败，必须暂停提问或报告环境 blocker，不得进入完整 `/delivery:plan`。仅“全文阅读后未提取到任何目标分支”不构成 blocker。

### `/delivery:plan` Gate

必须完成：

- `04-tech-plan.md`
- Plan Readiness：`READY` / `PARTIAL_READY` / `BLOCKED`
- 如果当前 workspace 的 `tech-doc-raw.md` 包含 BAM 接口链接，必须先完成 `/delivery:bam` 或提供等价 BAM 证据。允许两种完成态：
  - mutation 完成态：需包含 `bam/bam-psm-branch-evidence.json`、`bam/bam-interface-change-evidence.json`、`bam/bam-branch-preflight.json`、`bam/bam-method-lookup-plan.json`、必要时的 `bam/bam-method-metadata.json`，且 `bam/bam-sync-report.md` 证明 PSM、目标分支、目标 app/package、`bam.config.js`、Required Include Entries、接口字段变更证据、结构化 `branch_preflight.*` 字段和 BAM 更新结果唯一且无 blocker。
  - no-op 完成态：`bam/bam-psm-branch-evidence.json.items` 为空，且 `bam/bam-branch-preflight.json.status = SKIPPED_NO_BRANCH_EVIDENCE`，`bam/bam-sync-report.md` 明确 `status: SKIPPED_NO_BRANCH_EVIDENCE`、未执行 BAM mutation、下一步进入 `/delivery:plan`。
- 所有技术规划场景必须通过 `Use Skill: writing-plans` 生成或修复 `04-tech-plan.md`；包括首次规划、重跑规划、增量修复、READY / PARTIAL_READY / BLOCKED 输出、限定实现计划和 `MOCK_PREVIEW` 的接口探索 / 真实集成禁区计划。
- `09-test-case-matrix.md` 必须通过独立 `Use Skill: test-case-planning` 基于 `03-prd-analysis.md` 和 `04-tech-plan.md` 生成，并给出 coverage audit 结论。
- `09-test-case-matrix.md` 的视觉相关 case 必须显式分层为 page-level、region-level 或 interaction-level；核心页面至少有 1 条 page-level 首屏视觉 baseline case，不能只靠局部 hover / tag case 关闭整体 UI 风险。
- 若存在 `ui-source-map.md` 或 `prd-figma-supplement.md`，必须在 `04-tech-plan.md` 中前置生成 `Figma / UI 改造清单`，把已确权视觉稿事实转成实现任务。
- `04-tech-plan.md` 必须生成 `UI Implementation Directive Matrix` 或等价表，把每个 UI requirement 明确到具体 Figma `fileKey/nodeId`、`figma_state_scope`、实现指令、`UI Evidence Mode`、组件策略和代码定位提示。实现指令必须写成可由 `/delivery:task` 物化的动作，例如使用 `/f2c` / d2c 实现某节点、复用具体组件路径并应用某节点 token、或保留 legacy 组件做局部 patch；不得只写“有 Figma / 按 Figma 实现 / 复用组件”。
- `04-tech-plan.md` 的 `UI Implementation Directive Matrix` 若已确权到 leaf 级节点，必须把同一执行切片的 `page_ref / page_nodeId`、`region_ref / region_nodeId`、`leaf_ref / leaf_nodeId` 一起作为可传递语义包落盘；`page / region` 用于提供实现上下文，`leaf` 用于锁定最终施工锚点，后续阶段不得把 leaf 静默退化为 ancestor。
- 若存在 Figma 节点语义审计，`04-tech-plan.md` 必须提供可供主 Agent Gate Review 的语义确权事实层（例如 `Figma Semantic Node Review Ledger` 或等价结构），把候选节点与允许传给 `/delivery:task` 的最终节点分开；`/delivery:task` 只能消费已被主 Agent 明确放行的切片事实，不得消费仅有候选意义的 node。
- 三契约必须融合 visual contract 防漏字段：`Figma Region Contract` 覆盖结构签名、必显元素/字段、禁显元素/残留；`Figma Interaction Contract` 覆盖负向断言；`Figma Cell Contract` 覆盖必显子元素/字段和禁显子元素/残留。
- 若存在 Figma 合同 audit / recovery，必须先通过 PRD Source Handoff Check；source 不完整时回流 `/delivery:prd`，Plan 不得补抓 raw 或生成索引。通过后，以更新后的同一份 `04-tech-plan.md` 完成 drilldown / semantic recovery / consumption loop；仍有 `recovery_rows` 时，Main Agent Gate 必须收敛为 `AUTO_FIX_REQUIRED` 并留在 `/delivery:plan` 内继续。
- `node-index.json` 若不是带顶层 `nodes[]` 与 authority 元数据的 Plan 可消费索引，或 plan audit / consumption 明确返回 `RETURN_TO_PRD_SOURCE_CLOSURE`，必须视为 PRD source handoff 失败；不得改写成 manual pass、兼容性通过或“脚本问题但 plan 仍可放行”。
- 若 `Implementation Mode: MOCK_PREVIEW`，`04-tech-plan.md` 只负责声明实现模式、接口探索结论、风险和 `Excluded Real Integration`，并且不得规划 fallback store、preview service、内联 fixture、adapter 造数或 fake success。
- 顶层切换按钮、表格 Tab、筛选项、表头列顺序、批量操作区、状态 Tag、操作列和容器形态不得留到 `/delivery:design` 才补救。

当 Plan Readiness = `BLOCKED` 时，必须暂停提问，不得进入 `/delivery:mock`、`/delivery:task` 或 `/delivery:code`。

下一步路由：

- `Implementation Mode: MOCK_PREVIEW`：进入 `/delivery:task` 生成 Test Case Matrix、BAM Mock Response Field Coverage Matrix、Mock Preview Scope 和 Mock / Real Boundary，并把每个需要 BAM mock 的依赖绑定到对应 task；mock 实施与浏览器验证统一由 verify 按 case 闭合。
- 非 `MOCK_PREVIEW`：进入 `/delivery:task`。

### `/delivery:mock` Gate

当当前需求为 `Implementation Mode: MOCK_PREVIEW`，或当前处于 `verify` / `design` 的 `SAMPLE_COVERAGE_GAP` 执行上下文时，允许执行 `/delivery:mock`。`/delivery:mock` 是 BAM mock 唯一入口，用于在业务代码调用链完成后按当前依赖定向生成、修复或清理 mock。

- `MOCK_PREVIEW` 继续按 task/case/rule 合同执行正式 mock-preview。
- 非 `MOCK_PREVIEW` 下仅允许 `verify` / `design` 为单个 active case 进入 `/delivery:mock`，且必须同时满足：基础真实链路或接口合同已明确、当前缺口仅是样本或状态覆盖、命令上下文已固定 `mock_debug_param`、补充取证结束后会立即清理临时 mock 代码与产物。
- 其余非 `MOCK_PREVIEW` 场景仍禁止调用 `/delivery:mock` 来补“缺 mock”；各阶段必须把 mock 相关检查记为 `N/A` 并继续执行自己的真实验证或实现职责。

必须完成：

- `delivery-mock.md`：当前 BAM mock 执行摘要、对齐结论、patch / verify 状态、真实验证回收要求，以及本次 detour 的 `origin_stage`、`resume_task_or_case`、`resume_command`、`mock_result`（如适用）。
- 当前 workspace 下的 `mock/` 目录必须使用目标结构：`rule-map.json`、`rule-map.md`、`apis/<apiName>/manifest.json`、`script.mjs`、`verify.mjs`。
- `rule-map.json` 索引、`rule-map.md` 总览与每接口 `manifest.json` 必须与 `09-test-case-matrix.md` 的 Test Case Matrix、BAM Mock Response Field Coverage Matrix、Mock Preview Scope、Mock / Real Boundary 对齐。
- 不再存在 patch 前阶段审核；唯一审核点是最终 patched BAM 验证审核，且每条 active rule 必须有最终验证结论。
- 只允许修改目标 BAM、目标 BAM wrapper 的 `BAM_MOCK_WRAPPER_FIELD` request 字段透传 marker 与对应生成器管理的 `__mock__` 文件；不得修改 route、component、hook、store、service、adapter 等业务代码绕过 BAM mock。
- 当前执行会话必须通过 `/delivery:mock` 直接使用 `bam-mock-runtime-generator` 审查和更新受影响 `case_id + ruleId + apiName`。
- 每个需要后端响应的 test case 最多对应一个 `ruleId`，每个 `ruleId` 对应一条 BAM mock rule；不依赖后端响应的 case 必须标记 `ruleId: N/A`。
- `BAM Mock Response Field Coverage Matrix` 必须逐行覆盖所有需要 `ruleId` 的 `BAM_RUNTIME_MOCK` test case；多个 case 共用同一 `ruleId` 时仍要按 `case_id` 展开，不得只写代表 case，manifest / rule-map 必须用 `caseIds` 数组回溯完整 case 列表。
- 每个 `ruleId` 必须在 manifest 中记录影响 mock 规则的 request key/value、request 合同来源、mock 规则和验证断言；矩阵中以 `<真实UI获取>` 表达的非影响请求字段记录到 `realRequest` / `collectionOnlyFields`，不得进入 `ruleMatchKeys`。真实 response 可用时记录 UI 真实 request、真实 response、mock 后 response 和 `mockOperations`；安全、权限或写接口导致无响应数据时标记 `NO_RESPONSE_DATA` 并生成 warning mock rule；必要接口两轮 UI 自然点击仍无法定位请求时标记 `SYNTHETIC_CONTRACT`，记录 synthetic request / response、两轮尝试和 real verify；其他无法通过 UI 发起请求时才保持 `PENDING` / `BLOCKED`。
- 必须审查 Runtime Generator Summary、Task / Case Alignment、Final Verification、Changed Files 和 Forbidden Path Check，完成 `rule-map` 索引与最终 patched BAM 验证审核后才可更新 `delivery-mock.md` 并放行。

BLOCKED 条件：

- 缺少目标 vmok URL，或按当前 `Browser Runtime Mode`（桌面内置浏览器 / Profile fallback，或 CoCo CLI 无头浏览器 / storage state）仍无法取得必要页面 / 请求证据。
- BAM method / path / response 字段无法与 `09-test-case-matrix.md` 的 case / rule 对齐，且无法通过新增字段 patch、wrapper request 字段透传 patch 或 temporary mock API 合规记录。
- 最终 patched BAM 验证未通过，或 `rule-map` 索引 / 接口 manifest 与 task 阶段 mock 合同不一致。
- 规则没有自然 UI 可产生的请求条件，或依赖 response / 测试专用 selector 才能命中。

PASS 后：必须按 `delivery-mock.md` 本次执行记录恢复原 verify / design 工作流。

### `/delivery:task` Gate

必须完成：

- `delivery-task.md`：必须通过独立 `Use Skill: task-planning` 基于 `03-prd-analysis.md`、`04-tech-plan.md`、`delivery-mock.md`（如存在）和必要 Figma / design evidence 生成；不得把最终 `### Task N` 回写进 `04-tech-plan.md`。
- `delivery-task.md` 中的 `### Task N: ...` 可执行任务列表；任务必须由 plan 覆盖表、Figma contract、`Excluded Real Integration` 和 `delivery-mock.md`（如存在）推导，不得临时发明范围。
- UI Task 必须把 `04-tech-plan.md` 的 `UI Implementation Directive Matrix` 物化为 `implementation_directive`、`ui_evidence_mode`、`component_strategy`、`figma_fileKey`、`figma_nodeId`、`figma_state_scope`、`mapped_case_ids`、`acceptance_focus_ref` 和 checkbox step。`F2C_REQUIRED` 必须明确 `/f2c` / d2c 动作和 nodeId；复用组件必须明确组件路径和复用边界；不得只写“对齐设计”。
- UI Task 若来自已确权 leaf 级 directive slice，必须同时物化该 slice 的 `page + region + leaf` 语义包；其中 `figma_nodeId` 只允许指向当前 Task 的最终 leaf，`page / region` 作为上下文字段显式保留在 task 描述、directive 引用或等价结构中。task 阶段不得把已确权 leaf 回退成 page / region / table 容器来兜底。
- `09-test-case-matrix.md` 必须通过独立 `Use Skill: test-case-planning` 基于 `prd-source.md`、`03-prd-analysis.md`、`04-tech-plan.md`、`delivery-task.md`、`delivery-mock.md`（如存在）和必要 Figma / design evidence 生成，并给出 coverage audit 结论。
- `Plan Drift Audit` 必须为 PASS：`04-tech-plan.md` 与 `delivery-task.md` 不得偏离 `prd-source.md`、用户显式决策或已确权 Figma evidence。若发现业务语义反转、in-scope 范围缺失、未确权事实被当作确定实现、Figma 主结构 / 文案 / 字段 / 状态冲突，必须返回 `/delivery:plan` 修复；不得由 task / test case 阶段自行改写为另一套事实继续放行。
- 每个 UI Task 必须把功能点、Figma state / node 和验收 case 绑定成可审计追踪链：`figma_fileKey`、`figma_nodeId`、`figma_state_scope`、`mapped_case_ids`、`acceptance_focus_ref` 缺一不可；若这些字段无法唯一定位当前 task，要返回 `/delivery:plan` 消歧，不得带着模糊绑定进入 `/delivery:code`。
- 若 `Implementation Mode: MOCK_PREVIEW`，`09-test-case-matrix.md` 必须包含 `Test Case Matrix`、`BAM Mock Response Field Coverage Matrix`、`Mock Preview Scope` 和 `Mock / Real Boundary`；一个 test case 最多只能对应一个非 `N/A` `ruleId`，且 `BAM Mock Response Field Coverage Matrix` 必须逐行列出所有 `BAM_RUNTIME_MOCK` 且 `ruleId != N/A` 的 case。无法单 rule 覆盖，或同一请求影响字段不同 value 会命中不同 mock rule 时，必须拆分 test case。
- `09-test-case-matrix.md` 必须把三契约防漏字段映射为 `contract_ref`、`positive_assertion`、`negative_assertion`、`evidence_required`。
- `MOCK_PREVIEW` 下的 case 必须把 BAM mock 验证标记为 `mock-preview verified`，并为真实接口接入后保留 real verify case / notes；不得把 mock 结果写成真实业务完成。
- 主 Agent 必须固定实现模式、事实源、输出路径、禁止路径和 mock 边界，再派发 `.trae/agents/task-planner.md`。
- `task-planner` 负责先生成 `delivery-task.md` 并执行 `Executable Task Check`，再生成 `09-test-case-matrix.md` 并执行 coverage audit；不得修改 plan、mock、BAM、业务代码或阶段状态。
- 主 Agent 必须审查 `task-planner` 的 `Agent Gate Summary`、Task Readiness、Executable Task Check、Task Coverage Audit 和 Test Case Coverage Result，再决定进入 `/delivery:code` 或回退。

当 `delivery-task.md` 的 Task Readiness、`09-test-case-matrix.md` 的 coverage audit 或 `Plan Drift Audit` 为 `BLOCKED_NEEDS_PLAN_REWORK` 时，必须暂停或返回 `/delivery:plan` 修复。`MOCK_PREVIEW` 下 mock 产物未生成不得阻塞 `/delivery:code`；Task 只声明 mock 依赖和 verify case。非 `MOCK_PREVIEW` 下不得生成 mock 步骤，mock 产物缺失一律为 `N/A`。

### `/delivery:code` Gate

执行前必须满足：

- `03-prd-analysis.md` 已完成；若启用 Mock Preview Mode，允许 `PARTIAL_READY_FOR_PLAN`，但必须无影响前端效果预览的 P0。
- `04-tech-plan.md` 为 READY 或用户明确允许 PARTIAL_READY 实现。
- `/delivery:task` 已完成，`delivery-task.md` 存在且 `Task Readiness: PASS`，`09-test-case-matrix.md` coverage audit 为 PASS。
- 若 `Implementation Mode: MOCK_PREVIEW`，必须检查 BAM矩阵是否包含当前 Task需要的 rule，只允许更新 `BAM Mock Response Field Coverage Matrix` 中当前 `case_id / ruleId / apiName` 行的 `补充说明` 列，不阻断 Code。
- `uncertainty-register.md` 无影响实现的 P0。
- 用户已确认允许进入实现。
- `04-tech-plan.md` 已包含并覆盖 `Figma / UI 改造清单`；若遗漏已确权 UI 改造点，必须先回到 `/delivery:plan` 修复。
- UI / Figma Task 已通过 `PRD / Figma Semantic Alignment Gate`：PRD 原子需求、Figma 可见合同、`delivery-task.md` 实现目标和 `09-test-case-matrix.md` 断言必须同义。不得只因为“有 Figma node / 有截图 / 有 case”就派发 `code-writer`；不匹配时回 `/delivery:plan` 或 `/delivery:task`。
- UI / Figma Task 在派发 `code-writer` 前，还必须确认 task packet 仍保留来源 directive slice 的 `page + region + leaf` 语义包，且最终 `figma_nodeId` 没有从已确权 leaf 退化为 ancestor；若 task 只剩 page / region 容器或无法回指来源 slice，必须回 `/delivery:task` 或 `/delivery:plan`。
- Code 阶段必须消费 `delivery-task.md` 已声明的 `UI Evidence Mode`；不得在 code 阶段重新给 task 分类。`F2C_REQUIRED` 使用 `/f2c` d2c / Figma 结构证据；`RUNTIME_BASELINE_ALLOWED` 只消费已存在的 Figma / Design contract 与已归档 runtime baseline，不在 Code 新开浏览器复核；`NO_F2C_REQUIRED` 必须说明不涉及视觉结构还原。若 task 中的 mode、`figma_state_scope` 或实现证据与 plan / task 合同冲突，必须返回 `/delivery:task` 或 `/delivery:plan`。
- Code 阶段必须按 `delivery-task.md` 的 `### Task N` 顺序串行执行。主 Agent 负责建立任务队列、分派单个 Task、审核代码 diff、静态检查、非浏览器测试和独立审查；`code-writer` 负责当前 Task 内的正式业务代码实现和非浏览器局部测试。未完成当前 Task 的主 Agent Gate Review 前，不得派发下一个 Task。
- 每个 Task 完成后，主 Agent 必须审查子 Agent 的 `Agent Gate Summary`、`05-implementation-log.md` 记录；UI Task 还必须审查 `UI Evidence Usage` 和独立审查子 Agent 的 `ui_evidence_fit`。审核未通过时不得继续任务队列。
- Code 阶段的审查提速必须使用 `Task Context Index` 和 `Task Review Packet` 减少重复读全文、重复跑命令，而不是减少审查项。Task 阶段不产出“可改动文件范围”约束，只提供代码定位线索和排除范围；独立 reviewer 默认先读 packet + targeted diff + 机械检查结果，基于真实 diff 判断是否影响不相干逻辑、后续 Task 或用户排除范围。只有 packet 缺证据、摘录冲突、targeted diff 不足、命令证据过期或发现高风险扩散时，才扩大回读完整 plan/task/test/log/code 上下文。普通 Task 仍必须保留独立只读审查，且 reviewer 输出必须包含 `packet_sufficiency`、scope / contract / UI evidence / mock boundary / verification freshness 结论。
- 常规 `/delivery:code` 业务代码 Task 完成前，`code-writer` 必须执行静态类型检查（优先使用 task 声明或仓库最小 typecheck 命令），保证当前 Task 类型无误；结果必须写入 `05-implementation-log.md` 的 Task Dispatch / Review Ledger。由 `/delivery:design` auto-fix 派发给 `code-writer` 的 `Design Rework Task` 默认走 HMR-first / browser-first 复核，只有 dev server 编译失败、页面 runtime error、改动涉及类型 / 接口 / 数据结构 / 公共组件、`code-writer` 未给出基本验证结果或浏览器证据无法定位问题时，才升级执行 targeted typecheck / build / diagnostics。
- `REAL_READY_LIMITED` 只允许用于“真实接口/BAM 合同当前确实缺字段，但摘要级真实合同已闭合”的场景；不得把它用作 UI 未消费已存在字段、交互未接线、组件漏实现或 adapter 已接入但渲染层未落地的兜底说明。
- 若 code / verify 发现 case 依赖的 BAM 字段已存在于真实 response、generated types、model 或 adapter 中，当前 case 不得继续按 `REAL_READY_LIMITED` 收口；必须优先定位为 `CODE_ISSUE`、补充 `code-fix-handoff.md`（如在 verify 阶段）并回到 `/delivery:code` 最小修复后复验。

否则禁止修改业务代码。

### `/delivery:verify` Gate

验证阶段专属启动协议必须先完成 `Pending Verification Merge Audit`、建立 Verify Case Queue 并初始化 case-result 文档，再执行 Preflight / 本地应用启动 / 浏览器运行态探测。进入 `/delivery:verify` 时可以读取必需输入和初始化阶段产物，但不得在 case queue 落盘前启动 dev server、打开浏览器或采集运行态证据。

Preflight 开始后执行以下环境启动与浏览器协议：

- 按 `.trae/PROJECT_CONTEXT.md` 约定的启动命令启动本地应用，并验证 `http://localhost:8079/alliance-operation-daren` 可访问；该地址仅作为子应用 health check。
- 当前项目 mock-debug 必须通过 vmok 壳访问：`https://ecop.bytedance.net/alliance-operation-daren/author-import?cjDebugSubApp=alliance-operation-daren:http://localhost:8079/alliance-operation-daren`。
- 禁止直接把 localhost 深链作为页面交互、截图或 Network 验证入口；localhost 白屏而 vmok 壳正常时，应归类为宿主上下文问题。
- 浏览器验证必须先判定 `Browser Runtime Mode`。主 Agent 只保留模式判定、登录态边界、active case、失败分类和 Gate Review；页面打开、点击、DOM / screenshot / console / Network 采集属于机械证据动作，可由当前浏览器工具、runbook 或明确授权的 browser-capable helper 完成，但不得把 case 判定或阶段推进下放：
  - `TRAE_DESKTOP`：有 Trae 桌面内置浏览器能力时，继续优先使用 Trae 内置浏览器（`integrated_browser` / `browser_*` 工具）在主 Agent 当前会话完成 vmok URL 打开、snapshot、DOM、截图、点击和 Network 检查。若内置浏览器无法复用登录态、无法打开 vmok 壳或落到 SSO，再使用有头 Chrome + 专用持久化 profile fallback。后续截图、snapshot、点击验证和 mock-debug 优先复用同一内置浏览器会话或同一个持久化 profile/state。
  - `COCO_CLI_HEADLESS`：无桌面 / CoCo / Trae CLI 环境中不得依赖有头 Chrome 或 Trae 内置浏览器；必须使用无头浏览器（优先 Playwright Chromium，其次可用的 Chrome DevTools / browser MCP headless 能力）打开同一 vmok URL，使用专用持久化 user data dir / storage state 复用登录态，完成 DOM、screenshot、console、Network 和点击证据采集。
- `Browser Runtime Mode`、`browser_tool`、`headless`、`browser_profile_or_state`、`network_evidence_level`、`sso_result`、`vmok_url` 必须写入 `06-debug-verification.md` / `07-design-alignment.md` / `delivery-mock.md` 中对应的环境或证据记录。字段完整性由阶段模板和 `scripts/check_browser_runtime_contract.mjs` 这类确定性检查兜底，不依赖主 Agent 记忆。若 CLI 无头浏览器缺少登录态且无法通过安全方式注入 storage state，应归类为 `ENV_ISSUE / HOST_AUTH_REQUIRED`，暂停要求用户提供可用登录态或在授权环境完成登录；不得改回有头浏览器假装验证完成。
- 若浏览器截图出现白屏、空白主区域、只有骨架/Loading 或截图无法支撑当前 case 判定，必须优先读取同页 console 日志，检查是否存在 `error` / uncaught exception / resource load failure / chunk load failure / hydration 或 runtime crash 线索，再决定分流为 `ENV_ISSUE`、`CODE_ISSUE`、`HOST_CONTEXT_ISSUE`、`API_ISSUE` 或继续等待。不得只凭白屏截图直接给出 `PASS`、设计差异结论或“页面无内容”结论。
- 登录态文件只允许作为本地验证缓存使用，禁止提交，禁止在报告、日志、MR 描述或交付文档中粘贴 cookie/JWT/token 内容。

verify 详细执行逻辑以 `.trae/skills/06-debug-verification/SKILL.md` 为唯一阶段准绳；本节只保留不可下放的全局门禁：

- `/delivery:verify` 只能关闭运行态事实：build、typecheck、test、mock-debug、integration-debug、点击后状态、DOM、Network 和渲染结果；最终视觉差异分级归 `/delivery:design`。
- 主 Agent 必须拥有 case 判定权；`runtime-runner` 只可辅助 dev server / HMR / health check / 命令 / 日志 / 机械证据，不得执行或关闭 case，不得触发 `/delivery:mock`。
- 必须读取并消费 `09-test-case-matrix.md` 中 verify 相关 case，输出 skill 要求的 `06-debug-verification.md` 报告结构和 Gate Recommendation。
- 对 `verification_stage = verify+design`，或 `evidence_required` / `design_reuse_policy` 指向截图复用的 case，verify 必须按 `case_id + runtime_state` 产出可复用截图，并写入 `Runtime Screenshot Evidence Index`；缺图只能把 case 记为 `NEEDS_TARGETED_REVIEW` / `BLOCKED`，不得默许 design 阶段重新兜底。
- 运行态截图必须完成本地落盘闭环；不得存在“截图已返回图像预览但无法保存到本地”的合规状态。截图工具返回图像预览即表示本地应存在可检索的截图文件；若未检索到本地文件，应判定为截图检索或物化流程未闭合，必须按阶段 skill 的截图保存与查询规范修正检索方式或重试取证。不得将聊天内预览图、工具临时路径、不可读路径或不存在路径写成有效 `screenshot_path`，不得 `PASS` / `PASS_WITH_NOTES`。
- Trae 内置浏览器 `integrated_browser.browser_take_screenshot` 的本地保存目录是 `$(getconf DARWIN_USER_TEMP_DIR)/trae/screenshots/`；传入 `filename` 后，源文件路径必须按 `$(getconf DARWIN_USER_TEMP_DIR)/trae/screenshots/<filename>` 读取。`filename` 必须使用可预测文件名，建议为 `<case_id>--<runtime_state>--<capture_scope>.png`；不得从聊天内预览图、`artifact-snapshots/**`、浏览器 viewId 或其他临时猜测目录取证。
- `MOCK_PREVIEW` 下若 `delivery-mock.md`、`mock/rule-map.json` 或每接口 `manifest.json` 已存在，必须先读取并记录状态，确认 mock-debug 基于当前 patched BAM / manifest；缺失或未 PASS 时按 skill 的 mock detour 规则处理。
- `MOCK_PREVIEW` 下的 mock 缺口只能在当前 case 内通过 `/delivery:mock` detour 修复；非 `MOCK_PREVIEW` 下缺 mock 产物仍为 `N/A`，但 `SAMPLE_COVERAGE_GAP` 可以在当前 case 内通过 `/delivery:mock` 做受控补充取证与随后的强制清理。
- 代码 / 类型 / 构建问题只能在已生成受限 `code-fix-handoff.md` 后派 `code-writer` 修复，或进入 `/delivery:code` handoff 模式后由其派 `code-writer` 修复，并回到当前 case 复验；API、数据、设计、权限、跨系统、计划缺口或产品 / 设计决策不得自动修复。
- 可恢复环境问题先按环境启动协议修复后重试；接口 / 数据 / 外部环境问题暂停提问或记录为 notes；BOE / Feelgood / 监控上报类 404、CORS、JSON parse 噪声，若不影响本地 mock 主流程，记录为 `ENV_ISSUE / ENV_NOISE`，不得单独阻断 `/delivery:design`。

### `/delivery:design` Gate

必须完成设计源映射和双向检查：

- Figma screenshot / Figma node data → Code
- Code → Figma/白板/截图
- `09-test-case-matrix.md` 中 `verification_stage = design / verify+design` 的 case
- `09-test-case-matrix.md` 中 `contract_ref`、`positive_assertion`、`negative_assertion`、`evidence_required` 的 visual contract 消费记录

- `/delivery:design` 必须按固定顺序执行当前 active case，不得跳步，不得先凭 DOM / 文案 / 运行态可用性给出视觉结论。标准顺序为：
  1. `识别 case scope`：先读 `case_layer`、`scope`、`contract_ref`、`runtime_state`、`capture_scope`、`verify_screenshot_key`，明确当前 case 是 page-level、region-level、interaction-level 还是 cell-level。
  2. `校验 Figma baseline scope`：先判断 Figma 证据覆盖范围是否足够支撑当前 case。page-level case 至少需要 page-level baseline；region-level case 至少需要 region-level baseline；node / 局部 probe 只能作为补充，不能单独关闭 page-level 或 region-level case。若当前仅是“已取到的 Figma 证据 scope 不匹配”，但任务空间、PRD、`ui-source-map.md`、`04-tech-plan.md` 或现有缓存里仍有可追溯的 `Figma URL / fileKey / nodeId / parent node / whole-file cache`，主 Agent 必须先执行一次 `沿 Figma 父链 / whole-file targeted retrieval / screenshot export` 的补证尝试，主动寻找更大的 region/page baseline；只有补证动作明确失败、无更大合法节点、或补到后仍不足以覆盖当前 case，才允许标记 `BLOCKED_NEEDS_FIGMA_SOURCE` 或 `PENDING_EVIDENCE`。不得把“当前缓存不够”直接等同于“源头缺失”。
  3. `判定 UI Evidence Mode / F2C Gate`：若当前 case 或其映射 task 在 `04-tech-plan.md`、`delivery-task.md`、`05-implementation-log.md` 或 Design Rework Task 中标记为 `F2C_REQUIRED`，必须先消费 `/f2c` / d2c 结构证据并记录 `f2c_source`、`d2c_result`、`consumed_contract`；缺证不得用截图、DOM、computed style、组件库默认样式或 PRD 文案替代，不得 PASS，只能 `PENDING_EVIDENCE` / `BLOCKED_NEEDS_F2C_SOURCE`，或回上游明确降级依据。
  4. `物化整体 Figma baseline`：当 Figma source 是整页 atlas、whole-file 大图、页面总览图，或同一张图中存在多个相似页面 / 状态 / 示例 / 信息区时，必须先裁剪或导出与当前 active case 精确匹配的本地 Figma baseline，并确认文件真实存在、可读、没有裁偏。裁剪图或节点截图路径必须写入 design evidence；不得只凭“全局图里可见”进入结论。
  5. `先做整体行列语义表`：对 page-level、region-level、信息区、卡片区、表格区等整体 case，必须先从本地 Figma baseline 提取行/列/分组/归属语义，再从 runtime screenshot / DOM 抄录同粒度运行态事实。若 Figma 与 runtime 的行、列、分组、归属或同级顺序不同，先判定 `structure_mismatch_visible` / `BLOCKER`；不得先修或对比单个标签、颜色、圆角、bbox 等细节后直接 PASS。
  6. `匹配 verify runtime source`：读取 `06-debug-verification.md` 的 `Runtime Screenshot Evidence Index`、`Case Result Index` 和 workspace `screenshots/` 目录，按 `case_id + runtime_state + verify_screenshot_key` 优先复用 verify 证据，并打开对应 `verify-logs/case-results/<case_id>.md` 检查 `Pending Recheck Items` 中是否还有 `status = OPEN` 的 `/delivery:design` 待验收项。报告里引用过但文件不存在的 screenshot 视为 `missing`，不得当成可复用输入；design 待验收项必须在当前 case 关闭前完成。
  7. `判断 runtime 状态匹配`：确认 verify 截图和当前 design case 的目标状态一致；不一致时才允许补抓新图，并在 `Design Evidence Debug Log` 写明未复用原因。
  8. `先建立目标结构并抄录运行态事实`：必须先从 Figma screenshot / node data / d2c 结构合同提取当前 case 的目标可见结构，再从 runtime screenshot 抄录运行态可见结构，二者都只记录可见事实，不先解释实现原因。最少要覆盖适用的容器 / 归属、同级、顺序、分组和禁显残留。若 runtime screenshot 肉眼已可见结构冲突，必须先记为 `structure_mismatch_visible`。
  9. `先做 screenshot-first 判定，再用 DOM / bbox / computed style 解释差异`：先基于 Figma ↔ runtime screenshot 给出首轮结构 / 样式判定，再用 DOM / bbox / computed style 解释差异；DOM / 代码只能解释差异和定位修复点，不能推翻截图中已可见的结构冲突。
  10. `执行 negative scan`：必须用 `negative_assertion` 做 Code → Design 反向扫描，确认没有旧结构、错误按钮、错误容器、额外列、错误颜色、错误 icon 或臆造 UI 残留。
  11. `检查 closure evidence materialization 并给出单 case 结论`：若当前 closure evidence 未物化为 workspace 本地图片、截图不可读、路径不存在、capture scope 不足、整体 Figma baseline 未本地物化、未完成行列语义表、`F2C_REQUIRED` 缺 `/f2c` / d2c 证据、对应 case result 的 design 待验收项仍为 `OPEN`，或截图直观事实与书面结论冲突，必须如实记录 `runtime_materialization_status` 和 `closure_risk`；证据形态不足时不得 `PASS`。只有在 Figma scope、F2C/d2c gate、runtime 状态、截图物化、整体行列语义、结构/样式对比和负向扫描都满足时，才允许 `PASS` / `NON_BLOCKER`；否则按 `MOCK_ISSUE`、`SAMPLE_COVERAGE_GAP`、`BLOCKER`、`NEEDS_TARGETED_REVIEW`、`BLOCKED_NEEDS_FIGMA_SOURCE` 或 `BLOCKED_NEEDS_F2C_SOURCE` 分流。

- 每个 design / verify+design case 都必须有 Figma 基准源，并与运行态截图 / DOM / computed style 做对比；Figma 基准源只能是 Figma 导出截图 / 节点截图，或 Figma MCP 原始节点、节点 JSON、可追溯到 Figma node 的 d2c 数据。白板、PRD 文本、旧运行态截图、组件库默认样式或计划描述只能补充说明，不能替代 Figma 基准源。缺少 Figma screenshot / Figma node data 时，不得进入 `/delivery:accept`，必须补证或标记 `BLOCKED_NEEDS_FIGMA_SOURCE`。
- `F2C_REQUIRED` case 的 `/f2c` / d2c 结构证据是 design Gate 的必需输入，截图和 DOM 只能用于 runtime 对齐验证，不能替代 `f2c_source` / `consumed_contract`。缺失时不得进入 `/delivery:accept`，必须补证、标记 `BLOCKED_NEEDS_F2C_SOURCE`，或回上游确认降级。
- 当 `case_scope vs figma_scope` 首轮判定为 `mismatch` 时，必须先区分“当前缓存不足”和“真实源头缺失”。若仍存在可追溯 Figma 线索（如 PRD Figma URL、`fileKey`、更高层 parent node、whole-file cache、atlas/page screenshot、可继续导出的 nodeId），design 阶段必须先补做一次 Figma 扩展取证，再决定是否 `BLOCKED_NEEDS_FIGMA_SOURCE`。只有在扩展取证失败或确认不存在更高层合法基线后，才允许暂停。
- 对整页 atlas / whole-file 大图 / 页面总览图，design 阶段必须先在本地保存当前 case 对应的裁剪图或节点截图，再进行 Figma ↔ runtime 对比。裁剪图不得混入其他状态、hover 示例、局部 probe 或无关信息区；若同一全局图内有多张相似 UI，必须在 `07-design-alignment.md` 中记录选中哪一张、来源路径、裁剪路径和选择依据。
- `Figma-vs-Runtime Evidence` 必须覆盖整体行列语义：页面/区域顺序、信息区行序、列归属、分组、必显元素、禁显残留。发现整体语义不同后，必须先按结构差异分级；细节元素样式对比只能作为后续定位，不得覆盖整体结构 mismatch。
- design 必须先消费 verify 已沉淀的 `Runtime Screenshot Evidence Index`，按 `case_id + runtime_state + verify_screenshot_key` 优先复用匹配截图做首轮 Figma 对比；只有状态不匹配、截图不可读、capture scope 不足或 verify 缺图时，才允许补抓新图，并在 `Design Evidence Debug Log` 写明未复用原因。
- Design 阶段必须建立 `Design Case Queue` 并严格串行：一个 active case 完成 Figma 对比、判定、归档或 auto-fix、复核、归档后，才能进入下一个 case。可修复 BLOCKER 和 MOCK_ISSUE 必须在当前 case 内立即闭环；不可修复 BLOCKER / `NEEDS_TARGETED_REVIEW` / 缺 Figma 基准源立即暂停或回上游。禁止先批量扫描全部 case 后统一修复。
- 当前 case 进入 hot-fix 前，必须先消费已存在的运行态证据作为 baseline，包括 `/delivery:verify` 截图、`06-debug-verification.md` 的 `Runtime Screenshot Evidence Index`、workspace `screenshots/` 目录和已记录 DOM / computed style。旧证据只能用于定位差异和定义返工目标，不能直接作为修复关闭证据；代码修改后必须在同一浏览器会话补采同状态的新 screenshot / DOM / computed style。
- page-level 首屏视觉 baseline case 必须先于相关 region / interaction design case 关闭；若 page-level baseline 尚未归档，不得以局部 case 全 PASS 推断整体 UI 无问题。
- 若当前运行态截图白屏、只有骨架或主内容未渲染，design 不得直接按视觉差异分级；必须先读取同页 console 日志并记录 error 摘要，判断是 runtime crash、资源加载失败、宿主上下文问题、接口阻塞还是单纯加载未完成。缺少这一步时，不得把白屏截图写成 design blocker/pass 结论。

存在 BLOCKER 差异时，不得进入交付验收。

`/delivery:design` 默认启用受限 Design Auto Fix；`--auto-fix` 仅显式强调默认行为。

- 该模式必须先由 `design-checker` 严格分级并写入 `07-design-alignment.md`，再由主 Agent 在不切换 design 阶段的前提下直接增量写入 `delivery-task.md` 的 Design Rework Task；任务格式复用 `/delivery:task` 合同，但不得把正常 auto-fix 路由成 `/delivery:task` 或 `/delivery:code` 阶段中断。`design-checker` 不直接改业务代码。
- Design Auto Fix 的可执行边界以“是否影响交互逻辑”为准：只要差异不改变用户操作路径、可点击 / 禁用业务语义、请求 / 响应合同、权限规则、跨系统动作或真实写接口，就应按当前 design 阶段内的可执行设计返工处理；即使差异涉及 Figma 明确的文案、结构、区块顺序、容器形态、布局、间距、颜色、圆角、边框、显隐或轻量事件 wiring，也不得默认回 `/delivery:plan`。此类返工必须物化为 `Design Rework Task`，按 `UI Evidence Mode` 携带证据后派发 `code-writer`。
- 当 BLOCKER 属于已由 PRD / Plan / Figma 确权的前端范围（包括文案、placeholder、默认值、控件形态、顺序、布局、间距、颜色、圆角、边框、层级、显隐、展示条件、状态派生、事件处理或轻量交互 wiring），且 HMR / browser 复核点完整时，主流程必须在当前 design 阶段内派发 `code-writer`，执行受限 code rework；返回后默认等待 HMR / 自动增量编译并立即重跑原 design case。Design Rework Task 必须写入 `UI Evidence Mode` 和证据引用：新增/重建结构用 `F2C_REQUIRED`，已有 UI 局部返工用 `RUNTIME_BASELINE_ALLOWED`，非视觉修复用 `NO_F2C_REQUIRED`。代码定位线索和排除范围如存在必须作为 review 审计提示；修改逻辑代码本身不是暂停条件。
- 当 Figma / d2c 证据与现有 plan/task UI 结构描述不一致，但目标 Figma 已确权、改动仅影响可见 UI 且不触碰交互逻辑边界时，不再视为 `BLOCKED_NEEDS_PLAN_REWORK`；必须在当前 design 阶段内把该差异转成 `F2C_REQUIRED` 的 Design Rework Task。只有需要新增或改变未确权业务规则、接口合同、权限语义、跨系统协议、真实写动作，或无法定位可执行代码落点 / 验证点时，才回上游重写 plan/task。
- Design hot-fix 的默认目标不是机械完成单条 blocker 草案，而是在当前 `active_case_id` 场景边界内把结构、容器、文案、状态、层级、交互热区和 `negative_assertion` 残留一起收敛到 Figma 合同，达到至少 `Basic Pixel Fit`。允许在当前 case 可执行边界内顺手清理与该场景直接相关的旧结构、错误按钮、错误容器、额外列或样式残留；不得扩散到其他 case、未确权业务规则、接口合同、权限语义或跨系统行为。
- design-checker 对可执行代码返工或 mock 返工必须返回 `Agent Gate Summary.Result = AUTO_FIX_REQUIRED`；只有确实无法自动执行且需要暂停 / 回上游时才能返回 `BLOCKED`。
- 自动返工必须复用当前 workspace 的 `emo start` dev server 和当前 `Browser Runtime Mode` 对应的浏览器会话 / Profile / storage state；代码保存后等待自动重新编译并 reload 页面，不得每轮重启 dev server 或新建浏览器。
- Design Auto Fix 默认采用 HMR-first / browser-first 复核：若保存后 dev server 增量编译无错误、浏览器无明显 runtime error，就必须在当前 hot-fix loop 内立即复跑原 design case，先拿到新的运行态 closure evidence，再决定是否继续下一轮或归档；不得把浏览器复核延后到后续 case 或阶段末尾。targeted typecheck / build / diagnostics 只在编译失败、runtime error、类型/接口/数据结构/公共组件风险、子 Agent 未给出基本验证结果或浏览器证据无法定位时触发。
- 若涉及未确权产品/设计规则、接口合同、权限业务语义、跨系统动作、真实写接口、无法定位可执行代码落点，或 `code-writer` 验证 / design 复核失败，才允许暂停，不得自动猜。
- 核心区域设计对齐默认目标为 Basic Pixel Fit：文案/控件/顺序完全一致，主容器位置/尺寸/间距原则上偏差不超过 4px，字号/行高不超过 1px，圆角/边框不超过 2px，颜色匹配 token 或截图采样等价；不足时必须记录差异分级。
- `/delivery:design` 负责视觉与可见交互对齐验收；运行态事实优先复用 `/delivery:verify` 结果，不重复承担全部 build/test/mock-debug 责任。

### `/delivery:accept` Gate

必须核对：

- PRD 覆盖度
- 技术方案落地度
- 验证证据
- 设计对齐结果
- 遗留风险
- MR 描述草稿

## 6. Subagent Collaboration Rules

主 Agent 调用子 Agent 时，必须提供固定输入包：

```md
# Agent Task Input

## Task

## Current Phase

## Workspace

## Must Read
- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- 当前阶段输入文件

## Context
- 需求摘要：
- 已知结论：
- 未决问题：

## Scope
- 允许分析的目录：
- 禁止修改的目录：
- 只读/可写权限：

## Output File

## Output Contract

## Stop Condition
```

所有子 Agent 输出必须包含 Evidence Level：

- HIGH：来自 PRD 原文、代码文件、接口定义、设计稿明确内容。
- MEDIUM：来自仓库命名、历史实现、相似模块推断。
- LOW：模型推断，必须用户确认。

主 Agent 收到子 Agent 输出后必须复核：

1. 输出是否符合 Output Contract。
2. 是否包含证据。
3. 是否存在 LOW confidence 结论。
4. LOW confidence 必须写入 `uncertainty-register.md`。
5. 不得把 LOW confidence 作为代码实现依据。
6. 子 Agent 输出缺字段时，必须要求补充，不得自行脑补。

### 6.1 Default Runtime / Design Subagent Collaboration

当任务涉及运行态命令噪音、dev server / HMR、浏览器核验、Figma MCP / f2c 大数据、截图对齐、多区域负向扫描、设计对齐、边改边验或边改边修时，默认采用“主 Agent 固定状态与 Gate，低上下文任务交给对应子 Agent”的模式。不需要用户特别指定该模式。

主 Agent 必须：

- 先启动或复用 dev server，并验证 `http://localhost:8079/alliance-operation-daren` health check；该步骤可委派 `runtime-runner` 做端口、进程、health check、HMR / 编译日志和命令摘要。
- 先固定 `Browser Runtime Mode`：桌面环境为 `TRAE_DESKTOP`，CoCo / Trae CLI / 无桌面环境为 `COCO_CLI_HEADLESS`。模式判定写入阶段报告；缺少可用浏览器能力时按环境问题处理，不得跳过浏览器证据。
- 固定 vmok URL、mock 参数、browser profile / tab 或 headless storage state、Figma `fileKey/nodeId`、workspace、case_id 和输出格式后再派发子 Agent。
- 对浏览器证据只做证据充分性和 case/Gate 判定；不在主流程内重复展开低价值的点击轨迹、完整 DOM、完整 Network 列表或截图 OCR。
- 不把完整 DOM、完整 Figma JSON、完整截图 OCR 或全量 diff 拉回主会话；只保留 blocker_id、关键 computed 值、截图路径、代码定位线索、允许文件、验证命令结果。
- 对当前 active case 的可执行设计 BLOCKER，在当前 design 阶段内直接增量回写 `delivery-task.md` 的 Design Rework Task，并写明 `UI Evidence Mode` / evidence refs，再派 `code-writer` 做单切片修复；只复用 `/delivery:task` 合同，不切换阶段，不先写 BLOCKED，不累积多个未归档 case 的批量返工。
- 对子 Agent 修复结果执行 Gate Review：检查越界、targeted diff、HMR / 自动增量编译状态和浏览器复验；diagnostics / build 只在触发升级条件时执行。

子 Agent 必须：

- 使用主 Agent 提供的 dev server / vmok URL / Figma metadata，不得冷启动后向用户追问已知 `fileKey/nodeId`。
- `runtime-runner` 只负责 dev server / 端口 / health check / HMR / 命令 / 日志 / 机械证据，不操作浏览器、不关闭 case、不触发 `/delivery:mock`。
- `design-checker` 负责在主 Agent 指定的 `Browser Runtime Mode` 下采集浏览器 snapshot、DOM、computed style、截图、console、Network、Figma MCP / f2c 和负向扫描；桌面用内置浏览器，CoCo / CLI 用无头浏览器，不得自行切换为另一模式。
- `code-writer` 只负责已经物化的单切片代码修复。
- 返回压缩证据包，不返回大型原始 DOM / Figma JSON；截图只返回路径。
- 不修改 `.trae/DELIVERY_STATE.md`，不宣布阶段推进。


`/delivery:task` 默认采用“`task-planner` 生成任务与测试产物，主 Agent 审查并决定路由”：

- 主 Agent 固定实现模式、事实源、输出路径、禁止路径和 mock 边界。
- `task-planner` 只能写 `delivery-task.md` 与 `09-test-case-matrix.md`，不得修改上游事实源、BAM、业务代码或阶段状态。
- 上游不足时，`task-planner` 必须返回 `BLOCKED_NEEDS_PLAN_REWORK`；mock 产物不足时写入 `Mock Closure` 和对应 task 的 `Verify Closure Dependency`，不得把 mock / browser 证据闭合写成 Task / Code 完成条件。

## 7. 子 Agent 权限边界

所有子 Agent 默认遵守：

- 不能修改 `.trae/DELIVERY_STATE.md` 的 `current_phase`。
- 不能宣布进入下一阶段。
- 不能在 P0 未决时建议继续实现。
- 不能删除或覆盖其他阶段产物。
- 除 `code-writer` 外，不能修改业务代码。
- `task-planner` 只能修改当前 workspace 的 `delivery-task.md` 与 `09-test-case-matrix.md`。

子 Agent 必须：

- 只完成当前被委派任务。
- 返回结构化结果。
- 标注证据和置信度。
- 将阻塞项交给主 Agent 判断。

## 8. 文件写入规则

- 所有阶段文档必须写入当前 `workspace`。
- 初始化模板必须明确标记为 `TEMPLATE_ONLY`，避免误判为已完成。
- 阶段执行完成后，必须把对应文档状态改成 `DONE`、`BLOCKED` 或 `PARTIAL_READY`。
- 修改业务代码前必须先更新 `05-implementation-log.md` 的计划段；修改后更新实际改动段。
