---
name: prd-analysis
description: PRD 解析。用于将 PRD 原文转成模块、功能点、原子需求、验收标准、UI 来源映射和未决问题。
context: fork
agent: prd-analyzer
---

# PRD Analysis

## Purpose

把产品语言转成可规划、可实现、可验证的需求结构。该阶段不进行代码实现，不生成技术方案细节。

## Data Interface Policy

PRD 分析阶段不要求用户提供完整数据接口合同。

必须遵守：

- 不得因为缺少接口路径、请求字段、响应字段、分页、排序或错误码，就单独将问题标为 `P0_BLOCKER`。
- 数据接口缺口默认登记为 `P1_RISK` 或 `PLAN_DISCOVERY`，交给 `/delivery:plan` 阶段通过 BAM、仓库现有 `src/bam/**`、已有 service、mock 或技术文档继续闭合。
- `03-prd-analysis.md` 中可以记录“接口依赖线索”，但不得要求 PRD 阶段给出最终接口字段合同。
- 只有当缺失内容会导致**产品需求本身无法理解**时，才允许标为 `P0_BLOCKER`，例如：核心业务规则互相冲突、用户操作语义不明、设计主态缺失且影响布局/交互、跨系统能力的业务协议不明。
- 对外部系统能力（如 IM、BPO、下载、跳转）应优先区分：
  - 业务语义 / 操作规则不明：可标 P0。
  - 仅接口字段、路径、错误码未给出：不在 PRD 阶段标 P0，转入 Plan Discovery。

### 技术文档接口线索

如果当前 workspace 已有 `tech-doc-raw.md`、`tech-doc-raw/`、`bam-sync-report.md` 等技术文档缓存，PRD 分析应读取其中与本轮 scope 相关的接口方法、字段、BAM / IDL / service 线索，用于补充 Atomic Requirements 的“数据 / 接口线索”。

要求：

- PRD 原文仍是产品语义和业务规则依据；技术文档只补充接口实现线索。
- 对每条原子需求，先检查技术文档是否已有明确接口或字段；有则在接口线索中标注 `技术文档：<接口/字段/值>`，并说明后续仍需 Plan / BAM / 仓库校验。
- 技术文档没有覆盖时，再写入 `PLAN_DISCOVERY` 或等价待发现表述。
- 技术文档与 PRD 语义冲突时，记录冲突和影响，交由后续阶段或用户确认。

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `prd-source.md`
- 当前 workspace 下与 `prd-source.md` 相邻的资源目录，如 `prd-source/`、`prd-source.assets/`（如存在）
- 当前 workspace 下的 `tech-doc-raw.md`、`tech-doc-raw/` 或其他技术文档缓存（如存在，仅作为接口证据来源）
- 当前 workspace 下的 `00-inputs.md`
- 当前 workspace 下的 `01-intake.md`

如果 `prd-source.md` 不存在或为空，必须暂停提问。

如果 `00-inputs.md` 或 `01-intake.md` 未明确写出 `design_source_status`（`FIGMA_FOUND` 或 `FIGMA_NOT_FOUND`），也必须暂停。

硬约束：

- `未识别到 Figma` 不等于 `确认没有 Figma`。状态不是 `FIGMA_FOUND` 也不是 `FIGMA_NOT_FOUND` → P0 暂停。
- 若需求涉及核心 UI 改造，且 `design_source_status = FIGMA_NOT_FOUND`，必须直接 `BLOCKED`。

## Mandatory Supplemental Source Expansion

在正式委派 `prd-analyzer` 之前，主 Agent 只做“原稿入口确认”，不得承担具体 MCP 取证：

1. 准备主 PRD 原稿：
   - 必须确保 `prd-source.md` 可直接作为权威原稿输入。
   - 必须同步检查 `prd-source.md` 中的相对图片、白板、附件链接，以及同级资源目录；资源目录中的图片、白板和附件是 PRD 证据，不得只读取 Markdown 文本。
2. 主 Agent 负责把当前 workspace、阶段输入文件、已知 Figma / 飞书 / Wiki / Sheet 链接作为固定输入包传给 `prd-analyzer`。
   - 固定输入包必须包含当前用户消息中新补充的 Figma URL / `node-id`，尤其是针对已失败 P0 的 direct node 链接；不得只传 `prd-source.md` 中的初始 Figma 链接。
