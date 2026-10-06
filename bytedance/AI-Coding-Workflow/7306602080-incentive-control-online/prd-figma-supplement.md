# 不激励管控上线 - PRD Figma 补充

## Execution Checklist
| item | result | evidence / cache | note |
|---|---|---|---|
| 解析 PRD Figma URL | PASS | E-FIG-001 -> F1 -> `figma-cache/nodes/F1-get_figma_data-0_1-d2.md` | PRD URL 解析为 fileKey=`fNJJ7mEmEMYU5y0tcAZm3X`、entry nodeId=`0:1`。 |
| MCP descriptor / runtime 能力确认 | PASS | `figma-evidence-pack.md` Tool Descriptor Evidence；IMG1 | `get_figma_data` 支持 fileKey/nodeId 直读；`download_figma_images` 对 FRAME 运行时探测成功。 |
| Figma Atlas 建立 | PASS | `figma-cache/atlas/pages.md` | 已枚举 page、top frame、核心状态、Drawer 内容节点。 |
| Visual Tile Index 建立 | PASS | `figma-cache/atlas/tiles.md` | 8 张截图均可回溯到节点或状态。 |
| Requirement-to-Atlas 映射 | PASS | `figma-cache/atlas/requirements-map.md` | PRD 明确 UI 状态均有命中、legacy/reference 或风险记录。 |
| Direct node / sibling overlay | PASS | E-FIG-007、E-FIG-008 | 人工提报 Drawer 使用内容 sibling 作为 state top node，背景 sibling 仅作上下文。 |
| 核心表格/列表父容器深扫 | PASS | F3/F4/F7/F8 | DOU+币、DOU+券剔除明细表与人工提报表格已深扫。 |
| Stage 1B gate 自审 | PASS | 本文件 Gate Verdict；`figma-evidence-pack.md` | G1-G18 均 PASS，无 P0 Figma 阻塞。 |

## 页面总览
| page / child view | page_top_node | main state status | key gaps | evidence |
|---|---|---|---|---|
| Figma 总览画布 | `1:9176` | ATLAS_ROOT_CONFIRMED | none | E-FIG-002 -> F2/IMG2 |
| 奖励配置-活动参与资格=全部用户 | `1:9770` | FIGMA_MAIN_STATE_CONFIRMED | 跳转目标具体 URL 未在 PRD/Figma 明示，P1 | E-FIG-003 -> F2/IMG3 |
| 奖励配置-活动参与资格=仅限预埋用户名单 | `1:10938` | FIGMA_MAIN_STATE_CONFIRMED | 跳转目标具体 URL 未在 PRD/Figma 明示，P1 | E-FIG-004 -> F2/IMG4 |
| 奖励投放-DOU+币-剔除明细 | `1:12120` | FIGMA_MAIN_STATE_CONFIRMED | 接口分页/错误码按 Plan Discovery 闭合，非 P0 | E-FIG-005 -> F3/IMG5 |
| 奖励投放-DOU+券-剔除明细 | `1:12390` | FIGMA_MAIN_STATE_CONFIRMED | 接口分页/错误码按 Plan Discovery 闭合，非 P0 | E-FIG-006 -> F4/IMG6 |
| 人工提报-命中态 Drawer | `87:6973` content sibling；`25:13842` state frame context | FIGMA_MAIN_STATE_CONFIRMED | 导出字段/移除原因语义仍有 PRD 评论，P1 | E-FIG-007 -> F5/F7/IMG7 |
| 人工提报-批量上传 Drawer | `101:6308` content sibling；`25:13971` state frame context | REFERENCE_BASELINE_CONFIRMED | 未发现单独批量上传命中不激励变体；不影响主态骨架，P1 | E-FIG-008 -> F6/F8/IMG1/IMG8 |

