---
name: figma-screenshot-restoration
description: Use when a Figma screenshot node, PRD screenshot, or image-only design reference must be restored into editable Figma UI, with strict screenshot alignment, requirement-focused visual fidelity, visual asset/icon inventory, materialized evidence, saved node/style snapshots, and mandatory fresh subagent acceptance.
---

# Figma Screenshot Restoration

## Purpose

将 Figma 截图层、PRD 截图或图片式设计参考，还原成对应 Figma 文件中的可编辑 UI 设计。

本 skill 的目标不是“画一个大概相似的页面”，而是建立可编辑、可验收、可继续交付的 Figma 设计结构：

- 与截图中的重点需求区域进行完整 UI 对齐和视觉对齐。
- 与 PRD 原文中的需求点保持一致。
- 对与需求无关的背景、示例数据、低价值装饰允许降低细节。
- 对与需求相关的文案、字体、颜色、层级、父子关系、兄弟关系、间距、重叠问题必须严格核验。
- 对与需求相关的 icon、图片、状态标记、信息提示图标、空态 / 错误态资产必须作为 `visual_asset` 单独登记和验收。
- 截图层只能提供可见事实，不能保证 100% 结构还原；无法从截图确认的细节必须标记为 `SOURCE_LIMITATION` 或从同文件 Figma 节点 / 组件库邻近节点补证。

## When To Use

命中以下任一情况时使用：

- 用户要求“把截图还原到 Figma”“PRD 截图还原成 Figma UI”“截图层变成可编辑设计稿”。
- Figma 中目标节点是 `RECTANGLE(image fill)`、图片层、整图截图、无法读取真实子节点。
- 现有 Figma 缺少需求相关状态，只能从截图、PRD 原文和 PRD 阶段 Figma 产物推断 UI。
- 需要在 Figma 中创建或修复可编辑 UI，并要求与截图做字体、颜色、间距、层级、子元素、兄弟元素、布局重叠检查。

不要用于：

- 仅做 PRD 解析，不需要修改 Figma。
- 仅做代码实现或运行态页面验收。
- 仅整理列表列契约，且不需要截图还原。

## Mandatory Input Boundary

本 skill 的输入只允许来自以下来源：

- PRD 原文或原始材料：
  - `prd-source.md`
  - `prd-source/**`
  - 用户直接提供的 PRD 原文
  - 用户直接提供的截图路径或 Figma nodeId
- PRD 阶段已经产出的 Figma 相关产物：
  - `prd-figma-supplement.md`
  - `figma-evidence-pack.md`
  - `figma-cache/**`
  - 已物化到本地的 Figma node screenshot / atlas crop / source screenshot 文件

## Artifact Location

所有中间文件、截图、节点快照、验收报告和最终输出，必须保存到当前任务的 Figma 产物目录下。

推荐目录：

```text
<task-artifacts>/figma-cache/restoration/<restoration_id>/
```

其中 `<task-artifacts>` 是包含 `prd-figma-supplement.md`、`figma-evidence-pack.md`、`figma-cache/` 的目录。

推荐文件结构：

```text
figma-cache/restoration/<restoration_id>/
  00-input-index.md
  01-focus-requirements.json
  02-source-screenshot.png
  03-source-materialization.json
  04-target-node-before.json
  05-restoration-contract.md
  06-visual-asset-inventory.json
  rounds/
    round-01/
      restored-node-screenshot.png
      restored-node-style-snapshot.json
      restored-node-counts.json
      hierarchy-snapshot.json
      overlap-check.json
      visual-asset-check.json
      main-agent-change-log.md
      subagent-acceptance.md
    round-02/
      ...
  final/
    restored-node-screenshot.png
    restored-node-style-snapshot.json
    restored-node-counts.json
    hierarchy-snapshot.json
    overlap-check.json
    visual-asset-check.json
    final-acceptance.md
    final-summary.md
```

主 Agent 每完成一轮 Figma 修改，都必须实时保存该轮的：

- 还原后截图。
- UI 还原节点的样式节点数据。
- 节点数量统计。
- 层级快照。
- 重叠检测结果。
- visual asset / icon / image-layer 检查结果。
- 变更记录。

## Core Principles

1. 先对齐截图，再解释差异。
   - 不得用“设计系统默认样式”覆盖截图中可见的需求相关样式。
   - 对需求相关区域，截图事实优先于口头印象。

2. 需求相关元素必须精确。
   - 文案、按钮顺序、表格列、提示位置、状态色、禁用态、操作区必须按截图和 PRD 原文闭合。
   - 与需求无关的背景内容可以低保真，但必须明确标注为 out-of-scope / low-fidelity。

