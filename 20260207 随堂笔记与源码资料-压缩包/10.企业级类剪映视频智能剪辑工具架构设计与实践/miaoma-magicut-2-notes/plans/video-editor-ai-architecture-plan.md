# miaoma-magicut 剪辑器与本地 AI 创作方案

## 摘要

- 当前目录是空工程，按绿地项目设计。
- MVP 以剪辑器优先；AI 编排默认基于 Node.js + LangChain.js，本地推理使用 Whisper 与 IndexTTS2；项目内部自用。
- 技术主线：Electron Forge + Vite + Vue3 + TypeScript 做桌面编辑器，Electron 主进程调度本地 FFmpeg 与 Node.js AI Orchestrator，Vue3 负责素材库、预览、时间线、AI 创作面板。
- 第一版目标：本地素材导入、多轨时间线、视频预览、音视频图片剪辑、字幕轨、TTS 配音轨、FFmpeg 导出。AI 创作先落到“脚本分段、配音、字幕、素材替换回填时间线”。

## 调研结论

- [OpenCut](https://github.com/OpenCut-app/OpenCut) 是最接近 CapCut 的开源参考，MIT，Web/桌面/移动方向，TypeScript + Rust/WASM，适合参考项目模型、时间线和渲染分层，不建议直接套用其桌面栈。
- [OpenVideo](https://github.com/openvideodev/openvideo) 与 [Vue Video Editor](https://github.com/openvideodev/vue-video-editor) 已有 Vue3、多轨、WebCodecs、PixiJS 思路，但 OpenVideo 许可显示 Unknown/AGPL 混合，内部可研究，不作为核心依赖。
- [LosslessCut](https://github.com/mifi/lossless-cut) 是 Electron + FFmpeg 的成熟参考，适合借鉴 ffprobe、缩略图、波形、无损切割、导出日志等工程能力；GPL-2.0，不复制代码。
- [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)、[Pixelle-Video](https://github.com/AIDC-AI/Pixelle-Video)、[NarratoAI](https://github.com/linyqh/NarratoAI) 适合参考 AI 成片流水线：主题/脚本 -> 分镜 -> TTS -> 素材 -> 字幕 -> 合成。Pixelle/Narrato 已覆盖 IndexTTS 类能力，但它们偏自动生成，不是交互式剪辑器。
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) 适合作为本地转写首选，MIT，跨平台，Apple Silicon/Metal 支持好。
- [IndexTTS2](https://github.com/index-tts/index-tts) 适合作为本地 TTS 主引擎，支持情感与时长控制方向，但其模型许可为 bilibili Model Use License，内部自用可推进，后续商用需重新审查。
- [LangChain.js](https://docs.langchain.com/oss/javascript/langchain/overview) 作为 AI 编排默认框架，适合快速接入模型、工具、结构化输出和可观测调试；复杂流程再升级到 [LangGraph.js](https://reference.langchain.com/javascript/modules/_langchain_langgraph.html)，长任务、多子 Agent、文件系统上下文和记忆能力再考虑 [Deep Agents JS](https://docs.langchain.com/oss/javascript/deepagents/overview)。
- FFmpeg 按官方 [license guidance](https://ffmpeg.org/legal.html) 处理，内部阶段可先用独立二进制调用；Electron 遵循官方 [security checklist](https://www.electronjs.org/docs/latest/tutorial/security)，开启 `contextIsolation`、禁用渲染进程 Node 直接访问。

## 核心实现

- 工程结构：`apps/desktop` 放 Electron/Vue3；`packages/shared` 放项目文档类型、时间线算法、FFmpeg 编排 DSL；`packages/ai-orchestrator` 放 Node.js AI 编排、LangChain.js 工具与结构化输出；`sidecars/model-runtime` 仅放 Whisper、IndexTTS2 等本地模型运行适配。
- 前端与 Node 依赖：Vue3、TypeScript、Pinia、Electron Forge、Vite、pixi.js、wavesurfer.js、zod、lucide-vue-next、LangChain.js、Vitest、Playwright；复杂 AI 工作流按需引入 LangGraph.js 或 Deep Agents JS。
- Electron 边界：Renderer 不直接访问文件系统；所有文件、FFmpeg、AI、项目保存通过 preload 暴露的 typed IPC API。
- 项目文件：每个项目使用 `project.miaoma.json`，旁边维护 `cache/thumbs`、`cache/waveforms`、`cache/proxies`、`cache/ai`。MVP 不引入数据库，降低复杂度。
- 核心数据类型：
  - `ProjectDocument`: 画布尺寸、fps、资源表、轨道、剪辑片段、字幕、AI 分镜、导出设置。
  - `Asset`: 本地路径、媒体类型、duration、width、height、fps、sampleRate、hash、proxyPath、thumbnailPath。
  - `Track`: `video | audio | image | text | subtitle | voiceover`，包含锁定、静音、可见性、层级。
  - `Clip`: `assetId`、`trackId`、`start`、`duration`、`sourceIn`、`sourceOut`、音量、变换、速度、淡入淡出。
  - `AiSegment`: 脚本文本、转写文本、TTS 音频、字幕、推荐素材、已绑定 clip。
- IPC 接口：`project.open/save`、`media.import/probe/generateThumbs/generateWaveform/createProxy`、`timeline.applyPatch`、`render.start/cancel/onProgress`、`ai.transcribe`、`ai.tts`、`ai.segmentScript`、`ai.planStoryboard`、`ai.matchAssets`。
- UI 布局按参考图落地：左侧脚本/分镜总览，中间预览，右侧 AI 工具栏与素材替换面板，底部多轨时间线。
- 时间线能力：导入、拖拽排序、裁剪、分割、吸附、缩放、撤销重做、轨道锁定/静音/隐藏、音频波形、视频缩略图、字幕片段编辑。
- 预览能力：PixiJS canvas 做画面合成预览，HTMLVideoElement/AudioContext 解码播放，时间线状态驱动当前帧；复杂效果以导出结果为准，MVP 不做完整特效系统。
- 导出能力：将 `ProjectDocument` 编译为 FFmpeg `filter_complex`，默认输出 H.264 + AAC MP4，统一 48kHz 音频，支持 1080p/720p、横屏/竖屏、进度解析、取消任务、失败日志。
- AI 编排：Node.js AI Orchestrator 是唯一决策层，基于 LangChain.js 定义工具、提示词、结构化输出和任务状态；Renderer 只发起请求并展示结果，不直接运行 Agent。
- 工作流升级规则：线性脚本分段、素材匹配、字幕修订默认用 LangChain.js；存在分支、循环、人工确认、长运行状态时升级 LangGraph.js；需要计划拆解、子 Agent、文件系统上下文、长期记忆时再引入 Deep Agents JS。
- 本地模型运行：Whisper 负责转写生成字幕轨；IndexTTS2 负责脚本分段配音并生成 voiceover track。若模型暂无稳定 Node.js 原生运行方式，可通过 `child_process`、本地 HTTP 或 Python 适配进程调用，但 Python 不承载 AI 决策逻辑。模型权重不随 app 打包，首次配置时选择本地模型目录。
- AI 创作一期：支持脚本粘贴/导入、自动分段、逐段 TTS、字幕生成、按分段替换本地素材。LLM 脚本创作与 ComfyUI 生图/生视频作为二期插件接口，不阻塞剪辑器 MVP。

## 测试与验收

- 单元测试：时间换算、轨道碰撞、clip trim/split、undo/redo、项目 JSON schema、FFmpeg filtergraph 生成。
- AI 编排测试：LangChain.js 工具输入输出、zod schema、结构化分镜、素材匹配、失败重试和超时取消。
- 集成测试：用小样本视频/音频/图片生成缩略图、波形、代理文件、字幕、TTS 音频，并验证输出存在与元信息正确。
- E2E 测试：导入素材、拖入多轨、分割裁剪、播放预览、生成字幕、生成 TTS、导出 MP4。
- 导出验收：`ffprobe` 校验分辨率、时长误差、音频流、字幕烧录或外挂策略；视觉 smoke test 抽帧确认非黑屏。
- AI 验收：Whisper 输出可编辑字幕；IndexTTS2 每段生成 WAV；TTS 失败时保留 job 错误并允许重试；模型未配置时 UI 明确提示。

## 假设与默认值

- 第一阶段只做本地文件剪辑，不做云端账号、协作、素材市场和商业发布合规。
- AI 决策与编排统一放在 Node.js；Python 只作为本地模型推理适配层，且可被其他运行时替换。
- 内部自用阶段可研究 GPL/AGPL 项目实现，但不复制其代码进入本项目。
- 默认支持 macOS 与 Windows，Linux 作为后续打包目标。
- 默认素材导入为“引用原文件”，用户可选“复制到项目目录”。
- 默认导出 MP4；MOV、WebM、GIF、透明通道、批量导出放到后续版本。