## 候选节点评分
| candidate | matched clues | score | decision | evidence |
|---|---|---:|---|---|
| `1:9176` overall top frame | 包含奖励配置、DOU+币/券剔除明细、人工提报状态 | 95 | Atlas root，不作为单一页面结论 | E-FIG-002 |
| `1:9770` config all-user after | 全部用户上下文 + 提示文案 + 截图 | 100 | selected / main confirmed | E-FIG-003 |
| `1:10938` config prefilled after | 预埋用户名单上下文 + 同款提示文案 + 截图 | 100 | selected / main confirmed | E-FIG-004 |
| `1:12120` DOU+币 removal detail | active「剔除明细」+ 筛选 + 作品维度表格 + 分页 | 100 | selected / main confirmed | E-FIG-005 |
| `1:12390` DOU+券 removal detail | active「剔除明细」+ 筛选 + 作者维度表格 + 分页 | 100 | selected / main confirmed | E-FIG-006 |
| `25:13842` manual submit hit | Drawer、汇总提示、一键移除、导出、表格、footer | 100 | selected / main confirmed | E-FIG-007 |
| `87:7016` manual hit rows | 行级红字命中态与移除操作 | 95 | selected deep scan | E-FIG-007 |
| `25:13971` batch upload | 批量上传 option、上传模板、表格、footer | 78 | reference-baseline | E-FIG-008 |
| `101:6332` batch upload table | 批量上传表头与 legacy invalid/delivery states | 75 | reference deep scan | E-FIG-008 |

## Direct Node Targets
| target_id | source | nodeId | intended UI state | decision | evidence |
|---|---|---|---|---|---|
| DNT-001 | PRD Figma URL | `0:1` | 文件/页面入口 | read success；仅作入口，不冒充全集证据 | E-FIG-001 |
| DNT-002 | Atlas child | `1:9176` | 总览 top frame | page_top_node for atlas overview | E-FIG-002 |
| DNT-003 | Targeted Atlas | `1:9770` | 奖励配置-全部用户 After | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-003 |
| DNT-004 | Targeted Atlas | `1:10938` | 奖励配置-预埋用户名单 After | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-004 |
| DNT-005 | Targeted Atlas | `1:12120` | DOU+币剔除明细 | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-005 |
| DNT-006 | Targeted Atlas | `1:12390` | DOU+券剔除明细 | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-006 |
| DNT-007 | Targeted Atlas | `25:13842` / `87:6973` | 人工提报命中态 Drawer | 使用 content sibling `87:6973` 为状态 top node | E-FIG-007 |
| DNT-008 | Targeted Atlas | `25:13971` / `101:6308` | 人工提报批量上传 Drawer | reference-baseline；截图导出 runtime probe 命中 | E-FIG-008 |

## Sibling Overlay Scan
| state | parent node | background sibling | modal/content sibling | decision | evidence |
|---|---|---|---|---|---|
| 人工提报-命中态 | `25:13842` | `87:6945` 背景页面，非需求上下文 | `87:6973` Drawer-提报视频 | 以 Drawer/content sibling 作为 state top node；背景仅上下文 | E-FIG-007 |
| 人工提报-批量上传态 | `25:13971` | `101:6295` 背景页面，非需求上下文 | `101:6308` Drawer-提报视频 | 以 Drawer/content sibling 作为 state top node；背景仅上下文 | E-FIG-008 |

## Figma Atlas Coverage Matrix
| atlas unit | type | nodeId | screenshot | PRD hit | conclusion | gap |
|---|---|---|---|---|---|---|
| Page 1 | CANVAS | `0:1` | n/a | PRD Figma URL | entry confirmed | none |
| 不激励剔除总览 | FRAME | `1:9176` | IMG2 | 当前 scope 全部 UI 状态 | atlas root confirmed | none |
| 奖励配置-全部用户 | GROUP | `1:9770` | IMG3 | PRD 3.1 场景一 | main confirmed | 跳转 URL P1 |
| 奖励配置-预埋用户名单 | GROUP | `1:10938` | IMG4 | PRD 3.1 场景二 | main confirmed | 跳转 URL P1 |
| DOU+币剔除明细 | GROUP | `1:12120` | IMG5 | PRD 3.3 场景一 | main confirmed | 接口细节 Plan Discovery |
| DOU+券剔除明细 | GROUP | `1:12390` | IMG6 | PRD 3.3 场景二 | main confirmed | 接口细节 Plan Discovery |
| 人工提报-命中态 | FRAME/Drawer | `25:13842` / `87:6973` | IMG7 | PRD 3.2 场景三 | main confirmed | 导出字段语义 P1 |
| 人工提报-批量上传态 | FRAME/Drawer | `25:13971` / `101:6308` | IMG8 | 提报方式 option | reference-baseline confirmed | 批量上传命中态独立变体 P1 |

