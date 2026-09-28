# ECOP 治理标签 & 标准审核标签命令参考

## 资源模型

ECOP 治理体系有两层资源：

1. **治理标签（zhili label）**：业务定义层，由「分类 → 目录 → 标签」三级树状组织。
2. **标准审核标签（std-audit-label）**：审核执行层，挂载在某个治理目录/标签下。

CLI 拆为两个独立父命令：

- `ecop zhili-label`：操作治理标签本身（树 / 列表 / 详情）
- `ecop std-audit-label`：基于治理目录查询挂载的审核标签

---

## `ecop zhili-label tree`

```bash
bytedcli --json ecop zhili-label tree
bytedcli --json ecop zhili-label tree --scope dir
```

| 参数 | 说明 |
|---|---|
| `--scope all`（默认）| 目录 + 标签全量 |
| `--scope dir` | 仅目录骨架，CLI 传 `forceDBSearch: true`，更快 |

返回字段：每个节点含 `id`、`name`、`code`、`labelType`、`labelPath`、`status`、`kids`。

`labelType` 映射：`0=分类`（逻辑根，深度锚定为 0，不计入缩进）、`1=目录`、`2=标签`

---

## `ecop zhili-label list`

```bash
bytedcli --json ecop zhili-label list --dir-id 123456 --page 1 --page-size 10
bytedcli --json ecop zhili-label list --keyword demo-keyword
```

| 参数 | 上游字段 | 说明 |
|---|---|---|
| `--dir-id` | `selectedNodeId` | 过滤指定目录下的标签 |
| `--keyword` | `filterNameCode` | 按 ID/名称/编码模糊匹配 |
| `--page` / `--page-size` | `pageNum`/`pageSize` | CLI 1-based 分页 |

返回：`id`、`name`、`code`、`labelType`、`category`（`1=底线`、`2=非底线`）、`status`、`latestVersion`、`latestStatus`、`labelPath`

---

## `ecop zhili-label get`

```bash
bytedcli --json ecop zhili-label get --id 123456
bytedcli --json ecop zhili-label get --id 123456 --version 2
```

| 参数 | 说明 |
|---|---|
| `--id`（必填）| 治理标签或目录 ID |
| `--version` | 可选，版本号；省略则返回最新版本 |

文本输出展示基础信息 + 中文化 `meta`；JSON 输出保留原始字段，同时附加 `*_label` 中文映射字段。

### `meta` 字段中文化映射

| Meta key | 文本标签 | 说明 |
|---|---|---|
| `owner` | Owner | JSON 数组 join |
| `is_bottom_violation` | 是否底线违规 | `1/0` → `是/否` |
| `control_subject` | 违规主体 | `1-1=达人`、`2-1=商家`、`8-1=用户` → 输出：`商家（2-1）` |
| `zhili_domain` | 治理域 | JSON 数组 join，保留 ID |
| `field_domain` | 场域 | JSON 数组 + 中文映射，例如「抖音主端、抖极、火山、跨境、商城、搜索」|
| `score` | 积分值 | 自动追加「分」 |
| `can_education` | 是否可教育 | `1/0` → `是/否` |
| `can_externalization` | 是否可外化 | `1/0` → `是/否` |
| `live_tag_id` | 直播中台 live_tag_id | 原始透传 |
| `policy_id` | 社区生态 policy_id | 原始透传 |
| `short_video_tag_id` | 短视频社区标准 tag_id | 原始透传 |
| `show_tag_name` | 对外透传文案 | 原始透传 |
| `introduce` | 标签简介 | 原始透传 |
| `penalty_case` | 判罚示例 | 自动从 ProseMirror 富文本递归提取 `text` 节点 |

### `status` 中文映射

| Code | 标签 |
|---|---|
| `-1` | 已删除 |
| `1` | 信息录入中 |
| `2` | 审批中 |
| `3` | 生效中 |
| `4` | 已下线 |
| `5` | 驳回或取消 |
| `6` | 待生效 |
| `7` | 评审中 |
| `8` | 下线审批中 |
| `9` | 下线审批LR |
| `10` | 待下线 |

未命中映射时回退展示原始数字。

---

## `ecop std-audit-label list`

```bash
bytedcli --json ecop std-audit-label list --dir violation_type:zl_tgsjbhldrdr
bytedcli --json ecop std-audit-label list --dir 123456 --page 1 --page-size 20
```

| 参数 | 上游字段 | 说明 |
|---|---|---|
| `--dir`（必填）| `dirCode` | 治理目录 code 或数字 ID，两者均可 |
| `--page` / `--page-size` | `pageNum`/`pageSize` | CLI 1-based，handler 内部换算为上游 0-based |

返回：`id`、`name`、`code`、`status`、`version`、`labelPath`、`owners`、`meta`、嵌套 `zhili`（含 `controlSubject`）

`zhili.controlSubject` 在 JSON 中附 `control_subject_label`（如 `商家（2-1）`），文本模式列同样显示中文标签。

---

## 上游接口对应关系

| CLI 命令 | 上游 RPC |
|---|---|
| `ecop zhili-label tree` | `AuditConfig/LabelDirTree` |
| `ecop zhili-label list` | `AuditConfig/ZhiliLabelList` |
| `ecop zhili-label get` | `AuditConfig/ZhiliDirDetail` |
| `ecop std-audit-label list` | `AuditConfig/AuditLabelSearch` |
