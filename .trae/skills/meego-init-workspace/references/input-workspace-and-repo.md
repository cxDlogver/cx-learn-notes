# Meego 输入、Workspace、Git 与仓库规范

以下保留完整的线索提取、目录、Git 同步、仓库路由和拉取规范。

### Step 0.1: 读取需求源信息

从需求源中尽量提取：

| 字段 | 说明 |
| --- | --- |
| 工作项 ID | Meego / 项目管理系统中的唯一标识 |
| 标题 | 需求标题 |
| 项目 / 空间 | 所属项目或空间 |
| 状态 | 当前工作项状态 |
| 优先级 | P0 / P1 / P2 等 |
| 当前节点 | 当前所处流程节点 |
| 负责人 | 各角色负责人 |
| PRD 文档链接 | 飞书 / Lark 文档 URL |
| 技术文档链接 | 后端技术文档 / API 文档 / 技术方案链接 |
| 评论区和节点详情 | 技术文档 / 设计稿 / 关联线索 |

读取 Meego 时，工具优先级固定为：`FeishuProjectMcp` > `meego` skill > `bytedcli` / `bytedcli-meego`。如果 `FeishuProjectMcp`、`meego` skill 或 `bytedcli` 因未登录、授权失效或权限不足而失败，允许引导用户完成对应工具登录后重试；不得自动切换到 Chrome DevTools MCP、Chrome 页面操作、浏览器抓取或任何 Chrome 登录流程。

除工作项基础字段外，必须继续读取 `get_node_detail(..., node_keys: ["_all"], field_keys: ["_all"])`，扫描所有节点中的文档类字段与链接线索，不得只读取当前节点或只依据 `get_workitem_brief` 下结论。

如果需求源中能提取到任意文档链接，必须先在 init-workspace 阶段完成“来源字段 + 文档类型 + 当前判断”的分类记录；其中凡是已确认类型且属于当前交付输入的飞书文档，必须按 Step 0.3.0.1 派发唯一专属 Subagent 生成最终报告和资源，至少包括 PRD 和技术文档，不得只记录链接。

#### Meego 文档线索提取铁律

- `get_node_detail` 返回结果必须先做完整性校验，再做字段提取；只有在 JSON 可完整解析、顶层存在 `list`、节点下存在 `form_items` 时，才允许继续使用该结果。
- 若 `get_node_detail` 的 stdout / 落盘文件出现 JSON 不闭合、字段缺失、解析报错、输出被截断或顶层结构异常，本次读取必须判定为无效；不得继续基于该次结果里的零散文本、半截 JSON 或 grep 到的 URL 做任何语义推断。
- 所有文档链接都只能从“字段级证据”中确认：必须同时记录 `node_name`、`field_name`、`field_key`、`value/value_label`，再根据字段语义判断其属于 `PRD`、`技术文档`、`测试文档`、`评审材料`、`风险评估`、`LR内容`、`补充说明` 或 `未确认类型`。
- 禁止从原始 JSON 文本中直接抽取全部 URL 后，凭“第二个 docx 链接”“看起来像文档链接”“不像 PRD 的链接”这类启发式规则，推断任何文档类型。
- 字段名不等于其他文档类型的内容，不得跨类型升级或降级。例如 `LR内容`、`测试文档`、`评审材料`、`风险评估`、`群聊记录`、`补充说明` 等字段，即使 value 中包含飞书链接，也只能先按其原字段语义记录，不能直接改写成“技术文档”或其他文档类型。
- 只有当字段名、节点语义或 PRD/评论中的明确描述能够支持对应文档类型语义时，才可以把该链接归类到该类型；否则只能登记为 `文档候选 / 类型未确认`。
- 若 Meego 中存在多个文档链接但语义不明确，必须在 `meego-summary.md` 中逐条记录“来源节点 + 字段名 + 链接 + 当前判断”，并把状态标记为 `类型未确认`，不得擅自选一个写成唯一 PRD、唯一技术文档或其他唯一文档结论。

### Step 0.2: 创建任务空间目录

必须在用户当前目录下创建任务空间，禁止自行寻找父目录、兄弟目录、临时目录或其他位置 `mkdir`：

```text
./meego-<work_item_id>/
├── context/
└── repos/
```

