# 第 7 章 常用音频处理

本章用于演示 `-af`、音量、采样率、声道、淡入淡出、响度标准化和频率滤波。

## 7.1 音量放大到 1.5 倍

```text
ffmpeg -y -hide_banner -i "materials/audio/volume_steps_1khz_9s.wav" -af "volume=1.5" "outputs/07-audio-filters/volume_up_1_5x.wav"
```

注释说明：

- `-af`：指定音频滤镜。
- `volume=1.5`：音量乘以 1.5。
- 放大音量可能导致削波失真。

## 7.2 音量降低到 50%

```text
ffmpeg -y -hide_banner -i "materials/audio/volume_steps_1khz_9s.wav" -af "volume=0.5" "outputs/07-audio-filters/volume_down_0_5x.wav"
```

注释说明：

- `volume=0.5`：音量减半。

## 7.3 转为 44.1 kHz、单声道

```text
ffmpeg -y -hide_banner -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" -ar 44100 -ac 1 "outputs/07-audio-filters/resample_mono_44100.wav"
```

注释说明：

- `-ar 44100`：输出采样率为 44.1 kHz。
- `-ac 1`：输出单声道。

## 7.4 只保留左声道

```text
ffmpeg -y -hide_banner -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" -af "pan=mono|c0=FL" "outputs/07-audio-filters/left_channel_only.wav"
```

注释说明：

- `pan=mono|c0=FL`：输出单声道，内容来自前左声道。

## 7.5 只保留右声道

```text
ffmpeg -y -hide_banner -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" -af "pan=mono|c0=FR" "outputs/07-audio-filters/right_channel_only.wav"
```

注释说明：

- `pan=mono|c0=FR`：输出单声道，内容来自前右声道。

## 7.6 拆分左右声道为两个文件

```text
ffmpeg -y -hide_banner -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" -filter_complex "channelsplit=channel_layout=stereo[left][right]" -map "[left]" "outputs/07-audio-filters/split_left.wav" -map "[right]" "outputs/07-audio-filters/split_right.wav"
```

注释说明：

- `channelsplit=channel_layout=stereo`：拆分立体声。
- `[left]`、`[right]`：滤镜输出标签。
- 两个 `-map` 分别输出左右声道。

## 7.7 音频淡入淡出

```text
ffmpeg -y -hide_banner -i "materials/audio/tone_440hz_mono_5s.wav" -af "afade=t=in:st=0:d=1,afade=t=out:st=4:d=1" "outputs/07-audio-filters/fade_in_out.wav"
```

注释说明：

- `afade=t=in:st=0:d=1`：从 0 秒开始，1 秒淡入。
- `afade=t=out:st=4:d=1`：从 4 秒开始，1 秒淡出。

## 7.8 使用 loudnorm 标准化响度

```text
ffmpeg -y -hide_banner -i "materials/audio/volume_steps_1khz_9s.wav" -af "loudnorm=I=-16:TP=-1.5:LRA=11" "outputs/07-audio-filters/loudnorm.wav"
```

注释说明：

- `loudnorm`：响度标准化滤镜。
- `I=-16`：目标综合响度为 -16 LUFS。
- `TP=-1.5`：true peak 上限为 -1.5 dBTP。

## 7.9 低通滤波

```text
ffmpeg -y -hide_banner -i "materials/audio/sweep_20hz_to_20khz_10s.wav" -af "lowpass=f=1000" "outputs/07-audio-filters/lowpass_1000hz.wav"
```

注释说明：

- `lowpass=f=1000`：保留 1000 Hz 以下频率，削弱高频。

## 7.10 高通滤波

```text
ffmpeg -y -hide_banner -i "materials/audio/sweep_20hz_to_20khz_10s.wav" -af "highpass=f=1000" "outputs/07-audio-filters/highpass_1000hz.wav"
```

注释说明：

- `highpass=f=1000`：保留 1000 Hz 以上频率，削弱低频。
