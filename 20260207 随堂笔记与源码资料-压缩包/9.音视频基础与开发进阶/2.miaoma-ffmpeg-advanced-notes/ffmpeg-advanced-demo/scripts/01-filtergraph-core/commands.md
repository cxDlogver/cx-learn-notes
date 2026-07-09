# 第 1 章：FFmpeg 滤镜系统核心原理与 Filtergraph 语法

本章提取课件中关于简单滤镜、复杂滤镜、Filtergraph 连接关系、输出流映射和调试技巧的实例指令。可执行测试脚本见同目录 `run.sh`。

## 1.1 滤镜处理的位置

课件核心流程：

```text
解协议 -> 解封装 -> 解码 -> 滤镜处理 -> 编码 -> 封装 -> 输出
```

说明：

- 滤镜处理只能操作解码后的原始数据：视频是原始像素，音频是 PCM。
- 使用任何 `-vf`、`-af`、`-filter_complex` 都意味着不能使用纯 `-c copy` 完成输出。
- 如果命令需要滤镜，就必须重新编码对应流。

## 1.2 简单滤镜与复杂滤镜

简单滤镜示例，只有一个视频输入和一个视频输出：

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "scale=1280:-2" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/01-filtergraph-core/simple-scale.mp4"
```

注释说明：

- `-vf` 表示视频简单滤镜。
- `scale=1280:-2` 将宽度缩放到 1280，高度按比例计算并强制为偶数。
- `-2` 比课件中的 `-1` 更适合 H.264，因为 H.264 常要求宽高为偶数。

复杂滤镜示例，两个视频输入合成为画中画：

```bash
ffmpeg -y \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -stream_loop -1 -i "materials/video/alpha_overlay_source_512x512_30fps_6s.mov" \
  -t 5 \
  -filter_complex "[0:v]scale=960:540[bg];[1:v]scale=180:180[pip];[bg][pip]overlay=10:10[out_v]" \
  -map "[out_v]" -map 0:a? \
  -c:v libx264 -crf 28 -c:a aac \
  "outputs/scripts/01-filtergraph-core/pip-overlay.mp4"
```

注释说明：

- `[0:v]` 表示第 1 个输入文件的视频流。
- `[1:v]` 表示第 2 个输入文件的视频流。
- `[bg]`、`[pip]` 是中间输出标签，用来连接后续滤镜。
- `[bg][pip]overlay=10:10[out_v]` 将画中画叠加到左上角，并把结果命名为 `[out_v]`。
- `-map "[out_v]"` 明确选择复杂滤镜输出的视频流。
- `-map 0:a?` 尝试映射第 1 个输入的音频流，末尾 `?` 表示没有音频时不报错。

## 1.3 Filtergraph 基本组成单元

课件中的画中画滤镜图：

```bash
-filter_complex "[0:v]scale=1920:1080[bg];[1:v]scale=320:180[pip];[bg][pip]overlay=10:10[out]"
```

拆解说明：

- `;` 分隔多条滤镜链。
- `,` 串联同一条滤镜链里的多个滤镜。
- `[0:v]scale=1920:1080[bg]` 读取第 1 个输入的视频流，缩放后标记为 `[bg]`。
- `[1:v]scale=320:180[pip]` 读取第 2 个输入的视频流，缩放后标记为 `[pip]`。
- `[bg][pip]overlay=10:10[out]` 合成两个视频流，输出为 `[out]`。

## 1.4 输出流映射

完整命令模板：

```bash
ffmpeg -i "background.mp4" -i "pip.mp4" \
  -filter_complex "[0:v]scale=1920:1080[bg];[1:v]scale=320:180[pip];[bg][pip]overlay=10:10[out_v]" \
  -map "[out_v]" -map 0:a \
  -c:v libx264 -crf 28 -c:a aac \
  "output.mp4"
```

注释说明：

- 复杂滤镜的输出不会自动进入输出文件，必须用 `-map` 指定。
- `-map "[out_v]"` 选择滤镜生成的视频流。
- `-map 0:a` 选择第 1 个输入文件的音频流。
- 如果输入文件可能没有音频，建议写成 `-map 0:a?`，脚本中采用这种更稳妥的形式。

## 1.5 滤镜表达式与变量

右下角水印位置：

```bash
overlay=W-w-10:H-h-10
```

注释说明：

- `W` / `H` 是主视频宽高。
- `w` / `h` 是叠加层宽高。
- `W-w-10` 表示距离右侧 10 像素。
- `H-h-10` 表示距离底部 10 像素。

定时显示水印：

```bash
overlay=10:10:enable='between(t,5,15)'
```

注释说明：

- `t` 是当前时间，单位秒。
- `between(t,5,15)` 表示只在第 5 秒到第 15 秒之间启用该滤镜。

## 1.6 复杂滤镜调试

只验证语法，不生成实际文件：

```bash
ffmpeg -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -i "materials/video/alpha_overlay_source_512x512_30fps_6s.mov" \
  -filter_complex "[0:v]scale=960:540[bg];[1:v]scale=180:180[pip];[bg][pip]overlay=10:10[out_v]" \
  -map "[out_v]" \
  -f null -
```

注释说明：

- `-f null -` 表示把结果丢弃，只检查滤镜图和编码流程是否可执行。
- 调试复杂滤镜时，先用 null 输出确认语法，再生成真实文件。

输出中间结果：

```bash
ffmpeg -y \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -i "materials/video/alpha_overlay_source_512x512_30fps_6s.mov" \
  -t 3 \
  -filter_complex "[0:v]scale=960:540,split=2[bg_for_overlay][bg_debug];[1:v]scale=180:180,split=2[pip_for_overlay][pip_debug];[bg_for_overlay][pip_for_overlay]overlay=10:10[out_v]" \
  -map "[bg_debug]" "outputs/scripts/01-filtergraph-core/debug-bg.mp4" \
  -map "[pip_debug]" "outputs/scripts/01-filtergraph-core/debug-pip.mp4" \
  -map "[out_v]" "outputs/scripts/01-filtergraph-core/debug-final.mp4"
```

注释说明：

- `split=2` 把同一条中间流复制成两份。
- 一份继续进入后续滤镜，一份单独输出检查。
- 这比直接复用 `[bg]` 更安全，因为 Filtergraph 中一个标签通常会被后续链路消费。

