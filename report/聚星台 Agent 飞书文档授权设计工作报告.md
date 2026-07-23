# 聚星台 Agent 飞书文档授权设计工作报告

## 1. 汇报摘要

本项工作的背景是：聚星台 Agent 助手不仅需要查询聚星台业务数据，还需要把分析结果、拜访材料、诊断结论写入飞书文档。数据查询侧已经通过 `alliance-operation-router` 复用聚星台登录态；飞书文档侧也需要解决同一个问题：Agent 访问飞书文档时，能否复用已有授权，而不是让每个 Agent、每个 workspace 都重新登录一套飞书身份。

围绕这个问题，我调研了 Aime、BAM 等现有 Agent 的飞书授权逻辑，并结合 `alliance-operation-plugin` 中已内置的 `lark-cli` / `lark-doc` 能力，形成聚星台 Agent 的飞书文档授权设计。

核心结论：

- 飞书文档读写应优先使用 **User OAuth 身份**，因为文档、云盘、知识库等资源通常受用户权限控制。
- 飞书登录态不应保存在普通业务 workspace 中，而应由平台授权层统一管理，再注入或挂载给 Agent 运行环境。
- Aime 偏「运行时注入 token」，BAM 偏「挂载 lark-cli 凭证目录」。两种模式都说明：授权材料应属于平台账号或授权凭证域，而不是属于某个临时 Agent 任务。
- 聚星台 Agent 推荐采用「平台统一授权 + lark-cli 标准凭证复用 + plugin wrapper 调用」方案。Agent 只调用 `scripts/lark-cli.sh` 和 `lark-doc` skill，不直接处理 `access_token`、`refresh_token`、`app_secret`。
- 当飞书文档写入失败时，应区分身份错误、scope 不足、文档权限不足、token 过期和 refresh 失败，不能简单提示「飞书未登录」。

## 2. 需求背景

### 2.1 业务诉求

聚星台 Agent 助手面向产品同学，典型任务包括：

- 查询聚星台作者、直播、商品、粉丝、拜访、规模化运营等数据。
- 对数据进行总结，生成经营诊断、拜访提案或复盘材料。
- 将结果写入飞书文档，形成可以分享、沉淀和协作编辑的产物。

飞书文档能力不是附属功能，而是 Agent 输出工作结果的重要一环。没有稳定的飞书授权，Agent 即使能查到聚星台数据，也无法把结果自动沉淀为文档。

### 2.2 关键问题

飞书授权设计需要回答 5 个问题：

| 问题 | 影响 |
|---|---|
| Agent 以谁的身份访问文档？ | 决定能否读取用户有权限的文档、能否写入目标文档。 |
| 登录态存在哪里？ | 决定是否能跨 Agent、跨 workspace 复用授权。 |
| token 如何刷新？ | 决定长时间使用时是否需要频繁重新授权。 |
| plugin 如何调用飞书能力？ | 决定是否复用 `lark-cli` 和 `lark-doc`，还是重新实现 OpenAPI。 |
| 如何处理权限和安全边界？ | 决定是否会误用 Bot 权限、泄露 token 或误写文档。 |

## 3. 调研对象与结论

本次主要调研了 3 类资料：

| 资料 | 重点 |
|---|---|
| `AimiBAM 飞书服务授权逻辑.md` | Aime / BAM 现有 Agent 的授权材料管理和运行时注入方式。 |
| `Lark-CLI-登录验证与OpenAPI工作流.md` | `lark-cli` 的 user / bot 身份、Device Flow、token 刷新和验证逻辑。 |
| `alliance-operation-plugin/skills/lark-cli` 与 `skills/lark-doc` | plugin 内部访问飞书文档的实际命令入口和文档读写能力。 |

最终判断：

- 聚星台 Agent 不需要重新设计一套飞书 OpenAPI 客户端。
- 应复用 `lark-cli` 的认证、token 刷新、scope 检查和 OpenAPI 调用能力。
- plugin 侧只需要提供稳定 wrapper、文档读写 skill 和授权状态检查规范。
- 平台侧需要决定采用 Aime 式 token 注入，还是 BAM 式凭证目录挂载；两者都可以支撑登录态复用。

## 4. Aime 授权逻辑

### 4.1 核心模式

Aime 的飞书授权绑定在平台用户账号上。用户完成飞书 OAuth 后，平台把用户授权材料和平台账号绑定。同一用户下的不同助理可以复用这套飞书授权，但每个助理自己的 workspace 和 memory 仍然隔离。

关键点：

