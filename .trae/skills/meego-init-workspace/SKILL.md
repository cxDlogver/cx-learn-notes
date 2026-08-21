---
name: "meego-init-workspace"
description: "Initializes Meego requirement workspaces. Invoke when user provides a Meego work item, PRD link, or asks to create an independent task workspace."
---

# Phase 0: meego-init-workspace（任务空间初始化）

<HARD-GATE>

- `meego-init-workspace` 只负责调度和终审；飞书文档的正文、资源、manifest、报告生成和 Gate 规则全部以 `feishu-doc-extractor` 及其脚本为准。
- 任一文档仍为 `partial` / `recoverable` / `running` / `FAIL` / `NOT_RUN`，任一 Gate 非 0，或报告不是由 `compose-report-body.mjs` 生成，均禁止进入本 Skill 的 `输出` 和“下一步建议”。
- 所有飞书 / Lark 文档，包括 PRD、技术方案、API 文档、补充说明，都必须由各自唯一专属 Subagent 按 Step 0.3.1 执行完整 extractor 工作流。
- 主 Agent 不接受 Subagent 口头 PASS；必须独立运行 Evidence Gate 与 Report Gate，并审核三模块报告结构、fetch 正文改写、评论回填、媒体真实性、白板证据链、表格和相对链接排版。
- PRD 和技术文档保留既有 context 命名：PRD 为 `context/prd-source.md` + `context/prd-source/`，技术文档为 `context/tech-doc-raw.md` + `context/tech-doc-raw/`。对应 Subagent 分别固定 `artifact_base=prd-source` 或 `artifact_base=tech-doc-raw`；其他文档使用稳定、可识别的 kebab-case base name。
- 不得使用浏览器抓取流程替代 extractor。抽取、资源、正文、白板或排版审核失败时，回派原 Subagent；只有命中不可恢复白名单并保留原始错误证据时，才记录 `unrecoverable`。
- 最终输出受 Exit Gate 约束：任一文档仍有可恢复缺口时，必须持续 follow-up 原 Subagent 并由主 Agent 复审；禁止向用户 final、禁止把整改写成“下一步建议”。
- Meego 读取失败时先处理对应工具登录或权限问题，不得自动回退 Chrome / 浏览器抓取。

</HARD-GATE>

## 目标

当用户输入是 Meego、需求单，或明确要求创建独立 workspace 时，必须先执行该阶段。将需求上下文、仓库路由结论、代码仓库统一组织到一个可持续推进的任务空间中。

无论用户是否显式提及，init-workspace 阶段都必须从 `git@code.byted.org:ecom/alliance-operation-agent.git` 拉取团队交付上下文，并以保留 Git 元信息的方式放置到当前目录的 `.trae/`。

`.trae/` 是团队持续优化 agent、skill、commands 和 scripts 的工作区，必须保留 `.git`、remote、branch、commit history 等 Git 信息。禁止通过单纯复制文件的方式把远端内容剥离成无 Git 信息的普通目录。

## 前置条件

- 用户提供了以下任一输入：
  - Meego 链接
  - work_item_id
  - 项目名 + 需求标题
  - PRD 链接 + 用户指定 repo / workspace 名称

## 步骤


## Required References

以下参考文件由原 Skill 章节原文迁移而来，全部规则保持有效：

- 读取 Meego、创建 workspace、同步 `.trae` 或路由/拉取仓库前，完整读取 [input-workspace-and-repo.md](references/input-workspace-and-repo.md)。
- Exit Gate 通过并准备汇报时，完整读取 [output-and-troubleshooting.md](references/output-and-troubleshooting.md)。

飞书文档的文件级硬约束不在本 Skill 重复定义，以 `feishu-doc-extractor` 及其校验脚本为准；本 Skill 只负责“一文档一 Subagent”、主 Agent 终审、整改回派和 init Exit Gate。

### Step 0.1–0.2: 读取需求并创建任务空间

按 [input-workspace-and-repo.md](references/input-workspace-and-repo.md) 完成字段级文档线索提取、类型判断、当前目录内 workspace 创建和 `.trae` Git 工作区准备。

### Step 0.3: 保存 context

至少生成：

