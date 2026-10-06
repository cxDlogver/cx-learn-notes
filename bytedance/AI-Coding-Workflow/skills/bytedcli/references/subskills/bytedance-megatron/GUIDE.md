---
name: bytedance-megatron
description: "Operate Megatron (Spark app management) via bytedcli: get/search Spark app metadata, get queue usage, inspect queue quota, and read a Spark app's Spark UI run detail (jobs/stages/executors/sql) from the Spark History Server REST API. Use when tasks mention Megatron, Spark apps, Spark app metadata, queue usage, user queue quota, Spark UI, Spark jobs/stages/executors, or analyzing how a Spark task ran."
---

# bytedcli Megatron

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

- Megatron Spark 应用管理
- 查询或搜索 Spark 应用元数据
- 查询队列使用情况
- 查询队列默认配额、用户配额，或计算单个用户在队列中的资源上限
- 读取单个 Spark 应用的 Spark UI 运行详情（jobs / stages / executors / sql），分析任务运行情况（慢 stage、数据倾斜、executor 异常、failed task）
- 按全局 `--site` 路由，按 `--region` / 全局 `--vregion` 选择站点内虚拟区域

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

```bash
# CN 站点：查询 Spark 应用元数据
bytedcli megatron app get --app-ids application_1234567890000_000001

# i18n-tt 站点：按虚拟区域查询多个应用
bytedcli --site i18n-tt megatron app get --app-ids application_1234567890000_000001,application-abc-123 -r sg

# 搜索应用
bytedcli --site i18n-tt megatron app search --app-name demo-app --state RUNNING -r va
bytedcli --site i18n-tt megatron app search --me -r sg

# 查看队列使用情况 + 用户配额（合并的命令）
bytedcli --site i18n-tt megatron queue usage --queue-name root.demo_queue --user-name demo-user -r sg
bytedcli --site i18n-tt megatron queue usage -r sg

# 列出队列（默认按当前 SSO 用户过滤；--all-users 列全部）
bytedcli --site i18n-tt megatron queue list -r sg
bytedcli --site i18n-tt megatron queue list --all-users -r sg

# 配置层面的用户配额（默认 ratio / 已配置的 per-user ratio）
bytedcli --site i18n-tt megatron queue quota list-users --queue-name root.demo_queue -r sg
bytedcli --site i18n-tt megatron queue quota get-default --queue-name root.demo_queue -r sg

# 读取 Spark UI 运行详情：聚合健康摘要 / jobs / 指定 stage 下钻 / executors（含 dead）
bytedcli --site i18n-tt megatron spark-ui summary get --app-id application_1234567890000_000001 -r sg
bytedcli --site i18n-tt megatron spark-ui jobs list --app-id application_1234567890000_000001 -r sg
bytedcli --site i18n-tt megatron spark-ui stages get --app-id application_1234567890000_000001 --stage-id 8 -r sg
bytedcli --site i18n-tt megatron spark-ui executors list --app-id application_1234567890000_000001 --all -r sg

# 诊断任务（失败原因 / 慢任务 / 资源利用率）——按方法论决策树判断该取哪些证据
# 见 references/spark-ui-diagnose/GUIDE.md（方法论；scripts/compute_metrics.py 仅做派生指标计算）
```

## Site and region

- 站点使用全局 `--site`：`cn`、`i18n-tt`、`eu-ttp`、`us-ttp`、`us-ttp-bdee`、`us-ttp-usts`、`boe`。
- `--region` 表示 Megatron 的虚拟区域，会作为 `x-bcgw-vregion` 请求头发送；也可用全局 `--vregion` 提供默认值。
- `cn`、`us-ttp`、`us-ttp-bdee`、`us-ttp-usts` 不需要 `--region`。
- `i18n-tt` 默认 `sg`，常用值包括 `sg`、`va`、`us-west`、`us_south_west`、`eu`、`id`、`mygp`。
- `eu-ttp` 默认 `i18n_gcp`，常用值包括 `eu_ttp`、`i18n_gcp_gp`、`i18n_gcp`、`eu_ttp_no`。
- `boe` 默认 `boe`，常用值包括 `boe`、`boei18n`。

## Notes

- 需要结构化输出加全局 `--json`
- `--app-ids` 支持逗号分隔或空格分隔的 application ID
- 若在生产网络访问 `i18n-tt`，可设置 `BYTEDCLI_NETWORK_PROFILE=prod`

## References

- `references/megatron.md`
- `../../invocation.md`
- `../../troubleshooting.md`
- `references/spark-ui-diagnose/GUIDE.md` — 诊断方法论：假设驱动地用 spark-ui 原子命令定位失败原因/慢因/资源问题；`scripts/compute_metrics.py` 仅做派生指标计算
