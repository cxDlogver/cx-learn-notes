---
name: list-figma-style-contract
description: Use when Figma evidence contains list or table UI, or when columns, cells, custom columns, selectedAttrs, headers, or row renderers must be fully specified before plan, code, or design validation.
---

# List Figma Style Contract

## Purpose

当输入包含列表型 Figma 页面、表格主态、明细表、Drawer 内表格、上传结果表或任何以 columns / cells / row renderers 为核心的 UI 时，本 skill 负责把零散的 Figma、截图、tech-doc、TCC 和字段配置，收敛成一份可执行的列表样式契约。

目标不是“描述页面大概长什么样”，而是产出可直接给 plan / code / design 使用的**列级样式总表**，避免 execute 阶段临时猜列、漏列、漏枚举、漏动态列 renderer。

它负责的是**列级与 execute 单一事实源**，不是页面骨架或整页交互合同：页面壳层继续由 `Figma Region Contract` 负责，交互继续由 `Figma Interaction Contract` 负责；只要列表样式总表已经完整承接该列表，execute 与 verify 都不应再为同一列表回头查 `Figma Cell Contract`。

## When To Use

命中以下任一信号就应触发：

- Figma 节点或截图中存在 table、list、columns、header、row、cell、pagination、custom columns。
- PRD / tech-doc / TCC / BAM / IDL 中存在表头、自定义列、selectedAttrs、dynamic attrs、导出字段。
- 用户要求“把列表样式整理出来”“把所有列的渲染方式补全”“给列表出 render contract / style table”。
- `04-tech-plan.md` 或 design-check 中已经出现列表区域，但列信息、badge 样式、复合 cell、动态列渲染还不完整。
- 需要回答“这个表头下面的数据怎么渲染”“这个 badge/tag 对应哪个节点”“动态列是否已有 renderer”。

不要用于：

- 纯页面骨架、纯按钮区、纯表单页，没有列表/表格容器。
- 只需确认单个按钮、单个 modal、单个 drawer 的结构，不涉及列级渲染。

## Mandatory Inputs

执行时必须优先读取能提供列来源的输入，至少覆盖以下来源中的可用项：

- 当前 workspace 下的 `04-tech-plan.md`
- 当前 workspace 下的 `prd-figma-supplement.md`
- 当前 workspace 下的 `figma-evidence-pack.md`
- 当前 workspace 下的 `figma-cache/manifest.md`
- 当前 workspace 下的 `tech-doc-raw.md`
- 当前 workspace 下的 `ui-source-map.md`
- Figma MCP 返回的目标 page / table / cell / tag 节点
- 相关截图缓存

如果 tech-doc / TCC / selectedAttrs 明确给了列来源，而输出没有覆盖这些字段，视为 skill 失败。

## Required Output

默认把结果写入当前 workspace 的 `04-tech-plan.md`，新增或更新一个独立章节，推荐标题：

- `## <页面名> 列表样式总表`
- 或 `## Scale 列表样式总表`

输出表至少包含以下列：

| 列分组 | 表头文案 | 字段 key / attr_key | 表头 nodeId | 数据 nodeId / 组件 nodeId | 关键子元素 / 数据渲染全集 | execute提取数据 | Code执行断言 | 空态 / 负向约束 | 来源 |
|---|---|---|---|---|---|---|---|---|---|

如果 `04-tech-plan.md` 同时保留 `Figma Cell Contract`，两者边界必须如下：

- 列表样式总表覆盖列表列全集、默认列 / 自定义列 / selectedAttrs、renderer 全量定义，以及 execute 直接需要的关键子元素、`execute提取数据`、`Code执行断言`。
- 对已经被列表样式总表完整承接的列表，不再重复维护等价的 `Figma Cell Contract`。
- `Figma Cell Contract` 只留给尚未拥有独立列表样式总表的非列表型关键单元格，或少数需要单独验收的非列表表格 / Drawer / 上传结果行。

## Column Completeness Rules

必须同时覆盖四类列：

1. 固定列
   - 如作者卡片、操作列、选择列、站外作者信息、站内对应抖音信息。
2. 默认列
   - 首屏默认显示列、默认 column registry。
3. 自定义列
   - custom columns 分组、动态列、按 selectedAttrs 注入的列。
4. 非首屏但可被请求返回的可见字段
   - 即使默认不展示，只要一旦可进入列配置，就必须定义 renderer 族。

