## 第五篇 Figma MCP

### 1. Figma MCP 是什么

Figma 官方把 MCP Server 定位成“把 Figma 直接带入开发工作流”的桥梁：AI agent 可以读取 Figma 文件中的 `components`、`variables`、`layout data` 等结构化信息，用这些信息生成更贴近设计系统的代码；反过来，在 remote 模式下，agent 还可以把内容直接写回 Figma 画布。

Figma 也明确说明：**MCP 本身不是一键把设计变成完美代码的工具**，它负责把结构化设计上下文送给 AI，最终代码仍由 AI 客户端结合你的 prompt 和代码库来生成。

> 核心总结：MCP 的核心作用是传递结构化设计上下文，而非直接生成完美代码，最终代码由 AI 客户端结合提示词和代码库生成。

### 2. remote MCP 和 desktop MCP 的区别

Figma 目前有两种 MCP 形态：**remote MCP server** 和 **desktop MCP server**。官方推荐大多数用户优先使用 **remote**，因为它连接的是 Figma 托管的远程端点，功能最全，而且不要求安装 Figma Desktop App。

两者核心区别如下：

- **remote MCP**：是 **链接驱动**。复制整个文件链接，或者某个 frame / layer 的链接，贴给 agent，agent 再基于这个 URL 获取上下文。官方明确写了 remote 是 **link-based**。
- **desktop MCP**：更偏 **当前选中内容驱动**。主要理解你在 Figma Desktop 里当前选中的对象，也可以配合链接，但核心是 selection-based。

适用场景区分：

- 适合选 remote 的场景：主要在浏览器里用 Figma、想要全部可用工具、习惯把 frame/layer 链接贴给 Claude Code、Cursor、Codex、VS Code 等 agentic tool。
- 适合 desktop 的场景：长期在 Figma Desktop 里工作，希望 agent 直接获取“当前选中节点”的上下文，或有特定组织/企业场景必须走本地。

### 3. 接入方式、认证和可用范围

#### 3.1 remote MCP

官方远程端点是 `https://mcp.figma.com/mcp`（注：该链接当前提示“link dead”，无法正常访问）。remote 方案一般通过编辑器或 AI 客户端里的插件 / MCP 配置接入，然后走 Figma 账号授权流程。Figma 官方示例里已包含 Claude Code、Codex、Cursor、VS Code、Gemini CLI 等接入方式。

#### 3.2 desktop MCP

desktop 方案需要安装 **Figma Desktop App**，并在 Dev Mode 中开启 MCP server。官方给出的本地地址是 `http://127.0.0.1:3845/mcp`（注：该链接当前提示“invalid link”，无法正常访问）。

#### 3.3 座席与权限

官方文档当前给出的规则是：

- **remote server**：所有 seat / plan 都可用，但额度和能力不同。
- **desktop server**：需要付费计划中的 **Dev 或 Full seat**。
- **写回 Figma（use_figma 写操作）**：通常需要 **Full seat**；Dev seat 更适合只读工作流，例如读取 design context、variables、screenshots、metadata 等。

另外，Figma 当前说明 MCP 会逐步变成 **usage-based paid feature**，但文档仍写着**beta 期间免费**。

### 4. 各类工具的详细解释

以下按功能分组，详细说明 Figma MCP 各类工具的作用、用途及核心细节。

#### 4.1 读取设计上下文类

##### 4.1.1 `get_design_context`

这是最核心的“**把设计转成结构化上下文**”工具。官方明确说明：它会返回某个 layer 或 selection 的 design context，**默认输出是 React + Tailwind 表示**，但可通过 prompt 要求改成 Vue、HTML + CSS、iOS 等其他框架/风格。它支持 **Figma Design** 和**Figma Make**。

**可以把它理解成：**“不是最终代码，而是 AI 可理解的设计表达层。”

**典型用途：**

- 让 AI 根据某个 frame 生成 Vue 组件
- 让 AI 根据某个 selection 输出 HTML + CSS
- 结合 Code Connect，让 AI 优先复用你真实代码库中的组件，而非凭空猜测组件结构。

**重要细节：**

- desktop 支持“基于当前选中内容”的 prompting；
- remote 则必须提供 **frame/layer 链接**。

##### 4.1.2 `get_variable_defs`

这个工具负责提取选区里用到的 **variables 和 styles**，比如颜色、间距、字体等 token。它是把“设计稿里的视觉值”转换成“AI 可引用的 design token 上下文”的关键入口。

**典型用途：**

