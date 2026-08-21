---
name: bytedance-faas
description: "Manage ByteCloud FaaS (Serverless) functions via bytedcli: list/get services, clusters, triggers, filter plugins, revisions, templates; download revision source zips; view logs; invoke functions; create/abort releases; create/update/delete triggers and filter plugins; remove services and clusters. Use when tasks mention FaaS, Serverless, cloud functions, ByteFaaS, function triggers, trigger filter plugins, function deployment, function source, or function logs."
---

# bytedcli FaaS

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

- 查询 FaaS 服务列表、详情、集群、触发器、代码版本、函数模板
- 查看函数运行日志（支持实时流）
- 调用函数（HTTP / Timer / Kafka / RocketMQ / EventBus / TOS）
- 创建发布（滚动蓝绿部署）、查看发布状态、中止发布
- 创建 / 更新 / 删除触发器（timer、http、kafka 等）
- 下载 / 上传 / 更新 / 删除 trigger filter plugin，并绑定到 RocketMQ trigger
- 下载在线编辑代码版本的源码 zip
- 删除服务或集群

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

### 查询服务与集群

```bash
# 列出 FaaS 服务
bytedcli faas function list --limit 10
bytedcli faas function list --search "demo-service" --limit 20

# 查看服务详情
bytedcli faas function get --service-id <service-id>

# 列出集群
bytedcli faas cluster list --service-id <service-id>

# 查看集群详情（单集群服务可省略 --region / --cluster）
bytedcli faas cluster get --service-id <service-id> --region <region> --cluster <cluster>
```

### 服务成员管理

告警接收人按服务成员（owner / admins / authorizers / subscribers）解析。owner、admins、authorizers 用 `update` 整列设置；`remove-member` 只从 admins / authorizers 中删除指定用户，避免手工传全量列表时误删其他成员。subscribers 是“当前用户订阅”，只能本人 `subscribe` / `unsubscribe`，无法替他人增删。

```bash
# 整列设置 owner / admins / authorizers（传入的列表会整体覆盖原值）
bytedcli faas function update --service-id <service-id> --owner alice --admins alice,bob --authorizers alice

# 只从 admins / authorizers 中移除指定用户（保留其余成员不变）
bytedcli faas function remove-member --service-id <service-id> --admins bob
bytedcli faas function remove-member --service-id <service-id> --authorizers bob,carol

# 当前用户订阅 / 取消订阅服务告警通知
bytedcli faas function subscribe --service-id <service-id>
bytedcli faas function unsubscribe --service-id <service-id>
```

### 触发器

```bash
# 列出触发器
bytedcli faas trigger list --service-id <service-id>

# 查看触发器详情
bytedcli faas trigger get --service-id <service-id> --id <trigger-id>
bytedcli faas trigger get --service-id <service-id> --trigger-type mqevent --id <trigger-id>

# 创建 timer 触发器
bytedcli faas trigger create --service-id <service-id> --type timer --name demo-timer --cron "*/10 * * * *" --enabled

# 创建 RocketMQ trigger；--close-multi-env 表示关闭泳道改写，消费原始 topic/group
bytedcli faas trigger create --service-id <service-id> --region <region> --cluster <cluster> --type mqevent --name demo-mq --mq-type rocketmq --mq-region <mq-region> --mq-cluster demo-mq-cluster --topic demo-topic --consumer-group demo-group --sub-expr demo-tag --initial-offset Latest --close-multi-env --disabled

# 更新触发器
bytedcli faas trigger update --service-id <service-id> --trigger-id <id> --trigger-type timer --cron "0 * * * *"
bytedcli faas trigger update --service-id <service-id> --trigger-id <id> --trigger-type mqevent --mq-type rocketmq --topic demo-topic --consumer-group demo-group --open-multi-env --enabled

# 盘点、重启和调整副本限制
bytedcli faas trigger search --type mq --psm demo.psm --region <region> --topic demo-topic --consumer-group demo-group --mq-cluster demo-mq-cluster --mq-type rocketmq
bytedcli faas trigger execute --action restart --service-id <service-id> --trigger-id <id> --trigger-type mqevent
bytedcli faas trigger replica-limit update --service-id <service-id> --trigger-id <id> --trigger-type mqevent --replica-max-limit '{"default":2}'

# Filter Plugin：模板下载、上传和绑定
bytedcli faas filter-plugin template download --service-id <service-id> --output default-filter-plugin.zip
bytedcli faas filter-plugin create --service-id <service-id> --name demo-filter --zip-file demo-filter-plugin.zip
bytedcli faas filter-plugin update --service-id <service-id> --plugin-id <plugin-id> --name demo-filter --zip-file demo-filter-plugin.zip
bytedcli faas filter-plugin list --service-id <service-id>
bytedcli faas filter-plugin delete --service-id <service-id> --plugin-id <plugin-id> --force
bytedcli faas trigger bind-filter-plugin --service-id <service-id> --trigger-id <id> --trigger-type mqevent --plugin-id <plugin-id>

# 删除触发器（需 --force）
bytedcli faas trigger delete --service-id <service-id> --trigger-id <id> --trigger-type timer --force
```

