# 【达人成长】数据 & 知识库建设规划OnePage_V1

## 一、知识库分层与分类结构

### 整体结构图

<whiteboard token="XcPNwWXIEhMd27bwdegcQRoenId"></whiteboard>

数据是这次流程重构的地基：先把"服务动作"与"结果"留痕成结构化数据，Agent 才能稳定承接沟通出口、完成标准化服务，运营才能把精力从重复沟通转移到有效性判断与协作管理。

### **按数据域分类**

<table><colgroup><col/><col/><col/><col/></colgroup><thead><tr><th>数据域</th><th>包含维度</th><th>解决问题</th><th>核心内容</th></tr></thead><tbody><tr><td>达人全景画像域<br/><cite doc-id="TUjhwAV1wisEWukYPIBc2dHen2f" file-type="wiki" title="【直播+短视频】达人账号画像特征拆解策略需求" type="doc"></cite></td><td><ul><li>基础属性：粉丝量、品类、所处阶段、历史 GMV 水平</li><li>行为数据：开播频次、时长、短视频发布节奏、选品结构</li><li>经营指标：流量获取、转化能力、客单价、复购率</li><li>成长轨迹：各指标趋势变化、关键节点事件</li></ul><blockquote><p>已有数据表</p><ol><li seq="1">短视频+橱窗达人，AI提炼截面画像特征数据：<button action="OpenDocVerse" src="{&#34;blockTypeID&#34;:&#34;blk_6475c5a5b681000315605d2c&#34;,&#34;id&#34;:&#34;cli_a4ff79b817b9d00c&#34;,&#34;region&#34;:&#34;CN&#34;,&#34;coralLink&#34;:&#34;https://data.bytedance.net/coral/datamap/detail?from=coral_copy_link&amp;groupName=default&amp;qualifiedName=HiveTable%3A%2F%2F%2Fecom_alliance_data%2Falliance_ai_author_all_feature%400#group=default&#34;,&#34;qualifiedName&#34;:&#34;HiveTable:///ecom_alliance_data/alliance_ai_author_all_feature@0&#34;}">ecom_alliance_data.alliance_ai_author_all_feature</button> Type:  content = 内容特征  product = 带货特征</li><li>全量达人，标签属性数据（非AI提炼）：<button action="OpenDocVerse" src="{&#34;blockTypeID&#34;:&#34;blk_6475c5a5b681000315605d2c&#34;,&#34;id&#34;:&#34;cli_a4ff79b817b9d00c&#34;,&#34;region&#34;:&#34;CN&#34;,&#34;coralLink&#34;:&#34;https://data.bytedance.net/coral/datamap/detail?from=coral_copy_link&amp;groupName=default&amp;qualifiedName=HiveTable%3A%2F%2F%2Fecom%2Fdm_author_aweme_stats_df%400#group=default&#34;,&#34;qualifiedName&#34;:&#34;HiveTable:///ecom/dm_author_aweme_stats_df@0&#34;}">ecom.dm_author_aweme_stats_df</button></li></ol></blockquote></td><td>回答"达人现在处于什么状态"，是诊断与分层的输入。</td><td>多维画像 + 成长轨迹，记录达人当前处于什么状态。</td></tr><tr><td>运营动作域<br/><cite doc-id="B9lMwwjOCiuiZukqYgocZPxinwg" file-type="wiki" title="达人成长数据挖掘与归因方案-讨论版" type="doc"></cite></td><td><ul><li>本次服务输出了什么（Agent 输出 / 运营微调后输出）</li><li>输出来源（策略模板 / 案例 / 规则 / 人工补充）</li><li>执行与回写：是否执行、如何微调、执行耗时、关键节点介入记录</li><li>达人反馈：接受 / 拒绝 / 部分采纳 / 无回应</li></ul></td><td>回答"运营/达人做了什么动作"，是流程复盘与效果归因的过程数据。</td><td>本次动作结果 + 思考过程，记录做了什么动作、基于什么思路。</td></tr><tr><td>策略效果域<br/><cite doc-id="B9lMwwjOCiuiZukqYgocZPxinwg" file-type="wiki" title="达人成长数据挖掘与归因方案-讨论版" type="doc"></cite></td><td><ul><li><b>达人 × 运营动作 → 提升效果</b> 的策略记录</li><li>后验效果：曝光 / 采纳 / 完成 / 有效 / 跃迁 漏斗变化</li><li>对照基线：同层级未执行策略的达人自然变化</li><li>有效性打标：显著有效 / 一般有效 / 无效 / 负向 + 失败原因</li></ul></td><td>回答"这次服务有没有用"，用于策略权重升降、模型后训练与规则迭代。</td><td>达人 × 动作 → 提升效果度量，记录这次服务有没有用。</td></tr><tr><td>知识库元数据域</td><td><ul><li>每条策略 / 案例的使用频次、匹配成功率、效果分布</li><li>哪些策略对哪类达人最有效、哪些已过时</li><li>知识缺口：哪些场景缺策略、哪些问题反复出现无解法</li></ul></td><td>监控知识库自身健康度，指导补缺、下线与版本迭代。</td><td>知识库自身质量追踪，反映知识库自身的健康度。</td></tr></tbody></table>

<callout emoji="⭐">
**作者成长策略的最小单位：** 一条"达人 × 运营动作 → 提升效果"的策略数据记录。它至少包含：达人分层/画像特征、动作类型与参数（话术/节奏/选品/活动等）、执行与微调信息、后验效果（曝光→采纳→完成→有效→跃迁）与置信度。
</callout>

画像域触发诊断，Agent 输出标准化服务动作，运营对结果做有效性回收打标并在必要时微调接管，效果域与元数据域再反哺策略权重与知识治理，形成持续迭代。

### **⭐按信息粒度分层（业务知识示例）**



