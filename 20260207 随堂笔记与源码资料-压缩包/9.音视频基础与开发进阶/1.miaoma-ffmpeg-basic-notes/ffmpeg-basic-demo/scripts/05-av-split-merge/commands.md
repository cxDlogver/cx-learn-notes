# 第 5 章 音视频分离与合并

本章用于演示 `-vn`、`-an`、`-map`、`-shortest` 和音视频替换。

## 5.1 保留原音频编码

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -vn -c:a copy "outputs/05-av-split-merge/extract_audio_copy.aac"
```

注释说明：

- `-vn`：禁用视频流。
- `-c:a copy`：直接复制音频流，不重新编码。

## 5.2 提取并转码为 MP3

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -vn -c:a libmp3lame -b:a 192k "outputs/05-av-split-merge/extract_audio_192k.mp3"
```

注释说明：

- `-c:a libmp3lame`：音频转码为 MP3。
- `-b:a 192k`：设置 MP3 音频码率。

## 5.3 去掉音频轨

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -an -c:v copy "outputs/05-av-split-merge/video_without_audio.mp4"
```

注释说明：

- `-an`：禁用音频流。
- `-c:v copy`：直接复制视频流，不重新编码。

## 5.4 替换视频中的音频

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" -c:v copy -c:a aac -b:a 128k -map 0:v:0 -map 1:a:0 -shortest "outputs/05-av-split-merge/replace_audio.mp4"
```

注释说明：

- 第一个输入 `0` 是视频素材。
- 第二个输入 `1` 是音频素材。
- `-map 0:v:0`：从第一个输入取第 1 条视频流。
- `-map 1:a:0`：从第二个输入取第 1 条音频流。
- `-shortest`：以较短的流为准结束输出。

## 5.5 视频静音后再合并新音频

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -i "materials/audio/beeps_every_second_10s.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 128k "outputs/05-av-split-merge/video_with_new_beeps.mp4"
```

注释说明：

- 即使原视频有音频，只要 `-map` 没有选择 `0:a`，原音频就不会进入输出。
- 该命令用蜂鸣音替换原音频，适合观察音视频同步。