- `context/meego-summary.md` - 需求基础事实与文档线索
- `context/repo-routing.md` - 仓库判断依据、主仓库、候选仓库和高相关代码路径
- `context/prd-source.md` - `feishu-doc-extractor` 生成的最终 PRD 报告（必须保留，作为后续所有阶段的权威需求来源）
- `context/prd-source/` - `feishu-doc-extractor` 生成的 PRD 同名资源目录
- `context/tech-doc-raw.md` - `feishu-doc-extractor` 生成的最终技术文档报告（如存在技术文档）
- `context/tech-doc-raw/` - `feishu-doc-extractor` 生成的技术文档同名资源目录（如存在技术文档）

其中 `context/meego-summary.md` 的“文档与线索”部分必须遵守以下规则：

- 文档链接按“链接去重”输出，禁止因为多个节点挂载同一 URL 就逐行重复写出同一份 PRD、技术文档或 LR 链接。
- 同一链接若在多个节点出现，必须聚合为一条记录，并附带 `出现节点：节点A、节点B...`。
- 优先保留“文档类型 / 字段名 + 唯一链接 + 出现节点”的结构；禁止只按“节点 / 字段 / 链接”原样平铺，导致同一链接重复出现。
- 若同一链接既出现在工作项基础字段，又出现在节点表单字段中，也应在 `meego-summary.md` 中合并为一条线索，不得重复罗列。

建议继续补充：

- `context/prd-notes.md` - 初始化阶段记录 PRD 补充笔记、歧义和待确认项；Ask First 后应转为用户决策详情记录
- `context/tech-design.md` - 技术设计方案
- `context/change-plan.md` - 实现拆解、依赖、风险、验证策略

### Step 0.3.0: 读取并准备技术文档

在完成 `prd-source.md` 后，必须继续准备技术文档，来源优先级如下：

1. 当前任务空间已有的 `context/` 目录
2. Meego 评论区 / 节点详情 / 关联线索中提取到的技术文档链接
3. PRD 原文中引用的技术文档、API 文档、后端设计文档
4. 用户显式补充的技术文档链接

执行要求：

- 优先复用 `context/` 中已有技术文档，并在 `meego-summary.md` 记录来源。不存在本地文档但发现飞书链接时，必须在 init-workspace 阶段按 Step 0.3.1 为该文档派发专属 Subagent 完成抽取。
- 文档链接按“首个非空值”提取；`null`、空字符串和空数组均为空。先按字段级证据分类为 `PRD`、`技术文档`、`测试文档`、`评审材料`、`风险评估`、`LR内容`、`补充说明` 或 `未确认类型`，不得通过 URL 顺序、全文 grep 或外观猜测类型。
- 只有“字段名语义 + 所在节点语义 + 文档标题或内容”一致时，才把链接作为对应类型的输入。否则在 `meego-summary.md` 记录为 `doc_candidate_unconfirmed`，保留来源节点、字段名、字段 key、链接和未确认原因。
- 确认技术文档后，按 Step 0.3.1 以 `artifact_base=tech-doc-raw` 抽取，最终报告和同名资源目录分别落到 `context/tech-doc-raw.md` 与 `context/tech-doc-raw/`。
- 抽取或主 Agent 审核失败时，回派原 Subagent；只有命中不可自动恢复异常时，才在 `prd-notes.md` 或 `meego-summary.md` 记录状态、失败原因、审核轮次、最后一次 Gate 输出和输出位置。所有来源均未发现技术文档链接时，写 `tech_doc_or_none`。

不可恢复判定完全引用 `feishu-doc-extractor` 的 `Recovery Classification`，本 Skill 不维护第二套白名单。Subagent 必须返回原始错误证据，主 Agent 复核后才能把文档标记为 `unrecoverable`。

### Step 0.3.1: Subagent 抽取与主 Agent 终审

`meego-init-workspace` 是文档任务控制器。允许的状态迁移只有 `init_running → document_subagent_running → main_review → document_terminal → init_exit_check → final`；禁止从 Subagent 返回、`partial`、`recoverable` 或任一 Gate 缺口直接进入 `document_terminal`、`init_exit_check` 或 `final`。

#### 1. 建立文档 Subagent

