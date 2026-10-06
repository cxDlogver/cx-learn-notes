# Safe Digital Employee

Digital Employee 列表、agent 查询、图实例校验/更新、agent 单任务试运行、仿真结果查询，以及飞书表格或 CSV 驱动的批量仿真任务创建、状态查询与状态更新。

`safe digital-employee knowledgebase list` and `safe digital-employee plugin list` are provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). Install it with `bytedcli self plugin install --repo ies_safety/safecli` if those commands are unknown.

## Authentication

Requires Safe authentication. See parent skill `bytedance-safe` for login instructions.

## Command Root

Use the explicit command root in examples below:

```bash
bytedcli safe digital-employee --help
```

## Commands

### list

List Digital Employees with common filters.

```bash
bytedcli safe digital-employee list --name demo --page 1 --page-size 10
bytedcli safe digital-employee list --department-ids demo-department-id --project-ids demo-project-id
bytedcli --json safe digital-employee list --employee-id demo-employee-id
```

Parameters:
- `--name <name>` — Digital Employee name filter
- `--department-ids <ids>` — Comma-separated department IDs
- `--classify <n>` — Digital Employee classify: `1=审核`, `2=标注`, `3=质检`, `4=管理`, `5=知识库`, `6=审核技能`, `7=智能标注` (default: `1`)
- `--type <n>` — Digital Employee type: `1=正式`, `2=测试` (default: `1`)
- `--status <n>` — Digital Employee status: `1=启用`, `2=未启用` (default: `1`)
- `--employee-id <id>` — Digital Employee ID filter
- `--project-ids <ids>` — Comma-separated project IDs
- `--owner-open-ids <ids>` — Comma-separated owner open IDs
- `--is-cqc` — Filter CQC Digital Employees
- `--manage-scene <scene>` — Management scene filter
- `--has-publish-time` — Filter employees with publish time
- `--creator <name>` — Creator filter
- `--page <n>` / `--page-size <n>` — Pagination for returned Digital Employees
- `--tenant <tenant>` — Tenant code override

Text mode renders enum values with labels, for example `1(启用)`. JSON mode preserves structured API fields under `data`.

### agent get

Get a Digital Employee agent and its graph instance key.

```bash
bytedcli safe digital-employee agent get --id demo-agent-id
bytedcli --json safe digital-employee agent get --id demo-agent-id
```

Parameters:
- `--id <id>` — Digital Employee agent ID [required]
- `--tenant <tenant>` — Tenant code override

### agent list

List agents under a Digital Employee.

```bash
bytedcli safe digital-employee agent list --id demo-employee-id --page 1 --page-size 10
bytedcli --json safe digital-employee agent list --id demo-employee-id
```

Parameters:
- `--id <id>` — Digital Employee ID [required]
- `--page <n>` / `--page-size <n>` — Pagination for returned agents
- `--tenant <tenant>` — Tenant code override

Text mode renders agent status with labels: `1(草稿)`, `2(线上)`, `3(部署中)`.

### graph validate

Validate a Digital Employee graph instance.

```bash
bytedcli safe digital-employee graph validate --key demo-employee-key --content-file ./sample-graph.json
bytedcli --json safe digital-employee graph validate --key demo-employee-key --content-file ./sample-graph.json
```

Parameters:
- `--key <key>` — Digital Employee entity key [required]
- `--content-json <json>` / `--content-file <path>` — Graph content JSON object; provide exactly one
- `--template-mapping-json <json>` / `--template-mapping-file <path>` — Optional template mapping JSON object or array
- `--tenant <tenant>` — Tenant code override

### graph update

Update a Digital Employee graph instance.

```bash
bytedcli safe digital-employee graph update --id demo-employee-id --version 1 --content-file ./sample-graph.json
bytedcli safe digital-employee graph update --id demo-employee-id --content-json '{"root":"start","nodes":[],"edges":[]}' --template-mapping-json '[]'
bytedcli --json safe digital-employee graph update --id demo-employee-id --content-file ./sample-graph.json
```

Parameters:
- `--id <id>` — Digital Employee entity ID [required]
- `--version <n>` — Digital Employee entity version (default: `1`)
- `--content-json <json>` / `--content-file <path>` — Graph content JSON object; provide exactly one
- `--template-mapping-json <json>` / `--template-mapping-file <path>` — Optional template mapping JSON object or array
- `--ignore-check-content` — Set `ignore_check_content=true`
- `--tenant <tenant>` — Tenant code override

### simulate run-agent

Run a synchronous agent simulation for one task.

```bash
bytedcli safe digital-employee simulate run-agent --agent-id demo-agent-id --task-id demo-task-id
bytedcli safe digital-employee simulate run-agent --agent-id demo-agent-id --task-id demo-task-id --project-id demo-project-id
bytedcli --json safe digital-employee simulate run-agent --agent-id demo-agent-id --task-id demo-task-id
```

Parameters:
- `--agent-id <id>` — Digital Employee agent ID [required]
- `--task-id <id>` — Safe task ID [required]
- `--project-id <id>` — Safe project ID; when omitted, the command resolves it from `--task-id`
- `--open-pre-label-mock` — Set `is_open_pre_label_mock=true`
- `--tenant <tenant>` — Tenant code override

