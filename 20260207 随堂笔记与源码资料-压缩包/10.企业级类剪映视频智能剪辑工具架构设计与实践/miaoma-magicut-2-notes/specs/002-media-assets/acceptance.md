# 002 Media Assets Acceptance

## 自动化验证

- Given：源码已生成。
- When：运行 `node scripts/validate-foundation.mjs`。
- Then：媒体服务、IPC、preload、共享类型文件存在。

## 人工验证

- Given：依赖与 FFmpeg 已安装。
- When：运行 `npm run dev`，点击导入素材并选择视频、音频、图片。
- Then：UI 显示素材类型、时长、分辨率，视频生成缩略图，音频生成波形图。

