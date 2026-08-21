---
description: 在技术规划前由 LLM 阅读后端技术文档，落盘 BAM 证据；有分支证据时执行 BAM 同步，无分支证据时 no-op 通过并进入 plan；不生成技术方案。
---

请按 `.trae/AGENTS.md` 的 Phase Gate Rules 执行 `/delivery:bam`。本命令是 BAM 阶段唯一流程合同，不依赖额外 BAM 参考文档。

## Purpose

在 `/delivery:plan` 前完成 BAM 证据确认、配置同步和生成物更新。本阶段只做 BAM，不生成技术方案。

原则：

- LLM 负责从技术文档提取证据；脚本负责校验、比对和写入。
- 只处理当前目标 app/package 实际消费、且存在 HTTP 接口变更证据的 frontend BAM target。
- 无目标 PSM / branch 证据时走 no-op，禁止 method 查询、`bam.config.js` 改写和 BAM update。
- 有 branch 证据时必须先过 branch preflight，再进入 config / update。
- `bam.config.js` 只能由 `.trae/scripts/sync_bam_config_from_tech_doc.mjs` 修改。

## Precheck

必须读取：

- `.trae/DELIVERY_STATE.md`
- `.trae/PROJECT_CONTEXT.md`
- `<workspace>/00-inputs.md`
- `<workspace>/02-task-space.md`
- `<workspace>/repo-routing.md`
- `<workspace>/tech-doc-raw.md`
- `<workspace>/bam/bam-link-detection.md`（如存在）
- `.trae/skills/bam/SKILL.md`
- `.trae/skills/bam/references/metadata-guide.md`
- `.trae/skills/bam/references/codegen.md`
- `.trae/scripts/bam_branch_preflight.mjs`
- `.trae/scripts/sync_bam_config_from_tech_doc.mjs`

必须满足：

- PRD 阶段状态为 `DONE` 或 `PARTIAL_READY_FOR_PLAN`。
- repo root、目标 app/package、BAM 命令入口可以唯一确定。
- 若当前不存在可用 `Execution State`，本阶段负责创建并写回 `.trae/DELIVERY_STATE.md`。

## Execute

所有产物写入 `<workspace>/bam/`。

| 步骤 | 动作 | 继续条件 | 停止 / 分支 |
| --- | --- | --- | --- |
| 1 | LLM 阅读技术文档，写 `bam-psm-branch-evidence.json` 与 `bam-interface-change-evidence.json` | 证据只覆盖 frontend BAM target | 证据冲突、过宽或目标不唯一则 `BLOCKED` |
| 2 | branch evidence 为空时运行 `bam_branch_preflight.mjs --mode no-op-report` | N/A | `SKIPPED_NO_BRANCH_EVIDENCE`，直接进入 `/delivery:plan` |
| 3 | branch evidence 非空时运行 `bam_branch_preflight.mjs --mode preflight` | `bam-branch-preflight.json.status = PASSED` | branch / PSM / auth / command blocker 则停止 |
| 4 | 运行 `sync_bam_config_from_tech_doc.mjs --mode plan-methods` | method lookup plan 无 blocker | 缺 method 且缺 endpoint_id 则停止 |
| 5 | 对待查 endpoint 执行 `bytedcli --json bam method get`，写 `bam-method-metadata.json` | 待查 endpoint 全覆盖 | 元数据无法确认则停止 |
| 6 | 运行 `sync_bam_config_from_tech_doc.mjs --mode apply-config` dry-run + `--write` | diff 仅限目标 `bam.config.js` 配置变更 | 无关 diff 则停止 |
| 7 | 按 `bam_command_priority` 执行 BAM update | 目标 app/package 本地入口优先 | repo fallback 仅限必要场景 |
| 8 | 如发生 repo fallback，清理非目标 app/package `src/bam/**` | cleanup 写入报告 | 无法确认清理则停止 |