<table><colgroup><col/><col/><col/><col/><col/></colgroup><thead><tr><th>层级（粗 → 细）</th><th>内容</th><th>信息粒度</th><th>定位</th><th>示例</th></tr></thead><tbody><tr><td>方法论层</td><td>大盘整体通用方法论：<ul><li>达人成长底层框架（冷启动→成长→成熟各阶段打法）</li><li>各维度提升方法论（拉流量/提转化/搭选品/排开播）</li><li>平台规则与机制（流量分发、活动加权、算法偏好）</li></ul></td><td>最粗（大盘通用）</td><td>所有策略的底层依据，用于作者长期成长方向的判断，同时保证对平台规则的遵循<br/>冷启动，人工更新维护</td><td><ol><li seq="1"><b>达人核心</b><a href="https://bytedance.feishuapp.cn/app/app_4k4ksbgm04g98"><b>电商大学文档汇总</b></a><b> </b>-&gt; 用于参考达人成长通用方法论/平台规则机制（RAG）</li></ol><br/> <cite doc-id="LP55wz4aWiLFZSk42CZcWYdKn7e" file-type="wiki" table-id="tblLv1U0sS0pEmIh" title="电商信息汇总" type="doc" view-id="vewcchGNt7"></cite><img name="img_T5xCbn7GGoDaNhxbp1gcCqYWnLc.png" alt="图片展示了抖音电商达人经营相关资讯。上方为“达人经营评级&amp;服务费率新规”，介绍电商推广者技术服务费规则调整。下方有“电商达人AI工具实战课程”“达人高结算经营方法白皮书”“直播达人专属直播实操工具包”等资讯，分别标注发布日期、类型及简要说明，如AI工具课程介绍AI小应，白皮书提供经营方法，实操工具包聚焦实时数据与互动。这些资讯与达人经营相关，为达人提供经营指导与工具。" mime="image/png" scale="1.000000" src="YIXPbprm4o3anzxTkJWcA2UMnBc"/><ol><li><b>运营沟通技巧梳理</b><a href="https://bytedance.larkoffice.com/wiki/OtaNwy92Ji0nnYkLO0GcQeGFnZg?disposable_login_token=eyJ1c2VyX2lkIjoiNzI4MjU4NDMwNzg1NjU1NjAzNiIsImRldmljZV9sb2dpbl9pZCI6Ijc0MTc2NzMwNDM0NjMyNzQ0OTciLCJ0aW1lc3RhbXAiOjE3ODIyMTU3OTEsInVuaXQiOiJldV9uYyIsInB3ZF9sZXNzX2xvZ2luX2F1dGgiOiIxIiwidmVyc2lvbiI6InYzIiwidGVuYW50X2JyYW5kIjoiZmVpc2h1IiwicGtnX2JyYW5kIjoi6aOe5LmmIiwiY2xpZW50X3NjaGVtYSI6IngtZmVpc2h1In0=.c848668c07a8e70b97813cd376b566333d80b126d38cbd273944a786e2068be0">【规模化运营】“真心换真心”内容型达人沟通分享</a>-&gt; 用于优化Agent沟通方式（soul.md配置）</li></ol><grid><column width-ratio="0.400000"><img name="img_MXA4bQPSNohZVmxRJxOcq1IpnVf.png" alt="图片展示了达人运营中不同类型的达人画像、核心决策人及对应的方法策略。分为纯个人、MCN、供应链达人三类。纯个人达人情绪价值需求高，核心决策人为达人本人，策略包括高频陪伴、成为经营战友等。MCN达人背后有机构，核心决策人多，策略为分清主次、保持客观等。供应链达人对品牌经营权重大，核心决策人是品牌方，策略为聊品牌、提供行业洞察等。该图与上下文关于达人运营策略的内容相呼应。" mime="image/png" scale="1.000000" src="C0mNboZejoIC6DxgttFcFWaznee"/></column><column width-ratio="0.600000"><img name="img_HPHhbsdlro1zQBxOM96cGC3Cnsh.png" alt="图片展示了达人类型、核心诉求、沟通重点及预期效果等内容。按达人类型分，成长型达人核心诉求为快速涨粉、提升收入、学习运营方法，沟通重点是平台扶持政策、流量玩法、成功案例、成长路径，预期效果是达人快速建立对平台的信任，愿意尝试合作；成熟型达人核心诉求是突破增长瓶颈、提升商业化效率等，沟通重点是行业数据洞察等，预期效果是达人认可平台价值，愿意深度绑定合作；观望型达人核心诉求是了解平台政策等，沟通重点是低门槛合作方案等，预期效果是达人消除顾虑，愿意尝试小范围合作。" mime="image/png" scale="1.000000" src="CiRPbOuTdol5WexSqtucEp7HnKf"/></column></grid><img name="img_GT7DbxBjboie5Px6a3vcqzI0nr6.png" alt="图片展示了达人运营中遇到不同问题时的使用场景、技巧及案例。达人遇到电商问题时，要专业、主动分析解答，图中呈现了相关数据图表及对话截图；遇到非电商poc业务领域问题，需迅速拉内部协同方，有沟通主端、行业、营销的案例；达人需直接利益时，可优化招商方案，图中展示了相关对话及图片。该图与上下文紧密相关，是对达人运营中遇到问题处理方法的总结。" mime="image/png" scale="1.000000" src="OPbkbNy9UoPipVxoeAiciYkanch"/></td></tr><tr><td>策略模板层</td><td>特定作者画像格子的精细化运营方法论，作为标准化运营策略包：<br/>每个策略含适用人群、执行步骤、预期效果、注意事项、配套话术等，例如：<ul><li>「新达人冷启动 30 天计划」</li><li>「GMV 下滑诊断与挽回」</li><li>「大促前蓄水」</li></ul></td><td>作者画像粒度<br/>（等级×行业×体裁...）</td><td>运营精细化分型策略思路，同分型达人优先参考<br/>冷启动，人工更新维护</td><td><ol><li seq="1"><b>达人分型及成长动作策略分析</b> <a href="https://bytedance.larkoffice.com/wiki/ZwpPwyhZQiSqA3kNY8Ccfdk6nVg">视频组_达人分型及成长动作</a>  <cite doc-id="YozDwJ3BjignUOkizkQcuAasnKc" file-type="wiki" title="2602_核心/非核心直播供给定义" type="doc"></cite></li></ol><grid><column width-ratio="0.570000"><img name="img_GnCZbXmpRoLTcmxJVU7cbQgwnbe.png" alt="图片展示了达人数据&amp;知识库建设规划中作者规模相关数据。分为行标签和列标签，行标签包括总计、1. 塞酷型账号等类别，列标签涵盖行标签、作者数量、作者占比、人均投稿数等指标。如总计作者数量82,694，作者占比22%等。其中，作者规模部分，作者数量总计82,694，作者占比22%；人均投稿数总计16,128；人均优质视频数总计0.3等。该图与上下文介绍的作者规模数据相呼应，直观呈现相关数据情况。" mime="image/png" scale="1.000000" src="SomTblx7XobmP9xVnxRc0liLnIk"/></column><column width-ratio="0.430000"><img name="img_VIGCb2rW6oQ6DuxxS3jcGlMOnGq.png" alt="图片展示了作者分型及对应手段的内容。上方为作者分群，包括内容供给划分、身份划分、经营分化、等级划分、成长因子等。下方分为非塞物料型作者、联盟作者/模糊商家作者、自然流型三类，每类对应不同手段，如结算S2、结算S2.5、结算S3等。右侧是成长任务，有效手段验证后，箭头指向“人盯人”手段。该图与文档中作者分型及对应手段的内容紧密相关，直观呈现了不同作者类型及对应手段的对应关系。" mime="image/png" scale="1.000000" src="S1cQbZpVcoCqVxxe6fLcPvQ7nSh"/></column></grid><img name="image.png" alt="图片为规模化作者运营格子图，以面积近似代表UV规模。分为重点运营、低优运营、灰度、优质、良好五个区域，标注了Y1 - 兴趣型&amp;高交易贡献、Y2 - 潜力作者（非新）、Y2 - 一般作者（非新）、Y2 - 近90天新开通作者、Y2 - 极低价值作者（非新）、X1 - 导购型&amp;高交易贡献、X2 - 潜力作者（非新）、X2 - 一般作者（非新）、X2 - 近90天新开通作者、X2 - 极低价值作者（非新）等类别，每个类别下有开播UV、GMV等数据占比，与上下文介绍的作者运营分类及数据对应。" mime="image/jpeg" scale="0.077021" src="V9cDb9EMkofE5oxnlFfc25gRnRd"/></td></tr><tr><td>案例层</td><td>UID（作者 ID）粒度案例库：<ul><li>标杆案例（某类达人用某策略后的数据变化）</li><li>反面案例（踩过的坑、无效策略特征）</li><li>带完整上下文——达人画像、做了什么运营动作、为什么要这么做（业务背景），时间周期、数据效果</li></ul></td><td>UID 粒度</td><td>生成个性化作者成长策略，支持具体的诊断建议产出<br/>线上积累，随数据持续更新</td><td><ol><li seq="1"><b>规模化运营的作者成长档案（诊断+建议+结果）</b><a href="https://bytedance.larkoffice.com/wiki/Nms7wF8W4iQWjHkOMHvchUHanVc?disposable_login_token=eyJ1c2VyX2lkIjoiNzI4MjU4NDMwNzg1NjU1NjAzNiIsImRldmljZV9sb2dpbl9pZCI6Ijc0MTc2NzMwNDM0NjMyNzQ0OTciLCJ0aW1lc3RhbXAiOjE3ODIyMTU5NjIsInVuaXQiOiJldV9uYyIsInB3ZF9sZXNzX2xvZ2luX2F1dGgiOiIxIiwidmVyc2lvbiI6InYzIiwidGVuYW50X2JyYW5kIjoiZmVpc2h1IiwicGtnX2JyYW5kIjoi6aOe5LmmIiwiY2xpZW50X3NjaGVtYSI6IngtZmVpc2h1In0=.4c3f8565d4710e89cf7d99fa44c2cb316173ed53f8b672f82a6b2cfa8526d45b">规模化达人成长工作流case</a>-&gt; 用于Agent制定经营策略</li></ol><img name="img_TLr8bIzfFopASJxb9CqckM0enCg.png" alt="图片展示了知识库中“直播 - 1V1陪跑计划”相关页面。页面分为“直播 - 1V1陪跑计划”“直播 - 1V1陪跑计划 - 作业all in one”“直播 - 1V1陪跑计划 - 作业all in one - 作业”三个部分。左侧是知识卡片，包含标题、内容摘要、发布时间等信息；右侧是详细内容，有图片、视频、文字等。图片右侧突出显示了“直播 - 1V1陪跑计划 - 作业all in one - 作业”部分，其内容为直播1V1陪跑计划作业，包括作业要求、作业内容、作业提交方式等，与上下文介绍的直播1V1陪跑计划作业相关。" mime="image/png" scale="1.000000" src="SrpLbypbzoAK5Nx4qkScadQ7nPb"/><ol><li><b>规模化运营1V1陪跑计划：</b></li></ol><br/>直播 - <cite doc-id="LookwBVItiVaH1kbEHJc2urtnGh" file-type="wiki" title="卓跃计划-作业all in one" type="doc"></cite> <br/>短视频 - <cite doc-id="Bw3ysdU2MhTKSpt21z2c1JyRnkh" file-type="sheets" sheet-id="odoHfU" title="星选计划-4月份工作表（0410版）" type="doc"></cite><grid><column width-ratio="0.565676"><img name="image.png" alt="图片为“流量获取效率提升维度V6”相关数据验证表格，包含一级动作标签、动作分类、对应指标、二级动作验证动作、验证结果等内容。其中一级动作标签有自然流量提升、流量获取效率提升维度V6、广告投放提升等；对应指标如短视频内容完播率、短视频2s触达率等；二级动作验证动作如短视频内容完播率提升、短视频2s触达率提升等；验证结果有有效、无效、持续测试中等。该图片与文档中流量获取效率提升维度V6相关数据验证内容紧密相关。" mime="image/png" scale="0.570312" src="IZ2fbBBdnoNdCWxnNcTcP23Sned"/></column><column width-ratio="0.434324"><img name="image.png" alt="图片展示了数据&amp;知识库建设规划中知识库分层与分类结构相关内容，以表格形式呈现。表格包含数据指标、过筛逻辑、监控指标、二星动态指标、动态指标等列。其中，过筛逻辑部分有多个关键指标，如进店率、停留时长、直链访问占比等，部分指标以黄色高亮显示。动态指标部分，如产品上线进行测试、直链访问占比等，也有部分指标以黄色高亮突出。该图片与上下文紧密相关，是对知识库分层与分类结构中数据指标相关内容的具体呈现。" mime="image/png" scale="0.570312" src="OmZabnAjQon9tjx5vHxcWck9nue"/></column></grid><ol><li><b>KA作者运营阅档会文档（成长历程+经营现状+损益结构+问题分析+经营规划）</b> <a href="https://bytedance.larkoffice.com/docx/VJvTdY0QFoEORsxX9HUcFadmnEA">作者档案阅评会</a> -&gt; Agent学习头部作者运营的思路和经营策略</li></ol><blockquote><p><a href="https://bytedance.larkoffice.com/docx/JdwWdQzuvormj4xalmQcvlvRn7b?from=from_parent_docx">作者阅档会-木森_</a><a href="https://bytedance.larkoffice.com/docx/JdwWdQzuvormj4xalmQcvlvRn7b?from=from_parent_docx">20250702</a></p><p><a href="https://bytedance.larkoffice.com/docx/AGGQd8fDOo5zuxxz8K5cwbbIn7e?from=from_parent_docx">【体操李小双】作者阅档</a></p></blockquote><grid><column width-ratio="0.460000"><img name="img_CXTWbqvH5oSdOGxk5MScYITKnwh.png" alt="图片展示了李小双兄弟成立北京李小双体育用品公司后，从2022年9月开始电商直播，到2025年8月投资策略调整的历程。2022年9月开始电商直播，GMV达750万；12月自建电商团队；2023年8月开始付费投入，GMV达950万，后逐步投入千川商品站；2024年与平台密切接触，带货规模有较大提升；2025年8月投资策略调整，单场GMV达1700万。该图与上文李小双兄弟电商带货历程描述相呼应，直观呈现各关键节点及GMV变化。" mime="image/png" scale="1.000000" src="Dm8pbTnT9oKc6cxz8eEc3O7Pnjg"/></column><column width-ratio="0.540000"><img name="img_Ro0DbpSyhoycwsxMZqzcU61Pnjd.png" alt="图片展示了达人视角经营损益情况，包含支付GMV、结算GMV、经营收入、经营成本等数据。24年H2支付GMV为10382万元，结算GMV5672万元，结算率为55%；25年H1支付GMV6218万元，结算GMV3247万元，结算率为52%。经营收入方面，24年H2为704万元，25年H1为428万元。经营成本中，营销成本（投流）分别为227万元和130万元。图片与上下文紧密相关，直观呈现了达人经营损益数据，为理解达人视角经营情况提供数据支撑。" mime="image/png" scale="1.000000" src="D4pebV8KNonTmFxnKmXcwOadnve"/></column></grid><grid><column width-ratio="0.430000"><img name="img_DTPkbxybYoJHq3xFtuIcbV4dnlh.png" alt="该图片展示了一名主营自然流强卖货直播类达人的经营现状相关数据内容，核心信息为：收入构成方面，电商收入占比100%且全部为佣金收入，无星图单；粉丝画像以男性（占比55%）为主，核心为31-50岁高中高消费人群；消费用户则以女性（占比63%）为主，多为二三线城市的新中产精致妈妈，平台品类分布集中于女装、珠宝酒水等；商家合作层面运动户外类占比98%，核心合作TO3品牌为李宁、安德玛、阿迪达斯；团队共11人，构成包含商务、运营等岗位。此外，图片附带的饼图显示，全部电商流量与全部电商成交均来源于直播体裁。" mime="image/png" scale="1.000000" src="Q6cgbSELxoKuT4xUY6Tcw4dBnub"/></column><column width-ratio="0.570000"><img name="img_Ti7sbKYGRoEdFjxnsoQcapIHnid.png" alt="该图片是一份关于达人成长数据与知识库建设的方案规划OnePage，分为序号1、2两个模块内容。序号1主要围绕达人长期提升卡粉的卡点展开，对应大场提效-付费优化的方案，其目标为单场稳定GMV500万、月GMV稳定在2000万，通过调整定向人群、优化内容及付费预算，相关数据调整后提升40%-50%，还提及大场、Q计划、广告传通的相关规划，对应时间为2025年。序号2是货盘单一的卡点，对应增加货品丰富度的方案，目标为月均GMV提升200-500万，提及李宁品牌合作及对应时间安排，右侧配有相关数据截图，包含12,066,500的数值等信息。" mime="image/png" scale="1.000000" src="AyYQbRiOJoqzDfx4pVGcAQjNnub"/></column></grid></td></tr><tr><td>服务记录明细层</td><td>运营对达人服务的明细会话记录：<ul><li><b>服务渠道</b>：企微端 / 运营平台 / 其他</li><li><b>数据来源</b>：1）人工服务记录打标，标注采纳/有效 2）Agent 策略输出 → 运营微改 → 发送至达人 → 打标回流</li></ul></td><td>会话/任务粒度（最细）</td><td>最细粒度服务过程刻画，筛选打标有效样本后，作为AI模型训练语料，优化作者成长策略<br/>线上积累，随数据持续更新</td><td><ol><li seq="1"><b>企微对话记录：</b>达人和BPO/运营的多轮沟通、诊断、问答，长程交互样本（<a href="https://bytedance.larkoffice.com/docx/NJRpdOUlToKD2YxwQK9cCA9mntg">统计分析&gt;&gt; </a><a href="https://bytedance.larkoffice.com/base/ZvVKbhahLalAK6sEqc9cnCuTnYc?from=from_parent_docx">切片打标&gt;&gt;</a>）<ol><li seq="1">私聊表：<button action="OpenDocVerse" src="{&#34;blockTypeID&#34;:&#34;blk_6475c5a5b681000315605d2c&#34;,&#34;id&#34;:&#34;cli_a4ff79b817b9d00c&#34;,&#34;region&#34;:&#34;CN&#34;,&#34;coralLink&#34;:&#34;https://data.bytedance.net/coral/datamap/detail?from=coral_copy_link&amp;groupName=default&amp;qualifiedName=HiveTable%3A%2F%2F%2Fecom%2Fdm_multistar_operate_msg_send_resv_author_df%4050#group=default&#34;,&#34;qualifiedName&#34;:&#34;HiveTable:///ecom/dm_multistar_operate_msg_send_resv_author_df@50&#34;}">ecom.dm_multistar_operate_msg_send_resv_author_df</button>sql查询参考：<a href="https://data.bytedance.net/aeolus/pages/queryEditor/files/17093426?appId=555159&amp;folderId=3313086&amp;sToken=5528ffdba3e0c879f11daaf9608178a707187251dfdc167ddcdeb6206adefee9ea52368e1d970377eb0eeab2e5f82cb3caf775ad268dc635259e8fb9f3f095591612b9c964f84a9951f5b354e131bcfe&amp;taskId=281475047073711">sql&gt;&gt;</a></li><li>群聊表：<button action="OpenDocVerse" src="{&#34;blockTypeID&#34;:&#34;blk_6475c5a5b681000315605d2c&#34;,&#34;id&#34;:&#34;cli_a4ff79b817b9d00c&#34;,&#34;region&#34;:&#34;CN&#34;,&#34;coralLink&#34;:&#34;https://data.bytedance.net/coral/datamap/detail?from=coral_copy_link&amp;groupName=default&amp;qualifiedName=HiveTable%3A%2F%2F%2Focic_common%2Fdwd_basic_scrm_yh_sl_group_df%400#group=default&#34;,&#34;qualifiedName&#34;:&#34;HiveTable:///ocic_common/dwd_basic_scrm_yh_sl_group_df@0&#34;}">ocic_common.dwd_basic_scrm_yh_sl_group_df</button>sql查询参考：<a href="https://data.bytedance.net/aeolus/pages/queryEditor/files/20009592?appId=555159&amp;folderId=3523473&amp;taskId=281475054926708">sql&gt;&gt;</a></li></ol><p>风险：</p><ul><li><b>推送回复率低：</b> 运营主动发消息 204.6 万条 vs 达人发起 12.5 万条 ≈ <b>16.4 : 1</b>；剔除 RPA 后仍约 14 : 1，达人侧极度沉默</li><li><b>服务覆盖：</b> 24.8 万作者被服务，其中 <b>80.9% 只被触达 1-4 天</b>，持续高频经营（≥15 天）的深度作者仅 198 人</li><li>近 30 天运营共发出 <b>981,093</b> 条文本消息。营销广告（开播任务激励 + 选品货盘 + 活动补贴 + 广告投流）合计 <b>71.1%</b>，节假日/离线自动回复占 <b>19.6%</b>，真正的 1v1 答疑 + 数据复盘 + 作者成长建议服务合计不足 <b>5%</b></li></ul></li></ol><grid><column width-ratio="0.484229"><img name="image.png" alt="该图片是达人运营相关的统计数据表，核心展示近30天员工向达人发送的981,093条文本消息的分配情况。表格按运营发送意图分为5类，其中「开播/任务激励」类消息数为375,007，占比38.2%，是占比最高的类型，对应内容多为报名竞赛、激励活动相关。其他四类分别是占比19.6%的「放假/离线自动回复」、占比14.5%的「选品/货盘/带货」、占比13.9%的「活动/补贴/权益」，以及占比4.5%的「其他/工作交接/日常」，整体数据体现达人运营消息多围绕营销任务展开，答疑等针对性服务占比极低。" mime="image/png" scale="0.365000" src="HzIebxcOeor6gDxhpRvcPEUfnTc"/></column><column width-ratio="0.515771"><img name="image.png" alt="图片展示了达人侧真实发言情况，近30天达人侧共107,039条文本消息，其中24,394条（22.8%）为系统加好友通知与测试mock，已删除。真实达人发言82,645条，下表占比均为此为分母。真实发言里，简短确认+表情回应合计63%，主动咨询/提问占27.5%，确认/回应/寒暄占17.8%，排期/开播反馈占3.5%，选品/货盘诉求占2.8%。图片与上下文紧密相关，直观呈现达人侧真实发言类型及占比情况。" mime="image/png" scale="0.337494" src="XpyCb1xqTop1TxxhXcJcVGG6nbc"/></column></grid><ol><li><b>作者成长任务记录：</b>规模化运营对作者下发的成长任务（领取-完成-AB实验效果）样本，根据预设的动作库，设定领取条件阈值，发放激励，牵引作者完成任务 <cite doc-id="UkNcwBfdciGeczk36cDcP1QAnle" file-type="wiki" title="【作者任务】规模化任务复盘" type="doc"></cite><p>数据表：</p><p><a href="https://data.bytedance.net/aeolus/pages/dataManage/detail/4442103?appId=555159">[数据集]【作者任务】指标ID*条件ID粒度明细</a></p><p><a href="https://data.bytedance.net/aeolus/pages/dataManage/detail/4373893?appId=555159">[数据集]【作者任务】活动ID*作者ID粒度明细</a></p></li></ol><grid><column width-ratio="0.533008"><img name="image.png" alt="图片展示了达人成长相关活动及工具界面。左侧依次为春节视频带货大赛、春节直播带货大赛、春节图文带货大赛的活动页面，显示赛期、赛制、赛品、赛品要求等信息。右侧是货盘、AI工具、防退款技巧等界面，货盘展示商品及达人信息，AI工具呈现达人成长数据，防退款技巧有相关测试题。这些界面与文档中达人成长活动及工具相关内容对应，直观呈现了相关操作及展示情况。" mime="image/png" scale="0.397603" src="YwmRbrsSHo4Uw8x7mYPcdrB9nJh"/></column><column width-ratio="0.466992"><img name="image.png" alt="图片为达人任务设计与过程管理数据统计表，涵盖人群&amp;任务活动、总分、任务设计（共4分）、过程管理（共6分）、结果验证（共4分）、生态影响（共4分）等板块。如S1短视频保供任务，总分为9.0分，任务设计中换加总得分为9.0分，其中加总得分9.0分，换算得分9.0分；过程管理中环节总得分为1.9分，方法牵引得分为1.9分，任务完成中人数得分为1.9分，率得分为1.9分等。该表为达人任务设计与过程管理的数据呈现。" mime="image/png" scale="0.570312" src="YzqYblzJiohtZSxv5otcl9iXn6f"/></column></grid><grid><column width-ratio="0.566310"><img name="image.png" alt="图片为达人成长数据&amp;知识库建设规划中的一张表格，展示了不同动作标签下的动作分类、对应指标及动作解释。如勤奋度方面，有作者账户经营动作提升、作者电商经营动作频次提升等；转化效率方面，有组货优化、塑品、爆品提升等。每项动作均对应具体指标，如开播挂车有效粉丝数、商品单价、商品CTR等，并有详细的动作解释，如优化类目结构、提升场次选品客单价等，为达人成长提供数据支撑。" caption="&#xA;" mime="image/png" scale="0.358194" src="XYDBb6yAxoHEWxxEUvIcaQ8YnYe"/></column><column width-ratio="0.433690"><img name="image.png" alt="图片为“流量获取效率提升对IPV”的动作清单，包含流量提升、自然流量提升、获客Gmv、GMV、新数据、人日均时长提升等6个方面。如流量提升方面，有投放投入、广告投放投流、平台活动投流等；自然流量提升方面，有直播间词点赞、互动率、livehead引流占比等；获客Gmv方面，有商品单价、商品CTR、订单CVR等；GMV方面，有成交速度、结算率等；新数据方面，有开播天数、开播时长等；人日均时长提升方面，有开播天数、开播时长等。" mime="image/png" scale="0.618120" src="NxH8bLHofo1QhDxkRsscjISfnwd"/></column></grid></td></tr></tbody></table>