- 飞书 token 不是保存在某个 Agent workspace 里。
- 平台根据当前用户账号读取可用 token。
- 任务启动时，平台创建 K8s Pod，并把运行时 token 注入环境变量。
- `lark-cli` 在容器内读取环境变量，直连飞书 OpenAPI。
- 任务结束后 Pod 销毁，注入的环境变量也随之消失。

### 4.2 执行链路

```text
用户发起飞书文档任务
  -> Aime 平台识别需要飞书能力
  -> 平台按用户账号读取飞书 OAuth token
  -> access_token 过期时先用 refresh_token 刷新
  -> 创建 K8s Pod
  -> 注入 IRIS_BYTETECH_TOKEN 等环境变量
  -> subagent 在 Pod 内执行 lark-cli
  -> lark-cli 读取环境变量中的 user token
  -> 请求飞书 OpenAPI
  -> 返回文档内容或写入结果
  -> Pod 销毁
```

Aime 模式的优势是运行环境干净，token 不落 workspace；缺点是每次任务都依赖平台注入，Agent 内部不直接拥有完整的可复用凭证目录。

## 5. BAM 授权逻辑

### 5.1 核心模式

BAM 的模式更偏文件挂载。平台把 `lark-cli` 需要的配置和加密凭证放在统一存储中，Agent 创建时通过软链接挂载到 Agent HOME 目录。

典型结构：

```text
/mnt/universal_agents/_store/auth/cred_xxx/
├── lark-cli-config/
│   └── config.json
└── lark-cli-data/
    ├── master.key
    ├── appsecret_<appId>.enc
    └── cli_<appId>_<openId>.enc
```

Agent 内部看到的是：

```text
~/.lark-cli -> /mnt/universal_agents/_store/auth/cred_xxx/lark-cli-config
~/.local/share/lark-cli -> /mnt/universal_agents/_store/auth/cred_xxx/lark-cli-data
```

### 5.2 执行链路

```text
平台创建或选择飞书凭证 cred_xxx
  -> 创建 Agent
  -> 挂载 ~/.lark-cli 和 ~/.local/share/lark-cli
  -> Agent 内执行 lark-cli docs / drive / wiki 命令
  -> lark-cli 读取 config.json、master.key、*.enc
  -> access_token 过期时用 refresh_token 刷新
  -> 刷新结果加密写回 cred_xxx
  -> 其他挂载同一 cred_xxx 的 Agent 复用新 token
```

BAM 模式的优势是更贴近 `lark-cli` 原生工作方式，token 刷新和写回都由 `lark-cli` 完成；缺点是平台需要严格管理凭证目录、软链接和明文密钥风险。

## 6. Lark CLI 授权模型

### 6.1 两类身份

`lark-cli` 有两类核心身份：

| 身份 | token | 适用场景 | 典型命令 |
|---|---|---|---|
| User 身份 | `user_access_token` | 访问用户自己的文档、云盘、知识库、邮箱、日历等资源。 | `docs +fetch`、`docs +update`、`drive list` |
| Bot / App 身份 | `tenant_access_token` 或等价应用凭证 | 机器人发消息、应用级管理、应用可见资源。 | `im`、事件处理、部分管理类 API |

聚星台 Agent 读写飞书文档时，默认应使用 User 身份。原因是产品要读写的文档通常是用户自己有权限的文档，而不是机器人天然可见的资源。

### 6.2 必需凭证文件

`lark-cli` 的可复用登录态由几类文件共同组成：

| 文件 | 作用 |
|---|---|
| `config.json` | 保存 app 配置、profile、默认身份、用户信息。 |
| `master.key` / `master.key.file` | 解密本地 `.enc` 凭证。 |
| `appsecret_*.enc` | 加密保存 app / bot 凭证。 |
| `cli_*_ou_*.enc` | 加密保存用户 OAuth 登录态，包含 access / refresh token。 |

因此，单独保存一个 access token 不足以长期稳定运行；真正可复用的是一套可以刷新、可以验证、可以写回的 `lark-cli` 凭证状态。

### 6.3 token 刷新

`lark-cli` 请求 OpenAPI 时会自动处理 token：

```text
读取本地登录态
  -> 判断 access_token 是否过期
  -> access_token 有效：直接请求 OpenAPI
  -> access_token 过期且 refresh_token 有效：刷新 token
  -> 刷新成功：加密写回 cli_*_ou_*.enc
  -> refresh_token 失效：要求重新 OAuth 授权
```

这说明聚星台 Agent 不应该自己拼 refresh 请求，也不应该自己保存 refresh token；应把刷新逻辑交给 `lark-cli` 或平台授权层。

## 7. 聚星台 Agent 的飞书授权设计

### 7.1 总体设计

推荐设计如下：

