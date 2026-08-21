---
description: 执行需求级 BITS 流程：初始化 BITS 开发任务、处理评审闭环，或执行覆盖率优化闭环
argument-hint: --init|--cr|--coverage [MR链接或编号] [--dry-run] [--execute|--submit] [--rounds 3] [--threshold 90]
---

请按 `.trae/AGENTS.md` 和 `.trae/skills/bits-dev-flow/SKILL.md` 执行 `/delivery:bits`。本 command 只负责入口参数解析、状态读取、模式编排、授权边界和暂停恢复；BITS / Codebase CLI 的具体调用细节以可用的 `bytedance-bits` 或 `bytedcli` 能力为准，评审问题的取舍、合并、修复和闭环、覆盖率优化轮次以 `bits-dev-flow` skill 为准。

用户输入：$ARGUMENTS

## 命令定位

`/delivery:bits` 是需求交付流程的辅助执行入口，不替代 `/delivery:init` 到 `/delivery:accept` 的阶段门禁。

- `--init`：创建或复用 BITS 开发任务，产出 BITS 任务信息。
- `--cr`：处理当前需求 MR 上的 Codebase Assistant / Aime 评论，并可合并本地 CodeGuard 报告形成选择性修复闭环。
- `--coverage`：拉取 Huatuo 最新分支覆盖率，判断整体覆盖率是否达到阈值；未达标时按未覆盖行数最大文件进行最多三轮覆盖率优化、真实线上 UI 覆盖和刷新验证。

除非用户明确要求，本命令不得推进普通 delivery 阶段，不得修改 `.trae/DELIVERY_STATE.md` 的 `current_phase` / `current_command`。

## 参数契约

```text
/delivery:bits --init [--dry-run]
/delivery:bits --init --execute
/delivery:bits --cr [MR链接或编号]
/delivery:bits --cr [MR链接或编号] --dry-run
/delivery:bits --cr [MR链接或编号] --submit
/delivery:bits --coverage [--rounds 3] [--threshold 90]
/delivery:bits --coverage [--rounds 3] [--threshold 90] --dry-run
/delivery:bits --coverage [--rounds 3] [--threshold 90] --submit
```

参数规则：

- `--init`、`--cr`、`--coverage` 三者互斥；缺少模式参数时必须暂停询问。
- `--dry-run` 与 `--execute`、`--submit` 互斥。
- `--execute` 仅适用于 `--init`，表示在 dry-run 成功且字段完整后真实创建 BITS 任务。
- `--submit` 适用于 `--cr` 和 `--coverage`；对 `--cr` 表示在本地修复和验证通过后必须 commit、push，并在提交代码后关闭 / resolve 已逐条 reply 的对应评审线程；reply 与 resolve 必须分开，禁止跳过 reply 直接 resolve，也禁止用一个总回复替代所有问题的逐条回复；对 `--coverage` 表示允许发布覆盖率评审表达。
- `--cr` 的 MR 参数可省略，但必须能从 `bits-task-info.json`、`.trae/DELIVERY_STATE.md`、当前分支或 Codebase 信息中唯一解析；否则必须暂停询问。
- `--cr` 未传 `--submit` 时，默认仍要对每个纳入处理的当前 CR thread 独立 reply，用于人工审核；允许本地修复、验证、产物记录和逐 thread reply，但不得提交、推送、resolve / 关闭线程或发布 MR 总结。
- `--cr --dry-run` 只允许拉取 / 解析评论、合并问题池、生成决策草案和风险清单；不得修改业务代码、提交、推送或回写。
- `--coverage` 默认 `--rounds 3`、`--threshold 90`；覆盖率报告、轮次日志和闭环状态都输出到当前 artifacts workspace 的 `bits-flow/coverage/<cov-run-id>/`。
- `--coverage --dry-run` 只允许拉取覆盖率、选择候选文件、生成分析和覆盖方案草案；不得修改业务代码，不得执行真实 UI 写操作，不得提交或回写。
- `--coverage` 未传 `--submit` 时，可以完成本地代码优化、真实线上 UI 覆盖、刷新覆盖率和产物记录；三轮结束后若存在代码修改，只能生成待提交说明和评审表达草案，不得 commit、push 或发布远端评论。
- `--coverage` 的候选过滤、跨 run 排除和轮次状态以覆盖率脚本、`coverage-exclusion-log.template.json` 和 `coverage-optimization-state.template.json` 为准；脚本默认只拉取未满 100%、`insertLines > 0` 且非 BAM 文件的明细，并为逐文件明细输出 `fileCoverageVersion` 供全局排除日志判断版本是否变化。

