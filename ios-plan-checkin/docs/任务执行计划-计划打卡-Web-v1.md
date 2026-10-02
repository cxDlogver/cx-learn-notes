# 计划打卡 Web V1｜代码开发与浏览器验收执行计划

| 项目 | 执行定义 |
| --- | --- |
| 状态 | 执行基线已建立；Web 客户端、正式浏览器验收及发布均未完成 |
| 版本 | V1.0 · 2026-09-28 |
| 范围 | Web 客户端、共享 API/数据库/Worker 扩展、浏览器测试、证据与发布候选 |
| 产品依据 | [Web PRD](./PRD-计划打卡-Web-v1.md)、[Web 技术方案](./技术方案-计划打卡-Web-v1.md)、[Web ATDD/BDD 矩阵](./ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) |
| 机器台账 | [Web 执行进度 JSON](./atdd/web/execution-progress.json)；136 项基线见 [用例清单](./atdd/web/acceptance-cases.json) |
| 结果契约 | 每次实际执行写入符合 [Web 结果 schema](./atdd/web/acceptance-result.schema.json)的 `result.json` |

## 1. 当前事实与执行原则

当前仓库有 `apps/api`、`apps/worker`、`apps/mobile`、`packages/contracts`、`packages/domain`、`packages/design-tokens` 和 iOS 相关构建脚本；**尚无 `apps/web`**。Web PRD、技术方案和 136 项 Web 验收用例已经建立，但它们是需求与判定基线，不表示代码已实现或用例已通过。iOS 画板只作为视觉语言参考；Web 以响应式、可访问性和浏览器证据验收。

执行优先级：用户已确认的决策与 Web PRD → Web ATDD 功能断言 → Web 技术方案的实现约束 → 现有代码。发现冲突，先在本文件 §7 记下来源、影响、解决决定和受影响用例，再调整文档、代码与测试；不能靠当前实现反推需求。Web 可独立于 iOS 客户端发布，Web 验收检查 Web UI、共享 API 和同账号多浏览器，不把 iOS 真机联测列为门槛。

**每个任务是“代码 + 浏览器/API 验收 + 文档证据”的同一交付单位。**开始任务时先更新本文件的执行日志和 JSON 台账；完成可观察的一个子能力后立即写入对应的用例实施记录。至少在每次提交或合并前、每次浏览器验收后、每次缺陷修复复测后同步更新 Markdown 与 JSON。不得等全部代码开发完才补文档，也不得仅写 `PASS` 或 `DONE`。证据不存在、哈希失配、来源版本过期时不得勾选任务。

## 2. 实时记录协议

### 2.1 一次变更的顺序

1. **领取前：**检查依赖已完成且基线可用；在本文件 §6 增加任务执行条目，写明当前事实、目标、文件范围、关联用例、计划使用的浏览器和数据集；JSON 任务状态改为 `IN_PROGRESS`，记录开始时间和操作者。只有这一步完成后才开始该任务的代码修改。
2. **每个可观察增量：**在同一条目追加改动文件、接口/迁移/页面变化、失败与决策；逐条更新 JSON 的 `caseLedger`：`implementation` 写具体实现文件与 commit，`verification` 写环境、运行命令或步骤、F/V/N 实际观察、结果文件与截图链接。此时若尚未执行，只能是 `NOT_RUN`。
3. **每次验证：**保存原始命令输出、脱敏 API/网络/DB/Worker 记录和浏览器截图、DOM/无障碍树、响应式检查；为每个 `caseId + variant + runId` 写独立 `result.json`。将相对路径、SHA-256、时间、版本、视口、主题和评审结论同步记入 JSON 与 Markdown。浏览器的视觉结论须写观察依据，不能只写“截图正常”。
4. **收尾：**对照任务完成标准和关联用例，修复失败并重新取证；运行 `python docs/atdd/web/check_execution_progress.py`。只有当代码检查通过、必需变体符合 ATDD、证据可打开且可复核、Markdown/JSON 一致时，才将本文件对应 `- [ ]` 改为 `- [x]`，JSON 改为 `DONE`，记录完成时间、commit 和复核人。下一任务不得用未完成的前置任务解锁。
5. **后续改动：**若代码、契约、PRD 或验收基线变更影响已通过用例，将旧结果标记为 `STALE` 并在日志说明影响；在当前构建重跑后才恢复 `PASS`。旧证据保留审计，不覆盖或伪造。

### 2.2 必须同时维护的记录

| 位置 | 每次更新内容 | 禁止的简化 |
| --- | --- | --- |
| 本文件 §4/§6 | 任务勾选、实际工作、文件/commit、命令与输出摘要、用例/变体、F/V/N 判定、截图及证据链接、缺陷与复测 | 只写“完成”“通过”或单独贴截图 |
| `docs/atdd/web/execution-progress.json` | 任务状态/依赖/产物/检查/时间/复核；每个用例实施文件、变体结果、证据路径与摘要、日志事件 | 没有实现依据便把用例标 `IMPLEMENTED`；没有 `result.json` 便标 `PASS` |
| `evidence/<runId>/<caseId>/<variant>/` | 经 schema 验证的 `result.json` 和矩阵要求的原始证据 S/H/V/A/D/L/N/F/T；截图保留原文件与 SHA-256 | 用测试脚本退出码代替屏幕证据；把私密数据写入证据包 |
| Web 发布候选 | 源码、迁移、静态产物、部署、浏览器矩阵、136 项结果汇总、例外与回滚演练 | 把 iOS 本地 `check` 或无浏览器的 API 冒烟当 Web 验收 |

若证据含真实短信、令牌、手机号、备注或私人照片，采集前脱敏或使用隔离测试数据。证据目录在实现时由验收工具创建；本计划不制造空截图或虚构 `result.json`。每个通过结果至少有 F/N 通过、适用的 V 通过和可校验原始证据；纯 API/Worker 的 V 才可为 `N_A` 且说明理由。`BLOCKED` 要有阻断原因、解除条件和复测责任。

### 2.3 浏览器执行口径

正式支持发布时桌面 Chrome、Edge、Safari、Firefox 与手机 Safari、Chrome 的当前及上一稳定大版本。先在受控桌面/手机浏览器随功能开发做逐项验收，再在任务 WEB-21 做完整版本矩阵；不同浏览器和视口是不同 `variant`，不能平均。视口至少覆盖 360×800、390×844、768×1024、1280×800、1440×900 CSS px，记录实际可用宽高、系统字体、缩放、主题和设备像素比。页面可纵向滚动，禁止横向溢出、遮挡或不可达控件。`WEB-UI-01` 对 16 个页面键分别执行，因此 136 个稳定 ID 至少形成 151 个执行实例，浏览器和状态扩展会增加实例数。

Web Push 的受控端到端链路（权限、订阅、服务端发送、浏览器展示、点击、取消订阅、失效清理）必须通过；跨系统关闭页面后的稳定送达只观察。Web 断网不可使用，必须验证清楚提示、无假成功和安全恢复。视觉不采用 iOS 画板逐像素阈值。跨端产品共享要求保留，但 iOS 客户端联测不在 Web 发布门槛内。

## 3. 依赖与任务编号

任务 ID `WEB-01`～`WEB-22` 长期稳定。`READY` 指所有直接依赖已勾选、其代码和台账已集成；按编号领取最小的 READY 任务。各任务可以在依赖和文件归属清楚时并行，但同一任务的 Markdown/JSON/证据包由一个负责人合并。以下“主验收归属”分配 136 个稳定 ID 的首次完整浏览器结果；支撑任务也须随实现增量记录关联用例，主归属不免除集成复测。若某用例需要后续模块，主任务保持未完成并在日志中说明，不得提前打勾。

| 阶段 | 任务 | 直接依赖 | 主验收归属 |
| --- | --- | --- | --- |
| 基线 | WEB-01、WEB-02 | 无；WEB-02 依赖 WEB-01 | 验收工具和数据准备，不宣称业务 PASS |
| 基础/登录 | WEB-03～WEB-05 | 见 §4 | `WEB-AUTH-01～12` |
| 计划/记录/统计 | WEB-06～WEB-12 | 见 §4 | `WEB-PLAN-01～18`、`WEB-CHECK-01～18`、`WEB-STAT-01～12`、`WEB-ONLINE-01～08` |
| 社交/提醒 | WEB-13～WEB-16 | 见 §4 | `WEB-SOCIAL-01～14`、`WEB-NOTIFY-01～16` |
| 数据/UI/安全 | WEB-17～WEB-20 | 见 §4 | `WEB-DATA-01～10`、`WEB-UI-01～16`、`WEB-SEC-01～12` |
| 全量/发布 | WEB-21、WEB-22 | 所有业务与质量任务 | 全部 136 ID 及规定变体的复验和发布候选 |

## 4. 任务 Checklist

每行的“完成证据”须在 §6 留实际链接、结果和复核结论，JSON 台账也须同步填满。计划列出的文件是预计落点，实施时以真实 diff 为准；调整落点须记录原因。所有任务都要运行适用的格式、lint、typecheck、契约/迁移、安全检查以及针对行为的测试，失败或跳过要写明并修复。

### 4.1 基线和验收工具

- [x] **WEB-01｜源码与契约核对。** 依赖：无。逐项比对控制器、`packages/contracts/src/routes.ts`、OpenAPI、数据库迁移、Web PRD/技术方案与 136 项用例，建立差异清单和兼容迁移顺序；核对实际路由、现有 API 是否可复用、iOS 旧接口兼容。产物：契约差异记录、调整后的接口清单、技术决策、变更影响的用例 ID。完成证据：实际文件行/commit、契约检查输出、评审结论；未决冲突不得带入编码。
- [ ] **WEB-02｜实时证据与浏览器验收基础设施。** 依赖：WEB-01。实现隔离测试账号/时钟/数据种子、受控短信/对象存储/Push、浏览器运行器、截图与 DOM/无障碍树采集、F/V/N 结果写入、schema/哈希/清单校验、Markdown/JSON 一致性检查和 CI 保留策略。产物：`scripts` 或 `apps/web` 的测试工具、`evidence/<runId>/<caseId>/<variant>/` 目录规则与首个真实工具自测结果。完成证据：运行命令、生成的合法样本结果、无效证据被拒绝的记录；不把工具样本标成业务 PASS。

### 4.2 基础、身份与计划

- [x] **WEB-03｜共享数据兼容迁移。** 依赖：WEB-01。为渠道通知偏好、社交收件箱/已读、Web Push 订阅、数值配置版本和一次性结果附件补充向前兼容的 schema/SQL，保留移动端原有字段语义。产物：`db/migrations`、数据字典、回填和回滚说明。关联：PLAN、CHECK、SOCIAL、NOTIFY、DATA。完成证据：空库及旧库迁移/回滚、约束与历史值核对、SQL/DB 记录。
- [x] **WEB-04｜Web 会话与注册 API。** 依赖：WEB-01、WEB-03。实现公开注册、短信、15 分钟 access 自动续期、30 天 refresh Cookie、CSRF/Origin、多标签轮换、退出及账号状态，移动端 JSON refresh 兼容。产物：`apps/api/src/auth`、契约和安全测试。关联：AUTH、SEC。完成证据：正常、到期、重放、换号/退出、限流的请求/响应和日志，不记录秘密。
- [ ] **WEB-05｜SPA 骨架与登录。** 依赖：WEB-02、WEB-04。建立 `apps/web` React + TypeScript 构建、同站点 API 客户端、路由/深链、会话恢复、登录/验证码/首次资料及桌面/手机导航；根 `check`/CI 纳入 Web。主验收：`WEB-AUTH-01～12`。完成证据：受控桌面和手机浏览器逐例结果、截图/DOM、Cookie/网络证据、构建与刷新深链记录。
- [x] **WEB-06｜计划、分组与数值项服务端。** 依赖：WEB-01、WEB-03、WEB-04。完成三类计划、规则版本、计划时区、部分周口径、暂停/归档/删除、每计划最多一个数值项及历史单位快照，更新领域包/契约/API。关联：PLAN、STAT。完成证据：领域与数据库边界测试、历史规则/单位未被重写的前后快照和 API 证据。
- [ ] **WEB-07｜计划与分组页面。** 依赖：WEB-05、WEB-06。实现列表、创建/编辑、分组、详情、生命周期确认、数值项配置及错误/空态。主验收：`WEB-PLAN-01～18`。完成证据：每项 F/V/N、窄屏与桌面截图、表单校验、历史版本和网络记录。

### 4.3 记录、媒体、统计与网络

- [x] **WEB-08｜打卡、补记与修订 API。** 依赖：WEB-06。扩展循环与一次性结果的备注、照片、数值，维持同日唯一有效记录、幂等、版本冲突和修订审计。关联：CHECK、ONLINE。完成证据：并发/重试/补记/历史版本的 API、DB 计数与审计记录。
- [ ] **WEB-09｜私人媒体链路。** 依赖：WEB-03、WEB-08。对象直传、签名时效、CORS、类型/数量/大小限制、缩略图与删除清理，兼容一次性任务结果。关联：CHECK、DATA、SEC。完成证据：真实浏览器上传/失败重试截图、网络预检、对象权限与清理文件清单。
- [ ] **WEB-10｜今日、打卡、补记和修正页面。** 依赖：WEB-07、WEB-08、WEB-09。实现 do/avoid、一次性终态、附加数值/照片/文字、历史修正和结果未知时的恢复。主验收：`WEB-CHECK-01～18`。完成证据：各类型逐例结果、前后截图、上传与 DB/审计证明、失败及反向断言。
- [ ] **WEB-11｜日历、详情与统计。** 依赖：WEB-06、WEB-08、WEB-10。复用权威领域规则/API，完成今日/日历/详情/统计一致性、部分周不计达标、时区与历史修订展示。主验收：`WEB-STAT-01～12`。完成证据：冻结时钟下的计算输入/输出、三视图截图和 API/DB 对照。
- [ ] **WEB-12｜在线状态、并发与冲突体验。** 依赖：WEB-08、WEB-10、WEB-11。实现断网限制、未知写入同键查询/重试、多标签刷新与冲突选择，不承诺离线使用。主验收：`WEB-ONLINE-01～08`。完成证据：网络切换时间线、两个独立浏览器/标签录屏、幂等和冲突审计。

### 4.4 社交、通知与数据权利

- [x] **WEB-13｜好友、分享和消息服务端。** 依赖：WEB-03、WEB-04、WEB-06。补充社交事件持久收件箱、账号级已读、分页、授权撤销后的逐条校验，复用好友/分享 API 并确保越权拒绝。关联：SOCIAL、NOTIFY、SEC。完成证据：A/B/C/D 账号的 API/DB/日志、重复事件去重和撤销后拒绝记录。
- [ ] **WEB-14｜好友、分享和消息页面。** 依赖：WEB-07、WEB-13。实现搜索/申请/接受/屏蔽、逐计划授权预览、鼓励互动、消息中心与已读；同账号两个 Web 浏览器核对。主验收：`WEB-SOCIAL-01～14`。完成证据：主人/好友/陌生人视图截图、消息已读对照、无权读取的网络证据。
- [x] **WEB-15｜分端提醒与 Web Push 服务。** 依赖：WEB-03、WEB-06、WEB-13。共享时间规则、Web/iOS 投递偏好隔离、计划提醒 Worker、订阅/发送/取消/永久失败清理，外层只发通用文案。关联：NOTIFY、SEC。完成证据：冻结时钟、队列与供应端受理、渠道隔离和失效清理日志。
- [ ] **WEB-16｜站内提示、设置与浏览器通知。** 依赖：WEB-05、WEB-14、WEB-15。实现用户手势触发权限、Service Worker 订阅、通用通知展示/点击、计划即时站内提示、关闭与不支持降级。主验收：`WEB-NOTIFY-01～16`。完成证据：受控支持浏览器的权限到清理完整链路截图/录屏/网络/Push 记录；后台稳定送达仅观察。
- [ ] **WEB-17｜导出、删除和会话撤销服务端。** 依赖：WEB-03、WEB-08、WEB-09、WEB-13、WEB-15。完善导出任务、ZIP/照片清单、签名下载、计划删除、账号 30 天撤销期与最终清理，并撤销会话/分享/Push。关联：DATA、SEC。完成证据：Worker、ZIP 校验、私有对象拒绝、删除前后 DB/文件清单及恢复演练。
- [ ] **WEB-18｜导出、账号删除与设置页面。** 依赖：WEB-05、WEB-16、WEB-17。实现导出进度/下载失效、删除二次确认和恢复说明、设置导航、退出后的私人缓存清理。主验收：`WEB-DATA-01～10`。完成证据：真实浏览器下载/失效/删除/撤销路径截图、文件摘要、会话失效与反向权限证明。

