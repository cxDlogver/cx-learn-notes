# 第 2 章：核心滤镜分类详解

本章按课件节次提取视频基础变换、画面处理、叠加、文字、多流拼接和音频处理指令。可执行测试脚本见同目录 `run.sh`。

## 2.1 视频基础变换与画面进阶处理

### 2.1.1 scale 缩放

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "scale=1280:-2" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/01-scale.mp4"
```

注释说明：

- `scale=1280:-2`：宽度固定为 1280，高度自动等比计算并对齐为偶数。
- 课件写法 `scale=1280:-1` 可用于理解，实际编码 H.264 时推荐 `-2`。

### 2.1.2 crop 裁剪正方形

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "crop=in_h:in_h:(in_w-in_h)/2:0" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/02-crop-square.mp4"
```

注释说明：

- `crop=w:h:x:y`：裁剪宽度、高度、左上角 x、左上角 y。
- `in_h:in_h`：裁剪为以原视频高度为边长的正方形。
- `(in_w-in_h)/2`：水平居中裁剪。

### 2.1.3 transpose 旋转

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "transpose=1" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/03-transpose.mp4"
```

注释说明：

- `transpose=1`：顺时针旋转 90 度。
- 常见取值：`0` 逆时针 90 度，`1` 顺时针 90 度，`2` 逆时针 180 度，`3` 顺时针 180 度。

### 2.1.4 hflip / vflip 翻转

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "hflip" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/04-hflip.mp4"
```

注释说明：

- `hflip`：水平翻转。
- `vflip`：垂直翻转。

### 2.1.5 pad 添加边框

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "scale=1080:-2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/05-pad-portrait.mp4"
```

注释说明：

- `scale=1080:-2`：先把横屏视频宽度缩放到 1080。
- `pad=1080:1920`：输出画布为 9:16 竖屏。
- `(ow-iw)/2:(oh-ih)/2`：把原画面放在画布中心。
- `black`：空白区域填充黑色。

## 2.2 画面进阶处理滤镜

### 2.2.1 colorbalance 颜色平衡

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "colorbalance=rs=0.1:gs=0.1:bs=-0.1" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/06-colorbalance.mp4"
```

注释说明：

- `rs`：阴影区域红色增益。
- `gs`：阴影区域绿色增益。
- `bs=-0.1`：减少阴影区域蓝色，用于模拟偏暖效果。

### 2.2.2 eq 亮度、对比度、饱和度

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "eq=brightness=0.1:contrast=1.2:saturation=1.3" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/07-eq.mp4"
```

注释说明：

- `brightness=0.1`：亮度提高 0.1。
- `contrast=1.2`：对比度提高到 1.2 倍。
- `saturation=1.3`：饱和度提高到 1.3 倍。

### 2.2.3 boxblur / gblur / unsharp / nlmeans

```bash
# 方框模糊
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "boxblur=5:1" "outputs/scripts/02-core-filters/08-boxblur.mp4"

# 高斯模糊
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "gblur=sigma=5" "outputs/scripts/02-core-filters/09-gblur.mp4"

# 锐化
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "unsharp=3:3:1.5" "outputs/scripts/02-core-filters/10-unsharp.mp4"

# 非局部均值去噪
ffmpeg -y -i "materials/video/lowres_426x240_low_bitrate_10s.mp4" -vf "nlmeans=10" "outputs/scripts/02-core-filters/11-nlmeans.mp4"
```

注释说明：

- `boxblur=5:1`：半径 5，迭代 1 次，速度快。
- `gblur=sigma=5`：高斯模糊，效果更自然。
- `unsharp=3:3:1.5`：亮度锐化矩阵 3x3，锐化量 1.5。
- `nlmeans=10`：去噪效果好但计算成本高，脚本使用低分辨率素材演示。

## 2.3 像素格式与色彩空间转换

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "scale=1280:-2,format=yuv420p" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/12-format-yuv420p.mp4"
```

注释说明：

- `format=yuv420p`：强制输出为 Web 常用像素格式。
- 建议把 `format` 放在滤镜链末尾，确保交给编码器的是最终格式。

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "setparams=colorspace=bt709:color_trc=bt709:color_primaries=bt709,colorspace=space=bt709:trc=bt709:primaries=bt709:range=pc,format=yuv420p" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/13-colorspace-bt709.mp4"
```

注释说明：

- `colorspace` 用于颜色空间、传递函数、色域和色彩范围转换。
- `setparams` 先补充输入色彩元数据；测试素材缺少这类信息时，直接运行 `colorspace` 会报 `Unsupported input primaries`。
- 实际生产中要确认输入素材的色彩元数据，避免错误转换。

## 2.4 overlay 叠加滤镜

常用位置表达式：

```bash
overlay=10:10                  # 左上角
overlay=W-w-10:10              # 右上角
overlay=10:H-h-10              # 左下角
overlay=W-w-10:H-h-10          # 右下角
overlay=(W-w)/2:(H-h)/2        # 居中
```

完整水印命令：

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -loop 1 -i "outputs/scripts/assets/logo.png" \
  -filter_complex "[1:v]scale=120:-1,format=rgba[wm];[0:v][wm]overlay=W-w-10:H-h-10[out_v]" \
  -map "[out_v]" -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/14-overlay-bottom-right.mp4"
```

注释说明：

- `-loop 1`：把静态图片作为持续输入。
- `[1:v]scale=120:-1,format=rgba[wm]`：先缩小水印并保留透明通道。
- `overlay=W-w-10:H-h-10`：右下角留 10 像素边距。