3. 颜色必须按截图可见事实对齐。
   - 元素背景色、字体颜色、边框颜色、状态色、icon 颜色必须尽量使用截图可见颜色。
   - 若无法直接读取截图像素 token，必须通过 Figma 文件内相同语义节点或组件库邻近节点匹配，并记录来源。

4. 字体必须显式验收。
   - 字体类型、字体大小、字重、行高、颜色必须进入验收清单。
   - 字体和字体大小优先参考同一 Figma 文件中已有的相似文本节点。
   - 如果截图层无法读取真实 font token，必须记录限制，并用同文件最接近字体族统一。

5. 结构必须可编辑。
   - 不得用一张大图伪装还原完成。
   - 与需求相关的区域必须拆成可选择的 Figma 节点。
   - 复层元素必须保留父子关系，子元素必须挂在正确父节点下。

6. 兄弟元素和间距必须核验。
   - 上下左右顺序、x/y 坐标、宽高、gap、padding、row height、column width 必须与截图对齐。
   - Drawer / Modal / Table / Toolbar / Footer / Card 等容器必须检查兄弟元素关系。

7. 必须检查重叠。
   - 每轮还原后必须执行 bbox 重叠检测。
   - 发现需求相关元素重叠时不得进入最终验收。

8. 必须把小视觉资产当作合同。
   - info icon、warning icon、empty asset、status tag icon、button icon、avatar / cover / thumbnail、二维码 / 图片占位等，只要在需求相关区域可见，就必须进入 `06-visual-asset-inventory.json`。
   - 不得因为资产小、截图模糊、组件库默认样式相近，就省略资产节点或用纯文本替代。
   - 若截图无法判断具体 asset，只能记录 `SOURCE_LIMITATION`，并从同文件可追溯节点或组件库相邻节点补证；不能直接 PASS。

9. 证据必须本地物化。
   - 源截图、还原截图、节点快照、验收报告都必须是当前 artifacts 目录下可读文件。
   - 工具返回 inline preview、聊天图片、临时 viewId 或不可检索路径时，不能作为 closure evidence。
   - 若截图工具先保存到默认临时目录，必须把文件复制到 restoration 目录后再写入报告。

## Required Workflow

### 1. 建立输入索引

读取允许输入范围内的材料，输出 `00-input-index.md`，至少记录：

- PRD 原文路径或来源。
- 源截图路径或 Figma source nodeId。
- 目标 Figma fileKey。
- 目标 Figma target nodeId 或将要创建的新节点名。
- PRD 阶段 Figma 产物路径。
- 明确列出未读取和禁止读取的 PRD analyze / Plan / Code / Verify 产物。

### 2. 从 PRD 原文提取重点需求

输出 `01-focus-requirements.json`，推荐结构：

```json
{
  "restoration_id": "manual-submission-hit-state",
  "scope": "人工提报命中态",
  "must_align": [
    {
      "id": "REQ-001",
      "area": "奖励配置表格",
      "text": "命中【不激励】规则",
      "visual_requirements": ["红色行级提示", "位于视频/图文内容单元格下方"],
      "visual_assets": ["VA-001"],
      "priority": "P0"
    }
  ],
  "can_be_low_fidelity": [
    "非当前需求相关的左侧背景页面"
  ],
  "forbidden_assumptions": [
    "不得把旧文案覆盖 PRD 最新文案",
    "不得把截图层当作真实结构树"
  ]
}
```

### 3. 物化源截图 baseline

源可以是：

- Figma 截图层节点导出的图片。
- `figma-cache/images/**` 中已有截图。
- `prd-source/media/**` 中的 PRD 截图。

必须保存为 `02-source-screenshot.png`，并输出 `03-source-materialization.json`。不得只记录聊天里的图片预览、浏览器 viewId、临时截图 ref 或无法读取的外部路径。

`03-source-materialization.json` 至少包含：

```json
{
  "source_screenshot_path": "figma-cache/restoration/<restoration_id>/02-source-screenshot.png",
  "source_kind": "figma_node_export | figma_cache_image | prd_media | user_file",
  "materialization_type": "local_file",
  "size_bytes": 12345,
  "image_type": "png",
  "width": 1280,
  "height": 720,
  "sha256": "<hash>",
  "source_limitation": "N/A | low_resolution | cropped | image_layer_only | unclear_asset"
}
```

如果截图工具返回了图片预览但当前目录找不到文件，必须先检查工具约定的临时截图目录或重新导出；只有确认本地和临时目录都无法找到时，才可标记 `BLOCKED_SOURCE_LIMITATION`。

如果源节点是 Figma 节点，必须用 MCP 读取并记录：

