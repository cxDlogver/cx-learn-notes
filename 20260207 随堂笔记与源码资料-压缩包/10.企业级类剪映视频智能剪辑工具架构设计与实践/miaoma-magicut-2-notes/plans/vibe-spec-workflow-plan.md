# Vibe Coding + Spec-Kit-Like 标准工作流程

## 摘要

- 采用“项目内仿 spec-kit”模式，不强依赖官方 CLI，在仓库内建立可被 AI Agent 反复读取的规范体系。
- 工作流固定为：`Constitution -> Spec -> Clarify -> Design -> Plan -> Tasks -> Implement -> Verify -> Review -> Handoff`。
- UI 设计基线采用 shadcn-vue，默认暗色专业剪辑台风格，`neutral/zinc` 语义 token、CSS variables、Lucide 图标。
- 该流程服务 `miaoma-magicut`：Electron + Vue3 + FFmpeg + LangChain.js + Whisper + IndexTTS2 的类剪映智能剪辑器。

## 目录与工件

新增规范目录：

- `.vibe/constitution.md`：项目工程宪法，写 SOLID、KISS、DRY、YAGNI、AI 协作、危险操作规则。
- `.vibe/templates/`：沉淀 `spec.md`、`plan.md`、`tasks.md`、`acceptance.md`、`design.md`、`review.md` 模板。
- `specs/000-product-foundation/`：全局产品定位、架构约束、视觉设计原则。
- `specs/001-*`：每个功能一个独立规格目录，例如 `001-desktop-shell`、`002-media-assets`、`003-timeline-core`。

每个 feature 目录固定包含：

- `spec.md`：只写用户目标、场景、范围、非功能要求，不写实现细节。
- `design.md`：shadcn-vue 组件映射、布局、状态、交互、视觉 token。
- `plan.md`：技术方案、模块边界、数据流、IPC/API、风险。
- `tasks.md`：可直接交给 AI Agent 执行的任务清单。
- `acceptance.md`：Given/When/Then、自动化测试、人工验收、视觉验收。
- `review.md`：实现后代码审查、测试结果、遗留风险。

## 标准流程

1. Constitution：先固化项目原则，明确桌面端安全边界、Renderer 不直连文件系统、本地模型 sidecar、FFmpeg 原生优先、shadcn-vue 暗色 UI。
2. Intake：把一句需求压成 feature brief，记录目标用户、业务价值、输入输出、成功标志、明确不做事项。
3. Spec：按“what/why”写需求，不写技术方案；每条需求必须能映射到验收规则。
4. Clarify：AI Agent 只追问高影响歧义；能从仓库、文档、既有方案推断的，不问用户。
5. Design：基于 shadcn-vue 定义页面结构、组件清单、空态、加载、错误、禁用、拖拽、选中状态。
6. Plan：设计接口和实现路径，明确 Electron IPC、数据模型、文件边界、测试策略和性能风险。
7. Tasks：把方案拆成 0.5 到 2 小时可完成的任务，每个任务包含上下文、修改范围、完成标准和验证命令。
8. Implement：AI 先读相关文件，再小步修改；每个任务必须跑对应测试或手工验证。
9. Verify：前端用 Playwright 截图验收，音视频用 ffprobe、抽帧、导出 smoke test，AI 输出用 schema 校验。
10. Review：按 bug、架构风险、测试缺口、视觉问题排序评审，禁止只做风格化总结。
11. Handoff：更新 feature 的 `review.md`，记录完成项、未完成项、风险和下一步任务。

## shadcn-vue 视觉规范

- 初始化策略：使用 shadcn-vue CLI，Vite/Vue3 项目，启用 TypeScript、CSS variables、Lucide 图标、neutral 或 zinc base color。
- 默认主题：应用根节点固定 `.dark`，第一版不做亮色主题切换，避免分散设计和测试成本。
- 组件优先级：Button、Tooltip、Tabs、Resizable、Scroll Area、Dialog、Sheet、Dropdown Menu、Context Menu、Slider、Progress、Switch、Checkbox、Input、Textarea、Select、Badge、Separator、Table。
- 剪辑器布局：左侧素材/脚本区，中间预览区，右侧 AI/属性面板，底部多轨时间线；页面区域不做嵌套卡片，工具控件以紧凑专业工作台为准。
- 视觉验收：桌面与窄屏截图无重叠，按钮文字不溢出，时间线轨道尺寸稳定，图标按钮必须有 tooltip。

## AI Agent 任务规则

- 每个任务 prompt 必须包含：目标、相关 spec、相关 plan、允许修改范围、禁止事项、验收命令。
- AI 输出必须遵守：先读后写、小步提交补丁、不得擅自引入大依赖、不得绕过 shadcn-vue 组件体系。
- 对复杂功能采用双 Agent 逻辑：实现 Agent 负责编码，Review Agent 只做缺陷审查和验收补漏。
- LangChain.js 相关功能必须输出结构化 JSON，并用 zod 校验后再写入时间线。

## 首批 Feature 顺序

- `000-product-foundation`：产品定位、工程宪法、shadcn-vue 视觉基线。
- `001-desktop-shell`：Electron + Electron Forge + Vite + Vue3 + shadcn-vue 应用壳、preload、typed IPC。
- `002-media-assets`：素材导入、ffprobe、缩略图、波形、缓存目录。
- `003-timeline-core`：轨道、clip、拖拽、裁剪、分割、吸附、撤销重做。
- `004-preview-player`：预览画布、播放头、音视频同步、缓冲策略。
- `005-ffmpeg-export`：Filtergraph 编译、MP4 导出、进度、取消、日志。
- `006-ai-subtitle-tts`：Whisper 字幕、IndexTTS2 配音、字幕/配音轨回填。
- `007-ai-orchestrator`：LangChain.js 脚本分镜、素材匹配、自动组轨、自检报告。

## 验收规则

- Spec Gate：每个需求都有用户价值、范围边界和 Given/When/Then。
- Design Gate：每个页面都有 shadcn-vue 组件清单、交互状态、截图验收点。
- Plan Gate：每个方案都有模块边界、数据契约、失败模式、测试策略。
- Task Gate：每个任务可独立执行、可验证、可回滚，不跨多个大模块。
- Implementation Gate：类型检查、单元测试、关键 E2E、视觉截图或音视频 smoke test 通过。
- Review Gate：无 P0/P1 缺陷，P2 风险记录到 `review.md`，未完成项进入下一 feature。

## 参考依据

- Spec Kit 官方流程强调 `Spec -> Plan -> Tasks -> Implement`，并要求先定义 Constitution、再澄清和验证规格：[Spec Kit](https://github.github.io/spec-kit/)、[Quick Start](https://github.github.io/spec-kit/quickstart.html)。
- shadcn-vue 支持 Vue 框架、CLI 添加组件、CSS variables 与语义 token 主题系统：[Installation](https://www.shadcn-vue.com/docs/installation)、[CLI](https://www.shadcn-vue.com/docs/cli)、[Theming](https://www.shadcn-vue.com/docs/theming)。
