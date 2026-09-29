# WEB-16｜站内提醒、设置与浏览器通知增量记录

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`，执行计划 `[ ]`；`WEB-NOTIFY-01～16` 均 `NOT_RUN` |
| 依据 | Web PRD §5.2、Web 技术方案 §8、Web ATDD `WEB-NOTIFY-01～16`、执行计划 WEB-16 |
| 已有基础 | WEB-15 服务端已提供 Web 分端偏好、Push 配置、订阅/取消与 Worker 发送链路；Web 前端设置页尚未接入 |

## 2026-09-29 19:12 CST｜编码前审计与本轮重点

- 按用户最新指令，以代码开发和功能完整为先。本轮先实现分端偏好设置、浏览器能力/权限状态、用户主动订阅与取消、Service Worker 通用内容通知和点击跳转、网页打开时的即时计划提示。仅做必要的类型、构建和一次基础手工检查；不新增大量浏览器矩阵探针，正式验收留待功能齐备后集中进行。
- 社交消息仍使用已有持久收件箱；计划即时提示不写入持久消息。关闭页面后的浏览器通知尽力而为，网页未连接时不宣称计划即时提示可用。通知外层不得包含计划名、失败原因或留言。

## 2026-09-29 19:23 CST｜通知前端主链路已编码

- `apps/web/src/data/api.ts` 接入 Web 分端偏好读取/带修订保存、Push 配置、订阅注册与取消；未改 iOS 偏好接口。
- `apps/web/src/app/NotificationSettings.tsx` 在设置页显示四类 Web 投递开关、浏览器能力/权限/订阅状态；仅用户点击后请求权限及订阅，拒绝、不支持、服务端未配置均显示可理解的降级文案。退出登录时尽力取消当前浏览器订阅，服务端会话仍按原流程撤销。
- `apps/web/public/notification-sw.js` 只展示两种通用通知，点击仅导航 `/today` 或 `/inbox`，不使用推送负载中的标题、正文或任意 URL。
- `apps/web/src/app/LivePlanReminder.tsx` 在网页可见且在线时按计划时区核对今日待处理及共享提醒时刻，显示可稍后关闭的即时横幅；关闭页/断网不提供该提示。设置开关、窗口恢复和记录更新触发重新核对。`App.tsx` 与 `styles.css` 已接入响应式 UI。
- 开发检查：对本轮相关文件运行 Prettier；Web `npm run typecheck` 与 `npm run build` 退出码均为 0，Vite 产出 32 个模块。第一次在根目录使用 `npm --workspace` 因本仓库不采用 npm workspaces 而失败，改在 `apps/web` 执行后通过；该尝试不计为通过证据。
- 尚未执行受控浏览器 Push 端到端、关闭页面观察及正式 `WEB-NOTIFY-01～16` F/V/N。代码和构建完成不等于任务验收完成，任务继续 `[ ]`。

## 2026-09-29 19:56 CST｜通知状态复审与待补代码

- 发现同一浏览器两标签的即时提示仅在各标签内去重，可能同时弹出；浏览器本地 `PushSubscription` 仍在但服务端已因永久失败清理时，设置页可能误显示“已开启”。本轮补跨标签领取和服务端当前订阅状态读取。正式双标签/供应端失败验收仍后置。

## 2026-09-29 19:59 CST｜跨标签领取与真实订阅状态

- 即时提醒按计划集合 SHA-256 生成不含原始计划 ID 的浏览器领取键；优先使用 Web Locks 原子领取，兼容环境使用本地存储与 `storage` 事件协调。同一浏览器 24 小时内相同待办集合只由领取标签展示；用户关闭提示后本标签不重复弹出。存储不包含计划名、记录或照片。
- 新增 `GET /api/v1/me/web-push-subscriptions`，按当前 Web 会话设备查询仍有效的服务端订阅。设置页将本地 `PushSubscription` 与服务端状态合并；永久失败清理、过期或注销后显示未开启，用户可主动重新同步。已生成 OpenAPI 87 项，旧契约兼容检查通过。
- API/Web TypeScript 和 Web 生产构建通过。[构建输出](./evidence/WEB-16/web-build.txt) SHA-256 `038072c5a825bb7da97be466ff24d862b82a6cabf1280410f0bf3fca04f7dc2f`；[OpenAPI 输出](./evidence/WEB-16/openapi-check.txt) SHA-256 `3fee938279b8a1e5f8063e1f5253ac4d625aad65898aaa4ba41fd56373ce3afd`。
- 受控 Push、Safari 本地存储限制和双标签竞态的正式浏览器证据尚未执行，`WEB-NOTIFY-01～16` 保持 `NOT_RUN`，任务 `[ ]`。

## 2026-09-29 20:03 CST｜项目级静态门禁

- 对当前 Web/API/Worker/契约代码执行一次 `npm run check`。首轮 ESLint 指出 Service Worker 的全局 `URL` 未识别，改为 `globalThis.URL`；第二轮 Prettier 指出该行格式，已修复。失败原始输出分别在 [lint 首轮](./evidence/code-first/project-check-first.txt) `062d3a638df05b59269bf9ec66ccb11f2fff039d64d1e2fb5e271812419b288b`、[格式次轮](./evidence/code-first/project-check-format.txt) `0ac8835054cad1b64854365af0f72ccd02980cd086fff2c2d61050bc8346ed58`，均不计通过。
- 第三轮项目检查退出 0，覆盖 Prettier、ESLint、各包 TypeScript、设计资源、87 项 OpenAPI/旧契约、部署/迁移/安全静态检查。[完整输出](./evidence/code-first/project-check.txt) SHA-256 `a0a832a1518a493dd0f0683d370dbb140176639bbaa1e9225caf470ecb1e2f46`。这仍属于开发门禁，不能替代浏览器 Push 验收。