- 问 AI：“这个 frame 用了哪些颜色变量和间距变量？”
- 让 AI 在生成代码时尽量引用 token 名，而非写死数值
- 做 design system 对齐，检查设计稿是否真正使用了变量。

##### 4.1.3 `get_metadata`

这个工具返回一个 **稀疏 XML**，只包含基础结构信息：比如 layer ID、名称、类型、位置、尺寸等。官方强调它适合 **非常大的设计文件**：先用它拿到轻量级大纲，再让 agent 对局部节点继续调用 `get_design_context`，避免一次把超大设计全塞进上下文。

**适用场景：**

- 超大页面
- 多 frame 文件
- 想先做结构扫描，再做局部精读。

##### 4.1.4 `get_screenshot`

这个工具让 agent 对当前 selection 截图。官方建议通常 **保持开启**，因为截图能帮助模型保留布局和视觉保真度；只有在特别担心 token 消耗时，才考虑关闭。它支持 **Figma Design** 和 **FigJam**。

**可以把它理解成：**“结构化上下文 + 视觉截图”的双保险。

因为纯结构化信息对尺寸、对齐、视觉层级的感知有时不如图片直观，所以很多设计转代码场景下，`get_screenshot` 很有价值。

##### 4.1.5 `get_figjam`

这是 FigJam 版的 `get_metadata`。它会以 XML 的方式返回 FigJam 图中的节点元数据，而且还包含节点截图。适合把流程图、架构图、头脑风暴板等 FigJam 内容提供给 AI 做开发上下文。

**适用场景：**

- 从 FigJam 里的流程图生成接口流程说明
- 从架构草图生成系统模块文档
- 把产品讨论白板喂给 AI 辅助开发。

#### 4.2 Code Connect 相关工具

##### 4.2.1 `get_code_connect_map`

这个工具读取当前选中实例与代码库组件之间的映射关系。返回内容包括：组件名、代码位置、snippet、版本来源、框架标签等。remote 还可以通过 `clientFrameworks` 和 `clientLanguages` 控制返回哪套映射。

**本质作用：**让 AI 知道 “这个 Figma 实例在你项目里其实对应 `Button.tsx` / `Button.vue`，不是要现编一个新的按钮”。

这对真正落地的 design-to-code 非常关键。

##### 4.2.2 `add_code_connect_map`

这个工具用于新增映射：把某个 Figma node ID 映射到代码库中的具体组件。官方说这样能显著提升 design-to-code 输出质量，因为模型能更准确识别和复用项目里的真实组件。

**适用场景：**

- 刚完成一个组件的 Figma ↔ code 对应关系
- 想补齐团队设计系统的映射资产
- 想让 AI 后续更稳定复用组件。

##### 4.2.3 `get_code_connect_suggestions`

这个工具会让 Figma 帮你检测并建议哪些 Figma 组件可以映射到代码组件。官方 Code Connect skill 中，它通常被用作“发现尚未映射组件”的第一步。

**适用场景：**

- 扫描未映射组件
- 建立或补齐 Code Connect
- 做设计系统治理。

##### 4.2.4 `send_code_connect_mappings`

这个工具通常在 `get_code_connect_suggestions` 之后使用，用于确认映射结果。可以理解为“把建议映射正式提交/确认”的后续动作。

##### 4.2.5 `get_context_for_code_connect`

这个工具主要出现在官方 **Skill: Code Connect** 工作流文档里。它的作用是根据 `fileKey + nodeId` 去读取某个 Figma 组件的 **属性定义**，包括 TEXT、BOOLEAN、VARIANT、INSTANCE_SWAP 等，用来帮助生成 `.figma.ts` 之类的 Code Connect 模板。

**它的定位不是普通“设计转代码”主入口，而是更偏 Code Connect 模板生成/维护。**

换句话说：

- `get_design_context` 更偏“把设计交给 AI 生成代码”
- `get_context_for_code_connect` 更偏“把组件属性结构交给 AI，建立 Figma 组件和代码组件的正式连接层”

#### 4.3 写回 Figma / 创建设计类

##### 4.3.1 `use_figma`

这是 remote 侧最重要的“**通用写画布工具**”。官方定义很明确：它可以在 Figma 文件里 **创建、编辑、删除或检查** 各类对象，包括 pages、frames、components、variants、variables、styles、text、images 等。并且在合适的时候，agent 会先去检查设计系统里是否已有可复用组件，而不是从零乱造。

**典型用途：**

- 新建一个 screen/frame
- 更新某个组件样式
- 批量建立 token / variable collection
- 修复 auto-layout 问题
- 生成或更新组件 variant。

