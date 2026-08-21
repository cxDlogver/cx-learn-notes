# 03 PRD Analysis

> status: DONE
> stage: /delivery:prd
> workspace: /Users/bytedance/cx/spec-2/meego-11/artifacts/7306602080-incentive-control-online
> evidence rule: PRD 原文为最高优先级；Figma / 技术文档 / 代码只读 baseline 均按来源标注。

## 1. Module Breakdown
| 模块 | 子模块 | 功能点 | PRD 证据 | Evidence |
|---|---|---|---|---|
| 内容活动-奖励配置 | 活动参与资格 | 「全部用户」配置项下方透出不激励规则提示与查看入口 | `prd-source.md:147-152` 明确场景、文案、位置、交互 | HIGH；E-PRD-002；E-FIG-003 |
| 内容活动-奖励配置 | 预埋用户名单 | 「仅限预埋用户」配置项下方透出同款提示与查看入口 | `prd-source.md:147-152` 明确场景、文案、位置、交互 | HIGH；E-PRD-002；E-FIG-004 |
| 内容活动-奖励投放 | 发奖前剔除 | DOU+币/DOU+券发奖前按活动开始时间到发奖时间的最新处罚状态阻断发奖 | `prd-source.md:166-170` 明确对象、时间窗、状态 0/1/2、边界异常 | HIGH；E-PRD-003；E-TECH-001 |
| 内容活动-奖励投放 | 人工提报 | 提交后标注命中作品/账号，展示汇总提示、一键移除、导出剔除明细、提交限制 | `prd-source.md:166-192` 明确触发、展示、按钮、导出字段和限制 | HIGH；E-PRD-003；E-FIG-007 |
| 内容活动-奖励投放 | 剔除明细 Tab | DOU+币新增作品维度剔除明细，支持作品ID/操作人筛选、表格与分页 | `prd-source.md:194-198` 明确筛选项和列表字段 | HIGH；E-PRD-004；E-FIG-005 |
| 内容活动-奖励投放 | 剔除明细 Tab | DOU+券新增作者维度剔除明细，支持作者ID/操作人筛选、表格与分页 | `prd-source.md:194-198` 明确筛选项和列表字段 | HIGH；E-PRD-004；E-FIG-006 |
| 数据埋点 | 配置页 / 人工提报 / 剔除明细 | 规则查看点击、人工提报命中提示曝光、剔除明细 Tab 曝光/点击 | `prd-source.md:200-208` 明确路径、模块、字段、补充参数 | HIGH；E-PRD-005 |

