---
name: bytedance-babi
description: "Operate BABI OpenAPI via bytedcli: 火山账号 (list IDs/detail, search/get BABI accounts, bind ByteTree) and the product module (read-only: products, versions, cost associations, delegate configs, charge items/prices). Use when tasks mention BABI account, 火山账号 OpenAPI, BABI product/charge-item/计费项/version/cost, bind ByteTree, or `babi account` / `babi product` commands."
---

# BABI OpenAPI

## 如何调用

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

- 列出凭据可访问的火山账号 ID（`babi volc-account list`）
- 查看火山账号完整记录：负责人、成本中心、服务树、状态等（`babi volc-account list --full`）
- 按名称搜索或列出 BABI 账号（`babi account list`）
- 按账号 ID 查询单个 BABI 账号（`babi account get`）
- 把服务树节点绑定到 BABI 账号（`babi account bind-bytetree`，写操作）
- 列出商品（`babi product list`）、商品版本（`babi product version list`）
- 查询某版本的成本关联（`babi product cost list`）、代持配置（`babi product delegate list`）
- 查询商品的计费项与单价（`babi product charge-item list`）

## 前置条件

- 使用通用调用方式：`../../invocation.md`。
- BABI OpenAPI 使用独立凭据（与 SSO / ByteCloud JWT 无关）：AK/SK 在建完商品后自动生成，到 BABI 商品详情页自助获取；获取方式与签名规范见 [BABI API 认证签名规范](https://cloud.bytedance.net/docs/BABI/docs/671f69d270e38303191c3964/68ac19a2ce73e204daef994b?x-resource-account=public&x-bc-region-id=bytedance)。推荐 V2 AK/SK 签名认证（`x-api-signature`），后端已提示 V1 `Authorization` token 即将下线。
- 凭据优先级：env `BYTEDCLI_BABI_ACCESS_KEY` + `BYTEDCLI_BABI_SECRET_KEY` > env `BYTEDCLI_BABI_TOKEN`（或 `BABI_TOKEN`）> 本地保存的 AK/SK > 本地保存的 token。
- 保存凭据：`bytedcli babi auth config --access-key <ak> --secret-key <sk>`（或 legacy `--token <token>`）；查看状态：`bytedcli babi auth status`。

## Quick start

```bash
# 配置 / 查看认证（推荐 V2 AK/SK）
bytedcli babi auth config --access-key <ak> --secret-key <sk>
bytedcli babi auth status

# 列出火山账号 ID（默认 --page 1 --page-size 10；可按类别过滤：volc / byteplus）
bytedcli babi volc-account list
bytedcli babi volc-account list --page 2 --page-size 20
bytedcli babi volc-account list --category volc --account-ids demo-acc-1,demo-acc-2

# 火山账号完整记录（负责人 / 成本中心 / 服务树 / 状态等）
bytedcli babi volc-account list --full

# 搜索 / 列出 BABI 账号
bytedcli babi account list --name demo-account
bytedcli babi account get --id demo-account-id

# 绑定服务树节点到 BABI 账号（写操作）
bytedcli babi account bind-bytetree --id demo-account-id --bytetree-id 3369430

# 商品模块（只读）
bytedcli babi product list --keyword demo --status online
bytedcli babi product charge-item list --product-id demo-product-id
# 版本/成本/代持需要 --operator（操作人邮箱，用于审计）；成本/代持还需 --version-id
bytedcli babi product version list --product-id demo-product-id --type online --operator demo-user@example.com
bytedcli babi product cost list --version-id demo-version-id --operator demo-user@example.com
bytedcli babi product delegate list --version-id demo-version-id --operator demo-user@example.com
```

## Notes

- 默认输出文本；结构化输出加 `-j/--json`（全局选项，放在子命令之前，如 `bytedcli --json babi account list`）。
- `--site` 选择 BABI 后端环境：`online`（生产，默认；别名 `cn`/`prod`）或 `boe`（测试；别名 `test`），CLI 解析时即校验取值。注意 babi 的 `--site` 是局部参数，取值与全局 ByteCloud `--site` 字典不同，并会在 babi 命令下覆盖全局同名选项。
- `volc-account list` 前台命令统一、后台按 `--full` 分流：默认走账号 ID 接口，`--full` 走完整记录接口。
- `--category` 使用语义值 `volc` / `byteplus`，CLI 内部映射到后端编码，不直接透出数字。
- 分页用 `--page`（1 起）与 `--page-size`（默认 10，与后端默认 Limit 一致）；后端按 offset/limit 返回，CLI 自动换算。传 `--account-ids` 时后端按 ID 过滤、忽略分页，CLI 请求体也不再携带 offset/limit。
- `bind-bytetree` 为写操作，`--bytetree-id` 必须是正整数服务树节点 ID。
- 商品模块为只读：`product list` / `version list` / `cost list` / `delegate list` / `charge-item list`。`version`/`cost`/`delegate` 需 `--operator <email>`（审计用，必填）；`cost`/`delegate` 还需 `--version-id`（先用 `version list` 拿到 VersionId）。
- 枚举入参用语义值：`product list --status offline|online|all|effective|draft`、`version list --type draft|online`，CLI 内部映射后端编码。
- 计费项单价 `UnitPrice` 在无权限/敏感商品时返回 `******`；要拿真实价需用该商品自己的 AK/SK。`charge-item list` 必须带 `--product` 或 `--product-id`（非白名单商品必须 `--product-id`）。

## Agent Guidance

- 后端失败以「非 200 状态码 + 标准 envelope」返回（例如 403 + `ResponseMetadata.Code=1004`）；CLI 已透出 envelope 内的结构化报错为 `BABI_API_ERROR`，排查时优先看错误 message 里的后端原因。
- 凭据缺失或不合法时的典型现象：HTTP 403、`Code=1004`、message 为「接口认证不通过」。先运行 `bytedcli babi auth status` 确认机制与来源，再用 `bytedcli babi auth config --access-key <ak> --secret-key <sk>` 重新配置。
- 后端同时支持 V2（`x-api-signature` AK/SK 签名，配置 AK/SK 后 CLI 自动使用）与 V1（`Authorization` token）；后端错误信息明确提示「V1 认证机制即将下线」，优先配置 AK/SK。
- BOE 站点的 `babi volc-account list --full` 已验证稳定报 `Code=1000 "Get ROW ByteTree fail."`（BOE 后端依赖不可用）；默认的 `volc-account list` 与 `account list` / `account get` 在 BOE 正常。需要完整账号记录时使用 `--site online`。
- 商品的 `cost list` 与 `charge-item list` 走 v4 接口（`/v4/api/product/listProductCost`、`/v4/api/product/listChargeItem`，旧 v3 将于 2026-09-01 下线）。**BOE 仅部署了 v3、没有 v4**，所以这两个命令在 `--site boe` 会报 `Code=404 "服务器内部错误"`；请用 `--site online`。`product list` / `version list` / `delegate list` 在 BOE 正常。
- 商品级接口要求 AK/SK 对该商品有权限，否则 `Code=2012 "没有操作权限"`（`version list` 例外，不需商品级权限）。`version list` 未传 `--version-id` 时必须传 `--type`，否则后端 `Code=2001`。

## References

- `references/babi.md`
- `../../invocation.md`
- `../../troubleshooting.md`