**很重要的一点：**官方建议 `use_figma` 最好配合 **figma-use skill** 使用，这样 agent 在写 Figma 时更稳定、更符合推荐流程。

##### 4.3.2 `search_design_system`

这个工具会跨所有已连接的设计库，搜索匹配文本查询的 **组件、变量、样式**。它的目标非常明确：让 agent 先复用已有设计系统资产，而不是凭空创建新东西。

**典型用途：**

- 找现有 Button / Card / Empty State 组件
- 找主色变量、间距 token
- 找 icon style、text style。

##### 4.3.3 `create_new_file`

这个工具会在你的 drafts 里创建新的空白 Figma Design 或 FigJam 文件。如果你属于多个计划/组织，它还会让你选要创建到哪个 team / org。

**典型用途：**

- 新建 “Homepage Redesign”
- 新建项目规划用的 FigJam board
- 作为 `use_figma` 的前置步骤，先开一个干净文件再写内容。

##### 4.3.4 `generate_figma_design`

这是 remote only 工具，而且官方明确注明 **只在部分 MCP 客户端中可用**。它的作用是把你的 **live UI** 发送到 Figma，转成可编辑的 design layers，可以进新文件、已有文件或剪贴板。

**它对应的是“Code to Canvas”场景：**不是从 Figma 读设计去写代码，而是把浏览器里的真实页面反向送进 Figma。

**适用场景：**

- 把生产环境 / staging / localhost 的 UI 采集回 Figma
- 做设计回溯、审查、对齐
- 让产品/设计师直接在可编辑 Figma 层上讨论代码产物。

#### 4.4 规则、身份和图表类

##### 4.4.1 `create_design_system_rules`

这个工具用于生成一份 **rule file**，给 agent 提供“你们项目该怎样把设计翻译成前端代码”的规则上下文。官方明确建议生成结果应保存到正确的 `rules/` 或 `instructions/` 路径，便于 agent 在后续代码生成时读取。

**它很适合“Figma + Spec/规则文档 + AI 开发”的团队场景。**

因为它本质上是在解决一个关键问题：**让 AI 不只看设计，还知道你们项目的技术栈、设计系统约束、组件复用规则和代码风格。**

##### 4.4.2 `whoami`

这是 remote only 工具，用来返回当前连接到 Figma 的身份信息，包括邮箱、所属 plans、每个 plan 的 seat type。

**适用场景：**

- 检查是否授权成功
- 检查当前账号挂在哪些团队/组织
- 排查为什么有些写操作不能执行。

##### 4.4.3 `generate_diagram`

这是 remote only 工具，用于把 **Mermaid** 转成 **可编辑的 FigJam diagram**。而且官方明确说：你不一定要手写 Mermaid，也可以直接自然语言描述，agent 会自己生成 Mermaid 再调用工具。支持 flowchart、gantt、state、sequence 等类型。

**适用场景：**

- 认证流程图
- 支付时序图
- 项目排期图
- 状态机图。

### 5. 工具之间的关系

用一句话概括各类工具的层级关系：

- **`get_design_context / get_variable_defs / get_screenshotget_metadata`** ：是“**读取设计上下文**”的核心层。
- **`get_code_connect_map / add_code_connect_map / get_code_connect_suggestions / send_code_connect_mappings / get_context_for_code_connect`**：是“**把 Figma 组件和真实代码组件打通**”的连接层。
- **`use_figma / create_new_file / search_design_system / generate_figma_design`**：是“**写回画布 / 创建设计 / 复用设计系统**”的执行层。
- **`create_design_system_rules`**：是“**给 agent 建立团队规则**”的约束层。
- **`get_figjam / generate_diagram`**  ：是“**流程图 / 白板 / 架构讨论**”的辅助层。

### 6. Figma MCP 最适合的真实工作流

#### 6.1 工作流 1：设计转代码（最典型）

核心链路：

1. 提供 file / frame / layer 链接
2. `get_design_context` 读取结构化设计
3. `get_variable_defs` 补充 token 信息
4. `get_screenshot` 保留视觉保真度
5. 如有 Code Connect，再用映射让 AI 复用真实组件
6. AI 输出 Vue / React / HTML 等目标代码。

#### 6.2 工作流 2：设计系统对齐

若重点是“AI 生成代码贴近项目现有组件与 token”，需组合以下工具：

- `get_variable_defs`
- `search_design_system`
- `get_code_connect_map`
- `create_design_system_rules`

这样模型不仅知道“设计长什么样”，还知道“该用哪个组件、哪个 token、哪些规则”。

#### 6.3 工作流 3：代码反推回 Figma

