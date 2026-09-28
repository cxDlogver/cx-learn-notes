# BAM 元数据管理指南

> 本文档描述 BAM 元数据管理的完整使用方式。
>
> **执行前缀**：参考 `references/invocation.md`；下面示例直接写 `bits-cli`。

## When to use

- PSM 搜索、收藏、最近查看
- 方法列表 / 方法详情
- 服务版本查询
- 创建服务版本（IDL 版本更新）
- 获取IDL 内容
- 获取IDL 配置

## Quick start

Commands are grouped under `bam psm`, `bam method`, `bam version`, and `bam idl`. Old flat names (e.g. `bam list-recent-psm`, `bam search-psm`, `bam list-method`, `bam get-method`, `bam versions`, `bam update-idl-version`) still work as hidden aliases.

### PSM 列表

### 1. 搜索 PSM

```bash
bits-cli bam psm search <keyword>
```

**示例**:
```bash
# 搜索包含 "openapi" 的 PSM
bits-cli bam psm search openapi

# 通过 flag 指定
bits-cli bam psm search --keyword openapi
```

**参数说明**:
- `keyword`: 搜索关键词（必填）
- `--cluster`: 集群，默认根据 vregion 自动推导

### 2. 列出最近查看/收藏的 PSM

```bash
# 查看最近访问的 PSM（默认）
bits-cli bam psm list

# 查看收藏的 PSM
bits-cli bam psm list --starred
```

**参数说明**:
- `--recent`: 显示最近访问的 PSM（默认行为）
- `--starred`: 显示收藏的 PSM
- `--cluster`: 集群，默认 `default`
- `--count`: 返回数量，默认 10
- `--offset`: 分页偏移，默认 0

### 3. 查看 PSM 的版本列表

```bash
bits-cli bam psm list-version --psm <PSM>
```

**示例**:
```bash
bits-cli bam psm list-version --psm codebase.app.openapi
```

**参数说明**:
- `--psm`: 服务 PSM（必填）
- `--cluster`: 集群，默认 `default`

**输出示例**:
```json
{
  "versions": [
    {"version": "1.0.85", "creator": "user.name", "ctime": 1234567890},
    {"version": "1.0.84", "creator": "user.name", "ctime": 1234567880}
  ]
}
```

### 4. 获取 IDL 内容

```bash
bits-cli bam psm get_idl --psm <PSM> --version="VERSION>"
```

**示例**:
```bash
bits-cli bam psm get_idl --psm codebase.app.openapi --version="1.0.85"
```

**参数说明**:
- `--psm`: 服务 PSM（必填）
- `--version`: IDL 版本（必填）
```

### 方法 列表

### 1. 列出服务的所有接口

```bash
bits-cli bam method list --psm <PSM>
```

**示例**:
```bash
# 列出服务的所有接口
bits-cli bam method list --psm codebase.app.openapi

# 指定版本
bits-cli bam method list --psm codebase.app.openapi --version="1.0.85"

# 筛选路径
bits-cli bam method list --psm codebase.app.openapi --path /api
```

**参数说明**:
- `--psm`: 服务 PSM（必填）
- `--version`: 服务版本，默认最新
- `--branch`: IDL 分支
- `--schema`: Schema 返回策略，`none`/`ref`/`inline`，推荐 `none` 或 `ref`
- `--path`: 按路径关键字筛选
- `--cluster`: 集群，默认 `default`

### 2. 查询接口

```bash
bits-cli bam method query --psm <PSM> --name <METHOD_NAME>
```

**示例**:
```bash
# 按名称/路径搜索接口
bits-cli bam method query --psm my.service.psm --name GetUser

# 只查询 HTTP 接口
bits-cli bam method query --psm my.service.psm --ep-type http

# 只查询 RPC 接口
bits-cli bam method query --psm my.service.psm --ep-type rpc
```

**参数说明**:
- `--psm`: 服务 PSM
- `--name`: 接口名称/路径/rpc_method 搜索
- `--count`: 返回数量，默认 20
- `--offset`: 分页偏移，默认 0
- `--ep-type`: 接口类型，`http` 或 `rpc`，默认 `http`
- `--newest`: 查询最新版本，1=true

### 3. 获取接口详情

```bash
# 通过 endpoint ID
bits-cli bam method get --endpoint-id <ID>

# 通过 PSM + 接口名/路径
bits-cli bam method get --psm <PSM> --method <METHOD>
```

**示例**:
```bash
# 通过 ID 获取
bits-cli bam method get --endpoint-id 12345

# 通过 PSM + 路径获取（路径以 / 开头）
bits-cli bam method get --psm my.service.psm --method /api/user/get

# 通过 PSM + RPC 方法名获取
bits-cli bam method get --psm my.service.psm --method GetUser
```

**参数说明**:
- `--endpoint-id`: 接口 ID
- `--psm`: 服务 PSM（与 `--method` 配合使用）
- `--method`: 接口名称或路径
- `--version`: 服务版本
- `--schema`: Schema 类型，`none`/`ref`/`inline`，默认 `ref`
- `--fill-rpc-param`: 填充 rpc_param
- `--fill-mcp-schema`: 填充 MCP schema

### 4. 生成请求示例

```bash
bits-cli bam method req-gen --endpoint-id <ID>
```

**示例**:
```bash
# 生成请求体示例
bits-cli bam method req-gen --endpoint-id 12345

