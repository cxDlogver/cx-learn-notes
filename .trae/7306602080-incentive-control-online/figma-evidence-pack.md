# Figma Evidence Pack

## Source
| item | value |
|---|---|
| workspace | /Users/bytedance/cx/spec-2/meego-11/artifacts/7306602080-incentive-control-online |
| PRD | prd-source.md |
| Figma URL | https://www.figma.com/design/fNJJ7mEmEMYU5y0tcAZm3X/Untitled?node-id=0-1&p=f&m=dev |
| fileKey | fNJJ7mEmEMYU5y0tcAZm3X |
| entry nodeId | 0:1 |
| authority | PRD line 36 records the Figma design URL; PRD remains highest product source. |

## Tool Descriptor Evidence
| descriptor | schema capability | runtime result | decision |
|---|---|---|---|
| /Users/bytedance/.trae-cn/mcps/s_meego-11-5c03ba46/prd-analyzer/mcp_bytedance-figma-mcp/tools/get_figma_data.json | required `fileKey`, optional `nodeId`, optional `depth` | F1-F8 succeeded by parsed PRD fileKey/nodeId | URL was not passed raw; PRD URL was parsed to fileKey/nodeId and direct-read against same target. Desktop content not used. |
| /Users/bytedance/.trae-cn/mcps/s_meego-11-5c03ba46/prd-analyzer/mcp_bytedance-figma-mcp/tools/download_figma_images.json | descriptor says image/icon node download by `fileKey`, `nodes`, `localPath` | IMG1 probe on FRAME 25:13971 succeeded; IMG2-IMG8 exported core screenshots | descriptor-limited / runtime-validated screenshot export supported for this file and nodes. |
| /Users/bytedance/.trae-cn/mcps/s_meego-11-5c03ba46/prd-analyzer/mcp_feishu/tools/feishu_fetch_doc.json | doc/wiki URL or token | L1 wiki fetched; L2 wiki permission/network failed; L3 minutes URL validation failed | Supplemental source gaps are P1, not Figma/tool unavailability. |

## Tool Capability
| capability | supported | evidence | impact |
|---|---|---|---|
| PRD fileKey/nodeId direct read | yes | descriptor + F1/F2 call log | Can use PRD Figma URL after parsing fileKey/nodeId. |
| Raw PRD URL parameter | no explicit raw URL param | descriptor only exposes fileKey/nodeId | Evidence wording uses “parsed PRD URL target direct read”, not “raw URL param read”. |
| Desktop active document read | not used | no Desktop tool call in this pack | Desktop content excluded. |
| Node/FRAME screenshot export | yes, runtime-validated | IMG1 probe and IMG2-IMG8 files in manifest | Screenshots support page coverage and visual tile index. |
| Lark wiki/doc fetch | partial | L1 success; L2/L3 failures cached | Core UI not blocked; source gaps recorded as P1. |

## Direct URL / Fallback Log
| attempt | args_delta | result | note |
|---|---|---|---|
| A1 | parse PRD URL -> fileKey=fNJJ7mEmEMYU5y0tcAZm3X, nodeId=0:1, depth=2 | success -> F1 | Direct target from PRD URL read. |
| A2 | use F1 child top frame 1:9176, depth=3 | success -> F2 | Atlas top frame read; no JSON_TOO_LARGE. |
| A3 | targeted reads 1:12120 / 1:12390 / 25:13842 / 25:13971 / 87:7016 / 101:6332 | success -> F3-F8 | Closed table, drawer and state evidence. |
| A4 | screenshot probe 25:13971 through download_figma_images | success -> IMG1 | descriptor-limited but runtime-validated. |
| A5 | export core screenshots 1:9176, 1:9770, 1:10938, 1:12120, 1:12390, 25:13842, 25:13971 | success -> IMG2-IMG8 | Page/state visual evidence complete. |