## 必读前置

任一模式开始前必须读取：

1. `.trae/AGENTS.md`
2. `.trae/PROJECT_CONTEXT.md`
3. `.trae/DELIVERY_STATE.md`
4. `.trae/skills/bits-dev-flow/SKILL.md`
5. 可用的 `bytedance-bits` 或 `bytedcli` 相关使用说明

`--cr` 还必须读取：

1. `.trae/skills/receiving-code-review/SKILL.md`
2. `.trae/skills/verification-before-completion/SKILL.md`
3. 当前 workspace 中的需求、计划、任务、测试和实现产物，用于把评审问题映射到当前需求范围
4. `.trae/skills/bits-code-guard/SKILL.md`，仅当该文件存在且当前输入或 artifacts 中包含 CodeGuard 报告

如果 CodeGuard 报告存在但 `.trae/skills/bits-code-guard/SKILL.md` 不存在，不得因此恢复或重建被删除的 skill；必须把报告作为普通外部评审来源纳入问题池，并在 `sources` 中记录 `CODE_GUARD_SKILL_UNAVAILABLE`。

`--coverage` 还必须读取：

1. 覆盖率拉取脚本，优先使用 `.trae/skills/bits-dev-flow/scripts/collect-huatuo-branch-coverage.js`；若用户显式传入脚本路径，则以用户参数为准。
2. 当前 workspace 中的 `03-prd-analysis.md`、`delivery-task.md`、`09-test-case-matrix.md`、`05-implementation-log.md`、`10-user-test-report.md`，用于把未覆盖行映射到原子需求和测试用例。
3. 当前覆盖率报告目录 `<workspace>/bits-flow/coverage/<cov-run-id>/coverage/` 中的 `latest.json`、`report.md`、`uncovered-list.json` 和目标文件 `report.md`；若不存在，先通过脚本生成。
4. 与真实线上 UI 覆盖、请求入参来源、写接口浏览器拦截和 BAM MOCK 已有入参相关的规则或证据；覆盖率优化必须由真实线上 UI 发起。读接口和无副作用接口必须保持真实请求；会落库、发奖、删除、修改配置、发送通知或产生其他线上副作用的写接口，必须在内置浏览器会话内拦截请求并返回 mock 响应，禁止真实命中后端。

## 任务空间解析

按以下优先级解析当前 artifacts workspace：

1. `.trae/DELIVERY_STATE.md` 的 `Current Task.workspace`
2. 用户参数中显式给出的 workspace
3. `.trae/artifacts/` 下与当前 task id / task name 唯一匹配的目录
4. `artifacts/` 下与当前 task id / task name 唯一匹配的目录

解析结果必须归一化为可访问路径。若无法唯一确定 workspace，必须暂停并要求用户提供任务空间路径。

所有 `/delivery:bits` 产物写入：

```text
<workspace>/bits-flow/
```

`bits-flow/` 根目录只放跨轮次索引、`bits-task-info.*` 和最新轮次指针；`--cr` 与 `--coverage` 的轮次产物必须写入独立子目录：

```text
<workspace>/bits-flow/
  bits-task-info.md
  bits-task-info.json
  current-cr
  current-coverage
  cr/<cr-run-id>/
  coverage/coverage-exclusion-log.json
  coverage/<cov-run-id>/
    coverage/
```

`<cr-run-id>` 使用 `YYYYMMDD-HHMMSS-mr-<iid>-v<version>`；无法读取 MR version 时使用 `YYYYMMDD-HHMMSS-mr-<iid>-commit-<shortsha>`。`<cov-run-id>` 使用 `YYYYMMDD-HHMMSS-coverage-<branch-or-mr>`。

不得把唯一有效结论写入聊天上下文、临时文件或其他目录。

`--coverage` 的 Huatuo 覆盖率原始产物写入：

```text
<workspace>/bits-flow/coverage/<cov-run-id>/coverage/
```

该目录由覆盖率脚本重建或替换，必须包含最新的 `latest.json`、`report.md`、`uncovered-list.json`、`uncovered-list.md` 和所有未满 100% 且 `insertLines > 0` 文件的明细报告。不得把本轮唯一有效 `results/` 写入共享 `<workspace>/coverage/`。

