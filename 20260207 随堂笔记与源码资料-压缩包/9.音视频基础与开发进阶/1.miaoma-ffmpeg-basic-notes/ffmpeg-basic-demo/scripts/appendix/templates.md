# 附录 可直接复用的最小模板

本文件保留课堂上最常复用的最小命令模板。

## A.1 Web MP4 推荐模板

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "outputs/03-transcode/web_ready.mp4"
```

## A.2 快速剪辑模板

```text
ffmpeg -y -hide_banner -ss 00:00:02 -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -t 3 -c copy "outputs/04-trim-scale-crop/quick_cut.mp4"
```

## A.3 精确剪辑模板

```text
ffmpeg -y -hide_banner -i "materials/video/av_sync_test_720p_30fps_10s.mp4" -ss 00:00:02 -t 3 -c:v libx264 -c:a aac -pix_fmt yuv420p "outputs/04-trim-scale-crop/precise_cut.mp4"
```

## A.4 替换音频模板

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -i "materials/audio/stereo_lr_440hz_880hz_8s.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest "outputs/05-av-split-merge/replace_audio_template.mp4"
```

## A.5 滤镜链模板

```text
ffmpeg -y -hide_banner -i "materials/video/testsrc2_720p_30fps_10s.mp4" -vf "scale=640:-2,crop=640:360,drawtext=text='Demo':x=20:y=20:fontsize=36:fontcolor=white" -c:v libx264 -pix_fmt yuv420p "outputs/06-video-filters/filter_chain_template.mp4"
```
