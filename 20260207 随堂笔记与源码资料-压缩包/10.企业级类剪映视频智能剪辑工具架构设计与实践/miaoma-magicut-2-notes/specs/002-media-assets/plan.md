# 002 Media Assets Plan

## 技术方案

- 在 Electron 主进程注册 `media:select-files`、`media:probe`、`media:generate-thumbnail`、`media:generate-waveform`。
- `MediaService` 通过 `ffprobe` 读取 JSON 元信息，通过 `ffmpeg` 生成 JPEG 缩略图和 PNG 波形图。
- FFmpeg 路径查找顺序：显式配置环境变量、常见系统路径、PATH。
- 生成的 `Asset` 使用原文件引用，不复制素材。

## 数据流

- Renderer 调用 `window.miaoma.media.selectFiles()`。
- Main 打开文件选择对话框。
- Main 对每个路径执行 probe，按媒体类型选择生成缩略图或波形。
- Main 返回 `MediaImportResult`，Renderer 展示成功项和失败项。

## 失败模式

- 未选择文件：返回空列表。
- ffprobe 不可用：返回 `FFPROBE_NOT_FOUND`。
- FFmpeg 不可用：素材 probe 可成功，缓存生成失败并记录警告。
- 文件格式不支持：返回 `UNSUPPORTED_MEDIA`。

## 测试策略

- 无依赖校验：关键文件存在、JSON 可解析。
- 单元测试：后续补媒体类型识别和 ffprobe JSON 解析。
- 集成测试：安装 FFmpeg 后用样本素材验证 probe、thumbnail、waveform。