不得因为字段“不在首屏截图中”就不写。

## Node Strategy

优先级固定如下：

1. 实例级 cell / badge / tag / text node
2. 组件级 node
3. 表格锚点 node + 组件集 node
4. 截图 + tech-doc / TCC 证据兜底

若拿不到实例级 leaf node：

- 允许输出表格锚点 nodeId；
- 必须同时写组件 nodeId 或组件集 nodeId；
- 必须把“渲染全集”写到足够 execute 直接实现的粒度；
- 不得因为拿不到 leaf node 就把整列降级成“待确认”。

## Render Taxonomy

每一列必须落到以下渲染类型之一，必要时可组合：

- 纯文本列
- 数值文本列
- 金额列
- 时长列
- 复合卡片列
- badge/tag 枚举列
- 多标签 group
- 文本 + 热区列
- 文本 + 次文本列
- icon + text 列
- link / 跳转热区列
- 操作列

如果某列存在多种可能值形态，`数据渲染全集` 必须把所有可能形态列全，例如：

- `is_inout_author`
  - `1 -> 绿色小标签`
  - `0 -> 黄色小标签`
  - unknown / null -> 灰色占位或 `-`
- 权限字段
  - `1 -> 正向 badge`
  - `0 -> 负向或中性 badge`
  - null -> `-`
- 作者信息字段
  - 昵称 + ID + badges
  - 昵称缺失
  - ID 缺失
  - 无跳转热区

## Negative Assertions

每列都必须至少写一个负向约束，典型包括：

- 不得裸露 `1/0`、`true/false`、raw enum code
- 不得把筛选 label 直接当作 cell value
- 不得把多个 badge 合并成裸文本
- 不得把站外字段和站内字段串列
- 不得因空值渲染假标签
- 不得因列不在首屏而缺少 renderer
- 不得残留旧列表列、旧 UID-only 列、旧 KA-only 列

## Execution Procedure

### 1. 确认列表边界

先确认当前分析对象是哪个列表：

- 页面主表格
- 子 Tab 表格
- Drawer 内表格
- 上传结果表
- 作者明细表

只要边界不同，就必须独立出样式总表，不把多个列表混在一张表。

### 2. 收集列来源全集

按以下顺序补齐列来源：

1. Figma 首屏可见列
2. Figma 相关 cell / badge / tag 组件
3. tech-doc / TCC 默认列
4. tech-doc / TCC 自定义列分组
5. selectedAttrs / 动态字段 / 导出字段

### 3. 建立列级映射

对每一列写清：

- 表头文案
- 字段 key / attr_key
- 表头 nodeId
- 数据 nodeId / 组件 nodeId
- 关键子元素 / 渲染全集
- execute提取数据
- Code执行断言
- 空态
- 禁显/负向约束
- 来源

### 4. 补齐枚举和动态列

对于 badge / tag / 布尔 / 状态列，必须把每种枚举的样式路径写清，不允许只写“标签样式待定”。

对于动态列，必须至少给出所属渲染族：

- 数值列
- 金额列
- 时长列
- badge 列
- 复合文本列

## Traversal Playbook

当列表型 Figma 不能一次返回完整 cell / leaf node 时，必须按下面的遍历打法推进，而不是停在“表格容器未展开”。

### 1. 先锁页面壳，再锁表格容器

遍历顺序固定为：

1. 页面主节点
2. 列表卡片 / 表格所在区域
3. 表格容器
4. 分页、toolbar、筛选区

目标是先确认：

- 这个表属于哪个页面或子视图
- 表格锚点 nodeId 是什么
- 列表边界是否和筛选区、toolbar、分页属于同一个表

如果表格 node 只返回容器，不返回首行 children，不算失败，继续下一步。

### 2. 表格 children 拿不到时，转找组件集

遇到以下情况时，必须从“实例遍历”切到“组件反查”：

- 表格 node 只返回 `表格` 容器
- 无法直接拿到首行 cell 节点
- 只能从截图看见 badge / tag / 复合卡片，但拿不到对应实例

切换后的优先顺序：

1. 从同一区域返回的 `components` / `componentSets` 中找可能的 tag、badge、table-body、avatar-card 组件
2. 优先匹配名称含义，如 `绿色/黄色/灰色/标签/数据/操作`
3. 逐个读取候选组件 node，确认 fill、radius、padding、gap