### 4.5 全面适配、安全和正式验收

- [ ] **WEB-19｜响应式、主题与可访问性。** 依赖：WEB-05、WEB-07、WEB-10、WEB-11、WEB-14、WEB-16、WEB-18。统一 16 页面键、当前Pen结构化样式、最大480px居中移动结构与四项底栏、空/加载/错误态、浅/深色、200% 缩放、键盘/焦点/读屏、长内容与无横向溢出。主验收：`WEB-UI-01～16`。完成证据：每页键至少一个合法结果、视口/主题矩阵截图、DOM/无障碍树、布局和焦点观察；不得逐像素套 iOS 画板。
- [ ] **WEB-20｜安全、隐私与故障注入。** 依赖：WEB-04、WEB-09、WEB-12、WEB-13、WEB-15、WEB-17。核对鉴权/越权、Cookie/CSRF、XSS/CSP、CORS、缓存、限流、日志脱敏、HTTPS、幂等和冲突恢复。主验收：`WEB-SEC-01～12`。完成证据：请求拒绝/日志/DB/浏览器缓存和深链复测、配置与部署检查；严重失败阻断后续发布。
- [ ] **WEB-21｜136 项全量浏览器复验。** 依赖：WEB-19、WEB-20。锁定候选 commit、源文档哈希和测试环境，在正式浏览器当前及上一稳定大版本执行全部适用用例/变体，核对至少 151 个实例、截图和原始证据。完成证据：按 [结果 schema](./atdd/web/acceptance-result.schema.json)校验的完整 `result.json`、浏览器版本矩阵、失败修复与复测、136 ID 无 `BLOCKED/NOT_RUN/STALE`；主流程和安全项全 PASS。
- [ ] **WEB-22｜拟发布环境与 Web 发布候选。** 依赖：WEB-21。验证真实短信、HTTPS 同站点入口、对象直传、受控 Web Push、部署/回滚、监控告警、迁移恢复，汇总需求差异、风险例外和证据清单。完成证据：可复核的 Web 候选清单、部署/回滚记录、所有阻断项关闭和负责人签核；仅形成候选，不凭计划文档宣称已上线。

## 5. 用例归属与状态判定

| 归属任务 | 稳定 ID | 数量 | 首次正式执行时机 |
| --- | --- | ---: | --- |
| WEB-05 | `WEB-AUTH-01～12` | 12 | 登录与会话页面连通后 |
| WEB-07 | `WEB-PLAN-01～18` | 18 | 计划 API 和页面连通后 |
| WEB-10 | `WEB-CHECK-01～18` | 18 | 记录、媒体和页面连通后 |
| WEB-11 | `WEB-STAT-01～12` | 12 | 权威统计与三视图连通后 |
| WEB-12 | `WEB-ONLINE-01～08` | 8 | 网络/并发控制就绪后 |
| WEB-14 | `WEB-SOCIAL-01～14` | 14 | 双账号浏览器链路就绪后 |
| WEB-16 | `WEB-NOTIFY-01～16` | 16 | Worker、设置和受控 Push 就绪后 |
| WEB-18 | `WEB-DATA-01～10` | 10 | 导出/删除 Worker 与页面连通后 |
| WEB-19 | `WEB-UI-01～16` | 16 | 16 个页面键和状态具备后 |
| WEB-20 | `WEB-SEC-01～12` | 12 | 所有安全边界可注入故障后 |

以上恰好覆盖 136 个稳定 ID 且各有唯一主归属。用例的 `implementationStatus` 只描述当前代码能力，`verificationStatus` 只描述**某个构建与变体**的真实验收；有代码但未运行浏览器不能写 `PASS`。任务的勾选状态由代码、检查、关联用例的必需变体、证据和文档共同决定。WEB-21 使用同一基线做全量复验，发现回归时把对应任务重新置为未完成并记录原因。

## 6. 实时执行日志

此节在开始 WEB-01 **之前**填写首条条目，之后按时间追加，不覆盖历史。每条任务记录至少使用以下完整结构；链接指向实际存在的文件。当前没有 Web 开发或浏览器结果，因此不预填假证据。

```md
### YYYY-MM-DD HH:mm｜WEB-XX｜开始/增量/验收/复测/完成

- 负责人、分支、commit、基线摘要与环境：
- 目标与当前事实：
- 实施：文件、接口/迁移/页面、关键行为、兼容影响：
- 检查：命令、退出码、报告路径与失败处理：
- 用例：`WEB-...` + variant + runId；F 实际 / V 实际 / N 实际与判定依据：
- 浏览器：名称/版本、OS、实际视口、主题、缩放、时区、数据种子：
- 证据：`result.json`、截图、DOM/无障碍树、网络/API/DB/日志/文件/时间线的相对路径及 SHA-256：
- 缺陷、风险、决策、复测和下一步：
- 复核人、复核时间、任务勾选依据：
```

### 2026-09-28｜执行基线建立

- 当前事实：仓库有共享服务端、领域包和 iOS 客户端；`apps/web` 尚不存在。Web ATDD 是 136 个稳定用例 ID 的未执行基线。
- 文档：建立本计划和 `docs/atdd/web/execution-progress.json`，22 个任务全部未勾选，136 个用例均为 `NOT_RUN`；用例唯一主归属已分配。
- 已做检查：Web 用例清单生成器输出 136 条，Web 结果 schema 语法与 Draft 2020-12 校验通过；执行 `python docs/atdd/web/check_execution_progress.py`，输出 `Web execution ledger OK: 22 tasks, 136 cases`。后续每次变更继续运行。
- 证据与限制：此条仅证明计划和台账已建立，没有 Web 代码、浏览器截图或真实验收结果；没有用例被标为 `PASS`。
- 下一步：领取 WEB-01，先记录控制器/契约/文档差异，再修改代码或补充测试环境。

### 2026-09-28 19:26 CST｜WEB-01｜开始

- 负责人、基线与环境：Codex；工作区当前检出；以 `docs/atdd/web/acceptance-cases.json` 的 136 项摘要为核对基线。
- 目标与当前事实：核对控制器、契约、OpenAPI、迁移与 Web PRD/技术方案；现有 `apps/api` 和共享包已存在，`apps/web` 尚不存在。
- 实施范围：先核对 `apps/api/src`、`packages/contracts/src/routes.ts`、`packages/contracts/openapi.json`、`db/migrations`；差异记录写入 `docs/atdd/web/`。
- 检查与用例：启动前台账校验 `Web execution ledger OK: 22 tasks, 136 cases`；本任务不主拥有浏览器用例，全部验收仍为 `NOT_RUN`。
- 浏览器与证据：Web 页面尚未开发，未执行浏览器验证，也没有截图；本阶段保留源码核对与契约检查输出。
- 下一步：逐条核对路径和新增 Web 契约，记录影响的验收 ID 与兼容迁移顺序。

### 2026-09-28 19:37 CST｜WEB-01｜契约实现与开发检查

- 负责人、基线与环境：Codex；起点 commit `4d72bf3b`；本地 Node 22.12.0、TypeScript 和已安装的仓库依赖。未启动 Web 浏览器或发布环境。
- 实施：控制器同时挂载旧 `/api/v1/exports` 与 Web `/api/v1/me/exports`；`packages/contracts/src/routes.ts` 补 Web 列表与下载，重新生成 OpenAPI/类型；新增 `scripts/web-contract-audit.mjs`。完整差异、迁移顺序和受影响用例见 [WEB-01 核对记录](./atdd/web/WEB-01-契约核对与兼容迁移.md)，兼容变更写入 [API 记录](./API-兼容变更记录.md)。旧入口保留。
- 检查：OpenAPI 71 个唯一操作、兼容基线、双路径路由审计、导出冒烟、API/契约 typecheck、安全静态扫描、目标文件格式检查均退出 0。原始输出与 SHA-256 见 [检查清单](./atdd/web/evidence/WEB-01/checks.json)。路由审计初次因根工作区依赖解析失败，改为显式使用 API 工作区依赖；第二次因 NestJS 将根方法路径记录为 `/` 而失败，修正断言后通过；格式初检失败后按 Prettier 修正并重跑通过，失败过程未作为通过证据。
- 用例与浏览器：`WEB-DATA-01～04`、`WEB-SEC-02/07` 受导出入口影响，仍为 `NOT_RUN`；本任务仅完成代码/契约开发检查，没有 Web 页面、截图、DOM 或 F/V/N 浏览器结论。
- 待办：完成源码提交、任务台账复核和勾选；后续 WEB-02 建证据基础设施，WEB-18/20/21 执行对应浏览器验收。

### 2026-09-28 19:39 CST｜WEB-01｜完成与复核

- 交付 commit：`6e984b061c1a008ed5ad9ee1396e52733617adee`；仅提交本项目的 Web 文档、导出兼容代码、契约、审计脚本与真实检查输出。
- 代码结果：旧 `/api/v1/exports` 与 Web `/api/v1/me/exports` 的四类导出操作均有控制器映射；OpenAPI 共有 71 个唯一操作，兼容检查和导出冒烟通过。完整差异与后续迁移见 [WEB-01 核对记录](./atdd/web/WEB-01-契约核对与兼容迁移.md)。
- 证据与复核：七项检查的命令、退出码、原始输出路径和 SHA-256 记录在 [检查清单](./atdd/web/evidence/WEB-01/checks.json)；执行计划与 JSON 台账一致性已核对。复核人：Codex。此任务没有浏览器 F/V/N 结果，受影响用例仍为 `NOT_RUN`。
- 完成判定：任务目标是源码/契约核对与兼容入口；差异已记录、代码已提交、开发检查通过、后续 WEB-02～22 的责任清楚，因此勾选 WEB-01。下一项 READY 为 WEB-02，WEB-03 也满足直接依赖。

### 2026-09-28 19:41 CST｜WEB-02｜开始

- 负责人、基线与环境：Codex；直接依赖 WEB-01 已完成，代码基线 `e293639a`；本地尚无 `apps/web` 或 Playwright 包。
- 目标与当前事实：先实现证据包写入/校验工具及其负向自测，后续再接入受控浏览器、隔离账号、短信/对象/Push 数据种子。
- 实施范围：`docs/atdd/web` 的结果 schema、用例清单和台账，`scripts` 下的 Web 验收工具；证据按 `evidence/<runId>/<caseId>/<variant>/` 保存。
- 用例与证据：本任务不主拥有业务用例；所有 136 个用例的浏览器状态保持 `NOT_RUN`。工具自测结果不作为业务 PASS 或浏览器截图。
- 下一步：实现结果文件与原始证据哈希核对，证明缺文件、篡改、缺必要证据代码会被拒绝。

### 2026-09-28 19:45 CST｜WEB-02｜证据校验工具增量

- 实施：新增 `docs/atdd/web/validate_result.py`、`test_validate_result.py`、`requirements.txt`；`check_execution_progress.py` 的 PASS 分支接入同一校验器。详细功能、边界和后续工作见 [WEB-02 进展](./atdd/web/WEB-02-证据工具进展.md)。
- 实际检查：八项临时合成数据自测均通过，包含缺文件、缺证据代码、错误目录、过期摘要、篡改 SHA、断言引用缺失和预期文本不符的拒绝；原始输出见 [自测记录](./atdd/web/evidence/WEB-02/tool-selftest.txt)。
- 验收与证据：未启动真实浏览器，未采集截图或 DOM；合成用例只测工具，不构成任何 `WEB-DATA-09` 或其他业务用例的 PASS。`caseLedger` 中 136 项继续 `NOT_RUN`。
- 剩余：隔离账号/时钟/外部桩、浏览器采集、结果落盘和 CI 保留尚未完成。WEB-02 保持未勾选，WEB-05 及后续依赖任务仍未解锁。

### 2026-09-28 19:51 CST｜WEB-02｜浏览器采集探针增量

- 实施：新增 `scripts/web-browser-capture.mjs`，从本机 Chrome/Edge CDP 采集截图、DOM、无障碍树、浏览器版本、视口和布局观测；URL 的查询参数与片段不写入元数据。输出仅保存到本项目工作区，临时浏览器配置目录在校验真实临时路径后清理。
- 真实工具检查：Chrome 合成页首次因缺 viewport meta 观察到 980×2121 CSS 布局；补 meta 后实际 390×844，Edge 桌面实际 1280×800。后两次布局观测均无水平溢出。人工查看 Chrome 合成截图，测试文字与按钮可见。截图/DOM/无障碍树/布局/日志的路径和 SHA-256 见 [浏览器文件清单](./atdd/web/evidence/WEB-02/browser-captures.json)；详细说明见 [WEB-02 进展](./atdd/web/WEB-02-证据工具进展.md)。
- 验收判定：这些是 `data:` 合成页，不含计划打卡产品交互；`WEB-UI` 等 136 项仍 `NOT_RUN`，没有业务 `result.json`。WEB-02 仍缺隔离种子、外部桩、正式浏览器矩阵接入及 CI 保留，因此 checklist 保持未勾选。

### 2026-09-28 20:26 CST｜WEB-02｜结果落盘与浏览器交互增量

- 负责人：Codex；范围：证据录入和交互采集工具，关联全部 136 项的后续取证流程；业务用例仍无实施/通过声明。
- 代码：`record_result.py` 从人工观察构造 F/V/N 结果，自动附基线预期、来源摘要及原始文件 SHA，验证后同步 JSON 台账和本执行日志；拒绝未知用例、不安全路径及未实施用例的 PASS。浏览器采集器增加受控等待/点击/输入、操作前后截图和不含输入文本的动作时间线。完整行为与限制见 [WEB-02 进展](./atdd/web/WEB-02-证据工具进展.md)。
- 工具实测：12 项合成数据自测全部通过；其中一项在临时目录生成合法 `FAIL` 结果并核对 Markdown/JSON 同步。Chrome 153 在 390×844 合成页执行输入、点击和结果观察，截图与 DOM 同时显示 `Synthetic user`。参见[操作后截图](./atdd/web/evidence/WEB-02/browser-action-selftest/screen-after.png)、[DOM](./atdd/web/evidence/WEB-02/browser-action-selftest/dom.html)、[动作时间线](./atdd/web/evidence/WEB-02/browser-action-selftest/action-trace.json)。这不是产品页面或业务验收。
- F/V/N 与反向断言：本次只验证工具能拒绝伪造业务 PASS 并采集交互证据，未对任何 Web 产品用例给出 F/V/N 判定；136 项均 `NOT_RUN`。尚缺隔离业务种子、真实 Web 环境、非 Chromium 浏览器与 CI 保留，WEB-02 保持未勾选。

### 2026-09-28 20:31 CST｜WEB-03｜开始

