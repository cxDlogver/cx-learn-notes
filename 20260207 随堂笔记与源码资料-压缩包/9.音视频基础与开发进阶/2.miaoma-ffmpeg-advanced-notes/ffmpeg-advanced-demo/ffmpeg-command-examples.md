# FFmpeg 实例指令讲义

本文根据课件内容整理，按章、节、实例给出可直接演示的 FFmpeg / ffprobe 指令。课件中的 `input.mp4`、`input.mov` 等占位文件已替换为本项目 `materials` 目录中的实际测试素材。

## 使用约定

### 素材目录

```bash
# 音频素材
"materials/audio"

# 视频素材
"materials/video"
```

### 输出目录

```bash
# 建议先创建输出目录，后续命令统一写入 outputs，避免污染 materials 原始素材
mkdir -p \
  "outputs/01-basic" \
  "outputs/02-probe" \
  "outputs/03-transcode" \
  "outputs/04-trim-scale-crop" \
  "outputs/05-av-split-merge" \
  "outputs/06-video-filters" \
  "outputs/07-audio-filters" \
  "outputs/08-advanced"
```

### 通用说明

- `-y`：输出文件已存在时自动覆盖，课堂演示时减少交互。
- `-hide_banner`：隐藏 FFmpeg 版本横幅，便于聚焦参数和日志。
- 路径统一加双引号，避免空格路径导致命令失败。
- 所有输出文件都写入 `outputs`，`materials` 只作为只读输入素材。

---

# 第 1 章 FFmpeg 命令基本格式

## 1.1 标准命令结构

```bash
ffmpeg [全局选项] [输入选项] -i "输入文件" [输出选项] "输出文件"
```

### 实例 1：最简单的格式转换

```bash
ffmpeg -y \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  "outputs/01-basic/basic_convert.mov"
```

注释说明：

- `-y`：如果 `basic_convert.mov` 已存在，直接覆盖。
- `-i "materials/video/testsrc2_720p_30fps_10s.mp4"`：指定输入视频。
- `"outputs/01-basic/basic_convert.mov"`：根据输出后缀 `.mov` 自动选择 MOV 封装。
- 该命令没有显式指定编码器，FFmpeg 会根据输出格式自动选择可用编码器。

课堂提示：

- 这条命令适合用来说明“FFmpeg 会根据输出后缀推断封装格式”。
- 自动推断虽然方便，但生产环境通常建议显式指定 `-c:v`、`-c:a`。

## 1.2 全局选项、输入选项、输出选项的位置

### 实例 2：输入前快速定位，输出端控制编码

```bash
ffmpeg -y -hide_banner \
  -ss 00:00:02 \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -t 3 \
  -c:v libx264 \
  -c:a aac \
  "outputs/01-basic/options_position.mp4"
```

注释说明：

- `-hide_banner`：全局选项，作用于整个命令。
- `-ss 00:00:02`：放在 `-i` 前，是输入选项，表示先快速跳到 2 秒附近再开始读取。
- `-i ...`：输入文件。
- `-t 3`：输出选项，表示输出 3 秒内容。
- `-c:v libx264`：输出视频使用 H.264 编码器。
- `-c:a aac`：输出音频使用 AAC 编码器。当前素材无音频时，该参数不会生成新音轨。

课堂提示：

- 参数位置很关键：同一个 `-ss` 放在 `-i` 前后，速度和精度都不同。

---

# 第 2 章 媒体信息查询

## 2.1 使用 ffprobe 查看完整信息

### 实例 1：查看视频文件基础信息

```bash
ffprobe "materials/video/av_sync_test_720p_30fps_10s.mp4"
```

注释说明：

- `ffprobe` 只读取媒体元数据，不修改文件。
- 输出中可以看到封装格式、时长、码率、视频流、音频流等信息。
- `av_sync_test_720p_30fps_10s.mp4` 同时包含视频和音频，适合演示多流信息。

## 2.2 输出 JSON，便于程序解析

### 实例 2：查询 format 和 streams

```bash
ffprobe -v quiet \
  -print_format json \
  -show_format \
  -show_streams \
  "materials/video/av_sync_test_720p_30fps_10s.mp4"
```

注释说明：

- `-v quiet`：关闭普通日志，只输出结构化结果。
- `-print_format json`：以 JSON 格式输出，前端或 Node.js 脚本容易解析。
- `-show_format`：输出容器级信息，例如 `duration`、`size`、`bit_rate`。
- `-show_streams`：输出每条媒体流信息，例如视频流、音频流。

重点字段：