## Cache Manifest
| item | value |
|---|---|
| manifest | figma-cache/manifest.md |
| atlas pages | figma-cache/atlas/pages.md |
| atlas tiles | figma-cache/atlas/tiles.md |
| requirements map | figma-cache/atlas/requirements-map.md |
| structure reads | F1-F8 |
| screenshots | IMG1-IMG8 |
| supplemental cache | L1-L3 |

## Direct Node Targets
| target_id | source | nodeId | URL | intended UI state | read status | decision |
|---|---|---|---|---|---|---|
| DNT-001 | PRD `figma设计稿` | 0:1 | https://www.figma.com/design/fNJJ7mEmEMYU5y0tcAZm3X/Untitled?node-id=0-1&p=f&m=dev | File/page entry | read success F1 | Use for entry only; not sufficient as full file evidence. |
| DNT-002 | Atlas child from F1/F2 | 1:9176 | same file | Overall top frame | read success F2 + IMG2 | page_top_node for atlas overview. |
| DNT-003 | Targeted Atlas | 1:9770 | same file | 奖励配置-全部用户 After | available in F2 + IMG3 | FIGMA_MAIN_STATE_CONFIRMED. |
| DNT-004 | Targeted Atlas | 1:10938 | same file | 奖励配置-预埋用户名单 After | available in F2 + IMG4 | FIGMA_MAIN_STATE_CONFIRMED. |
| DNT-005 | Targeted Atlas | 1:12120 | same file | DOU+币剔除明细 | read success F3 + IMG5 | FIGMA_MAIN_STATE_CONFIRMED. |
| DNT-006 | Targeted Atlas | 1:12390 | same file | DOU+券剔除明细 | read success F4 + IMG6 | FIGMA_MAIN_STATE_CONFIRMED. |
| DNT-007 | Targeted Atlas | 25:13842 | same file | 人工提报命中态 | read success F5/F7 + IMG7 | FIGMA_MAIN_STATE_CONFIRMED; content drawer 87:6973. |
| DNT-008 | Targeted Atlas | 25:13971 | same file | 人工提报批量上传态 | read success F6/F8 + IMG1/IMG8 | Reference baseline for batch upload option. |

## Sibling Overlay Scan
| state | parent node | background sibling | modal/content sibling | evidence | decision |
|---|---|---|---|---|---|
| 人工提报-命中态 | 25:13842 | 87:6945 背景页面-非需求上下文 | 87:6973 Drawer-提报视频 | F5 lines show both children; IMG7 screenshot | Drawer/content sibling is state top node; background only context. |
| 人工提报-批量上传态 | 25:13971 | 101:6295 背景页面-非需求上下文 | 101:6308 Drawer-提报视频 | F6 lines 91-96; IMG8 screenshot | Drawer/content sibling is state top node; background only context. |

## Figma Atlas
| atlas_item | nodeId | type | page/top_frame | children_count | screenshot | PRD clue | action |
|---|---|---|---|---:|---|---|---|
| Page 1 | 0:1 | CANVAS | file | top frame present | n/a | PRD URL | entry only |
| Overall top frame | 1:9176 | FRAME | Page 1 | multiple state groups | IMG2 | all core UI scopes | atlas root |
| Config all-user after | 1:9770 | GROUP | 1:9176 | prompt and config form | IMG3 | PRD 3.1 场景一 | main confirmed |
| Config prefilled after | 1:10938 | GROUP | 1:9176 | prompt and config form | IMG4 | PRD 3.1 场景二 | main confirmed |
| DOU+币 removal detail | 1:12120 | GROUP | 1:9176 | filter + table + pagination | IMG5 | PRD 3.3 场景一 | main confirmed |
| DOU+券 removal detail | 1:12390 | GROUP | 1:9176 | filter + table + pagination | IMG6 | PRD 3.3 场景二 | main confirmed |
| Manual submit hit | 25:13842 / 87:6973 | FRAME/Drawer | 1:9176 | alert/action/table/footer | IMG7 | PRD 3.2 场景三 | main confirmed |
| Manual submit batch upload | 25:13971 / 101:6308 | FRAME/Drawer | 1:9176 | upload controls/table/footer | IMG8 | 提报方式 option | reference baseline |