## 2. Atomic Requirements
| requirement_id | 模块 | 原子需求 | 类型 | 设计源 | 接口依赖 | 验收标准 | 证据 | Evidence |
|---|---|---|---|---|---|---|---|---|
| AR-001 | 奖励配置 | 当活动参与资格为「全部用户」时，在配置项下方展示提示：`奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖 查看【不激励】规则` | UI/交互 | Figma `1:9770` | 无后端依赖；跳转 URL 待确认 | 全部用户态可见完整文案与查看入口；点击入口触发跳转/埋点 | `prd-source.md:147-152`；`prd-figma-supplement.md` | HIGH；E-PRD-002；E-FIG-003 |
| AR-002 | 奖励配置 | 当活动参与资格为「仅限预埋用户」时，在配置项下方展示同款提示和查看入口 | UI/交互 | Figma `1:10938` | 无后端依赖；跳转 URL 待确认 | 预埋用户名单态可见完整文案与查看入口；点击入口触发跳转/埋点 | `prd-source.md:147-152`；`prd-figma-supplement.md` | HIGH；E-PRD-002；E-FIG-004 |
| AR-003 | 发奖前剔除 | DOU+币发放前，对满足准入条件和排名的作品按活动开始时间至发奖时间内最新处罚状态校验；状态 0 阻断，状态 1/2 不阻断 | 业务规则 | 无新增前端主页面；人工提报有 UI | 技术文档提及候选剔除与不激励字段；接口细节 Plan Discovery | 命中自然处罚的作品不进入发奖；解除状态不阻断；异常按 PRD 提示 | `prd-source.md:166-170`；`tech-doc-raw.md:49-51` | HIGH；E-PRD-003；E-TECH-001 |
| AR-004 | 发奖前剔除 | DOU+券发放前，对满足准入条件和排名的作品/账号按同一时间窗与状态规则校验 | 业务规则 | 无新增前端主页面；剔除明细有 UI | 技术文档提及候选剔除与剔除记录接口；接口细节 Plan Discovery | 命中自然处罚的作者/作品不进入发奖；解除状态不阻断；异常按 PRD 提示 | `prd-source.md:166-170`；`tech-doc-raw.md:49-51` | HIGH；E-PRD-003；E-TECH-001 |
| AR-005 | 发奖前剔除 | 治理接口超时暂停发奖并返回“治理校验失败，请稍后重试”；接口异常暂停并返回“治理校验异常，请联系管理员”；剔除后名单为空时正常结束不发放激励 | 业务规则/错误处理 | PRD 文案，无独立 Figma 状态 | 接口错误码/错误消息承载方式 Plan Discovery | 三类边界情况按 PRD 展示或结束，不继续错误发奖 | `prd-source.md:166-170` | HIGH；E-PRD-003 |
| AR-006 | 人工提报 | 运营提交中奖名单后，对手动提交的作品/账号执行不激励校验；命中时仅提示，不自动剔除，由运营处理 | 业务规则/UI | Figma `25:13842` / `87:6973` | `get_delivery_items_from_sheet` 已有 `if_not_incentive`、`not_incentive_reason` 线索 | 命中项留在列表中并显示命中提示；未由系统自动移除 | `prd-source.md:166-170`；`tech-doc-raw.md:101,162-181` | HIGH；E-PRD-003；E-FIG-007；E-TECH-001 |
| AR-007 | 人工提报 | 命中态展示汇总提示：`共{作品总数}个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：{作品个数}个` | UI/状态 | Figma `25:13842` | 依赖列表命中统计；字段聚合方式 Plan Discovery | 存在命中项时展示汇总提示，数量与列表状态一致 | `prd-source.md:166-170`；`figma-cache/nodes/F5-get_figma_data-25_13842-d5.md` | HIGH；E-PRD-003；E-FIG-007 |
| AR-008 | 人工提报 | 命中态提供「一键移除」，点击后移除不满足准入门槛或命中【不激励】规则的作品 | 交互 | Figma `25:13842` | 可复用/依赖前端列表状态；是否调用剔除记录接口需 Plan Discovery | 点击后命中/不满足项从当前提报名单移除，剩余可提交项保留 | `prd-source.md:166-170`；`figma-cache/nodes/F5-get_figma_data-25_13842-d5.md` | HIGH；E-PRD-003；E-FIG-007 |
| AR-009 | 人工提报 | 命中态提供「导出剔除明细」，只导出剔除的记录；字段含账号ID、视频ID、视频名称、移除原因、处罚原因、操作人 | 下载/交互 | Figma `25:13842` 文案为「导出剔除明细」 | 技术文档存在 `download_content_remove_record`；字段口径 P1 | 点击导出剔除记录；可发奖记录不导出；按钮文案为「导出剔除明细」 | `prd-source.md:166-192`；`tech-doc-raw.md:200-212` | HIGH for button/export scope；MEDIUM for reason-field口径；E-PRD-003；E-FIG-007；E-TECH-001 |
| AR-010 | 人工提报 | 处罚作品/账号未移除前禁止提交发奖名单 | 交互/校验 | Figma footer `提交并投放` | 依赖 `if_not_incentive` / `not_incentive_reason` 和既有准入校验字段 | 列表仍有处罚作品/账号时提交被阻断；移除后允许提交 | `prd-source.md:166-170`；`figma-cache/nodes/F5-get_figma_data-25_13842-d5.md` | HIGH；E-PRD-003；E-FIG-007；E-TECH-001 |
| AR-011 | 剔除明细 | DOU+币奖励投放新增「剔除明细」Tab，展示每次发奖批量产生的作品维度剔除名单 | UI/表格 | Figma `1:12120` | 技术文档/代码已有 `get_dou_plus_coin_remove_record` 线索；分页/错误码 Plan Discovery | Tab active 时展示筛选区、作品表格和分页；字段为作品内容、剔除发奖原因、剔除发奖时间、操作人 | `prd-source.md:194-198`；`figma-cache/nodes/F3-get_figma_data-1_12120-d4.md` | HIGH；E-PRD-004；E-FIG-005；E-TECH-001 |
| AR-012 | 剔除明细 | DOU+币筛选项包含作品ID，支持批量输入视频/图文/直播ID；包含操作人，支持下拉选择与输入搜索 | UI/筛选 | Figma `1:12120` | `get_dou_plus_coin_remove_record` 请求字段含 candidate_ids/operator_id 线索 | 按作品ID和操作人筛选后表格刷新 | `prd-source.md:194-198`；`tech-doc-raw.md:349-376` | HIGH；E-PRD-004；E-FIG-005；E-TECH-001 |
| AR-013 | 剔除明细 | DOU+券奖励投放新增「剔除明细」Tab，展示每次发奖批量产生的作者维度剔除名单 | UI/表格 | Figma `1:12390` | 技术文档/代码已有 `get_dou_plus_coupon_remove_record` 线索；分页/错误码 Plan Discovery | Tab active 时展示筛选区、作者表格和分页；字段为作者信息、剔除发奖原因、剔除发奖时间、操作人 | `prd-source.md:194-198`；`figma-cache/nodes/F4-get_figma_data-1_12390-d4.md` | HIGH；E-PRD-004；E-FIG-006；E-TECH-001 |
| AR-014 | 剔除明细 | DOU+券筛选项包含作者ID和操作人；操作人支持下拉选择与输入搜索 | UI/筛选 | Figma `1:12390` | `get_dou_plus_coupon_remove_record` 请求字段含 candidate_ids/operator_id 线索 | 按作者ID和操作人筛选后表格刷新 | `prd-source.md:194-198`；`tech-doc-raw.md:393-421` | HIGH；E-PRD-004；E-FIG-006；E-TECH-001 |
| AR-015 | 数据埋点 | 配置页「查看【不激励】规则」点击统计点击UV | 埋点 | Figma `1:9770` / `1:10938` | 埋点命名/参数按现有 logger 约定 Plan Discovery | 点击查看入口时上报对应点击事件 | `prd-source.md:200-208` | HIGH；E-PRD-005 |
| AR-016 | 数据埋点 | 人工提报命中「不激励」规则提示曝光统计曝光UV | 埋点 | Figma `25:13842` | 埋点命名/参数按现有 logger 约定 Plan Discovery | 命中提示出现时上报曝光 | `prd-source.md:200-208` | HIGH；E-PRD-005；E-FIG-007 |
| AR-017 | 数据埋点 | 剔除明细 Tab 曝光/点击统计，补充参数区分配置项和奖励类型（DOU+币/券） | 埋点 | Figma `1:12120` / `1:12390` | 埋点命名/参数按现有 logger 约定 Plan Discovery | Tab 展示和点击时上报配置项与奖励类型 | `prd-source.md:200-208` | HIGH；E-PRD-005；E-FIG-005；E-FIG-006 |

