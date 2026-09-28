# 本地启动与开发验收记录（2026-09-28）

## 结论与范围

Windows 本机已启动 PostgreSQL 17、Redis、SeaweedFS S3、API、Worker 与 Expo Metro。真实 PostgreSQL 空库迁移 0001–0011 完成，API 就绪检查返回 `{"status":"ok"}`，Metro 状态返回 `packager-status:running`。本次 **10/10 项本地 HTTP 开发检查通过**，S3 读写检查通过；`pnpm check`、`pnpm mobile:bundle:check` 及视图、分享、社交、媒体开发自检通过。

这是开发阶段的运行与接口检查，`formalAtdd=false`。HTTP 检查项只覆盖其名称对应的部分 API 行为，不能等同于 [197 项正式 ATDD/BDD 矩阵](../../ATDD-BDD-计划打卡-iOS-v1-验收矩阵.md)通过。Windows 主机没有 iOS 模拟器、真机或 Xcode；未安装或打开 iOS App，未采集页面截图、无障碍树、视觉差异或原生权限证据。短信使用本地 stub。中国大陆预发部署、真实短信/APNs 和备份恢复演练也未执行。

## 环境与启动

| 服务 | 本地地址/状态 |
| --- | --- |
| API | `http://127.0.0.1:3000`，`/api/v1/health/ready` 为 `ok` |
| Expo Metro | `http://127.0.0.1:8081`，`/status` 为 `packager-status:running` |
| PostgreSQL 17 | `127.0.0.1:15432`，容器健康 |
| Redis | `127.0.0.1:16379`，容器健康 |
| SeaweedFS S3 | `127.0.0.1:19000`，`plan-checkin-local` 桶可读写 |
| Worker | 后台循环运行，日志中任务结果为 `success` |

环境配置取自忽略版本控制的本地 `.env`；仓库只保存 `.env.example`。独立机器需按 [部署与恢复手册](../../OPS-05-部署与恢复手册.md)生成自己的开发密钥与连接配置，再运行以下命令。后三个长时间运行的进程应分别放在终端中；Metro 仅提供开发包服务，需已安装的 iOS dev client 才能打开页面。

```powershell
pnpm infra:up
pnpm db:migrate:local
pnpm exec tsc -p apps/api/tsconfig.json
pnpm exec tsc -p apps/worker/tsconfig.json
node --env-file=.env apps/api/dist/main.js
node --env-file=.env apps/worker/dist/main.js
pnpm --dir apps/mobile exec expo start --dev-client --localhost --port 8081
```

## 检查与证据

| 检查 | 结果 | 可复查证据 |
| --- | --- | --- |
| `pnpm check` | 通过 | 本次运行终端输出；格式、Lint、strict 类型、设计资源、OpenAPI、基础设施、SQL、进度及安全静态校验 |
| `pnpm mobile:bundle:check` | 通过 | 本次运行终端输出；仅证明 iOS JS 可打包 |
| `pnpm infra:up`、`pnpm db:migrate:local` | 通过 | 容器健康状态、迁移记录及就绪接口 |
| `pnpm local:acceptance:http` | 10/10 通过 | [脱敏 HTTP 结果](./http.json)，含检查项、断言类别与请求 ID |
| `pnpm local:acceptance:object` | 通过 | [对象存储结果](./object.json)，含桶访问、字节一致性和清理请求 |
| `pnpm views:smoke`、`shares:smoke`、`social:smoke`、`media:smoke` | 通过 | 本次运行终端输出；开发自检 |

HTTP 脚本覆盖未登录拒绝、短信 stub 登录、计划规则无效/有效输入与幂等、打卡与陈旧版本冲突、今日/统计读取、签名照片上传和私有下载、删除后访问拒绝、登出及指标脱敏。对象脚本覆盖桶连通、原字节读写和清理请求。脚本在 `scripts/local-http-acceptance.mjs` 与 `scripts/local-object-smoke.mjs`，可以在相同环境复跑；JSON 中不保存验证码、令牌、照片内容或签名 URL。

## 本次启动发现并修复

1. 原对象存储镜像无法从本机拉取，本地 Compose 改用固定摘要的 SeaweedFS S3 镜像，并让端口可通过 `.env` 配置，避开主机已有服务端口。
2. 实际签名上传返回 `SignatureDoesNotMatch`：预签名 URL 已包含 SHA-256 参数，API 另行返回了重复的校验头。移除重复头后，真实 HTTP 上传、确认与私有下载通过。
3. `pg` 在事务中报告同一 client 的并行查询弃用警告。顺序执行相关查询后，复跑 10/10 HTTP 检查，API 错误日志为空。

## 后续正式验收条件

在 macOS/iOS 环境安装开发或 Release 构建，连接可访问的 API，按矩阵逐项生成统一证据包：结果 JSON、页面截图、iOS 无障碍树、脱敏网络/服务端日志及必要数据库快照。需要单独验证 SQLCipher、Keychain、相册、通知/APNs、离线与多设备冲突、真实短信、视觉对齐，以及媒体延迟物理清理；本次仅验证删除后获取下载 URL 被拒绝。`BLOCKED`/`NOT_RUN` 均不得记为正式验收通过。
