---
name: bytedance-abase
description: "Operate ABase2 via bytedcli: list namespaces, search by PSM, get namespace detail, list/get tables, list supported online-query commands, run online query, and inspect ABase regions/locations. Use when tasks mention ABase, ABase2, ABase namespace, ABase table, ABase PSM search, or ABase online query. Do not use for Redis/Cache service operations; use bytedance-cache for Redis cache services."
---

# bytedcli ABase

## 如何调用 bytedcli

推荐：先全局安装一次，后续所有命令直接调用 `bytedcli`。

```bash
# 推荐方式：先全局安装，后续直接调用 bytedcli
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

```bash
# Fallback：仅在无法全局安装时使用 npx 临时执行
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]
```

## When to use

- ABase2 namespace 列表、收藏、我的 namespace
- 按 PSM 或 namespace 关键词搜索 ABase2 namespace
- 查看 ABase2 namespace 详情、table 列表、table 详情
- 查看 table 支持的在线查询命令
- 通过 ABase2 online query 执行只读或后端允许的命令
- 查询 ABase region / location 元数据

## Do not use

- Redis / Cache 服务搜索、Redis 命令、慢日志、大 Key、热 Key：使用 `bytedance-cache`
- ABase Classic 或非 ABase2 控制台能力
- 无需 bytedcli 的通用 NoSQL 概念解释

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 需要可用的 ByteCloud 认证；若失败先执行 `bytedcli auth login`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

```bash
# namespace 列表与搜索
bytedcli abase list --scope all --keyword "demo.namespace" --limit 20
bytedcli abase search --psm "demo.namespace"
bytedcli abase get --psm "demo.namespace"

# table
bytedcli abase table list --psm "demo.namespace"
bytedcli abase table get --psm "demo.namespace" --table "sample_table"

# online query
bytedcli abase command list --psm "demo.namespace" --table "sample_table"
bytedcli abase command list
bytedcli abase command run --psm "demo.namespace" --table "sample_table" --command "GET" --inputs "sample-key"
bytedcli abase command run --cluster "sample-cluster" --namespace "demo_namespace" --table "sample_table" --payload-json '{"command":"GET","inputs":"sample-key"}'

# region / location
bytedcli abase region list
bytedcli abase location list
```

## Notes

- 需要结构化输出加 `--json`（全局选项，放在子命令之前，如 `bytedcli --json abase search --psm ...`）。
- 国内生产默认使用 `--abase-site cn --region online`；跨站点时可显式传 `--abase-site boe|i18n-tt|us-ttp|eu-ttp` 和 `--region <region>`。
- namespace 详情接口需要 namespace numeric ID；`--psm` 会先搜索并自动解析 ID 与 cluster。
- table 详情接口需要 table numeric ID；`--table` 会先从 table list 中按精确表名解析 ID。
- `query` 默认按 ABase2 前端形态发送 `command` 与 `inputs`；`--payload-json` 会把 JSON object 原样发送到 ABase2 online-query endpoint，适合后端新增命令参数形态时兜底。

## References

- `references/abase.md` — ABase2 命令示例与参数说明
- `../../troubleshooting.md` — 常见失败、权限 / 登录、站点选择和命令报错的处理步骤
