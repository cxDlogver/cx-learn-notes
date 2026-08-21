---
description: 接入验收问题源，在首个写操作前快照当前交付工作区，并按现行阶段规范原位修正受影响产物与实现
argument-hint: <飞书问题链接> [--init|--prd|--plan|--task|--code] [--mock-preview] [--dry-run] | --resume <repair-run-id|current> [--dry-run] | --rollback <repair-run-id|current> [--dry-run]
---

请按 `.trae/AGENTS.md` 和 `.trae/skills/delivery-acceptance-repair/SKILL.md` 执行 `/delivery:repair`。本 command 只负责参数解析、快照 Gate、Repair State、阶段路由、暂停恢复与回滚；各阶段行为和 Gate 必须动态读取并遵守当前普通 delivery command / skill / agent。Repair 不进入 `/delivery:accept`，design 之后只执行 repair 专属结果闭环。

用户输入：$ARGUMENTS

## Usage

```text
/delivery:repair <飞书问题链接>
/delivery:repair <飞书问题链接> --prd
/delivery:repair <飞书问题链接> --plan
/delivery:repair <飞书问题链接> --task
/delivery:repair <飞书问题链接> --code
/delivery:repair <飞书问题链接> --init --mock-preview
/delivery:repair <飞书问题链接> --dry-run
/delivery:repair --resume current
/delivery:repair --resume <repair-run-id> --dry-run
/delivery:repair --rollback current
/delivery:repair --rollback <repair-run-id> --dry-run
```

- `--init|--prd|--plan|--task|--code` 互斥；显式起点只能让 replay 更早。
- `--code` 保留为输入兼容，但必须规范化为 `task`，并在 `rerun-plan.json` 记录 `forced_start=code`、`normalized_forced_start=task`；不得绕过 Task/Test Case 修正。
- `--resume` 与 `--rollback` 均为独占模式，只允许附加 `--dry-run`。
- `--dry-run` 不创建快照、不写 Repair State，只读解析飞书来源身份，并输出 `NEW_REPAIR_RUN` 或 `REUSE_REPAIR_RUN`、workspace、repair run path、run id、snapshot path、阶段序列和 Gate。

## Mandatory Precheck

公共读取项：

- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- `.trae/skills/delivery-acceptance-repair/SKILL.md`
- `.trae/skills/delivery-acceptance-repair/repair-plan-template.md`

正常 repair 必须确认：

- 输入只有一个飞书 docx、wiki 或 sheet 问题事实源。
- `DELIVERY_STATE.md` 的 workspace 是 `artifacts/<task>/` 的现有目录，且原始需求与技术文档可追溯。
- `.trae/.git` 存在且保持不变。
- `Execution State.execution_repo_root` 是现有 Git 仓库。
- 若存在 active repair，正常 repair 只有在 canonical 飞书来源身份与其一致时才能复用；来源不同必须暂停，要求先 `--resume` 或 `--rollback` 当前 repair。

根据 `rerun-plan.json.stages[]`，每阶段开始前还必须读取该 stage 声明的 `command_ref`、全部 `skill_refs` 和对应 agent 文件。不得用 repair 内复制的旧阶段说明替代当前规范。

## Source Identity Preflight

在任何写操作前，只读完成以下步骤：

1. 解析 docx/sheet token；wiki 必须先解析真实对象，再得到 canonical `source_type + source_token`。
2. 运行只读解析器；解析器只扫描全局 repair 根 `artifacts/repair/<workspace-name>/*/source-manifest.json`，不得扫描或依赖 active workspace 内的 `repair/`。若历史产物仍留在 active workspace 的 `repair/`，只能视为 legacy 产物：不得作为 `REUSE_REPAIR_RUN`、`--resume` 或 `--rollback` 目标，且必须被 snapshot 排除：

   ```bash
   node .trae/skills/delivery-acceptance-repair/scripts/resolve-repair-run.mjs \
     --workspace <DELIVERY_STATE.workspace> \
     --source-type <docx|sheet> \
     --source-token <canonical-token>
   ```