## `--init` 编排

目标：创建或复用 BITS 开发任务，并把可追溯的任务信息写入 `bits-flow/`。

执行步骤：

1. 解析事实来源：
   - 目标 repo、执行 repo root、当前分支、remote、已有 MR
   - Meego 工作项 ID / 链接、需求标题、当前 workspace
   - BITS `space_id`、`lane`、`from_dev_id`、service / change 信息
   - PPE / 环境信息；缺失时随机生成 PPE，并默认令 BITS `lane` 与 PPE 相同
2. 校验必填字段：
   - `title`
   - `space_id`，除非 `from_dev_id` 能完整继承；缺失时默认 `139033499138`
   - `lane`；缺失时默认等于 PPE 环境
   - `scm_branch`
   - `meego`
   - `change` 或 `services`
3. 字段完整且无冲突时，按 `bytedcli` 的 BITS 创建研发任务规范生成 `bytedcli bits develop create` 命令；`service` 默认使用 BITS 主 SCM / project unique id `ecom/alliance_operation_mono/mono`，其关联 Codebase 仓库路径为 `ecom/alliance-operation-mono`，分支使用当前仓库分支。
4. 默认执行 dry-run；若远程分支不存在，只记录 `git push -u origin <branch>` 待执行命令，不真实推送。
5. 只有用户传入 `--execute` 且 dry-run 成功时，才执行真实创建；若远程分支不存在，必须先推送当前分支成功，再创建 BITS 任务。
6. 字段缺失、字段冲突或 CLI 不可用时：
   - 写入 `bits-flow/bits-task-info.json`，`status = "BLOCKED"`
   - 记录缺失字段、候选来源、冲突原因和最小用户输入
   - 暂停，不运行真实创建命令
7. 成功创建、复用或 dry-run 后，写入：
   - `bits-flow/bits-task-info.md`
   - `bits-flow/bits-task-info.json`

## `--cr` 编排

目标：合并 Codebase Assistant / Aime 与当前 CodeGuard 报告，按当前需求范围选择性修复，并记录问题、决策、代码修改、验证和 MR 回写闭环。

执行步骤：

1. 解析目标 MR：
   - 优先使用用户参数中的 MR 链接或编号。
   - 其次读取 `bits-flow/bits-task-info.json`、`.trae/DELIVERY_STATE.md`、当前分支、当前仓库 remote 和 Codebase 信息。
   - 无法唯一确定 MR 或 repo 时暂停提问。
2. 获取评审来源：
   - 使用 bytedcli / Codebase 能力读取完整评论线程、检查信息和线程状态。
   - 保留 `open`、`resolved`、`outdated` 状态，作为是否需要修复或回写的证据。
   - 如果 artifacts 中存在 `bits-code-guard*/report.md`，读取并纳入同一问题池。
   - 创建本轮 `bits-flow/cr/<cr-run-id>/`，并把原始远端快照写入 `sources/`。
3. 写入 `bits-flow/cr/<cr-run-id>/round-meta.json`：
   - 记录 repo、branch、MR iid、MR version / source commit、base commit、用户参数、命令证据、创建时间和状态。
   - 记录 `sources/`、`analysis/`、`closure/`、`writeback/`、`snapshots/` 的相对路径。
4. 归一化和合并问题：
   - 以稳定 issue id 记录每条原始 claim。
   - 同一文件、同一行为、同一根因的问题必须合并为同一修复任务。
   - 不同根因即使落在同一文件，也必须拆成不同 issue。
   - 合并后的 issue 必须保留全部 `source_refs`，不得丢失原始线程或报告位置。
5. 写入 `bits-flow/cr/<cr-run-id>/analysis/codebase-assistant-issue-list.md`：
   - MR、commit / version、拉取时间、拉取命令
   - 线程和报告来源
   - 原始 claim、文件 / 行号 / 线程引用、状态
   - 初步分类和合并关系
6. 写入并维护 `bits-flow/cr/<cr-run-id>/analysis/codebase-assistant-fix-tasks.md`：
   - 每个 issue 必须有任务行。
   - 每个任务必须记录处理决策、需求映射、原因、状态、解决方案和解决结果。
