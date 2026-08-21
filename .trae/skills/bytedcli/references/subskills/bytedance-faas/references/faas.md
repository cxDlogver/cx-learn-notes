# FaaS

FaaS 命令按资源分组为 `function`、`cluster`、`trigger`、`filter-plugin`、`revision`、`template`、`release`、`log`、`invoke`、`remove`。

## 服务与集群查询

```bash
# 服务列表（支持搜索、分页）
bytedcli faas function list --limit 10 --search "demo" --env prod
bytedcli faas function list --sort-by "-updated_at" --offset 20

# 服务详情
bytedcli faas function get --service-id <service-id>

# 集群列表
bytedcli faas cluster list --service-id <service-id> --limit 20
bytedcli faas cluster list --service-id <service-id> --region cn-north

# 集群详情（含最新发布状态）
bytedcli faas cluster get --service-id <service-id> --region <region> --cluster <cluster>
```

## 触发器管理

```bash
# 列出触发器
bytedcli faas trigger list --service-id <service-id>

# 查看触发器详情（--id 或 --name 选其一）
bytedcli faas trigger get --service-id <service-id> --id <trigger-id>
bytedcli faas trigger get --service-id <service-id> --name <trigger-name>
bytedcli faas trigger get --service-id <service-id> --trigger-type mqevent --id <trigger-id>

# 创建 timer 触发器
bytedcli faas trigger create --service-id <service-id> --type timer --name demo-timer --cron "*/10 * * * *" --enabled

# 创建 HTTP 触发器
bytedcli faas trigger create --service-id <service-id> --type http --name demo-http --path /api/handler --method POST

# 创建 RocketMQ trigger；--close-multi-env 表示关闭泳道改写，消费原始 topic/group
bytedcli faas trigger create --service-id <service-id> --region <region> --cluster <cluster> --type mqevent --name demo-mq --mq-type rocketmq --mq-region <mq-region> --mq-cluster demo-mq-cluster --topic demo-topic --consumer-group demo-group --sub-expr demo-tag --initial-offset Latest --close-multi-env --disabled

# 更新触发器
bytedcli faas trigger update --service-id <service-id> --trigger-id <id> --trigger-type timer --cron "0 * * * *" --disabled
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

Filter Plugin zip 必须保留平台模板目录结构：`filter_plugin/filter.go` 和 `filter_plugin/filter.pb.go`。只把 Go 文件放在 zip 根目录会导致 FaaS trigger 无法正常完成插件发布。`trigger bind-filter-plugin` 在未传 `--filter-source` / `--filter-source-type` 时会从 `filter-plugin list` 自动按 `--plugin-id` 解析。

## 报警规则

```bash
# 列出某集群的报警规则（单集群服务可省略 --region / --cluster）
bytedcli faas alarm list --service-id <service-id>
bytedcli faas alarm list --service-id <service-id> --region <region> --cluster <cluster>

# JSON 输出（含 rule_format / threshold / handle_suggestion 等完整字段）
bytedcli --json faas alarm list --service-id <service-id> --region <region> --cluster <cluster>
```

报警规则按集群配置（每集群一组：invoke error / exit / memory / cpu / latency）。
通知接收人不在规则里，由服务 owner / admins / subscribers / authorizers 解析；要改谁收报警，改这些成员字段而不是规则本身。

## 日志查看

```bash
# 最近 10 分钟日志（默认）
bytedcli faas log --service-id <service-id>

# 指定时间范围和类型
bytedcli faas log --service-id <service-id> --since 1h --type stderr

# 按 pod 过滤
bytedcli faas log --service-id <service-id> --pod <pod-name> --limit 100

# JSON 输出
bytedcli --json faas log --service-id <service-id> --since 30m
```

`--since` 支持 `5s`、`2m`、`3h`、`1d` 格式，默认 `10m`。`--type` 可选 `stdout`、`stderr`、`all`（默认 `all`）。

## 函数调用

```bash
# HTTP 调用（默认 POST）
bytedcli faas invoke --service-id <service-id>
bytedcli faas invoke --service-id <service-id> --data '{"key":"value"}'
bytedcli faas invoke --service-id <service-id> --data-file payload.json --method GET --path /health

# Timer 调用
bytedcli faas invoke --service-id <service-id> --type timer --timer-name demo-timer

# Kafka 调用
bytedcli faas invoke --service-id <service-id> --type kafka --kafka-topic demo-topic --kafka-consumer-group demo-group --data '{"msg":"hello"}'

# RocketMQ 调用
bytedcli faas invoke --service-id <service-id> --type rocketmq --rocketmq-topic demo-topic --rocketmq-consumer-group demo-group

# 显示响应头
bytedcli faas invoke --service-id <service-id> --verbose
```

`--type` 支持：`http`（默认）、`timer`、`kafka`、`rocketmq`、`eventbus`、`tos`。`--timeout` 默认 180 秒。

## 发布管理

```bash
# 创建发布（滚动蓝绿）
bytedcli faas release create --service-id <service-id>
bytedcli faas release create --service-id <service-id> --code-revision 1.0.5 --ratio 50 --rolling-step 10
bytedcli faas release create --service-id <service-id> --approver demo-user

# 查看当前发布状态
bytedcli faas release status --service-id <service-id>

# 列出发布历史
bytedcli faas release list --service-id <service-id> --limit 10

# 中止发布
bytedcli faas release abort --service-id <service-id>
```

`--ratio` 指定最大流量百分比（0-100，默认 100）。`--rolling-step` 指定每步流量迁移百分比（默认 20）。

## 代码版本

```bash
# 列出代码版本
bytedcli faas revision list --service-id <service-id> --limit 10

# 查看版本详情
bytedcli faas revision get --service-id <service-id> --revision <rev>

# 下载在线编辑代码 zip（revision=0 表示当前在线编辑代码）
bytedcli faas revision download --service-id <service-id>
bytedcli faas revision download --service-id <service-id> --revision 24 --output source.zip
```

`faas revision download` 使用 Web 在线编辑器同源的 legacy `code.zip` 接口；`--revision 0` 表示当前在线编辑代码，指定数字可下载历史函数 revision。

## 函数模板

```bash
# 列出可用模板
bytedcli faas template list
bytedcli faas template list --runtime golang/v1

# 查看模板详情
bytedcli faas template get --name <template-name>
```

## 删除资源

```bash
# 删除集群
bytedcli faas remove cluster --service-id <service-id> --region <region> --cluster <cluster> --force

# 删除服务（须先删除所有集群）
bytedcli faas remove service --service-id <service-id> --force
```

**警告：** 删除操作不可逆。必须传 `--force` 确认。非交互模式下（`--json` 或 pipe）也需要显式传 `--force`。

## 多站点

通过 `--site` 切换（等价于 bytefaas CLI 的 `APP_ENV`）：

| `--site`  | 等价 `APP_ENV` | 说明           |
| --------- | -------------- | -------------- |
| `cn`      | `production`   | 中国站（默认） |
| `boe`     | `boe`          | BOE 测试       |
| `i18n-bd` | `i18n`         | ByteIntl       |
| `i18n-tt` | `i18n`         | TikTok ROW     |

```bash
bytedcli --site boe faas function list --limit 10
bytedcli --site i18n-tt faas log --service-id <service-id>
```

## 智能集群解析

单集群服务可省略 `--region` 和 `--cluster`；多集群时必须指定，否则报错并列出可用集群。
