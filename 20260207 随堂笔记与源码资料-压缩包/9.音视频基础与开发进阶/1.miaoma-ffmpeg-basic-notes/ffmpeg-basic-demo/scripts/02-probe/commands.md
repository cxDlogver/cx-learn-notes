# 第 2 章 媒体信息查询

本章使用 `ffprobe` 查看媒体文件的封装、编码、分辨率、帧率、采样率、声道等信息。

## 2.1 查看视频文件基础信息

```text
ffprobe "materials/video/av_sync_test_720p_30fps_10s.mp4"
```

注释说明：

- `ffprobe` 只读取媒体信息，不修改文件。
- 该素材同时包含视频流和音频流，适合演示多流信息。

## 2.2 查询 format 和 streams，输出 JSON

```text
ffprobe -v quiet -print_format json -show_format -show_streams "materials/video/av_sync_test_720p_30fps_10s.mp4"
```

注释说明：

- `-v quiet`：关闭普通日志。
- `-print_format json`：以 JSON 格式输出，适合程序解析。
- `-show_format`：显示容器级信息，例如时长、大小、总码率。
- `-show_streams`：显示每条媒体流的信息。

## 2.3 只查看视频流

```text
ffprobe -v quiet -select_streams v -show_streams "materials/video/av_sync_test_720p_30fps_10s.mp4"
```

注释说明：

- `-select_streams v`：只选择视频流。
- 适合检查 `codec_name`、`width`、`height`、`r_frame_rate`、`pix_fmt`。

## 2.4 只查看音频流

```text
ffprobe -v quiet -select_streams a -show_streams "materials/video/av_sync_test_720p_30fps_10s.mp4"
```

注释说明：

- `-select_streams a`：只选择音频流。
- 适合检查采样率、声道数、音频编码、码率等信息。

## 2.5 只输出视频宽高、帧率、编码名

```text
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt -of default=noprint_wrappers=1 "materials/video/testsrc2_720p_30fps_10s.mp4"
```

注释说明：

- `-select_streams v:0`：选择第 1 条视频流。
- `-show_entries stream=...`：只输出指定字段。
- `-of default=noprint_wrappers=1`：简化输出格式。
