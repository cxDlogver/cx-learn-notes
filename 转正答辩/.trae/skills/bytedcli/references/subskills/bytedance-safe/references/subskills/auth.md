# Safe Auth

Safe 权限（cg_portal）与风险标签相关命令收纳在 `bytedance-safe` skill 内，命令路径以 `safe auth` 开头。

在执行 `safe auth ...` 之前，先完成认证：

```bash
bytedcli safe login
```

## Commands

```bash
bytedcli safe auth role list [--code <code>] [--name <name>] [--search <q>] [--product <type>] [--biz <biz>] [--resource <code>] [--page <n>] [--page-size <n>]
bytedcli safe auth role list-member --code <code> [--search <q>] [--page <n>] [--page-size <n>]
bytedcli safe auth role apply --code <code> --auth-day <n> [--reason <text>]

bytedcli safe auth resource get-tree --product <type> --class <function|data> [--biz <biz>]

bytedcli safe auth user list-resource --biz <biz> [--email <email>] [--need-api] [--need-role]
bytedcli safe auth user list-data-resource --biz <biz> --product <type> [--email <email>] [--resources <code>]
bytedcli safe auth user check-label --biz-id <n> [--email <email>] [--label-ids <id>] [--biz-scene <n>] [--need-expire]
```

Notes:

- 命令统一采用 `动词-名词` 形式（例如 `list-member`、`check-label`），旧的 `名词-动词` 形式不再支持。
- 重命名对照：
  - `role list-member`（原 `role member-list`）
  - `resource get-tree`（原 `resource tree-get`）
  - `user list-resource`（原 `user resource-list`）
  - `user list-data-resource`（原 `user data-resource-list`）
  - `user check-label`（原 `user label-check`）
- 当使用 `--resource` 时，仅支持配合 `--biz` 使用；不支持与 `--code` / `--name` / `--search` / `--product` / `--page` / `--page-size` 同时使用。

## Examples

```bash
bytedcli safe auth role list --product portal --biz community
bytedcli safe auth role list --biz community --resource sample-resource-code
bytedcli safe auth role list-member --code sample-role-code
bytedcli safe auth user check-label --biz-id 101 --email user@example.com --label-ids 12345
```