3. MCP 读取、Figma 深扫、补充来源提取、evidence pack、cache、supplement 和 PRD 分析产物均由子 Agent 执行；主 Agent 只负责 Gate Review。
4. 当命名型 `prd-analyzer` 运行时未暴露 `run_mcp` 时，主 Agent 必须派发具备 `run_mcp` 的 MCP-capable 子 Agent，并在 prompt 中要求其读取并遵守 `.trae/agents/prd-analyzer.md`。不得因此回退为主 Agent 亲自调用 MCP。

设计源分支规则：

- 若 `design_source_status = FIGMA_FOUND`，必须进入 Figma 证据链路；不得退回白板 fallback。
- 若 `design_source_status = FIGMA_NOT_FOUND`，只表示本阶段可以评估白板 / legacy baseline 的降级可用性；是否允许继续，以 Gate 判定为准。

## Mandatory Stage 1A/1B/1C/2 Flow

本阶段必须委派 `prd-analyzer` agent 或 MCP-capable 子 Agent 扮演 `prd-analyzer`，且必须按 Stage 1A/1B/1C/2 执行。主 Agent 不直接调用 Figma / Lark MCP 做阶段事实采集；所有具体操作由子 Agent 完成，主 Agent 只做阶段路由和门禁审查。

## Main Agent Gate Review

主 Agent 必须遵守 `.trae/AGENTS.md` 的 `Main / Subagent Collaboration Contract`。

子 Agent 返回后，主 Agent 只审以下高信号内容：

- `Agent Gate Summary`。
- `Stage 1B Evidence Review` 的 Overall Result、Gate Consistency、P0 Judgment。
- `03-prd-analysis.md` 的 Atomic Requirements、Uncertainty Register Draft、Plan Readiness Suggestion。
- `uncertainty-register.md` 中 P0 / P1。
- `ui-source-map.md` / `figma-evidence-pack.md` 中被 summary 点名的 evidence。

只有当 summary 或门禁表显示 `BLOCKED`、`NEEDS_TARGETED_REVIEW`、P0/P1 自相矛盾、核心 Figma 主态证据缺失时，主 Agent 才定向回读原 PRD / Figma evidence。不得为了放行默认全文复审 PRD 或完整 Figma 节点树。

### Stage 1A：子 Agent 补充来源读取与 Figma Evidence Pack

执行本阶段的 `prd-analyzer` 角色子 Agent 必须完成：

1. 扫描 `prd-source.md` 中引用的其他可能补充具体需求点的文档链接：
   - 飞书文档 / wiki / sheet / 多维表格
   - Figma 链接
   - 本地相对资源链接和同级资源目录中的图片、白板、附件
   - 已缓存的技术文档，如 `tech-doc-raw.md`、`tech-doc-raw/`（仅用于接口证据，不用于覆盖 PRD 产品语义）
2. 读取能由 MCP / 本地缓存 / workspace 文件获取的补充来源，并输出结构化补充结果。
3. 若引用的是飞书文档、wiki、sheet、表格：
   - 必须读取其内容。
   - 必须提取其中能补充 PRD 具体需求点的事实。
   - 必须标明来自主 PRD 还是补充文档。