3. 解析器输出：
   - `NEW_REPAIR_RUN`：当前 workspace 没有同源 run；允许进入 Snapshot-First Gate。
   - `REUSE_REPAIR_RUN`：唯一同源 run 的 `snapshot-ref.json` 与 immutable snapshot 均有效；复用该 run/snapshot，不得创建第二份快照。
4. 同源 run 存在但 snapshot 缺失/损坏，或同一身份命中多个 run 时立即暂停；不得静默创建新快照。多个命中必须由用户通过 `--resume <repair-run-id>` 消歧。

身份解析只能读取链接元数据和已有 manifest；不得在本阶段下载正文/媒体、写缓存、更新 source manifest 或修改任何状态。

## Snapshot-First Gate

仅当 Source Identity Preflight 返回 `NEW_REPAIR_RUN` 时，正常 repair 的第一个写操作必须是：

```bash
.trae/skills/delivery-acceptance-repair/scripts/create-repair-snapshot.sh \
  --workspace <DELIVERY_STATE.workspace> \
  --run-id <YYYYMMDD-HHMMSS>-<source-slug>
```

快照固定写入：

```text
artifacts/repair/_snapshots/<workspace-name>/<run-id>/
```

必须包含 `full-workspace/`、`DELIVERY_STATE.before-repair.md`、`execution-repo/`、`inventory.sha256` 和 `snapshot-manifest.json`。脚本只复制，不移动、不清空、不改写 active workspace、`DELIVERY_STATE.md` 或业务仓库。`full-workspace/` 必须排除 active workspace 根下的 legacy `repair/`，因为 repair run 与所有快照统一由 `artifacts/repair/` 管理，不属于业务 workspace 基线。

只有脚本返回 `REPAIR_SNAPSHOT_OK`，且 manifest 为 `READY` 后，才允许创建：

```text
artifacts/repair/<workspace-name>/<run-id>/
```

随后先写 `snapshot-ref.json`，再获取问题源并生成其他 repair 产物。快照失败时立即停止；不得创建 repair run、修改阶段产物、更新状态或改业务代码。

若预检返回 `REUSE_REPAIR_RUN`，必须先运行完整 validator 校验原 `snapshot-ref.json` 和 snapshot inventory，再把该既有 run 作为本次输出目录；不得调用快照脚本。

## Normal Repair Orchestration

1. 完成 Source Identity Preflight，并记录 `NEW_REPAIR_RUN` 或 `REUSE_REPAIR_RUN`。
2. 新 run 完成 Snapshot-First Gate；同源 run 回读并验证原 snapshot，二者都必须在任何后续写操作前拥有 READY snapshot。
3. 在选定 repair run 中重新完整读取问题源，不得复用上次正文或图片分析代替刷新；更新 `source-manifest.json.refresh`、`issue-source.md`、`issue-analysis.md`、`repair-plan.md`、`rerun-plan.json`、`repair-log.md` 和 `repair-closure.json`。
4. 运行 Analysis Gate：

   ```bash
   node .trae/skills/delivery-acceptance-repair/scripts/validate-repair-artifacts.mjs \
     <repair-run-dir> --stage analysis
   ```

5. Analysis Gate PASS 后，在 `.trae/DELIVERY_STATE.md` 最小写入 `Repair State`：`repair_run`、`snapshot_root`、`current_repair_stage`、`repair_resume_command=/delivery:repair --resume current`。不得覆盖其他状态段。
6. 按 `rerun-plan.json.stages[]` 串行执行；每个 stage 直接遵守它声明的当前普通 command、skill、agent 与 Gate。Repair 只额外施加原位修正、问题追踪、Task/Test Case 强制更新和 resume 约束。
7. 每阶段结束后先更新 `repair-log.md`、`repair-closure.json` 和 Repair State，再执行：

   ```bash
   node .trae/skills/delivery-acceptance-repair/scripts/validate-repair-artifacts.mjs \
     <repair-run-dir> --stage <stage>
   ```

