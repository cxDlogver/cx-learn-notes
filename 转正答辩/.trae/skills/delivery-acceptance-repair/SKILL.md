---
name: delivery-acceptance-repair
description: Diagnose acceptance, self-test, UAT, or review feedback from a Feishu document or sheet, snapshot the active delivery workspace before mutation, and replay affected delivery stages in place while updating tasks and test cases. Use for `/delivery:repair`, repair resume, and repair rollback.
---

# Delivery Acceptance Repair

## Purpose And Authority

把 repair 作为现行 delivery workflow 的返修编排器，不复制或替代普通阶段规范。

- 本 skill 负责：快照 Gate、问题归因、最早 replay 起点、原位修正约束、跨阶段追踪、Repair State、resume/rollback、repair-result、飞书回写和 completion commit 闭环。
- 普通阶段负责：自己的输入、执行步骤、agent 边界、产物结构、Gate 和 detour。每次 replay 必须读取 `rerun-plan.json` 声明的当前 command/skill/agent。
- 发生冲突时，`.trae/AGENTS.md` 的全局硬约束和当前普通阶段规范优先；repair 只增加更严格的快照、原位修正、Task/Test Case 更新和问题闭环要求。
- 机器字段和产物骨架以同目录 `repair-plan-template.md` 为准。

## Inputs And Paths

- 一个飞书 docx、wiki 或 sheet 验收问题链接。
- `.trae/DELIVERY_STATE.md`、`.trae/PROJECT_CONTEXT.md`、当前 `artifacts/<task>/` workspace。
- 当前 workspace 已有阶段产物、执行仓库代码与 Git 状态。
- 可选强制起点 `init|prd|plan|task|code`、`--mock-preview`、`--dry-run`。

路径固定为：

```text
artifacts/repair/<workspace-name>/<run-id>/
artifacts/repair/_snapshots/<workspace-name>/<run-id>/
```

不得创建根级 `artifact/`、全局 self-test 根目录、平行业务 workspace 或 repair archive。`artifacts/repair/` 是唯一 repair 管理根，按 `<workspace-name>/<run-id>` 管理 run，并在 `_snapshots/<workspace-name>/<run-id>` 管理所有 repair snapshot；repair run 和 snapshot 均不得放回 active workspace，因此不会随 `full-workspace/` 基线被快照。同一 canonical 飞书来源身份只复用全局 repair 根下的既有 run/snapshot；只有未命中同源 run 时才创建新 run。active workspace 内历史遗留的 `repair/` 只作为 legacy 产物，不能作为 `REUSE_REPAIR_RUN`、resume 或 rollback 目标，且必须被 snapshot 排除。`--resume` 和 `--rollback` 始终复用指定 run 的原 snapshot。

## Phase 1: Resolve Source Identity And Snapshot Before Mutation

1. 先只读解析飞书来源身份：docx/sheet 使用真实 token；wiki 先解析实际对象。身份键固定为 canonical `source_type + source_token`，不得使用原始 URL、标题、slug 或 URL 参数。
2. 调用 `scripts/resolve-repair-run.mjs` 扫描 `artifacts/repair/<workspace-name>/*/source-manifest.json`：
   - 无匹配：返回 `NEW_REPAIR_RUN`。
   - 唯一匹配且 snapshot READY：返回 `REUSE_REPAIR_RUN`、run dir 和 snapshot；不得创建新快照。
   - 匹配存在但 snapshot 不完整，或多个匹配：P0 暂停，不得选择“最新一个”或创建平行 run；要求显式 `--resume <run-id>` 消歧/恢复。
3. 身份解析与 run 查找必须全程只读，不得下载正文/媒体或写缓存。`--dry-run` 到此为止并输出判定。
4. 仅对 `NEW_REPAIR_RUN` 调用 `scripts/create-repair-snapshot.sh`；这是本轮第一个写操作。对 `REUSE_REPAIR_RUN` 先重新验证已有 snapshot inventory，随后直接使用既有 run。
5. 新 snapshot manifest 同时记录：
   - active workspace 的完整 `full-workspace/` 副本与 SHA-256 inventory，但必须排除 active workspace 根下的 legacy `repair/`；
   - `DELIVERY_STATE.before-repair.md`；
   - execution repo 的 root、branch、HEAD、status、staged diff、working diff、untracked inventory 与文件副本；
   - `status=READY`、run id、workspace 和创建时间。
6. 快照脚本不得移动或清空 active workspace，不得改状态或业务仓库。失败时保留现状并停止。
7. 新 snapshot READY 后才创建 repair run，并首先写入 `snapshot-ref.json`。任何问题源缓存或分析产物时间不得早于 snapshot；复用 run 的刷新时间必须晚于原 snapshot。

## Phase 2: Refresh And Analyze The Issue Source

### Refresh complete evidence

