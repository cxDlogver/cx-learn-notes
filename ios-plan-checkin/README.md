# 计划打卡 iOS V1

React Native iOS 客户端、NestJS API、Worker 与共享领域规则的 pnpm 工作区。产品和构建范围见 [构建计划](docs/构建计划-计划打卡-iOS-v1.md)。

## 本地准备

- Node.js 22.13+（推荐 24 LTS）与 pnpm 11.25.0。
- 在本目录运行 `pnpm install`，再运行 `pnpm check`。
- 复制 `.env.example` 为 `.env`，仅在本机替换开发密钥；运行 `pnpm infra:up` 启动 PostgreSQL、Redis、对象存储，再运行 `pnpm db:migrate:local`。
- API：`pnpm --filter @plan-checkin/api dev`；移动端先复制 `apps/mobile/.env.example` 为 `apps/mobile/.env`，设置 `EXPO_PUBLIC_API_BASE_URL`，再运行 `pnpm --filter @plan-checkin/mobile start`。真机开发需填写电脑在局域网中可访问的地址；Release 必须配置 HTTPS API、服务协议与隐私政策地址。本地短信桩将验证码按用途写入被 Git 忽略的 `apps/api/.local/sms-outbox-<purpose>.json`，API 响应与日志不返回验证码。
- 开发自测：`pnpm test:unit`、`pnpm db:smoke`、`pnpm auth:smoke`、`pnpm records:smoke`、`pnpm views:smoke`、`pnpm mobile:architecture:smoke`。`pnpm mobile:bundle:check` 生成 iOS JS 静态包，输出到被 Git 忽略的 `apps/mobile/dist`；执行前在移动端 `.env` 设置 API 地址。`pnpm db:static:check` 使用 PostgreSQL 17 解析器检查 SQL，无需 Docker。
- iOS 原生构建需要 macOS/Xcode 或已配置的受控云构建环境。当前 Windows 主机可运行 TypeScript、Lint、格式与设计资源静态检查。

本仓库按 [任务台账](docs/build-progress.json)推进。开发自测与后续 [ATDD 验收](docs/ATDD-BDD-计划打卡-iOS-v1-验收矩阵.md)分开记录。
