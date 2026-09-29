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
