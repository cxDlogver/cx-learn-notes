---
description: 执行设计稿对齐，检查 Figma/白板/截图与代码实现的结构、文案、状态和样式一致性
---

请按 `.trae/AGENTS.md` 的 Phase Gate Rules 执行 `/delivery:design`。

必须读取：

- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `04-tech-plan.md`
- 当前 workspace 下的 `delivery-task.md`
- 当前 workspace 下的 `05-implementation-log.md`
- 当前 workspace 下的 `06-debug-verification.md`
- 当前 workspace 下的 `09-test-case-matrix.md`
- 当前 workspace 下的 `ui-source-map.md`
- `.trae/skills/07-design-alignment/SKILL.md`

`/delivery:design` 必须消费 `09-test-case-matrix.md` 中 `verification_stage` 为 `design`、`verify+design` 的 case；不得只输出笼统“基本一致”。每个 case 必须核对 `contract_ref`、`positive_assertion`、`negative_assertion`、`evidence_required`，并用 `negative_assertion` 做 Code → Design 反向扫描，确认没有旧结构、错误按钮、错误容器、额外列或臆造 UI 残留。

本阶段必须遵守 `.trae/AGENTS.md` 的 `Shared Case Evidence Closure Protocol`：复用统一的 active case、evidence mapping、detour resume 和 archive 语义，但只关闭 design / verify+design 的视觉与可见交互合同，不重复承担 verify 的 build / test / mock-debug 总验收职责。

## Design Case Queue

`/delivery:design` 必须按 `09-test-case-matrix.md` 建立 Design Case Queue，并严格串行执行。任一时刻只能有一个 active design case；当前 case 未归档前，不得继续扫描或关闭后续 case。

每个 case 的闭环顺序固定为，且不得跳步：

