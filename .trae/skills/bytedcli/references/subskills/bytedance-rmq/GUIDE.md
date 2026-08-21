---
name: bytedance-rmq
description: "Operate RMQ (RocketMQ) via bytedcli: list/search topics, get topic details, list consumer groups, query consumer stats, check queue allocation, view client connections. Use when tasks mention RocketMQ, RMQ topics, consumers, or message queues."
---

# bytedcli RMQ (RocketMQ)

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

- RocketMQ / RMQ 话题搜索与详情查看
- 消费组列表查询
- 消费状态（TPS、Lag、Queue 详情）诊断，支持按 Lag 排序截取 Top N 队列
- Queue 分配状态排查，支持按 Broker/Queue 筛选对应 Proxy 信息
- 客户端连接状态查看，支持按 Proxy IP 筛选

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

Commands are grouped under `rmq topic` and `rmq consumer`.

```bash
# Topic 列表（按名称搜索）
bytedcli rmq topic list --vregion "China-BOE" --search "demo_topic"
bytedcli rmq topic list --vregion "China-BOE" --page 1 --page-size 20

# Topic 详情（按 ID 查询）
bytedcli rmq topic get --topic-id 132991 --vregion "China-BOE"

# Topic 详情（按名称查询；同名 Topic 用 Cluster 消歧）
bytedcli rmq topic get --topic-name "demo_topic" --vregion "China-BOE"
bytedcli rmq topic get --topic-name "demo_topic" --cluster-name "demo_cluster" --vregion "China-BOE"

# Consumer Group 列表（按 Topic ID 查询）
bytedcli rmq consumer list --topic-id 132991 --vregion "China-BOE"

# 消费状态（TPS、Lag、Queue 详情）
bytedcli rmq consumer stats --topic demo-topic --group demo-group --cluster demo-cluster --vregion "China-BOE"
# 查看 Lag 最高的前 5 个队列
bytedcli rmq consumer stats --topic demo-topic --group demo-group --cluster demo-cluster --top-lag-queue 5

# Queue 分配状态（按 Broker Cluster → Proxy 展示）
bytedcli rmq consumer allocation --topic demo-topic --group demo-group --cluster demo-cluster --vregion "China-BOE"
# 筛选指定 Broker 和 Queue 对应的 Proxy 信息
bytedcli rmq consumer allocation --topic demo-topic --group demo-group --cluster demo-cluster --broker demo-broker --queue 0

# 客户端连接状态（按 Broker Cluster → Proxy → Client 连接串展示）
bytedcli rmq consumer clients --topic demo-topic --group demo-group --cluster demo-cluster --vregion "China-BOE"
# 筛选指定 Proxy 的 Client 信息
bytedcli rmq consumer clients --topic demo-topic --group demo-group --cluster demo-cluster --proxy 10.0.0.1
```

## 多站点支持

RMQ 支持多个站点，通过 `--site` 切换：

- `boe`: BOE 环境 (`cloud-boe.bytedance.net`)
- `cn`: 中国站 (`cloud.bytedance.net`)
- `i18n-bd`: ByteIntl (`cloud.byteintl.net`)
- `i18n-tt`: TikTok ROW (`cloud.tiktok-row.net`)

```bash
# BOE
bytedcli --site boe rmq topic list --vregion "China-BOE" --search "demo"

# 中国站
bytedcli --site cn rmq topic list --vregion "CN" --search "demo"
```

## Notes

- 需要结构化输出加 `--json`
- `--vregion` 指定虚拟区域（如 `China-BOE`、`CN`、`BOE` 等），默认为 `China-BOE`
- Topic 列表支持 `--search` 按名称模糊搜索和分页（`--page` / `--page-size`）
- Topic 详情支持 `--topic-id` 或 `--topic-name` 查询；按名称查询遇到同名 Topic 时加 `--cluster-name` 消歧
- Consumer Group 列表需要指定 `--topic-id`
- `consumer stats` / `allocation` / `clients` 需要指定 `--topic`、`--group`、`--cluster`
- `consumer stats` 支持 `--top-lag-queue <n>` 按 Lag 倒序截取前 N 个队列信息
- `consumer allocation` 支持 `--broker` 和 `--queue` 筛选指定 Broker/Queue 对应的 Proxy 信息
- `consumer clients` 支持 `--proxy <ip>` 筛选指定 Proxy 的 Client 信息
- allocation 结果按 Broker Cluster → Proxy 层级展示；clients 结果按 Broker Cluster → Proxy → Client 连接串层级展示

## References

- `references/rmq.md`
