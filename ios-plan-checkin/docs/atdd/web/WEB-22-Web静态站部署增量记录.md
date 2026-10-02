# WEB-22｜Web 静态站部署增量记录

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`，执行计划 `[ ]`；仅提前开发部署代码，发布验收依赖 WEB-21 |
| 依据 | Web 技术方案 §部署与安全、Web ATDD `WEB-SEC-05/06/12`、执行计划 WEB-22 |

## 2026-09-29 20:24 CST｜编码前静态审计

- `apps/web` 只有 Vite 构建和本地预览；部署清单只给 API/Worker，并把 `/` 全部路由到 API。当前代码无法从同站点 HTTPS 入口交付 Web SPA，也没有 Web HTML 的 CSP、静态资源缓存策略与独立回滚镜像。
- 先实现只读 Web 静态服务、独立镜像和同站点 Ingress `/api/v1` 与 `/` 路由，显式配置对象存储公共来源。保留 API/Worker 镜像参数和旧接口，静态检查审计新增配置。发布所需真实镜像摘要、TLS、对象 CORS、回滚和浏览器矩阵尚未取得；任务不勾选。
- 依用户“代码与功能优先”的最新排序，先写可审查的部署代码；WEB-21 正式浏览器验收与 WEB-22 真实环境验收仍后置，任何安全用例不凭静态代码标 `PASS`。

## 2026-09-29 20:30 CST｜静态服务与镜像代码

- 新增 `apps/web/server.mjs`，提供 SPA 深链回退、`/healthz`、只读文件交付；对 `/api` 和不存在的静态资源返回 404，不让 HTML 回退吞掉 API 请求。HTML/Service Worker 不缓存，带指纹的 `/assets/` 长缓存；设置 CSP、HSTS、`nosniff`、防嵌入、Referrer 与 Permissions Policy。对象存储公共 HTTPS 来源从 `WEB_OBJECT_ORIGIN` 显式注入，未配置时服务启动失败。
- 新增 `infra/deploy/Web.Dockerfile` 与 `apps/web` 的 `serve` 脚本，为 Web 提供独立构建镜像。基础镜像构建/推送和实际摘要仍待发布环境完成。
- 新增单次静态服务冒烟，检查首页、深链、API 隔离、指纹资源缓存和安全响应头；[原始输出](./evidence/WEB-22-static-smoke.txt) SHA-256 `f7ddead8252a9cdea0b227c4f4a093c0e194230e443b34f48132589ea527c057`。初轮 ESLint 发现脚本全局符号与正则转义问题，修正后定向 ESLint 与冒烟均退出 0。
- 自动审批拒绝修改 `infra/deploy/manifest.mjs`，理由为新增 Web Deployment 并改变生产 `/` Ingress 路由可能中断现有入口。该文件、`scripts/deploy.mjs` 均未修改；部署静态检查仍针对原 API/Worker 清单通过。已向用户请求该具体变更的授权。直到明确授权前，Web 镜像无法通过当前清单投入同站点入口。
- WEB-22 继续 `[ ]`；真实 TLS、对象 CORS、容器运行、回滚及浏览器矩阵未执行，`WEB-SEC-05/06/12` 不标 `PASS`。

## 2026-09-29 20:33 CST｜项目静态门禁

- `npm run check` 退出 0，覆盖格式、lint、全包 TypeScript、87 路由契约、兼容、已有部署清单、数据库和安全静态扫描。[原始输出](./evidence/WEB-22-project-check.txt) SHA-256 `408a0dea4885de8ebd785745c1225e08d0e813462ddf9d886660e8e95e57bf4a`。
- 门禁检查的部署清单仍是 API/Worker 旧版；它不证明 Web 已接入同站点生产入口，也不替代真实浏览器或生产环境验收。

## 2026-09-29 20:38 CST｜用户授权后的部署清单开发

- 用户明确同意部署，并要求撰写项目运行手册。现开始修改 Kubernetes Web Deployment/Service、同站点 Ingress 和发布/回滚脚本；先让 Web、API、Worker 全部就绪，再切换入口规则，减少首次接入时无后端端点的窗口。
- 本节仅记录授权和编码起点。实际集群部署需真实镜像摘要、域名、TLS Secret、对象域及 `kubectl` 上下文；执行结果随后写入本记录，不凭源码改动宣称上线。

## 2026-09-29 20:51 CST｜清单、镜像与运行手册结果

- `infra/deploy/manifest.mjs` 现生成 Web Deployment/Service，生产 Web 至少 2 副本；同一个 TLS Ingress 按 `/api/v1`→API、`/`→Web 路由。Web 只接收公开的 `WEB_OBJECT_ORIGIN`，无业务 Secret；镜像需独立 sha256 摘要。`scripts/deploy.mjs` 增加 `--web-image`、`--object-origin`；先等 API/Worker/Web rollout，再应用 Ingress。回滚不重跑迁移。
- `infra/deploy/Web.Dockerfile` 已在全新容器构建中先编译 contracts/domain/design-tokens，再构建 Web。新增 [项目运行手册](../../项目运行手册-计划打卡-Web-v1.md)，同步更新 [OPS-05](../../OPS-05-部署与恢复手册.md)，覆盖本地运行、镜像构建、预发渲染、发布顺序、回滚和故障定位。
- [部署静态检查](./evidence/WEB-22-deployment-static.txt)退出 0，SHA-256 `7f786942784518d6f95a2d3515aa37e4ef39771b5c577efe003f475dbac9c175`；[预发示例清单](./evidence/WEB-22-staging-render.json) SHA-256 `6e82b4db9d152096ba7a8a137424cbfab337fa77b8bec59a610dc42e70d96b3a`，包含三组 Deployment 与预期路由。
- [Web 镜像构建原始输出](./evidence/WEB-22-web-image-build.txt)退出 0，SHA-256 `d5edbac181eeb3d3cbd3397b5a563f192a4f05ca67b0591330d57a2602f42a24`；本机镜像 `plan-checkin-web:local` 在临时容器中启动，`/healthz` 与首页均 200，CSP 存在。[容器观察记录](./evidence/WEB-22-container-observation.txt) SHA-256 `4c18174eb8a4c61e9df4d95a8f3bd2a1215e89c18f4699a6c06ad1ef0fa21d1b`。
- [完整项目静态门禁](./evidence/WEB-22-authorized-project-check.txt)退出 0，SHA-256 `1c3e67d4a4e705d39e48a29b5a67f1dccb8067d5effb24c92855c78d6419fe28`。没有运行 136 项正式浏览器矩阵。
- [发布前置记录](./evidence/WEB-22-deploy-prereqs.txt) SHA-256 `bbdf810d1dcd54aa858c5e435c93f03df162902a16f388d847782b7162981ea4`：本机 `kubectl` 上下文为空；镜像未推送到仓库，缺少可部署的仓库摘要、正式 Host/TLS 和对象域。因而**没有执行真实 Kubernetes 部署**，WEB-22 仍 `[ ]`，WEB-21 未开始；Web 功能、安全与发布用例没有据此改为 `PASS`。

## 2026-09-30 10:09 CST｜默认 localhost 本地启动

- 应用户要求，把 Vite 开发/预览默认 host 设为 `localhost`；当前 `.env` 增加 `WEB_ORIGIN=http://localhost:5173`，未覆盖其他本地端口或密钥。该文件被忽略，未作为证据复制。
- 沿用已有对象存储容器，启动 PostgreSQL、Redis；本地数据库应用 `0012_web_compatibility.sql` 与 `0013_web_push_delivery.sql`。API/Worker 构建并在后台运行，Web 从 `apps/web` 工作目录启动。首次 Web 进程因工作目录误设为仓库根而返回 404，调整后首页、`/plans`、同域 API 代理与 API ready 全部返回 200。
- [本地启动原始观察](./evidence/WEB-22-localhost-start.txt) SHA-256 `308a4f11680cdbcb1341c979c5adc11f368dcf4716397ca3358cbaa86e962b52`；Web TypeScript 与生产构建也退出 0。运行手册已把 `http://localhost:5173/` 写成默认地址，并明确 `.env` 已存在时不覆盖。
- 本次只验证服务启动和 HTTP 健康，不执行登录、业务流程、浏览器截图或正式用例；136 项验收状态仍不变，WEB-22 保持 `[ ]`。