4. 若引用的是 Figma：
   - `prd-analyzer` 角色子 Agent 必须按 `prd-figma-supplementor` 的硬门禁生成或修复 Figma supplement。
   - `prd-analyzer` 角色子 Agent 必须读取 MCP descriptor 后调用 Figma MCP；若当前子 Agent runtime 确无 `run_mcp`，主 Agent 必须改派 MCP-capable 子 Agent 重试，不得亲自代取，也不得把工具问题写成 Figma 不可用。
   - 若当前 runtime 同时存在多类 Figma MCP，必须按以下优先级选用：`支持 PRD URL / fileKey 直读的工具` > `能对同一 target URL/node 生效的截图或导出工具`。禁止选用仅支持 Figma Desktop active document 的工具。
   - 必须按 PRD 原文中的 Figma URL / fileKey / nodeId 读取设计稿。若当前 Figma MCP descriptor 不支持 URL / fileKey 参数、只能读取 Figma Desktop 当前激活文件，必须立即输出 `TOOL_CAPABILITY_BLOCKED`，要求更换支持 PRD URL / fileKey 直读的 MCP；禁止读取 Figma Desktop 当前激活文件、当前选中节点或任何 Desktop 内容，且禁止将其作为诊断、参考或替代来源。
   - 禁止调用无 `nodeId` / 无 PRD URL 的 Figma metadata 或 context 工具来读取 Desktop 当前上下文；禁止为了判断文件名、当前节点或可访问性而探测 Figma Desktop。
   - 禁止把“工具只能读取 Figma Desktop active document”写成“PRD 设计稿节点不存在 / Figma 设计稿缺失”。只能写成“当前 Figma MCP 不具备 PRD URL / fileKey 直读能力”。
   - 若存在 `download_figma_images` 或等价截图 / 导出工具，必须在 Stage 1A 对当前 scope 的至少 1 个 direct node 或 atlas tile 执行一次最小运行时探测，并把结果写入 `Tool Capability`、`Direct URL / Fallback Log` 与 `Screenshot Export Log`。禁止只根据 descriptor 文案就宣布“仅支持 image asset download”或“arbitrary node screenshot export = no`。
   - 当 descriptor 文案与运行时结果冲突时，必须以“受控探测 + 本轮 call log + 导出文件”作为最终能力结论，同时在 `Tool Capability` 中同时记录 `descriptor expectation` 与 `runtime-validated result`；不得继续沿用旧误判。
   - 若截图探测失败，必须区分为 `descriptor_blocked`、`runtime_permission_blocked`、`node_not_renderable`、`unknown_runtime_failure` 之一，并记录失败 nodeId、参数和错误；不得把未探测或单次失败直接写成“Figma 不可用”。
   - 必须生成 `figma-cache/`，缓存本轮所有已获取的结构树、截图和 raw response，并维护 `figma-cache/manifest.md`。
   - 必须建立 `figma-cache/atlas/`：先枚举 page / top-level Frame / 候选子视图 / 候选弹层，再导出 Visual Tiles，最后把 PRD 需求点映射到 Atlas 单元；入口 node 读取不得替代同文件多页面 / 多状态 Atlas。
   - 必须生成 `figma-evidence-pack.md`，记录 MCP call log、参数、depth、cache_id、cache_path、截图导出记录、Gate 状态、evidence_id。
   - 必须生成或更新 `prd-figma-supplement.md` 草案。

高效执行约束：

- 默认只做“最小可交接”起步采集：Figma Atlas 浅扫 1 次或分批浅扫、入口节点 1 次、最高分页面/子视图候选 1-3 个、主表格/列表和主态截图按需 1-2 次。
- 起步采集前必须完成 Figma URL 读取能力检查：如果工具 schema 不支持 URL / fileKey，必须在 `figma-evidence-pack.md` 的 `Tool Capability` 中记录，并立即阻塞；禁止读取 Desktop active 文件，禁止将 Desktop active 文件探测结果作为诊断、参考或 PRD 设计 evidence。
- 若存在截图 / 导出工具，起步采集还必须包含 1 次最小截图运行时探测；只有探测后，才能在 `Tool Capability` 中写 `supported=yes/no/limited`。未探测时只能写 `unknown-not-probed`，不得写成否定结论。
- 起步采集不是停止上限；每个核心页面、Tab active 态、业务域 option、Drawer、Modal、Popover、Confirm、表格展开态等本轮 PRD 明确实现且影响结构 / 语义 / 按钮顺序 / legacy 保留判断的 UI 状态，必须达到 `prd-figma-supplementor` 定义的深扫证据下限，否则输出 `P0_BLOCKER` / `BLOCKED_FOR_UI_STRUCTURE`。
- 对已标 `FIGMA_MAIN_STATE_CONFIRMED` 的页面，必须有 `Page Evidence Coverage Matrix` 证明结构树、主态截图、区域顺序、表格 / 列表、操作区 / 分页证据完整。
- 若 PRD、当前用户消息或补充评论提供了具体 Figma node URL，必须按 `prd-figma-supplementor` 的 `Sibling Overlay Node 发现协议` 优先直读该 node，并读取 parent/siblings；不得只用初始入口 node 或 top-level Atlas 判断未命中。
- 当背景 / 遮罩 node 与 modal 内容 node 是同 parent 并列 sibling 时，必须重建 overlay state group；modal 内容 sibling 作为 state top node，背景 sibling 只作为上下文。
- 对业务域 / Tab / Switcher，必须有 `State Evidence Matrix` 逐项记录 option 证据状态；不能只记录切换器文案。
- 对新增业务域 / Tab / Switcher 的 option，必须先判断该 option 是“新增 UI 改造态”还是“复用现有页面 / 旧逻辑的 legacy baseline”。若 PRD、运行时 URL 或仓库路由显示该 option 复用老页面，`prd-analyzer` 必须先做只读代码 baseline 检查，定位现有 route / page / container / 关键组件，并在 `ui-source-map.md` 与 `uncertainty-register.md` 中记录 legacy evidence；不得在未检查当前代码的情况下，仅因缺少该 option 的 Figma 节点就登记 `P0_BLOCKER`。
- 若 legacy option 已有可审计 baseline（例如现有路由、页面入口、容器组件、线上 / vmok URL 或用户确认的复用说明），且本轮 PRD 未要求该 option 做新 UI / 新交互改造，应标记为 `LEGACY_BASELINE_CONFIRMED` 或 `P1_RISK`，不阻塞 `/delivery:plan`。只有当该 option 的复用边界、权限 / 业务语义、跳转协议或 legacy 保留判断无法通过 PRD + 当前代码确认，且会影响技术规划实现范围时，才允许登记 `P0_BLOCKER`。
- 候选节点必须先进入 Atlas，完成 `Figma Atlas Coverage Matrix` 与 `Requirement-to-Atlas Coverage`，再评分并下钻，禁止无差别全文件扫描。
- 多页面 / 多状态文件必须先完成 `Figma Atlas Coverage Matrix` 和 `Requirement-to-Atlas Coverage`；缺少 Atlas 时不得声明“完整读取 Figma”。
- 只要能证明核心页面主态缺失并构成 P0，即可停止深扫，写明缺口和需要用户补充的设计资源。
- 对不属于本轮实现范围的 P1/P2 细节缺口，登记 open item；对属于本轮实现范围且影响 UI 结构、状态、容器、按钮顺序、表格结构、操作区或 legacy 保留判断的 Figma 缺口，必须在 PRD 阶段继续定向深扫或登记 `P0_BLOCKER`，不得后移到 Plan。
- 对推荐区、提示区、说明区等“纯可见性切换”状态，如果主态已达到 `FIGMA_MAIN_STATE_CONFIRMED`，且缺失态不改变页面骨架、区域顺序、容器类型、关键按钮顺序、业务操作语义或 legacy 保留判断，则不得作为阻塞 `/delivery:plan` 的 `P0_BLOCKER`；应登记为 `P1_RISK` / `PLAN_DISCOVERY`，并在 `/delivery:plan` 的 visual contract 中保留实现与验证要求。

`figma-evidence-pack.md` 最小结构：

```md
# Figma Evidence Pack