### 按存储粒度 / 知识形态 / 来源渠道分类

知识库需要同时兼容三个维度：按存储粒度区分作者级与非作者级；按知识形态区分文档类与数据类；按来源渠道区分外部同步与自有沉淀

<table><colgroup><col/><col/><col/><col/></colgroup><thead><tr><th>分类方式</th><th>维度</th><th>说明</th><th>处理方式</th></tr></thead><tbody><tr><td rowspan="2">按存储粒度</td><td>作者粒度</td><td>作者粒度成长相关策略知识，区分作者画像/uid</td><td>基于作者画像匹配，检索相似作者下存储的有效策略动作数据（RAG/GraphRAG）</td></tr><tr><td>非作者粒度</td><td>不区分作者画像/uid，如客服知识库，大盘整体的内容策略，规则文档等</td><td>通过 LLM + Wiki 方案快速启动，支持 Agent 整体及各 skill 的 tool call 调用</td></tr><tr><td rowspan="2">按知识形态</td><td>文档类知识</td><td>方法论、策略模板、话术、SOP、业务规则等以文本为主的知识</td><td>通过 LLM + Wiki 方案快速启动，支持 Agent 整体及各 skill 的 tool call 调用</td></tr><tr><td>数据类知识</td><td>电商大盘标杆作者特征、相似达人、类目跃迁轨迹、基准线数据等结构化数据</td><td>基于作者画像匹配，检索相似作者下存储的有效策略动作数据（RAG/GraphRAG）</td></tr><tr><td rowspan="2">按来源渠道</td><td>外部同步知识</td><td>电商大学等已有的、外部维护的权威知识</td><td>自动同步，设定检索优先级策略，减少重复维护</td></tr><tr><td>自有沉淀知识</td><td>规模化运营在服务过程中沉淀的业务经验、模式、案例</td><td>灵活维护，是自迭代闭环的主要增量来源</td></tr></tbody></table>

