# 第 8 章 高级组合与实战模板

本章用于演示音视频同步偏移、变速、碎片 MP4 和网络流模板。

## 8.1 让音频延后 0.5 秒

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -itsoffset 0.5 -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest "outputs/08-advanced/audio_delay_0_5s.mp4"
```

注释说明：

- 第一个输入提供视频。
- `-itsoffset 0.5` 作用于紧随其后的第二个输入。
- 第二个输入只取音频：`-map 1:a:0`。

## 8.2 视频 2 倍速，音频不处理

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "setpts=0.5*PTS" -an -c:v libx264 -pix_fmt yuv420p "outputs/08-advanced/video_2x_speed_no_audio.mp4"
```

注释说明：

- `setpts=0.5*PTS`：视频时间戳减半，播放速度变为 2 倍。
- `-an`：不输出音频。

## 8.3 音频 1.5 倍速

```text
ffmpeg -y -hide_banner -i "materials/audio/beeps_every_second_10s.wav" -af "atempo=1.5" "outputs/08-advanced/audio_1_5x_speed.wav"
```

注释说明：

- `atempo=1.5`：音频播放速度变为 1.5 倍，同时尽量保持音高。
- `atempo` 单个滤镜常用范围是 `0.5` 到 `2.0`。

## 8.4 音视频同时 2 倍速

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]" -map "[v]" -map "[a]" -c:v libx264 -c:a aac -pix_fmt yuv420p "outputs/08-advanced/av_2x_speed.mp4"
```

注释说明：

- `[0:v]setpts=0.5*PTS[v]`：视频 2 倍速，输出标签为 `[v]`。
- `[0:a]atempo=2.0[a]`：音频 2 倍速，输出标签为 `[a]`。
- `-map "[v]" -map "[a]"`：输出滤镜处理后的音视频流。

## 8.5 生成适合流式播放的 fragmented MP4

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -c copy -movflags frag_keyframe+empty_moov "outputs/08-advanced/fragmented_mp4.mp4"
```

注释说明：

- `frag_keyframe`：按关键帧切分 MP4 fragment。
- `empty_moov`：输出开始就写入空的 moov，适合流式输出。

## 8.6 保存 RTMP 直播流模板

以下命令是模板，示例地址不可直接执行：

```text
ffmpeg -y -hide_banner -i "rtmp://example.com/live/stream" -c copy "outputs/08-advanced/live_record.mp4"
```

注释说明：

- `-i "rtmp://..."`：输入可以是网络流地址。
- `-c copy`：直播录制时优先直拷，降低 CPU 开销。
- 实际课堂演示需要替换为可访问的合法流地址。