## 3. Dependencies & Open Items

### 3.1 Permission / Role
| 项 | 当前结论 | Evidence |
|---|---|---|
| 操作人筛选来源 | PRD 只要求操作人支持下拉选择与输入搜索，未说明权限/人员范围 | MEDIUM；E-PRD-004；P1_RISK |
| 人工提报操作权限 | PRD 未新增权限规则；默认沿用奖励投放/人工提报既有权限，需计划阶段只读确认现有权限入口 | LOW；E-CODE-002/E-CODE-003 |

### 3.2 Data / Interface / External Dependency
| 依赖 | 明确线索 | 当前分级 | Evidence |
|---|---|---|---|
| `get_delivery_items_from_sheet` | 技术文档/IDL 缓存显示新增 `if_not_incentive`、`not_incentive_reason` 字段，用于人工提报标识 | PLAN_DISCOVERY | E-TECH-001 |
| `download_content_remove_record` | 技术文档提及人工提报名单下载剔除明细；生成代码存在同名 wrapper 线索 | PLAN_DISCOVERY | E-TECH-001 |
| `candidate_remove` | 技术文档提及运营剔除候选记录持久化；生成代码存在 wrapper 线索 | PLAN_DISCOVERY | E-TECH-001 |
| `get_dou_plus_coin_remove_record` | 技术文档提及 DOU+币剔除明细接口，字段含 activity/config/page/candidate/operator 线索 | PLAN_DISCOVERY | E-TECH-001 |
| `get_dou_plus_coupon_remove_record` | 技术文档提及 DOU+券剔除明细接口，字段含 activity/config/page/candidate/operator 线索 | PLAN_DISCOVERY | E-TECH-001 |
| 治理处罚明细来源 | PRD 要求按活动开始时间至发奖时间内最新处罚状态判断；上游接口/Hive 线索未完整 | P1_RISK | E-PRD-003；PRD comments |