- 负责人、基线与环境：Codex；WEB-01 已完成，WEB-02 的工具部分仍在进行；以现有 `0001～0011` 数据库迁移和 Web 技术方案 §7 为迁移基线，使用本地 PGlite 执行空库与旧库验证。
- 目标与文件范围：增加分端提醒偏好、持久社交收件箱/已读、Web Push 订阅、数值配置版本与历史快照、一次性任务结果数值和相关约束；预计修改 `db/migrations`、迁移测试及数据字典。保留 iOS 原字段和接口语义。
- 关联用例：PLAN、CHECK、SOCIAL、NOTIFY、DATA 的后续业务用例；本任务不主拥有浏览器用例，因此首次开发验证是数据库约束与迁移检查，不能代替业务 F/V/N。
- 计划证据：空库迁移输出、旧数据回填前后快照、非法约束拒绝、兼容字段保留和回滚说明。尚未完成迁移或浏览器验收，WEB-03 保持未勾选。

### 2026-09-28 20:36 CST｜WEB-03｜扩展迁移与旧库演练增量

- 实施：新增 `0012_web_compatibility.sql` 和迁移清单入口，保留 iOS 原表/列；为 Web 会话渠道、通知渠道偏好、消息收件箱、Web Push 订阅、数值项版本和一次性结果数值建立约束。新增旧库/事务回滚测试，更新空库迁移与 SQL 静态目录，`package.json` 增加专用检查命令。字段与回滚决定见 [WEB-03 数据迁移记录](./atdd/web/WEB-03-数据迁移与回滚.md)。
- 已观察：PostgreSQL 语法静态检查显示 41 表/12 迁移；PGlite 空库迁移通过；旧库测试先应用 11 迁移并写旧数据，Web 迁移事务回滚后仍为 37 表且原行不变，重新应用后为 41 表。iOS 通知偏好复制、旧会话标识和历史数值单位保留；跨计划引用、重复事件/endpoint、缺单位与修改配置被拒绝。
- F/V/N 与证据边界：这些是数据库约束与兼容验证，不是浏览器产品用例的 F/V/N；相关 PLAN/CHECK/SOCIAL/NOTIFY/DATA 用例仍 `NOT_RUN`。真实 PostgreSQL 测试环境备份/恢复、API/Worker 接入及浏览器验收尚未完成，WEB-03 不勾选。

### 2026-09-28 20:43 CST｜WEB-03｜隔离 PostgreSQL 17 迁移与恢复

- 环境：临时 `postgres:17-alpine` 容器，只绑定 `127.0.0.1` 随机端口；两套新建 `web_atdd` 测试库，全部用户/计划为合成数据。容器在取证后停止并自动移除。
- 命令与结果：同一旧库迁移脚本在 PostgreSQL 17 通过事务回滚、旧 iOS 行映射、数值快照、收件箱/Push/Worker 约束；`pg_dump -Fc` 备份 113814 字节并用 `pg_restore` 恢复。原库和恢复库汇总表数、用户、渠道偏好、打卡、消息、Push、一次性数值均为 `41|2|1|1|1|1|1`。原始步骤、退出码和结果见 [PostgreSQL 恢复证据](./atdd/web/evidence/WEB-03/postgres-restore.json)。
- 判定边界：数据库迁移和恢复通过；尚未接入 Web 页面、API/Worker 新路径，业务用例 F/V/N 全部 `NOT_RUN`。WEB-03 仍待最终代码提交、台账复核后勾选。

### 2026-09-28 20:46 CST｜WEB-03｜完成

- 提交：`f83bd068b928e8f86948c40aba69bbd847d49ae4`；新增迁移、清单、静态目录和旧库回滚测试已纳入源码。独立 PostgreSQL 17 旧库、备份/恢复证据及 PGlite 空库/旧库命令输出可按 [WEB-03 清单](./atdd/web/evidence/WEB-03/checks.json)逐项复核。
- 实际完成：旧通知偏好映射到 iOS 渠道，Web 渠道另存；旧会话、打卡数值单位和一次性备注保持原值；新增数据约束拒绝跨计划版本、重复消息与 Push endpoint。隔离备份恢复前后七项汇总一致。`check_execution_progress.py` 与格式检查通过。
- 复核结论：WEB-03 的兼容数据结构、回填、回滚说明和环境级迁移证明齐备，勾选本任务。它不拥有 136 个业务用例中的任何首验结果；API/Worker 接入和浏览器 F/V/N 仍由 WEB-04～22 完成，全部业务用例当前 `NOT_RUN`。

### 2026-09-28 20:48 CST｜WEB-04｜开始

- 负责人、依赖与基线：Codex；WEB-01 与 WEB-03 已完成。现有 `auth/sms/verify`、`auth/refresh`、`auth/logout` 返回/接收 JSON refresh，JWT audience 为 `plan-checkin-mobile`；数据库已有 `sessions.client_channel`，但 API 尚未读写。
- 目标与文件范围：在 `apps/api/src/auth` 新增 Web 专用短信验证、会话恢复/续期、退出及浏览器安全边界，保留移动端旧端点/响应；更新 `packages/contracts`、OpenAPI 和认证测试。Cookie 需 Secure/HttpOnly/SameSite、30 天轮换；access 15 分钟、Web audience 与 CSRF/Origin 校验。
- 关联用例与计划证据：AUTH、SEC。先做服务层/API 的正常、到期、重放、并发轮换、退出、限流与拒绝检查，记录脱敏请求/响应；浏览器主验收仍归 WEB-05、WEB-20。代码尚未修改，所有业务结果仍 `NOT_RUN`，WEB-04 未勾选。

### 2026-09-28 20:59 CST｜WEB-04｜Cookie 会话服务增量

- 代码：新增 `/auth/web/verify`、`/session`、`/refresh`、`/logout` 控制器路径和 `web-session.ts` Cookie/CSRF/Origin 边界；服务层按 `ios/web` 分发 JWT audience 与会话渠道，Web refresh 只在 Cookie，返回体只含短期 access 与 CSRF；Web 退出撤销本浏览器订阅，移动 APNs 数据保持不变。追加契约、OpenAPI 和受控 PGlite 自测。
- 实际检查：TypeScript、75 个 OpenAPI operation、旧移动契约兼容均通过；`web-auth-smoke.mjs` 断言 Web Cookie 属性、CSRF/Origin 拒绝、轮换重放、Web/iOS 通知隔离、移动 JSON 会话路径。首次脚本运行因根目录未暴露 `jose` 包而失败，改为从令牌载荷读取 audience 并以服务端 `authenticate` 验签，再次运行通过。
- 证据与范围：以上为服务/控制器直接调用测试，尚缺真实 HTTP、限流和浏览器观察；AUTH/SEC 的业务 F/V/N 仍 `NOT_RUN`。WEB-04 未勾选，后续继续保存脱敏 HTTP 响应与拒绝证据。

### 2026-09-28 21:07 CST｜WEB-04｜隔离 PostgreSQL HTTP 与回归增量

- 环境：临时 PostgreSQL 17 `web_atdd_http` 库、loopback API 和内存短信桩；所有号码均为合成随机测试号，HTTP 原始日志只含 requestId、路由、状态和哈希标识。容器已停止并自动移除。
- HTTP 实际结果：公开短信挑战 201，Web 验证 201 且 JSON 无 refresh；Cookie 有 `Secure/HttpOnly/SameSite=Lax/Path=/`、30 天 `Max-Age`，响应 `no-store`；会话恢复 200；伪造 Origin 和错误 CSRF 均 403；轮换 201；旧 Cookie 重放 401 且未返回清除 Cookie；退出 201，退出后恢复 401。原始日志和去敏响应摘要见 [WEB-04 HTTP 证据](./atdd/web/evidence/WEB-04/web-auth-http.txt)。
- 兼容与反向检查：PGlite 服务测试覆盖第二次轮换后的迟到同键响应不覆盖新 Cookie、15 分钟 access、30 天刷新到期和 Web 退出不清 iOS APNs；移动旧 JSON 认证、双验证码换号及全会话撤销回归均通过。OpenAPI 75 项、兼容、typecheck、安全静态检查与全部命令 SHA 见 [检查清单](./atdd/web/evidence/WEB-04/checks.json)；设计与结论见 [WEB-04 详细记录](./atdd/web/WEB-04-Web会话与注册API.md)。
- F/V/N 判定：本次只确认 API/服务端边界；Web 页面尚不存在，AUTH/SEC 业务用例 136 项总台账仍 `NOT_RUN`。WEB-04 待提交和最终复核。

### 2026-09-28 21:13 CST｜WEB-04｜当前源码复测

- 缺陷与修复：初次新测试脚本因根依赖解析 `jose` 失败、随后 lint 因 Node 内建对象未显式导入失败。改用现有服务端验签配合载荷 audience 检查，并补标准模块导入。没有修改业务验收基线或伪造旧结果。
- 复测：当前源码 lint、API 编译、PGlite 服务断言和全新隔离 PostgreSQL 17 真实 HTTP 均退出 0。第二次数据库与首轮相互独立，取证后自动删除；最终[服务输出](./atdd/web/evidence/WEB-04/web-auth-service-final.txt)、[HTTP 日志与去敏响应](./atdd/web/evidence/WEB-04/web-auth-http-final.txt)、全部输出 SHA 见[清单](./atdd/web/evidence/WEB-04/checks.json)。
- 当前结论：API 与旧移动端兼容检查通过，浏览器页面仍不存在，AUTH/SEC 用例仍 `NOT_RUN`；WEB-04 待代码提交及台账最终复核。

### 2026-09-28 21:15 CST｜WEB-04｜完成

- 提交：`ec1777612843b36d8f1f5579dc5464c4f546f0fa`。Web 会话、Cookie/CSRF/Origin、Web audience、移动兼容契约和自测源码均已提交；最终服务与真实 HTTP 证据、lint、typecheck、安全扫描及原始哈希见 [WEB-04 清单](./atdd/web/evidence/WEB-04/checks.json)。
- 复核：公开注册、15 分钟 access、30 天 refresh、旧令牌与迟到重放、退出、换号全会话撤销、限流策略及 Web/iOS 通知隔离的 API 判定已具备。后续多标签浏览器协调、页面登录和 AUTH/SEC 的 F/V/N 由 WEB-05/12/20 验证；136 项当前继续 `NOT_RUN`。WEB-04 是 API 支撑任务，不主拥有浏览器用例，故勾选。

### 2026-09-28 21:22 CST｜WEB-02｜本地证据归档与 CI 校验增量

- 实施：`archive_evidence.py` 校验结果文件、来源、进度后，把原始证据和来源文档打成 ZIP，并在 ZIP 内附逐文件 SHA-256 索引；项目 `.gitignore` 忽略本地归档。仓库顶层 CI 已加入 Python 3.11、固定 `jsonschema` 依赖和 `web:atdd:check`，会执行 12 项工具自测与 Markdown/JSON 台账一致性检查。详细记录见 [WEB-02 进展](./atdd/web/WEB-02-证据工具进展.md)。
- 实测：本地归档包含 77 文件、0 业务结果，整体 SHA-256 为 `1cef6490edc0ae8991b6e93e996c6ea6eea2477411ce0d4fbec254617c02f2e8`，逐文件哈希核验通过，见[归档验证](./atdd/web/evidence/WEB-02/archive-selftest.json)。没有由合成数据生成业务 PASS 或截图。
- 审批与剩余：尝试把截图、台账和计划上传到 CI artifact 被自动审批拒绝，理由是未核实外部目的地可能外流敏感证据；未上传，也未采用替代外发方式。隔离 A/B/C/D 种子、固定时钟、受控对象/Push 桩、`STALE` 传播、完整浏览器运行器和 CI 外部产物保留仍缺。WEB-02 不勾选，依赖它的 WEB-05 仍未解锁；136 项业务用例继续 `NOT_RUN`。

### 2026-09-28 21:29 CST｜WEB-06｜开始

- 负责人、基线与环境：Codex；WEB-01、WEB-03、WEB-04 已完成，工作树无本项目未提交改动；以 `0012_web_compatibility.sql`、计划 API、领域统计及 Web PRD/技术方案为基线。
- 当前事实：三类计划、规则版本、计划时区和生命周期服务已存在；数据库已具备数值配置版本表，但计划创建/更新/读取接口尚未接入该表。部分周统计已有领域实现，需验证口径。
- 实施范围：扩展契约、OpenAPI、计划服务与数值项版本读取/写入；确保更新只从未来生效，旧记录的标签与单位快照不被重写；补服务/数据库边界验证。
- 验收与证据：本任务不主拥有浏览器用例，PLAN/STAT 的 F/V/N 仍 `NOT_RUN`。先保存源码和数据库断言的原始输出与哈希，再判断任务是否可勾选。
- 风险与下一步：WEB-02 的隔离业务种子仍未完成，因此页面任务尚未解锁；本次只推进 WEB-06 已满足的依赖。

### 2026-09-28 21:56 CST｜WEB-06｜完成与复核

- 负责人、分支、提交与环境：Codex；当前工作区；功能/详细文档/初始证据 commit `e847fab0`，证据换行与 SHA 修复 commit `a389d52cae36ef7e3070eccc30a49db38339bcc2`。使用已安装 Node/TypeScript、PGlite、自动清理的隔离 PostgreSQL 17 及全新 `web_atdd_web06` 库；未启动产品浏览器。
- 实施：三类计划创建增加可选单项数值配置；新增 `POST/PATCH /plans/{id}/numeric-config` 的所有者、修订号、幂等、长度和待生效版本校验；计划响应返回最新配置及生效日期，历史记录不更新。分组、生命周期和部分周已有规则通过回归。源文件、兼容影响和后续记录日期选择见 [WEB-06 完整记录](./atdd/web/WEB-06-计划数值项与部分周.md)及 [API 兼容记录](./API-兼容变更记录.md)。
- 检查：最终[清单](./atdd/web/evidence/WEB-06/checks.json)列 11 项命令、退出码、原始输出与 SHA-256，全部通过；已对工作区文件和提交中的 Git blob 逐一核对 11 个摘要，均无不一致。实际数据库前后快照见[服务输出](./atdd/web/evidence/WEB-06/plans-smoke.txt)，真实 HTTP 201/200/404/409/400 和 `no-store` 见[HTTP 输出](./atdd/web/evidence/WEB-06/plans-http.txt)，固定时钟部分周见[统计输出](./atdd/web/evidence/WEB-06/statistics.txt)。
- 缺陷处理：Corepack 的 pnpm 签名错误改为直接调用仓库本地依赖；首次 lint 缺 Node 显式导入和首次 HTTP 登录缺 Origin 均修复并复测。取证脚本统一 LF 后，重新检出的文件哈希仍与清单相同。
- 用例、浏览器与限制：`WEB-PLAN-17/18` 的服务端能力具备，WEB-08 仍需实现记录按业务日期选版本，WEB-07/11/21 仍需页面、视觉与 F/V/N；没有任何产品浏览器截图或结果，本任务不主拥有用例，136 项维持 `NOT_RUN`。复核人 Codex；按 WEB-06 服务端范围勾选，下一步继续 WEB-02 隔离种子与 WEB-08 记录 API。

### 2026-09-28 22:03 CST｜WEB-02｜隔离种子增量开始

