## 【PRD】运营平台_内容活动_激励管控线上化

> 作者: ou_1f6a7a7948e31aaceeec2ef864b90abe | 最后更新: ou_3fb90c07f127c237e49b342f9ca16612 | 更新时间: 2026-06-24T13:12:09Z | 类型: docx

## *一句话描述*

> [!TIP]
> 一句话描述：修改内容活动的奖励配置与投放功能，在发奖前自动校验、提示、剔除命中「不激励」规则的作品与账号
>
## 文档记录

<table data-lark-table="docx-table" data-block-id="DbJhdhOCboqniNxHbgTcGQmfnoh"><thead><tr><th></th><th>时间</th><th>版本号</th><th>变更人</th><th>变更内容</th></tr></thead><tbody><tr><td><strong>修订记录</strong></td><td><em>2026年04月30日</em></td><td><em>1.0</em></td><td>@ou_dda0c932bc07f8af0e4255037947ca0c</td><td>新建文档</td></tr><tr><td></td><td><em>2026年05月15日</em></td><td>2.0</td><td>@ou_dda0c932bc07f8af0e4255037947ca0c</td><td>根据初评会结论修改完善</td></tr><tr><td></td><td colSpan="2"><strong>影响模块</strong></td><td><strong>poc</strong></td><td><strong>模块改造点</strong></td></tr><tr><td><strong>影响模块</strong></td><td colSpan="2"><em>内容运营-运营活动-奖励配置</em><br /><em>内容运营-运营活动-奖励投放</em></td><td>@ou_dda0c932bc07f8af0e4255037947ca0c</td><td></td></tr><tr><td></td><td colSpan="2"><strong>角色</strong></td><td><strong>poc</strong></td><td><strong>相关文档</strong></td></tr><tr><td><strong>相关角色</strong></td><td colSpan="2"><em>PM/前端开发/后端开发/QA</em></td><td></td><td>meego：<br />figma设计稿：<br />https://www.figma.com/design/fNJJ7mEmEMYU5y0tcAZm3X/Untitled?node-id=0-1&amp;p=f&amp;m=dev<br />技术方案：<a href="https://bytedance.larkoffice.com/docx/HPMndx8meoqS5kxKSb9csLlAn5f">【技术方案】内容活动激励管控线上化</a></td></tr><tr><td>业务</td><td colSpan="2">策略中台</td><td>@ou_31a1e5c297b6c6cf21d573081cc2cac5</td><td><a href="https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh">电商内容生态激励管控讨论</a></td></tr><tr><td></td><td colSpan="2">治理</td><td>@ou_a11b8fff0b5e1262ea33a91ebe61b638</td><td><a href="https://bytedance.larkoffice.com/wiki/RI65wPLc8i6yTikI1pScZB6innd?chunked=false">【抖音电商】达人内容激励管控导向-wip</a></td></tr><tr><td></td><td colSpan="2">上游接口</td><td>@ou_7fceca9eb51b80cc4d2f7b4e7885de7e</td><td><a href="https://bytedance.larkoffice.com/wiki/T7YXwTv6FiBka9kJ3J3c6DKVnGh">【PRD】运营平台-治理运营-不激励名单接口封装</a></td></tr></tbody></table>

## 一、 需求背景

### 1.1 需求来源

<table data-lark-table="docx-table" data-block-id="doxcnSwJF2IkpXNbU4OcAnQtkxh"><tbody><tr><td>来源类型</td><td>来源描述</td><td>关联部门</td></tr><tr><td>策略产品</td><td>@ou_31a1e5c297b6c6cf21d573081cc2cac5 <a href="https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh">电商内容生态激励管控讨论</a></td><td>中国电商-电商内容生态-内容策略</td></tr></tbody></table>

### 1.2 背景说明

