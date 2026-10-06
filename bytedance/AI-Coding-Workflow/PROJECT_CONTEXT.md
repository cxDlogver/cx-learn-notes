# Project Context

用于记录当前仓库长期稳定的项目知识。每次需求中发现可复用规则、踩坑、调试入口、验证命令变化时，应增量更新本文件。

## 仓库基础信息

- 仓库名：`alliance-operation-mono`
- 主应用/子应用名：当前需求主应用命中 `apps/alliance-operation-daren`，跨模块可能涉及 `apps/alliance-operation-scale`
- 技术栈：`React 18` / `TypeScript 5` / `MobX` / `Auxo` / `Edenx`
- 仓库命令模型：`EMO_MONOREPO`
- Workspace 管理器：`@ies/eden-monorepo (emo)`
- 依赖安装内核：`pnpm`
- Node 版本：仓库内未显式声明；当前 Trae 环境通过 `~/.nvm` 提供 Node，默认使用 `nvm use 18`
- 默认分支：`master`
- 需求开发分支命名：待确认，当前仅完成读仓与交付工作流初始化

## 仓库命令协议

- 当前仓库根目录命中 `eden.monorepo.json`，因此当前仓库按 `EMO_MONOREPO` 处理。
- 切换到其他仓库时，必须先根据该仓库的实际结构重新判断 `repo_command_model`，再选择安装、启动、构建和 BAM 命令；禁止把当前仓库的 `emo` 规则外推到所有仓库。
- `PROJECT_CONTEXT.md` 是当前仓库命令协议的唯一事实源；执行型阶段只消费这里定义的命令，不再各自发明一套 `pnpm` / `npm` / `emo` 规则。
- 顶层没有统一 `package.json` 时，禁止默认在 repo root 执行 `pnpm run <script>`。
- 安装已有依赖使用 `install_command`；为指定包新增依赖使用 `add_dependency_command`；不要混用。

### 命令协议字段

- `repo_root`: `repos/alliance-operation-mono`
- 具体 checkout 前缀（如 `meego-<task-id>/`）由 init / execution 阶段确认；运行态以 `.trae/DELIVERY_STATE.md` 中的 `execution_repo_root` 为准
- `repo_command_model`: `EMO_MONOREPO`
- `install_command`: `emo install`
- `start_command_template`: `emo start <package_name>`
- `build_command_template`: `emo scm`
- `build_command_non_interactive_note`: 当前仓库 `eden.mono.pipeline.json` 的 `scene.scm` 仅配置唯一条目 `ecom/alliance_operation_mono/mono`；在无 TTY 或自动化环境中执行 build 时，优先使用 `BUILD_REPO_NAME=ecom/alliance_operation_mono/mono emo scm` 跳过交互；仅当无法注入环境变量且确认默认项唯一时，才使用 `printf '\n' | emo scm` 作为兜底
- `add_dependency_command_template`: `emo add <pkg> --filter=<package_name>`
- `bam_command_priority`:
  1. 在目标 app/package 目录执行 `npm run bam`
  2. `emo run bam`
- `bam_command_policy_note`: 先执行 `install_command`，再优先尝试目标 app/package 的本地 BAM 入口；只有 app 级入口缺失、命令协议明确要求 repo 级执行，或 app 级重试后仍无法命中项目本地 generator 时，才回退 `emo run bam`。若回退到 repo 级执行并产生其他 app/package 的 `src/bam/**` 改动，必须在交付前自动回退无关 BAM 生成物，只保留目标 app/package 的结果。

## 常用命令

### Node 环境

Trae 的 shell / toolcall 环境可能通过 `ZDOTDIR` 接管 zsh 启动文件，导致不会自动读取用户 `~/.zshrc`，因此不要假设 `node` / `npm` 已经在 `PATH` 中。执行任何依赖 Node 的命令前，先显式加载 nvm：

```bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 18
node -v
npm -v
```

确认可用的 Node 路径：

```bash
/Users/bytedance/.nvm/versions/node/v18.20.8/bin/node
```

若只需要单条命令，使用：