1. 识别当前 case 的 `case_layer`、`scope`、`contract_ref`、`runtime_state`、`capture_scope`、`verify_screenshot_key`，明确当前在验 page-level、region-level、interaction-level 还是 cell-level 合同。
2. 先校验 Figma 基线是否覆盖当前 case 范围。若 Figma 图只覆盖局部 node / probe，但当前 case 是 page-level 或 region-level，立即标记 `BLOCKED_NEEDS_FIGMA_SOURCE` 或 `PENDING_EVIDENCE`；不得继续把局部图当整块区域基线。
3. 判定当前 case 的 `UI Evidence Mode`。若当前 case、映射 task、`04-tech-plan.md` 或 `05-implementation-log.md` 标记为 `F2C_REQUIRED`，必须先产出 `/f2c` / d2c 证据（如 `get_d2c_json` / `get_d2c_result` / f2c 输出）并记录 `f2c_source`、`d2c_result`、`consumed_contract`；缺少该证据时不得用截图、DOM、computed style 或 PRD 文案替代，不得 PASS，只能 `PENDING_EVIDENCE` / `BLOCKED_NEEDS_F2C_SOURCE` 或回上游明确降级依据。
4. 读取 verify 截图索引、`Case Result Index` 和 workspace `screenshots/` 目录，按 `case_id + runtime_state + verify_screenshot_key` 优先匹配 verify runtime source，并打开对应 `verify-logs/case-results/<case_id>.md` 检查 `Pending Recheck Items` 中是否还有 `status = OPEN` 的 `/delivery:design` 待验收项；截图必须真实存在、可读且与当前状态匹配，design 待验收项必须在当前 case 关闭前完成。
5. 只有 verify 截图不存在、状态不匹配、capture scope 不足或截图不可读时，才允许补抓新的 runtime screenshot / DOM / computed style；不得先补抓再倒填“已复用 verify 证据”。
6. 先从 Figma screenshot / node data / 已消费的 d2c 结构合同提取目标可见结构，再从 runtime screenshot 抄录运行态可见结构；两者都只写可见事实，不先解释实现原因。最少覆盖适用的容器 / 归属、同级、顺序、分组和禁显残留。若 runtime screenshot 肉眼已可见结构冲突，先记为 `structure_mismatch_visible`。
7. 先基于 `Figma screenshot / node data / d2c contract ↔ runtime screenshot` 给出 screenshot-first 首轮判定，再用 DOM / bbox / computed style 解释结构、样式和状态差异；DOM / 代码只能解释差异和定位修复点，不能推翻截图中已可见的结构冲突。
8. 用 `negative_assertion` 做 Code → Design 反向扫描，确认没有旧结构、错误按钮、错误容器、额外列、错误颜色、错误 icon 或臆造 UI 残留；然后写入 `Figma-vs-Runtime Evidence`、`Design Evidence Debug Log` 和 `Visual Contract Consumption`，明确记录 Figma scope 覆盖理由、F2C/d2c 消费状态、runtime 证据 materialization 状态和 closure risk。
9. 若结论为 `PASS` / `NON_BLOCKER`，立即在 `07-design-alignment.md` 归档该 case，并进入下一个 case。
10. 若结论为 `MOCK_ISSUE` 或非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP`，立即在当前 case 内执行 `/delivery:mock`，修复后回到同一 case 重取证据；关闭前不得进入下一个 case。`SAMPLE_COVERAGE_GAP` 只允许补充样本依赖的视觉 / 状态证据，不得替代真实 contract 验证；必须显式带 `mock_debug_param`，且在 case 关闭后立刻清理 mock 产物并移除 debug 参数复查。
11. 若结论为可执行 `BLOCKER`，立即物化当前 case 的 `Design Rework Task`、派 `code-writer`、等待 HMR / 自动增量编译并复跑同一 case；关闭前不得进入下一个 case。
12. 若结论为不可执行 `BLOCKER`、`NEEDS_TARGETED_REVIEW`、`BLOCKED_NEEDS_FIGMA_SOURCE` 或 `BLOCKED_NEEDS_F2C_SOURCE`，立即暂停或回上游；不得继续扫描后续 case 来制造批量结论。

禁止先批量扫完整页 / 全部 case 后再统一修复。可共享页面状态、浏览器会话和截图缓存，但 case 判定、auto-fix、复核和归档必须逐 case 完成。

## Figma-vs-Runtime Evidence Requirement

`/delivery:design` 可以复用 `/delivery:verify` 的运行态截图，但必须输出结构 / 样式对比证据，不能只写“复用 verify 证据”。

固定要求：

- 每个 `verification_stage = design / verify+design` 的 case 都必须有 Figma 基准源，且只能是 `FIGMA_SCREENSHOT`（Figma 导出截图 / 节点截图）或 `FIGMA_NODE_DATA`（Figma MCP 原始节点、节点 JSON 或可追溯到 Figma node 的 d2c 数据）。白板、PRD 文本、旧运行态截图、组件库默认样式或 `04-tech-plan.md` 的描述只能作为补充，不能替代 Figma 基准源。
- 每个 case 必须先判断 `case scope` 与 `figma scope` 是否匹配：page-level case 不能只用 node/probe 图；region-level case 不能只用局部 node/probe 图。scope 不匹配时，不得 PASS。
- 必须读取 `06-debug-verification.md` 的 `Runtime Screenshot Evidence Index` 和 workspace `screenshots/` 目录。
- 每个 case 都必须在 `07-design-alignment.md` 写入 `Figma-vs-Runtime Evidence`，把运行态截图 / DOM / computed style 与 Figma 截图或 Figma node 数据逐项对比。
- 每条对比证据必须包含：`case_id`、`figma_source_type`、`figma_source`、`ui_evidence_mode`、`f2c_source`、`consumed_contract`、`runtime_source`、`structure_comparison`、`style_comparison`、`negative_scan`、`result`。
- `F2C_REQUIRED` case 缺少 `/f2c` / d2c 证据时，不得用截图、DOM、computed style、组件库默认样式或 PRD 文案替代；必须记为 `PENDING_EVIDENCE` / `BLOCKED_NEEDS_F2C_SOURCE`，或回上游明确降级为 `RUNTIME_BASELINE_ALLOWED`。
- 若 case 涉及带 icon / image 的标签、badge、按钮、标题前缀或认证标识，必须额外写入 `Asset Source Audit`：Figma 文字节点之外是否存在父组 / sibling image/icon 节点、运行态实际资源来源、以及本地资源是否已替换为目标设计稿版本。缺少该审计不得 PASS。
- verify 截图状态不匹配 case 状态时，必须补新运行态截图；不能用打开态截图证明 hover、空态、禁用态或关闭态。
- verify 截图或 design 新截图若在报告中被引用为 `screenshot_path`，必须先确认文件真实存在；不存在时只能记为 `NOT_MATERIALIZED` / `inline_only`，不得伪装成可复用本地文件证据。
- 缺少 Figma screenshot / Figma node data、runtime source 或关键 DOM/computed style 时，不得 PASS；缺 Figma 基准源必须补证，无法补齐时标记 `BLOCKED_NEEDS_FIGMA_SOURCE`。
- `07-design-alignment.md` 必须记录 `Design Evidence Debug Log`：Figma source 解析、verify 截图复用选择、状态匹配判断、结构/样式/负向扫描完成情况和最终决策。该日志只能写入阶段报告，不得通过业务代码 `console.log` 实现。

## Auto Fix Default

`/delivery:design` 默认启用 Design Auto Fix Mode；`--auto-fix` 仅作为显式强调，行为与默认一致。

设计对齐、截图复核和自动返工涉及的代码目录，统一以 `.trae/AGENTS.md` 中 `Execution Environment Bootstrap Gate` 对应的 `Execution State` 为准。

Design Auto Fix Mode 要求：

- 本阶段仍必须先执行 `design-alignment` skill 并委派 `design-checker` 做严格分级。
- 若当前 case 存在 BLOCKER，`design-checker` 只输出该 case 的压缩证据包和 Design Rework Task Draft；由主 Agent Gate Review 后写入 `07-design-alignment.md`，并在当前 design 阶段内直接增量写入 `delivery-task.md` 的 Design Rework Task。该动作复用 `/delivery:task` 的任务格式与校验规则，但不得切换 `current_phase` / `current_command`，不得把正常 auto-fix 路由成一次新的 `/delivery:task` 阶段执行，也不得把多个未归档 case 的 BLOCKER 累积成批量返工。
- 只有 `MOCK_PREVIEW` 下，且当前 design case 的页面状态 / 截图证据依赖 BAM runtime mock 时，若因 BAM mock 数据缺失、规则未命中、fixture 不完整或错误 mock 状态导致证据不可判定，才必须由主 Agent 直接进入 `/delivery:mock` 定向修复。mock 修复并通过 BAM mock 审查后，必须回到原设计核验点，重取页面状态 / 截图证据，再继续差异判断；不得把 mock 缺口误判为设计 BLOCKER，也不得停在 mock 修复完成处。
- 非 `MOCK_PREVIEW` 下，只有当真实协议已明确且当前失败分类为 `SAMPLE_COVERAGE_GAP` 时，才允许调用 `/delivery:mock` 补充样本不足导致的视觉 / 状态证据；该路径必须同时记录 `real_contract_evidence` 与 `mock-only supplemental evidence`，不得替代真实 request / response、权限、错误码或写副作用合同验证。
- 若 `design-checker` 或主 Agent 将差异根因分类为 `MOCK_ISSUE`（例如 BAM mock response 与当前 design case 目标状态不一致、rule 未命中、跨接口 fixture 缺字段、目标 BAM wrapper 未透传影响字段），Gate Recommendation 必须走 `MOCK_AUTO_FIX`：主 Agent 直接调用 `/delivery:mock` 更新 mock 产物 / BAM marker / wrapper request 字段透传，审查通过后恢复原 design case。此路径不得派代码 agent。
- 若 `design-checker` 或主 Agent 将差异根因分类为非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP`，Gate Recommendation 必须走 `MOCK_AUTO_FIX` 的补充取证子路径：主 Agent 直接调用 `/delivery:mock` 生成当前 case 所需的补充样本状态，审查通过后恢复原 design case。此路径不得派代码 agent，也不得把 mock 补证后的截图写成真实接口已满足。
- 若 Design Rework Task 边界完整，且变更属于已由 PRD / Plan / Figma 确权的前端范围，包括 copy、placeholder、默认值、控件形态、顺序、布局、间距、颜色、圆角、边框、显隐、展示条件、状态派生、事件处理或轻量交互 wiring，主流程必须在当前 design 阶段内自动派发 `code-writer` 执行受限 code rework。是否修改“逻辑代码”本身不是暂停条件；只有会改变未确权业务规则、接口合同、权限语义或跨系统协议时才暂停。
- Design Rework Task 必须标注 `UI Evidence Mode`：新增页面 / 新增区域 / 新增复杂组件 / 表格整体结构 / Drawer / Modal / Popover 首次实现为 `F2C_REQUIRED`；已有 UI 局部文案、样式、显隐、交互 wiring、数据接入或设计返工为 `RUNTIME_BASELINE_ALLOWED`；非可见逻辑、类型、构建、接口修复或 legacy 保留为 `NO_F2C_REQUIRED`。只有 `F2C_REQUIRED` 缺少 `/f2c` d2c 证据时才阻塞派发；`RUNTIME_BASELINE_ALLOWED` 应携带可定位的现有 DOM / screenshot / computed style baseline 和复核断言，证据名称或字段不固定。
- `code-writer` 返回后，主 Agent 必须先审改动范围和 `05-implementation-log.md`，再走 HMR-first / browser-first 复核：等待现有 dev server 自动增量编译，若无编译错误或明显 runtime error，直接复用同一浏览器会话重跑原 design case / BLOCKER 复核；只有 dev server 编译失败、页面 runtime error、涉及类型/接口/数据结构/公共组件、`code-writer` 未给出基本验证结果或浏览器证据无法定位问题时，才升级执行 targeted typecheck / build / diagnostics。
- 若 BLOCKER 涉及产品/设计决策、接口、权限业务规则、跨系统动作、真实写接口、无法定位可执行代码落点、`code-writer` 验证失败或修复后 design 复核仍无法收敛，才允许暂停并标记 BLOCKED；不得把可执行返工默认转成阶段中断。
- Auto Fix Mode 必须复用现有 `emo start` dev server 和当前 `Browser Runtime Mode` 对应的浏览器会话；桌面环境复用 Trae 内置浏览器或统一持久化 Profile，无桌面 / CoCo / Trae CLI 环境复用无头浏览器 context、user data dir 或 storage state。不得每轮重启 dev server 或新建浏览器会话；代码保存后等待 dev server 自动重新编译并 reload 页面即可。
- 无头浏览器会话在 auto-fix loop 内默认保持，不在每次 design/code/verify 切换时关闭；仅当 Profile/state 被忽略、页面卡死、端口错误或用户要求时才重启。
- 主 Agent 可按需派 `runtime-runner` 做 dev server / 端口 / health check / HMR / 编译日志辅助；浏览器 snapshot、DOM、computed style、截图、console、Network、Figma / f2c 取证仍由 `design-checker` 或主 Agent 当前会话负责，case 判定与 Gate 不得交给 `runtime-runner`。
- 本阶段默认按 `design-alignment` 的 Default Subagent Runtime Mode 执行，不需要用户特别指定：主 Agent 固定 dev server、`Browser Runtime Mode`、vmok URL、profile / storage state、Figma metadata，`design-checker` 采集浏览器 snapshot、DOM、computed style、截图、console、Network、Figma MCP / f2c 证据，并只返回 blocker_id、截图路径、关键 computed style、负向扫描和文件落点。

