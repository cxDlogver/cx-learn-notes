# 005 FFmpeg Export Acceptance

## 验收规则

- Given：项目存在 resolution、fps、duration。
- When：调用 Render Core 生成导出计划。
- Then：得到 MP4/H.264/AAC FFmpeg args，包含 lavfi 视频源、静音音频源、filter_complex、map 和输出路径。

- Given：FFmpeg stderr 包含 `time=00:00:03.50`。
- When：解析进度。
- Then：得到 `timeMs=3500`，并基于总时长计算 progress。

- Given：项目时间线包含视频轨 clip 与音频轨 clip。
- When：调用 `buildProjectFfmpegExportPlan`。
- Then：得到包含素材输入、视频 overlay 和音频 amix 的 FFmpeg args。

- Given：视频轨被静音但仍可见。
- When：调用 `buildProjectFfmpegExportPlan`。
- Then：视频 clip 仍然参与画面合成，静音只影响音频素材。

- Given：视频素材带有音频流元数据。
- When：调用 `buildProjectFfmpegExportPlan`。
- Then：视频原声基于 clip 的 `sourceInMs`、`startMs`、`durationMs` 和 `volume` 参与 `amix`。

- Given：Renderer 中的素材和项目摘要来自 Vue reactive 状态。
- When：导出前构造临时 `ProjectDocument` 并通过 Electron IPC 传给 Main。
- Then：传递对象必须是可 `structuredClone` 的普通对象，不包含 Vue proxy 引用。

- Given：素材数组顺序与时间线 clip 编排顺序不同。
- When：导出前构造临时 `ProjectDocument`。
- Then：`ProjectDocument.clips` 保持时间线编排顺序和时间参数，不按素材数组重排。

## 自动化验证

- 命令：`pnpm --filter @miaoma/render-core test`。
- 预期：Render Core 单元测试通过。
- 命令：`pnpm --filter @miaoma/desktop typecheck`。
- 预期：桌面端类型检查通过。
- 命令：`node scripts/validate-foundation.mjs`。
- 预期：基础文件与 JSON 校验通过。

## 人工验证

- 操作：启动桌面应用后点击“导出”。
- 预期：topbar 显示选择路径、导出中、取消或完成状态，页面无重叠或报错。
