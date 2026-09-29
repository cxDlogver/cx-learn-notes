# WEB-09｜私人媒体链路增量记录

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`，主计划仍 `[ ]` |
| 依赖 | WEB-03、WEB-08 已完成；WEB-10 浏览器照片表单已有首个增量，仍未完成 |
| 来源 | [执行计划](../../任务执行计划-计划打卡-Web-v1.md) WEB-09、[Web 技术方案](../../技术方案-计划打卡-Web-v1.md) 媒体章节、[验收矩阵](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) WEB-CHECK-13/14/15、WEB-SEC-07 |

## 2026-09-29 03:40 CST｜开始与现状核对

- 现有 `MediaService` 支持 JPEG/PNG/HEIC/WebP 上传意图、每文件 20 MB、SHA-256、魔数/大小校验、每条记录最多 9 张、一次性结果绑定、私有下载和软删除；Worker 有 24 小时未完成上传与删除清理。对象存储为本地 SeaweedFS，浏览器源白名单通过启动参数控制，当前 `127.0.0.1:19000` 映射至私有 S3 接口。
- 当前缺少可审阅的 Web 直传页面链路、实际对象 CORS 预检与上传证据、失败重试、签名过期与跨账号对象拒绝、缩略图处理及清理文件清单。不能把服务端已有代码视为 WEB-09 完成。
- 第一增量先用隔离账号和真实对象域验证上传意图/预检/PUT/完成/私有 GET；再针对暴露的契约或实现问题修复。随后在 WEB-10 照片表单上完成真实浏览器截图、失败恢复和缩略图/清理联测。每一步追加原始输出、截图、SHA-256 与未满足项。

## 2026-09-29 03:47 CST｜对象域与 API 链路初测

- [对象供应端原始输出](./evidence/WEB-09/object-provider.txt)在本机 SeaweedFS 上验证允许源 OPTIONS 200、未授权源 OPTIONS 403、签名 PUT 200、签名 GET 200、无签名 GET 403，最后删除测试对象并 HEAD 核对不存在。这是受控 loopback HTTP 探针，不是浏览器 CORS 结果；对象内容为 68 字节合成 PNG，不含用户照片。SHA-256 `3d5519108ca7495eaa4bcedf047b7ab7a22a1553916b4b4cad1ad0c78a7985f7`。
- 首次完整 HTTP smoke 经 Vite 同站点代理调用 API，媒体上传/完成/私人下载/软删除步骤通过，但最后访问 `/internal/metrics` 被 Vite SPA fallback 返回 HTML，进程退出 1；[失败输出](./evidence/WEB-09/local-http-smoke.txt)保留。测试脚本增加只接受 loopback 的独立 `LOCAL_METRICS_URL`，让内部指标直连 API，不向 Web 代理暴露内部指标。第二次[原始输出](./evidence/WEB-09/local-http-smoke-v2.txt)为 10/10 PASS，[脱敏结果 JSON](./evidence/WEB-09/local-http-report.json)中 `MEDIA-api-signed-upload-private-download=PASS`。此测试为 API/对象集成，无浏览器照片 UI。
- 仍缺浏览器直传截图与原始预检、过期签名/失败重试、第十张拒绝、一次性结果、跨用户权限、缩略图生成和真实清理文件清单；WEB-09 保持 `IN_PROGRESS` 与 `[ ]`。
- [SHA-256 清单](./evidence/WEB-09/checks.json)收录上述四份 HTTP/对象原始输出并断言允许/拒绝源、签名/非签名状态及 10/10 回归。首次索引脚本用过宽的手机号正则误把 Vite 时间戳判成手机号，已限制该断言到脱敏 JSON 报告；修正后脚本与 ESLint 通过。

## 2026-09-29 04:07 CST｜WEB-10 浏览器照片入口联测

- [WEB-10 Chrome 手机与 Edge 桌面证据](./WEB-10-今日打卡页面增量记录.md)分别完成一张新照片与修正时追加第二张：两次实际浏览器请求均出现允许源 OPTIONS 200、签名对象 PUT 200、上传意图 201、记录 PUT 200、媒体完成 201；浏览器证据仅记录 `[object-store]` 和方法/状态，避免保存签名 URL。数据库当前记录为 2 张 ready 媒体，`WEB-10/checks.json` 对网络、截图和 DB 作 SHA-256 固定。
- WEB-09 仍缺故障/过期重试、第十张与类型/大小边界、一次性任务结果照片、私人下载的跨账号拒绝、缩略图及清理文件清单。此增量不将 WEB-09 或任何主验收项标为完成。

## 2026-09-29 09:47 CST｜一次性结果照片完成故障与恢复

- 一次性结果照片此前已有[Chrome 手机完整上传与绑定](./evidence/WEB-10/one-time-complete-chrome-390-v2/)及[Edge 桌面修正保留原照片](./evidence/WEB-10/one-time-correct-edge-1280/)证据。现在新增[Chrome 390×844 受控媒体完成失败/重试](./evidence/WEB-10/media-complete-retry-chrome-390-v3/)：签名对象预检/PUT 200、终态 POST 201 仅一次，首次媒体完成 POST 在请求阶段被隔离工具阻断为状态 0，页面显示结果已存、照片待绑定，结果修改按钮禁用；单独重试媒体完成 POST 201 后提示照片已保存，按钮重新启用。[DB 快照](./evidence/WEB-10/db-media-complete-retry-v3.txt)为终态、修订、审计、ready 照片各一，[WEB-10 哈希清单](./evidence/WEB-10/checks.json)覆盖两张状态截图与脱敏网络。
- 首轮采集在等待成功提示时因选择了上方“当前结果”状态超时，数据库已为 ready；修正定位器后复跑，再按失败状态的按钮可用性观察补上禁用保护并第三次复测。该故障注入只模拟媒体完成请求未到达服务器；对象 PUT 失败、签名过期、媒体边界、跨账号权限、缩略图和删除清理仍待独立证据。WEB-09 保持 `IN_PROGRESS`、`[ ]`，不得据此签发 CHECK/DATA/SEC 用例。

## 2026-09-29 09:50 CST｜下一增量启动：已保存照片的本人回顾

当前循环与一次性结果只显示照片数量，用户无法从 Web 查看已保存照片，尚不满足“附加内容可回顾”。下一步只在本人显式打开时向鉴权 API 请求短时下载 URL，展示响应式预览并提供刷新入口；禁止将签名 URL 写入持久存储或浏览器证据。正式缩略图生成、照片删除和签名过期仍作为后续独立工作。

## 2026-09-29 14:05 CST｜本人照片回顾浏览器增量

- [PrivateMediaGallery.tsx](../../../apps/web/src/app/PrivateMediaGallery.tsx)已接入循环记录与一次性结果：仅点击“查看已保存照片”后调用鉴权 `/media/{id}/download-url`，在页面内存中保存短时 URL，按容器宽度显示预览、可收起或刷新；图片请求使用 `no-referrer`。现为原图缩放预览，尚未生成独立小文件缩略图。
- [Chrome 390×844 原始运行](./evidence/WEB-09/private-gallery-chrome-390/)包含一次性结果上传、媒体完成、主动打开照片：下载 URL GET 200、私有对象 GET 200 `image/png`，CDP 等待图片 `naturalWidth>0` 后截图；页面宽 390，无横向溢出或屏外控件。[预览截图](./evidence/WEB-09/private-gallery-chrome-390/screen-private-gallery-loaded.png)可见照片与短时失效提示。[脱敏 DOM](./evidence/WEB-09/private-gallery-chrome-390/dom.html)的 `img src` 为 `[REDACTED_SIGNED_URL]`，证据校验断言没有签名参数。[WEB-09 16 文件 SHA-256 清单](./evidence/WEB-09/checks.json)已通过，正式业务用例通过数仍为 0。
- 用量中断后隔离 Docker 数据库不可连接，因此这次没有独立 DB 快照；网络已有终态 POST 201、媒体完成 201 与图片 GET 200，不能把缺失的 DB 证据伪称已验证。跨账号拒绝、签名过期、真正派生缩略图、照片删除与清理仍待完成，WEB-09 保持 `IN_PROGRESS` 和 `[ ]`。

## 2026-09-29 14:12 CST｜下一增量启动：跨账号照片拒绝

新的隔离 DB/API 与本地对象存储已恢复。将由 A 在真实浏览器上传照片并确认本人预览，再由 B 的独立浏览器会话尝试为同一 media ID 请求短时下载 URL；预期 API 拒绝且 B 不发起对象 GET。浏览器步骤只记录状态和脱敏对象请求，不记录访问令牌、短信码或签名 URL。刚恢复环境时 Vite 首次使用默认代理 3000，API 实际在 3001，导致就绪探针失败；现已以显式代理地址重新启动并收到 `WEB_ATDD_API_READY`。正式安全用例在完整反向证据到位前仍 `NOT_RUN`。

## 2026-09-29 14:17 CST｜本人允许与跨账号拒绝证据

- [A 的 Chrome 390×844 浏览器运行](./evidence/WEB-09/private-owner-chrome-390/)在新隔离 DB 上传并绑定私人照片，本人打开后下载 URL GET 200、对象图片 GET 200、图片实际加载；DOM 的签名 URL 已遮盖。随后[独立 B 的 Edge 1280×800 运行](./evidence/WEB-09/private-other-edge-1280/)使用 B 会话调用同一 media ID 的下载 URL，API 返回 404，浏览器没有对象 GET，探针只记录 404 状态。两端视口均无横向溢出与屏外控件。
- [隔离 DB 最小快照](./evidence/WEB-09/db-cross-account-media.txt)为 `web_atdd_private_owner|ready|1|0`：照片归属 A 且 ready，B 用户存在但不拥有该照片。[WEB-09 41 文件 SHA-256 清单](./evidence/WEB-09/checks.json)核对三组浏览器运行、对象/HTTP 探针与 DB，正式业务用例通过数仍为 0。
- 这证明服务端拒绝向 B 签发 A 照片的链接，并不覆盖“持有 A 尚未过期签名链接的其他人”场景；短时 URL 作为持有者可访问仍需过期与泄漏边界验证。WEB-09 仍 `IN_PROGRESS`、`[ ]`；签名到期、派生缩略图、边界与删除清理待继续。

## 2026-09-29 14:19 CST｜下一增量启动：对象签名过期

服务端照片下载 URL 的签名有效期固定为 300 秒。为避免把等待五分钟误当成实现验证，先在同一对象供应端使用相同签名机制创建受控 1 秒测试链接，验证生效前可读、到期后被拒绝；该探针只能证明供应端对 SigV4 到期的执行，不替代真实 300 秒 API 链接的全程浏览器观察。

## 2026-09-29 14:22 CST｜短时签名到期探针

- [对象供应端原始结果](./evidence/WEB-09/object-expiry.txt)显示受控 1 秒签名 GET 生效前 200、约 2.2 秒后 403；无签名 GET 同为 403，测试对象最终删除并由 HEAD 核对不存在。脚本只输出状态、测试对象前缀和内容哈希，不输出签名 URL。[WEB-09 42 文件 SHA-256 清单](./evidence/WEB-09/checks.json)已纳入该结果。
- 该结果证明本地 SeaweedFS 对短时 SigV4 签名执行到期限制；尚未直接等待并观察 API 实际 300 秒链接在浏览器过期，也未证明对象链接在权限撤销后立即失效。WEB-09 继续 `[ ]`，正式 `WEB-SEC-07` 等用例仍 `NOT_RUN`。

## 2026-09-29 14:24 CST｜下一增量启动：第十张拒绝与纯结果可提交

WEB-CHECK-13 的反向断言要求超过每条结果 9 张的选择被拒绝，且不破坏无需照片的结果提交。浏览器证据工具将允许同一工作区合成图片重复选入多文件控件，用第 10 张触发页面错误，再提交一次性任务的纯文字终态；需核对无上传意图、对象 PUT 或媒体完成请求，以及唯一终态 DB 行。此增量只测一类边界，20 MB、MIME 与恰好 9 张另行补充。

## 2026-09-29 14:28 CST｜第十张拒绝且纯结果保存证据

- [Chrome 390×844 完整运行](./evidence/WEB-09/tenth-photo-chrome-390/)把同一工作区合成 PNG 作为 10 个独立选择项，页面显示“每条结果最多 9 张照片”。[错误状态截图](./evidence/WEB-09/tenth-photo-chrome-390/screen-tenth-photo-rejected.png)显示 10 个文件和可移除入口；用户移除待上传文件后，[纯结果截图](./evidence/WEB-09/tenth-photo-chrome-390/screen-pure-result-saved.png)显示取消终态已保存。网络只有一次终态 POST 201，没有上传意图、对象请求或媒体完成；文档宽度等于 390 视口，无横向溢出。
- [隔离 DB 快照](./evidence/WEB-09/db-tenth-photo-pure-result.txt)为 `cancelled|不附照片也可提交|1|1|0`，即唯一终态、修订 1、审计 1、关联照片 0。[WEB-09 56 文件 SHA-256 清单](./evidence/WEB-09/checks.json)纳入四组浏览器运行与 DB。此只覆盖一次性结果第十张和纯结果路径；恰好 9 张、单张 20 MB、MIME 反向及循环记录仍缺，`WEB-CHECK-13` 不签发，WEB-09 `[ ]`。

## 2026-09-29 14:29 CST｜下一增量启动：单张超过 20 MB

浏览器验收工具将在其临时目录生成带 PNG 文件名的 20 MB+1 字节合成文件，选择后尝试提交，核对客户端阻断并且不请求上传意图；清除文件选择后再提交纯结果。临时文件在浏览器进程结束时清理，不进入仓库证据。服务端同等边界和恰好 20 MB 的允许路径还需独立核对。

## 2026-09-29 14:35 CST｜20 MB+1 字节拒绝与纯结果保存

- [Chrome 390×844 运行](./evidence/WEB-09/oversize-photo-chrome-390/)通过临时 20,971,521 字节合成 PNG 触发“只支持不超过 20 MB”提示；[拒绝截图](./evidence/WEB-09/oversize-photo-chrome-390/screen-oversize-rejected.png)与[清除后纯结果截图](./evidence/WEB-09/oversize-photo-chrome-390/screen-pure-result-saved.png)可回看。网络仅一次终态 POST 201，没有上传意图、对象请求或媒体完成。页面宽 390，无横向溢出。[DB 快照](./evidence/WEB-09/db-oversize-pure-result.txt)为唯一取消终态、审计 1、关联媒体 0。
- 临时超大文件只存在于浏览器一次性 profile，退出时清理；证据时间线只记录文件字节数和合成标记。[WEB-09 70 文件 SHA-256 清单](./evidence/WEB-09/checks.json)涵盖五组浏览器运行、DB 与对象探针。尚未验证恰好 20 MB 文件可上传、服务端对伪造超限请求的拒绝、其他 MIME 与恰好 9 张；WEB-09 `[ ]`，正式 `WEB-CHECK-13` 仍 `NOT_RUN`。

## 2026-09-29 14:37 CST｜下一增量启动：九张正向边界

浏览器将同一合成 PNG 作为 9 个独立文件选择项提交，核对 9 次上传意图/对象 PUT/媒体完成、唯一终态以及 DB 中 9 张 ready 照片；随后页面需可回顾九张照片且无横向溢出。这是九张允许上限的正向探针，与已完成的十张拒绝形成数量边界对照。

## 2026-09-29 14:41 CST｜九张允许边界与回顾证据

- [Chrome 390×844 浏览器运行](./evidence/WEB-09/nine-photos-chrome-390/)选择 9 个合成 PNG，终态只 POST 201 一次；网络含 9 次上传意图 201、9 次对象 PUT 200、9 次媒体完成 201。用户主动查看后出现 9 次下载 URL GET 200 和 9 次对象图片 GET 200。[九张预览截图](./evidence/WEB-09/nine-photos-chrome-390/screen-nine-gallery.png)显示响应式双列预览，文档宽 390、无横向溢出或屏外控件；脱敏 DOM 中 9 个签名 `src` 均被遮盖。
- [隔离 DB 快照](./evidence/WEB-09/db-nine-photos.txt)为 `cancelled|1|1|9|9`，即唯一取消终态、修订/审计各 1、9 张媒体且全 ready。[WEB-09 85 文件 SHA-256 清单](./evidence/WEB-09/checks.json)覆盖六组浏览器运行，与前述十张拒绝形成上下边界。仍缺其他格式及单张恰好 20 MB、服务端伪造请求、派生缩略图和删除清理，WEB-09 `[ ]`，完整 `WEB-CHECK-13` 仍 `NOT_RUN`。
