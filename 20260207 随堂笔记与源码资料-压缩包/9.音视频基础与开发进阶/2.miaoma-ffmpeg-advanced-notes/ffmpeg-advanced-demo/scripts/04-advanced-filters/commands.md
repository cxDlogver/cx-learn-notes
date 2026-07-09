# 第 4 章：FFmpeg 高级滤镜与进阶技术专题

本章提取课件中高级视频滤镜、高级音频滤镜、Pipe、硬件加速和自定义滤镜开发相关指令。可执行测试脚本见同目录 `run.sh`。

## 4.1 高级视频滤镜

### 4.1.1 xfade 转场特效

课件模板：

```bash
-filter_complex "[0:v][1:v]xfade=transition=转场类型:duration=时长:offset=开始时间[out]"
```

完整可运行命令：

```bash
ffmpeg -y \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -filter_complex "[0:v]trim=0:5,setpts=PTS-STARTPTS,scale=640:360,fps=30,format=yuv420p,settb=AVTB[v0];[1:v]trim=0:5,setpts=PTS-STARTPTS,scale=640:360,fps=30,eq=saturation=0.2,format=yuv420p,settb=AVTB[v1];[v0][v1]xfade=transition=fade:duration=1:offset=4[outv];[0:a]atrim=0:5,asetpts=PTS-STARTPTS[a0];[1:a]atrim=0:5,asetpts=PTS-STARTPTS,volume=0.6[a1];[a0][a1]acrossfade=d=1[outa]" \
  -map "[outv]" -map "[outa]" \
  -c:v libx264 -crf 28 -c:a aac \
  "outputs/scripts/04-advanced-filters/01-xfade.mp4"
```

注释说明：

- `trim` / `atrim`：把两段素材都限制为 5 秒，便于 `offset=4` 在第 4 秒开始转场。
- `setpts=PTS-STARTPTS` / `asetpts=PTS-STARTPTS`：重置时间戳，避免转场错位。
- `scale`、`fps`、`format`：保证两个视频输入的尺寸、帧率、像素格式一致。
- `xfade=transition=fade:duration=1:offset=4`：第 4 秒开始，持续 1 秒淡入淡出。
- `acrossfade=d=1`：音频同步交叉淡化。

其他转场片段：

```bash
xfade=transition=slideleft:duration=0.5:offset=4
xfade=transition=circlecrop:duration=1:offset=4
xfade=transition=dissolve:duration=1:offset=4
```

### 4.1.2 lut3d 颜色分级

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -vf "format=rgb24,lut3d=file=outputs/scripts/assets/warm-demo.cube,format=yuv420p" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/04-advanced-filters/02-lut3d.mp4"
```

注释说明：

- `lut3d=file=...` 加载 `.cube` 三维查找表。
- `format=rgb24`：LUT 常以 RGB 空间工作，先转 RGB 更直观。
- `format=yuv420p`：最后转回常用视频像素格式。

### 4.1.3 vidstabdetect + vidstabtransform 视频稳定

```bash
# 第一步：分析抖动，生成 transforms.trf
ffmpeg -y -i "materials/video/motion_boxes_720p_30fps_10s.mp4" \
  -vf "vidstabdetect=shakiness=10:accuracy=15:result=outputs/scripts/04-advanced-filters/transforms.trf" \
  -f null -

# 第二步：应用稳定变换
ffmpeg -y -i "materials/video/motion_boxes_720p_30fps_10s.mp4" \
  -vf "vidstabtransform=smoothing=30:input=outputs/scripts/04-advanced-filters/transforms.trf:crop=black" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/04-advanced-filters/03-stabilized.mp4"