## 二、知识库处理链路

### ⭐知识来源和更新机制

全部来源统一进入同一知识底池，但按最终结构归为文档类知识和数据类知识两大类；从建设逻辑看，也可分别承接先验业务知识、后验线上数据。

**各来源知识的更新方式：**

- 大盘达人特征数据：按数仓节奏定时刷新
- 外部权威知识：以“自动同步 + 设定入池策略”为主，减少重复维护
- 自有沉淀知识：以“人工维护 + 自动巡检”为主，提高知识质量 ->  <cite doc-id="OLbedHp1DoQQxbxUg1xcj7h7nUf" file-type="docx" title="【达人成长知识库】文档类知识沉淀业务流程设计" type="doc"></cite>

![图片展示了知识库处理链路，达人运营提交知识后，通过AIME容器内运营agent处理，上传文档经运营方法论文档沉淀，统一形成高质知识输入。产品运营可进行知识团队知识沉淀，通过AIME接口获取团队知识库，再经入池治理流程，自动进行执行冲突/重复标准、实际性校验、实用性校验，最终知识通过后入库。此外，还涉及知识沉淀用于SKM测试、运用Agent skill调试与调用、agent整体skill的RAG与应用等内容。](https://feishu.cn/file/UknwbuxVkotpf3xfZCucbizQnZg)

**知识维护流程：**

1. AI应用侧提供知识管理平台与治理机制，规模化运营完成打标、维护与薄弱场景补齐
2. 搭建版本与有效性状态治理模块，每条策略 / 知识都带版本号与有效性状态，并记录使用频次、匹配成功率与效果分布，让“知识库自身的健康度”可被持续观测和治理

<table><colgroup><col/><col/><col/><col/></colgroup><thead><tr><th>来源大类</th><th>子类 / 模块</th><th>内容举例</th><th>更新机制</th></tr></thead><tbody><tr><td rowspan="2">文档类知识</td><td>外部同步</td><td>电商大学、智能客服等外部权威知识库文档<br/><cite doc-id="LP55wz4aWiLFZSk42CZcWYdKn7e" file-type="wiki" table-id="tblLv1U0sS0pEmIh" title="电商信息汇总" type="doc" view-id="vewcchGNt7"></cite></td><td>核心是建“入池机制”，把需要的文档自动同步到知识库内<br/>外部更新时触发接口拉取其最新结果，并定期评估入池策略是否准确</td></tr><tr><td>内部沉淀</td><td>作者阅档文档、作者成长记录案例、成功运营案例、大盘整体及分作者画像的有效运营方法论<br/>原始文档整理：<blockquote><p><cite doc-id="ONuEwNOyXiAdUjk1SN7cKdl8nzd" file-type="wiki" title="已有知识整理" type="doc"></cite></p><p><cite doc-id="Db3fdUdXPok7xHxcqgEcjHg8ndd" file-type="docx" title="【AI经纪人】规模化运营知识库汇总（持续更新中）" type="doc"></cite></p></blockquote><br/>打标后清单：<br/><cite doc-id="GudmsjA5HhgwJmtkkGNc9egtnYf" file-type="sheets" sheet-id="0lQMKK" title="【达人成长】文档类知识清单_信息粒度标签_精简版" type="doc"></cite></td><td>属于内部运营知识 / 成长策略，由规模化运营持续回收、更新、维护<br/>运营方法论文档通过<b>基于Aime容器的运营Agent</b>进行收集，让运营经验既能快速进入 skill 调试，也能经过标准化治理后进入知识底座，支撑后续 RAG 和统一调用<br/><cite doc-id="OLbedHp1DoQQxbxUg1xcj7h7nUf" file-type="docx" title="【达人成长知识库】文档类知识沉淀业务流程设计" type="doc"></cite><img name="image.png" alt="图片展示了达人运营知识库处理链路。达人运营提出需求，AIME容器内运营agent通过对话、制作或承诺单提交工作，上传文档。文档经多步骤产出知识，包括通过AIME接口获取团队知识库、自动任务执行冲突/重复校验、知识库校验、知识库通过后入库等。入库知识库后，可导入知识库用于SKM测试，也可用于Agent skill调试与调用，如获取行业快速跟进、服务交流等。该图与上下文紧密相关，直观呈现了知识库处理的流程。" mime="image/png" scale="1.000000" src="BH23bCx0goIYtQxYOW6chO7jnjf"/></td></tr><tr><td rowspan="2">数据类知识</td><td>规模化运营服务记录</td><td>按两个维度下拆：<ul><li><b>服务渠道</b>：企微 / 作者成长任务 / 其他</li><li><b>数据来源</b>：人工服务记录打标；Agent 策略输出 → 运营微改 → 发达人 → 打标回流</li><li>本质是运营对 Agent 输出做复核 / review / 校准，沉淀运营采纳率正负样本与达人采纳有效性标注</li></ul></td><td>随服务 / 任务发生，按企微端、运营平台、其他渠道持续回收</td></tr><tr><td>大盘电商作者跃迁特征</td><td>对未被运营覆盖的达人，基于细粒度画像特征匹配跃迁对标达人，得出经营诊断结果、成长策略及行动建议：<br/><cite doc-id="TUjhwAV1wisEWukYPIBc2dHen2f" file-type="wiki" title="【直播+短视频】达人账号画像特征拆解策略需求" type="doc"></cite><ul><li><b>已有</b>：对标达人截面数据分析、短视频 + 橱窗型作者数据</li></ul><blockquote><p>已有数据表</p><ol><li seq="1">短视频+橱窗达人，AI提炼截面画像特征数据：<button action="OpenDocVerse" src="{&#34;blockTypeID&#34;:&#34;blk_6475c5a5b681000315605d2c&#34;,&#34;id&#34;:&#34;cli_a4ff79b817b9d00c&#34;,&#34;region&#34;:&#34;CN&#34;,&#34;coralLink&#34;:&#34;https://data.bytedance.net/coral/datamap/detail?from=coral_copy_link&amp;groupName=default&amp;qualifiedName=HiveTable%3A%2F%2F%2Fecom_alliance_data%2Falliance_ai_author_all_feature%400#group=default&#34;,&#34;qualifiedName&#34;:&#34;HiveTable:///ecom_alliance_data/alliance_ai_author_all_feature@0&#34;}">ecom_alliance_data.alliance_ai_author_all_feature</button> Type:  content = 内容特征  product = 带货特征</li><li>全量达人，标签属性数据（非AI提炼）：<button action="OpenDocVerse" src="{&#34;blockTypeID&#34;:&#34;blk_6475c5a5b681000315605d2c&#34;,&#34;id&#34;:&#34;cli_a4ff79b817b9d00c&#34;,&#34;region&#34;:&#34;CN&#34;,&#34;coralLink&#34;:&#34;https://data.bytedance.net/coral/datamap/detail?from=coral_copy_link&amp;groupName=default&amp;qualifiedName=HiveTable%3A%2F%2F%2Fecom%2Fdm_author_aweme_stats_df%400#group=default&#34;,&#34;qualifiedName&#34;:&#34;HiveTable:///ecom/dm_author_aweme_stats_df@0&#34;}">ecom.dm_author_aweme_stats_df</button></li></ol></blockquote><ul><li><b>待补</b><b>新需求</b>：<ul><li>直播型达人画像建设 <cite doc-id="TUjhwAV1wisEWukYPIBc2dHen2f" file-type="wiki" title="直播达人账号画像拆解策略" type="doc"></cite></li><li>作者成长跃迁轨迹分析 <cite doc-id="V9cidUp12oR9kTxmfRZcl3r4nmg" file-type="docx" title="达人跃迁成长轨迹画像分析demo" type="doc"></cite></li><li>跃迁/降级正负样本对比消偏 <cite doc-id="BjsgdRfsjot6oJxB9q2c94orn5b" file-type="docx" title="达人跃迁 vs 跌落对比特征｜方法论落地 Mock 版" type="doc"></cite></li></ul></li></ul></td><td>按大盘 / 数仓节奏刷新</td></tr></tbody></table>

**大盘电商作者跃迁特征，待补充以下部分数据：**

1. **直播型达人画像**：当前缺失直播内容标签（话术风格 / 人设 / 开播频次 / 时间段等），需补齐直播维度画像  <cite doc-id="TUjhwAV1wisEWukYPIBc2dHen2f" file-type="wiki" title="直播达人账号画像拆解策略" type="doc"></cite>
2. **作者成长跃迁轨迹（时间维度纵向对比）**：沉淀作者成长跃迁轨迹，推理长期成长规划，和跃迁阶段的核心动作 <cite doc-id="V9cidUp12oR9kTxmfRZcl3r4nmg" file-type="docx" title="达人跃迁成长轨迹画像分析demo" type="doc"></cite> **-> 输出同一个作者，每次跃迁对应的核心动作，对结果的贡献lift**

   1. Uid - s1 - 特征 - date
   2. Uid - s2 - 特征 - date
   3. Uid - s1->2跃迁 - 特征diff - lift
3. **成长/跌落正负样本pairwise对比分析（截面正负样本对比）**：将跃迁正样本与保级失败 / 跌落的负样本做 Pair Wise 对比，对核心动作求 diff 消偏，提高因果关联性与置信度，得到真正促进跃迁的有效动作 <cite doc-id="BjsgdRfsjot6oJxB9q2c94orn5b" file-type="docx" title="达人跃迁 vs 跌落对比特征｜方法论落地 Mock 版" type="doc"></cite> **-> 输出每个作者分桶内，跃迁/跌落达人样本核心差异，对结果的贡献lift**

   1. Uid分桶 - 特征聚类 - 跃迁组命中率/跌落组命中率 - lift
   2. Uid分桶策略

<grid>
<column width-ratio="0.250000">
短视频标杆达人画像特征
*（已有）*
</column>
<column width-ratio="0.250000">
达人成长跃迁轨迹及原因
*（建设中）*
</column>
<column width-ratio="0.250000">
直播达人画像特征_V1
*（建设中）*
</column>
<column width-ratio="0.250000">
分桶跃迁/跌落达人对比
*（建设中）*
</column>
</grid>

<grid>
<column width-ratio="0.250000">
![图片展示了一篇名为“‘你’的生日，是值得庆祝的节日与象征你价值的里程碑”的文章内容。文章由ID为121289049949的作者发布，发布时间为2024 - 04 - 18 10:20:00。内容中提到“你”是值得庆祝的节日与象征价值的里程碑，围绕“你”展开，分享了“你”在不同方面的数据，如粉丝数、粉丝增长、粉丝活跃度等。还介绍了“你”的粉丝画像，如年龄分布、性别分布、粉丝来源等。图片与上下文紧密相关，直观呈现了文章核心内容。](https://feishu.cn/file/PlzfbesZ5o4lbfxMDPFc2KBfnWe)
</column>
<column width-ratio="0.250000">
![图片为“3.6 综合归因：五维同频重构而非单点优化”内容，阐述本次S1→S2跃迁不是单点优化，而是赛道、人设、内容、供应链、价格带五个维度同时重构、互相强化的结果。具体表现为赛道做减法、人设做加法、内容做替换、供应链做下沉、价格带做分层等，五个维度互为杠杆，共同构成达人从“低客单杂货宝妈”向“垂类地域母婴带货KOC”跃迁的完整驱动链路。](https://feishu.cn/file/IWkfbhx46oRvacx1CpQcsWKXnLh)
![图片展示了从“全品类广撒网”到“女宝童装垂类深耕”的选品变化。分为跃迁前（S1）和跃迁后（S2）两个阶段，对比了类目结构、价格带、佣金结构、品牌结构、季节节奏等维度的变化。如类目结构从全品类日常刚需变为高度垂直女宝童装，价格带从2.71 - 39.99元低客单价为主变为30元以下超低价+30 - 300元平价童装，佣金结构从跨度极大变为收窄稳定等。该图与上下文关于知识库处理链路中知识来源和更新机制的内容相关，直观呈现了选品策略的转变。](https://feishu.cn/file/FdxSbQyJtoRZpFxBTD0cBN32nM8)
![图片展示了从“辅食育儿分享”重构为“新疆本地宝妈带货”的内容维度变化。分为维度、跃迁前（S1）、跃迁后（S2）及变化性质四列。维度包括人设、内容形态、表达语言等。跃迁前以普通宝妈为主，内容形态以商品展示为主，表达语言为普通话，主题聚焦7月龄+宝宝辅食喂养，挂车密度强电商意图。跃迁后以新疆本地宝妈为主，内容形态以真人商品展示为主，表达语言为维吾尔语，主题聚焦本地发货、性价比等，挂车视频占比96.3%。变化性质为泛人设→地域锐化等。](https://feishu.cn/file/JugQbxc9BoEJnOxigZkc6OP6n8d)
</column>
<column width-ratio="0.250000">
![图片为“直播达人账号画像 - 维度框架”，是知识库处理链路中知识来源和更新机制的内容。分为5个部分：01 - 成长表现，包括P0核心维度、P1次级维度；02 - 账号分型，有P0核心维度、P1次级维度；03 - 直播内容特征，有P0核心维度、P1次级维度；04 - 直播转化表现，有P0核心维度、P1次级维度；05 - 选品特征，有P0核心维度、P1次级维度。该图与上下文介绍的知识库处理链路相关，用于展示知识来源和更新机制中的具体维度。](https://feishu.cn/file/WdFvbnoFzowm2ix9vuZcGU2HnNh)
</column>
<column width-ratio="0.250000">
![图片展示了知识库处理链路中样本设计的两组定义。跃迁组（Ascend）观测窗口为近90天，相对自基线增益≥1.8倍，层级变化至少上升1档，稳定性连续3周相对增益>1.2；跌落组（Descend）观测窗口同样为近90天，相对自基线增益≤0.55倍，层级变化下降1档及以上，稳定性连续3周相对增益<0.7。还说明了为何不做1:1配对，因跌落样本天然更多，保留跌落组全量样本用于分层加权提升lift估计精度。](https://feishu.cn/file/EGDCbMKnboffCgxPnzOcGduQnzd)
![图片展示了知识库分层桶设计的相关内容。同桶内比对的赛道有女装、女宝童装等7类，价格带分为≤30元、30 - 100元等4档，起点层级有S0、S1等5档，投流状态分为无投流、少量投流等3档。共336桶，实际命中118桶，每桶跃迁与跌落样本量之比在0.5 - 1.5之间视为可比桶。该图片与上下文介绍的知识库处理链路中知识来源和更新机制相关，是对分层桶设计的说明。](https://feishu.cn/file/GOJibtokfogSPyxjI5vciNMGnXd)
![图片展示了选品维度相关数据，包含选品特征、跃迁组命中率、跌落组命中率、lift值及方向。如Top1类目GMV占比≥60%的类目垂直特征，跃迁组命中率为68%，跌落组为28%，lift值为2.43，方向为跃迁；Top1类目GMV占比<25%的类目分散特征，跃迁组命中率19%，跌落组为44%，lift值为-2.32，方向为跌落。该图与上下文介绍的选品维度数据相关，用于辅助说明选品特征对GMV的影响。](https://feishu.cn/file/BF6wb6SyxolvArx9WY8cwjLznqf)
![图片为“3.2 内容形态维度”数据表格，展示了不同内容特征在跃迁组和跌落组的命中率及lift值。如真人出镜视频占比≥80%的跃迁组命中率为72%，跌落组为41%，lift值为1.79，方向为跃迁；挂车视频占比≥90%的跃迁组命中率为66%，跌落组为37%，lift值为1.81，方向为跃迁；视频时长中位数20 - 45s（信息密度适中）的跃迁组命中率为54%，跌落组为35%，lift值为1.55，方向为跃迁；纯语音口播占比≥85%（无真人展示）的跃迁组命中率为18%，跌落组为39%，lift值为-2.13，方向为跌落；近30天更换主人设标签≥2次的跃迁组命中率为11%，跌落组为29%，lift值为-2.64，方向为跌落；周发布波动率>60%（时快时慢）的跃迁组命中率为22%，跌落组为42%，lift值为-1.91，方向为跌落。](https://feishu.cn/file/FjOMbgv75oAfHOxzpeEcX4o3n6b)
</column>
</grid>

**运营Agent**

### 知识管理 & 应用链路

<callout emoji="⭐">
**推演过程本身就是知识**：推理链路不是一次性的中间产物，它和“动作 → 效果”结果数据一样是知识库的组成部分，同样沉淀下来用于后续模型训练，让模型学到的不只是“做什么动作”，而是“在什么上下文下、基于什么逻辑做这个动作”。
</callout>

<table><colgroup><col/><col/><col/></colgroup><thead><tr><th>环节</th><th>要做什么</th><th>关键要点</th></tr></thead><tbody><tr><td>数据入池</td><td>明确数据从哪来、怎么更新、何时拉取，并按文档类 / 数据类分别设定入池范围、入池标准与校验规则。</td><td><ul><li><b>文档类知识</b>：内部文档仍需靠人维护，规模化运营需同步维护在知识库后台，并对文档做清洗打标（如来源、适用阶段、品类、问题类型、时效状态等）；外部文档按接口拉取 + 定期评估入池策略执行。</li><li><b>数据类知识</b>：随业务流程发生自动入池；平台侧需要制定数据清洗策略，以及“哪些数据需要入池”的筛选标准。</li></ul></td></tr><tr><td>数据清洗</td><td>对入池的原始数据（企微服务记录、运营平台任务记录等）做切片 + 结构化，结构化后才能进入存储。</td><td><ul><li>切片粒度：以一个动作为单位，运营发出建议 → 达人采纳行为 → 完成动作后效果复盘，合为一个切片。</li><li>观测维度：该周期内达人的动作、态度、是否采纳、采纳后是否有效、时间周期。</li></ul></td></tr><tr><td>知识加工</td><td>DeepResearch 反推运营思考过程——结合作者 &amp; 大盘上下文生产运营动作的推理思路，提升采纳 / 有效原因推理置信度，针对“思考过程 + 结果”同时做强化学习，而非只学运营动作结果。</td><td><ul><li>回答两个“为什么”：<b>采纳前提</b>（达人在什么上下文下愿意采纳这个特定动作）与 <b>效果归因</b>（这个动作为什么会在该场景下产生对应效果）。</li><li>结合多粒度上下文综合推演：达人画像与历史行为、商品与内容数据、投放等粒度上下文、行业趋势 / 平台热点 / 平台活动等当前 context 数据。</li><li>Golden Set：高质量样本集主要来自运营案例库，作为反推与训练参照。</li><li>推演结果入训练：推理链路本身作为知识沉淀，用于后续模型训练。</li></ul></td></tr><tr><td>数据存储</td><td>明确存储结构与存储要求，让切片可被稳定组织与检索。</td><td><ul><li>存储结构：图谱结构（GraphRAG）/ 数据表结构 / 知识文档结构，按知识形态选型。</li><li>存储要求：明确存储字段、维度、粒度、更新频次。</li></ul></td></tr><tr><td>知识库治理</td><td>维护底池质量，管住知识的进出与时效。</td><td><ul><li>吞吐 &amp; 执行效率问题</li><li>版本管理：知识条目版本化管控。</li><li>有效性状态：生效 / 待验证 / 降权 / 已下线。</li><li>巡检告警：基于知识库质量指标，持续巡检重复、冲突、缺失、过期知识切片，并实时触发告警和在线修复。</li><li>降权 / 出池：低效、过期、冲突、失效知识降权或出池。</li></ul></td></tr><tr><td>知识库应用</td><td>知识库应用分三大类策略：<ol><li seq="1">知识检索：负责单次检索、单次应用</li><li>Skill Loop：优化单skill能力</li><li>模型训练：沉淀和持续迭代模型能力</li></ol></td><td><ul><li><b>① 知识检索类</b>：RAG / GraphRAG / DeepResearch，诊断、经营动作生成、成长规划等场景单次检索、单次应用<p>根据 <b><u>1）uid匹配度 2）query匹配度 3）动作采纳率/有效性</u></b> 对检索结果进行rank</p></li><li><b>② Skill Loop</b>：线上反馈数据直接用于优化 Skill，不检索、不经过模型训练，只看 Skill 能力前后效果对比。</li><li><b>③ 模型训练</b>：清洗 / 推演沉淀的语料用于 SFT + RL（强化学习）训练，优化底层模型能力；只看能力前后效果对比。</li></ul></td></tr></tbody></table>



### 检索技术方案选型

基于冷启动数据 + 线上反馈数据，建设一套"可检索、可推理、可溯源"的知识底座，把原本分散在 case 库、课程库、运营经验里的隐性知识，沉淀为策略层可直接调用的推理知识。

| **技术方案** | 是否已支持 | **解决什么问题** | **业务应用场景** |
|-|-|-|-|
| **基础 RAG / 混合检索** | 已支持 | 知识可复用，存的全，找得到。把电商大学课程、业务知识库、标杆作者特征做向量化 + BM25 混合检索，覆盖语义匹配 + 关键词命中两类场景 | 常规知识问答、平台政策与规则解读、生成账号诊断建议时作为参考 |
| **GraphRAG（知识图谱增强检索）** | 待建设 | 关联关系提炼得准。把作者经营 case、对标达人、品类-人群-内容要素抽取成「实体-关系」知识图谱，支持多跳推理 | 对标达人圈选与路径拆解、GAP 诊断时关联本人与对标的差异维度、行动建议的可解释推理依据 |
| **DeepResearch（深度研究）** | 待建设 | 深度研究查得深、查得全。Agent 驱动的多步研究能力——自主拆解研究问题 → 迭代检索 → 交叉验证 → 归纳研究结论 | 深度账号诊断、平台趋势研究、人群洞察、人设计划等需要多轮检索归纳结论的复杂任务 |
| **知识分层与治理** | 待建设 | 提高多来源知识质量。把业务知识库、作者经营 case 库、沟通策略库、平台政策库分层管理；配合定期更新与脱敏机制 | All |

### 后验数据信号漏斗与正负样本构建

Agent 推荐行动 → 达人是否采纳 → 采纳后是否执行 → 执行后 GMV 是否正向提升 → 提升是否达跃迁阈值。这条链路的每个节点都是样本标注的关键信号。

评估每个动作在“发生该动作的人”身上对 GMV 的贡献，统一作为模型训练和 RAG 检索的参考权重。

**数据信号漏斗**：

<table><colgroup><col/><col/><col/><col/><col/><col/></colgroup><thead><tr><th>层级</th><th>验证节点</th><th>信号采集方式</th><th>判定标准</th><th>样本标签</th><th>信号回收时间窗口</th></tr></thead><tbody><tr><td>L0 推荐触达</td><td>Agent是否成功发送建议</td><td>Agent内部日志 (action_log)</td><td>消息成功送达 = True</td><td>基础样本池</td><td rowspan="3">过程信号：秒级/天级回流</td></tr><tr><td>L1 达人采纳</td><td>达人是否点击/查看/操作</td><td>百应端埋点 + 企微消息有效回复</td><td>click/view/operate任一触发</td><td>采纳正样本 vs 忽略负样本</td></tr><tr><td>L2 闭环执行</td><td>达人是否完成推荐的动作</td><td>电商行为数据回流（视频发布/选品/开播）</td><td>XX天内完成对应行动 = True</td><td>执行正样本 vs 未执行负样本</td></tr><tr><td>L3 效果验证</td><td>执行后GMV是否正向提升</td><td>GMV提升归因（7日窗口UID对比）</td><td>GMV增量 &gt; 该等级baseline的10%</td><td>有效正样本 vs 无效负样本</td><td rowspan="2">后验结果信号：数据回流归因窗口7~30天</td></tr><tr><td>L4 跃迁验证</td><td>累积效果是否推动等级跃迁</td><td>季度等级变动数据</td><td>实际发生跃迁 = True</td><td>最高质量正样本</td></tr></tbody></table>

**L3/L4 排除后验自然波动的归因思路**

达人 GMV 本身存在抖动，需排除自然波动和大盘影响，方法分三档：

- **首选 - 同质对照组**：给每个执行了动作的达人，找一批画像、等级、近期趋势都相近但没执行该动作的达人做对照（PSM 倾向得分匹配 + CUPED 降方差），比"实验组 vs 对照组"的增量。
- **次选 - 同账号趋势对比**：对照组凑不齐时，用达人自己行动前的历史趋势，预测"如果不做这个动作 GMV 会怎样"，再和实际值比差额。
- **兜底 - 归因窗口 + 大盘剔除**：限定动作后固定窗口（短视频类 7 天、橱窗/选品类 14 天），并扣掉同期大盘同品类的自然涨跌幅。

**正负样本构建方式**：

| **样本类型** | **触发条件** | **含义 / 怎么用** | **优先级** |
|-|-|-|-|
| **强正样本** | L1+L2+L3+L4 全过 | 这条策略对的、有效、且够大 → 重点学，进 Few-shot 优质案例库（goodcase） | **最高，强正样本** |
| **弱正样本** | L1+L2+L3 过，L4 没够阈值 | 方向对、有小幅提升 → 常规训练语料 | 中 |
| **策略类负样本** | L1+L2 过，L3 无提升/负向 | 动作做了但没用，甚至帮倒忙 → 重点纠偏，进badcase库 | **最高，强负样本** |
| **执行类负样本** | L1 过，L2 没闭环 | 达人想做但执行受阻（工具失败/流程断点）→ 多为工程问题 | 中 |
| **弱负样本** | L1 未采纳 | 建议没打动达人 → 用于优化推荐相关性、表达方式 | 低 |

### 模型训练与迭代方式选型

按"迭代速度"分三层进行策略迭代——**即时层（RAG/Few-shot，天度）+ 中期层（Skill 自循环，周度）+ 长期层（SFT 蒸馏 / RL 强化，月/季度）**。

冷启动靠 RAG + Few-shot 先跑起来（样本少、生效快，稳定性一般）；样本攒到一定量后，通过 SFT 固化能力；RL 最后进行，因为它依赖已蒸馏的模型底座 + 稳定可信的 reward model。Skill 自循环全程并行，专治负样本暴露出的规则缺陷，主要面向过程指标迭代（达人采纳/闭环执行）；模型蒸馏 + RL 主要面向业务结果指标（GMV/达人成长）迭代。

<table><colgroup><col/><col/><col/><col/><col/><col/><col/></colgroup><thead><tr><th>迭代方案</th><th>适用场景</th><th>样本需求</th><th>迭代周期</th><th>优势</th><th>局限</th><th>适用样本</th></tr></thead><tbody><tr><td><b>RLHF强化学习</b></td><td>策略排序优化：用后验 GMV 增量/跃迁贡献做 reward，优化 Planner 的决策策略</td><td><blockquote><p>2000对带reward排序结果的样本对</p></blockquote></td><td>3~4周/轮</td><td>直接优化业务目标</td><td>样本积累慢，冷启动难；需要构建reward model</td><td>带 reward 的全量样本</td></tr><tr><td><b>SFT蒸馏训练</b></td><td>把高质量"诊断→行动→有效"决策轨迹蒸馏进模型，固化稳定能力</td><td><blockquote><p>5000条</p></blockquote></td><td>1~2月/轮</td><td>能力边界扩展快，可控性强</td><td>需高质量标注，对数据量要求大</td><td>强正+弱正样本</td></tr><tr><td><b>Skill自循环迭代</b></td><td>单个Skill内部的md文件/参数调整，用负样本反推规则、prompt、阈值缺陷</td><td><blockquote><p>500条正负反馈</p></blockquote></td><td>1天/轮</td><td>最快上线，无需重新训练模型</td><td>优化上限低，只能微调</td><td>策略/执行负样本</td></tr><tr><td><b>Few-shot ICL</b></td><td>把相似达人范围内效果最好的少数强正样本作为示例注入 prompt</td><td>20-50条精选案例</td><td>实时</td><td>零训练成本，即插即用</td><td>不稳定，受窗口限制</td><td>强正样本</td></tr><tr><td><b>RAG检索增强</b></td><td>知识库做成可检索库，生成策略时实时召回相似成功案例</td><td>无最小阈值</td><td>实时</td><td>知识实时性强，无需重新部署</td><td>依赖检索质量，无法改变模型能力</td><td>强正样本 + 知识库</td></tr></tbody></table>

## 三、数据指标

建设知识库数据指标体系，衡量「知识库自身好不好、检索准不准、用起来有没有效」

以下三组指标分别对应上述三层框架，覆盖知识库自身质量、检索分支质量和最终应用效果。

### **知识库质量指标**

| 维度 | 定义 / 口径 |
|-|-|
| 业务知识覆盖率 | 一个达人能检索到其对应有效经营动作的比例（能检索到对应动作的达人数 ÷ 全部达人数，或运营Agent已覆盖运营记录数 ÷ 应覆盖运营记录数） |
| 知识挖掘准确率 | 提取出的“作者粒度：动作 → 效果” pair 本身提取得准不准（正确提取的 pair 数 ÷ 抽检 pair 总数）  <br/>通过专家评估进行准确率校验 |
| 后验效果覆盖率 | 所有入库数据中，带有采纳率 / 有效率等后验评估数据的比例（有后验数据的条目数 ÷ 入库条目总数） |
| 可读性 | 底层知识本身的可读性（要用于给用户展示），以人工 / 模型评分抽检合格率衡量 |
| 成长策略合理性 | 专家评估的入库策略合理性与分析深度，对齐80分运营的决策逻辑 |
| 数据完整性 | 知识库里存储的作者画像数据覆盖的维度数 ÷ 全域作者画像总维度数，衡量库内画像与全域画像的维度覆盖比例 |

### **检索质量指标**

| 指标 | 定义 / 口径 |
|-|-|
| 检索准确率 | 检索返回结果中，符合检索条件要求（画像/提升指标/经营动作等组合条件）的达人成长有效动作占比 |
| 检索召回率 | 被正确召回的有效动作数 ÷ 应召回的有效动作总数 |
| Top-K 命中率 | 正确知识出现在前 K 个检索结果中的比例 |
| 召回耗时 | 单次检索从请求到返回的耗时 |
| 排序质量分 - 相关性 | 召回结果与达人 UID & query 的相关性打分（人工或模型评估） |
| 排序质量分 - 有效性 | 召回结果平均的后验效果指标表现（平均有效率 / 采纳率） |

### **应用层效果指标**

| 指标 | 定义 / 口径 |
|-|-|
| 策略采纳率 | 被达人 / 运营采纳的策略结论 ÷ 策略输出总数 |
| 动作完成率 | 达人是否完成推荐的动作，通过电商行为数据回流（视频发布/选品/开播）进行长时间窗匹配 |
| 动作有效率 | 执行后GMV是否正向提升 |
| 跃迁 / GMV 增量 | AI 覆盖作者的跃迁率增量，发货 GMV 增量 |

## 四、业务数据回收机制_Updating

<blockquote><p>后续统一通过运营Agent回收：</p><p><cite doc-id="OLbedHp1DoQQxbxUg1xcj7h7nUf" file-type="docx" title="【达人成长知识库】文档类知识沉淀业务流程设计" type="doc"></cite></p><p><cite doc-id="DO9qwPGl2i3aRTkZQ98cyGy4ndb" file-type="wiki" title="【PRD】AI应用_建设运营Agent_V1 （WIP）" type="doc"></cite></p></blockquote>

### 运营平台 & 运营的配合点

**运营平台侧**

从"AI 重构运营流程，运营为 AI 沉淀数据"的视角看，平台侧优先补齐四类能力：

1. **所有达人服务沟通收口与数据留痕**（支持对核心运营服务渠道（企微/任务等）的数据留痕，用于知识清洗/挖掘，业务数据覆盖率xx%，线下数据上翻到运营平台）
2. **动作效果回收打标**（沉淀"达人×运营动作→效果"策略记录，支持运营对策略采纳与否，有效与否进行打标记录，补充对不采纳/不有效问题的分析反馈）
3. **运营Agent接入作者成长策略，支持人机协同服务**（运营agent接入作者成长skills，支持运营对动作采纳/有效打标，融入运营服务工作流，微改后直接发送至作者，打标完整率xx%）

**运营侧协同**

运营的配合重点是运营流程按"数据沉淀优先"适配，把运营动作沉淀成策略数据资产，优化作者成长策略：

1. 对外沟通尽量由 Agent 统一承接并按模板输出，运营只在关键节点做微调与接管，并在运营平台统一进行微调操作，沉淀人工ground truth数据
2. 对内把每次服务沉淀为"达人×动作→效果"的策略记录，并对结果做有效性回收打标，驱动策略权重、模板与模型后训练迭代
3. 团队能力模型随之变化：从"靠经验服务"转向"靠数据判断 + 人机协作管理"，把人力从重复执行和简单沟通，释放到兜底解决困难问题、作者成长策略优化与服务质量把控



### 协同SOP

**运营平台改造前**，由规模化运营 / 自助中心按统一模板沉淀达人陪跑记录、策略总结和正负案例，并对策略有效性做初判；产运及产品负责明确数据源、字段边界和数据回捞方案，并提出平台能力需求；产研侧负责对知识、策略、标注和 case 做清洗加工、模型初评、入库，并接入 Agent 和评测链路。  
**运营平台/自建Agent改造后**，由运营平台/自建Agent统一承接服务沟通留痕、动作效果记录、采纳 / 有效打标和运营 Agent 接入；规模化运营 / 自助中心在平台内使用 Agent 服务达人，完成微调、打标和策略反馈；产品侧持续优化服务链路和字段设计；产研侧基于平台沉淀数据持续优化策略库、模型训练和评测体系。

<grid>
<column width-ratio="0.500000">
![运营平台改造前](https://feishu.cn/file/IwLEbG4wkozli7xpBZZcxAq9nvd)
</column>
<column width-ratio="0.500000">
![运营/自建平台改造后](https://feishu.cn/file/KPjwbya9SoaRCfxXH7WcGYjRnob)
</column>
</grid>

### 分阶段落地节奏

###### 第一阶段：数据基建期（0-1 个月）

目标：把达人侧人工服务的沟通出口收口到运营平台，并把每次人工服务的"动作"与"结果"留痕成可用数据，让后续的标准化服务与模型迭代有稳定输入，先跑通「记录 → 效果」这条最短链路，提升运营动作数据覆盖率xx%。

~~运营平台支持人工动作的采纳/有效性打标窗口，记录人工服务动作的效果指标；运营侧日常还是凭经验服务，只是需要对历史服务的动作采纳率/有效性进行打标。~~

<table><colgroup><col/><col/><col/></colgroup><thead><tr><th>达成效果</th><th>指标预期</th><th>运营平台 / 规模化运营配合</th></tr></thead><tbody><tr><td>沟通出口开始收口，服务事件与结果可追溯，运营从"口头经验"转为"有留痕可复盘"。</td><td><ul><li>服务记录覆盖率 ≥ 90%</li><li>运营主动查历史案例比例 ≥ 30%</li><li>待补：知识检索准确率、成长策略合理性/准确性 a→b</li></ul></td><td><ul><li>运营平台：1）统一沟通入口、会话-达人绑定、服务事件数据接入 2）支持人工动作的采纳/有效性打标窗口，记录人工服务动作的效果指标</li><li>规模化运营：日常还是凭经验服务，只是需要对历史服务的动作采纳率/有效性进行打标</li></ul></td></tr></tbody></table>

###### 第二阶段：运营模式沉淀期（1-2 个月）

目标：让 Agent 把"运营怎么做"沉淀成结构化的动作字典，支持成长策略Skill辅助运营服务，让运营从"自己沟通"转为"定义动作 + 微调输出"，并持续回传达人采纳/未采纳的正负样本。

运营平台新增作者成长策略Skill，支持运营Agent调用，支持运营对结果进行微调，采纳/不采纳打标，并直接发送至达人。

<table><colgroup><col/><col/><col/></colgroup><thead><tr><th>达成效果</th><th>指标预期</th><th>运营平台 / 规模化运营配合</th></tr></thead><tbody><tr><td>标准化服务可批量复用，运营从"逐条沟通"转为"模板化输出 + 必要微调"。</td><td><ul><li>模式覆盖率 ≥ 60%</li><li>推荐参考率 ≥ 50%</li><li>参考采纳率 ≥ 40%</li><li>待补：账号诊断采纳率 +xx%、行动点采纳率 +xx%</li></ul></td><td><ul><li>运营平台：运营平台新增作者成长策略Skill，支持运营Agent调用，支持运营对结果进行微调，采纳/不采纳打标</li><li>规模化运营：对结果进行微调，采纳/不采纳打标，并直接发送至达人</li></ul></td></tr></tbody></table>

###### 第三阶段：有效动作提炼期（2-3 个月）

目标：把运营工作重心迁移到"有效性回收打标"：用结构化标签把"哪些输出有效、为什么有效/无效"标清楚，驱动策略权重更新与 Agent 能力迭代。

运营Agent增加对运营动作的GMV提升有效性打标，将所有Agent+人工产出的运营动作，由运营进行打标判断（有效/无效 + 原因记录），考核规模化运营侧的打标完整率，并沉淀有效率高的正样本，优化作者成长策略Skill。不同运营的服务效果差异开始收敛，有效动作迅速拓展泛化至更多作者，新人成长明显加快。

<table><colgroup><col/><col/><col/></colgroup><thead><tr><th>达成效果</th><th>指标预期</th><th>运营平台 / 规模化运营配合</th></tr></thead><tbody><tr><td>运营从高频沟通转向有效性判断，输出质量收敛，Agent 输出可持续迭代。</td><td><ul><li>显著正向服务占比提升 20% 以上</li><li>无效 / 负向服务减少 30% 以上</li><li>不同运营平均效果差距缩小 40%</li><li>每月需人工修正的模式占比 ≤ 5%</li></ul></td><td><ul><li>运营平台：运营平台支持运营动作有效性回收打标（含原因），考核规模化运营侧的打标完整率，并沉淀有效率高的正样本数据</li><li>规模化运营：定义打标口径，对所有Agent+人工产出的运营动作，进行有效性判断和原因记录</li></ul></td></tr></tbody></table>

###### 第四阶段：Agent主动运营期（3-4 个月）

目标：让 Agent 主动发现风险与机会，AI承担标准化沟通与执行推进，运营只介入关键节点、难例与高风险场景。

运营平台扩大企微侧Agent接管服务的达人范围，无需运营确认即可发送服务消息，运营每天的工作内容从「扫池子找问题」变成「review Agent的运营动作」，Agent开始代替运营完成作者沟通触达，运营以"人机协作"的方式介入关键节点，角色从执行层上移至策略层。

<table><colgroup><col/><col/><col/></colgroup><thead><tr><th>达成效果</th><th>指标预期</th><th>运营平台 / 规模化运营配合</th></tr></thead><tbody><tr><td>标准化服务高度自动化，运营以人机协作方式管理关键节点与复杂任务。</td><td><ul><li>主动干预覆盖率 ≥ 70%</li><li>问题发现比人工平均早 3-5 天</li><li>人均服务量提升 50% 以上</li><li>服务池达人 GMV 增速比非服务池高出可量化显著差异</li><li>待补：AI 覆盖作者 GMV 渗透 a→b、反转贡献 GMV 增量 xx%、跃迁率增量 xx%</li></ul></td><td><ul><li>运营平台：扩大企微Agent（AI小应）接管服务的达人范围，无需运营确认即可发送服务消息，从人主机辅助 -&gt; 机主人辅</li><li>规模化运营：review Agent的运营动作，只介入关键节点、难例与高风险场景</li></ul></td></tr></tbody></table>

###### 第五阶段：Agent个性化成长服务期（4 个月+）

目标：从「Agent单点干预」升级为「Agent全周期成长规划」，Agent统一承接沟通并执行大量标准化动作，为每个达人定制个性化的成长路线图，提供多动作组合优化而非单次建议，执行过程中根据实时反馈动态调整后续计划，并基于潜力预测优化后续行动建议。运营团队负责调试和优化作者成长策略Skill，成为AI业务策略专家，把人力从重复执行和简单沟通，释放到兜底解决困难问题、成长策略优化与服务质量把控。

合并运营Agent和AI小应，由AI小应接管当前有BPO/规模化运营1V1服务的达人，直接对达人进行长周期服务；运营团队负责调试和优化作者成长策略Skill，成为AI业务策略专家，直接参与Agent作者成长策略的迭代；大量标准化沟通由 Agent 自动完成，人工只负责关键节点/复杂问题/拜访等无法替代的场景

<table><colgroup><col/><col/><col/></colgroup><thead><tr><th>达成效果</th><th>指标预期</th><th>运营平台 / 规模化运营配合</th></tr></thead><tbody><tr><td>形成长期自迭代闭环，运营以“数据判断 + 协作管理”为主，标准化沟通与执行由 Agent 承担。</td><td><ul><li>达人晋级周期显著缩短</li><li>运营人效翻倍以上</li><li>经验沉淀完全自动化，无需专门整理 SOP 和案例库</li><li>测评维度：P0 维度机评覆盖率 100%、Agent 会话合格率 75%→90%、发现问题到迭代周期 ≤ 一周</li></ul></td><td><ul><li>运营平台：合并运营Agent和AI小应，由AI小应接管当前有BPO/规模化运营1V1服务的达人，直接对达人进行长周期服务；运营Agent支持运营同学自行调试/优化作者成长策略Skills</li><li>规模化运营：1）负责调试和优化作者成长策略Skill，成为AI业务策略专家 2）负责关键节点/复杂问题/拜访等无法替代的场景</li></ul></td></tr></tbody></table>