- 负责人、范围与基线：Codex；WEB-02 继续保持 `IN_PROGRESS`。依据 Web ATDD §1.4 建立 A 主人、B 好友、C 陌生人、D 被屏蔽者及 A1/A2/A3 独立会话，固定本次运行的 `serverNowUtc`、计划时区和业务日期。
- 当前事实：证据校验、Chrome/Edge 合成采集与本地归档已实现；业务账号/计划种子尚无重建和清理脚本。仓库测试可使用仅绑定 loopback 的临时 PostgreSQL 17，真实手机号和生产账号禁止进入种子。
- 实施与证据目标：编写只接受 `web_atdd_*` 本机测试库的种子/清理工具，建立 F/FD/W/O、数值历史、规则版本、暂停/归档、好友/屏蔽/分享和独立会话；在隔离库复建、核对数量、清理，再保存不含秘密的命令输出与哈希。
- 验收边界：测试账号和会话的构建不等于 Web 产品用例通过；136 项继续 `NOT_RUN`。外部 CI artifact 上传仍被审批拒绝，WEB-02 不勾选。

### 2026-09-28 22:14 CST｜WEB-02｜隔离种子与冻结时钟增量

- 实施：新增只接受 loopback `web_atdd_*` 库的 A/B/C/D 种子和清理工具；A1/A2/A3、B1/C1/D1 为六个独立 Web refresh 会话。F/FD/W/O 及要做/不要做、数值旧/新版本、部分周、暂停/归档、好友/屏蔽/分享均写入隔离库；Cookie/CSRF 只在忽略提交的本机文件，不入证据。服务端预载入器和 Chrome 采集器可冻结同一 UTC 时钟，浏览器时区单独设置，`timeline.json` 记录真实与冻结时间。设计、数据关系和限制见 [WEB-02 进展](./atdd/web/WEB-02-证据工具进展.md)。
- 实测：临时 PostgreSQL 17 中两次创建和清理同一运行 ID，每轮 4 用户/10 计划/6 会话/5 记录，清理后目标用户 0；六个会话均经真实 `GET /auth/web/session` 返回 200 和 `no-store`，A1/A2/A3 同账号但不同 session。隔离 Node 服务端与 Chrome 153 合成页均观察 `2026-09-28T13:00:00.000Z`，生产环境时钟注入被拒绝；浏览器 `America/Los_Angeles`。原始命令、退出码及 13 个文件 SHA 均可从 [增量清单](./atdd/web/evidence/WEB-02/seed-checks.json)和[时钟清单](./atdd/web/evidence/WEB-02/clock-selftest.json)复核。
- 失败与修复：首次静态检查发现新脚本未显式导入 Node `Buffer`，修正后通过；首次时钟断言未把 ISO 毫秒规范化，改为比较标准化 UTC 字符串后服务端/浏览器同值。冻结 Node/页面时钟不冻结数据库 `now()`，到期边界仍需专用数据库种子。
- 用例、浏览器、复核与剩余：本次 Chrome 只运行合成时钟探针，不是 Web 产品验收；F/V/N、DOM/截图业务断言仍无，136 项 `NOT_RUN`。对象存储/Push 桩、真实 Web 页面浏览器运行、非 Chromium 矩阵、STALE 传播及外部 CI 产物保留尚缺；WEB-02 不勾选。复核人 Codex，下一步补工具闭环与可控外部依赖。

### 2026-09-28 22:23 CST｜WEB-02｜STALE 传播增量

- 实施：新增 `mark_stale.py`，候选构建变化后把旧 PASS 当前指针标为 `STALE`，保留历史 `result.json` 和原始截图；所属任务及已完成下游任务同步撤销勾选并记历史。结果写入器要求 PASS 与锁定候选 commit 一致，台账校验器核对来源文件 SHA 和通过用例的构建提交。用法、保留规则和限制见 [WEB-02 进展](./atdd/web/WEB-02-证据工具进展.md)。
- 检查：15 项合成工具测试通过，包含旧 PASS 失效、WEB-05/WEB-07 递归重开、旧证据路径不删除、相同候选不误标和无效 SHA 拒绝；当前仓库候选只读预览为 0 个真实受影响用例。命令、退出码和三个原始输出 SHA 见 [STALE 检查清单](./atdd/web/evidence/WEB-02/stale-checks.json)。
- 用例与剩余：当前 136 项均 `NOT_RUN`，无业务结果可失效；此处只验证传播工具。外部桩、真实 Web 页面浏览器运行、非 Chromium 矩阵和 CI 外部产物保留仍缺，WEB-02 保持未勾选。

### 2026-09-28 22:29 CST｜WEB-08｜开始

- 负责人、依赖与基线：Codex；WEB-06 已完成，WEB-08 按计划解锁。现有循环打卡支持结果、备注、失败原因、旧式数值和照片关联；一次性结果只有终态与备注。`0012_web_compatibility.sql` 已预留记录数值配置版本与一次性结果数值列。
- 本次实施：按打卡业务日期选择数值项版本并保存标签、单位、版本快照；一次性结果补数值、备注、照片关联及响应；保留旧客户端数值请求兼容。核查同日唯一、幂等、并发冲突、补记及修订审计。
- 验收与证据目标：保存真实 API 请求响应、数据库有效行与修订数、历史数值前后快照、并发/重试结果及命令哈希；WEB-08 不主拥有浏览器用例，136 项 F/V/N 仍为 `NOT_RUN`。
- 当前限制：WEB-02 尚未完成，产品浏览器页面未解锁；本任务服务端交付不替代 WEB-10 的界面验收。

### 2026-09-28 22:49 CST｜WEB-08｜完成与复核

- 提交与实施：功能、测试、OpenAPI、兼容记录、详细文档及原始证据已提交为 `daba2911c2b8975258d553d77d17e7e8ff1d26ef`。循环记录按业务日期绑定数值项版本；一次性结果补备注、数值与最多 9 张照片标识，详情与审计快照同源。旧式数值对象及 `reason` 请求兼容，详见 [WEB-08 完整记录](./atdd/web/WEB-08-打卡补记与修订API.md)。
- 复核：13 项命令及 SHA-256 见[检查清单](./atdd/web/evidence/WEB-08/checks.json)，全部退出 0；逐文件 SHA-256 与提交中的 Git blob 复核 13/13 一致。[真实 HTTP 原始输出](./atdd/web/evidence/WEB-08/records-http.txt)确认重试 200、错误单位 409、跨账号 404、并发 200/409，数据库同日唯一和冲突、修订计数均符合断言；[PGlite 输出](./atdd/web/evidence/WEB-08/web-records-smoke.txt)显示新旧标签/单位/版本与前后快照。
- 缺陷与边界：新增响应字段曾被设为必填，兼容检查发现后改为可选；旧记录额外 null 字段造成回归失败，已恢复原形状并复测；lint 缺 Node 显式导入已修复。照片证据只到数据库标识绑定，真实对象和浏览器上传属 WEB-09/10；本任务不主拥有浏览器用例，136 项仍 `NOT_RUN`。复核人 Codex；按 WEB-08 服务端范围勾选，下一步继续 WEB-02 工具与可解锁任务。

### 2026-09-28 22:55 CST｜WEB-13｜开始

- 负责人、依赖与基线：Codex；WEB-03/04/06 已完成。现有好友申请、接受、屏蔽、逐计划分享和鼓励 API 可复用；`inbox_messages` 表已经迁移，但业务写入、分页读取和账号级已读接口尚不存在。
- 本次实施：在社交业务事务中按事件键创建去重消息；补 `GET /me/inbox` 游标分页和未读数、`POST /me/inbox/{id}/read` 幂等已读；读取每条消息时重新校验好友、分享、屏蔽和账号状态，失权时只保留通用历史提示。
- 验收与证据目标：A/B/C/D 隔离用户的真实 API、数据库消息/重复键/已读计数及撤销后拒绝；记录原始输出、命令与哈希。WEB-13 不主拥有浏览器用例，SOCIAL/NOTIFY 的 F/V/N 仍 `NOT_RUN`。

### 2026-09-28 23:11 CST｜WEB-13｜完成与复核

- 提交与实施：服务、契约、OpenAPI、测试、兼容记录、详细文档和原始证据提交为 `7efa40880b48be7f6f37d3daa05d85ce06f7381f`。业务事务写好友申请/接受、分享、共享记录更新和鼓励消息；收件箱按账号 HMAC 游标分页、计未读、幂等标记已读，逐条复核权限并在失权时隐藏目标。详见[WEB-13 完整记录](./atdd/web/WEB-13-社交消息服务端.md)。
- 复核：[14 项检查清单](./atdd/web/evidence/WEB-13/checks.json)全部退出 0，原始文件 SHA-256 和已提交 Git blob 14/14 一致。[真实 HTTP](./atdd/web/evidence/WEB-13/inbox-http.txt)覆盖 A/B/C/D、B 两个独立 Web 会话、5 类事件各一条、游标拒绝 400、越权标记 404、撤销分享读取 403、屏蔽申请 403 与 `no-store`；[服务输出](./atdd/web/evidence/WEB-13/web-inbox-smoke.txt)证明去重、跨会话已读和失权后的消息去标识。
- 缺陷与边界：首次真实 HTTP 自测因同 IP 第五次短信挑战命中 429；保持产品限流，改用隔离库第二会话种子并经真实会话恢复接口复测。此处仅服务端通过，无 Web 消息中心截图、DOM 或 F/V/N；136 项浏览器用例仍 `NOT_RUN`。复核人 Codex，按 WEB-13 服务端范围勾选；WEB-14/16/21 继续负责页面和正式验收。

### 2026-09-28 23:13 CST｜WEB-15｜开始

- 负责人、依赖与基线：Codex；WEB-03/06/13 已完成。迁移已提供 `channel_notification_preferences`、`web_push_subscriptions` 和两类 Worker 作业名，现有 API 仍只读写 iOS 旧偏好/APNs，Worker 尚无 Web 计划提醒与 Web Push 处理。
- 本次实施：新增独立 Web 渠道偏好与 Web Push 订阅/取消 API、密文存储和失效清理；在服务端按计划时区与规则生成提醒，发送前二次检查状态、打卡、周目标和渠道开关；社交事件 Web 投递只用通用文案，不改变 iOS 设置。
- 验收与证据目标：固定时钟、隔离订阅/供应端桩、队列去重及永久失败清理、Web/iOS 开关隔离的 API/DB/Worker 原始输出及哈希。WEB-15 不主拥有浏览器用例，权限弹窗和 Service Worker 展示归 WEB-16，136 项继续 `NOT_RUN`。
- 风险：Web Push 标准加密与 VAPID 发送需正确的实现或经过审查的依赖；上线前还需受控真实浏览器和拟发布环境验证。后台关闭页面后的稳定送达不是发布阻断项。

### 2026-09-28 23:24 CST｜WEB-15｜分端偏好与订阅 API 增量

- 已实现：Web 专用通知偏好 GET/PATCH 及订阅 POST/DELETE，接口限制 Web 会话并使用其设备 ID；订阅端点和两类密钥加密存库，iOS 旧接口保持兼容。详细接口、检查与剩余见 [WEB-15 进行中记录](./atdd/web/WEB-15-分端提醒与WebPush服务.md)。
- 已执行：PGlite 16 项断言全部通过，涵盖渠道/账号隔离、修订冲突、密文、IP 端点拒绝和撤销；[原始输出](./atdd/web/evidence/WEB-15/web-notifications-smoke.txt) SHA-256 `dcfd0d54a34d01ec9b64be6a6c910f5c95a2e810f83de8929a55f6b198d65faf`。API/契约 TypeScript、83 项 OpenAPI 和旧契约兼容通过。
- 未完成：提醒调度、VAPID 加密发送、队列重试/清理、真实 HTTP 和浏览器链路。WEB-15 仍未勾选，136 个浏览器用例保持 `NOT_RUN`。

### 2026-09-28 23:43 CST｜WEB-15｜Worker 与加密发送增量

- 代码与数据：迁移 `0013` 建订阅受理表和永久事件/时间槽去重；社交入队、Web Push 供应端发送、410 失效清理及计划时区调度已接线。通知外层只含通用文案，VAPID 公钥由 API 提供，部署清单补齐注入项；详见[WEB-15 记录](./atdd/web/WEB-15-分端提醒与WebPush服务.md)。
- 原始证据：[社交/订阅 24 项](./atdd/web/evidence/WEB-15/web-notifications-worker.txt)、[固定时钟计划 15 项](./atdd/web/evidence/WEB-15/web-plan-reminders.txt)、[RFC 8291 向量及供应端桩](./atdd/web/evidence/WEB-15/web-push-rfc.txt)、[42 表/13 迁移静态检查](./atdd/web/evidence/WEB-15/sql-static.txt)。各文件 SHA-256 写在详细记录中；旧好友/分享/收件箱/APNs/记录回归通过。
- 尚缺真实 PostgreSQL HTTP、429/5xx 队列退避、完整浏览器链路及最终证据哈希复核；WEB-15 保持未勾选，136 项浏览器业务用例仍 `NOT_RUN`。

### 2026-09-29 00:06 CST｜WEB-15｜服务端完成与复核

- 代码及证据提交为 `2d94b986`。[20 项检查清单](./atdd/web/evidence/WEB-15/checks.json)均退出 0，原始文件与提交中的 Git blob SHA-256 逐项复核 20/20 一致。详细实现、缺陷和边界见 [WEB-15 完整记录](./atdd/web/WEB-15-分端提醒与WebPush服务.md)。
- [真实 PostgreSQL 17 HTTP](./atdd/web/evidence/WEB-15/web-http.txt) 验证 Web/iOS 渠道隔离、修订冲突、非法端点/曲线公钥拒绝、密文存储、订阅取消和 Web 退出撤销；固定时钟计划提醒 19 项、社交/订阅 30 项及 RFC 8291 官方向量均通过，503 重试恢复和 410 永久清理有原始输出。隔离容器已自动清理。
- WEB-15 只拥有服务端范围，按计划勾选；真实浏览器权限、Service Worker 展示、点击及前后台观察由 WEB-16/21 负责。136 项业务 F/V/N 继续 `NOT_RUN`，没有将服务端检查冒充浏览器 PASS。

### 2026-09-29 00:16 CST｜WEB-02｜留存完整工具结果样本

- 实施：`generate_tool_sample.py` 使用正式结果写入器生成合成 `WEB-DATA-09` 的 [result.json](./atdd/web/evidence/WEB-02/tool-sample/evidence/synthetic-tool/WEB-DATA-09/api-fixture/result.json)、独立 [JSON 台账](./atdd/web/evidence/WEB-02/tool-sample/execution-progress.sample.json)和 [Markdown 日志](./atdd/web/evidence/WEB-02/tool-sample/execution-plan.sample.md)；[样本清单](./atdd/web/evidence/WEB-02/tool-sample/sample-check.json)存各文件 SHA-256。
- 实测：结果 schema、来源摘要和原始证据哈希均通过；样本状态刻意为 `FAIL`，样本台账同步为 `FAIL`，正式台账仍为 `NOT_RUN`。15 项工具单测和正式台账一致性检查通过。这只是工具闭环，不计业务验收。
- 剩余：受控外部桩、真实产品浏览器与全浏览器矩阵、CI 外部产物保留尚缺；WEB-02 继续未勾选，136 项业务用例仍 `NOT_RUN`。详细记录见 [WEB-02 进展](./atdd/web/WEB-02-证据工具进展.md)。

### 2026-09-29 00:32 CST｜WEB-02｜数据库到期与供应端隔离链路

- 实施：隔离种子新增数据库 `clock_timestamp()` 会话到期设置；本地对象存储限定两个开发源站，新增签名 PUT/GET 与清理探针；新增零外网请求的 Web Push 供应端桩。具体约束及边界见 [WEB-02 完整增量记录](./atdd/web/WEB-02-证据工具进展.md)。
- 原始检查：[数据库与真实 HTTP 输出](./atdd/web/evidence/WEB-02/expiry-selftest.txt)证明 A3 到期 401、恢复 200，其余会话继续 200；[对象输出](./atdd/web/evidence/WEB-02/object-provider.txt)证明允许源站预检、拒绝源站 403、签名读写与删除；[Push 输出](./atdd/web/evidence/WEB-02/push-provider.txt)证明 201/202、410、503 和内网端点拒绝。 [七项命令与 SHA-256 清单](./atdd/web/evidence/WEB-02/provider-checks.json)记录退出码 0 及文件摘要，lint、格式、正式台账检查通过。
- 限制：这些是隔离供应端/测试工具检查，尚未接入产品网页的正式浏览器 F/V/N；对象发布域名和 Safari/Firefox/手机矩阵待做，CI 外部产物保留仍缺。WEB-02 不勾选，136 项业务继续 `NOT_RUN`。

