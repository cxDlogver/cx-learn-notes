# 一、背景
<quote-container>
简述需求提出背景，方便阅读文档同学快速熟悉
</quote-container>

## 1.1 相关文档
<quote-container>
文档归档
</quote-container>

- **需求文档**：<mention-doc token="RQFqwENe8iiLqTkWk7ScWfIznwt" type="wiki">【PRD】运营平台_内容活动_激励管控线上化</mention-doc>
- **依赖方技术文档**：
- **MeeGo**：
- **需求群**：
<chat-card id="oc_8623cb8ac19c553dc7b9d47a893e6eb4" name="运营平台_内容活动_激励管控线上化 - [需求同步群]"/>

- **会议录屏**：
- **测试Case**：
## 1.2 名词解释
<quote-container>
关键名词含义解释
</quote-container>


<lark-table rows="4" cols="3" column-widths="100,186,100">

  <lark-tr>
    <lark-td>
      **名词**
    </lark-td>
    <lark-td>
      **解释**
    </lark-td>
    <lark-td>
      **备注**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

# 二、需求明细
<quote-container>
讲清楚为什么做这个需求,  系统要做什么改动来满足需求,  期望达成的目标
</quote-container>

## 2.1 问题拆解
<quote-container>
需求点***问题域拆解***，根据需求拆解需求问题，并提炼、抽象关键问题点，以及未来可能出现的问题
对于业务需求：
1. 这个环节需要多了解业务，思考需求的合理性，当下是解决什么业务问题，未来还可能需要解决什么业务问题
1. 针对问题思考对应的可能的解决方案，提炼抽象出技术需要支持的能力，同时基于未来可能出现的问题去设计技术方案，决定技术选型、系统架构（需要考虑成本）
</quote-container>


<lark-table rows="4" cols="3" column-widths="266,355,170">

  <lark-tr>
    <lark-td>
      功能模块
    </lark-td>
    <lark-td>
      交互逻辑
    </lark-td>
    <lark-td>
      备注
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      不激励规则前置透出
      <image token="Vtu5bFcRvoSHsFxaG53caOKEncc" width="2060" height="1552" align="center"/>
    </lark-td>
    <lark-td>
      1. 前端在活动参与资格处，新增不激励规则说明，无需后端。
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      发奖候选名单剔除不激励作品/账号
      <image token="CvM6bJRPGoZm2ExcGxzctNAOnBh" width="1504" height="1266" align="center"/>
    </lark-td>
    <lark-td>
      1. 抖加币、抖加券候选发奖列表剔除不激励候选者
        1. 查询候选者列表时，对候选列表内容过“不激励”校验的接口，当作品/作者命中不激励规则则在数据返回中剔除该候选物
      1. 人工提报抖加币发奖时，标注出不激励的作品
        1. get_delivery_items_from_sheet接口新增是否命中不激励的字段，用于标识作品是否不激励
      1. 人工提报名单下载明细
        1. 服务端提供下载接口，前端将发奖内容、剔除内容传入进行下载
    </lark-td>
    <lark-td>
      - 当列表中有发生剔除，当页数据会不满一整页（例：原本每页20个候选，剔除后剩余18）
      - 人工提报，不激励的原因是否展示；剔除原因是否填写；下载的模板
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      发奖候选剔除
      <image token="FOPkbJIhvoABu2x5zq0ccbW3naf" width="2232" height="1182" align="center"/>
      <image token="VblYbK9YcosBzgxrYQGc4sPunY0" width="2264" height="1734" align="center"/>
    </lark-td>
    <lark-td>
      1. 抖加币、抖加券发奖接口，新增不激励命中校验，调用下游不激励接口前置拦截，报错提示阻断发奖
      1. 新增剔除候选物接口，运营发奖将候选作品/作者勾选为否，在提交发奖名单时，上报剔除接口进行记录。
      1. 新增抖加币、抖加券剔除明细接口
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

## 2.2 业务流程
<quote-container>
整体业务流转图，重点表示需求的业务交互，一般可参考PRD中相关描述
</quote-container>

## 2.3 预期收益
<quote-container>
需求预期定量收益和定性收益，一般可参考PRD中的描述
</quote-container>


