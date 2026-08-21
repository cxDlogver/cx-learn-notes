# Figma Atlas 与发现

## 适用范围

当当前 PRD 回合需要依赖 Figma 补齐结构证据时，尤其适用于以下场景：

- 多页面文件
- 多个 Tab 或业务域选项
- Drawer、Modal、Popover、Tooltip、Confirm 等弹层
- 表格或列表较重的页面
- 嵌在父页面壳里的子视图
- 截图可见、但还没有稳定节点映射的区域

## 核心规则

不要把入口 node 当成整份文件。先建立 `Figma Atlas`，再只对真正和当前 PRD 范围相关的最小节点做下钻。

本文件只定义发现策略。执行顺序、预算、证据下限和门禁判定请看 `execution-and-gates.md`。

## Atlas 必备产物

| artifact | purpose |
|---|---|
| `figma-cache/atlas/pages.md` | page、top-frame、子视图、overlay 清单 |
| `figma-cache/atlas/tiles.md` | 截图分区索引和节点回溯关系 |
| `figma-cache/atlas/requirements-map.md` | PRD 要求到 Atlas 的映射 |

## Atlas 发现规则

- 文件级浅扫必须枚举所有可见的 `CANVAS/PAGE` 及其 top-level frame。
- 入口 node 的扫描只能证明当前分支，不能代表整份文件。
- 名称或截图中出现 `Drawer`、`Modal`、`Popover`、`Tooltip`、`Confirm`、`详情`、`编辑`、`创建`、`空态`、`禁用`、`失败`、`展开` 时，必须登记成候选状态。
- PRD 中提到的页面名、Tab 选项、按钮、弹层标题、表格和状态文案，都必须在 `Requirement-to-Atlas Coverage` 中落一行，状态只能是 `matched`、`candidate`、`not-found` 或 `out-of-scope`。

## Visual Tile 规则

- 优先导出 page 或 top-frame 的总览截图。
- 对大画布，还要补导表格、筛选区、工具栏、drawer、modal、popover、空态和底部按钮区的局部截图。
- 截图文件名应包含 safe node id 和 purpose，例如 `571_5184-page-main.png` 或 `571_9999-modal-confirm.png`。
- 截图只是索引辅助。高置信事实仍然需要节点树支撑，否则必须显式标成 screenshot-only。

## Requirement-To-Atlas Coverage

使用这个表结构：

| requirement / UI state | PRD clue | atlas candidates | selected node / subregion | evidence_id | status | next action |
|---|---|---|---|---|---|---|

## 发现升级顺序

按以下固定顺序升级：

1. direct entry 或 direct node target
2. 同文件中的顶层平行状态
3. 通过 PRD 内嵌截图做反向索引
4. 对邻近 sibling 或 parent 候选做排除

不要把所有策略一起盲跑。只有上一层无法定位目标状态时，才升级到下一层。

## 子块 Region 规则

如果某个 subregion 没有干净的独立 node，但有独立验收价值，仍然要把它单独记成一个 region。

典型触发条件：

- 独立的高亮或颜色语义
- 局部 tooltip / hover / popover 交互
- 局部表格结构或滚动行为
- 明确的字段顺序或可见性约束
- 明确的负向要求，例如“不能显示旧区块”

处理要求：

- 复用已确认的父节点，不要虚构一个子节点
- 把 subregion 记成 `parentNodeId / subregion:<label>`
- 在 `Visual Tile Index` 里补上截图位置、可见签名或文本锚点
- 在 `prd-figma-supplement.md` 中把它写成独立事实

不要把这类内容折叠成“已经被父 frame 覆盖”。

## Sibling Overlay 协议

当 PRD、评论或用户消息提供了 direct node URL，或者 modal 内容与背景是 sibling 而不是父子关系时，使用这一协议。

### 固定步骤

1. 从 PRD、当前消息、评论和决策记录中收集所有 direct node URL。
2. 先读取 direct target node。
3. 再读取它的 parent，或最近一个包含 direct children 的 frame。
4. 扫描 siblings，重建 overlay 分组。
5. 优先把 modal/content sibling 当作状态节点，背景 sibling 只作为上下文。
6. 只有在检查完 direct target、parent 和 siblings 后，才能宣布“not found”。

### 最小表格

`Direct Node Targets`

| target_id | source | nodeId | URL | intended UI state | read status | decision |
|---|---|---|---|---|---|---|

`Sibling Overlay Scan`

| state | parent node | background sibling | modal/content sibling | evidence | decision |
|---|---|---|---|---|---|

## 嵌入式子视图边界

当目标是父页面壳里的真实子视图时：

- 把子视图主容器当作 `page_top_node`
- 让父页面壳上下文保持最小化
- 不要把站点导航、侧边栏或无关的父页面 chrome 混进结构事实
- `整体层级图` 和 `条件渲染图` 都从子视图入口开始画，不要从整站页面壳开始画

## 多页面拆分

如果 PRD 同时覆盖多个独立页面或子视图：

- 按页面拆分 supplement 事实
- 分别维护 page-top-node 判定
- 分别维护结构事实、显示语义事实和状态覆盖
- 不要把不同页面混进同一张总表

## 发现停止规则

一旦目标状态已经被定位到足以让执行层满足证据下限，就应该停止继续探索装饰性细节。

常见停止点：

- 主态节点和主要可见区域已经识别完成
- 必需的 sibling overlay 关系已经重建
- 相关表格、drawer、modal、popover 或子视图容器边界已经清楚

在可执行合同已经清楚之后，不要继续下钻图标、装饰层或背景图层。
