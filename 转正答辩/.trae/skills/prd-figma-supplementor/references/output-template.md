# 输出模板

本文件只定义 `prd-figma-supplement.md` 的推荐结构。

- 执行顺序与门禁：`execution-and-gates.md`
- Atlas 发现规则：`figma-atlas-and-discovery.md`
- 缓存、证据包和产物边界：`contracts-and-artifacts.md`

## `prd-figma-supplement.md` 推荐结构

统一使用单文件输出。如果 PRD 范围覆盖多个独立页面或子视图，就按页面拆分分节。

```md
# <需求名称> - PRD Figma 补充

## 页面总览
| page / child view | page_top_node | main state status | key gaps |
|---|---|---|---|

## 候选节点评分
| candidate | matched clues | score | decision |
|---|---|---:|---|

## Direct Node Targets
| target_id | source | nodeId | intended UI state | decision |
|---|---|---|---|---|

## Sibling Overlay Scan
| state | parent node | background sibling | modal/content sibling | decision |
|---|---|---|---|---|

## Figma Atlas Coverage Matrix
| atlas unit | type | nodeId | screenshot | PRD hit | conclusion | gap |
|---|---|---|---|---|---|---|

## Visual Tile Index
| tile_id | screenshot | visible region | likely node / state | node backtrace | action |
|---|---|---|---|---|---|

## Requirement-to-Atlas Coverage
| requirement / UI state | atlas candidates | selected node / subregion | evidence_id | status | next action |
|---|---|---|---|---|---|

## <页面A>
### 统一补充事实

### 显示语义事实

### Figma Component Refactor Index

### PRD 待补项 / Figma 待确权

### 最小嵌入上下文

### 整体层级图

### 条件渲染图

### Plan 交接说明
```

## 页面级最低要求

每个页面或子视图分节至少应记录：

- `page_top_node`
- entry-node to page-top-node relationship
- in-scope vs out-of-scope direct children
- 如果目标是嵌在父页面壳里的子视图，要补最小嵌入上下文
- independent sibling blocks or overlay containers
- table/list split when applicable: `primary controls / actions / content / pagination`
- tab or switcher body and whether options map to separate views
- forced container types such as `Drawer`, `Modal`, `Popover`, `Tooltip`
- 会影响实现范围的条件渲染线索

## 显示语义事实

只有当 PRD 依赖“可见语义”而不是原始字段名时，才需要这一节。

典型例子：

- 动态列或状态列
- tag、badge、状态点、icon+text 单元格
- 布尔或枚举值被渲染成非字面文案
- 空态、链接态、tooltip、示例值或高亮语义

最小表结构：

| figma_node_id | visible field/copy | example value | display shape | style clue | PRD mapping | note |
|---|---|---|---|---|---|---|

## Figma 组件改造索引

每个页面用一张表。这是后续 Plan 直接消费的交接面。

| level | UI region / component | Figma fact | structural change | style/state clue | downstream task impact | evidence | status |
|---|---|---|---|---|---|---|---|

`level` 只能是：`global`、`region`、`component`、`table`、`state`、`style`。

## 结构图要求

如果范围包含以下任一情况，就要补 `整体层级图` 和 `条件渲染图`：

- 整页结构改造
- 顶层页面切换
- Tab 或 switcher 视图切换
- 嵌入式子视图

如果条件渲染已经在层级图里表达完整，就写一句“已并入整体层级图”，不必再单独画一节。

## Plan 交接说明

每个页面都应记录：

- 哪些事实已经完整到可直接被 Plan 消费
- 哪些点在 Figma 中仍然阻塞或未确权
- 哪些改造索引行必须流入后续的 `Figma / UI 改造清单`

## 拆分规则

当 PRD 同时覆盖多个独立页面或子视图时：

- 保持独立页面分节
- 每个页面各自维护事实和改造索引
- 不要把不同页面的列、Tab 或 overlay 混进同一张表

## 常见错误模式

- 只用了父 overlay 截图，却没有单列具备独立验收价值的 subregion
- 只看到 Tab 文案，就假设激活态内容已经确认
- 只写“有表格”，却没有确认表头或可见示例
- 把 screenshot-only 线索当成已确认的节点级事实
- 把父页面壳 chrome 混进嵌入式子视图合同
