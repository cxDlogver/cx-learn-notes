## 【技术方案】内容活动激励管控线上化

> 作者: ou_0e6f900d8d355cd56a64a1cea7ed4dda | 最后更新: ou_0e6f900d8d355cd56a64a1cea7ed4dda | 更新时间: 2026-06-25T03:02:12Z | 类型: docx

# 一、背景

> 简述需求提出背景，方便阅读文档同学快速熟悉
## 1.1 相关文档

> 文档归档
- **需求文档**：[【PRD】运营平台_内容活动_激励管控线上化](https://bytedance.larkoffice.com/wiki/RQFqwENe8iiLqTkWk7ScWfIznwt)
- **依赖方技术文档**：
- **MeeGo**：
- **需求群**：

[运营平台_内容活动_激励管控线上化 - [需求同步群]](https://applink.larkoffice.com/client/chat/open?chatId=oc_8623cb8ac19c553dc7b9d47a893e6eb4)

- **会议录屏**：
- **测试Case**：

## 1.2 名词解释

> 关键名词含义解释
<table data-lark-table="docx-table" data-block-id="doxcnaPOOdKFpw7zrtjF76GSpcc"><tbody><tr><td><strong>名词</strong></td><td><strong>解释</strong></td><td><strong>备注</strong></td></tr><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></tbody></table>

# 二、需求明细

> 讲清楚为什么做这个需求,  系统要做什么改动来满足需求,  期望达成的目标
## 2.1 问题拆解

> 需求点***问题域拆解***，根据需求拆解需求问题，并提炼、抽象关键问题点，以及未来可能出现的问题
> 对于业务需求：
> 1. 这个环节需要多了解业务，思考需求的合理性，当下是解决什么业务问题，未来还可能需要解决什么业务问题
> 1. 针对问题思考对应的可能的解决方案，提炼抽象出技术需要支持的能力，同时基于未来可能出现的问题去设计技术方案，决定技术选型、系统架构（需要考虑成本）
>
<table data-lark-table="docx-table" data-block-id="CiYLdD0KSoOYDfx3UMFcSwwYn0g"><tbody><tr><td>功能模块</td><td>交互逻辑</td><td>备注</td></tr><tr><td>不激励规则前置透出<br /><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T042211_5bc94b.png~tplv-j9e67inkeg-image.image" alt="Vtu5bFcRvoSHsFxaG53caOKEncc" /></td><td>1. 前端在活动参与资格处，新增不激励规则说明，无需后端。</td><td></td></tr><tr><td>发奖候选名单剔除不激励作品/账号<br /><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T042211_9e1450.png~tplv-j9e67inkeg-image.image" alt="CvM6bJRPGoZm2ExcGxzctNAOnBh" /></td><td>1. 抖加币、抖加券候选发奖列表剔除不激励候选者<br />    1. 查询候选者列表时，对候选列表内容过“不激励”校验的接口，当作品/作者命中不激励规则则在数据返回中剔除该候选物<br />1. 人工提报抖加币发奖时，标注出不激励的作品<br />    1. get_delivery_items_from_sheet接口新增是否命中不激励的字段，用于标识作品是否不激励<br />1. 人工提报名单下载明细<br />    1. 服务端提供下载接口，前端将发奖内容、剔除内容传入进行下载</td><td>- 当列表中有发生剔除，当页数据会不满一整页（例：原本每页20个候选，剔除后剩余18）<br />- 人工提报，不激励的原因是否展示；剔除原因是否填写；下载的模板</td></tr><tr><td>发奖候选剔除<br /><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260629T042211_30183c.png~tplv-j9e67inkeg-image.image" alt="FOPkbJIhvoABu2x5zq0ccbW3naf" /><br /><img src="https://p-ai4se-parser.bytedance.net/tos-cn-i-j9e67inkeg/20260623T072747_4decf0.png~tplv-j9e67inkeg-image.image" alt="VblYbK9YcosBzgxrYQGc4sPunY0" /></td><td>1. 抖加币、抖加券发奖接口，新增不激励命中校验，调用下游不激励接口前置拦截，报错提示阻断发奖<br />1. 新增剔除候选物接口，运营发奖将候选作品/作者勾选为否，在提交发奖名单时，上报剔除接口进行记录。<br />1. 新增抖加币、抖加券剔除明细接口</td><td></td></tr></tbody></table>

## 2.2 业务流程

> 整体业务流转图，重点表示需求的业务交互，一般可参考PRD中相关描述
## 2.3 预期收益

> 需求预期定量收益和定性收益，一般可参考PRD中的描述

## 2.4 需求变更记录

> 引起全链路工作量1人日变化的方案调整（含设计方案调整），视为需求变更，需要产品明确变更原因、涉及的相关方，评估是否通过。 [[模板请复制] XX项目变更&风险管理](https://bytedance.larkoffice.com/sheets/QCossgqq0hWpGHtrq8Fc9djUnzc?sheet=74a15f)
<table data-lark-table="sheet" data-sheet-id="6z57tk" data-sheet-title="6z57tk"><tbody><tr><td>变更类型</td><td>变更状态</td><td>发起人</td><td>发起时间</td><td>变更内容</td><td>变更原因类型</td><td>评估负责人</td><td>评估参与人</td><td>评估结论<br /><br />（不通过时必填，展开H~L列辅助评估）</td><td>STEP1：基础评估 - 合理性&amp;紧急度</td><td>STEP2：变更主体的全链路影响评估</td><td>STEP3：对外部需求的影响评估</td><td>受影响需求评估<br /><br />（研发提供）</td><td>受影响方是否接受<br /><br />（发起人确认）</td></tr><tr><td>需求变更</td><td>待处理</td><td>示例行</td><td></td><td>**变更点概要说明。<br />详细变更内容应确保落在需求方案文档中<br />，技术的最终实现以需求方案内容为准。</td><td>业务收益显著,受协同方影响</td><td>@技术owner</td><td>**所有需要参与评估的变更相关方（Server/FE/Android/iOS/Data/测试/……）</td><td>**H~L列用于辅助评估人推进评估，模板仅供参考，详略自行把控。但模板中提示的信息，要确保沟通中都已经明确并且各方达成一致<br /><br /><br />示例A<br />：接受变更，综合评估结论：在X月X日提测、X月X日发布；受影响需求已与相关方达成一致<br /><br />示例B<br />：拒绝变更，变更收益太小/无法解决问题/可能引入高风险项/建议由上游优化产品方案……</td><td>无疑问，可推进下一步评估</td><td>综合评估<br />：不影响进行中需求前提下，可以在X月X日提测、X月X日发布；高优先级保障下，最快在X月X日提测、X月X日发布<br /><br /><br />- 服务端<br />：预估新增xx人日开发量、xx人日联调时长。顺排可在X月X日开始联调、X月X日提交测试；高优先级下最快可在X月X日开始联调、X月X日提交测试<br /><br /> - 前端<br />： ……<br /><br /> - 测试<br />：……</td><td>是 - 与受影响方沟通中</td><td>**本质是向变更发起方建议一些可做排期协调的其他需求<br />，研发应提前做一轮判断，明显有高价值、高交付要求、排期调整可行性极低的需求（如大促需求），不应当在此列举<br /><br /><br />1. [受影响需求MeeGo]<br /> - 关联角色：Server开发<br /> - 原计划：X月X日Server介入开发，X月X日提测<br /> - 受影响后排期： X月X日介入开发，X月X日提测 <br />2.  [……]</td><td>1. [受影响需求MeeGo]：已达成一致/沟通中/不接受<br /><br />2.  [……]</td></tr></tbody></table>

# 三、整体设计

- **系统架构 （可选**）

> 系统整体架构设计，偏向模块化的描述，重点表示系统的架构拆分以及系统模块之间的交互
- **服务架构**

> 服务角度出发的架构，偏向服务依赖关系描述
# 四、详细设计

> 详细的技术方案选型和设计，拆分功能点到每个小节具体描述
## 4.1 人工上报候选名单

> 当前功能的关键逻辑描述
> ⚠️ 注意：
> 1. 涉及数值计算、数值展示（如订单数、价格、GMV）等场景，务必与数仓或下游服务明确数据字段的单位，并在对齐后在设计文档中明确。
> 1. 使用联盟通用SDK code.byted.org/ecom/alliance_currency_sdk 处理金额，此SDK在注释中强行引导开发者关注数值单位。
>
### 异常case处理（可选）

> **可能的异常case以及对应处理方法**，如：业务逻辑异常、接口超时、部分失败、消费堆积、降级、限流等
> *技术或者业务上的异常case，在产品方案设计中没有涉及，技术方案设计中需要考虑到，待确认点可以在评审时和产品/**QA**对齐*
### IDL

> 接口、数据结构、消息体等的IDL改动或新增，标注出具体改动点
#### RPC

> RPC接口改动或新增
1. 表格上传候选作品

```thrift
struct DeliveryItemInfo {
    1: optional i64 item_id,              // 稿件Id
    2: optional bool if_delivered,                       // 是否被投放过
    3: optional bool if_delivery,                        // 是否发奖
    4: optional ItemDeliveryConfig delivery_config,      // 投放配置
    5: optional bool if_satisfy_delivery_rules,                // 是否满足发奖条件satisfy
    6: optional list<i64> deliveried_task_ids,                // 被投放过的投放任务ids
    7: optional i32 rank,                                    // 投放排名
    8: optional list<HistoryDeliveryInfo> history_delivery_info,      // 历史投放信息
    9: optional bool if_not_incentive,                                    // 是否不激励
}

// 读取飞书表格发奖配置
struct GetDeliveryItemsFromSheetReq {
    1: optional string sheet_url,           // 飞书表格链接
    2: optional i64 activity_id,             // 活动id
    3: optional i64 config_id,               // 配置id

    255: optional base.Base Base
}

struct GetDeliveryItemsFromSheetResp {
    1: optional list<DeliveryItemInfo> item_info,  // 视频投稿信息

    255: optional base.BaseResp base_resp,
}
```

1. 下载移除明细

```thrift
struct ContentRemoveRecord {
    1: optional string author_id,           // 作者id
    2: optional string item_id,           // 投稿id
    3: optional string item_name,           // 投稿名称
    4: optional string remove_reason,           // 移除原因
    5: optional string penalty_reason,           // 处罚原因
}

// 下载移除明细
struct DownloadContentRemoveRecordReq {
    1: optional list<ContentRemoveRecord> records,          // 移除记录

    255: optional base.Base Base
}

struct DownloadContentRemoveRecordResp {
    1: optional string lark_url,          // 明细飞书链接

    255: optional base.BaseResp base_resp
}
```

#### API

> API接口改动或新增，BAM链接
> 请求示例
> 错误码
1. [表格上传候选作品](https://cloud.bytedance.net/bam/rd/ecom.buyin.admin_api/api_doc/show_doc?x-resource-account=public&x-bc-region-id=bytedance&version=1.0.1915&cluster=default&endpoint_id=3930788)（黄色为更新字段）

```thrift
struct delivery_item_info {
    1: optional kol_item.ItemDto item_card,              // 通用运营视频卡
    2: optional bool if_delivered,                       // 是否被投放过
    3: optional bool if_delivery,                        // 是否发奖
    4: optional ItemDeliveryConfig delivery_config,      // 投放配置
    5: optional bool if_satisfy_delivery_rules,                // 是否满足发奖条件satisfy
    6: optional list<string> deliveried_task_ids,                // 被投放过的投放任务ids
    7: optional NotDeliveryReason not_delivery_reason,                                    // 不发奖原因
    8: optional i32 rank,                                    // 投放排名
    9: optional string delivery_reason,        // 发奖原因
    10: optional list<HistoryDeliveryInfo> history_delivery_info,      // 历史投放信息
    11: optional bool if_not_incentive,                                    // 是否不激励
    12: optional list<string> not_incentive_reason,                                    // 不激励原因
}

// 读取飞书表格发奖记录
struct get_delivery_items_from_sheet_request {
    1: optional string sheet_url,           // 飞书表格链接
    2: optional string activity_id,             // 活动id
    3: optional string config_id,               // 配置id
}

struct get_delivery_items_from_sheet_data {
    1: optional list<delivery_item_info> item_info,  // 视频投稿信息
}

struct get_delivery_items_from_sheet_response {
    1: required i32 st,                    // 0:成功, 其他:错误
    2: required string msg,                // 出错提示消息
    3: optional i32 code,                  // 业务异常码 0: 成功, 其他: 错误
    4: optional get_delivery_items_from_sheet_data data,
}
```

1. [下载移除明细](https://cloud.bytedance.net/bam/rd/ecom.buyin.admin_api/api_doc/show_doc?x-resource-account=public&x-bc-region-id=bytedance&cluster=default&version=1.0.1914&endpoint_id=4238483)

```thrift
struct ContentRemoveRecord {
    1: optional string author_id,           // 作者id
    2: optional string item_id,           // 投稿id
    3: optional string item_name,           // 投稿名称
    4: optional string remove_reason,           // 移除原因
    5: optional string penalty_reason,           // 处罚原因
}

// 下载移除明细
struct download_content_remove_record_request {
    1: optional list<ContentRemoveRecord> records,          // 移除记录
}

struct download_content_remove_record_data {
    1: optional string lark_url,          // 明细飞书链接
}

struct download_content_remove_record_response {
    1: required i32 st,                    // 0:成功, 其他:错误
    2: required string msg,                // 出错提示消息
    3: optional i32 code,                  // 业务异常码 0: 成功, 其他: 错误
    4: optional download_content_remove_record_data data,
}
```

### 外部依赖（可选）

> 依赖的下游接口定义或接口文档，以及对应的接口对接人

## 4.2 发奖候选剔除

> 当前功能的关键逻辑描述
> ⚠️ 注意：
> 1. 涉及数值计算、数值展示（如订单数、价格、GMV）等场景，务必与数仓或下游服务明确数据字段的单位，并在对齐后在设计文档中明确。
> 1. 使用联盟通用SDK code.byted.org/ecom/alliance_currency_sdk 处理金额，此SDK在注释中强行引导开发者关注数值单位。
>
### 存储设计（可选）

> 存储设计，包括DB、缓存、ES等存储组件的设计方案
#### **数据模型**

运营剔除发奖候选时，需要将剔除记录记录下来，因此选取mysql新建表做持久化。
**发奖候选剔除表**
```sql
CREATE TABLE `t_content_activity_candidate_remove_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `record_id` bigint NOT NULL COMMENT '移除记录id',
  `activity_id` bigint NOT NULL COMMENT '活动业务id',
  `reward_rule_config_id` bigint NOT NULL COMMENT '奖励配置id',
  `candidate_id` bigint NOT NULL COMMENT '候选id',
  `remove_reason` varchar(255) NOT NULL DEFAULT '' COMMENT '移除原因',
  `operator` bigint NOT NULL COMMENT '操作人工号',
  `is_delete` tinyint NOT NULL COMMENT '是否软删除（0：否 1：是）',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
 `delete_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_record_id` (`record_id`),
  KEY `idx_reward_rule_config_id` (`reward_rule_config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT '发奖候选剔除记录表';
```

### 异常case处理（可选）

> **可能的异常case以及对应处理方法**，如：业务逻辑异常、接口超时、部分失败、消费堆积、降级、限流等
> *技术或者业务上的异常case，在产品方案设计中没有涉及，技术方案设计中需要考虑到，待确认点可以在评审时和产品/QA对齐*
### IDL

> 接口、数据结构、消息体等的IDL改动或新增，标注出具体改动点
#### RPC

> RPC接口改动或新增
1. 发奖候选剔除

```thrift
struct RemoveCandidateInfo {
    1: optional i64 candidate_id,           // 候选id
    2: optional string remove_reason,           // 移除原因
}

// 发奖候选剔除
struct CandidateRemoveReq {
    1: optional i64 activity_id,             // 活动id
    2: optional i64 config_id,               // 配置id
    3: optional list<RemoveCandidateInfo> remove_candidates,          // 移除记录

    255: optional base.Base Base
}

struct CandidateRemoveResp {

    255: optional base.BaseResp base_resp
}
```

1. 获取剔除记录

```thrift
// 获取剔除记录
struct GetRemoveRecordReq {
    1: optional i64 activity_id,             // 活动id
    2: optional i64 config_id,               // 配置id
    3: optional i32 page,                       // 页数（1开始）
    4: optional i32 page_num,                   // 每页数量（max：20）

    255: optional base.Base Base
}

struct RemoveRecord {
    1: optional i64 record_id,           // 移除记录id
    2: optional i64 candidate_id,           // 候选id
    3: optional string remove_reason,           // 移除原因
    4: optional i64 operator_id,           // 移除人工号
    5: optional i64 remove_time,              // 移除时间（unix时间戳，秒）
}

struct GetRemoveRecordResp {
    1: optional list<RemoveRecord> records,          // 移除记录

    255: optional base.BaseResp base_resp
}
```

#### API

> API接口改动或新增，BAM链接
> 请求示例
> 错误码
1. [发奖候选剔除](https://cloud.bytedance.net/bam/rd/ecom.buyin.admin_api/api_doc/show_doc?x-resource-account=public&x-bc-region-id=bytedance&cluster=default&version=1.0.1914&endpoint_id=4238485)

```thrift
struct RemoveCandidateInfo {
    1: optional string candidate_id,           // 候选id
    2: optional string remove_reason,           // 移除原因
}

// 下载移除明细
struct candidate_remove_request {
    1: optional string activity_id,             // 活动id
    2: optional string config_id,               // 配置id
    3: optional list<RemoveCandidateInfo> remove_candidates,          // 移除记录
}

struct candidate_remove_response {
    1: required i32 st,                    // 0:成功, 其他:错误
    2: required string msg,                // 出错提示消息
    3: optional i32 code,                  // 业务异常码 0: 成功, 其他: 错误
}
```

1. [抖加币剔除记录](https://cloud.bytedance.net/bam/rd/ecom.buyin.admin_api/api_doc/show_doc?x-resource-account=public&x-bc-region-id=bytedance&cluster=default&version=1.0.1914&endpoint_id=4238486)

```thrift
// 抖加币剔除记录
struct get_dou_plus_coin_remove_record_request {
    1: optional string activity_id,             // 活动id
    2: optional string config_id,               // 配置id
    3: optional i32 page,                       // 页数（1开始）
    4: optional i32 page_num,                   // 每页数量（max：20）
    5: optional list<string> candidate_ids,           // 候选id列表
    6: optional string operator_id,           // 移除人工号
}

struct DouPlusCoinRemoveRecord {
    1: optional string record_id,           // 移除记录id
    2: optional kol_item.ItemDto item_card,              // 通用运营视频卡
    3: optional string remove_reason,           // 移除原因
    4: optional string operator_id,           // 移除人工号
    5: optional i64 remove_time,              // 移除时间（unix时间戳，秒）
}

struct get_dou_plus_coin_remove_record_data {
    1: optional list<DouPlusCoinRemoveRecord> records,          // 移除记录
    2: optional i32 total,
    3: optional bool has_more,
}

struct get_dou_plus_coin_remove_record_response {
    1: required i32 st,                    // 0:成功, 其他:错误
    2: required string msg,                // 出错提示消息
    3: optional i32 code,                  // 业务异常码 0: 成功, 其他: 错误
    4: optional get_dou_plus_coin_remove_record_data data,
}
```

1. [抖加券剔除记录](https://cloud.bytedance.net/bam/rd/ecom.buyin.admin_api/api_doc/show_doc?x-resource-account=public&x-bc-region-id=bytedance&cluster=default&version=1.0.1914&endpoint_id=4238484)

```thrift
// 抖加券剔除记录
struct get_dou_plus_coupon_remove_record_request {
    1: optional string activity_id,             // 活动id
    2: optional string config_id,               // 配置id
    3: optional i32 page,                       // 页数（1开始）
    4: optional i32 page_num,                   // 每页数量（max：20）
    5: optional list<string> candidate_ids,           // 候选id列表
    6: optional string operator_id,           // 移除人工号
}

struct DouPlusCouponRemoveRecord {
    1: optional string record_id,           // 移除记录id
    2: optional DeliveryAuthorBasicInfo author_info,              // 作者信息
    3: optional string remove_reason,           // 移除原因
    4: optional string operator_id,           // 移除人工号
    5: optional i64 remove_time,              // 移除时间（unix时间戳，秒）
}

struct get_dou_plus_coupon_remove_record_data {
    1: optional list<DouPlusCouponRemoveRecord> records,          // 移除记录
    2: optional i32 total,
    3: optional bool has_more,
}

struct get_dou_plus_coupon_remove_record_response {
    1: required i32 st,                    // 0:成功, 其他:错误
    2: required string msg,                // 出错提示消息
    3: optional i32 code,                  // 业务异常码 0: 成功, 其他: 错误
    4: optional get_dou_plus_coupon_remove_record_data data,
}
```

### 外部依赖（可选）

> 依赖的下游接口定义或接口文档，以及对应的接口对接人
# 五、稳定性相关

> 稳定性相关的check list，技术方案设计过程中需要考虑和检查的点，如果有则检查并打勾，没有则留白
> - [x] 打勾表示已评估相关检查点，如有补充在备注中描述
> - [ ] 不涉及留白
>
## 5.1 基础组件评估

> 使用到的基础组件/中间件相关评估检查点
<table data-lark-table="docx-table" data-block-id="doxcnEEA49ltY7mbRf9C7Gz35Ng"><tbody><tr><td></td><td><strong>检查点</strong></td><td><strong>备注</strong></td></tr><tr><td rowSpan="5">DB</td><td>- [ ] 是否需要新增索引</td><td></td></tr><tr><td>- [ ] 是否存在热点读写</td><td></td></tr><tr><td>- [ ] 是否存在慢查询</td><td></td></tr><tr><td>- [ ] 容量是否满足</td><td></td></tr><tr><td>- [ ] 是否存在写后读</td><td></td></tr><tr><td rowSpan="6">缓存</td><td>- [ ] 是否存在大Key</td><td></td></tr><tr><td>- [ ] 是否存在热Key</td><td></td></tr><tr><td>- [ ] 是否设置缓存过期时间</td><td></td></tr><tr><td>- [ ] 是否存在缓存倾斜</td><td></td></tr><tr><td>- [ ] 是否需要缓存预热</td><td></td></tr><tr><td>- [ ] 是否考虑缓存一致性问题</td><td></td></tr><tr><td rowSpan="2">ES</td><td>- [ ] 是否需要ES对账</td><td></td></tr><tr><td>- [ ] ES容量是否合理、是否需要限流</td><td></td></tr><tr><td rowSpan="3">MQ</td><td>- [ ] 消费重试设置</td><td></td></tr><tr><td>- [ ] 是否考虑消息时效性</td><td></td></tr><tr><td>- [ ] 是否需要顺序消费</td><td></td></tr></tbody></table>

## 5.2 监控报警

> - 业务监控：业务相关监控，如QPS、数据量、时延等打点
> - 异常监控：异常环节的监控打点，如创建失败、超时等打点
> - 报警配置：报警配置链接
>
<table data-lark-table="docx-table" data-block-id="doxcnGcJ6z2cT0d07anyJb48WFf"><tbody><tr><td></td><td><strong>含义</strong></td><td><strong>名称</strong></td><td><strong>相关链接</strong></td><td><strong>备注</strong></td></tr><tr><td rowSpan="4">- [ ] 业务监控</td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td></tr><tr><td rowSpan="3">- [ ] 异常监控</td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td></tr><tr><td rowSpan="2">- [ ] 报警配置</td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td></tr></tbody></table>

## 5.3 安全风险&资损防控

> 资损防控方案（如有），例：一致性对账方案、补偿  [Recas平台用户手册](https://bytedance.feishu.cn/wiki/wikcnboydtcUydunygrj8AGWbEc) 
<table data-lark-table="docx-table" data-block-id="doxcnKSYQKm54PkFtYz1D7QjwEz"><tbody><tr><td></td><td><strong>检查点</strong></td><td><strong>备注</strong></td></tr><tr><td><strong>产品风险</strong></td><td>- [ ] 产品方案上有漏洞，可能会导致较多客诉或者舆情，短时间内增加大量buzz反馈等风险；<br />- [ ] 容易遗漏考虑业务交叉的场景<br />- [ ] 如果需求涉及计费规则更改，一般需要至少7天公示确认期，如果没有识别或者到上线时才识别到，会导致需求上线延期时间较长</td><td></td></tr><tr><td><strong>安全风险：</strong></td><td>- [ ] 功能改动&amp;新增功能是否存在权限控制（<strong>特别是服务端下发入口可见的功能</strong>）：<br />    - [ ] 登录状态<br />    - [ ] 电商权限<br />    - [ ] 作者等级<br />    - [ ] 黑白名单<br />    - [ ] TCC百分比灰度<br />- [ ] 相关读接口是否过了鉴权<br />- [ ] 相关写接口是否过了鉴权<br />- [ ] 是否存在爬虫爬取数据风险，接入风控<br />- [ ] 是否存在被黑产恶意构造请求刷单风险</td><td></td></tr><tr><td><strong>消息处理风险：</strong></td><td>- [ ] 消息延迟是否会造成业务不符合预期；<br />- [ ] 消息乱序是否会导致业务异常；</td><td></td></tr><tr><td><strong>依赖<strong><strong>数仓</strong></strong>风险</strong></td><td>- [ ] 资损强相关需求，是否同步QA及数仓重点保障<a href="https://bytedance.feishu.cn/docx/EX7KdVGwuoyx2Ox7EeIcZgK5nHd">联盟依赖数仓数据资损风险点梳理</a></td><td></td></tr></tbody></table>

## 5.4 兼容性/影响范围评估

> - 兼容性：本次改动的兼容性，是否会影响依赖方/被依赖方的正常运行
> - 修改影响范围：列出可能的影响范围，提供回归功能点
>
<table data-lark-table="docx-table" data-block-id="doxcnKfiQAJn3bJZSisdLxto9Yg"><tbody><tr><td></td><td><strong>评估点</strong></td><td><strong>备注</strong></td></tr><tr><td rowSpan="4">兼容性</td><td>- [ ] 接口兼容性：接口定义是否发生改动且向前兼容</td><td></td></tr><tr><td>- [ ] 存储、缓存、消息定义兼容性：存储数据结构是否发生变更且向前兼容</td><td></td></tr><tr><td>- [ ] 强弱依赖是否变更：依赖链路的强弱依赖是否发生变更且是否合理</td><td></td></tr><tr><td>- [ ] 接口改动是否影响了接口的整体性能、耗时</td><td></td></tr><tr><td>影响范围</td><td>xxx接口迁移<br />yyy逻辑重构</td><td>回归功能点建议：</td></tr></tbody></table>

## 5.5 外部依赖

> 新增外部依赖的check list
> - 强弱依赖，是否可降级
> - 超时设置，是否考虑超时时间以及是否需要配置超时设置
> - ACL鉴权，服务调用的ACL权限是否申请完毕
> - 流量预估，QPS，要考虑批量请求放大
>
<table data-lark-table="docx-table" data-block-id="doxcnAELH82M1fOZ5yhsngND1us"><tbody><tr><td><strong>依赖</strong></td><td><strong>鉴权</strong></td><td><strong>超时设置</strong></td><td><strong>流量预估</strong></td><td><strong>强弱依赖</strong></td><td><strong>备注</strong></td></tr><tr><td>xxx</td><td>- [x]</td><td>- [x]</td><td>- [ ] QPS &lt; xxx</td><td>强</td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table>

## 5.6 性能&容量评估

> - 接口性能：需求全量后接口QPS预估；接口整体耗时评估（考虑边界case最差情况下接口耗时评估
>     - **API****接口耗时规范参考：**
>     - **API****接口耗时P99需要小于1000ms**
>     - **QPS****>10接口耗时P99需要小于800ms**
>     - **QPS****>100接口耗时P99需要小于550ms**
>     - **QPS****>1000接口耗时P99需要小于500ms**
>     - **QPS****>100000接口耗时P99需要小于450ms**
>
> - 容量评估：包括服务负载容量、存储空间等未来半年/一年的预估
>
<table data-lark-table="docx-table" data-block-id="doxcnAp3kf8d3dhSXbyU7xjCIuf"><tbody><tr><td></td><td><strong>评估点</strong></td><td><strong>备注</strong></td></tr><tr><td>- [ ] 容量评估</td><td></td><td></td></tr><tr><td rowSpan="2">- [ ] 接口性能</td><td>QPS预估：未来一年&lt; 1000</td><td></td></tr><tr><td>- 耗时预估：<br />    - AVG：300ms<br />    - P99：900ms</td><td></td></tr></tbody></table>

## 5.7 单元化相关

> [[ByteSet] PSM 接入指引（中心 & 本地）](https://bytedance.larkoffice.com/wiki/UcA6w0bYAiT6a9kfLb2c2oCbnRf)
> - 对于新服务：判断服务是否需要部署华东，如需按文档接入
> - 对于老服务：
>     - 未部署华东的无需关注；
>     - 部署华东的服务，
>     - 有新增接口，判断接口类型，并在单元化平台上发布上线
>     - 有新增存储，判断存储是否在华东有依赖，判断是否同步，并在单元化平台上发布对应存储代号，和PSM关联然后上线
>
<table data-lark-table="docx-table" data-block-id="doxcngltkNv5T6SJrINjxn4hKkg"><tbody><tr><td colSpan="2">类型</td><td>评估点</td><td>相关工单</td></tr><tr><td colSpan="2">新服务</td><td>- [ ] 是否部署华东<br />- [ ] 新增存储发布代号、选择同步方式并关联</td><td></td></tr><tr><td rowSpan="2">老服务</td><td>未部署华东</td><td>-</td><td></td></tr><tr><td>已部署华东</td><td>- [ ] 新增接口配置单元化类型<br />- [ ] 新增存储发布代号、选择同步方式并关联</td><td></td></tr></tbody></table>

## 5.8 测试数据与环境风险评估

<table data-lark-table="docx-table" data-block-id="doxcnkQcfHUP2S4KUJCOyqaaDhf"><tbody><tr><td><strong>分类</strong></td><td><strong>风险点</strong></td><td><strong>结论</strong></td></tr><tr><td rowSpan="5">PPE测试风险</td><td>- [ ] [功能不一致风险] 是否存在PPE硬编码，若存在，需评估硬编码是否合理</td><td>不涉及｜涉及，具体方案.....</td></tr><tr><td>- [ ] [功能不一致风险] 是否需要常驻环境（默认到期自动回收），若存在，需评估常驻泳道必要性、常驻环境和线上功能不一致风险</td><td></td></tr><tr><td>- [ ] [数据隔离风险] 是否做PPE数据隔离（特别注意缓存数据、公用配置数据），若不做隔离，需评估此次增量PPE测试数据写入线上的影响；若做隔离，给出隔离方案</td><td></td></tr><tr><td>- [ ] [消息隔离风险] PPE 消息默认会被线上消费，若涉及MQ消息数据的生产和消费，需评估存量和增量消息被不同环境消费异常风险</td><td></td></tr><tr><td>- [ ] [流量隔离风险] PPE流量默认会Fallback线上，需评估 PPE 调用线上服务的风险</td><td></td></tr><tr><td rowSpan="8">测试数据风险</td><td>[测试数据隔离]<a href="https://bytedance.larkoffice.com/docx/Yz5qdDAeHosXqrxBDtxcXxeqnPb">测试数据打标隔离方案</a><br />- [ ] 是否需要做测试标，若不需要，给出原因；若需要，需支持以下能力：<br />    - [ ] 是否有测试打标能力（示例：测试店铺、测试商品、测试活动等）<br />    - [ ] 测试标是否存在误打、漏打风险（示例：通过env或测试字样自动识别测试标，不需人工打标）<br />    - [ ] 是否可追踪到打标负责人、操作/使用人<br />    - [ ] 相关运营配置平台是否明确标识了测试数据（示例：测试任务展示“测试”角标）</td><td></td></tr><tr><td>- [ ] [测试数据隔离]是否存在测试数据与线上数据误关联风险（示例：测试活动在创建时关联了正式达人，导致给正式达人发站内信），若存在，需要给出防控措施</td><td></td></tr><tr><td>- [ ] [高危数据权限管控]是否存在权限管控，测试权限无法创建/操作正式数据</td><td></td></tr><tr><td>- [ ] [稳定性风险]是否存在测试数据影响服务稳定性的风险，包括考虑短时间构造大量测试数据、测试数据会导致流量放大、测试数据不兼容导致线上panic</td><td></td></tr><tr><td>- [ ] [安全&amp;资损风险]测试数据是否可被线上用户（B端、C端）可见（示例：测试券被正式达人可见、领取；测试券用在正式商品上），若不可见，需给出防控手段</td><td></td></tr><tr><td>- [ ] [脏数据风险]测试数据与正式数据是否会共用缓存，导致测试数据污染缓存的风险</td><td></td></tr><tr><td>- [ ] [脏数据风险]测试数据与正式数据是否会共用存储，测试数据污染报表/看板类数据的风险</td><td></td></tr><tr><td>- [ ] [脏数据风险]是否存在非法的测试数据被写入库的风险（示例：不存在的uid写入数据库，在使用时阻断业务功能）</td><td></td></tr></tbody></table>

## 5.9 删除类变更checklist（不涉及需备注）

<table data-lark-table="docx-table" data-block-id="doxcnx2iMRQ4x5XdZ3Y11SCfMi4"><tbody><tr><td><strong>分类</strong></td><td><strong>评估建议</strong></td><td><strong>评估结论</strong></td></tr><tr><td><strong>是否涉及删除类变更</strong></td><td><strong>各种在现有线上服务上做减法的变更和操作，都属于删除类变更</strong>。常见删除类如下：<br />- 数据存储：下线存储资源，删库、删表、删字段，清空存储，清除缓存，数据归档等<br />- 接口：下线接口，删除字段<br />- 服务：服务下线，服务缩容<br />- 机器资源：下架机器，缩容，删除集群<br />- 其他：删除TLB路由，TCC key删除，Faas 函数下线等</td><td>- [ ] 不涉及<br />- [ ] 涉及：________</td></tr><tr><td><strong>变更影响评估</strong></td><td>1. 数据影响<br />- 删除操作对数据一致性的潜在影响<br />- 考虑数据间的依赖关系，确保不会破坏引用完整性<br />- 明确删除数据规模<br />1. 性能影响<br />- 删除操作对系统性能的影响<br />- 删除后对系统性能的影响<br />1. 业务和上下游影响<br />- 对上下游影响，包括服务调用、数据使用影响<br />- 对业务指标影响</td><td>1. 具体数据影响评估：<br />1. 具体性能影响评估：<br />1. 具体性能影响评估：</td></tr><tr><td><strong>灰度&amp;回滚方案</strong></td><td><strong>遵循可观测、可灰度、可回滚原则</strong><br />1. 删除类变更需要具备灰度策略控制影响面<br />- 流量灰度，id分流、百分比流量、分机房、分集群等方式控制影响<br />- 数据灰度，具备分阶段操作和分阶段回滚数据方案<br />1. 灰度阶段过程中，需考虑数据兼容、数据恢复能力<br />- 新老系统对新老数据的读写兼容，对交叉场景考虑全面<br />- 数据恢复能力，例如双读双写、数据软删等方式<br />- 老数据删除要谨慎，在新流量、新数据验证完成后，再进行旧数据禁写、分批删除操作<br />1. 所有灰度阶段要有对应回滚方案。考虑回滚操作可能影响的其他系统或数据流，避免不可兼容情况</td><td>灰度&amp;分批方案：<br />回滚方案：</td></tr><tr><td><strong>测试阶段</strong></td><td>- 在测试环境模拟完整的删除流程，验证删除后系统功能正常<br />- 测试数据一致性，确保删除后数据关系完整<br />- 测试灰度&amp;回滚流程，确保能够在必要时恢复数据</td><td>- [ ] 已完成测试</td></tr><tr><td><strong>线上操作步骤&amp;验证方案</strong></td><td>- 每个操作步骤有相应的验证点，包括数据验证、流量验证、功能验证、系统指标观察<br />- 高危操作需要其他责任人进行double check</td><td>- [ ] 操作负责人：<br />- [ ] 共同操作人：</td></tr><tr><td><strong>数据类删除时常见陷阱</strong></td><td>1. 数据完整性陷阱<br />- 级联删除未充分评估：确保理解所有级联关系，评估删除的完整影响范围<br />- 部分删除：确保删除操作的原子性，避免数据处于不一致状态<br />- 缓存不一致：更新或清除相关缓存，确保缓存与实际数据一致<br />1. 性能陷阱<br />- 锁定升级：注意行锁可能升级为表锁的情况，特别是在大批量删除时<br />- 热点数据：热点数据删除时，防止缓存击穿对下游回源链路造成压力<br />- 索引维护开销：考虑临时禁用非必要索引以提高删除性能<br />- 日志膨胀：监控事务日志大小，避免日志空间耗尽<br />- 资源竞争：避免在高峰期执行大规模删除操作<br />1. 操作陷阱<br />- 条件错误：仔细检查数据圈选条件，例如where条件、时间分区等，先查看操作数据量级是否符合预期再进行操作，避免删除范围过大或不足<br />- 权限问题：提前验证执行账号是否有足够权限<br />- 环境混淆：确保在正确的环境中执行操作，避免测试误操作生产环境数据<br />1. 恢复陷阱<br />- 备份不完整：确保备份包含所有相关数据，例如从表和关联数据、缓存数据<br />- 回滚依赖性：考虑回滚操作可能影响的其他系统或数据流<br />1. 敏感数据删除<br />- 无删除评估记录：评估是否需要保留删除证明或审计记录<br />- 敏感数据处理：确认备份和归档中的敏感数据处理方式</td><td></td></tr></tbody></table>

# 六、会议记录&排期

> - 会议纪要：关键结论、待确认点TODO
>
> - 任务拆解和排期
>
- [ ] 需求评审
- [ ] 技术评审
- [ ] 开发&自测&联调
    - [ ] 服务端：6.18-6.23
    - [ ] 前端 6.18-6.23
    - [ ] 联调 6.24-6.25

- [ ] Case评审
- [ ] Showcase
- [ ] 测试 :6.26
- [ ] 预期上线时间:6.29
- [ ] 收益回收时间

# 七、CR & 测试

## 7.1 给QA的建议

> 从研发（白盒）角度出发，给出 QA 较为完整的测试建议，例如：
> - 改动仅涉及直播专属价
> ⚠️ 注意：
> 1. 如方案涉及数值展示（如订单数、价格、GMV等），务必验证展示的数值是否准确合理
>

## 7.2  自测case

> 由 QA 同学提供需要 RD 自测的case，提测时 QA 进行检查
> -  测试环境流水线
>
## 7.3 Code Review

> - MR列表
> - CodeReview记录
>
- **MR****：**

<table data-lark-table="docx-table" data-block-id="doxcn5zUdeCM6hwZMiVdAbewCbb"><tbody><tr><td><strong>仓库</strong></td><td><strong>MR</strong></td><td><strong>备注</strong></td></tr><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></tbody></table>

- **流水线：**
- **CR****记录：**

# 八、发布计划

> 制定完整的发布计划，包括上线依赖梳理、上线先后顺序及实验放量节奏等，并在项目Meego群周知并置顶
## 8.1 上线计划

> 上线前CheckList
> 上线计划梳理：包括如：DB 索引工单、ES变更工单、TCC上线、IDL合入、服务升级，OneService上线工单等
<table data-lark-table="docx-table" data-block-id="doxcnbaLBiEJHfCkcquwaP68UHh"><tbody><tr><td><strong>上线前检查</strong></td><td><strong>备注</strong></td></tr><tr><td>- [ ] 新增数据表是否需要建索引</td><td>explain确保索引生效</td></tr><tr><td>- [ ] 新增Overpass依赖是否更新到主分支版本</td><td></td></tr><tr><td>- [ ] 新增调用是否申请服务鉴权</td><td></td></tr><tr><td>- [ ] 新增API接口是否配置TLB</td><td></td></tr><tr><td>- [ ] 新增API接口是否需要接入风控反爬</td><td></td></tr><tr><td>- [ ] OneService API是否上线</td><td></td></tr><tr><td>- [ ] 新增百应接口看门人配置</td><td>百应写接口，在附身状态下不允许调用</td></tr><tr><td>- [ ] 接口字段是否新增枚举值</td><td>前端线上代码是否兼容</td></tr></tbody></table>

<table data-lark-table="docx-table" data-block-id="doxcnPgzDOjqhP0md7Q3MUbErKc"><thead><tr><th><strong>上线顺序</strong></th><th>监控对象</th><th><strong>备注</strong></th></tr></thead><tbody><tr><th>- [ ]</th><td></td><td></td></tr><tr><th>- [ ]</th><td></td><td></td></tr><tr><th>- [ ]</th><td></td><td></td></tr><tr><th>- [ ]</th><td></td><td></td></tr></tbody></table>

## 8.2 相关监控

> 补充上线过程中观察指标和影响，**如果不需要的话请说明原因**。
## 8.3 回滚计划

> 可行的回滚计划梳理：上线出现问题后的预期回滚顺序
<table data-lark-table="docx-table" data-block-id="doxcneYIoJVLER33Za7bRPwwggh"><thead><tr><th><strong>回滚顺序</strong></th><th><strong>备注</strong></th></tr></thead><tbody><tr><th>- [ ]</th><td></td></tr><tr><th>- [ ]</th><td></td></tr><tr><th>- [ ]</th><td></td></tr><tr><th>- [ ]</th><td></td></tr></tbody></table>

## 8.4 实验放量计划

> 1. 上线后再放量，且不要上来就直接100%，缓慢放量（比如10%，30%，60%，100%），甚至可以更慢一些。
> 1. 每次放量间隔至少要达到天级别，不能上午20%，下午就50%。线上达人进线相对有滞后。
> 1. 切忌周五、节前和封板期间放量。
>
# 九、需求收益回收

> 项目上线或AB出结果后，跟踪并回收项目收益
> - AB实验链接
> - AB实验结论文档
>