## 2026-09-30 10:20 CST｜局域网入口编码前审计

- 用户要求改为局域网链接。当前 WLAN IPv4 为 `172.27.117.5`，但 `WEB_ORIGIN` 仍为 localhost，Vite 也只绑定 localhost；直接使用局域网 HTTP 会被 API `WEB_ORIGIN` HTTPS 校验拒绝，安全 Cookie 无法形成可靠会话。
- 本地对象存储只监听回环地址，浏览器不能从其他设备访问其签名 URL。计划让局域网设备通过 Web HTTPS 入口访问，开发代理把同源 `/api/v1` 和对象 bucket 路径分别转发到本机 API 与对象存储；数据库、Redis 和对象存储端口保持仅本机可达。
- 将生成带 WLAN IP SAN 的短期本地开发证书，私钥只放入被 Git 忽略的目录。其他设备需自行信任证书或在浏览器中处理证书警告；是否能完成 Push/后台通知需独立验证，不作为本轮启动检查结论。先做 HTTP/代理与来源校验，不展开 136 项验收。

## 2026-09-30 10:44 CST｜局域网 HTTPS 入口与权限结果

- `apps/web/vite.config.ts` 改为监听 `0.0.0.0:5173`，在被忽略的本地证书存在时启用 HTTPS；同源 `/api/v1` 和对象 bucket 路径分别代理到仅监听回环的 API 与对象存储。`apps/web/package.json` 移除覆盖 Vite host 的 localhost 参数；API 监听地址可由 `API_HOST` 配置，本机设置为回环地址。当前入口为 `https://172.27.117.5:5173/`，证书含该 IP 的 SAN，到期 2026-10-30 10:20 CST，私钥未纳入仓库。
- 首页、`/plans` 深链和同源健康接口均返回 200；未登录会话与刷新请求均返回 401，未签名对象请求返回 403。一次性签名对象经局域网 HTTPS 代理获取到原始字节并删除。Docker 容器客户端能到达该入口，但尚无另一台实体局域网设备的检查。[启动观察](./evidence/WEB-22-lan-https-start.txt) SHA-256 `a1d8d59e34fa462fa6e21b4860fb65f78ec043d3032eb2e566a0d873e35537f5`；[对象冒烟](./evidence/WEB-22-lan-object-smoke.txt) SHA-256 `f16550c353aba081a6d445a59c7509b7ae163234e9ef9caabbab8e0c4a3ab220`。
- 用户明确授权新增仅 Private 网络、本地子网、TCP 5173 的 Windows 入站规则。普通权限曾返回“拒绝访问”；随后通过 Windows 管理员确认创建成功，并复查 `Enabled=True`、`Inbound`、`Allow`、`Private`、`TCP 5173`、`LocalSubnet`。[防火墙规则证据](./evidence/WEB-22-firewall-rule-result.txt) SHA-256 `75f3d7b2b1590584d6cc2bc2253a40b442bcc86059d90526f8d6424156a2539f`。另一台实体设备的访问尚未验证。
- Web/API 构建、定向 ESLint/Prettier 与对象冒烟已通过；随后完整 `npm run check` 退出 0，[原始输出](./evidence/WEB-22-lan-project-check.txt) SHA-256 `49b849db43f7dabc4446ad894a4632ac9efa447f8443f437b44afd05f3726f1b`。WEB-22 保持 `[ ]`，136 项正式 Web 用例保持 `NOT_RUN`。

