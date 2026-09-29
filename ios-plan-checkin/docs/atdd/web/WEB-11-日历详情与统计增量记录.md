# WEB-11｜日历、详情与统计增量记录

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`，主计划 `[ ]`；正式 `WEB-STAT-01～12` 均 `NOT_RUN` |
| 来源 | [执行计划](../../任务执行计划-计划打卡-Web-v1.md) WEB-11、[Web 验收矩阵](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) WEB-STAT-01～12、[技术方案](../../技术方案-计划打卡-Web-v1.md) §4 |
| 权威数据 | 现有 `GET /calendar?month=YYYY-MM`、`GET /calendar/{businessDate}`、`GET /plans/{id}/detail`；Web 不重算成功率或周达标 |

## 2026-09-29 14:43 CST｜开始：路由和契约审计

- Web 当前 `/calendar` 仍为占位页；计划详情呈现规则、一次性结果与历史补记，但未呈现 `statistics`。API 已返回按计划业务日期聚合的月日历、周摘要，以及固定/周目标/一次性三类计划的权威统计 DTO。
- 第一增量：接入月导航、每日状态和日详情；固定计划展示分母、成功率、连续成功，每周计划展示完整周达标率、当前周进度与“部分周不参与统计”，一次性任务展示截止与终态。日期、目标和比率都取 API 原值，页面只做文案格式化。
- 浏览器先覆盖手机/桌面、空月、已有记录、部分周提示和历史修正后刷新；与 DB/权威 API 对照并保存截图、网络及 SHA-256。尚未执行冻结时钟的 12 条完整 F/V/N，不提前签发 WEB-STAT 结果。

## 2026-09-29 14:59 CST｜月/日历第一轮浏览器探针

- 已接入 `GET /calendar` 和 `GET /calendar/{businessDate}`，增加月份切换、每日状态、日详情与周目标摘要；`apps/web/src/app/Calendar.tsx` 直接展示 API 返回的业务日期、规则版本和结果状态。周摘要的 `completeWeek=false` 同时涵盖进行中与真正的部分周，页面统一标为“进行中或部分周，暂不计入达标统计”，不擅自重算。
- 手机 Chrome 390×844 首次探针在点选日期后失败：Shell 把 `/calendar?month=…&date=…` 的查询串误当作页面名。修复 `App.tsx` 的页面段解析后，第三次探针通过。失败产物分别在 `evidence/WEB-11/calendar-chrome-390/`、`calendar-chrome-390-v2/`；成功产物在 [calendar-chrome-390-v3](./evidence/WEB-11/calendar-chrome-390-v3/) 的月格、日期详情、上一月截图、DOM、网络和动作轨迹。
- 成功探针创建每日计划后，月日历 `GET /api/v1/calendar` 两次均 200、日详情 `GET /api/v1/calendar/2026-09-27` 为 200；详情显示“未记录 1”和规则 V1。`visual-result.json` 记录宽 390、文档宽 390、横向溢出为 `false`、越界控件 0；页面高度 913 可纵向滚动。Web TypeScript `tsc --noEmit -p apps/web/tsconfig.json` 通过。
- 本轮只验证单账号手机主路径，未完成桌面/深色、时区、历史修正、三类统计或冻结时钟的完整断言。WEB-11 与 `WEB-STAT-01～12` 仍未完成。

## 2026-09-29 15:04 CST｜三类权威统计与记录刷新

- 计划详情已接入 `GET /plans/{id}/statistics`，固定计划显示服务端分母、四类结果、完成率与连续成功；周目标显示完整周和达标周、当前周进度；一次性任务显示截止日期和终态。Web 不重新计算率或归属日期。记录与一次性结果提交成功时发送页面内刷新事件；规则编辑依赖计划版本重新读取。
- 手机 Chrome [固定计划与补记](./evidence/WEB-11/statistics-chrome-390-v2/)：保存 `2026-09-28` 成功后统计端点再次 200，详情显示“应执行日 2、完成率 50.0%”，随后日历 `GET /calendar/2026-09-28` 为 200 并显示成功记录。桌面 Edge 1280×800 复跑同路径，见 [statistics-edge-1280](./evidence/WEB-11/statistics-edge-1280/)。两端 `visual-result.json` 均无横向溢出或视口宽度外控件。
- 手机 Chrome [周中启动计划](./evidence/WEB-11/weekly-chrome-390/) 于 9 月 23 日开始，权威统计显示完整周 0、达标周 0，日历显示非完整周暂不计入达标统计；[一次性任务](./evidence/WEB-11/one-time-chrome-390/) 在保存结果后由待处理更新为按时完成。三类均有截图、DOM、动作轨迹和状态码网络证据。
- 这些是增量探针；完整跨时区、历史修正、冻结时钟、错误态及 `WEB-STAT-01～12` 的 F/V/N 矩阵尚未执行，任务仍 `[ ]`。

## 2026-09-29 15:48 CST｜证据哈希与质量门禁

- [checks.json](./evidence/WEB-11/checks.json) 由 `node scripts/web-11-evidence.mjs` 生成：5 组浏览器运行、71 个文件 SHA-256、无意外 HTTP 错误；检查两种视口无横向溢出、统计/日历请求状态码、固定计划补记和一次性结果写入链路。`formalBusinessCasePassCount=0`。
- [db-statistics.txt](./evidence/WEB-11/db-statistics.txt) 为隔离 PostgreSQL 只读查询：两个固定计划用户各有 1 条 9 月 28 日成功记录，周目标 9 月 23 日开始且无记录，一次性任务 9 月 29 日完成。与当前浏览器截图和网络响应时序对照，但这份查询不能代替冻结时钟及跨时区正式验收。
- 仓库 `npm run check` 通过（格式、lint、七项目类型、设计资源、OpenAPI/兼容、infra、SQL 和安全静态检查）；`apps/web` 中 `npm run build` 通过，产出 Vite 生产包；`python docs/atdd/web/check_execution_progress.py` 为 22 任务、136 用例一致。WEB-11 继续 `IN_PROGRESS`。

## 2026-09-29 16:11 CST｜部分周分类与跨浏览器时区

- 月日历此前把 `completeWeek=false` 的未来周、本周进行中、历史部分周合并提示。现根据每项计划的 `timezone` 和服务端 `weekStartDate` 分别显示“尚未开始”“本周进行中，暂不计入达标统计”“部分周不参与统计”，并隐藏尚未生效的无规则周。9 月 23 日周中启动计划的 [重跑截图与 DOM](./evidence/WEB-11/weekly-chrome-390-v2/) 同时包含历史部分周与当前进行中周，均无横向溢出。
- 同一账号、计划时区 `Asia/Shanghai`，分别在 [Pacific/Honolulu 浏览器](./evidence/WEB-11/timezone-honolulu-390/) 与 [Asia/Shanghai 浏览器](./evidence/WEB-11/timezone-shanghai-390/) 查看 `2026-09-29`：两次日详情均显示同一天、同一计划和计划时区，API `GET /calendar/2026-09-29` 均 200。Honolulu 浏览器本地仍为 9 月 28 日；[只读数据库事实](./evidence/WEB-11/db-timezone.txt) 核实该计划始终为上海时区、9 月 27 日起始。
- [checks.json](./evidence/WEB-11/checks.json) 已更新为 7 组运行、97 个 SHA-256。此为跨时区增量探针；`WEB-STAT-11` 所需冻结时钟、历史记录与周归属完整 F/V/N 仍未全部执行，继续 `NOT_RUN`。