## Source
| item | value |

## Tool Capability
| capability | supported | evidence | impact |

## Direct URL / Fallback Log
| attempt | args_delta | result | note |

## Cache Manifest
| item | value |

## Direct Node Targets
| target_id | source | nodeId | URL | intended UI state | read status | decision |

## Sibling Overlay Scan
| state | parent node | background sibling | modal/content sibling | evidence | decision |

## Figma Atlas
| atlas_item | nodeId | type | page/top_frame | children_count | screenshot | PRD clue | action |

## Visual Tile Index
| tile_id | screenshot | visible region | likely node / state | PRD clue | node backtrace | action |

## Requirement-to-Atlas Coverage
| requirement / UI state | PRD clue | atlas candidates | selected node | evidence_id | status | next action |

## MCP Call Log
| call_id | tool | args | result | cache_id | cache_path |

## Evidence Index
| evidence_id | cache_id | raw node / screenshot | extracted fact | supports |

## Candidate Scoring
| candidate | hit features | score | decision |

## Page Top Node Decisions
| page / subview | decision | evidence_id | gap |

## Screenshot Export Log
| nodeId | localPath | result | reason_if_not_run |

## Gate Verdict G1-G18
| gate | result | evidence_id | note |
```

`figma-cache/manifest.md` 最小结构：

```md
# Figma Cache Manifest

