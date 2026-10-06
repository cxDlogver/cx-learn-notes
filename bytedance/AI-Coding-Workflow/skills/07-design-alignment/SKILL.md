---
name: design-alignment
description: 设计稿对齐。用于检查设计稿、白板、截图与代码实现的结构、文案、状态、样式、异常态是否一致。
context: fork
agent: design-checker
---

# Design Alignment

## Purpose

确保实现不只是功能可用，还符合设计稿、交互说明和视觉规范。

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `04-tech-plan.md`
- 当前 workspace 下的 `delivery-task.md`
- 当前 workspace 下的 `ui-source-map.md`
- 当前 workspace 下的 `05-implementation-log.md`
- 当前 workspace 下的 `06-debug-verification.md`
- 当前 workspace 下的 `09-test-case-matrix.md`

如果设计源缺失且影响 UI / 交互 / 状态 / 文案判断：

- 必须标记 P0_BLOCKER。
- 暂停提问。

## Mock Dependency Policy

- 只有 `MOCK_PREVIEW` 下，且当前 design / verify+design case 的页面状态或截图证据依赖 BAM runtime mock 时，BAM mock 缺失、规则未命中、fixture 不完整或错误 mock 状态才允许进入 `/delivery:mock` 定向修复。
- 非 `MOCK_PREVIEW` 下，只有当真实协议已通过技术文档 / BAM / IDL / 真实接口证据闭合，且当前缺口被判定为 `SAMPLE_COVERAGE_GAP`（样本或状态覆盖不足）时，才允许进入 `/delivery:mock` 做补充取证。该 detour 只可补充 hover / 状态 / 视觉截图证据，不得替代真实 request / response、权限、错误码或写副作用合同验证；浏览器 URL 必须显式带 `.trae/PROJECT_CONTEXT.md` 约定的 mock-debug 参数，当前项目示例为 `externalLeadsDomainMock=1`。
- 若运行态差异根因是 BAM runtime mock（response 与目标状态不一致、rule 未命中、跨接口 fixture 缺字段、BAM wrapper 未透传影响字段等），必须分类为 `MOCK_ISSUE`，由主 Agent 在当前 design 阶段内执行 `/delivery:mock` 自动更新 mock，审查通过后恢复原 design case；不得将其写成设计 BLOCKER 或 Design Rework Task。
- 非 `MOCK_PREVIEW` 下，除 `SAMPLE_COVERAGE_GAP` 的补充 mock detour 外，`delivery-mock.md`、`mock/**`、manifest、BAM mock console 证据和 mock closure 均为 `N/A`；不得因为没有 mock 阻塞 design，不得把缺 mock 标记为设计 BLOCKER，也不得调用 `/delivery:mock`。
- 普通模式下若页面状态不可判定，必须按真实原因分类：环境 / 登录态 / 真实 API / 测试数据 / 代码实现 / 设计源缺失，而不是 mock 缺口。

## Agent Delegation Boundary

`/delivery:design` 默认采用“主 Agent 固定环境与 Gate，`design-checker` 采集浏览器 / Figma / 截图证据”的协作路径。主 Agent 不再默认直接执行页面级大范围 Visible Contract 审计。

### Default Subagent Runtime Mode

以下场景必须默认委派 `design-checker`，不需要用户特别指定“节省上下文”：

- 任何 `/delivery:design` 的页面级、区域级、表格/列表、Drawer/Modal/Popover 设计核验。
- 任何“边改边验 / 边改边修 / auto-fix”闭环。
- 任何需要浏览器 snapshot、DOM、computed style、截图、Figma MCP 或 `/f2c` 结构数据的核验。
- 任何跨业务域 / Tab / 表格 / Drawer / Modal 的负向扫描。
- 任何设计 BLOCKER 定位、Design Rework Task Draft、修复后 rerun design。

执行分工：

- 主 Agent 负责固定 dev server / vmok URL / mock 参数、Figma fileKey/nodeId、当前 workspace、case_id、允许输出格式和 Gate Review；其中 dev server 启动、端口归属、health check、HMR / 编译日志可按需委派给 `runtime-runner`。
- `runtime-runner` 只返回运行时 / 命令 / 日志辅助结果，不操作浏览器、不判定 design case、不输出 Gate Recommendation。
- 主 Agent 在派发前必须固定 `Browser Runtime Mode`：`TRAE_DESKTOP` 使用 Trae 内置浏览器 / 桌面 fallback；`COCO_CLI_HEADLESS` 使用无头浏览器（优先 Playwright Chromium，其次可用的 Chrome DevTools / browser MCP headless 能力）。该模式、vmok URL、profile / storage state、登录态状态和证据能力必须写入输入包和 `07-design-alignment.md`。
- `design-checker` 负责在主 Agent 指定的浏览器模式下完成浏览器操作、截图、console、Network、Figma MCP、`/f2c`、DOM/computed style、负向扫描和差异分级；不得把 CoCo / CLI 环境回退成有头 Chrome，也不得把桌面环境强制改成无头浏览器。
- `design-checker` 不得修改业务代码，不得把完整 DOM / Figma JSON 带回主会话；只返回压缩证据包。
- 若发现 BLOCKER，主 Agent 在当前 design 阶段内把 BLOCKER 直接增量写为 `delivery-task.md` 的 Design Rework Task；任务格式复用 `/delivery:task` 合同，但不执行阶段路由、不切换 `current_phase` / `current_command`。任务边界完整时必须立即派 `code-writer` 做单切片修复，不得先把阶段标记为 BLOCKED 或结束为“回到 `/delivery:code`”。
- 修复后主 Agent 或 `design-checker` 必须在同一 hot-fix loop 立即复验原 BLOCKER；主 Agent 只保留关键 computed 值、截图路径、blocker_id、文件范围和验证结果，并继续后续 design case。
- Design Rework Task 的默认目标不是机械完成单条局部 draft，而是在当前 `active_case_id` 场景边界内把结构、容器、文案、状态、层级、交互热区和 `negative_assertion` 残留一起收敛到 Figma 合同。允许在当前 case 已授权文件范围内顺手清理与该场景直接耦合的旧结构、错误按钮、错误容器、额外列或样式残留；不得扩散到其他 case、未确权业务规则、接口合同、权限语义或跨系统行为。

主 Agent 仅在以下轻量例外中可直接审计：

- 单文件 / 单控件的显然 copy 或 placeholder 检查，且不需要 Figma MCP / f2c / 截图 / computed style。
- 子 Agent 工具不可用且用户要求继续；此时必须显式记录 fallback 原因，并仍遵守压缩证据输出。

`design-checker` 的压缩输出必须包含：