```bash
source ~/.nvm/nvm.sh && nvm use 18 && <command>
```

```bash
# 安装依赖（repo root）
emo install

# 启动当前主应用
emo start alliance-operation-daren

# 为指定包新增依赖
emo add <pkg> --filter=alliance-operation-daren

# build
emo scm

# build（无 TTY / 自动化环境，优先跳过 scm 选择交互）
BUILD_REPO_NAME=ecom/alliance_operation_mono/mono emo scm

# build（仅在无法注入环境变量且默认项唯一时使用）
printf '\n' | emo scm

# BAM 更新
npm run bam
# 或在 repo root 目录执行
emo run bam

# lint
待确认

# typecheck
待确认

# test
待确认

```

## 目录约定

- 页面目录：`apps/<subapp>/src/routes/**`
- 业务组件目录：页面内局部组件通常位于 `apps/<subapp>/src/routes/**/components/**`
- 通用组件目录：`apps/alliance-operation-daren/src/components/**`
- API/service 目录：`apps/<subapp>/src/bam/**`
- hooks/store/model 目录：`apps/<subapp>/src/hooks/**`、`apps/<subapp>/src/routes/**/store/**`、`apps/<subapp>/src/routes/**/mobx/**`
- types/constants 目录：`apps/<subapp>/src/routes/**/types/**`、`apps/<subapp>/src/routes/**/constants.ts*`、`enums.ts`
- mock 目录：当前未确认固定 mock 目录
- 埋点目录：页面内直接调用 `@ecom/operation-logger`
- 路由配置目录：Edenx 文件路由，主入口位于 `apps/<subapp>/src/routes/**/page.tsx`
- 样式目录：`.module.scss`、`.less`

## 调试入口约定

- 本地 dev server 入口：`source ~/.nvm/nvm.sh && nvm use 18 && emo start alliance-operation-daren`
- 当前项目使用 vmok 壳访问，不应直接用浏览器打开 localhost 路由页做交互验证。
- 平台壳/域名入口：
  - 模板：`http://ecop.bytedance.net/<route>?cjDebugSubApp=<sub-app-basename>:http://localhost:<actual-port>/<sub-app-base>&<deep-link-params>`
  - `alliance-operation-daren` 示例：`https://ecop.bytedance.net/alliance-operation-daren/author-import?cjDebugSubApp=alliance-operation-daren:http://localhost:8079/alliance-operation-daren`
  - 若浏览器自动补 `cjSiteCode` 或跳转 HTTPS，保留 `cjDebugSubApp` 参数即可。
- 登录态要求：验证前先判定 `Browser Runtime Mode`。Trae 桌面环境使用内置浏览器打开 vmok URL 探测是否跳转 SSO，并优先在主 Agent 当前内置浏览器会话完成截图、DOM snapshot、交互和 Network 验证；若跳转 SSO，系统 Chrome 的持久化 profile `.trae/browser-profiles/ecop-vmok-agent-browser` 可用于人工登录和桌面 fallback 取证。登录后优先回到内置浏览器重试；若内置浏览器仍无法复用登录态，则继续用同一持久化 profile 浏览器作为证据源并记录 `open_method` / `browser_profile`。CoCo / Trae CLI / 无桌面环境使用无头浏览器（优先 Playwright Chromium，其次可用的 Chrome DevTools / browser MCP headless 能力）打开同一 vmok URL，并通过专用 user data dir 或 storage state 复用登录态；无头分支不得依赖有头 Chrome 作为验证证据来源。
- 代理要求：参考各子应用的 `eden.proxy.ts`，当前需求尚未确认具体环境
- 判断命中本地产物的方法：Network 中 `cjDebugSubApp` 对应子应用资源来自本地 dev server。若直接打开 `localhost:<port>/<subapp>`，可能因 vmok 注入和宿主壳缺失出现白屏或资源端口不一致。

### Browser Runtime Mode 登录态与验证流程