```text
用户 / 产品同学
  -> 聚星台 Agent
  -> 判断需要飞书文档能力
  -> 检查平台是否已有该用户飞书授权
  -> 运行环境注入或挂载 lark-cli 登录态
  -> plugin 调用 scripts/lark-cli.sh
  -> lark-doc skill 执行 docs +fetch / docs +create / docs +update
  -> lark-cli 以 User 身份访问飞书 OpenAPI
  -> 返回文档读取或写入结果
```

设计原则：

- 飞书授权属于平台用户，不属于某个临时 Agent workspace。
- plugin 不直接处理 token 原文。
- Agent 不把 token、refresh token、app secret 写入业务文档或日志。
- 文档读写默认使用 User 身份。
- Bot / App 身份只用于明确的机器人消息、应用级能力或用户不可参与的后台任务。

### 7.2 推荐落地方式

聚星台 Agent 可以按运行环境选择两种实现方式。

| 方式 | 适用环境 | 设计 |
|---|---|---|
| Aime 式运行时注入 | 一次性任务、Pod 沙箱、平台强控制运行环境 | 平台把当前用户可用 token 注入环境变量，`lark-cli` 从环境变量读取。 |
| BAM 式凭证目录挂载 | 长生命周期 Agent、需要复用和写回刷新结果 | 平台挂载 `~/.lark-cli` 和 `~/.local/share/lark-cli`，`lark-cli` 原生读取和刷新。 |

如果聚星台 Agent 希望长期复用登录态，并允许 `lark-cli` 自动刷新和写回，推荐优先采用 BAM 式凭证目录挂载。若运行环境是短生命周期任务，且平台已有成熟 token 注入机制，可以采用 Aime 式注入。

### 7.3 plugin 内部调用方式

`alliance-operation-plugin` 已经提供内置 wrapper：

```text
alliance-operation-plugin/scripts/lark-cli.sh
```

skill 中不要直接调用 `vendor/bin/<platform>/lark-cli`，统一通过 wrapper 选择当前 OS / CPU 架构下的二进制。

文档能力走 `lark-doc`：

```bash
../../scripts/lark-cli.sh docs +fetch --api-version v2 --doc "<doc_url_or_token>"
../../scripts/lark-cli.sh docs +create --api-version v2 --content "<title>标题</title><p>内容</p>"
../../scripts/lark-cli.sh docs +update --api-version v2 --doc "<doc_url_or_token>" --command append --content "<p>内容</p>"
```

对于 Agent 编排，要求：

- 使用 `--json` 获取机器可读输出。
- 写文档前先判断目标文档是否存在、当前用户是否有编辑权限。
- 精准编辑时优先用 `docs +fetch --detail with-ids/full` 获取 block ID。
- 文档中嵌入表格、多维表格、画板时，根据 token 切到对应 skill 下钻处理。

## 8. 飞书文档读写链路

### 8.1 读取文档

```text
用户提供飞书文档 URL
  -> Agent 识别为 Docx / Wiki 文档
  -> lark-doc 选择 docs +fetch --api-version v2
  -> lark-cli 选择 User token
  -> 必要时刷新 user_access_token
  -> 请求飞书 Docx OpenAPI
  -> 返回 XML / Markdown / blocks
  -> Agent 总结或提取信息
```

### 8.2 写入文档

```text
Agent 生成分析内容
  -> 判断是新建文档还是更新已有文档
  -> 新建：docs +create --api-version v2
  -> 更新：docs +fetch 定位结构，再 docs +update
  -> lark-cli 使用 User token 请求飞书 OpenAPI
  -> 飞书校验用户对文档的编辑权限
  -> 写入成功后返回文档链接或 block 结果
```

### 8.3 与聚星台数据链路的关系

聚星台 Agent 有两条登录态链路：

| 链路 | 资源 | 凭证来源 | 执行入口 |
|---|---|---|---|
| 聚星台数据链路 | 聚星台 ECOP 接口 | `ECOP_TOKEN` / `~/.alliance-operation-cli` | `alliance-operation-router/scripts/alliance-operation.sh` |
| 飞书文档链路 | 飞书 Docx / Drive / Wiki OpenAPI | 平台飞书授权 / `lark-cli` 凭证 | `scripts/lark-cli.sh` + `lark-doc` |

两条链路都遵循同一个设计思想：登录态由平台或统一 runtime 管理，Agent 只调用稳定工具入口，不直接保存敏感凭证。

## 9. 登录态复用逻辑

### 9.1 复用边界

飞书登录态复用的单位应是「平台用户 + 飞书应用授权」，而不是「某个 Agent workspace」。