## Visual Tile Index
| tile_id | screenshot | visible region | likely node / state | node backtrace | action |
|---|---|---|---|---|---|
| TILE-OVERVIEW | `figma-cache/screenshots/1_9176-atlas-overview.png` | 全局状态拼图 | `1:9176` | F2 | overview index only |
| TILE-CFG-ALL | `figma-cache/screenshots/1_9770-config-all-user-after.png` | 全部用户配置项提示 | `1:9770` | F2 + IMG3 | confirmed |
| TILE-CFG-PREFILLED | `figma-cache/screenshots/1_10938-config-prefilled-after.png` | 预埋用户名单配置项提示 | `1:10938` | F2 + IMG4 | confirmed |
| TILE-COIN-REMOVE | `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png` | DOU+币剔除明细 Tab/筛选/表格/分页 | `1:12120` | F3 + IMG5 | confirmed |
| TILE-COUPON-REMOVE | `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` | DOU+券剔除明细 Tab/筛选/表格/分页 | `1:12390` | F4 + IMG6 | confirmed |
| TILE-MANUAL-HIT | `figma-cache/screenshots/25_13842-manual-submit-hit-state.png` | 人工提报命中态 Drawer | `25:13842` / `87:6973` | F5/F7 + IMG7 | confirmed |
| TILE-MANUAL-BATCH | `figma-cache/screenshots/25_13971-manual-submit-batch-upload-state.png` | 人工提报批量上传 Drawer | `25:13971` / `101:6308` | F6/F8 + IMG8 | reference-baseline |
| TILE-PROBE | `figma-cache/screenshots/25_13971-artificial-submit-removal-probe.png` | FRAME 截图导出 runtime probe | `25:13971` | IMG1 | capability evidence |

## Requirement-to-Atlas Coverage
| requirement / UI state | atlas candidates | selected node / subregion | evidence_id | status | next action |
|---|---|---|---|---|---|
| 奖励配置-全部用户提示 | `1:9770` | prompt text under config item | E-FIG-003 | matched | Plan consume |
| 奖励配置-预埋用户名单提示 | `1:10938` | prompt text under prefilled user context | E-FIG-004 | matched | Plan consume |
| 查看【不激励】规则入口 | `1:9770`, `1:10938` | prompt link subregion | E-FIG-003/E-FIG-004 | matched | exact URL P1 |
| 发奖前处罚状态判断 | no visual page required except manual submit | PRD rule + interface supplement L1 | E-PRD-003/E-TECH-001 | matched | Plan/BAM discovery |
| 人工提报命中汇总提示 | `25:13842` | alert summary | E-FIG-007 | matched | Plan consume |
| 人工提报一键移除 | `25:13842` | action group button | E-FIG-007 | matched | Plan consume |
| 人工提报导出剔除明细 | `25:13842` | action group button | E-FIG-007 | matched | export field semantics P1 |
| 人工提报行级命中文案 | `87:7016` | row label text | E-FIG-007 | matched | Plan consume |
| 人工提报提交限制 | `25:13842` footer + PRD rule | footer/buttons + PRD | E-FIG-007/E-PRD-003 | matched | Plan consume |
| 提报方式-手动输入 | `25:13842` | radio group | E-FIG-007 | matched | Plan consume |
| 提报方式-批量上传 | `25:13971` | radio/upload/table | E-FIG-008 | matched/reference | no P0; P1 confirm if distinct hit visual required |
| DOU+币剔除明细 Tab | `1:12120` | tab + filters + works table | E-FIG-005 | matched | Plan consume |
| DOU+券剔除明细 Tab | `1:12390` | tab + filters + author table | E-FIG-006 | matched | Plan consume |
| 奖励下发 / 投放明细 legacy Tabs | code baseline + Figma | existing SubTab REWARD/DETAIL | E-CODE-002/E-FIG-005/E-FIG-006 | legacy-baseline | preserve unless PRD changes |
| 剔除明细埋点 | `1:12120`, `1:12390` | active tab + PRD tracking table | E-PRD-005/E-FIG-005/E-FIG-006 | matched | Plan consume |

