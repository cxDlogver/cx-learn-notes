# 规模化运营 onepage

> 来源：[飞书文档](https://bytedance.larkoffice.com/wiki/WApJwbFlNiOl2ikCoracVcyXnPb)  
> 飞书版本：revision 2275

## 业务背景

作者运营业务围绕电商作者的经营周期，通过建联触达、任务牵引、货品撮合、咨询承接等运营动作，推动作者持续产生有效经营行为，提升作者内容供给、流量转化和交易贡献。其中规模化运营面向结算等级 S3 以下的腰尾、成长及拉新作者，为中小达人提供基础服务与成长指引，目标是在有限运营和 BPO 资源下，用产品化、自动化能力提升运营效率，扩大作者运营覆盖规模。

![运营鼓励主播](assets/规模化运营%20onepage_assets__image-01-business-background.jpg)

![业务背景画板](assets/规模化运营%20onepage_assets__whiteboard-01-business-overview.jpg)

[业务背景画板原始节点 JSON](history/规模化运营%20onepage_assets__whiteboard-01-business-overview.json)

### 业务价值

S0-S3 作者具备超大供给底池，贡献了联盟作者 99%+ 的开播时长和投稿；流量方面，S0-S3 也是贡献主力，PV 占比 85%，VV 占比 95%；但在交易方面，S4+ 作者可贡献 GMV 的 32%，头部作者的交易产出能力强劲。规模化运营的业务价值就在于持续运营庞大的潜力作者池，将 S0-S3 作者内容供给和流量优势逐步转化为交易增量。

![S0-S3 与 S4+ 作者数据对比](assets/规模化运营%20onepage_assets__image-02-business-value.png)

### 业务指标

通过线上化平台和自动化运营工具，提高腰尾部作者的运营渗透，最终牵引作者成长跃迁。

> 在 H1 主要关注基建能力，考核指标为建联、运营规模指标。
>
> **企微建联作者数：**与 RPA 账号或员工个人账号加好友的作者数。
>
> **有效运营作者数：**外呼 >= 30s or 企微沟通轮次 >= 1 轮 or 点击企微小程序/链接 or 领取作者任务的作者数。

| 指标类型 | 指标名称 | 指标等级 | 指标口径 | Q1 | Q2 目标 | Q2 完成 | 目标完成度 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 运营规模 | 有效运营作者数 | 考核指标 | 季度日均 | 2.6 万 | 2.9 万 | 3.7 万 | 124.87% |
| 运营规模 | -RPA 有效运营作者数 | 观测指标 | 季度日均 | 未建设 | 575 | 1,141 | 198.43% |
| 运营规模 | -BPO 有效运营作者数 | 观测指标 | 季度日均 | 7,502 | 7,593 | 1.8 万 | 240.46% |
| 运营规模 | -领取作者任务作者数 | 观测指标 | 季度日均 | 2.0 万 | 2.5 万 | 2.2 万 | 88.46% |
| 运营规模 | 企微建联作者数 | 支撑指标 | 季度累计 | 11.0 万 | 31.0 万 | 31.4 万 | 101.34% |

### 相关概念

**名词解释**

| 名词 | 解释 |
| --- | --- |
| 运营人员 | 正式员工，按照作者等级、经营体裁、赛道进行分工，负责将作者细拆人群分配给指定的 BPO 小组负责。 |
| BPO 人员 | 业务流程外包，按作者人群长期承接运营服务，负责 S2.5+ 等重点作者的持续跟进和深度沟通。 |
| 运营任务/BPO 任务 | 运营需求方提出任务赛促报名、活动邀约等；BPO 管理者将需求拆解为 BPO 可执行的任务，分配一线 BPO 执行跟进；最终由需方、BPO 管理者共同验收。 |
| 企微 RPA | 基于企微渠道建设的机器人流程自动化系统，用于完成作者企微渠道建联、批量触达和会话承接等动作，通过系统能力支撑对电商作者的自动化运营。 |

**业务角色**

| 岗位 | 角色 | 职责 |
| --- | --- | --- |
| 规模化运营（正式员工） | 达运 POC | 按赛道 x 结算 S 等级 |
| 规模化运营（正式员工） | 中台 POC | 作者服务 |
| 规模化 BPO（业务流程外包） | BPO 主管 | 纯管理 |
| 规模化 BPO（业务流程外包） | BPO 组长 | 按垂类分，管理一线具体工作 |
| 规模化 BPO（业务流程外包） | BPO 一线 | 按垂类分，最细粒度，具体执行 |

![规模化运营组织架构](assets/规模化运营%20onepage_assets__image-03-org-structure.png)

**作者归属流转**

![作者归属流转](assets/规模化运营%20onepage_assets__image-04-author-flow.png)

**运营业务流程**

![运营业务流程画板](assets/规模化运营%20onepage_assets__whiteboard-02-operation-flow.jpg)

[运营业务流程画板原始节点 JSON](history/规模化运营%20onepage_assets__whiteboard-02-operation-flow.json)

## 核心问题

规模化运营面对的是更大的作者池（S1-S3 300 万+，S0 8000 万+），需要更加高效的运营能力。25 年规模化运营缺少产品能力和工具，主要依赖运营（40 人+）线下分工、BPO（120 人+）人工执行，运营规模受限于人数和带宽，渗透始终维持在较低水位（S2.5+ 作者运营渗透 50%，S2 渗透只有 27.39%，S1 渗透不足 5%）。

![核心做功群体金字塔](assets/规模化运营%20onepage_assets__image-05-author-pyramid.png)

![各层级作者运营覆盖情况](assets/规模化运营%20onepage_assets__image-06-coverage-table.png)

**业务核心痛点包括：**

- **运营权责关系不明确：**作者分群、运营归属缺少统一线上口径，没有形成“人群-运营”的权责关系，无法稳定回答“运营谁、谁负责”的问题，无法复盘人群表现的变化趋势。
- **重点作者缺少稳定服务和深度运营：**S2.5+ 重点作者需要 BPO 持续跟进和深度服务，但 BPO 任务安排、执行跟进、管理者统计复盘均在线下进行，BPO 缺少统一作者上下文和历史跟进记录，只能做最简单的触达沟通，管理者也无法按作者粒度追踪过程和结果。
- **作者运营覆盖规模受 BPO 人力限制：**企微渠道是与作者保持长效沟通最稳定的渠道。但企微建联依赖 BPO 个人账号与作者微信形成 1v1 绑定关系，无法大规模建联；触达承接需要 BPO 手动发送企微消息，运营带宽存在瓶颈，无法大规模触达。在重点作者覆盖不全的情况下，仍有 40% 的 BPO 人力被 S1 以下日常作者咨询占用。

## 规模化阵地

基于作者分层运营思路，BPO 人力集中到 S2.5+ 作者的深度运营；建设自动化运营的系统能力，批量覆盖 S2 以下的长尾作者，提升运营规模。

规模化运营阵地由以下核心模块组成：

- **运营人群管理（权责关系、数据复盘）：**承接 BPO 团队的分工模式，基于作者标签和业务规则划分作者人群，按季度落实人群与运营、BPO 的权责关系，提供业务关注的人群表现和变化指标用于复盘分析。
- **BPO 任务系统（运营任务协同，支撑重点作者深度运营）：**线上化运营任务创建、BPO 任务分配与执行、任务完成度追踪、业务指标回收的标准作业流程；提供作者权限、经营信息、内容、橱窗、治理等上下文以及沟通记录，使 BPO 可以对 S2.5+ 作者和 S2 部分重点作者进行稳定的深度运营。
- **企微 RPA 系统（自动化运营工具，提升建联和运营规模）：**引入企微账号 Bot 作为平台托管账号，通过产品能力大规模建联作者，将建联关系沉淀为平台资产；通过群发任务批量触达长尾作者，接入 Agent 提供智能回复、达商撮合等能力，释放 BPO 人力。

![规模化运营阵地画板](assets/规模化运营%20onepage_assets__whiteboard-03-platform-overview.jpg)

[规模化运营阵地画板原始节点 JSON](history/规模化运营%20onepage_assets__whiteboard-03-platform-overview.json)

### 运营人群管理 - 运营关系与效果观测

> [【使用手册】规模化运营-运营人群模块](https://bytedance.larkoffice.com/docx/Rkx5dYGOpo4fZgxFGH0cg9Z4nEc)

面向规模化运营团队，提供：

- 人群责任分工：基于多维度的达人标签，为规模化运营团队提供人群划分与管理能力；并明确运营人群对应的 POC，形成运营“人群-运营 POC”的权责关系。
- 人群细分策略：运营 POC 在责任范围内，基于业务目标与策略设计进行人群细分；打通各类运营工具，面向细分人群进行运营动作投放与过程记录。
- 人群数据刻画：通过时间维度呈现关键人群指标的变化情况，持续刻画运营人群的活跃度与状态波动；呈现人群标签周期内的流动变化，刻画人群结构的变化趋势。

![运营人群列表](assets/规模化运营%20onepage_assets__image-07-crowd-list.png)

![运营人群关键指标](assets/规模化运营%20onepage_assets__image-08-crowd-metrics.png)

![达人健康等级变化分布](assets/规模化运营%20onepage_assets__image-09-health-matrix.png)

![运营人群数据变化](assets/规模化运营%20onepage_assets__image-10-crowd-change.png)

### BPO 任务系统 - 重点作者运营

BPO 任务系统面向重点作者服务场景，将运营任务创建、分配，BPO 依据 SOP 执行、跟进反馈，任务完成判定和指标回收的作业流程线上化，BPO 任务工作台提供作者经营、内容、权限、橱窗、历史沟通等上下文，使 BPO 能够围绕 S2.5+ 和部分 S2 重点作者做持续跟进和深度沟通；同时管理者可以按任务和作者粒度追踪执行过程、服务质量和运营结果。

![BPO 任务流程画板](assets/规模化运营%20onepage_assets__whiteboard-04-bpo-flow.jpg)

[BPO 任务流程画板原始节点 JSON](history/规模化运营%20onepage_assets__whiteboard-04-bpo-flow.json)

#### 产品形态

![BPO 产品形态画板](assets/规模化运营%20onepage_assets__whiteboard-05-bpo-product.jpg)

[BPO 产品形态画板原始节点 JSON](history/规模化运营%20onepage_assets__whiteboard-05-bpo-product.json)

#### 技术架构

![BPO 技术架构画板](assets/规模化运营%20onepage_assets__whiteboard-06-bpo-architecture.jpg)

[BPO 技术架构画板原始节点 JSON](history/规模化运营%20onepage_assets__whiteboard-06-bpo-architecture.json)

### 企微 RPA 系统 - 自动化运营

企微 RPA 是基于企微渠道建设的机器人流程自动化系统。业务系统托管若干企微账号，通过站内信、待办等产品能力大规模建联作者微信，将建联关系从原 BPO 个人账号关系沉淀为平台资产，避免 BPO 分工变化导致的重复建联和关系丢失。通过 RPA 群控能力基于策略创建群发任务批量触达作者，日常作者咨询由 Agent 自动承接，BPO 只兜底处理复杂问题，释放 BPO 人力，从而支撑对长尾作者的大规模自动化运营。

![企微 RPA 流程画板](assets/规模化运营%20onepage_assets__whiteboard-07-rpa-flow.jpg)

[企微 RPA 流程画板原始节点 JSON](history/规模化运营%20onepage_assets__whiteboard-07-rpa-flow.json)

#### 产品形态

![撮合](assets/规模化运营%20onepage_assets__image-11-rpa-matching.png)

![群发任务](assets/规模化运营%20onepage_assets__image-12-rpa-broadcast.png)

![智能回复/工作台收发消息](assets/规模化运营%20onepage_assets__image-13-rpa-chat.png)

#### 技术架构

![企微 RPA 技术架构画板](assets/规模化运营%20onepage_assets__whiteboard-08-rpa-architecture.jpg)

[企微 RPA 技术架构画板原始节点 JSON](history/规模化运营%20onepage_assets__whiteboard-08-rpa-architecture.json)

#### AI/Agent 应用

![AI/Agent 应用画板](assets/规模化运营%20onepage_assets__whiteboard-09-ai-agent.jpg)

[AI/Agent 应用画板原始节点 JSON](history/规模化运营%20onepage_assets__whiteboard-09-ai-agent.json)

## 技术规划

规模化运营需要在“扩大运营规模”的基础上，重点关注“作者成长牵引效果”。转向“**AI / Agent 驱动的自动化运营**”。通过提升 RPA Agent 智能化程度，实现更加精细化的策略，提高自动化运营对 S0-S3 全层级规模化作者的渗透，提供有效的成长牵引。

![技术规划画板](assets/规模化运营%20onepage_assets__whiteboard-10-tech-plan.jpg)

[技术规划画板原始节点 JSON](history/规模化运营%20onepage_assets__whiteboard-10-tech-plan.json)

## 找人地图

| 模块 | 产品 | 前端 | 服务端 |
| --- | --- | --- | --- |
| 运营人群 | 张劲楠、仲逸飞 | 江仑、花树雯、华迎凯 | 张舒婷 |
| BPO 任务系统 | 张劲楠、仲逸飞 | 江仑、花树雯、华迎凯 | 姜岳林 |
| 企微 RPA 系统 | 张劲楠、仲逸飞 | 江仑、花树雯、华迎凯 | 张舒婷、张心怡 |
| 其他 | 张劲楠、仲逸飞 | 江仑、花树雯、华迎凯 | 姜岳林；[scale-operation-buddy](https://skills.bytedance.net/skill/skills:skills.byted.org/ecom/author_operation_plar/scale-operation-buddy/-/check) |

## 监控大盘

[规模化运营监控大盘](https://grafana.byted.org/d/iHSRa5WDk/gui-mo-hua-yun-ying-jian-kong-da-pan?orgId=1&from=now-12h&to=now-1m&refresh=1m&var-tsd=bytetsd&var-bosun=bosun)

## 技术资产

以下资产基于相关仓库 origin/master 与 CN/prod TCC 元数据核对，更新时间：2026-07-24。正文只保留研发入口和配置索引，不展示 TCC 配置值。

### 代码仓库与服务

| 模块 | 代码仓库 | PSM | 职责 |
| --- | --- | --- | --- |
| 运营人群 | [ecom/buyin_multistar](https://code.byted.org/ecom/buyin_multistar) | `ecom.buyin.multistar` | 人群定义、版本管理、圈选下发、效果指标与趋势查询。 |
| BPO 任务系统 | [ecom/buyin_multistar](https://code.byted.org/ecom/buyin_multistar) | `ecom.buyin.multistar` | 任务生成、分配、处理、跟进流程和指标查询。 |
| 企微 RPA | [ecom/buyin_multistar](https://code.byted.org/ecom/buyin_multistar)；[ecom/buyin_notice_channel](https://code.byted.org/ecom/buyin_notice_channel) | `ecom.buyin.multistar`；`ecom.buyin.notice_channel` | RPA 编排、AI 撮合拉群、群发执行、企微消息同步和会话管理。 |
| 公共触达依赖 | [ecom/buyin_notice](https://code.byted.org/ecom/buyin_notice)；[temai/alliance_message](https://code.byted.org/temai/alliance_message) | `ecom.buyin.notice`；`cmp.ecom.alliance_message` | 触达任务、通道路由及消息投递公共能力。 |
| 接口定义 | [ecom/service_rpc_idl](https://code.byted.org/ecom/service_rpc_idl) | - | 规模化运营、BPO、RPA 和触达服务的 Thrift IDL。 |

### OneService / Navigator 查询

| 模块 | API/SQL ID | 用途 | 调用方式 |
| --- | --- | --- | --- |
| 运营人群 | `7629304084151026715`；`7629626554141705243`；`7629627307535254554`；`7629628133708170250` | 运营人群指标、运营人群趋势、分群指标、分群趋势。 | Navigator Static SQL |
| BPO | `7654838384187278374` | 查询直播间绑定商品。 | OneService -> `dp.invoker.engine` |
| BPO | `7652290036934722610` | 查询作者 GMV。 | OneService -> `dp.invoker.engine` |
| 企微 RPA | `7527979597435044873` | 企微人群成员统计。 | Navigator SQL Client |
| 企微 RPA | `7528320129348682798` | 企微群成员明细及统计。 | Navigator SQL Client |

### TCC 配置

TCC 是服务的运行时配置中心，用于在不重新发布代码的情况下调整指标展示、任务模板、RPA 执行时间、消息通知和接入参数。以下配置均为 CN/prod `/default` 下的 active 版本。

| 模块 | Namespace | 配置 Key 与线上版本 | 用途说明 |
| --- | --- | --- | --- |
| 运营人群 | `ecom.buyin.multistar` | `author_label_name_config` v1；`scale_operation_indicator_config` v6；`scale_operation_remove_tag_config` v6；`scale_operation_employee` v2；`scale_operation_author_change_chart_config` v4 | 作者标签映射、指标定义、剔除标签、运营员工范围及人群变化图表。 |
| BPO 任务系统 | `ecom.buyin.multistar` | `operator_task_config` v1；`operator_task_biz_domain` v2；`operator_task_template` v1；`operator_task_follow_template` v4；`operator_task_metrics` v6；`operator_task_condition` v1 | 通用开关、业务域、任务流程、跟进模板、指标和节点条件。 |
| RPA 编排 | `ecom.buyin.multistar` | `scale_wechat_overview_config` v1；`scale_wechat_backup_emp_ids` v5；`scale_wechat_frontier_config` v2；`scale_wechat_ignore_contact_names` v1；`scale_wechat_msg_config` v7；`ai_match_group_invitation_config` v2；`scale_wechat_transfer_config` v1 | Bot 概览、兜底员工、消息、Frontier 推送、联系人过滤、AI 拉群及会话转移。 |
| RPA 执行 | `ecom.buyin.notice_channel` | `rpa_group_notice_map_reduce_task_config` v1；`rpa_group_notice_work_time_config` v2；`wecom_message_map_reduce_task_config` v2；`wecom_message_lark_notification_config` v1；`establish_contact_config` v3 | 群发和消息 MapReduce 任务、执行时间、飞书通知及建联策略。 |
| RPA 基础设施 | `ecom.buyin.notice_channel` | `wechat_config` v23；`rpa_source_ip` v1；`platform_config` v24 | 微信 App 接入、RPA 来源 IP 与平台渠道参数。 |

**维护约定：**配置可能包含鉴权信息、IP 或业务策略，文档仅记录 namespace、key 和版本，不复制配置值；历史代码中已注释或当前生产未配置的项目不纳入现役资产。

## 相关文档

**技术方案**

- [作者运营](https://bytedance.larkoffice.com/wiki/CAMRwHY2XigFylk6PhmcOfQrn4d)

**业务流程**

- [规模化运营模块思路](https://bytedance.larkoffice.com/docx/DoOCdx8IboyUABxt6bRchmvCnVz)
- [规模化 BPO 任务工作流梳理](https://bytedance.larkoffice.com/wiki/QMdewBqqoiy4ezkGiHzcCDO8nQf)
- [规模化 BPO 提效专项-26.3.16](https://bytedance.larkoffice.com/wiki/QSuXw9iS5iRzAPk2nJocEua5nZd)
- [电商规模化｜直播 x BPO 协同_25 年 Q4](https://bytedance.larkoffice.com/docx/Uhm9doxwCoZrkQx4sGec0Vzknxe)
- [电商规模化｜S2.5+ 背户制业务执行 SOP](https://bytedance.larkoffice.com/wiki/Bs76wFPrViLVOtk1AJNcvOMUnkh)
- [直播背户制-BPO 任务执行](https://bytedance.larkoffice.com/wiki/NkdrwU1KDiNRnTkOisJc3q3dndg)

**团队分工**

- [基于规模化变化对应调整](https://bytedance.larkoffice.com/docx/NAkvdhRCWo9VWSxbYgbcJeB7nJD)
- [【内容生态】新作者赛道&团队-25.11](https://bytedance.larkoffice.com/wiki/TZv7wEK9fi98utkk5KbcEFCYnDc)
- [【定】联盟作者团队分工及流转规则_详细版](https://bytedance.larkoffice.com/wiki/BdKDw4JdMiqCeHk6rGFcp91KnHd)
- [规模化 BPO｜BP 制宣贯会-26.2.3](https://bytedance.larkoffice.com/wiki/Wyk2wdtvciEf5kkIO7TcT1iUnhb)
- [BP 制｜BPO x POC 人员落位](https://bytedance.larkoffice.com/wiki/ILdlwcdo8i8v2mkjJCLcsFoqnle)
- [规模化运营 BPO-KPI 考核方案](https://bytedance.larkoffice.com/sheets/KRD1sme99hP0w0t4JRocpHmGnfc?sheet=BMyBTZ)