读取共同输出根目录的 `completion_matrix.json`，枚举全部已确认交付输入文档。为每个文档创建且只创建一个 Subagent，并固定以下信息：`document_name`、`document_url`、`document_type`、`artifact_base`、`report_path`、`resources_path`、`subagent_id`、`review_round`。

- PRD Subagent 只处理 `artifact_base=prd-source`，任务描述必须显式写明 PRD 文档名称、输出报告路径 `context/prd-source.md`、输出资源目录 `context/prd-source/`。
- 技术文档 Subagent 只处理 `artifact_base=tech-doc-raw`，任务描述必须显式写明技术文档名称、输出报告路径 `context/tech-doc-raw.md`、输出资源目录 `context/tech-doc-raw/`。
- 其他文档各自使用独立稳定 base 和独立 Subagent。
- 不同文档可在并发额度允许时并行处理；同一文档禁止并发抽取或由多个 Subagent 交叉修改。

#### 2. Subagent 执行完整 Extractor 工作流

给 Subagent 的任务必须明确要求先完整读取 `feishu-doc-extractor/SKILL.md`，从 Preflight 开始执行完整工作流，把 raw、媒体、评论、白板缩略图、节点 JSON、节点图片、manifest 和独立白板分析写入指定同名目录。资源齐全且 Evidence Gate 通过后，Subagent 必须只用 `compose-report-body.mjs` 生成最终报告，再完成评论语义回填并运行 Report Gate。Subagent 返回时必须提供：产物路径、资源数量、两个 Gate 的真实退出码、报告生成命令和完整错误列表；不得只回复“已完成”。

#### 3. 主 Agent 独立审核报告

Subagent 返回后，主 Agent 必须亲自读取报告、`fetch_doc_content.md`、关键 manifest、全部白板分析和 Gate 输出，完成以下审核。具体报告格式、评论定位、白板分析章节和 forbidden content 以 `feishu-doc-extractor` 当前 `report-format.md`、`whiteboard-analysis.md` 和校验脚本为准；本 Skill 不维护第二套字段模板。

1. **正文与资源完整性**：确认报告由 `compose-report-body.mjs` 生成，只有 `# 文档概述`、`# 正文`、`# 验收检查` 三个一级模块；`# 正文` 基于 `raw/fetch_doc_content.md` 脚本化改写，媒体和附件是真实文件并位于原语义位置，评论按 `comments_manifest.json` 唯一回填。
2. **白板完整性**：逐个核对正文 whiteboard token、真实缩略图、非空节点 JSON、节点图片、`whiteboard_manifest.json`、独立分析和关联评论；报告正文中的白板只需保留 token、缩略图和详细分析链接，节点图片必须在对应分析文件中逐项引用；不能只看白板索引或 manifest PASS。
3. **白板与正文逻辑**：确认白板轻量占位位于对应段落、表格单元格或列表项附近；独立分析中的 `上下文`、`结论摘要`、`节点证据`、`图片节点`、`填充 / 高亮 / 标注分析` 能支撑周边正文、表格行列、业务结论和重点标注。表格内白板应通过脚本占位和分析链接实现可回溯，不要求在正文单元格展开旧版 `对应点` / `关系说明` 字段。
4. **排版验收**：确认一级结构、标题层级、普通正文无四空格代码块、同级标题不重复、列表合法、源表格与 `table_conversions` 一一对应、表格图片仍在原单元格、正文无补丁式章节，且相对链接和 forbidden content 符合 `report-format.md`。`# 验收检查` 只能是脚本生成的证据区，不得手写 PASS/FAIL、complete/partial/failed。任一项不符合时 `layout_review=FAIL`，必须回派原 Subagent。
5. **独立 Gate**：使用 extractor Preflight 选定的 `SCRIPT_NODE_BIN` 重新运行 Evidence Gate 与 Report Gate，不复用 Subagent 对退出码的口头结论。

主 Agent 将审核结果写回 `completion_matrix.json`，至少更新 `subagent_gate_status`、`main_review_status`、`layout_review`、`whiteboard_review`、`acceptance_links_review`、`review_round`、`next_action`。

#### 4. 不通过时回派原 Subagent

