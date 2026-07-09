# 第 3 章 转码与格式转换

本章用于演示编码器、封装、CRF、preset、码率、帧率和 MP4 网络播放优化。

## 3.1 转为 H.264 + AAC，网页兼容性优先

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "outputs/03-transcode/h264_aac_faststart.mp4"
```

注释说明：

- `-c:v libx264`：视频编码为 H.264。
- `-preset medium`：编码速度和压缩率的平衡档。
- `-crf 23`：恒定质量模式，数值越小质量越高、体积越大。
- `-pix_fmt yuv420p`：网页播放最常见像素格式。
- `-c:a aac -b:a 128k`：音频编码为 AAC，码率 128 kbps。
- `-movflags +faststart`：把 MP4 元数据放到文件头，支持边下载边播放。

## 3.2 转为 VP9 + Opus WebM

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus -b:a 128k "outputs/03-transcode/vp9_opus.webm"
```

注释说明：

- `-c:v libvpx-vp9`：视频编码为 VP9。
- `-crf 30 -b:v 0`：VP9 常用恒定质量写法。
- `-c:a libopus`：音频编码为 Opus。
- `.webm`：WebM 封装常搭配 VP9 + Opus。

## 3.3 只转换封装，不重新编码

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -c copy "outputs/03-transcode/remux_copy.mov"
```

注释说明：

- `-c copy`：直接复制音视频流，不重新编码。
- 速度快，画质不变。
- 不能改变分辨率、码率、编码格式，也不能使用滤镜。

## 3.4 较高质量 H.264，CRF 18

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -c:v libx264 -crf 18 -pix_fmt yuv420p "outputs/03-transcode/crf_18_high_quality.mp4"
```

注释说明：

- CRF 数值越小质量越高、体积越大。
- `18` 接近肉眼高质量。

## 3.5 较小体积 H.264，CRF 30

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -c:v libx264 -crf 30 -pix_fmt yuv420p "outputs/03-transcode/crf_30_small_size.mp4"
```

注释说明：

- CRF `28` 到 `30` 适合网络预览或体积敏感场景。
- 可以与 CRF 18 输出对比文件大小和画质。

## 3.6 最快预设 ultrafast

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p "outputs/03-transcode/preset_ultrafast.mp4"
```

注释说明：

- `-preset` 影响编码耗时和压缩率。
- `ultrafast` 编码最快，但文件通常更大。

## 3.7 较慢但压缩率更好的预设 slow

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p "outputs/03-transcode/preset_slow.mp4"
```

注释说明：

- 同样 CRF 下，`slow` 通常比 `ultrafast` 文件更小，但编码更慢。

## 3.8 MP4 faststart

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -c copy -movflags +faststart "outputs/03-transcode/faststart_copy.mp4"
```

注释说明：

- `-movflags +faststart`：移动 MP4 的 `moov` 元数据到文件头。
- 搭配 `-c copy` 时处理很快，适合优化已有 MP4。

## 3.9 固定视频码率和音频码率

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -c:v libx264 -b:v 2M -c:a aac -b:a 128k -pix_fmt yuv420p "outputs/03-transcode/bitrate_2m_audio_128k.mp4"
```

注释说明：

- `-b:v 2M`：视频平均码率约 2 Mbps。
- `-b:a 128k`：音频码率 128 kbps。
- 固定码率常用于直播、带宽预算明确的场景。

## 3.10 强制输出为 24 fps

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -r 24 -c:v libx264 -pix_fmt yuv420p "outputs/03-transcode/output_24fps.mp4"
```

注释说明：

- `-r 24` 放在输出侧，表示目标输出帧率。
- 输入素材是 30 fps，输出时会发生帧率转换。