## 奖励配置 - 活动参与资格 / 预埋用户名单
### 统一补充事实
| fact | conclusion | evidence | Evidence Level |
|---|---|---|---|
| page_top_node | 全部用户态为 `1:9770`，预埋用户名单态为 `1:10938`；二者均嵌在 atlas root `1:9176` 中。 | E-FIG-003/E-FIG-004 -> F2/IMG3/IMG4 | HIGH |
| scope | 涉及「奖励配置-活动参与资格」和「预埋用户名单」配置项下方提示。 | E-PRD-002；E-FIG-003/E-FIG-004 | HIGH |
| visible copy | `奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖   查看【不激励】规则`。 | F2 lines containing prompt text；IMG3/IMG4 | HIGH |
| placement | 提示位于配置项下方；两个活动参与资格场景均出现。 | E-PRD-002；E-FIG-003/E-FIG-004 | HIGH |
| interaction | 点击 `查看【不激励】规则` 需跳转到「电商内容生态激励管控」讨论材料；具体 URL 未在 PRD/Figma 明示。 | E-PRD-002；E-FIG-003/E-FIG-004 | MEDIUM |

### 显示语义事实
| figma_node_id | visible field/copy | example value | display shape | style clue | PRD mapping | note |
|---|---|---|---|---|---|---|
| `1:9770` / `1:10938` prompt text | 不激励规则提示 | 命中【不激励】规则的账号无法被发奖 | inline prompt + link copy | link text visually separated | PRD 3.1 | exact jump URL P1 |

### Figma Component Refactor Index
| level | UI region / component | Figma fact | structural change | style/state clue | downstream task impact | evidence | status |
|---|---|---|---|---|---|---|---|
| region | 活动参与资格配置项 | 全部用户态展示提示 | 在配置项下方承载提示与链接 | copy + link | 需进入 UI 改造清单 | E-FIG-003 | confirmed |
| region | 预埋用户名单配置项 | 预埋用户态展示同款提示 | 在配置项下方承载提示与链接 | copy + link | 需进入 UI 改造清单 | E-FIG-004 | confirmed |
| state | 查看【不激励】规则 | 点击跳转讨论材料 | 需绑定跳转入口 | link style | exact URL P1 | E-PRD-002/E-FIG-003 | P1_RISK |

### PRD 待补项 / Figma 待确权
| level | item | impact | evidence | status |
|---|---|---|---|---|
| P1 | `查看【不激励】规则` 的正式 URL/资源 token 未在 PRD/Figma 明示 | 影响跳转参数，不影响页面骨架 | E-PRD-002/E-FIG-003/E-FIG-004 | P1_RISK |

### 最小嵌入上下文
奖励配置页沿用既有配置表单；本次新增事实仅在「活动参与资格=全部用户 / 仅限预埋用户名单」两个 option 的配置项下方展示提示和链接。

### 整体层级图
```text
奖励配置表单
├─ 活动参与资格 = 全部用户
│  └─ 不激励规则提示 + 查看【不激励】规则
└─ 活动参与资格 = 仅限预埋用户名单
   └─ 不激励规则提示 + 查看【不激励】规则
```

### 条件渲染图
已并入整体层级图：两个活动参与资格 option 均展示同款提示；其他 option 未在本轮 PRD 明确要求。

### Plan 交接说明
配置页主态证据充足；后续只需在计划阶段处理正式跳转地址来源和埋点参数，不需要重新读取 Figma。