7. 写入并维护 `bits-flow/cr/<cr-run-id>/closure/cr-modification-closure.json`：
   - 每个 issue 都必须有审核记录。
   - 每个 `ACCEPT` / `PARTIAL` issue 在代码编辑前必须完成 scope audit 和 change audit。
   - 每个 `ACCEPT` / `PARTIAL` issue 必须证明问题在当前需求链路中可达；链路不通、被外层组件拦截、当前交互无法进入的代码问题不得处理。
   - 每个被接受的代码修改都必须记录 changed files、verification 和 writeback 状态。
   - 每个未采纳 issue 必须记录拒绝原因，不得沉默跳过。
8. 选择性修复：
   - 不默认认为任何评审问题都是正确的。
   - 每个问题都必须对照当前需求、原子需求、实现代码和测试用例核实。
   - 链路不通、无法通过当前业务入口到达、或会被外层组件 / 前置校验 / 权限 / 状态机拦截而无法进入的代码问题，必须标记为 `REJECT` 或 `ALREADY_FIXED`，并记录可达性证据；不得为不可达代码补防护。
   - 不处理不在本次需求修改范围且影响程度不高的问题。
   - 不采纳会破坏、稀释或改变本次需求功能实现的建议。
   - 不实现对本需求没有实质风险收益的过度防护；安全防护、兜底、抛异常、try/catch、空值保护、监控 / 日志 / 异常上报等建议必须保持最小必要范围，禁止引入宽泛兜底或改变正常业务语义。
   - 需求未提及且无法证明当前需求链路存在可达、确定性风险的安全防护建议，必须标记为 `OVER_DEFENSIVE` 并 `REJECT`；不得以“更安全”“更健壮”“便于排障”为理由新增需求外安全校验、失败埋点、异常上报、数据清洗或兜底分支。
   - 代码修改必须遵循最小改动原则，只改关闭当前 issue 所需的最少文件、最少分支和最少逻辑。
   - 修改后的代码必须符合当前仓库代码规范，沿用既有风格、类型约定、错误处理方式、格式化规则和命名规范，不得引入 debug 代码、临时日志或无关重构。
9. 实现和验证：
   - 只修改审核通过的问题对应文件。
   - 每完成一个 issue，立即更新 fix-tasks 和 closure JSON。
   - 运行聚焦验证、空白检查、必要 lint / typecheck，并记录代码规范检查结果。
   - full typecheck / build 因无关文件失败时，必须保留全量失败摘要，并提供本次修改路径过滤结果。
10. 提交、reply 和 resolve：
   - 非 `--dry-run` 的 `--cr` 默认必须为每个纳入处理的当前 CR thread 生成并写入独立 reply，用于人工审核；MR 总结不能替代逐 thread reply。
   - 未传 `--submit` 时，只完成本地修复、验证、产物记录和逐 thread reply；不得 commit、push、resolve / 关闭线程或发布 MR 总结。
   - 只有用户传 `--submit` 或明确要求提交时，才允许 commit、push；push 成功后，才允许对已成功 reply 的对应 thread 执行 resolve / 关闭线程并发布 MR 总结。
   - 回复正文写入 `bits-flow/cr/<cr-run-id>/writeback/replies/`。
   - MR 总结正文写入 `bits-flow/cr/<cr-run-id>/writeback/submit-mr-summary.md`。
   - push / 回写后重新拉取的远端快照写入 `bits-flow/cr/<cr-run-id>/snapshots/after-submit/`。
   - 回写明细写入 `bits-flow/cr/<cr-run-id>/writeback/review-writeback.md`。
   - 更新 `bits-flow/current-cr` 指向本轮目录。

## `--coverage` 编排

目标：通过 Huatuo 最新分支覆盖率报告判断整体覆盖率是否达到阈值；未达到时，最多三轮选择未覆盖行数最大的有效文件进行代码优化和真实线上 UI 覆盖，刷新报告并形成可审计闭环。

执行步骤：

1. 解析覆盖率上下文：
   - 从 `.trae/DELIVERY_STATE.md` 解析当前 workspace、执行仓库、分支、base 分支和目标 repo。
   - 解析覆盖率脚本路径，优先使用 `.trae/skills/bits-dev-flow/scripts/collect-huatuo-branch-coverage.js`；脚本必须支持默认过滤并输出 `latest.json`、`report.md`、`uncovered-list.*` 和逐文件明细。
   - 解析阈值，默认 `90`；解析轮次数，默认 `3`。
   - 创建本轮 `bits-flow/coverage/<cov-run-id>/`，并写入 `round-meta.json`。
   - 创建或读取 `<workspace>/bits-flow/coverage/coverage-exclusion-log.json`，并基于 `coverage-optimization-state.template.json` 初始化本轮 state；字段结构和执行策略不在 command 中重复展开。
