# WEB-12｜在线状态、并发与冲突体验增量记录

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`，执行计划 `[ ]`；`WEB-ONLINE-01～08` 仍 `NOT_RUN` |
| 依据 | Web PRD 在线使用边界、Web 技术方案会话/并发章节、Web ATDD `WEB-ONLINE-01～08`、执行计划 WEB-12 |

## 2026-09-29 19:40 CST｜编码前审计

- 已有打卡及一次性结果写入的固定幂等键、网络未知结果原键重试和照片绑定独立重试；API 使用 `cache: no-store`，页面没有离线业务缓存。
- 缺口：API 统一错误对象丢弃 `details`，循环打卡 409 冲突详情无法在页面展示服务端/本机版本及选择。计划先贯通类型化冲突详情和用户选择；正式双标签、网络切换与浏览器证据依用户当前指令后置。

## 2026-09-29 19:49 CST｜冲突与离线状态代码增量

- `apps/web/src/data/api.ts` 的 `ApiError` 保留服务端 `details`，继续区分网络错误、401、409 与其他失败。
- `apps/web/src/app/TodayCheckin.tsx` 对 `CHECKIN_CONFLICT` 展示服务器最新版本与**实际提交快照**的结果、备注、失败原因和数值。用户可放弃本机修改并采用服务器版本，或选择本机版本后二次确认；后一分支使用新的幂等键、服务器当前修订和 `resolutionOfConflictId`。若别处又修改，会再次进入冲突选择，不静默覆盖。
- `apps/web/src/app/App.tsx` 在登录与私人页面断网时显示醒目状态，明确当前内容可能已旧、无法保存/下载；没有把本地表单或缓存当成权威记录。离线状态仅是浏览器观测，API/对象域实际失败仍以请求错误为准。
- 开发检查：Prettier、改动 TypeScript 文件 ESLint、Web 生产构建退出 0；最终快照修订后的[构建原始输出](./evidence/WEB-12/web-build.txt) SHA-256 `657032ab68cb27ca3587aa50e4aa3fff6e9cdbe584d87f4d17f81b307727fd97`，Vite 33 模块。
- 需后续受控浏览器双标签、断网/响应丢失、对象域故障及冲突审计来签发 `WEB-ONLINE-01～08`；全部仍 `NOT_RUN`，任务 `[ ]`。

## 2026-09-30 11:30 CST｜局域网误报“网络不可用”审计

- 用户在局域网入口使用时遇到“网络不可用”。本机对同源登录页和 `/api/v1/health/live` 均得到 200，服务仍在监听。现有顶部横幅只依据 `navigator.onLine`，该值不能证明本项目的同源 API 是否可达；API 请求还在 `try` 内生成 `crypto.randomUUID()`，若浏览器缺少此安全上下文 API，异常会被误报为网络断开。
- 拟以同源健康请求判定服务可达性；请求标识改用浏览器安全随机数生成的 UUID v4 兼容路径，并把不支持安全随机数的情况与真正 `fetch` 失败分开。站内其他依赖 `navigator.onLine` 的轮询也需改为以真实请求结果为准。保留在线使用要求，不实现离线写入。先做最小局域网/构建检查，正式 `WEB-ONLINE-01～08` 仍后置。

## 2026-09-30 11:45 CST｜局域网在线状态修正

- `OfflineBanner` 现用同源 `/api/v1/health/live` 判断服务可达，页面恢复、网络事件和定时器会重新检查；文案改为“暂时无法连接计划打卡服务”。导出状态轮询和计划即时提醒不再仅因 `navigator.onLine=false` 跳过真实请求。
- 新增 `apps/web/src/data/uuid.ts`：优先用 `crypto.randomUUID`，缺失时使用 `crypto.getRandomValues` 生成 UUID v4。API 请求 ID、幂等键、设备 ID、打卡操作 ID 和提醒标签 ID 均使用该路径。`fetchJson` 在发请求前生成 ID，若浏览器没有安全随机源则明确提示信任 HTTPS；只有真正 `fetch` 失败才报告无法连接服务。
- Web TypeScript、Vite 生产构建（35 模块）、定向 ESLint 和 UUID v4 回退检查均退出 0；局域网登录页、UUID 模块与 API 健康接口均返回 200。[脱敏检查记录](./evidence/WEB-12-lan-online-fix.txt) SHA-256 `12620d4d91d13fc0dda970d4dfa8734176dae5db207376ae608ce61dd782e1b6`。一次无头浏览器探针超时后停止，浏览器控制工具因 Windows 沙盒辅助进程初始化错误无法使用；两者均不作为通过证据。手机上的实际复测仍待观察，`WEB-ONLINE-01～08` 继续 `NOT_RUN`，任务 `[ ]`。