- `codec_name`：编码名称，例如 `h264`、`aac`。
- `width` / `height`：视频分辨率。
- `r_frame_rate`：帧率。
- `pix_fmt`：像素格式，例如 `yuv420p`。
- `duration`：时长。
- `bit_rate`：平均码率。

## 2.3 只查看视频流或音频流

### 实例 3：只查看视频流

```bash
ffprobe -v quiet \
  -select_streams v \
  -show_streams \
  "materials/video/av_sync_test_720p_30fps_10s.mp4"
```

注释说明：

- `-select_streams v`：只选择视频流。
- 适合检查分辨率、编码器、像素格式、帧率等视频属性。

### 实例 4：只查看音频流

```bash
ffprobe -v quiet \
  -select_streams a \
  -show_streams \
  "materials/video/av_sync_test_720p_30fps_10s.mp4"
```

注释说明：

- `-select_streams a`：只选择音频流。
- 适合检查采样率、声道数、音频编码、码率等属性。

## 2.4 精准查询指定字段

### 实例 5：只输出视频宽高、帧率、编码名

```bash
ffprobe -v error \
  -select_streams v:0 \
  -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt \
  -of default=noprint_wrappers=1 \
  "materials/video/testsrc2_720p_30fps_10s.mp4"
```

注释说明：

- `-v error`：只显示错误日志。
- `-select_streams v:0`：选择第 1 条视频流。
- `-show_entries stream=...`：只输出关心的字段。
- `-of default=noprint_wrappers=1`：简化输出格式，便于课堂展示。

---

# 第 3 章 转码与格式转换

## 3.1 通用 MP4 转码

### 实例 1：转为 H.264 + AAC，网页兼容性优先

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -pix_fmt yuv420p \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  "outputs/03-transcode/h264_aac_faststart.mp4"
```

注释说明：

- `-c:v libx264`：视频编码为 H.264，网页和移动端兼容性最好。
- `-preset medium`：编码速度和压缩率的平衡档。
- `-crf 23`：恒定质量模式，数值越小质量越高、体积越大。
- `-pix_fmt yuv420p`：Web 播放最常用像素格式。
- `-c:a aac`：音频编码为 AAC，MP4 标准搭配。
- `-b:a 128k`：音频码率 128 kbps。
- `-movflags +faststart`：将 MP4 元数据移动到文件头，支持边下载边播放。

课堂提示：

- 这是最适合作为“生产常用 MP4 转码模板”的命令。

## 3.2 转为 WebM

### 实例 2：转为 VP9 + Opus

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -c:v libvpx-vp9 \
  -crf 30 \
  -b:v 0 \
  -c:a libopus \
  -b:a 128k \
  "outputs/03-transcode/vp9_opus.webm"
```

注释说明：

- `-c:v libvpx-vp9`：视频编码为 VP9。
- `-crf 30`：VP9 的恒定质量参数，数值越大体积越小。
- `-b:v 0`：配合 VP9 CRF 使用，表示不指定固定视频码率。
- `-c:a libopus`：音频编码为 Opus。
- `.webm`：WebM 封装通常搭配 VP8/VP9/AV1 + Opus/Vorbis。

课堂提示：

- VP9 编码通常比 H.264 慢，适合讲“编码效率和编码耗时的权衡”。

## 3.3 只转换封装，不重新编码

### 实例 3：MP4 重新封装为 MOV

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -c copy \
  "outputs/03-transcode/remux_copy.mov"
```

注释说明：

- `-c copy`：视频流和音频流直接复制，不解码、不重新编码。
- 速度极快，画质完全不变。
- 只适用于目标封装支持原始编码的情况。

课堂提示：

- `-c copy` 是封装转换、快速剪辑的核心参数。
- 它不能改变分辨率、码率、编码格式，也不能做滤镜处理。

## 3.4 CRF 质量控制

### 实例 4：较高质量 H.264

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -c:v libx264 \
  -crf 18 \
  -pix_fmt yuv420p \
  "outputs/03-transcode/crf_18_high_quality.mp4"
```

### 实例 5：较小体积 H.264

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -c:v libx264 \
  -crf 30 \
  -pix_fmt yuv420p \
  "outputs/03-transcode/crf_30_small_size.mp4"
```

注释说明：

- H.264 常见 CRF 范围是 `18` 到 `28`。
- `18` 接近肉眼高质量，文件较大。
- `23` 是 libx264 默认值。
- `28` 到 `30` 适合网络预览或体积敏感场景。

课堂提示：

- 可以让同学对比两个输出文件的大小和画质，直观看到 CRF 的影响。

## 3.5 preset 编码速度与压缩率

### 实例 6：最快预设

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -c:v libx264 \
  -preset ultrafast \
  -crf 23 \
  -pix_fmt yuv420p \
  "outputs/03-transcode/preset_ultrafast.mp4"
```