```text
平台用户
  -> 飞书 OAuth 授权
  -> 平台保存或挂载 lark-cli 登录态
  -> Agent A 复用
  -> Agent B 复用
  -> 临时任务复用
```

workspace 只保存业务上下文、生成文档、临时中间产物，不保存完整飞书 OAuth 凭证。

### 9.2 复用前检查

每次执行飞书文档读写前，建议执行授权状态检查：

```bash
../../scripts/lark-cli.sh auth status --json
```

如需远端确认：

```bash
../../scripts/lark-cli.sh auth status --json --verify
```

判断逻辑：

| 状态 | 处理 |
|---|---|
| User 身份 ready，token valid | 直接执行文档读写。 |
| access token 过期，refresh token 有效 | 由 `lark-cli` 自动刷新后继续。 |
| refresh token 失效 | 触发重新 OAuth 授权。 |
| scope 不足 | 按文档 / 云盘所需 scope 重新授权。 |
| Bot 身份 ready 但 User 身份 missing | 不能用于用户文档读写，需要 User OAuth。 |

### 9.3 scope 设计

飞书文档读写通常至少涉及：

- 文档读取相关 scope；
- 文档编辑相关 scope；
- 云空间文件读取 / 创建相关 scope；
- 如涉及 Wiki，还需要 Wiki 相关 scope；
- 如涉及嵌入表格、多维表格、画板，还需要对应业务域 scope。

报告层面不固定具体 scope 名称，因为实际 scope 应以飞书开放平台应用配置和 `lark-cli schema` / `auth check` 结果为准。设计原则是最小权限授权：只申请当前 Agent 任务需要的文档、云盘和协作能力，不把邮箱、日历、通讯录等无关权限混在默认授权里。

## 10. 工作重点

### 10.1 不自己实现飞书 OAuth

飞书 OAuth 涉及 device code、access token、refresh token、scope、加密存储和刷新写回。`lark-cli` 已经封装这些能力，plugin 应复用它，而不是重新实现。

### 10.2 不把 token 写入 workspace

workspace 是业务产物空间，不是凭证库。Agent 可以写文档草稿、分析结果、日志摘要，但不能写入：

- `user_access_token`
- `refresh_token`
- `app_secret`
- `master.key`
- `cli_*_ou_*.enc` 的明文内容

### 10.3 区分 User 和 Bot 身份

文档读写默认走 User 身份。Bot 身份即使可用，也不代表它能访问用户的私人文档或知识库文档。遇到权限错误时，不能盲目切 Bot，要先判断资源权限和 token 类型。

### 10.4 错误要可诊断

飞书文档操作失败时，错误至少分 5 类：

| 错误类型 | 说明 | 处理 |
|---|---|---|
| 未授权 | User 登录态不存在。 | 引导 OAuth 登录。 |
| token 过期 | access token 过期但 refresh token 可用。 | 由 `lark-cli` 刷新后重试。 |
| refresh 失败 | refresh token 过期、撤销或无法解密。 | 重新授权。 |
| scope 不足 | 用户授权没有覆盖目标 API。 | 按缺失 scope 重新授权。 |
| 资源权限不足 | 用户本身无文档读取或编辑权限。 | 让用户申请文档权限或换目标文档。 |

## 11. 工作难点

| 难点 | 表现 | 处理思路 |
|---|---|---|
| 授权归属容易混淆 | token 到底属于平台用户、Agent、workspace 还是插件。 | 明确授权归平台用户，workspace 不保存完整凭证。 |
| User / Bot 身份容易混用 | Bot token 可用，但用户文档读写仍失败。 | 文档类能力默认 User 身份，Bot 只用于明确机器人场景。 |
| token 刷新不可见 | 用户只看到命令成功或失败，不知道中间是否刷新。 | 使用 `auth status --verify` 和 token 状态摘要判断，不打印 token 原文。 |
| scope 与资源权限是两层问题 | 有 scope 不代表有目标文档权限。 | 错误信息区分 scope 缺失和文档权限不足。 |
| 运行环境不同 | Aime 注入环境变量，BAM 挂载凭证目录，本地插件又有 wrapper。 | 抽象为两种凭证供给方式，plugin 统一调用 `scripts/lark-cli.sh`。 |
| 安全边界严格 | OAuth token、refresh token、app secret 都是高敏感材料。 | 不进命令参数、不进业务日志、不进飞书文档、不进普通 workspace。 |

## 12. 思考过程

我的思考过程分为 6 步：

1. 先判断飞书文档访问的核心不是「调用哪个 API」，而是「Agent 以谁的身份访问」。文档权限跟用户强相关，因此默认应走 User OAuth。

