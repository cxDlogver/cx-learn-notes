# 执行与门禁

本文件只定义执行顺序、阻塞处理和门禁判定。

- 发现策略：`figma-atlas-and-discovery.md`
- 缓存、证据包和产物边界：`contracts-and-artifacts.md`
- 补充文档结构：`output-template.md`

## 执行主流程

按以下顺序执行：

1. 解析输入来源：fileKey、入口 nodeId、direct node URL、PRD 页面、目标状态、legacy 需求。
2. 读取 MCP descriptor，确认实际可调用能力。
3. 建立 Atlas 广度索引。
4. 导出 visual tiles。
5. 建立 `Requirement-to-Atlas` 映射。
6. 以 depth 3-5 读取入口链路。
7. 检查每个核心页面 / 状态是否达到证据下限。
8. 只针对未闭合缺口按固定搜索顺序升级。
9. 每个未闭合状态只深扫最高置信的 1-3 个候选。
10. 回写产物并执行门禁自检。

## TOOL_BLOCKED 规则

如果当前执行者实际上无法调用所需的 Figma MCP 工具：

- 返回 `TOOL_BLOCKED`
- 记录 descriptor 路径和已解析出的 fileKey/nodeId
- 明确需要由具备 MCP 能力的 `prd-analyzer` 继续
- 不要假装主 Agent 可以手工替代同等级证据

至少输出以下阻塞格式：

```md
## Figma Tool Blocked
- missing tool:
- descriptor read:
- parsed fileKey / nodeId:
- required MCP-capable follow-up:
  1. Atlas shallow scan
  2. node read
  3. screenshot export
- stage must not continue
```

## 起步预算

预算只是起步值，不是硬停止线。

| 场景 | 起步预算 |
|---|---|
| 单页面或单子视图 | 1 entry deep read + 1-2 candidate deep reads + 1-2 screenshots |
| table-heavy page | 1 table-parent read + 1 table screenshot |
| modal/drawer case | direct node read + parent/sibling read + 1 screenshot |

如果门禁仍未闭合，应继续做定向升级，而不是因为起步预算用完就停止。

## 证据下限

每个范围内的核心页面 / 状态都必须具备：

- 来源追溯
- 节点树证据
- 截图或等价的 legacy baseline
- 明确结论：`confirmed`、`reference-only`、`candidate`、`legacy-baseline` 或 `P0_BLOCKER`

缺一项就表示该状态未闭合。

## 门禁表

使用以下门禁：

| gate | requirement |
|---|---|
| G1 | 已解析 fileKey 和入口 nodeId |
| G2 | 已读取 MCP descriptor 并确认实际能力 |
| G3 | 已执行入口 node 读取 |
| G4 | 已有候选节点评分，且深扫范围受控 |
| G5 | 事实已按页面或子视图拆分 |
| G6 | 每个核心页面都有 page-top-node 判定 |
| G7 | 涉及表格 / 列表时，已深扫父容器 |
| G8 | 涉及列表头 / 分页确认时，已导出截图 |
| G9 | 涉及筛选区 / 工具栏 / 操作区 / 内容区时，已确认区域顺序 |
| G10 | 范围内的 modal / drawer / popover / confirm 容器证据已闭合 |
| G11 | 已有可追溯的组件改造索引 |
| G12 | 缺失的核心页面或状态已正确标记为 blocker |
| G13 | 每个 `FIGMA_MAIN_STATE_CONFIRMED` 页面都满足证据下限 |
| G14 | Tab / switcher / business-domain 选项都有状态证据或 blocker 状态 |
| G15 | PRD 要求的 UI 状态都已深扫、阻塞或明确 out of scope |
| G16 | 已建立 Atlas 清单 |
| G17 | 已建立 visual tiles 和回溯链 |
| G18 | 当前范围的 requirement-to-Atlas 映射已足够完整 |

## 门禁判定规则

- 任一阻塞性 gate 失败，都不能写 `PASS`。
- `G3 = TOOL_BLOCKED` 表示本阶段必须停止。
- `G13 = FAIL` 表示该页面不能标记为 `FIGMA_MAIN_STATE_CONFIRMED`。
- `G14 = FAIL` 表示 Plan 不得为这些切换态生成实现任务。
- `G15 = FAIL` 表示不得进入 `/delivery:plan`。
- `G16-G18 = FAIL` 表示不能声称已完成多页面 Figma 覆盖。

## P0 规则

如果范围内 UI 状态缺少证据，且该缺口会影响页面骨架、Tab/业务域切换、弹层容器类型、按钮顺序、表格结构、筛选结构或 legacy 保留判断，就应视为硬阻塞。

不要把这类缺口降级成：

- `P1_RISK`
- `PLAN_DISCOVERY`
- “can check later in plan”

## 返工规则

补缺口时：

- 增量更新产物
- 除非结构真的改变，否则不要重写整份 supplement
- 尽量保持 cache、evidence id 和追溯链稳定

拿不准时，优先补现有证据并重跑门禁，不要在没有明确目标的情况下继续扩大扫描范围。
