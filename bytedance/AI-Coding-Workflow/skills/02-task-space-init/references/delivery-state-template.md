# Delivery State

> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。
> 本文件是当前需求交付状态机。每个阶段开始前必须读取；每个阶段完成、阻塞或恢复时必须更新。

## Current Task

- task_id：`TBD`
- task_name：`TBD`
- workspace：`TBD`
- current_phase：init
- current_command：`/delivery:init`
- branch：`master`
- owner：`assistant`
- target_repo：`TBD`
- created_at：`TBD`
- updated_at：`TBD`

## Inputs

- PRD：`TBD`
- task_space / Meego：`TBD`
- design / Figma / whiteboard：`TBD`
- backend tech doc：`TBD`
- API doc：`TBD`
- chat / comments：`TBD`
- related MR / commit：`TBD`

## Constraints

- 禁止修改业务代码：否，待具体任务阶段决定。
- 数据接口合同缺失不得单独作为阻塞 `/delivery:plan` 的 P0。
- 必须对齐设计稿：待任务确认。
- 必须保留 `.trae` Git 信息：是。

## Current Conclusions

- 需求摘要：`TBD`
- 初始目标页面/模块：`TBD`
- 初始目标仓库：`TBD`
- 当前动作：等待执行 `/delivery:init` 填充任务上下文。

## Stage Result

- result：`NOT_STARTED`
- readiness：`TEMPLATE_ONLY`
- p0_blockers：`none`
- closed_blockers：`none`
- p1_plan_constraints：`none`
- required_plan_gate：`TBD`
- next_command：`/delivery:init`

### Rewind Snapshot

- snapshot_root：`none`
- full_workspace_snapshot：`none`
- stale_artifacts：`none`
- state_backup：`none`

## Pause State

- is_paused：false
- paused_phase：`none`
- paused_reason：`none`
- waiting_for_user：`无`
- resume_command：`/delivery:init`
- last_question_to_user：`无`

## Phase Status

| 阶段 | 命令 | 状态 | 产物 | Gate |
|---|---|---|---|---|
| 需求入口整理 | /delivery:init | TEMPLATE_ONLY | 00-inputs.md, 01-intake.md | 初始化后可进入 /delivery:prd |
| 任务空间初始化 | /delivery:init | TEMPLATE_ONLY | 02-task-space.md | 初始化后可进入 /delivery:prd |
| PRD 解析 | /delivery:prd | TEMPLATE_ONLY | 03-prd-analysis.md, ui-source-map.md, uncertainty-register.md, decision-log.md | 需先完成 init |
| 技术规划 | /delivery:plan | TEMPLATE_ONLY | 04-tech-plan.md | 需先通过 PRD Gate |
| 代码实现 | /delivery:code | TEMPLATE_ONLY | 05-implementation-log.md | 需先通过 Plan Gate |
| 调试验证 | /delivery:verify | TEMPLATE_ONLY | 06-debug-verification.md | 需先通过 Code Gate |
| 设计稿对齐 | /delivery:design | TEMPLATE_ONLY | 07-design-alignment.md | 需先通过 Verify Gate |
| 交付验收 | /delivery:accept | TEMPLATE_ONLY | 08-acceptance-report.md | 需先通过 Design Gate |

## Resume Rule

当 `Pause State.is_paused = true` 时：

1. 不得进入新的阶段。
2. 必须先回答 `waiting_for_user` 中的问题。
3. 用户回答后，先更新 `decision-log.md` / `uncertainty-register.md`。
4. 再执行 `resume_command`。