## 奖励投放 - DOU+币剔除明细
### 统一补充事实
| fact | conclusion | evidence | Evidence Level |
|---|---|---|---|
| page_top_node | `1:12120` 为 DOU+币「剔除明细」主态节点。 | E-FIG-005 -> F3/IMG5 | HIGH |
| tab structure | 奖励投放子 Tab 包含「奖励下发」「投放明细」「剔除明细」，当前 active 为「剔除明细」。 | E-FIG-005；E-CODE-002 legacy tabs | HIGH |
| filters | 作品ID筛选支持批量输入视频/图文/直播ID；操作人支持下拉选择与输入搜索。 | E-PRD-004；E-FIG-005 | HIGH |
| table columns | 表格展示「作品内容」「剔除发奖原因」「剔除发奖时间」「操作人」并有分页。 | E-PRD-004；F3/IMG5 | HIGH |
| list semantics | 每发一次奖批量产生一次剔除名单；入列表时提交当前不发奖的剔除名单。 | E-PRD-004 | HIGH |

### 显示语义事实
| figma_node_id | visible field/copy | example value | display shape | style clue | PRD mapping | note |
|---|---|---|---|---|---|---|
| `1:12120` | 作品内容 | 作品预览/标题/ID | table cell composite | preview + text | PRD 3.3 DOU+币列表 | confirmed |
| `1:12120` | 剔除发奖原因 | 不发奖原因字段内容 | text column | normal text | PRD 3.3 | confirmed |
| `1:12120` | 剔除发奖时间 | 手动剔除后提交发奖时间 | time text | normal text | PRD 3.3 | confirmed |
| `1:12120` | 操作人 | 手动剔除提交发奖人员 | text column | normal text | PRD 3.3 | confirmed |

### Figma Component Refactor Index
| level | UI region / component | Figma fact | structural change | style/state clue | downstream task impact | evidence | status |
|---|---|---|---|---|---|---|---|
| global | 奖励投放 SubTab | 新增「剔除明细」Tab | legacy「奖励下发/投放明细」旁新增 Tab | active tab | 需进入 UI 改造清单 | E-FIG-005/E-CODE-002 | confirmed |
| region | DOU+币筛选区 | 作品ID + 操作人 | 新增筛选条件 | batch input/searchable operator | 需进入 UI 改造清单 | E-FIG-005 | confirmed |
| table | DOU+币剔除列表 | 作品内容/原因/时间/操作人/分页 | 新增列表结构 | works composite cell | 需进入 UI 改造清单 | E-FIG-005 | confirmed |
| state | 空/异常/分页接口 | PRD 未给完整接口错误码 | 不阻塞 UI 骨架 | n/a | Plan Discovery | E-TECH-001 | P1_RISK |

### PRD 待补项 / Figma 待确权
| level | item | impact | evidence | status |
|---|---|---|---|---|
| P1 | 剔除明细接口分页、排序、错误码与精确字段合同需以 BAM/IDL 最终确认 | 影响接口接入，不影响 PRD UI 证据 | E-TECH-001 | PLAN_DISCOVERY |

### 最小嵌入上下文
该视图嵌在奖励投放页当前配置项内；`配置一/配置二` 作为外层配置 Tab，`奖励下发/投放明细/剔除明细` 为奖励类型下的二级 Tab。

### 整体层级图
```text
奖励投放页 / DOU+币
├─ 配置 Tab：配置一 / 配置二
└─ SubTab：奖励下发 / 投放明细 / 剔除明细(active)
   ├─ 筛选区：作品ID、操作人
   ├─ 表格：作品内容、剔除发奖原因、剔除发奖时间、操作人
   └─ 分页
```

### 条件渲染图
DOU+币奖励类型命中「剔除明细」时展示作品维度列表；legacy「奖励下发/投放明细」保留。

### Plan 交接说明
DOU+币剔除明细的页面骨架、筛选区、表格列和分页均已确认；接口合同细节按 Plan/BAM discovery 处理。

## 奖励投放 - DOU+券剔除明细
### 统一补充事实
| fact | conclusion | evidence | Evidence Level |
|---|---|---|---|
| page_top_node | `1:12390` 为 DOU+券「剔除明细」主态节点。 | E-FIG-006 -> F4/IMG6 | HIGH |
| tab structure | 奖励投放子 Tab 包含「奖励下发」「投放明细」「剔除明细」，当前 active 为「剔除明细」。 | E-FIG-006；E-CODE-002 legacy tabs | HIGH |
| filters | 作者ID、操作人筛选；操作人支持下拉选择与输入搜索。 | E-PRD-004；E-FIG-006 | HIGH |
| table columns | 表格展示「作者信息」「剔除发奖原因」「剔除发奖时间」「操作人」并有分页。 | E-PRD-004；F4/IMG6 | HIGH |
| list semantics | 每发一次奖批量产生一次剔除名单；入列表时提交当前不发奖的剔除名单。 | E-PRD-004 | HIGH |

