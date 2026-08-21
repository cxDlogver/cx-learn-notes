---
name: bytedance-decc
description: "Operate DECC (Data Exchange & Cross-region Compute) via bytedcli: create HDFS channels, register HDFS data (tables), create cross-region data transfer configs, plan/update DES-RPC IDL annotations, apply for channel/data permissions, and inspect ticket list/detail/comments. Use when tasks mention DECC, OG tagging, cross-region data exchange, HDFS channel, DES-RPC annotation, DECC data registration, data transfer config, DECC permission application, or DECC tickets."
---

# bytedcli DECC (Data Exchange & Cross-region Compute)

## 如何调用 bytedcli

推荐：先全局安装一次，后续所有命令直接调用 `bytedcli`。

```bash
# 推荐方式：先全局安装，后续直接调用 bytedcli
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

```bash
# Fallback：仅在无法全局安装时使用 npx 临时执行
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]
```

## When to use

- 创建 DECC HDFS channel（数据交换渠道）
- 在 channel 下注册 DECC HDFS data（表）
- 创建跨区域 HDFS data transfer 配置（`data-transfer-config create`）
- 创建前先 `--dry-run` 校验 schema 解析与 HSQL 列同步是否可用
- 申请 channel 或 data 的 Owner 权限
- 查询 DECC/OG ticket 历史工单列表和详情
- 查询 DECC ticket 评论详情
- DES-RPC Method 的 IDL 标注更新预检：从 BAM 最新版本生成 DECC Data Version load/parse 请求
- DES-RPC Data Version 的 load-idl、parse-idl、update、submit 操作
- 跨区域数据交换（Cross-region Data Exchange）场景
- 查询待打标 API 服务与已有打标记录
- 创建 API OG 打标草稿
- 对 API 进行 OG 打标（更新打标草稿）

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- DECC 命令使用 `--site i18n-tt`（TikTok 国际站），需单独登录：

```bash
# 检查认证状态
bytedcli --site i18n-tt auth status

# 登录（如未认证）
bytedcli --site i18n-tt auth login
```

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

```bash
# 查询 Gateway service 列表
bytedcli --site i18n-tt decc gateway service list

# 按 service name、region、owner 或 source type 过滤
bytedcli --site i18n-tt decc gateway service list \
  --name demo.api_service \
  --region EU,US \
  --owners demo.user,sample.user \
  --source-type Web

# 查询指定 Gateway service entity 下的 endpoint，可按 HTTP path 过滤
bytedcli --site i18n-tt decc gateway endpoint list \
  --entity-id demo-service-entity-id \
  --stage draft \
  --path /demo/api \
  --page 1 \
  --page-size 15

# 查询指定 Gateway endpoint
bytedcli --site i18n-tt decc gateway endpoint get \
  --id demo-endpoint-id \
  --stage draft

# 创建 Gateway endpoint draft
bytedcli --site i18n-tt decc gateway endpoint create \
  --entity-id demo-service-entity-id \
  --path /demo/api \
  --method GET \
  --description "demo endpoint"

# 更新 Gateway endpoint draft 的描述和 schema
bytedcli --site i18n-tt decc gateway endpoint update \
  --draft-id demo-endpoint-id \
  --description "updated demo endpoint" \
  --req-headers-file req_headers.json \
  --req-body-file req_body.json

# 创建 HDFS channel
bytedcli --site i18n-tt decc hdfs-channel create \
  --name demo-database \
  --description "demo channel" \
  --owners demo.user \
  --vgeo-list CN \
  --scenario 4

# 在 channel 下注册 HDFS data（表）
bytedcli --site i18n-tt decc hdfs-data create \
  --channel-id demo-channel-id \
  --name demo_table_name \
  --owners demo.user \
  --region EU-TTP2 \
  --scenario 3

# DES-RPC 标注更新预检：确认 BAM 最新 IDL，并输出 DECC Data Version 的 load/parse 请求
bytedcli --site i18n-tt decc des-rpc annotation-plan get \
  --psm example.demo.service \
  --bam-version latest \
  --data-id demo-data-id \
  --version 12