```

注释说明：

- `vidstabdetect` 只分析并生成运动数据文件。
- `vidstabtransform` 读取运动数据并修正画面。
- `crop=black` 表示稳定后空出的边缘用黑色填充。

### 4.1.4 ocr 运动跟踪与文字识别

课件中 `ocr=...:output=...` 的写法与当前 FFmpeg 8.0.1 不一致。当前本机 `ocr` 滤镜不提供 `output` 参数，可用 `metadata=print:file=...` 打印识别元数据：

```bash
ffmpeg -y -i "outputs/scripts/assets/ocr-input.mp4" \
  -vf "ocr=language=eng,metadata=mode=print:file=outputs/scripts/04-advanced-filters/04-ocr-metadata.txt" \
  -f null -
```

注释说明：

- `ocr=language=eng`：使用英文语言包识别画面文字。
- `metadata=mode=print:file=...`：把滤镜写入帧元数据的内容输出到文本文件。
- 中文识别需要安装 `chi_sim` 语言包，并确认当前 FFmpeg 的 `ocr` 滤镜支持对应语言。

环境准备示例只保留在文档中，不在脚本中执行：

```bash
# Ubuntu/Debian
sudo apt install tesseract-ocr tesseract-ocr-chi-sim

# macOS
brew install tesseract tesseract-lang
```

## 4.2 高级音频滤镜

### 4.2.1 pan 多声道处理

立体声转单声道：

```bash
ffmpeg -y -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" \
  -af "pan=mono|c0=0.5*FL+0.5*FR" \
  "outputs/scripts/04-advanced-filters/05-pan-mono.wav"
```

提取左声道：

```bash
ffmpeg -y -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" \
  -af "pan=mono|c0=FL" \
  "outputs/scripts/04-advanced-filters/06-pan-left.wav"
```

5.1 下混成立体声：

```bash
ffmpeg -y -i "outputs/scripts/assets/demo-5.1.wav" \
  -af "pan=stereo|FL=0.707*FC+1.0*FL+0.707*BL+0.5*LFE|FR=0.707*FC+1.0*FR+0.707*BR+0.5*LFE" \
  "outputs/scripts/04-advanced-filters/07-pan-5-1-to-stereo.wav"
```

注释说明：

- `pan=mono|c0=...` 定义单声道输出。
- `FL` / `FR` / `FC` / `LFE` / `BL` / `BR` 是声道名。
- 系数用于控制每个输入声道混入输出声道的比例。

### 4.2.2 afftdn 音频降噪

课件中 `afftdn=nf=20:tn=-25` 不适用于当前 FFmpeg：`nf` 是噪声底，范围为 `-80` 到 `-20`；`tn` 是布尔型。可运行写法如下：

```bash
ffmpeg -y -i "materials/audio/pink_noise_stereo_10s.wav" \
  -af "afftdn=nr=12:nf=-35" \
  "outputs/scripts/04-advanced-filters/08-afftdn.wav"
```

注释说明：

- `nr=12`：噪声衰减强度。
- `nf=-35`：噪声底估计值，数值越低越保守。

### 4.2.3 aecho 回声

```bash
ffmpeg -y -i "materials/audio/tone_440hz_mono_5s.wav" \
  -af "aecho=0.8:0.9:500:0.5" \
  "outputs/scripts/04-advanced-filters/09-aecho.wav"
```

注释说明：

- 第 1 个参数 `0.8`：输入增益。
- 第 2 个参数 `0.9`：输出增益。
- 第 3 个参数 `500`：延迟 500 毫秒。
- 第 4 个参数 `0.5`：回声衰减系数。

课件中的 `reverb=roomsize=...` 在当前 FFmpeg 8.0.1 中不是可用滤镜，因此脚本只做能力检测并跳过。

### 4.2.4 aevalsrc 音效生成

```bash
# 生成 440Hz 标准音
ffmpeg -y -f lavfi -i "aevalsrc=sin(440*2*PI*t):d=1" \
  "outputs/scripts/04-advanced-filters/10-440hz-tone.wav"

# 生成白噪声
ffmpeg -y -f lavfi -i "aevalsrc=random(0)*2-1:d=5" \
  "outputs/scripts/04-advanced-filters/11-white-noise.wav"

