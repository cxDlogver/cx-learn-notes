# WEB-10｜今日、打卡、补记和修正页面增量记录

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`，执行计划仍 `[ ]` |
| 依赖偏差 | WEB-08 已完成；WEB-07 和 WEB-09 尚未完成，先接真实今日打卡与照片直传以解开 WEB-09 浏览器证据交叉依赖，不提前签发任务完成 |
| 主验收 | `WEB-CHECK-01～18` 全部 `NOT_RUN`；本文只记录开发增量和原始探针 |
| 来源 | [执行计划](../../任务执行计划-计划打卡-Web-v1.md) WEB-10、[Web PRD](../../PRD-计划打卡-Web-v1.md)、[验收矩阵](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) CHECK 域 |

## 2026-09-29 03:52 CST｜开始与第一增量边界

今日页已使用权威 `GET /today`，但卡片只能跳计划详情。第一增量计划接入循环计划当前业务日的成功/失败/跳过、文字与数值、原记录修正和可选照片直传；一次性终态与历史补记在后续增量。照片按先获上传意图、浏览器直接 PUT、再提交记录与完成绑定的顺序；上传失败不得阻断纯结果提交，未完成绑定不可标成已保存。表单只使用 `planBusinessDate`、`activeRuleVersion`、`canCheckIn` 和服务端修订号，不按浏览器日期猜规则。第一增量需手机与桌面截图、网络、数据库唯一记录/媒体关联和对象域预检证据；完整 18 项 F/V/N 未齐前均保持 `NOT_RUN`。

## 2026-09-29 04:07 CST｜循环计划浏览器与数据库增量

- 代码：[TodayCheckin.tsx](../../../apps/web/src/app/TodayCheckin.tsx) 接入成功/失败/跳过、失败原因、备注、当前业务日生效的数值项、照片选择及记录修正；[api.ts](../../../apps/web/src/data/api.ts) 增加原记录查询、幂等 PUT、上传意图与媒体完成绑定。今日列表在保存后重新读取服务端状态。浏览器证据工具只记对象域方法/状态，不记签名 URL；受限的 `upload-file` 仅接受工作区内小型图片夹具。
- 原始运行：[Chrome 390×844](./evidence/WEB-10/photo-checkin-chrome-390/) 从短信登录、建固定星期计划、选图到保存：`upload-intents 201 → OPTIONS 200 → 对象 PUT 200 → checkin PUT 200 → complete 201`；业务日期 `2026-09-29`，结果成功，数值 `2.5 公里`，一张图片。页面 `documentWidth=390`、无横向溢出/屏外控件。初次截图显示保存后仍有旧文件名，随后用 file input ref 清空并在第二次运行复核。
- 原始运行：[Edge 1280×800](./evidence/WEB-10/correction-edge-1280/) 用同一账号读取原记录，再改为失败、原因“天气影响”、数值 `1.2 公里`，追加第二张图片；GET 原记录 200、对象预检/PUT 200、checkin PUT 200、complete 201。截图中的文件输入已清空；页面 `documentWidth=1265≤1280`、无横向溢出/屏外控件。
- [数据库当前记录](./evidence/WEB-10/db-record.txt) 证明同计划同业务日仅一条记录：失败、修订号 2、`is_revised=true`、两张 ready 媒体；[修订审计](./evidence/WEB-10/db-revisions.txt) 为两条修订，版本 1→2。[证据校验和 SHA-256 清单](./evidence/WEB-10/checks.json) 断言浏览器网络、DOM、视口、截图和 DB 结果；首次脚本误把根路由 `/` 排除、要求桌面滚动条时文档宽度恰等于视口，修正为根路由和 `≤` 后通过。
- 工作区 `npm run check` 在新增上传工具前通过；本次代码完成后需重跑。`WEB-CHECK-01～18` 仍均为 `NOT_RUN`：do/avoid 全组合、一次性终态、历史补记、冲突/未知结果、边界/反向、深色与更多浏览器尚未完整执行。WEB-10 仍 `[ ]`。

## 2026-09-29 04:12 CST｜下一增量启动：一次性任务结果

计划详情已有一次性任务信息，但尚无终态入口。下一步按 `GET /plans/{id}/detail` 的 `statistics.resolution` 决定首次提交或修正，提供完成、失败、取消、实际完成时间、备注、数值与照片，并在浏览器中核对唯一终态和修订审计。现阶段不得把一次性用例标为通过。

## 2026-09-29 08:46 CST｜一次性结果浏览器与数据库增量

- 代码：[OneTimeResult.tsx](../../../apps/web/src/app/OneTimeResult.tsx) 在计划详情读取权威终态，首次使用 POST、修正使用 PATCH；表单提供完成/失败/取消、设备时区的实际完成时间、备注、数值和照片。已有完成时间未修改时提交原 ISO 时间，避免分钟输入截断秒精度；非进行中计划不能首次提交。私人照片复用签名直传，并在终态写入后完成绑定。[api.ts](../../../apps/web/src/data/api.ts) 增加详情、终态和一次性媒体方法。
- 首次[失败截图](./evidence/WEB-10/one-time-complete-chrome-390/screen-before.png)证明本机服务曾退出，浏览器 `ERR_CONNECTION_REFUSED`，没有写入业务数据。恢复 Docker Desktop、对象域、Vite 和新的隔离 API/DB 后，[Chrome 390×844 成功运行](./evidence/WEB-10/one-time-complete-chrome-390-v2/)显示详情 GET 200、上传意图 201、对象预检/PUT 200、终态 POST 201、媒体完成 201；结果完成、备注“已交付初稿”、数值 `12 页` 和一张照片，无横向溢出。
- [Edge 1280×800 修正运行](./evidence/WEB-10/one-time-correct-edge-1280/)从深链登录读取同一结果，改为失败并写“需要返工”，PATCH 200；原照片保持可见，桌面无横向溢出。[DB 结果](./evidence/WEB-10/db-one-time-result.txt)为唯一 `failed` 终态、修订 2、数值 `12 页`、一张 ready 照片；[DB 修订审计](./evidence/WEB-10/db-one-time-revisions.txt)为版本 1→2。第一次修订查询因 `revision` 列名歧义失败，显式限定 `r.revision` 后重新执行通过。
- [四次浏览器运行及 DB SHA-256 清单](./evidence/WEB-10/checks.json)已覆盖循环与一次性两个增量。仍需补测迟完成、取消、终态唯一性/重放、历史补记、冲突/未知结果与媒体故障反向；`WEB-CHECK-01～18` 仍均 `NOT_RUN`，WEB-10 仍 `[ ]`。

## 2026-09-29 08:49 CST｜下一增量启动：历史记录上下文

历史补记需要所选**计划业务日期**上的资格、规则版本和数值项版本；当前只可从今日接口获得今日版本，计划日历对空白的每周计划日期不返回条目，不能用浏览器日期或现行规则猜历史版本。拟增加只读 `GET /plans/{id}/checkin-context/{businessDate}`，由服务端领域时间线返回可新记/可修正、当天规则和数值配置、原记录；随后在计划详情按日期提供补记/修正入口。接口、OpenAPI、浏览器用例和数据库标记需要一同核验；主验收暂不改变。

## 2026-09-29 08:53 CST｜历史补记首跑与可见反馈缺陷

- 新增 `CheckinContextDto`、鉴权 `GET /plans/{id}/checkin-context/{businessDate}` 和 `PlanHistory` 日期/近期记录入口；OpenAPI 已从 84 更新到 85 操作，服务端按领域时间线返回历史规则版本及数值配置。重建隔离 API 后，浏览器在昨日（2026-09-28）取得 V1 上下文并提交。
- [首跑已产生的中间截图](./evidence/WEB-10/backfill-chrome-390/)停在等待成功文案：数据库实际上已有 `success`、`3.4 公里`、`is_backfilled=true`、修订 1 的昨日记录。缺陷为 `PlanHistory` 刷新上下文时清空 `context`，导致表单卸载且保存提示消失；已改为同日期刷新期间保留原上下文，待新账号/运行复测并保存完整网络和 DB 证据。此次失败不计主验收通过。

## 2026-09-29 09:00 CST｜历史补记反馈修复及复测

- [Chrome 390×844 完整复测](./evidence/WEB-10/backfill-chrome-390-v2/)使用新隔离账号创建从 2026-09-27 起的每日固定计划，历史面板从服务端两次读取 2026-09-28 的 V1 上下文；提交 `success`、备注与 `3.4 公里` 后，提示“记录已保存”保持可见，按钮变为“查看或修正记录”。API 上下文 GET 200、记录 PUT 200、刷新上下文 GET 200，无横向溢出和屏外控件。[DB 快照](./evidence/WEB-10/db-backfill.txt)证明唯一记录 `is_backfilled=true`、`is_revised=false`、修订 1、审计一条。
- [WEB-10 检查和哈希清单](./evidence/WEB-10/checks.json)现涵盖五次完整浏览器运行与循环/一次性/补记 DB 快照。新增只读上下文接口与 Web 页面仍需未来规则版本、不可打卡日期、权限/冲突反向和历史修正的完整 F/V/N；全部 `WEB-CHECK` 仍 `NOT_RUN`，WEB-10 `[ ]`。
- Web 技术方案属于验收用例锁定来源。增量接口说明曾临时写入该文件，直接同步来源摘要遭自动审批拒绝，理由是需要重新生成并审查用例；已撤回该两处源文件改动，保留在本文及 API 兼容记录中。`check_execution_progress.py` 随后通过，原 136 条基线未改。正式基线变更需另行审查用例后执行。

## 2026-09-29 09:08 CST｜非应执行日反向与质量门禁

- [Chrome 390×844 反向运行](./evidence/WEB-10/not-due-chrome-390/)创建仅周一执行的计划，先取得周一 2026-09-28 的可补记上下文，再选择周二 2026-09-29。页面显示“这一天不在可补记范围”，无打卡表单；网络只出现上下文 GET 200，没有 checkin PUT。[DB 零行证明](./evidence/WEB-10/db-not-due.txt)为 `0`。无横向溢出、无屏外控件。[六次完整浏览器和 DB SHA-256 清单](./evidence/WEB-10/checks.json)已更新。
- 在反馈修复后，Web `npm run build` 通过。曾在 `apps/web` 目录误运行不存在的 `npm run check`（只影响命令退出），随后从仓库根目录运行完整 `npm run check` 通过：格式、ESLint、全包 TypeScript、OpenAPI 85 操作、API 兼容及静态检查均成功。此增量仍只覆盖若干 F/V/N 探针，不改变 `WEB-CHECK-01～18` 的 `NOT_RUN`。

## 2026-09-29 09:11 CST｜每周目标空白历史日

- [Edge 1280×800 原始运行](./evidence/WEB-10/weekly-backfill-edge-1280/)创建每周 3 次、从 2026-09-27 开始的计划，在原本无记录的 2026-09-28 从日期上下文取得 V1 规则并补记。上下文 GET 200、记录 PUT 200、刷新 GET 200，页面显示“记录已保存”；无横向溢出。[DB 快照](./evidence/WEB-10/db-weekly-backfill.txt)为 `weekly`、昨日 `success`、`is_backfilled=true`、修订 1。此用例验证补记资格不依赖月历对空白周目标日是否生成条目。
- [WEB-10 SHA-256 清单](./evidence/WEB-10/checks.json)现覆盖七次完整浏览器运行。历史规则版本变更后的旧日期、一次性迟完成/取消、媒体失败和冲突仍待测；任务和主验收状态不变。

## 2026-09-29 09:17 CST｜一次性取消与受控迟完成

- [Chrome 360×780 取消终态](./evidence/WEB-10/one-time-cancel-chrome-360/)提交 `cancelled` 与备注“主动取消”，终态 POST 201；[DB](./evidence/WEB-10/db-one-time-cancel.txt)为唯一取消结果、修订 1、审计 1。首次审计查询误用不存在的 `r.id`，改为 `r.revision` 后核对通过。
- 迟完成不能通过当天新建到期于昨天的任务来准备；在隔离测试 DB 中先由[Chrome 创建](./evidence/WEB-10/one-time-late-create-chrome-390/)开始于昨天、截止于今天的合规任务，再将**仅该合成账号与计划**的截止日更新为昨天，[受控夹具变更行数](./evidence/WEB-10/db-late-fixture.txt)为 1，模拟自然跨过截止日。第一次 Edge 复登录受短信频率限制，尚未提交结果；待冷却后[Edge 1280×800 完整复测](./evidence/WEB-10/one-time-late-complete-edge-1280-v2/)终态 POST 201，页面显示“2026-09-29 · 逾期完成”，[DB](./evidence/WEB-10/db-one-time-late.txt)证明截止 2026-09-28、完成业务日 2026-09-29、唯一修订 1。此为隔离 DB 时间状态夹具，不声称验证真实跨日定时器。
- [十次完整浏览器和 DB SHA-256 清单](./evidence/WEB-10/checks.json)已更新。深色/其他浏览器、历史跨规则版本、结果冲突与媒体失败仍缺；`WEB-CHECK-01～18` 仍 `NOT_RUN`，WEB-10 `[ ]`。

## 2026-09-29 09:20 CST｜下一增量启动：未知结果同键重试

循环打卡提交前会生成 `clientOperationId` 与 `Idempotency-Key`，但当前 UI 在网络异常后再次点保存会创建新键；即使服务端已提交但响应丢失，也可能进入错误的修订冲突。下一步在页面生命周期内冻结原请求体、已上传媒体标识与键，网络未知时明确提示并只重试原操作；受控断网浏览器需证明确实只落一条记录。跨刷新/多标签持久恢复属于 WEB-12 后续，不能凭本增量签发该主验收。

## 2026-09-29 09:24 CST｜同键重试浏览器和数据库证据

- [TodayCheckin.tsx](../../../apps/web/src/app/TodayCheckin.tsx)现于发送前保留原 `PutCheckinRequest`、`clientOperationId`、幂等键和已上传媒体标识；网络错误/5xx 后显示结果未知，冻结输入，仅通过“重试原操作”发送同一内容。成功后清除待重试状态；非未知错误仍给出服务端结果。已保存但媒体绑定未完成时阻止继续改写记录，先重试媒体绑定。
- [Chrome 390×844 受控断网运行](./evidence/WEB-10/retry-chrome-390/)在表单已填写后切断浏览器网络：首个 checkin PUT 记为状态 0，页面显示“提交结果未知”；恢复网络后再次 PUT 200，两个请求的 `Idempotency-Key` 仅保存 SHA-256 摘要且完全一致，原值、访问令牌和请求体均未写入证据。[DB](./evidence/WEB-10/db-retry.txt)为 1 条记录、修订 1、未修正、审计 1；页面无横向溢出。[十一组完整浏览器 SHA-256 清单](./evidence/WEB-10/checks.json)已更新。
- 该探针验证断网**请求未送达**后的同键重试。服务端已提交但响应丢失、页面刷新/多标签续传，以及一次性结果同键恢复仍属 WEB-12/WEB-10 待测；不能据此将正式 ONLINE 或 CHECK 用例置为 PASS。

## 2026-09-29 09:26 CST｜下一增量启动：一次性结果同键恢复

一次性终态表单目前仍在每次提交时隐式生成新幂等键；将沿用循环记录的页面内冻结策略，保留同一终态请求体、媒体标识与键，在网络未知后重试原请求，受控浏览器核对终态唯一性。页面刷新与多标签之间仍需 WEB-12 独立设计和验证。

## 2026-09-29 09:34 CST｜一次性终态同键重试增量证据

- [OneTimeResult.tsx](../../../apps/web/src/app/OneTimeResult.tsx)现在在终态提交前保存原请求体、首次/修正方式、上传媒体标识与幂等键。网络错误或 5xx 后提示“提交结果未知”、冻结表单，只允许重试原操作；成功后清除待重试状态。调用层[api.ts](../../../apps/web/src/data/api.ts)透传相同键。Web TypeScript 检查通过。
- [Chrome 390×844 受控断网运行](./evidence/WEB-10/one-time-retry-chrome-390/)创建一次性任务并填写取消及备注，断网首个 POST 状态 0，恢复网络后第二个 POST 201；脱敏网络记录中两次操作键 SHA-256 相同。截图显示未知状态与恢复后唯一取消结果；视口文档宽 390、无横向溢出、无屏外控件。[隔离 DB 快照](./evidence/WEB-10/db-one-time-retry.txt)为 `cancelled|断网后原操作重试|1|1|1`，即修订 1、审计 1、终态 1。[12 组完整运行及文件 SHA-256 清单](./evidence/WEB-10/checks.json)由证据脚本校验通过。
- 此次断网在请求送达前发生，只验证页面生命周期内同键恢复；服务端提交后响应丢失、刷新/多标签恢复仍未证明。`WEB-CHECK-01～18` 继续 `NOT_RUN`，WEB-10 继续 `[ ]`。

## 2026-09-29 09:39 CST｜服务端提交后响应丢失的受控复测

- [浏览器证据工具](../../../scripts/web-browser-capture.mjs)新增仅隔离回环 Web ATDD 可用的 `drop-next-one-time-response`：在 CDP 响应阶段确认一次性终态 POST 已从服务端返回 2xx 后，单次中断向页面交付响应；跟踪只保存成功状态，不保存响应体。该注入比断网前阻断请求更接近“写入已成功、客户端未知”。
- [Chrome 390×844 运行](./evidence/WEB-10/one-time-response-loss-chrome-390/)记录 `response-dropped-after-server` 且服务器状态 201；浏览器首次 POST 记 0，表单显示“提交结果未知”，再次点击同键 POST 201 并显示唯一取消结果。两次网络键的 SHA-256 相同，响应体未保存，截图可见结果，无横向溢出。[隔离 DB 快照](./evidence/WEB-10/db-one-time-response-loss.txt)为唯一终态、修订 1、审计 1。此次连同断网重试共[13 组浏览器与 DB 文件哈希清单](./evidence/WEB-10/checks.json)通过。
- 该探针证明**同一页面生命周期**内的一次性终态响应丢失恢复；刷新、多标签和循环打卡响应丢失仍待 WEB-12。正式 `WEB-CHECK-01～18` 尚缺其余 F/V/N 组合，维持 `NOT_RUN`，WEB-10 `[ ]`。

## 2026-09-29 09:43 CST｜下一增量启动：照片绑定失败后恢复

一次性结果写入成功后，媒体完成调用若失败，页面应保留待绑定标识并阻止再次修改终态，单独重试绑定。已将重试按钮改成与循环记录一致的忙碌状态保护，避免连续点击并发调用；下一步在隔离浏览器中只阻断首次媒体完成请求，核对结果只写一次、媒体第二次转为 ready，以及页面的错误和恢复反馈。正式媒体故障用例暂不置 PASS。

## 2026-09-29 09:47 CST｜媒体绑定失败与恢复证据

- [受控故障注入](../../../scripts/web-browser-capture.mjs)仅在隔离回环环境阻断首次 `/media/{id}/complete` 请求，不影响对象上传和结果写入。第一次运行在成功提示等待阶段超时：定位器选到了表单上方“当前结果”的状态；隔离 DB 已显示媒体 ready。将定位器限定为表单内提示后第二次运行成功；其[中间截图](./evidence/WEB-10/media-complete-retry-chrome-390-v2/)和[DB](./evidence/WEB-10/db-media-complete-retry.txt)保留。随后发现失败截图里的“保存结果修正”仍可点击，现已在待绑定期间禁用一次性与循环记录的写入按钮，媒体重试成功后恢复。
- [Chrome 390×844 最终复测](./evidence/WEB-10/media-complete-retry-chrome-390-v3/)：对象预检/PUT 200、终态 POST 201 仅一次、媒体完成 POST 首次 0 后重试 201；故障截图显示“结果已保存，照片尚未完成绑定”、单独重试按钮及禁用的结果修改按钮，成功截图显示照片已保存、按钮重新启用。该页无横向溢出。[DB 快照](./evidence/WEB-10/db-media-complete-retry-v3.txt)为 `cancelled|1|1|1|1`，即终态、修订、审计、ready 照片各一。[14 组完整浏览器证据和 SHA-256](./evidence/WEB-10/checks.json)由脚本核对通过。
- 该探针没有覆盖上传意图失效、对象 PUT 失败、媒体数量/大小边界、缩略图和删除清理；WEB-09/10 均 `[ ]`，正式 CHECK/DATA/SEC 用例均不因本探针改为 PASS。