执行 `design-alignment` skill，并委派 `design-checker` agent。

`design-checker` 返回后，主 Agent 必须先审当前 active case 的 `Agent Gate Summary`，再审 Mock Issues、Blockers、Design Rework Task Draft 和 Gate Recommendation。`AUTO_FIX_REQUIRED + MOCK_AUTO_FIX` 先执行 `/delivery:mock` 并恢复原 design case；`AUTO_FIX_REQUIRED + DESIGN_AUTO_FIX` 物化 task、派 `code-writer`、等待 HMR / 自动增量编译并恢复原 design case。当前 case 归档为 `PASS` / `NON_BLOCKER` / `FIXED_PASS` 后才能继续下一个 case。只有 summary 为 `BLOCKED` / `NEEDS_TARGETED_REVIEW`、BLOCKER 分级存疑或返工任务不可执行时才暂停或回上游；不得把 `AUTO_FIX_REQUIRED` 写成阶段 `BLOCKED`。

必须完成：

- Figma screenshot / Figma node data → Code
- Code → Figma/白板/截图
- BLOCKER / NON_BLOCKER 差异分级

分级必须严格：

- 对筛选区、推荐区、工具栏、表格、分页、Modal / Drawer / Popover 等核心区域，Figma 明确可见的文案、placeholder、默认值、控件形态、字段顺序、列顺序、容器形态差异，默认标记为 BLOCKER。
- 不能仅因为复用仓库组件、`04-tech-plan.md` 有 reference decision、字段配置可解释，就把 Figma 明确差异降级为 NON_BLOCKER。
- 只有用户 / 产品 / 设计确认，或 `04-tech-plan.md` 明确逐字描述该可见差异并接受，才允许降级为 NON_BLOCKER；降级时必须记录豁免来源。

