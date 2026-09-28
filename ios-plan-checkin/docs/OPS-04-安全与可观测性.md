# OPS-04 安全与可观测性运行说明

## 请求追踪与隐私

- API 只接收 UUID 格式的 `X-Client-Request-Id`；其余输入改用服务端 UUID。响应头及成功/错误体复用同一个 requestId。
- HTTP 日志采用固定字段：时间、requestId、方法、静态路由、状态、耗时、错误码；已认证写入可附操作名、资源/用户/幂等键的 HMAC 摘要和 baseRevision。日志不序列化请求体、响应体、完整 IP、手机号、验证码、token、备注正文或对象 URL。
- Worker 日志只记录周期名称、结果、处理数量和耗时；外部短信/APNs/对象存储异常原文不得进入日志。日志采集侧仍应限制访问与保留周期。
- `X-Request-Id`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer` 与 `Cache-Control: no-store` 由 API 中间件统一写入。

## 限流

PostgreSQL `rate_limit_buckets` 使用原子 upsert、1 分钟固定窗口，在 API 副本间共享。库中仅保留作用域 HMAC；Worker 每 15 分钟清理超过 1 小时的桶。数据库写入失败时限流路径返回 503，不放行未经检查的写入。

| 路径类别 | 每分钟上限 | 作用域 |
| --- | ---: | --- |
| 发送短信 challenge | 30 | 客户端 IP |
| 校验短信 | 60 | 客户端 IP |
| 撤销注销 | 15 | 客户端 IP |
| refresh | 120 | 客户端 IP |
| 用户名可用性查询 | 120 | bearer 会话，未登录时 IP |
| 其他业务写操作 | 240 | bearer 会话，未登录时 IP |

超限返回 HTTP 429、`RATE_LIMITED`、`Retry-After` 秒数与 requestId。短信业务另有手机号/验证码冷却与尝试次数限制；入口 IP 限流负责抑制广域轰炸。反向代理必须覆盖客户端传来的转发头，且 `API_TRUST_PROXY_HOPS` 与可信代理层数一致；未设时使用 socket 地址，避免伪造 IP 绕过限流。

## 指标与告警

`GET /internal/metrics` 输出 Prometheus 文本；非开发环境必须从密钥管理器注入至少 32 位的 `API_METRICS_TOKEN`，采集请求使用 `Authorization: Bearer <token>`。开发环境未设 token 时，仅允许本机地址访问。生产环境应通过私网采集并禁止公开路由。指标包括 API 状态/延迟、短信结果、DB 连接/锁等待、未解决冲突、媒体/导出/注销作业滞留、APNs 失败、Worker 队列及心跳。标签只使用静态路由、固定错误码和方法，不能带手机号或资源 ID。

告警规则位于 [`infra/observability/alerts.yml`](../infra/observability/alerts.yml)。高优先级：核心写入 5xx、权限拒绝突增、注销逾期及 Worker 停止。一般告警：整体 5xx/P95/P99、DB 连接和锁、同步冲突、媒体/导出/通知滞留、APNs 拒绝与短信失败。数值为初始阈值，预发压测后按实测基线调整。客户端崩溃/启动指标及 Redis exporter 属于 OPS-05 部署接入，当前 API 不伪造这些指标。

## 操作与自检

1. 先执行 0011 迁移，再部署 API 和 Worker；旧版 Worker 不写心跳，新版 API 会显示心跳缺失告警。
2. 配置可信代理、指标 token、私网采集与告警规则；用独立采集身份访问指标端点。
3. 开发自检：`pnpm observability:smoke`、`pnpm db:smoke`、`pnpm check`。前者验证限流边界、跨作用域隔离、HMAC 存储和关键告警覆盖。
4. 出现 429 时查 requestId、固定路由、对应限流策略和 `Retry-After`；出现 Worker 心跳告警时先核对进程、数据库连接与 `worker_cycle` 固定事件，再检查滞留指标。避免在工单或日志中复制请求体与供应商原始错误。

真实 PostgreSQL 多副本压测、生产采集链路及告警投递仍需部署环境验证；正式 ATDD 在后续独立阶段执行。
