# 第 3 章：多路混合与复杂媒体处理实战

本章提取课件中短视频处理流水线、多机位混合、直播录制后期处理和编码参数优化的实例指令。可执行测试脚本见同目录 `run.sh`。

## 3.1 短视频标准处理流水线

课件目标：

1. 将横屏视频转成 9:16 竖屏。
2. 使用模糊背景替代黑边。
3. 添加顶部标题文字。
4. 添加右下角 logo 水印。
5. 输出 H.264 + AAC，并启用 `+faststart`。

可运行命令：

```bash
ffmpeg -y \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -loop 1 -i "outputs/scripts/assets/logo.png" \
  -t 5 \
  -filter_complex "[0:v]scale=360:640,setsar=1,boxblur=20:5[bg];[0:v]scale=360:-2,setsar=1[main];[bg][main]overlay=(W-w)/2:(H-h)/2[video];[video]drawtext=text='这是视频标题':fontfile=/System/Library/Fonts/Hiragino\\ Sans\\ GB.ttc:fontsize=24:fontcolor=white:x=(W-tw)/2:y=40[video_with_title];[1:v]scale=72:-1,format=rgba[logo];[video_with_title][logo]overlay=W-w-12:H-h-12[final_video]" \
  -map "[final_video]" -map 0:a? \
  -c:v libx264 -crf 28 -preset medium \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  "outputs/scripts/03-complex-media-practice/01-short-video-pipeline.mp4"
```

注释说明：

- `[0:v]scale=360:640,boxblur=20:5[bg]`：把原视频拉伸成竖屏背景并模糊。
- `[0:v]scale=360:-2[main]`：保留原视频比例，宽度适配竖屏画布。
- `[bg][main]overlay=(W-w)/2:(H-h)/2`：把主画面居中放到背景上。
- `drawtext`：添加顶部标题。
- `[1:v]scale=72:-1,format=rgba[logo]`：缩小 logo 并保留透明通道。
- `-movflags +faststart`：把 MP4 元数据放到文件头，适合 Web 播放。

## 3.2 多机位视频混合

课件场景：主画面显示课件，右上角显示讲师摄像头，左下角显示板书。

```bash
ffmpeg -y \
  -i "materials/video/smptebars_1080p_30fps_8s.mp4" \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -i "materials/video/motion_boxes_720p_30fps_10s.mp4" \
  -t 5 \
  -filter_complex "[0:v]scale=960:540[courseware];[1:v]scale=240:135[teacher];[2:v]scale=240:135[blackboard];[courseware][teacher]overlay=W-w-20:20[temp1];[temp1][blackboard]overlay=20:H-h-20[final]" \
  -map "[final]" -map 1:a? \
  -c:v libx264 -crf 28 \
  -c:a aac -b:a 128k \
  "outputs/scripts/03-complex-media-practice/02-multicamera.mp4"
```

注释说明：

- 第 1 路作为主画面，缩放到 `960x540`。
- 第 2 路作为讲师画面，缩放到 `240x135` 并叠加到右上角。
- 第 3 路作为板书画面，缩放到 `240x135` 并叠加到左下角。
- `temp1` 是第一次叠加后的中间结果。

## 3.3 直播录制后期处理

课件目标：

1. 裁剪片头片尾。
2. 统一分辨率。
3. 添加水印。
4. 嵌入 SRT 字幕。
5. 音频响度标准化。

可运行命令：

```bash
ffmpeg -y \
  -ss 00:00:01 -to 00:00:07 \
  -i "materials/video/av_sync_test_720p_30fps_10s.mp4" \
  -loop 1 -i "outputs/scripts/assets/logo.png" \
  -t 6 \
  -filter_complex "[0:v]scale=960:540,setsar=1[video];[1:v]scale=96:-1,format=rgba[logo];[video][logo]overlay=20:20:shortest=1[video_with_logo];[video_with_logo]subtitles=outputs/scripts/assets/subtitle.srt:force_style='FontName=Arial,FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=1'[final_video];[0:a]loudnorm=I=-16:LRA=11:TP=-1.5[final_audio]" \
  -map "[final_video]" -map "[final_audio]" \
  -c:v libx264 -crf 28 \
  -c:a aac -b:a 128k \
  "outputs/scripts/03-complex-media-practice/03-live-postprocess.mp4"
```

注释说明：

- `-ss` / `-to` 放在输入前后都可以，本脚本放在输入前用于快速截取演示片段。
- `-t 6` 和 `overlay=...:shortest=1` 用于约束无限循环的 logo 图片输入，避免输出无法结束。
- `subtitles=...` 会把字幕烧录进视频画面。
- `force_style` 使用 ASS 样式语法控制字幕字体、字号、颜色和描边。
- `[0:a]loudnorm=...` 对原音频做响度标准化。

## 3.4 滤镜输出与编码器参数优化

像素格式统一：

```bash
-vf "scale=1280:-2,format=yuv420p"
```

帧率统一：

```bash
-r 30
```

GOP 长度：

```bash
-g 60
```

编码预设：

```bash
-preset medium
```

滤镜线程：

```bash
-filter_threads 4
```

组合示例：

```bash
ffmpeg -y -filter_threads 4 \
  -i "materials/video/testsrc2_720p_30fps_10s.mp4" \
  -t 5 \
  -vf "scale=1280:-2,format=yuv420p" \
  -r 30 \
  -c:v libx264 -preset medium -crf 28 -g 60 \
  -an \
  "outputs/scripts/03-complex-media-practice/04-encoder-optimized.mp4"
```

注释说明：

- `format=yuv420p` 保证编码器和播放器兼容性。
- `-r 30` 明确输出帧率，避免多输入场景下帧率漂移。
- `-g 60` 在 30fps 下表示约 2 秒一个 I 帧。
- `-filter_threads 4` 可用于计算密集型滤镜，实际线程数要结合 CPU 和任务并发量调整。