- `Agent Gate Summary`：`PASS / AUTO_FIX_REQUIRED / BLOCKED / NEEDS_TARGETED_REVIEW`。可执行的 `DESIGN_AUTO_FIX` / `MOCK_AUTO_FIX` 必须使用 `AUTO_FIX_REQUIRED`，不得使用 `BLOCKED`。
- `Mock Issues`：`MOCK_PREVIEW` 下输出完整 mock 根因；非 `MOCK_PREVIEW` 仅当命中 `SAMPLE_COVERAGE_GAP` 时输出补充取证所需的 `case_id`、样本缺口、`real_contract_evidence`、允许补充的断言、禁止被 mock 覆盖的合同断言和 `mock_debug_param`；其余写 `N/A`。
- `PASS List` / `BLOCKER List`：每项带 `blocker_id`、严重度、证据来源。
- `Screenshot Path`：截图绝对路径，不内嵌图片。
- `Concise Evidence`：只列关键 selector / 文案 / computed style / bbox 数值，不输出整棵 DOM。
- `Exact Files / Lines To Fix`：仅当 BLOCKER 可修复时输出允许文件和候选代码落点。
- `Negative Scan`：禁显残留是否出现。
- `F2C / d2c Consumption`：当当前 case 或其映射任务为 `F2C_REQUIRED` 时，必须列出 `/f2c` / d2c 工具、nodeId、结果路径或失败原因；不得省略为截图/DOM 已覆盖。

所有设计核验模式都必须满足：

- 先整体后局部：页面骨架、区域顺序、核心区域、关键控件、首行关键单元格、弹层状态、负向残留。
- 使用当前 `Browser Runtime Mode` 对应的浏览器采集运行态证据：snapshot / accessibility tree、DOM direct children、computed style、截图、console、Network 和点击断言。默认由 `design-checker` 采集并压缩返回；主 Agent fallback 时自行采集。
- 若截图出现白屏、空白主区域、只有骨架/Loading 或内容明显未渲染，必须先读取同页 console 日志，检查是否存在 `error` / uncaught exception / resource load failure / chunk load failure / hydration / runtime crash，再决定继续等待、补抓 runtime source，还是把问题分流为 `CODE_ISSUE` / `ENV_ISSUE` / `HOST_CONTEXT_ISSUE` / `API_ISSUE`。不得只凭白屏截图直接下 design 结论。
- 对存在明确 Figma 结构依据的核心区域，先使用 Figma screenshot / Figma node data / `/f2c` d2c 证据建立目标结构合同，再采集 runtime；不得先看运行态再反向解释 Figma。
- 对结构争议区域或 Figma 可见结构覆盖的 Drawer / Modal / Popover / 表格 / 筛选区 / 推荐区 / 工具栏 / 卡片，优先使用 `/f2c` 系列能力读取 `get_d2c_json` / `get_d2c_result`，再结合 Figma MCP 原始节点与截图判断。
- 不得把“共同父节点”直接等同为“同一视觉块”；必须用节点截图、d2c 结构或运行态 DOM 证据确认。

## Figma-First Source Contract Policy

当 case 或 `ui-source-map.md` / `04-tech-plan.md` / Figma 缓存指向明确 Figma 节点、节点截图或可追溯 d2c 数据时，design 阶段必须先消费 Figma 结构源，再判断 runtime 是否对齐。

强制规则：

- Figma 结构源优先级：`FIGMA_NODE_DATA` / d2c JSON > Figma 节点截图 > 整页 Figma 截图 > 白板 / PRD / 计划描述。白板、PRD、组件库默认样式和 runtime baseline 只能补充，不能覆盖 Figma 可见结构。
- 对 Drawer / Modal / Popover 首次实现、新增复杂区域、表格整体结构、筛选区、推荐区、工具栏和卡片组，只要 Figma 中有明确区块、文案、容器或状态，必须完成 `F2C_REQUIRED` 级别的结构核验；不得用 `RUNTIME_BASELINE_ALLOWED` 绕过 Figma 结构核对。
- `F2C_REQUIRED` 是逐 case 的硬门禁，不是说明性标签。若当前 case、`delivery-task.md`、`05-implementation-log.md`、`04-tech-plan.md` 的 UI Evidence Mode 或 Figma / UI 执行清单把该目标标为 `F2C_REQUIRED`，则在进入 screenshot-first runtime 对比前，必须先产出 `/f2c` / d2c 结构证据（如 `get_d2c_json`、`get_d2c_result`、f2c 输出或等价可追溯 d2c 结果）。缺少该证据时，截图、DOM、computed style、组件库默认样式或 PRD 文案均不得替代 closure evidence；当前 case 只能标记 `PENDING_EVIDENCE` / `BLOCKED_NEEDS_F2C_SOURCE`，或在有明确用户/计划豁免时先回上游把 UI Evidence Mode 降级为 `RUNTIME_BASELINE_ALLOWED`。
- `/f2c` / d2c 的目标不是机械复制生成代码，而是提取结构合同：区块顺序、标题/按钮文案、父子层级、容器形态、关键间距、表格列/行骨架、状态浮层和禁显残留。
- runtime 截图、DOM、computed style 只能用于证明实现是否匹配 Figma 结构合同；不能反向修改合同，也不能把“当前页面可用”解释成设计通过。
- 如果 d2c / Figma 截图显示的主结构与 `04-tech-plan.md` 或 `delivery-task.md` 的任务描述冲突，先按交互逻辑边界分流：只要目标 Figma 已确权，且返工不改变用户操作路径、可点击 / 禁用业务语义、请求 / 响应合同、权限规则、跨系统动作或真实写接口，就视为当前 design 阶段可执行的 `F2C_REQUIRED` 设计返工，必须物化 `Design Rework Task` 并派发 `code-writer`；只有需要新增或改变未确权业务规则、接口合同、权限语义、跨系统协议、真实写动作，或无法定位可执行代码落点 / 验证点时，才标记 `BLOCKED_NEEDS_PLAN_REWORK` 回上游。
- 若缺少 Figma node / screenshot 但 case 声称有 Figma 结构来源，不得 PASS；必须补证或标记 `BLOCKED_NEEDS_FIGMA_SOURCE`。
- 若当前仅发现“已取到的 Figma 证据 scope 不匹配”，但任务空间、PRD、`ui-source-map.md`、`04-tech-plan.md`、whole-file cache、atlas/page screenshot 或现有 node 仍能追溯到同一 Figma 文件，主 Agent / `design-checker` 必须先执行一次 `沿 Figma 父链回溯 -> whole-file targeted read -> 补导更大 screenshot` 的扩展取证；只有扩展取证失败、无更大合法节点、或补到后仍不能覆盖当前 case 时，才允许标记 `BLOCKED_NEEDS_FIGMA_SOURCE`。不得把“当前缓存不够”直接写成“设计源缺失”。
- 当 Figma 证据是整页 atlas / whole-file 大图，且同一张图中存在多个相似页面、多个状态、多个示例或多个信息区时，不得直接以“全局图可见”作为对比基线。必须先在本地物化一个与当前 case 精确匹配的裁剪截图或节点截图，文件名应包含 `case_id / figma nodeId 或 atlas source / state`，并在 `Design Sources` 和 `Design Evidence Debug Log` 中记录：原始大图路径、裁剪图路径、裁剪区域对应的 Figma 子区域/状态、为什么这张图覆盖当前 case。只有本地裁剪图/节点截图真实存在、可读、且覆盖当前 case scope 后，才能进入 runtime 对比；否则只能记为 `PENDING_EVIDENCE` / `BLOCKED_NEEDS_FIGMA_SOURCE`。
- 对 page-level / region-level / 信息区 / 卡片区 / 表格区等整体大图 case，必须先做“行列语义对比”再做细节元素对比：先从 Figma 裁剪图或节点数据总结行、列、分组、归属、同级顺序和每组语义，再从浏览器截图/DOM 抄录同样的行列语义；若行/列/分组/语义归属不同，必须先判定为 `structure_mismatch_visible` 或 `BLOCKER`，不得跳到单个标签、颜色、圆角、顺序等细节项来得出 PASS。

