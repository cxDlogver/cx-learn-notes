# TokaDB Table

TokaDB table 是 TokaDB 中承载业务数据的宽表资源，通常归属于某个 cluster 和 database。table 元信息包含表名、database、表类型、schema、列族、TTL、多 AZ 拓扑和权限可见性等内容。Agent 需要回答“这个 cluster 里有哪些表”“某张表的 schema 是什么样”“列族和 TTL 怎么配置”“table 位于哪个 cluster/database”时，优先使用 `bytedcli tokadb table`。

## 常用命令

```bash
# 列出指定 cluster 下的 table
bytedcli tokadb table list --region cn --cluster "sample-cluster" --page-size 20

# 按关键词模糊搜索 table
bytedcli tokadb table list --region cn --keyword "sample_table"

# 跨 region 搜索 table（--all-regions 与 --region 互斥）
bytedcli tokadb table list --all-regions --keyword "sample_table"

# 仅看自己是 Owner / 管理员或 Owner 的表
bytedcli tokadb table list --region cn --scope owner

# 查看单表详情与 schema（<id> 是位置参数）
bytedcli tokadb table describe --region cn 12345

# 输出 JSON 供脚本处理
bytedcli --json tokadb table describe --region cn 12345
```

## 参数说明

- `--region` 默认是 `cn`，支持 `cn`、`boe`、`boei18n`、`i18ntt`、`i18nbd`、`usttp`、`euttp`。
- `--all-regions` 一次性并行查询所有受支持 region；与 `--region` 互斥，没有 `--region all` 的写法。
- `--cluster` 用于限定 table 所属 cluster（传集群名或 ID）；已知 cluster 时建议显式传入。
- `--name` 对表名做精确匹配；`--keyword` 做模糊搜索，适合先搜索再确定表 ID。
- `--scope` 控制可见性范围：`all`（默认）/ `owner` / `admin-or-owner`，取代旧的 `--owner` / `--admin-or-owner` 布尔 flag。
- `--has-data-query-permission` 仅返回具备 data_query 权限的表。
- `--page` / `--page-size` 控制分页（不存在 `--limit`）。
- `table describe` 的表标识是位置参数 `<id>`，传表 ID，不要写成 `--cluster` / `--database` / `--table`。

## 字段理解

- `cluster`：table 所在 cluster，后续详情查询与 region 一起匹配。
- `database`：table 所在 database，用于区分同一 cluster 内不同业务域。
- `name` / `id`：table 名称与 ID，`describe` 查询用 `<id>` 定位。
- `tableType`：表类型，反映后端存储或兼容模型。
- `state`：表当前状态。

## 使用建议

如果只知道表名，先用 `table list --keyword` 搜索并记录返回的 `region`、`cluster`、`id`。随后用 `table describe <id>` 精确查看 schema 和列族。脚本消费时使用 `bytedcli --json tokadb ...`，不要从文本表格中解析字段。
