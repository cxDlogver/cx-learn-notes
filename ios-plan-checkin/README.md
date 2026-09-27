# 计划打卡 iOS V1

React Native iOS 客户端、NestJS API、Worker 与共享领域规则的 pnpm 工作区。产品和构建范围见 [构建计划](docs/构建计划-计划打卡-iOS-v1.md)。

## 本地准备

- Node.js 22.13+（推荐 24 LTS）与 pnpm 11.25.0。
- 在本目录运行 `pnpm install`，再运行 `pnpm check`。
- API：`pnpm --filter @plan-checkin/api dev`；移动端：`pnpm --filter @plan-checkin/mobile start`。
- iOS 原生构建需要 macOS/Xcode 或已配置的受控云构建环境。当前 Windows 主机可运行 TypeScript、Lint、格式与设计资源静态检查。

本仓库按 [任务台账](docs/build-progress.json)推进。开发自测与后续 [ATDD 验收](docs/ATDD-BDD-计划打卡-iOS-v1-验收矩阵.md)分开记录。
