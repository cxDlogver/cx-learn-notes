---
name: bytedance-triton
description: "Use bytedcli Triton commands for DataLeap 数据安全 permission workflows: apply for Hive table/column data permission (delegates to Coral, with the 304 合规问卷 / compliance questionnaire flow), answer questionnaire questions, create the application from an answered draft, and browse the 审批中心 (approval center) — list my submitted applications, applications awaiting my approval (todo), my historical approval records, and fetch an application detail by group id. Use when the task mentions Triton, 权限申请, 审批中心, approval / approval center, 申请权限, dataleap triton, or 304 / 合规问卷."
---

# bytedcli Triton

Use this skill when the task mentions Triton, 权限申请 (permission apply), 审批中心
(approval center), approval, 申请权限, dataleap triton, or 304 / 合规问卷 (compliance
questionnaire).

Triton 的权限管理 + 审批中心后端就是 Coral 的权限 API（`coral_<cluster>_api`，同一个
DataLeap host 与认证）。apply/answer/create 直接 delegate 给 Coral；审批中心命令读
`applications/merged/*` / `approvals/merged/*` 端点。

## Invocation

```bash
bytedcli --json triton <command> [options]
```

本仓库本地测试用：

```bash
node dist/bytedcli.js --json triton <command> [options]
```

参数不清楚时，跑 `triton --help` / `triton apply --help` / `triton approval --help`，
不要瞎猜。

`--region` 取值 `sg | va | gcp`，不传时按 `--site` 映射出默认 region。

## 权限申请（apply → answer → create）

apply 不会直接建工单；它返回权限草稿，若命中合规问卷（304）则必须逐题作答后再 create。

```bash
# 1) 发起申请，拿到草稿（可能内联返回 304 合规问卷）
bytedcli --json triton apply \
  --region sg --db-name example_db --table-name example_table \
  --auth-object demo-user --permission read --ttl 365

# 列级权限：重复 --column；PSM 接收方：--auth-type psm（ttl 默认 0）
bytedcli --json triton apply --region sg --db-name example_db --table-name example_table \
  --column sample_col --auth-object demo-user
bytedcli --json triton apply --region sg --db-name example_db --table-name example_table \
  --auth-type psm --auth-object demo.psm --permission write --ttl 0

# 2) 若检测到 304 合规问卷，逐题作答（question id / option 来自 apply 输出）
bytedcli --json triton apply answer \
  --draft-file /tmp/triton-permission-draft.json \
  --question-id q1 --answer "是 Yes"

# 3) 逐题答完后，用已作答的草稿创建申请工单
bytedcli --json triton apply create \
  --draft-file /tmp/triton-permission-answered-draft.json
```

### 304 合规问卷说明

- "304 文档" 是接口**内联返回**的结构化问答题（`resource_questions_answers{id,type,topic,options}`），
  **不是**要上传的合规文件。
- apply 输出会列出每道题的 `id` / `type` / `topic` / `options`；用这些 id 去 `apply answer`。
- 多选题：重复 `--answer`。question id 与 option 必须来自 apply/draft 输出，**禁止臆造**。
- 真实工作流里，作答前先问用户；不要擅自替用户回答合规问题。

## 审批中心（approval center，只读）

```bash
# 单一 verb-last 的 list 命令，--type 选队列：submitted(我提交,默认) | todo(待我审批) | reviewed(我审批过)
# 我提交的权限申请（默认 --type submitted）；--days 仅 submitted 生效，默认 180
bytedcli --json triton approval list --region sg --page-size 5
bytedcli --json triton approval list --type submitted --region sg --days 30 --query example_table

# 待我审批：等我审批的工单
bytedcli --json triton approval list --type todo --region sg --page-size 5

# 审批记录：我历史的审批决策
bytedcli --json triton approval list --type reviewed --region sg --page-size 5

# 申请详情：按 group id 看单条申请
bytedcli --json triton approval get --region sg --id 1001
```

## 通过 / 拒绝（approve / reject）

```bash
# 通过：approve-as-requested，原样回写 ttl/permission/permission_usage（已 live 抓包验证）
bytedcli triton approval approve --region sg --id 100001 --yes

# 拒绝：强制 --reason（作为审批 comment）
bytedcli triton approval reject --region sg --id 100001 --reason "duplicate request" --yes
```

端点（已 live 抓包，见 `src/api/triton/AGENTS.md`）：先 `GET applications/merged/detail/{id}`
取 `application_dto.resources[].aid`，再 `POST /api/v1/applications/update/tasks`（per-resource
决策数组）。1-resource batch 通常即返回 `SUCCESS`，否则轮询 `GET /api/v1/tasks/{taskId}?cluster=`。

- **确认门**：不带 `--yes` 不会真改。JSON 模式无 `--yes` 直接报
  `TRITON_CONFIRM_REQUIRED`（不交互）；text 模式打印 summary 后让你加 `--yes` 重跑。
- 只操作 `--id` 单工单，绝不批量其他工单。
- ⚠️ **reject 的 `status:"REFUSED"` + `comment` 字段是未验证假设**（抓包时不会拒真实申请人，
  approve 才实测过）：**首次真实 reject 前，务必先在 DataLeap web 端人工复核该工单是否真被拒绝；
  若 CLI 返回与预期不符，按真实抓包修正后再用。** 不要把 reject 当成已验证行为陈述。

## Rules that matter

- 草稿、debug payload 写 `/tmp`，不要把临时文件写进仓库。
- apply/answer/create 的 question id、option id 必须来自 Coral draft/API 输出，禁止编造 schema 或答案 id。
- 真实工作流里，作答合规问卷前先问用户；只有在明确授权的测试里才随机作答。
- `--auth-type psm` 时 `--ttl` 默认 0；`person` 时默认 365。
- `approval get` 的 `--id` 是申请的 group id（与列表返回的 group id 同源）。
- 写操作（approve/reject）已可用，但必须 `--yes` 确认；⚠️ reject 的 REFUSED 字段为未验证假设，
  首次真实 reject 前务必先在 DataLeap web 端人工复核工单是否真被拒绝，返回不符按真实抓包修正后再用。