## Visual Tile Index
| tile_id | screenshot | visible region | likely node / state | PRD clue | node backtrace | action |
|---|---|---|---|---|---|---|
| TILE-OVERVIEW | figma-cache/screenshots/1_9176-atlas-overview.png | Full atlas | 1:9176 | PRD design URL | F2 | index only |
| TILE-CFG-ALL | figma-cache/screenshots/1_9770-config-all-user-after.png | Activity eligibility all users | 1:9770 | PRD 3.1 | F2 prompt text | confirmed |
| TILE-CFG-PREFILLED | figma-cache/screenshots/1_10938-config-prefilled-after.png | Prefilled user list | 1:10938 | PRD 3.1 | F2 prompt text | confirmed |
| TILE-COIN-REMOVE | figma-cache/screenshots/1_12120-dou-coin-removal-detail.png | Coin removal table | 1:12120 | PRD 3.3 | F3 | confirmed |
| TILE-COUPON-REMOVE | figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png | Coupon removal table | 1:12390 | PRD 3.3 | F4 | confirmed |
| TILE-MANUAL-HIT | figma-cache/screenshots/25_13842-manual-submit-hit-state.png | Manual drawer hit | 25:13842 / 87:6973 | PRD 3.2 | F5/F7 | confirmed |
| TILE-MANUAL-BATCH | figma-cache/screenshots/25_13971-manual-submit-batch-upload-state.png | Batch upload option | 25:13971 / 101:6308 | submit option | F6/F8 | reference |

## Requirement-to-Atlas Coverage
| requirement / UI state | PRD clue | atlas candidates | selected node | evidence_id | status | next action |
|---|---|---|---|---|---|---|
| 配置页全部用户提示 | PRD 3.1 | 1:9770 | 1:9770 | E-FIG-003 | matched | Plan consume |
| 配置页预埋用户提示 | PRD 3.1 | 1:10938 | 1:10938 | E-FIG-004 | matched | Plan consume |
| 人工提报命中提示/操作区 | PRD 3.2 | 25:13842 | 87:6993/87:6999 | E-FIG-007 | matched | Plan consume |
| 人工提报表格命中行 | PRD 3.2 | 87:7016 | 87:7016 | E-FIG-007 | matched | Plan consume |
| 人工提报批量上传 option | Figma visible option / PRD manual submission | 25:13971, 101:6332 | 101:6308 / 101:6332 | E-FIG-008 | matched/reference | P1 note: no separate hit variant found |
| DOU+币剔除明细 | PRD 3.3 | 1:12120 | 1:12120 | E-FIG-005 | matched | Plan consume |
| DOU+券剔除明细 | PRD 3.3 | 1:12390 | 1:12390 | E-FIG-006 | matched | Plan consume |
| 剔除明细埋点 | PRD 4 | 1:12120/1:12390 | tab states | E-PRD-006; E-FIG-005/006 | matched | Plan consume |

