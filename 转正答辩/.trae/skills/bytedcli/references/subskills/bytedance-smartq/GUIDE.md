---
name: bytedance-smartq
description: "Operate SmartQ/TestIDE UI automation via bytedcli: inspect case sets, cases, auto steps, segments, and test tasks. Use for SmartQ, TestIDE, 小 Q UI, UI 自动化用例, auto_steps, caseset, test task, testide.byted.org, or smartq.bytedance.net."
---

# bytedcli SmartQ / TestIDE

通过 bytedcli 操作 TestIDE / SmartQ 小 Q UI 自动化 OpenAPI：读取用例集内容、自动化步骤与片段引用，读取或创建片段，创建/更新用例集与自动化步骤，创建测试任务并查询进度与结果。

## Prerequisites

- 调用方式见 `../../invocation.md`
- 认证只从环境变量读取，不在命令参数或代码中写 token：

```bash
export BYTEDCLI_SMARTQ_TOKEN=<openapi-token>
export BYTEDCLI_SMARTQ_PLATFORM=<token-apply-key>
```

- `BYTEDCLI_SMARTQ_BASE_URL` 可选，默认 `https://testide.byted.org`；`https://smartq.bytedance.net` 是当前 SmartQ Web 页面域名，也可通过环境变量覆盖使用
- 写操作默认使用当前登录用户作为 operator；需要覆盖时传 `--operator <email-prefix>`
- 写操作默认需要 `--dry-run` 或 `--yes`；先 dry-run 预览请求，再确认提交；不要同时传 `--dry-run` 与 `--yes`

## Read Cases

```bash
# 读取用例集 xmind_content、case_nodes；加 --with-auto-steps 后继续读取自动化步骤和片段引用
bytedcli --json smartq case-set get --space-id 1000 --case-set-id 2000 --with-auto-steps

# 只读取指定 auto node 的自动化步骤
bytedcli --json smartq auto-step get --space-id 1000 --case-set-id 2000 --auto-node-id demo-node

# 只列出用例节点映射
bytedcli smartq case list --space-id 1000 --case-set-id 2000
```

JSON 输出里的关键字段：

- `case_set.xmindContent` / `case_set.xmindContentJson`：用例集内容
- `case_list.caseNodes`：自动化节点 ID 到用例路径的映射
- `auto_steps`：按 auto node ID 聚合的自动化步骤
- `segment_refs`：从 `step_type=4` 或带 segment 字段的步骤中提取出的片段引用

## Segments

```bash
# 读取片段内容
bytedcli --json smartq segment get --space-id 1000 --segment-id 3000

# 搜索片段
bytedcli smartq segment list --space-id 1000 --keyword login --page 1 --page-size 20

# 创建片段；auto_steps 用 JSON 数组
bytedcli smartq segment create --space-id 1000 --name demo-segment --steps-file ./segment-steps.json --dry-run
bytedcli smartq segment create --space-id 1000 --name demo-segment --steps-file ./segment-steps.json --yes
```

`segment-steps.json` 示例：

```json
[
  { "auto_id": "step-1", "step_type": 2, "text": "tap login" },
  { "auto_id": "step-2", "step_type": 3, "text": "assert login success" }
]
```

## Write Cases And Auto Steps

```bash
# 创建用例集
bytedcli smartq case-set create --space-id 1000 --dir-id 3000 --name demo-case-set --creator demo-user --dry-run
bytedcli smartq case-set create --space-id 1000 --dir-id 3000 --name demo-case-set --creator demo-user --yes

# 创建后顺便写入 xmind_content
bytedcli smartq case-set create --space-id 1000 --dir-id 3000 --name demo-case-set --xmind-file ./case.json --dry-run

# 更新已有用例集 xmind_content
bytedcli smartq case-set update --space-id 1000 --case-set-id 2000 --xmind-file ./case.json --dry-run
bytedcli smartq case-set update --space-id 1000 --case-set-id 2000 --xmind-file ./case.json --yes

# 更新自动化步骤；body 可包含 step_type=4 的片段引用
bytedcli smartq auto-step update --space-id 1000 --case-set-id 2000 --auto-node-id demo-node --body-file ./auto-steps.json --dry-run
```

`auto-steps.json` 示例：

```json
{
  "node_auto_steps_list": [
    {
      "node_id": "demo-node",
      "caseset_id": 2000,
      "auto_steps": [
        { "auto_id": "step-1", "step_type": 2, "text": "tap login" },
        { "auto_id": "step-2", "step_type": 4, "segment_id": 3000, "text": "use login segment" }
      ]
    }
  ]
}
```

## Tasks

```bash
# 创建任务：TaskInfo body 较大，推荐放文件；body 至少需要 name
bytedcli smartq task create --body-file ./task.json --dry-run
bytedcli --json smartq task create --body-file ./task.json --yes

# 查询任务进度 / 报告
bytedcli --json smartq task get --id 4000

# 查询任务 case run 结果
bytedcli --json smartq task result list --id 4000 --page 1 --page-size 20
```

## Agent Guidance

- 不要把真实 token、真实测试包 URL、真实用例集 URL 写入代码、文档、测试 fixture 或示例。
- 读取已有线上用例可用 `case-set get --with-auto-steps`；写入前必须确认目标是新建测试用例集，并先 `--dry-run`。
- `auto-step update` 的 body 放 `node_auto_steps_list`；顶层 `auto_node_id` 与数值型 `caseset_id` 由 CLI 根据参数补齐。若标题节点没有自动化步骤，用 `auto_steps: []` 明确写空数组，便于后续回读。
- `task create` 只接收完整 JSON body，不把 Android 包、mapping、设备筛选等深层字段拆成零散 flags。
- `--json` 是全局参数，放在 `smartq` 前，例如 `bytedcli --json smartq task get --id 4000`。