### 实例 7：较慢但压缩率更好的预设

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -c:v libx264 \
  -preset slow \
  -crf 23 \
  -pix_fmt yuv420p \
  "outputs/03-transcode/preset_slow.mp4"
```

注释说明：

- `-preset` 影响编码耗时和压缩率，不直接表示画质等级。
- 同样的 `-crf 23` 下，`slow` 通常比 `ultrafast` 文件更小，但编码更慢。
- 常用生产折中值：`medium`、`fast`、`faster`。

## 3.6 网络播放优化

### 实例 8：MP4 faststart

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -c copy \
  -movflags +faststart \
  "outputs/03-transcode/faststart_copy.mp4"
```

注释说明：

- `-movflags +faststart`：把 MP4 的 `moov` 元数据移动到文件头。
- 浏览器或播放器可以先拿到元信息，再边下载边播放。
- 该命令搭配 `-c copy`，不改变编码，处理速度很快。

## 3.7 指定码率和帧率

### 实例 9：固定视频码率和音频码率

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -c:v libx264 \
  -b:v 2M \
  -c:a aac \
  -b:a 128k \
  -pix_fmt yuv420p \
  "outputs/03-transcode/bitrate_2m_audio_128k.mp4"
```

注释说明：

- `-b:v 2M`：视频平均码率约 2 Mbps。
- `-b:a 128k`：音频码率 128 kbps。
- 固定码率常用于直播、带宽预算明确的场景。

### 实例 10：强制输出为 24 fps

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -r 24 \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/03-transcode/output_24fps.mp4"
```

注释说明：

- `-r 24` 放在输出侧时，表示输出帧率为 24 fps。
- 输入素材是 30 fps，输出时 FFmpeg 会丢帧或重采样时间轴。

---

# 第 4 章 视频截取、缩放、裁剪与截图

## 4.1 快速截取片段

### 实例 1：关键帧快速截取

```bash
ffmpeg -y -hide_banner \
  -ss 00:00:02 \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -t 3 \
  -c copy \
  "outputs/04-trim-scale-crop/cut_fast_keyframe.mp4"
```

注释说明：

- `-ss 00:00:02` 放在 `-i` 前，FFmpeg 会快速跳转到 2 秒附近。
- `-t 3`：截取 3 秒。
- `-c copy`：流复制，不重新编码。
- 速度很快，但起点精度受关键帧位置影响。

课堂提示：

- 适合演示“为什么有时剪出来不是严格从指定帧开始”。

## 4.2 精确截取片段

### 实例 2：重编码精确截取

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -ss 00:00:02 \
  -t 3 \
  -c:v libx264 \
  -c:a aac \
  -pix_fmt yuv420p \
  "outputs/04-trim-scale-crop/cut_precise_reencode.mp4"
```

注释说明：

- `-ss` 放在 `-i` 后，FFmpeg 先解码再定位。
- 精度更高，但速度比 `-c copy` 慢。
- 因为需要重新编码，所以可以同时改变编码参数、分辨率或添加滤镜。

## 4.3 兼顾速度和精度的截取

### 实例 3：两段式 `-ss`

```bash
ffmpeg -y -hide_banner \
  -ss 00:00:02 \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -ss 0 \
  -t 3 \
  -c copy \
  "outputs/04-trim-scale-crop/cut_best_effort.mp4"
```

注释说明：

- 第一个 `-ss` 放在输入前，用于快速定位。
- 第二个 `-ss 0` 放在输入后，表示从定位后的当前位置继续处理。
- 课件中称为兼顾速度和精度的写法，但实际精度仍受 `-c copy` 与关键帧约束。

## 4.4 调整分辨率

### 实例 4：按宽度等比缩放

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "scale=640:-2" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/04-trim-scale-crop/scale_width_640.mp4"
```

注释说明：

- `-vf`：指定视频滤镜链。
- `scale=640:-2`：宽度固定为 640，高度按比例计算，并自动取偶数。
- 视频编码常要求宽高为偶数，`-2` 比 `-1` 更适合生产命令。

### 实例 5：按高度等比缩放到 720p

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/portrait_testsrc2_1080x1920_30fps_8s.mp4" \
  -vf "scale=-2:720" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/04-trim-scale-crop/scale_height_720.mp4"
```

注释说明：

- `scale=-2:720`：高度固定为 720，宽度按比例计算，并取偶数。
- 适合演示竖屏素材缩放。

## 4.5 裁剪画面

### 实例 6：横屏视频裁剪为中央正方形

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "crop=in_h:in_h" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/04-trim-scale-crop/crop_center_square.mp4"
```