这一步的目标不是还原整行，而是先把**渲染族**锁住。

### 3. 用截图反推组件候选

当实例 node 不可得时，必须把截图作为反推输入：

- 先看该列是文本、数值、badge、复合卡片、操作列中的哪一类
- 再看同页截图里是否能辨认出颜色、圆角、大小、是否带 icon
- 最后去组件集中匹配最接近的组件

例如：

- 绿色小标签 -> 去组件集中找 `绿色` / `success` / `小-20px`
- 黄色小标签 -> 去找 `黄色` / `warning`
- 灰色兜底标签 -> 去找 `灰色`

如果截图能确认是 badge，但颜色 token 没完全读到，仍然可以先锁到组件 node，再由 execute 阶段补文字色等细节。

### 4. 复合列优先拆，不要整列打包

像作者信息这类复合列，不得只写“作者卡片”。

必须拆成子元素：

- 主文本
- 次文本
- badge / level / top tag
- link / hot zone
- avatar / icon（如果存在）

即使这些子元素共用一个大 node，也要在输出表里拆开写，否则 execute 和 design 都无法逐格核对。

### 5. tech-doc / TCC 回补非首屏列

Figma 首屏通常只暴露固定列和默认列，拿不到的部分必须从 tech-doc / TCC 回补：

1. `fixed_columns`
2. `default_columns`
3. `custom_columns`
4. `selectedAttrs`
5. 导出字段 / 动态 attrs

回补时的规则：

- 首屏没出现，不等于不需要 renderer
- 动态列必须归入渲染族
- 枚举字段必须写值到样式的映射
- 数值字段至少要写格式化方式和排序/空态约束

### 6. node 粒度不够时的输出策略

最终输出允许三种粒度：

- 实例级 node：最佳，直接写 cell / badge / text node
- 组件级 node：可接受，适合 badge / tag / card renderer
- 锚点级 node：兜底，适合纯文本列、纯数值列、动态列

但必须满足：

- 只要写锚点级 node，就必须补一个明确的渲染族
- 只要写组件级 node，就必须说明它对应哪一类枚举或子元素
- 不允许只有 nodeId 没有渲染语义

### 7. 推荐遍历闭环

对于列表型 Figma，推荐固定闭环如下：

1. 页面 node -> 确认列表边界
2. 表格容器 node -> 确认锚点
3. 首屏可见 cell / screenshot -> 确认可见列
4. componentSets -> 锁 badge/tag/card renderer
5. tech-doc / TCC -> 回补默认列、自定义列、selectedAttrs
6. 输出列表样式总表 -> 补负向断言和空态

如果第 3 步拿不到实例级 children，不要回头重复刷深度，直接进入第 4 步和第 5 步。

## Quality Bar

输出必须满足：

- 只看这张总表，execute 阶段就知道每一列该用哪个 renderer 族、需要从 node 取哪些数据、以及代码断言怎么写。
- 只看这张总表，design-check 就知道该逐格核对什么。
- 表头、默认列、自定义列、动态列没有静默遗漏。
- 高风险字段的正反语义已锁定，不能反向实现。

以下情况必须判定为未完成：

- 只有表头，没有列下数据样式。
- 没有 `execute提取数据` 或没有 `Code执行断言`，导致 execute 仍需反复回查其他表。
- 只覆盖首屏列，没覆盖 custom columns / selectedAttrs。
- badge 列没有把不同枚举值分别映射到样式。
- 复合卡片列没有拆出昵称、ID、tag、热区。
- 只有截图结论，没有字段来源映射。

## Suggested Integration

推荐在以下阶段复用：

- `prd-figma-supplementor`：当 PRD 阶段已经识别出核心列表时，提前补列事实。
- `tech-planning`：当 `04-tech-plan.md` 中出现列表区但列 contract 不完整时，补一张列表样式总表。
- `design-alignment`：当需要逐格核对表头和单元格样式时，直接消费这张总表。

## Example Trigger

以下任务可直接触发本 skill：

- “把这个列表页所有表头和列下数据样式整理成一张总表”
- “这个 Figma 是表格页，帮我补齐所有列的 renderer contract”
- “selectedAttrs 里的动态列也补上样式映射”
- “这个 badge/tag 是哪个节点，整张表都一起补全”