### 2026-09-29 00:38 CST｜WEB-05｜客户端骨架与登录开始

- 负责人、范围与基线：Codex；WEB-04 已完成，WEB-02 的合成证据、Chrome/Edge 采集、隔离账号与受控供应端可用，但正式浏览器矩阵和 CI 外部保留未完成。为使 WEB-02 的真实页面验收链路能够落地，先开始 `apps/web` 的可逆代码开发；WEB-05 在依赖和自身 12 项 AUTH 正式验收通过前不得勾选。
- 本次实施目标：React + TypeScript SPA、同站点 `/api/v1`、内存 access、HttpOnly Cookie 恢复/轮换、验证码登录与首次资料、深链和响应式导航，并将构建/typecheck 接入根检查。
- 证据目标：构建、静态检查、真实 Chrome/Edge 的登录和深链原始截图、DOM、Cookie/网络、逐项 F/V/N；所有尚未观察的 AUTH 项保持 `NOT_RUN`。当前无业务通过结论。

### 2026-09-29 01:16 CST｜WEB-05｜登录与浏览器增量

- 代码：新增 [Web SPA](../apps/web/)、同站点 API 客户端、内存 access/CSRF、Cookie 会话恢复与轮换、短信表单、首次资料、History 路由和桌面/手机导航。根 `typecheck`/`check` 已纳入 Web；验证码仅由隔离短信桩导入 CDP，不写入步骤或日志。具体实现、风险和未完成项见 [WEB-05 详细记录](./atdd/web/WEB-05-SPA骨架与登录.md)。
- 真实浏览器：Chrome 153 的 390×844 与 Edge 154 的 1280×800 登录截图、DOM/无障碍树均已保存，两个视口文档宽度等于视口、无横向溢出；Chrome/Edge 新用户验证 201、资料保存 200，Chrome 刷新后会话恢复 200；Chrome 既有账号无需资料 PATCH，退出 201 后返回仍为登录页且 Cookie 清空。原始材料分别见 [Chrome 注册与刷新](./atdd/web/evidence/WEB-05/login-reload-chrome-390/network.json)、[Edge 注册](./atdd/web/evidence/WEB-05/login-flow-edge-1280/network.json)、[既有账号](./atdd/web/evidence/WEB-05/existing-login-chrome-390/network.json)、[退出](./atdd/web/evidence/WEB-05/logout-back-chrome-390/browser-storage.json)。
- 缺陷与处理：首次使用已有 3000 端口的旧 API 得到 Web 会话 404，保留 [失败截图](./atdd/web/evidence/WEB-05/login-initial-chrome-390/screen-after.png)；改用临时 PostgreSQL 17 与 3001 隔离 API 后重新采集。iOS Pen 来源在共享工作区出现仅分组标题几何调整，已按 §7 更新来源摘要，不改用例文本。今日页仍是建设中占位，12 项 AUTH 未做完整 F/V/N，均保持 `NOT_RUN`；WEB-05 不勾选。

### 2026-09-29 01:35 CST｜WEB-05｜今日真实空态增量

- 代码先按 [WEB-05 增量记录](./atdd/web/WEB-05-SPA骨架与登录.md)写明目标，再接入权威 `GET /today`，将加载、失败重试、空态和非空条目分别渲染。创建计划入口已出现，目标表单尚未实现，WEB-07 接续。
- Chrome 153 手机 390×844 与 Edge 154 桌面 1280×800 分别用隔离新账号完成短信、首次资料和今日 GET 200；[Chrome 截图/网络](./atdd/web/evidence/WEB-05/today-empty-chrome-390-v2/screen-after.png)、[Edge 截图/网络](./atdd/web/evidence/WEB-05/today-empty-edge-1280/screen-after.png)和 [哈希清单](./atdd/web/evidence/WEB-05/checks.json)可核查。两个视口无横向溢出；首次 Chrome 步骤失败另存，成功复测未覆盖失败。
- 根 `npm run check`、Web 类型、Lint、格式及 Vite build 通过；旧系统 Corepack pnpm 签名错误有失败输出，项目私有 Node 直接执行 Vite 成功。全部 12 项 AUTH 正式 F/V/N 仍 `NOT_RUN`，WEB-02 依赖和 WEB-05 清单均未完成，因此保持 `[ ]`。复核人 Codex。

### 2026-09-29 01:45 CST｜WEB-05｜换号双验证增量

- 先在 [WEB-05 详细记录](./atdd/web/WEB-05-SPA骨架与登录.md)写入 `WEB-AUTH-11` 目标，再接入现有双码挑战/确认 API；换号成功后清除 Web Cookie 与内存会话。Chrome 手机 [双码页面](./atdd/web/evidence/WEB-05/change-phone-form-chrome-390/screen-after.png)显示两个掩码和可读字段，[完整网络](./atdd/web/evidence/WEB-05/change-phone-chrome-390/network.json)记录挑战/确认/退出均 201。
- [新号独立登录](./atdd/web/evidence/WEB-05/new-phone-login-chrome-390/network.json)直接进入本人今日，无新用户资料步骤；[隔离数据库聚合](./atdd/web/evidence/WEB-05/change-phone-db.txt)为 1 个账号、3 条旧会话撤销、1 条新会话有效、1 个已消耗请求。错误路径和其他浏览器尚缺，`WEB-AUTH-11` 与 WEB-05 都不勾选。下一步补错误/会话边界并形成正式 F/V/N；复核人 Codex。

### 2026-09-29 01:53 CST｜WEB-05｜换号错误与证据隐私修正

- [错误旧码截图](./atdd/web/evidence/WEB-05/change-phone-invalid-chrome-390-v3/screen-after.png)已遮挡双码，确认 API 返回 400，[隔离库](./atdd/web/evidence/WEB-05/change-phone-invalid-db.txt)显示请求未消耗、错误次数为 1。页面保留可修正状态；`WEB-AUTH-11` 仍需占用/过期及浏览器变体。
- 首次错误探针截图与无障碍材料包含测试验证码，发现后修正输入遮挡和采集器 DOM/AX 脱敏；两份未提交的敏感旧采集在路径确认后清理，以 v3 重新取证。详细处理和断言见 [WEB-05 记录](./atdd/web/WEB-05-SPA骨架与登录.md)。所有 12 项 AUTH 正式状态保持 `NOT_RUN`，WEB-05 `[ ]`；复核人 Codex。

### 2026-09-29 02:03 CST｜WEB-05｜access 到期自动续期增量

- [浏览器动作](./atdd/web/evidence/WEB-05/access-refresh-chrome-390/action-trace.json)在旧账号登录后将页面时钟推进 16 分钟，[网络](./atdd/web/evidence/WEB-05/access-refresh-chrome-390/network.json)显示一次 refresh 201 和后续今日 GET 200，页面未回登录。受控时钟动作仅允许 loopback 开发测试。
- 计划详情页仍未实现，旧 refresh 重放与多标签反向断言未在本探针覆盖，`WEB-AUTH-07` 保持 `NOT_RUN`；WEB-05 `[ ]`，详见 [增量记录](./atdd/web/WEB-05-SPA骨架与登录.md)。复核人 Codex。

### 2026-09-29 02:07 CST｜WEB-05｜短信错误参数增量

- `WEB-AUTH-02` 非法 11 位号码的 [Chrome 网络](./atdd/web/evidence/WEB-05/invalid-phone-chrome-390/network.json)没有短信挑战请求；`WEB-AUTH-05` 错误验证码的 [网络](./atdd/web/evidence/WEB-05/invalid-code-chrome-390/network.json)返回 400，页面仍登录、Cookie 为空，截图输入已遮挡。详细 F/V/N 缺口见 [WEB-05 记录](./atdd/web/WEB-05-SPA骨架与登录.md)。
- 空号、过快重发、过期与已使用变体未执行，两项正式用例均 `NOT_RUN`；WEB-05 `[ ]`，复核人 Codex。

### 2026-09-29 02:11 CST｜WEB-07｜真实计划页提前开发

- 发现验收交叉依赖：`WEB-AUTH-07` 要求打开计划页并看到本人数据，而 WEB-07 原定依赖 WEB-05 全项验收完成。WEB-06 服务端已完成，因此先在 [WEB-07 增量记录](./atdd/web/WEB-07-计划页面增量记录.md)锁定列表、三类创建和详情的第一批代码与证据目标，再进行可逆页面开发；WEB-05/WEB-07 均保持 `[ ]`，不把依赖缺口伪装为完成。
- `WEB-PLAN-01～18` 仍全为 `NOT_RUN`。计划表单的分组、编辑、生命周期和正式浏览器 F/V/N 继续按 WEB-07 清单执行。复核人 Codex。

### 2026-09-29 02:23 CST｜WEB-07｜三类计划创建增量与执行阻断

- [WEB-07 详细记录](./atdd/web/WEB-07-计划页面增量记录.md)已同步代码、首次浏览器目标关闭、TypeScript 修正、三类真实创建与未测项。Chrome 手机固定周一/三/五加单一数值项、Edge 桌面周目标 7“不要做”、Chrome 360 宽一次性今日截止均取得创建 201、详情 200、截图/网络/布局和隔离数据库聚合；均无横向溢出。窄屏详情折行样式已调整，尚欠复测。
- 启动固定计划空星期错误探针时，自动审批因账户用量上限未能完成，命令**未执行**。不将待运行脚本写作验收证据，也不绕过审批。当前 WEB-07 `[ ]`、18 项 PLAN `NOT_RUN`；恢复后先跑错误用例、重做构建与全量检查、形成哈希清单，再继续其余计划与分组功能。复核人 Codex。

### 2026-09-29 02:47 CST｜WEB-07｜恢复执行与反向证据

- 恢复后定位到隔离 API 就绪脚本的 Windows PowerShell 参数兼容问题，修正 401 判定并重启 13 项迁移的隔离数据库。详情和原始材料见 [WEB-07 增量记录](./atdd/web/WEB-07-计划页面增量记录.md)。
- Chrome 153 手机 390×844 的固定计划空星期提交显示错误、`aria-invalid=true`，没有 `POST /plans`，无横向溢出；[截图](./atdd/web/evidence/WEB-07/fixed-empty-chrome-390/screen-after.png)、[网络](./atdd/web/evidence/WEB-07/fixed-empty-chrome-390/network.json)、[布局](./atdd/web/evidence/WEB-07/fixed-empty-chrome-390/visual-result.json)可复核。[SHA-256 清单](./atdd/web/evidence/WEB-07/checks.json)收录四次浏览器探针和三份隔离库聚合；生成脚本已验证成功/失败网络断言与证据隐私。
- `npm run check`、Web 生产构建、执行台账校验和 `git diff --check` 均通过。该空星期探针不等于 WEB-PLAN-02 完整 F/V/N；WEB-07 及依赖 WEB-05 仍 `[ ]`，18 项 PLAN 保持 `NOT_RUN`。后续继续计划编辑、分组、生命周期与正式验收。复核人 Codex。

### 2026-09-29 02:56 CST｜WEB-07｜生命周期操作增量

- 计划详情接入当前 `revision` 的暂停、恢复、归档与显式确认删除；删除确认列出不可撤销影响和归档替代。Chrome 153 手机 390×844 的两次完整操作链路与隔离数据库聚合已保存；中文版 [归档截图](./atdd/web/evidence/WEB-07/lifecycle-chrome-390-v2/screen-archived.png)、[删除确认截图](./atdd/web/evidence/WEB-07/lifecycle-chrome-390-v2/screen-delete-confirm.png)、[网络](./atdd/web/evidence/WEB-07/lifecycle-chrome-390-v2/network.json)、[数据库事件](./atdd/web/evidence/WEB-07/lifecycle-v2-db.txt)可复核。四次状态事件按序落库，删除清理任务为 `pending`；手机无横向溢出。
- [WEB-07 增量记录](./atdd/web/WEB-07-计划页面增量记录.md)说明首次英文状态修正、复测与未覆盖边界。[证据清单](./atdd/web/evidence/WEB-07/checks.json)现含六次浏览器、五份 DB 聚合的 SHA-256。Web TypeScript 和 Vite 生产构建通过。时间边界、已有历史/照片/分享、分组、编辑与正式 F/V/N 尚缺，因此 WEB-07 `[ ]`，18 项 PLAN `NOT_RUN`。复核人 Codex。

### 2026-09-29 03:08 CST｜WEB-07｜分组管理增量

- 计划列表新增分组创建、重命名、确认删除和两计划移组。首轮手机浏览器探针因隐藏侧栏链接选择器中断，已在 [WEB-07 增量记录](./atdd/web/WEB-07-计划页面增量记录.md)说明；换新隔离账号的 Chrome 390×844 完整链路通过。[网络](./atdd/web/evidence/WEB-07/groups-chrome-390-v2/network.json)含两次计划创建、分组创建、两次移组、重命名与删除的成功响应；[删除确认截图](./atdd/web/evidence/WEB-07/groups-chrome-390-v2/screen-delete-group-confirm.png)及[数据库聚合](./atdd/web/evidence/WEB-07/groups-db.txt)证实两个计划仍存在、均回未分组、分组数为 0，且手机无横向溢出。
- [SHA-256 清单](./atdd/web/evidence/WEB-07/checks.json)为七次完整浏览器运行和六份 DB 聚合。尚无预置历史打卡与桌面分组 F/V/N，故 WEB-PLAN-15 仍 `NOT_RUN`；WEB-07 `[ ]`。复核人 Codex。

### 2026-09-29 03:17 CST｜WEB-07｜归档后恢复回归

- `WEB-PLAN-14` 联调发现服务端原本拒绝归档态恢复，已修正 `PlansService.lifecycle`，补充 PGlite 回归的状态、修订号、事件顺序断言。[服务输出](./atdd/web/evidence/WEB-07/archive-resume-service.txt)及 Chrome 390×844 的[请求记录](./atdd/web/evidence/WEB-07/archive-resume-chrome-390/network.json)、[状态截图](./atdd/web/evidence/WEB-07/archive-resume-chrome-390/screen-after.png)、[数据库聚合](./atdd/web/evidence/WEB-07/archive-resume-db.txt)表明归档→恢复两个操作均 201，最终 `active|3|archive,resume`，无横向溢出。详情见 [WEB-07 增量记录](./atdd/web/WEB-07-计划页面增量记录.md)。
- [SHA-256 清单](./atdd/web/evidence/WEB-07/checks.json)现含八次完整浏览器、七份 DB 聚合和服务回归输出。归档期间打卡拒绝、旧历史和正式 F/V/N 未覆盖，WEB-PLAN-14 `NOT_RUN`，WEB-07 `[ ]`。复核人 Codex。

### 2026-09-29 03:26 CST｜WEB-07｜计划编辑与版本追加