- nodeId
- type
- width / height
- children count
- fills
- 是否为 image fill

### 4. 检查目标节点和备份

在修改 Figma 前必须：

- 读取目标 nodeId / node name。
- 保存 `04-target-node-before.json`。
- 在 Figma 中创建备份节点，或确认已有可回滚备份。
- 如果目标节点是用户指定节点，不得替换其他相似节点。

### 5. 建立还原合同

输出 `05-restoration-contract.md`，至少包含：

- 区域结构树。
- 需求相关元素列表。
- 文案合同。
- 字体 / 颜色 / 样式合同。
- 父子层级合同。
- 兄弟元素顺序和间距合同。
- 表格 / 列表列级合同。
- 允许低保真的区域。
- 必须禁显或不得残留的旧元素。
- visual asset / icon / image requirement 列表。
- 每个需求相关视觉事实的来源：`SCREENSHOT_VISIBLE` / `PRD_TEXT` / `FIGMA_NEIGHBOR_NODE` / `COMPONENT_LIBRARY_INFERRED` / `SOURCE_LIMITATION`。

同时输出 `06-visual-asset-inventory.json`：

```json
{
  "visual_assets": [
    {
      "asset_id": "VA-001",
      "name": "info icon",
      "required": true,
      "source": "SCREENSHOT_VISIBLE",
      "expected_location": "汇总提示条左侧",
      "expected_style": {
        "color": "blue info semantic",
        "size": "16x16"
      },
      "restored_node_path": "Alert-命中汇总提示/Icon-Info",
      "acceptance": "must_exist"
    }
  ],
  "source_limitations": []
}
```

### 6. 执行 Figma 还原

优先使用 `mcp_figma-mcp.use_figma`。

调用 MCP 工具前必须先读取对应工具 schema。`run_mcp` 参数必须写在 `args` 中。

Figma 写入要求：

- 字体写入前必须 `figma.loadFontAsync`。
- 复杂 UI 先建容器层级，再放子元素。
- 与需求相关的节点必须命名清楚，例如 `Toolbar-命中汇总与操作`、`Alert-命中汇总提示`、`Button-导出剔除明细`。
- 与需求相关的 asset 节点必须命名清楚，例如 `Icon-Info-汇总提示`、`Asset-Empty-State`、`Thumbnail-作品封面`。
- 截图层源只能作为视觉 baseline，不得直接作为完成态，除非用户明确要求替换回原截图。
- 如果必须从截图推断结构，必须在 `05-restoration-contract.md` 标记为 `INFERRED_FROM_SCREENSHOT`。
- 如果必须从截图推断 icon / asset，必须在 `06-visual-asset-inventory.json` 中记录推断依据和限制。

### 7. 每轮修改后实时保存节点数据

每一轮 Figma 修改后，主 Agent 必须导出并保存以下文件：

```text
rounds/round-XX/restored-node-screenshot.png
rounds/round-XX/restored-node-style-snapshot.json
rounds/round-XX/restored-node-counts.json
rounds/round-XX/hierarchy-snapshot.json
rounds/round-XX/overlap-check.json
rounds/round-XX/visual-asset-check.json
rounds/round-XX/main-agent-change-log.md
```

`restored-node-style-snapshot.json` 必须覆盖：

- 所有 TEXT 节点：
  - `id`
  - `name`
  - `characters`
  - `fontName`
  - `fontSize`
  - `fontWeight`
  - `lineHeight`
  - `fill`
  - `bbox`
  - `path`
- 所有容器 / 图形节点：
  - `id`
  - `name`
  - `type`
  - `fills`
  - `strokes`
  - `cornerRadius`
  - `effects`
  - `bbox`
  - `path`
- 关键层级：
  - parent id / name
  - children names
  - sibling order
- visual asset 节点：
  - `asset_id`
  - `node_id`
  - `name`
  - `type`
  - `bbox`
  - `fills`
  - `strokes`
  - `source`
  - `requirement_ref`

`restored-node-counts.json` 必须覆盖：

- total node count
- count by node type
- count by first-level section
- text node count
- frame/group/rectangle count
- table row count
- table cell count
- named requirement node count
- missing required node list
- required visual asset count
- missing required visual asset list
- image fill / bitmap node count

### 8. 主 Agent 自检

主 Agent 在派 subagent 前必须完成自检：

- 源截图是否可读。
- `03-source-materialization.json` 是否证明源截图已本地物化。
- 还原截图是否可读。
- 文案是否与 `01-focus-requirements.json` 对齐。
- 需求相关颜色是否已匹配。
- 字体类型、字号、字重、行高是否已记录。
- 父子层级是否符合 `05-restoration-contract.md`。
- 兄弟元素顺序和间距是否符合截图。
- 需求相关 icon / asset 是否存在、位置正确、样式或限制已记录。
- bbox 重叠是否为 0，或所有重叠都被标记为截图本身允许的视觉覆盖。

