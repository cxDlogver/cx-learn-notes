# OPS-06 源码候选与独立验收移交

## 当前结论

本仓库已实现构建计划所列前 34 项源码任务，并以 [开发进度台账](./build-progress.json)逐项记录静态检查、提交与待环境验证条件。当前可交付 **源码冻结候选**，不能标记为已安装的 iOS Release 候选版：Windows 主机缺少 iOS 原生构建/真机、真实 PostgreSQL/对象服务和中国大陆预发集群。正式 ATDD/BDD 场景验收尚未开始，不填写通过结果。

## 冻结清单

运行 `pnpm candidate:write` 会生成 [机器可读资源清单](./release-candidate.json)：源码 Git 提交、App 版本、最后迁移、OpenAPI 操作数、32 页组件映射、PRD/技术/UIUX/ATDD/构建计划、Pen 与 PNG 图、锁文件、部署文件及各 SQL 的 SHA-256。`pnpm candidate:check` 校验这些文件未变。清单中的 `nativeIosRelease`、`apiWorkerImage`、`deploymentAndRecovery` 和 `formalAtdd` 保持 PENDING/NOT_RUN，直到有可核对的实际产物或证据；不能以 JS 打包或内存 PostgreSQL 自检替代。

| 交付项 | 位置与核对方式 |
| --- | --- |
| 源码与依赖 | Git commit、`pnpm-lock.yaml`、`package.json`；`pnpm check`、`pnpm mobile:bundle:check` |
| API 契约 | `packages/contracts/openapi.json`、`pnpm contracts:check`、兼容记录 |
| 数据库 | `db/migrations/manifest.json`、0011 及以前 SQL；`pnpm db:static:check`、`pnpm db:smoke` |
| 视觉资源 | `docs/ui/plan-checkin.pen`、节点树、页面映射、组件映射和 32 张参考图；`pnpm design:check` |
| 部署与恢复 | `infra/deploy/`、`scripts/deploy.mjs`、`infra/observability/alerts.yml`、OPS-03/04/05 手册；`pnpm infra:check` |
| 任务状态 | `docs/build-progress.json`；`pnpm progress:show`、`pnpm progress:check` |

## 环境补验与候选成品

1. 在 macOS/Xcode 或已配置的 EAS 账号完成 iOS Release 构建，记录 IPA/构建 ID、签名与 SHA-256，真机验证 SQLCipher、Keychain、APNs、相册、通知和启动主链路。
2. 在预发部署真实 PostgreSQL、对象存储、短信和 APNs 沙箱及两区节点，执行空库/升级库迁移、备份恢复、墓碑回放、权限/并发/速率限制与告警投递演练，记录 API/Worker 镜像摘要、数据库迁移版本和环境标识。
3. 有实际可安装构建和可访问验收环境后，更新候选清单的 PENDING 项并封存种子数据、版本与限制清单；再由独立团队按 [ATDD/BDD 验收矩阵](./ATDD-BDD-计划打卡-iOS-v1-验收矩阵.md)执行场景、操作、功能/视觉/反向断言及统一证据包。未通过项回到对应开发任务修复并重新生成候选。

这些步骤属于环境补验与后续独立验收，不通过修改台账状态来代替。当前源码候选清单使接手者能检查文件版本并继续完成剩余条件。