## Test Case Consumption Policy

`/delivery:design` 必须消费独立 `09-test-case-matrix.md` 中 `verification_stage = design / verify+design` 的 case。

本阶段必须遵守 `.trae/AGENTS.md` 的 `Shared Case Evidence Closure Protocol`。共享协议只统一 active case、证据字段、detour 恢复和归档语义；design 的阶段专属职责仍是 Figma / 视觉合同 / 可见交互对齐，并复用 verify 运行态证据而不重复承担完整 build / test / mock-debug 验收。

执行规则：

- 主 Agent 必须先建立 `Design Case Queue`，按 case 顺序串行执行；任一时刻只能有一个 `active_case_id`。
- 当前 case 必须完成“对比 -> 判定 -> 归档或 auto-fix -> 复核 -> 归档”后，才能进入下一个 case；不得先批量扫描所有 case 后统一修复。
- `07-design-alignment.md` 必须维护 `Design Case Ledger` 或等价表，逐 case 记录 `case_id`、Figma source、runtime source、result、archive_status、auto_fix_status 和 next action。
- `design` 负责关闭视觉与可见交互对齐 case，而不是重复承担全部运行态验证。
- `verify+design` case 可复用 `/delivery:verify` 已产出的运行证据，但本阶段仍必须补齐视觉证据和差异分级。
- design case 仍按 case 串行执行，但 case 体系必须覆盖 page-level、region-level、interaction-level 三层；page-level baseline 未关闭前，不得以局部 case 推断整体 UI 已通过。
- `07-design-alignment.md` 必须按 `case_id` 记录 PASS / NON_BLOCKER / BLOCKER / FIXED_PASS / BLOCKED_NEEDS_PLAN_REWORK。
- 每个 design / verify+design case 必须消费 `contract_ref`、`positive_assertion`、`negative_assertion`、`evidence_required`；其中 `negative_assertion` 必须用于 Code → Design 反向扫描，确认代码没有多出禁显结构或旧 UI 残留。
- 若 case matrix 缺少核心区域的 design case，不得擅自降级为 notes；必须返回 `/delivery:plan` / `test-case-planning` 修复 coverage。

固定 SOP：

1. `识别 case scope`：先读取 `case_layer`、`scope`、`runtime_state`、`capture_scope`、`verify_screenshot_key`，明确当前 case 是 page-level、region-level、interaction-level 还是 cell-level。
2. `校验 figma scope`：先判断当前 Figma 证据覆盖范围是否足够支撑 case。page-level case 至少需要 page-level baseline；region-level case 至少需要 region-level baseline；局部 node / probe 只能做补充。若 scope 不匹配，但仍有可追溯的 `Figma URL / fileKey / nodeId / parent node / whole-file cache / atlas screenshot`，必须先执行一次扩展取证：沿父链寻找更高层节点、用 whole-file targeted read 反查更大合法容器、并在可行时直接导出更大 screenshot。只有扩展取证明确失败、无更大合法节点、或补证后仍不足时，才允许停在 `BLOCKED_NEEDS_FIGMA_SOURCE` 或 `PENDING_EVIDENCE`；否则不得继续对比，也不得直接暂停。
3. `判定 UI Evidence Mode / F2C Gate`：从 `delivery-task.md`、`05-implementation-log.md`、`04-tech-plan.md` 和当前 case 的 `implementation_task` 映射确认当前 case 是否为 `F2C_REQUIRED`。若是，必须先执行 `/f2c` / d2c 取证并记录 `f2c_source / d2c_result / consumed_contract`；缺证不得进入 runtime 对比和 PASS，只能 `PENDING_EVIDENCE` / `BLOCKED_NEEDS_F2C_SOURCE` 或回上游明确降级依据。
4. `物化整体 Figma baseline`：若 Figma source 是整页 atlas / whole-file 大图 / 包含多个相似画面的截图，必须先裁剪或导出与当前 case 精确匹配的本地 Figma baseline，并保存到 workspace（如 `figma-cache/crops/` 或等价目录）。裁剪后必须打开或读取图片尺寸确认文件真实存在且没有裁偏；若发现裁偏、只截到无关区域或混入其他示例，必须重新裁剪，不得继续对比。
5. `先做 Figma 行列语义表`：对 page-level、region-level、信息区、卡片区、表格区等整体 case，必须先从本地 Figma baseline 抽取行/列语义表，至少记录：行号/列号、区域归属、同级顺序、组内元素、必显元素、禁显残留、状态名或样本名。此表是后续细节对比的上游合同；不得用局部标签样式或单个元素位置替代。
6. `匹配 verify runtime source`：按 `case_id + runtime_state + verify_screenshot_key` 查 `Runtime Screenshot Evidence Index`，再查 workspace `screenshots/`；只有证据真实存在且状态匹配，才能视为可复用。
7. `判断 runtime materialization`：报告里引用过但文件不存在的截图视为 `missing`。
8. `抄录运行态行列语义事实`：必须从 runtime screenshot / DOM 抄录与 Figma 行列语义表同粒度的运行态行/列/组事实；这一步只记录可见事实，不先解释实现原因。若 runtime 行列语义与 Figma 不一致，必须先记为 `structure_mismatch_visible`，不得跳到 DOM / 代码把它解释成通过。
9. `先做整体语义判定，再做细节元素对比`：先基于 Figma 行列语义表 ↔ runtime 行列语义表给出整体结构判定；只有整体行/列/组/归属语义一致或有明确豁免来源后，才继续比较单个元素文案、tag 顺序、颜色、圆角、icon、bbox、computed style。若整体语义不同，单个元素局部修正不得关闭 case。
10. `先做 screenshot-first 结构判定，再用 DOM / bbox / computed style 解释差异`：先基于 Figma ↔ runtime screenshot 给出首轮结构 / 样式判定，再用 DOM / bbox / computed style 解释差异属于父子挂载、同级顺序、视觉分组、容器样式还是状态问题。DOM / 代码只能解释差异和定位修复点，不能推翻截图中已可见的结构冲突。
11. `执行 negative scan`：必须用 `negative_assertion` 做 Code → Design 反向扫描，确认没有旧结构、错误容器、错误按钮、额外列、错误颜色、错误 icon 或臆造 UI。
12. `检查 closure evidence 并给出单 case gate`：确认当前 closure evidence 是否足够关闭当前 case。若仅有局部 Figma probe、runtime 截图 scope 不足、截图未 materialize、状态不匹配、未完成整体行列语义表、`F2C_REQUIRED` 缺少 `/f2c` / d2c 证据、对应 case result 的 design 待验收项仍为 `OPEN`，或截图直观事实与书面结论冲突，则不得 `PASS`。只有前 11 步都通过，才允许 `PASS` / `NON_BLOCKER`；否则按 `MOCK_ISSUE`、`SAMPLE_COVERAGE_GAP`、`BLOCKER`、`NEEDS_TARGETED_REVIEW`、`BLOCKED_NEEDS_FIGMA_SOURCE`、`BLOCKED_NEEDS_F2C_SOURCE` 分流。

