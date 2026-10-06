---
name: bam-codegen
description: BAM 代码生成工具。支持查询 scaffold 规则、创建规则、触发代码生成、查看生成历史等操作。When user wants to generate code from BAM IDL, create scaffold rules, or manage code generation workflows.
---

# BAM Codegen Skill

BAM 代码生成工具 — 基于 BAM IDL 自动生成客户端/服务端代码。

> **When to use**: 当用户需要从 BAM IDL 生成代码、管理 scaffold 规则、或查看代码生成历史时使用。

## 快速开始

### 1. 查看可用的 Scaffold 类型

```bash
bits-cli bam codegen list-scaffold --platform server
```

**参数说明**:
- `--platform`: 平台类型，`server`（服务端）或 `client`（客户端），默认 `server`
- `--source`: 来源，默认 `bam`

**输出示例**:
```
ID: 7     Name: TypeScript
ID: 19    Name: Hertz
ID: 6     Name: go_model
```

### 2. 查询已有的代码生成规则

```bash
bits-cli bam codegen list-rule --psm env.rpc.svc --platform server
```

**参数说明**:
- `--psm`: 服务 PSM（必填）
- `--platform`: 平台类型，`server` 或 `client`，默认 `server`
- `--cluster`: 集群，默认 `default`
- `--page-num`: 页码，默认 1
- `--page-size`: 每页数量，默认 10
- `--is-subscribed`: 是否只显示已订阅的，默认 true

### 3. 创建代码生成规则

**步骤 1**: 先查看可用的 Scaffold ID

```bash
bits-cli bam codegen list-scaffold --platform server
```

**步骤 2**: 创建规则

```bash
bits-cli bam codegen create-rule \
  --psm env.rpc.svc \
  --target-repo code.byted.org/yourname/your-repo \
  --scaffold-id 7 \
  --owner yourname \
  --platform server
```

**参数说明**:
- `--psm`: 服务 PSM（必填）
- `--target-repo`: 目标代码仓库路径
- `--scaffold-id`: Scaffold ID，通过 `--show-scaffold` 查看（必填）
- `--owner`: 负责人列表
- `--cluster`: 集群，默认 `default`
- `--status`: 状态，1=启用，默认 1
- `--only-create`: 仅创建不更新，默认 true

### 4. 触发代码生成

```bash
bits-cli bam codegen generate run --rule-id 12884 --branch dev
```

```bash
bits-cli bam codegen generate run --rule-id 12884 --version="1.0.0"
```

**参数说明**:
- `--rule-id`: 规则 ID，通过 `list-rule` 获取（必填）
- `--branch`: 目标分支，默认 `master`
- `--version`: 指定 IDL 版本

### 5. 查看生成历史

```bash
bits-cli bam codegen generate history --rule-id 12884 --page-size 5
```

**参数说明**:
- `--rule-id`: 规则 ID（必填）
- `--page-num`: 页码，默认 1
- `--page-size`: 每页数量，默认 10

**输出字段说明**:
- `status_message`: 生成状态，如 "代码已生成"
- `readme`: 使用说明文档
- `usage`: 安装/使用命令
- `job_info.job_url`: 构建任务链接

## 典型工作流

### 场景 1: 为新服务生成 TypeScript 客户端 SDK

```bash
# 1. 查看客户端可用的 scaffold
bits-cli bam codegen list-scaffold --platform client

# 2. 创建规则
bits-cli bam codegen create-rule \
  --psm my.service.psm \
  --target-repo code.byted.org/myteam/my-service-client \
  --scaffold-id 7 \
  --platform client

# 3. 触发生成（返回 rule_id）
bits-cli bam codegen generate run --rule-id <RULE_ID> --branch main

# 4. 查看生成结果
bits-cli bam codegen generate history --rule-id <RULE_ID>
```

### 场景 2: 为服务生成 Hertz 服务端代码

```bash
# 1. 查看服务端可用的 scaffold
bits-cli bam codegen list-scaffold --platform server

# 2. 创建规则（Hertz scaffold-id 通常是 19）
bits-cli bam codegen create-rule \
  --psm my.service.psm \
  --target-repo code.byted.org/myteam/my-hertz-service \
  --scaffold-id 19 \
  --platform server

# 3. 触发生成
bits-cli bam codegen generate run --rule-id <RULE_ID> --branch dev
```

## Platform 说明

| Platform | ID | 说明 |
|----------|-----|------|
| `server` | 1 | 服务端代码生成 |
| `client` | 3 | 客户端 SDK 生成 |

## Scaffold 类型完整列表

### Server 平台 (`--platform server`)

| ID | Name | 说明 |
|----|------|------|
| 1 | Kitex | Kitex RPC 框架代码生成 |
| 2 | Java | Java 代码生成 |
| 3 | hotsoon_test | 测试用 |
| 5 | C# | C# 代码生成 |
| 6 | go_model | Go Model 代码生成 |
| 7 | TypeScript | TypeScript SDK 生成 |
| 8 | Lego | Lego 代码生成 |
| 9 | 最小化裁剪sdk | 最小化 SDK 裁剪 |
| 11 | 最小化pb裁剪sdk | 最小化 PB SDK 裁剪 |
| 12 | go_pb_model | Go PB Model 代码生成 |
| 13 | Java_RPC | Java RPC 代码生成 |
| 14 | tiktok_pb_builder | TikTok PB Builder |
| 15 | 代码生成到主仓 | 代码生成到主仓库 |
| 16 | Node.js | Node.js 代码生成 |
| 17 | Overpass | Overpass 代码生成 |
| 18 | bytesuite-kitex-client | ByteSuite Kitex 客户端 |
| 19 | Hertz | Hertz HTTP 框架代码生成 |
| 20 | LarkCalendar | Lark 日历 |
| 21 | HarmonyBuilder | Harmony Builder |
| 22 | HarmonyBuilderComponent | Harmony Builder 组件 |
| 23 | 前端 | 前端代码生成 |

### Client 平台 (`--platform client`)

| ID | Name | 说明 |
|----|------|------|
| 30 | Android | Android SDK 生成 |
| 31 | Flutter | Flutter SDK 生成 |
| 32 | iOS | iOS SDK 生成 |
| 33 | Ferry | Ferry SDK 生成 |
| 34 | Harmony | Harmony SDK 生成 |
| 35 | KotlinMulti | Kotlin Multiplatform SDK 生成 |

## 错误处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `--psm is required` | 缺少 PSM | 添加 `--psm` 参数 |
| `--scaffold-id is required` | 缺少 Scaffold ID | 使用 `--show-scaffold` 查看可用 ID |
| `--rule-id is required` | 缺少规则 ID | 先通过 `list-rule` 获取 |
| `authentication failed` | JWT 过期 | 运行 `gdp login` 登录 |


## 命令速查表

| 命令 | 说明 |
|------|------|
| `codegen list-scaffold` | 查看可用的 scaffold 类型 |
| `codegen list-rule --psm <PSM>` | 查询已有规则 |
| `codegen create-rule --show-scaffold` | 查看 scaffold ID |
| `codegen create-rule --psm <PSM> --target-repo <REPO> --scaffold-id <ID>` | 创建规则 |
| `codegen generate run --rule-id <ID>` | 触发代码生成 |
| `codegen generate history --rule-id <ID>` | 查看生成历史 |
