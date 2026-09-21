# Browser Monitor Platform

Browser Monitor Platform 接收 `cx-browser-monitor-sdk` 的协议 2.0 数据，通过事务 Outbox 完成可靠投影和指标计算，并提供 React 可视化看板。

## 本地启动

1. 在仓库根目录运行 `pnpm install`。
2. 复制 `browser-monitor-platform/.env.example` 为 `.env`，生产环境必须替换其中的密钥。
3. 启动平台：

   ```bash
   docker compose --profile dev -f browser-monitor-platform/infra/docker-compose.yml up --build
   ```

4. 打开 `http://localhost:8080` 注册账号；开发邮件可在 `http://localhost:8025` 查看。
5. 创建项目，配置业务应用的 Origin，并复制项目页面生成的 SDK DSN。

## 服务边界

- `apps/api`：注册登录、项目权限、采集、分析查询和健康检查。
- `apps/worker`：Outbox 领取、性能样本 sequence 去重、服务端评级、View 结算和死信。
- `apps/web`：项目管理和性能可视化。
- `packages/database`：Drizzle 模型、TimescaleDB migration 和聚合策略。
- `packages/shared`：配置、密码/令牌、隐私处理和指标阈值。

## 关键接口

- `POST /api/v2/ingest/:publicKey/envelopes`：协议 2.0 批量采集。
- `GET /api/v1/projects/:projectId/analytics/overview`：项目总览。
- `GET /api/v1/projects/:projectId/analytics/performance`：性能趋势。
- `GET /api/v1/projects/:projectId/analytics/routes`：页面排名。
- `GET /api/v1/projects/:projectId/analytics/raw-events`：游标分页的原始事件。
- `GET /health/live`、`GET /health/ready`：存活和就绪检查。
- `GET /internal/metrics`：Prometheus 指标。

管理接口通过 HttpOnly Session Cookie 鉴权，写操作还必须携带 `x-csrf-token`。采集 DSN 中的写入键是公开标识，不是管理凭据；服务端仍会执行 Origin 白名单、项目/IP 限流、协议校验和配额控制。

## 数据保留与性能

- 原始事件和明细投影保留 30 天。
- 分钟连续聚合保留 180 天。
- 小时连续聚合用于 30～180 天的查询，避免长期看板扫描分钟明细。
- 看板默认每 15 秒刷新。
- `load/k6-ingestion.js` 用于验证持续 500 events/s 和峰值 2000 events/s。容量测试使用 `infra/docker-compose.load.yml` 单独放宽测试配额，生产默认限流不会被静默放大。

```bash
docker compose \
  --profile dev \
  -f browser-monitor-platform/infra/docker-compose.yml \
  -f browser-monitor-platform/infra/docker-compose.load.yml \
  up --build

MONITOR_DSN=http://localhost:8080/api/v2/ingest/bm_pk_xxx/envelopes \
MONITOR_ORIGIN=http://localhost:8080 \
MONITOR_APP_NAME=load-test \
k6 run browser-monitor-platform/load/k6-ingestion.js
```

## 开发检查

```bash
pnpm --filter @browser-monitor/platform typecheck
pnpm --filter @browser-monitor/platform test
pnpm --filter @browser-monitor/platform build
```
