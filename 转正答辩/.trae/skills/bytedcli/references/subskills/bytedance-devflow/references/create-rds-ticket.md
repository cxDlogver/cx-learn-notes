# DevFlow RDS 工单创建引用文档

本引用文档用于通过本仓库 CLI 发起 DevFlow RDS 工单创建，仅覆盖发单，不覆盖审批、执行或催办。

## 何时使用

当用户明确表达以下意图时使用本引用文档：

- 创建 RDS DDL / DML / CLEAR 工单
- 在 DevFlow 里为某个 RDS 资源发 SQL 变更单
- 希望通过 CLI / skill 多轮补参并最终拿到工单链接

## 意图映射

根据用户需求先判断工单类型，再决定 `rds_op_type`：

- DDL：`CREATE TABLE`、`ALTER TABLE`、新增/修改/删除字段、加索引、改表结构等结构变更
- DML：`INSERT`、`UPDATE`、`DELETE` 等数据写入/更新/删除
- CLEAR：重命名表（rename）、清除表数据（truncate）、删除表（drop）

强约束：

- 当用户需求是“重命名表”“rename table”“truncate table”“清空表/清除表数据”“drop table”“删除表”时，必须走 CLEAR 工单
- 不要因为用户给了 SQL，就把 `rename` / `truncate` / `drop` 误判成 DML
- CLEAR 场景必须设置 `--rds_op_type="clear"`，并继续补 `clear_table_type`
- 其中：
  - rename -> `clear_table_type="rename"`
  - truncate -> `clear_table_type="truncate"`
  - drop -> `clear_table_type="drop"`

## 目标参数

优先从用户对话中收集以下参数；未明确提供的参数不要强行追问，交给后端返回 pending 提示继续补齐：

- `name`
- `work_item_id`（可选）
- `rds_op_type`，仅支持 `ddl` / `dml` / `clear`
- `risk_confirm`

按工单类型补充：

- DDL：
  - `sql` / `sql_file`
  - `change_background`
  - `order_auto_exec`
  - `sync_alert_to_shadow_table`
  - `create_shard_table`
  - `shard_key`
  - `shard_key_type`
  - `ban_rename_time_range`
  - `allow_kill_long_transaction`
  - `master_slave_delay_detect_type`
  - `shard_db_max_concurrent_exec`
- DML：
  - `sql`
  - `change_background`
  - `order_auto_exec`
- CLEAR：
  - `clear_table_type`
  - `modify_table_names`
  - `clear_or_drop_table_names`
  - `sync_to_ce`
  - `change_background`
  - `order_auto_exec`

## 执行原则

- 不要先设计独立 info 查询流程；缺参、风险确认和限制提示全部依赖同一个 create 接口返回 `pending`
- 如果用户意图属于 rename / truncate / drop，优先按 CLEAR 处理，不要走 DML
- DDL 场景下，只有在用户明确确认风险后，才传 `--risk_confirm=true`
- 如果后端返回 `include_gh_ost_alter` 相关 pending，必须要求用户补充 `ban_rename_time_range`
- 如果后端返回分片库建表相关 pending，必须要求用户补充 `create_shard_table=true`、`shard_key`、`shard_key_type`
- `modify_table_names` 必须传 JSON 对象字符串，例如 `{"old_table":"new_table"}`
- `clear_or_drop_table_names` 允许多值，按多次传参或逗号拆分均可
- 当 SQL 里包含反引号、引号、换行等容易触发 shell 转义问题的内容时，优先使用 `--sql_file`，不要直接把 SQL 原文内联到命令参数里
- 如果在完成本技能任务过程中需要使用其他技能，必须优先使用名称带有 `bytedance-devflow-` 前缀的技能

## 调用方式

- DDL：

```bash
bytedcli devflow rds create --name="<name>" --rds_op_type="ddl" --sql="<sql>" --change_background="<change_background>" --bytedcli-skill-dir="<skill所在目录>"
```

- DDL（推荐，复杂 SQL 走文件）：

```bash
bytedcli devflow rds create --name="<name>" --rds_op_type="ddl" --sql_file="<sql_file_path>" --change_background="<change_background>" --bytedcli-skill-dir="<skill所在目录>"
```

- DML：

```bash
bytedcli devflow rds create --name="<name>" --rds_op_type="dml" --sql="<sql>" --change_background="<change_background>" --bytedcli-skill-dir="<skill所在目录>"
```

- CLEAR：

```bash
bytedcli devflow rds create --name="<name>" --rds_op_type="clear" --clear_table_type="<rename|truncate|drop>" --change_background="<change_background>" --bytedcli-skill-dir="<skill所在目录>"
```

## 输出处理

- 优先原样展示 CLI 输出
- `pending` 时必须先把后端返回的提示原样展示给用户，再继续补参或发起确认，不能只概括成“请确认风险”或“请确认操作”
- 如果 `pending` 文案里包含 DDL 风险提示、工单计划详情、候选表名、候选高级选项等内容，必须完整转述这些内容；至少要让用户看到：
  - 当前风险点
  - 当前工单计划详情
  - 需要用户确认或补充的具体字段
- 当 `pending` 场景需要用户确认 `risk_confirm=true` 时，先展示完整风险与计划详情，再明确询问用户是否确认；严禁跳过展示、直接代用户确认
- 成功时只展示工单链接，不额外补充审批或执行指引
- 失败时优先保留原始错误信息，只补充最少量必要说明