逐 case gate：

- `PASS` / `NON_BLOCKER`：立即归档当前 case，记录证据和豁免来源后进入下一个 case。
- `MOCK_ISSUE` / `SAMPLE_COVERAGE_GAP`：立即执行 `/delivery:mock`，回到同一 case 重取证据并复核；关闭前不得进入下一个 case。其中 `SAMPLE_COVERAGE_GAP` 只关闭样本依赖的可见状态证据，不关闭真实 contract 断言。
- 可执行 `BLOCKER`：立即物化当前 case 的 Design Rework Task，派 `code-writer`，等待 HMR / 自动增量编译后复跑同一 case；关闭前不得进入下一个 case。
- 不可执行 `BLOCKER` / `NEEDS_TARGETED_REVIEW` / `BLOCKED_NEEDS_FIGMA_SOURCE`：立即暂停或回上游；不得继续扫描后续 case。

## Runtime Screenshot Reuse Protocol

`/delivery:design` 可以复用 `/delivery:verify` 保存的运行态截图，但必须把截图消费成结构 / 样式对比证据。截图路径本身不是设计对齐结论。

固定规则：

- 执行 design 前必须读取 `06-debug-verification.md` 的 `Runtime Screenshot Evidence Index` 和 workspace `screenshots/` 目录，并按 `case_id + runtime_state + verify_screenshot_key` 先尝试匹配可复用截图。
- 匹配到 verify 截图后，必须先检查 `screenshot_path` 是否真实存在；若文件不存在，只能记为 `missing`，不得继续把报告中的旧路径当成可复用证据。
- design hot-fix 进入修复前，必须先消费现有 runtime screenshot / DOM / computed style 作为 baseline，明确当前 case 的结构差异、样式差异和 `negative_assertion` 残留；不得跳过 baseline 直接改代码。
- 每个 `design` / `verify+design` case 都必须有 Figma 基准源，并在 `07-design-alignment.md` 输出 `Figma-vs-Runtime Evidence` 对比记录；不得以 `evidence_required` 未显式写 Figma 为由跳过对比。
- Figma 基准源只能是 `FIGMA_SCREENSHOT`（Figma 导出截图 / 节点截图）或 `FIGMA_NODE_DATA`（Figma MCP 原始节点、节点 JSON 或可追溯到 Figma node 的 d2c 数据）。白板、PRD 文本、旧运行态截图、组件库默认样式或计划描述只能作为补充，不能替代 Figma 基准源。
- 每个 case 都必须显式写出 `case_scope vs figma_scope` 判断。page-level case 不能只靠 node/probe 图；region-level case 不能只靠局部 node/probe 图。scope 不匹配时，不得 `PASS`。
- `Figma-vs-Runtime Evidence` 的字段固定为：
  - `case_id`
  - `figma_source_type`：`FIGMA_SCREENSHOT` / `FIGMA_NODE_DATA`
  - `figma_source`：nodeId / Figma 截图路径 / Figma MCP 节点数据路径 / d2c 结果路径
  - `ui_evidence_mode`：`F2C_REQUIRED` / `RUNTIME_BASELINE_ALLOWED` / `NO_F2C_REQUIRED`
  - `f2c_source`：`/f2c` / d2c 工具、nodeId、结果路径；不适用时写 `N/A` 和原因
  - `consumed_contract`：从 d2c / f2c / Figma 结构源提取并用于对比的结构合同摘要
  - `runtime_source`：verify 阶段截图路径或本阶段新截图路径
  - `figma_baseline_materialization`：原始整页图 / nodeId、裁剪或导出的本地 Figma baseline 路径、裁剪/导出状态
  - `semantic_grid_comparison`：Figma 与 runtime 的行/列/组/归属语义对比；信息区至少覆盖标题行、基础信息行、内容标签行、ID 行、签名行、评级行、tab 行中的适用项
  - `structure_comparison`：区域顺序、容器形态、列数、表头、按钮顺序、状态块、首行关键单元格
  - `style_comparison`：关键间距、字号、颜色、边框、圆角、Tag / Button 状态；无法量化时写明原因
  - `negative_scan`：旧结构、缺列、错序、伪记录、错误容器、额外 UI 是否存在
  - `result`：`PASS` / `NON_BLOCKER` / `BLOCKER` / `NEEDS_TARGETED_REVIEW`
- 若复用 verify 截图，必须写明截图覆盖的状态，例如 `open drawer`、`hover after scroll`、`empty state`、`disabled clicked`；状态不匹配时必须补新截图或标记 `NEEDS_TARGETED_REVIEW`。
- 对每个 design / verify+design case，默认顺序固定为：`match verify screenshot -> 判断状态匹配 -> 首轮 Figma 对比 -> 必要时补抓新图`。不得先补抓新图，再事后回填“可复用 verify 证据”。
- baseline 旧截图只能用于 hot-fix 前定位差异和定义返工目标；代码修改后必须在同一浏览器会话补采同状态的新 runtime source，作为当前 case 关闭或继续返工的唯一 closure evidence。
- 对表格 / 列表 / Drawer / Modal / Popover，必须逐项比对 Figma 可见列、表头、操作区、关闭区、分页、空态和首行关键内容；缺列、列顺序错误、容器形态错误默认 `BLOCKER`。
- 若无法取得 Figma screenshot / Figma node data 或 runtime source，不能 PASS；必须标记 `NEEDS_TARGETED_REVIEW` 或 `BLOCKED_NEEDS_FIGMA_SOURCE`，说明缺失的是 Figma 证据、运行态截图还是 DOM/computed style。
- 若 runtime source 为白屏/骨架空白，`Design Evidence Debug Log` 必须额外记录 console 检查是否完成、关键 error 摘要与最终分流理由；未做 console 检查时不得关闭当前 case。

禁止事项：

- 禁止在 `actual_evidence` 里仅写 `复用 verify 证据，维持通过`。
- 禁止用 verify 的功能通过、DOM 文案存在、接口返回正常，替代 Figma 结构 / 样式对比。
- 禁止只对比正向断言；必须同时执行 `negative_assertion` 的 Code → Design 反向扫描。

## Design Evidence Debug Log Protocol

为便于排查 design 阶段为什么没有消费截图、消费了错误状态截图、或没有真正对比 Figma，`/delivery:design` 必须在 `07-design-alignment.md` 记录 `Design Evidence Debug Log`。这是阶段报告日志，不允许通过业务代码 `console.log` 实现。

日志字段固定为：

