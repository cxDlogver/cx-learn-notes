# 输出与问题处理规范

以下保留完整的最终汇报字段和常见问题处理规则。

## 输出

Exit Gate 通过后，向用户汇报以下信息：

### 1. 任务空间

- 任务空间路径：`<workspace_path>`
- Meego ID：`<work_item_id>`
- 需求标题：`<title>`

### 2. 文档与 context

- PRD：`<prd_link_or_none>`
- 技术文档：`<tech_doc_or_none>`
- 已生成 context 文件：
  - `<workspace_path>/context/meego-summary.md`
  - `<workspace_path>/context/repo-routing.md`
  - `<workspace_path>/context/prd-source.md`
  - `<workspace_path>/context/prd-source/`（Extractor 同名资源目录）
  - `<workspace_path>/context/tech-doc-raw.md`（如有）
  - `<workspace_path>/context/tech-doc-raw/`（如有技术文档，使用 Extractor 同名资源目录）
  - `<workspace_path>/context/prd-summary.md`（如有）
  - `<workspace_path>/context/prd-notes.md`（如有）
  - `<workspace_path>/context/tech-design.md`（如有）
  - `<workspace_path>/context/change-plan.md`（如有）
- 已同步远端上下文：
  - `.trae/Context/<synced_files...>`
- `.trae` Git 信息：
  - remote：`<remote_url>`
  - branch：`<branch>`
  - commit：`<commit_sha>`
  - status：`<clean_or_local_changes>`
- 飞书抽取 Node 信息：
  - selected_transport：`mcp` / `cli`
  - script_node_bin：`<path>`
  - node_version：`<version>`
  - command_match：`<matched_process_or_none>`
  - preflight：`<workspace_path>/context/<artifact_base>/raw/preflight.json`
- 文档 Subagent 与主 Agent 审核：
  - `<document_name>` / `<artifact_base>` → `report_path=<path>`，`resources_path=<path>`，`subagent_id=<id>`，`review_round=<n>`
  - Subagent Gate：`passed` / `blocked_unrecoverable`
  - 主 Agent 正文审核：`PASS`
  - 主 Agent 白板审核：`PASS`
  - 主 Agent 排版审核：`PASS`
  - 主 Agent 验收证据链接审核：`PASS`
- Exit Gate：
  - PRD：`passed` / `blocked_unrecoverable`，禁止输出 `partial_but_continue`
  - 技术文档：`passed` / `not_found_with_evidence` / `blocked_unrecoverable`，禁止输出 `partial_but_continue`
  - 可补齐缺口：`none`；若不是 `none`，不得输出最终结果，必须继续补跑
  - 最后一次 Evidence Gate / Report Gate 输出位置：`<path_or_none>`

### 3. 仓库结果

- 主仓库：`<repo_path>`
- 本地目录：`<workspace_path>/repos/<repo_name>`
- 选择依据：`<why_this_repo>`
- 候选仓库：`<candidate_repos_or_none>`

### 4. 当前状态

- Meego 状态：`<status>`
- 当前节点：`<current_nodes>`
- 主要负责人：`<owners>`
- 远端上下文同步：`required`
- 同步方式：`git clone` / `git pull --ff-only`
- 同步来源：`git@code.byted.org:ecom/alliance-operation-agent.git`
- Git 信息保留：`required`

### 5. 下一步建议

- 只有 PRD、技术文档和其他已确认交付输入文档均进入允许终止状态时，才允许输出本节。
- 进入 Phase 1: brainstorm 分析 PRD
- 进入 Phase 2: plan 制定技术方案
- 或根据当前进度直接进入对应阶段

## 常见问题排查

| 问题 | 原因 | 解决方案 |
| --- | --- | --- |
| Subagent 报告 Gate 通过但正文、白板或排版不合格 | 主 Agent 直接接受了 Subagent 自报 PASS，没有独立终审 | 主 Agent 亲自读取 raw、报告和白板证据并重跑两个 Gate；形成缺口清单回派原 Subagent，直到主审全部 PASS |
| 阶段性归档被误判为 init 完成 | 使用了 workspace 普通完成标准，未承接文档 Subagent Gate 与主 Agent 终审 | 读取 `completion_matrix.json`，主 Agent 独立重跑两个 Gate；存在非终态时回派对应原 Subagent，禁止 final |
| Meego 读取失败 | 权限不足、ID 错误 | 确认 work_item_id，检查 meego 技能登录状态，禁止回退到 Chrome DevTools MCP 或 Chrome 页面操作 |
| 飞书文档内容不完整 | 文档 Subagent 未执行完整 extractor 工作流或主 Agent 审核未通过 | 主 Agent 形成证据、正文、白板、排版缺口清单并 follow-up 原 Subagent；不得新建 Agent 或局部伪造产物 |
| Report Gate 被标记为 Node 缺失 | 只检查了当前 shell 的裸 `node`，没有解析 MCP / CLI 对应 Node bin | 按 `<HARD-GATE>` 和 extractor Preflight 从 MCP 进程或 CLI 路径解析 `SCRIPT_NODE_BIN`，使用 `PATH="$SCRIPT_NODE_BIN:$PATH" node ...` 重跑验证；不得把裸 `node` 失败写成最终原因 |
| 技术文档读取失败 | 无权限、链接失效、Subagent Gate 或主 Agent 审核失败 | 优先检查 `context/` 副本；可恢复时按 Step 0.3.0.1 回派技术文档原 Subagent，只有经主 Agent 复核的不可恢复异常才记录 partial |
| 仓库路由不确定 | 需求描述模糊 | 列出候选仓库，询问用户确认 |
| 代码拉取失败 | 网络问题或仓库不存在 | 检查仓库路径，确认访问权限 |
| 仓库已有未提交改动 | 复用了已有工作区 | 切换到新目录，或先 stash 当前改动 |
| context 文件写入失败 | 目录权限问题 | 检查目录权限，确认磁盘空间 |
| 远端上下文拉取失败 | git 权限或网络问题 | 检查 `git@code.byted.org:ecom/alliance-operation-agent.git` 访问权限 |
| `.trae/` 不是 Git 仓库 | 历史版本曾用拷贝方式同步 | 先迁移为备份目录，再重新 `git clone` 到 `.trae/` |
| `.trae/` 存在未提交改动 | 团队正在优化 agent / skill / command / script | 不得覆盖；先汇报 `git -C .trae status --short`，由用户决定提交、暂存或继续保留 |
| `.trae/` Git 信息丢失 | 使用了 `cp -Rf`、手工复制或删除 `.git` | 重新 clone 远端仓库到 `.trae/`，禁止拷贝式同步 |