2. 再判断登录态不应归属于 Agent workspace。workspace 会被复制、导出或复用，如果把 token 放在里面，既不安全，也不利于跨 Agent 复用。

3. 然后对比 Aime 和 BAM。Aime 通过运行时注入让任务拿到短期可用 token；BAM 通过挂载凭证目录让 `lark-cli` 原生刷新和写回。两者的共同点是：平台管理凭证，Agent 消费凭证。

4. 接着评估 plugin 侧是否要自研 OAuth。结论是不需要。`lark-cli` 已有 Device Flow、User / Bot 身份、token 刷新、scope 检查和 OpenAPI 调用，plugin 复用更稳。

5. 再把设计边界收紧：plugin 只提供 wrapper 和 skill 编排；平台提供授权状态和凭证供给；Agent 只处理业务结果，不处理 token 原文。

6. 最后把失败场景拆细。飞书文档失败不一定是未登录，也可能是 scope 缺失、文档无权限、token 解密失败或 refresh 失效。只有错误可诊断，产品同学使用 Agent 时才不会陷入反复登录。

这套设计的核心判断是：聚星台 Agent 的飞书文档能力不是另起一套授权系统，而是复用平台已有飞书授权和 `lark-cli` 标准登录态，把复杂的 OAuth 生命周期压在平台和 CLI 层，Agent 只面向稳定的文档读写能力。

## 13. 推荐方案

### 13.1 短期方案

短期可以优先采用平台已有能力：

1. 使用平台已有飞书 OAuth 授权，确保用户已授权文档和云盘相关 scope。
2. 在 Agent 运行环境中注入或挂载 `lark-cli` 可识别的登录态。
3. plugin 统一通过 `scripts/lark-cli.sh` 调用飞书能力。
4. 文档读写统一走 `lark-doc` skill，使用 `docs +fetch`、`docs +create`、`docs +update`。
5. 操作前执行 `auth status --json`，失败时按原因引导重新授权或申请文档权限。

### 13.2 中长期方案

中长期建议沉淀平台级飞书授权服务：

| 能力 | 说明 |
|---|---|
| 授权绑定 | 用户在平台层完成飞书 OAuth，绑定到平台账号。 |
| 凭证供给 | 按任务环境选择 token 注入或凭证目录挂载。 |
| token 刷新 | access token 过期时自动刷新，refresh 失败时触发重新授权。 |
| scope 管理 | 记录每个用户已授权 scope，支持按业务域补授权。 |
| 审计与脱敏 | 记录调用了哪个文档能力，但不记录 token 原文。 |
| 多 Agent 复用 | 同一用户的多个 Agent 复用同一授权状态。 |

## 14. 汇报讲解提纲

汇报时可以按以下顺序展开：

1. 背景：聚星台 Agent 不只查数据，还要把结果写入飞书文档。
2. 问题：飞书文档访问依赖用户权限，不能让每个 Agent 自己保存一套登录态。
3. 调研：Aime 用运行时 token 注入，BAM 用凭证目录挂载，两者都把授权放在平台层。
4. 结论：聚星台 Agent 应复用平台飞书授权和 `lark-cli`，不自研 OAuth。
5. 设计：平台负责授权与凭证供给，plugin 负责 wrapper 和 `lark-doc` 编排，Agent 只处理业务结果。
6. 重点：文档读写默认 User 身份，Bot 身份不等价；token 不进入 workspace。
7. 难点：User / Bot 身份、scope、文档权限、token 刷新和运行环境差异要分清。
8. 收益：用户少登录、Agent 能稳定读写文档、授权风险收敛到平台层。

## 15. 附录：关键路径

| 类型 | 路径 |
|---|---|
| 本报告 | `cx-learn-notes/调研学习/聚星台 Agent 飞书文档授权设计工作报告.md` |
| 原始调研 | `cx-learn-notes/调研学习/AimiBAM 飞书服务授权逻辑.md` |
| Lark CLI 工作流 | `cx-learn-notes/调研学习/Lark-CLI-登录验证与OpenAPI工作流.md` |
| Web OAuth 调研 | `cx-learn-notes/调研学习/飞书-Lark-CLI-与-Web-授权流程整理.md` |
| plugin lark wrapper | `alliance-operation-plugin/scripts/lark-cli.sh` |
| plugin lark-cli skill | `alliance-operation-plugin/skills/lark-cli/SKILL.md` |
| plugin lark-doc skill | `alliance-operation-plugin/skills/lark-doc/SKILL.md` |
| 文档读取说明 | `alliance-operation-plugin/skills/lark-doc/references/lark-doc-fetch.md` |

