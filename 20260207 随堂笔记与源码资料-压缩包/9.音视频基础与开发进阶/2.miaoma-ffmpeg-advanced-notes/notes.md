# 核心滤镜系统与复杂媒体处理实战

## 课程导入与滤镜系统核心价值

滤镜系统用来处理复杂音视频合成与输出

- 内容生产自动化：短视频批量裁剪、加水印、加字幕、统一格式输出
- 直播媒体处理：实时画面拼接、多机位导播、礼物特效叠加、弹幕渲染
- 在线教育：讲师摄像头与课件画面合成、多讲师画面布局、板书叠加
- 广电与安防：视频画面增强、去噪、智能分析预处理、多画面监控墙
- 媒体资产管理：批量转码、缩略图生成、关键帧提取、内容审核预处理

## FFmpeg滤镜系统核心原理与Filtergraph语法

-filter_complex "[0:v]scale=1920:1080[bg];[1:v]scale=320:180[pip];[bg][pip]overlay=10:10"

## 核心滤镜分类详解

### 视频基础变换和滤镜使用

1246x512

ffmpeg -i materials/video/course.mp4 -vf "scale=600:-2" outputs/7.mp4
ffmpeg -i materials/video/course.mp4 -vf "crop=300:300" outputs/8.mp4
ffmpeg -i materials/video/course.mp4 -vf "transpose=1" outputs/9.mp4
ffmpeg -i materials/video/course.mp4 -vf "hflip" outputs/10.mp4
ffmpeg -i materials/video/course.mp4 -vf "pad=1270:536:(ow-iw)/2:(oh-ih)/2:pink" outputs/11.mp4

ffmpeg -i materials/video/course.mp4 -vf "colorbalance=rs=0.1:gs=0.1:bs=-0.1" outputs/12.mp4
ffmpeg -i materials/video/course.mp4 -vf "eq=brightness=-0.1:contrast=0:saturation=0" outputs/13.mp4
ffmpeg -i materials/video/course.mp4 -vf "boxblur=5:1" outputs/14.mp4
ffmpeg -i materials/video/course.mp4 -vf "gblur=sigma=5" outputs/15.mp4

### 叠加类滤镜

ffmpeg -i materials/video/course.mp4 -i materials/video/av_sync_test_720p_30fps_10s.mp4 -filter_complex "[0:v]scale=1920:1080[bg];[1:v]scale=640:-2[pip];[bg][pip]overlay=W-w-10:10[out]" -map "[out]" outputs/16.mp4

ffmpeg -i materials/video/course.mp4 -i materials/video/av_sync_test_720p_30fps_10s.mp4 -filter_complex "[0:v]scale=1920:1080[bg];[1:v]scale=640:-2[pip];[bg][pip]overlay=W-w-10:10:enable='between(t,2,5)'[out]" -map "[out]" outputs/17.mp4

ffmpeg -i materials/video/course.mp4 -i materials/video/av_sync_test_720p_30fps_10s.mp4 -filter_complex "[0:v]scale=1920:1080[bg];[1:v]scale=640:-2,format=yuva420p,fade=t=in:st=0:d=3:alpha=1,fade=t=out:st=17:d=3:alpha=1[pip];[bg][pip]overlay=W-w-10:10:enable='between(t,2,5)'[out]" -map "[out]" outputs/18.mp4

ffmpeg -i materials/video/course.mp4 -i materials/video/av_sync_test_720p_30fps_10s.mp4 -filter_complex "[0:v]scale=1920:1080,drawtext=text='这是测试文字':fontfile=/Users/heyi/Downloads/miaoma-ffmpeg-advanced-notes/materials/fonts/AlimamaShuHeiTi-Bold.ttf:fontsize=36:fontcolor=black:x=(W-tw)/2:y=H-th-200" outputs/19.mp4

## 多流拼接类滤镜

ffmpeg -i materials/video/course.mp4 -i materials/video/course.mp4 -filter_complex "[0:v][1:v]hstack=inputs=2[out]" -map "[out]" outputs/20.mp4

ffmpeg -i materials/video/course.mp4 -i materials/video/course.mp4 -filter_complex "[0:v][1:v]vstack=inputs=2[out]" -map "[out]" outputs/21.mp4

<!-- ffmpeg -i materials/video/course.mp4 -i materials/video/course.mp4 -i materials/video/course.mp4 -i materials/video/course.mp4 -i materials/video/course.mp4 -i materials/video/course.mp4 -i materials/video/course.mp4 -i materials/video/course.mp4 -i materials/video/course.mp4  -filter_complex "
[0:v]scale=320:180[v0];[1:v]scale=320:180[v1];[2:v]scale=320:180[v2];[3:v]scale=320:180[v3];[4:v]scale=320:180[v4];[5:v]scale=320:180[v5];[6:v]scale=320:180[v6];[7:v]scale=320:180[v7];[8:v]scale=320:180[v8];[v0][v1][v2][v3][v4][v5][v6][v7][v8]xstack=inputs=9:xstack=inputs=9:grid=3x3[out]" -map "[out]" -c:v libx264 -crf 28 outputs/22.mp4 -->

ffmpeg -i materials/video/av_sync_test_720p_30fps_10s.mp4 -c:a copy materials/audio/av_sync_test_720p_30fps_10s.aac

ffmpeg -i materials/video/av_sync_test_720p_30fps_10s.mp4 -c:a libmp3lame materials/audio/av_sync_test_720p_30fps_10s.mp3

## 音频路径

加速

ffmpeg -i materials/audio/av_sync_test_720p_30fps_10s.mp3 -filter_complex "atempo=2" outputs/22.mp3

<!-- ffmpeg -i input_16x9.mp4 -i logo.png -filter_complex "[0:v]scale=1080:1920,setsar=1,boxblur=20:5[bg];[0:v]scale=1080:-1,setsar=1[main];[bg][main]overlay=(W-w)/2:(H-h)/2[video];[video]drawtext=text='这是视频标题':fontfile=simhei.ttf:fontsize=48:fontcolor=white:x=(W-tw)/2:y=100[video_with_title];" -map "[final_video]" -map 0:a
-c:v libx264 -crf 28 -preset medium
-c:a aac -b:a 128k
-movflags +faststart
output_shortvideo.mp4 -->

ffmpeg -i materials/video/test.mp4 -i materials/images/logo.png -filter_complex "[0:v]scale=1080:1920,setsar=1,boxblur=20:5[bg];[0:v]scale=1080:-1,setsar=1[main];[bg][main]overlay=(W-w)/2:(H-h)/2[video];

[video]drawtext=text='妙码学院-合一':fontfile=/Users/heyi/Downloads/miaoma-ffmpeg-advanced-notes/materials/fonts/AlimamaShuHeiTi-Bold.ttf:fontsize=48:fontcolor=black:x=(W-tw)/2:y=100[video_with_title];

[video_with_title][1:v]overlay=W-w-30:30[video_with_logo];

[video_with_logo]subtitles=/Users/heyi/Downloads/miaoma-ffmpeg-advanced-notes/materials/video/test.srt:force_style='FontName=AlimamaShuHeiTi,FontSize=16,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=1'[final_video];

" -map "[final_video]" outputs/output_shortvideo.mp4

补充提示：
关于字幕（音频转文本）【剪映字幕生成、openAI whisper、妙幕 Smartsub】
文本转语音（text2speech/tts）【index-tts2、f5-tts、豆包、cosyVoice】


# 拓展

- ffmpeg 属于后台音视频处理能力
- 网页里面直接处理音视频
    1. ffmpeg-wasm
    2. WebCodcs，https://github.com/WebAV-Tech/WebAV