若已有前端页面，希望把 live UI 回灌进 Figma，重点使用 `generate_figma_design`。适合做设计回收、现网对齐、把工程产物带回设计协作。

#### 6.4 工作流 4：AI 直接修改 Figma

若希望 AI 在 Figma 里直接生成 frame、修 auto-layout、补 variables、生成 variants，重点使用 remote 下的 `use_figma`，最好搭配技能包使用。

### 7. 核心结论与实操建议

#### 7.1 核心结论

若目标是“把 Figma 设计图直接喂给 AI，让 AI 基于真实设计上下文生成前端代码，且尽可能贴近设计系统和现有组件”，推荐理解框架：

1. **首选 remote MCP**：官方明确推荐，功能最广、更新最快。
2. 核心读图工具不是截图，而是结构化设计上下文：`get_design_context`、`get_variable_defs`、`get_screenshot` 三者组合，是高质量 design-to-code 的关键。
3. **想让 AI 复用项目现有组件，必须接入 Code Connect**：否则模型仍会“猜组件”，Figma 官方也强调，不用 Code Connect 时，模型对设计系统的理解有限。
4. **`create_design_system_rules`****想把项目规则落地， 很重要**：可将“设计规范、组件复用策略、代码风格、技术栈约束”转成 AI 可执行规则。

#### 7.2 实操建议（适配 Vue3 + Spec Kit + AI 开发流程）

优先按以下顺序落地，更稳妥高效：

1. 先打通**remote MCP + get_design_context + get_variable_defs + get_screenshot**，让 AI 能稳定读取真实设计。
2. 再补充 **Code Connect**，把设计组件和代码组件映射起来。
3. 最后引入 **create_design_system_rules**，把项目规范和技术约束固化给 agent。

避免一上来就追求“设计稿直接全自动生成完整项目”，逐步落地更易出效果。

### 8. GLips / Figma-Context-MCP（现名 Framelink MCP for Figma）

相关仓库链接 https://github.com/GLips/Figma-Context-MCP?tab=readme-ov-file 可正常访问；

#### 8.1 核心定位

这个仓库本质上是一个**社区开源 MCP server**，现在在 README 中的产品名称是 **Framelink MCP for Figma**。它的定位非常明确：把 Figma 里的设计数据提供给 Cursor 等 AI 编码工具，让 agent 不再只看截图，而是读取经过整理后的布局和样式信息，用来更准确地“一次成型”实现界面。

仓库 README 直接强调，它的目标是让 coding agent 获取 Figma 数据后，比“贴截图给 AI”这种方式更适合做 UI 落地。

和 Figma 官方 MCP 不同，它**不是 Figma 官方托管的 remote MCP**，而是一个基于 Figma API 的第三方开源实现。它更像“面向代码生成场景的轻量 Figma 数据摄取层”，重点是把原始 Figma API 响应**简化、翻译、压缩**后再交给模型，而非提供官方那整套读写画布、Code Connect、设计系统搜索等完整能力。

#### 8.2 与 Figma 官方 MCP 的关系

两者属于两条不同路线，核心区别如下：

- **Figma 官方 MCP**：官方产品能力，优先推荐 **remote MCP**，链接驱动，可提供 components、variables 等结构化上下文，支持写回画布、生成变量、Code Connect 映射等完整工作流。
- **GLips / Framelink MCP**：社区工程化实现，核心目标更聚焦——**把 Figma 设计压缩成更适合 coding agent 消费的上下文**。其 CLAUDE.md 明确项目哲学：职责是 “ingesting designs for AI consumption”（为 AI 摄取设计数据），而非代码生成器本身，也不负责 CMS 同步、复杂第三方集成等扩展范围。

选型建议：

- 若需 **官方首选、能力最全、长期方向最正统** 的方案，优先选 **Figma remote MCP**。
- 若需 **本地可控、轻量、专门服务于“Figma → Coding Agent → 代码”** 的开源接入层，GLips 仓库很实用。

#### 8.3 核心设计思想

该项目最核心的价值，不是“能连接 Figma”，而是会**先处理上下文，再交给模型**。README 明确写到：它在把 Figma API 的结果返回给模型之前，会做**简化和翻译**，只保留最相关的 layout 和 styling 信息，以减少无效上下文，提升模型输出的准确性和相关性。

官方文档补充说明，Framelink MCP 会把收到的 Figma API 数据压缩将近 **90%**；即便如此，复杂设计仍可能让 agent 上下文过载，因此建议**一次只处理一个 frame 或 group**。

这与 Figma 官方 remote MCP 思路不同：官方更强调“结构化设计上下文 + 丰富工具 + skills”；而 Framelink 更强调“**把设计数据裁剪成 AI 更容易处理的格式**”。

