# 005 FFmpeg Export Plan

## 技术方案

- 模块边界：
  - `packages/render-core`：纯 TypeScript，负责导出 preset、FFmpeg 参数生成和进度解析。
  - `packages/shared`：暴露导出 composition、preset、plan、progress 与 IPC API 类型。
  - `apps/desktop`：preload 暴露 `render.createPreviewPlan`，主进程基于当前 demo project 返回导出计划。
- 数据流：
  - Renderer 点击导出按钮。
  - preload 调用 `render:create-preview-plan`。
  - Main 进程组装 `ExportComposition` 并调用 Render Core。
  - Renderer 展示“导出计划已生成”或错误状态。
- 真实时间线编译：
  - `buildProjectFfmpegExportPlan` 输入 `ProjectDocument`，输出可执行 FFmpeg args。
  - 视频/图片 clip 走全画幅缩放、补边与 overlay。
  - 音频/配音轨 clip 走 atrim、延迟、音量与 amix。
  - 视频轨静音不影响画面；视频轨原声混音后续作为独立需求处理。
- IPC/API：
  - `render:create-preview-plan(): Promise<ExportPlan>`。
  - 后续真实导出扩展为 `render:start`、`render:cancel`、`render:onProgress`。

## 失败模式

- 错误：composition 时长小于等于 0，Render Core 抛出 `INVALID_EXPORT_DURATION`。
- 错误：输出路径不是 `.mp4`，Render Core 保留计划但追加 warning。
- 降级：无 Electron preload 的浏览器预览环境下，导出按钮展示桥接未连接提示。
- 降级：Main 进程尚未持有完整 `ProjectDocument` 时，桌面导出继续使用稳定的占位导出链路。

## 测试策略

- 单元测试：FFmpeg args 生成、ProjectDocument filtergraph 编译、偶数分辨率归一化、进度行解析。
- 类型检查：`pnpm --filter @miaoma/desktop typecheck`。
- 集成验证：`node scripts/validate-foundation.mjs`，确保新增 package 被基础校验覆盖。