## 2.4 需求变更记录
<quote-container>
引起全链路工作量1人日变化的方案调整（含设计方案调整），视为需求变更，需要产品明确变更原因、涉及的相关方，评估是否通过。 <mention-doc token="QCossgqq0hWpGHtrq8Fc9djUnzc" type="sheet">[模板请复制] XX项目变更&风险管理</mention-doc>
</quote-container>

<sheet token="GABTsUbkxho5PItDZNQce2eTnlc_6z57tk"/>


# 三、整体设计
- **系统架构 （可选**）
<quote-container>
系统整体架构设计，偏向模块化的描述，重点表示系统的架构拆分以及系统模块之间的交互
</quote-container>

- **服务架构**
<quote-container>
服务角度出发的架构，偏向服务依赖关系描述
</quote-container>

# 四、详细设计
<quote-container>
详细的技术方案选型和设计，拆分功能点到每个小节具体描述
</quote-container>

## 4.1 人工上报候选名单
<quote-container>
当前功能的关键逻辑描述
⚠️ 注意：
1. 涉及数值计算、数值展示（如订单数、价格、GMV）等场景，务必与数仓或下游服务明确数据字段的单位，并在对齐后在设计文档中明确。
1. 使用联盟通用SDK code.byted.org/ecom/alliance_currency_sdk 处理金额，此SDK在注释中强行引导开发者关注数值单位。
</quote-container>

