---
name: bytedance-memorybase
description: "Operate MemoryBase (memory layer for AI agents) via bytedcli: add/search/list/get/update/delete memories, check event status, manage config. Use when tasks mention MemoryBase, mem0, AI agent memory, memory search, memory CRUD, or memory management."
---

# bytedcli MemoryBase

## When to use

- 为 AI Agent 添加、检索、管理记忆（memory）
- 语义搜索或关键词搜索 Agent 历史记忆
- 查看异步记忆提取任务的状态
- 批量导入记忆数据
- 管理 MemoryBase 连接配置（API key、base URL、默认 user/agent/project ID）

## 前置条件

- 需要 MemoryBase API Key：`--api-key <key>` / `MEMORYBASE_API_KEY` / `bytedcli memorybase config set --key platform.api_key --value <key>`
- 默认 API 地址为 `https://api.mem0.ai`；自建 MemoryBase 后端需通过 `--base-url` 或 `config set --key platform.base_url` 指定
- MemoryBase 后端需要 `--project-id`；mem0 兼容后端可选

## Quick start

```bash
# 配置
bytedcli memorybase config set --key platform.api_key --value <your-api-key>
bytedcli memorybase config set --key platform.base_url --value https://memorybase.example.com
bytedcli memorybase config set --key defaults.user_id --value demo-user
bytedcli memorybase config set --key defaults.project_id --value <your-project-id>

# 检查连接
bytedcli memorybase status

# 添加记忆
bytedcli memorybase add --text "用户偏好深色模式" -u demo-user --agent-id demo-agent
bytedcli memorybase add --messages '[{"role":"user","content":"我喜欢素食"}]' -u demo-user

# 搜索记忆
bytedcli memorybase search --query "深色模式" -u demo-user
bytedcli memorybase search --query "偏好" --top-k 5 --threshold 0.5

# 列出 / 获取 / 更新 / 删除
bytedcli memorybase list -u demo-user --agent-id demo-agent
bytedcli memorybase get --id <memory-id>
bytedcli memorybase update --id <memory-id> --text "更新后的文本"
bytedcli memorybase delete --id <memory-id> --force

# 异步任务状态
bytedcli memorybase event get --id <event-id>

# 批量导入
bytedcli memorybase import --file memories.json -u demo-user

# 配置管理
bytedcli memorybase config show
bytedcli memorybase config get --key platform.base_url
```

## Commands

| 命令 | 说明 |
|------|------|
| `memorybase add` | 添加记忆（`--text` / `--messages` JSON / `--file`） |
| `memorybase search` | 语义或关键词搜索（`--keyword-search`） |
| `memorybase list` | 列出记忆（分页、日期过滤） |
| `memorybase get` | 获取单条记忆 |
| `memorybase update` | 更新文本或 metadata |
| `memorybase delete` | 删除单条记忆（需 `--force`） |
| `memorybase event get` | 查看异步任务状态 |
| `memorybase import` | 从 JSON 文件批量导入 |
| `memorybase config show` | 显示当前配置 |
| `memorybase config get` | 获取指定配置项 |
| `memorybase config set` | 设置配置项 |
| `memorybase status` | 检查 API 连接状态 |

## 通用参数

| 参数 | 环境变量 | 说明 |
|------|----------|------|
| `--api-key <key>` | `MEMORYBASE_API_KEY` | API 密钥 |
| `--base-url <url>` | `MEMORYBASE_BASE_URL` | API 地址 |
| `-u, --user-id <id>` | `MEMORYBASE_USER_ID` | 用户 ID |
| `--agent-id <id>` | `MEMORYBASE_AGENT_ID` | Agent ID |
| `--project-id <id>` | `MEMORYBASE_PROJECT_ID` | Project ID（MemoryBase 后端必填） |
| `--app-id <id>` | `MEMORYBASE_APP_ID` | 应用 ID |
| `--run-id <id>` | `MEMORYBASE_RUN_ID` | 运行 ID |

优先级：命令行参数 > 环境变量 > `~/.memorybase/config.json` > 默认值

## Agent Guidance

- `add` 默认异步处理，返回 `event_id`，用 `event get --id <event_id>` 查状态
- 搜索默认语义搜索，`--keyword-search` 切换关键词搜索
- `--threshold 0.5` 过滤低相似度结果（0-1）
- `--no-infer` 跳过 AI 推理，直接存储原文（仅设置 `infer=false`）
- `--sync` 禁用异步处理，等待结果返回（仅设置 `async_mode=false`）；可与 `--no-infer` 组合使用
- 导入文件为 JSON 数组，每项支持 `text`、`memory` 或 `messages` 字段
- 所有命令支持 `-j` 输出 JSON
- MemoryBase 后端（`org_id` 为空）会自动检测并要求 `--project-id`

## References

- [Invocation](../../invocation.md)
- [Troubleshooting](../../troubleshooting.md)
