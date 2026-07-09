# FFmpeg 章节命令卡片

本目录从 `ffmpeg-command-examples.md` 中提取每章指令，按章节拆分为独立文件夹。Markdown 命令卡片保留为主讲义，同时为 macOS / Linux 补充了每个实例对应的 `.sh` 辅助脚本。

## 目录说明

| 目录 | 内容 |
| --- | --- |
| `01-basic/commands.md` | FFmpeg 命令基本格式 |
| `02-probe/commands.md` | 媒体信息查询 |
| `03-transcode/commands.md` | 转码与格式转换 |
| `04-trim-scale-crop/commands.md` | 截取、缩放、裁剪与截图 |
| `05-av-split-merge/commands.md` | 音视频分离与合并 |
| `06-video-filters/commands.md` | 常用视频滤镜 |
| `07-audio-filters/commands.md` | 常用音频处理 |
| `08-advanced/commands.md` | 高级组合与实战模板 |
| `appendix/templates.md` | 附录最小模板 |

## 课堂使用方式

1. 让学员在终端中进入项目根目录。
2. 先创建输出目录。
3. 打开对应章节的 `commands.md`，逐条复制命令执行。

也可以直接运行对应实例脚本：

```bash
sh "scripts/01-basic/01-basic-convert.sh"
sh "scripts/06-video-filters/03-image-watermark-bottom-right.sh"
```

第 8.6 节是网络流录制模板，需要传入真实可访问的 RTMP 地址：

```bash
sh "scripts/08-advanced/06-live-record-template.sh" "rtmp://your-server/live/stream"
```

### Windows PowerShell 创建输出目录

```powershell
New-Item -ItemType Directory -Force -Path "outputs/01-basic","outputs/02-probe","outputs/03-transcode","outputs/04-trim-scale-crop","outputs/05-av-split-merge","outputs/06-video-filters","outputs/07-audio-filters","outputs/08-advanced"
```

### macOS / Linux 创建输出目录

```bash
mkdir -p "outputs/01-basic" "outputs/02-probe" "outputs/03-transcode" "outputs/04-trim-scale-crop" "outputs/05-av-split-merge" "outputs/06-video-filters" "outputs/07-audio-filters" "outputs/08-advanced"
```

## 注意事项

- `materials` 目录只作为输入素材使用。
- 命令默认使用 `-y` 覆盖同名输出，便于重复课堂演示。
- 每条 FFmpeg 命令都写成单行，避免 Windows 和 Unix 续行符差异。
- 路径统一使用双引号和正斜杠，例如 `"materials/video/testsrc2_720p_30fps_10s.mp4"`。
- 网络流相关命令保留为注释模板，避免误执行不可用示例地址。
- `.sh` 脚本使用 `sh "脚本路径"` 运行，无需额外修改执行权限。
