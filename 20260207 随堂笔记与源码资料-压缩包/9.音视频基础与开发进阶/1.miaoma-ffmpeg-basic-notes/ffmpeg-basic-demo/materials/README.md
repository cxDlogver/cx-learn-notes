# FFmpeg 教学测试素材

这些素材均由 FFmpeg 内置的 `lavfi` 源生成，不依赖外部版权素材，适合课堂演示转码、封装、滤镜、裁剪、缩放、音频处理和音视频同步。

## Audio

| 文件 | 用途 |
| --- | --- |
| `audio/tone_440hz_mono_5s.wav` | 单声道 PCM，适合讲采样率、声道、WAV、基础转码 |
| `audio/tone_440hz_mono_5s.mp3` | MP3 有损编码，适合对比编码器、码率、封装 |
| `audio/stereo_lr_440hz_880hz_8s.wav` | 左声道 440 Hz、右声道 880 Hz，适合讲 `pan`、`channelsplit`、`amerge` |
| `audio/stereo_lr_440hz_880hz_8s.opus` | Opus 编码，适合讲现代音频编码和码率 |
| `audio/sweep_20hz_to_20khz_10s.wav` | 20 Hz 到 20 kHz 扫频，适合讲滤波器、频谱、重采样 |
| `audio/pink_noise_stereo_10s.wav` | 粉红噪声，适合讲降噪、均衡器、音量分析 |
| `audio/silence_stereo_5s.wav` | 静音素材，适合讲拼接、补静音、`anullsrc` |
| `audio/volume_steps_1khz_9s.wav` | 分段音量，适合讲 `volume`、`loudnorm`、`dynaudnorm` |
| `audio/beeps_every_second_10s.wav` | 每秒蜂鸣，适合讲裁剪、同步、波形观察 |

## Video

| 文件 | 用途 |
| --- | --- |
| `video/testsrc2_720p_30fps_10s.mp4` | 标准 720p 测试图，适合讲 `scale`、`crop`、`fps`、转码 |
| `video/smptebars_1080p_30fps_8s.mp4` | 1080p 色条，适合讲色彩、格式、码率对比 |
| `video/portrait_testsrc2_1080x1920_30fps_8s.mp4` | 竖屏视频，适合讲横竖屏转换、`transpose`、`pad` |
| `video/square_timer_grid_1080x1080_30fps_8s.mp4` | 方屏网格和时间码，适合讲 `drawtext`、`drawgrid`、裁剪 |
| `video/motion_boxes_720p_30fps_10s.mp4` | 运动色块，适合讲 `overlay`、运动、帧率和压缩效果 |
| `video/green_screen_boxes_720p_30fps_6s.mp4` | 绿幕背景，适合讲 `chromakey`、`colorkey` |
| `video/av_sync_test_720p_30fps_10s.mp4` | 带每秒蜂鸣音的视频，适合讲音视频同步、`-map`、`-shortest` |
| `video/lowres_426x240_low_bitrate_10s.mp4` | 低分辨率低码率，适合讲放大、降噪、码率质量对比 |
| `video/alpha_overlay_source_512x512_30fps_6s.mov` | 带透明通道的 ProRes MOV，适合讲透明叠加和 alpha 通道 |

## 快速检查

```bash
ffprobe -hide_banner "materials/video/av_sync_test_720p_30fps_10s.mp4"
ffprobe -hide_banner "materials/audio/stereo_lr_440hz_880hz_8s.wav"
```

## 推荐演示方向

- 基础信息：`ffprobe`、`-show_streams`、`-show_format`
- 转码封装：WAV 到 MP3/Opus，MP4 到 MOV/WebM
- 视频滤镜：`scale`、`crop`、`pad`、`fps`、`drawtext`、`overlay`、`chromakey`
- 音频滤镜：`volume`、`pan`、`channelsplit`、`aresample`、`afade`、`loudnorm`
- 同步和映射：`-map`、`-shortest`、`-itsoffset`、`asetpts`、`setpts`
