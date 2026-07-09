# 005 FFmpeg Export Review

## 结果

- 状态：已完成初版导出计划、FFmpeg 子进程导出链路、核心层真实时间线 filtergraph 编译器、导入素材导出接线，以及 Renderer 侧 ProjectDocumentService。
- 完成项：规格已建立；`@miaoma/render-core` 已实现默认 MP4/H.264/AAC 计划生成、偶数分辨率归一化、ProjectDocument 基础 filtergraph 编译、视频素材原声混音、FFmpeg 进度行解析、stderr 分片进度聚合与取消；shared/preload/main 已接入 `render:create-preview-plan`、`render:start-export`、`render:cancel-export` 和 `render:progress`；Renderer 导出按钮已支持开始导出、运行中取消、进度状态、浏览器降级提示，并会通过 ProjectDocumentService 将时间线 tracks/clips 与已导入素材转换为 IPC 可克隆的临时 ProjectDocument 传给 Main 进程导出。
- 未完成项：Main/Renderer 长期共享项目文档持久化服务、字幕烧录、日志面板、硬件编码、分段并行渲染。

## 问题

- P0：暂无。
- P1：暂无。
- P2：当前 ProjectDocumentService 仍是 Renderer 内存态；后续需要 Main/Renderer 共享持久化服务承载完整时间线编辑状态。
- P2：视频原声当前随视频轨 `muted` 状态整体启停；后续可补独立“保留原声”开关。

## 后续

- 下一步：实现 Main/Renderer 项目文档持久化服务，让导入素材、时间线编辑和 Main 导出服务共享同一个长期 `ProjectDocument`。
- 下一步：补充视频轨原声独立开关，以及真实 FFmpeg 文件 smoke test。

## 验证

- 已通过：`pnpm --filter @miaoma/render-core test`，11 个 Render Core 单元测试通过。
- 已通过：`pnpm --filter @miaoma/desktop test`，ProjectDocumentService、时间线编排导出、导入素材转临时 ProjectDocument 与 IPC 可克隆性单元测试通过。
- 已通过：`pnpm --filter @miaoma/render-core typecheck`。
- 已通过：`pnpm --filter @miaoma/desktop typecheck`。
- 已通过：`pnpm --filter @miaoma/desktop exec tsc -p tsconfig.node.json --noEmit`。
- 已通过：`pnpm --recursive test`。
- 已通过：`node scripts/validate-foundation.mjs`。
- 未执行：真实文件 smoke export，本机当前 `PATH` 未发现 `ffmpeg` 和 `ffprobe`。
