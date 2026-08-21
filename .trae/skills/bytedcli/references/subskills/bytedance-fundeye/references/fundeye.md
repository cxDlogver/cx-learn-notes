# FundEye 命令说明

## 当前覆盖能力

- `fundeye rule get --rule-id <rule-id>`
- `fundeye rule list`
- `fundeye rule create --product-type fullink|tcheck --rule-owner <owner> --params '<json>'`
- `fundeye rule full-create --params '<json>'`
- `fundeye rule save-draft --product-type tcheck --rule-id <rule-id> --params '<json>'`
- `fundeye rule deploy --product-type tcheck --rule-id <rule-id>`
- `fundeye tag search --name <keyword> [--product tcheck]`
- `fundeye biz get --path '<层级1-层级2>'`
- `fundeye diff get --diff-id <diff-id> --rule-id <rule-id>`
- `fundeye diff list --rule-id <rule-id>`
- `fundeye diff update --reason <parent||child> (--diff-list '<json>' | --alarm-order-id-list '<json>')`
- `fundeye diff retry --try-list '<json>'`
- `fundeye alarm list`
- `fundeye check-record list`
- `fundeye check-record rerun`

## 参数约定

### 规则详情

```bash
bytedcli --json fundeye rule get --rule-id 2604202570843580
```

- 对外参数统一使用 `--rule-id`
- 规则详情默认查询 `fullink`；查询 `tcheck` 时使用 `--product-type tcheck`
- 支持预留参数 `--site`、`--tenant`；当前仅占位，不影响请求逻辑
- `fullink` 保持原有返回结构，JSON 输出不包含 `layoutInfo`、`raw`
- `tcheck` 返回原生字段，例如 `rule_id`、`name`、`period`、`sql`、`receiver`

### 规则列表

```bash
bytedcli --json fundeye rule list \
  --product-type fullink \
  --name "demo-rule" \
  --owner "demo-owner" \
  --status RUNNING \
  --status DRAFT \
  --business-ownership demo-biz \
  --page 1 \
  --page-size 10
```

```bash
bytedcli --json fundeye rule list \
  --product-type tcheck \
  --name "demo-rule" \
  --owner "demo-owner" \
  --status unpublished \
  --status open \
  --period daily \
  --business-ownership demo-biz \
  --page 1 \
  --page-size 10
```

- 默认产品类型是 `fullink`
- CLI 使用重复 `--status`；`fullink` 映射成 `status`，`tcheck` 映射成 `status[]`
- `fullink` 支持：`--name`、`--owner`、`--status`、`--business-ownership`
- `tcheck` 额外支持：`--period`、重复 `--tag-id`

### 创建规则

```bash
bytedcli --json fundeye rule create \
  --product-type fullink \
  --rule-owner "demo-owner" \
  --params '{"owner":"demo-owner","business_ownership":"demo-biz","lark_no":"oc_sample_chat_id","rule_type":"double_check","data_sources":[{"vertex":"up","db_name":"sample_upstream_db","tb_name":"sample_upstream_table","filter_logic":"status == 98","is_trigger":true},{"vertex":"down","db_name":"sample_downstream_db","tb_name":"sample_downstream_table","filter_logic":"pay_status == \"SUCCESS\"","is_trigger":true}],"join":[{"from_vertex":"up","to_vertex":"down","join_info":"[{\"upstream\":\"order_id\",\"downstream\":\"out_order_no\"}]"}],"check_logic":"[up.total_amount] == [down.total_amount]"}'
```

```bash
bytedcli --json fundeye rule create \
  --product-type tcheck \
  --rule-owner "demo-owner" \
  --params '{"data_source_type":"krypton","check_tables":["sample_db.sample_table_a","sample_db.sample_table_b"],"user_check_requirement":"关联键: sample_key_a 和 sample_key_b; 核对规则: 筛选上游有记录但下游无匹配记录的异常数据; 输出字段: sample_field_a、sample_field_b"}' \
  --poll \
  --max-retries 30 \
  --interval 3
```