## 2026-09-30 22:00 CST｜用户要求再次启动局域网服务

- WLAN IPv4 仍为 `172.27.117.5`，现有证书和 `.env` 继续匹配。启动前 Web、API、数据库、Redis 和对象存储端口均未监听，Docker Desktop Linux 引擎未启动。
- 启动 Docker Desktop 后，Compose 恢复 PostgreSQL、Redis、对象存储并等待健康；本地迁移命令退出 0。随后在后台启动编译后的 API、Worker 与 Vite Web，三进程最终均存活；数据库、Redis 与对象存储仍只绑定回环地址。
- `https://172.27.117.5:5173/`、`/login`、同源 API live 与 ready 均返回 200，之前授权的 Private/LocalSubnet TCP 5173 入站规则仍存在。[本次启动原始记录](./evidence/WEB-22-lan-restart-20260930.txt) SHA-256 `aff0176df3df8416853a1e3169954e3aff781c9f8cc47c0265a6b7ab4b0b1487`。未做实体设备、短信或完整浏览器验收；WEB-22 保持 `[ ]`。

## 2026-10-02 23:14 CST｜局域网可用性复查，修复前

- 用户要求确认本地启动后能否从局域网连接，并检查功能限制。当前 WLAN IPv4 已由 `172.27.117.5` 变为 `172.27.69.153`，但 `.env` 中 `WEB_ORIGIN`、`OBJECT_PUBLIC_ENDPOINT`、对象允许来源和自签证书仍指向旧 IP；5173、3000 和三项依赖端口均未监听，Docker Desktop 引擎也未启动。旧链接当前不可用。
- 防火墙规则仍为启用状态，范围是 Private/LocalSubnet TCP 5173。当前短信为 `SMS_PROVIDER=stub`，没有真实短信网关配置。先按新 IP 更新被忽略的本地证书和 `.env`，恢复服务后从同机和独立容器网络做最小访问与照片代理检查，再核对浏览器限制；正式 136 项 Web 用例不因此提前签发。