- 详情页新增标题、说明、规则、截止/结束日期与数值项编辑；未改变规则不重复建版本。Chrome 390×844 [编辑网络](./atdd/web/evidence/WEB-07/edit-chrome-390/network.json)中计划 PATCH、数值项 PATCH 均 200；[最终详情截图](./atdd/web/evidence/WEB-07/edit-chrome-390/screen-after.png)显示 V2 次日生效。隔离库[版本行](./atdd/web/evidence/WEB-07/edit-db.txt)保留规则 V1 周一/三/五及数值 V1 距离/公里，新 V2 为周一/二/五、用时/分钟，从次日生效，手机无横向溢出。
- [WEB-07 增量记录](./atdd/web/WEB-07-计划页面增量记录.md)详列代码、探针与缺口；[SHA-256 清单](./atdd/web/evidence/WEB-07/checks.json)现含九次完整浏览器、八份 DB 聚合。尚未核对旧打卡历史与周目标编辑，WEB-PLAN-10/11/18 仍 `NOT_RUN`，WEB-07 `[ ]`。复核人 Codex。

### 2026-09-29 03:28 CST｜WEB-07｜周目标编辑桌面探针

- Edge 154 桌面 1280×800 将“不要做”周目标 N=7 改为 N=1，计划 PATCH 200，V2 从次日生效。[截图](./atdd/web/evidence/WEB-07/weekly-edit-edge-1280/screen-after.png)、[网络](./atdd/web/evidence/WEB-07/weekly-edit-edge-1280/network.json)、[数据库规则行](./atdd/web/evidence/WEB-07/weekly-edit-db.txt)和[布局](./atdd/web/evidence/WEB-07/weekly-edit-edge-1280/visual-result.json)已记录。完整[证据清单](./atdd/web/evidence/WEB-07/checks.json)为十次浏览器、九份 DB 聚合。该周已有打卡及部分周达标统计未验证，WEB-PLAN-11 `NOT_RUN`、WEB-07 `[ ]`。复核人 Codex。

### 2026-09-29 03:34 CST｜WEB-05｜AUTH07 真实计划页续期

- 在真实个人计划页复核 access 到期：首轮仅推进浏览器时钟导致客户端连续续期三次，已保留问题网络；调整 Web 会话本地截止值按服务端 `serverTime` 的剩余有效期计算。[复测网络](./atdd/web/evidence/WEB-05/auth07-real-plan-chrome-390-v2/network.json)为一次 refresh 201，计划列表/分组/详情 GET 均 200；[详情截图](./atdd/web/evidence/WEB-05/auth07-real-plan-chrome-390-v2/screen-after.png)与[Cookie 元数据](./atdd/web/evidence/WEB-05/auth07-real-plan-chrome-390-v2/browser-storage.json)显示未跳登录、个人数据可见、刷新 Cookie 不可读。详见 [WEB-05 增量记录](./atdd/web/WEB-05-SPA骨架与登录.md)。
- [WEB-05 SHA-256 清单](./atdd/web/evidence/WEB-05/checks.json)更新为 18 次完整浏览器探针、八份旧检查输出；旧 refresh 重放、多标签与正式 F/V/N 未完成，WEB-AUTH-07 `NOT_RUN`，WEB-05 `[ ]`。复核人 Codex。

### 2026-09-29 03:38 CST｜WEB-06｜归档恢复服务端变更回归

- WEB-07 联调修正归档态可显式恢复后，重跑 WEB-06 全套 11 项证据命令均 PASS，包括 PGlite 状态/事件序列与隔离 PostgreSQL HTTP。新[检查清单](./atdd/web/evidence/WEB-06/checks.json)及 [WEB-06 回归说明](./atdd/web/WEB-06-计划数值项与部分周.md)已同步。WEB-06 服务端任务维持 `[x]`；WEB-PLAN-14 的正式浏览器 F/V/N 仍 `NOT_RUN`。复核人 Codex。

### 2026-09-29 03:40 CST｜WEB-09｜私人媒体链路开始

- 在 [WEB-09 实时记录](./atdd/web/WEB-09-私人媒体链路.md)先列出现有上传意图、对象校验、每条九张、一次性结果和 Worker 清理能力，以及未闭环的浏览器直传/CORS、失败恢复、签名时效、私有对象与缩略图。依赖 WEB-03/08 已完成，WEB-09 从 `[ ]` 开始，不能凭服务端现状勾选。复核人 Codex。

### 2026-09-29 03:47 CST｜WEB-09｜对象域和媒体 HTTP 探针

- [对象域原始输出](./atdd/web/evidence/WEB-09/object-provider.txt)验证允许源预检 200、未授权源预检 403、签名 PUT/GET 200、无签名 GET 403、对象删除后不存在。首次完整 HTTP smoke 的媒体步骤通过，但内部 metrics 被 Vite fallback 返回 HTML，进程退出 1；[失败输出](./atdd/web/evidence/WEB-09/local-http-smoke.txt)保留。测试脚本改为内部 metrics 独立回环地址后，完整 [10/10 输出](./atdd/web/evidence/WEB-09/local-http-smoke-v2.txt)与[脱敏 JSON 报告](./atdd/web/evidence/WEB-09/local-http-report.json)通过，含上传意图、PUT、完成、私人下载及软删除。
- [WEB-09 实时记录](./atdd/web/WEB-09-私人媒体链路.md)列出浏览器 UI、签名到期、边界、缩略图和清理文件清单尚缺。这些 HTTP 探针不替代真实浏览器验收，WEB-09 `[ ]`。复核人 Codex。
- [WEB-09 SHA-256 清单](./atdd/web/evidence/WEB-09/checks.json)已经覆盖四份原始 HTTP/对象输出并记录一次证据脚本时间戳误判的修复；业务验收状态不变。

### 2026-09-29 03:52 CST｜WEB-10｜真实今日打卡页面提前增量

- [WEB-10 实时记录](./atdd/web/WEB-10-今日打卡页面增量记录.md)先锁定权威今日字段、循环计划当前日记录/修正和可选照片直传的第一批代码与浏览器证据。WEB-07/09 尚未完成，但 WEB-09 的真实浏览器照片证据需要产品上传入口，因此先开发可逆页面；WEB-07/09/10 均维持 `[ ]`，`WEB-CHECK-01～18` 均 `NOT_RUN`。复核人 Codex。

### 2026-09-29 04:07 CST｜WEB-10｜循环计划打卡与照片浏览器增量

- 今日页现有权威 `/today` 卡片新增结果、文字、数值及照片表单，按 `planBusinessDate`、`activeRuleVersion`、原记录修订号提交；媒体依次完成上传意图、浏览器对象 PUT、记录关联和完成绑定。失败后可以清除待上传照片单独保存文字结果；保存后清空文件选择框。代码在 `apps/web/src/app/TodayCheckin.tsx`、`apps/web/src/data/api.ts`、`apps/web/src/app/App.tsx`、`apps/web/src/styles.css`；浏览器工具增加限定工作区夹具的上传动作，脱敏记录对象请求状态。
- [Chrome 390×844 原始截图/网络](./atdd/web/evidence/WEB-10/photo-checkin-chrome-390/) 完成新记录与一张照片；[Edge 1280×800 原始截图/网络](./atdd/web/evidence/WEB-10/correction-edge-1280/) 完成同一记录修正与第二张照片，均无横向溢出。两次网络均显示预检 200、对象 PUT 200、记录 PUT 200、媒体完成 201。[DB 当前值](./atdd/web/evidence/WEB-10/db-record.txt)为一条修订 2 的失败记录和 2 张 ready 照片，[修订审计](./atdd/web/evidence/WEB-10/db-revisions.txt)为 1→2；[校验清单](./atdd/web/evidence/WEB-10/checks.json)固定证据哈希。证据脚本首跑暴露 `/` 根路由与桌面滚动条宽度的断言口径问题，修正为允许根路由及文档宽度 `≤` 视口后通过。
- WEB-09 共享这两次浏览器媒体证据。WEB-07/09/10 仍 `[ ]`，全部 18 条 `WEB-CHECK` 仍 `NOT_RUN`；一次性终态、补记、do/avoid 全组合、冲突与故障反向、缩略图及媒体边界仍待完成。复核人 Codex。

### 2026-09-29 08:46 CST｜WEB-10｜一次性任务终态增量

- [WEB-10 实时记录](./atdd/web/WEB-10-今日打卡页面增量记录.md)补充一次性任务详情终态表单、首次 POST/修正 PATCH、实际完成时间、文字/数值/照片。恢复后隔离浏览器环境使用新数据库；之前循环记录的原始证据与数据库快照独立保存，不把两组数据误称为同一数据库。[首次连接失败截图](./atdd/web/evidence/WEB-10/one-time-complete-chrome-390/screen-before.png)和恢复过程也保留。
- [Chrome 手机完成及上传](./atdd/web/evidence/WEB-10/one-time-complete-chrome-390-v2/)走详情 GET 200、对象预检/PUT 200、终态 POST 201、照片完成 201；[Edge 桌面修正](./atdd/web/evidence/WEB-10/one-time-correct-edge-1280/)走已有终态 GET 200、PATCH 200。数据库[唯一终态](./atdd/web/evidence/WEB-10/db-one-time-result.txt)为修订 2、原照片 ready，[修订审计](./atdd/web/evidence/WEB-10/db-one-time-revisions.txt)为 1→2。修订 SQL 首次因列歧义失败后改为显式限定列通过；[WEB-10 哈希清单](./atdd/web/evidence/WEB-10/checks.json)现覆盖 4 次浏览器运行及两个 DB 快照。
- WEB-10 仍 `[ ]`，`WEB-CHECK-01～18` 仍 `NOT_RUN`。下一增量处理历史补记、迟完成/取消、反向与冲突；本任务不能仅凭增量探针勾选。复核人 Codex。

### 2026-09-29 09:00 CST｜WEB-10｜历史业务日上下文与补记反馈修复

- 新增本人只读 `GET /plans/{id}/checkin-context/{businessDate}`、`CheckinContextDto` 和 OpenAPI 第 85 个操作；服务端按计划时间线返回该日可新记/修正、规则/数值版本和原记录，Web 计划详情按业务日期开放补记与近期历史。API 兼容记录与 WEB-10 增量说明已更新。锁定的 Web 技术方案源文件曾尝试补充此说明，源摘要同步被自动审批拒绝（会绕过用例再生成），因此撤回该源文件改动；原 136 条验收基线和摘要校验维持有效。完整质量门禁在上下文服务端初版通过，前端反馈修复后仍需复跑。
- [首次浏览器中间截图](./atdd/web/evidence/WEB-10/backfill-chrome-390/)与 DB 表明补记写入成功，但刷新上下文卸载表单、成功提示消失，浏览器等待超时。修复为同日期刷新期间保留上下文后，[Chrome 390×844 完整复测](./atdd/web/evidence/WEB-10/backfill-chrome-390-v2/)显示规则 V1、昨日业务日期与保存反馈，API 上下文 GET/打卡 PUT/刷新 GET 均 200；[DB 快照](./atdd/web/evidence/WEB-10/db-backfill.txt)证明 `is_backfilled=true`、修订 1、审计一条。[WEB-10 SHA 清单](./atdd/web/evidence/WEB-10/checks.json)现覆盖五次完整浏览器运行。
- WEB-10 `[ ]`，`WEB-CHECK` 全部 `NOT_RUN`；继续处理历史规则变化、非应执行日期、终态迟完成/取消和故障反向。复核人 Codex。

### 2026-09-29 09:08 CST｜WEB-10｜非应执行日反向核验

- [Chrome 390×844 反向浏览器运行](./atdd/web/evidence/WEB-10/not-due-chrome-390/)从周一可补记切换到同计划周二，页面无表单，网络无记录 PUT；[DB](./atdd/web/evidence/WEB-10/db-not-due.txt)为零记录。[SHA-256 清单](./atdd/web/evidence/WEB-10/checks.json)现有六次完整浏览器运行。前端生产构建及根目录完整 `npm run check` 均通过；尝试在 Web 包目录运行不存在的 `check` 脚本失败后，已改用根目录命令完成质量门禁。
- WEB-10 `[ ]`，全部 `WEB-CHECK` 仍 `NOT_RUN`。后续补规则变更跨版本、每周空白日、一次性迟完成/取消与故障/权限反向。复核人 Codex。

### 2026-09-29 09:11 CST｜WEB-10｜每周空白日补记

- [Edge 1280×800 浏览器运行](./atdd/web/evidence/WEB-10/weekly-backfill-edge-1280/)对每周 3 次计划的空白历史日读取上下文 V1 后补记，网络 GET/PUT/GET 均 200；[DB](./atdd/web/evidence/WEB-10/db-weekly-backfill.txt)为唯一昨日成功记录且 `is_backfilled=true`。[SHA-256 清单](./atdd/web/evidence/WEB-10/checks.json)增至七次完整浏览器运行。WEB-10 和所有 CHECK 主用例仍未签发；复核人 Codex。

### 2026-09-29 09:17 CST｜WEB-10｜取消与迟完成终态

- [Chrome 360×780 取消运行](./atdd/web/evidence/WEB-10/one-time-cancel-chrome-360/)和[DB 唯一终态/审计](./atdd/web/evidence/WEB-10/db-one-time-cancel.txt)通过。迟完成用[浏览器合规创建](./atdd/web/evidence/WEB-10/one-time-late-create-chrome-390/)加[隔离 DB 仅一行受控截止日夹具](./atdd/web/evidence/WEB-10/db-late-fixture.txt)模拟跨日；首次复登录遇短信频率限制，没有终态提交；冷却后[Edge 完整运行](./atdd/web/evidence/WEB-10/one-time-late-complete-edge-1280-v2/)显示逾期完成，[DB 日期对照](./atdd/web/evidence/WEB-10/db-one-time-late.txt)为截止 9/28、完成 9/29。[SHA-256 清单](./atdd/web/evidence/WEB-10/checks.json)增至十次完整浏览器运行。此不等同真实时钟跨日验收；WEB-10 `[ ]`，CHECK 主用例均 `NOT_RUN`。复核人 Codex。

### 2026-09-29 09:24 CST｜WEB-10｜未知结果同键重试增量

- 今日打卡在网络未知/5xx 后保留原请求、操作 ID、幂等键及已上传媒体引用，输入冻结并明确提示“重试原操作”。[Chrome 390×844 离线→在线运行](./atdd/web/evidence/WEB-10/retry-chrome-390/)的两次 PUT 分别为 0/200，脱敏幂等键 SHA-256 相同；[DB](./atdd/web/evidence/WEB-10/db-retry.txt)只有一条记录和一条修订审计。[WEB-10 哈希清单](./atdd/web/evidence/WEB-10/checks.json)增至十一组。该场景为请求未送达后重试，提交后响应丢失与跨刷新续传仍待 WEB-12；WEB-10 `[ ]`，主用例均 `NOT_RUN`。复核人 Codex。

### 2026-09-29 09:34 CST｜WEB-10｜一次性结果未知后的同键恢复

- 一次性结果也保留原终态请求体、媒体引用、首次/修正方式及幂等键，未知结果时冻结表单并提供原操作重试。[Chrome 390×844 断网→联网运行](./atdd/web/evidence/WEB-10/one-time-retry-chrome-390/)的终态 POST 为 0/201，两次键摘要一致，截图无横向溢出；[DB 唯一终态](./atdd/web/evidence/WEB-10/db-one-time-retry.txt)显示修订 1、审计 1、终态 1。[WEB-10 证据哈希清单](./atdd/web/evidence/WEB-10/checks.json)现覆盖十二组浏览器运行。此探针不证明服务端提交后响应丢失或刷新/多标签恢复；WEB-10 `[ ]`，`WEB-CHECK-01～18` 均 `NOT_RUN`。复核人 Codex。

### 2026-09-29 09:39 CST｜WEB-10｜提交成功但响应丢失复测