### 显示语义事实
| figma_node_id | visible field/copy | example value | display shape | style clue | PRD mapping | note |
|---|---|---|---|---|---|---|
| `1:12390` | 作者信息 | 作者昵称/作者ID | table cell composite | avatar/text style implied by Figma | PRD 3.3 DOU+券列表 | confirmed |
| `1:12390` | 剔除发奖原因 | 不发奖原因字段内容 | text column | normal text | PRD 3.3 | confirmed |
| `1:12390` | 剔除发奖时间 | 手动剔除后提交发奖时间 | time text | normal text | PRD 3.3 | confirmed |
| `1:12390` | 操作人 | 手动剔除并提交发奖人员 | text column | normal text | PRD 3.3 | confirmed |

### Figma Component Refactor Index
| level | UI region / component | Figma fact | structural change | style/state clue | downstream task impact | evidence | status |
|---|---|---|---|---|---|---|---|
| global | 奖励投放 SubTab | 新增「剔除明细」Tab | legacy「奖励下发/投放明细」旁新增 Tab | active tab | 需进入 UI 改造清单 | E-FIG-006/E-CODE-002 | confirmed |
| region | DOU+券筛选区 | 作者ID + 操作人 | 新增筛选条件 | searchable operator | 需进入 UI 改造清单 | E-FIG-006 | confirmed |
| table | DOU+券剔除列表 | 作者信息/原因/时间/操作人/分页 | 新增列表结构 | author composite cell | 需进入 UI 改造清单 | E-FIG-006 | confirmed |
| state | 空/异常/分页接口 | PRD 未给完整接口错误码 | 不阻塞 UI 骨架 | n/a | Plan Discovery | E-TECH-001 | P1_RISK |

### PRD 待补项 / Figma 待确权
| level | item | impact | evidence | status |
|---|---|---|---|---|
| P1 | 剔除明细接口分页、排序、错误码与精确字段合同需以 BAM/IDL 最终确认 | 影响接口接入，不影响 PRD UI 证据 | E-TECH-001 | PLAN_DISCOVERY |

### 最小嵌入上下文
该视图嵌在奖励投放页当前配置项内；与 DOU+币共享新增「剔除明细」SubTab，但表格维度从作品切换为作者。

### 整体层级图
```text
奖励投放页 / DOU+券
├─ 配置 Tab：配置一 / 配置二
└─ SubTab：奖励下发 / 投放明细 / 剔除明细(active)
   ├─ 筛选区：作者ID、操作人
   ├─ 表格：作者信息、剔除发奖原因、剔除发奖时间、操作人
   └─ 分页
```

### 条件渲染图
DOU+券奖励类型命中「剔除明细」时展示作者维度列表；legacy「奖励下发/投放明细」保留。

### Plan 交接说明
DOU+券剔除明细的页面骨架、筛选区、表格列和分页均已确认；接口合同细节按 Plan/BAM discovery 处理。

## 奖励投放 - 人工提报 Drawer
### 统一补充事实
| fact | conclusion | evidence | Evidence Level |
|---|---|---|---|
| page_top_node | 命中态使用 `87:6973` Drawer 内容 sibling；`25:13842` 是状态 frame context。 | E-FIG-007 -> F5/F7/IMG7 | HIGH |
| drawer container | Drawer 标题为「提报视频」，包含提报方式、奖励配置、提示/操作区、表格、footer。 | E-FIG-007 | HIGH |
| submit methods | Figma 覆盖「手动输入」与「批量上传」两个 option；批量上传态为 reference-baseline。 | E-FIG-007/E-FIG-008 | HIGH |
| hit summary | 命中态展示 `共100个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：5个`。 | F5/IMG7 | HIGH |
| actions | 命中态操作区包含「一键移除」「导出剔除明细」。 | F5/IMG7；E-PRD-003 | HIGH |
| row status | 表格行可见红字 `不满足准入门槛  命中【不激励】规则` 或 `命中【不激励】规则`，并有行级「移除」。 | F7/IMG7 | HIGH |
| footer | Drawer footer 包含「取消」「提交并投放」；PRD 要求未移除处罚作品/账号前禁止提交。 | F5/IMG7；E-PRD-003 | HIGH |
| export semantics | PRD 要求只导出剔除明细，字段含账号ID、视频ID、视频名称、移除原因、处罚原因、操作人；移除原因/处罚原因语义仍有评论未完全闭合。 | E-PRD-003 | MEDIUM |