# DES-RPC Data Version：create 会自动基于 latest applied version 选择 upstream_version；后续再 load-idl、parse-idl、update、submit
bytedcli --site i18n-tt decc des-rpc data-version create \
  --data-id demo-data-id \
  --applied-region US

bytedcli --site i18n-tt decc des-rpc data-version load-idl \
  --data-id demo-data-id

bytedcli --site i18n-tt decc des-rpc data-version parse-idl \
  --data-id demo-data-id \
  --upstream-version 12 \
  --idl-file ./decc-idl.json

bytedcli --site i18n-tt decc des-rpc data-version update \
  --data-id demo-data-id \
  --version 12 \
  --body-file ./decc-des-rpc-annotation.json

bytedcli --site i18n-tt decc des-rpc data-version update \
  --data-id demo-data-id \
  --version 12 \
  --field-path _request.DemoOptions.SkipDemoField \
  --tag demo-tag \
  --entity demo-entity \
  --sync YES \
  --non-us-user-data-proof-field NO \
  --description "Skip demo field" \
  --reason "Refresh demo annotation"

bytedcli --site i18n-tt decc des-rpc data-version submit \
  --data-id demo-data-id \
  --version 12 \
  --reason "update IDL annotation to latest BAM version"

# DES-RPC direct API：调用 DECC 前端接口做 IDL load/parse 或 v3 迁移排查
bytedcli --site i18n-tt decc des-rpc direct call \
  --path /api/v2/schema/idl/load \
  --query '{"gateway":"RPC","endpoint_id":"demo-endpoint-id","data_name":"DemoMethod","is_serialized_data":false}'

bytedcli --site i18n-tt decc des-rpc direct call \
  --method POST \
  --path /api/v2/schema/idl/parse \
  --body-file ./decc-parse-body.json

# 创建前先 dry-run 校验 schema
bytedcli --site i18n-tt decc data-transfer-config create \
  --dry-run \
  --data-id 100001234 \
  --source-region EU-Compliance2 \
  --source-data-name demo_source_table \
  --target-region Singapore-Central

# 创建跨区域 HDFS data transfer 配置
bytedcli --site i18n-tt decc data-transfer-config create \
  --name demo-transfer \
  --owners demo.user \
  --data-id 100001234 \
  --source-region EU-Compliance2 \
  --source-data-name demo_source_table \
  --target-region Singapore-Central \
  --target-channel-name demo_channel \
  --target-data-name demo_target_table \
  --dorado-project-id 12345001 \
  --dorado-project-name demo-project \
  --dorado-folder-id 12345678 \
  --dorado-folder-name demo-folder

# 申请 channel Owner 权限
bytedcli --site i18n-tt decc apply \
  --object-type 1 \
  --object-key demo-channel-id \
  --users demo.user \
  --reason "申请 channel 权限"

# 申请 data Owner 权限
bytedcli --site i18n-tt decc apply \
  --object-type 2 \
  --object-key demo-data-id \
  --users demo.user \
  --reason "申请 data 权限"

# 查询 DECC/OG ticket 历史工单
bytedcli --site i18n-tt decc ticket list \
  --surface unified-v2 \
  --entity-id demo-entity-id \
  --page 1 \
  --page-size 20

# 查询指定 ticket 详情
bytedcli --site i18n-tt decc ticket get \
  --surface unified-v2 \
  --ticket-id demo-ticket-id \
  --version 3

# 查询 ticket 评论详情
bytedcli --site i18n-tt decc ticket comment \
  --ticket-id demo-ticket-id

# JSON 输出
bytedcli --site i18n-tt --json decc ticket list \
  --surface unified-v2 \
  --status pending \
  --region EU