若用户已有明确命名要求，只能作为当前目录下任务空间的相对目录名；用户明确给出绝对路径或要求切换目录时，必须先确认。

此外，必须在当前目录创建或复用：

```text
.trae/
```

该目录用于存放从远端仓库读取并同步下来的团队交付上下文，不替代任务空间内的 `context/`。

`.trae/` 必须是 Git 工作区：

- 新建时直接 `git clone` 到 `.trae/`
- 已存在且是 Git 仓库时，保留当前 `.git`，通过 `git fetch` / `git pull --ff-only` 更新
- 已存在但不是 Git 仓库时，不得直接覆盖为普通目录；必须先迁移为备份目录或询问用户确认处理方式
- 不得删除 `.trae/.git`
- 不得使用 `cp -Rf <repo>/Context/. .trae/` 这类会丢失 Git 信息的同步方式


### Step 0.3.1: 强制同步远端上下文到 `.trae` 并保留 Git 信息

默认源仓库：

```text
git@code.byted.org:ecom/alliance-operation-agent.git
```

直接使用终端命令。若 `.trae/` 不存在：

```bash
git clone git@code.byted.org:ecom/alliance-operation-agent.git .trae
```

若 `.trae/` 已存在且是 Git 仓库：

```bash
git -C .trae remote -v && \
git -C .trae fetch --all --prune && \
git -C .trae pull --ff-only
```

执行要求：

- `.trae/` 必须保留为远端仓库的 Git checkout
- 必须保留 `.trae/.git`
- 必须保留 remote、branch、commit history，便于团队继续优化 `.trae/Context/agents`、`.trae/Context/skills`、`.trae/Context/commands`、`.trae/Context/scripts`
- 保持远端仓库目录结构，不扁平化，不剥离 `Context/` 路径
- 该步骤为 init-workspace 的必选步骤，不得跳过
- 禁止使用拷贝式同步导致 `.trae/` 下文件失去 Git 跟踪
- 如果 `.trae/` 已存在本地未提交改动，必须先执行 `git -C .trae status --short` 并向用户说明；不得直接覆盖或清理
- 不要求生成额外脚本文件


### Step 0.4: 定位目标仓库

必须使用 `code-route-skill`。

根据 PRD 标题、业务线、模块名、页面名、需求语义判断目标仓库，并记录选择依据。

常见规则示例：

- 中后台 / 运营工作台 / 管理后台 → 优先对应的 Web 管理端仓库
- 任务配置 / 流程配置 → 优先对应的配置平台或运营端仓库
- 面向用户的 H5 / 移动端页面 → 优先移动端相关仓库
- 跨端组件或公共能力 → 优先公共组件库或基础能力仓库

补充判定规则：

- 页面承载信号优先级高于接口 / BFF 命名空间信号；接口前缀、PSM、RPC 名称只能证明后端或业务域归属，不能单独作为前端主仓依据
- 若 PRD、标题、菜单、页面描述明确指向“运营平台 / 中后台 / 管理后台”页面，即使技术文档中的接口落在其他业务域，也应优先将对应运营端仓库作为承载仓候选
- 若“页面承载信号”和“接口业务域信号”冲突，不得仅凭接口域直接下唯一结论；必须保留候选仓，并在拉取代码前先做一次代码检索验证

若 `code-route-skill` 不可用，再退回到：

- codebase 搜索
- repo 元信息查询
- 本地目录和命名线索判断

仓库路由结论必须写入 `context/repo-routing.md`，包含：

- 主仓库及选择依据
- 候选仓库（如有）
- 需求点 → repo / code_path / page_url 的映射摘要

### Step 0.5: 拉取代码到 `repos/`

将确认的目标仓库拉到：

```text
repos/<repo-name>/
```

要求：

- 只能在当前任务空间的 `repos/` 下拉取代码，禁止自行选择其他目录或新建当前目录之外的父级 workspace
- 不污染用户当前目录之外的任何工作区
- 不覆盖已有未提交改动
- 优先使用 `./meego-<work_item_id>/repos/<repo-name>/` 这样的当前目录内独立目录
- 如果仓库已存在，先检查是否为 git 仓库，再决定是否复用