最终必须写 `bam-sync-report.md`。`bits-cli bam` 只能作为 probe chain fallback，不得作为唯一 checker。

## Artifact Contracts

### `bam-psm-branch-evidence.json`

```json
{
  "items": [
    {
      "psm": "ecom.buyin.admin_api",
      "branch": "tab_opt",
      "source": "tech_doc_explicit",
      "evidence": "技术文档中的原文摘要或小段引用"
    }
  ]
}
```

Contract: 只记录 frontend-consumed PSM；必须有 HTTP interface evidence；`source` 只能是 `tech_doc_explicit` 或 `bam_link_fallback`；同一 PSM 只能对应一个 branch。

### `bam-interface-change-evidence.json`

```json
{
  "items": [
    {
      "psm": "ecom.buyin.admin_api",
      "endpoint_id": "4202698",
      "bam_url": "https://cloud.bytedance.net/bam/rd/ecom.buyin.admin_api/api_doc/show_doc?...",
      "path": "/api/buyin/admin/multistar/public_opinion/batch_operate",
      "method": "",
      "change_type": "new_interface",
      "changed_fields": [
        {
          "name": "public_opinion_ids",
          "location": "request",
          "change": "新增批量操作舆情 ID 列表"
        }
      ],
      "evidence": "技术文档中的原文摘要或小段引用"
    }
  ]
}
```

Contract: 覆盖所有变更 HTTP 接口；仅当可通过 `endpoint_id` 查 metadata 时允许 `method=""`。

### `bam-branch-preflight.json`

```json
{
  "status": "PASSED",
  "mode": "preflight",
  "checker_kind": "probe_chain",
  "verification_level": "branch_exists",
  "available_probe_kinds": ["command_template", "bits_cli_bam_psm_list_version"],
  "items": [
    {
      "psm": "ecom.buyin.admin_api",
      "branch": "tab_opt",
      "selected_probe_kind": "command_template",
      "selected_verification_level": "branch_exists",
      "result": "PASSED",
      "auth_status": "AUTH_OK",
      "matched_signal": "BRANCH_CHECK_PASSED",
      "probe_attempts": [
        {
          "probe_kind": "command_template",
          "verification_level": "branch_exists",
          "result": "PASSED",
          "matched_signal": "BRANCH_CHECK_PASSED"
        }
      ],
      "fallback_used": false
    }
  ]
}
```

Contract: `status` 只能是 `PASSED`、`BLOCKED`、`SKIPPED_NO_BRANCH_EVIDENCE`；mutation 路径固定 `checker_kind=probe_chain`；必须保留 probe 顺序、命中 probe、verification level、全部 attempts 和 `fallback_used`；同结构写入 `bam-sync-report.md` 的 `branch_preflight.*`。

### Method Artifacts

`bam-method-lookup-plan.json` 只包含无法从目标 `bam.config.js` 复用 method 的 endpoint，且每项必须有 `endpoint_id`。

`bam-method-metadata.json` 必须覆盖 lookup plan 中全部 endpoint，并提供解析后的 `METHOD /path`。

### `bam-sync-report.md`

必须记录：

- `status`、`execution_mode`、`execution_repo_root`、`target_app_or_package`、`execution_branch`、`next_step`
- 结构化 `branch_preflight.*`
- config change summary、required include entries
- BAM update command、执行目录、结果摘要
- dependency recovery / retry 详情（如发生）
- repo fallback cleanup 结果（如发生）

no-op 报告必须使用 `status: SKIPPED_NO_BRANCH_EVIDENCE`、`execution_mode: no-op`、`next_step: /delivery:plan`，且 BAM update 写 `N/A`。

## Script Interfaces

### Branch Preflight