# 生成响应体示例
bits-cli bam method req-gen --endpoint-id 12345 --schema-type resp

# 生成空值示例（使用保存的值）
bits-cli bam method req-gen --endpoint-id 12345 --empty
```

**参数说明**:
- `--endpoint-id`: 接口 ID（必填）
- `--schema-type`: Schema 类型，`req` 或 `resp`，默认 `req`
- `--param-type`: 参数类型，`body`/`header`/`query`/`path`/`cookies`，默认 `body`
- `--version`: 版本
- `--empty`: 使用保存的值（true）或随机值（false）

### 5. 获取示例代码

```bash
bits-cli bam method example-code --psm <PSM> --path <PATH> --method <HTTP_METHOD>
```

**示例**:
```bash
# 获取 HTTP 接口示例代码
bits-cli bam method example-code --psm my.service.psm --path /api/user/get --method GET

# 获取 RPC 接口示例代码
bits-cli bam method example-code --psm my.service.psm --rpc-method GetUser --custom-protocol rpc
```

**参数说明**:
- `--psm`: 服务 PSM
- `--endpoint-id`: 接口 ID
- `--path`: HTTP 路径
- `--method`: HTTP 方法
- `--rpc-method`: RPC 方法名
- `--version`: 版本
- `--custom-protocol`: 协议，`http` 或 `rpc`，默认 `http`
- `--schema-type`: Schema 类型，`req` 或 `resp`，默认 `req`

### 6. 创建接口

```bash
bits-cli bam method create --psm <PSM> --method <HTTP_METHOD> --path <PATH>
```

**示例**:
```bash
bits-cli bam method create \
  --psm my.service.psm \
  --method POST \
  --path /api/user/create \
  --name "创建用户"
```

**参数说明**:
- `--psm`: 服务 PSM（必填）
- `--method`: HTTP 方法（必填）
- `--path`: 接口路径（必填）
- `--name`: 接口名称
- `--rpc-method`: RPC 方法名
- `--note`: 备注
- `--level`: 接口级别

### 7. 更新接口

```bash
bits-cli bam method update --endpoint-id <ID> [options]
```

**示例**:
```bash
bits-cli bam method update --endpoint-id 12345 --name "新名称" --note "新备注"
```

### 8. 查看接口历史版本

```bash
bits-cli bam method list-history --psm <PSM>
```


### 创建/更新 IDL 版本

```bash
# 自动递增版本号（patch +1）
bits-cli bam idl update --psm "example.service.api" --branch master --next-version

# 指定版本号
bits-cli bam idl update --psm "example.service.api" --branch "codex/fix-idl" --version="1.2.4" --commit-id "abc1234" --commit-msg "update idl"
```

## 命令详解

### bam psm

| 命令                                        | 说明 |
|-------------------------------------------|------|
| `psm search <keyword>`                    | 搜索 PSM |
| `psm list`                                | 列出最近访问的 PSM |
| `psm list --starred`                      | 列出收藏的 PSM |
| `psm list-version --psm <PSM>`            | 查看 PSM 版本列表 |
| `psm get_idl --psm <PSM> --version=<VER>` | 获取 IDL 内容 |

### bam method

| 命令 | 说明 |
|------|------|
| `method list --psm <PSM>` | 列出服务所有接口 |
| `method query --psm <PSM> --name <NAME>` | 搜索接口 |
| `method get --endpoint-id <ID>` | 获取接口详情 |
| `method get --psm <PSM> --method <M>` | 通过 PSM+方法名获取详情 |
| `method req-gen --endpoint-id <ID>` | 生成请求示例 |
| `method example-code --psm <PSM>` | 获取示例代码 |
| `method create --psm <PSM> --method <M> --path <P>` | 创建接口 |
| `method update --endpoint-id <ID>` | 更新接口 |
| `method list-history --psm <PSM>` | 查看接口历史 |
| `method list-diff --psm <PSM> --old-version <V1> --new-version <V2>` | 对比版本差异 |


### bam idl

| 子命令 | 说明 | 参数 |
|-------|------|------|
| `update` | 创建/更新 IDL 版本 | `--psm`, `--branch`, `--version` 或 `--next-version`, `--commit-id`, `--commit-msg` |

## Notes

- `method get` 支持 `--endpoint-id` 或 `--psm` + `--method` 两种定位方式
- `--schema ref|raw` 控制 schema 展示方式
- `idl update` 必须提供 `--psm` 和 `--branch`，版本号通过 `--version` 指定或 `--next-version` 自动在最新版本基础上 patch +1
- 缺少必填参数会自动输出帮助信息
- 需要结构化输出加 `--json`（全局选项，放在子命令之前，如 `bits-cli --json bam method get ...`）

## ⚠️ 约束

- **不要** 未经确认执行 IDL 版本创建 (`bam idl update`)
- 创建版本前应先确认本地 IDL 与 BAM 远端差异