- docx/wiki 按 `feishu-doc-extractor` 完整 Extractor Gate；sheet 完整读取全部工作表、已用范围、分页数据和图片单元格。
- transport 优先 MCP，能力不足时回退 `feishu-lark` CLI；选定后本轮保持一致。
- 逐项读取图片、截图、白板、节点和视觉附件实际内容；链接、token、文件名或 alt 文本不算完成分析。
- 无论新建还是复用 run，每次都必须重新读取完整正文、sheet 分块和视觉证据；不得复用上次正文、图片分析或变化结论代替刷新。
- `source-manifest.json` 记录 canonical identity、snapshot decision 和刷新差异，并保证 `extracted_at >= snapshot.created_at`：
  - `identity_resolution.checked=true`
  - `identity_resolution.key=<source_type>:<source_token>`
  - `identity_resolution.snapshot_decision=CREATED|REUSED`
  - `identity_resolution.matched_run_id=null|<run-id>`
  - `refresh.checked=true`、previous/current `extracted_at`、`content_changed`、comparison basis 与 change summary
- 任一视觉证据 `BLOCKED` 或源不完整时停止。

### Diagnose every accepted issue

比较方向固定为：

```text
current issue contract -> current PRD/plan/task/test/code/verify/design
```

每个 issue 必须包含稳定源定位、事实、未知项、根因阶段、当前偏差、受影响原位置、实现/Mock/BAM 影响和最早 replay 阶段。分析状态只允许：

- `CONFIRMED`：证据足以确认偏差和修改落点。
- `TARGETED_ANALYSIS`：足以选择最早阶段，具体代码定位留给对应阶段。
- `UNRESOLVED`：无法可靠选择阶段；作为 P0 暂停，不进入 replay。

要求每个进入 replay 的 issue：

- 至少一个 `ADD|UPDATE|DELETE` planned change，禁止 `NO_CHANGE`。
- `affected_artifacts` 至少包含 `delivery-task.md` 与 `09-test-case-matrix.md`。
- `task_change=true`、`test_case_change=true`。
- planned changes 至少各有一个 `target_type=TASK` 和 `target_type=TEST_CASE`。
- 用 Requirement Alignment Matrix 记录 `MISSING->ADD`、`EXTRA->REMOVE`、`INCORRECT->CORRECT`；`PRESERVE` 只能来自当前问题证据。

API method/path、字段、generated type、wrapper 或 response shape 变化必须设置 `bam_update_required=true` 并提供 `bam_impact_refs`；该 issue 的 replay 起点不得晚于 plan。

## Phase 3: Analysis Gate

在修改 active workspace、状态或代码前运行：

```bash
node .trae/skills/delivery-acceptance-repair/scripts/validate-repair-artifacts.mjs \
  <repair-run-dir> --stage analysis
```

最小 PASS 条件：

- canonical source identity 已解析且唯一；snapshot decision 与解析器结果一致。
- snapshot READY、路径无符号链接逃逸、source refresh 发生在 snapshot 之后；`REUSED` 必须指向当前同一 run，`CREATED` 必须没有 matched run。
- issue/requirement/target ID 唯一，P0/UNRESOLVED 为零。
- 每个 issue 有实际偏差、Task change、Test Case change、正反断言和可执行证据要求。
- `selected_start` 不晚于任何 issue 的 `rerun_from`，且永远不晚于 task。
- stage list 连续，command/skill/agent 与当前规范映射一致；BAM 需要更新时位于 plan 前。
- repair plan、log、closure 已初始化，但不得预先宣称 task、case、code、design 或 repair-result PASS。

Gate 失败时不得修改 active workspace、`DELIVERY_STATE.md` 或业务代码。

## Phase 4: Replay Through Current Stage Contracts

### Stage mapping

| stage | canonical command / skill | owner / agent |
|---|---|---|
| init | `/delivery:init` 与当前 init skills | main Agent |
| prd | `/delivery:prd` + `03-prd-analysis` | `prd-analyzer`，主 Agent Gate Review |
| bam | `/delivery:bam` + 当前 BAM 规范 | main Agent |
| plan | `/delivery:plan` + `04-tech-planning` | `tech-planner`，主 Agent Gate Review |
| task | `/delivery:task` + `09-task-planning` + `10-test-case-planning` | `task-planner`，主 Agent Gate Review |
| code | `/delivery:code` + `05-code-implementation` | `code-writer`，另做现行独立只读审查 |
| verify | `/delivery:verify` + `06-debug-verification` | 主 Agent拥有 case；`runtime-runner` 仅可选机械辅助 |
| design | `/delivery:design` + `07-design-alignment` | `design-checker`；修复仍派 `code-writer` |

### Sequence

