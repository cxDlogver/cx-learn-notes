---
name: bytedance-magnus
description: "Magnus GLS metadata read-only queries for catalogs, databases, tables, and schemas. Use when tasks mention Magnus, GLS metadata, catalog/database/table/schema lookup, or need read-only Magnus metadata from bytedcli."
---

# bytedcli Magnus

## 如何调用 bytedcli

先选择一种调用方式。下面所有示例默认直接写 `bytedcli`。

```bash
# 方式 1：直接用 npx 运行最新版
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]

# 方式 2：先全局安装，再直接调用 bytedcli
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

- 使用 `npx` 时，把后文示例里的 `bytedcli` 替换成 `NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest`
- 已全局安装时，直接按后文示例执行 `bytedcli ...`

## When to use

- 查询 Magnus/GLS catalog 列表、详情或存在性。
- 查询 database 列表、详情或存在性。
- 查询 table 列表、基础信息或 detail 信息。
- 查询表 columns、partitions、properties 或可用 column types。

## Scope

Magnus GLS metadata read-only queries for catalogs, databases, tables, and schemas.

当前命令只覆盖 CN GLS 元数据读接口，不读取表数据，不创建、更新、删除、注册、导入或上传资源。

## Quick start

```bash
bytedcli magnus catalog list
bytedcli magnus database list --catalog demo_catalog
bytedcli magnus database get --catalog demo_catalog --db-name demo_db
bytedcli magnus table list --catalog demo_catalog --db-name demo_db --page 1 --page-size 20
bytedcli magnus table get --name demo_catalog.demo_db.demo_table
bytedcli magnus schema columns --name demo_catalog.demo_db.demo_table
```

## Command groups

- `magnus catalog`: `list|get|exists`
- `magnus database`: `list|get|exists`
- `magnus table`: `list|get|exists`; `get --detail` 读取 detail endpoint
- `magnus schema`: `columns|partitions|properties|column-types`

## Agent Guidance

- 表级资源名统一传 `--name catalog.database.table`，例如 `demo_catalog.demo_db.demo_table`。
- database 入参统一使用标准 flag `--db-name`，不要使用 `--database-name`。
- 需要机器可读输出时使用全局 `--json`，并把它放在 `magnus` 前面：`bytedcli --json magnus table get --name demo_catalog.demo_db.demo_table`。
- 分页命令使用 `--page` 与 `--page-size`；CLI 侧页码从 1 开始。
- 认证复用 bytedcli Cloud JWT。未登录时先执行 `bytedcli auth login`。