注释说明：

- `crop=width:height:x:y`：裁剪宽度、高度、起点 x、起点 y。
- `crop=in_h:in_h`：用输入高度作为宽和高，得到居中正方形。
- 未显式写 `x:y` 时，FFmpeg 默认居中裁剪。

### 实例 7：明确指定裁剪区域

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "crop=640:360:320:180" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/04-trim-scale-crop/crop_640x360_xy.mp4"
```

注释说明：

- `crop=640:360:320:180`：从坐标 `(320, 180)` 开始，裁剪 640 x 360 区域。
- 适合讲坐标系：左上角是 `(0, 0)`，x 向右，y 向下。

## 4.6 提取封面

### 实例 8：第 2 秒提取一张 JPG

```bash
ffmpeg -y -hide_banner \
  -ss 00:00:02 \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vframes 1 \
  -q:v 2 \
  "outputs/04-trim-scale-crop/cover_at_2s.jpg"
```

注释说明：

- `-ss 00:00:02`：定位到第 2 秒。
- `-vframes 1`：只输出 1 帧。
- `-q:v 2`：JPEG 质量，数值越小质量越高，常用 `2` 到 `5`。

## 4.7 批量抽帧

### 实例 9：每秒抽 1 帧

```bash
mkdir -p "outputs/04-trim-scale-crop/frames"

ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -r 1 \
  "outputs/04-trim-scale-crop/frames/frame_%04d.jpg"
```

注释说明：

- `-r 1` 放在输出侧，表示每秒输出 1 张图。
- `frame_%04d.jpg`：按 4 位数字编号，例如 `frame_0001.jpg`。
- 批量抽帧适合视频预览图、缩略图、算法取样。

---

# 第 5 章 音视频分离与合并

## 5.1 提取音频

### 实例 1：保留原音频编码

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -vn \
  -c:a copy \
  "outputs/05-av-split-merge/extract_audio_copy.aac"
```

注释说明：

- `-vn`：禁用视频流，只输出音频。
- `-c:a copy`：音频流直接复制，不重新编码。
- 输入素材音频是 AAC，因此输出使用 `.aac`。

### 实例 2：提取并转码为 MP3

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -vn \
  -c:a libmp3lame \
  -b:a 192k \
  "outputs/05-av-split-merge/extract_audio_192k.mp3"
```

注释说明：

- `-c:a libmp3lame`：音频转码为 MP3。
- `-b:a 192k`：设置 MP3 音频码率。
- 因为发生重新编码，速度比 `-c:a copy` 慢。

## 5.2 提取无音频视频

### 实例 3：去掉音频轨

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -an \
  -c:v copy \
  "outputs/05-av-split-merge/video_without_audio.mp4"
```

注释说明：

- `-an`：禁用音频流。
- `-c:v copy`：视频流直接复制，不重新编码。
- 适合快速生成静音视频。

## 5.3 合并音视频

### 实例 4：替换视频中的音频

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" \
  -c:v copy \
  -c:a aac \
  -b:a 128k \
  -map 0:v:0 \
  -map 1:a:0 \
  -shortest \
  "outputs/05-av-split-merge/replace_audio.mp4"
```

注释说明：

- 第一个输入 `0`：视频素材。
- 第二个输入 `1`：音频素材。
- `-map 0:v:0`：从第一个输入取第 1 条视频流。
- `-map 1:a:0`：从第二个输入取第 1 条音频流。
- `-c:v copy`：视频不重新编码。
- `-c:a aac`：WAV 音频转为 AAC，方便封装进 MP4。
- `-shortest`：以较短的流为准结束输出，避免视频或音频尾部空跑。

课堂提示：

- `-map` 是多输入、多音轨、多字幕处理的基础，建议重点讲。

### 实例 5：视频静音后再合并新音频

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -i "materials/audio/beeps_every_second_10s.wav" \
  -map 0:v:0 \
  -map 1:a:0 \
  -c:v copy \
  -c:a aac \
  -b:a 128k \
  "outputs/05-av-split-merge/video_with_new_beeps.mp4"
```

注释说明：

- 即使原视频有音频，只要 `-map` 没有选择 `0:a`，原音频就不会进入输出。
- 该命令用蜂鸣音替换原音频，适合讲音视频同步观察。

---

# 第 6 章 常用视频滤镜

## 6.1 滤镜基本语法

```bash
ffmpeg -i "输入文件" -vf "滤镜1,滤镜2,滤镜3" "输出文件"
```

注释说明：

- `-vf`：单输入、单输出的视频滤镜链。
- 多个滤镜用英文逗号连接，按从左到右顺序执行。
- 涉及多个输入时，一般使用 `-filter_complex`。