```

## 枚举值参考

### DECC Region

- **Registration (`hdfs-data create`, `hdfs-channel create`):** `China-North`, `Singapore-Central`, `EU-TTP2`, `US-EastRed`, `EU-Compliance2`, `US-TTP`, `Asia-SouthEastBD`, `Asia_Saas`, `Singapore_Saas`, `Asia_CIS`
- **Data transfer / Dorado HSQL (`data-transfer-config create`):** `China-North`, `EU-Compliance2`, `EU-TTP2`, `Singapore-Central`, `US-East`, `US-EastRed`, `US-TTP` only. **Both** `--source-region` and `--target-region` must be in this list; unmapped values (e.g. `Asia_Saas`) fail with `DECC_INPUT_ERROR` before create or `--dry-run`.
- **`--partition-value` default:** literal `${date}` (Dorado schedule placeholder — not shell-expanded).

### vGeo Region

`ROW-TT`, `NonTT`, `US`, `EU`, `CN`

### Scenario

| 值  | 名称                    | 说明                       |
| --- | ----------------------- | -------------------------- |
| 0   | UNKNOWN_SCENARIO        | 未知场景                   |
| 1   | ALL_SCENARIO            | 全部场景                   |
| 2   | TEXAS                   | Texas 数据主权场景         |
| 3   | CLOVER                  | Clover 数据主权场景        |
| 4   | CN_CROSS_BORDER         | CN 跨境传输场景            |
| 5   | TT_NONTT                | TT&NonTT 数据隔离场景      |
| 6   | EU_US_DIRECT_CONNECTION | EU-US 专线场景             |
| 7   | ROW_HDFS_BOE            | row-hdfs/boe 网关场景      |
| 8   | ROW_HDFS_PRODUCTION     | row-hdfs/prod 网关场景     |
| 9   | RPC_TEXAS_CLOVER_MIXED  | RPC-Texas/Clover 混合场景  |
| 10  | HDFS_TEXAS_CLOVER_MIXED | HDFS-Texas/Clover 混合场景 |

### Object Type（apply 命令）

| 值  | 类型    | 自动分配角色  |
| --- | ------- | ------------- |
| 1   | channel | Channel Owner |
| 2   | data    | Data Owner    |

### Gateway Service Source Type

`Web`, `Log`, `Metric`, `CommonHeader`

## Notes

- `gateway endpoint list` 的 stage 仅支持 `approved` 和 `draft`
- `gateway endpoint list` 可通过 `--path <path>` 按 HTTP path 过滤
- `gateway endpoint get` 的 stage 仅支持 `approved` 和 `draft`
- `gateway endpoint create` 必填 `--entity-id`、`--path`、`--method`、`--description`；`--owners` 可选，省略时使用 operator
- `gateway endpoint update` 自动使用当前登录用户作为 operator；命令不需要也不支持手动传 operator
- `gateway endpoint update` 会先查询 draft detail，并沿用 detail 中的 `attributes.assurance_paths`
- `gateway endpoint update` 的 schema 字段只支持从文件读取：`--query-file`、`--path-file`、`--req-headers-file`、`--req-body-file`、`--resp-headers-file`、`--resp-body-file`
- `ticket list` 默认 `--surface unified-v2`，可选 `unified-v1` / `portal`；过滤项都是可选的，常用过滤包括 `--id`、`--entity-id`、`--schema-id`、`--type`、`--status`、`--applicant`、`--region`
- `ticket get` 通过 `--ticket-id` 查询详情，已知版本时带 `--version`
- `ticket comment` 通过 `--ticket-id` 查询评论详情
- `hdfs-data create` 和 `hdfs-channel create` 的 gateway 固定为 HDFS（6）
- `apply` 命令的 role 根据 `--object-type` 自动推断：1 → Channel Owner，2 → Data Owner
- `hdfs-data create` 默认 scenario 为 3（CLOVER）
- `hdfs-channel create` 默认 scenario 为 4（CN_CROSS_BORDER）
- 需要结构化输出加 `--json`（全局选项，放在子命令之前）

## References

- `references/decc.md`
- `../../invocation.md`