## MCP Call Log
| call_id | tool | args | result | cache_id | cache_path |
|---|---|---|---|---|---|
| F1 | get_figma_data | `{fileKey:fNJJ7mEmEMYU5y0tcAZm3X,nodeId:0:1,depth:2}` | success | F1 | figma-cache/nodes/F1-get_figma_data-0_1-d2.md |
| F2 | get_figma_data | `{fileKey:fNJJ7mEmEMYU5y0tcAZm3X,nodeId:1:9176,depth:3}` | success | F2 | figma-cache/nodes/F2-get_figma_data-1_9176-d3.md |
| F3 | get_figma_data | `{fileKey:fNJJ7mEmEMYU5y0tcAZm3X,nodeId:1:12120,depth:4}` | success | F3 | figma-cache/nodes/F3-get_figma_data-1_12120-d4.md |
| F4 | get_figma_data | `{fileKey:fNJJ7mEmEMYU5y0tcAZm3X,nodeId:1:12390,depth:4}` | success | F4 | figma-cache/nodes/F4-get_figma_data-1_12390-d4.md |
| F5 | get_figma_data | `{fileKey:fNJJ7mEmEMYU5y0tcAZm3X,nodeId:25:13842,depth:5}` | success | F5 | figma-cache/nodes/F5-get_figma_data-25_13842-d5.md |
| F6 | get_figma_data | `{fileKey:fNJJ7mEmEMYU5y0tcAZm3X,nodeId:25:13971,depth:5}` | success | F6 | figma-cache/nodes/F6-get_figma_data-25_13971-d5.md |
| F7 | get_figma_data | `{fileKey:fNJJ7mEmEMYU5y0tcAZm3X,nodeId:87:7016,depth:6}` | success | F7 | figma-cache/nodes/F7-get_figma_data-87_7016-d6.md |
| F8 | get_figma_data | `{fileKey:fNJJ7mEmEMYU5y0tcAZm3X,nodeId:101:6332,depth:6}` | success | F8 | figma-cache/nodes/F8-get_figma_data-101_6332-d6.md |
| IMG1 | download_figma_images | `{fileKey,nodes:[25:13971],localPath:figma-cache/screenshots}` | success | IMG1 | figma-cache/screenshots/25_13971-artificial-submit-removal-probe.png |
| IMG2 | download_figma_images | `{fileKey,nodes:[1:9176]}` | success | IMG2 | figma-cache/screenshots/1_9176-atlas-overview.png |
| IMG3 | download_figma_images | `{fileKey,nodes:[1:9770]}` | success | IMG3 | figma-cache/screenshots/1_9770-config-all-user-after.png |
| IMG4 | download_figma_images | `{fileKey,nodes:[1:10938]}` | success | IMG4 | figma-cache/screenshots/1_10938-config-prefilled-after.png |
| IMG5 | download_figma_images | `{fileKey,nodes:[1:12120]}` | success | IMG5 | figma-cache/screenshots/1_12120-dou-coin-removal-detail.png |
| IMG6 | download_figma_images | `{fileKey,nodes:[1:12390]}` | success | IMG6 | figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png |
| IMG7 | download_figma_images | `{fileKey,nodes:[25:13842]}` | success | IMG7 | figma-cache/screenshots/25_13842-manual-submit-hit-state.png |
| IMG8 | download_figma_images | `{fileKey,nodes:[25:13971]}` | success | IMG8 | figma-cache/screenshots/25_13971-manual-submit-batch-upload-state.png |
| L1 | feishu_fetch_doc | `{doc_id:T7YX...,limit:...}` | success | L1 | supplement-cache/docs/L1-T7YX-interface-doc.md |
| L2 | feishu_fetch_doc | `{doc_id:VW1W...}` | error: forbidden/network | L2 | supplement-cache/raw/L2-feishu_fetch_doc-VW1W-related-doc.error.json |
| L3 | feishu_fetch_doc | `{doc_id:minutes URL}` | error: unsupported URL | L3 | supplement-cache/raw/L3-feishu_fetch_doc-minutes-LR.error.json |