任一项不通过时，主 Agent 必须向该文档 Subagent 发送 follow-up 整改任务，逐条提供 Gate 错误、正文缺口、白板缺口和排版问题，并要求继续使用同一 `artifact_base` 修复和重跑。不得由主 Agent 用摘要、占位资源或手写 PASS 代替整改。

Subagent 修复后重新返回第 3 步审核，循环直到：两个 Gate 均通过且主 Agent 的正文、白板、排版、验收证据链接审核均为 PASS；或命中 extractor 有证据的不可恢复白名单。多文档任务逐个闭环，例如 `prd-source` 通过但 `tech-doc-raw` 未通过时，init 整体仍为 `running`。

可继续执行不依赖文档完整性的目录创建或仓库同步，但进入 Step 0.6、Exit Gate、`输出` 或阶段切换前，必须完成上述循环。缺口数量多、同一错误重复出现、MCP 返回 inline / persisted-output / 临时文件都不能改变该判定。


### Step 0.3.2: 同步团队上下文

按 [input-workspace-and-repo.md](references/input-workspace-and-repo.md) 将团队仓库同步到 `.trae/`，保留 `.git`、remote、branch、commit history 和本地改动。

### 关于 `prd-source.md` 的规则

`context/prd-source.md` 必须在 init-workspace 阶段生成，是后续 brainstorm / plan / implement 的唯一权威需求来源。摘要、笔记或后续回答与 `prd-source.md` 冲突时，以 `prd-source.md` 为准；引用 PRD 内容时标注“来源：prd-source.md”。

历史兼容说明：旧 workspace 若残留 `context/prd-raw.md`，只允许 `/delivery:init` 在导入阶段把它兼容映射为 artifacts `prd-source.md`；新的 init-workspace 输出仍必须继续写 `context/prd-source.md`，不得把 `prd-raw.md` 重新作为标准输出名。

历史兼容说明：旧 workspace 若残留 `context/prd-raw.md`，只允许 `/delivery:init` 在导入阶段把它兼容映射为 artifacts `prd-source.md`；新的 init-workspace 输出仍必须继续写 `context/prd-source.md`，不得把 `prd-raw.md` 重新作为标准输出名。

#### 写入内容

- 若 PRD 来源为飞书 / Lark 文档，按 Step 0.3.1 以 `artifact_base=prd-source` 抽取；Gate 和主 Agent 审核通过后，将最终报告和同名资源目录分别放到 `context/prd-source.md` 与 `context/prd-source/`。
- 若 PRD 来源为 Meego 评论区或节点描述，按时间顺序或逻辑顺序保留原始文本。
- 若 PRD 来源为用户直接提供的文本，原文照搬写入。
- `prd-source.md` 不做摘要、改写或删减；歧义和缺失项初始化时可写入 `context/prd-notes.md`，Ask First 完成后由用户决策详情覆盖或接管。

#### 飞书文档完成记录

- 飞书文档完成判定统一走 Step 0.3.1 和 Exit Gate；本节只记录落盘要求，不维护第二套抽取规则。
- `meego-summary.md` 记录文档类型、来源 URL、`artifact_base`、专属 `subagent_id`、审核轮次、最终报告路径、资源目录路径、Subagent Gate、主 Agent 正文/白板/排版审核状态和失败项。
- 判断 Evidence Gate / Report Gate 能否运行时，必须使用 `<HARD-GATE>` 和 `feishu-doc-extractor` Preflight 得到的 `SCRIPT_NODE_BIN` 执行本地脚本；当前 shell 裸 `node` 不可用不得作为跳过门禁或声明 `partial` 的理由。
- PRD、技术文档和其他飞书文档均遵守同一规则；差异仅限命名和 context 输出位置。


### Step 0.4–0.5: 路由并拉取目标仓库

按 [input-workspace-and-repo.md](references/input-workspace-and-repo.md) 形成 `context/repo-routing.md`，并把目标仓库放入当前任务空间的 `repos/`。

### Step 0.6: 验证初始化结果

至少确认：