### 显示语义事实
| figma_node_id | visible field/copy | example value | display shape | style clue | PRD mapping | note |
|---|---|---|---|---|---|---|
| `87:6993/87:6998` | 命中汇总提示 | 共100个作品，其中...5个 | alert / prompt row | warning context | PRD 3.2 人工提报 | confirmed |
| `87:6999/87:7000` | 一键移除 | 一键移除 | action button | primary/secondary action group | PRD 3.2 | confirmed |
| `87:6999/87:7002` | 导出剔除明细 | 导出剔除明细 | action button | PRD comment settled wording | PRD 3.2 | confirmed |
| `87:7016` rows | 不满足准入门槛 / 命中【不激励】规则 | 命中【不激励】规则 | red inline status under content cell | red text | PRD 3.2 | confirmed |
| `87:7043` and row peers | 移除 | 移除 | text link | row action | PRD 3.2 | confirmed |

### Figma Component Refactor Index
| level | UI region / component | Figma fact | structural change | style/state clue | downstream task impact | evidence | status |
|---|---|---|---|---|---|---|---|
| component | Drawer-提报视频 | content sibling is state top node | 使用 Drawer 内容而非背景 frame 作为页面合同 | title + close + form | 需进入 UI 改造清单 | E-FIG-007 | confirmed |
| state | 提报方式 | 手动输入 / 批量上传 | 两个 option 均需承载治理命中限制 | radio option | 需进入 UI 改造清单 | E-FIG-007/E-FIG-008 | confirmed/reference |
| region | 命中提示/操作区 | 汇总提示 + 一键移除 + 导出剔除明细 | 新增操作区 | warning prompt + buttons | 需进入 UI 改造清单 | E-FIG-007 | confirmed |
| table | 提报作品表格 | 行级命中状态与移除动作 | 增加 if_not_incentive 可见态 | red text + row link | 需进入 UI 改造清单 | E-FIG-007 | confirmed |
| state | 提交限制 | 禁止提交处罚作品/账号 | footer submit 前置校验 | error copy 由 PRD 提供业务规则 | 需进入 UI 改造清单 | E-PRD-003/E-FIG-007 | confirmed |
| state | 批量上传命中态 | 仅确认批量上传 baseline，未找到单独 not-incentive 命中视觉变体 | 不改变 Drawer 骨架 | reference | P1 确认即可 | E-FIG-008 | P1_RISK |

### PRD 待补项 / Figma 待确权
| level | item | impact | evidence | status |
|---|---|---|---|---|
| P1 | 批量上传是否需要独立「命中【不激励】」视觉变体 | 当前已确认批量上传 option/table baseline；若需要不同命中态会影响局部状态，不影响 Drawer 骨架 | E-FIG-008 | P1_RISK |
| P1 | 导出剔除明细字段中「移除原因」「处罚原因」最终口径 | 影响导出列/数据来源，不影响按钮和主流程 | E-PRD-003 评论回填 | P1_RISK |
| P1 | 治理校验失败/异常错误提示是否由前端透传或后端 message 统一返回 | 影响错误处理实现细节，不影响 PRD UI 主态证据 | E-PRD-003/E-TECH-001 | PLAN_DISCOVERY |

### 最小嵌入上下文
人工提报为奖励投放页中的 Drawer 子流程。命中态和批量上传态均以 Drawer 内容 sibling 为主证据，背景页面只用于说明来源，不进入实现范围判断。

