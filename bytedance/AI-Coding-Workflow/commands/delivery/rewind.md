---
description: 回退交付状态到指定阶段之前，快照当前产物并清理活跃 workspace，便于干净重放和流程回归
argument-hint: <prd|bam|plan|mock|task> 或 --to <prd|bam|plan|mock|task> [--dry-run]
---

请按 `.trae/AGENTS.md` 的 Phase Gate Rules 执行 `/delivery:rewind`。

用户输入：$ARGUMENTS

## Usage

```text
/delivery:rewind prd
/delivery:rewind bam
/delivery:rewind plan
/delivery:rewind mock
/delivery:rewind task
/delivery:rewind --to prd
/delivery:rewind --to bam
/delivery:rewind --to plan
/delivery:rewind --to mock
/delivery:rewind --to task
/delivery:rewind --to prd --dry-run
```

参数语义：

- `prd`：回退到 PRD 阶段之前，保留 pre-PRD 输入，下一步为 `/delivery:prd`。
- `bam`：回退到 BAM 阶段之前，保留 pre-PRD 输入和 PRD 阶段产物，清理旧 BAM 同步结果与后续阶段产物，下一步为 `/delivery:bam`。
- `plan`：回退到 Plan 阶段之前，保留 pre-PRD 输入和 PRD 阶段产物，下一步为 `/delivery:plan`。
- `mock`：回退到 Mock 阶段之前，保留 PRD / BAM / Plan 阶段产物，清理旧 `delivery-mock.md`、`mock/` 与后续阶段产物，下一步为 `/delivery:mock`。
- `task`：回退到 Task 阶段之前，保留 PRD / BAM / Plan 阶段产物，并在已有时保留 Mock 产物，清理旧 `delivery-task.md`、`09-test-case-matrix.md` 与后续阶段产物，下一步为 `/delivery:task`。

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- `.trae/commands/delivery/prd.md`
- 当目标阶段为 `bam` 时，还必须读取 `.trae/commands/delivery/bam.md`
- 当目标阶段为 `plan` 时，还必须读取 `.trae/commands/delivery/plan.md`
- 当目标阶段为 `mock` 时，还必须读取 `.trae/commands/delivery/mock.md`
- 当目标阶段为 `task` 时，还必须读取 `.trae/commands/delivery/task.md`
- `.trae/skills/delivery-stage-rewind/SKILL.md`
- `.trae/scripts/delivery_stage_rewind.sh`

必须确认：

- `.trae/.git` 存在，且不得删除或重建。
- `DELIVERY_STATE.md` 中的 `workspace` 存在。
- 当前 workspace 下存在 `prd-source.md` 和 `00-inputs.md`。
- 当目标阶段为 `bam`、`plan`、`mock` 或 `task` 时，当前 workspace 下还必须存在 PRD 阶段核心产物：`03-prd-analysis.md`、`uncertainty-register.md`、`ui-source-map.md`、`decision-log.md`。
- 当目标阶段为 `bam` 时，如当前 workspace 存在 `bam/` 目录中的 `bam-sync-report.md`、`bam-method-metadata.json` 等 BAM 阶段产物，脚本必须将其与后续阶段产物一起移入 snapshot 的 `stale-artifacts`，不得保留在活跃 workspace。
- 如果目标阶段为 `plan`，但当前 workspace 缺少 PRD 阶段核心产物，脚本必须从同 workspace 最近可用的 `artifacts/_rewind-snapshots/<workspace-name>/**/full-workspace` 或 `stale-artifacts` 中恢复 PRD 阶段产物；找不到可用 snapshot 时才失败。

## Execute

执行 `delivery-stage-rewind` skill。

调用脚本：

```bash
.trae/scripts/delivery_stage_rewind.sh $ARGUMENTS
```

如果用户未传参数，但上下文明确是要回退到 `/delivery:prd` 前，默认补全：

```bash
.trae/scripts/delivery_stage_rewind.sh --to prd
```

如果用户传入裸阶段名，必须原样传给脚本：

```bash
.trae/scripts/delivery_stage_rewind.sh plan
```

`plan` 目标的恢复规则：

- 先检查当前 workspace 是否已有 PRD 阶段核心产物。
- 若缺失，按 snapshot 时间倒序查找最近同时包含缺失核心产物的 `full-workspace` 或 `stale-artifacts`。
- 只恢复允许保留到 Plan 前的 PRD 阶段产物，不恢复旧 `04-tech-plan.md`、代码、验证或回归报告。
- `rewind-log.md` 必须记录 `recovered_from` 和恢复文件列表。

`mock` / `task` 目标的保留规则：

- `mock` 目标必须保留 `04-tech-plan.md`，并清理旧 `delivery-mock.md`、`mock/`、`delivery-task.md`、`09-test-case-matrix.md` 及后续阶段产物。
- `task` 目标必须保留 `04-tech-plan.md`，并在已有时保留 `delivery-mock.md` 与 `mock/`，清理旧 `delivery-task.md`、`09-test-case-matrix.md` 及后续阶段产物。

`bam` 目标的保留规则：

- 活跃 workspace 必须保留 pre-PRD 输入和 PRD 阶段核心产物，供 `/delivery:bam` 重新读取。
- 不得保留旧 `bam/` 目录中的 BAM 阶段产物、旧 `src/bam/**` 更新结果说明或任何 Plan/Code/Verify/Design/Accept 阶段产物。
- `rewind-log.md` 必须明确记录被保留的 PRD 阶段产物，以及被移入 `stale-artifacts` 的 BAM 及后续阶段文件摘要。

## Required Artifacts

脚本必须生成：

- `artifacts/_rewind-snapshots/<workspace-name>/<timestamp>-to-<target>/full-workspace/`
- `artifacts/_rewind-snapshots/<workspace-name>/<timestamp>-to-<target>/stale-artifacts/`
- 当前 workspace 下的 `rewind-log.md`

## Gate

如果脚本失败：

1. 不得继续执行 `/delivery:<target>`。
2. 输出失败原因。
3. 保留当前状态，等待用户确认。

如果脚本成功：

1. 确认 `.trae/DELIVERY_STATE.md` 已回退到对应 `current_phase`。
2. 确认 `Pause State.is_paused = false`。
3. 输出下一步建议：`/delivery:<target>`。

## Output

最终只输出：

1. Rewind Result。
2. Target Phase。
3. Workspace。
4. Snapshot。
5. Preserved / stale 文件摘要。
6. 下一步：`/delivery:<target>`。
