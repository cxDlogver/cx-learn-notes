---
name: bytedance-tokadb
description: "Operate TokaDB via bytedcli: list clusters, get cluster detail, list tables, and describe table metadata across supported regions. Use when tasks mention TokaDB, toka clusters, ByteTable-compatible clusters, TokaDB tables, table schema, column families, or multi-AZ topology. Do not use for generic SQL execution or unrelated database platforms such as RDS, ByteDoc, Hive, ABase, or Redis."
---

# bytedcli TokaDB

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

- 列出当前账号在指定 TokaDB region 下可见的 cluster
- 查看 TokaDB cluster 详情、负责人、服务等级、共享集群标记与拓扑信息
- 按 cluster/database/table 维度列出 TokaDB table
- 查看 TokaDB table 的 schema、列族、TTL、表类型、多 AZ 拓扑等元信息
- 需要跨 region 只读盘点 TokaDB cluster 或 table 元数据

## Do not use

- 执行 SQL、分析 Hive 表或离线数据任务：使用 `bytedance-tqs`、`bytedance-hive`、`bytedance-dorado` 等对应 skill
- 查询 RDS、ByteDoc、ABase、Redis、MemoryBase 等非 TokaDB 平台资源
- 写入、建表、删表、迁移或其他变更类 TokaDB 操作；当前 bytedcli TokaDB 能力只覆盖只读元信息查询

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 需要可用的 ByteCloud 认证；若失败先执行 `bytedcli auth login`
- TokaDB Web 会话可能按站点隔离；跨 region 查询失败时按提示登录对应站点

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

```bash
# cluster 元信息
bytedcli tokadb cluster list --region cn --page-size 20
bytedcli tokadb cluster list --all-regions --keyword "sample-cluster"
bytedcli tokadb cluster list --region cn --scope owner-or-common
bytedcli tokadb cluster get --region cn "sample-cluster"

# table 元信息
bytedcli tokadb table list --region cn --cluster "sample-cluster" --page-size 20
bytedcli tokadb table list --all-regions --keyword "sample_table"
bytedcli tokadb table list --region cn --scope owner
bytedcli tokadb table describe --region cn 12345

# 结构化输出
bytedcli --json tokadb cluster list --region cn --page-size 20
bytedcli --json tokadb table describe --region cn 12345
```

## Notes

- `--region` 默认是 `cn`；需要跨站点盘点时使用 `--all-regions`（与 `--region` 互斥，不存在 `--region all` 这种写法）。
- 支持的 region 为 `cn`、`boe`、`boei18n`、`i18ntt`、`i18nbd`、`usttp`、`euttp`；不要传旧别名或站点域名。
- 列表命令通过 `--keyword` 做模糊搜索、`--name` 做精确匹配，用 `--page` / `--page-size` 翻页（不存在 `--limit`）。
- 可见性范围统一用 `--scope` 枚举：cluster 支持 `all`（默认）/ `owner` / `owner-or-common`，table 支持 `all`（默认）/ `owner` / `admin-or-owner`；不存在 `--owner` / `--owner-or-common` / `--admin-or-owner` 这些布尔 flag。
- `table list` 额外支持 `--cluster`（按集群名/ID 过滤）与 `--has-data-query-permission`；不存在 `--database` / `--table` flag。
- `cluster get <id_or_name>` 与 `table describe <id>` 的标识都是位置参数，不要写成 `--cluster` / `--database` / `--table`。
- `-j/--json` 是全局选项，放在 `tokadb` 之前；JSON 模式只输出结构化 JSON，适合脚本消费。
- `--all-regions` 会逐 region 查询并汇总；部分 region 鉴权失败时，文本模式会提示对应登录站点，JSON 模式会在错误列表中保留 region 维度。

## References

- `references/cluster.md` — TokaDB cluster 概念、常用字段与 cluster 命令说明
- `references/table.md` — TokaDB table 概念、常用字段与 table 命令说明
- `../../troubleshooting.md` — 常见失败、权限 / 登录、站点选择和命令报错的处理步骤