#### 8.4 核心工具

该 MCP 的核心工具较少，主要为以下两个，专注于设计数据摄取和图片导出：

##### 8.4.1 get_figma_data

主工具，用于**获取并简化 Figma 设计数据**。项目架构文档定义为 “Fetches and simplifies Figma design data”。实际工作流中，用户把 Figma 文件、frame 或 group 的链接贴给 agent，agent 调用该工具读取并整理设计信息，再据此生成代码。

默认输出格式是**YAML**（作者推荐，更省 token），也可通过 `--json` 切换为 JSON 格式。

##### 8.4.2 download_figma_images

配套工具，用于**下载 Figma 中的图片资源**。架构文档定义为 “Downloads images from Figma”，配置文档说明它会把图片写入本地目录，可通过 `--image-dir` 指定允许写入的根目录，也可通过 `--skip-image-downloads` 禁用该工具。

#### 8.5 技术结构

内部链路大致如下：

1. MCP tools 定义工具入口
2. Figma service 调用 Figma REST API
3. extractor system 把原始响应转换成更适合模型消费的数据
4. transformers 分别处理 layout、style、effects、text、component 等信息。

可见，它并非简单透传 Figma API 响应，而是专门做了“抽取—转换—压缩”层，这也是其在 Cursor 等 coding agent 场景中表现更稳定的关键。

#### 8.6 实际使用方式

Framelink 文档推荐用法：先配置好 MCP，然后**右键某个 frame 或 group，复制 selection link**，把链接贴给 agent，再让 agent 实现该设计。

特别提醒：不要一次性喂整个大页面，应“**one section at a time**”（一次一个区域），因为即便做了压缩，复杂设计依然可能让 agent 上下文过载。

该用法与“复制文件/frame/layer 链接贴给 agent”的习惯完全契合，适用于官方 remote MCP 和 Framelink MCP 两种方案。

#### 8.7 优势

- 比截图驱动更强：交给模型的是经过整理的设计数据，而非纯视觉像素，生成代码更准确。
- 上下文更轻：核心竞争力是把上下文做薄，让 Cursor 等 agent 更容易直接落地代码。
- 更适合“代码实现导向”的工作流：若目标是“根据 Figma 快速生成 Vue/React 页面、组件结构、样式骨架”，使用体验更顺手。

#### 8.8 局限和风险

- 能力面较窄：相较于官方 MCP，缺少读取 variables、搜索设计系统、Code Connect、写回 Figma canvas、生成 FigJam diagram 等功能，核心仅两个工具。
- 工程稳定性有边界：社区 issue 中存在图片批量下载失败、大设计导致 agent 反复调用 `get_figma_data` 等问题（单张下载可作为临时解决方案）。
- Figma Make 支持不完整：有 issue 报告，用 Make project link 调用 `get_figma_data` 会返回 400 错误；转成 Design project 后，仅能拿到静态 UI，不包含交互逻辑。
- 版本元数据不同步：GitHub Releases 已更新至 v0.9.0（2026-04-09），但 main 分支 raw `package.json` 显示 0.8.1，raw `server.json` 显示 0.6.4，集成时需用 `npx figma-developer-mcp --version` 确认实际版本。
- 安全风险：版本 ≤ 0.6.2 存在高危命令注入问题，0.6.3 已修复，不建议使用较老版本。

#### 8.9 定位评价

GLips/Figma-Context-MCP（Framelink MCP）是一个面向 AI 编码工具的社区开源 Figma MCP 实现。它的强项不是工具面最全，而是把 Figma API 的原始设计数据压缩、简化为更适合 coding agent 消费的上下文，因此特别适合“Figma → Cursor/Codex → 前端代码”的快速落地链路。

边界判断：如果目标是官方首选、长期演进能力最完整、并且希望支持 variables / Code Connect / design system search / write-to-canvas / FigJam diagram 等完整工作流，应优先使用 Figma 官方 remote MCP；如果目标是本地快速接入、轻量读取设计上下文、让 coding agent 更稳定地产生前端代码，Framelink MCP 是一个很实用的社区方案。

#### 8.10 场景适配建议

- 做“官方方案研究报告”：以 **Figma 官方 remote MCP** 为主线。
- 做“工程落地和本地接入实验”：把 **GLips / Framelink MCP** 作为社区实现案例补充。
- 做“Vue3 + Spec Kit + AI 编码”链路验证：Framelink MCP 适合第一阶段原型，因其简单、直指 coding workflow（设计→代码）。