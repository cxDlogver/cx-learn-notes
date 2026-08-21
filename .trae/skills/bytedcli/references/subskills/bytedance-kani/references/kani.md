# Kani

Kani 是权限审批/工单平台。bytedcli 当前覆盖 **审批工单列表**、**创建Kani权限申请工单** 和 **Kani 知识库检索** 能力。

## 检索 Kani 知识库

```bash
# 检索 Kani 权限系统相关知识
bytedcli kani knowledge search --query "如何申请 Kani 资源权限"

# 带上下文检索并限制返回知识库切片数量
bytedcli kani knowledge search \
  --query "Kani 权限审批失败怎么办" \
  --context "用户正在排查权限申请" \
  --result-limit 10

# JSON 输出（全局参数必须放在子命令前）
bytedcli --json kani knowledge search --query "如何申请 Kani 资源权限"
```

### 参数一览（kani knowledge search）

> 具体可用参数以 `bytedcli kani knowledge search --help` 为准。

- `--query <query>`：用于知识库检索的用户查询语句（必填）
- `--context <context>`：辅助检索的聊天记录或用户上下文信息
- `--result-limit <n>`：返回知识库切片数量，`1..50`，默认 `5`

## 创建Kani权限申请工单

```bash
# 创建资源权限申请工单（resource 需要 permission-key，指定资源的某个权限）
bytedcli kani approval create \
  --applicant alice \
  --reason "need read access" \
  --object-type resource \
  --object-namespace kani_1688 \
  --object-key demo-resource \
  --permission-key read

# 创建角色申请工单
bytedcli kani approval create \
  --applicant alice \
  --reason "need role" \
  --object-type role \
  --object-namespace kani_1688 \
  --object-key demo-role

# 创建用户组申请工单
bytedcli kani approval create \
  --applicant alice \
  --reason "need group" \
  --object-type group \
  --object-namespace kani_1688 \
  --object-key demo-group

# 预览请求体和 endpoint，不真正提交
bytedcli kani approval create \
  --applicant alice \
  --reason "need read access" \
  --object-type resource \
  --object-namespace kani_1688 \
  --object-key demo-resource \
  --permission-key read \
  --dry-run

# JSON 输出（全局参数必须放在子命令前）
bytedcli --json kani approval create --applicant alice --reason "need read access" --object-type resource --object-namespace kani_1688 --object-key demo-resource --permission-key read
```

### 参数一览（kani approval create）

> 具体可用参数以 `bytedcli kani approval create --help` 为准。

- `--applicant <user>`：申请人（必填）
- `--reason <reason>`：申请理由（必填）
- `--object-type <type>`：申请对象类型，`resource|role|group`（必填）
- `--object-namespace <ns>`：申请对象namespace，例如 `kani_1688`（必填）
- `--object-key <key>`：申请对象key（必填）
- `--permission-key <key>`：申请对象的权限key，仅 `--object-type resource` 必填
- `--dry-run`：只打印请求体和 endpoint，不真正创建申请
- `--kani-site <site>`：隐藏参数，`cn|boe`（默认 `cn`）

## 列出审批工单

```bash
bytedcli kani approval list

# JSON 输出（全局参数必须放在子命令前）
bytedcli --json kani approval list
```

## 常用筛选示例

```bash
# 待我审批 / 我参与审批
bytedcli kani approval list --role reviewer

# 我发起的已完成
bytedcli kani approval list --role applicant --view finished

# 过滤：申请人/审批人
bytedcli kani approval list --applicant alice --reviewer bob

# 过滤：加急 bucket
bytedcli kani approval list --urgent true

# 过滤：命名空间/安全等级/VDC
bytedcli kani approval list --ns demo_ns --security-level P0 --vdc demo_vdc

# 时间范围（ISO,ISO）
bytedcli kani approval list --created-at 2026-05-01T00:00:00Z,2026-05-12T00:00:00Z

# 分页
bytedcli kani approval list --limit 50 --offset 0
```

## 参数一览（kani approval list）

> 具体可用参数以 `bytedcli kani approval list --help` 为准。

- `--role <role>`：`applicant|reviewer`（默认 `applicant`）
- `--view <view>`：`running|finished`（默认 `running`）
- `--applicant <user>`：申请人过滤
- `--reviewer <user>`：审批人过滤
- `--status <status>`：工单状态过滤
- `--review-status <status>`：审批状态过滤
- `--urgent <boolean>`：加急 bucket 过滤（`true|false`）
- `--vdc <vdc>`：VDC 过滤
- `--limit <n>`：单 bucket page size（默认 `20`）
- `--offset <n>`：单 bucket offset
- `--start-id <id>`：单 bucket pagination start_id
- `--created-at <startISO,endISO>`：创建时间范围
- `--review-created-at <startISO,endISO>`：审批创建时间范围
- `--asc <boolean>`：是否升序
- `--cross-region <boolean>`：跨 region 过滤
- `--ns <ns>`：命名空间过滤
- `--security-level <level>`：安全等级过滤
- `--kani-site <site>`：隐藏参数，`cn|boe`（默认 `cn`）

## 站点

- 默认站点：`cn`
- BOE：隐藏参数 `--kani-site boe`
