# 计划打卡 Web V1 项目运行手册

## 1. 范围与当前状态

本手册对应仓库中的 React Web、NestJS API、后台 Worker、PostgreSQL、Redis 和 S3 兼容对象存储。Web 从同一个 HTTPS 域名获取页面及 `/api/v1` 接口；照片由浏览器按短时签名 URL 直传对象域。生产入口由 [Kubernetes 清单](../infra/deploy/manifest.mjs)生成，Web 静态服务源码位于 [`apps/web/server.mjs`](../apps/web/server.mjs)。

源码和部署清单已在本机构建/渲染。2026-09-29 当前工作机的 `kubectl` 上下文为空，镜像未推送仓库，尚无正式域名/TLS 与对象域配置；**没有执行真实集群部署**。实施与验收状态见 [Web 执行计划](./任务执行计划-计划打卡-Web-v1.md) 和 [WEB-22 增量记录](./atdd/web/WEB-22-Web静态站部署增量记录.md)。

## 2. 本地开发

前置：Node.js `>=22.13.0`、pnpm `11.25.0`、可运行的 Docker。以下命令均在仓库根目录执行；三个长期运行的进程分别占用终端。

```powershell
corepack enable
pnpm install --frozen-lockfile
Copy-Item .env.example .env
```

`.env` 只用于本机。检查 `DATABASE_URL`、`REDIS_URL`、`OBJECT_ENDPOINT`、`OBJECT_PUBLIC_ENDPOINT` 与 Compose 端口一致；如果浏览器使用 `http://127.0.0.1:5173`，将 `WEB_ORIGIN` 设为该地址，并将对象存储允许来源包含该地址。为不同密钥配置独立随机值；不要把 `.env` 提交到仓库。短信与 APNs 的 `stub` 配置仅供开发。

```powershell
pnpm infra:up
pnpm db:migrate:local
pnpm --filter @plan-checkin/api dev
```

另开两个终端：

```powershell
pnpm --filter @plan-checkin/worker exec node --env-file=../../.env --import tsx --watch src/main.ts
pnpm --filter @plan-checkin/web dev
```

浏览器打开 `http://127.0.0.1:5173`。Vite 将 `/api/v1` 代理到 `http://127.0.0.1:3000`；如 API 使用不同端口，设置 `WEB_API_PROXY_TARGET` 后再启动 Web。断网时 Web 不提供离线写入。首次本地注册需要可用短信桩/网关和对应调试流程，不能把任意验证码当作真实短信结果。

停止服务时先结束三个开发进程；需要停止本地容器时运行 `pnpm infra:down`。此命令不删除 Docker 卷。

## 3. 本地代码检查与静态预览

```powershell
pnpm check
pnpm web:build
pnpm web:static:smoke
python docs/atdd/web/check_execution_progress.py
```

`web:static:smoke` 使用已生成的 `apps/web/dist`，检查深链、API 路由隔离、CSP 和缓存头；它不连接真实 API。独立静态服务运行时需设置 `WEB_OBJECT_ORIGIN` 为**完整 HTTPS 来源**，例如 `https://objects.example.cn`（无路径和末尾斜杠）；该值用于 CSP，必须与对象签名 URL 的来源一致。开发时上传到本机 HTTP 对象存储请使用 Vite 开发服务，而不是把 HTTP 对象域填入生产静态服务。

## 4. 预发/生产发布准备

先准备三个环境独立的数据库、对象 bucket、短信网关、Web/API 域名、TLS Secret、Ingress/WAF、镜像仓库和 Kubernetes 上下文。`WEB_ORIGIN`（API Secret）必须等于 `https://<host>`；API 的 `OBJECT_PUBLIC_ENDPOINT` 必须与 `--object-origin` 的来源一致。对象域 CORS 允许该 Web 来源的 `PUT`、`GET`、`HEAD` 及签名实际使用的请求头，私有对象不能开放永久公链。Web Push 需要 API 公钥、Worker 私钥和有效订阅；关闭页面后的稳定送达仍只做观察。

