---
name: bytedance-cache
description: "Operate Cache platform via bytedcli: list/search cache services, get service details, get cluster details, get IDC topology, list supported Redis commands, execute Redis commands, query slow logs, list big keys, list hot keys, manage Redis auth update tickets, and inspect Cache platform support tickets. Use when tasks mention cache services, cache clusters, Redis queries, supported Redis commands, slow logs, big keys, hot keys, Redis auth, allowed PSMs/users, IDC topology, region/idc roles, tickets, or troubleshooting cache latency, Redis performance, memory usage, abnormal keys, or service health. Do not use for general Redis programming questions, non-Bytedance Cache resources, or concept-only explanations that do not require bytedcli."
---

# bytedcli Cache

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

- 缓存服务搜索 / 收藏 / 详情
- 缓存集群详情 / 实例列表
- Redis 支持命令列表 / 命令执行
- 慢查询、大 Key、热 Key 查询
- Redis 鉴权 PSM 增删工单
- 工单管理
- 支持国内站（prod）和海外站；使用全局 `--site` 选择站点：`i18n-tt`（SG）、`ttp-us-limited`（US TTP）、`ttp-eu`（EU TTP）

## Do not use

- 不适用于通用 Redis 编程问题
- 不适用于 Bytedance Cache 平台以外的资源问题
- 不适用于无需 bytedcli 的概念性解释问题

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

```bash
# 服务列表
bytedcli cache list-starred-service --page 1 --page-size 20
bytedcli cache search-service --keyword "cache.demo" --page 1 --page-size 20
bytedcli cache get-service --psm "cache.demo"
bytedcli cache get-cluster --psm "cache.demo"
# IDC 拓扑（region/idc 的 role 与 follow）
bytedcli cache get-idc-topology --psm "cache.demo"

# Redis 命令
bytedcli cache list-commands
bytedcli cache execute-command --psm "cache.demo" --command "GET" --args "key"

# 慢查询
bytedcli cache slow-log --psm "cache.demo"
# 大 Key
bytedcli cache list-big-keys --psm "cache.demo" --date "2026-02-05" --start "00:00:00" --end "23:59:59"
# 热 Key
bytedcli cache list-hot-keys --psm "cache.demo" --date "2026-02-05" --start "00:00:00" --end "23:59:59" --type read

# 工单
bytedcli cache update-permission --psm "cache.demo" --change-type allow --target "example.service.psm"
bytedcli cache update-permission --psm "cache.demo" --change-type remove --target "example.service.psm" "demo.service.psm" --dry-run
bytedcli cache list-my-tickets --psm "cache.demo"
bytedcli cache list-service-tickets --psm "cache.demo" --page 1 --page-size 20
```

## Notes

- 需要结构化输出加 `--json`（全局选项，放在子命令之前，如 `bytedcli --json cache list-starred-service ...`）
- Flag renames: `--page-num` is now `--page`, `--begin` is now `--start`; old names still work as hidden aliases
- 海外 TTP 场景使用全局 `--site ttp-us-limited` 或 `--site ttp-eu`；别名 `us-ttp` / `eu-ttp` 也可用。Per-service `--cache-site` is a hidden alias for backward compatibility.
- `cache update-permission` 提交 Redis 鉴权变更工单，不直接修改服务字段；`--change-type allow|remove` 分别表示添加 / 删除鉴权，`--target` 传一个或多个目标 PSM，`--dry-run` 只打印请求体不提交。

## References

- `references/cache.md` — 缓存相关命令的完整参数与详细说明
- `../../troubleshooting.md` — 常见失败、权限 / 登录、站点选择和命令报错的处理步骤