## Evidence Index
| evidence_id | cache_id | raw node / screenshot | extracted fact | supports |
|---|---|---|---|---|
| E-FIG-001 | F1 | 0:1 | Page 1 contains top frame 1:9176 and `5/7 不激励剔除` design context | G1-G3, Atlas entry |
| E-FIG-002 | F2, IMG2 | 1:9176 | Atlas top frame contains config, DOU+币/券, manual submit states | G16-G18 |
| E-FIG-003 | F2, IMG3 | 1:9770 | 全部用户 state displays prompt `奖励发放环节将进行账号校验...查看【不激励】规则` under configuration form | AR-01, G13-G15 |
| E-FIG-004 | F2, IMG4 | 1:10938 | 预埋用户名单 state displays same prompt and prefilled user list context | AR-02, G13-G15 |
| E-FIG-005 | F3, IMG5 | 1:12120 | DOU+币剔除明细 active tab; filters include batch input and operator; table includes 作品内容/剔除发奖原因/剔除发奖时间/操作人/pagination | AR-09, G7-G9, G13-G15 |
| E-FIG-006 | F4, IMG6 | 1:12390 | DOU+券剔除明细 active tab; filters include candidate/author and operator; table includes 作者信息/剔除发奖原因/剔除发奖时间/操作人/pagination | AR-10, G7-G9, G13-G15 |
| E-FIG-007 | F5, F7, IMG7 | 25:13842, 87:7016 | Manual submit hit drawer; alert, one-click remove, export, row-level not-incentive labels, footer submit | AR-06, AR-07, AR-08, G10, G13-G15 |
| E-FIG-008 | F6, F8, IMG1, IMG8 | 25:13971, 101:6332 | Batch upload option and table baseline; export probe succeeded | G2, G7, G14-G15 |
| E-PRD-001 | PRD | prd-source.md:107-144 | Scope and P0 demand points: reward config, pre-delivery removal, detail query/manual submit | Atomic Requirements |
| E-PRD-002 | PRD | prd-source.md:147-164 | Config prompt copy/location/link interaction for all users and prefilled users | AR-01, AR-02 |
| E-PRD-003 | PRD | prd-source.md:166-192 | Pre-delivery object/time/status rules, manual submit display/actions/export/submission restriction | AR-04-AR-08 |
| E-PRD-004 | PRD | prd-source.md:194-198 | Removal detail tab list logic, filters and table fields | AR-09, AR-10 |
| E-PRD-005 | PRD | prd-source.md:200-208 | Tracking requirements for rule click, manual prompt exposure, removal tab exposure/click | AR-11 |
| E-TECH-001 | tech-doc/L1 | tech-doc-raw.md and L1 | Interface fields/methods: if_not_incentive, not_incentive_reason, download_content_remove_record, candidate_remove, remove record APIs | Interface dependency |
| E-CODE-001 | readonly code | step-reward-config index lines 44-127/669-713 | Current code landing area for prompt/link; read-only baseline only | UI source map |
| E-CODE-002 | readonly code | send-award index lines 566-989 | Existing reward/detail sub-tabs and rendering slots | Legacy baseline |
| E-CODE-003 | readonly code | manual submit drawer/form/store | Current manual submit validation/table/API baseline | Legacy baseline |

## Candidate Scoring
| candidate | hit features | score | decision |
|---|---|---:|---|
| 1:9176 overall top frame | Contains all PRD visible state labels and child states | 95 | Atlas root, not a single requirement state |
| 1:9770 config all-user after | Prompt copy, activity eligibility context, screenshot | 100 | selected |
| 1:10938 config prefilled after | Prompt copy, prefilled user list context, screenshot | 100 | selected |
| 1:12120 DOU+币 removal detail | Active 剔除明细, filters, table, pagination | 100 | selected |
| 1:12390 DOU+券 removal detail | Active 剔除明细, author table, pagination | 100 | selected |
| 25:13842 manual submit hit | Drawer, alert, action group, table rows, footer | 100 | selected |
| 25:13971 manual batch upload | Drawer, batch upload controls, table baseline | 78 | reference-baseline for option coverage |
| 87:7016 BodyRows | Row-level not-incentive labels/action | 95 | selected deep scan |
| 101:6332 batch table | Batch upload table baseline | 75 | reference deep scan |