- `case_id`
- `case_scope`
- `figma_scope`
- `scope_match`: `exact` / `partial` / `mismatch`
- `figma_source_status`: `found` / `missing` / `ambiguous`
- `figma_source_type`: `FIGMA_SCREENSHOT` / `FIGMA_NODE_DATA` / `missing`
- `figma_source`: nodeId、Figma 截图路径、Figma MCP 节点数据路径或 d2c 结果路径
- `ui_evidence_mode`: `F2C_REQUIRED` / `RUNTIME_BASELINE_ALLOWED` / `NO_F2C_REQUIRED`
- `f2c_required`: `yes` / `no`
- `f2c_source_status`: `found` / `missing` / `failed` / `not_applicable`
- `f2c_source`: `/f2c` / d2c 结果路径、nodeId 或 `N/A`
- `f2c_consumed_contract`: 已消费的结构合同摘要；未消费时写原因
- `figma_baseline_local_path`: 整体大图裁剪/节点导出的本地路径；不适用时写 `N/A`
- `figma_baseline_materialization_status`: `local_file` / `cropped_from_atlas` / `node_export` / `inline_only` / `missing` / `not_needed`
- `semantic_grid_done`: `yes` / `no` / `not_applicable`
- `semantic_grid_result`: `match` / `mismatch` / `partial` / `not_applicable`
- `runtime_source_status`: `reused_verify` / `new_capture` / `missing` / `state_mismatch`
- `runtime_source`: verify 截图路径或本阶段新截图路径
- `verify_screenshot_key`: 复用的 verify 截图键或 `N/A`
- `runtime_materialization_status`: `local_file` / `inline_only` / `missing`
- `figma_scope_coverage_reason`
- `figma_retrieval_attempted`: `yes` / `no`
- `figma_retrieval_action`: `parent_chain` / `whole_file_targeted_read` / `screenshot_export` / `none`
- `figma_retrieval_result`: `success` / `no_better_source` / `failed` / `not_needed`
- `state_match`: `yes` / `no`
- `comparison_done`: `structure` / `style` / `negative_scan` 的完成情况
- `decision`: `PASS` / `NON_BLOCKER` / `BLOCKER` / `NEEDS_TARGETED_REVIEW`
- `reason`: 关键差异、跳过原因或证据缺口

关键节点必须打日志：

- 解析 case 的 Figma source 时。
- `case_scope vs figma_scope` 首轮不匹配，开始沿 Figma 父链 / whole-file 补证时。
- 从 `Runtime Screenshot Evidence Index` 选择可复用截图时。
- 判断 verify 截图状态是否匹配当前 design case 时。
- 生成 `Figma-vs-Runtime Evidence` 后写入最终结论时。
- 因缺少 Figma / runtime / computed style 证据而不能 PASS 时。

## Main Agent Gate Review

主 Agent 必须遵守 `.trae/AGENTS.md` 的 `Main / Subagent Collaboration Contract`。

所有模式都必须产出以下高信号内容；默认由 `design-checker` 在压缩证据包中产出，主 Agent fallback 时自行产出：

- 整页 Visible Contract：区域顺序、父子层级、背景归属、文案结构、交互入口和禁显残留。
- 运行态证据：snapshot、截图、DOM direct children、computed style、关键点击断言。
- Figma-vs-Runtime Evidence：每个 design / verify+design case 都必须列出 Figma screenshot 或 Figma node data、runtime source、结构对比、样式对比、负向扫描和结论。
- `/f2c` / Figma MCP 证据：结构争议区域必须说明使用了哪个 node、d2c JSON / result 或原始节点数据。
- BLOCKER 分级、修复边界、验证方式，以及如何在当前 design 阶段物化 `delivery-task.md` 并派发 `code-writer`。

委派 `design-checker` 时，主 Agent 只审以下高信号内容：

- 当前 active case 的 `Agent Gate Summary`。
- Design Alignment Report 的 Design Sources、Mock Issues、Blockers、Design Rework Task Draft、Gate Recommendation。
- `09-test-case-matrix.md` 中 `verification_stage = design / verify+design` 的 case 执行结果。
- `Design Case Ledger` 是否显示当前 case 已归档；若未归档，不得审下一个 case。
- 三契约防漏字段是否被逐项核对：Region 的 `结构签名 / 必显元素 / 禁显残留`，Interaction 的 `负向断言`，Cell 的 `必显子元素 / 禁显残留`。
- Code → Design 中新增可见 UI 是否都有来源。
- BLOCKER 是否已能映射为 `delivery-task.md` 中可执行 Design Rework Task，并满足阶段内派发 `code-writer` 的边界。
- `07-design-alignment.md`、`delivery-task.md`、`05-implementation-log.md` 与 `.trae/DELIVERY_STATE.md` 的 auto-fix handoff / resume 状态。

只有当主 Agent 证据或 design-checker summary 显示 `BLOCKED` / `NEEDS_TARGETED_REVIEW`、设计源缺失、BLOCKER 分级存疑、返工任务无法执行、或代码新增 UI 无来源时，才扩大回读范围。不得在缺少浏览器运行态证据时声明核心区域 PASS。

## Required Checks

必须完成双向检查：

1. Design → Code
   - 设计稿中的页面结构、文案、按钮、表单、表格列、弹窗、状态是否在代码中存在。
   - 必须按 `positive_assertion` 核对三契约中的必显区域、必显控件、必显单元格子元素。
2. Code → Design
   - 代码新增的页面元素、分支状态、交互是否有设计来源。
   - 必须按 `negative_assertion` 与三契约中的禁显字段反向扫描，确认运行态没有旧结构、旧按钮、错误容器、错误默认值、额外列或臆造 UI。
3. 状态覆盖
   - 空态、加载态、错误态、禁用态、权限态、无数据态。
4. 文案与枚举
   - 文案、字段名、状态标签、tooltip、说明文案。
5. 样式与复用
   - 是否复用项目规范和已有组件。
6. 关键单元格逐格对齐
   - 对表格 / 列表主态，必须检查首行关键单元格，而不只看表头、列顺序或整表截图。
   - 关键单元格优先覆盖承载核心识别和操作语义的列，如名片、标签、状态、权限、操作等关键列。
   - 标签类字段必须校验 badge 形态、底色、文字色、圆角、尺寸级别或等价视觉语义；不得因为文本正确就视为通过。
   - 必须同时核对 `必显子元素/字段` 与 `禁显子元素/残留`；发现禁显残留时默认标记为 `BLOCKER`，除非已有明确豁免来源。

## Browser-Led Visible Contract Audit

主 Agent 执行 `/delivery:design` 时，必须先建立整页 Visible Contract，再判断单点差异。

推荐闭环：

