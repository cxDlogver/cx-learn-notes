# 第 6 章 常用视频滤镜

本章用于演示 `-vf`、`-filter_complex`、文字、水印、透明叠加、旋转、翻转、绿幕和画布填充。

## 6.1 添加时间文字和网格

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "drawgrid=width=160:height=90:color=white@0.35:thickness=1,drawtext=text='%{pts\:hms}':x=40:y=40:fontsize=48:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=12" -c:v libx264 -pix_fmt yuv420p "outputs/06-video-filters/drawtext_drawgrid.mp4"
```

注释说明：

- `drawgrid`：绘制网格，适合讲画面坐标。
- `drawtext`：绘制文字。
- `%{pts\:hms}`：显示当前时间戳。
- `box=1`：给文字添加背景框。

## 6.2 生成透明 PNG 水印

```text
ffmpeg -y -hide_banner -f lavfi -i "color=c=black@0.0:size=320x120" -frames:v 1 -vf "format=rgba,drawtext=text='FFmpeg Demo':x=24:y=38:fontsize=38:fontcolor=white:box=1:boxcolor=red@0.75:boxborderw=12" "outputs/06-video-filters/demo_logo.png"
```

注释说明：

- `-f lavfi`：使用 FFmpeg 内置滤镜源。
- `color=c=black@0.0`：生成透明背景。
- `format=rgba`：保留 alpha 透明通道。
- `-frames:v 1`：只输出一张图片。

## 6.3 PNG 水印叠加到右下角

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -i "outputs/06-video-filters/demo_logo.png" -filter_complex "overlay=W-w-24:H-h-24" -c:v libx264 -pix_fmt yuv420p "outputs/06-video-filters/image_watermark_bottom_right.mp4"
```

注释说明：

- 第一个输入是主视频，第二个输入是水印图片。
- `overlay=W-w-24:H-h-24`：右下角叠加，距离右边和底部各 24 像素。

## 6.4 叠加 ProRes 透明通道素材

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -i "materials/video/alpha_overlay_source_512x512_30fps_6s.mov" -filter_complex "[0:v][1:v]overlay=x=40:y=120:format=auto" -c:v libx264 -pix_fmt yuv420p -shortest "outputs/06-video-filters/alpha_overlay.mp4"
```

注释说明：

- 第二个输入是带 alpha 通道的视频。
- `overlay=x=40:y=120`：把透明视频放到主视频指定位置。
- `format=auto`：自动处理透明像素格式。

## 6.5 顺时针旋转 90 度

```text
ffmpeg -y -hide_banner -i "materials/video/portrait_testsrc2_1080x1920_30fps_8s.mp4" -vf "transpose=1" -c:v libx264 -pix_fmt yuv420p "outputs/06-video-filters/rotate_clockwise_90.mp4"
```

注释说明：

- `transpose=1`：顺时针旋转 90 度。
- 常见取值：`0`、`1`、`2`、`3`。

## 6.6 水平镜像

```text
ffmpeg -y -hide_banner -i "materials/video/motion_boxes_720p_30fps_10s.mp4" -vf "hflip" -c:v libx264 -pix_fmt yuv420p "outputs/06-video-filters/hflip.mp4"
```

注释说明：

- `hflip`：左右镜像。

## 6.7 垂直翻转

```text
ffmpeg -y -hide_banner -i "materials/video/motion_boxes_720p_30fps_10s.mp4" -vf "vflip" -c:v libx264 -pix_fmt yuv420p "outputs/06-video-filters/vflip.mp4"
```

注释说明：

- `vflip`：上下翻转。

## 6.8 使用 chromakey 去绿色背景

```text
ffmpeg -y -hide_banner -i "materials/video/green_screen_boxes_720p_30fps_6s.mp4" -i "materials/video/testsrc2_720p_30fps_10s.mp4" -filter_complex "[0:v]chromakey=0x00ff00:0.20:0.08[fg];[1:v][fg]overlay=0:0:format=auto" -c:v libx264 -pix_fmt yuv420p -shortest "outputs/06-video-filters/chromakey_overlay.mp4"
```

注释说明：

- 第一个输入是绿幕前景，第二个输入是背景视频。
- `chromakey=0x00ff00:0.20:0.08`：将接近绿色的像素变透明。
- `[fg]`：滤镜输出标签，供后续 `overlay` 使用。

## 6.9 竖屏转横屏画布

```text
ffmpeg -y -hide_banner -i "materials/video/portrait_testsrc2_1080x1920_30fps_8s.mp4" -vf "scale=-2:720,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -pix_fmt yuv420p "outputs/06-video-filters/portrait_to_landscape_pad.mp4"
```

注释说明：

- `scale=-2:720`：先把竖屏视频高度缩放到 720。
- `pad=1280:720:(ow-iw)/2:(oh-ih)/2:black`：放入 1280 x 720 横屏黑色画布并居中。