1. 先判定环境：Trae 桌面环境记录 `browser_runtime_mode=TRAE_DESKTOP`；CoCo / Trae CLI / 无桌面环境记录 `browser_runtime_mode=COCO_CLI_HEADLESS`。
2. 桌面先探测：默认用 Trae 内置浏览器访问 vmok 壳 URL，并通过 snapshot、当前 URL 或业务页关键文案判断是否进入业务页。
3. 无头先探测：默认用 Playwright Chromium headless 或可用的 headless browser MCP 访问 vmok 壳 URL，并通过 URL、DOM 文案、截图、console 和 Network 摘要判断是否进入业务页。
4. 若当前 URL 命中 `sso.bytedance.com` 或业务页关键文案缺失，归类为 `HOST_AUTH_REQUIRED`，不要先判业务代码问题。
5. 桌面 fallback 打开有头 Chrome 登录：使用任务约定的统一 profile，例如 `open -na "Google Chrome" --args --user-data-dir=.trae/browser-profiles/ecop-vmok-agent-browser <vmok-url>`，等待用户完成 SSO。
6. 无头 fallback 使用已授权的 user data dir / storage state 重试；如果缺少可用登录态，暂停要求用户在授权环境完成登录或提供安全的 storage state 注入方式，禁止把 cookie/JWT/token 原文写入产物。
7. 登录态文件只作为本地私有验证缓存，禁止提交，禁止在文档中粘贴 cookie/JWT 内容。
8. 后续 `/delivery:verify`、截图、DOM snapshot、点击验证和 mock-debug 统一复用当前 `Browser Runtime Mode` 的会话；报告必须记录 `browser_tool`、`headless`、`browser_profile_or_state`、`network_evidence_level` 和 `sso_result`。

### Browser Runtime Evidence Contract

- 主 Agent 只保留不可下放职责：判定 `Browser Runtime Mode`、固定 vmok URL / mock 参数 / case_id、确认登录态边界、决定失败分类和阶段 Gate。
- 机械采证可以交给当前浏览器工具、`browser-verify-runbook.json`、`design-checker` 或明确授权的 browser-capable helper：页面打开、点击、DOM / accessibility tree、screenshot、console 和 Network 摘要。
- 机械采证返回的最小证据包必须包含：`browser_runtime_mode`、`browser_tool`、`headless`、`browser_profile_or_state`、`network_evidence_level`、`sso_result`、`vmok_url`、`evidence_ref`。
- 子 Agent 或 helper 不得关闭 case、触发 `/delivery:mock`、修改阶段状态或宣布 Gate 通过；缺少登录态、Network、截图或 DOM 能力时只返回环境缺口。
- 任何报告、manifest 或 mock 记录只保存 Profile / storage state 路径和能力摘要，不保存 cookie、JWT、token、localStorage 或 sessionStorage 原文。

### Runtime Screenshot Evidence Contract

- Trae 内置浏览器截图工具为 `integrated_browser.browser_take_screenshot`，传入 `filename` 后，本地源文件目录固定为 `$(getconf DARWIN_USER_TEMP_DIR)/trae/screenshots/<filename>`。

## 业务与技术规范

### 需求理解

- PRD 权威来源：`artifacts/<task>/prd-source.md`
- 任务空间来源：`artifacts/<task>/` 与业务任务空间 `meego-<task-id>/`
- 设计稿来源：PRD 中引用的 Figma 链接与后续补充设计资料
- 后端接口来源：`src/bam/**` 生成代码与后续后端文档

### 前后端边界

- 前端承担：展示、交互、字段透传、表单状态、错误兜底、埋点、深链。
- 后端承担：数据口径、权限判定、状态流转、复杂聚合、接口字段生产。
- 边界不清默认写入 `uncertainty-register.md`。

### 组件复用

- 表格组件：当前需求页内以页面自组装列表为主，待规划阶段确认是否复用公共表格
- 表单组件：`@ecom/auxo-pro-form`
- 弹窗/抽屉组件：`@ecom/auxo`
- 筛选组件：页面内 `filter-block` 模式较常见
- 状态标签组件：待确认具体组件来源

### Figma-First 组件编排规范

