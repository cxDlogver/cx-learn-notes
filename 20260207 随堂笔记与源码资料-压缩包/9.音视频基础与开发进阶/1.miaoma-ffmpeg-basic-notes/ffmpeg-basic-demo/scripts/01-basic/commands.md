# 第 1 章 FFmpeg 命令基本格式

本章用于演示 FFmpeg 的基础命令结构、全局选项、输入选项和输出选项。

## 1.1 最简单的格式转换

```text
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" "outputs/01-basic/basic_convert.mov"
```

注释说明：

- `-y`：输出文件已存在时自动覆盖。
- `-i`：指定输入文件。
- 输出后缀为 `.mov`，FFmpeg 会自动选择 MOV 封装。
- 未显式指定编码器时，FFmpeg 会根据输出格式自动选择可用编码器。

## 1.2 输入前快速定位，输出端控制编码

```text
ffmpeg -y -hide_banner -ss 00:00:02 -i "materials/video/testsrc2_720p_30fps_10s.mp4" -t 3 -c:v libx264 -c:a aac "outputs/01-basic/options_position.mp4"
```

注释说明：

- `-hide_banner`：隐藏版本横幅。
- `-ss 00:00:02` 放在 `-i` 前，是输入选项，用于快速跳转。
- `-t 3`：输出 3 秒内容。
- `-c:v libx264`：视频输出为 H.264。
- `-c:a aac`：音频输出为 AAC。当前输入无音频时，不会凭空生成音轨。