## 6.2 添加文字和网格

### 实例 1：添加时间文字和网格

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "drawgrid=width=160:height=90:color=white@0.35:thickness=1,drawtext=text='%{pts\\:hms}':x=40:y=40:fontsize=48:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=12" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/06-video-filters/drawtext_drawgrid.mp4"
```

注释说明：

- `drawgrid=...`：给画面添加网格，适合讲坐标、裁剪和缩放。
- `drawtext=...`：绘制文字。
- `%{pts\:hms}`：显示当前时间戳，冒号需要转义。
- `x=40:y=40`：文字左上角坐标。
- `box=1`、`boxcolor=black@0.45`：给文字增加半透明背景。

## 6.3 图片水印

### 实例 2：先生成一个透明 PNG 水印

```bash
ffmpeg -y -hide_banner \
  -f lavfi \
  -i "color=c=black@0.0:size=320x120" \
  -frames:v 1 \
  -vf "format=rgba,drawtext=text='FFmpeg Demo':x=24:y=38:fontsize=38:fontcolor=white:box=1:boxcolor=red@0.75:boxborderw=12" \
  "outputs/06-video-filters/demo_logo.png"
```

注释说明：

- `-f lavfi -i "color=..."`：使用 FFmpeg 内置滤镜源生成一张透明背景图。
- `format=rgba`：保留 alpha 透明通道。
- `drawtext`：绘制水印文字。
- `-frames:v 1`：只输出 1 张图片。

### 实例 3：把 PNG 水印叠加到右下角

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -i "outputs/06-video-filters/demo_logo.png" \
  -filter_complex "overlay=W-w-24:H-h-24" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/06-video-filters/image_watermark_bottom_right.mp4"
```

注释说明：

- 第一个输入是主视频，第二个输入是水印图片。
- `overlay=x:y`：将第二路画面叠加到第一路画面。
- `W` / `H`：主视频宽高。
- `w` / `h`：水印宽高。
- `W-w-24:H-h-24`：右下角，距离右边和底部各 24 像素。

## 6.4 透明视频叠加

### 实例 4：叠加 ProRes 透明通道素材

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -i "materials/video/alpha_overlay_source_512x512_30fps_6s.mov" \
  -filter_complex "[0:v][1:v]overlay=x=40:y=120:format=auto" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  -shortest \
  "outputs/06-video-filters/alpha_overlay.mp4"
```

注释说明：

- `alpha_overlay_source_512x512_30fps_6s.mov` 是带 alpha 通道的 ProRes MOV。
- `overlay=x=40:y=120`：把透明视频叠加到主视频左侧区域。
- `format=auto`：让 overlay 自动处理透明像素格式。
- `-shortest`：透明素材只有 6 秒，输出以较短流结束。

## 6.5 视频旋转

### 实例 5：顺时针旋转 90 度

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/portrait_testsrc2_1080x1920_30fps_8s.mp4" \
  -vf "transpose=1" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/06-video-filters/rotate_clockwise_90.mp4"
```

注释说明：

- `transpose=1`：顺时针旋转 90 度。
- 常见取值：
  - `0`：逆时针 90 度并垂直翻转。
  - `1`：顺时针 90 度。
  - `2`：逆时针 90 度。
  - `3`：顺时针 90 度并垂直翻转。

## 6.6 水平和垂直翻转

### 实例 6：水平镜像

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/motion_boxes_720p_30fps_10s.mp4" \
  -vf "hflip" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/06-video-filters/hflip.mp4"
```

注释说明：

- `hflip`：左右镜像，常用于自拍镜像或素材方向修正。

### 实例 7：垂直翻转

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/motion_boxes_720p_30fps_10s.mp4" \
  -vf "vflip" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/06-video-filters/vflip.mp4"
```

注释说明：

- `vflip`：上下翻转。

## 6.7 绿幕抠像

### 实例 8：使用 chromakey 去绿色背景

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/green_screen_boxes_720p_30fps_6s.mp4" \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -filter_complex "[0:v]chromakey=0x00ff00:0.20:0.08[fg];[1:v][fg]overlay=0:0:format=auto" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  -shortest \
  "outputs/06-video-filters/chromakey_overlay.mp4"
```

注释说明：

- 第一个输入是绿幕前景，第二个输入是背景视频。
- `chromakey=0x00ff00:0.20:0.08`：将接近绿色的像素变透明。
- `0x00ff00`：目标绿色。
- `0.20`：相似度阈值，越大去除范围越宽。
- `0.08`：边缘混合参数，用于减轻锯齿或硬边。
- `[fg]`：给滤镜输出命名，后续 overlay 使用。

## 6.8 竖屏转横屏画布

### 实例 9：缩放后填充黑边

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/portrait_testsrc2_1080x1920_30fps_8s.mp4" \
  -vf "scale=-2:720,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/06-video-filters/portrait_to_landscape_pad.mp4"
```