## Page Top Node Decisions
| page / subview | decision | evidence_id | gap |
|---|---|---|---|
| Figma file / overall atlas | 1:9176 | E-FIG-002 | none |
| 奖励配置-全部用户 | 1:9770 | E-FIG-003 | none |
| 奖励配置-预埋用户名单 | 1:10938 | E-FIG-004 | none |
| DOU+币剔除明细 | 1:12120 | E-FIG-005 | none |
| DOU+券剔除明细 | 1:12390 | E-FIG-006 | none |
| 人工提报-命中态 | 87:6973 Drawer-提报视频; 25:13842 is state frame context | E-FIG-007 | none |
| 人工提报-批量上传态 | 101:6308 Drawer-提报视频; 25:13971 is state frame context | E-FIG-008 | no separate not-incentive hit variant for batch upload; P1 note only |

## Screenshot Export Log
| nodeId | localPath | result | reason_if_not_run |
|---|---|---|---|
| 25:13971 | figma-cache/screenshots/25_13971-artificial-submit-removal-probe.png | success(runtime probe) | n/a |
| 1:9176 | figma-cache/screenshots/1_9176-atlas-overview.png | success | n/a |
| 1:9770 | figma-cache/screenshots/1_9770-config-all-user-after.png | success | n/a |
| 1:10938 | figma-cache/screenshots/1_10938-config-prefilled-after.png | success | n/a |
| 1:12120 | figma-cache/screenshots/1_12120-dou-coin-removal-detail.png | success | n/a |
| 1:12390 | figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png | success | n/a |
| 25:13842 | figma-cache/screenshots/25_13842-manual-submit-hit-state.png | success | n/a |
| 25:13971 | figma-cache/screenshots/25_13971-manual-submit-batch-upload-state.png | success | n/a |

## Page Evidence Coverage Matrix
| page / state | structure tree | screenshot | region order | table/list | action/footer/pagination | result |
|---|---|---|---|---|---|---|
| 奖励配置-全部用户 | F2 | IMG3 | PASS | N_A | prompt link PASS | FIGMA_MAIN_STATE_CONFIRMED |
| 奖励配置-预埋用户名单 | F2 | IMG4 | PASS | N_A | prompt link PASS | FIGMA_MAIN_STATE_CONFIRMED |
| DOU+币剔除明细 | F3 | IMG5 | PASS | PASS | filter + pagination PASS | FIGMA_MAIN_STATE_CONFIRMED |
| DOU+券剔除明细 | F4 | IMG6 | PASS | PASS | filter + pagination PASS | FIGMA_MAIN_STATE_CONFIRMED |
| 人工提报-命中态 | F5 + F7 | IMG7 | PASS | PASS | one-click/export/footer PASS | FIGMA_MAIN_STATE_CONFIRMED |
| 人工提报-批量上传态 | F6 + F8 | IMG8 | PASS | PASS | upload/footer PASS | REFERENCE_BASELINE_CONFIRMED |

## State Evidence Matrix
| business domain / Tab / Switcher option | status | evidence | note |
|---|---|---|---|
| 活动参与资格=全部用户 | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-003 | Prompt under config item. |
| 活动参与资格=仅限预埋用户 | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-004 | Prompt under prefilled user list. |
| 奖励投放配置 Tab=配置一/配置二 | LEGACY_BASELINE_CONFIRMED | E-CODE-002, E-FIG-005/E-FIG-006 | Existing config tabs retained. |
| SubTab=奖励下发 | LEGACY_BASELINE_CONFIRMED | E-CODE-002 | Existing tab; PRD does not require new UI except governance effects. |
| SubTab=投放明细 | LEGACY_BASELINE_CONFIRMED | E-CODE-002 | Existing tab retained. |
| SubTab=剔除明细 | NEW_UI_STATE_CONFIRMED | E-FIG-005, E-FIG-006 | New active tab for DOU+币/券. |
| Reward type=DOU+币 | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-005 | Works/content dimension detail. |
| Reward type=DOU+券 | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-006 | Author dimension detail. |
| Reward mode=人工提报-手动输入 | FIGMA_MAIN_STATE_CONFIRMED | E-FIG-007 | Hit state verified. |
| Reward mode=人工提报-批量上传 | REFERENCE_BASELINE_CONFIRMED | E-FIG-008 | Option/table baseline verified; same not-incentive rules should be carried by Plan, no distinct Figma hit variant found. |

