# WEB-14｜好友、分享与消息页面增量记录

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`，主计划 `[ ]`；`WEB-SOCIAL-01～14` 全 `NOT_RUN` |
| 来源 | [执行计划](../../任务执行计划-计划打卡-Web-v1.md) WEB-14、[Web 验收矩阵](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) WEB-SOCIAL-01～14、[技术方案](../../技术方案-计划打卡-Web-v1.md) |
| 服务端基线 | WEB-13 已完成；现有搜索、好友申请/接受/拒绝、好友/屏蔽、分享预览/授权/撤销、好友共享计划/历史、鼓励及账号级消息已读 API |

## 2026-09-29 16:12 CST｜编码前审计与顺序

- `/friends`、`/inbox` 目前仍为占位页，Web API 客户端尚未封装社交与收件箱接口。
- 第一增量：用户搜索、申请和处理、好友列表、解除/屏蔽、消息分页与已读；随后逐计划预览/授权、共享历史与鼓励。所有访问以服务端授权为准，不在前端缓存无权内容。
- 每个增量保存手机/桌面截图、DOM/网络、失败与反向断言、独立账号数据库事实和 SHA-256；未覆盖 14 条完整 F/V/N 前，正式用例保持 `NOT_RUN`，WEB-14 不勾选。

## 2026-09-29 16:41 CST｜搜索、申请、接受和收件箱第一轮

- Web 客户端封装精确用户名搜索、好友申请/处理、好友列表、删除/屏蔽和消息分页/已读 API。`/friends` 显示搜索、待处理/发出申请和好友关系；删除或屏蔽前有明确二次确认。`/inbox` 显示类别、时间、未读数、可回看消息；权限已失效的消息仍可标记已读，但不开放旧内容。手机底部导航已加入消息入口。
- [甲手机 Chrome 390×844](./evidence/WEB-14/request-chrome-390/) 搜索 `web_atdd_calendar_1310`，结果只显示用户名、昵称，申请 POST 成功；[乙手机 Chrome 390×844](./evidence/WEB-14/accept-chrome-390/) 读取申请、接受、打开持久消息并标记已读，未读数降至 0。两轮均保存页面截图、DOM、网络和操作轨迹，`visual-result.json` 宽度 390、无横向溢出或宽度外控件。
- [db-request-accept.txt](./evidence/WEB-14/db-request-accept.txt) 为隔离库只读对照：甲乙之间 1 条好友关系、乙收到 1 条好友申请消息且 `read_at` 非空。接受后旧申请消息 `canOpen=false`，页面显示“相关内容已不可访问”，没有重新开放申请或私人计划。
- 这仍是增量探针：未做同账号双浏览器已读同步、分享预览/授权/撤销、共享历史和鼓励，也未逐条完成 `WEB-SOCIAL-01～14` 的全部 F/V/N；正式用例继续 `NOT_RUN`。

## 2026-09-29 17:17 CST｜逐计划分享、只读互动与撤销

- [同账号桌面 Edge](./evidence/WEB-14/read-edge-1280/) 重新登录乙，仍显示已读申请和未读 0，证实本轮手机操作写入账号级已读状态。该增量尚未覆盖并发同时在线或完整 `WEB-SOCIAL-13` 断言。
- 甲在 [Chrome 手机分享预览](./evidence/WEB-14/share-grant-chrome-390/) 中先看到乙可见的历史状态与“今天走了三公里”文字及隐私提示，再明确确认授权；预览 `GET /share-preview` 200 先于授权 `PUT /shares/{friendId}` 200。乙在 [Chrome 手机共享只读页](./evidence/WEB-14/shared-read-chrome-390/) 仅看到这一项授权计划的规则、状态、文字历史，没有编辑入口或媒体/数值展示，并向该打卡发送一条留言（POST 201）。
- 甲经 [撤销确认](./evidence/WEB-14/share-revoke-chrome-390/) 后，乙在 [桌面 Edge 旧深链](./evidence/WEB-14/revoked-link-edge-1280/) 得到 `GET /shared-plans/{id}/checkins` 403；DOM 不含原计划名和历史备注，仅显示“无法查看这项计划”。[db-share-revoke.txt](./evidence/WEB-14/db-share-revoke.txt) 为隔离库只读事实：分享行 `revoked`、修订 2、留言 1、分享事件 1、鼓励事件 1。
- [checks.json](./evidence/WEB-14/checks.json) 由 `node scripts/web-14-evidence.mjs` 逐项校验 7 轮浏览器产物、96 个 SHA-256、状态码及两份 DB 对照。授权预览默认按计划时区取月份；共享历史不带月份时由服务端按计划时区选择，避免浏览器与计划跨月时误选。正式 `WEB-SOCIAL-01～14` 仍 `NOT_RUN`，WEB-14 `[ ]`。
