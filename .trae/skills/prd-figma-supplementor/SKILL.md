---
name: "prd-figma-supplementor"
description: "Use when PRD requirements include Figma links or UI facts such as pages, tabs, tables, filters, buttons, states, examples, or display semantics that must be confirmed before planning."
---

# PRD Figma 补充器

## 拆分文档入口

本主文件只保留触发条件、角色边界和核心强制规则。长流程、门禁、合同和模板已正式下沉到 `references/`，执行时必须按任务重点按需读取，不得忽略。

- `references/execution-and-gates.md`
  - 执行顺序、起步预算、证据下限、门禁与 `TOOL_BLOCKED` 处理。
- `references/figma-atlas-and-discovery.md`
  - `Figma Atlas` 建立方式、visual tile 发现策略、升级顺序与 subregion 处理。
- `references/contracts-and-artifacts.md`
  - 缓存合同、证据包结构、manifest 追溯链、产物边界与消费约束。
- `references/output-template.md`
  - `prd-figma-supplement.md` 的推荐输出结构与页面级最低要求。

使用规则：

- 当任务重点是“怎么执行、什么时候阻塞、gate 怎么判”时，优先读取 `references/execution-and-gates.md`。
- 当任务重点是“怎么找 node、怎么建 atlas、怎么处理 modal / overlay / region”时，优先读取 `references/figma-atlas-and-discovery.md`。
- 当任务重点是“证据落哪里、怎么保证 cache_id -> path 可追溯”时，优先读取 `references/contracts-and-artifacts.md`。
- 当任务重点是“最终文档怎么组织、页面分节怎么写”时，优先读取 `references/output-template.md`。

若主文件与拆分文档出现重复描述，以拆分文档中的对应章节为准；新增规则应优先落到对应 `references/*.md`，避免继续把主文件膨胀成单体文档。

## 何时调用

在正式进入 Plan 阶段前，当出现以下任一情况时调用：

- PRD 提供了一个或多个 Figma 链接或 `node-id`
- PRD 需求点需要借助 Figma 才能补齐结构范围、页面区域或模块边界
- PRD 中存在列表、表格、筛选区、Tab、弹层、推荐区、说明区等 UI 区域，需要先做结构补全
- PRD 中存在动态列、状态列、标签列、链接态、缺失态、图标+文本态，需要先做可见语义补全
- PRD 存在 `0/1`、布尔外观、`options/display_name`、字段枚举不明确等情况，需要借助 Figma 纠正业务语义
- 后续 Plan 阶段需要直接消费完整的结构事实与显示语义事实，但当前 PRD 信息不足

仅当 PRD 没有 Figma 链接，且当前需求完全不依赖 UI 结构与可见语义补全时，才跳过本补充器。

## 核心定位

本 Skill 是 **Plan 前的事实补全器**，不是技术方案生成器。

它负责：

- 把 PRD 需求点映射到 Figma 页面、状态、子视图和关键 node。
- 把结构事实与显示语义事实统一沉淀到 `prd-figma-supplement.md`。
- 输出可被后续 Plan 直接消费的 `Figma 组件改造索引`。
- 标记哪些事实已 `confirmed`，哪些只是 `reference-only`、`candidate`、`legacy-baseline` 或 `P0_BLOCKER`。

它不负责：

- 直接生成 `04-tech-plan.md` 或 `tech-design.md`
- 直接做代码实现或样式还原
- 用截图肉眼结论覆盖结构树事实

## 核心强制规则

1. Figma 深扫是 PRD 阶段硬门禁。凡是会影响页面骨架、Tab/业务域切换、弹层容器、按钮顺序、表格结构、筛选结构、操作区或 legacy 保留判断的缺口，都不得后移到 Plan 阶段。
2. 如果 PRD、用户消息或评论给了 direct `node-id`，它就是最高优先级入口；必须做 direct node + parent/sibling overlay scan，不能只靠入口 node 或顶层浅扫推断。
3. 多页面、多状态、多弹层文件必须先建 `Figma Atlas`，再做定向深扫；禁止把入口 node 当成整份文件。
4. 嵌入式子视图必须以真实子视图主容器为 `page_top_node`；父页面壳只能保留最小嵌入上下文。
5. 统一事实必须按页面分节；禁止把多个页面、多个子视图或多个状态的结构/语义事实混写到一张总表。
6. 截图只能辅助确认，不得替代结构树和 TEXT 节点；若截图与结构树冲突，先复扫 node、parent 或 siblings。
7. 所有高置信结论都必须满足追溯链：`evidence_id -> cache_id -> cache path`。
8. 只要当前执行者没有 MCP 实调能力，就必须返回 `TOOL_BLOCKED` 并要求具备 MCP 能力的 `prd-analyzer` 继续；不得伪造同等级证据。

