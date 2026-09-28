# OPS-05 部署、备份恢复与回滚

## 范围与前置条件

[`infra/deploy/manifest.mjs`](../infra/deploy/manifest.mjs) 生成开发、预发、生产隔离的 Kubernetes Namespace、专用 ServiceAccount、迁移 Job、API/Worker Deployment、ClusterIP Service、TLS Ingress 与 API HPA。生产配置以中国大陆单一区域 `cn-hangzhou` 为部署输入，API/Worker 各 2 副本，Pod 按可用区分散；具体云账号、Kubernetes 集群、两区节点、Ingress/WAF、托管 PostgreSQL、Redis、私有对象存储和供应商网络地址由部署环境提供。`cn-hangzhou` 是当前配置值，需在实际供应商账户核对服务可用区与数据驻留后冻结；本仓库尚无特定云厂商的资源账号，不能声称云资源已开通。

所有生产镜像必须以 `@sha256:` 摘要引用。API 和 Worker 使用同一源码镜像、不同入口；容器以非 root 运行，根文件系统只读，Kubernetes ServiceAccount token 禁止自动挂载。`public-waf` IngressClass、TLS Secret、指标采集与告警接收器必须先由集群平台提供。Ingress 不应绕过 WAF；`/internal/metrics` 只能由私网采集，须附 Bearer token。

## 密钥注入合同

由独立密钥服务/集群运维同步三个 **已存在** 的 Kubernetes Secret，脚本只检查键名和 TLS 证书是否存在，不读取或输出值：

| Secret | 注入对象 | 键 |
| --- | --- | --- |
| `plan-checkin-api` | API | `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, `PHONE_ENCRYPTION_KEY`, `PHONE_LOOKUP_KEY`, `OTP_HASH_KEY`, `AUTH_IDEMPOTENCY_KEY`, `PUSH_TOKEN_ENCRYPTION_KEY`, `OBJECT_ENDPOINT`, `OBJECT_PUBLIC_ENDPOINT`, `OBJECT_BUCKET`, `OBJECT_REGION`, `OBJECT_ACCESS_KEY_ID`, `OBJECT_SECRET_ACCESS_KEY`, `SMS_GATEWAY_URL`, `SMS_GATEWAY_TOKEN`, `API_METRICS_TOKEN` |
| `plan-checkin-worker` | Worker | `DATABASE_URL`, `PUSH_TOKEN_ENCRYPTION_KEY`, `OBJECT_ENDPOINT`, `OBJECT_BUCKET`, `OBJECT_REGION`, `OBJECT_ACCESS_KEY_ID`, `OBJECT_SECRET_ACCESS_KEY`, `APNS_BUNDLE_ID`, `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_PRIVATE_KEY_BASE64` |
| `plan-checkin-migration` | 迁移 Job | `DATABASE_URL` |

三环境 Secret 与数据库、对象 bucket 完全隔离。生产 Secret 不使用本地 `local_only_` 值；生产 `APP_ENV`、短信/APNs 环境由受版本控制的环境配置给定，业务密钥只在运行时注入。数据库连接使用专用角色和 TLS；迁移角色仅用于迁移 Job，API/Worker 使用最小业务权限。对象凭据分别限制 bucket 和操作范围，Worker 才有删除对象权限。实际 IAM/网络策略由选定云平台补充并在预发核验。

## 构建与发布顺序

1. 在项目根目录用 `infra/deploy/Dockerfile` 构建镜像并推送私有仓库；记录镜像的 **仓库摘要** 与 Git 40 位提交 SHA。构建执行锁文件固定安装及 contracts/domain/API/Worker 编译。运行 `pnpm check`、`pnpm db:smoke`、`pnpm infra:check`。
2. 核对 `db/migrations/manifest.json`：现有迁移均为 `expand`，新迁移先扩展兼容字段，不能在仍有旧服务或旧客户端时移除字段。发布前保存 PostgreSQL 一致性备份、对象存储版本点及独立删除墓碑文件，并确认恢复材料位于隔离存储。
3. 先在预发渲染并审阅无密钥部署清单：

   `node scripts/deploy.mjs --environment staging --context <kube-context> --image <registry/image@sha256:digest> --release <git-sha> --host <api-domain> --tls-secret <secret-name> --mode render`

4. 用相同参数改 `--mode deploy`。脚本创建 Namespace/ServiceAccount，核对密钥键、TLS 与两区节点，等待迁移 Job 成功，再滚动 API/Worker 并等待 rollout。迁移脚本有数据库 advisory lock 和 SQL 哈希校验，同一提交重试不重复应用。失败时停止发布并保留旧服务流量；Job 失败先查迁移状态，不直接反向执行 SQL。
5. 预发核对 readiness、`/internal/metrics`、短信/APNs 沙箱、私有对象读写/删除、账号注销重试、备份恢复；再按相同步骤发布生产。iOS 客户端随后通过 TestFlight 分组逐步放量，观察 5xx、P95/P99、同步冲突和 Worker/删除告警。客户端版本须与 OpenAPI 兼容基线一致。

开发环境可使用本地 Compose；真实 Kubernetes 发布需要 `kubectl`、仓库镜像、集群上下文和已建立的 Secret，当前 Windows 环境未执行。

## 回滚与灰度

服务端回滚使用上一已验证镜像摘要与对应 Git SHA，命令参数保持目标环境/Host/TLS 不变，`--mode rollback` 只恢复 API/Worker 镜像，不重跑迁移。迁移设计必须向前兼容旧版服务；若旧版不兼容，先做新的向前修复迁移，禁止直接降库。回滚后检查两个 Deployment 的 rollout、就绪端点、写请求、同步和 Worker 队列。手机端灰度由 TestFlight 分组停止放量或回退已批准构建；数据库事实与本地离线队列不可通过卸载客户端处理。

## 备份和恢复门槛

生产 PostgreSQL 应执行定时一致性备份及 WAL 归档，私有对象存储启用版本化和跨可用区冗余；业务数据库、照片/ZIP 与删除墓碑保留在独立权限域。备份计划须给出实际频率、保留期、加密方式、访问审计与定期恢复演练记录。墓碑文件在每次业务备份后、删除完成后增量导出并单独保存，保留期覆盖所有仍可恢复的业务/对象快照；当前墓碑 365 天保留，业务/对象快照不得长于可用墓碑覆盖期。

恢复流程必须在隔离环境演练并留下备份时间、数据库/对象版本、迁移版本、墓碑文件 SHA-256 和检查结果：

1. 阻断公网业务流量，暂停 API/Worker，选取匹配的 PostgreSQL 与对象版本点；保留原环境 `PHONE_LOOKUP_KEY` 和墓碑签名密钥。
2. 恢复数据库和对象到隔离目标，确认迁移版本与目标镜像兼容；运行 `pnpm deletion:tombstones:apply` 回放签名墓碑。签名失败立即停止。
3. 在恢复目标运行 Worker 直到到期删除与对象清理完成；执行 `pnpm deletion:tombstones:check`。检查失败不得开放 API。
4. 启动 API/Worker，核对就绪、备份样本、授权边界、照片私有性、导出与注销残留；监控稳定后切换流量。记录恢复耗时和数据时间点，供 RPO/RTO 与实际服务目标核对。

墓碑命令及“同手机号重新注册不得误删”的判定见 [OPS-03 删除与墓碑流程](./OPS-03-删除与墓碑流程.md)。真实备份恢复、IAM/WAF/对象配置和预发部署属于环境验证；本阶段的静态通过不代表它们已完成。
