# WEB-20｜安全、隐私与故障注入增量记录

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`，执行计划 `[ ]`；`WEB-SEC-01～12` 尚未完成正式验收 |
| 依据 | Web PRD 安全与隐私要求、Web 技术方案会话/部署章节、Web ATDD `WEB-SEC-01～12`、执行计划 WEB-20 |

## 2026-09-29 20:18 CST｜编码前静态审计

- API 已给响应设置 `Cache-Control: no-store`、`X-Content-Type-Options: nosniff` 和 `Referrer-Policy: no-referrer`；Web API 请求也指定 `cache: no-store`。这些静态配置尚不能证明浏览器后退缓存中的 React 私人页面不会重新显示。
- `App` 初次挂载会恢复会话，但后退缓存恢复不会重新挂载；旧页面可能保留私人 React 状态。先在页面离开时清空私人视图，在后退缓存恢复时强制验证 Web 会话并重新读取用户资料。对应 `WEB-SEC-06`；HTTP 缓存、预览和真实浏览器行为仍须后续验证。
- 依用户当前代码优先安排，本轮仅做必要的构建/静态检查，不扩展安全故障注入矩阵；未运行的用例保持 `NOT_RUN`，任务不勾选。

## 2026-09-29 20:21 CST｜后退缓存会话保护代码

- `App.tsx` 在 `pagehide` 同步清除私人资料并切换到加载屏，避免 BFCache 储存仍可见的私人 DOM；`pageshow.persisted` 强制走服务端 Web 会话验证并重新读取资料。旧异步恢复结果用递增修订号废弃；断网或服务端失败时保持私人内容隐藏并显示重试反馈。
- 登录切换账号时先清空旧资料，防止新会话资料读取完成前显示旧账号内容。API 的私人响应和浏览器 API 请求继续使用 `no-store`。
- Web TypeScript 与生产构建退出 0，Vite 34 模块；[原始构建输出](./evidence/WEB-20/web-build.txt) SHA-256 `77f43fb6d4794b40c41dfb5f6bf1fa3388c46c522cc43ad6574d4a2894c71834`。首次保存输出时因证据目录不存在而未运行构建，建立目录后重跑成功。
- `WEB-SEC-06` 实现仍记 `IN_PROGRESS`：HTTP 缓存、浏览器预览及真实 BFCache 行为尚未验收。`WEB-SEC-01～12` 正式结果均 `NOT_RUN`，WEB-20 保持 `[ ]`。