# 生成双声道扫频
ffmpeg -y -f lavfi -i "aevalsrc=sin(20*2*PI*t+20000*2*PI*t*t/20)|sin(20*2*PI*t+20000*2*PI*t*t/20):d=10:c=stereo" \
  "outputs/scripts/04-advanced-filters/12-sweep.wav"
```

注释说明：

- `-f lavfi` 表示输入来自 FFmpeg 内部滤镜。
- `aevalsrc` 通过数学表达式生成音频信号。
- 多声道表达式使用 `|` 分隔不同声道。

## 4.3 Pipe 协议与流处理

课件基础形式：

```bash
# 从标准输入读取
ffmpeg -i pipe:0 output.mp4

# 写入标准输出
ffmpeg -i input.mp4 -f mp4 pipe:1 > output.mp4
```

可运行本地管道示例：

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -t 2 -c:v libx264 -preset ultrafast -an -f mpegts pipe:1 | \
ffmpeg -y -i pipe:0 \
  -vf "scale=320:-2" \
  -c:v libx264 -crf 28 \
  "outputs/scripts/04-advanced-filters/13-pipe-processed.mp4"
```

注释说明：

- 前一个 FFmpeg 把视频编码为 MPEG-TS 并写到标准输出。
- 后一个 FFmpeg 从标准输入读取，再做缩放输出。
- MP4 直接走 pipe 时经常受 moov atom 位置影响，测试脚本使用更适合流式传输的 MPEG-TS。

摄像头和 RTMP 推流示例属于环境相关或生产相关命令，文档保留，不在脚本执行：

```bash
ffmpeg -f v4l2 -i /dev/video0 \
  -vf "drawtext=text='实时视频':fontfile=simhei.ttf:fontsize=24:fontcolor=white:x=10:y=10" \
  -f sdl -

ffmpeg -i rtmp://input-server/live/stream \
  -vf "scale=1280:720,drawtext=text='直播水印':fontfile=simhei.ttf:fontsize=24:fontcolor=white:x=10:y=10" \
  -c:v libx264 -preset veryfast -crf 28 -g 60 \
  -c:a aac -b:a 128k \
  -f flv rtmp://output-server/live/processed_stream
```

## 4.4 硬件加速技术

NVIDIA NVENC：

```bash
ffmpeg -encoders | grep nvenc

ffmpeg -i input.mp4 \
  -c:v h264_nvenc -preset p6 -rc constqp -qp 28 \
  -c:a copy \
  output_nvenc.mp4
```

Intel QSV：

```bash
ffmpeg -hwaccel qsv -i input.mp4 \
  -c:v h264_qsv -preset medium -global_quality 28 \
  -c:a copy \
  output_qsv.mp4
```

Apple VideoToolbox：

```bash
ffmpeg -y -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -t 2 \
  -vf "scale=640:-2,format=nv12" \
  -c:v h264_videotoolbox -q:v 50 \
  -an \
  "outputs/scripts/04-advanced-filters/14-videotoolbox.mp4"
```

注释说明：

- 硬件编码器依赖硬件、驱动和 FFmpeg 编译选项。
- 脚本会检测编码器是否存在，只执行当前机器可用的硬件示例。

## 4.5 自定义滤镜开发

以下命令涉及源码下载、编译和安装，只作为课件指令整理，不进入自动测试脚本。

```bash
git clone https://git.ffmpeg.org/ffmpeg.git
cd ffmpeg
```

```bash
# Ubuntu/Debian
sudo apt build-dep ffmpeg
```

```bash
./configure --enable-gpl --enable-shared --prefix=/usr/local
```

```bash
make -j$(nproc)
sudo make install
```

```bash
ffmpeg -i input.mp4 -vf "gray" output_gray.mp4
```

注释说明：

- `git clone` 需要网络。
- `sudo apt build-dep` 和 `sudo make install` 会修改系统环境，执行前必须明确确认。
- 自定义滤镜测试命令只有在滤镜成功集成进 FFmpeg 后才可运行。