- 隔离浏览器工具在终态服务器响应 201 后单次丢弃浏览器响应，保留[受控 Chrome 390×844 时间线、截图与脱敏网络](./atdd/web/evidence/WEB-10/one-time-response-loss-chrome-390/)；页面首次见 POST 0 和结果未知，再以同键 POST 201 恢复。两次键哈希相同，[DB 快照](./atdd/web/evidence/WEB-10/db-one-time-response-loss.txt)仅一条终态、修订 1、审计 1。[WEB-10 校验清单](./atdd/web/evidence/WEB-10/checks.json)增至十三组浏览器运行。此证据只覆盖同一页面的一次性结果；刷新/多标签、循环记录同类故障和完整反向断言仍未完成，WEB-10 `[ ]`，正式 CHECK 全 `NOT_RUN`。复核人 Codex。

### 2026-09-29 09:47 CST｜WEB-09/10｜媒体完成失败后的单独恢复

- [WEB-10 实时记录](./atdd/web/WEB-10-今日打卡页面增量记录.md)保留首轮采集定位器超时、DB 已 ready 的诊断过程；第二轮走通后发现待绑定时写入按钮仍显得可用，现已禁用一次性和循环结果修改按钮，单独媒体重试有忙碌保护。最终[Chrome 390×844 完整复测](./atdd/web/evidence/WEB-10/media-complete-retry-chrome-390-v3/)显示终态 POST 201 仅一次、媒体完成首个 POST 0/重试 201，待绑定截图及恢复截图可复核按钮状态；[DB](./atdd/web/evidence/WEB-10/db-media-complete-retry-v3.txt)证实终态、修订、审计、ready 照片各 1。[14 组浏览器哈希清单](./atdd/web/evidence/WEB-10/checks.json)通过。WEB-09 缩略图/清理/边界及 WEB-10 完整 F/V/N 仍缺，两个任务均 `[ ]`，正式用例未签发。复核人 Codex。

### 2026-09-29 14:05 CST｜WEB-09/10｜本人照片回顾

- 结果页面新增显式打开的私人照片预览，鉴权 API 每次签发短时下载 URL，Web 只在内存中持有，可刷新；证据工具遮盖 DOM 中的签名 URL。[Chrome 390×844 上传并回顾截图/网络](./atdd/web/evidence/WEB-09/private-gallery-chrome-390/)显示对象图片 GET 200、`naturalWidth>0`、无横向溢出；[WEB-09 16 文件哈希清单](./atdd/web/evidence/WEB-09/checks.json)通过。此为原图 CSS 缩放，派生缩略图、跨账号拒绝、签名过期与删除清理尚缺。用量中断后隔离 DB 不可连接，本次无 DB 快照；不签发正式用例，WEB-09/10 均 `[ ]`。复核人 Codex。

### 2026-09-29 14:17 CST｜WEB-09｜跨账号照片拒绝

- 新隔离环境中，[A 的 Chrome 本人预览](./atdd/web/evidence/WEB-09/private-owner-chrome-390/)获取短时 URL 与对象图片均 200；[B 的独立 Edge 会话](./atdd/web/evidence/WEB-09/private-other-edge-1280/)为同一 media ID 请求下载 URL 返回 404，未发起对象 GET。[DB 归属快照](./atdd/web/evidence/WEB-09/db-cross-account-media.txt)证明 ready 照片属于 A、B 不拥有。[WEB-09 41 文件哈希清单](./atdd/web/evidence/WEB-09/checks.json)通过。环境恢复时 Vite 首次代理错指 3000 导致 API 就绪探针失败，显式改为隔离 API 3001 后重跑成功；详情在 [WEB-09 实时记录](./atdd/web/WEB-09-私人媒体链路.md)。签名链接到期及持有者访问、派生缩略图与清理待测，WEB-09 `[ ]`，正式 SEC/CHECK 用例仍 `NOT_RUN`。复核人 Codex。

### 2026-09-29 14:22 CST｜WEB-09｜签名到期供应端探针

- [受控对象签名到期原始输出](./atdd/web/evidence/WEB-09/object-expiry.txt)：同一私有对象的一秒签名链接先 GET 200，等待约 2.2 秒后 GET 403；无签名 403，对象删除和不存在核对完成。[WEB-09 哈希清单](./atdd/web/evidence/WEB-09/checks.json)增至 42 文件。这只覆盖本地对象供应端一秒签名，不代替 API 300 秒链接的真实浏览器到期或权限撤销；WEB-09 `[ ]`，正式 `WEB-SEC-07` 仍 `NOT_RUN`。复核人 Codex。

### 2026-09-29 14:28 CST｜WEB-09｜第十张与纯结果反向

- [Chrome 390×844 两张状态截图和脱敏网络](./atdd/web/evidence/WEB-09/tenth-photo-chrome-390/)显示选择 10 张同一合成 PNG 后提示最多 9 张；移除选择仍可提交无照片的一次性取消终态，只有终态 POST 201，没有上传意图、对象或媒体完成请求。[DB 快照](./atdd/web/evidence/WEB-09/db-tenth-photo-pure-result.txt)证明唯一终态、审计各 1，关联媒体 0。[WEB-09 56 文件哈希清单](./atdd/web/evidence/WEB-09/checks.json)通过。此不覆盖恰好 9 张、20 MB、MIME 和循环记录等完整用例，WEB-09 `[ ]`，`WEB-CHECK-13` 仍 `NOT_RUN`。复核人 Codex。

### 2026-09-29 14:35 CST｜WEB-09｜20 MB 上限反向

- [Chrome 390×844 超限错误与纯结果截图/网络](./atdd/web/evidence/WEB-09/oversize-photo-chrome-390/)证明 20,971,521 字节合成 PNG 被拒，移除后纯结果终态 POST 201；无上传意图、对象 PUT 或媒体完成。[DB](./atdd/web/evidence/WEB-09/db-oversize-pure-result.txt)为唯一终态、审计 1、照片 0。[WEB-09 70 文件哈希清单](./atdd/web/evidence/WEB-09/checks.json)通过。恰好 20 MB 正向、服务端伪造请求、MIME 和九张正向仍待测；WEB-09 `[ ]`，正式 CHECK 不变。复核人 Codex。

### 2026-09-29 14:41 CST｜WEB-09｜九张正向边界

- [Chrome 390×844 九张上传与预览](./atdd/web/evidence/WEB-09/nine-photos-chrome-390/)的网络含上传意图、对象 PUT、媒体完成、下载 URL、对象 GET 各 9 次成功，终态 POST 201 仅一次；页面双列预览无横向溢出，9 个签名 `src` 在 DOM 证据中全部遮盖。[DB](./atdd/web/evidence/WEB-09/db-nine-photos.txt)证实唯一终态和审计、9 张全 ready。[WEB-09 85 文件哈希清单](./atdd/web/evidence/WEB-09/checks.json)通过。与十张拒绝形成数量边界，但格式、单张正向上限、缩略图和清理仍缺；WEB-09 `[ ]`，`WEB-CHECK-13` 尚未签发。复核人 Codex。

### 2026-09-29 14:43 CST｜WEB-11｜日历与权威统计页面开始

- [WEB-11 实时记录](./atdd/web/WEB-11-日历详情与统计增量记录.md)已在编码前建立：`/calendar` 仍为占位页，详情尚未展示 API 的统计 DTO。先接入按计划业务日期的月/日视图与三类权威统计展示，再做手机/桌面和历史修正后刷新探针；冻结时钟的正式 `WEB-STAT-01～12` 全部继续 `NOT_RUN`。WEB-11 `[ ]`，复核人 Codex。

### 2026-09-29 14:59 CST｜WEB-11｜月/日历手机增量与路由缺陷修复

- `/calendar` 已替换占位页，手机 Chrome 390×844 创建每日计划、查看 9 月月格和 9 月 27 日日详情、切换至 8 月成功。初次探针发现查询参数导致路由退回默认页面，已修复并保留失败与成功两轮证据。成功运行的 [截图和动作/网络证据](./atdd/web/evidence/WEB-11/calendar-chrome-390-v3/) 显示日历 API 200、无横向溢出、控件无视口宽度越界；详见 [WEB-11 增量记录](./atdd/web/WEB-11-日历详情与统计增量记录.md)。计划详情统计、桌面/时区/修正与正式 `WEB-STAT-01～12` 尚未完成，任务保持 `[ ]`。

### 2026-09-29 15:04 CST｜WEB-11｜详情三类统计与自动刷新

- 固定计划保存补记后统计自动请求并显示分母 2、完成率 50.0%，日历同步显示成功；同路径已在手机 Chrome 与桌面 Edge 跑通。周中开始的周目标显示完整周 0、达标周 0；一次性结果从待处理变为按时完成。每轮截图、动作、DOM、网络和布局见 [WEB-11 增量记录](./atdd/web/WEB-11-日历详情与统计增量记录.md)。正式用例与冻结时钟、跨时区等仍待执行，WEB-11 保持 `[ ]`。

### 2026-09-29 15:48 CST｜WEB-11｜增量证据索引与构建

- [WEB-11 校验索引](./atdd/web/evidence/WEB-11/checks.json) 对五轮手机/桌面浏览器产物保存 71 个 SHA-256，并与 [隔离库只读事实](./atdd/web/evidence/WEB-11/db-statistics.txt) 对照。仓库 `npm run check`、Web `npm run build`、JSON 账本校验通过；正式验收通过数仍为 0，任务保持 `[ ]`。

### 2026-09-29 16:11 CST｜WEB-11｜部分周与跨时区复核

- 周日历现按计划时区分辨未开始、本周进行中和历史部分周；周中起始计划已重跑。相同账号在 Honolulu 与上海浏览器时区均显示上海计划的 `2026-09-29` 业务日，相关截图、API 200、数据库只读对照和 97 文件哈希见 [WEB-11 增量记录](./atdd/web/WEB-11-日历详情与统计增量记录.md)。冻结时钟和全套 `WEB-STAT` 正式断言未执行，WEB-11 `[ ]`。

### 2026-09-29 16:12 CST｜WEB-14｜好友与消息页面开始

- 已在编码前建立 [WEB-14 实时记录](./atdd/web/WEB-14-好友分享消息增量记录.md)。现有 API 具备搜索、好友关系、分享、鼓励和持久消息；Web `/friends`、`/inbox` 为占位页。先实现基础好友与消息流程，再补分享和权限反向路径；`WEB-SOCIAL-01～14` 保持 `NOT_RUN`，任务 `[ ]`。

### 2026-09-29 16:41 CST｜WEB-14｜好友申请与持久消息增量

- 甲/乙两个合成账号已通过手机浏览器完成精确用户名搜索、申请、接受、消息标记已读；隔离库确认 1 条好友关系、1 条申请消息且已读。截图、网络、DOM、动作与布局详见 [WEB-14 实时记录](./atdd/web/WEB-14-好友分享消息增量记录.md)；正式 `WEB-SOCIAL-01～14` 未执行完，WEB-14 保持 `[ ]`。

### 2026-09-29 17:17 CST｜WEB-14｜授权、只读留言与撤销反向探针

- 甲完成逐计划预览后授权，乙在只读历史看到文字并留言，甲撤销后乙旧深链 API 403 且 DOM 无计划名/备注。同账号桌面 Web 显示手机已读消息，DB 核对分享已撤销、留言与消息事件各一条。[WEB-14 记录及 7 轮、96 文件哈希证据](./atdd/web/WEB-14-好友分享消息增量记录.md)已同步；完整 `WEB-SOCIAL-01～14` 尚未签发，任务 `[ ]`。

### 2026-09-29 19:12 CST｜执行顺序调整与 WEB-16 开始

- 按用户指令，接下来优先完成首版缺失的代码与业务流程，暂停新增密集的浏览器验收探针；现有证据保留，正式用例仍 `NOT_RUN`，功能齐备后集中验收。WEB-14 的 JSON 已补齐。[WEB-16 编码前实时记录](./atdd/web/WEB-16-站内提醒与浏览器通知增量记录.md)已建立：先实现 Web 分端偏好、Push 订阅 UI/Service Worker、计划站内即时提示，任务 `[ ]`。

### 2026-09-29 19:23 CST｜WEB-16 通知功能代码增量

- 设置页已接入 Web 独立偏好与浏览器订阅、取消；Service Worker 限定通用通知和站内跳转；打开网页时按计划时区展示即时待办横幅，退出时清理当前浏览器订阅。源码路径、降级边界见 [WEB-16 增量记录](./atdd/web/WEB-16-站内提醒与浏览器通知增量记录.md)。
- Prettier、Web TypeScript 与生产构建通过。按当前代码优先顺序未新增浏览器探针；`WEB-NOTIFY-01～16` 仍 `NOT_RUN`，WEB-16 保持 `[ ]`。

### 2026-09-29 19:26 CST｜WEB-17 开始与服务端缺口

- 先审计既有导出/注销/最终清理服务，发现注销撤销仅生成 iOS JSON 刷新令牌，尚无 Web 安全 Cookie 恢复入口。已先建立 [WEB-17 编码前增量记录](./atdd/web/WEB-17-导出删除会话服务端增量记录.md)，接下来补齐 Web 撤销端点并继续检查导出与最终清理。任务仍 `[ ]`，正式数据用例继续 `NOT_RUN`。

### 2026-09-29 19:28 CST｜WEB-17 服务端代码增量

- 新增 `auth/web/deletion-cancel`，撤销注销后创建 Web 会话并以安全 Cookie 返回刷新会话；注销事务立即关闭 Web Push 订阅。OpenAPI 86 项、旧契约兼容和 API TypeScript 检查通过。完整范围见 [WEB-17 记录](./atdd/web/WEB-17-导出删除会话服务端增量记录.md)；Worker 和浏览器正式验收未完成，任务继续 `[ ]`。

### 2026-09-29 19:29 CST｜WEB-18 页面编码前计划

- 已先建立 [WEB-18 增量记录](./atdd/web/WEB-18-导出账号删除设置页面增量记录.md)，接下来接入导出任务与下载、账号注销二次确认和短信撤销恢复。任务保持 `[ ]`，`WEB-DATA-01～10` 仍 `NOT_RUN`。

### 2026-09-29 19:36 CST｜WEB-18 导出与账号管理代码增量

- 设置页已实现导出历史/进度、创建与按需签名下载，展示有效期、文件数量/大小和哈希；注销二次确认后清除私人页面并提供独立短信撤销入口。Web 生产构建通过，原始输出与 SHA-256 见 [WEB-18 记录](./atdd/web/WEB-18-导出账号删除设置页面增量记录.md)。
- 本轮继续以功能代码为先，未运行浏览器数据管理矩阵；WEB-18 保持 `[ ]`，`WEB-DATA-01～10` 均 `NOT_RUN`。WEB-17 的 API、OpenAPI 与兼容检查证据已存于[对应记录](./atdd/web/WEB-17-导出删除会话服务端增量记录.md)。

### 2026-09-29 19:40 CST｜WEB-12 冲突体验编码前审计

- 已先建立 [WEB-12 增量记录](./atdd/web/WEB-12-在线并发冲突增量记录.md)。现有未知提交原键重试和照片独立恢复可复用，下一步补前端 409 冲突详情与版本选择。`WEB-ONLINE-01～08` 均 `NOT_RUN`，任务保持 `[ ]`。

### 2026-09-29 19:49 CST｜WEB-12 冲突与离线代码增量

- 循环打卡现可并排查看冲突的服务器/本机版本，并明确选择保留或二次确认覆盖；登录及私人页断网时显示状态。保存使用新幂等键、当前修订和冲突 ID，代码与构建证据见 [WEB-12 记录](./atdd/web/WEB-12-在线并发冲突增量记录.md)。
- Web 构建及相关 lint 通过；未扩展浏览器网络矩阵，`WEB-ONLINE-01～08` 均 `NOT_RUN`，任务保持 `[ ]`。