2. 拉取最新覆盖率：
   - 使用覆盖率脚本触发 Huatuo 分支更新，并拉取 `branch/files` 与所有有效未满 100% 文件的 `branch/code`。
   - 输出目录固定为 `<workspace>/bits-flow/coverage/<cov-run-id>/coverage/`。
3. 判断整体覆盖率：
   - 优先从 `latest.json.updateApi.coverRatio` 或 Huatuo 更新接口返回的整体 `coverRatio` 读取。
   - 若整体覆盖率 `>= threshold`，基于 `coverage-optimization-state.template.json` 写入 `bits-flow/coverage/<cov-run-id>/coverage-optimization-state.json`，并写入 `bits-flow/coverage/<cov-run-id>/coverage-optimization-log.md` 后结束。
   - 若无法从报告中读取整体覆盖率，必须暂停并记录 blocker，不得用单文件覆盖率冒充整体覆盖率。
4. 选择本轮目标文件：
   - 从脚本生成的 `uncovered-list.json` 中选择 `effectiveUncoveredInsertedRows` 最大且未被 state / 全局排除日志拦截的文件。
   - 全局排除日志记录被作为目标文件处理过的文件及当时 `fileCoverageVersion`。
   - 全局排除日志中的 `ACTIVE` 记录只有在排除项 `source_file_coverage_version` 与当前候选 `fileCoverageVersion` 一致时才拦截；同版本目标文件不得重新执行该文件的覆盖率优化 / UI 覆盖 / 刷新闭环。版本变化时必须把旧排除项标记为 `SUPERSEDED`，本轮 state 记录 `VERSION_CHANGED_ALLOW`，并允许该文件重新进入候选。旧日志缺少 `source_file_coverage_version` 时，不得继续作为 ACTIVE_SKIP 的依据，需在本轮 state 记录 `NO_VERSION_RECORDED`，supersede 旧记录并重新处理。
   - 每轮只处理一个目标文件；选择依据、同轮去重、跨 run 排除、文件覆盖率版本比较和目标文件版本登记必须写入 `coverage-optimization-state.json` 与 `coverage-exclusion-log.json`。
   - 若候选为空，写入 blocker 并暂停。
5. 分析未覆盖行并整理覆盖率方案：
   - 读取目标文件明细 `report.md`、`uncovered-inserted-lines.json`、源码、原子需求、test case 和已有用户测试证据。
   - 基于 `coverage-optimization-plan-round.template.md` 生成 `bits-flow/coverage/<cov-run-id>/coverage-optimization-plan-round-<n>.md`，写入未覆盖行分类、可达性判断、代码优化方案和覆盖方案。
   - 代码优化第一步必须遵守：
     - 链路不通、无法到达、被外层组件拦截而无法进入的代码直接删除或从当前需求改动中移除。
     - 过度安全防护、抛异常、宽泛 try/catch、无收益兜底尽可能精简。
     - 可合并的重复逻辑、链式逻辑应合并，但不得改变业务语义。
     - 优化代码必须符合当前仓库代码规范。
     - 与本需求功能无关的新增代码必须删除。
   - 覆盖方案第二步必须结合 test case 和原子需求设计内置浏览器页面操作，并确保覆盖动作由真实线上 UI 发起。读接口和无副作用接口必须真实命中线上后端；会落库、发奖、删除、修改配置、发送通知或产生其他线上副作用的写接口，必须在内置浏览器会话内拦截并返回 mock 响应，不得真实命中后端。请求入参优先从真实页面、真实接口返回或真实业务数据取得；缺少字段时，可以参考 BAM MOCK 已有入参。BAM MOCK 入参只作为字段来源，不得接管请求、替换响应或替代真实 UI 覆盖；写接口 mock 响应必须来自内置浏览器拦截规则。
6. 执行本轮优化：
   - 先完成代码优化，再执行真实线上环境 UI 覆盖。
   - 必须使用真实线上环境，禁止本地会话、`localhost` 调试入口或只在本地预览中制造覆盖率。
   - 允许由真实线上 UI 触发写接口发送动作，但必须在内置浏览器内拦截该请求并返回 mock 响应；拦截必须发生在请求到达后端前，且记录 endpoint、method、匹配条件、mock response、UI 后续状态、截图 / DOM 证据和“未真实命中后端”的证据。
   - 不得因为未覆盖行需要写接口就停止 UI 覆盖尝试；只有内置浏览器无法稳定拦截、无法证明未触达后端，或缺少可构造的安全入参时，才允许记录 blocker。