- `--product-type` 支持 `fullink`、`tcheck`
- 规则创建支持 `cn` 和 `sinf`(火山云/volc)；传入 `--sitename sinf`、`--sitename volc` 或 `--sitename 火山云` 时，请求发往 `fundeye-volc.bytedance.net` 并携带 `site_name: "sinf"`；只有 `sg` 等其他站点会被拒绝
- `--params` 必须是 JSON 对象字符串；CLI 会把它再次序列化成接口要求的字符串字段 `params`
- CLI 会自动把 `--params` 包装进请求体 `{"source":"platform_api","agent_task_list":[{"task_type":...,"rule_owner":...,"params":"..."}]}`，不需要手动传整段外层 JSON
- `fullink` 的 `--params` 至少包含：`owner`、`rule_type`、`data_sources`、`join`、`check_logic`
- `fullink` 的 `data_sources` 至少 2 个数据源；每项至少包含 `vertex`、`db_name`、`tb_name`
- `fullink` 的 `join[].join_info` 需要传字符串，字符串内容通常仍是 JSON 数组
- `tcheck` 的 `--params` 至少包含：`data_source_type`、`check_tables`、`user_check_requirement`
- `tcheck` 的 `data_source_type` 合法值为 `"krypton"` 或 `"hive"`；用户未指定时根据 `check_tables` 推断：
  - 库名前缀命中 `noveldb`/`novel_op`/`novel_original`/`novel_bookdb`/`novelsale_distributordb`/`parallel_commerce`/`lvideo_compass`/`pgcincome`/`ocean_story`/`ocean_story_split`/`dpa_data` → `"krypton"`
  - 表名含 `ods_`/`dwd_`/`dim_`/`dm_`/`ads_`/`dwm_`/`dwa_` 分层前缀 → `"hive"`
  - 库名前缀命中 `webcast`/`open`/`aweme`/`pgc`/`ies_wallet`/`ad_star`/`dm_ttgame`/`dm_effect_platform`/`toutiao_dw`/`caijing_dw` → `"hive"`
  - 均不命中时主动询问用户
- `tcheck` 的 `check_tables` 必须是非空列表
- `--poll` 会继续调用 `query_tasks`，直到拿到 `rule_link`、失败或超时
- 轮询参数使用 `--max-retries`、`--interval`

### TCheck 全量创建

```bash
bytedcli --json fundeye rule full-create \
  --params '{"name":"demo-tcheck-rule","illustration":"demo desc","period":"daily","daily_run_time":"00:00:00","owner_list":["demo-owner"],"member_list":["demo-member"],"permission_group":["group.demo"],"business_ownership":"demo-biz","receiver":"demo-owner","lark_group_id":"oc_demo_group","priority":"P1","diff_limit":100,"sql":"select 1","check_tables":["sample_db.ods_demo_table"],"depend":{"upstream_depend":[{"dorado_id":123,"name":"demo task","frequency":"daily","offset_type":"set","offset":[0]}]}}'
```

- 仅支持 `tcheck`
- `--params` 必须是前端编辑页 update body 风格的 JSON 对象字符串
- CLI 会先调 `/api/t_check/rule` 创建空壳规则，再调 `/api/t_check/rule/:rule_id` 完成完整配置
- `data_source_type` 可省略；CLI 会按 `check_tables` 推断 `hive`/`krypton`，显式传入时会先统一转成小写
- `owner_list` 可省略；缺省时回退到当前登录用户
- `period` 必填；当 `period=daily` 时需提供 `daily_run_time`，当 `period=hourly` 时需提供 `hourly_run_minute`
- `task_run_time`、默认 `task_pending_alarm` 等依赖字段无需手填，CLI 会按前端逻辑推导；其中 `krypton/clickhouse` 的 `task_pending_alarm` 固定为 `1`
- 当前仅支持 `cn`；显式传入非 `cn` 的 `--sitename` 会直接报不支持

### 保存规则草稿（save-draft）

```bash
bytedcli --json fundeye rule save-draft \
  --product-type tcheck \
  --rule-id 20260601_1234567890000 \
  --params '{"tag_ids":["tag-a","tag-b"]}'
```