1. 固定运行环境：复用现有 dev server、mock 参数、浏览器 profile 和当前 tab。
2. 目标结构草图：先基于 Figma screenshot / node data 提取当前页面或区域的目标可见结构，记录适用的容器/归属、同级、顺序、分组和禁显残留。
3. 整页快照与事实抄录：用当前 `Browser Runtime Mode` 对应的浏览器获取 snapshot / accessibility tree 与截图，确认页面骨架顺序，并从 runtime screenshot 抄录实际可见结构；这一步只记事实，不先解释原因。
4. screenshot-first 首轮判定：先把目标结构草图与运行态事实抄录并排比较；若截图肉眼已显示结构冲突，先记为结构不通过或证据不足，不得跳过。
5. 区域取证与差异解释：再对标题区、筛选区、推荐区、工具栏、表格、分页、Drawer / Modal / Popover 逐区读取 DOM direct children、computed style、bounding box 和关键文本；当区域归属、父子层级、背景归属、行内/块级文本不确定时，调用 `/f2c` 系列能力；以 `get_d2c_json` 判断节点包含物，以 `get_d2c_result` 判断实现结构参考。
6. 负向扫描与边查边改：搜索旧按钮、旧列、错误文案、错误默认值、错误 create/edit 语义、额外容器和无来源 UI。若差异在安全边界内，改代码后等待 HMR / 自动编译，在同一浏览器会话复核；不得每轮重启 dev server 或新开浏览器。

每个核心区域至少记录：`design_source`、`runtime_evidence`、`contract_result`、`negative_scan`。

## Visual Fidelity Levels

执行者必须声明本次检查达到的视觉对齐粒度：

| level | name | 要求 | 是否足以通过核心区域 |
|---|---|---|---|
| L1 | Structure Fit | 区域存在、顺序正确、主流程可用 | 否 |
| L2 | Visible Contract Fit | 文案、字段顺序、控件形态、默认值、关键交互严格一致 | 仅可作为功能视觉通过，不足以声明像素级 |
| L3 | Basic Pixel Fit | 核心区域位置、尺寸、间距、颜色、字号、圆角、边框、按钮状态有截图和 DOM / computed style 证据，偏差在阈值内 | 是 |
| L4 | Pixel Diff Fit | 使用自动截图 diff 或等价工具量化整体像素差异，并审查阈值外区域 | 是，最高置信 |

默认门槛：

- 对筛选区、推荐区、工具栏、表格、分页、Modal / Drawer / Popover 等核心区域，目标门槛为 `L3 Basic Pixel Fit`。
- 如果只能达到 `L2`，必须说明缺少哪些视觉数据或自动化能力，并把样式差异列入 NON_BLOCKER / BLOCKER；不得笼统写“基本一致”。
- `L3` 至少要求：核心容器 bounding box / computed style、关键文案与控件 DOM、截图证据齐全；主容器位置/尺寸/间距偏差原则上不超过 4px，字号/行高偏差不超过 1px，圆角/边框偏差不超过 2px，颜色需匹配 token 或截图采样等价。

## Strict Difference Classification

执行者必须按 Figma / 白板 / 截图事实严格分级，不能用“有组件来源 / 有计划来源 / 仓库已有模式”自动降低差异等级。

以下差异在核心交付区域默认标记为 `BLOCKER`：

- Figma 明确可见文案与运行态文案不一致，包括按钮、触发器、字段 label、placeholder、默认值、状态标签、tooltip。
- Figma 明确控件形态与运行态不一致，包括 `label + input` 被合并成单一 placeholder、Select 默认值从 `不限` 变成 `请选择`、按钮变成普通文本、Popover / Drawer / Modal 形态变化。
- Figma 明确区域顺序、字段顺序、表格列顺序、操作区位置、容器形态不一致。
- Figma / d2c 明确主结构与 `04-tech-plan.md` 或 `delivery-task.md` 的任务结构合同不一致，例如 Figma 是 `诊断区 -> 指标完成区 -> 异动数据区`，而任务实现为另一套区块；若该差异不改变交互逻辑边界，必须按可执行 `F2C_REQUIRED` 设计返工处理，不得默认回上游。只有影响未确权业务规则、接口合同、权限语义、跨系统动作、真实写接口或文件边界不可控时，才标记 `BLOCKED_NEEDS_PLAN_REWORK`。
- Figma 明确主态 / 关键交互态存在，但运行态缺失、不可点击、点击后状态不变或被容器裁剪。
- Figma 明确标签是 badge / pill / 语义色块，但运行态被实现成裸文字、错误颜色、错误底色、错误圆角或错误尺寸级别，即使文案本身正确。
- 表格首行关键单元格缺少逐格证据，导致无法判断标签、权限、状态、操作列是否真的与 Figma 一致。
- Region / Interaction / Cell 契约中列为 `禁显元素/残留`、`负向断言(禁显/无副作用)`、`禁显子元素/残留` 的内容在运行态出现。

只有同时满足以下条件，才能把核心区域差异降级为 `NON_BLOCKER`：

- `04-tech-plan.md` 或用户 / 产品 / 设计确认中明确写出该差异是允许的目标行为，而不是仅写“复用组件”。
- 差异不影响用户理解、筛选输入、操作入口、状态判断、验收截图和主流程可用性。
- `07-design-alignment.md` 必须记录豁免来源、差异范围、后续是否需要产品确认。

特别注意：

- 组件复用只说明实现来源，不等于视觉豁免。
- `Evidence-Bound Reference Decisions` 只有在逐字描述具体可见差异并给出接受理由时，才允许作为降级依据。
- 对筛选区、推荐区、工具栏、表格、分页、Modal / Drawer / Popover 等核心区域，文案和默认态差异不能默认归为“copy-only”。
- 对任何承载状态 / 权限 / 枚举 / 等级 / 归属语义的标签类元素，必须把“视觉语义”当作可见事实核对项，而不是普通字符串。典型例子包括状态标签、权限标签、枚举 badge、top 标签。
- 若只拿到整页截图或表头 DOM，没有首行关键单元格的截图 / DOM / computed style 证据，不得关闭对应 design case。
- 若只验证了 `positive_assertion` 而未执行 `negative_assertion`，不得关闭对应 design / verify+design case；必须标记 `NEEDS_TARGETED_REVIEW` 或 `BLOCKER`。

## Design Auto Fix Mode

`/delivery:design` 默认启用 Design Auto Fix Mode；`--auto-fix` 仅作为显式强调，不改变安全边界。本 skill 仍先执行设计检查和分级，但允许主流程在安全边界内自动编排返工闭环。

Auto Fix 必须遵守：