- 页面结构必须从 Figma 主态区域推导，不从现有 JSX 组件树反推。
- 当 Figma 出现业务域切换、页面级 Tab、筛选区、推荐区、工具栏、表格 / 列表或 Drawer / Modal 时，plan 必须先重新编排页面区域，再决定组件复用。
- 现有组件只能作为候选实现资源。复用前必须判定：
  - `KEEP_VISIBLE`：Figma 有同构可见区域，可保留。
  - `RESTRUCTURE_VISIBLE`：Figma 有同类能力但结构不同，必须改造。
  - `LOGIC_ONLY`：Figma 无对应可见区域，只复用状态、参数、helper、columns、store 逻辑。
  - `REMOVE_VISIBLE`：Figma 无对应区域，移除可见 UI。
  - `CREATE_NEW_VISIBLE`：Figma 有新区域，新增或重组 UI。
- 对 `LOGIC_ONLY` 组件，允许保留内部状态或参数兼容，不允许继续 JSX 可见渲染。
- 页面级切换必须以 Figma 语义为准，不能把旧代码中的 PoolTab / StatusTab / FilterBlock 自动等同于 Figma 的业务域 Select、页面 Tab 或筛选卡片。

### 接口与字段

- 请求封装：`src/bam/**` 生成接口 + 页面 store/业务层调用
- 错误处理：待结合具体页面实现确认
- loading 处理：页面内 `Spin` 与局部 loading 结合
- 空态处理：待结合具体页面实现确认
- 枚举维护：多位于页面 `constants.ts` / `enums.ts`

### 埋点

- 埋点函数：`sendPageShowLog` 等来自 `@ecom/operation-logger`
- 通用参数：待确认
- 页面曝光：当前需求相关页面已有 `page_id` / `page_name` 上报
- 点击事件：页面内埋点命名已存在，需沿用现有模式

## 高风险踩坑库

- 动态 Form.Item 未设置 dependencies/shouldUpdate，可能导致全量重算和卡顿。
- onFieldsChange 中同步 setFieldValue 过多，可能阻塞主线程。
- 接口未 ready 时应使用代码级 Mock 开关，不依赖 XHR 拦截。
- 列表/表格状态值、标签值、缺失态文案必须从 PRD/设计稿确认，不从字段名反推。
- 设计稿对齐必须同时做 Figma → 代码、代码 → Figma 双向存在性检查。

## 可沉淀知识

### 组件模式

- 页面入口通常是 `page.tsx` 导出容器组件。
- 页面级状态多放在 `store/filter-store.ts` 或 `mobx/` 目录。
- 局部 UI 能力通过 `components/list-block`、`components/filter-block`、`components/...-drawer` 组织。

### 接口模式

- 后端接口定义以 BAM 生成代码为主，路径位于 `src/bam/ecom.buyin.admin_api/**`。

### 调试问题

- `bytedcli feishu login` 未完成时，`.trae/scripts/fetch_feishu_prd.sh` 无法直接拉取文档。
- `alliance-operation-daren` 本地调试最稳定入口是 `emo start alliance-operation-daren` 固定跑在 `8079`，再通过 vmok 壳 URL 访问。若 `8079` 被其他 workspace 占用导致 EdenX fallback 到 `8080`，不要继续做页面交互验证；先释放 `8079`，否则 `edenx.config.ts` 的 `dev.assetPrefix = http://localhost:8079/` 可能让 vmok 命中旧产物。
- vmok 壳 URL HTTP 200 但页面落到 ByteDance SSO 时，归类为 `ENV_ISSUE / HOST_AUTH_REQUIRED`，提示用户完成登录后复跑 mock-debug，不归因为业务代码。

### 构建与依赖问题

- 当前仓库为 mono 结构，根目录未直接暴露统一 `package.json`，需按子应用执行命令。
- 当前仓库执行 `emo scm` 时会弹出 `Please choose a scm name to build locally`；由于 `eden.mono.pipeline.json` 仅存在唯一 `scm` 条目 `ecom/alliance_operation_mono/mono`，自动化环境应优先使用 `BUILD_REPO_NAME=ecom/alliance_operation_mono/mono emo scm` 直接跳过交互；只有环境变量注入不可用时才退回 `printf '\n' | emo scm`。
