## *一句话描述*
<callout emoji="bulb" background-color="light-yellow">
一句话描述：修改内容活动的奖励配置与投放功能，在发奖前自动校验、提示、剔除命中「不激励」规则的作品与账号
</callout>

## 文档记录

<lark-table rows="10" cols="5" header-row="true" column-widths="76,163,83,137,381">

  <lark-tr>
    <lark-td>
      {align="center"}
    </lark-td>
    <lark-td>
      时间 {align="center"}
    </lark-td>
    <lark-td>
      版本号 {align="center"}
    </lark-td>
    <lark-td>
      变更人 {align="center"}
    </lark-td>
    <lark-td>
      变更内容 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **修订记录**
    </lark-td>
    <lark-td>
      <text color="gray">*2026年04月30日*</text>
    </lark-td>
    <lark-td>
      <text color="gray">*1.0*</text>
    </lark-td>
    <lark-td>
      <mention-user id="ou_dda0c932bc07f8af0e4255037947ca0c"/>
    </lark-td>
    <lark-td>
      新建文档 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
      <text color="gray">*2026年05月15日*</text>
    </lark-td>
    <lark-td>
      2.0
    </lark-td>
    <lark-td>
      <mention-user id="ou_dda0c932bc07f8af0e4255037947ca0c"/>
    </lark-td>
    <lark-td>
      根据初评会结论修改完善 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      {align="center"}
    </lark-td>
    <lark-td colspan="2">
      **影响模块** {align="center"}
    </lark-td>
    <lark-td>
      **poc** {align="center"}
    </lark-td>
    <lark-td>
      **模块改造点** {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **影响模块**
    </lark-td>
    <lark-td colspan="2">
      <text color="gray">*内容运营-运营活动-奖励配置*</text>
      <text color="gray">*内容运营-运营活动-奖励投放*</text>
    </lark-td>
    <lark-td>
      <mention-user id="ou_dda0c932bc07f8af0e4255037947ca0c"/>
    </lark-td>
    <lark-td>
      {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td colspan="2">
      **角色** {align="center"}
    </lark-td>
    <lark-td>
      **poc** {align="center"}
    </lark-td>
    <lark-td>
      **相关文档** {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **相关角色**
    </lark-td>
    <lark-td colspan="2">
      <text color="gray">*PM/前端开发/后端开发/QA*</text>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      meego：
      figma设计稿：
      https://www.figma.com/design/fNJJ7mEmEMYU5y0tcAZm3X/Untitled?node-id=0-1&p=f&m=dev
      技术方案：<mention-doc token="HPMndx8meoqS5kxKSb9csLlAn5f" type="docx">【技术方案】内容活动激励管控线上化</mention-doc>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      业务
    </lark-td>
    <lark-td colspan="2">
      策略中台
    </lark-td>
    <lark-td>
      <mention-user id="ou_31a1e5c297b6c6cf21d573081cc2cac5"/>
    </lark-td>
    <lark-td>
      <mention-doc token="TraawmZfSi9dnlk25pBcKhRinUh" type="wiki">电商内容生态激励管控讨论</mention-doc>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td colspan="2">
      治理
    </lark-td>
    <lark-td>
      <mention-user id="ou_a11b8fff0b5e1262ea33a91ebe61b638"/>
    </lark-td>
    <lark-td>
      <mention-doc token="RI65wPLc8i6yTikI1pScZB6innd" type="wiki">【抖音电商】达人内容激励管控导向-wip</mention-doc>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td colspan="2">
      上游接口
    </lark-td>
    <lark-td>
      <mention-user id="ou_7fceca9eb51b80cc4d2f7b4e7885de7e"/>
    </lark-td>
    <lark-td>
      <mention-doc token="T7YXwTv6FiBka9kJ3J3c6DKVnGh" type="wiki">【PRD】运营平台-治理运营-不激励名单接口封装</mention-doc>
    </lark-td>
  </lark-tr>
</lark-table>

## 一、 需求背景
### 1.1 需求来源

<lark-table rows="2" cols="3" column-widths="184,298,250">

  <lark-tr>
    <lark-td>
      来源类型
    </lark-td>
    <lark-td>
      来源描述
    </lark-td>
    <lark-td>
      关联部门
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      策略产品
    </lark-td>
    <lark-td>
      <mention-user id="ou_31a1e5c297b6c6cf21d573081cc2cac5"/><mention-doc token="TraawmZfSi9dnlk25pBcKhRinUh" type="wiki">电商内容生态激励管控讨论</mention-doc>
    </lark-td>
    <lark-td>
      中国电商-电商内容生态-内容策略
    </lark-td>
  </lark-tr>
</lark-table>

### 1.2 背景说明
**现状及问题**
当前资管和内控发现运营发奖存在治理合规风险，主要表现为**部分短视频/图文或账号存在违规行为，但仍然获得了激励资源，**带来了平台资源的错配与浪费**。**
<quote-container>
【影响分析及Badcase】内控以活动期内作者主端命中严重违规、电商侧命中任意罚单和电商侧命中严重类型的罚单的情况进行分析，具体情况如下：
- 主端严重违规：存在204个作者在活动期属于主端严重违规中，但电商侧仍发放激励，对应激励发放金额15.9万，消耗金额5.5万。
- 电商侧命中任意罚单：存在527个作者在活动期存在处罚，涉及发放金额128万，消耗金额17.9万。
- 电商侧命中严重类型罚单：存在8个作者在活动期被命中严重处罚，涉及发放金额5.6万。
数据来源：<mention-doc token="GWh7wcWW7i28fvkAb5ZcGx5ynkJ" type="wiki">【中国电商】内容x流量x达人运营风险评估</mention-doc>
</quote-container>

**解决方案**
在产品能力上做好违规账号和内容的校验与限制，在活动发奖流程前置限制获奖作者/作品的准入名单，避免出现资源使用治理风险。
### 1.3 需求类型及目标
**核心相关的OKR**
<quote-container>
<image token="KhAubDqzHomlzoxoiGscUJfVnVv" width="807" height="180" align="left"/>

</quote-container>

**需求类型：管理辅助型**
**目标及指标**

<lark-table rows="5" cols="5" header-row="true" column-widths="89,227,164,126,295">

  <lark-tr>
    <lark-td>
      **指标类型**
    </lark-td>
    <lark-td>
      **指标**
    </lark-td>
    <lark-td>
      当前值
    </lark-td>
    <lark-td>
      **目标值**
    </lark-td>
    <lark-td>
      目标值制定逻辑（可选）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="2">
      业务指标
    </lark-td>
    <lark-td>
      违规账号被错误激励金额
    </lark-td>
    <lark-td rowspan="2">
      两者加总，月均约150万（含主端严重违规15.9万+电商侧任意罚单128万+电商侧严重罚单5.6万）
    </lark-td>
    <lark-td>
      0
    </lark-td>
    <lark-td>
      通过运营平台-运营活动被剔除的账号中，如果不剔除本应被激励的金额
      <quote-container>
      通俗理解：拦截后省了多少钱
      </quote-container>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      违规作品被错误激励金额
    </lark-td>
    <lark-td>
      0
    </lark-td>
    <lark-td>
      通过运营平台-运营活动被剔除的作品中，如果不剔除本应被激励的金额
      <quote-container>
      通俗理解：拦截后省了多少钱
      </quote-container>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="2">
      平台指标
    </lark-td>
    <lark-td>
      发奖拦截接口调用成功率
    </lark-td>
    <lark-td>
      /
    </lark-td>
    <lark-td>
      100%
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      活动期间被剔除的「不激励」账号与作品**数量**
    </lark-td>
    <lark-td>
      /
    </lark-td>
    <lark-td>
      可观测
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

## 二、 需求概述
### 2.1 需求范围
本需求涉及运营平台「内容活动」模块的奖励配置和奖励发放两个子模块：
- **奖励配置**：圈选用户时前置透出不激励规则提示
- **奖励投放**：发奖前剔除不激励账号/作品，新增剔除明细查看
### 2.2 方案描述

<lark-table rows="5" cols="3" column-widths="195,314,406">

  <lark-tr>
    <lark-td>
      **关键改动** {align="center"}
    </lark-td>
    <lark-td>
      **改动前***（蓝色色块为涉及变更部分）* {align="center"}
    </lark-td>
    <lark-td>
      **改动后***（橘色色块为涉及变更部分）* {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      内容活动-配置页面
      - 透出不激励规则提示
    </lark-td>
    <lark-td>
      - 当前无治理规则校验与查看明细功能
      <whiteboard token="Q0E1wrjCuhA0h5bO1WycqdyRnFf" width="297" height="374"/>
    </lark-td>
    <lark-td>
      在活动参与人群范围划定环节，透出「不激励」规则的提示：
      - 针对「全部用户」和「预埋用户名单」圈选，前置提示“*奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖*”
      <whiteboard token="Rr6lw0FtThXhHEbHIJWcwcwTnle" width="355" height="187"/>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      内容活动-奖励发放
      - 剔除命中不激励规则的作品与账号
    </lark-td>
    <lark-td>
      激励发放时无治理合规校验
    </lark-td>
    <lark-td>
      在奖励投放前新增治理合规校验节点，将命中不激励规则的作品与作者账号即从发奖池中剔除
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      内容活动-奖励发放
      - 新增剔除明细查看
    </lark-td>
    <lark-td>
      发奖后无被剔除的作品与作者名单
      <whiteboard token="D8wwwJrbAhwQ35bCgHCcIMzgnsg"/>
    </lark-td>
    <lark-td>
      - **DOU+币和DOU+券场景：**新增「剔除明细」tab，支持查看被剔除的作品/作者明细
      - **人工提报场景：**在违规作品下透出违规提示，不允许提交违规作品
      <whiteboard token="IFrAwadoph00bBbFniecIsVEnRh"/>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      <text color="blue">`*不激励接口逻辑*`</text>
      - 上游会支持“不激励处罚明细”查询接口，内容运营作为接口使用方，通过“不激励处罚明细”查询接口获取账号和作品维度命中“不激励”的处罚明细列表
    </lark-td>
    <lark-td>
      无
    </lark-td>
    <lark-td>
      - 任务侧获取不激励处罚明细后，需进行逻辑判断：
        - 查询账号和作品维度在活动开始时——奖励投放时的不激励处罚状态，判断账号或作品是否阻断发奖
      <quote-container>
      若最新处罚状态为“申诉解除”/“自主解封解封”，则不阻断发奖；若最新处罚状态为“自然处罚”，则阻断发奖
      </quote-container>
      <quote-container>
      <image token="YaLsbktc2o3NrnxnGv6cBln3nFg" width="778" height="46" align="center"/>
      </quote-container>
    </lark-td>
  </lark-tr>
</lark-table>

### 2.3 需求摘要

<lark-table rows="4" cols="3" header-row="true" column-widths="217,610,95">

  <lark-tr>
    <lark-td>
      需求点
    </lark-td>
    <lark-td>
      概述
    </lark-td>
    <lark-td>
      优先级
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      需求点1:  不激励规则前置透出
    </lark-td>
    <lark-td>
      「奖励配置」环节，圈选用户时，前置提示命中【不激励】规则的账号将无法在后续被发奖
    </lark-td>
    <lark-td>
      P0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      需求点2: 发奖前剔除
    </lark-td>
    <lark-td>
      「奖励投放」计算中奖作者名单和中奖作品名单时，剔除命中「不激励」规则的作者和作品
    </lark-td>
    <lark-td>
      P0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      需求点3: 剔除明细查看查询
    </lark-td>
    <lark-td>
      - 「奖励投放」新增Tab，用于展示与查询由于命中「不激励」标签被剔除的作者与作品明细
      - 人工提报场景，当运营手动上传的作品命中「不激励」标签，提示并剔除
    </lark-td>
    <lark-td>
      P0
    </lark-td>
  </lark-tr>
</lark-table>

## 三、需求详情
### 3.1 不激励规则前置透出

<lark-table rows="3" cols="4" header-row="true" column-widths="141,225,248,420">

  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
      线上（Before）
    </lark-td>
    <lark-td colspan="2">
      优化方案（After）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **优化点**
    </lark-td>
    <lark-td>
      **图**
    </lark-td>
    <lark-td>
      **图**
    </lark-td>
    <lark-td>
      **说明**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      配置页透出不激励规则提示
    </lark-td>
    <lark-td>
      <image token="MNlybiMzFojxK0xcipTcGjumnkb" width="1808" height="2373"/>
    </lark-td>
    <lark-td>
      <whiteboard token="LxmswBz6yhhPDubamDSceRj2nub" width="355" height="187"/>
    </lark-td>
    <lark-td>
      <callout emoji="nest_with_eggs" background-color="light-yellow" border-color="light-orange">
      涉及模块：奖励配置-活动参与资格/预埋用户名单
      </callout>
      **【场景一】活动参与资格选择「全部用户」**
      - **提示**违规账号将无法被发奖
        - 文案：“*奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖   *<text color="blue">*查看【不激励】规则”*</text>
        - 位置：配置项下方
        - 交互：点击<text color="blue">*查看【不激励】规则*</text>，跳转至<mention-doc token="TraawmZfSi9dnlk25pBcKhRinUh" type="wiki">电商内容生态激励管控讨论</mention-doc>
      **【场景二】活动参与资格选择「仅限预埋用户」**
      - **提示**违规账号将无法被发奖
        - 文案：“*奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖   *<text color="blue">*查看【不激励】规则”*</text>
        - 位置：配置项下方
        - 交互：点击<text color="blue">*查看【不激励】规则*</text>，跳转至<mention-doc token="TraawmZfSi9dnlk25pBcKhRinUh" type="wiki">电商内容生态激励管控</mention-doc>
    </lark-td>
  </lark-tr>
</lark-table>

### 3.2 发奖前剔除

<lark-table rows="2" cols="3" header-row="true" column-widths="196,240,607">

  <lark-tr>
    <lark-td>
      需求点
    </lark-td>
    <lark-td>
      图
    </lark-td>
    <lark-td>
      说明
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      发奖前剔除不激励账号/作品
    </lark-td>
    <lark-td>
      <quote-container>
      本需求点仅人工提报场景涉及前端页面改造
      </quote-container>
      <image token="OlSpbF4vyoQCdJxMEo2cnKYJnsh" width="1504" height="1266" align="center"/>
    </lark-td>
    <lark-td>
      <callout emoji="nest_with_eggs" background-color="light-yellow" border-color="light-orange">
      涉及模块：奖励投放-奖励下发
      </callout>
      **【场景一】DOU+币发放**
      - **校验对象**：满足准入条件和排名的作品
      - **校验方式：**根据【活动开始时间-发奖时间】内作品的处罚状态判断
        - 若最新处罚状态为“1 申诉解除”/“2 自主解封解除”，则不阻断发奖；
        - 若最新处罚状态为“0 自然处罚”，则阻断发奖
        
      - **剔除逻辑与展示**：仅展示手动剔除的账号明细
      - **边界情况**：
        <quote-container>
        - 治理接口超时：发奖流程暂停，返回“治理校验失败，请稍后重试”。
        - 治理接口返回异常：发奖流程暂停，返回“治理校验异常，请联系管理员”
        - 剔除后中奖名单为空：正常结束，不发放激励
        </quote-container>
      **【场景二】DOU+券发放**
      - **校验对象**：满足准入条件和排名的作品/账号
      - **校验方式：**根据【活动开始时间-发奖时间】内作品/账号的处罚状态判断
        - 若最新处罚状态为“1 申诉解除”/“2 自主解封解除”，则不阻断发奖；
        - 若最新处罚状态为“0 自然处罚”，则阻断发奖
      - **剔除逻辑与展示**：仅展示手动剔除的账号明细
      - **边界情况**：同场景一
      **【场景三】人工提报**
      - **触发时机**：运营在「奖励投放-人工提报」模块提交中奖名单后
      - **校验对象**：手动提交的作品/账号
      - **校验方式：**根据【活动开始时间-发奖时间】内作品的处罚状态判断
        - 若最新处罚状态为“1 申诉解除”/“2 自主解封解除”，则不阻断发奖；
        - 若最新处罚状态为“0 自然处罚”，则阻断发奖
      - **剔除逻辑与展示**：
        1. **结果展示**：对于处罚作品/账号，红字提示“<text color="gray">*命中【不激励】规则*</text>”
          <quote-container>
          1. 仅提示，不做自动剔除，由运营手动剔除
          </quote-container>
          <quote-container>
          <image token="MkHrbAHoeoMsJtxMbZuc5JSXnNd" width="1514" height="248" align="left"/>
          </quote-container>
        1. **提示交互：**
          1. **文案展示：** 共{作品总数}个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：{作品个数}个
          1. **交互按钮**
            1. 一键移除：点击后移除作品中不满足准入门槛或命中【不激励】规则的作品
            1. 导出移除明细：支持导出飞书表格，包含字段：账号ID、视频ID、视频名称、移除原因、处罚原因（非必填字段）、操作人
              1. <mention-doc token="U1ROwcQHrigceekcHMPc66onnob" type="wiki">【模板示例】手动投放场景-移除明细</mention-doc>
              1. 在活动期间命中多个罚单时，展示最新罚单的处罚原因
              <quote-container>
              <image token="A4bVbtiXDoz87PxuMG3cgZCunKd" width="1410" height="110" align="center"/>
              </quote-container>
        1. **提交限制**：禁止提交处罚作品/账号，运营需先移除处罚作品/账号后才可提交发奖名单
    </lark-td>
  </lark-tr>
</lark-table>

### 3.3 发奖后展示剔除明细

<lark-table rows="2" cols="3" header-row="true" column-widths="100,336,631">

  <lark-tr>
    <lark-td>
      需求点
    </lark-td>
    <lark-td>
      图
    </lark-td>
    <lark-td>
      说明
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      新增「剔除明细」tab
    </lark-td>
    <lark-td>
      <whiteboard token="XqZwwzZVBh38QUbp3itcbqAUnmh"/>
    </lark-td>
    <lark-td>
      <callout emoji="nest_with_eggs" background-color="light-yellow" border-color="light-orange">
      涉及模块：奖励投放-新增「剔除明细」tab，展示每个配置项下作品/账号的剔除情况
      </callout>
      **列表展示逻辑：每发一次奖，批量产生一次剔除名单**
      - 入列表逻辑：每次发奖时，批量提交时提交一批当前不发奖的剔除名单
        <quote-container>
        <image token="XmdgbAtNvokABPx0RF7cXfGFnZd" width="2232" height="1182" align="left"/>
        
        <image token="SW5bbnyvPoT5Sexb5olcqVB2n2U" width="2424" height="1252" align="left"/>
        </quote-container>
        
      **【场景一】DOU+币发放**
      **筛选项**
      - 作品ID
        - 形式：支持批量输入
        - 输入内容：视频/图文/直播ID
      - 操作人
        - 支持下拉选择与输入搜索
      **剔除列表**
      - 作品内容：作品预览、作品标题、作品ID
      - 剔除发奖原因：展示奖励投放前的「不发奖原因」字段内容
      - 剔除发奖时间：手动剔除后提交发奖的时间
      - 操作人：展示手动剔除提交发奖人员
      **【场景二】DOU+券发放**
      **筛选项**
      - 作者ID
      - 操作人
        - 支持下拉选择与输入搜索
      **剔除列表**
      - 作者信息：作者昵称、作者ID
      - 剔除发奖原因：展示奖励投放前的「不发奖原因」字段内容
      - 剔除发奖时间：手动剔除后提交发奖的时间
      - 操作人：展示手动剔除并提交发奖的人员
    </lark-td>
  </lark-tr>
</lark-table>

## 四、埋点需求
<quote-container>
参考文档：[【作者及联盟】数据需求模版](https%3A%2F%2Fbytedance.larkoffice.com%2Fwiki%2FKBMFwD8SXi0WwDk2gqwcQh53nNh)、[作者联盟埋点数据规范](https%3A%2F%2Fbytedance.larkoffice.com%2Fwiki%2FH342wrrHairlxKkGiCPc5NyDn9d)
</quote-container>


<lark-table rows="5" cols="5" column-widths="83,242,215,86,230">

  <lark-tr>
    <lark-td>
      **截图**
    </lark-td>
    <lark-td>
      **产品路径**
    </lark-td>
    <lark-td>
      **具体模块**
    </lark-td>
    <lark-td>
      **字段**
    </lark-td>
    <lark-td>
      **补充参数**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      <image token="C267bJE7foaCNrxOF33cCV47nog" width="1691" height="890" align="center"/>
    </lark-td>
    <lark-td>
      运营平台 > 内容活动 > 奖励配置 > 活动参与资格
    </lark-td>
    <lark-td>
      查看「不激励」规则
    </lark-td>
    <lark-td>
      点击UV
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      <image token="TCRCbdSLmoCEnYx8Nd2cJDdrn1e" width="1428" height="1162" align="center"/>
    </lark-td>
    <lark-td>
      运营平台 > 内容活动 > 奖励投放 > 人工提报
    </lark-td>
    <lark-td>
      人工提报命中「不激励」规则提示曝光
    </lark-td>
    <lark-td>
      曝光UV
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="2">
      <image token="GO0db3raJoA9lqxK912ca6Dhnld" width="1204" height="939" align="center"/>
    </lark-td>
    <lark-td>
      运营平台 > 内容活动 > 奖励投放 > 剔除明细
    </lark-td>
    <lark-td>
      剔除明细 Tab 曝光
    </lark-td>
    <lark-td>
      曝光UV
    </lark-td>
    <lark-td>
      区分Tab所在配置项与奖励类型
      配置项：配置一、配置二......
      奖励类型：DOU+币，DOU+券
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      运营平台 > 内容活动 > 奖励投放 > 剔除明细
    </lark-td>
    <lark-td>
      剔除明细 Tab 点击
    </lark-td>
    <lark-td>
      点击UV
    </lark-td>
    <lark-td>
      区分Tab所在配置项与奖励类型
      配置项：配置一、配置二......
      奖励类型：DOU+币，DOU+券
    </lark-td>
  </lark-tr>
</lark-table>



## 五、实验设计
本期需求为合规能力建设，暂不涉及AB实验。
上线后通过以下方式验证效果：
- 环比/同比：内容活动奖励下发中，违规账号被错误激励的金额及账号数
- 内控对齐：与内控团队对齐数据口径，上线后确认badcase清零或显著下降
---