8. `task -> code -> verify -> design` 始终执行。API/BAM 变化必须把 `bam` 放在 `plan` 前，并遵守当前 `/delivery:bam`；MOCK_PREVIEW 或受控样本补证按当前 `/delivery:mock` detour 后返回原 task/case。
9. Design Gate PASS 后新增 `repair-result.md`，必须按本次问题来源文档/表格的每条问题逐行给出 `问题 | 调整 | 解决结果 | 验收步骤` 表格；表格必须与来源问题一一对应。每行 `验收步骤` 只写接收人可直接手动复验的过程，步骤正文必须写清验收入口业务页或链接、前置条件、每一步需要输入或 mock 返回的数据、具体交互动作、预期结果和验收点，让接收人无需读取本地 artifact 也能按步骤手动复验。表格外可补充 Task/Test Case、代码路径、verify/design 证据和剩余风险；不得再调用 `/delivery:accept` 或生成 `08-acceptance-report.md` 作为 repair 完成条件。
10. `repair-result.md` 完成后，必须把解决结果写回本次问题来源链接对应的飞书文档/表格。写回到飞书的证据必须是截图或上述可执行手动验收步骤，不能只写本地证据文件路径、artifact 路径或日志文件引用；内部本地证据可继续记录在 `repair-result.md` 与 `repair-closure.json`，但不得替代飞书回写证据。回写失败视为 repair 未完成。
11. 结果对齐与飞书回写确认完成后，必须在 `Execution State.execution_repo_root` 提交代码，并把提交 SHA 写入 `repair-closure.json.repair_result.completion_commit`。`validate-repair-artifacts.mjs --stage repair-result` 通过且该提交为执行仓库当前 HEAD，才是 repair 完成标志。

## In-Place Correction Gate

- 每个纳入 repair 的 issue 必须证明至少一处当前产物或实现偏差；`NO_CHANGE`、分析后直接关闭或仅追加说明均不得 PASS。
- 必须在现有 `03-prd-analysis.md`、`04-tech-plan.md`、`delivery-task.md`、`09-test-case-matrix.md`、实现、验证、设计或 repair 结果产物的原位置增量修正；保留不受影响内容与稳定 ID。
- 禁止用 Repair Addendum、Override、平行 requirement/task/case 表、平行 workspace 或重新初始化替代原位修正。
- 每个 issue 必须 `task_change=true` 且 `test_case_change=true`：
  - 更新或新增独立 repair task；受影响的 `[x]` step 必须恢复 `[ ]`，完成 Code Gate 后才可重新勾选。
  - 更新原 case 或新增独立 regression case，绑定 requirement、target、task、正向断言、负向断言、证据和 `verification_stage`。

## Resume Mode

1. `current` 从 `Repair State.repair_run` 唯一解析；指定 run id 必须位于全局 repair 根 `artifacts/repair/<workspace-name>/<run-id>/`。
2. 回读 `snapshot-ref.json` 和不可变 snapshot manifest；不得创建第二份基线快照。
3. 运行完整 validator，确认 `current_repair_stage` 仍是 required 且未通过的 stage。
4. 重新读取该 stage 当前 `command_ref`、`skill_refs` 和 agent，继续原阶段；不得使用上次缓存的阶段说明。
5. `--dry-run` 只输出恢复目标与 Gate，不写状态或产物。

## Rollback Mode

rollback 只读取 repair run、snapshot manifest、当前 workspace/state/repo，不重新获取问题源：

```bash
.trae/skills/delivery-acceptance-repair/scripts/rollback-repair-snapshot.sh \
  --run-dir artifacts/repair/<workspace-name>/<run-id>
```

正式 rollback 必须先创建 `rollback-safety-*` 快照，再恢复 full workspace、`DELIVERY_STATE.md` 和业务仓库 branch/HEAD/staged/working/untracked 状态。原 snapshot 与 repair run 始终保留；失败时保留 safety snapshot 并停止，不得继续 delivery 阶段。

## Pause And Output

任一 P0、认证/环境阻塞、阶段 Gate 或 repair validator 失败时，按 `.trae/AGENTS.md` 的 Pause and Ask Protocol 暂停，并保留 run id、snapshot、当前 repair stage 与唯一恢复命令。

最终只输出：问题源完整性、snapshot/run 路径、问题归因、selected start、实际阶段序列、Task/Test Case 更新摘要、各阶段 Gate、`repair-result.md` / 飞书回写 / completion commit，或暂停与恢复命令。