### 2026-09-29 19:58 CST｜WEB-17 导出清单与 WEB-12/18 代码补充

- WEB-17 的 ZIP 清单补齐数值配置与记录字段、分端通知偏好和站内消息；一次导出专项冒烟通过，原始输出及哈希见 [WEB-17 记录](./atdd/web/WEB-17-导出删除会话服务端增量记录.md)。WEB-12 冲突对照改为读取实际提交快照；WEB-18 在跨标签会话撤销时同时清除内存资料。最终 Web 构建通过，[输出及哈希](./atdd/web/evidence/WEB-12/web-build.txt)已归档。
- 三项任务仍均 `[ ]`；真实照片 ZIP、浏览器下载/注销、双标签网络与冲突验收均未签发，相关用例保持 `NOT_RUN`。

### 2026-09-29 19:59 CST｜WEB-16 通知状态补充

- 即时提示加入同浏览器多标签领取去重；新增 Web 当前设备订阅状态 API，并与本地订阅状态共同显示。代码范围、Web 构建和 87 路由 OpenAPI 原始输出/哈希见 [WEB-16 记录](./atdd/web/WEB-16-站内提醒与浏览器通知增量记录.md)。`WEB-NOTIFY-01～16` 仍 `NOT_RUN`，任务 `[ ]`。

### 2026-09-29 20:03 CST｜代码优先阶段项目静态门禁

- `npm run check` 首轮因 Service Worker 全局 `URL` lint 失败，次轮因修正行格式失败；两次原始输出留存。修正后第三轮完整通过，含 87 路由契约、所有 TypeScript 包及安全/部署静态检查，输出与三个 SHA-256 见 [WEB-16 项目门禁记录](./atdd/web/WEB-16-站内提醒与浏览器通知增量记录.md)。本阶段仍未扩大浏览器验收，用例状态不变。

### 2026-09-29 20:06 CST｜WEB-19 无障碍功能编码前审计

- 已建立 [WEB-19 增量记录](./atdd/web/WEB-19-响应式主题无障碍增量记录.md)。静态审计发现四处危险确认层缺模态焦点管理；先完成原生对话框实现，浏览器视口/键盘/读屏矩阵仍后置，任务 `[ ]`。

### 2026-09-29 20:12 CST｜WEB-19 模态焦点功能代码

- 四处危险确认层已换为共用的原生模态对话框，新增 Esc、初始安全焦点、关闭回焦及窄屏纵向滚动。Web 构建通过，原始输出与哈希见 [WEB-19 记录](./atdd/web/WEB-19-响应式主题无障碍增量记录.md)。`WEB-UI-01～16` 未正式运行，任务 `[ ]`。

### 2026-09-29 20:18 CST｜WEB-20 浏览器后退缓存安全编码前审计

- 已建立 [WEB-20 增量记录](./atdd/web/WEB-20-安全隐私故障注入增量记录.md)。发现页面从 BFCache 恢复时未强制重验会话，旧 React 私人状态可能再次呈现；先补生命周期保护。依代码优先安排，`WEB-SEC-01～12` 暂不做完整浏览器故障注入，任务保持 `[ ]`。

### 2026-09-29 20:21 CST｜WEB-20 后退缓存代码增量

- Web 页面离开前同步移除私人视图；从后退缓存恢复后强制校验服务端会话并重取资料，失败时只显示重试反馈。切换登录账号也先清空旧资料。构建输出和 SHA-256 见 [WEB-20 记录](./atdd/web/WEB-20-安全隐私故障注入增量记录.md)；真实浏览器故障注入后置，`WEB-SEC-06` 未标为通过，任务 `[ ]`。

### 2026-09-29 20:24 CST｜WEB-22 静态站部署编码前审计

- 已建立 [WEB-22 增量记录](./atdd/web/WEB-22-Web静态站部署增量记录.md)。现有部署把入口 `/` 给 API，Web 只有本地 Vite 服务；先补同站点 Web 静态服务、镜像与路由代码。根据用户本轮代码优先要求，WEB-22 先进入代码开发，正式 WEB-21 和真实环境发布验收仍后置，任务 `[ ]`。

### 2026-09-29 20:30 CST｜WEB-22 静态服务代码及部署清单审批阻断

- 已新增只读 Web 静态服务、独立 Dockerfile、SPA 深链/API 隔离与 CSP/缓存头，并完成单次静态冒烟。原始输出和 SHA-256 见 [WEB-22 记录](./atdd/web/WEB-22-Web静态站部署增量记录.md)。
- 自动审批拒绝了改变生产 Ingress `/` 路由并新增 Web Deployment 的清单补丁，理由是可能中断现有入口；部署清单和发布脚本未改，已请求用户就此明确授权。WEB-22 `[ ]`，发布环境与浏览器验收仍待执行。

### 2026-09-29 20:33 CST｜代码优先阶段完整静态门禁

- 本轮 `npm run check` 通过，涵盖格式、lint、TypeScript、87 路由契约、兼容和已有部署/安全静态检查；原始输出与哈希见 [WEB-22 记录](./atdd/web/WEB-22-Web静态站部署增量记录.md)。该结果不含正式浏览器矩阵，亦不证明被自动审批阻断的 Web 部署入口已经实现。

### 2026-09-29 20:38 CST｜用户授权 Web 部署

- 用户已明确同意部署并要求项目运行手册。WEB-22 继续编码同站点 Web Deployment/Service/Ingress 与发布顺序；先让后端就绪再更新入口。真实环境结果仍以实际镜像、TLS、对象域和集群记录为准，任务 `[ ]`。

### 2026-09-29 20:51 CST｜WEB-22 部署代码与运行手册交付

- Web Deployment/Service 和 `/api/v1`→API、`/`→Web 的同站点 Ingress 已入清单；发布脚本等待三组工作负载就绪后才应用入口。已生成 [项目运行手册](./项目运行手册-计划打卡-Web-v1.md)并更新 OPS-05。
- 预发示例清单渲染、部署静态检查、Web 镜像本机构建/容器健康与首页检查、完整 `npm run check` 均通过；证据和 SHA-256 见 [WEB-22 记录](./atdd/web/WEB-22-Web静态站部署增量记录.md)。本机无 `kubectl` 上下文，镜像未推送且缺正式域名/TLS/对象来源，故未执行真实部署；WEB-22 `[ ]`，正式浏览器用例仍 `NOT_RUN`。

### 2026-09-30 10:09 CST｜localhost 本地服务已启动

- 用户要求默认本地域名并实际启动。Vite 默认 host 已改为 `localhost`，现可通过 `http://localhost:5173/` 打开；`/plans` 深链与 `/api/v1/health/live` 同域代理均返回 200。PostgreSQL/Redis/对象存储、API、Worker、Web 处于运行状态；本地两项 Web 迁移已应用。命令、端口、首次工作目录 404 修复和 SHA-256 见 [WEB-22 记录](./atdd/web/WEB-22-Web静态站部署增量记录.md)。
- 本轮只做启动与健康检查，任务 WEB-22 仍 `[ ]`，不把 136 项正式浏览器用例标为通过。

### 2026-09-30 10:20 CST｜局域网入口代码审计

- 用户要求把本地链接改为局域网地址。现有 API 对非 loopback Web 来源要求 HTTPS，安全 Cookie 与照片签名 URL 也依赖同源/可信入口；将以 `172.27.117.5` 的开发 HTTPS 入口、同源 API/对象代理实现，保持数据库、Redis 与对象存储端口仅本机可达。编码与最小启动证据见 [WEB-22 记录](./atdd/web/WEB-22-Web静态站部署增量记录.md)，任务 `[ ]`。

### 2026-09-30 10:44 CST｜局域网入口已启动，防火墙规则已创建

- Web 已监听 `0.0.0.0:5173` 并通过 `https://172.27.117.5:5173/` 提供局域网入口；首页、深链、同源 API 健康与签名对象代理完成最小冒烟。API、数据库、Redis、对象存储仍只监听回环地址。具体实现、证书期限、观察和原始证据见 [WEB-22 记录](./atdd/web/WEB-22-Web静态站部署增量记录.md)。
- 用户已授权并通过 Windows 管理员确认创建 Private 网络、本地子网、TCP 5173 入站规则；规则及过滤器复查符合范围。实体设备访问和证书信任尚未核验。WEB-22 仍 `[ ]`，正式用例不据此改为 `PASS`。

### 2026-09-30 11:18 CST｜WEB-05 本地验证码交付说明

- 用户反馈手机收不到验证码。查明当前开发环境使用短信桩，验证码写入被忽略的本机收件箱，并未交付到手机；已修正登录页开发模式提示和运行手册，避免继续宣称“已发送至手机”。不向浏览器 API 泄露验证码，真实短信仍需短信网关配置。记录见 [WEB-05 增量](./atdd/web/WEB-05-SPA骨架与登录.md)。任务 `[ ]`，正式 `WEB-AUTH` 用例状态不变。

### 2026-09-30 11:30 CST｜WEB-12 局域网网络状态误报审计

- 用户反馈局域网页面提示网络不可用，但本机同源网页/API 均返回 200。发现前端把浏览器 `navigator.onLine` 当作服务可达性，并可能把安全随机数 API 缺失误归类成网络错误。开始改为同源探测与明确错误分类；先修功能，正式网络/并发用例仍 `NOT_RUN`。见 [WEB-12 增量](./atdd/web/WEB-12-在线并发冲突增量记录.md)。

### 2026-09-30 11:45 CST｜WEB-12 局域网误报修正完成

- 已改用同源 API 健康检查驱动连接提示，安全请求标识支持安全随机 UUID v4 回退，并把真实请求失败与浏览器安全能力不足分开提示。构建、TypeScript、定向 lint、UUID 回退及局域网入口检查通过；详见 [WEB-12 增量与证据](./atdd/web/WEB-12-在线并发冲突增量记录.md)。另一台设备上的重试结果尚未取得，WEB-12 保持 `[ ]`，正式用例不标 `PASS`。

### 2026-09-30 22:00 CST｜局域网服务再次启动

- 用户要求恢复本地服务。Docker Desktop、PostgreSQL、Redis、对象存储、API、Worker 和 Web 已依序启动；局域网入口、登录页与同域 API live/ready 均为 200，防火墙规则仍在。执行命令和边界见 [WEB-22 启动记录](./atdd/web/WEB-22-Web静态站部署增量记录.md)。本次只核对服务存活，WEB-22 继续 `[ ]`，正式验收用例不变。

### 2026-10-02 23:14 CST｜WEB-22 局域网可用性复查开始

- WLAN IP 已变化且所有本地服务停止，旧证书与来源配置仍指向旧 IP；当前不能通过旧局域网链接使用。防火墙规则仍受限于 Private/LocalSubnet TCP 5173。先修复本机地址配置并启动服务，再做最小连接、同源 API 和签名照片路径检查。短信桩和浏览器信任限制如实记录，任务继续 `[ ]`。详情见 [WEB-22 增量](./atdd/web/WEB-22-Web静态站部署增量记录.md)。

### 2026-10-02 23:34 CST｜WEB-22 局域网入口修复并记录运行限制

- 当前 WLAN 地址 `172.27.69.153` 的来源配置、自签证书和服务已恢复；新增 [可重复启动脚本](../scripts/start-lan.ps1)，经复用与实际重启路径核验。首页、登录、计划深链、API live/ready 返回 200，签名对象代理和独立容器连接通过。命令、端口、证书、哈希与边界见 [WEB-22 增量记录](./atdd/web/WEB-22-Web静态站部署增量记录.md)及[脱敏证据](./atdd/web/evidence/WEB-22-lan-recovery-20261002.txt)。
- [运行手册](./项目运行手册-计划打卡-Web-v1.md)已更新为当前入口和动态 IP 启动方式。实体设备尚未验证；自签证书需要设备信任，短信桩不会发送手机验证码。此项只完成本地局域网运行修复，WEB-22 仍 `[ ]`，全部正式浏览器用例维持原状态。

## 7. 决策与偏差记录

### 2026-10-03｜WEB-19 Pen样式改造代码完成、有限观察

- [x] 来源与生成：当前Pen摘要、结构化样式映射、36变量/24文案/19组页面、Noto字体与许可证。
- [x] 代码：480px居中单列与四项导航；有画板页面、独立详情路由、记录弹层、真实提醒规则编辑；保留业务与无画板内容。
- [x] 构建：类型、ESLint、格式、设计生成、生产构建与静态服务验证，原始输出和哈希已保存。
- [x] 有限观察：6个匿名登录视口/主题截图与布局JSON，无横向溢出，字体加载成功。
- [ ] 登录后观察：自动审批拒绝扩大仅回环的短信桩测试边界；原限制恢复，需另行授权测试方式。
- [ ] 正式验收：支持浏览器、读屏/键盘/缩放/对比度与全部页面F/V/N仍待执行，WEB-19总任务保持未勾选。
- 完整经过、变化、调试失败、截图与限制见 [WEB-19记录](./atdd/web/WEB-19-响应式主题无障碍增量记录.md)、[结构化证据JSON](./atdd/web/evidence/WEB-19/style-alignment-20261003.json)、[样式来源说明](./ui/Web样式对齐说明.md)。PRD/技术方案/验收矩阵已同步；用例没有因样式代码完成而标PASS。


### 2026-10-03 01:44 CST｜WEB-19 Pen 结构化样式改造开始

- 用户确认新视觉边界并要求开始：最大 480px 居中移动式单列容器、四项底部导航；当前 Pen 统一字体及公共样式，有画板页面对齐结构/固定文案，无画板页面保留现有内容并复用公共样式；保留深色与 Web 业务规则。原桌面侧栏/多列基线将同步修订。开发开始前记录已写入 [WEB-19 增量](./atdd/web/WEB-19-响应式主题无障碍增量记录.md)，代码、文档、来源生成及浏览器证据逐步更新，任务继续 `[ ]`。

每条偏差记录：发现时间、来源文件/行、矛盾内容、影响任务与用例、可选方案、最终决定、PRD/技术/ATDD/契约变更、复测范围和复核人。尚未核对真实代码路径时，不将技术方案中列出的新增端点视为已存在接口。注册开放、Web 在线、分端提醒、消息已读跨浏览器、部分周不计达标和 Web 独立验收等已确认边界不能被实现便利性改写。

### 2026-09-29 01:16 CST｜iOS Pen 画板来源摘要更新

- 发现：共享工作区的 `docs/ui/plan-checkin.pen` 出现 28 行替换，均为分组标题高度、文字纵坐标和字号；旧 SHA-256 `eb586ed8…d31e09` 与实际文件不符，台账校验如实失败。画板本身的编辑并非本次 Web 代码所做，保留原样。
- 决定：Web 以画板为视觉参考且不设逐像素阈值；136 条 Web 用例文本与证据要求未变。运行 `build_cases.py` 重建机器清单并将 `iosPen` 来源摘要更新为 `b1c94dbc…79939`，重新生成隔离工具样本；既无正式 PASS 也无可失效的业务结果。受影响为 WEB-02 来源核验、WEB-05 浏览器证据和未来 WEB-19/UI 用例。复核人 Codex；若画板再变，继续按来源变更流程处理。

## 8. 发布完成定义

WEB-01～WEB-22 全部勾选且 JSON 状态为 `DONE`；全部 136 个稳定 ID 与必需变体在当前候选构建有有效 `PASS`，`WEB-UI-01` 覆盖 16 页面键；证据文件存在、SHA-256 与 schema 校验通过；正式浏览器矩阵、受控 Web Push、数据权利、安全、部署/回滚均通过。Web 发布候选需单独记录尚未执行的 iOS 客户端联测为独立事项，不把它伪装成 Web 已验证能力。