## 2026-10-02 23:34 CST｜局域网入口恢复与可重复启动

- 按当前 WLAN `172.27.69.153` 修复本地来源配置与自签证书；新证书 SAN 包含该 IP、回环 IP 和 localhost，到期 `2026-11-01 23:19 CST`。本机配置、私钥及备份仍在 Git 忽略目录，证据中未写入密钥或验证码。
- 新增 `scripts/start-lan.ps1`，以 PowerShell 7 自动核对 IP、来源、证书、Docker 依赖、迁移、应用进程、健康接口和既有防火墙规则。语法解析通过；复用运行进程和 `-Restart` 真正停止并重新拉起 API/Worker/Web 均退出 0。本机默认 Node 22.12.0 低于项目要求、旧 Corepack 的 `pnpm` 命令报签名错误；脚本自动选用已安装的 Node 24.19.0，`-Build` 直接使用仓库已安装的 TypeScript/Vite 编译依赖、API、Worker 和 Web 后启动，也退出 0，最终三进程存活。
- 当前入口 [`https://172.27.69.153:5173/`](https://172.27.69.153:5173/)；本机 HTTPS 首页、登录、计划深链及同源 API live/ready 各返回 200。签名照片对象经同源代理取回精确字节并删除，独立 Docker 容器可连接 WLAN IP。项目 Web 端口监听 `0.0.0.0:5173`，API 与本项目数据库/Redis/对象端口仅绑定 `127.0.0.1`；WLAN 为 Private，防火墙入站规则仍仅放行 LocalSubnet TCP 5173。
- [脱敏原始观察](./evidence/WEB-22-lan-recovery-20261002.txt) SHA-256 `5598736eed2fbb47087d268348ca9c497e519048a72cbeeceaa78e61c9708c43`；[运行手册](../../项目运行手册-计划打卡-Web-v1.md)已给出动态 IP 的构建、启动、重启与故障定位步骤。
- 实体手机/第二台电脑尚未实测；自签证书需设备信任后才能使用依赖安全上下文的浏览器能力。`SMS_PROVIDER=stub` 不会发送真实短信，需要网关凭据才能消除该限制。断网不可用、Web Push 后台送达尽力而为均符合现有 Web 需求。WEB-22 继续 `[ ]`，136 项正式浏览器用例不据此改为 `PASS`。
