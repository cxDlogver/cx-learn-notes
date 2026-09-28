# ByteTree

## Commands

### 搜索节点

```bash
bytedcli bytetree search --query "demo-service-tree"
bytedcli --json bytetree search --keyword "sample-node" --page-size 50
```

- 返回匹配节点的 `id`、`type`、`name`、`path`、`owners`
- 适合先定位服务树节点，再继续下钻

### 查看节点详情

```bash
bytedcli bytetree get --node-id 1234567
bytedcli --json bytetree get --node-id 1234567
```

- 返回单个节点的基础信息、负责人、tags、描述和 overview URL
- 返回单个节点的基础信息、负责人、tags、描述、overview URL，以及 `resources`
- 适合拿到 node id 后快速确认节点归属和元数据

#### resources 结构提示

- `provider`：资源提供方，例如 `tce`、`tcc`、`rds`
- `resource_type`：资源类型，例如 `container`、`config`、`tcc`
- `resource_id`：资源唯一标识，后续经常可以直接拿去查 TCE/TCC
- `partition` / `env` / `region`：帮助判断资源落在哪个分区和环境
- `link.view`：控制台跳转地址，适合需要人工复核时直接打开

### 查看节点资源

```bash
bytedcli bytetree resources --node-id 1234567 --provider codebase
bytedcli --json bytetree resources --node-id 1234567 --provider tce --offset 20 --page-size 50
```

- 直接查询 `/nodes/{id}/resources_v2`，适合列出某个节点下挂载的资源
- 支持 `--provider` 精确筛选资源来源，例如 `codebase`、`tce`、`tcc`
- 返回 `node_id`、`provider`、`resource_type`、`name`、`resource_id/rid`、`env`、`link.view`

### 查看子节点

```bash
bytedcli bytetree children --node-id 1234567
bytedcli --json bytetree children --node-id 1234567 --type service,psm --page-size 100
```

- 默认类型：`service,resource,psm,employee,top-node,folder`
- 支持 `--page`、`--page-size`、`--max-level`
- 文本模式下会展示 `provider` 和 `path`

### 查看父链

```bash
bytedcli bytetree parents --node-id 1234567
bytedcli --json bytetree parents --node-id 1234567
```

- 返回从上层目录到当前节点的完整父链
- 适合补齐节点所属路径、确认归属目录、查服务树挂载位置

### 查看和调整 Owner

```bash
bytedcli bytetree owner list --node-id 1234567
bytedcli --json --site i18n-tt bytetree owner list --node-id 1234567 --role owner.i18n

# 默认 dry-run，只打印 payload 和执行计划
bytedcli bytetree owner add --node-id 1234567 --user demo.user
bytedcli bytetree owner delete --node-id 1234567 --user old.user
bytedcli bytetree owner set --node-id 1234567 --user new.owner

# 确认 payload 后再真实执行
bytedcli --json bytetree owner add --node-id 1234567 --user demo.user --yes
```

- `owner list` 返回 `person_account`、`service_account`、`role_summary`
- `owner add/delete/set` 支持 `--user` 重复传入或逗号分隔
- 默认 `--user-type person_account`；服务账号使用 `--user-type service_account`
- 写操作默认 dry-run，必须显式加 `--yes` 才会调用 IAM 写接口
- 默认角色按站点推断：`cn/boe/eu-ttp` 使用 `owner`，`i18n-tt/i18n-bd` 使用 `owner.i18n`，`us-ttp` 使用 `owner.tx`
- `set` 只替换当前 `--user-type`，并读取现状保留另一类账号成员，避免误清服务账号或人账号
- IAM 写接口返回 403 时，按提示走 ByteCloud IAM UI 或申请 `/api/v2/acl/node/role` allowlist

### 搜索业务树业务域

```bash
bytedcli bytetree biz search --query "demo-business"
bytedcli --json bytetree biz search --keyword "sample-business" --limit 50 --expand-bytetree
```

- 返回匹配业务域的 `domain_code`、`name`、`description`、父子层级和服务树映射 ID
- `--limit` 是本地结果上限，不是分页参数；`biz search` 不支持 `--page`
- `--expand-bytetree` 会把 `byte_tree_node_ids` 与 `exclude_byte_tree_node_ids` 展开为服务树节点详情
- 不返回 `DutyLeaf`、`DutyByteTreeNodeID` 或其他 Duty 相关字段
- 适合先用业务名称模糊定位业务域，再用 `get` 或 `children` 下钻

### 查看业务域详情

```bash
bytedcli bytetree biz get --domain-code demo_domain
bytedcli --json bytetree biz get --domain-code demo_domain --expand-bytetree --include-tags
```

- `get` 会并发请求业务域基础信息和 freshness 信息，并在同一个结果里返回 `freshness`
- `--include-tags` 会额外返回业务域标签列表
- `--expand-bytetree` 只展开关联服务树节点和排除服务树节点
- 业务域不存在时会返回 `BYTETREE_BIZ_DOMAIN_NOT_FOUND`，可以先用 `biz search --query` 确认业务域编码

### 查看业务域子节点和叶子节点

```bash
bytedcli bytetree biz children --domain-code demo_domain --page 1 --page-size 50
bytedcli --json bytetree biz children --domain-code demo_domain --expand-bytetree

bytedcli bytetree biz leaf list --domain-code demo_domain --page 1 --page-size 50
bytedcli --json bytetree biz leaf list --domain-code demo_domain --expand-bytetree
```

- `children` 查询业务域直接子节点
- `leaf list` 查询业务域下叶子业务域
- `--page` 是 CLI 侧从 1 开始的页码；JSON 同时返回 `page`、`page_size`、`backend_page_num` 和 `has_more`
- 翻到超过末页时返回空列表和分页信息，不视为错误

### 查看业务域标签、权限和资源

```bash
bytedcli bytetree biz tag list --domain-code demo_domain
bytedcli bytetree biz permission check --domain-code demo_domain --permission system_manage
bytedcli bytetree biz resource list --domain-code demo_domain --page 1 --page-size 20
bytedcli --json bytetree biz resource list --domain-code demo_domain --sort-key name --sort-order ASC
```

- `tag list` 返回业务域标签
- `permission check` 只检查单个业务域的单个权限，避免触发上游 IAM 限流
- `resource list` 返回业务域资源列表、分页信息和上游资源字段
- `resource list --sort-key` 仅支持 `provider_rank` 和 `name`
- `resource list` 适合业务视角资源盘点；服务树节点资源仍使用 `bytetree resources --node-id`

## 使用建议

- 不知道节点 ID 时，先用 `search`
- 已经有节点 ID、需要看节点元数据时，用 `get`
- 已经有节点 ID、需要按 provider 列资源时，用 `resources`
- 已经有父节点 ID 时，用 `children`
- 已经有节点 ID、需要看归属链路时，用 `parents`
- 已经有节点 ID、需要确认告警或权限接收人时，用 `owner list`
- 需要按业务组织架构定位业务域时，用 `biz search`，不要用服务树 `search` 替代
- 已经有业务域编码、需要基础信息与 freshness 时，用 `biz get`
- 需要查看业务域和服务树映射时，在 `biz search/get/children/leaf list` 上加 `--expand-bytetree`
- 需要业务域资源清单时，用 `biz resource list`
- 服务树是全球一棵树，省略 `--site` 默认走 `cn` 控制面；跨站点排查时再按需切换