### 3.3 Download / Jump / Tracker
| 项 | 当前结论 | 分级 | Evidence |
|---|---|---|---|
| 查看【不激励】规则跳转 | PRD 明确点击跳转到「电商内容生态激励管控」讨论，但未给最终 URL/token | P1_RISK | E-PRD-002；E-FIG-003/E-FIG-004 |
| 导出剔除明细 | PRD 明确只导出剔除记录，按钮文案已改为「导出剔除明细」；移除原因/处罚原因字段口径存在评论 | P1_RISK | E-PRD-003；E-FIG-007 |
| 埋点 | PRD 明确点击/曝光项；具体 event id/参数命名需按现有埋点规范闭合 | PLAN_DISCOVERY | E-PRD-005 |

### 3.4 Uncertainty Register Draft
| 等级 | 问题 | 影响 | 建议提问 | Evidence |
|---|---|---|---|---|
| P1_RISK | `查看【不激励】规则` 的正式跳转 URL/token 未给出 | 影响链接落地与验收 | 请提供「电商内容生态激励管控」正式可跳转地址或确认使用现有材料占位 | HIGH；E-PRD-002；E-FIG-003/E-FIG-004 |
| P1_RISK | 人工提报导出字段中「移除原因」「处罚原因」最终口径未完全闭合 | 影响导出列名、空值和数据来源 | 「移除原因」无填入入口时是否导出空值？「处罚原因」是否直接取 `not_incentive_reason` 最新罚单？ | HIGH/MEDIUM；E-PRD-003；评论 `7651923990281211071` |
| P1_RISK | 批量上传是否需要独立的命中【不激励】视觉变体 | 当前 Figma 只确认批量上传 baseline，不影响 Drawer 骨架 | 批量上传后命中不激励时是否复用手动输入命中态的提示区/行态？ | MEDIUM；E-FIG-008 |
| P1_RISK | 治理校验失败/异常提示由前端固定文案还是后端 message 承载 | 影响错误处理策略 | 两类错误是否使用 PRD 固定文案覆盖后端 message？ | HIGH；E-PRD-003 |
| PLAN_DISCOVERY | 剔除明细接口分页、排序、错误码、操作者选项数据源待确认 | 影响接口接入，不阻塞 PRD 分析 | Plan 阶段通过 BAM/IDL/现有 service 闭合 | MEDIUM；E-TECH-001 |
| P2 | PRD 评论中的申诉入口、处罚表/Hive 信息未形成前端交互要求 | 若后续纳入 scope 会新增入口/流程 | 本期是否仅做提示/剔除/明细，不做申诉入口？ | MEDIUM；PRD comments |

## 4. Plan Readiness Suggestion
PARTIAL_READY

- 理由：Figma G1-G18 与核心 UI 深扫均 PASS，无 P0 阻塞；但跳转 URL、导出字段口径、批量上传命中态复用方式、接口合同细节仍需在 Plan/Ask First/BAM discovery 中闭合。
- 不确定项处理：缺少完整接口路径/请求响应/分页/错误码不作为 PRD 阶段 P0，已按 `PLAN_DISCOVERY` 或 `P1_RISK` 登记。