### 整体层级图
```text
奖励投放页 / 人工提报
└─ Drawer：提报视频
   ├─ 提报方式：手动输入 / 批量上传
   ├─ 奖励配置
   ├─ 命中提示区：共{作品总数}...{作品个数}
   ├─ 操作区：一键移除 / 导出剔除明细
   ├─ 表格：视频/图文内容、投放金额、投放时长、转化目标偏好、投放生效时间、目标受众、提报理由、操作
   │  └─ 行状态：不满足准入门槛 / 命中【不激励】规则 + 移除
   └─ Footer：取消 / 提交并投放
```

### 条件渲染图
```text
提交/导入作品后
├─ 存在不满足准入门槛或命中【不激励】规则
│  ├─ 展示汇总提示与一键移除/导出剔除明细
│  ├─ 行内展示红字原因与移除动作
│  └─ 未移除前禁止提交并投放
└─ 无命中项
   └─ 按既有人工提报流程提交并投放
```

### Plan 交接说明
人工提报命中态的 Drawer 容器、区域顺序、按钮顺序、表格行态和提交限制均已确认；批量上传独立命中视觉和导出字段细节为 P1，不构成 Figma P0 阻塞。

## Gate Verdict G1-G18
| gate | result | evidence_id | note |
|---|---|---|---|
| G1 | PASS | E-FIG-001 | fileKey 与 entry nodeId 已解析。 |
| G2 | PASS | Tool Descriptor Evidence / IMG1 | descriptor 已读；截图导出运行时探测成功。 |
| G3 | PASS | E-FIG-001 | entry node 已读取。 |
| G4 | PASS | 候选节点评分 | 深扫候选受控且有评分。 |
| G5 | PASS | 页面分节 | 事实已按配置页、DOU+币、DOU+券、人工提报拆分。 |
| G6 | PASS | 页面总览 | 每个核心页面/状态均有 page_top_node。 |
| G7 | PASS | E-FIG-005/E-FIG-006/E-FIG-007/E-FIG-008 | 表格/列表父容器已深扫。 |
| G8 | PASS | Visual Tile Index | 表格/列表截图已导出并回溯。 |
| G9 | PASS | 页面分节层级图 | 筛选区/操作区/内容区/分页顺序已确认。 |
| G10 | PASS | Sibling Overlay Scan | Drawer 状态证据闭合。 |
| G11 | PASS | Figma Component Refactor Index | 已有可追溯组件改造索引。 |
| G12 | PASS | PRD 待补项 / P0 判断 | 无缺失核心页面/状态 P0；P1 已登记。 |
| G13 | PASS | 页面总览 / Page Evidence Coverage | 每个 FIGMA_MAIN_STATE_CONFIRMED 页面满足证据下限。 |
| G14 | PASS | Requirement-to-Atlas Coverage | Tab/switcher option 均有证据、legacy 或 reference 状态。 |
| G15 | PASS | Requirement-to-Atlas Coverage | PRD 明确 UI 状态均已深扫、reference 或登记 P1。 |
| G16 | PASS | `figma-cache/atlas/pages.md` | Atlas 清单已建立。 |
| G17 | PASS | `figma-cache/atlas/tiles.md` | visual tiles 与回溯链已建立。 |
| G18 | PASS | `figma-cache/atlas/requirements-map.md` | 当前 scope requirement-to-Atlas 映射完整。 |

## P0 / P1 结论
| level | item | judgment | evidence |
|---|---|---|---|
| P0 | 核心页面骨架、区域顺序、表格、Drawer、Tab active 态 | 无 P0 阻塞 | G1-G18 PASS；E-FIG-003~E-FIG-008 |
| P1 | 跳转目标正式 URL | 需确认，不阻塞 Figma/UI 骨架 | E-PRD-002/E-FIG-003/E-FIG-004 |
| P1 | 人工提报导出字段与移除/处罚原因口径 | 需确认，不阻塞按钮/主态 | E-PRD-003 评论回填 |
| P1 | 批量上传是否需要独立命中视觉变体 | 当前为 reference-baseline，不阻塞主态 | E-FIG-008 |
| PLAN_DISCOVERY | 剔除明细接口字段、分页、排序、错误码 | 技术计划/BAM 继续闭合 | E-TECH-001 |
