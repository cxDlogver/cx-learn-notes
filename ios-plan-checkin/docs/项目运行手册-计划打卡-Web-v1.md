# 计划打卡 Web V1 项目运行手册

## 1. 范围与当前状态

本手册对应仓库中的 React Web、NestJS API、后台 Worker、PostgreSQL、Redis 和 S3 兼容对象存储。Web 从同一个 HTTPS 域名获取页面及 `/api/v1` 接口；照片由浏览器按短时签名 URL 直传对象域。生产入口由 [Kubernetes 清单](../infra/deploy/manifest.mjs)生成，Web 静态服务源码位于 [`apps/web/server.mjs`](../apps/web/server.mjs)。

本机当前已切到局域网开发模式。**2026-10-02 的 WLAN 入口为 [`https://172.27.69.153:5173/`](https://172.27.69.153:5173/)**；地址会随 WLAN IPv4 变化，以本节启动脚本输出的 `LAN_URL` 为准。Vite 同域代理 `/api/v1` 和对象 bucket 路径到本机服务；无需公网域名或修改 hosts 文件。

源码和部署清单已在本机构建/渲染。2026-09-29 当前工作机的 `kubectl` 上下文为空，镜像未推送仓库，尚无正式域名/TLS 与对象域配置；**没有执行真实集群部署**。实施与验收状态见 [Web 执行计划](./任务执行计划-计划打卡-Web-v1.md) 和 [WEB-22 增量记录](./atdd/web/WEB-22-Web静态站部署增量记录.md)。

## 2. 本地开发

前置：Node.js `>=22.13.0`、pnpm `11.25.0`、Docker Desktop、PowerShell 7 和 OpenSSL。以下命令均在仓库根目录执行。

```powershell
corepack enable
pnpm install --frozen-lockfile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

`.env` 只用于本机。检查 `DATABASE_URL`、`REDIS_URL` 和 `OBJECT_ENDPOINT` 与 Compose 端口一致；当前局域网模式的 `WEB_ORIGIN`、`OBJECT_PUBLIC_ENDPOINT` 与对象允许来源由启动脚本按 WLAN IP 同步。为不同密钥配置独立随机值；不要把 `.env` 提交到仓库。短信与 APNs 的 `stub` 配置仅供开发。若已存在 `.env`，保留原值并只修改所需配置，避免覆盖本地数据库端口与密钥。

依赖安装完毕后，在 PowerShell 7 中执行 `-Build`，按依赖顺序构建并启动；日常重新启动只需不带参数，源码变更后再次使用 `-Build`。脚本会从已安装的 Node 中选择满足 `>=22.13.0` 的最高版本，检测 WLAN IPv4、备份并更新本机 `.env`、必要时轮换开发证书、启动 Docker 依赖、执行迁移，并以隐藏窗口启动或复用 API、Worker、Web 进程。只想重启三个应用进程且不重建时加 `-Restart`：

```powershell
pwsh -NoProfile -File .\scripts\start-lan.ps1 -Build
pwsh -NoProfile -File .\scripts\start-lan.ps1
pwsh -NoProfile -File .\scripts\start-lan.ps1 -Restart
```

默认网卡名为 `WLAN`；其他网卡可传 `-InterfaceAlias '<网卡名>'`。脚本会检查既有防火墙规则的范围，但不会自行新增或扩大规则。若缺失，它会警告远端可能无法连接。`-Build` 直接使用已安装在仓库 `node_modules` 的 TypeScript/Vite，因而本机旧 Corepack 的 `pnpm` 命令失败时仍可重建；首次安装依赖仍需要可用的 pnpm。当前机器系统 PATH 上的 Node 是 22.12.0，脚本已验证自动选择本机 Node 24.19.0 完成构建及启动。

如需分别在终端前台运行，可用以下手动方式；三个长期运行的进程分别占用终端：

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

浏览器打开启动脚本输出的 `LAN_URL`。Vite 将 `/api/v1` 代理到 `http://127.0.0.1:3000`，并把 `OBJECT_BUCKET` 对应的路径代理到 `OBJECT_ENDPOINT`，因此照片签名 URL 与页面同源。可在**同一台要使用的设备**打开 `LAN_URL` 后附加 `/api/v1/health/live` 检查同域 API。断网时 Web 不提供离线写入。当前 `.env` 使用 `SMS_PROVIDER=stub`，**不会向手机发送短信**；最近一次登录验证码仅写入运行 API 的电脑上的 `apps/api/.local/sms-outbox-login.json`，有效期 5 分钟，重发会覆盖该文件。只在本机查看该文件，不要将验证码写入验收证据或应用日志。要真实发送短信，需配置 `SMS_PROVIDER=http` 和有效的 `SMS_GATEWAY_URL`、`SMS_GATEWAY_TOKEN`，重启 API 并验证网关交付。

已构建源码时，也可分别在三个终端从仓库根目录启动：`node --env-file=.env apps/api/dist/main.js`、`node --env-file=.env apps/worker/dist/main.js`，以及在 `apps/web` 目录执行 `pnpm dev`。源码变更后先重新构建 API/Worker。2026-09-30 本机启动记录见 [WEB-22 本地证据](./atdd/web/evidence/WEB-22-localhost-start.txt)；其中的进程 ID 只对应当次运行。

### 当前局域网 HTTPS 模式

- Web 监听 `0.0.0.0:5173`；API 在当前 `.env` 中设置 `API_HOST=127.0.0.1`，数据库、Redis 和对象存储也只绑定回环地址。局域网设备只需要访问 Web 入口。服务器和手机必须处于可互访的局域网；主机防火墙需允许 TCP 5173 的入站访问。
- 2026-09-30 用户已授权并通过 Windows 管理员确认创建入站规则 `Plan Checkin Web LAN 5173`。已复查该规则启用，方向为 Inbound，动作 Allow，范围仅 **Private 网络、本地子网、TCP 5173**。换机重建环境时，可在管理员 PowerShell 执行：`New-NetFirewallRule -DisplayName 'Plan Checkin Web LAN 5173' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Private -RemoteAddress LocalSubnet`；现有主机无需重复创建。实体手机/电脑访问仍需单独确认。
- `apps/api/.local/lan-dev-cert.pem` 与 `lan-dev-key.pem` 是当前自签开发证书，SAN 包含 `172.27.69.153`；当前证书到期于 **2026-11-01 23:19 CST**，以后以证书实际期限为准。私钥在 Git 忽略目录，不要发送给其他设备。其他设备首次访问会遇到证书信任提示；若要使用浏览器通知等安全上下文能力，需在设备上信任**公用证书**或改用受信任的证书颁发方式，不能只忽略证书警告。
- WLAN IP 变化时重新运行 `scripts/start-lan.ps1`。它会更新 `.env` 的 `WEB_ORIGIN`、`OBJECT_PUBLIC_ENDPOINT` 和 `PLAN_CHECKIN_OBJECT_ALLOWED_ORIGINS`，必要时重新生成含新 IP 的证书，重启 API、Worker、Web，并让 Compose 按新允许来源更新对象存储容器（数据卷保留）。不要将 Web 来源设为局域网 HTTP：现有鉴权要求非 loopback 来源使用 HTTPS。
- 本机最小检查见 [局域网启动证据](./atdd/web/evidence/WEB-22-lan-https-start.txt)。如需单独核对照片签名代理，在开发环境执行 `node --env-file=.env scripts/lan-object-smoke.mjs`；脚本创建并删除一个短期测试对象，不输出签名 URL。正式浏览器登录、Push 和远端设备适配仍按 Web ATDD 另外验收。

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
| 局域网网页提示无法连接服务 | 在**同一设备**打开本次 `LAN_URL` 后附加 `/api/v1/health/live`：若打不开，检查 WLAN 互访、当前 IP、Private/LocalSubnet 防火墙规则与开发证书信任；若返回 JSON，刷新网页再试，并核对浏览器是否仍使用旧脚本。浏览器是否有互联网不能代替同源 API 检查 |
| 手机收不到验证码 | 检查本机 `.env` 的 `SMS_PROVIDER`。`stub` 只写入本机 `apps/api/.local/sms-outbox-login.json`，不向手机发送；真实短信需配置 HTTP 网关凭据并验证投递 |
| `pnpm` 提示 Corepack 签名错误 | 当前机器旧 Corepack 的 shim 无法引导仓库声明的 pnpm；已安装依赖时使用 `pwsh -NoProfile -File .\scripts\start-lan.ps1 -Build`，全新安装前需修复本机 Node/Corepack/pnpm 工具链 |
| 深链刷新 404 | Ingress `/` 后端是否为 Web、静态服务是否获得 `Accept: text/html`；`/api/v1` 必须仍走 API |
| 登录后立即失效 | API `WEB_ORIGIN`、Cookie Secure/SameSite、HTTPS、CSRF、系统时间与 15 分钟 access/30 天 refresh 会话 |
| 照片上传被拒绝 | 签名 URL 的实际来源、对象 CORS、短时签名到期、CSP `connect-src` 的对象来源 |
| Push 未出现 | Web 授权、订阅状态、VAPID 公私钥、Worker 队列；关闭页面后的稳定送达不是首版阻断条件 |
| 发布中断 | 迁移 Job、三组 Deployment rollout、Ingress 是否尚未切换；保留现场并按上一摘要回滚 |

故障日志和截图只保存脱敏内容，不记录短信验证码、访问/刷新令牌、照片正文或私人备注。发布执行人把每次命令、版本摘要、环境、结果和证据路径写入 WEB-22 增量记录。


## 2026-10-03 样式来源与开发构建补充

所有设备共用最大480px移动式居中界面。样式来源、映射、拆页和业务差异见 [Web样式对齐说明](./ui/Web样式对齐说明.md)。修改Pen/结构化映射后运行 `pnpm design:build`，构建前运行 `pnpm design:check`；生成CSS与文案不手动维护。开发服务器会通过HMR读取源码改动；生产环境需要重新构建/发布静态产物。

Noto Sans SC完整字体约7.79MB，首次访问下载后按静态指纹缓存；本机自托管，不调用外部字体服务。许可地址为 `/font-license.txt`。截图需等待字体加载。局域网入口仍以 `scripts/start-lan.ps1` 输出为准；本次未变更端口、防火墙、证书信任或验证码安全限制。