注释说明：

- `scale=-2:720`：先把竖屏视频高度缩放到 720。
- `pad=1280:720:...:black`：放入 1280 x 720 横屏画布，多余区域填黑。
- `(ow-iw)/2`、`(oh-ih)/2`：让缩放后的画面在画布中居中。

---

# 第 7 章 常用音频处理

## 7.1 音量调整

### 实例 1：音量放大到 1.5 倍

```bash
ffmpeg -y -hide_banner \
  -i "materials/audio/volume_steps_1khz_9s.wav" \
  -af "volume=1.5" \
  "outputs/07-audio-filters/volume_up_1_5x.wav"
```

注释说明：

- `-af`：指定音频滤镜链。
- `volume=1.5`：音量乘以 1.5。
- 放大音量可能导致削波失真，课堂上可结合波形工具观察。

### 实例 2：音量降低到 50%

```bash
ffmpeg -y -hide_banner \
  -i "materials/audio/volume_steps_1khz_9s.wav" \
  -af "volume=0.5" \
  "outputs/07-audio-filters/volume_down_0_5x.wav"
```

注释说明：

- `volume=0.5`：音量减半。
- 适合演示音频滤镜参数的线性缩放。

## 7.2 转换采样率和声道数

### 实例 3：转为 44.1 kHz、单声道

```bash
ffmpeg -y -hide_banner \
  -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" \
  -ar 44100 \
  -ac 1 \
  "outputs/07-audio-filters/resample_mono_44100.wav"
```

注释说明：

- `-ar 44100`：输出采样率为 44.1 kHz。
- `-ac 1`：输出单声道。
- 输入素材左右声道频率不同，转单声道后会混合左右声道。

## 7.3 声道处理

### 实例 4：只保留左声道

```bash
ffmpeg -y -hide_banner \
  -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" \
  -af "pan=mono|c0=FL" \
  "outputs/07-audio-filters/left_channel_only.wav"
```

注释说明：

- `pan=mono|c0=FL`：输出单声道，内容来自前左声道。
- 输入左声道是 440 Hz，输出应只听到较低频率声音。

### 实例 5：只保留右声道

```bash
ffmpeg -y -hide_banner \
  -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" \
  -af "pan=mono|c0=FR" \
  "outputs/07-audio-filters/right_channel_only.wav"
```

注释说明：

- `pan=mono|c0=FR`：输出单声道，内容来自前右声道。
- 输入右声道是 880 Hz，输出应只听到较高频率声音。

### 实例 6：拆分左右声道为两个文件

```bash
ffmpeg -y -hide_banner \
  -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" \
  -filter_complex "channelsplit=channel_layout=stereo[left][right]" \
  -map "[left]" \
  "outputs/07-audio-filters/split_left.wav" \
  -map "[right]" \
  "outputs/07-audio-filters/split_right.wav"
```

注释说明：

- `channelsplit=channel_layout=stereo`：将立体声拆成左右两个单声道流。
- `[left]`、`[right]`：滤镜输出标签。
- 两个 `-map` 分别把左右声道输出到两个 WAV 文件。

## 7.4 淡入淡出

### 实例 7：音频淡入淡出

```bash
ffmpeg -y -hide_banner \
  -i "materials/audio/tone_440hz_mono_5s.wav" \
  -af "afade=t=in:st=0:d=1,afade=t=out:st=4:d=1" \
  "outputs/07-audio-filters/fade_in_out.wav"
```

注释说明：

- `afade=t=in:st=0:d=1`：从 0 秒开始，1 秒淡入。
- `afade=t=out:st=4:d=1`：从 4 秒开始，1 秒淡出。
- 多个音频滤镜用英文逗号串联。

## 7.5 音频响度标准化

### 实例 8：使用 loudnorm 标准化响度

```bash
ffmpeg -y -hide_banner \
  -i "materials/audio/volume_steps_1khz_9s.wav" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  "outputs/07-audio-filters/loudnorm.wav"
```

注释说明：

- `loudnorm`：响度标准化滤镜。
- `I=-16`：目标综合响度为 -16 LUFS，常用于网络内容。
- `TP=-1.5`：true peak 上限为 -1.5 dBTP，避免峰值过载。
- `LRA=11`：响度范围目标。

课堂提示：

- 正式生产通常使用 two-pass loudnorm；课堂入门可先讲单次处理。