- 当前仅支持 `tcheck`
- 该命令只保存草稿，不会发布规则
- `--params` 必须是 JSON 对象字符串
- CLI 会先调用 `fundeye rule get` 读取当前规则，再把 `--params` 里的字段覆盖到最新规则体上，然后调用保存草稿接口
- 因此日常只需要传这次要更新的字段，例如：
  - 只改标签：`{"tag_ids":["tag-a","tag-b"]}`
  - 只改接收人：`{"receiver":"demo-owner"}`
  - 同时改多个字段：`{"tag_ids":["tag-a"],"priority":"P1"}`
- 支持 `--sitename volc/火山云` 路由到火山环境

### 发布规则（deploy）

```bash
bytedcli --json fundeye rule deploy \
  --product-type tcheck \
  --rule-id 20260601_1234567890000
```

- 当前仅支持 `tcheck`
- 走平台鉴权 headers（`x-jwt-token` + `UserName`）
- 支持通过 `--sitename sg` 切到新加坡机房；默认仍为 `cn`
- 火山云（`--sitename volc/火山云`）暂不支持

### 标签查询

```bash
bytedcli --json fundeye tag search --name '风险' --product tcheck --page 1 --page-size 10
bytedcli --json fundeye tag search --exact-name '会员' --product tcheck
```

- 用于按标签名模糊/精确查询标签 ID
- 支持 `--product`、`--tag-type`、`--page`、`--page-size`
- JSON 输出包含 `tags`、`current_page`、`page_size`、`total`

### 业务归属查询

```bash
bytedcli --json fundeye biz get --path '财经-数据平台'
bytedcli --json fundeye biz get --path '财经-数据平台-会员'
```

- 用于把业务归属名称路径解析成 `business_ownership` ID
- `--path` 使用 `-` 拼接层级名称
- 兼容旧参数 `--name`
- 支持预留参数 `--site`、`--tenant`；当前仅占位，不影响请求逻辑
- JSON 输出包含 `businessOwnership.path` 与 `businessOwnership.value`
- 返回的 `value` 可直接透传给 `fundeye rule list --business-ownership`
- 业务归属树中可能存在同名节点；若只传单层标题，可能返回歧义错误，优先传完整路径

### diff 明细

```bash
bytedcli --json fundeye diff get \
  --diff-id "DOUBLE_DS_CHECK#^#0#^#demo-diff" \
  --rule-id 2601142357560097
```

- `fundeye diff` 是分组命令，详情查询必须走 `diff get`
- `diff get` 会同时返回 diff 基础详情，以及该 diff 最近一次处理记录（若存在）
- 最近一次处理记录来自 diff process list，适用于人工标记原因和智能归因最终落库后的读取
- JSON 输出包含：
  - `latestProcess.reason`
  - `latestProcess.remark`
  - `latestProcess.operator`
  - `latestProcess.createTime`
  - `latestProcess.status`
  - `latestProcess.isHelpful`
  - `processList[]`
- `latestProcess` 会按 `createTime` 取最近一条处理记录，不依赖上游返回顺序
- 若 diff process list 查询失败，`diff get` 仍返回基础 diff 详情，并回退为：
  - `latestProcess: null`
  - `processList: []`
- `latestProcess.isHelpful` / `processList[].isHelpful` 取值说明：
  - `0`：无帮助 / 系统默认过程记录
  - `1`：有帮助
  - `2`：未评价或未显式填写

### diff 列表

```bash
bytedcli --json fundeye diff list \
  --rule-id 2601142357560097 \
  --product-type fullink \
  --rule-version 11 \
  --start "2026-04-21 00:00:00" \
  --end "2026-04-21 23:59:59" \
  --alarm-order-id "2601142357560097##20260421065000##1_2##11" \
  --page 1 \
  --page-size 20
```

- `--rule-id` 必填
- `fullink` 推荐显式传 `--rule-version`；未传时 CLI 会自动从规则详情解析最新版本
- 默认产品类型是 `fullink`；查 `tcheck` 差异列表时使用 `--product-type tcheck`
- 排查 `fullink` 告警、尤其按 `--alarm-order-id` 缩小时，推荐显式传 `--start`、`--end`
- `tcheck` 的 `--rule-version` 可省略；未传时默认按 `0` 请求上游
- `--alarm-order-id` 可选
- JSON 输出当前保留：
  - `diffs`
  - `current`
  - `page_size`
  - `total`
  - `actual_diff_cnt`
  - `diff_money`
  - `alarm_condition`
