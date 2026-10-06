---
name: bytedance-bfc
description: "Operate BFC (ByteDance Flow Control) via bytedcli: query plans, union plans, products, operation execution history, and tenants. Use when tasks mention BFC, ByteDance Flow Control, 预案, 联合预案, 产品线, 执行历史, or 租户信息."
---

# BFC

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

BFC 平台的 CLI 操作工具。

## Capabilities

- 预案管理：查询预案详情与列表
- 联合预案：查询详情与列表
- 产品：列表（v3）与详情
- 预案操作执行：查询执行记录
- 租户：查询详情与列表

## Usage

```bash
# 查询预案详情
bytedcli bfc plan get --plan_key <key>

# 查询预案列表（分页+筛选）
bytedcli bfc plan list --product-id 123 --page 1 --page-size 20 --keyword <keyword>

# 查询联合预案详情
bytedcli bfc union get --union_key <key>

# 查询联合预案列表（分页+筛选）
bytedcli bfc union list --product-id 123 --page 1 --page-size 20 --status 1

# 查询产品列表（v3）
bytedcli bfc product list --version v3 --tenant-id 1001 --page 1 --page-size 20

# 查询产品详情
bytedcli bfc product get --product-id 123

# 查询预案操作执行记录
bytedcli bfc op-exec list --plan-key <key> --start-time-gte <ts> --start-time-lte <ts>

# 查询租户详情
bytedcli bfc tenant get --tenant-id 1001

# 查询租户列表（分页+筛选）
bytedcli bfc tenant list --name-like <name> --page 1 --page-size 20

# Agent 调用必须加上 --json
bytedcli --json bfc plan get --plan_key <key>