| cache_id | source | nodeId | depth_or_purpose | path | used_by | note |
|---|---|---|---|---|---|---|
```

缓存规则：

- Stage 1A 的每一次 Figma MCP 结构树读取和截图导出都必须进入 `figma-cache/manifest.md`。
- 后续 Stage 1B、Stage 2、`/delivery:plan`、`/delivery:code`、`/delivery:design` 默认优先读取 cache，不重新调用 MCP。
- 若 Stage 1A 因 P0 提前停止，也必须缓存已取到的全部结构树 / 截图，并在 manifest 中记录停止原因。

### Stage 1B：子 Agent Evidence Review / Self Repair

Stage 1A 完成后，`prd-analyzer` 角色子 Agent 必须做 evidence review。此轮子 Agent 先审核；若发现可通过最小 MCP 读取闭合的 evidence 缺口，必须自行补抓并更新 `figma-cache/manifest.md`、`figma-evidence-pack.md`、`prd-figma-supplement.md`，再重新自检：

1. 是否已覆盖 PRD 中引用的关键补充链接。
2. 是否已明确区分主 PRD、补充飞书文档和 Figma 的事实来源。
3. `figma-evidence-pack.md` 是否足以支撑 `prd-figma-supplement.md`。
4. `prd-figma-supplement.md` 是否满足最基本质量要求：
   - 至少说明 Figma 来源和节点范围。
   - 至少提取已确权的结构事实或显示语义事实。
   - 必须包含 `Figma 组件改造索引`，并能从全局到局部标明页面结构、区域结构、组件结构、Tab / Switcher、筛选、表格、操作区、容器和样式线索。
   - 明确哪些内容已确权、哪些仍待确认。
   - 不能只给链接或空泛结论。
   - 对新增业务域 / Tab / Switcher option，必须区分 `NEW_UI_STATE` 与 `LEGACY_BASELINE`。若 option 复用现有页面，必须先检查当前仓库只读代码并记录 route / page / container / 关键组件证据；不得因缺少 Figma 节点直接判 P0。已确认复用且无新增 UI / 交互要求的 legacy option，应写入 `ui-source-map.md`，并在 `uncertainty-register.md` 中降级为 `P1_RISK` 或标记 resolved。
   - 对 PRD 中明确为本轮核心页面或状态的 UI 改造，必须判断是否具备完整深扫证据；如果存在 direct node URL，必须额外判断是否完成 `Direct Node Targets` 与 `Sibling Overlay Scan`。如果仅有页面壳、局部弹窗、TEXT 文案、截图 alt、PRD/wiki 字段表，而缺少会影响页面骨架、区域顺序、推荐区、筛选区、工具栏、表格 / 分页、操作区、创建入口、未激活 Tab、Drawer / Modal / Popover / Confirm 容器、按钮顺序或 legacy 保留判断的 Figma 证据，必须在 PRD 阶段登记为 `P0_BLOCKER`，交给 Ask First 决策包；Agent 不得自行降级为 P1/P2 或交给 Plan 阶段才拦截。
   - 对推荐区、提示区、说明区等“纯可见性切换”状态，若主态已确权且缺失态只影响内容展开 / 收起展示，不改变页面骨架、区域顺序、容器类型、关键按钮顺序、业务操作语义或 legacy 保留判断，必须降级为 `P1_RISK`，不得导致 Stage 1B `BLOCKED`。
   - 必须审核 `Direct Node Targets`、`Sibling Overlay Scan`、`Figma Atlas Coverage Matrix`、`Visual Tile Index`、`Requirement-to-Atlas Coverage` 和 `Deep Scan Coverage Matrix`。凡是本轮 PRD 明确实现且影响结构 / 语义 / 按钮顺序 / legacy 保留判断的 UI 状态存在 direct node URL 却未直读 / 未扫 sibling，或未深扫且未明确 out of scope，Stage 1B 必须 `BLOCKED`；纯可见性切换按上一条降级。
5. 输出是否可直接作为下一步 PRD 分析输入包的一部分，并能供 `/delivery:plan` 生成 `Figma / UI 改造清单`。

子 Agent 必须返回结构化审核结果，不得只写“合格 / 不合格”。审核结果至少覆盖：

1. 来源覆盖问题：
   - 是否仍有 PRD 中引用但未被覆盖的关键补充链接。
   - 是否有读取失败但未登记原因的来源。
2. 来源归因问题：
   - 是否清楚区分主 PRD、补充飞书文档和 Figma 的事实来源。
   - 是否把推测写成了事实，或把低置信结论混入高置信结论。
3. Figma 质量问题：
   - 是否仍残留“workspace 既有结论”“已有记录回填”等旧表述，而当前其实已经拿到直连节点证据。
   - 是否使用了容器节点代替已存在的具体文本节点 / 具体事实节点。
   - 是否把“待确认”写得过宽，而没有收敛成具体未抓到的节点、文本或结构。
   - 是否缺少 `Figma 组件改造索引`，导致后续 plan/code 无法识别顶层切换、Tab、筛选、表结构、操作区、容器形态或样式线索。
   - 是否只记录“看到了哪些文案”，但没有说明这些事实会影响哪些 UI 组件和结构改造点。
4. 跨文档一致性问题：
   - `prd-figma-supplement.md`、`ui-source-map.md`、`03-prd-analysis.md` 对“已确认 / 待确认”的边界是否一致。
   - Figma 节点、事实描述、Evidence Level 是否一致。
   - `ui-source-map.md` 只能作为 evidence index / source trace，不得承载 `prd-figma-supplement.md` 才应承担的组件改造索引职责。
5. 可交接性问题：
   - 当前 Stage 1 输出能否直接作为 Stage 2 输入包。
   - 当前 Stage 1 输出能否直接作为 `/delivery:plan` 的 `Figma / UI 改造清单` 输入。
   - 若不能，缺的究竟是来源、节点、字段、结构、文案、样式线索还是组件改造索引。

建议审核返回格式：

```md
## Stage 1B Evidence Review