定时显示：

```bash
overlay=10:10:enable='between(t,5,15)'
```

淡入淡出说明：

- 当前 FFmpeg 的 `overlay` 滤镜中，`alpha` 参数用于声明 alpha 格式，不支持课件中 `alpha='if(...)'` 这种透明度表达式。
- 可运行做法是在叠加层前使用 `fade=alpha=1` 或 `colorchannelmixer` 调整 alpha，再送入 `overlay`。

## 2.5 drawtext 文字叠加

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "drawtext=text='这是测试文字':fontfile=/System/Library/Fonts/Hiragino\\ Sans\\ GB.ttc:fontsize=36:fontcolor=white:x=(W-tw)/2:y=H-th-20" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/15-drawtext-title.mp4"
```

注释说明：

- `text`：显示的文字。
- `fontfile`：中文文字建议指定字体文件。
- `x=(W-tw)/2`：水平居中。
- `y=H-th-20`：距离底部 20 像素。

动态显示时间：

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "drawtext=text='%{pts\\:hms}':fontfile=/System/Library/Fonts/Hiragino\\ Sans\\ GB.ttc:fontsize=24:fontcolor=yellow:x=10:y=10" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/16-drawtext-pts.mp4"
```

注释说明：

- `%{pts\:hms}`：显示当前时间戳，格式为时分秒。
- 冒号需要转义为 `\:`，否则会被滤镜参数解析器当成分隔符。

## 2.6 多流拼接类滤镜

横向拼接：

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -i "materials/video/smptebars_1080p_30fps_8s.mp4" \
  -filter_complex "[0:v]scale=640:360[v0];[1:v]scale=640:360[v1];[v0][v1]hstack=inputs=2[out]" \
  -map "[out]" -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/17-hstack.mp4"
```

纵向拼接：

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -i "materials/video/smptebars_1080p_30fps_8s.mp4" \
  -i "materials/video/motion_boxes_720p_30fps_10s.mp4" \
  -filter_complex "[0:v]scale=480:270[v0];[1:v]scale=480:270[v1];[2:v]scale=480:270[v2];[v0][v1][v2]vstack=inputs=3[out]" \
  -map "[out]" -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/18-vstack.mp4"
```

九宫格：

```bash
ffmpeg -y \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -i "materials/video/smptebars_1080p_30fps_8s.mp4" \
  -i "materials/video/motion_boxes_720p_30fps_10s.mp4" \
  -filter_complex "[0:v]scale=320:180[v0];[1:v]scale=320:180[v1];[2:v]scale=320:180[v2];[0:v]scale=320:180[v3];[1:v]scale=320:180[v4];[2:v]scale=320:180[v5];[0:v]scale=320:180[v6];[1:v]scale=320:180[v7];[2:v]scale=320:180[v8];[v0][v1][v2][v3][v4][v5][v6][v7][v8]xstack=inputs=9:grid=3x3[out]" \
  -map "[out]" -c:v libx264 -crf 28 \
  "outputs/scripts/02-core-filters/19-xstack-9grid.mp4"
```

注释说明：

- `hstack` 要求所有输入高度一致。
- `vstack` 要求所有输入宽度一致。
- `xstack` 的 `layout` 是像素坐标或表达式，不是列号/行号；等尺寸宫格布局建议使用 `grid=3x3`。

## 2.7 音频核心处理滤镜

音量：

```bash
ffmpeg -y -i "materials/audio/tone_440hz_mono_5s.wav" \
  -af "volume=1.5" \
  "outputs/scripts/02-core-filters/20-volume.wav"
```

淡入淡出：

```bash
ffmpeg -y -i "materials/audio/tone_440hz_mono_5s.wav" \
  -af "afade=t=in:ss=0:d=1,afade=t=out:st=4:d=1" \
  "outputs/scripts/02-core-filters/21-afade.wav"
```

变速：

```bash
ffmpeg -y -i "materials/audio/tone_440hz_mono_5s.wav" \
  -af "atempo=1.5" \
  "outputs/scripts/02-core-filters/22-atempo.wav"
```

音频混合：

```bash
ffmpeg -y -i "materials/audio/tone_440hz_mono_5s.wav" \
  -i "materials/audio/pink_noise_stereo_10s.wav" \
  -filter_complex "[1:a]volume=0.3[bg];[0:a][bg]amix=inputs=2:duration=first[out_a]" \
  -map "[out_a]" \
  -c:a aac -b:a 128k \
  "outputs/scripts/02-core-filters/23-amix.m4a"
```

注释说明：

- `[1:a]volume=0.3[bg]`：先降低背景音量。
- `[0:a][bg]amix=inputs=2`：混合主音频和背景音频。
- `duration=first`：输出时长以第一个输入为准。
- AAC 更适合写入 `.m4a` 或 `.aac`，不建议写入 `.wav`。

音量标准化：

```bash
# 单遍处理
ffmpeg -y -i "materials/audio/volume_steps_1khz_9s.wav" \
  -af "loudnorm=I=-16:LRA=11:TP=-1.5" \
  "outputs/scripts/02-core-filters/24-loudnorm-one-pass.wav"

# 双遍第一遍，只打印分析数据
ffmpeg -i "materials/audio/volume_steps_1khz_9s.wav" \
  -af "loudnorm=I=-16:LRA=11:TP=-1.5:print_format=json" \
  -f null -
```

注释说明：

- 单遍处理速度快，但响度结果不如双遍精确。
- 双遍处理需要把第一遍输出的 `measured_*` 参数填入第二遍命令。