自检结果写入 `main-agent-change-log.md`。

## Mandatory Subagent Acceptance Loop

每个主 Agent 在完成一轮样式还原后，必须启动一个 subagent 进行验收。

这是硬要求：

- 必须启动 subagent。
- subagent 不接收主 Agent 的会话记录。
- `spawn_agent` 不得使用 `fork_turns: "all"`。
- 推荐完全省略 `fork_turns`，让 subagent 使用 fresh context。
- subagent 只做只读验收，不修改 Figma、不修改文件。
- subagent 只读取本地保存的截图、`01-focus-requirements.json`、`03-source-materialization.json`、`05-restoration-contract.md`、`06-visual-asset-inventory.json`、节点样式快照、节点数量统计、层级快照、重叠检测和 visual asset 检查结果。
- subagent 不得读取 `03-prd-analysis.md`、Plan / Code / Verify / Acceptance 产物，也不得依赖主会话里的口头结论。

推荐 subagent：

- 优先使用 `design-checker`。
- 如果没有可用的 design-checker，则使用具备截图和文件读取能力的默认 subagent，但仍必须 fresh context。

推荐派发消息模板见：

```text
.trae/skills/figma-screenshot-restoration/acceptance-subagent-prompt.md
```

subagent 必须输出：

```text
Gate: FULLY_ALIGNED | NEEDS_MODIFICATION | BLOCKED_SOURCE_LIMITATION

Scope:
- restoration_id
- source screenshot path
- restored screenshot path
- style snapshot path
- node counts path
- source materialization path
- visual asset inventory path
- visual asset check path

Requirement Alignment:
- PASS / FAIL items

Visual Alignment:
- font family / size / weight / line-height
- text color
- background / border / state color
- icon / visual asset / image-layer requirement
- spacing / bbox / sibling order
- parent-child structure
- overlap check

Blocking Differences:
- blocker_id
- expected
- actual
- evidence path
- node path or screenshot region
- suggested correction

Final Decision:
- 是否允许主 Agent 结束
```

### Loop Rule

如果 subagent 返回 `NEEDS_MODIFICATION`：

1. 主 Agent 必须读取 subagent 报告。
2. 主 Agent 必须进行下一轮 Figma 样式还原。
3. 主 Agent 必须再次保存 round 产物。
4. 主 Agent 必须再次启动 fresh subagent 验收。
5. 循环直到 subagent 返回 `FULLY_ALIGNED`。

如果 subagent 返回 `BLOCKED_SOURCE_LIMITATION`：

- 主 Agent 不得声称完成。
- 必须说明缺失的是截图清晰度、字体 token、原始图片、Figma 权限还是 MCP 能力。
- 必须向用户请求决策或记录不可消除的源限制。

不得因为轮次过多、时间不足或主 Agent 自认为已经接近而跳过 subagent PASS。

## Acceptance Criteria

最终只有满足以下条件才可结束：

- subagent 最后一轮 Gate 为 `FULLY_ALIGNED`。
- `final/` 目录下保存最终截图和最终节点快照。
- 源截图和最终截图都已本地物化，且路径可读。
- 需求重点全部 PASS。
- 文案完全一致，或差异有 PRD 最新文案依据。
- 字体类型、字号、字重、行高、颜色已明确验收。
- 所有 required visual asset / icon / image requirement 均 PASS；若 required asset 因源截图模糊、裁切或 token 不可推断而无法判断，必须走 `BLOCKED_SOURCE_LIMITATION` 或用户确认后的 known limitation，不能直接记为 `FULLY_ALIGNED`。
- 截图中需求相关元素颜色、字体颜色、边框色、背景色一致。
- 复层元素和子元素对齐。
- 兄弟元素左右上下顺序与截图一致。
- 间距、padding、gap、行高、列宽已检查。
- 不存在需求相关布局重叠。
- 不存在样式不匹配或子元素未对齐的 blocker。
- 所有产物都保存在 Figma 产物目录下。

## Required Final Response

最终回复用户时必须简明列出：

- 还原的 Figma nodeId。
- 源截图路径。
- 源截图物化记录路径。
- 最终还原截图路径。
- 最终节点快照路径。
- visual asset 检查路径。
- subagent 最后一轮验收报告路径。
- subagent Gate。
- 已知限制。

如果 Gate 不是 `FULLY_ALIGNED`，不得用“已完成”表述。