1. `design-checker` 不直接修改业务代码；对当前 active case 的设计 BLOCKER 只输出 BLOCKER、Design Rework Task Draft 和压缩证据包，由主 Agent Gate Review 后在当前 design 阶段内增量更新 `delivery-task.md`。对 mock 根因只输出 Mock Issues 和 `/delivery:mock` 调整方向。若主 Agent fallback 直接审计，还必须记录 fallback 原因。不得把多个未归档 case 的 BLOCKER 累积成批量返工。
2. 若根因为 `MOCK_ISSUE`，优先进入 mock auto-fix：主 Agent 保存 `origin_stage=design`、case/rule/API、vmok URL、截图 / Network / console 摘要和恢复点，直接执行 `/delivery:mock` 更新 mock 产物 / BAM marker / wrapper request 字段透传；审查 PASS 后回到原 design case 重取证据并继续。本路径不得派代码 agent，不得写 Design Rework Task，也不得标记为设计 BLOCKER。
3. 若根因为非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP`，主 Agent 也可进入 `/delivery:mock`，但只允许为当前 active case 生成补充样本状态。必须同时记录 `real_contract_evidence`、`mock-only supplemental evidence`、`supplemental_assertions`、`forbidden_contract_assertions` 和 `mock_debug_param`；不得用该路径掩盖 `API_ISSUE / DATA_CONTRACT_MISMATCH`，也不得把 mock 补证后的截图写成真实接口已满足。
4. 只有当 Design Rework Task 边界完整，且差异属于已由 PRD / Plan / Figma 确权的前端范围（包括 copy、placeholder、默认值、控件形态、字段/列顺序、布局、间距、颜色、圆角、边框、层级、显隐、展示条件、状态派生、事件处理或轻量交互 wiring）时，才允许自动进入受限 code rework。修改逻辑代码本身不构成暂停条件；改变未确权业务规则、接口合同、权限语义或跨系统协议才构成暂停条件。
   - “局部样式 / 可 auto-fix 差异”的界定以是否影响交互逻辑为准：不改变用户操作路径、可点击 / 禁用业务语义、请求 / 响应合同、权限规则、跨系统动作或真实写接口的可见 UI 差异，都必须优先在 design 阶段自动返工；该范围可包含结构、文案、顺序、容器、布局和样式，不限于 CSS 数值。
5. Design Rework Task 必须标注 `UI Evidence Mode` 并携带对应证据引用：
   - `F2C_REQUIRED`：新增页面 / 新增区域 / 新增复杂组件 / 表格整体结构 / Drawer / Modal / Popover 首次实现；或虽为已有 UI，但 Figma 明确给出主结构、区块顺序、容器形态、标题/按钮、表格骨架、浮层结构且当前实现需要按该结构返工。必须引用 `/f2c` d2c、Figma MCP 或节点截图确认目标结构。
   - `RUNTIME_BASELINE_ALLOWED`：已有 UI 的局部文案、样式、显隐、交互 wiring、数据接入或轻量设计返工；前提是 Figma 主结构已核对且不存在区块顺序、父子层级、容器形态、表格整体结构、Drawer/Modal/Popover 骨架差异。允许使用 Figma / Design contract + 现有 DOM / screenshot / computed style baseline + 浏览器复核，不强制重新用 `/f2c` 改造旧结构。
   - `NO_F2C_REQUIRED`：非可见逻辑、类型、构建、接口修复或 legacy 保留；写明 N/A 原因，不得借 f2c 重建旧 UI。
   设计检查阶段仍可使用 `/f2c` / Figma MCP / 节点截图定位结构差异；但只有 `F2C_REQUIRED` 缺少 d2c / Figma 结构证据时才阻塞派发。若 Figma 结构证据与 plan/task 合同冲突，但不影响交互逻辑边界，必须升级为 `F2C_REQUIRED` 设计返工并继续 auto-fix；不得用 `RUNTIME_BASELINE_ALLOWED` 绕开结构证据。任何模式都不得只根据截图主观印象或 `07-design-alignment.md` 的一句差异描述临时改代码。
6. 自动 code rework 必须使用 `Use Skill: executing-plans` 的计划任务边界，可执行范围必须可定位；优先列出允许 / 禁止文件，无法精确到文件时给页面、组件、代码落点、错误栈或定位依据，并沿用 `code-writer` 的默认禁止范围。主 Agent 必须派发 `code-writer` 执行该 Design Rework Task，不得由 `design-checker` 或主 Agent 无任务边界地直接改业务代码。该任务的验收目标应定义为“当前 active case 场景收敛到 Figma 合同”，而不是“只完成一条局部 DOM 改动”。
7. `code-writer` 返回后，主 Agent 必须审查 `Agent Gate Summary`、改动文件、允许文件范围和 `05-implementation-log.md`，然后默认采用 HMR-first / browser-first 复核：等待现有 dev server 自动增量编译，确认无编译错误或明显 runtime error，再复用同一浏览器会话立即复查原 design case。
8. 自动 verify 默认只执行设计返工闭环所需的轻量证据：HMR / 自动增量编译状态、vmok screenshot、DOM/computed style、关键点击断言和 Figma-vs-Runtime Evidence。只有 dev server 编译失败、页面 runtime error、改动涉及类型 / 接口 / 数据结构 / 公共组件、`code-writer` 未给出基本验证结果或浏览器证据无法定位问题时，才升级执行 targeted typecheck / build / diagnostics。
9. 自动 rerun design 必须复核原 active case 的 BLOCKER 是否关闭；仍有 BLOCKER 时可继续下一轮，最多 2 轮。当前 case 关闭并归档前，不得继续后续 case。超过 2 轮或出现不确定决策必须暂停。
10. 若涉及产品/设计决策、接口、权限业务规则、跨系统动作、真实写接口、无法定位可执行代码落点、`/delivery:mock` 审查失败、`code-writer` 验证失败、修复后 design 复核仍不通过或浏览器/环境不可恢复，必须停止 auto-fix 并按阶段 Gate 返回。

Auto Fix 性能约束：

- 不得每轮启动新 dev server。若 `http://localhost:8079/alliance-operation-daren` health check 已 PASS 且进程属于当前 workspace，必须复用；代码保存后等待 dev server 自动重新编译。
- 不得每轮关闭浏览器。`TRAE_DESKTOP` 复用内置浏览器会话或统一 Profile `.trae/browser-profiles/ecop-vmok-agent-browser`；`COCO_CLI_HEADLESS` 复用无头浏览器 context、user data dir 或 storage state。只有 Profile/state 被忽略、页面卡死、端口错误或用户要求时才重启。
- 报告必须记录 `dev_server_reuse`、`browser_runtime_mode`、`browser_tool`、`headless`、`browser_session_reuse`、`profile_or_storage_state`、`reload_method`。
- Default Subagent Runtime Mode 下，主 Agent 必须先固定 dev server 与 vmok URL，再把它们写入子 Agent task prompt；禁止让子 Agent 反复自行启动服务或询问用户缺失的 `fileKey/nodeId`。
- 子 Agent 返回后，主 Agent 的 Gate Review 默认只审 `Agent Gate Summary`、BLOCKER、截图路径、关键 computed style、允许文件范围和验证结果；不得把子 Agent 采集到的大型原始 DOM / Figma JSON 回灌进主会话。

## Required Outputs

必须更新：

- `07-design-alignment.md`
- `delivery-mock.md` / `mock/**`（当 `MOCK_PREVIEW` 下 design mock auto-fix，或非 `MOCK_PREVIEW` 下命中 `SAMPLE_COVERAGE_GAP` 并调用 `/delivery:mock` 补充取证时，由 `/delivery:mock` 更新）
- `delivery-task.md`（仅当存在 BLOCKER 时，在当前 design 阶段内直接增量写入 Design Rework Task；复用 `/delivery:task` 合同但不切换阶段）
- `05-implementation-log.md`（仅当 design auto-fix 派发 `code-writer` 时，记录返工切片、改动文件和验证结果）
- `ui-source-map.md`

运行态说明：

