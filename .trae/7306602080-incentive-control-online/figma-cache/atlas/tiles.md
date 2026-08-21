# Figma Atlas Visual Tiles

| tile_id | screenshot | visible region | likely node / state | PRD clue | node backtrace | action |
|---|---|---|---|---|---|---|
| TILE-OVERVIEW | figma-cache/screenshots/1_9176-atlas-overview.png | Full atlas: reward config, DOU+币/券, manual submit | 1:9176 | PRD design source URL and all core UI scopes | F2 -> 1:9176 children | overview index only; do not use as sole evidence |
| TILE-CFG-ALL | figma-cache/screenshots/1_9770-config-all-user-after.png | Reward config page under 活动参与资格=全部用户 | 1:9770 | PRD 3.1 场景一 | F2 lines around 1:9770 and prompt text | main-state confirmed |
| TILE-CFG-PREFILLED | figma-cache/screenshots/1_10938-config-prefilled-after.png | Reward config page under 预埋用户名单 | 1:10938 | PRD 3.1 场景二 | F2 lines around 1:10938 and prompt text | main-state confirmed |
| TILE-COIN-REMOVE | figma-cache/screenshots/1_12120-dou-coin-removal-detail.png | DOU+币 剔除明细 active tab, filters, table, pagination | 1:12120 | PRD 3.3 场景一 | F3 -> table/filter/pagination nodes | main-state confirmed |
| TILE-COUPON-REMOVE | figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png | DOU+券 剔除明细 active tab, filters, table, pagination | 1:12390 | PRD 3.3 场景二 | F4 -> table/filter/pagination nodes | main-state confirmed |
| TILE-MANUAL-HIT | figma-cache/screenshots/25_13842-manual-submit-hit-state.png | Manual submit drawer, hit alert/actions/table/footer | 25:13842 / 87:6973 | PRD 3.2 人工提报 | F5 + F7 | main-state confirmed |
| TILE-MANUAL-BATCH | figma-cache/screenshots/25_13971-manual-submit-batch-upload-state.png | Manual submit drawer, batch upload option and table baseline | 25:13971 / 101:6308 | PRD 提报方式 option | F6 + F8 | reference-baseline; not a separate hit variant |
| TILE-PROBE | figma-cache/screenshots/25_13971-artificial-submit-removal-probe.png | Screenshot export runtime probe for FRAME 25:13971 | 25:13971 | MCP capability | IMG1 | runtime-validated export support |
