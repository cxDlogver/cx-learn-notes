# BABI 火山账号 OpenAPI 参考

bytedcli 的 `babi volc-account` / `babi account` 命令封装了 BABI 平台「火山账号 OpenAPI」的 5 个接口。所有接口均为 `POST` + JSON body。

## 鉴权

- 独立凭据（与 SSO / ByteCloud JWT 无关）：AK/SK 在建完商品后自动生成，到 BABI 商品详情页自助获取；获取方式与签名规范见 [BABI API 认证签名规范](https://cloud.bytedance.net/docs/BABI/docs/671f69d270e38303191c3964/68ac19a2ce73e204daef994b?x-resource-account=public&x-bc-region-id=bytedance)。后端支持两套机制：
  - **V2（推荐）**：AK/SK 签名。CLI 配置 AK/SK 后自动按签名规范生成 `x-timestamp` + `x-api-signature`（HMAC-SHA1，对 `ts\n<query>\n<headers>\nsha1hex(body)` 签名）。
  - **V1（legacy）**：`Authorization: <token>` 请求头；后端错误信息已提示「V1 认证机制即将下线」。
- 凭据优先级：env `BYTEDCLI_BABI_ACCESS_KEY` + `BYTEDCLI_BABI_SECRET_KEY` > env `BYTEDCLI_BABI_TOKEN`（或 `BABI_TOKEN`）> 本地保存的 AK/SK > 本地保存的 token（均通过 `babi auth config` 保存）。
- 认证失败的典型现象：403 + `ResponseMetadata.Code=1004`「接口认证不通过」。
- 失败响应统一为「非 200 状态码 + 标准 envelope」；CLI 会把 envelope 内的后端错误透出为 `BABI_API_ERROR`（含 `Code` 与 message），不会只报裸 HTTP 状态码。

## 已知限制

- BOE 站点的 `volc-account list --full`（`/v3/api/account/volcDetailList`）稳定返回 `Code=1000 "Get ROW ByteTree fail."`（BOE 后端依赖不可用）；默认的 `volc-account list`（ID 列表）与 `account list` / `account get` 在 BOE 正常。需要完整账号记录时使用 `--site online`。

## 后端环境（`--site`）

| site | 说明 | host |
| --- | --- | --- |
| `online` | 生产（默认） | `http://cloud-business.byted.org` |
| `boe` | 测试 | `http://b-cloud-business.byted.org` |

## 命令与接口对应

| 命令 | 接口 | 说明 | envelope |
| --- | --- | --- | --- |
| `babi volc-account list` | `POST /v3/api/account/volc` | 列出凭据可访问的火山账号 ID（默认分支） | `ResponseMetadata/Result` |
| `babi volc-account list --full` | `POST /v3/api/account/volcDetailList` | 火山账号完整记录（负责人/成本中心/服务树/状态等） | `ResponseMetadata/Result` |
| `babi account list` | `POST /v3/api/account/list` | 按名称搜索 / 列出 BABI 账号 | `code/data/msg` |
| `babi account get` | `POST /v3/api/account/detail` | 按账号 ID 查询单个 BABI 账号 | `code/data/msg` |
| `babi account bind-bytetree` | `POST /v3/api/account/bindByteTree` | 绑定服务树节点到 BABI 账号（写） | `code/data/msg` |

> 注意：`volc-account list` 前台命令统一、后台按 `--full` 分流到两个不同接口。两类接口返回 envelope 不同：`volc-account list`（含 `--full`）走 `{ ResponseMetadata: { Code }, Result }`（成功 `Code == 0`）；`account list` / `get` / `bind-bytetree` 走 `{ code, data, msg }`（成功 `code == 0`）。bytedcli 已对两类做严格成功判断，非 0 一律抛 `BABI_API_ERROR`。

## 参数说明

### volc-account list

| 参数 | 说明 |
| --- | --- |
| `--site` | BABI 后端环境：`online`（默认，别名 `cn`/`prod`）/ `boe`（别名 `test`）；局部参数，覆盖全局 ByteCloud `--site`，CLI 解析时校验取值 |
| `--full` | 返回完整账号记录（走 `volcDetailList` 接口）；默认只返回账号 ID |
| `--account-ids` | 火山账号 ID 过滤，逗号分隔或重复传入；设置后请求体不再携带 offset/limit（后端按 ID 过滤返回） |
| `--category` | 类别过滤：`volc`（火山引擎）/ `byteplus`，逗号分隔或重复传入 |
| `--page` / `--page-size` | 分页，1 起，`--page-size` 默认 10；CLI 自动换算为后端 offset/limit |

### account list

| 参数 | 说明 |
| --- | --- |
| `--site` | BABI 后端环境：`online`（默认，别名 `cn`/`prod`）/ `boe`（别名 `test`）；局部参数，覆盖全局 ByteCloud `--site`，CLI 解析时校验取值 |
| `--name` | 按账号名称过滤（不传则列出全部，配合分页） |
| `--page` / `--page-size` | 分页，1 起，`--page-size` 默认 10 |

### account get

| 参数 | 说明 |
| --- | --- |
| `--site` | BABI 后端环境：`online`（默认，别名 `cn`/`prod`）/ `boe`（别名 `test`）；局部参数，覆盖全局 ByteCloud `--site`，CLI 解析时校验取值 |
| `--id` | BABI 账号 ID（必填） |

### account bind-bytetree（写操作）

| 参数 | 说明 |
| --- | --- |
| `--site` | BABI 后端环境：`online`（默认，别名 `cn`/`prod`）/ `boe`（别名 `test`）；局部参数，覆盖全局 ByteCloud `--site`，CLI 解析时校验取值 |
| `--id` | BABI 账号 ID（必填） |
| `--bytetree-id` | 服务树节点 ID，正整数（必填） |

## 返回字段（规范化后的小写驼峰）

- BABI 账号（`account list` / `account get`）：`accountId`、`accountName`、`byteTreeIdList`、`mdmCode`、`mdmType`、`ownerList`、`valid`。
- 火山账号完整记录（`volc-account list --full`）：`volcAccountId`、`volcAccountName`、`babiAccountName`、`byteTreeId`、`byteTreeName`、`owner`、`user`、`costCenterCode`、`costCenterName`、`orgName`、`status`、`createTime`、`remark` 等。

## 示例

```bash
# 列出火山账号 ID（boe 环境，按类别过滤）
bytedcli --json babi volc-account list --site boe --category volc --page 1 --page-size 20

# 火山账号完整记录（仅 online 可用，见已知限制）
bytedcli --json babi volc-account list --full --account-ids demo-acc-1,demo-acc-2

# 按名称搜索 BABI 账号
bytedcli --json babi account list --name demo-account

# 绑定服务树节点
bytedcli babi account bind-bytetree --id demo-account-id --bytetree-id 3369430
```

## 商品模块（只读）

`babi product` 封装 BABI 商品模块的只读接口（全部 GET，V2 AK/SK 签名对 query string 签名）。

| 命令 | 接口 | 说明 |
| --- | --- | --- |
| `babi product list` | `GET /product?Action=ListProduct` | 商品列表 |
| `babi product version list` | `GET /v3/api/product/listVersion` | 商品版本（草稿/线上） |
| `babi product cost list` | `GET /v4/api/product/listProductCost` | 某版本的成本关联 |
| `babi product delegate list` | `GET /v3/api/product/listDelegateConfiguration` | 某版本的代持配置 |
| `babi product charge-item list` | `GET /v4/api/product/listChargeItem` | 商品计费项与单价 |

### 关键参数

| 命令 | 必填 | 常用过滤 |
| --- | --- | --- |
| `product list` | - | `--product` / `--product-id` / `--keyword`（模糊）/ `--status`（offline\|online\|all\|effective\|draft）/ `--inner` / `--search-start` / `--search-end` |
| `version list` | `--operator <email>` | `--product` / `--product-id` / `--type`（draft\|online）/ `--env` / `--version-id`（逗号分隔或重复）/ `--base-time` |
| `cost list` | `--version-id`、`--operator` | `--area`（cn/us/ap/eu）/ `--node-id` |
| `delegate list` | `--version-id`、`--operator` | `--from-node-id` / `--to-node-id` / `--area` |
| `charge-item list` | `--product` 或 `--product-id` | `--flavor` / `--fuzzy-flavor` / `--region` / `--version-id` / `--is-draft` / `--env` / `--effect-time` |

### 说明与已知限制

- 鉴权与账号接口一致：V2 AK/SK 签名；旧版 `Authorization: Basic` 已废弃、将彻底下线（时间线见改造方案，2026-09-01 旧接口下线）。
- 商品级接口要求 AK/SK 对该商品有权限，否则 `Code=2012`；`version list` 例外（不需商品级权限），适合先验证签名/取 VersionId。`version list` 不传 `--version-id` 时必须传 `--type`。
- `cost list` / `charge-item list` 使用 v4 接口；**BOE 仅有 v3、无 v4**，`--site boe` 会报 `Code=404`，请用 `--site online`。
- 计费项单价字段固定为 String；无权限/敏感商品时 `UnitPrice` 脱敏为 `******`（v4 同时对 ratio/factor 提供 `ratioStr`/`factorStr` 保精度）。

### 示例

```bash
# 商品列表（在线态，按关键词）
bytedcli --json babi product list --keyword demo --status online

# 商品版本（需 operator）
bytedcli --json babi product version list --product-id demo-product-id --type online --operator demo-user@example.com

# 计费项（v4，仅 online；价格可能脱敏为 ******）
bytedcli --json babi product charge-item list --site online --product-id demo-product-id

# 成本关联（先用 version list 拿 VersionId）
bytedcli --json babi product cost list --site online --version-id demo-version-id --operator demo-user@example.com
```