Filter Plugin zip 必须保留平台模板目录结构：`filter_plugin/filter.go` 和 `filter_plugin/filter.pb.go`。只把 Go 文件放在 zip 根目录会导致 FaaS trigger 无法正常完成插件发布。

### 报警规则

```bash
# 列出某集群的报警规则（单集群服务可省略 --region / --cluster）
bytedcli faas alarm list --service-id <service-id>
bytedcli faas alarm list --service-id <service-id> --region <region> --cluster <cluster>
```

报警规则按集群维度配置（每个集群一组：invoke error / exit / memory / cpu / latency）。
通知接收人不存储在规则上，由服务的 owner / admins / subscribers / authorizers 解析；
要调整谁收到报警，改这些成员字段（见 `faas function update` / `faas function subscribe`），而不是改报警规则。

### 查看日志

```bash
# 查看最近 10 分钟日志
bytedcli faas log --service-id <service-id>

# 查看最近 1 小时的 stderr 日志
bytedcli faas log --service-id <service-id> --since 1h --type stderr

# 按 pod 过滤
bytedcli faas log --service-id <service-id> --pod <pod-name> --limit 100
```

### 调用函数

```bash
# HTTP 调用
bytedcli faas invoke --service-id <service-id>
bytedcli faas invoke --service-id <service-id> --data '{"key":"value"}' --method POST

# Timer 调用
bytedcli faas invoke --service-id <service-id> --type timer --timer-name demo-timer --data '{}'

# Kafka 调用
bytedcli faas invoke --service-id <service-id> --type kafka --kafka-topic demo-topic --kafka-consumer-group demo-group --data '{"msg":"hello"}'
```

### 发布管理（工单制）

`faas release create` 现在会提交一个发布工单（`tickets/release_clusters`），
由 FaaS 平台异步编排灰度发布。工单信息（ticket id / ticket url）会在结果中返回。

```bash
# 创建工单，使用最新 code revision（默认）
bytedcli faas release create --service-id <service-id>

# 指定 code revision id
bytedcli faas release create --service-id <service-id> --code-revision <rev-id>

# 指定 rolling-step / min-ready-percentage / traffic-ratio
bytedcli faas release create --service-id <service-id> \
  --rolling-step 20 --min-ready-percentage 95 --traffic-ratio 100

# 指定 pipeline-template（平台/服务特定，可从 Web 界面获取）
bytedcli faas release create --service-id <service-id> --pipeline-template <template-id>

# 查看最近发布
bytedcli faas release status --service-id <service-id>

# 列出发布历史
bytedcli faas release list --service-id <service-id>

# 中止发布
bytedcli faas release abort --service-id <service-id>
```

默认参数：`--rolling-step=10`、`--min-ready-percentage=90`、`--rolling-interval=0`、
`--traffic-ratio=100`。

### 代码版本

```bash
# 列出代码版本
bytedcli faas revision list --service-id <service-id>

# 查看版本详情
bytedcli faas revision get --service-id <service-id> --revision <rev>

# 下载在线编辑代码 zip（revision=0 表示当前在线编辑代码）
bytedcli faas revision download --service-id <service-id>
bytedcli faas revision download --service-id <service-id> --revision 24 --output source.zip

# 基于最新版本创建一个新版本（克隆字段，仅覆盖指定字段）
bytedcli faas revision create --service-id <service-id> \
  --from-revision latest --number 1.0.65 \
  --source faas/example:demo:1.0.0.95 --description "release 1.0.0.95"
```

### 函数模板

```bash
# 列出可用模板
bytedcli faas template list
bytedcli faas template list --runtime golang/v1

# 查看模板详情
bytedcli faas template get --name <template-name>
```

### 删除资源

```bash
# 删除集群（需 --force）
bytedcli faas remove cluster --service-id <service-id> --region <region> --cluster <cluster> --force

# 删除服务（需 --force，且须先删除所有集群）
bytedcli faas remove service --service-id <service-id> --force
```

## 多站点支持

FaaS 通过 `--site` 切换环境（替代 bytefaas CLI 的 `APP_ENV`）：

```bash
# 中国站（默认）
bytedcli faas function list --limit 10

# BOE 环境
bytedcli --site boe faas function list --limit 10

# TikTok ROW (i18n-tt)
bytedcli --site i18n-tt faas function list --limit 10

# ByteIntl (i18n-bd)
bytedcli --site i18n-bd faas function list --limit 10
```

## 智能集群解析

当目标服务只有一个集群时，`--region` 和 `--cluster` 可以省略，bytedcli 会自动解析。

```bash
# 服务只有一个集群时，以下两种写法等效：
bytedcli faas trigger list --service-id <service-id>
bytedcli faas trigger list --service-id <service-id> --region cn-north --cluster default
```

## Notes

- 需要结构化输出加 `--json`（全局选项，放在子命令之前）
- `--service-id` 是大多数命令的必填参数
- `faas revision download` 使用 Web 在线编辑器同源的 legacy `code.zip` 接口；`--revision 0` 表示当前在线编辑代码，指定数字可下载历史函数 revision。
- 删除操作（`remove service`、`remove cluster`、`trigger delete`）需要 `--force` 确认
- `faas log` 别名 `faas logs`；`faas remove` 别名 `faas rm`
- `trigger get` / `revision get` / `template get` 均有 `view` 别名

## References

- `references/faas.md`