### simulate list-result

List simulation result cases.

```bash
bytedcli safe digital-employee simulate list-result --sim-id demo-sim-id --page 1 --page-size 20
bytedcli safe digital-employee simulate list-result --sim-id demo-sim-id --project-id demo-project-id --page 1 --page-size 20
bytedcli --json safe digital-employee simulate list-result --sim-id demo-sim-id --page 1 --page-size 20
```

Parameters:
- `--sim-id <id>` — Simulation ID [required]
- `--project-id <id>` — Optional Safe project ID filter
- `--page <n>` / `--page-size <n>` — Pagination for returned result cases
- `--tenant <tenant>` — Tenant code override

JSON output includes parsed case identifiers and the nested `sim_result` / `verify_data` fields extracted from `cases[].sim_result`.

### simulate create-batch-task

Create an asynchronous batch simulation task from a Feishu sheet or local CSV file.

```bash
bytedcli safe digital-employee simulate create-batch-task --id demo-agent-id --sheet-url https://example.com/sheets/demo --qpm 1
bytedcli safe digital-employee simulate create-batch-task --id demo-agent-id --csv-file ./sample-cases.csv
bytedcli --json safe digital-employee simulate create-batch-task --id demo-agent-id --sheet-url https://example.com/sheets/demo
```

Parameters:
- `--id <id>` — Digital Employee agent ID [required]
- `--sheet-url <url>` / `--csv-file <path>` — Case input; provide exactly one
- `--qpm <n>` — Optional QPM limit for the batch task
- `--rpc-timeout <seconds>` — Single task timeout in seconds, range `1..600` (default: `600`)
- `--case-resource-type <n>` — Sheet case resource type (default: `1`); CSV input always uses type `2`
- `--tenant <tenant>` — Tenant code override

Compatibility note:
- `--rpc-timeout` follows the backend-supported range `1..600`; values outside this range are rejected before the request is sent.

### simulate list-batch-task

List batch simulation tasks under a Digital Employee agent.

```bash
bytedcli safe digital-employee simulate list-batch-task --id demo-agent-id --page 1 --page-size 10
bytedcli --json safe digital-employee simulate list-batch-task --id demo-agent-id --page 1 --page-size 10
```

Parameters:
- `--id <id>` — Digital Employee agent ID [required]
- `--page <n>` / `--page-size <n>` — Pagination for batch tasks
- `--tenant <tenant>` — Tenant code override

### simulate update-batch-task-status

Update a batch simulation task status.

```bash
bytedcli safe digital-employee simulate update-batch-task-status --task-id demo-batch-task-id --status terminated
bytedcli safe digital-employee simulate update-batch-task-status --task-id demo-batch-task-id --status running
bytedcli --json safe digital-employee simulate update-batch-task-status --task-id demo-batch-task-id --status terminated
```

Parameters:
- `--task-id <id>` — Batch simulation task ID [required]
- `--status <status>` — Batch task status: `default`, `running`, `success`, `failed`, `terminated`, `suspend`; use `running` to resume a suspended task
- `--tenant <tenant>` — Tenant code override

### statistics

Get digital employee statistics data (process counts, accuracy, tokens, etc.).

```bash
bytedcli safe digital-employee statistics --type employee --id demo-employee-id
bytedcli safe digital-employee statistics --id demo-employee-id --start 1777885200 --end 1778491619
bytedcli --json safe digital-employee statistics --id demo-employee-id
```

Parameters:
- `--type <type>` — Statistics query type: `employee` (default: `employee`)
- `--id <id>` — Digital employee ID [required]
- `--start <unix>` — Start time unix timestamp (default: 7 days ago)
- `--end <unix>` — End time unix timestamp (default: now)
- `--department-ids <ids>` — Comma-separated department IDs
- `--data-view <n>` — Data view mode (default: `0`)
- `--page <n>` / `--page-size <n>` — Pagination (default: page 1, size 10)
- `--tenant <tenant>` — Tenant code override

### knowledgebase list

List knowledge bases for a Digital Employee entity. Provided by the safecli plugin.

```bash
bytedcli safe digital-employee knowledgebase list --digital-employee-id demo-digital-employee-id --entity-type digital_employee
bytedcli safe digital-employee knowledgebase list --digital-employee-id demo-digital-employee-id --entity-type digital_employee_sub_agent --keyword sample-keyword
bytedcli --json safe digital-employee knowledgebase list --digital-employee-id demo-digital-employee-id --entity-type digital_employee
```

### plugin list

List plugins for a Digital Employee entity. Provided by the safecli plugin.

```bash
bytedcli safe digital-employee plugin list --entity-id demo-employee-id --entity-type digital_employee --search-content sample-keyword
bytedcli safe digital-employee plugin list --entity-id demo-employee-id --entity-type digital_employee --aicore-tool-ids demo-tool-id-1,demo-tool-id-2
bytedcli --json safe digital-employee plugin list --entity-id demo-employee-id --entity-type digital_employee
```

## Output

- Text mode renders a compact human-readable summary or table.
- JSON mode (`-j`/`--json`) returns structured data under the standard bytedcli `data` field.