- JSON 输出不再包含：
  - 每个 diff item 的 `raw`
- `--json` 模式下 `diffs[]` 的字段名为 snake_case（例如 `diff_id`、`rule_id`），不再输出 camelCase 版本（例如 `diffId`、`ruleId`）

### diff 处理（update）

```bash
bytedcli --json fundeye diff update \
  --reason "BIZ_ISSUES||NEW_BIZ_DEPLOY" \
  --remark "demo remark" \
  --diff-list '[{"diff_id":"DOUBLE_DS_CHECK#^#0#^#demo","diff_version":1}]'
```

- `--diff-list` 与 `--alarm-order-id-list` 二选一
- `--diff-list` 使用 JSON 数组字符串；每项结构为：
  - `diff_id`: string
  - `diff_version`: number
- `diff_version` 可通过 `fundeye diff list --json` 获取：返回的 `diffs[].diff_version` 字段即为 `diff_version` 入参
- `--reason` 必填，格式为 `PARENT||CHILD`（或仅 `PARENT`）：
  - `BIZ_ISSUES||<child>`，child 允许值：
    - `WRONG_SCRIPT` / `NEW_BIZ_DEPLOY` / `BIZ_ISSUES_DATA_DELAY` / `BIZ_ISSUES_ALTER` / `BIZ_ISSUES_DATA_LOSS`
    - `BIZ_ISSUES_REAL_DIFF` / `IDEMPOTENT_FAILED` / `AMOUNT_UNIT_ERROR` / `INTERFACE_SEMANTICS_MISUNDERSTAND`
    - `BIZ_ISSUES_BUG` / `BIZ_ISSUES_TEST`
  - `PLATFORM_ISSUES||<child>`，child 允许值：
    - `PLATFORM_ISSUES_DELAY` / `PLATFORM_ISSUES_LIMIT` / `PLATFORM_ISSUES_CIRCUIT_BREAKER`
    - `PLATFORM_ISSUES_STABILITY` / `PLATFORM_ISSUES_BUG`
  - `OTHER_ISSUES||<child>`，child 允许值：
    - `STRESS_TEST` / `DISASTER_RECOVERY_DRILL` / `MIDDLEWARE_FAILED` / `THIRD_PARTY_ISSUES`
    - `FUND_DRILL` / `EXCEEDED_SNAPSHOT_STORAGE_TIME`
  - `CUSTOM_ISSUES`：当前无预置 child（如需可与后端约定扩展）
- `--alarm-order-id-list` 使用 JSON 数组字符串，元素为告警单 ID，例如 `TCheck##demo-alarm-order-id`
- status 固定为 `PROCESS_RESULT`。

### diff 重试（retry）

`--try-list` 是 diff_id 的 JSON 数组字符串，可从 `fundeye diff list --json` 返回的 `diffs[].diff_id` 获取。

```bash
bytedcli --json fundeye diff retry \
  --try-list '["DOUBLE_DS_CHECK#^#0#^#demo"]'
```

### 告警列表

```bash
bytedcli --json fundeye alarm list --page 1 --page-size 20
```

- 支持分页
- 支持按产品和优先级过滤

## 使用建议

- 需要机器可读结果时，优先加 `--json`
- 当用户只有业务归属名称路径时，推荐流程是：
  - `fundeye biz get --path '<层级1-层级2>'`
  - `fundeye rule list --business-ownership <value>`
- 需要按标签名查标签 ID 时，单独使用 `fundeye tag search --name <keyword> [--product tcheck]`
- 先看告警，再查 diff 时，推荐流程是：
  - `fundeye alarm list`
  - `fundeye diff list`
  - `fundeye diff get`
- 按规则查 TCheck 核对记录或重跑历史时段时，推荐流程是：
  - `fundeye check-record list --rule-id <rule-id>`
  - `fundeye check-record rerun --rule-id <rule-id> --business-time <yyyy-MM-dd HH:mm:ss>`