## Deep Scan Coverage Matrix
| target | depth | parent/container | key fields / controls | result |
|---|---:|---|---|---|
| 1:12120 DOU+币 table | 4 | removal detail group | 作品内容、剔除发奖原因、剔除发奖时间、操作人、分页 | PASS |
| 1:12390 DOU+券 table | 4 | removal detail group | 作者信息、剔除发奖原因、剔除发奖时间、操作人、分页 | PASS |
| 25:13842 manual drawer | 5 | drawer state frame | 提报方式、奖励配置、汇总提示、一键移除、导出剔除明细、footer | PASS |
| 87:7016 manual hit rows | 6 | Table-奖励配置作品列表 | row labels: 不满足准入门槛 / 命中【不激励】规则, 移除 | PASS |
| 25:13971 batch upload drawer | 5 | drawer state frame | 批量上传、上传模板、提交、table/footer | PASS(reference) |
| 101:6332 batch upload table | 6 | Table-奖励配置作品列表 | table columns, legacy invalid/delivery states | PASS(reference) |

## Gate Verdict G1-G18
| gate | result | evidence_id | note |
|---|---|---|---|
| G1 | PASS | E-FIG-001 | fileKey and entry nodeId parsed. |
| G2 | PASS | Tool Descriptor Evidence, IMG1 | Descriptor read; runtime export probe completed. |
| G3 | PASS | E-FIG-001 | Entry node read. |
| G4 | PASS | Candidate Scoring | Controlled candidate deep scan. |
| G5 | PASS | Page Top Node Decisions | Facts split by page/subview. |
| G6 | PASS | Page Top Node Decisions | Every core page has top node. |
| G7 | PASS | Deep Scan Coverage | Table/list parent containers scanned. |
| G8 | PASS | Screenshot Export Log | Table/list screenshots exported. |
| G9 | PASS | Page Evidence Coverage Matrix | Filters/actions/content/pagination order confirmed. |
| G10 | PASS | Sibling Overlay Scan | Drawer states use content sibling as top node. |
| G11 | PASS | prd-figma-supplement.md Component Refactor Index | Traceable component index exists. |
| G12 | PASS | P0 Judgment | No missing core page/state blocker after targeted scan. |
| G13 | PASS | Page Evidence Coverage Matrix | All FIGMA_MAIN_STATE_CONFIRMED pages meet evidence lower bound. |
| G14 | PASS | State Evidence Matrix | Tab/switcher options have state evidence or legacy/reference status. |
| G15 | PASS | Requirement-to-Atlas Coverage | PRD UI states matched/legacy/reference; no core blocker. |
| G16 | PASS | figma-cache/atlas/pages.md | Atlas established. |
| G17 | PASS | figma-cache/atlas/tiles.md | Visual tiles and backtrace established. |
| G18 | PASS | figma-cache/atlas/requirements-map.md | Requirements mapped to atlas units. |

## Stage 1B Evidence Review Summary
| review item | result | note |
|---|---|---|
| MCP call log / parameters / depth / cache paths | PASS | F1-F8, IMG1-IMG8, L1-L3 recorded. |
| Tool Capability direct PRD target | PASS | fileKey/nodeId direct read; raw URL param not claimed. |
| Screenshot descriptor vs runtime | PASS | descriptor-limited / runtime-validated distinguished. |
| Figma Atlas | PASS | pages, tiles, requirements-map present. |
| Direct URL / fallback | PASS | no JSON_TOO_LARGE, no Desktop use. |
| Sibling overlay scan | PASS | Drawer content sibling chosen; background context only. |
| PRD/Figma/source attribution | PASS | Figma facts trace to evidence_id -> cache_id -> path. |
| P0 judgment | PASS | No P0 remains. P1 source/interface/jump risks registered. |
