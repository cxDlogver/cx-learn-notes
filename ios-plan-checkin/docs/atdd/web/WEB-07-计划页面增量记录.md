# WEB-07｜计划与分组页面增量记录

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`；依赖 WEB-05 尚未完成，为解开 `WEB-AUTH-07` 对真实计划页的交叉依赖，只提前开发可逆页面，不签发任务完成 |
| 主验收 | `WEB-PLAN-01～18` 均 `NOT_RUN`；本文先跟踪代码、浏览器探针和缺口 |
| 来源 | [执行计划](../../任务执行计划-计划打卡-Web-v1.md) WEB-07、[Web PRD](../../PRD-计划打卡-Web-v1.md)、[技术方案](../../技术方案-计划打卡-Web-v1.md)、[验收矩阵](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) WEB-PLAN-01～18 |

## 开始时的范围与检查方式

第一增量接入权威 `GET /plans`、`POST /plans`、`GET /plans/{id}`，实现列表空态、三类创建表单（固定星期、周目标、一次性）、方向、计划时区、起止/截止日期和可选单一数值项，成功后到详情。前端拒绝固定计划空星期、周目标 0/8/非整数、一次性过期日期以及数值标签/单位只填一项；服务端仍是最终验证源。计划创建用同一幂等键，失败不显示成功态。手机 390×844 与桌面 1280×800 实测截图、DOM/AX、网络和布局，另保存隔离 DB 聚合。分组、编辑、规则版本、暂停/归档/删除和 WEB-PLAN 全参数矩阵在后续增量；上述未完成前主验收均不签发 PASS。

## 增量执行日志

### 2026-09-29 02:11 CST｜开始

- WEB-06 服务端已完成；WEB-05 客户端骨架与登录可用但正式 AUTH 用例未完成，WEB-02 外部证据保留尚缺。决定先开发计划页面以支持真实业务 UI 和 `WEB-AUTH-07`，任务状态只到 `IN_PROGRESS`。
- 风险：当前账号与浏览器证据来自隔离开发库，正式浏览器矩阵、候选提交锁定和 F/V/N 尚未执行。每个后续增量即时追加代码、实际结果、失败、证据与未完成清单。

### 2026-09-29 02:22 CST｜三类计划创建与详情增量

- 代码：新增 `apps/web/src/app/Plans.tsx`，接入 `GET /plans`、`POST /plans`、`GET /plans/{id}`。列表区分加载、错误重试和真实空态；创建表单覆盖固定星期、每周目标、一次性任务、要做/不要做、时区、日期及可选单一数值项；详情显示规则 V1 和时区。`apps/web/src/styles.css` 增加响应式表单与详情布局，`apps/web/src/app/App.tsx` 接入路由。TypeScript 编译曾发现详情路径可能为 `undefined`，修正后通过。
- Chrome 153 手机 390×844：[固定周一/三/五表单截图](./evidence/WEB-07/fixed-create-chrome-390-v2/screen-fixed-form.png)、[详情截图](./evidence/WEB-07/fixed-create-chrome-390-v2/screen-after.png)、[网络](./evidence/WEB-07/fixed-create-chrome-390-v2/network.json)、[布局](./evidence/WEB-07/fixed-create-chrome-390-v2/visual-result.json)。创建 201、详情 200、无横向溢出。[隔离库](./evidence/WEB-07/fixed-create-db.txt)记录 `fixed|do|Asia/Shanghai|2026-09-29|{1,3,5}|1|距离|公里`，证明规则 V1 和数值项。
- Edge 154 桌面 1280×800：[周目标 7 与“不要做”详情截图](./evidence/WEB-07/weekly-create-edge-1280/screen-after.png)、[网络](./evidence/WEB-07/weekly-create-edge-1280/network.json)、[布局](./evidence/WEB-07/weekly-create-edge-1280/visual-result.json)显示创建 201、详情 200、无横向溢出。[隔离库](./evidence/WEB-07/weekly-create-db.txt)为 `weekly|avoid|Asia/Shanghai|7|1`。
- Chrome 153 手机 360×800：[一次性任务详情截图](./evidence/WEB-07/one-time-create-chrome-360/screen-after.png)、[网络](./evidence/WEB-07/one-time-create-chrome-360/network.json)、[布局](./evidence/WEB-07/one-time-create-chrome-360/visual-result.json)显示今日截止创建 201、详情 200、无横向溢出。[隔离库](./evidence/WEB-07/one-time-create-db.txt)为 `one_time|do|2026-09-29|2026-09-29|f|default`，提醒默认关闭。截图中窄屏时区文字折行较生硬，样式已调整为较窄标签列，但调整后的浏览器复测尚未执行。
- 首次固定计划采集遇到浏览器目标导航关闭，未生成完整证据；第二次 `fixed-create-chrome-390-v2` 成功。浏览器采集脚本新增中途截图、下拉选择和受控字段替换动作。`WEB-PLAN-01/04/06/08/17` 只有部分开发探针，完整参数组、反向断言和正式构建尚缺；18 项主用例均保持 `NOT_RUN`。

### 2026-09-29 02:23 CST｜执行环境阻断

准备继续采集固定计划空星期错误用例时，`exec_command` 的自动审批因账户用量上限未能完成，命令未执行。没有用其他执行路径绕过审批。`scripts/web-07-fixed-empty-steps.json` 仅是待执行步骤，不能作为浏览器证据。当前 WEB-07 为 `IN_PROGRESS`，未生成正式 `result.json`、未勾选任务。待自动审批恢复后继续执行此用例、重跑类型/格式/根检查并为上述原始材料生成 SHA-256 清单。

### 2026-09-29 02:47 CST｜恢复执行、反向探针与证据校验

- 隔离 API 曾误报未就绪：Windows PowerShell 不支持探针所用的 `-SkipHttpErrorCheck`，而真实同站点请求返回预期 401。修正 `scripts/run-web-atdd-browser-api.ps1`，在 401 异常响应中判定就绪，随后新隔离数据库迁移 13 项，API 与 Vite 代理就绪。
- 新账号在 Chrome 153、390×844 中提交“不能直接保存”但不选星期；[截图](./evidence/WEB-07/fixed-empty-chrome-390/screen-after.png)、[DOM](./evidence/WEB-07/fixed-empty-chrome-390/dom.html)、[网络](./evidence/WEB-07/fixed-empty-chrome-390/network.json)、[布局](./evidence/WEB-07/fixed-empty-chrome-390/visual-result.json)显示“至少选择一个星期”、`aria-invalid=true`、没有 `POST /plans`、无横向溢出。这是 WEB-PLAN-02 开发探针，尚未构成完整 F/V/N。
- [SHA-256 清单](./evidence/WEB-07/checks.json)核验四次浏览器运行、三份隔离 DB 聚合的原始文件、页面路径、成功创建 201/详情 200、空星期未发送创建请求，以及证据中不含测试手机号/验证码/刷新 Cookie 值。`node scripts/web-07-evidence.mjs` 通过。
- `npm run check`、Vite 生产构建、`python docs/atdd/web/check_execution_progress.py`、`git diff --check` 通过。根级检查曾因采集脚本格式失败，运行 Prettier 后通过。窄屏时区折行样式调整仍需浏览器复测；分组、编辑、生命周期及 18 项 PLAN 全参数正式验收均未完成，因此 WEB-07 仍 `[ ]`，18 项保持 `NOT_RUN`。

### 2026-09-29 02:51 CST｜生命周期确认操作开发中

- `apps/web/src/data/api.ts` 新增暂停、恢复、归档和显式确认删除的调用；`apps/web/src/app/Plans.tsx` 的详情页按当前生命周期展示可用操作，二次确认说明删除不可撤销及归档替代路径。每次操作使用当前 `revision`，成功后才更新详情或返回列表，错误保持在当前页。Web TypeScript 检查通过。
- 当前代码尚未经过生命周期浏览器操作与数据库复核；`WEB-PLAN-12～16` 仍 `NOT_RUN`，也未改变 WEB-07 任务勾选状态。下一步使用隔离数据库执行真实点击链路并采集截图/网络。

### 2026-09-29 02:56 CST｜生命周期链路浏览器复测

- Chrome 153、390×844 的 [复测网络记录](./evidence/WEB-07/lifecycle-chrome-390-v2/network.json)显示创建 201、暂停 201、恢复 201、归档 201、删除 200、删除后列表 200；[归档状态截图](./evidence/WEB-07/lifecycle-chrome-390-v2/screen-archived.png)显示中文“已归档”，[删除确认截图](./evidence/WEB-07/lifecycle-chrome-390-v2/screen-delete-confirm.png)列明不可撤销影响与归档替代入口。[布局](./evidence/WEB-07/lifecycle-chrome-390-v2/visual-result.json)为 390/390，无横向溢出或宽度外控件。
- [隔离库聚合](./evidence/WEB-07/lifecycle-v2-db.txt)为 `deleted|5|pause,resume,archive,delete|pending`，证明四次状态事件按顺序持久化，删除清理任务已排队。首次运行截图中状态仍为英文，随后已修正并用新账号完整复测；首次材料仍保留以记录修正过程。
- [证据清单](./evidence/WEB-07/checks.json)现核验六次浏览器运行、五份 DB 聚合及 SHA-256；`node scripts/web-07-evidence.mjs`、Web TypeScript 和 Vite 生产构建通过。`WEB-PLAN-12～16` 仍缺少时间边界、历史/照片/分享和 F/V/N，保持 `NOT_RUN`；WEB-07 `[ ]`。

### 2026-09-29 03:00 CST｜分组管理开发中

- 计划列表下接入权威分组列表、创建、重命名、删除确认与计划移组。删除说明计划进入未分组且记录保留；移组调用计划 `PATCH` 并携当前 `revision`，组重命名/删除携当前组 `revision`。错误留在页面，成功后重取组及计划。Web TypeScript 检查通过。
- `WEB-PLAN-15` 仍 `NOT_RUN`；接下来用隔离账号执行创建组、移动两个计划、重命名、删除组，并核对浏览器网络和数据库中的计划/记录存续。

### 2026-09-29 03:03 CST｜分组首轮探针中断

- 首轮 Chrome 手机运行在第 19 步点击返回计划时失败：通用 `a[href='/plans']` 优先匹配隐藏的桌面侧栏链接，采集器只取首个匹配节点，因宽高为 0 而判为不可用。隔离数据库已有首个计划，但采集器未输出完整截图/网络，故这轮**不列为验收证据**。
- 将步骤限定为内容区返回链接，换新隔离账号重跑；`WEB-PLAN-15` 保持 `NOT_RUN`。

### 2026-09-29 03:08 CST｜分组管理浏览器链路

- Chrome 153、390×844 的[完整网络记录](./evidence/WEB-07/groups-chrome-390-v2/network.json)显示两计划创建各 201、分组创建 201、两次计划移组 PATCH 200、分组重命名 PATCH 200、删除分组 DELETE 200。浏览器 [重命名截图](./evidence/WEB-07/groups-chrome-390-v2/screen-renamed.png)、[删除确认截图](./evidence/WEB-07/groups-chrome-390-v2/screen-delete-group-confirm.png)和[最终 DOM](./evidence/WEB-07/groups-chrome-390-v2/dom.html)可核对交互及两个计划回到未分组。[布局](./evidence/WEB-07/groups-chrome-390-v2/visual-result.json) 390/390，无横向溢出。
- [隔离库聚合](./evidence/WEB-07/groups-db.txt)为 `2|2|0`，分别是未删除计划数、其中未分组计划数、剩余分组数。该探针没有预置打卡历史，所以不能证明 WEB-PLAN-15 的“历史保留”断言。
- [证据清单](./evidence/WEB-07/checks.json)现核验七次完整浏览器运行、六份 DB 聚合及 SHA-256。首轮因隐藏侧栏选择器中断的残留文件不纳入有效运行。`WEB-PLAN-15` 仍 `NOT_RUN`；后续需含历史记录和桌面布局的完整 F/V/N。

### 2026-09-29 03:17 CST｜归档恢复服务端缺口修正

- 对照 `WEB-PLAN-14` 发现详情页提供归档后恢复，但 `PlansService.lifecycle` 仅接受暂停态恢复。已允许 `archived → active`，仍由领域时间线的恢复事件取消当日义务；旧请求/响应字段未变。`scripts/plans-smoke.mjs` 增加归档、恢复、修订号与事件顺序断言，首次运行发现后续旧修订号期望未更新，调整后[完整 PGlite 服务回归输出](./evidence/WEB-07/archive-resume-service.txt)通过。
- 重建 API 并使用全新隔离库后，Chrome 153、390×844 的[归档恢复网络](./evidence/WEB-07/archive-resume-chrome-390/network.json)记录两次状态操作均 201；[归档截图](./evidence/WEB-07/archive-resume-chrome-390/screen-archived.png)、[恢复后截图](./evidence/WEB-07/archive-resume-chrome-390/screen-after.png)和[数据库聚合](./evidence/WEB-07/archive-resume-db.txt)为 `active|3|archive,resume`，无横向溢出。
- [证据清单](./evidence/WEB-07/checks.json)现核验八次完整浏览器运行、七份 DB 聚合和服务回归输出的 SHA-256。该增量验证状态转移，`WEB-PLAN-14` 的历史可读、归档期间拒绝打卡、时间边界及完整 F/V/N 尚缺，保持 `NOT_RUN`。

### 2026-09-29 03:23 CST｜计划编辑与数值项页面开发中

- 计划详情新增编辑入口：标题、说明、固定星期或周目标、结束/截止日期按原类型编辑；未改变的规则不重复写版本。数值项名称/单位独立保存，调用创建或更新配置接口并携当前计划 `revision`。页面说明时区/开始日期不变、规则与单位向后生效。Web TypeScript 检查通过。
- 编辑尚未完成浏览器与数据库核查，`WEB-PLAN-10/11/18` 保持 `NOT_RUN`。下一步用隔离账号分别验证固定计划规则版本、周目标 N 和数值项历史单位。

### 2026-09-29 03:26 CST｜固定规则和数值项版本浏览器探针

- Chrome 153、390×844 的[网络](./evidence/WEB-07/edit-chrome-390/network.json)显示固定规则编辑 PATCH 200、数值项编辑 PATCH 200；[编辑表单](./evidence/WEB-07/edit-chrome-390/screen-edit-rule-form.png)、[最终详情](./evidence/WEB-07/edit-chrome-390/screen-after.png)显示 V2 次日生效和新单位；[布局](./evidence/WEB-07/edit-chrome-390/visual-result.json)无横向溢出。
- [隔离库版本行](./evidence/WEB-07/edit-db.txt)：规则 V1 `2026-09-29|1,3,5`，V2 `2026-09-30|1,2,5`；数值 V1 `距离|公里`，V2 `用时|分钟` 自 `2026-09-30` 生效，计划修订号为 3。证明版本追加，但未创建旧打卡记录，所以不能证明历史记录单位展示。
- [证据清单](./evidence/WEB-07/checks.json)现核验九次完整浏览器运行、八份 DB 聚合与服务回归输出的 SHA-256。`WEB-PLAN-10/18` 仍须旧记录、次日义务及完整 F/V/N；`WEB-PLAN-11` 周目标编辑也尚未执行，均保持 `NOT_RUN`。

### 2026-09-29 03:28 CST｜周目标编辑桌面探针

- Edge 154、1280×800 在“不要做”的周目标计划中将 N 从 7 改为 1；[网络](./evidence/WEB-07/weekly-edit-edge-1280/network.json)含计划 PATCH 200，[编辑表单](./evidence/WEB-07/weekly-edit-edge-1280/screen-weekly-edit-form.png)与[详情](./evidence/WEB-07/weekly-edit-edge-1280/screen-after.png)显示新目标和 V2，[布局](./evidence/WEB-07/weekly-edit-edge-1280/visual-result.json) 1280/1280，无横向溢出。
- [隔离库](./evidence/WEB-07/weekly-edit-db.txt)保留 V1 `2026-09-29|7`，V2 `2026-09-30|1`，修订号 2。[证据清单](./evidence/WEB-07/checks.json)现为十次完整浏览器、九份 DB 聚合及服务回归 SHA-256。没有该周已有打卡、部分周统计及 F/V/N，故 `WEB-PLAN-11` 仍 `NOT_RUN`。