```bash
node .trae/scripts/bam_branch_preflight.mjs \
  --mode no-op-report \
  --workspace <workspace> \
  --repo-root <repo-root> \
  --target-dir <target-app-or-package> \
  --psm-branch-evidence <workspace>/bam/bam-psm-branch-evidence.json \
  --interface-evidence <workspace>/bam/bam-interface-change-evidence.json \
  --output <workspace>/bam/bam-branch-preflight.json \
  --report <workspace>/bam/bam-sync-report.md
```

```bash
node .trae/scripts/bam_branch_preflight.mjs \
  --mode preflight \
  --workspace <workspace> \
  --repo-root <repo-root> \
  --target-dir <target-app-or-package> \
  --psm-branch-evidence <workspace>/bam/bam-psm-branch-evidence.json \
  --output <workspace>/bam/bam-branch-preflight.json \
  [--check-command-template '<project-local branch checker with {psm}/{branch}>'] \
  [--probe-spec-file <workspace>/bam/bam-branch-preflight-probes.json] \
  --report <workspace>/bam/bam-sync-report.md
```

Probe 顺序：显式 `--check-command-template`、`--probe-spec-file`、内置 fallback。`bits-cli bam` 仅作为 fallback。

### Config Sync

```bash
node .trae/scripts/sync_bam_config_from_tech_doc.mjs \
  --workspace <workspace> \
  --repo-root <repo-root> \
  --target-dir <target-app-or-package> \
  --mode plan-methods \
  --psm-branch-evidence <workspace>/bam/bam-psm-branch-evidence.json \
  --interface-evidence <workspace>/bam/bam-interface-change-evidence.json \
  --method-lookup-plan <workspace>/bam/bam-method-lookup-plan.json \
  --branch-preflight <workspace>/bam/bam-branch-preflight.json \
  --report <workspace>/bam/bam-sync-report.md
```

```bash
node .trae/scripts/sync_bam_config_from_tech_doc.mjs \
  --workspace <workspace> \
  --repo-root <repo-root> \
  --target-dir <target-app-or-package> \
  --mode apply-config \
  --psm-branch-evidence <workspace>/bam/bam-psm-branch-evidence.json \
  --interface-evidence <workspace>/bam/bam-interface-change-evidence.json \
  --branch-preflight <workspace>/bam/bam-branch-preflight.json \
  [--method-metadata <workspace>/bam/bam-method-metadata.json] \
  --report <workspace>/bam/bam-sync-report.md \
  [--write]
```

Method metadata command:

```bash
bytedcli --json bam method get --endpoint-id <endpoint_id>
```

## Gate

PASS:

- no-op: branch evidence 为空，`bam-branch-preflight.json.status = SKIPPED_NO_BRANCH_EVIDENCE`，报告记录 no-op，且未执行 method/config/update。
- mutation: branch preflight `PASSED`，method / config / update 全部闭合，报告记录结构化 `branch_preflight.*`、include 覆盖、BAM update 结果和必要 cleanup。

BLOCKED:

- 目标 app/package、PSM、branch、config entry 或 method 无法唯一确定。
- branch evidence 超出 interface evidence 覆盖范围。
- preflight 证明 branch / PSM 不存在，或所有 probe 因鉴权、命令缺失、未知失败无法验证。
- `bam.config.js` 缺失、无关 diff、BAM update 失败、或 repo fallback 后无法清理无关生成物。

## Output

只输出以下摘要，不展开 schema：

1. BAM sync status。
2. PSM / 分支证据文件。
3. 接口和字段变更证据文件。
4. branch preflight 产物与结构化报告字段。
5. 待查询 method 清单 / method metadata。
6. Required include entries / missing include entries。
7. 修改的 `bam.config.js`。
8. BAM update command / result；若 `status = SKIPPED_NO_BRANCH_EVIDENCE`，明确写 `N/A (no-op)`。
9. 下一阶段 Plan 入口选择：默认 `/delivery:plan`；仅前端效果预览或真实合同尚未闭合且可由 BAM runtime mock 支撑时推荐 `/delivery:plan --mock-preview`，并说明 mock-preview 不代表真实联调完成。
