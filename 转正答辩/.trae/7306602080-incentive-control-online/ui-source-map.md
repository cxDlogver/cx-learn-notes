# UI Source Map

> status: PRD_ANALYSIS_UPDATED
> stage: /delivery:prd
> purpose: 只读来源映射，不构成技术方案，不要求按此修改代码。

## 1. PRD / Figma Source Map
| scope | PRD source | Figma source | evidence | status |
|---|---|---|---|---|
| 奖励配置-全部用户提示 | `prd-source.md:147-152` | node `1:9770` / `figma-cache/screenshots/1_9770-config-all-user-after.png` | E-PRD-002；E-FIG-003 | confirmed |
| 奖励配置-预埋用户名单提示 | `prd-source.md:147-152` | node `1:10938` / `figma-cache/screenshots/1_10938-config-prefilled-after.png` | E-PRD-002；E-FIG-004 | confirmed |
| 人工提报命中态 Drawer | `prd-source.md:166-192` | node `25:13842` + content `87:6973` / screenshot `25_13842-manual-submit-hit-state.png` | E-PRD-003；E-FIG-007 | confirmed |
| 人工提报批量上传 baseline | PRD 涉及人工提报；Figma option 覆盖 | node `25:13971` + content `101:6308` / screenshot `25_13971-manual-submit-batch-upload-state.png` | E-FIG-008 | reference-baseline |
| DOU+币剔除明细 | `prd-source.md:194-198` | node `1:12120` / screenshot `1_12120-dou-coin-removal-detail.png` | E-PRD-004；E-FIG-005 | confirmed |
| DOU+券剔除明细 | `prd-source.md:194-198` | node `1:12390` / screenshot `1_12390-dou-coupon-removal-detail.png` | E-PRD-004；E-FIG-006 | confirmed |
| 埋点 | `prd-source.md:200-208` | 配置页入口、人工提报提示、剔除明细 Tab | E-PRD-005；E-FIG-003/E-FIG-007/E-FIG-005/E-FIG-006 | confirmed |

## 2. Readonly Legacy / Code Baseline
| area | repo path | observed baseline | source evidence | mapping status |
|---|---|---|---|---|
| 奖励配置提示/链接候选落点 | `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | 已存在 `NO_INCENTIVE_PROMPT_TEXT`、`NO_INCENTIVE_RULE_LINK_TEXT`、`renderNoIncentivePrompt` 与点击埋点样例 | E-CODE-001；rg lines 44-127, 696, 713 | readonly baseline confirmed |
| 奖励投放 SubTab baseline | `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx` | 现有 `SubTab.REWARD=奖励下发`、`SubTab.DETAIL=投放明细`，尚未见 `剔除明细` baseline | E-CODE-002；rg lines 566, 935-988 | legacy baseline confirmed |
| 人工提报 Drawer 提交校验 baseline | `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx` | 当前只按 `if_satisfy_delivery_rules === false` 阻断并提示“不满足发奖条件” | E-CODE-003；rg lines 48-50 | gap baseline confirmed |
| 人工提报批量上传接口 baseline | `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts` | 当前批量上传调用 `apiGetDeliveryItemsFromSheet` | E-CODE-003；rg lines 5, 107 | interface hook baseline confirmed |
| 人工提报表格行态 baseline | `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx` | 当前表格行展示 `不满足发奖条件` / `存在投放记录`，未见 `命中【不激励】规则` baseline | E-CODE-003；rg lines 250-272 | gap baseline confirmed |
| BAM wrapper baseline | `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts` | 已有 `apiGetDeliveryItemsFromSheet`、`apiDownloadContentRemoveRecord`、`apiCandidateRemove`、`apiGetDouPlusCoinRemoveRecord`、`apiGetDouPlusCouponRemoveRecord` wrapper 线索 | E-TECH-001；rg lines 1788, 2316-2401 | interface evidence only |
| IDL field baseline | `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/namespaces/thrift_idls/ecom.buyin.admin_api/content_activity/content_activity.ts` | 已有 `if_not_incentive?: boolean`、`not_incentive_reason?: Array<string>` 字段线索 | E-TECH-001；rg lines 234-248 | interface evidence only |

## 3. UI Evidence Coverage
| UI state | source type | coverage | evidence |
|---|---|---|---|
| 配置页全部用户提示 | PRD + Figma + readonly code baseline | UI 文案、位置、入口已确认；跳转 URL P1 | E-PRD-002；E-FIG-003；E-CODE-001 |
| 配置页预埋用户名单提示 | PRD + Figma + readonly code baseline | UI 文案、位置、入口已确认；跳转 URL P1 | E-PRD-002；E-FIG-004；E-CODE-001 |
| 奖励投放剔除明细 Tab | PRD + Figma + readonly code baseline | 新 Tab 与 legacy tabs 边界明确 | E-PRD-004；E-FIG-005/E-FIG-006；E-CODE-002 |
| 人工提报命中态 | PRD + Figma + readonly code baseline | Drawer、提示、按钮、行态、提交限制已确认 | E-PRD-003；E-FIG-007；E-CODE-003 |
| 人工提报批量上传 | Figma reference + readonly code baseline | 批量上传 baseline 已确认；单独命中视觉 P1 | E-FIG-008；E-CODE-003 |

## 4. Source Boundary Notes
- 当前文件不指示实现方案，仅提供 PRD/Figma/code baseline 的只读映射。
- Figma Desktop 当前激活文件未被读取；所有 Figma 事实来自 PRD URL 解析后的 fileKey/nodeId 直读和同 target 截图导出。
- 技术文档与代码 baseline 仅作为接口/legacy evidence，不能覆盖 PRD 原文。