### Overall Result
PASS / FAIL / BLOCKED

### Gate Consistency
| Gate | Review Result | Reason |

### P0 Judgment
- P0 是否成立：
- 是否应降级：
- 证据说明：

### Attribution Check
- 是否误把工具权限问题写成 Figma 不可用：
- 说明：

### Required Fixes
```

### Stage 1C：子 Agent Reconcile，主 Agent Gate Review

如果 Stage 1B 为 FAIL / BLOCKED，主 Agent 只做 Gate Review 和定向再派发；具体 reconcile 仍由 `prd-analyzer` 角色子 Agent 完成：

1. 若失败原因是 evidence pack 与 supplement 不一致，优先修正 supplement 的 Gate 状态、depth 表述、evidence_id 回指，不重新扫 Figma。
2. 若失败原因是缺少支撑核心 Gate 或 `Deep Scan Coverage Matrix` 的证据，`prd-analyzer` 角色子 Agent 按最小补抓目标调用 MCP，不做全量扫描；本轮 UI 状态缺口必须当前阶段闭合或 P0。
3. 若已能确认核心页面 / 状态主态缺失并构成 P0，`prd-analyzer` 角色子 Agent 停止补抓并返回 P0 问题、证据和建议提问；主 Agent Gate Review 后必须把该问题交给 `/delivery:prd` 后置的 Ask First 决策包。
4. 若补抓后可继续，必须再次委派 `prd-analyzer` 做 Stage 1B 审核。

返工上限：

- Stage 1B/1C 最多 `2` 轮。
- 每轮必须缩小问题范围，并在 `decision-log.md` 记录：轮次、审核结果、修正项、是否继续。
- 第 `2` 轮仍未通过时：
  - 若缺口属于本轮页面 / 状态 / 弹层 / Tab / 表格 / legacy 可见态范围，登记 `P0_BLOCKER` 并交给 Ask First 决策包。
  - 只有纯接口字段、路径、分页、排序、错误码或明确 out of scope 的像素级样式问题，才允许登记 `P1_RISK` / `PLAN_DISCOVERY` 并继续 Stage 2。

### Stage 2：基于审核通过的完整输入包执行 PRD 分析

只有在 Stage 1B PASS，且所有本轮 UI 状态的深扫缺口均已闭合或明确 out of scope 后，才能进入第二步子 Agent 分析。

第二步子 Agent 的输入包必须至少包含：

1. 主 Agent 准备好的主 PRD 原稿。
2. Stage 1 输出的 PRD 补充数据。
3. `prd-figma-supplement.md`（如存在 Figma）。
4. `figma-evidence-pack.md`（如存在 Figma）。
5. Stage 1B 审核结果与 Stage 1C reconcile 结论。
6. `tech-doc-raw.md` / `tech-doc-raw/` 中与本轮需求相关的接口、字段、BAM、IDL、service 线索（如存在）。

第二步子 Agent 必须基于上述完整输入包执行最终 PRD 分析，并产出 `03-prd-analysis.md` 所需结构化结论。

## Mandatory Agent Delegation

本阶段必须委派 `prd-analyzer` agent 完成长文 PRD 拆解。

主 Agent 只负责：

1. 准备主 PRD 原稿。
2. 组织 Stage 1A/1B/1C/2 的 Agent Task Input，并把当前 workspace、固定输入文件和 `.trae/agents/prd-analyzer.md` 传给执行 `prd-analyzer` 角色的子 Agent。
3. 根据 `Agent Gate Summary`、关键门禁表和被点名 evidence 做 Gate Review。
4. 若需 reconcile，只派发明确边界的目标给 `prd-analyzer`，不亲自执行 MCP 补抓或文档修复。
5. 复核 Stage 2 输出是否符合 Output Contract。
6. 若 LOW confidence / P0 / P1 登记缺失，只能定向要求 `prd-analyzer` 角色子 Agent 修复对应产物。
7. 判断是否允许进入 `/delivery:plan`。

## Required Outputs

必须更新：

- `03-prd-analysis.md`
- `uncertainty-register.md`
- `ui-source-map.md`
- `figma-evidence-pack.md`（若 `design_source_status = FIGMA_FOUND`，则必需）
- `prd-figma-supplement.md`（若 `design_source_status = FIGMA_FOUND`，则必需）
- `figma-cache/atlas/`（若 `design_source_status = FIGMA_FOUND`，则必需）
- `decision-log.md` 如有关键判断

运行态说明：

- `.trae/DELIVERY_STATE.md` 是本地状态机缓存，不属于本 skill 的交付产物。
- `prd-analyzer` 不得直接修改 `.trae/DELIVERY_STATE.md`；如需记录阶段状态，只由主 Agent 在 Gate Review 后做最小更新。

## Output Contract for 03-prd-analysis.md

`03-prd-analysis.md` 的职责是“面向 `/delivery:plan` 的结构化结论层”，不是重复抄写 `prd-source.md` 或 Figma 补充原稿。

必须遵守：

1. 只保留进入 Plan 真正需要的结构化结论。
2. 对原始事实只做引用和重组，不大段复述原文。
3. 所有关键结论都必须能回指到原稿来源：
   - `prd-source.md`
   - 补充飞书文档 / sheet / wiki
   - `prd-figma-supplement.md`
   - 技术文档中的接口 / 字段 / BAM / IDL 线索（仅限接口依赖结论）
4. `decision-log.md` 负责记录“已拍板内容”，`03-prd-analysis.md` 负责记录“进入 Plan 所需的需求拆解、依赖、未决项与 readiness”。

### Atomic Requirement Granularity Guard

`03-prd-analysis.md` 不得把可独立验收的显性交互细节压缩成模块级摘要。

当 `prd-source.md`、补充文档或 `prd-figma-supplement.md` 明确写出以下任一事实时，必须拆成独立 `requirement_id`，不得只并入“详情抽屉 / 列表 hover / 权限态 / 规则矩阵”这类大项：

- 明确的触发动作与载体，例如 `hover`、`tooltip`、`popover`、`drawer`、`modal`、表格 / 列表列内交互、行内热区。
- 明确的展示结构，例如“三列表格”、可滚动容器、列名 / 列顺序、分区顺序、展开态内容。
- 明确的权限 / 显隐 / 禁用差异，例如可见但禁用、无权限不展示、仅特定角色可点击。
- 明确的负向约束，例如“不得出现旧结构 / 错误按钮 / 错误容器 / 无副作用条件”。

允许保留模块级 requirement 作为父级概括，但不得用它替代上述细粒度 requirement。只要一个细节可以被独立验证，就必须能在 `03-prd-analysis.md` 中被唯一追踪到。

最小必须包含以下 5 块：

1. 模块拆解：按 PRD 分段或业务流程拆。
2. 原子需求表：
   - requirement_id
   - 模块
   - 原子需求
   - 需求类型：新增 / 修改 / 删除 / 修复 / 重构
   - 设计稿来源
   - 数据 / 接口线索（不要求 PRD 阶段闭合最终接口合同；如存在技术文档，需标注其中明确的接口 / 字段来源）
   - 验收标准
   - 证据来源
   - Evidence Level
3. 依赖与未决项：
   - 权限 / 角色
   - 数据 / 接口线索（缺接口字段默认进入 Plan Discovery，不单独作为 P0）
   - 下载 / 跳转 / 埋点 / 外部系统依赖
   - 待确认问题，按 P0/P1/P2 分级
4. Plan Readiness 初判：READY / PARTIAL_READY / BLOCKED。

可选块：

- 背景与目标：仅在缺少这部分会导致 Plan 误判时保留，控制在简短摘要，不重复抄写 PRD 原文。
- 补充事实来源汇总：若 `ui-source-map.md` 已充分覆盖，可在 `03-prd-analysis.md` 中只保留引用，不再重复展开。

## Output Contract for ui-source-map.md

`ui-source-map.md` 的职责是 evidence index / source trace。它不是 `/delivery:plan` 或 `/delivery:code` 的实现事实主输入，也不负责输出组件改造清单。

必须包含：

1. 主 PRD 来源。
2. PRD 中引用的补充飞书文档 / wiki / sheet / 表格来源。
3. Figma 来源及其对应的 `prd-figma-supplement.md`。
4. 每个来源对哪些页面、模块、原子需求提供了补充证据。
5. open items 与其影响范围。

不得包含：

- 可直接执行的 UI 改造任务。
- 组件改造索引主表。
- 替代 `prd-figma-supplement.md` 的结构事实或显示语义事实。

后续阶段消费规则：

- `/delivery:plan` 主消费 `prd-figma-supplement.md`，仅在需要追溯来源时读取 `ui-source-map.md`。
- `/delivery:code` 不把 `ui-source-map.md` 作为实现输入。
- `/delivery:design` 可读取 `ui-source-map.md` 追溯截图、Figma node 和 open items。

## Gate

如果存在影响技术规划的 P0_BLOCKER：

- 将 `03-prd-analysis.md` 状态标记为 BLOCKED。
- 更新 `uncertainty-register.md`。
- 不直接向用户单点提问；必须把 P0 交给 `/delivery:prd` 后置的 `ask-first` 决策包，与 P1/P2/PLAN_DISCOVERY 一起发送给人工确认。
- 在 Ask First 完成前禁止进入 `/delivery:plan`。

P0 判定约束：

- 缺少数据接口路径、请求字段、响应字段、分页、排序、错误码，不得单独阻塞 `/delivery:plan`。
- 这类问题必须降级为 `P1_RISK` / `PLAN_DISCOVERY`，并在 `/delivery:plan` 阶段通过仓库、BAM、service/API 定义或 mock 策略处理。
- 只有产品规则、操作语义、权限业务规则、设计主态或跨系统业务协议不明确，且会导致技术规划无法判断实现范围时，才允许继续标为 `P0_BLOCKER`。
- 对核心 UI 改造需求，若 `design_source_status = FIGMA_FOUND` 却未生成 `prd-figma-supplement.md`、`figma-evidence-pack.md`、`figma-cache/manifest.md` 或等价 Figma 证据产物，不得通过 `/delivery:prd`。
- 对核心 UI 改造需求，若 `design_source_status = FIGMA_NOT_FOUND`，只有在 `uncertainty-register.md` 与 `ui-source-map.md` 中明确记录"白板 / legacy baseline 作为降级参考"的前提下，才允许继续；否则必须 `BLOCKED`。

如果没有 P0_BLOCKER：

- 将 `03-prd-analysis.md` 状态标记为 DONE。
- 输出下一步：`ask-first`；Ask First 放行后再进入 `/delivery:bam` 或 `/delivery:plan`。