## 7.6 音频频率滤波

### 实例 9：低通滤波

```bash
ffmpeg -y -hide_banner \
  -i "materials/audio/sweep_20hz_to_20khz_10s.wav" \
  -af "lowpass=f=1000" \
  "outputs/07-audio-filters/lowpass_1000hz.wav"
```

注释说明：

- `lowpass=f=1000`：保留 1000 Hz 以下频率，削弱高频。
- 输入素材是 20 Hz 到 20 kHz 扫频，适合听到滤波前后的差异。

### 实例 10：高通滤波

```bash
ffmpeg -y -hide_banner \
  -i "materials/audio/sweep_20hz_to_20khz_10s.wav" \
  -af "highpass=f=1000" \
  "outputs/07-audio-filters/highpass_1000hz.wav"
```

注释说明：

- `highpass=f=1000`：保留 1000 Hz 以上频率，削弱低频。
- 可与低通滤波对比讲“频率范围”的概念。

---

# 第 8 章 高级组合与实战模板

## 8.1 音视频同步偏移

### 实例 1：让音频延后 0.5 秒

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -itsoffset 0.5 \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -map 0:v:0 \
  -map 1:a:0 \
  -c:v copy \
  -c:a aac \
  -shortest \
  "outputs/08-advanced/audio_delay_0_5s.mp4"
```

注释说明：

- 第一个输入提供视频。
- `-itsoffset 0.5` 作用于紧随其后的第二个输入，让第二个输入整体延后 0.5 秒。
- 第二个输入只取音频：`-map 1:a:0`。
- 适合讲解音画不同步的修正思路。

## 8.2 使用 setpts 改变视频速度

### 实例 2：视频 2 倍速，音频保持不处理

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "setpts=0.5*PTS" \
  -an \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/08-advanced/video_2x_speed_no_audio.mp4"
```

注释说明：

- `setpts=0.5*PTS`：视频时间戳减半，播放速度变为 2 倍。
- `-an`：输入素材无音频时可省略，这里保留用于强调只处理视频。

## 8.3 使用 atempo 改变音频速度

### 实例 3：音频 1.5 倍速

```bash
ffmpeg -y -hide_banner \
  -i "materials/audio/beeps_every_second_10s.wav" \
  -af "atempo=1.5" \
  "outputs/08-advanced/audio_1_5x_speed.wav"
```

注释说明：

- `atempo=1.5`：音频播放速度变为 1.5 倍，同时尽量保持音高。
- `atempo` 单个滤镜常用范围是 `0.5` 到 `2.0`。

## 8.4 同时改变音视频速度

### 实例 4：音视频同时 2 倍速

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]" \
  -map "[v]" \
  -map "[a]" \
  -c:v libx264 \
  -c:a aac \
  -pix_fmt yuv420p \
  "outputs/08-advanced/av_2x_speed.mp4"
```

注释说明：

- `[0:v]setpts=0.5*PTS[v]`：处理第一个输入的视频流，输出标签为 `[v]`。
- `[0:a]atempo=2.0[a]`：处理第一个输入的音频流，输出标签为 `[a]`。
- `-map "[v]" -map "[a]"`：把滤镜处理后的音视频流写入输出文件。

## 8.5 碎片化 MP4

### 实例 5：生成适合流式播放的 fragmented MP4

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -c copy \
  -movflags frag_keyframe+empty_moov \
  "outputs/08-advanced/fragmented_mp4.mp4"
```

注释说明：

- `frag_keyframe`：按关键帧切分 MP4 fragment。
- `empty_moov`：输出开始就写入空的 moov，适合流式输出。
- 常用于 MSE、直播录制、边生成边播放等场景。

## 8.6 网络流保存模板

### 实例 6：保存 RTMP 直播流

```bash
ffmpeg -y -hide_banner \
  -i "rtmp://example.com/live/stream" \
  -c copy \
  "outputs/08-advanced/live_record.mp4"
```

注释说明：

- 这是模板命令，示例地址不可直接使用。
- `-i "rtmp://..."`：输入可以是本地文件，也可以是网络流。
- `-c copy`：直播录制时优先直拷，降低 CPU 开销。

课堂提示：

- 讲网络流时要说明协议、权限、稳定性和延迟问题。

---

# 第 9 章 参数速查与课堂讲解重点

## 9.1 流选择参数

