---
name: bytedance-ent
description: "Operate Ent Platform / UDS Storage IAC via bytedcli. Use when tasks mention Ent Platform, UDS, Entity, Storage IAC, StorageUri, entity schema workflow, ORM generation, ent.tiktok-row.net, or creating/importing MySQL/RDS tables through Entity workflows."
---

# bytedcli Ent Platform / UDS

## When to use

- 用户提到 Ent Platform、UDS、Entity、Entity Schema、Storage IAC、StorageUri、ORM 生成、`ent.tiktok-row.net`。
- 需要把新的 MySQL/RDS 表通过 Entity 平台录入元信息并提交 workflow，审批通过后由平台执行建表。
- 需要把已有 RDS 表导入/迁移为 Storage IAC entry，并检查字段描述/annotation 覆盖率。
- 需要解释 UDS MySQL、Entity、StorageUri、mapping、schema workflow、ORM 生成之间的关系。

如果任务只是直接查询或操作 RDS 数据、提交传统 RDS BPM DDL/DML 工单，请使用 `bytedance-rds`。如果任务只是查询 BMT 资源绑定，请使用 `bytedance-bmt`。

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 国际站 Ent Platform 通常使用：`bytedcli --site i18n-tt ...`
- 首次调用前先登录目标站点：`bytedcli --site i18n-tt auth login`
- 当前命令只自动化 Entity Platform 的提交动作，不负责申请 MySQL 集群或审批 workflow。

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Platform Concepts

- **UDS / Unified Data Storage**：面向业务 Entity 的数据访问层。对 MySQL 场景，UDS 负责 Entity Schema 管理、ORM 模型和接口代码生成；底层 MySQL 集群资源、容量、运维和跨机房能力仍需要由对应平台或 owner 管理。
- **Entity**：业务语义对象及其字段、主键、索引、owner、描述等元信息。Entity 名称应表达业务对象，不要只按数据库或表名命名。Storage IAC 表工作流会把 DDL 映射成 Entity fields、indices 和 MySQL mapping。
- **StorageUri**：Entity 绑定的底层存储映射，例如 `sample/mysql/demo`。生产 StorageUri 不要猜，优先由用户提供或从平台/UDS oncall 确认。
- **Mapping**：Entity 字段与底层 MySQL 表字段、主键、索引、表选项之间的映射关系。
- **Schema Change Workflow**：提交 Entity 变更后的平台流水线。典型阶段包含检查/审批、schema 合入、DDL 执行以及后续集成。
- **ORM Generation**：Entity Schema 合入后的集成动作之一，生成 Entity Model 与 CRUD API。workflow 提交成功不等于业务服务已经接入 ORM。

## Full Workflow

新建 MySQL 表的完整链路不是一个单点 API，而是一串平台动作：

1. **确认目标环境**
   - 明确站点：通常国际站用 `--site i18n-tt`。
   - 明确 `StorageUri`、目标 `vregion`、RDS DC/VDC、owner。
   - 确认底层 DB/StorageUri 已存在或已由平台/oncall 准备好。

2. **准备 DDL 与元信息**
   - DDL 必须是 `CREATE TABLE`。
   - 字段要带清晰 `COMMENT`，因为 CLI 会用 comment 生成 Entity field description。
   - 主键、普通索引、唯一索引要在 DDL 中声明；索引名遵循业务规范。
   - 准备 Entity 描述、owner、明确合规声明；含 TikTok user data 时用 `--contains-tt-user-data`，不含时必须由用户提供 `--compliance-reason`。不确定是否包含 TikTok user data 时不要替用户判断。

3. **提交新表 workflow**
   - CLI 会先按 `storage_uri + table` 做 entity precheck，避免重复创建。
   - CLI 解析 DDL，生成 Entity fields、indices、MySQL columns、table indices、table options。
   - CLI 调用 Ent Platform `schema_change` 创建 workflow。

```bash
bytedcli --site i18n-tt --json ent storage-iac submit-table \
  --storage-uri sample/mysql/demo \
  --table sample_table \
  --ddl-file ./sample_table.sql \
  --owner user.name \
  --vregion Singapore-Central \
  --rds-dc sg1 \
  --description "Sample table for demo workflow" \
  --compliance-reason "Demo table without TikTok user data"
```

4. **平台审批与检查**
   - 返回 `workflow_id` / `workflow_url` 后，后续由 Ent Platform workflow 推进。
   - Entity owner 或相关审批人需要在平台上审核。
   - Remote/check stage 会做 schema、权限、合规、DDL 等检查。

5. **Apply / DDL 执行**
   - 审批通过后，平台合入 Entity Schema。
   - 对 Storage IAC 新表流程，平台根据提交的 DDL 执行建表或变更动作；不要绕过平台直连 RDS 手动建表。

6. **Integration**
   - ORM 代码生成需要在平台 setting / workflow 中开启并等待完成。
   - 若涉及 DECC 或互通打标，需要按平台集成阶段处理；当前 CLI 不自动完成这类人工选择或跳过动作。

7. **业务接入与验证**
   - ORM 生成完成后，业务服务再引入 `ent_orm` 并初始化对应 Entity runtime。
   - 通过平台、RDS 读命令或服务侧 smoke 验证表、schema、读写路径。

## Existing Table Import

已有 RDS 表不走 `submit-table`，而走 entry migration：

```bash
bytedcli --site i18n-tt --json ent storage-iac create \
  --storage-uri sample/mysql/demo \
  --table existing_table
```

这条命令会：

- 按表预检查 entity 是否存在。
- 调用 `entry/batch_migrate` 导入/迁移 Storage IAC entry。
- 提交后反查 entity detail，汇总字段 description/annotation 覆盖率。

它不会执行 RDS 物理建表 DDL，也不是新表 workflow。

## Command Boundaries

- `submit-table` 会创建 Entity workflow，但不会审批 workflow、关闭 workflow、轮询到最终成功、创建 MySQL 集群、申请 StorageUri、接入 ORM 或修改业务代码。
- `create` 是已有表导入/迁移，不是创建新 RDS 表。
- CLI 不会替用户判断 TikTok user data 合规状态；`submit-table` 必须显式传 `--contains-tt-user-data` 或 `--compliance-reason`。
- 不要为了测试绕过 Ent Platform 直连 RDS 建表；真实 smoke 应使用 `bytedcli ent storage-iac submit-table` 创建测试 workflow。
- 不要把通用 UDS MySQL 文档中的历史手工 RDS ticket 流程直接套到 Storage IAC `schema_change` 自动建表链路上；当前 CLI 以平台 workflow 为准。

## Quick Checks

```bash
# 查看命令帮助
bytedcli --site i18n-tt ent storage-iac --help
bytedcli --site i18n-tt ent storage-iac submit-table --help

# 确认当前登录态
bytedcli --site i18n-tt --json auth status

# 新表 workflow 提交后，输出中应包含 workflow_id / workflow_url / logid
bytedcli --site i18n-tt --json ent storage-iac submit-table \
  --storage-uri sample/mysql/demo \
  --table sample_table \
  --ddl-file ./sample_table.sql \
  --owner user.name \
  --vregion Singapore-Central \
  --compliance-reason "Demo table without TikTok user data"
```

## References

- `../../invocation.md`
- `../../troubleshooting.md`
- UDS MySQL User Guide: https://bytedance.larkoffice.com/wiki/wikcnLupCgyA4k9cdhBaA44uZZd
