# WEB-08｜打卡、补记与修订 API

## 1. 基线、依赖与边界

- 需求：[Web PRD](../../PRD-计划打卡-Web-v1.md) 的打卡、一次性结果、数值项和私人照片；[技术方案](../../技术方案-计划打卡-Web-v1.md) 的记录服务与历史版本；[Web ATDD 矩阵](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) 的 CHECK、ONLINE。WEB-06 数值配置版本已完成。
- 本任务交付服务端记录能力。WEB-10 负责今日、补记、修订页面及 `WEB-CHECK-01～18` 浏览器 F/V/N；WEB-09 负责对象直传、缩略图及真实文件生命周期。当前 136 个浏览器业务用例仍为 `NOT_RUN`。
- 开始前循环记录已有成功/失败/跳过、备注、失败原因、旧式数值、照片关联、同日唯一、修订号/冲突和审计；一次性结果已有终态、旧 `reason` 备注别名与修订审计。迁移 `0012_web_compatibility.sql` 已预留历史标签、配置版本及一次性数值列。

## 2. 实现与兼容

| 行为 | 修改位置 | 结果与边界 |
| --- | --- | --- |
| 循环记录的数值版本 | `RecordsService.recordedNumeric/put/current/dto` | 按记录的**计划业务日期**读取最后一个已生效配置。提交单位与该版本不符返回 `RULE_CHANGED` 409；成功时保存原始数值、标签、单位及配置外键，响应带 `label/configVersion`。补记与修订也按目标业务日期取版本，历史值不换算。 |
| 旧客户端兼容 | `NumericEntry`、记录 DTO 与 OpenAPI | 原有 `{value,unit}` 请求和未配置计划的旧式数值仍有效。没有配置快照的旧记录响应维持 `{value,unit}` 两字段；新增标签/版本是可选字段。兼容基线检查通过。 |
| 一次性结果附加内容 | `OneTimeResolutionRequest/Dto`、`RecordsService.resolveOneTime`、`ViewsService` | 完成、失败、取消都可附 `note`、单项 `numeric` 与最多 9 个 `mediaIds`；旧 `reason` 别名继续有效，同时传 `note` 与 `reason` 拒绝。结果和详情查询均返回数值及照片标识，修订快照包含前后值。新响应字段对旧客户端可选。 |
| 照片绑定与失败恢复 | `RecordsService.attachMedia` | 循环和一次性结果按本人、目标、未删除状态绑定；包含已关联照片的总量最多 9。照片标识错误/归属不符时仅该保存点回滚，记录结果仍提交并返回 `mediaAttachFailed:true`，供界面重试；真实对象验证留给 WEB-09。 |
| 并发、重试与审计 | 既有 `PlanWrite`、计划行锁、`checkin_conflicts`、修订表 | 相同幂等键与请求复用原响应；不同请求争同一计划/日期，一条成功、另一条 409 且留下冲突摘要；每日期只有一条有效 `checkins`。每次创建/修订写 `checkin_revisions` 或 `one_time_resolution_revisions`。 |

## 3. 检查与原始证据

- [13 项检查清单](./evidence/WEB-08/checks.json)含命令、退出码、原始输出文件和 SHA-256；契约/API 编译、OpenAPI 77 操作、兼容检查、旧记录/视图/媒体/移动记录回归、新测试、lint、格式和台账均为 0。证据文件已统一 LF，可按清单复算。
- [PGlite 记录证据](./evidence/WEB-08/web-records-smoke.txt)：同一计划昨日数值为 `距离/公里/v1`，今日为 `用时/分钟/v2`；昨日修订仍引用 v1，数据库为 2 条打卡、旧记录 2 个修订快照。一次性结果重试不增加行，修订后仍有 1 条终态、2 个修订快照和 1 个关联媒体标识；计划详情显示相同数值及媒体。
- [真实 HTTP 与 PostgreSQL 17 证据](./evidence/WEB-08/records-http.txt)：每次运行启动全新仅绑定 loopback 的 `web_atdd_web08` 临时库，迁移到 `0012` 后启动 Nest API，完成短信桩登录。昨日补记、同键重试、今日不同版本写入及历史修订均 200；错误单位 409、陌生人读取 404；两个并发不同键同日提交为 200/409，库内仅 1 行及 1 条冲突；一次性创建 201、修订 200、详情 200，库内 1 行、2 条修订和 1 个媒体绑定。私人记录响应为 `no-store`。临时容器运行后自动停止并删除。
- [旧记录回归](./evidence/WEB-08/records-smoke.txt)仍覆盖成功/失败/跳过、补记、暂停期历史修订、冲突选择及旧 `reason`；[视图回归](./evidence/WEB-08/views-smoke.txt)、[媒体回归](./evidence/WEB-08/media-smoke.txt)与[移动记录回归](./evidence/WEB-08/mobile-records-smoke.txt)均通过。

## 4. 发现、修复与剩余验收

- 初次把新增一次性响应字段设为必填，兼容检查报告 `OneTimeResolution.numeric/mediaIds` 为破坏性变化；改为响应可选，服务端仍稳定返回两字段。初次旧记录回归因返回额外 `label:null/configVersion:null` 失败；旧式记录现维持原有对象形状。首次 lint 发现新测试脚本缺显式 `process` 导入，修复并重新执行完整检查清单。
- 新测试的第二个数值配置版本是**隔离测试库种子**，模拟先前已排程、今天生效的版本。正式编辑接口仍从计划时区下一业务日起生效；不修改生产时钟或旧版本行。
- 本次媒体证据只证明记录与数据库照片标识关联和失败回滚。对象上传、签名下载、类型/大小、缩略图、清理及真实浏览器网络证据由 WEB-09/10 验收；不能据此判定产品照片流程通过。没有 Web 页面截图、DOM、无障碍树或真实用户交互结果；136 项浏览器 ATDD 继续 `NOT_RUN`。
