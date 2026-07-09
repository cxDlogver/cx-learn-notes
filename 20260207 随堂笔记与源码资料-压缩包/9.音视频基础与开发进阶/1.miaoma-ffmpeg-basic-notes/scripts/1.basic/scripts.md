ffmpeg -i materials/video/alpha_overlay_source_512x512_30fps_6s.mov outputs/1-basic-1.mp4

<!-- 演示全局选项，直接覆盖，不要看日志 -->
ffmpeg -y -loglevel quiet -i materials/video/alpha_overlay_source_512x512_30fps_6s.mov outputs/1-basic-1.mp4

<!-- 演示输入选项，截取视频为例,0-1秒 -->
ffmpeg -y -ss 00:00:05 -i materials/video/alpha_overlay_source_512x512_30fps_6s.mov outputs/1-basic-2.mp4