- `.trae/DELIVERY_STATE.md` 是本地状态机缓存，不属于本 skill 的交付产物。
- `design-checker` 不得直接修改 `.trae/DELIVERY_STATE.md`；如需记录阶段状态，只由主 Agent 在 Gate Review 后做最小更新。

`07-design-alignment.md` 额外要求：

- 对表格 / 列表主态，必须有一段 `Figma Cell Contract` 或等价小节，逐项记录首行关键单元格的设计来源、运行态证据与结论。
- 若某个标签类字段仅确认了文案，未确认 badge 形态 / 颜色 / 圆角 / 尺寸，不得写 `PASS`，只能写 `NEEDS_TARGETED_REVIEW` / `NON_BLOCKER` / `BLOCKER`。
- 若 Figma 可见区域包含 icon / image / illustration / 认证标识 / 状态徽标等非文字资产，`07-design-alignment.md` 必须补一段 `Asset Source Audit` 或等价记录，至少说明：Figma 取证节点、是否已检查父组与 sibling image/icon 节点、运行态实际资源来源（本地 import / URL / sprite / icon component）、以及资源是否已替换为目标设计稿版本。
- 对“文字 + 图标”组合元素，运行态截图看起来接近但未证明资源来源或资源替换落点时，不得写 `PASS`。仅确认文案、颜色、圆角或容器尺寸仍不足以关闭该 case。
- 必须有 `Visual Contract Consumption` 或等价小节，按 `case_id` 记录 `contract_ref`、`positive_assertion`、`negative_assertion`、`evidence_required`、实际证据和结论。
- 每次 design 审计都必须有 `Browser-Led Visible Contract Audit` 或等价小节，记录整页顺序、核心区域 evidence、负向残留扫描，并按 `UI Evidence Mode` 记录 `/f2c` / Figma MCP 结构证据或运行态 DOM / screenshot / computed style baseline；默认由 `design-checker` 写入压缩证据包并由主 Agent 摘要落盘。

## Design Rework Handoff

当存在 BLOCKER 时，必须完成 handoff，不能只给出检查结论：

1. 在 `07-design-alignment.md` 中输出 `Design Rework Task Draft`。
2. 在当前 design 阶段内将每个可修复 BLOCKER 映射为 `delivery-task.md` 中的可执行返工任务，格式必须满足 `executing-plans`：
   - `### Task N: Design Rework - <scope>`
   - `Blocks:` 列出 BLOCKER ID。
   - `UI Evidence Mode:` 写 `F2C_REQUIRED` / `RUNTIME_BASELINE_ALLOWED` / `NO_F2C_REQUIRED`。
   - `Evidence Refs:` 写 f2c / Figma MCP、runtime baseline、截图、DOM、computed style 或 N/A 原因。
   - `Files / Scope:` 列出允许修改文件 / 目录 / 代码落点；能列禁止文件则列出，未单独列出时沿用 `code-writer` 默认禁止范围。
   - checkbox step 写清具体改动。
   - 每个 step 必须有 HMR / browser 复核点或预期结果；验证命令只在任务本身声明或触发升级条件时补充。
3. 返工任务必须引用与 `UI Evidence Mode` 匹配的证据：`F2C_REQUIRED` 引用 f2c / Figma 结构来源；`RUNTIME_BASELINE_ALLOWED` 引用 runtime baseline、目标文案 / 顺序 / 布局和基础组件选型；`NO_F2C_REQUIRED` 引用非视觉修复原因和验证方式。
4. 任务边界完整时，主 Agent 必须立即派发 `code-writer` 执行该 Design Rework Task，随后等待 HMR / 自动增量编译并回到原 design case / BLOCKER 复核；只有触发升级条件时才补跑 targeted typecheck / build / diagnostics。
5. Design Rework Task 物化前后必须保持 design 为当前阶段；差异等级 `BLOCKER` 不等于阶段状态 `BLOCKED`。自动修复期间记录 `AUTO_FIX_IN_PROGRESS` 或等价状态，不得设置 `is_paused=true`，不得把 `resume_command` 改成 `/delivery:code`。
6. 禁止把 `ui-source-map.md` 或 `07-design-alignment.md` 作为代码实现的直接输入；它们只能作为 Design Rework Task 的证据来源。
7. 如果无法把 BLOCKER 写成可执行 task，必须标记 `BLOCKED_NEEDS_TASK_REWORK`；如果缺口来自 plan contract 但不影响交互逻辑边界，必须在当前 design 阶段改写为 `F2C_REQUIRED` Design Rework Task 并继续 auto-fix；只有涉及未确权业务规则、接口合同、权限语义、跨系统协议、真实写动作，或缺少可执行边界时，才标记 `BLOCKED_NEEDS_PLAN_REWORK` 并暂停。

## Difference Levels

- BLOCKER：影响交付，必须修复或用户确认豁免。
- NON_BLOCKER：不阻塞交付，但必须记录。
- NOTE：普通说明。

## Gate

- 缺少任一 design / verify+design case 的 Figma screenshot 或 Figma node data：不得进入 `/delivery:accept`；必须补齐 Figma 基准源，无法补齐时标记 `BLOCKED_NEEDS_FIGMA_SOURCE` 并暂停。
- 无 BLOCKER：允许进入 `/delivery:accept`。
- 有 `MOCK_ISSUE`：不得进入 `/delivery:accept`，也不得写 Design Rework Task；必须在当前 design 阶段内调用 `/delivery:mock` 修复 mock，审查 PASS 后恢复原 active case 并归档，随后继续下一个 case。
- 有 `SAMPLE_COVERAGE_GAP`：只有真实 contract 断言已被真实证据关闭时，才允许在当前 design 阶段内调用 `/delivery:mock` 补充样本依赖的视觉 / 状态证据；归档时必须同时保留 `real_contract_evidence` 与 `mock-only supplemental evidence`。当前 case 归档后，主 Agent 必须立即回到 `/delivery:mock` 做 cleanup，并移除 `mock_debug_param` 后复查页面；cleanup 未完成或移除 debug 参数后仍依赖临时 mock，仍不得进入 `/delivery:accept`。若真实 contract 断言未关闭，也不得进入 `/delivery:accept`。
- 有 BLOCKER 且 Design Rework Task 可执行：不得结束为 BLOCKED；必须在当前 design 阶段内派发 `code-writer` 修复、等待 HMR / 自动增量编译、复跑原 active case，并在关闭归档后继续下一个 case；只有触发升级条件时才补跑 targeted typecheck / build / diagnostics。
- Figma / d2c 证据推翻现有 plan/task 的 UI 结构合同：不得进入 `/delivery:accept`；若不影响交互逻辑边界，必须在当前 design 阶段物化 `F2C_REQUIRED` Design Rework Task 并 auto-fix；只有涉及未确权业务规则、接口合同、权限语义、跨系统协议、真实写动作，或缺少可执行边界时，才标记 `BLOCKED_NEEDS_PLAN_REWORK` 回上游重新定义任务边界和验收 case。
- 有 BLOCKER 但 Design Rework Task 无法物化、涉及产品/接口/权限/跨系统决策，或修复验证失败：不得进入 `/delivery:accept`，必须标记对应 BLOCKED 原因并暂停。
