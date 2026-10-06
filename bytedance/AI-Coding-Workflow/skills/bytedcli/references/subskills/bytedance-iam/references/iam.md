# IAM (Identity and Access Management)

## 员工信息查询

```bash
# 查询员工信息
bytedcli iam get-employee <username>

# JSON 格式输出
bytedcli --json iam get-employee <username>
```

### 返回字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `peopleId` | number | 员工 ID |
| `username` | string | 用户名 |
| `displayName` | string | 显示名称 |
| `email` | string | 邮箱地址 |
| `idPhotoUrl` | string | 证件照 URL |

## IAM 节点权限申请

```bash
# 仅检查权限和可申请角色
bytedcli iam permission apply \
  --permission <perm> \
  --psm <psm> \
  --check-only

# 申请 IAM 节点权限
bytedcli iam permission apply \
  --permission <perm> \
  --psm <psm> \
  --role <roleId> \
  --reason "<text>" \
  --source-url "<url>"

# 已知 role + PSM 时，直接申请 RBAC 角色（不带 --permission）
bytedcli iam permission apply \
  --role tce.operator.cn \
  --psm <psm> \
  --reason "<text>" \
  --yes

# 已知 role + 服务树节点时，按 node_id 申请
bytedcli iam permission apply \
  --role tce.operator.cn \
  --node-id <node_id> \
  --reason "<text>" \
  --auth-duration 604800 \
  --yes
```

### 主要参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--permission` | permission-code 模式必填 | IAM 权限编码；role-only 模式省略 |
| `--psm` | permission-code 模式必填 | 目标 PSM；role-only 模式可作为目标资源 |
| `--node-id` | 否 | role-only 模式目标服务树节点 ID，优先级高于 `--psm` |
| `--resource-type` | 否 | role-only 模式目标资源类型：`node_id` / `psm` / `brn` / `brn_scope` |
| `--resource-value` | 否 | role-only 模式目标资源值，必须和 `--resource-type` 成对出现 |
| `--resource-brn-target` | 否 | role-only 模式 BRN 目标补充字段 |
| `--reason` | 否 | 工单理由；省略时默认 `Need access for verification.` |
| `--role` | role-only 模式必填 | 角色 ID；permission-code 模式省略走推荐角色 |
| `--env` | 否 | 默认 `prod` |
| `--region` | 否 | 默认 `cn` |
| `--user-type` | 否 | 默认 `person_account` |
| `--username` | 否 | 默认当前登录用户 |
| `--auth-duration` | 否 | role-only 模式授权时长，单位秒；默认 604800（7 天） |
| `--approver` | 否 | role-only 模式资源 owner 审批人；省略时自动使用 IAM 推荐审批人 |
| `--data-use-purpose` | 否 | role-only 模式数据用途说明 |
| `--source-url` | 否 | 工单审计上下文 URL |
| `--platform` | 否 | 工单平台字段，默认 `bits` |
| `--extra-params` | 否 | 额外 escape_params，`key=value` 可重复 |
| `--check-only` | 否 | 仅查询，不开单 |
| `--yes` | 否 | 非交互模式，直接采用推荐角色 |

### 返回字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | string | `already_has`（已有权限）或 `created`（已开单） |
| `permission` | string | 权限编码 |
| `psm` | string | 目标 PSM |
| `role` | string \| null | 实际申请的角色 ID |
| `link` | string \| null | 「字节云 IAM 权限」工单 URL |
| `links` | string[] | 工单 URL 列表 |
| `check` | object | `/check/permission` 原始解析（含 `available_roles` / `default_role_id`） |
| `resource_type` / `resource_value` | string | role-only 模式目标资源 |
| `auth_duration` | number | role-only 模式授权时长 |
| `resource_owner_assignees` | string[] | role-only 模式实际使用的资源 owner 审批人 |

### 与 `api-test rpc-call --create-permission-ticket` 的区别

- 本命令是通用入口：任意 PSM、任意权限都可申请。
- `api-test rpc-call --create-permission-ticket` 仅在 RPC 调用返回 `has_permission=false` 时复用 RPC 响应里的 `escape_params` 申请权限，绑定接口测试场景。
- 两者共享 `src/services/iam/permission.ts` 内部实现，工单形态一致。

### 模式说明

- permission-code 模式：带 `--permission`，用于从权限编码检查/申请；`--check-only` 只支持该模式。
- role-only 模式：不带 `--permission`，必须带 `--role`，并提供 `--psm`、`--node-id` 或 `--resource-type + --resource-value` 中的一种目标资源。