**现状及问题**
当前资管和内控发现运营发奖存在治理合规风险，主要表现为**部分短视频/图文或账号存在违规行为，但仍然获得了激励资源，**带来了平台资源的错配与浪费**。**
> 【影响分析及Badcase】内控以活动期内作者主端命中严重违规、电商侧命中任意罚单和电商侧命中严重类型的罚单的情况进行分析，具体情况如下：
> - 主端严重违规：存在204个作者在活动期属于主端严重违规中，但电商侧仍发放激励，对应激励发放金额15.9万，消耗金额5.5万。
> - 电商侧命中任意罚单：存在527个作者在活动期存在处罚，涉及发放金额128万，消耗金额17.9万。
> - 电商侧命中严重类型罚单：存在8个作者在活动期被命中严重处罚，涉及发放金额5.6万。
> 数据来源：[【中国电商】内容x流量x达人运营风险评估](https://bytedance.larkoffice.com/wiki/GWh7wcWW7i28fvkAb5ZcGx5ynkJ?from=from_parent_docx)
**解决方案**
在产品能力上做好违规账号和内容的校验与限制，在活动发奖流程前置限制获奖作者/作品的准入名单，避免出现资源使用治理风险。
### 1.3 需求类型及目标

**核心相关的OKR**
> ![KhAubDqzHomlzoxoiGscUJfVnVv](https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/image/document_parsing_model/3c88e6f0-ba31-44eb-a970-5f82b454792f.png~tplv-j9e67inkeg-image.image)
>
**需求类型：管理辅助型**
**目标及指标**
<table data-lark-table="docx-table" data-block-id="doxcnxeYpohhHASU3Eiv0wKSsdc"><thead><tr><th><strong>指标类型</strong></th><th><strong>指标</strong></th><th>当前值</th><th><strong>目标值</strong></th><th>目标值制定逻辑（可选）</th></tr></thead><tbody><tr><td rowSpan="2">业务指标</td><td>违规账号被错误激励金额</td><td rowSpan="2">两者加总，月均约150万（含主端严重违规15.9万+电商侧任意罚单128万+电商侧严重罚单5.6万）</td><td>0</td><td>通过运营平台-运营活动被剔除的账号中，如果不剔除本应被激励的金额<br />通俗理解：拦截后省了多少钱</td></tr><tr><td>违规作品被错误激励金额</td><td>0</td><td>通过运营平台-运营活动被剔除的作品中，如果不剔除本应被激励的金额<br />通俗理解：拦截后省了多少钱</td></tr><tr><td rowSpan="2">平台指标</td><td>发奖拦截接口调用成功率</td><td>/</td><td>100%</td><td></td></tr><tr><td>活动期间被剔除的「不激励」账号与作品<strong>数量</strong></td><td>/</td><td>可观测</td><td></td></tr></tbody></table>

## 二、 需求概述

### 2.1 需求范围

本需求涉及运营平台「内容活动」模块的奖励配置和奖励发放两个子模块：
- **奖励配置**：圈选用户时前置透出不激励规则提示
- **奖励投放**：发奖前剔除不激励账号/作品，新增剔除明细查看

### 2.2 方案描述

<table data-lark-table="docx-table" data-block-id="doxcnz1pcCBJIw3on9iDGhjhQCf"><tbody><tr><td><strong>关键改动</strong></td><td><strong>改动前</strong>*（蓝色色块为涉及变更部分）*</td><td><strong>改动后</strong>*（橘色色块为涉及变更部分）*</td></tr><tr><td>内容活动-配置页面<br />- 透出不激励规则提示</td><td>- 当前无治理规则校验与查看明细功能<br /><img src="attachment://board_0.png" alt="!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034752_b3a7c6.png~tplv-j9e67inkeg-image.image)" /></td><td>在活动参与人群范围划定环节，透出「不激励」规则的提示：<br />- 针对「全部用户」和「预埋用户名单」圈选，前置提示“<em>奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖</em>”<br /><img src="attachment://board_1.png" alt="!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260618T092939_43f843.png~tplv-j9e67inkeg-image.image)&gt; 奖励配置-全部用户&gt; 奖励配置-上传预埋用户名单!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034753_d47184.png~tplv-j9e67inkeg-image.image)" /></td></tr><tr><td>内容活动-奖励发放<br />- 剔除命中不激励规则的作品与账号</td><td>激励发放时无治理合规校验</td><td>在奖励投放前新增治理合规校验节点，将命中不激励规则的作品与作者账号即从发奖池中剔除</td></tr><tr><td>内容活动-奖励发放<br />- 新增剔除明细查看</td><td>发奖后无被剔除的作品与作者名单<br /><img src="attachment://board_2.png" alt="!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034752_5a98dd.png~tplv-j9e67inkeg-image.image)&gt; Dou+币&gt; Dou+券&gt; 人工提报!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034752_a6d5f6.png~tplv-j9e67inkeg-image.image)!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034752_802a08.png~tplv-j9e67inkeg-image.image)" /></td><td>- **DOU+币和DOU+券场景：**新增「剔除明细」tab，支持查看被剔除的作品/作者明细<br />- **人工提报场景：**在违规作品下透出违规提示，不允许提交违规作品<br /><img src="attachment://board_3.png" alt="&gt; 被剔除的视频明细&gt; 命中【不激励】规则提示&gt; 被剔除的视频/账号明细&gt; -!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260623T072525_7aa5f4.png~tplv-j9e67inkeg-image.image)!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034752_529e5f.png~tplv-j9e67inkeg-image.image)!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034752_5c174f.png~tplv-j9e67inkeg-image.image)" /></td></tr><tr><td><code>不激励接口逻辑</code><br />- 上游会支持“不激励处罚明细”查询接口，内容运营作为接口使用方，通过“不激励处罚明细”查询接口获取账号和作品维度命中“不激励”的处罚明细列表</td><td>无</td><td>- 任务侧获取不激励处罚明细后，需进行逻辑判断：<br />    - 查询账号和作品维度在活动开始时——奖励投放时的不激励处罚状态，判断账号或作品是否阻断发奖<br />若最新处罚状态为“申诉解除”/“自主解封解封”，则不阻断发奖；若最新处罚状态为“自然处罚”，则阻断发奖<br /><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034751_fccee1.png~tplv-j9e67inkeg-image.image" alt="YaLsbktc2o3NrnxnGv6cBln3nFg" /></td></tr></tbody></table>

### 2.3 需求摘要

<table data-lark-table="docx-table" data-block-id="doxcnfyJqWoysTbfuFIrLULXojb"><thead><tr><th>需求点</th><th>概述</th><th>优先级</th></tr></thead><tbody><tr><td>需求点1:  不激励规则前置透出</td><td>「奖励配置」环节，圈选用户时，前置提示命中【不激励】规则的账号将无法在后续被发奖</td><td>P0</td></tr><tr><td>需求点2: 发奖前剔除</td><td>「奖励投放」计算中奖作者名单和中奖作品名单时，剔除命中「不激励」规则的作者和作品</td><td>P0</td></tr><tr><td>需求点3: 剔除明细查看查询</td><td>- 「奖励投放」新增Tab，用于展示与查询由于命中「不激励」标签被剔除的作者与作品明细<br />- 人工提报场景，当运营手动上传的作品命中「不激励」标签，提示并剔除</td><td>P0</td></tr></tbody></table>

## 三、需求详情

### 3.1 不激励规则前置透出

<table data-lark-table="docx-table" data-block-id="doxcnDP2uNev3bAnmaqidrRScPd"><thead><tr><th></th><th>线上（Before）</th><th colSpan="2">优化方案（After）</th></tr></thead><tbody><tr><td><strong>优化点</strong></td><td><strong>图</strong></td><td><strong>图</strong></td><td><strong>说明</strong></td></tr><tr><td>配置页透出不激励规则提示</td><td><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260618T092938_6a4880.png~tplv-j9e67inkeg-image.image" alt="MNlybiMzFojxK0xcipTcGjumnkb" /></td><td><img src="attachment://board_4.png" alt="!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034752_0f6c36.png~tplv-j9e67inkeg-image.image)&gt; 奖励配置-全部用户&gt; 奖励配置-上传预埋用户名单!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034752_e0a07a.png~tplv-j9e67inkeg-image.image)" /></td><td>&gt; [!NOTE]<br />&gt; 涉及模块：奖励配置-活动参与资格/预埋用户名单<br />&gt;<br /><strong>【场景一】活动参与资格选择「全部用户」</strong><br />- <strong>提示</strong>违规账号将无法被发奖<br />    - 文案：“*奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖   *<em>查看【不激励】规则”</em><br />    - 位置：配置项下方<br />    - 交互：点击<em>查看【不激励】规则</em>，跳转至<a href="https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh?from=from_copylink">电商内容生态激励管控讨论</a><br /><strong>【场景二】活动参与资格选择「仅限预埋用户」</strong><br />- <strong>提示</strong>违规账号将无法被发奖<br />    - 文案：“*奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖   *<em>查看【不激励】规则”</em><br />    - 位置：配置项下方<br />    - 交互：点击<em>查看【不激励】规则</em>，跳转至<a href="https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh?from=from_copylink">电商内容生态激励管控</a></td></tr></tbody></table>

### 3.2 发奖前剔除

<table data-lark-table="docx-table" data-block-id="doxcnydYQTJZpzJzOc9cZivIcac"><thead><tr><th>需求点</th><th>图</th><th>说明</th></tr></thead><tbody><tr><td>发奖前剔除不激励账号/作品</td><td>本需求点仅人工提报场景涉及前端页面改造<br /><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034751_cee475.png~tplv-j9e67inkeg-image.image" alt="OlSpbF4vyoQCdJxMEo2cnKYJnsh" /></td><td>&gt; [!NOTE]<br />&gt; 涉及模块：奖励投放-奖励下发<br />&gt;<br /><strong>【场景一】DOU+币发放</strong><br />- <strong>校验对象</strong>：满足准入条件和排名的作品<br />- **校验方式：**根据【活动开始时间-发奖时间】内作品的处罚状态判断<br />    - 若最新处罚状态为“1 申诉解除”/“2 自主解封解除”，则不阻断发奖；<br />    - 若最新处罚状态为“0 自然处罚”，则阻断发奖<br />- <strong>剔除逻辑与展示</strong>：仅展示手动剔除的账号明细<br />- <strong>边界情况</strong>：<br />    - 治理接口超时：发奖流程暂停，返回“治理校验失败，请稍后重试”。<br />    - 治理接口返回异常：发奖流程暂停，返回“治理校验异常，请联系管理员”<br />    - 剔除后中奖名单为空：正常结束，不发放激励<br /><strong>【场景二】DOU+券发放</strong><br />- <strong>校验对象</strong>：满足准入条件和排名的作品/账号<br />- **校验方式：**根据【活动开始时间-发奖时间】内作品/账号的处罚状态判断<br />    - 若最新处罚状态为“1 申诉解除”/“2 自主解封解除”，则不阻断发奖；<br />    - 若最新处罚状态为“0 自然处罚”，则阻断发奖<br />- <strong>剔除逻辑与展示</strong>：仅展示手动剔除的账号明细<br />- <strong>边界情况</strong>：同场景一<br /><strong>【场景三】人工提报</strong><br />- <strong>触发时机</strong>：运营在「奖励投放-人工提报」模块提交中奖名单后<br />- <strong>校验对象</strong>：手动提交的作品/账号<br />- **校验方式：**根据【活动开始时间-发奖时间】内作品的处罚状态判断<br />    - 若最新处罚状态为“1 申诉解除”/“2 自主解封解除”，则不阻断发奖；<br />    - 若最新处罚状态为“0 自然处罚”，则阻断发奖<br />- <strong>剔除逻辑与展示</strong>：<br />    1. <strong>结果展示</strong>：对于处罚作品/账号，红字提示“<em>命中【不激励】规则</em>”<br />        1. 仅提示，不做自动剔除，由运营手动剔除<br /><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034751_8c4b1e.png~tplv-j9e67inkeg-image.image" alt="MkHrbAHoeoMsJtxMbZuc5JSXnNd" /><br />    1. <strong>提示交互：</strong><br />        1. <strong>文案展示：</strong> 共&#123;作品总数&#125;个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：&#123;作品个数&#125;个<br />        1. <strong>交互按钮</strong><br />            1. 一键移除：点击后移除作品中不满足准入门槛或命中【不激励】规则的作品<br />            1. 导出移除明细：支持导出飞书表格，包含字段：账号ID、视频ID、视频名称、移除原因、处罚原因（非必填字段）、操作人<br />                1. <a href="https://bytedance.larkoffice.com/wiki/U1ROwcQHrigceekcHMPc66onnob">【模板示例】手动投放场景-移除明细</a><br />                1. 在活动期间命中多个罚单时，展示最新罚单的处罚原因<br /><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034751_b1c5b3.png~tplv-j9e67inkeg-image.image" alt="A4bVbtiXDoz87PxuMG3cgZCunKd" /><br />    1. <strong>提交限制</strong>：禁止提交处罚作品/账号，运营需先移除处罚作品/账号后才可提交发奖名单</td></tr></tbody></table>

### 3.3 发奖后展示剔除明细

<table data-lark-table="docx-table" data-block-id="Ucb1dxTeBoK1a4xnD1Dcqv5wnvd"><thead><tr><th>需求点</th><th>图</th><th>说明</th></tr></thead><tbody><tr><td>新增「剔除明细」tab</td><td><img src="attachment://board_5.png" alt="&gt; 命中【不激励】规则提示&gt; 被剔除的视频明细&gt; 被剔除的视频/账号明细!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034752_0bb566.png~tplv-j9e67inkeg-image.image)&gt; -!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034752_bfde33.png~tplv-j9e67inkeg-image.image)!图片(https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260618T092939_b959bd.png~tplv-j9e67inkeg-image.image)" /></td><td>&gt; [!NOTE]<br />&gt; 涉及模块：奖励投放-新增「剔除明细」tab，展示每个配置项下作品/账号的剔除情况<br />&gt;<br /><strong>列表展示逻辑：每发一次奖，批量产生一次剔除名单</strong><br />- 入列表逻辑：每次发奖时，批量提交时提交一批当前不发奖的剔除名单<br /><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034751_a5cb9b.png~tplv-j9e67inkeg-image.image" alt="XmdgbAtNvokABPx0RF7cXfGFnZd" /><br /><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034751_926c59.png~tplv-j9e67inkeg-image.image" alt="SW5bbnyvPoT5Sexb5olcqVB2n2U" /><br /><strong>【场景一】DOU+币发放</strong><br /><strong>筛选项</strong><br />- 作品ID<br />    - 形式：支持批量输入<br />    - 输入内容：视频/图文/直播ID<br />- 操作人<br />    - 支持下拉选择与输入搜索<br /><strong>剔除列表</strong><br />- 作品内容：作品预览、作品标题、作品ID<br />- 剔除发奖原因：展示奖励投放前的「不发奖原因」字段内容<br />- 剔除发奖时间：手动剔除后提交发奖的时间<br />- 操作人：展示手动剔除提交发奖人员<br /><strong>【场景二】DOU+券发放</strong><br /><strong>筛选项</strong><br />- 作者ID<br />- 操作人<br />    - 支持下拉选择与输入搜索<br /><strong>剔除列表</strong><br />- 作者信息：作者昵称、作者ID<br />- 剔除发奖原因：展示奖励投放前的「不发奖原因」字段内容<br />- 剔除发奖时间：手动剔除后提交发奖的时间<br />- 操作人：展示手动剔除并提交发奖的人员</td></tr></tbody></table>

## 四、埋点需求

> 参考文档：[【作者及联盟】数据需求模版](https://bytedance.larkoffice.com/wiki/KBMFwD8SXi0WwDk2gqwcQh53nNh)、[作者联盟埋点数据规范](https://bytedance.larkoffice.com/wiki/H342wrrHairlxKkGiCPc5NyDn9d)
<table data-lark-table="docx-table" data-block-id="AMpHdnyOAoRiOcxF3YYc9pxvnkh"><tbody><tr><td><strong>截图</strong></td><td><strong>产品路径</strong></td><td><strong>具体模块</strong></td><td><strong>字段</strong></td><td><strong>补充参数</strong></td></tr><tr><td><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260618T092938_c0d0b4.png~tplv-j9e67inkeg-image.image" alt="C267bJE7foaCNrxOF33cCV47nog" /></td><td>运营平台 &gt; 内容活动 &gt; 奖励配置 &gt; 活动参与资格</td><td>查看「不激励」规则</td><td>点击UV</td><td></td></tr><tr><td><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034751_c5237a.png~tplv-j9e67inkeg-image.image" alt="TCRCbdSLmoCEnYx8Nd2cJDdrn1e" /></td><td>运营平台 &gt; 内容活动 &gt; 奖励投放 &gt; 人工提报</td><td>人工提报命中「不激励」规则提示曝光</td><td>曝光UV</td><td></td></tr><tr><td rowSpan="2"><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T034751_3313b4.png~tplv-j9e67inkeg-image.image" alt="GO0db3raJoA9lqxK912ca6Dhnld" /></td><td>运营平台 &gt; 内容活动 &gt; 奖励投放 &gt; 剔除明细</td><td>剔除明细 Tab 曝光</td><td>曝光UV</td><td>区分Tab所在配置项与奖励类型<br />配置项：配置一、配置二......<br />奖励类型：DOU+币，DOU+券</td></tr><tr><td>运营平台 &gt; 内容活动 &gt; 奖励投放 &gt; 剔除明细</td><td>剔除明细 Tab 点击</td><td>点击UV</td><td>区分Tab所在配置项与奖励类型<br />配置项：配置一、配置二......<br />奖励类型：DOU+币，DOU+券</td></tr></tbody></table>

## 五、实验设计

本期需求为合规能力建设，暂不涉及AB实验。
上线后通过以下方式验证效果：
- 环比/同比：内容活动奖励下发中，违规账号被错误激励的金额及账号数
- 内控对齐：与内控团队对齐数据口径，上线后确认badcase清零或显著下降

---


---
附件 (6 个):

- board_0.png (image/png, 465097 bytes)

- board_1.png (image/png, 531938 bytes)

- board_2.png (image/png, 708574 bytes)

- board_3.png (image/png, 557041 bytes)

- board_4.png (image/png, 531938 bytes)

- board_5.png (image/png, 745402 bytes)