7. 刷新覆盖率并进入下一轮：
   - 每轮结束后重新执行覆盖率脚本，刷新 `<workspace>/bits-flow/coverage/<cov-run-id>/coverage/`。
   - 基于 `coverage-optimization-state.template.json` 更新本轮状态，记录目标文件处理结果、覆盖率刷新、验证和全局排除审核。
   - 如果整体覆盖率达到阈值，立即停止后续轮次。
   - 如果未达到阈值且轮次未满，基于刷新后的最新报告继续选择最大未覆盖文件；跨 run 是否排除同时看全局排除日志中的 ACTIVE 记录和文件覆盖率版本，版本变化不得继续拦截。
8. 三轮结束后的提交和评审表达：
   - 若三轮结束后存在代码优化，必须生成 `bits-flow/coverage/<cov-run-id>/coverage-review-expression.md`，说明覆盖率起止值、优化文件、删除 / 精简 / 合并点、线上 UI 覆盖证据、刷新报告和残余风险。
   - 更新 `bits-flow/current-coverage` 指向本轮目录。
   - 传入 `--submit` 时，完成必要验证后允许 commit、push 和发布评审表达。
   - 未传 `--submit` 时，只输出待提交命令和评审表达草案，不得真实 commit、push 或远端回写。

## 必需 JSON 闭环

`bits-flow/cr/<cr-run-id>/closure/cr-modification-closure.json` 是 `--cr` 的强制闭环事实源，必须基于 `cr-modification-closure.template.json` 初始化并填充真实证据。

缺少该 JSON、JSON 不可解析、或存在 issue 未记录决策 / 审核 / 实现 / 验证 / 回写状态时，不得声明 `--cr` 完成。

`bits-flow/coverage/<cov-run-id>/coverage-optimization-state.json` 是 `--coverage` 的强制闭环事实源，必须基于 `coverage-optimization-state.template.json` 初始化并填充真实证据。

`bits-flow/coverage/coverage-exclusion-log.json` 是跨 run 目标文件版本登记与候选跳过事实源。缺少该日志、日志不可解析、或存在本轮目标文件未写入日志并记录当前 `fileCoverageVersion` 时，不得声明 `--coverage` 完成。

缺少 state JSON、state JSON 不可解析、或存在优化轮次未记录目标文件 / 验证 / 刷新结果 / 全局排除审核结果时，不得声明 `--coverage` 完成。

## 暂停规则

以下情况必须暂停：

- 无法唯一确定 workspace、repo、branch、MR 或 Meego。
- `--init` 缺少创建 BITS 开发任务的必填字段，且该字段没有本 skill 明确默认值。
- `--init --execute` 需要先推送当前分支但用户未授权推送，或推送失败。
- `--cr` 的 review issue 无法映射到当前需求范围，且继续会导致猜测式修复。
- `--coverage` 无法唯一确定覆盖率脚本、执行仓库、Huatuo 分支参数或整体覆盖率字段。
- `--coverage` 未达标但候选文件只剩 BAM 文件、范围外文件，或只剩全局排除日志中仍为 ACTIVE 的文件。
- 评审建议与当前需求口径冲突，但缺少用户确认或需求证据。
- 需要提交、推送、真实创建 BITS 任务、resolve / 关闭线程或发布 MR 总结，但用户未传 `--execute` / `--submit`，也没有明确授权。
- CLI 需要登录、权限或网络访问，且当前环境无法完成。

暂停输出必须包含：已确认信息、缺失字段、阻塞原因、建议用户回答格式、恢复命令。

## 输出契约

最终只输出：

1. 执行模式：`--init`、`--cr` 或 `--coverage`。
2. 产物路径。
3. 创建 / dry-run / 修复 / 覆盖率优化 / 提交 / 回写状态。
4. `--cr` 的选择性修复统计：接受、部分接受、拒绝、已修复、阻塞数量；或 `--coverage` 的整体覆盖率、阈值、轮次、优化文件、剩余 blocker。
5. 验证命令和结果。
6. 阻塞项和恢复命令，如有。
