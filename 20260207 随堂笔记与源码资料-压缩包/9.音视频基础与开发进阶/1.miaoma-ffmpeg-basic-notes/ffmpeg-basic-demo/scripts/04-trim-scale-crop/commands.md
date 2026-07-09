# 第 4 章 视频截取、缩放、裁剪与截图

本章用于演示 `-ss`、`-t`、`scale`、`crop`、截图和批量抽帧。

## 4.1 关键帧快速截取

```text
ffmpeg -y -hide_banner -ss 00:00:02 -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -t 3 -c copy "outputs/04-trim-scale-crop/cut_fast_keyframe.mp4"
```

注释说明：

- `-ss` 放在 `-i` 前，定位速度快。
- `-c copy` 不重新编码。
- 起点精度受关键帧影响。

## 4.2 重编码精确截取

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -ss 00:00:02 -t 3 -c:v libx264 -c:a aac -pix_fmt yuv420p "outputs/04-trim-scale-crop/cut_precise_reencode.mp4"
```

注释说明：

- `-ss` 放在 `-i` 后，先解码再定位。
- 精度更高，但速度更慢。
- 重新编码时可以同时改变编码参数或添加滤镜。

## 4.3 两段式 `-ss`

```text
ffmpeg -y -hide_banner -ss 00:00:02 -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -ss 0 -t 3 -c copy "outputs/04-trim-scale-crop/cut_best_effort.mp4"
```

注释说明：

- 第一个 `-ss` 快速定位。
- 第二个 `-ss 0` 从定位后的时间点继续处理。
- 搭配 `-c copy` 时仍会受到关键帧约束。

## 4.4 按宽度等比缩放

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "scale=640:-2" -c:v libx264 -pix_fmt yuv420p "outputs/04-trim-scale-crop/scale_width_640.mp4"
```

注释说明：

- `scale=640:-2`：宽度固定为 640，高度按比例计算并取偶数。
- `-2` 比 `-1` 更适合视频编码场景。

## 4.5 按高度等比缩放到 720p

```text
ffmpeg -y -hide_banner -i "materials/video/portrait_testsrc2_1080x1920_30fps_8s.mp4" -vf "scale=-2:720" -c:v libx264 -pix_fmt yuv420p "outputs/04-trim-scale-crop/scale_height_720.mp4"
```

注释说明：

- `scale=-2:720`：高度固定为 720，宽度按比例计算并取偶数。
- 适合演示竖屏素材缩放。

## 4.6 横屏视频裁剪为中央正方形

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "crop=in_h:in_h" -c:v libx264 -pix_fmt yuv420p "outputs/04-trim-scale-crop/crop_center_square.mp4"
```

注释说明：

- `crop=width:height:x:y`：裁剪宽度、高度、起点 x、起点 y。
- `crop=in_h:in_h`：使用输入高度作为裁剪宽高。
- 未指定 `x:y` 时默认居中裁剪。

## 4.7 明确指定裁剪区域

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "crop=640:360:320:180" -c:v libx264 -pix_fmt yuv420p "outputs/04-trim-scale-crop/crop_640x360_xy.mp4"
```

注释说明：

- 从坐标 `(320, 180)` 开始，裁剪 640 x 360 区域。
- 画面坐标系左上角是 `(0, 0)`。

## 4.8 第 2 秒提取一张 JPG

```text
ffmpeg -y -hide_banner -ss 00:00:02 -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vframes 1 -q:v 2 "outputs/04-trim-scale-crop/cover_at_2s.jpg"
```

注释说明：

- `-vframes 1`：只输出 1 帧。
- `-q:v 2`：JPEG 质量，数值越小质量越高。

## 4.9 每秒抽 1 帧

先创建抽帧输出目录：

```text
mkdir "outputs/04-trim-scale-crop/frames"
```

Windows PowerShell 如果目录已存在，可使用：

```powershell
New-Item -ItemType Directory -Force -Path "outputs/04-trim-scale-crop/frames"
```

抽帧命令：

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -r 1 "outputs/04-trim-scale-crop/frames/frame_%04d.jpg"
```

注释说明：

- `-r 1` 放在输出侧，表示每秒输出 1 张图。
- `frame_%04d.jpg` 表示按 4 位数字编号。