服务密钥清单、数据库备份与迁移顺序见 [OPS-05](./OPS-05-部署与恢复手册.md)。发布前保存上一版 API/Worker 与 Web **仓库摘要**、40 位 Git 提交、数据库备份、对象版本点及删除墓碑。`--image` 与 `--web-image` 都必须使用 `@sha256:` 摘要，不能填标签。生产环境要求 API/Worker/Web 各至少两个副本。

构建并推送两个独立镜像：

```powershell
docker build -f infra/deploy/Dockerfile -t <registry>/plan-checkin/app:<release> .
docker build -f infra/deploy/Web.Dockerfile -t <registry>/plan-checkin/web:<release> .
docker push <registry>/plan-checkin/app:<release>
docker push <registry>/plan-checkin/web:<release>
```

从镜像仓库取得实际 `RepoDigests` 并记录；本地标签或构建成功信息不等于可部署摘要。预发先渲染清单并检查 Namespace、TLS Host、`/api/v1`→API、`/`→Web、对象 HTTPS 来源、Web 副本和资源限制：

```powershell
node scripts/deploy.mjs --environment staging --context <context> --image <app@sha256:digest> --web-image <web@sha256:digest> --release <40位GitSHA> --host <app.example.cn> --tls-secret <secret-name> --object-origin <https://objects.example.cn> --mode render
```

审阅通过后仅将 `--mode render` 改为 `--mode deploy`。脚本检查 Secret 键、TLS 和生产双可用区，先完成迁移 Job，再应用 Web/API/Worker 工作负载并等待三者 rollout，最后更新 Ingress 路由。首次接入 Web 前务必核对原 `/` API 流量是否存在客户端依赖；`/api/v1` 仍定向 API。不能跳过失败的迁移或 Web 就绪检查直接改 Ingress。

## 5. 发布后检查与回滚

在目标域名上核对 `GET /healthz`、`GET /api/v1/health/live`、首页和深链；确认首页 `Content-Security-Policy`、`Cache-Control: no-store`，指纹资源为长期 immutable 缓存，API 私人响应不缓存。检查短信登录、计划读取/写入、对象直传、导出与注销、受控浏览器 Web Push，并记录响应、截图、版本和时间。正式浏览器矩阵与 136 项验收结果仍按 Web ATDD 单独执行，静态检查不代替发布门槛。

回滚时传入上一版 API/Worker 和 Web 摘要及其对应 Git SHA，把 `--mode` 改为 `rollback`；其余环境、上下文、Host、TLS 和对象域参数保持对应版本的真实值。回滚不反向执行数据库迁移。脚本先让旧版三组工作负载就绪，再应用对应 Ingress；完成后复查 API、Web 深链、对象访问和 Worker 队列。迁移若与旧版不兼容，应先做向前修复迁移，不能直接降库。

## 6. 常见故障定位

| 现象 | 首先检查 |
| --- | --- |
| Web `/healthz` 失败 | Web Pod 日志、`WEB_OBJECT_ORIGIN` 是否为 HTTPS 来源、端口 8080、readiness 与镜像摘要 |
| 深链刷新 404 | Ingress `/` 后端是否为 Web、静态服务是否获得 `Accept: text/html`；`/api/v1` 必须仍走 API |
| 登录后立即失效 | API `WEB_ORIGIN`、Cookie Secure/SameSite、HTTPS、CSRF、系统时间与 15 分钟 access/30 天 refresh 会话 |
| 照片上传被拒绝 | 签名 URL 的实际来源、对象 CORS、短时签名到期、CSP `connect-src` 的对象来源 |
| Push 未出现 | Web 授权、订阅状态、VAPID 公私钥、Worker 队列；关闭页面后的稳定送达不是首版阻断条件 |
| 发布中断 | 迁移 Job、三组 Deployment rollout、Ingress 是否尚未切换；保留现场并按上一摘要回滚 |

故障日志和截图只保存脱敏内容，不记录短信验证码、访问/刷新令牌、照片正文或私人备注。发布执行人把每次命令、版本摘要、环境、结果和证据路径写入 WEB-22 增量记录。
