# Uncertainty Register

> status: PRD_ANALYSIS_UPDATED
> stage: /delivery:prd
> P0 policy: 缺少完整接口合同不单独构成 PRD 阶段 P0；核心 UI/Figma 证据缺口才构成 P0。

| ID | 等级 | 问题 | 来源 | 当前判断 | 后续处理 |
|---|---|---|---|---|---|
| U-PRD-000 | P0_STATUS | 当前 PRD 阶段未发现 P0 阻塞 | `figma-evidence-pack.md` G1-G18 PASS；`prd-figma-supplement.md` Gate Verdict PASS | 核心页面、Tab active 态、Drawer、表格、筛选/操作区均已覆盖 | 主 Agent Gate Review 复核 evidence pack 与 supplement 即可 |
| U-PRD-001 | P1_RISK | `查看【不激励】规则` 的正式跳转 URL/token 未明确 | `prd-source.md:147-152`；E-FIG-003/E-FIG-004 | PRD 明确要跳转，但未给最终地址；不影响页面骨架 | Ask First：请给正式跳转 URL 或确认材料占位策略 |
| U-PRD-002 | P1_RISK | 人工提报导出剔除明细字段口径仍有评论未完全闭合，尤其「移除原因」「处罚原因」 | `prd-source.md:166-192` 评论 `7651923990281211071`、`7651924250043780306` | 按 PRD 可确定只导出剔除记录且按钮为「导出剔除明细」；字段数据来源需确认 | Ask First：移除原因是否为空，处罚原因是否取 `not_incentive_reason` 最新罚单 |
| U-PRD-003 | P1_RISK | 批量上传是否需要独立命中不激励视觉变体 | E-FIG-008；`figma-cache/nodes/F6...` / `F8...` | Figma 已确认批量上传 baseline；未发现单独命中态，不影响 Drawer 主骨架 | Ask First：批量上传后命中项是否复用手动输入命中态提示区/行态 |
| U-PRD-004 | P1_RISK | 治理校验失败/异常提示由前端固定文案还是后端 message 承载 | `prd-source.md:166-170` | PRD 明确两条错误文案，但接口错误码未给 | Plan/BAM discovery：确认错误承载与兜底策略 |
| U-PRD-005 | PLAN_DISCOVERY | `get_delivery_items_from_sheet` 的新增字段、列表统计与提交流程接入细节需确认 | `tech-doc-raw.md:101,162-181`；E-TECH-001 | 已有 `if_not_incentive`、`not_incentive_reason` 明确线索；不构成 P0 | Plan 阶段结合 BAM/IDL/现有 store 闭合 |
| U-PRD-006 | PLAN_DISCOVERY | `download_content_remove_record` 请求字段、生成文件格式、失败处理需确认 | `tech-doc-raw.md:200-212`；E-TECH-001 | 已有接口方法线索；导出字段口径仍有 P1 | Plan 阶段查 BAM/IDL 和既有下载工具链 |
| U-PRD-007 | PLAN_DISCOVERY | DOU+币/券剔除明细接口分页、排序、错误码、空态需确认 | `tech-doc-raw.md:349-421`；E-FIG-005/E-FIG-006 | UI 表格/筛选/分页已确认；接口合同不阻塞 PRD | Plan 阶段查 BAM/IDL/service/mock 策略 |
| U-PRD-008 | P1_RISK | 操作人筛选的数据源/权限范围未明确 | `prd-source.md:194-198` | PRD 只要求下拉选择与输入搜索；未给角色/人员范围 | Ask/Plan：确认是否复用现有操作人选择器或后端枚举 |
| U-PRD-009 | P2 | PRD 评论提到申诉入口、处罚表/Hive 信息，但未形成前端交互要求 | `prd-source.md:172-177`、`prd-source.md:216-220` | 当前 scope 按提示/剔除/明细处理，不纳入新增前端入口 | 如产品要求申诉入口，需要新增需求确认 |
| U-PRD-010 | P1_RISK | 补充来源 L2 wiki 与 L3 minutes 未能通过当前文档工具读取 | `supplement-cache/raw/L2-...error.json`、`L3-...error.json` | 已缓存失败；核心 PRD/Figma/UI 证据不依赖这两个来源 | 如主 Agent 认为其含决策结论，可定向补读；非当前 P0 |
| U-INIT-002 | P2 | `作品被激励金额` 定义存在未解决评论 | init 登记；PRD 评论 | 当前核心 UI/剔除明细字段不直接依赖该定义 | 测试/验收时关注是否影响统计口径 |

## Ask First Feedback Follow-ups

| 等级 | 问题 | 影响 | 用户反馈 | Evidence |
|---|---|---|---|---|
| P1_RISK | 配置页“查看【不激励】规则”跳转目标 | 该决策本身已确认；但当前轮仍有其他决策未放行，整体暂不进入下一阶段。 | 文档中有 【电商内容生态激励管控讨论】 跳转链接 | Ask First ask_first_20260707_7306602080_prd_001 |
| P1_RISK | 人工提报“导出剔除明细”的原因字段口径 | 该决策本身已确认；但当前轮仍有其他决策未放行，整体暂不进入下一阶段。 | 移除原因只有两种  手动移除 / 命中【不激励】规则<br>处罚原因从接口获取 | Ask First ask_first_20260707_7306602080_prd_001 |

## Ask First Feedback Follow-ups

| 等级 | 问题 | 影响 | 用户反馈 | Evidence |
|---|---|---|---|---|
| P1_RISK | 配置页“查看【不激励】规则”跳转目标 | 后续阶段必须按用户自定义输入约束 scope、集成边界和验收。 | 文档中有【电商内容生态激励管控讨论】跳转链接 | Ask First ask_first_20260707_7306602080_prd_001 |
| P1_RISK | 人工提报“导出剔除明细”的原因字段口径 | 后续阶段必须按用户自定义输入约束 scope、集成边界和验收。 | 移除原因只有两种：手动移除 / 命中【不激励】规则；处罚原因从接口获取 | Ask First ask_first_20260707_7306602080_prd_001 |
| PLAN_DISCOVERY | 接口资料与 BAM 结果不一致时的权威顺序 | 后续阶段必须按用户自定义输入约束 scope、集成边界和验收。 | 继续执行 /delivery:bam 做接口元数据核验；PRD 和技术文档定义本轮完整需求范围，BAM/IDL 若缺字段只作为同步差异和风险登记，不能删减页面、字段、导出和校验范围 | Ask First ask_first_20260707_7306602080_prd_001 |