- 任务空间目录已创建
- `context/` 文件已写入
- 技术文档已完成“已获取 / 未获取”判断，并写入 `context/`
- `repos/<repo-name>/` 已存在
- 仓库工作树已可用
- 记录当前默认分支和 remote 信息（如有必要）
- `.trae/` 已存在且是 Git 仓库
- `.trae/.git` 已保留
- 远端上下文已完成 Git 同步
- `git -C .trae status --short` 已检查，本地变更状态已明确
- 飞书文档抽取已记录 `selected_transport`、认证结果、写入探测和用于运行本地脚本的 `SCRIPT_NODE_BIN`；`preflight.json` 与实际 Gate 命令使用的 Node bin 一致
- `completion_matrix.json` 已覆盖全部已确认交付输入文档，每条记录均包含 `document_name`、`document_url`、`document_type`、`artifact_base`、`report_path`、`resources_path` 和唯一 `subagent_id`，不存在同一 Subagent 混合多个文档或同一文档绑定多个 Subagent
- 每个文档的 `subagent_gate_status`、`main_review_status`、`layout_review`、`whiteboard_review`、`acceptance_links_review` 均已记录，且不存在 `partial`、`recoverable`、`running`、`FAIL` 或 `NOT_RUN`；若为 `unrecoverable`，必须有原始失败证据、恢复分类和人工动作记录
- 每个发生过补跑的 artifact 均有 `rerun_ledger.json`，最后一条记录与当前 Gate 退出码一致

### Step 0.6.1: Exit Gate

在向用户输出最终结果前，必须写出并执行 Exit Gate 判定。Exit Gate 是阻断条件，不是总结模板；任一“可补齐缺口”存在时，本阶段不得结束。

| 检查项 | 通过条件 | 失败时动作 |
| --- | --- | --- |
| Subagent Skill Gate | 每个文档 Subagent 均按 `feishu-doc-extractor` 完整工作流通过 Evidence Gate 与 Report Gate，或有证据命中 `unrecoverable` | 保持 init 状态为 `running`，把 Gate 错误回派原 Subagent，禁止使用 workspace 普通完成标准收尾 |
| 主 Agent 独立审核 | 每个文档的 `main_review_status`、`layout_review`、`whiteboard_review`、`acceptance_links_review` 均为 PASS，报告为脚本生成的三模块结构，验收区链接可复核，全部评论分页、白板缩略图、节点 JSON、分析文档和节点图片均可从报告或独立分析追溯，且主 Agent 已独立运行两个 Gate | 主 Agent 形成逐项整改清单并 follow-up 原 Subagent；修复后重新审核，不得接受 Subagent 自报 PASS |
| 完成矩阵 | `completion_matrix.json` 覆盖全部已确认交付输入文档，且不存在 `partial` / `recoverable` / `running` / `FAIL` / `NOT_RUN` | 按矩阵 `next_action` 回派原 Subagent 继续处理对应同名 `artifact_base`，不得 final |
| PRD 状态 | `prd-source` 的两个 Gate 与主 Agent 审核均通过，或 PRD 明确不存在且有字段级证据 | 若缺 manifest、评论、白板、媒体、正文或排版不合格，把清单回派 PRD 原 Subagent |
| 技术文档状态 | `tech-doc-raw` 的两个 Gate 与主 Agent 审核均通过，或所有来源均未发现技术文档并记录 `tech_doc_or_none` | 若已确认技术文档但未通过，回派技术文档原 Subagent 继续处理同一 `artifact_base=tech-doc-raw` |
| 恢复分类 | 所有未通过项均按 extractor `Recovery Classification` 复核；`unrecoverable` 有原始错误证据 | 可恢复项回派原 Subagent；不可恢复项记录审核轮次、最后 Gate 输出和人工动作 |

禁止把以下情况判定为 Exit Gate 通过：任务空间已创建、repo 已拉取、raw 证据或部分媒体已就位、当前 artifact 已存在、已有 partial 报告、已有 partial 原因记录、裸 `node` 不可用、只差 manifest、白板节点 JSON 尚未归档、评论以后再回填、正文尚未无损重建、`.trae/` 存在未提交改动。


## 输出

只有 Exit Gate 通过后，才按 [output-and-troubleshooting.md](references/output-and-troubleshooting.md) 汇报任务空间、文档、Gate、主审、仓库和后续阶段；存在可恢复缺口时不得输出完成结果。
