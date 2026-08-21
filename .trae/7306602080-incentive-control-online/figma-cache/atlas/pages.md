# Figma Atlas Pages

## Source
| item | value |
|---|---|
| figma_url | https://www.figma.com/design/fNJJ7mEmEMYU5y0tcAZm3X/Untitled?node-id=0-1&p=f&m=dev |
| fileKey | fNJJ7mEmEMYU5y0tcAZm3X |
| entry nodeId | 0:1 |
| entry cache | F1 -> figma-cache/nodes/F1-get_figma_data-0_1-d2.md |
| atlas top frame | 1:9176 -> F2 -> figma-cache/nodes/F2-get_figma_data-1_9176-d3.md |
| screenshot atlas | IMG2 -> figma-cache/screenshots/1_9176-atlas-overview.png |

## Page / Top-Level Frame Coverage
| atlas_unit | type | nodeId | parent | visible clue | coverage decision | evidence |
|---|---|---|---|---|---|---|
| Page 1 | CANVAS | 0:1 | file | `5/7 不激励剔除`, Before/After, multiple states | in-scope file page | E-FIG-001 |
| 不激励剔除总览 | FRAME | 1:9176 | 0:1 | 奖励配置、DOU+币/券、人工提报、剔除明细 | page_top_node for atlas overview | E-FIG-002 |

## Candidate State / Child View Atlas
| atlas_unit | type | nodeId | page/top_frame | PRD hit | decision | evidence |
|---|---|---|---|---|---|---|
| 奖励配置-全部用户-After | GROUP | 1:9770 | 1:9176 | 全部用户提示“账号校验 / 查看【不激励】规则” | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-003 |
| 奖励配置-预埋用户名单-After | GROUP | 1:10938 | 1:9176 | 仅限预埋用户同款提示 | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-004 |
| 奖励投放-DOU+币-剔除明细 | GROUP | 1:12120 | 1:9176 | DOU+币新增剔除明细 Tab / 作品维度表 | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-005 |
| 奖励投放-DOU+券-剔除明细 | GROUP | 1:12390 | 1:9176 | DOU+券新增剔除明细 Tab / 作者维度表 | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-006 |
| 人工提报-命中态 State Frame | FRAME | 25:13842 | 1:9176 | 命中【不激励】规则、汇总提示、一键移除、导出剔除明细 | state frame confirmed; Drawer content node is 87:6973 | E-FIG-007 |
| 人工提报-批量上传态 State Frame | FRAME | 25:13971 | 1:9176 | 批量上传 option / table baseline / existing invalid states | reference-baseline; Drawer content node is 101:6308 | E-FIG-008 |
| 人工提报-命中态表格行 | FRAME | 87:7016 | 25:13842 / 87:6973 | 红字“不满足准入门槛 / 命中【不激励】规则”、行级移除 | deep-scan confirmed | E-FIG-007 |
| 人工提报-批量上传表格 | FRAME | 101:6332 | 25:13971 / 101:6308 | 批量上传表格列、 legacy invalid/delivery record states | deep-scan reference | E-FIG-008 |

## Overlay / Drawer Grouping
| state | parent/state frame | background sibling | drawer/content sibling | decision | evidence |
|---|---|---|---|---|---|
| 人工提报-命中态 | 25:13842 | 87:6945 背景页面-非需求上下文 | 87:6973 Drawer-提报视频 | Use drawer/content sibling as state top node; background only context | E-FIG-007 |
| 人工提报-批量上传态 | 25:13971 | 101:6295 背景页面-非需求上下文 | 101:6308 Drawer-提报视频 | Use drawer/content sibling as state top node; background only context | E-FIG-008 |