### 异常case处理（可选）
<quote-container>
**可能的异常case以及对应处理方法**，如：业务逻辑异常、接口超时、部分失败、消费堆积、降级、限流等
*技术或者业务上的异常case，在产品方案设计中没有涉及，技术方案设计中需要考虑到，待确认点可以在评审时和产品/**QA**对齐*
</quote-container>

### IDL
<quote-container>
接口、数据结构、消息体等的IDL改动或新增，标注出具体改动点
</quote-container>

#### RPC
<quote-container>
RPC接口改动或新增
</quote-container>

1. 表格上传候选作品
```thrift {wrap}
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
```thrift {wrap}
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
<quote-container>
API接口改动或新增，BAM链接
请求示例
错误码
</quote-container>

1. [表格上传候选作品](https%3A%2F%2Fcloud.bytedance.net%2Fbam%2Frd%2Fecom.buyin.admin_api%2Fapi_doc%2Fshow_doc%3Fx-resource-account%3Dpublic%26x-bc-region-id%3Dbytedance%26version%3D1.0.1915%26cluster%3Ddefault%26endpoint_id%3D3930788)（黄色为更新字段）
```thrift {wrap}
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

1. [下载移除明细](https%3A%2F%2Fcloud.bytedance.net%2Fbam%2Frd%2Fecom.buyin.admin_api%2Fapi_doc%2Fshow_doc%3Fx-resource-account%3Dpublic%26x-bc-region-id%3Dbytedance%26cluster%3Ddefault%26version%3D1.0.1914%26endpoint_id%3D4238483)
```thrift {wrap}
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
<quote-container>
依赖的下游接口定义或接口文档，以及对应的接口对接人
</quote-container>


## 4.2 发奖候选剔除
<quote-container>
当前功能的关键逻辑描述
⚠️ 注意：
1. 涉及数值计算、数值展示（如订单数、价格、GMV）等场景，务必与数仓或下游服务明确数据字段的单位，并在对齐后在设计文档中明确。
1. 使用联盟通用SDK code.byted.org/ecom/alliance_currency_sdk 处理金额，此SDK在注释中强行引导开发者关注数值单位。
</quote-container>

### 存储设计（可选）
<quote-container>
存储设计，包括DB、缓存、ES等存储组件的设计方案
</quote-container>

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
<quote-container>
**可能的异常case以及对应处理方法**，如：业务逻辑异常、接口超时、部分失败、消费堆积、降级、限流等
*技术或者业务上的异常case，在产品方案设计中没有涉及，技术方案设计中需要考虑到，待确认点可以在评审时和产品/QA对齐*
</quote-container>

### IDL
<quote-container>
接口、数据结构、消息体等的IDL改动或新增，标注出具体改动点
</quote-container>

#### RPC
<quote-container>
RPC接口改动或新增
</quote-container>

1. 发奖候选剔除
```thrift {wrap}
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
```thrift {wrap}
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
<quote-container>
API接口改动或新增，BAM链接
请求示例
错误码
</quote-container>

1. [发奖候选剔除](https%3A%2F%2Fcloud.bytedance.net%2Fbam%2Frd%2Fecom.buyin.admin_api%2Fapi_doc%2Fshow_doc%3Fx-resource-account%3Dpublic%26x-bc-region-id%3Dbytedance%26cluster%3Ddefault%26version%3D1.0.1914%26endpoint_id%3D4238485)
```thrift {wrap}
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

1. [抖加币剔除记录](https%3A%2F%2Fcloud.bytedance.net%2Fbam%2Frd%2Fecom.buyin.admin_api%2Fapi_doc%2Fshow_doc%3Fx-resource-account%3Dpublic%26x-bc-region-id%3Dbytedance%26cluster%3Ddefault%26version%3D1.0.1914%26endpoint_id%3D4238486)
```thrift {wrap}
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

1. [抖加券剔除记录](https%3A%2F%2Fcloud.bytedance.net%2Fbam%2Frd%2Fecom.buyin.admin_api%2Fapi_doc%2Fshow_doc%3Fx-resource-account%3Dpublic%26x-bc-region-id%3Dbytedance%26cluster%3Ddefault%26version%3D1.0.1914%26endpoint_id%3D4238484)
```thrift {wrap}
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
<quote-container>
依赖的下游接口定义或接口文档，以及对应的接口对接人
</quote-container>

# 五、稳定性相关
<quote-container>
稳定性相关的check list，技术方案设计过程中需要考虑和检查的点，如果有则检查并打勾，没有则留白
- [x] 打勾表示已评估相关检查点，如有补充在备注中描述
- [ ] 不涉及留白
</quote-container>

## 5.1 基础组件评估
<quote-container>
使用到的基础组件/中间件相关评估检查点
</quote-container>


<lark-table rows="17" cols="3" column-widths="149,218,171">

  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
      **检查点**
    </lark-td>
    <lark-td>
      **备注**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="5">
      DB
    </lark-td>
    <lark-td>
      - [ ] 是否需要新增索引
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 是否存在热点读写
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 是否存在慢查询
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 容量是否满足
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 是否存在写后读
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="6">
      缓存
    </lark-td>
    <lark-td>
      - [ ] 是否存在大Key
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 是否存在热Key
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 是否设置缓存过期时间
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 是否存在缓存倾斜
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 是否需要缓存预热
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 是否考虑缓存一致性问题
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="2">
      ES
    </lark-td>
    <lark-td>
      - [ ] 是否需要ES对账
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] ES容量是否合理、是否需要限流
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="3">
      MQ
    </lark-td>
    <lark-td>
      - [ ] 消费重试设置
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 是否考虑消息时效性
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 是否需要顺序消费
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

## 5.2 监控报警
<quote-container>
- 业务监控：业务相关监控，如QPS、数据量、时延等打点
- 异常监控：异常环节的监控打点，如创建失败、超时等打点
- 报警配置：报警配置链接
</quote-container>


<lark-table rows="10" cols="5" column-widths="149,82,100,195,171">

  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
      **含义**
    </lark-td>
    <lark-td>
      **名称**
    </lark-td>
    <lark-td>
      **相关链接**
    </lark-td>
    <lark-td>
      **备注**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="4">
      - [ ] 业务监控
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="3">
      - [ ] 异常监控
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="2">
      - [ ] 报警配置
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

## 5.3 安全风险&资损防控
<quote-container>
资损防控方案（如有），例：一致性对账方案、补偿  <mention-doc token="wikcnboydtcUydunygrj8AGWbEc" type="wiki">Recas平台用户手册</mention-doc> 
</quote-container>


<lark-table rows="5" cols="3" column-widths="135,626,100">

  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
      **检查点**
    </lark-td>
    <lark-td>
      **备注**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **产品风险**
    </lark-td>
    <lark-td>
      - [ ] 产品方案上有漏洞，可能会导致较多客诉或者舆情，短时间内增加大量buzz反馈等风险；
      - [ ] 容易遗漏考虑业务交叉的场景
      - [ ] 如果需求涉及计费规则更改，一般需要至少7天公示确认期，如果没有识别或者到上线时才识别到，会导致需求上线延期时间较长
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **安全风险：**
    </lark-td>
    <lark-td>
      - [ ] 功能改动&新增功能是否存在权限控制（**特别是服务端下发入口可见的功能**）：
        - [ ] 登录状态
        - [ ] 电商权限
        - [ ] 作者等级
        - [ ] 黑白名单
        - [ ] TCC百分比灰度
      - [ ] 相关读接口是否过了鉴权
      - [ ] 相关写接口是否过了鉴权
      - [ ] 是否存在爬虫爬取数据风险，接入风控
      - [ ] 是否存在被黑产恶意构造请求刷单风险
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **消息处理风险：**
    </lark-td>
    <lark-td>
      - [ ] 消息延迟是否会造成业务不符合预期；
      - [ ] 消息乱序是否会导致业务异常；
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **依赖****数仓****风险**
    </lark-td>
    <lark-td>
      - [ ] 资损强相关需求，是否同步QA及数仓重点保障<mention-doc token="EX7KdVGwuoyx2Ox7EeIcZgK5nHd" type="docx">联盟依赖数仓数据资损风险点梳理</mention-doc>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

## 5.4 兼容性/影响范围评估
<quote-container>
- 兼容性：本次改动的兼容性，是否会影响依赖方/被依赖方的正常运行
- 修改影响范围：列出可能的影响范围，提供回归功能点
</quote-container>


<lark-table rows="6" cols="3" column-widths="100,442,219">

  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
      **评估点**
    </lark-td>
    <lark-td>
      **备注**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="4">
      兼容性 {align="center"}
       {align="center"}
    </lark-td>
    <lark-td>
      - [ ] 接口兼容性：接口定义是否发生改动且向前兼容
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 存储、缓存、消息定义兼容性：存储数据结构是否发生变更且向前兼容
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 强弱依赖是否变更：依赖链路的强弱依赖是否发生变更且是否合理
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 接口改动是否影响了接口的整体性能、耗时
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      影响范围 {align="center"}
    </lark-td>
    <lark-td>
      xxx接口迁移
      yyy逻辑重构
    </lark-td>
    <lark-td>
      回归功能点建议：
    </lark-td>
  </lark-tr>
</lark-table>

## 5.5 外部依赖
<quote-container>
新增外部依赖的check list
- 强弱依赖，是否可降级
- 超时设置，是否考虑超时时间以及是否需要配置超时设置
- ACL鉴权，服务调用的ACL权限是否申请完毕
- 流量预估，QPS，要考虑批量请求放大
</quote-container>


<lark-table rows="4" cols="6" column-widths="145,127,146,146,100,100">

  <lark-tr>
    <lark-td>
      **依赖**
    </lark-td>
    <lark-td>
      **鉴权**
    </lark-td>
    <lark-td>
      **超时设置**
    </lark-td>
    <lark-td>
      **流量预估**
    </lark-td>
    <lark-td>
      **强弱依赖**
    </lark-td>
    <lark-td>
      **备注**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      xxx
    </lark-td>
    <lark-td>
      - [x]
    </lark-td>
    <lark-td>
      - [x]
    </lark-td>
    <lark-td>
      - [ ] QPS < xxx
    </lark-td>
    <lark-td>
      强
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

## 5.6 性能&容量评估
<quote-container>
- 接口性能：需求全量后接口QPS预估；接口整体耗时评估（考虑边界case最差情况下接口耗时评估
  - **API****接口耗时规范参考：**
    - **API****接口耗时P99需要小于1000ms**
    - **QPS****>10接口耗时P99需要小于800ms**
    - **QPS****>100接口耗时P99需要小于550ms**
    - **QPS****>1000接口耗时P99需要小于500ms**
    - **QPS****>100000接口耗时P99需要小于450ms**
- 容量评估：包括服务负载容量、存储空间等未来半年/一年的预估
</quote-container>


<lark-table rows="4" cols="3" column-widths="145,268,100">

  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
      **评估点**
    </lark-td>
    <lark-td>
      **备注**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 容量评估
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="2">
      - [ ] 接口性能
    </lark-td>
    <lark-td>
      QPS预估：未来一年< 1000
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - 耗时预估：
        - AVG：300ms
        - P99：900ms
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

## 5.7 单元化相关
<quote-container>
<mention-doc token="UcA6w0bYAiT6a9kfLb2c2oCbnRf" type="wiki">[ByteSet] PSM 接入指引（中心 & 本地）</mention-doc>
- 对于新服务：判断服务是否需要部署华东，如需按文档接入
- 对于老服务：
  - 未部署华东的无需关注；
  - 部署华东的服务，
    - 有新增接口，判断接口类型，并在单元化平台上发布上线
    - 有新增存储，判断存储是否在华东有依赖，判断是否同步，并在单元化平台上发布对应存储代号，和PSM关联然后上线
</quote-container>


<lark-table rows="4" cols="4" column-widths="128,115,348,227">

  <lark-tr>
    <lark-td colspan="2">
      类型
    </lark-td>
    <lark-td>
      评估点
    </lark-td>
    <lark-td>
      相关工单
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td colspan="2">
      新服务
    </lark-td>
    <lark-td>
      - [ ] 是否部署华东
      - [ ] 新增存储发布代号、选择同步方式并关联
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="2">
      老服务
    </lark-td>
    <lark-td>
      未部署华东
    </lark-td>
    <lark-td>
      -
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      已部署华东
    </lark-td>
    <lark-td>
      - [ ] 新增接口配置单元化类型
      - [ ] 新增存储发布代号、选择同步方式并关联
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

## 5.8 测试数据与环境风险评估

<lark-table rows="14" cols="3" column-widths="119,651,252">

  <lark-tr>
    <lark-td>
      **分类**
    </lark-td>
    <lark-td>
      **风险点**
    </lark-td>
    <lark-td>
      **结论**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="5">
      PPE测试风险
    </lark-td>
    <lark-td>
      - [ ] [功能不一致风险] 是否存在PPE硬编码，若存在，需评估硬编码是否合理
    </lark-td>
    <lark-td>
      <text color="gray">不涉及｜涉及，具体方案.....</text>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] [功能不一致风险] 是否需要常驻环境（默认到期自动回收），若存在，需评估常驻泳道必要性、常驻环境和线上功能不一致风险
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] [数据隔离风险] 是否做PPE数据隔离（特别注意缓存数据、公用配置数据），若不做隔离，需评估此次增量PPE测试数据写入线上的影响；若做隔离，给出隔离方案
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] [消息隔离风险] PPE 消息默认会被线上消费，若涉及MQ消息数据的生产和消费，需评估存量和增量消息被不同环境消费异常风险
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] [流量隔离风险] PPE流量默认会Fallback线上，需评估 PPE 调用线上服务的风险
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="8">
      测试数据风险
    </lark-td>
    <lark-td>
      [测试数据隔离]<mention-doc token="Yz5qdDAeHosXqrxBDtxcXxeqnPb" type="docx">测试数据打标隔离方案</mention-doc>
      - [ ] 是否需要做测试标，若不需要，给出原因；若需要，需支持以下能力：
        - [ ] 是否有测试打标能力（示例：测试店铺、测试商品、测试活动等）
        - [ ] 测试标是否存在误打、漏打风险（示例：通过env或测试字样自动识别测试标，不需人工打标）
        - [ ] 是否可追踪到打标负责人、操作/使用人
        - [ ] 相关运营配置平台是否明确标识了测试数据（示例：测试任务展示“测试”角标）
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] [测试数据隔离]是否存在测试数据与线上数据误关联风险（示例：测试活动在创建时关联了正式达人，导致给正式达人发站内信），若存在，需要给出防控措施
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] [高危数据权限管控]是否存在权限管控，测试权限无法创建/操作正式数据
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] [稳定性风险]是否存在测试数据影响服务稳定性的风险，包括考虑短时间构造大量测试数据、测试数据会导致流量放大、测试数据不兼容导致线上panic
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] [安全&资损风险]测试数据是否可被线上用户（B端、C端）可见（示例：测试券被正式达人可见、领取；测试券用在正式商品上），若不可见，需给出防控手段
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] [脏数据风险]测试数据与正式数据是否会共用缓存，导致测试数据污染缓存的风险
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] [脏数据风险]测试数据与正式数据是否会共用存储，测试数据污染报表/看板类数据的风险
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] [脏数据风险]是否存在非法的测试数据被写入库的风险（示例：不存在的uid写入数据库，在使用时阻断业务功能）
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

## 5.9 删除类变更checklist（不涉及需备注）

<lark-table rows="7" cols="3" column-widths="179,623,252">

  <lark-tr>
    <lark-td>
      **分类**
    </lark-td>
    <lark-td>
      **评估建议**
    </lark-td>
    <lark-td>
      **评估结论**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **是否涉及删除类变更**
    </lark-td>
    <lark-td>
      **各种在现有线上服务上做减法的变更和操作，都属于删除类变更**。常见删除类如下：
      - 数据存储：下线存储资源，删库、删表、删字段，清空存储，清除缓存，数据归档等
      - 接口：下线接口，删除字段
      - 服务：服务下线，服务缩容
      - 机器资源：下架机器，缩容，删除集群
      - 其他：删除TLB路由，TCC key删除，Faas 函数下线等
    </lark-td>
    <lark-td>
      - [ ] 不涉及
      - [ ] 涉及：________
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **变更影响评估**
    </lark-td>
    <lark-td>
      1. 数据影响
      - 删除操作对数据一致性的潜在影响
      - 考虑数据间的依赖关系，确保不会破坏引用完整性
      - 明确删除数据规模
      1. 性能影响
      - 删除操作对系统性能的影响
      - 删除后对系统性能的影响
      1. 业务和上下游影响
      - 对上下游影响，包括服务调用、数据使用影响
      - 对业务指标影响
    </lark-td>
    <lark-td>
      1. 具体数据影响评估：
      1. 具体性能影响评估：
      1. 具体性能影响评估：
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **灰度&回滚方案**
    </lark-td>
    <lark-td>
      **遵循可观测、可灰度、可回滚原则**
      1. 删除类变更需要具备灰度策略控制影响面
      - 流量灰度，id分流、百分比流量、分机房、分集群等方式控制影响
      - 数据灰度，具备分阶段操作和分阶段回滚数据方案
      1. 灰度阶段过程中，需考虑数据兼容、数据恢复能力
      - 新老系统对新老数据的读写兼容，对交叉场景考虑全面
      - 数据恢复能力，例如双读双写、数据软删等方式
      - 老数据删除要谨慎，在新流量、新数据验证完成后，再进行旧数据禁写、分批删除操作
      1. 所有灰度阶段要有对应回滚方案。考虑回滚操作可能影响的其他系统或数据流，避免不可兼容情况
    </lark-td>
    <lark-td>
      灰度&分批方案：
      回滚方案：
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **测试阶段**
    </lark-td>
    <lark-td>
      - 在测试环境模拟完整的删除流程，验证删除后系统功能正常
      - 测试数据一致性，确保删除后数据关系完整
      - 测试灰度&回滚流程，确保能够在必要时恢复数据
    </lark-td>
    <lark-td>
      - [ ] 已完成测试
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **线上操作步骤&验证方案**
    </lark-td>
    <lark-td>
      - 每个操作步骤有相应的验证点，包括数据验证、流量验证、功能验证、系统指标观察
      - 高危操作需要其他责任人进行double check
    </lark-td>
    <lark-td>
      - [ ] 操作负责人：
      - [ ] 共同操作人：
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      **数据类删除时常见陷阱**
    </lark-td>
    <lark-td>
      1. 数据完整性陷阱
      - 级联删除未充分评估：确保理解所有级联关系，评估删除的完整影响范围
      - 部分删除：确保删除操作的原子性，避免数据处于不一致状态
      - 缓存不一致：更新或清除相关缓存，确保缓存与实际数据一致
      1. 性能陷阱
      - 锁定升级：注意行锁可能升级为表锁的情况，特别是在大批量删除时
      - 热点数据：热点数据删除时，防止缓存击穿对下游回源链路造成压力
      - 索引维护开销：考虑临时禁用非必要索引以提高删除性能
      - 日志膨胀：监控事务日志大小，避免日志空间耗尽
      - 资源竞争：避免在高峰期执行大规模删除操作
      1. 操作陷阱
      - 条件错误：仔细检查数据圈选条件，例如where条件、时间分区等，先查看操作数据量级是否符合预期再进行操作，避免删除范围过大或不足
      - 权限问题：提前验证执行账号是否有足够权限
      - 环境混淆：确保在正确的环境中执行操作，避免测试误操作生产环境数据
      1. 恢复陷阱
      - 备份不完整：确保备份包含所有相关数据，例如从表和关联数据、缓存数据
      - 回滚依赖性：考虑回滚操作可能影响的其他系统或数据流
      1. 敏感数据删除
      - 无删除评估记录：评估是否需要保留删除证明或审计记录
      - 敏感数据处理：确认备份和归档中的敏感数据处理方式
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>


# 六、会议记录&排期
<quote-container>
- 会议纪要：关键结论、待确认点TODO
</quote-container>

<quote-container>
- 任务拆解和排期
</quote-container>

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
<quote-container>
<text color="gray">从研发（</text><text color="gray">白盒</text><text color="gray">）角度出发，给出 </text><text color="gray">QA</text><text color="gray"> 较为完整的测试建议，例如：</text>
- <text color="gray">改动仅涉及直播专属价</text>
⚠️ 注意：
1. 如方案涉及数值展示（如订单数、价格、GMV等），务必验证展示的数值是否准确合理
</quote-container>


## 7.2  自测case
<quote-container>
<text color="gray">由 </text><text color="gray">QA</text><text color="gray"> 同学提供需要 RD 自测的case，提测时 QA 进行检查</text>
-  测试环境流水线
</quote-container>

## 7.3 Code Review
<quote-container>
- MR列表
- CodeReview记录
</quote-container>

- **MR****：**

<lark-table rows="3" cols="3" column-widths="154,361,100">

  <lark-tr>
    <lark-td>
      **仓库**
    </lark-td>
    <lark-td>
      **MR**
    </lark-td>
    <lark-td>
      **备注**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

- **流水线：**
- **CR****记录：**
# 八、发布计划
<quote-container>
制定完整的发布计划，包括上线依赖梳理、上线先后顺序及实验放量节奏等，并在项目Meego群周知并置顶
</quote-container>

## 8.1 上线计划
<quote-container>
上线前CheckList
上线计划梳理：包括如：DB 索引工单、ES变更工单、TCC上线、IDL合入、服务升级，OneService上线工单等
</quote-container>


<lark-table rows="9" cols="2" column-widths="311,177">

  <lark-tr>
    <lark-td>
      **上线前检查**
    </lark-td>
    <lark-td>
      **备注**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 新增数据表是否需要建索引
    </lark-td>
    <lark-td>
      explain确保索引生效
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 新增Overpass依赖是否更新到主分支版本
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 新增调用是否申请服务鉴权
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 新增API接口是否配置TLB
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 新增API接口是否需要接入风控反爬
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] OneService API是否上线
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 新增百应接口看门人配置
    </lark-td>
    <lark-td>
      百应写接口，在附身状态下不允许调用
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ] 接口字段是否新增枚举值
    </lark-td>
    <lark-td>
      前端线上代码是否兼容
    </lark-td>
  </lark-tr>
</lark-table>


<lark-table rows="5" cols="3" header-row="true" header-column="true" column-widths="248,193,385">

  <lark-tr>
    <lark-td>
      **上线顺序**
    </lark-td>
    <lark-td>
      监控对象
    </lark-td>
    <lark-td>
      **备注**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ]
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ]
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ]
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ]
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>


## 8.2 相关监控
<quote-container>
补充上线过程中观察指标和影响，<text color="red">**如果不需要的话请说明原因**</text>。
</quote-container>

## 8.3 回滚计划
<quote-container>
可行的回滚计划梳理：上线出现问题后的预期回滚顺序
</quote-container>


<lark-table rows="5" cols="2" header-row="true" header-column="true" column-widths="248,578">

  <lark-tr>
    <lark-td>
      **回滚顺序**
    </lark-td>
    <lark-td>
      **备注**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ]
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ]
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ]
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      - [ ]
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
</lark-table>

## 8.4 实验放量计划
<quote-container>
1. 上线后再放量，且不要上来就直接100%，缓慢放量（比如10%，30%，60%，100%），甚至可以更慢一些。
1. 每次放量间隔至少要达到天级别，不能上午20%，下午就50%。线上达人进线相对有滞后。
1. 切忌周五、节前和封板期间放量。
</quote-container>

# 九、需求收益回收
<quote-container>
项目上线或AB出结果后，跟踪并回收项目收益
- AB实验链接
- AB实验结论文档
</quote-container>

