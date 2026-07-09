# 005 FFmpeg Export Spec

## 目标

- 用户价值：用户可以从当前项目生成可执行的 FFmpeg 导出计划，并为后续真实 MP4 导出、进度、取消和日志能力建立稳定接口。
- 成功标志：导出计划可确定输出分辨率、帧率、时长、编码器、音频参数和 FFmpeg 参数；计划层无需真实 FFmpeg 即可单元测试。

## 范围

- 范围内：Render Core 初版、默认 MP4/H.264/AAC preset、占位 filtergraph、ProjectDocument 到基础 FFmpeg filtergraph 的纯函数编译、视频素材原声混音、进度日志解析、typed IPC 边界。
- 范围外：Renderer 与 Main 的完整项目文档同步、字幕烧录、分段并行渲染、硬件编码、视频轨原声独立开关。
- 不做事项：不在 Renderer 直接调用 FFmpeg，不引入数据库，不复制 GPL/AGPL 项目代码。

## 用户场景

- Given：用户打开项目并点击导出。
- When：系统生成导出计划。
- Then：Renderer 可以展示导出计划状态，主进程持有可执行的 FFmpeg 参数。

- Given：FFmpeg 输出 stderr 进度行。
- When：Render Core 解析 `time=HH:MM:SS.xx`。
- Then：系统得到毫秒级进度与 0 到 1 的进度比例。

- Given：ProjectDocument 包含可见视频/图片 clip、带原声的视频 clip 与未静音音频/配音 clip。
- When：Render Core 编译项目导出计划。
- Then：系统生成带素材输入、overlay、atrim、adelay、volume 与 amix 的 FFmpeg filtergraph。

- Given：Renderer 已形成时间线 tracks/clips 状态。
- When：用户触发导出。
- Then：导出使用时间线 clip 的 `trackId`、`assetId`、`startMs`、`durationMs`、`sourceInMs` 和 `volume`，不得按素材列表顺序直接导出。

## 非功能要求

- 性能：导出计划编译为同步纯函数，不做文件 IO。
- 安全：Renderer 只能通过 preload typed API 请求导出计划。
- 可测试性：核心命令生成与进度解析必须有 Vitest 覆盖。
- 可演进性：后续真实素材 filtergraph 编译应复用当前 preset、composition 与 progress 类型。
