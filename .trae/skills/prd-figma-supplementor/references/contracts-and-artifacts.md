# 产物与合同

本文件只定义产物落点、缓存追溯链和消费边界。

- 执行顺序与门禁：`execution-and-gates.md`
- 发现策略：`figma-atlas-and-discovery.md`
- 补充文档结构：`output-template.md`

## 产物落点

统一使用：

- `context/prd-figma-supplement.md` or `prd-figma-supplement.md`
- `context/figma-evidence-pack.md` or `figma-evidence-pack.md`
- `context/figma-cache/` or `figma-cache/`

不要把同一批事实拆散到额外的临时文件中，例如 `entity-map.md` 或 `display-semantic-map.md`。

## Figma 缓存合同

所有通过 MCP 获取的证据都必须落缓存，只在 `prd-figma-supplement.md` 里写摘要是不够的。

### 缓存清单

| 文件 | 内容 |
|---|---|
| `manifest.md` | 节点树、截图、调用记录和消费者的缓存索引 |
| `nodes/<safe-node-id>-d<depth>.md` | 节点树摘要或原始读取结果 |
| `screenshots/<safe-node-id>-<purpose>.<ext>` | 导出的截图 |
| `raw/<call-id>.json` or `.md` | 原始工具返回 |

### 命名规则

- `safe-node-id`：将 `:` 替换成 `_`
- `call-id`：使用 `F1`、`F2`、`IMG1` 这类格式，并与 evidence pack 的调用日志保持一致
- screenshot purpose 应该可读，例如 `main-state`、`table`、`drawer`、`modal`、`candidate`

### Manifest 结构

| cache_id | source | nodeId | depth_or_purpose | path | used_by | note |
|---|---|---|---|---|---|---|

### 硬约束

- 每一次 MCP 调用都必须登记到 `figma-cache/manifest.md`。
- `figma-evidence-pack.md` 必须通过 `cache_id` 或 `cache_path` 回指缓存文件。
- `prd-figma-supplement.md` 中的高置信 Figma 事实必须满足 `evidence_id -> cache_id -> cache path` 的追溯链。
- 后续 Plan / Code / Design 阶段应优先复用缓存，而不是重新发起 MCP 调用。
- 即使因为 blocker 提前停止，也要把已获取的节点树和截图持久化。

## 证据包合同

`figma-evidence-pack.md` 是审计日志和证据索引，不是 Plan 直接消费的主事实层。

### 必备章节

| section | requirement |
|---|---|
| Source | Figma URL、fileKey、入口 nodeId、workspace |
| Tool Descriptor Evidence | descriptor 路径和实际能力摘要 |
| Cache Manifest | cache 路径和覆盖摘要 |
| MCP Call Log | 工具、参数、depth、结果、cache_id、cache_path |
| Direct Node Targets | 明确提供的 node URL 及其决策 |
| Sibling Overlay Scan | parent/sibling overlay 重建结果 |
| Figma Atlas | page/top frame/子视图/弹层清单 |
| Visual Tile Index | 截图分区和回溯状态 |
| Requirement-to-Atlas Coverage | PRD 状态到 Atlas 的覆盖关系 |
| Evidence Index | evidence_id、cache_id、事实及其支持结论 |
| Candidate Scoring | 候选节点评分和决策 |
| Page Top Node Decisions | 页面或子视图的 top-node 判定 |
| Screenshot Export Log | 截图导出结果与失败原因 |
| Gate Verdict G1-G18 | 最终门禁证据和说明 |

### 精简规则

- 证据包保持精简，不要把超大的节点树直接贴进正文。
- 原始节点树和截图放缓存，不要堆进 evidence pack 正文。
- 如果 evidence pack 已经足以证明某个 P0 缺口，应该停止扫描，而不是继续扩大范围。

## 事实优先级

当来源冲突时，按以下优先级判断：

1. 已确认的 Figma 主态节点证据
2. Figma reference-only 证据
3. PRD 明确要求
4. 当前代码

边界约束：

- 不要因为一次 Figma 扫描没找到，就删除 PRD 要求。
- 截图只能辅助结构事实，不能单独覆盖节点树证据。
- 如果截图和节点树冲突，应先复扫 node、parent 或 siblings。

## 必读输入

至少读取：

- PRD 原文和所有 direct Figma URL
- 包含 node id 的评论或用户消息
- MCP 调用前可用的 tool descriptor

如果工作区中已存在，也要优先复用：

- `ui-source-map.md`
- `figma-evidence-pack.md`
- `prd-figma-supplement.md`
- `figma-cache/manifest.md`

## 消费边界

这些产物的消费方式应固定为：

- `prd-figma-supplement.md`：Plan 的唯一事实源
- `figma-evidence-pack.md`：用于评审和返工的审计链
- `figma-cache/`：供后续阶段复用的原始材料

如果结构事实本应存在于 supplement 中，就不要让 Plan 再从 evidence pack 反推一遍。