| 参数 | 作用 | 常见用法 |
| --- | --- | --- |
| `-c:v` | 指定视频编码器 | `-c:v libx264` |
| `-c:a` | 指定音频编码器 | `-c:a aac` |
| `-c:s` | 指定字幕编码器 | `-c:s mov_text` |
| `-c copy` | 流复制，不重新编码 | 快速剪辑、封装转换 |
| `-vn` | 禁用视频流 | 提取纯音频 |
| `-an` | 禁用音频流 | 提取无声视频 |
| `-sn` | 禁用字幕流 | 移除字幕 |
| `-map` | 手动映射流 | 多输入合并、替换音频 |

## 9.2 视频编码参数

| 参数 | 作用 | 推荐说明 |
| --- | --- | --- |
| `-crf` | 恒定质量 | H.264 常用 `18` 到 `28` |
| `-b:v` | 视频码率 | 直播或带宽固定场景 |
| `-preset` | 编码速度预设 | 常用 `medium`、`fast`、`faster` |
| `-r` | 帧率 | 输出侧表示目标帧率 |
| `-pix_fmt` | 像素格式 | Web 通常用 `yuv420p` |
| `-profile:v` | H.264 档位 | 兼容性要求高时使用 |
| `-level:v` | H.264 level | 约束解码设备能力 |
| `-g` | GOP 长度 | 影响关键帧间隔 |

## 9.3 音频编码参数

| 参数 | 作用 | 推荐说明 |
| --- | --- | --- |
| `-b:a` | 音频码率 | 常用 `128k`、`192k` |
| `-ar` | 采样率 | 常用 `44100`、`48000` |
| `-ac` | 声道数 | `1` 单声道，`2` 立体声 |
| `-af` | 音频滤镜 | `volume`、`pan`、`afade`、`loudnorm` |

## 9.4 时间控制参数

| 参数 | 作用 | 注意点 |
| --- | --- | --- |
| `-ss` | 起始时间 | 放 `-i` 前快，放 `-i` 后准 |
| `-t` | 持续时长 | 从起点向后截取 |
| `-to` | 结束时间 | 指定截取终点 |
| `-shortest` | 最短流结束 | 合并不同时长音视频常用 |

## 9.5 常用滤镜

| 滤镜 | 类型 | 作用 |
| --- | --- | --- |
| `scale` | 视频 | 缩放分辨率 |
| `crop` | 视频 | 裁剪画面 |
| `pad` | 视频 | 扩展画布、补黑边 |
| `drawtext` | 视频 | 绘制文字 |
| `drawgrid` | 视频 | 绘制网格 |
| `overlay` | 视频 | 叠加图片或视频 |
| `transpose` | 视频 | 旋转画面 |
| `hflip` / `vflip` | 视频 | 水平/垂直翻转 |
| `chromakey` | 视频 | 绿幕抠像 |
| `volume` | 音频 | 调整音量 |
| `pan` | 音频 | 声道重映射 |
| `channelsplit` | 音频 | 拆分声道 |
| `afade` | 音频 | 淡入淡出 |
| `loudnorm` | 音频 | 响度标准化 |
| `lowpass` / `highpass` | 音频 | 频率滤波 |

## 9.6 课堂建议顺序

1. 先用 `ffprobe` 看素材，让同学理解“容器、编码、流”的区别。
2. 再讲 `ffmpeg -i 输入 输出` 的基本结构。
3. 然后对比 `-c copy` 与重新编码，建立性能和质量意识。
4. 接着讲 `-ss`、`-t`、`scale`、`crop` 等最常用视频处理。
5. 再讲 `-vn`、`-an`、`-map`，进入音视频分离与合并。
6. 最后讲滤镜链和 `filter_complex`，从单输入处理过渡到多输入合成。

---

# 附录：可直接复用的最小模板

## A.1 Web MP4 推荐模板

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -pix_fmt yuv420p \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  "outputs/03-transcode/web_ready.mp4"
```

## A.2 快速剪辑模板

```bash
ffmpeg -y -hide_banner \
  -ss 00:00:02 \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -t 3 \
  -c copy \
  "outputs/04-trim-scale-crop/quick_cut.mp4"
```

## A.3 精确剪辑模板

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -ss 00:00:02 \
  -t 3 \
  -c:v libx264 \
  -c:a aac \
  -pix_fmt yuv420p \
  "outputs/04-trim-scale-crop/precise_cut.mp4"
```

## A.4 替换音频模板

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" \
  -map 0:v:0 \
  -map 1:a:0 \
  -c:v copy \
  -c:a aac \
  -shortest \
  "outputs/05-av-split-merge/replace_audio_template.mp4"
```

## A.5 滤镜链模板

```bash
ffmpeg -y -hide_banner \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "scale=640:-2,crop=640:360,drawtext=text='Demo':x=20:y=20:fontsize=36:fontcolor=white" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "outputs/06-video-filters/filter_chain_template.mp4"
```