- `PRD_CONFLICT|PRD_MISSING`：`prd -> [bam] -> plan -> task -> code -> verify -> design`，随后执行 repair-result 闭环。
- `PLAN_GAP|DESIGN_GAP`：`[bam] -> plan -> task -> code -> verify -> design`，随后执行 repair-result 闭环。
- `TASK_GAP|TEST_CASE_GAP|MOCK_RULE_GAP|CODE_ISSUE|VERIFY_MISSING|ENV_OR_DATA`：`task -> code -> verify -> design`，随后执行 repair-result 闭环。
- `--code` 必须规范化为 `task`；`--init|--prd|--plan` 可把起点提前。
- 若阶段 Gate 发现更早事实缺口，按当前阶段的标准 recovery route 回退并把该阶段插入 repair sequence；不得让 task/test 自行改写冲突的 plan 事实。

### In-place correction

- 只在已有产物的原章节、表、task、case、结论或代码位置修正；同一语义保持稳定 ID。
- 保留不受影响内容；不得整体清空、从模板重建或覆盖整份阶段产物。
- 禁止 Repair Addendum、Override、平行 requirement/task/case 表或只写 repair log 不改源产物。
- 每个阶段记录 before/after、原位置、issue/requirement/target、实际 diff、证据和主 Agent Gate。

### Mandatory Task and Test Case repair

Task stage 对每个 issue 都必须：

1. 在现有 `delivery-task.md` 更新受影响 task，或新增独立 target-specific repair task。
2. 将受影响的已完成 step 从 `[x]` 恢复为 `[ ]`；未受影响且证据仍有效的 step 保持原状。
3. 在现有 `09-test-case-matrix.md` 更新语义已变的 case，或新增独立 regression case。
4. 让每个 case 唯一绑定 requirement、target、task、`verification_stage`、正向/负向/视觉断言和 evidence；不得用聚合 case 替代独立 target。
5. 完成现行 Task Readiness、Executable Task Check、Task Coverage Audit、Plan Drift Audit 和 Test Case Coverage Audit。

Task Gate 通过前不得进入 code。Code Gate 通过后才由主 Agent重新勾选对应 step；后续实现再次变化时必须恢复 `[ ]`。

## Phase 5: Closure, Resume And Rollback

每阶段完成后先更新 `repair-log.md` 和 `repair-closure.json`，再运行 `--stage <stage>` validator。普通阶段 Gate 和 repair validator 必须同时 PASS；任一失败均记录 `current_repair_stage` 并以 `/delivery:repair --resume current` 暂停。Repair replay 到 `/delivery:design` 为止，不调用 `/delivery:accept`。

Design Gate PASS 后必须生成 `repair-result.md`，并反查：

```text
current issue evidence
  -> corrected source artifact
  -> checked target-specific task
  -> updated independent case
  -> code path/symbol when applicable
  -> terminal verify/design evidence
  -> repair-result.md source-matched 问题/调整/解决结果/验收步骤 row
  -> source Feishu writeback evidence
  -> completion commit
  -> target closure
```

`repair-result.md` 必须以本次问题来源文档/表格为基准，逐问题给出 `问题 | 调整 | 解决结果 | 验收步骤` 表格。`问题` 必须对应来源问题事实；`调整` 写原位修正动作；`解决结果` 写用户可理解的终态；`验收步骤` 只写接收人可直接手动复验的步骤过程，步骤正文必须写清验收入口业务页或链接、前置条件、每一步需要输入或 mock 返回的数据、具体交互动作、预期结果和验收点；不得只写本地文件路径、artifact/log 引用或一句笼统结论。表格外可补充修正位置、Task/Test Case、代码引用、verify/design 证据和剩余风险。

随后必须把解决结果写回本次问题来源链接对应的飞书文档/表格。写回到飞书的证据必须是截图或上述可执行手动验收步骤；不得只回写本地证据文件引用、`artifacts/**`、`verify-logs/**`、`*.md`/日志路径或本地代码路径。内部本地证据仍写入 `repair-result.md` 和 `repair-closure.json.repair_result`，但不能作为飞书回写证据的替代。

只有全部 target 为 `SATISFIED`、required task 已勾选、case 终态、输入 freshness 有效、飞书回写完成、execution repo 已提交且无阻塞证据缺口时才能 `PASS`。`PARTIAL|FAIL|NOT_SATISFIED`、回写失败或缺少 completion commit 均阻断 repair 完成。

- Resume：验证并复用原 snapshot，重新读取当前 stage 规范，从记录 stage 继续；不得创建新基线。
- Rollback：调用 `scripts/rollback-repair-snapshot.sh`；先创建 safety snapshot，再恢复 workspace/state/repo，且保留原 snapshot 与 repair run。

## Output Gate

最终报告 snapshot/run 路径、问题归因、实际修正的原位置、Task/Test Case 更新、执行阶段、普通阶段 Gate、repair Gate、`repair-result.md`、飞书回写状态、completion commit 和剩余风险。`mock-preview verified` 不得表述为真实联调完成。