## 最小执行心智模型

执行时按这个顺序理解，不在主文件重复展开细节：

1. 先读 PRD 与 direct node 线索。
2. 确认 MCP 能力；无能力则 `TOOL_BLOCKED`。
3. 建立 Atlas、tiles 和 requirement map。
4. 对命中最高的页面 / 状态 / 容器做定向深扫与截图探测。
5. 将事实按页面沉淀到 supplement，将调用与缓存沉淀到 evidence pack 与 `figma-cache/`。
6. 用 gate 自检决定 `PASS / PASS_WITH_OPEN_ITEMS / BLOCKED / TOOL_BLOCKED`。

执行顺序、预算、门禁和停止条件以 `references/execution-and-gates.md` 为准。

## 输入与输出

### 输入前提

开始前至少拿到以下之一：

- PRD 原文或 PRD 链接
- 用户给出的 Figma URL / `node-id`
- 页面名、模块名、Tab 名、表格名、弹层标题等业务锚点

若 PRD 尚未拆出需求点，先按页面 / 模块 / 功能点做最小拆解，再进入本 Skill。

### 默认产物

- `prd-figma-supplement.md` 或 `context/prd-figma-supplement.md`
- `figma-evidence-pack.md` 或 `context/figma-evidence-pack.md`
- `figma-cache/` 或 `context/figma-cache/`

不再额外维护 `entity-map.md` 或 `display-semantic-map.md`。

### 后续消费边界

- `prd-figma-supplement.md`：Plan 的唯一事实输入层
- `figma-evidence-pack.md`：审计链和返工证据层
- `figma-cache/`：原始结构树、截图和调用缓存

后续 Plan 只能引用这些产物，不应再从对话或零散截图反推事实。

## 主文件保留的关键判断

### 什么必须被补齐

只要属于当前需求范围，就必须补齐或阻塞：

- 页面主态、子视图、active Tab / switcher option
- Drawer / Modal / Popover / Tooltip / Confirm
- 表格 / 列表的表头、示例值、操作列、分页、空态、禁用态
- 需要保留的 legacy 可见态
- `0/1`、标签、状态点、链接态、图标+文本等存在显示语义歧义的字段

### 什么可以不在本阶段闭合

- 纯接口字段、错误码、请求路径等后端合同问题
- 不进入本轮实现计划的像素级微调
- 已明确 out of scope 的非范围态，但必须显式登记

### 什么必须进组件改造索引

只要会影响 Plan / Code 拆解，就必须进入 `Figma 组件改造索引`：

- 页面全局层
- 区域结构层
- 组件结构层
- 表格结构层
- 状态与交互层
- 样式线索层

层级枚举和推荐表头以 `references/output-template.md` 为准。

## 失败与阻塞

出现以下任一情况，不能声称已完成 Figma 补全：

- 核心页面 / 状态没有达到证据下限
- 已知 direct node URL，但未做 direct node + parent/sibling scan
- 多页面文件未建立 Atlas 就直接下结论
- 表格只写“存在”，但表头 / 示例值 / 分页未确认
- active Tab 内容未确认，却把 Tab 文案当成已确权结构
- 执行者没有 MCP 实调能力，却没有返回 `TOOL_BLOCKED`

`TOOL_BLOCKED` 格式、gate 规则和 blocker 判定以 `references/execution-and-gates.md` 为准。

## 交接要求

完成后，主产物至少要让后续 Plan 能回答：

- 当前范围有哪些页面 / 子视图 / 状态
- 每个页面的 `page_top_node` 是什么
- 哪些容器类型被 Figma 强约束
- 哪些表格 / 列头 / 示例值已确认，哪些仍阻塞
- 哪些事实属于结构，哪些属于显示语义
- 哪些组件改造点必须流入 `Figma / UI 改造清单`

最终文档结构和页面级最低要求，统一以 `references/output-template.md` 为准。