基础像素对齐要求：

- 核心区域必须达到 Basic Pixel Fit：页面区域顺序、可见文案、控件形态完全一致；主容器位置/尺寸/间距与视觉稿或基准截图偏差原则上不超过 4px；颜色需匹配设计 token 或截图采样等价；字号/行高/字重、圆角、边框、按钮主次状态需可解释且有截图证据。
- 若无法做自动像素 diff，必须至少用截图 + DOM bounding box / computed style 记录关键容器、按钮、表头、筛选控件、Popover 的位置、尺寸、颜色和状态差异。
- 对筛选区、推荐区、工具栏、表格、分页和 Popover，不能只说“视觉基本一致”；必须列出差异项及 BLOCKER / NON_BLOCKER 分级。

存在 BLOCKER 差异时：

- 不得进入 `/delivery:accept`。
- 必须把 BLOCKER 转成可被 `Use Skill: executing-plans` 执行的 `Design Rework Task Draft`，写入 `07-design-alignment.md`。

- 必须在当前 design 阶段内增量更新当前 workspace 下的 `delivery-task.md`，新增或更新 `### Task N: Design Rework - ...`，逐条映射 BLOCKER ID、可执行范围（允许修改文件 / 目录 / 代码落点；能精确到文件最好，不能则给页面、组件、错误栈或定位依据）、checkbox step、HMR / browser 复核点和预期结果；验证命令只在任务本身声明或触发升级条件时补充。
- Design Rework Task 必须写入 `UI Evidence Mode` 和对应证据引用；`F2C_REQUIRED` 写 f2c / Figma MCP 证据，`RUNTIME_BASELINE_ALLOWED` 写 runtime baseline，`NO_F2C_REQUIRED` 写 N/A 与原因。
- 写入任务前后 `current_phase` / `current_command` 必须仍为 design；BLOCKER 是差异等级，不等于阶段已经 `BLOCKED`。可执行返工进入 `AUTO_FIX_IN_PROGRESS`（或等价运行态），不得提前写 `is_paused=true`、`resume_command=/delivery:code`。
- 若 Design Rework Task 可执行，必须立即派发 `code-writer` 执行该单切片；禁止只写 `07-design-alignment.md` 后让 `/delivery:code` 自行解释设计报告，也禁止把“回到 `/delivery:code`”作为当前阶段的正常结束。
- `code-writer` 完成后，主 Agent 默认等待 HMR / 自动增量编译并回到原设计核验点复查 BLOCKER；关闭后继续 `/delivery:design`，未关闭则最多再执行一轮同范围 auto-fix。只有编译 / runtime / 类型 / 接口 / 公共组件风险触发升级条件时，才补跑 targeted typecheck / build / diagnostics。
- 如果无法安全增量更新 `delivery-task.md`，或需要新增 plan contract，必须把 `.trae/DELIVERY_STATE.md` 标记为 `BLOCKED_NEEDS_TASK_REWORK` / `BLOCKED_NEEDS_PLAN_REWORK` 并暂停。

存在 MOCK_ISSUE 时：

- 仅 `MOCK_PREVIEW` 或非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 下允许走该路径；其余非 `MOCK_PREVIEW` 场景的 mock 产物缺失为 `N/A`，页面异常必须按真实 API / DATA / ENV / CODE / DESIGN 问题分类。
- 必须保存 `origin_stage=design`、`case_id`、`ruleId`、`apiName`、vmok URL、截图 / Network / console 摘要和恢复点。
- 必须由主 Agent 在当前执行会话直接调用 `/delivery:mock`，完成 mock 产物、BAM marker 或 wrapper request 字段透传更新与审查。
- `/delivery:mock` 审查 PASS 后，必须回到原 design case 重取页面状态 / 截图证据，并继续 design；不得停在“mock 修复完成”。
