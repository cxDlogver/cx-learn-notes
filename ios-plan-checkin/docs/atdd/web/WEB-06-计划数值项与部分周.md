# WEB-06｜计划、分组、数值项与部分周

## 1. 基线和范围

- 需求：[Web PRD](../../PRD-计划打卡-Web-v1.md) §计划、[技术方案](../../技术方案-计划打卡-Web-v1.md) §6.2/§9、[Web ATDD](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) 的 `WEB-PLAN-01～18` 与 `WEB-STAT-01～12`。
- 前置：WEB-01 契约核对、WEB-03 兼容迁移和 WEB-04 Web 会话 API 已完成。开始时三类计划、分组、规则版本、时区和生命周期服务已存在；数值项版本表已建，但计划接口尚未使用。
- 本任务不主拥有浏览器用例。`WEB-PLAN-17/18` 的服务端基础由此任务提供；记录提交时选择生效版本归 WEB-08，页面视觉与 F/V/N 归 WEB-07/11/21。

## 2. 实现和兼容行为

| 能力 | 实现位置 | 行为与边界 |
| --- | --- | --- |
| 创建计划数值项 | `CreatePlanRequest.numericItem`、`PlansService.create` | 固定、每周目标、一次性均可选填一个 `{label,unit}`；省略时旧请求有效，响应 `numericItem:null`；初版从计划开始日生效。 |
| 为旧计划添加与修改 | `POST/PATCH /api/v1/plans/{id}/numeric-config` | 必填 `baseRevision` 和幂等键；拥有者校验；名称 1～40 字、单位 1～20 字；已有配置只能 PATCH，未配置只能 POST。 |
| 历史版本 | `plan_numeric_config_versions` 与计划查询 | 后续配置从计划时区的下一业务日生效；不能覆盖同日已待生效的配置；版本追加且数据库禁止 UPDATE。计划 DTO 的 `numericItem` 显示最新已设置版本及 `effectiveFrom`，即使它还待生效。 |
| 旧记录保护 | `checkins.numeric_label/unit/config_version_id` | 修改配置不更新旧打卡；旧记录保留原值、名称、单位和版本引用，不自动换算。WEB-08 根据记录业务日期选取生效版本。 |
| 部分周 | `packages/domain/src/statistics.ts` | 完整自然周才计入周达标率与连续达标周；周中开始、结束、暂停、恢复或改目标保留记录但不计达标。 |
| 兼容 | `packages/contracts`、OpenAPI | 两条新增路由、一个可选创建字段及可忽略响应字段；既有移动请求与必填字段未变，契约兼容检查通过。 |

## 3. 开发与数据库证据

- [原始检查清单](./evidence/WEB-06/checks.json)逐项记录命令、退出码和 SHA-256。包含契约类型、领域/API 构建、OpenAPI 77 个操作、旧契约兼容、计划服务、部分周统计、lint、格式与台账校验。
- [计划服务输出](./evidence/WEB-06/plans-smoke.txt)保存两代数值项行和同一历史打卡在修改前后的实际数据库快照。旧值 `4.250000`、`距离`、`公里` 及版本 UUID 前后完全一致；新版本 `用时/分钟` 从 2026-09-29 生效。测试还覆盖三类计划、所有者、幂等重试、无效长度、待生效冲突和数据库追加约束。
- [真实 HTTP 输出](./evidence/WEB-06/plans-http.txt)来自每次启动后自动清理的 PostgreSQL 17 临时容器及全新 `web_atdd_web06` 库。成功状态为创建 201、读取 200、修改 200、旧请求创建 201、后加配置 201；越权读/写均 404，待生效与旧修订号均 409，无效名称 400，私人 GET 为 `Cache-Control:no-store`。HTTP 日志仅保存请求 ID、路由、状态和散列标识，不含短信号或令牌。
- [统计测试输出](./evidence/WEB-06/statistics.txt)在固定 2026-09-29 时钟下覆盖改规则和周中开始、结束、暂停、恢复：这些周的 `completeWeekCount=0`、`attainmentRate=null`、连续达标周为 0；保留记录不获得达标信用。

## 4. 偏差、修复和验收边界

- 本机 Corepack 在请求 `pnpm@11.25.0` 时遇到签名 key 不匹配；改用仓库已安装的 TypeScript、ESLint、Prettier 与直接 Node 脚本完成等价检查。首次证据脚本 lint 因缺 Node 全局显式导入失败，修复后重跑通过。
- 首次 HTTP 自测因遗漏 Web 登录 `Origin` 头返回 403；按真实 Web 请求补齐来源头后通过。首次 GET `no-store` 观测为 null 是自测服务未安装项目既有观测中间件；装入与生产启动一致的 `installObservability` 后返回 `no-store`。
- 此处证明源码、真实 API、数据库和领域口径；没有 Web 页面、桌面/手机截图、DOM、无障碍树或用户交互 F/V/N 结果。`WEB-PLAN-17/18` 及其他 136 个业务用例仍为 `NOT_RUN`，不能用服务端测试代替正式浏览器验收。

## 5. 2026-09-29 03:38 CST｜归档恢复修正后的全套回归

WEB-07 浏览器联调发现归档计划无法按 Web 验收 `WEB-PLAN-14` 显式恢复，已扩充服务端状态校验及 `scripts/plans-smoke.mjs` 的 `archive → resume` 状态、修订号、事件顺序断言。重新运行 `node scripts/web-06-evidence.mjs` 的 11 项检查，契约、领域/API 构建、兼容、PGlite、隔离 PostgreSQL HTTP、统计、lint、格式和台账均 PASS；[新检查清单](./evidence/WEB-06/checks.json)与原始输出已更新。Web 浏览器与 DB 证据见 [WEB-07 增量记录](./WEB-07-计划页面增量记录.md)。此回归不替代 `WEB-PLAN-14` 旧历史、归档期间打卡拒绝和正式 F/V/N，业务用例仍 `NOT_RUN`。
